import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import crypto from "crypto";
import { WaitlistEntity } from "./waitlist.entity";
import { MailService } from "../mail/mail.service";

@Injectable()
export class WaitlistService {
  private readonly logger = new Logger(WaitlistService.name);

  constructor(
    @InjectRepository(WaitlistEntity)
    private readonly repo: Repository<WaitlistEntity>,
    private readonly mail: MailService,
  ) {}

  // ===========================
  // Helpers
  // ===========================

  private tokenTtlHours(): number {
    const n = Number(process.env.WAITLIST_TOKEN_TTL_HOURS || 48);
    return Number.isFinite(n) && n > 0 ? n : 48;
  }

  private buildConfirmUrl(token: string): string {
    /**
     * You can point to backend (API) or frontend.
     *
     * Backend (API):
     *   http://localhost:3001/waitlist/confirm?token=...
     *
     * Frontend (recommended):
     *   https://intelxofficial.com/waitlist/confirm?token=...
     *   and the frontend calls the backend to confirm.
     */
    const base = process.env.PUBLIC_CONFIRM_BASE_URL || "http://localhost:3000";
    return `${base}/waitlist/confirm?token=${encodeURIComponent(token)}`;
  }

  private newToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  private expiresAtFromNow(hours: number): Date {
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  /**
   * Allowlist-style email validation (big-tech style).
   * Only allows well-known providers by default.
   *
   * You can override with:
   * WAITLIST_EMAIL_ALLOWLIST="gmail.com,outlook.com,hotmail.com,yahoo.com"
   */
  private getAllowedEmailDomains(): Set<string> {
    const env = (process.env.WAITLIST_EMAIL_ALLOWLIST || "").trim();
    const defaults = [
      "gmail.com",
      "googlemail.com",
      "outlook.com",
      "hotmail.com",
      "live.com",
      "msn.com",
      "icloud.com",
      "me.com",
      "mac.com",
      "yahoo.com",
      "ymail.com",
      "proton.me",
      "protonmail.com",
      "aol.com",
      "gmx.com",
      "gmx.de",
      "zoho.com",
    ];

    const list = env
      ? env
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
      : defaults;

    return new Set(list);
  }

  private assertAllowedEmail(email: string) {
    const at = email.lastIndexOf("@");
    if (at <= 0 || at === email.length - 1) {
      throw new BadRequestException("Email is required.");
    }

    const domain = email.slice(at + 1).toLowerCase();
    const allowed = this.getAllowedEmailDomains();

    if (!allowed.has(domain)) {
      // Keep it short + clear (big-tech style).
      throw new BadRequestException(
        "Please use a major email provider (Gmail, Outlook/Hotmail, Yahoo, iCloud, Proton, etc.).",
      );
    }
  }

  // ===========================
  // Public API
  // ===========================

  async join(emailRaw: string) {
    const email = (emailRaw || "").trim().toLowerCase();
    if (!email) throw new BadRequestException("Email is required.");

    // ✅ Big-tech anti-disposable behavior (allowlist)
    this.assertAllowedEmail(email);

    const existing = await this.repo.findOne({ where: { email } });

    // If already confirmed, we don't resend by default (big-tech behavior)
    if (existing?.status === "CONFIRMED") {
      return {
        ok: true,
        status: "ALREADY_CONFIRMED",
        message: "This email is already confirmed.",
        position: await this.getPositionByEmail(email),
      };
    }

    const token = this.newToken();
    const expiresAt = this.expiresAtFromNow(this.tokenTtlHours());
    const confirmUrl = this.buildConfirmUrl(token);

    let row: WaitlistEntity;

    if (!existing) {
      row = this.repo.create({
        email,
        status: "PENDING",
        confirmToken: token,
        tokenExpiresAt: expiresAt,
      });
      await this.repo.save(row);
    } else {
      existing.confirmToken = token;
      existing.tokenExpiresAt = expiresAt;
      existing.status = "PENDING";
      row = await this.repo.save(existing);
    }

    // send email (if it fails, keep record created)
    try {
      await this.mail.sendWaitlistConfirmEmail({ to: email, confirmUrl });
    } catch (e: any) {
      this.logger.error(
        `Failed to send confirmation email to ${email}: ${e?.message || e}`,
      );
      return {
        ok: false,
        status: "EMAIL_FAILED",
        message:
          "You were added, but we couldn't send the email. Please try again.",
      };
    }

    return {
      ok: true,
      status: "PENDING",
      message: "Check your inbox to confirm your email.",
      position: await this.getPositionByEmail(email),
    };
  }

  async confirm(tokenRaw: string) {
    const token = (tokenRaw || "").trim();
    if (!token) throw new BadRequestException("Token is required.");

    /**
     * ✅ BIG-TECH FIX:
     * We don't want a second click on the same link to return 404.
     *
     * So we DO NOT delete confirmToken on confirm.
     * This keeps the row findable by token,
     * and if status=CONFIRMED we return ALREADY_CONFIRMED.
     */
    const row = await this.repo.findOne({ where: { confirmToken: token } });

    // Token truly doesn't exist (made up / old link before this change)
    if (!row) throw new NotFoundException("Invalid token.");

    // If already confirmed: return OK (no 404)
    if (row.status === "CONFIRMED") {
      return {
        ok: true,
        status: "ALREADY_CONFIRMED",
        message: "You are already confirmed.",
        position: await this.getPositionByEmail(row.email),
      };
    }

    const exp = row.tokenExpiresAt?.getTime() || 0;
    if (!exp || Date.now() > exp) {
      throw new BadRequestException(
        "This token has expired. Please request a new confirmation email.",
      );
    }

    row.status = "CONFIRMED";
    row.confirmedAt = new Date();

    // ✅ Keep confirmToken (supports double-click / reopen)
    // ✅ Clear expiration (no longer needed)
    row.tokenExpiresAt = null;

    await this.repo.save(row);

    return {
      ok: true,
      status: "CONFIRMED",
      message: "Email confirmed successfully.",
      position: await this.getPositionByEmail(row.email),
    };
  }

  async resend(emailRaw: string) {
    const email = (emailRaw || "").trim().toLowerCase();
    if (!email) throw new BadRequestException("Email is required.");

    // ✅ Keep same rule on resend
    this.assertAllowedEmail(email);

    const row = await this.repo.findOne({ where: { email } });
    if (!row) throw new NotFoundException("Email not found in the waitlist.");

    // If already confirmed: do not resend
    if (row.status === "CONFIRMED") {
      return {
        ok: true,
        status: "ALREADY_CONFIRMED",
        message: "This email is already confirmed.",
        position: await this.getPositionByEmail(email),
      };
    }

    const token = this.newToken();
    const expiresAt = this.expiresAtFromNow(this.tokenTtlHours());
    const confirmUrl = this.buildConfirmUrl(token);

    row.confirmToken = token;
    row.tokenExpiresAt = expiresAt;
    row.status = "PENDING";

    await this.repo.save(row);

    try {
      await this.mail.sendWaitlistConfirmEmail({ to: email, confirmUrl });
    } catch (e: any) {
      this.logger.error(
        `Failed to resend confirmation email to ${email}: ${e?.message || e}`,
      );
      throw new BadRequestException(
        "We couldn't send the email. Please try again later.",
      );
    }

    return {
      ok: true,
      status: "RESENT",
      message: "We sent you a new confirmation email.",
      position: await this.getPositionByEmail(email),
    };
  }

  /**
   * Position by creation order (1..N).
   * ✅ Implemented with QueryBuilder (MySQL + TypeORM)
   */
  async getPositionByEmail(emailRaw: string) {
    const email = (emailRaw || "").trim().toLowerCase();
    const row = await this.repo.findOne({ where: { email } });
    if (!row) return null;

    const count = await this.repo
      .createQueryBuilder("w")
      .where("w.createdAt <= :createdAt", { createdAt: row.createdAt })
      .getCount();

    return count;
  }

  // ===========================
  // Admin
  // ===========================

  async adminStats() {
    const total = await this.repo.count();
    const confirmed = await this.repo.count({ where: { status: "CONFIRMED" } });
    const pending = total - confirmed;
    return { total, confirmed, pending };
  }

  async adminList(limit = 50, offset = 0) {
    const [items, total] = await this.repo.findAndCount({
      order: { createdAt: "DESC" },
      take: limit,
      skip: offset,
    });

    return { total, items };
  }
}
