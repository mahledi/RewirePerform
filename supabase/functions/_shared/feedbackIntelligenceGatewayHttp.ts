const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const NONCE_PATTERN = /^[a-f0-9]{64}$/u;

export const feedbackIntelligenceResponseHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

export const feedbackIntelligenceJsonResponse = (
  status: number,
  body: Record<string, unknown>,
  requestId?: string,
) => new Response(JSON.stringify(body), {
  status,
  headers: requestId
    ? { ...feedbackIntelligenceResponseHeaders, "X-MahleOS-Request-Id": requestId }
    : feedbackIntelligenceResponseHeaders,
});

type ValidReplayHeaders = {
  valid: true;
  requestId: string;
  nonce: string;
  parsedIssuedAt: number;
};

type InvalidReplayHeaders = {
  valid: false;
  requestId?: string;
  body: {
    error: "invalid_replay_headers";
    request_id?: string;
  };
};

export const parseFeedbackIntelligenceReplayHeaders = (
  request: Request,
  now = Date.now(),
): ValidReplayHeaders | InvalidReplayHeaders => {
  const requestId = request.headers.get("X-MahleOS-Request-Id")?.trim().toLowerCase() ?? "";
  const nonce = request.headers.get("X-MahleOS-Nonce")?.trim() ?? "";
  const issuedAt = request.headers.get("X-MahleOS-Request-Timestamp")?.trim() ?? "";
  const parsedIssuedAt = Date.parse(issuedAt);
  const requestIdIsValid = UUID_PATTERN.test(requestId);

  if (
    !requestIdIsValid
    || !NONCE_PATTERN.test(nonce)
    || !Number.isFinite(parsedIssuedAt)
    || Math.abs(now - parsedIssuedAt) > 5 * 60 * 1000
  ) {
    return requestIdIsValid
      ? {
          valid: false,
          requestId,
          body: { error: "invalid_replay_headers", request_id: requestId },
        }
      : {
          valid: false,
          body: { error: "invalid_replay_headers" },
        };
  }

  return { valid: true, requestId, nonce, parsedIssuedAt };
};
