import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

const readRepoFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const edge = () => readRepoFile(
  "supabase/functions/mahleos-feedback-intelligence-read/index.ts",
);
const database = () => readRepoFile(
  "supabase/functions/_shared/feedbackIntelligenceDatabase.ts",
);
const migration = () => readRepoFile(
  "supabase/migrations/20260807090000_feedback_intelligence_machine_gateway_v0_1.sql",
);

describe("Feedback Intelligence machine gateway draft", () => {
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

    expect(source).toContain('request.method !== "POST"');
    expect(source).toContain('contentType !== "application/json"');
    expect(source).toContain("readBoundedRequestText(request, 1024)");
    expect(source).toContain('request.headers.get("X-MahleOS-Request-Id")');
    expect(source).toContain('request.headers.get("X-MahleOS-Nonce")');
    expect(source).toContain('request.headers.get("X-MahleOS-Request-Timestamp")');
    expect(source).toContain("NONCE_PATTERN");
    expect(source).toContain("5 * 60 * 1000");
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
});
