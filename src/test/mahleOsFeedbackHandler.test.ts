import { describe, expect, it, vi } from "vitest";
import {
  handleMahleOsFeedbackRead,
  type MahleOsFeedbackHandlerDependencies,
} from "../../supabase/functions/_shared/mahleOsFeedbackHandler";

const requestId = "11111111-1111-4111-8111-111111111111";
const generatedAt = "2026-07-23T15:30:00.000Z";

const validDatabaseResult = () => ({
  ok: true,
  schema_version: "mahleos-feedback-read-v1.1",
  request_id: requestId,
  generated_at: generatedAt,
  items: [
    {
      feedback_reference: "a".repeat(64),
      category: "bug",
      status: "open",
      created_at: generatedAt,
      message: "Beim Speichern blieb die Ansicht offen.",
      technical_context: {
        schema_version: "feedback-technical-context-v1",
        runtime: "native",
        platform: "ios",
        route: "/settings",
        online: true,
        app_version: "1.0.0",
      },
    },
  ],
  has_more: false,
  next_cursor_created_at: null,
  next_cursor_reference: null,
  privacy: {
    structured_user_identifiers_exported: false,
    recognized_direct_identifiers_redacted: true,
    free_text_may_contain_personal_data: true,
    admin_notes_exported: false,
    attachments_exported: false,
    model_safe_without_redaction: false,
  },
});

const dependencies = (
  overrides: Partial<MahleOsFeedbackHandlerDependencies> = {},
): MahleOsFeedbackHandlerDependencies => ({
  authenticate: vi.fn().mockResolvedValue(null),
  auditInvalidRequest: vi.fn().mockResolvedValue({ data: { ok: true }, error: null }),
  readPage: vi.fn().mockResolvedValue({ data: validDatabaseResult(), error: null }),
  randomUUID: () => requestId,
  ...overrides,
});

const request = (body: string, headers: Record<string, string> = {}) =>
  new Request("https://project.supabase.co/functions/v1/mahleos-feedback-read", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body,
  });

const body = async (response: Response) =>
  JSON.parse(await response.text()) as Record<string, unknown>;

describe("MahleOS feedback Edge handler", () => {
  it("rejects non-POST methods before authentication", async () => {
    const deps = dependencies();
    const response = await handleMahleOsFeedbackRead(
      new Request("https://project.supabase.co/functions/v1/mahleos-feedback-read"),
      deps,
    );

    expect(response.status).toBe(405);
    expect(await body(response)).toEqual({ error: "method_not_allowed" });
    expect(deps.authenticate).not.toHaveBeenCalled();
  });

  it.each([
    ["unauthorized", 401],
    ["service_not_configured", 503],
  ] as const)("maps %s authentication failures without reading data", async (error, status) => {
    const deps = dependencies({
      authenticate: vi.fn().mockResolvedValue(error),
    });
    const response = await handleMahleOsFeedbackRead(request("{}"), deps);

    expect(response.status).toBe(status);
    expect(await body(response)).toEqual({ error });
    expect(deps.auditInvalidRequest).not.toHaveBeenCalled();
    expect(deps.readPage).not.toHaveBeenCalled();
  });

  it("audits unsupported media, invalid JSON, unknown fields and oversized bodies", async () => {
    const deps = dependencies();
    const unsupported = await handleMahleOsFeedbackRead(
      request("{}", { "Content-Type": "text/plain" }),
      deps,
    );
    const invalidJson = await handleMahleOsFeedbackRead(request("{"), deps);
    const unknownField = await handleMahleOsFeedbackRead(
      request(JSON.stringify({ filter: "open" })),
      deps,
    );
    const oversized = await handleMahleOsFeedbackRead(request(`"${"x".repeat(1100)}"`), deps);

    expect(unsupported.status).toBe(415);
    expect(invalidJson.status).toBe(400);
    expect(unknownField.status).toBe(400);
    expect(oversized.status).toBe(413);
    expect(await body(unsupported)).toEqual({
      error: "unsupported_media_type",
      request_id: requestId,
    });
    expect(await body(invalidJson)).toEqual({ error: "invalid_json", request_id: requestId });
    expect(await body(unknownField)).toEqual({
      error: "invalid_request",
      request_id: requestId,
    });
    expect(await body(oversized)).toEqual({
      error: "request_too_large",
      request_id: requestId,
    });
    expect(deps.auditInvalidRequest).toHaveBeenNthCalledWith(1, {
      requestId,
      errorCode: "unsupported_media_type",
    });
    expect(deps.auditInvalidRequest).toHaveBeenNthCalledWith(2, {
      requestId,
      errorCode: "invalid_json",
    });
    expect(deps.auditInvalidRequest).toHaveBeenNthCalledWith(3, {
      requestId,
      errorCode: "invalid_schema",
    });
    expect(deps.auditInvalidRequest).toHaveBeenNthCalledWith(4, {
      requestId,
      errorCode: "request_too_large",
    });
    expect(deps.readPage).not.toHaveBeenCalled();
  });

  it("uses the shared server limit for invalid authenticated requests", async () => {
    const rateLimited = await handleMahleOsFeedbackRead(
      request("{"),
      dependencies({
        auditInvalidRequest: vi.fn().mockResolvedValue({
          data: { ok: false, error: "rate_limited" },
          error: null,
        }),
      }),
    );
    const auditUnavailable = await handleMahleOsFeedbackRead(
      request(JSON.stringify({ filter: "open" })),
      dependencies({
        auditInvalidRequest: vi.fn().mockResolvedValue({ data: null, error: "db" }),
      }),
    );

    expect(rateLimited.status).toBe(429);
    expect(await body(rateLimited)).toEqual({ error: "rate_limited", request_id: requestId });
    expect(auditUnavailable.status).toBe(503);
    expect(await body(auditUnavailable)).toEqual({
      error: "feedback_read_unavailable",
      request_id: requestId,
    });
  });

  it("passes only parsed paging parameters and projects a valid response", async () => {
    const readPage = vi.fn().mockResolvedValue({ data: validDatabaseResult(), error: null });
    const response = await handleMahleOsFeedbackRead(
      request(JSON.stringify({ limit: 10 })),
      dependencies({ readPage }),
    );
    const result = await body(response);

    expect(response.status).toBe(200);
    expect(readPage).toHaveBeenCalledWith({
      requestId,
      cursorCreatedAt: null,
      cursorReference: null,
      limit: 10,
    });
    expect(result).toMatchObject({
      ok: true,
      schema_version: "mahleos-feedback-read-v1.1",
      privacy: {
        free_text_may_contain_personal_data: true,
        model_safe_without_redaction: false,
      },
    });
    expect(result).not.toHaveProperty("next_cursor_reference");
  });

  it("uses the runtime UUID generator without losing its receiver", async () => {
    const readPage = vi.fn().mockResolvedValue({ data: validDatabaseResult(), error: null });
    const deps = dependencies({ readPage });
    delete deps.randomUUID;

    const response = await handleMahleOsFeedbackRead(request("{}"), deps);

    expect(response.status).toBe(200);
    expect(readPage).toHaveBeenCalledWith(expect.objectContaining({
      requestId: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      ),
    }));
  });

  it("maps database errors, rate limits and invalid projections fail closed", async () => {
    const unavailable = await handleMahleOsFeedbackRead(
      request("{}"),
      dependencies({ readPage: vi.fn().mockResolvedValue({ data: null, error: "db" }) }),
    );
    const rateLimited = await handleMahleOsFeedbackRead(
      request("{}"),
      dependencies({
        readPage: vi.fn().mockResolvedValue({
          data: { ok: false, error: "rate_limited" },
          error: null,
        }),
      }),
    );
    const drifted = validDatabaseResult() as Record<string, unknown>;
    drifted.private_email = "must-not-leave@example.com";
    const projectionFailed = await handleMahleOsFeedbackRead(
      request("{}"),
      dependencies({ readPage: vi.fn().mockResolvedValue({ data: drifted, error: null }) }),
    );

    expect(unavailable.status).toBe(503);
    expect(await body(unavailable)).toEqual({
      error: "feedback_read_unavailable",
      request_id: requestId,
    });
    expect(rateLimited.status).toBe(429);
    expect(await body(rateLimited)).toEqual({ error: "rate_limited", request_id: requestId });
    expect(projectionFailed.status).toBe(503);
    expect(await body(projectionFailed)).toEqual({
      error: "contract_projection_failed",
      request_id: requestId,
    });
  });

  it("does not expose thrown dependency details", async () => {
    const response = await handleMahleOsFeedbackRead(
      request("{}"),
      dependencies({
        readPage: vi.fn().mockRejectedValue(new Error("private@example.com secret-token")),
      }),
    );
    const serialized = JSON.stringify(await body(response));

    expect(response.status).toBe(503);
    expect(serialized).not.toContain("private@example.com");
    expect(serialized).not.toContain("secret-token");
  });
});
