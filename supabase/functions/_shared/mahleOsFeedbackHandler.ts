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

type InvalidRequestAuditCode =
  | "unsupported_media_type"
  | "request_too_large"
  | "invalid_json"
  | "invalid_schema"
  | "invalid_request";

export type MahleOsFeedbackHandlerDependencies = {
  authenticate: (request: Request) => Promise<MahleOsMachineAuthError | null>;
  auditInvalidRequest: (parameters: {
    requestId: string;
    errorCode: InvalidRequestAuditCode;
  }) => Promise<FeedbackRpcResult>;
  readPage: (parameters: {
    requestId: string;
    cursorCreatedAt: string | null;
    cursorReference: string | null;
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

const authenticatedRequestErrors: Record<
  InvalidRequestAuditCode,
  { status: number; responseCode: string }
> = {
  unsupported_media_type: { status: 415, responseCode: "unsupported_media_type" },
  request_too_large: { status: 413, responseCode: "request_too_large" },
  invalid_json: { status: 400, responseCode: "invalid_json" },
  invalid_schema: { status: 400, responseCode: "invalid_request" },
  invalid_request: { status: 400, responseCode: "invalid_request" },
};

const isExactRecord = (value: unknown, keys: string[]): value is Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const actualKeys = Object.keys(value);
  return actualKeys.length === keys.length && actualKeys.every((key) => keys.includes(key));
};

const auditAuthenticatedRequestError = async (
  requestId: string,
  errorCode: InvalidRequestAuditCode,
  dependencies: MahleOsFeedbackHandlerDependencies,
) => {
  try {
    const { data, error } = await dependencies.auditInvalidRequest({ requestId, errorCode });
    if (error) {
      return jsonResponse(503, { error: "feedback_read_unavailable", request_id: requestId });
    }
    if (isExactRecord(data, ["ok"]) && data.ok === true) {
      const response = authenticatedRequestErrors[errorCode];
      return jsonResponse(response.status, {
        error: response.responseCode,
        request_id: requestId,
      });
    }
    if (
      isExactRecord(data, ["ok", "error"])
      && data.ok === false
      && data.error === "rate_limited"
    ) {
      return jsonResponse(429, { error: "rate_limited", request_id: requestId });
    }
    return jsonResponse(503, { error: "feedback_read_unavailable", request_id: requestId });
  } catch {
    return jsonResponse(503, { error: "feedback_read_unavailable", request_id: requestId });
  }
};

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

  const requestId = (dependencies.randomUUID ?? crypto.randomUUID)();
  const contentType = request.headers.get("Content-Type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  if (contentType !== "application/json") {
    return auditAuthenticatedRequestError(requestId, "unsupported_media_type", dependencies);
  }

  let rawBody: string;
  try {
    rawBody = await readBoundedRequestText(request, 1024);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return auditAuthenticatedRequestError(requestId, "request_too_large", dependencies);
    }
    return auditAuthenticatedRequestError(requestId, "invalid_request", dependencies);
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return auditAuthenticatedRequestError(requestId, "invalid_json", dependencies);
  }

  const parsedRequest = parseFeedbackReadRequest(parsedBody);
  if (!parsedRequest) {
    return auditAuthenticatedRequestError(requestId, "invalid_schema", dependencies);
  }

  try {
    const { data, error } = await dependencies.readPage({
      requestId,
      cursorCreatedAt: parsedRequest.cursor?.createdAt ?? null,
      cursorReference: parsedRequest.cursor?.reference ?? null,
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
