/**
 * mahleos-read - machine-to-machine, read-only operational API
 *
 * Only allow-listed aggregate views are available. The function never queries
 * live tables directly and never returns athlete identifiers or private text.
 */
import { authenticateMahleOsMachine } from "../_shared/mahleOsMachineAuth.ts";
import {
  readBoundedRequestText,
  RequestBodyTooLargeError,
} from "../_shared/boundedRequestBody.ts";
import { serviceClient } from "../_shared/supabaseService.ts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const ALLOWED_VIEWS = new Set([
  "daily_brief",
  "system_health",
  "tracking_quality",
  "feedback_status",
  "pilot_readiness",
  "pilot_catalog",
  "solo_readiness",
  "evidence_status",
  "admin_overview",
  "admin_teams",
  "admin_comprehension",
  "admin_feedback_metadata",
  "admin_partner_requests",
]);
const ALLOWED_BODY_KEYS = new Set(["view", "program_run_id"]);

type RequestBody = {
  view?: unknown;
  program_run_id?: unknown;
};

const responseHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: responseHeaders });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "method_not_allowed" });
  }

  const authenticationError = await authenticateMahleOsMachine(req);
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
    rawBody = await readBoundedRequestText(req, 2048);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return jsonResponse(413, { error: "request_too_large" });
    }
    return jsonResponse(400, { error: "invalid_request" });
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return jsonResponse(400, { error: "invalid_json" });
  }

  if (
    !isRecord(parsedBody)
    || Object.keys(parsedBody).some((key) => !ALLOWED_BODY_KEYS.has(key))
  ) {
    return jsonResponse(400, { error: "invalid_request" });
  }

  const body = parsedBody as RequestBody;
  const view = body.view ?? "daily_brief";
  const programRunId = body.program_run_id ?? null;

  if (
    typeof view !== "string"
    || !ALLOWED_VIEWS.has(view)
    || (view === "pilot_readiness"
      ? typeof programRunId !== "string" || !UUID_PATTERN.test(programRunId)
      : programRunId !== null)
  ) {
    return jsonResponse(400, { error: "invalid_request" });
  }

  const requestId = crypto.randomUUID();
  try {
    const { data, error } = await serviceClient().rpc("read_mahleos_operational_view", {
      _request_id: requestId,
      _client_id: "mahleos-v1",
      _view_name: view,
      _program_run_id: programRunId,
    });

    if (error) {
      return jsonResponse(503, { error: "operations_read_unavailable", request_id: requestId });
    }

    const result = data as Record<string, unknown> | null;
    if (result?.ok === true) return jsonResponse(200, result);

    const code = typeof result?.error === "string" ? result.error : "operations_read_unavailable";
    const status = code === "not_found" ? 404
      : code === "rate_limited" ? 429
      : code === "invalid_request" ? 400
      : 503;
    return jsonResponse(status, { error: code, request_id: requestId });
  } catch {
    console.error("mahleos-read failed");
    return jsonResponse(503, { error: "operations_read_unavailable", request_id: requestId });
  }
});
