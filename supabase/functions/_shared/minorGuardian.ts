import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.99.3";
import { SUPPORT_EMAIL } from "./rewireEmail.ts";
import {
  buildGuardianInvitationEmail,
  buildGuardianReceiptEmail,
} from "./guardianEmails.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const PRODUCT_POLICY_VERSION = "minor_product_v1_2026_07";
export const GUARDIAN_NOTICE_VERSION = "guardian_notice_v2_2026_07";
export const GUARDIAN_DECISION_VERSION = "guardian_decision_v2_2026_07";
export const ATHLETE_ASSENT_VERSION = "athlete_assent_v2_2026_07";
export const DATA_CONTRIBUTION_VERSION = "data_contribution_v3_2026_07";

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

export const safeAthleteFirstName = (value: unknown) => {
  if (typeof value !== "string") return null;
  const firstName = value.normalize("NFC").trim().split(/\s+/u)[0] ?? "";
  if (!/^[\p{L}\p{M}][\p{L}\p{M}'’-]{0,39}$/u.test(firstName)) return null;
  return firstName;
};

export const athleteFirstName = async (admin: SupabaseClient, userId: string) => {
  const { data, error } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();
  if (error) return null;
  return safeAthleteFirstName(data?.full_name);
};

export const guardianInvitationEmail = (token: string, firstName?: string | null) =>
  buildGuardianInvitationEmail(publicAppUrl(), token, firstName);

export const guardianReceiptEmail = (managementToken: string, firstName?: string | null) =>
  buildGuardianReceiptEmail(publicAppUrl(), managementToken, firstName);

export const sendTransactionalEmail = async (
  to: string,
  message: { subject: string; text: string; html: string },
  idempotencyKey: string,
) => {
  const apiKey = requiredEnv("RESEND_API_KEY");
  const from = requiredEnv("GUARDIAN_EMAIL_FROM");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: SUPPORT_EMAIL,
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
  });
  if (!response.ok) throw new MinorFlowError("email_delivery_failed", 503);
  const result = await response.json().catch(() => ({})) as { id?: unknown };
  return typeof result.id === "string" ? result.id : null;
};

const configuredOrigins = () => new Set([
  "https://rewireperform.com",
  "https://www.rewireperform.com",
  "capacitor://rewireperform.com",
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
