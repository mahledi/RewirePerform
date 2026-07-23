/**
 * mahleos-feedback-read - dedicated machine-to-machine feedback API
 *
 * This endpoint is intentionally separate from aggregate/evidence contracts.
 * It returns no account identifiers and projects every database response
 * through a strict allow-list before transmission.
 */
import { authenticateMahleOsFeedbackMachine } from "../_shared/mahleOsMachineAuth.ts";
import {
  readBoundedRequestText,
  RequestBodyTooLargeError,
} from "../_shared/boundedRequestBody.ts";
import {
  parseFeedbackReadRequest,
  projectFeedbackReadResult,
} from "../_shared/mahleOsFeedbackContractCore.ts";
import { serviceClient } from "../_shared/supabaseService.ts";

const responseHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: responseHeaders });

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "method_not_allowed" });
  }

  const authenticationError = await authenticateMahleOsFeedbackMachine(req);
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
    rawBody = await readBoundedRequestText(req, 1024);
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

  const request = parseFeedbackReadRequest(parsedBody);
  if (!request) return jsonResponse(400, { error: "invalid_request" });

  const requestId = crypto.randomUUID();
  try {
    const { data, error } = await serviceClient().rpc("read_mahleos_feedback_page", {
      _request_id: requestId,
      _client_id: "mahleos-feedback-v1",
      _cursor_created_at: request.cursor?.createdAt ?? null,
      _cursor_id: request.cursor?.id ?? null,
      _limit: request.limit,
    });

    if (error) {
      return jsonResponse(503, { error: "feedback_read_unavailable", request_id: requestId });
    }

    const result = data as Record<string, unknown> | null;
    if (result?.ok !== true) {
      const code = typeof result?.error === "string" ? result.error : "feedback_read_unavailable";
      const status = code === "rate_limited" ? 429
        : code === "invalid_request" ? 400
        : 503;
      return jsonResponse(status, { error: code, request_id: requestId });
    }

    const projected = projectFeedbackReadResult(result);
    if (!projected) {
      return jsonResponse(503, { error: "contract_projection_failed", request_id: requestId });
    }
    return jsonResponse(200, projected);
  } catch {
    console.error("mahleos-feedback-read failed");
    return jsonResponse(503, { error: "feedback_read_unavailable", request_id: requestId });
  }
});
