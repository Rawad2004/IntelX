import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";

@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const apiKey =
      req.headers["x-admin-api-key"] || req.headers["X-Admin-Api-Key"];

    const expected = process.env.WAITLIST_ADMIN_API_KEY;

    if (!expected) return false;
    return String(apiKey || "") === expected;
  }
}
