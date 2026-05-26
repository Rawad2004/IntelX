/**
 * Auth Guards
 * 
 * Guards para proteger rutas con JWT.
 * 
 * Ubicación: src/auth/guards/index.ts
 */

import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator para marcar rutas como públicas
 */
import { SetMetadata } from '@nestjs/common';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * JWT Auth Guard
 * Protege rutas que requieren autenticación
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Authentication required');
    }
    return user;
  }
}

/**
 * Optional Auth Guard
 * Permite acceso pero adjunta usuario si está autenticado
 */
@Injectable()
export class OptionalAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    // Don't throw error, just return user or null
    return user || null;
  }
}

/**
 * Email Verified Guard
 * Requiere que el email esté verificado
 */
@Injectable()
export class EmailVerifiedGuard {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException('Please verify your email to access this resource');
    }

    return true;
  }
}