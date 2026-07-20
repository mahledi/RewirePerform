/**
 * evidence-read - machine-to-machine, read-only Evidence API
 *
 * It serves only pre-created, active aggregate Data Locks. The machine key is
 * stored in the Edge Function environment and in MahleOS Keychain, never in a
 * browser or repository. Live athlete tables are not queried here.
 */
import { adminClient } from "../_shared/minorGuardian.ts";

const encoder = new TextEncoder();
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const SPORT_CATEGORIES = new Set([
  "invasion_team_sport",
  "net_or_target_sport",
  "combat_sport",
  "aesthetic_or_technical_sport",
  "endurance_sport",
  "strength_power_sport",
  "precision_sport",
  "unknown_or_other",
]);
const SPORT_LEVELS = new Set([
  "youth",
  "amateur",
  "competitive_amateur",
  "semi_pro",
  "pro",
  "college",
]);

type RequestBody = {
  lock_id?: unknown;
  scope_type?: unknown;
  program_run_id?: unknown;
  sport_category?: unknown;
  sport_level?: unknown;
};

const responseHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: responseHeaders });

const digest = async (value: string) =>
  new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));

const constantTimeEqual = (left: Uint8Array, right: Uint8Array) => {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
};

const authenticateMachine = async (req: Request) => {
  const configuredKey = Deno.env.get("MAHLEOS_EVIDENCE_API_KEY")?.trim() ?? "";
  if (configuredKey.length < 32) return "service_not_configured" as const;

  const authorization = req.headers.get("Authorization") ?? "";
  const suppliedKey = authorization.replace(/^Bearer\s+/iu, "");
  if (!suppliedKey) return "unauthorized" as const;

  const [expectedDigest, suppliedDigest] = await Promise.all([
    digest(configuredKey),
    digest(suppliedKey),
  ]);
  return constantTimeEqual(expectedDigest, suppliedDigest) ? null : "unauthorized" as const;
};

const optionalUuid = (value: unknown) => {
  if (value === undefined || value === null || value === "") return null;
  return typeof value === "string" && UUID_PATTERN.test(value) ? value : undefined;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "method_not_allowed" });
  }

  const authenticationError = await authenticateMachine(req);
  if (authenticationError) {
    return jsonResponse(authenticationError === "service_not_configured" ? 503 : 401, {
      error: authenticationError,
    });
  }

  const contentType = req.headers.get("Content-Type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") {
    return jsonResponse(415, { error: "unsupported_media_type" });
  }

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return jsonResponse(400, { error: "invalid_request" });
  }

  if (encoder.encode(rawBody).byteLength > 4096) {
    return jsonResponse(413, { error: "request_too_large" });
  }

  let body: RequestBody;
  try {
    body = JSON.parse(rawBody) as RequestBody;
  } catch {
    return jsonResponse(400, { error: "invalid_json" });
  }

  const lockId = optionalUuid(body.lock_id);
  const programRunId = optionalUuid(body.program_run_id);
  const scopeType = body.scope_type === undefined || body.scope_type === null
    ? null
    : body.scope_type;
  const sportCategory = body.sport_category === undefined || body.sport_category === null
    ? null
    : body.sport_category;
  const sportLevel = body.sport_level === undefined || body.sport_level === null
    ? null
    : body.sport_level;

  if (
    lockId === undefined
    || programRunId === undefined
    || (scopeType !== null && scopeType !== "program_run" && scopeType !== "solo_aggregate")
    || (sportCategory !== null && (typeof sportCategory !== "string" || !SPORT_CATEGORIES.has(sportCategory)))
    || (sportLevel !== null && (typeof sportLevel !== "string" || !SPORT_LEVELS.has(sportLevel)))
  ) {
    return jsonResponse(400, { error: "invalid_request" });
  }

  const requestId = crypto.randomUUID();
  try {
    const { data, error } = await adminClient().rpc("read_evidence_data_lock_for_export", {
      _request_id: requestId,
      _client_id: "mahleos-v1",
      _lock_id: lockId,
      _scope_type: scopeType,
      _program_run_id: programRunId,
      _sport_category: sportCategory,
      _sport_level: sportLevel,
    });

    if (error) return jsonResponse(503, { error: "evidence_read_unavailable", request_id: requestId });

    const result = data as Record<string, unknown> | null;
    if (result?.ok === true) {
      return jsonResponse(200, { ...result, request_id: requestId });
    }

    const code = typeof result?.error === "string" ? result.error : "evidence_read_unavailable";
    const status = code === "not_found" ? 404
      : code === "rate_limited" ? 429
      : code === "invalid_request" ? 400
      : 503;
    return jsonResponse(status, { error: code, request_id: requestId });
  } catch {
    console.error("evidence-read failed");
    return jsonResponse(503, { error: "evidence_read_unavailable", request_id: requestId });
  }
});
