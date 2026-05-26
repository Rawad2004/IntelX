/**
 * Auth Service
 * 
 * Servicio principal de autenticación.
 * Maneja registro, login, OTP, Google OAuth, JWT.
 * 
 * Ubicación: src/auth/services/auth.service.ts
 */

import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';

import { User, AuthProvider } from '../entities/user.entity';
import { EmailService } from './email.service';
import {
  RegisterDto,
  LoginDto,
  VerifyOtpDto,
  GoogleAuthDto,
  AuthResponseDto,
  UserResponseDto,
  TokenPayload,
} from '../dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly googleClient: OAuth2Client;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {
    this.googleClient = new OAuth2Client(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
    );
  }

  // ============================================
  // REGISTER
  // ============================================

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, name } = dto;

    // Check if user exists
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      if (existingUser.provider === AuthProvider.GOOGLE) {
        throw new ConflictException('This email is registered with Google. Please use Google Sign In.');
      }
      throw new ConflictException('An account with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate OTP
    const otpCode = this.generateOtp();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create user
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      name,
      otpCode,
      otpExpiresAt,
      provider: AuthProvider.LOCAL,
      emailVerified: false,
    });

    await this.userRepository.save(user);

    // Send verification email
    await this.emailService.sendOtpEmail({
      to: email,
      name,
      otpCode,
    });

    this.logger.log(`User registered: ${email}`);

    return new AuthResponseDto({
      success: true,
      message: 'Registration successful. Please check your email for verification code.',
      requiresVerification: true,
      user: this.toUserResponse(user),
    });
  }

  // ============================================
  // LOGIN
  // ============================================

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = dto;

    // Find user with password
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if Google user
    if (user.provider === AuthProvider.GOOGLE) {
      throw new BadRequestException('This account uses Google Sign In. Please use the Google button.');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if email verified
    if (!user.emailVerified) {
      // Resend OTP
      const otpCode = this.generateOtp();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      
      await this.userRepository.update(user.id, { otpCode, otpExpiresAt });
      
      await this.emailService.sendOtpEmail({
        to: email,
        name: user.name,
        otpCode,
      });

      return new AuthResponseDto({
        success: true,
        message: 'Please verify your email. A new code has been sent.',
        requiresVerification: true,
        user: this.toUserResponse(user),
      });
    }

    // Update last login
    await this.userRepository.update(user.id, { lastLoginAt: new Date() });

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(user);

    this.logger.log(`User logged in: ${email}`);

    return new AuthResponseDto({
      success: true,
      message: 'Login successful',
      user: this.toUserResponse(user),
      token: accessToken,
      refreshToken,
    });
  }

  // ============================================
  // VERIFY OTP
  // ============================================

  async verifyOtp(dto: VerifyOtpDto): Promise<AuthResponseDto> {
    const { email, code } = dto;

    // Find user with OTP fields
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect(['user.otpCode', 'user.otpExpiresAt'])
      .where('user.email = :email', { email })
      .getOne();

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Check OTP
    if (!user.otpCode || user.otpCode !== code) {
      throw new BadRequestException('Invalid verification code');
    }

    if (!user.otpExpiresAt || new Date() > user.otpExpiresAt) {
      throw new BadRequestException('Verification code has expired. Please request a new one.');
    }

    // Update user
    await this.userRepository.update(user.id, {
      emailVerified: true,
      otpCode: null as any,
      otpExpiresAt: null as any,
      lastLoginAt: new Date(),
    });

    // Refresh user data
    const updatedUser = await this.userRepository.findOne({ where: { id: user.id } });
    if (!updatedUser) {
      throw new BadRequestException('User not found after update');
    }

    // Send welcome email
    await this.emailService.sendWelcomeEmail({
      to: email,
      name: user.name,
    });

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(updatedUser);

    this.logger.log(`Email verified: ${email}`);

    return new AuthResponseDto({
      success: true,
      message: 'Email verified successfully',
      user: this.toUserResponse(updatedUser),
      token: accessToken,
      refreshToken,
    });
  }

  // ============================================
  // RESEND OTP
  // ============================================

  async resendOtp(email: string): Promise<AuthResponseDto> {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      // Don't reveal if user exists
      return new AuthResponseDto({
        success: true,
        message: 'If an account exists, a verification code has been sent.',
      });
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Generate new OTP
    const otpCode = this.generateOtp();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.userRepository.update(user.id, { otpCode, otpExpiresAt });

    await this.emailService.sendOtpEmail({
      to: email,
      name: user.name,
      otpCode,
    });

    this.logger.log(`OTP resent to: ${email}`);

    return new AuthResponseDto({
      success: true,
      message: 'Verification code sent to your email',
    });
  }

  // ============================================
  // GOOGLE AUTH
  // ============================================

  async googleAuth(dto: GoogleAuthDto): Promise<AuthResponseDto> {
    const { credential } = dto;

    try {
      // Verify Google token
      const ticket = await this.googleClient.verifyIdToken({
        idToken: credential,
        audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new UnauthorizedException('Invalid Google token');
      }

      const { email, name, picture, sub: googleId } = payload;

      // Find or create user
      let user = await this.userRepository.findOne({ where: { email } });

      if (user) {
        // Update existing user with Google info if needed
        if (user.provider === AuthProvider.LOCAL && !user.emailVerified) {
          // Link local account to Google
          await this.userRepository.update(user.id, {
            googleId,
            provider: AuthProvider.GOOGLE,
            emailVerified: true,
            avatar: picture || user.avatar,
            lastLoginAt: new Date(),
          });
          user.emailVerified = true;
          user.provider = AuthProvider.GOOGLE;
        } else {
          await this.userRepository.update(user.id, { lastLoginAt: new Date() });
        }
      } else {
        // Create new user
        user = this.userRepository.create({
          email,
          name: name || email.split('@')[0],
          avatar: picture,
          googleId,
          provider: AuthProvider.GOOGLE,
          emailVerified: true,
          lastLoginAt: new Date(),
        });
        await this.userRepository.save(user);
        
        // Send welcome email for new users
        await this.emailService.sendWelcomeEmail({
          to: email,
          name: user.name,
        });
      }

      // Generate tokens
      const { accessToken, refreshToken } = await this.generateTokens(user);

      this.logger.log(`Google auth successful: ${email}`);

      return new AuthResponseDto({
        success: true,
        message: 'Google authentication successful',
        user: this.toUserResponse(user),
        token: accessToken,
        refreshToken,
      });
    } catch (error) {
      this.logger.error('Google auth error:', error);
      throw new UnauthorizedException('Google authentication failed');
    }
  }

  // ============================================
  // GET CURRENT USER
  // ============================================

  async getCurrentUser(userId: string): Promise<AuthResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return new AuthResponseDto({
      success: true,
      message: 'User retrieved successfully',
      user: this.toUserResponse(user),
    });
  }

  // ============================================
  // REFRESH TOKEN
  // ============================================

  async refreshTokens(userId: string, refreshToken: string): Promise<AuthResponseDto> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.refreshToken')
      .where('user.id = :userId', { userId })
      .getOne();

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Verify refresh token matches
    const isValid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Generate new tokens
    const tokens = await this.generateTokens(user);

    return new AuthResponseDto({
      success: true,
      message: 'Tokens refreshed successfully',
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  }

  // ============================================
  // LOGOUT
  // ============================================

  async logout(userId: string): Promise<AuthResponseDto> {
    await this.userRepository.update(userId, { refreshToken: null as any });

    return new AuthResponseDto({
      success: true,
      message: 'Logged out successfully',
    });
  }

  // ============================================
  // FORGOT PASSWORD
  // ============================================

  async forgotPassword(email: string): Promise<AuthResponseDto> {
    const user = await this.userRepository.findOne({ where: { email } });

    // Don't reveal if user exists
    if (!user) {
      return new AuthResponseDto({
        success: true,
        message: 'If an account exists, a password reset link has been sent.',
      });
    }

    if (user.provider === AuthProvider.GOOGLE) {
      throw new BadRequestException('This account uses Google Sign In. Please use the Google button to log in.');
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = this.jwtService.sign(
      { sub: user.id, email: user.email, type: 'password-reset' },
      { expiresIn: '1h' },
    );

    await this.emailService.sendPasswordResetEmail({
      to: email,
      name: user.name,
      resetToken,
    });

    this.logger.log(`Password reset requested: ${email}`);

    return new AuthResponseDto({
      success: true,
      message: 'If an account exists, a password reset link has been sent.',
    });
  }

  // ============================================
  // RESET PASSWORD
  // ============================================

  async resetPassword(token: string, newPassword: string): Promise<AuthResponseDto> {
    try {
      const payload = this.jwtService.verify(token);
      
      if (payload.type !== 'password-reset') {
        throw new BadRequestException('Invalid reset token');
      }

      const user = await this.userRepository.findOne({ where: { id: payload.sub } });
      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      
      await this.userRepository.update(user.id, {
        password: hashedPassword,
        refreshToken: null as any, // Invalidate all sessions
      });

      this.logger.log(`Password reset successful: ${user.email}`);

      return new AuthResponseDto({
        success: true,
        message: 'Password reset successful. Please log in with your new password.',
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new BadRequestException('Reset link has expired. Please request a new one.');
      }
      throw new BadRequestException('Invalid reset token');
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = {
      sub: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    // Hash and store refresh token
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.userRepository.update(user.id, { refreshToken: hashedRefreshToken });

    return { accessToken, refreshToken };
  }

  private toUserResponse(user: User): UserResponseDto {
    return new UserResponseDto({
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    });
  }

  // For JWT strategy validation
  async validateUser(userId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id: userId } });
  }
}