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
const feedbackReference = "a".repeat(64);
const createdAt = "2026-07-23T15:30:00.123456+00:00";

const validResult = () => ({
  ok: true,
  schema_version: "mahleos-feedback-read-v1.1",
  request_id: requestId,
  generated_at: createdAt,
  items: [
    {
      feedback_reference: feedbackReference,
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
  next_cursor_reference: feedbackReference,
  privacy: {
    structured_user_identifiers_exported: false,
    recognized_direct_identifiers_redacted: true,
    free_text_may_contain_personal_data: true,
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

    const encoded = encodeFeedbackCursor({ createdAt, reference: feedbackReference });
    expect(decodeFeedbackCursor(encoded)).toEqual({
      createdAt,
      reference: feedbackReference,
    });
    const normalized = encoded.replaceAll("-", "+").replaceAll("_", "/");
    const decodedPayload = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
    expect(decodedPayload).not.toContain(feedbackId);
    expect(parseFeedbackReadRequest({ cursor: `${encoded}tampered` })).toBeNull();
  });

  it("projects only explicitly approved feedback fields", () => {
    const projected = projectFeedbackReadResult(validResult());

    expect(projected).toMatchObject({
      ok: true,
      schema_version: "mahleos-feedback-read-v1.1",
      request_id: requestId,
      has_more: true,
      privacy: {
        structured_user_identifiers_exported: false,
        recognized_direct_identifiers_redacted: true,
        free_text_may_contain_personal_data: true,
        model_safe_without_redaction: false,
      },
    });
    expect(projected?.next_cursor).toEqual(expect.any(String));
    expect(JSON.stringify(projected)).not.toContain(feedbackId);
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

    const resultWithIdentifierLikeVersion = validResult();
    resultWithIdentifierLikeVersion.items[0].technical_context.app_version =
      "customer:123e4567-e89b-12d3-a456-426614174000";
    expect(projectFeedbackReadResult(resultWithIdentifierLikeVersion)).toBeNull();

    const falselyModelSafe = validResult();
    falselyModelSafe.privacy.model_safe_without_redaction = true;
    expect(projectFeedbackReadResult(falselyModelSafe)).toBeNull();
  });

  it("keeps the edge function separate, machine-authenticated and non-browser-accessible", () => {
    const edge = readRepoFile("supabase/functions/mahleos-feedback-read/index.ts");
    const handler = readRepoFile("supabase/functions/_shared/mahleOsFeedbackHandler.ts");
    const auth = readRepoFile("supabase/functions/_shared/mahleOsMachineAuth.ts");
    const config = readRepoFile("supabase/config.toml");

    expect(handler).toContain('request.method !== "POST"');
    expect(handler).toContain("readBoundedRequestText(request, 1024)");
    expect(handler).toContain("parseFeedbackReadRequest");
    expect(handler).toContain("projectFeedbackReadResult");
    expect(edge).toContain('rpc("read_mahleos_feedback_page"');
    expect(edge).toContain('"audit_mahleos_feedback_invalid_request"');
    expect(edge).not.toContain(".from(");
    expect(handler).not.toContain("Access-Control-Allow-Origin");
    expect(auth).toContain('Deno.env.get("MAHLEOS_FEEDBACK_READ_KEY")');
    expect(config).toContain("[functions.mahleos-feedback-read]\nverify_jwt = false");
  });

  it("uses a service-only, append-only and test-excluding database contract", () => {
    const migration = readRepoFile(
      "supabase/migrations/20260723154047_mahleos_feedback_read_contract_v1.sql",
    );
    const hardening = readRepoFile(
      "supabase/migrations/20260723165153_harden_mahleos_feedback_and_telemetry_v1.sql",
    );
    const retention = readRepoFile(
      "supabase/migrations/20260718122735_minor_guardian_authorization_v1.sql",
    );

    expect(migration).toContain("mahleos_feedback_access_log_append_only");
    expect(migration).toContain("recent_requests >= 30");
    expect(migration).toContain("NOT COALESCE(p.is_test_user, false)");
    expect(migration).toContain("TO service_role");
    expect(migration).toContain("FROM PUBLIC, anon, authenticated, service_role");
    expect(migration).toContain("GRANT SELECT, INSERT ON TABLE public.mahleos_feedback_access_log");
    expect(migration).toContain("_cursor_reference text DEFAULT NULL");
    expect(migration).not.toContain("_cursor_id");
    expect(hardening).toContain("'structured_user_identifiers_exported', false");
    expect(hardening).toContain("'recognized_direct_identifiers_redacted', true");
    expect(hardening).toContain("'free_text_may_contain_personal_data', true");
    expect(migration).toContain("'model_safe_without_redaction', false");
    expect(hardening).toContain("canonicalize_feedback_insert");
    expect(hardening).toContain("canonicalize_app_event_insert");
    expect(hardening).toContain("client_reported_non_authoritative");
    expect(hardening).toContain("audit_mahleos_feedback_invalid_request");
    expect(hardening).toContain("request_error_code");
    expect(hardening).toContain("'invalid_schema'");
    expect(hardening).toContain("app_event_rate_limited");
    expect(hardening).toContain("IF _limit IS NULL");
    expect(hardening).toContain("cleanup_mahleos_feedback_access_log");
    expect(retention).toContain("DELETE FROM public.app_event_log ael");
    expect(retention).toContain("ael.created_at < now() - interval '30 days'");
    expect(retention).toContain("'SELECT minor_auth.cleanup_retention();'");
    expect(migration).not.toContain("p.full_name");
    expect(migration).not.toContain("p.email");
    expect(migration).not.toMatch(/jsonb_build_object\(\s*'user_id'/u);
  });
});
