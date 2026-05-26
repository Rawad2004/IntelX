/**
 * Auth Module Index
 * 
 * Exportaciones del módulo de autenticación.
 * 
 * Ubicación: src/auth/index.ts
 */

// Module
export { AuthModule } from './auth.module';

// Controller
export { AuthController } from './auth.controller';

// Services
export { AuthService } from './services/auth.service';
export { EmailService } from './services/email.service';

// Entities
export { User, AuthProvider } from './entities/user.entity';

// DTOs
export {
  RegisterDto,
  LoginDto,
  VerifyOtpDto,
  ResendOtpDto,
  GoogleAuthDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  RefreshTokenDto,
  UserResponseDto,
  AuthResponseDto,
  TokenPayload,
} from './dto/auth.dto';

// Guards
export { JwtAuthGuard, OptionalAuthGuard, EmailVerifiedGuard, Public } from './guards';

// Strategies
export { JwtStrategy } from './strategies/jwt.strategy';