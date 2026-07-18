import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.99.3";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const PRODUCT_POLICY_VERSION = "minor_product_v1_2026_07";
export const GUARDIAN_NOTICE_VERSION = "guardian_notice_v1_2026_07";
export const GUARDIAN_DECISION_VERSION = "guardian_decision_v1_2026_07";
export const ATHLETE_ASSENT_VERSION = "athlete_assent_v1_2026_07";
export const DATA_CONTRIBUTION_VERSION = "data_contribution_v2_2026_07";

export type JsonRecord = Record<string, unknown>;

export class MinorFlowError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message = code,
  ) {
    super(message);
  }
}

const requiredEnv = (key: string) => {
  const value = Deno.env.get(key)?.trim();
  if (!value) throw new MinorFlowError("service_not_configured", 503);
  return value;
};

const publicAppUrl = () => {
  try {
    const url = new URL(requiredEnv("APP_PUBLIC_URL"));
    if (
      url.protocol !== "https:"
      || url.username
      || url.password
      || url.search
      || url.hash
      || (url.pathname !== "/" && url.pathname !== "")
    ) {
      throw new Error("invalid");
    }
    return url.origin;
  } catch {
    throw new MinorFlowError("service_not_configured", 503);
  }
};

export const adminClient = (): SupabaseClient =>
  createClient(
    requiredEnv("SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

export const authenticatedUser = async (req: Request) => {
  const authorization = req.headers.get("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token) throw new MinorFlowError("unauthorized", 401);

  const client = createClient(
    requiredEnv("SUPABASE_URL"),
    requiredEnv("SUPABASE_ANON_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) throw new MinorFlowError("unauthorized", 401);
  return user;
};

export const invokeMinorService = async (
  admin: SupabaseClient,
  action: string,
  userId: string | null,
  payload: JsonRecord = {},
) => {
  const { data, error } = await admin.rpc("minor_service_action", {
    _action: action,
    _user_id: userId,
    _payload: payload,
  });
  if (error) {
    const message = error.message ?? "minor_service_failed";
    if (message.includes("guardian_rate_limit_reached")) {
      throw new MinorFlowError("rate_limit_reached", 429);
    }
    if (message.includes("age_band_change_requires_support")) {
      throw new MinorFlowError("age_change_requires_support", 409);
    }
    if (
      message.includes("guardian_token_invalid")
      || message.includes("management_token_invalid")
      || message.includes("guardian_policy_replaced")
    ) {
      throw new MinorFlowError("link_invalid", 410);
    }
    if (message.includes("authorization_required") || message.includes("age_band_required")) {
      throw new MinorFlowError("authorization_required", 409);
    }
    throw new MinorFlowError("minor_service_failed", 500);
  }
  return (data ?? {}) as JsonRecord;
};

const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

const base64ToBytes = (value: string) => {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

export const randomToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return bytesToBase64(bytes)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
};

export const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return bytesToHex(new Uint8Array(digest));
};

export const normalizeGuardianEmail = (value: unknown) => {
  if (typeof value !== "string") throw new MinorFlowError("invalid_email", 400);
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
    throw new MinorFlowError("invalid_email", 400);
  }
  return email;
};

export const maskEmail = (email: string) => {
  const [local, domain] = email.split("@");
  const visibleLocal = local.slice(0, Math.min(1, local.length));
  const [domainName, ...suffix] = domain.split(".");
  const visibleDomain = domainName.slice(0, Math.min(1, domainName.length));
  return `${visibleLocal}•••@${visibleDomain}•••.${suffix.join(".")}`;
};

const encryptionKey = async () => {
  const raw = base64ToBytes(requiredEnv("GUARDIAN_EMAIL_ENCRYPTION_KEY_B64"));
  if (raw.byteLength !== 32) throw new MinorFlowError("service_not_configured", 503);
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
};

export const encryptEmail = async (email: string) => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await encryptionKey();
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(email));
  return {
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
    iv: bytesToBase64(iv),
  };
};

export const decryptEmail = async (ciphertext: string, iv: string) => {
  const key = await encryptionKey();
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBytes(iv) },
      key,
      base64ToBytes(ciphertext),
    );
    return decoder.decode(decrypted);
  } catch {
    throw new MinorFlowError("guardian_email_unavailable", 503);
  }
};

export const guardianEmailHash = async (email: string) => {
  const secret = requiredEnv("GUARDIAN_EMAIL_HASH_KEY");
  if (secret.length < 32) throw new MinorFlowError("service_not_configured", 503);
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(email));
  return bytesToHex(new Uint8Array(signature));
};

const escaped = (value: string) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const emailFrame = (title: string, content: string) => `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#f4f6f8;color:#18212f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<div style="padding:32px 16px"><div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #dfe4ea;border-radius:8px;overflow:hidden">
<div style="padding:20px 28px;border-bottom:1px solid #e6e9ee;font-weight:700">RewirePerform</div>
<div style="padding:30px 28px"><h1 style="font-size:24px;line-height:1.3;margin:0 0 18px">${escaped(title)}</h1>${content}</div>
<div style="padding:18px 28px;background:#f8fafb;border-top:1px solid #e6e9ee;font-size:12px;line-height:1.6;color:#667085">
Mahle Herzog, Wiefeldick 16, 42699 Solingen, Deutschland<br>
Datenschutz und Support: <a href="mailto:hello@rewireperform.com">hello@rewireperform.com</a>
</div></div></div></body></html>`;

const actionButton = (label: string, href: string) =>
  `<p style="margin:24px 0"><a href="${escaped(href)}" style="display:inline-block;background:#177a5f;color:#fff;text-decoration:none;font-weight:700;padding:13px 18px;border-radius:6px">${escaped(label)}</a></p>`;

export const guardianInvitationEmail = (token: string) => {
  const appUrl = publicAppUrl();
  const decisionUrl = `${appUrl}/guardian/decision#token=${encodeURIComponent(token)}`;
  const privacyUrl = `${appUrl}/privacy`;
  const title = "Bitte entscheide über den RewirePerform-Zugang";
  return {
    subject: title,
    text: [
      "Hallo,",
      "eine minderjährige Person hat deine E-Mail-Adresse selbst in RewirePerform angegeben.",
      "Über den persönlichen Link erfährst du, welche Daten das Performance-Programm verarbeitet, was ein Trainer sieht und was privat bleibt.",
      "Der Link ist 48 Stunden gültig und nur einmal nutzbar. Es wird kein Elternkonto erstellt. Trainer und Verein erhalten weder die Adresse noch deine Entscheidung.",
      "Die verschlüsselte Kopie der Adresse wird im RewirePerform-Autorisierungssystem spätestens sieben Tage nach Erstellung gelöscht und nicht für Marketing verwendet.",
      decisionUrl,
      `Datenschutz: ${privacyUrl}`,
      "Fragen oder Widerruf: hello@rewireperform.com",
      "Verantwortlich: Mahle Herzog, Wiefeldick 16, 42699 Solingen, Deutschland",
    ].join("\n\n"),
    html: emailFrame(title, [
      "<p style=\"line-height:1.65;color:#475467\">Hallo,</p>",
      "<p style=\"line-height:1.65;color:#475467\">Eine minderjährige Person hat deine E-Mail-Adresse selbst in RewirePerform angegeben. Über den persönlichen Link erfährst du, welche Daten das Performance-Programm verarbeitet, was ein Trainer sieht und was privat bleibt.</p>",
      actionButton("Information ansehen und entscheiden", decisionUrl),
      "<p style=\"line-height:1.65;color:#475467\">Der Link ist 48 Stunden gültig und nur einmal nutzbar. Es wird kein Elternkonto erstellt. Trainer und Verein erhalten weder die Adresse noch deine Entscheidung.</p>",
      "<p style=\"line-height:1.65;color:#475467\">Die verschlüsselte Kopie der Adresse wird im RewirePerform-Autorisierungssystem spätestens sieben Tage nach Erstellung gelöscht und nicht für Marketing verwendet. <a href=\"" + escaped(privacyUrl) + "\">Datenschutzerklärung öffnen</a>.</p>",
    ].join("")),
  };
};

export const guardianReceiptEmail = (managementToken: string) => {
  const appUrl = publicAppUrl();
  const manageUrl = `${appUrl}/guardian/decision#manage=${encodeURIComponent(managementToken)}`;
  const privacyUrl = `${appUrl}/privacy`;
  const title = "Deine RewirePerform-Entscheidung wurde gespeichert";
  return {
    subject: title,
    manageUrl,
    text: [
      "Deine Entscheidung wurde gespeichert.",
      "Die minderjährige Person muss nun zusätzlich selbst zustimmen, bevor datenabhängige Programmfunktionen freigeschaltet werden.",
      "Über diesen persönlichen Link kannst du die Freigabe widerrufen:",
      manageUrl,
      "Der Link bleibt bis zu 370 Tage aktiv. Du kannst dich unabhängig davon jederzeit direkt an uns wenden.",
      `Datenschutz: ${privacyUrl}`,
      "Alternativ erreichst du uns unter hello@rewireperform.com.",
      "Verantwortlich: Mahle Herzog, Wiefeldick 16, 42699 Solingen, Deutschland",
    ].join("\n\n"),
    html: emailFrame(title, [
      "<p style=\"line-height:1.65;color:#475467\">Deine Entscheidung wurde gespeichert. Die minderjährige Person muss nun zusätzlich selbst zustimmen, bevor datenabhängige Programmfunktionen freigeschaltet werden.</p>",
      actionButton("Freigabe verwalten oder widerrufen", manageUrl),
      "<p style=\"line-height:1.65;color:#475467\">Bewahre diesen bis zu 370 Tage aktiven Link sicher auf. Alternativ kannst du dich jederzeit an hello@rewireperform.com wenden. <a href=\"" + escaped(privacyUrl) + "\">Datenschutzerklärung öffnen</a>.</p>",
    ].join("")),
  };
};

export const sendTransactionalEmail = async (
  to: string,
  message: { subject: string; text: string; html: string },
) => {
  const apiKey = requiredEnv("RESEND_API_KEY");
  const from = requiredEnv("GUARDIAN_EMAIL_FROM");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify({ from, to: [to], subject: message.subject, text: message.text, html: message.html }),
  });
  if (!response.ok) throw new MinorFlowError("email_delivery_failed", 503);
  const result = await response.json().catch(() => ({})) as { id?: unknown };
  return typeof result.id === "string" ? result.id : null;
};

const configuredOrigins = () => new Set([
  "https://rewireperform.com",
  "https://www.rewireperform.com",
  "capacitor://localhost",
  "http://localhost",
  "http://localhost:4173",
  "http://localhost:5173",
  ...(Deno.env.get("GUARDIAN_ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
]);

export const corsHeaders = (req: Request) => {
  const origin = req.headers.get("Origin") ?? "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
  if (origin && configuredOrigins().has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
};

export const assertAllowedOrigin = (req: Request) => {
  const origin = req.headers.get("Origin");
  if (origin && !configuredOrigins().has(origin)) {
    throw new MinorFlowError("origin_not_allowed", 403);
  }
};

export const jsonResponse = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

export const parseJson = async (req: Request): Promise<JsonRecord> => {
  if (req.method !== "POST") throw new MinorFlowError("method_not_allowed", 405);
  const raw = await req.text();
  if (raw.length > 8_192) throw new MinorFlowError("request_too_large", 413);
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid");
    return value as JsonRecord;
  } catch {
    throw new MinorFlowError("invalid_request", 400);
  }
};

export const publicError = (req: Request, error: unknown) => {
  const known = error instanceof MinorFlowError ? error : new MinorFlowError("unexpected_error", 500);
  return jsonResponse(req, { error: known.code }, known.status);
};
