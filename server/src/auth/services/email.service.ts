/**
 * Email Service
 * 
 * Servicio para envío de emails usando Resend.
 * Maneja verificación OTP y emails transaccionales.
 * 
 * Ubicación: src/auth/services/email.service.ts
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

interface SendOtpEmailParams {
  to: string;
  name: string;
  otpCode: string;
}

interface SendWelcomeEmailParams {
  to: string;
  name: string;
}

interface SendPasswordResetEmailParams {
  to: string;
  name: string;
  resetToken: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;
  private readonly fromEmail: string;
  private readonly appName = 'IntelX';
  private readonly appUrl: string;
  private readonly logoUrl = 'https://res.cloudinary.com/dadsc3j2x/image/upload/v1765664657/Web3_Company_Logo_IntelX_jn8ds1.png';

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY not configured - emails will be logged only');
    }
    this.resend = new Resend(apiKey);
    this.fromEmail = this.configService.get<string>('EMAIL_FROM') || 'IntelX <no-reply@intelxofficial.com>';
    this.logger.log(`📧 Email FROM: ${this.fromEmail}`);
    this.appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
  }

  /**
   * Envía email con código OTP para verificación
   */
  async sendOtpEmail({ to, name, otpCode }: SendOtpEmailParams): Promise<boolean> {
    const subject = `Your IntelX verification code: ${otpCode}`;
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #030817; color: #ffffff;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #030817;">
    <tr>
      <td align="center" style="padding: 60px 20px;">
        <table role="presentation" style="width: 100%; max-width: 520px; border-collapse: collapse;">
          
          <!-- Logo Section -->
          <tr>
            <td align="center" style="padding-bottom: 40px;">
              <img src="${this.logoUrl}" alt="IntelX" width="180" height="180" style="display: block; border: 0;" />
            </td>
          </tr>
          
          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" style="width: 100%; border-collapse: collapse; background: linear-gradient(180deg, rgba(31, 179, 255, 0.08) 0%, rgba(7, 20, 39, 0.95) 100%); border: 1px solid rgba(31, 179, 255, 0.2); border-radius: 24px; overflow: hidden;">
                
                <!-- Header Gradient Bar -->
                <tr>
                  <td style="height: 4px; background: linear-gradient(90deg, #1fb3ff 0%, #0ea5e9 50%, #1fb3ff 100%);"></td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 48px 40px;">
                    <h1 style="margin: 0 0 12px; font-size: 28px; font-weight: 700; color: #ffffff; text-align: center; letter-spacing: -0.5px;">
                      Verify Your Email
                    </h1>
                    
                    <p style="margin: 0 0 36px; font-size: 16px; line-height: 1.7; color: rgba(255, 255, 255, 0.7); text-align: center;">
                      Hi <span style="color: #1fb3ff; font-weight: 600;">${name || 'there'}</span>,<br>
                      Welcome to IntelX! Enter this code to verify your account:
                    </p>
                    
                    <!-- OTP Code Box -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 36px;">
                      <tr>
                        <td align="center">
                          <div style="display: inline-block; background: linear-gradient(135deg, rgba(31, 179, 255, 0.15) 0%, rgba(31, 179, 255, 0.05) 100%); border: 2px solid #1fb3ff; border-radius: 16px; padding: 24px 48px;">
                            <span style="font-size: 48px; font-weight: 800; letter-spacing: 16px; color: #1fb3ff; font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;">
                              ${otpCode}
                            </span>
                          </div>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Timer Info -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td align="center">
                          <div style="display: inline-flex; align-items: center; background: rgba(31, 179, 255, 0.1); border-radius: 100px; padding: 12px 24px;">
                            <span style="font-size: 14px; color: rgba(255, 255, 255, 0.6);">
                              ⏱️ Code expires in <strong style="color: #1fb3ff;">10 minutes</strong>
                            </span>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Help Text -->
          <tr>
            <td style="padding-top: 32px;">
              <p style="margin: 0; font-size: 14px; color: rgba(255, 255, 255, 0.4); text-align: center; line-height: 1.6;">
                If you didn't create an account with IntelX,<br>you can safely ignore this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 48px; border-top: 1px solid rgba(255, 255, 255, 0.08); margin-top: 32px;">
              <p style="margin: 0 0 8px; font-size: 13px; color: rgba(255, 255, 255, 0.5); font-weight: 500;">
                IntelX
              </p>
              <p style="margin: 0; font-size: 12px; color: rgba(255, 255, 255, 0.3);">
                Behavioral Intelligence for Football
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    return this.sendEmail(to, subject, html);
  }

  /**
   * Envía email de bienvenida después de verificación exitosa
   */
  async sendWelcomeEmail({ to, name }: SendWelcomeEmailParams): Promise<boolean> {
    const subject = `Welcome to IntelX, ${name}! 🎉`;
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #030817; color: #ffffff;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #030817;">
    <tr>
      <td align="center" style="padding: 60px 20px;">
        <table role="presentation" style="width: 100%; max-width: 520px;">
          
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 40px;">
              <img src="${this.logoUrl}" alt="IntelX" width="180" height="180" style="display: block; border: 0;" />
            </td>
          </tr>
          
          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" style="width: 100%; border-collapse: collapse; background: linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, rgba(7, 20, 39, 0.95) 100%); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 24px; overflow: hidden;">
                
                <!-- Header Gradient Bar -->
                <tr>
                  <td style="height: 4px; background: linear-gradient(90deg, #10b981 0%, #059669 50%, #10b981 100%);"></td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 48px 40px;">
                    <div style="text-align: center; margin-bottom: 8px; font-size: 48px;">🎉</div>
                    
                    <h1 style="margin: 0 0 12px; font-size: 28px; font-weight: 700; color: #ffffff; text-align: center; letter-spacing: -0.5px;">
                      Welcome to IntelX!
                    </h1>
                    
                    <p style="margin: 0 0 36px; font-size: 16px; line-height: 1.7; color: rgba(255, 255, 255, 0.7); text-align: center;">
                      Hi <span style="color: #10b981; font-weight: 600;">${name}</span>,<br>
                      Your email has been verified. You're all set to explore AI-powered football intelligence.
                    </p>
                    
                    <!-- Features -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 36px;">
                      <tr>
                        <td style="background: rgba(31, 179, 255, 0.06); border: 1px solid rgba(31, 179, 255, 0.15); border-radius: 16px; padding: 24px;">
                          <p style="margin: 0 0 16px; font-size: 14px; font-weight: 700; color: #1fb3ff; text-transform: uppercase; letter-spacing: 1px;">
                            What you can do now
                          </p>
                          <table role="presentation" style="width: 100%; border-collapse: collapse;">
                            <tr>
                              <td style="padding: 8px 0; font-size: 15px; color: rgba(255, 255, 255, 0.8);">
                                <span style="color: #1fb3ff; margin-right: 12px;">⚡</span> AI-powered match predictions
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; font-size: 15px; color: rgba(255, 255, 255, 0.8);">
                                <span style="color: #1fb3ff; margin-right: 12px;">📊</span> Analyze 12 behavioral signals
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; font-size: 15px; color: rgba(255, 255, 255, 0.8);">
                                <span style="color: #1fb3ff; margin-right: 12px;">🎯</span> Real-time football intelligence
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- CTA Button -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td align="center">
                          <a href="${this.appUrl}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #1fb3ff 0%, #0ea5e9 100%); color: #ffffff; text-decoration: none; padding: 18px 48px; border-radius: 14px; font-weight: 700; font-size: 16px; letter-spacing: 0.5px;">
                            Go to Dashboard →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 48px;">
              <p style="margin: 0 0 8px; font-size: 13px; color: rgba(255, 255, 255, 0.5); font-weight: 500;">
                IntelX
              </p>
              <p style="margin: 0; font-size: 12px; color: rgba(255, 255, 255, 0.3);">
                Behavioral Intelligence for Football
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    return this.sendEmail(to, subject, html);
  }

  /**
   * Envía email para restablecer contraseña
   */
  async sendPasswordResetEmail({ to, name, resetToken }: SendPasswordResetEmailParams): Promise<boolean> {
    const subject = `Reset your IntelX password`;
    const resetUrl = `${this.appUrl}/reset-password?token=${resetToken}`;
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #030817; color: #ffffff;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #030817;">
    <tr>
      <td align="center" style="padding: 60px 20px;">
        <table role="presentation" style="width: 100%; max-width: 520px;">
          
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 40px;">
              <img src="${this.logoUrl}" alt="IntelX" width="180" height="180" style="display: block; border: 0;" />
            </td>
          </tr>
          
          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" style="width: 100%; border-collapse: collapse; background: linear-gradient(180deg, rgba(251, 146, 60, 0.08) 0%, rgba(7, 20, 39, 0.95) 100%); border: 1px solid rgba(251, 146, 60, 0.2); border-radius: 24px; overflow: hidden;">
                
                <!-- Header Gradient Bar -->
                <tr>
                  <td style="height: 4px; background: linear-gradient(90deg, #fb923c 0%, #f97316 50%, #fb923c 100%);"></td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 48px 40px;">
                    <div style="text-align: center; margin-bottom: 8px; font-size: 48px;">🔐</div>
                    
                    <h1 style="margin: 0 0 12px; font-size: 28px; font-weight: 700; color: #ffffff; text-align: center; letter-spacing: -0.5px;">
                      Reset Your Password
                    </h1>
                    
                    <p style="margin: 0 0 36px; font-size: 16px; line-height: 1.7; color: rgba(255, 255, 255, 0.7); text-align: center;">
                      Hi <span style="color: #fb923c; font-weight: 600;">${name || 'there'}</span>,<br>
                      We received a request to reset your password. Click below to create a new one:
                    </p>
                    
                    <!-- CTA Button -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 36px;">
                      <tr>
                        <td align="center">
                          <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #fb923c 0%, #f97316 100%); color: #ffffff; text-decoration: none; padding: 18px 48px; border-radius: 14px; font-weight: 700; font-size: 16px; letter-spacing: 0.5px;">
                            Reset Password
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Timer Info -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td align="center">
                          <div style="display: inline-flex; align-items: center; background: rgba(251, 146, 60, 0.1); border-radius: 100px; padding: 12px 24px;">
                            <span style="font-size: 14px; color: rgba(255, 255, 255, 0.6);">
                              ⏱️ Link expires in <strong style="color: #fb923c;">1 hour</strong>
                            </span>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Security Notice -->
          <tr>
            <td style="padding-top: 24px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse; background: rgba(239, 68, 68, 0.06); border: 1px solid rgba(239, 68, 68, 0.15); border-radius: 16px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="margin: 0; font-size: 14px; color: rgba(255, 255, 255, 0.7); text-align: center; line-height: 1.6;">
                      <span style="color: #ef4444; font-weight: 600;">🔒 Security tip:</span><br>
                      Never share this link. IntelX will never ask for your password.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Help Text -->
          <tr>
            <td style="padding-top: 24px;">
              <p style="margin: 0; font-size: 14px; color: rgba(255, 255, 255, 0.4); text-align: center; line-height: 1.6;">
                If you didn't request a password reset,<br>you can safely ignore this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 48px;">
              <p style="margin: 0 0 8px; font-size: 13px; color: rgba(255, 255, 255, 0.5); font-weight: 500;">
                IntelX
              </p>
              <p style="margin: 0; font-size: 12px; color: rgba(255, 255, 255, 0.3);">
                Behavioral Intelligence for Football
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    return this.sendEmail(to, subject, html);
  }

  /**
   * Método interno para enviar emails
   */
  private async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    try {
      // Si no hay API key, solo loguear
      if (!this.configService.get<string>('RESEND_API_KEY')) {
        this.logger.log(`[DEV MODE] Email to ${to}: ${subject}`);
        this.logger.debug(`HTML content length: ${html.length} chars`);
        return true;
      }

      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject,
        html,
      });

      if (error) {
        this.logger.error(`Failed to send email to ${to}:`, error);
        return false;
      }

      this.logger.log(`Email sent to ${to}: ${data?.id}`);
      return true;
    } catch (error) {
      this.logger.error(`Email send error to ${to}:`, error);
      return false;
    }
  }
}
