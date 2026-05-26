export interface ConfirmEmailTemplateParams {
  confirmUrl: string;
}

const BRAND_NAME = process.env.BRAND_NAME || "IntelX";
const BRAND_WEBSITE = process.env.BRAND_WEBSITE || "https://intelxofficial.com";
const LOGO_URL =
  process.env.MAIL_LOGO_URL ||
  "https://res.cloudinary.com/dadsc3j2x/image/upload/v1765664657/Web3_Company_Logo_IntelX_jn8ds1.png";

// ✅ Tus iconos (PNG blancos)
const SOCIALS = [
  {
    href: process.env.SOCIAL_TWITTER || "https://x.com/intelx",
    img: "https://res.cloudinary.com/dadsc3j2x/image/upload/v1765678286/x_zxsa01.png",
    alt: "X",
  },
  {
    href: process.env.SOCIAL_DISCORD || "https://discord.gg/xxxxx",
    img: "https://res.cloudinary.com/dadsc3j2x/image/upload/v1765678274/discord_ewd8es.png",
    alt: "Discord",
  },
  {
    href: process.env.SOCIAL_TELEGRAM || "https://t.me/xxxxx",
    img: "https://res.cloudinary.com/dadsc3j2x/image/upload/v1765678282/telegram_qrdgmk.png",
    alt: "Telegram",
  },
  {
    href:
      process.env.SOCIAL_GITHUB ||
      "https://github.com/turkomaticeth-eng/intelx-token",
    img: "https://res.cloudinary.com/dadsc3j2x/image/upload/v1765678274/github_stuti8.png",
    alt: "GitHub",
  },
].filter((s) => !!s.href);

export function confirmWaitlistEmailTemplate({
  confirmUrl,
}: ConfirmEmailTemplateParams): string {
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width" />
  <title>Confirm your email</title>
</head>

<body style="margin:0;padding:0;background:#050A18;font-family:Arial,Helvetica,sans-serif;color:#EAF2FF;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050A18;padding:44px 0;">
    <tr>
      <td align="center" style="padding:0 14px;">

        <!-- CARD -->
        <table width="600" cellpadding="0" cellspacing="0"
          style="
            width:600px; max-width:600px;
            border-radius:20px;
            overflow:hidden;
            border:1px solid rgba(82,209,255,.18);
            box-shadow:0 26px 70px rgba(0,0,0,.55);
            background: radial-gradient(1200px 420px at 50% -10%, rgba(82,209,255,.18), rgba(0,0,0,0)),
                        linear-gradient(180deg,#071A34 0%, #050A18 80%);
          ">

          <!-- TOP BAR -->
          <tr>
            <td style="padding:22px 26px;border-bottom:1px solid rgba(255,255,255,.06);">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left" valign="middle">
                    <a href="${BRAND_WEBSITE}" target="_blank" style="text-decoration:none;">
                      <img src="${LOGO_URL}" width="120" height="120" alt="${BRAND_NAME}"
                        style="display:block;border-radius:18px;" />
                    </a>
                  </td>
                  <td align="right" valign="middle" style="font-size:12px;color:#9CB1D8;">
                    Secure confirmation
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CONTENT -->
          <tr>
            <td style="padding:30px 34px 18px 34px;">
              <div style="font-size:34px;font-weight:800;letter-spacing:-0.6px;margin:0 0 12px 0;line-height:1.2;">
                Confirm your email
              </div>

              <div style="font-size:14px;line-height:1.75;color:#B9C9E8;margin:0 0 22px 0;">
                You're one step away from joining the <b>${BRAND_NAME}</b> early-access waitlist.
                Confirm your email to lock in your spot for beta rewards and first access.
              </div>

              <!-- BUTTON (Big-tech style, reliable in email clients) -->
              <table cellpadding="0" cellspacing="0" style="margin:10px 0 18px 0;">
                <tr>
                  <td align="left">
                    <a href="${confirmUrl}"
                       style="
                         display:inline-block;
                         background:#2F8CFF;
                         color:#061023;
                         text-decoration:none;
                         font-weight:800;
                         font-size:14px;
                         padding:14px 22px;
                         border-radius:999px;
                         border:1px solid rgba(255,255,255,.14);
                         box-shadow:0 10px 24px rgba(47,140,255,.22);
                         letter-spacing:.2px;
                       ">
                      Confirm registration
                    </a>
                  </td>
                </tr>
              </table>

              <!-- FALLBACK -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="
                  background:rgba(0,0,0,.25);
                  border:1px solid rgba(255,255,255,.08);
                  border-radius:14px;
                  margin:16px 0 0 0;
                ">
                <tr>
                  <td style="padding:14px 14px;">
                    <div style="font-size:12px;color:#9CB1D8;line-height:1.55;margin:0 0 6px 0;">
                      If the button doesn’t work, use this secure link:
                    </div>
                    <a href="${confirmUrl}" style="font-size:12px;color:#52D1FF;word-break:break-all;">
                      ${confirmUrl}
                    </a>
                  </td>
                </tr>
              </table>

              <div style="margin-top:16px;font-size:12px;color:#8198C2;line-height:1.6;">
                If you didn’t request this, you can safely ignore this email.
              </div>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td align="center" style="padding:22px 26px 28px 26px;border-top:1px solid rgba(255,255,255,.06);">

              <!-- SOCIAL ICON BUTTONS (centered, no names) -->
              <table cellpadding="0" cellspacing="0" align="center" style="margin:6px 0 14px 0;">
                <tr>
                  ${SOCIALS.map(
                    (s) => `
                    <td align="center" style="padding:0 10px;">
                      <a href="${s.href}" target="_blank" style="text-decoration:none;">
                        <table cellpadding="0" cellspacing="0"
                          style="
                            width:38px;height:38px;
                            border-radius:999px;
                            background:rgba(255,255,255,.06);
                            border:1px solid rgba(255,255,255,.10);
                          ">
                          <tr>
                            <td align="center" valign="middle">
                              <img src="${s.img}" width="18" height="18" alt="${s.alt}" style="display:block;" />
                            </td>
                          </tr>
                        </table>
                      </a>
                    </td>
                  `,
                  ).join("")}
                </tr>
              </table>

              <div style="font-size:11px;color:#6F86AE;line-height:1.6;">
                © ${year} ${BRAND_NAME}. All rights reserved.<br/>
                This is an automated message. Please do not reply.
              </div>

            </td>
          </tr>

        </table>
        <!-- END CARD -->

      </td>
    </tr>
  </table>
</body>
</html>`;
}
