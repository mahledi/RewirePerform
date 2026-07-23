import {
  readBoundedRequestText,
  RequestBodyTooLargeError,
} from "./boundedRequestBody.ts";
import {
  parseFeedbackReadRequest,
  projectFeedbackReadResult,
} from "./mahleOsFeedbackContractCore.ts";
import type { MahleOsMachineAuthError } from "./mahleOsMachineAuthCore.ts";

type FeedbackRpcResult = {
  data: unknown;
  error: unknown;
};

export type MahleOsFeedbackHandlerDependencies = {
  authenticate: (request: Request) => Promise<MahleOsMachineAuthError | null>;
  readPage: (parameters: {
    requestId: string;
    cursorCreatedAt: string | null;
    cursorId: string | null;
    limit: number;
  }) => Promise<FeedbackRpcResult>;
  randomUUID?: () => string;
};

const responseHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: responseHeaders });

export const handleMahleOsFeedbackRead = async (
  request: Request,
  dependencies: MahleOsFeedbackHandlerDependencies,
) => {
  if (request.method !== "POST") {
    return jsonResponse(405, { error: "method_not_allowed" });
  }

  const authenticationError = await dependencies.authenticate(request);
  if (authenticationError) {
    return jsonResponse(authenticationError === "service_not_configured" ? 503 : 401, {
      error: authenticationError,
    });
  }

  const contentType = request.headers.get("Content-Type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  if (contentType !== "application/json") {
    return jsonResponse(415, { error: "unsupported_media_type" });
  }

  let rawBody: string;
  try {
    rawBody = await readBoundedRequestText(request, 1024);
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

  const parsedRequest = parseFeedbackReadRequest(parsedBody);
  if (!parsedRequest) return jsonResponse(400, { error: "invalid_request" });

  const requestId = (dependencies.randomUUID ?? crypto.randomUUID)();
  try {
    const { data, error } = await dependencies.readPage({
      requestId,
      cursorCreatedAt: parsedRequest.cursor?.createdAt ?? null,
      cursorId: parsedRequest.cursor?.id ?? null,
      limit: parsedRequest.limit,
    });

    if (error) {
      return jsonResponse(503, { error: "feedback_read_unavailable", request_id: requestId });
    }

    const result = data as Record<string, unknown> | null;
    if (result?.ok !== true) {
      const code = typeof result?.error === "string" ? result.error : "feedback_read_unavailable";
      const status = code === "rate_limited"
        ? 429
        : code === "invalid_request"
          ? 400
          : 503;
      return jsonResponse(status, { error: code, request_id: requestId });
    }

    const projected = projectFeedbackReadResult(result);
    if (!projected) {
      return jsonResponse(503, { error: "contract_projection_failed", request_id: requestId });
    }
    return jsonResponse(200, projected);
  } catch {
    return jsonResponse(503, { error: "feedback_read_unavailable", request_id: requestId });
  }
};
