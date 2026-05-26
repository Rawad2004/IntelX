/**
 * Auth DTOs
 * 
 * Data Transfer Objects para autenticación.
 * 
 * Ubicación: src/auth/dto/auth.dto.ts
 */

import { IsEmail, IsString, MinLength, IsOptional, Length, IsNotEmpty } from 'class-validator';

// ============================================
// REQUEST DTOs
// ============================================

export class RegisterDto {
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  name: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;
}

export class VerifyOtpDto {
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email: string;

  @IsString()
  @Length(6, 6, { message: 'OTP must be 6 digits' })
  code: string;
}

export class ResendOtpDto {
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email: string;
}

export class GoogleAuthDto {
  @IsString()
  @IsNotEmpty({ message: 'Google credential is required' })
  credential: string;
}

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Token is required' })
  token: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  newPassword: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken: string;
}

// ============================================
// RESPONSE DTOs
// ============================================

export class UserResponseDto {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  emailVerified: boolean;
  createdAt: Date;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}

export class AuthResponseDto {
  success: boolean;
  message: string;
  user?: UserResponseDto;
  token?: string;
  refreshToken?: string;
  requiresVerification?: boolean;

  constructor(partial: Partial<AuthResponseDto>) {
    Object.assign(this, partial);
  }
}

export class TokenPayload {
  sub: string; // user id
  email: string;
  emailVerified: boolean;
}