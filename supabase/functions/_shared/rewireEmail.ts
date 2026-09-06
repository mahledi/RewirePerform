export const SUPPORT_EMAIL = "support@rewireperform.com";

const escapeHtml = (value: string) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

type BrandedEmailShell = {
  appUrl: string;
  preheader: string;
  eyebrow: string;
  title: string;
  body: string;
  action?: string;
  note?: string;
};

export const brandedEmailShell = ({
  appUrl,
  preheader,
  eyebrow,
  title,
  body,
  action = "",
  note = "",
}: BrandedEmailShell) => `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>${escapeHtml(title)}</title>
    <style>
      @media only screen and (max-width: 620px) {
        .email-wrap { padding: 16px 10px !important; }
        .email-card { border-radius: 8px !important; }
        .email-body { padding: 30px 22px 28px !important; }
        .email-title { font-size: 25px !important; line-height: 32px !important; }
        .email-button { display: block !important; width: auto !important; }
      }
      @media (prefers-color-scheme: dark) {
        .email-bg { background: #0d1014 !important; }
        .email-card { background: #161a1f !important; border-color: #2a3037 !important; }
        .email-title, .email-copy, .email-brand { color: #f3f5f4 !important; }
        .email-muted, .email-footer { color: #a8b0ad !important; }
        .email-note { background: #1d2328 !important; border-color: #30383e !important; }
        .email-link { color: #5bd1aa !important; }
      }
      [data-ogsc] .email-bg { background: #0d1014 !important; }
      [data-ogsc] .email-card { background: #161a1f !important; border-color: #2a3037 !important; }
      [data-ogsc] .email-title, [data-ogsc] .email-copy, [data-ogsc] .email-brand { color: #f3f5f4 !important; }
      [data-ogsc] .email-muted, [data-ogsc] .email-footer { color: #a8b0ad !important; }
    </style>
  </head>
  <body class="email-bg" style="margin:0;padding:0;background:#f3f6f5;-webkit-text-size-adjust:100%;word-spacing:normal;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">${escapeHtml(preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="email-bg" style="width:100%;background:#f3f6f5;border-collapse:collapse;">
      <tr>
        <td align="center" class="email-wrap" style="padding:34px 18px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="email-card" style="width:100%;max-width:560px;background:#ffffff;border:1px solid #dfe6e3;border-top:4px solid #2ead89;border-radius:8px;border-collapse:separate;overflow:hidden;">
            <tr>
              <td class="email-body" style="padding:38px 42px 36px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                  <tr>
                    <td width="44" height="44" bgcolor="#0d0e12" style="width:44px;height:44px;border-radius:8px;vertical-align:middle;">
                      <a href="${escapeHtml(appUrl)}" style="display:block;width:44px;height:44px;text-decoration:none;">
                        <img src="${escapeHtml(appUrl)}/brand/rewireperform-email-dark-256.png" alt="" width="44" height="44" style="display:block;width:44px;height:44px;border:0;outline:none;text-decoration:none;">
                      </a>
                    </td>
                    <td style="padding-left:12px;vertical-align:middle;">
                      <a href="${escapeHtml(appUrl)}" class="email-brand" style="display:inline-block;color:#111816;text-decoration:none;font-size:18px;line-height:24px;font-weight:750;letter-spacing:0;">RewirePerform</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:38px 0 10px;color:#218a6a;font-size:12px;line-height:18px;font-weight:700;letter-spacing:0;text-transform:uppercase;">${escapeHtml(eyebrow)}</p>
                <h1 class="email-title" style="margin:0;color:#111816;font-size:29px;line-height:36px;font-weight:750;letter-spacing:0;">${escapeHtml(title)}</h1>
                <div class="email-copy" style="margin-top:18px;color:#3d4945;font-size:16px;line-height:25px;letter-spacing:0;">${body}</div>${action}${note}
              </td>
            </tr>
          </table>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:560px;border-collapse:collapse;">
            <tr>
              <td align="center" class="email-footer" style="padding:20px 18px 0;color:#68736f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:12px;line-height:19px;letter-spacing:0;">
                Diese transaktionale Sicherheitsmail wurde von RewirePerform gesendet.<br>
                Hilfe erhältst du im <a href="${escapeHtml(appUrl)}/support" class="email-link" style="color:#218a6a;text-decoration:underline;">Support-Bereich</a>.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

export const brandedEmailButton = (label: string, href: string) => `
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 0;border-collapse:separate;">
                  <tr>
                    <td align="center" bgcolor="#2ead89" style="border-radius:8px;">
                      <a href="${escapeHtml(href)}" class="email-button" style="display:inline-block;padding:14px 22px;color:#0d0e12;background:#2ead89;border:1px solid #2ead89;border-radius:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:15px;line-height:20px;font-weight:750;text-decoration:none;letter-spacing:0;">${escapeHtml(label)}</a>
                    </td>
                  </tr>
                </table>`;

export const brandedEmailNote = (content: string) => `
                <div class="email-note" style="margin-top:28px;padding:16px 18px;background:#f4f7f6;border:1px solid #dfe6e3;border-radius:8px;">
                  <div class="email-muted" style="margin:0;color:#68736f;font-size:13px;line-height:20px;">${content}</div>
                </div>`;

export const safeEmailHtml = escapeHtml;
