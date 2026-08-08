import { readBoundedRequestText, RequestBodyTooLargeError } from "../_shared/boundedRequestBody.ts";
import { serviceClient } from "../_shared/supabaseService.ts";

const MAXIMUM_BODY_BYTES = 24_000;
const ALLOWED_KEYS = new Set([
  "contact_name", "work_email", "phone", "job_title", "preferred_contact",
  "organization_name", "organization_type", "country_code", "website", "sports",
  "athlete_age_groups", "performance_levels", "team_count_band", "athlete_count_band",
  "coach_count_band", "rollout_scope", "desired_start", "goals", "support_needs",
  "context_note", "source", "locale", "privacy_version",
  "public_research_notice_acknowledged", "turnstile_token", "website_field",
]);

const ORGANIZATION_TYPES = new Set([
  "local_club", "academy", "performance_center", "school", "university",
  "association", "federation", "private_provider", "other",
]);
const TEAM_BANDS = new Set(["1", "2_5", "6_15", "16_plus", "unknown"]);
const ATHLETE_BANDS = new Set(["under_25", "25_99", "100_499", "500_plus", "unknown"]);
const COACH_BANDS = new Set(["1", "2_5", "6_20", "21_plus", "unknown"]);
const ROLLOUT_SCOPES = new Set(["single_team", "pilot", "multi_team", "organization_wide", "exploring"]);
const START_WINDOWS = new Set(["asap", "next_4_weeks", "next_3_months", "later", "unknown"]);
const CONTACT_MODES = new Set(["email", "phone", "video_call"]);
const SOURCES = new Set(["web", "ios", "admin", "referral"]);

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const responseHeaders = (origin: string | null) => ({
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  ...(origin ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
});

const jsonResponse = (status: number, body: JsonRecord, origin: string | null) =>
  new Response(JSON.stringify(body), { status, headers: responseHeaders(origin) });

const allowedOrigins = () => {
  const configured = (Deno.env.get("ORGANIZATION_INQUIRY_ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return new Set(["capacitor://localhost", "https://rewireperform.com", ...configured]);
};

const originForRequest = (request: Request) => {
  const origin = request.headers.get("Origin");
  if (!origin || !allowedOrigins().has(origin)) return null;
  return origin;
};

const text = (body: JsonRecord, key: string, minimum: number, maximum: number) => {
  const value = body[key];
  if (typeof value !== "string") throw new Error("invalid_request");
  const normalized = value.trim();
  if (normalized.length < minimum || normalized.length > maximum) throw new Error("invalid_request");
  return normalized;
};

const nullableText = (body: JsonRecord, key: string, maximum: number) => {
  const value = body[key];
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || value.trim().length > maximum) throw new Error("invalid_request");
  return value.trim();
};

const stringList = (body: JsonRecord, key: string, maximumItems = 12) => {
  const value = body[key];
  if (!Array.isArray(value) || value.length > maximumItems) throw new Error("invalid_request");
  const result = value.map((item) => {
    if (typeof item !== "string" || !item.trim() || item.trim().length > 100) throw new Error("invalid_request");
    return item.trim();
  });
  return [...new Set(result)];
};

const enumText = (body: JsonRecord, key: string, allowed: Set<string>) => {
  const value = text(body, key, 1, 80);
  if (!allowed.has(value)) throw new Error("invalid_request");
  return value;
};

const verifyTurnstile = async (token: string, remoteIp: string | null) => {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY")?.trim();
  if (!secret) throw new Error("service_not_configured");
  const form = new FormData();
  form.set("secret", secret);
  form.set("response", token);
  if (remoteIp) form.set("remoteip", remoteIp);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) return false;
  const result = await response.json() as { success?: unknown };
  return result.success === true;
};

Deno.serve(async (request) => {
  const origin = originForRequest(request);
  if (request.method === "OPTIONS") {
    return origin
      ? new Response("ok", { headers: responseHeaders(origin) })
      : jsonResponse(403, { error: "origin_not_allowed" }, null);
  }
  if (request.method !== "POST") return jsonResponse(405, { error: "method_not_allowed" }, origin);
  if (!origin) return jsonResponse(403, { error: "origin_not_allowed" }, null);
  if (Deno.env.get("ORGANIZATION_INQUIRY_PUBLIC_ENABLED") !== "true") {
    return jsonResponse(503, { error: "service_not_available" }, origin);
  }
  if (request.headers.get("Content-Type")?.split(";", 1)[0]?.trim().toLowerCase() !== "application/json") {
    return jsonResponse(415, { error: "unsupported_media_type" }, origin);
  }

  let rawBody: string;
  try {
    rawBody = await readBoundedRequestText(request, MAXIMUM_BODY_BYTES);
  } catch (error) {
    return jsonResponse(error instanceof RequestBodyTooLargeError ? 413 : 400, {
      error: error instanceof RequestBodyTooLargeError ? "request_too_large" : "invalid_request",
    }, origin);
  }

  try {
    const parsed = JSON.parse(rawBody) as unknown;
    if (!isRecord(parsed) || Object.keys(parsed).some((key) => !ALLOWED_KEYS.has(key))) {
      throw new Error("invalid_request");
    }
    if (typeof parsed.website_field !== "string" || parsed.website_field !== "") {
      return jsonResponse(202, { ok: true, reference_code: "RP-RECEIVED" }, origin);
    }

    const turnstileToken = text(parsed, "turnstile_token", 10, 2048);
    const remoteIp = request.headers.get("CF-Connecting-IP");
    if (!await verifyTurnstile(turnstileToken, remoteIp)) {
      return jsonResponse(400, { error: "verification_failed" }, origin);
    }

    const workEmail = text(parsed, "work_email", 5, 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(workEmail)) throw new Error("invalid_request");
    const websiteInput = nullableText(parsed, "website", 500);
    let website: string | null = null;
    if (websiteInput) {
      const url = new URL(websiteInput);
      if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("invalid_request");
      if (url.username || url.password) throw new Error("invalid_request");
      url.hash = "";
      website = url.toString();
    }
    if (parsed.public_research_notice_acknowledged !== true) throw new Error("invalid_request");

    const row = {
      contact_name: text(parsed, "contact_name", 2, 120),
      work_email: workEmail,
      phone: nullableText(parsed, "phone", 60),
      job_title: text(parsed, "job_title", 2, 120),
      preferred_contact: enumText(parsed, "preferred_contact", CONTACT_MODES),
      organization_name: text(parsed, "organization_name", 2, 180),
      organization_type: enumText(parsed, "organization_type", ORGANIZATION_TYPES),
      country_code: text(parsed, "country_code", 2, 2).toUpperCase(),
      website,
      sports: stringList(parsed, "sports"),
      athlete_age_groups: stringList(parsed, "athlete_age_groups"),
      performance_levels: stringList(parsed, "performance_levels"),
      team_count_band: enumText(parsed, "team_count_band", TEAM_BANDS),
      athlete_count_band: enumText(parsed, "athlete_count_band", ATHLETE_BANDS),
      coach_count_band: enumText(parsed, "coach_count_band", COACH_BANDS),
      rollout_scope: enumText(parsed, "rollout_scope", ROLLOUT_SCOPES),
      desired_start: enumText(parsed, "desired_start", START_WINDOWS),
      goals: stringList(parsed, "goals"),
      support_needs: stringList(parsed, "support_needs"),
      context_note: nullableText(parsed, "context_note", 1600),
      source: enumText(parsed, "source", SOURCES),
      locale: text(parsed, "locale", 2, 16),
      privacy_version: text(parsed, "privacy_version", 5, 80),
      public_research_notice_acknowledged: true,
    };

    if (row.sports.length === 0 || row.goals.length === 0 || row.support_needs.length === 0) {
      throw new Error("invalid_request");
    }

    const admin = serviceClient();
    const { data, error } = await admin.rpc("submit_organization_access_request_service", {
      _payload: row,
    });
    if (error) {
      if (error.code === "23505") return jsonResponse(409, { error: "open_request_exists" }, origin);
      console.error("organization inquiry insert failed", { code: error.code });
      return jsonResponse(503, { error: "service_unavailable" }, origin);
    }

    const result = data as { reference_code?: unknown } | null;
    if (typeof result?.reference_code !== "string") {
      return jsonResponse(503, { error: "service_unavailable" }, origin);
    }
    return jsonResponse(201, { ok: true, reference_code: result.reference_code }, origin);
  } catch (error) {
    const code = error instanceof Error ? error.message : "invalid_request";
    return jsonResponse(code === "service_not_configured" ? 503 : 400, {
      error: code === "service_not_configured" ? code : "invalid_request",
    }, origin);
  }
});
