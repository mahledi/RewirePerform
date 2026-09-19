/**
 * V1.3 DE-Production structured feedback gateway.
 * Server-derived solo/team mode; no team identifier or free text.
 */
import { readBoundedRequestText, RequestBodyTooLargeError } from "../_shared/boundedRequestBody.ts";
import { feedbackIntelligenceProductionSql } from "../_shared/feedbackIntelligenceProductionDatabase.ts";
import {
  feedbackIntelligenceJsonResponse as jsonResponse,
  feedbackIntelligenceResponseHeaders as responseHeaders,
  parseFeedbackIntelligenceReplayHeaders,
} from "../_shared/feedbackIntelligenceGatewayHttp.ts";
import { authenticateFeedbackIntelligenceProductionMachine } from "../_shared/feedbackIntelligenceProductionMachineAuth.ts";

const PRODUCTION_URL = "https://bqsbxesmybthwtxmowfz.supabase.co";
const CLIENT_ID = "mahles-jarvis-feedback-intelligence-production";
const CONTRACT_VERSION = "1.3.0-participation-mode-draft";
const SCHEMA_SHA256 = "e666b8c48f5de2ab32154d7b4b347e9d3eefeaa49fed22f448a5f0e98202b516";
const PRODUCTION_GATE = "PRODUCTION_MANUAL_READ_APPROVED";
const ALLOWED_BODY_KEYS = new Set(["client_id", "contract_version", "schema_sha256", "data_scope"]);

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
  if (request.method !== "POST") return jsonResponse(405, { error: "method_not_allowed" });
  const authenticationError = await authenticateFeedbackIntelligenceProductionMachine(request);
  if (authenticationError) {
    return jsonResponse(authenticationError === "service_not_configured" ? 503 : 401, { error: authenticationError });
  }
  if (!runtimeIsPinnedAndOpen()) return jsonResponse(503, { error: "machine_gate_closed" });
  const contentType = request.headers.get("Content-Type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") return jsonResponse(415, { error: "unsupported_media_type" });

  const replayHeaders = parseFeedbackIntelligenceReplayHeaders(request);
  if (!replayHeaders.valid) return jsonResponse(400, replayHeaders.body, replayHeaders.requestId);
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
  if (body.client_id !== CLIENT_ID || body.contract_version !== CONTRACT_VERSION
    || body.schema_sha256 !== SCHEMA_SHA256 || body.data_scope !== "production") {
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
        SELECT feedback_machine_production.read_feedback_intelligence_production_structured_v1_3(
          ${CLIENT_ID}, ${CONTRACT_VERSION}, ${SCHEMA_SHA256}, 'production'
        ) AS payload
      `;
      return rows[0]?.payload as Record<string, unknown> | undefined;
    });
    const gatewayError = typeof payload?._gateway_error === "string" ? payload._gateway_error : null;
    if (gatewayError) return jsonResponse(errorStatus(gatewayError), { error: gatewayError, request_id: requestId }, requestId);
    if (!payload
      || payload.schema_version !== "rewire-feedback-intelligence-structured-export-v1.3.0-draft"
      || payload.contract_version !== CONTRACT_VERSION
      || payload.contract_status !== "LOCAL_ACCEPTED_AWAITING_PRODUCTION_PRIVILEGE_GATE") {
      return jsonResponse(503, { error: "feedback_read_unavailable", request_id: requestId }, requestId);
    }
    const encoded = JSON.stringify(payload);
    if (new TextEncoder().encode(encoded).byteLength > 8 * 1024 * 1024) {
      return jsonResponse(503, { error: "response_too_large", request_id: requestId }, requestId);
    }
    return new Response(encoded, { status: 200, headers: { ...responseHeaders, "X-MahleOS-Request-Id": requestId } });
  } catch {
    console.error("structured feedback V1.3 Production machine read failed");
    return jsonResponse(503, { error: "feedback_read_unavailable", request_id: requestId }, requestId);
  }
});
