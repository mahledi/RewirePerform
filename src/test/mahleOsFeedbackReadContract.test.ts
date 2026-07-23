import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  decodeFeedbackCursor,
  encodeFeedbackCursor,
  parseFeedbackReadRequest,
  projectFeedbackReadResult,
} from "../../supabase/functions/_shared/mahleOsFeedbackContractCore";

const readRepoFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const requestId = "11111111-1111-4111-8111-111111111111";
const feedbackId = "22222222-2222-4222-8222-222222222222";
const createdAt = "2026-07-23T15:30:00.123456+00:00";

const validResult = () => ({
  ok: true,
  schema_version: "mahleos-feedback-read-v1",
  request_id: requestId,
  generated_at: createdAt,
  items: [
    {
      feedback_reference: "a".repeat(64),
      category: "bug",
      status: "open",
      created_at: createdAt,
      message: "Der Speichern-Button reagiert nicht.",
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
  has_more: true,
  next_cursor_created_at: createdAt,
  next_cursor_id: feedbackId,
  privacy: {
    user_identifiers_exported: false,
    admin_notes_exported: false,
    attachments_exported: false,
    model_safe_without_redaction: false,
  },
});

describe("MahleOS feedback read contract", () => {
  it("accepts only bounded exact requests and round-trips opaque cursors", () => {
    expect(parseFeedbackReadRequest({})).toEqual({ cursor: null, limit: 25 });
    expect(parseFeedbackReadRequest({ limit: 5 })).toEqual({ cursor: null, limit: 5 });
    expect(parseFeedbackReadRequest({ limit: 0 })).toBeNull();
    expect(parseFeedbackReadRequest({ limit: 26 })).toBeNull();
    expect(parseFeedbackReadRequest({ filter: "open" })).toBeNull();

    const encoded = encodeFeedbackCursor({ createdAt, id: feedbackId });
    expect(decodeFeedbackCursor(encoded)).toEqual({ createdAt, id: feedbackId });
    expect(parseFeedbackReadRequest({ cursor: `${encoded}tampered` })).toBeNull();
  });

  it("projects only explicitly approved feedback fields", () => {
    const projected = projectFeedbackReadResult(validResult());

    expect(projected).toMatchObject({
      ok: true,
      schema_version: "mahleos-feedback-read-v1",
      request_id: requestId,
      has_more: true,
      privacy: {
        user_identifiers_exported: false,
        model_safe_without_redaction: false,
      },
    });
    expect(projected?.next_cursor).toEqual(expect.any(String));
    expect(JSON.stringify(projected)).not.toContain("next_cursor_id");
  });

  it("fails closed on schema drift, identifiers and unsafe privacy claims", () => {
    expect(projectFeedbackReadResult({ ...validResult(), user_id: feedbackId })).toBeNull();

    const resultWithItemIdentifier = validResult();
    resultWithItemIdentifier.items[0] = {
      ...resultWithItemIdentifier.items[0],
      user_id: feedbackId,
    } as never;
    expect(projectFeedbackReadResult(resultWithItemIdentifier)).toBeNull();

    const resultWithUnknownContext = validResult();
    resultWithUnknownContext.items[0].technical_context = {
      ...resultWithUnknownContext.items[0].technical_context,
      device_identifier: "private",
    } as never;
    expect(projectFeedbackReadResult(resultWithUnknownContext)).toBeNull();

    const falselyModelSafe = validResult();
    falselyModelSafe.privacy.model_safe_without_redaction = true;
    expect(projectFeedbackReadResult(falselyModelSafe)).toBeNull();
  });

  it("keeps the edge function separate, machine-authenticated and non-browser-accessible", () => {
    const edge = readRepoFile("supabase/functions/mahleos-feedback-read/index.ts");
    const auth = readRepoFile("supabase/functions/_shared/mahleOsMachineAuth.ts");
    const config = readRepoFile("supabase/config.toml");

    expect(edge).toContain('req.method !== "POST"');
    expect(edge).toContain("readBoundedRequestText(req, 1024)");
    expect(edge).toContain("parseFeedbackReadRequest");
    expect(edge).toContain("projectFeedbackReadResult");
    expect(edge).toContain('rpc("read_mahleos_feedback_page"');
    expect(edge).not.toContain(".from(");
    expect(edge).not.toContain("Access-Control-Allow-Origin");
    expect(auth).toContain('Deno.env.get("MAHLEOS_FEEDBACK_READ_KEY")');
    expect(config).toContain("[functions.mahleos-feedback-read]\nverify_jwt = false");
  });

  it("uses a service-only, append-only and test-excluding database contract", () => {
    const migration = readRepoFile(
      "supabase/migrations/20260723154047_mahleos_feedback_read_contract_v1.sql",
    );

    expect(migration).toContain("mahleos_feedback_access_log_append_only");
    expect(migration).toContain("recent_requests >= 30");
    expect(migration).toContain("NOT COALESCE(p.is_test_user, false)");
    expect(migration).toContain("TO service_role");
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("'user_identifiers_exported', false");
    expect(migration).toContain("'model_safe_without_redaction', false");
    expect(migration).not.toContain("p.full_name");
    expect(migration).not.toContain("p.email");
    expect(migration).not.toMatch(/jsonb_build_object\(\s*'user_id'/u);
  });
});
