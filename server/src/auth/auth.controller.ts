/**
 * Auth Controller
 * 
 * Controlador con todos los endpoints de autenticación.
 * Endpoints alineados con el frontend existente.
 * 
 * Ubicación: src/auth/auth.controller.ts
 */

import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';

import { AuthService } from './services/auth.service';
import {
  RegisterDto,
  LoginDto,
  VerifyOtpDto,
  ResendOtpDto,
  GoogleAuthDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  RefreshTokenDto,
  AuthResponseDto,
} from './dto/auth.dto';
import { JwtAuthGuard, Public } from './guards';
import { User } from './entities/user.entity';

// Extend Express Request to include user
interface AuthenticatedRequest extends Request {
  user: User;
}

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ============================================
  // PUBLIC ROUTES
  // ============================================

  /**
   * POST /api/auth/register
   * Registro de nuevo usuario
   */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  /**
   * POST /api/auth/login
   * Login con email y contraseña
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  /**
   * POST /api/auth/verify-otp
   * Verificar código OTP
   */
  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: VerifyOtpDto): Promise<AuthResponseDto> {
    return this.authService.verifyOtp(dto);
  }

  /**
   * POST /api/auth/resend-otp
   * Reenviar código OTP
   */
  @Public()
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  async resendOtp(@Body() dto: ResendOtpDto): Promise<AuthResponseDto> {
    return this.authService.resendOtp(dto.email);
  }

  /**
   * POST /api/auth/google
   * Autenticación con Google
   */
  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  async googleAuth(@Body() dto: GoogleAuthDto): Promise<AuthResponseDto> {
    return this.authService.googleAuth(dto);
  }

  /**
   * POST /api/auth/forgot-password
   * Solicitar reset de contraseña
   */
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<AuthResponseDto> {
    return this.authService.forgotPassword(dto.email);
  }

  /**
   * POST /api/auth/reset-password
   * Restablecer contraseña con token
   */
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<AuthResponseDto> {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  /**
   * POST /api/auth/refresh
   * Refrescar tokens
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(
    @Req() req: Request,
    @Body() dto: RefreshTokenDto,
  ): Promise<AuthResponseDto> {
    // Extract user ID from the expired access token if present
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      // Try to decode refresh token to get user ID
      // This is a simplified version - in production you might want to store refresh tokens differently
      throw new Error('Authorization header required for refresh');
    }
    
    const token = authHeader.replace('Bearer ', '');
    // Note: This is handled in the service with proper validation
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    
    return this.authService.refreshTokens(payload.sub, dto.refreshToken);
  }

  // ============================================
  // PROTECTED ROUTES
  // ============================================

  /**
   * GET /api/auth/me
   * Obtener usuario actual
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getCurrentUser(@Req() req: AuthenticatedRequest): Promise<AuthResponseDto> {
    return this.authService.getCurrentUser(req.user.id);
  }

  /**
   * POST /api/auth/logout
   * Cerrar sesión
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: AuthenticatedRequest): Promise<AuthResponseDto> {
    return this.authService.logout(req.user.id);
  }
}