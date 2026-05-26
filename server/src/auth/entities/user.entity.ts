/**
 * User Entity
 * 
 * Entidad TypeORM para usuarios de IntelX.
 * Compatible con MySQL.
 * 
 * Ubicación: src/auth/entities/user.entity.ts
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  @Index()
  email: string;

  @Column({ length: 255, nullable: true })
  name: string;

  @Column({ length: 255, nullable: true, select: false })
  password: string;

  @Column({ length: 500, nullable: true })
  avatar: string;

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ type: 'varchar', length: 6, nullable: true, select: false })
  otpCode: string;

  @Column({ type: 'datetime', nullable: true, select: false })
  otpExpiresAt: Date;

  @Column({
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
  })
  provider: AuthProvider;

  @Column({ length: 255, nullable: true })
  googleId: string;

  @Column({ type: 'varchar', length: 500, nullable: true, select: false })
  refreshToken: string;

  @Column({ type: 'datetime', nullable: true })
  lastLoginAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper method to check if OTP is valid
  isOtpValid(): boolean {
    if (!this.otpCode || !this.otpExpiresAt) return false;
    return new Date() < this.otpExpiresAt;
  }
}