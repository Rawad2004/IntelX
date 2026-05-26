import { Injectable, Logger } from "@nestjs/common";
import { Resend } from "resend";
import { confirmWaitlistEmailTemplate } from "./templates/confirm-email.template";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      this.logger.error("❌ RESEND_API_KEY is missing");
      throw new Error("RESEND_API_KEY is required");
    }

    this.resend = new Resend(apiKey);

    // Tip: deja un log una sola vez para confirmar que levantó bien (sin exponer key)
    this.logger.log("✅ Resend client initialized");
  }

  async sendWaitlistConfirmEmail(params: { to: string; confirmUrl: string }) {
    const { to, confirmUrl } = params;

    /**
     * ✅ IMPORTANT:
     * Para producción, usa SIEMPRE un remitente de tu dominio verificado.
     * Ej: "IntelX <no-reply@intelxofficial.com>"
     *
     * Si MAIL_FROM no está, caemos a "no-reply@intelxofficial.com"
     * (ajústalo si tu dirección final cambia).
     */
    const brand = process.env.BRAND_NAME || "IntelX";
    const from =
      process.env.MAIL_FROM || `${brand} <no-reply@intelxofficial.com>`;

    const subject = `Confirm your ${brand} waitlist registration`;

    // ✅ tu misma plantilla
    const html = confirmWaitlistEmailTemplate({ confirmUrl });

    try {
      // Resend devuelve { data, error }
      const { data, error } = await this.resend.emails.send({
        from,
        to,
        subject,
        html,
      });

      if (error) {
        this.logger.error(
          `❌ Resend error sending to=${to}: ${error.message || error}`
        );
        throw new Error(error.message || "Resend error");
      }

      this.logger.log(`📨 Email sent via Resend -> to=${to} id=${data?.id}`);
      return { ok: true, id: data?.id };
    } catch (err: any) {
      this.logger.error(
        `❌ Error sending email via Resend to=${to}: ${err?.message || err}`
      );
      throw err;
    }
  }
}
