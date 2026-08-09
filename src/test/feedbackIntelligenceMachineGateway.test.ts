import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

import {
  feedbackIntelligenceJsonResponse,
  parseFeedbackIntelligenceReplayHeaders,
} from "../../supabase/functions/_shared/feedbackIntelligenceGatewayHttp";

const readRepoFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const edge = () => readRepoFile(
  "supabase/functions/mahleos-feedback-intelligence-read/index.ts",
);
const gatewayHttp = () => readRepoFile(
  "supabase/functions/_shared/feedbackIntelligenceGatewayHttp.ts",
);
const database = () => readRepoFile(
  "supabase/functions/_shared/feedbackIntelligenceDatabase.ts",
);
const migration = () => readRepoFile(
  "supabase/migrations/20260807090000_feedback_intelligence_machine_gateway_v0_1.sql",
);
const privilegeRemediation = () => readRepoFile(
  "supabase/migrations/20260808093000_feedback_intelligence_machine_gateway_privilege_remediation.sql",
);
const declinedConsentExportRemediation = () => readRepoFile(
  "supabase/migrations/20260809093000_feedback_intelligence_declined_consent_export_remediation.sql",
);
const syntheticGateOpen = () => readRepoFile(
  "supabase/migrations/20260808074346_feedback_intelligence_synthetic_staging_read_gate_v0_1.sql",
);
const syntheticGateClose = () => readRepoFile(
  "supabase/migrations/20260808074742_feedback_intelligence_synthetic_staging_read_gate_close_v0_1.sql",
);

describe("Feedback Intelligence machine gateway draft", () => {
  it("mirrors a valid request ID in body and header when another replay header is invalid", async () => {
    const requestId = "70000000-0000-4000-8000-000000000013";
    const now = Date.parse("2026-08-07T10:00:00.000Z");
    const request = new Request("https://example.invalid", {
      headers: {
        "X-MahleOS-Request-Id": requestId,
        "X-MahleOS-Nonce": "invalid",
        "X-MahleOS-Request-Timestamp": new Date(now).toISOString(),
      },
    });

    const replayHeaders = parseFeedbackIntelligenceReplayHeaders(request, now);
    expect(replayHeaders.valid).toBe(false);
    if (replayHeaders.valid !== false) throw new Error("Expected invalid replay headers");

    const response = feedbackIntelligenceJsonResponse(
      400,
      replayHeaders.body,
      replayHeaders.requestId,
    );
    expect(response.status).toBe(400);
    expect(response.headers.get("X-MahleOS-Request-Id")).toBe(requestId);
    await expect(response.json()).resolves.toEqual({
      error: "invalid_replay_headers",
      request_id: requestId,
    });
  });

  it("omits request ID from body and header when the request ID itself is invalid", async () => {
    const now = Date.parse("2026-08-07T10:00:00.000Z");
    const request = new Request("https://example.invalid", {
      headers: {
        "X-MahleOS-Request-Id": "not-a-valid-uuid",
        "X-MahleOS-Nonce": "a".repeat(64),
        "X-MahleOS-Request-Timestamp": new Date(now).toISOString(),
      },
    });

    const replayHeaders = parseFeedbackIntelligenceReplayHeaders(request, now);
    expect(replayHeaders.valid).toBe(false);
    if (replayHeaders.valid !== false) throw new Error("Expected invalid replay headers");

    const response = feedbackIntelligenceJsonResponse(
      400,
      replayHeaders.body,
      replayHeaders.requestId,
    );
    expect(response.status).toBe(400);
    expect(response.headers.has("X-MahleOS-Request-Id")).toBe(false);
    await expect(response.json()).resolves.toEqual({ error: "invalid_replay_headers" });
  });

  it("validates the exact request and allow-listed error envelopes", () => {
    const ajv = new Ajv2020({ strict: false, validateFormats: false });
    const requestSchema = JSON.parse(readRepoFile(
      "docs/feedback-intelligence/contracts/machine-gateway-v0.1/request.schema.json",
    ));
    const errorSchema = JSON.parse(readRepoFile(
      "docs/feedback-intelligence/contracts/machine-gateway-v0.1/error.schema.json",
    ));
    const validateRequest = ajv.compile(requestSchema);
    const validateError = ajv.compile(errorSchema);
    const request = {
      client_id: "mahles-jarvis-feedback-intelligence",
      contract_version: "0.2.0-draft",
      schema_sha256: "fb1ef751bc4701a497f224bb421220e08b3387eba5c2eaec9e91e2cbf474b4e9",
      data_scope: "synthetic",
    };

    expect(validateRequest(request)).toBe(true);
    expect(validateRequest({ ...request, data_scope: "production" })).toBe(false);
    expect(validateRequest({ ...request, extra: true })).toBe(false);
    expect(validateError({ error: "rate_limited", request_id: "70000000-0000-4000-8000-000000000013" }))
      .toBe(true);
    expect(validateError({ error: "unknown_error" })).toBe(false);
  });

  it("pins the exact Staging endpoint, producer request and synthetic-only scope", () => {
    const source = edge();
    const config = readRepoFile("supabase/config.toml");

    expect(config).toContain(
      "[functions.mahleos-feedback-intelligence-read]\nverify_jwt = false",
    );
    expect(source).toContain('"https://zbeswjipayspgvcipzmx.supabase.co"');
    expect(source).toContain('"mahles-jarvis-feedback-intelligence"');
    expect(source).toContain('"0.2.0-draft"');
    expect(source).toContain(
      '"fb1ef751bc4701a497f224bb421220e08b3387eba5c2eaec9e91e2cbf474b4e9"',
    );
    expect(source).toContain('body.data_scope !== "synthetic"');
    expect(source).toContain('"production_scope_blocked"');
  });

  it("uses the dedicated reader connection and never a service or default DB credential", () => {
    const source = edge();
    const db = database();

    expect(source).toContain("feedbackIntelligenceSql()");
    expect(source).toContain("public.read_feedback_intelligence_v0_2_draft(");
    expect(source).not.toContain("serviceClient");
    expect(source).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(db).toContain('"MAHLEOS_FEEDBACK_READER_DATABASE_URL"');
    expect(db).toContain('"mahleos_feedback_reader"');
    expect(db).toContain('max: 1');
    expect(db).toContain('prepare: false');
    expect(db).not.toContain("SUPABASE_DB_URL");
    expect(db).not.toContain("SUPABASE_SECRET_KEYS");
  });

  it("requires bounded POST JSON, exact replay headers and has no browser CORS", () => {
    const source = edge();
    const replaySource = gatewayHttp();

    expect(source).toContain('request.method !== "POST"');
    expect(source).toContain('contentType !== "application/json"');
    expect(source).toContain("readBoundedRequestText(request, 1024)");
    expect(replaySource).toContain('request.headers.get("X-MahleOS-Request-Id")');
    expect(replaySource).toContain('request.headers.get("X-MahleOS-Nonce")');
    expect(replaySource).toContain('request.headers.get("X-MahleOS-Request-Timestamp")');
    expect(replaySource).toContain("NONCE_PATTERN");
    expect(replaySource).toContain("5 * 60 * 1000");
    expect(source).toContain("8 * 1024 * 1024");
    expect(source).not.toContain("Access-Control-Allow-Origin");
  });

  it("keeps every activation boundary closed until explicit Staging secrets and DB gates exist", () => {
    const source = edge();
    const sql = migration();

    expect(source).toContain('"SYNTHETIC_STAGING_APPROVED"');
    expect(source).toContain('"MAHLEOS_FEEDBACK_INTELLIGENCE_MACHINE_GATE"');
    expect(source).toContain('"MAHLEOS_FEEDBACK_INTELLIGENCE_PRODUCTION_GATE"');
    expect(sql).toContain("LOGIN\n      PASSWORD NULL");
    expect(sql).not.toMatch(/PASSWORD\s+'[^']+'/u);
    expect(sql).not.toContain("synthetic_export_enabled = true");
    expect(sql).not.toContain("production_export_enabled = true");
    expect(sql).toContain("_data_scope <> 'synthetic'");
  });

  it("provides persistent atomic replay and 12-per-minute protection without storing response text", () => {
    const sql = migration();

    expect(sql).toContain("machine_gateway_nonces");
    expect(sql).toContain("nonce_sha256");
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain("recent_requests >= 12");
    expect(sql).toContain("'replay_detected'");
    expect(sql).toContain("'rate_limited'");
    expect(sql).toContain("reject_access_log_mutation");
    for (const forbidden of ["raw_text", "comment text", "response_body", "machine_key text"]) {
      expect(sql).not.toContain(forbidden);
    }
  });

  it("grants only the bounded RPC explicitly and denies standard runtime roles", () => {
    const sql = migration();

    expect(sql).toContain("GRANT CONNECT ON DATABASE");
    expect(sql).toContain("GRANT USAGE ON SCHEMA public TO mahleos_feedback_reader");
    expect(sql).toContain(
      "GRANT EXECUTE ON FUNCTION public.read_feedback_intelligence_v0_2_draft(text, text, text, text)\n  TO mahleos_feedback_reader",
    );
    expect(sql).toContain("FROM PUBLIC, anon, authenticated, service_role");
    expect(sql).toContain("NOBYPASSRLS");
    expect(sql).not.toContain("TO service_role;");
  });

  it("closes postdeploy role-membership and historical PUBLIC trigger-function paths", () => {
    const sql = privilegeRemediation();

    expect(sql).toContain("REVOKE mahleos_feedback_reader FROM postgres");
    for (const functionName of [
      "touch_daily_journals_updated_at",
      "touch_program_instances_updated_at",
      "touch_progress_snapshots_updated_at",
      "touch_updated_at",
    ]) {
      expect(sql).toContain(`REVOKE ALL ON FUNCTION public.${functionName}()`);
      expect(sql).toContain("FROM PUBLIC, mahleos_feedback_reader");
    }
    expect(sql).toContain("ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public");
    expect(sql).not.toMatch(/GRANT\s+(?:SELECT|INSERT|UPDATE|DELETE|EXECUTE)/u);
  });

  it("keeps declined-consent structured answers while minimizing receipt metadata", () => {
    const sql = declinedConsentExportRemediation();

    expect(sql).toContain("row.receipt_state IN ('granted', 'withdrawn')");
    expect(sql).toContain("'consent_reference', CASE");
    expect(sql).toContain("'comment', CASE");
    expect(sql).toContain("WHEN row.consent_valid AND row.position = 1 THEN row.raw_text");
    expect(sql).toContain(
      "REVOKE ALL ON FUNCTION feedback_analysis.export_feedback_intelligence_v0_2_internal",
    );
    expect(sql).not.toMatch(/GRANT\s+(?:SELECT|INSERT|UPDATE|DELETE|EXECUTE)/u);
  });

  it("opens only the synthetic Staging database gate against exact contract pins", () => {
    const sql = syntheticGateOpen();

    expect(sql).toContain("consumer_pin_ready = true");
    expect(sql).toContain("synthetic_export_enabled = true");
    expect(sql).toContain("machine_credential_ready = true");
    expect(sql).toContain("contract_version = '0.2.0-draft'");
    expect(sql).toContain(
      "schema_sha256 = 'fb1ef751bc4701a497f224bb421220e08b3387eba5c2eaec9e91e2cbf474b4e9'",
    );
    for (const productionGate of [
      "production_export_enabled",
      "privacy_notice_ready",
      "app_store_declaration_ready",
      "minor_policy_ready",
    ]) {
      expect(sql).toContain(`${productionGate} = false`);
      expect(sql).not.toContain(`${productionGate} = true`);
    }
    expect(sql).not.toMatch(/PASSWORD\s+'[^']+'/u);
    expect(sql).not.toMatch(/MAHLEOS_FEEDBACK_INTELLIGENCE_MACHINE_KEY\s*=/u);
  });

  it("provides a pinned post-read closure that cannot open Production", () => {
    const sql = syntheticGateClose();

    expect(sql).toContain("consumer_pin_ready = false");
    expect(sql).toContain("synthetic_export_enabled = false");
    expect(sql).toContain("machine_credential_ready = false");
    expect(sql).toContain("feedback_machine_synthetic_gate_close_contract_drift");
    for (const productionGate of [
      "production_export_enabled",
      "privacy_notice_ready",
      "app_store_declaration_ready",
      "minor_policy_ready",
    ]) {
      expect(sql).toContain(`${productionGate} = false`);
      expect(sql).not.toContain(`${productionGate} = true`);
    }
    expect(sql).not.toContain("synthetic_export_enabled = true");
    expect(sql).not.toContain("machine_credential_ready = true");
  });
});
