/**
 * Prepared local-worker bridge for founder-triggered Jarvis analysis.
 * It only claims/completes queue RPCs and never reads product tables.
 */
import { authenticateMahleOsMachine } from "../_shared/mahleOsMachineAuth.ts";
import {
  readBoundedRequestText,
  RequestBodyTooLargeError,
} from "../_shared/boundedRequestBody.ts";
import { serviceClient } from "../_shared/supabaseService.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const WORKER = /^mahleos-local-[a-f0-9]{16}$/u;
const FAILURE = /^[A-Z0-9_]{2,80}$/u;
const FINAL = new Set(["FERTIG", "BLOCKIERT", "FEHLGESCHLAGEN"]);
const RESULT_KEYS = new Set([
  "schema_version", "summary", "developments", "comparisons", "data_quality",
  "temporal_links", "review_areas", "founder_questions", "sources", "limitations",
]);
const FORBIDDEN = /\b(name|email|user_id|athlete_id|coach_id|team_id|program_id|subject_reference|journal|reflection|comment|free_text|raw_text|raw_answer|individual_score)\b/iu;
const EMAIL = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/u;

const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};
const response = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers });
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const resultIsSafe = (value: unknown) => {
  if (!record(value) || Object.keys(value).some((key) => !RESULT_KEYS.has(key))) return false;
  if (value.schema_version !== "jarvis-deep-analysis-result-v1" || typeof value.summary !== "string") return false;
  const encoded = JSON.stringify(value);
  return encoded.length <= 48_000 && !FORBIDDEN.test(encoded) && !EMAIL.test(encoded);
};

Deno.serve(async (request) => {
  if (request.method !== "POST") return response(405, { error: "method_not_allowed" });
  const authError = await authenticateMahleOsMachine(request);
  if (authError) return response(authError === "service_not_configured" ? 503 : 401, { error: authError });
  if (request.headers.get("Content-Type")?.split(";", 1)[0]?.trim().toLowerCase() !== "application/json") {
    return response(415, { error: "unsupported_media_type" });
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readBoundedRequestText(request, 52_000));
  } catch (error) {
    return response(error instanceof RequestBodyTooLargeError ? 413 : 400, {
      error: error instanceof RequestBodyTooLargeError ? "request_too_large" : "invalid_request",
    });
  }
  if (!record(parsed) || !WORKER.test(String(parsed.worker_id ?? ""))) {
    return response(400, { error: "invalid_request" });
  }
  const client = serviceClient();
  if (parsed.action === "claim" && Object.keys(parsed).every((key) => ["action", "worker_id"].includes(key))) {
    const { data, error } = await client.rpc("claim_jarvis_deep_analysis_job", {
      _worker_id: parsed.worker_id,
    });
    return error ? response(503, { error: "queue_unavailable" }) : response(200, record(data) ? data : { job: null });
  }
  if (
    parsed.action === "complete"
    && Object.keys(parsed).every((key) => ["action", "worker_id", "request_id", "status", "result", "failure_code"].includes(key))
    && UUID.test(String(parsed.request_id ?? ""))
    && FINAL.has(String(parsed.status ?? ""))
    && (parsed.failure_code === null || FAILURE.test(String(parsed.failure_code)))
    && ((parsed.status === "FERTIG" && resultIsSafe(parsed.result)) || (parsed.status !== "FERTIG" && parsed.result === null))
  ) {
    const { error } = await client.rpc("complete_jarvis_deep_analysis_job", {
      _request_id: parsed.request_id,
      _worker_id: parsed.worker_id,
      _status: parsed.status,
      _result: parsed.result,
      _failure_code: parsed.failure_code,
    });
    return error ? response(503, { error: "queue_unavailable" }) : response(200, { ok: true });
  }
  return response(400, { error: "invalid_request" });
});
