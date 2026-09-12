/**
 * V1.2 DE-Production structured-only feedback gateway.
 *
 * This is versioned separately from the historical v0.2.1 gateway so its
 * byte-pinned evidence remains immutable. It accepts only the Jarvis
 * structured-only contract; the database RPC performs the final eligibility,
 * k>=5 and field allow-list checks.
 */
import { readBoundedRequestText, RequestBodyTooLargeError } from
  "../_shared/boundedRequestBody.ts";
import { feedbackIntelligenceProductionSql } from
  "../_shared/feedbackIntelligenceProductionDatabase.ts";
import {
  feedbackIntelligenceJsonResponse as jsonResponse,
  feedbackIntelligenceResponseHeaders as responseHeaders,
  parseFeedbackIntelligenceReplayHeaders,
} from "../_shared/feedbackIntelligenceGatewayHttp.ts";
import { authenticateFeedbackIntelligenceProductionMachine } from
  "../_shared/feedbackIntelligenceProductionMachineAuth.ts";

const PRODUCTION_URL = "https://bqsbxesmybthwtxmowfz.supabase.co";
const CLIENT_ID = "mahles-jarvis-feedback-intelligence-production";
const CONTRACT_VERSION = "1.2.0-structured-only-draft";
const SCHEMA_SHA256 = "1aa3b1ed3a56722c0b496b8dfc4a661bc364df4cec3bb838f41715e7b8570cff";
const PRODUCTION_GATE = "PRODUCTION_MANUAL_READ_APPROVED";
const ALLOWED_BODY_KEYS = new Set([
  "client_id",
  "contract_version",
  "schema_sha256",
  "data_scope",
]);

type RequestBody = {
  client_id?: unknown;
  contract_version?: unknown;
  schema_sha256?: unknown;
  data_scope?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const runtimeIsPinnedAndOpen = () =>
  Deno.env.get("SUPABASE_URL")?.trim() === PRODUCTION_URL
  && Deno.env.get("MAHLEOS_FEEDBACK_PRODUCTION_MACHINE_GATE")?.trim() === PRODUCTION_GATE
  && Deno.env.get("MAHLEOS_FEEDBACK_PRODUCTION_REAL_DATA_GATE")?.trim() === "true";

const errorStatus = (code: string) => {
  if (code === "replay_detected") return 409;
  if (code === "rate_limited") return 429;
  if (code === "contract_drift") return 409;
  if (code === "invalid_replay_headers") return 400;
  return 503;
};

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse(405, { error: "method_not_allowed" });
  }

  const authenticationError = await authenticateFeedbackIntelligenceProductionMachine(request);
  if (authenticationError) {
    return jsonResponse(authenticationError === "service_not_configured" ? 503 : 401, {
      error: authenticationError,
    });
  }
  if (!runtimeIsPinnedAndOpen()) {
    return jsonResponse(503, { error: "machine_gate_closed" });
  }

  const contentType = request.headers.get("Content-Type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") {
    return jsonResponse(415, { error: "unsupported_media_type" });
  }

  const replayHeaders = parseFeedbackIntelligenceReplayHeaders(request);
  if (!replayHeaders.valid) {
    return jsonResponse(400, replayHeaders.body, replayHeaders.requestId);
  }
  const { requestId, nonce, parsedIssuedAt } = replayHeaders;

  let rawBody: string;
  try {
    rawBody = await readBoundedRequestText(request, 1024);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return jsonResponse(413, { error: "request_too_large", request_id: requestId }, requestId);
    }
    return jsonResponse(400, { error: "invalid_request", request_id: requestId }, requestId);
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return jsonResponse(400, { error: "invalid_json", request_id: requestId }, requestId);
  }
  if (!isRecord(parsedBody) || Object.keys(parsedBody).some((key) => !ALLOWED_BODY_KEYS.has(key))) {
    return jsonResponse(400, { error: "invalid_request", request_id: requestId }, requestId);
  }

  const body = parsedBody as RequestBody;
  if (
    body.client_id !== CLIENT_ID
    || body.contract_version !== CONTRACT_VERSION
    || body.schema_sha256 !== SCHEMA_SHA256
    || body.data_scope !== "production"
  ) {
    return jsonResponse(409, { error: "contract_drift", request_id: requestId }, requestId);
  }

  try {
    const sql = feedbackIntelligenceProductionSql();
    const payload = await sql.begin(async (transaction) => {
      await transaction`
        SELECT
          set_config('request.mahleos_feedback_request_id', ${requestId}, true),
          set_config('request.mahleos_feedback_nonce', ${nonce}, true),
          set_config('request.mahleos_feedback_issued_at', ${new Date(parsedIssuedAt).toISOString()}, true)
      `;
      const rows = await transaction`
        SELECT feedback_machine_production.read_feedback_intelligence_production_structured_v1_2(
          ${CLIENT_ID}, ${CONTRACT_VERSION}, ${SCHEMA_SHA256}, 'production'
        ) AS payload
      `;
      return rows[0]?.payload as Record<string, unknown> | undefined;
    });

    const gatewayError = typeof payload?._gateway_error === "string" ? payload._gateway_error : null;
    if (gatewayError) {
      return jsonResponse(errorStatus(gatewayError), { error: gatewayError, request_id: requestId }, requestId);
    }
    if (
      !payload
      || payload.schema_version !== "rewire-feedback-intelligence-structured-export-v1.2.0-draft"
      || payload.contract_version !== CONTRACT_VERSION
      || payload.contract_status !== "PROPOSED_AWAITING_PRODUCER_CONFIRMATION"
    ) {
      return jsonResponse(503, { error: "feedback_read_unavailable", request_id: requestId }, requestId);
    }

    const encoded = JSON.stringify(payload);
    if (new TextEncoder().encode(encoded).byteLength > 8 * 1024 * 1024) {
      return jsonResponse(503, { error: "response_too_large", request_id: requestId }, requestId);
    }
    return new Response(encoded, {
      status: 200,
      headers: { ...responseHeaders, "X-MahleOS-Request-Id": requestId },
    });
  } catch {
    console.error("structured feedback Production machine read failed");
    return jsonResponse(503, { error: "feedback_read_unavailable", request_id: requestId }, requestId);
  }
});
