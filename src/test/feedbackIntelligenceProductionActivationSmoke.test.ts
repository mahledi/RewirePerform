// @vitest-environment node

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import { composeActivationPostrollbackAuditSql, composeActivationSmokeSql, syntheticSubjects } from "../../scripts/feedback-v1-1-activation-smoke-sql.mjs";
import { runFeedbackActivationSyntheticSmoke } from "../../scripts/run-feedback-v1-1-activation-synthetic-smoke.mjs";

const root = process.cwd();
const base = "docs/feedback-intelligence/contracts/production-activation-synthetic-smoke-v0.1";
const activationPath = "supabase/migrations/20260813125221_feedback_intelligence_v1_1_activation_contract.sql";
const reclosePath = "supabase/migrations/20260813125222_feedback_intelligence_v1_1_reclose_contract.sql";
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");

const setupDb = async () => {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    CREATE SCHEMA feedback_core;
    CREATE SCHEMA feedback_consent;
    CREATE TABLE feedback_core.system_settings(
      singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
      athlete_collection_enabled boolean NOT NULL DEFAULT false,
      text_collection_enabled boolean NOT NULL DEFAULT false,
      privacy_notice_ready boolean NOT NULL DEFAULT false,
      app_store_declaration_ready boolean NOT NULL DEFAULT false,
      minor_policy_ready boolean NOT NULL DEFAULT false,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    INSERT INTO feedback_core.system_settings(singleton) VALUES (true);
    CREATE TABLE feedback_core.campaigns(
      campaign_reference text PRIMARY KEY,
      questionnaire_version text NOT NULL,
      questionnaire_manifest_hash text NOT NULL,
      content_version text NOT NULL,
      text_consent_scope text NOT NULL,
      text_consent_version text NOT NULL,
      text_notice_hash text NOT NULL,
      status text NOT NULL CHECK (status IN ('draft','approved','active','paused','retired')),
      available_from timestamptz,
      available_until timestamptz,
      updated_at timestamptz NOT NULL DEFAULT now(),
      CHECK (status <> 'active' OR available_from IS NOT NULL)
    );
    INSERT INTO feedback_core.campaigns VALUES
      ('feedback-day-10-v1','feedback-d10-v1.1.2','48c2bf887ec96a0cc49eb327b380f7da7d163beb08929b9b359bfa0356692f2c','feedback-intelligence-content-v1.1.2','product-improvement-individual-text-ai-analysis-v1','feedback-text-consent-v1.1.0','c308e8ad3d89b02c308a07090a4c09cb363f9cdb7d1e5d671ac295c545d95a16','draft',NULL,NULL,now()),
      ('feedback-day-24-v1','feedback-d24-v1.1.2','679f09ab0a4c08a0521404cbbef2d88a8f0121cb353c42f310a3f09cc20689e8','feedback-intelligence-content-v1.1.2','product-improvement-individual-text-ai-analysis-v1','feedback-text-consent-v1.1.0','c308e8ad3d89b02c308a07090a4c09cb363f9cdb7d1e5d671ac295c545d95a16','draft',NULL,NULL,now()),
      ('feedback-day-39-v1','feedback-d39-v1.1.2','b566002d6f1d0c74f1eafb8554f370fa7f409f871473717079a478ad7b238b44','feedback-intelligence-content-v1.1.2','product-improvement-individual-text-ai-analysis-v1','feedback-text-consent-v1.1.0','c308e8ad3d89b02c308a07090a4c09cb363f9cdb7d1e5d671ac295c545d95a16','draft',NULL,NULL,now()),
      ('feedback-day-55-v1','feedback-d55-v1.1.2','b8b1eb9e97348090e2993ee634dc0616228f6c1138b450174d132f48b1029600','feedback-intelligence-content-v1.1.2','product-improvement-individual-text-ai-analysis-v1','feedback-text-consent-v1.1.0','c308e8ad3d89b02c308a07090a4c09cb363f9cdb7d1e5d671ac295c545d95a16','draft',NULL,NULL,now());
    CREATE TABLE feedback_core.jurisdiction_policies(
      jurisdiction text PRIMARY KEY,
      policy_version text NOT NULL,
      product_minimum_age integer NOT NULL,
      product_guardian_required_below_age integer NOT NULL,
      structured_collection_status text NOT NULL,
      raw_text_collection_status text NOT NULL,
      legal_review_reference text,
      approved_at timestamptz,
      updated_at timestamptz NOT NULL DEFAULT now(),
      CHECK ((structured_collection_status <> 'approved' AND raw_text_collection_status <> 'approved') OR (legal_review_reference IS NOT NULL AND approved_at IS NOT NULL))
    );
    INSERT INTO feedback_core.jurisdiction_policies VALUES
      ('DE','feedback-jurisdiction-minor-de-v1.1.0',13,16,'legal_review_required','legal_review_required',NULL,NULL,now()),
      ('AT','feedback-jurisdiction-minor-at-v1.0.0',13,16,'out_of_scope','out_of_scope',NULL,NULL,now()),
      ('CH','feedback-jurisdiction-minor-ch-v1.0.0',13,16,'out_of_scope','out_of_scope',NULL,NULL,now());
    CREATE TABLE feedback_consent.guardian_text_policy_versions(
      jurisdiction text NOT NULL,
      policy_reference text PRIMARY KEY,
      scope text NOT NULL,
      consent_version text NOT NULL,
      guardian_notice_hash text NOT NULL,
      athlete_notice_hash text NOT NULL,
      raw_text_retention_days integer NOT NULL,
      processor_mode text NOT NULL,
      processor_reference text,
      status text NOT NULL CHECK (status IN ('draft','active','retired')),
      effective_from timestamptz,
      retired_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CHECK ((status = 'active') = (effective_from IS NOT NULL AND retired_at IS NULL)),
      CHECK (status <> 'retired' OR retired_at IS NOT NULL)
    );
    INSERT INTO feedback_consent.guardian_text_policy_versions VALUES
      ('DE','guardian-feedback-text-de-v1.1.0','product-improvement-individual-text-ai-analysis-v1','feedback-text-consent-v1.1.0','90b0ede2a1a7671f1631e2048a605e6331006972ee05e63d38d229857f0aeb0b','c308e8ad3d89b02c308a07090a4c09cb363f9cdb7d1e5d671ac295c545d95a16',365,'no_external_processor',NULL,'draft',NULL,NULL,now(),now());
    CREATE FUNCTION feedback_core.rollout_ready() RETURNS boolean LANGUAGE sql STABLE AS $$
      SELECT athlete_collection_enabled AND privacy_notice_ready AND app_store_declaration_ready AND minor_policy_ready
      FROM feedback_core.system_settings WHERE singleton
    $$;
    CREATE FUNCTION feedback_core.jurisdiction_policy_ready(_jurisdiction text, _include_raw_text boolean DEFAULT false)
    RETURNS boolean LANGUAGE sql STABLE AS $$
      SELECT COALESCE((SELECT structured_collection_status = 'approved' AND (NOT _include_raw_text OR raw_text_collection_status = 'approved')
        AND legal_review_reference IS NOT NULL AND approved_at IS NOT NULL
        FROM feedback_core.jurisdiction_policies WHERE jurisdiction = _jurisdiction), false)
    $$;
    CREATE FUNCTION feedback_consent.validate_guardian_text_policy_transition() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF OLD.status = 'active' AND NEW.status <> 'retired' THEN RAISE EXCEPTION 'guardian_feedback_text_policy_must_retire'; END IF;
      IF OLD.status = 'draft' AND NEW.status NOT IN ('draft','active') THEN RAISE EXCEPTION 'guardian_feedback_text_policy_invalid_transition'; END IF;
      RETURN NEW;
    END $$;
    CREATE TRIGGER validate_guardian_transition BEFORE UPDATE ON feedback_consent.guardian_text_policy_versions
      FOR EACH ROW EXECUTE FUNCTION feedback_consent.validate_guardian_text_policy_transition();
  `);
  await db.exec(read(activationPath));
  await db.exec(read(reclosePath));
  return db;
};

const snapshot = (db: PGlite) => db.query(`
  SELECT
    (SELECT count(*)::integer FROM feedback_core.campaigns WHERE status = 'active') AS campaigns_active,
    (SELECT count(*)::integer FROM feedback_consent.guardian_text_policy_versions WHERE status = 'active') AS guardian_active,
    (SELECT structured_collection_status FROM feedback_core.jurisdiction_policies WHERE jurisdiction='DE') AS structured_status,
    (SELECT raw_text_collection_status FROM feedback_core.jurisdiction_policies WHERE jurisdiction='DE') AS raw_status,
    (SELECT legal_review_reference FROM feedback_core.jurisdiction_policies WHERE jurisdiction='DE') AS legal_reference,
    (SELECT athlete_collection_enabled FROM feedback_core.system_settings WHERE singleton) AS athlete_gate,
    (SELECT text_collection_enabled FROM feedback_core.system_settings WHERE singleton) AS text_gate,
    (SELECT privacy_notice_ready FROM feedback_core.system_settings WHERE singleton) AS privacy_gate,
    (SELECT app_store_declaration_ready FROM feedback_core.system_settings WHERE singleton) AS app_store_gate,
    (SELECT minor_policy_ready FROM feedback_core.system_settings WHERE singleton) AS minor_gate
`);

describe("V1.1 Feedback Intelligence activation and synthetic-smoke contract", () => {
  it("installs closed and rejects missing, draft, test, or malformed legal references without mutation", async () => {
    const db = await setupDb();
    const before = (await snapshot(db)).rows[0];
    for (const candidate of [null, "", "synthetic-sql-test-only", "legal-review-de-feedback-v1.1:pending-review-2026"] as const) {
      await expect(db.query("SELECT feedback_core.activate_feedback_v1_1($1)", [candidate]))
        .rejects.toThrow("qualified_legal_review_reference_required");
      expect((await snapshot(db)).rows[0]).toEqual(before);
    }
    expect(before).toMatchObject({ campaigns_active: 0, guardian_active: 0, structured_status: "legal_review_required", raw_status: "legal_review_required", legal_reference: null, athlete_gate: false, text_gate: false, privacy_gate: false, app_store_gate: false, minor_gate: false });
    await db.close();
  });

  it("activates exactly the four final DE contracts and can atomically re-close them", async () => {
    const db = await setupDb();
    const legalReference = "legal-review-de-feedback-v1.1:qualified-counsel-reference-2026-08-13";
    await db.exec("BEGIN");
    const activated = await db.query<{ result: Record<string, unknown> }>("SELECT feedback_core.activate_feedback_v1_1($1) AS result", [legalReference]);
    expect(activated.rows[0].result).toEqual({ status: "ACTIVE_V1_1_DE", campaigns_active: 4, guardian_policy_active: true });
    expect((await snapshot(db)).rows[0]).toMatchObject({ campaigns_active: 4, guardian_active: 1, structured_status: "approved", raw_status: "approved", legal_reference: legalReference, athlete_gate: true, text_gate: true, privacy_gate: true, app_store_gate: true, minor_gate: true });
    const closed = await db.query<{ result: Record<string, unknown> }>("SELECT feedback_core.reclose_feedback_v1_1($1) AS result", [legalReference]);
    expect(closed.rows[0].result).toEqual({ status: "RECLOSED_V1_1_DE", runtime_gates_closed: true, campaigns_active: 0, guardian_policy_active: false });
    expect((await snapshot(db)).rows[0]).toMatchObject({ campaigns_active: 0, guardian_active: 0, structured_status: "paused", raw_status: "paused", athlete_gate: false, text_gate: false, privacy_gate: false, app_store_gate: false, minor_gate: false });
    await db.exec("ROLLBACK");
    expect((await snapshot(db)).rows[0]).toMatchObject({ campaigns_active: 0, guardian_active: 0, structured_status: "legal_review_required", raw_status: "legal_review_required", legal_reference: null, athlete_gate: false, text_gate: false, privacy_gate: false, app_store_gate: false, minor_gate: false });
    await db.close();
  });

  it("keeps activation functions outside every client and service-role capability", async () => {
    const db = await setupDb();
    const privileges = await db.query(`SELECT
      has_function_privilege('anon','feedback_core.activate_feedback_v1_1(text)','EXECUTE') AS anon_activate,
      has_function_privilege('authenticated','feedback_core.activate_feedback_v1_1(text)','EXECUTE') AS authenticated_activate,
      has_function_privilege('service_role','feedback_core.activate_feedback_v1_1(text)','EXECUTE') AS service_activate,
      has_function_privilege('anon','feedback_core.reclose_feedback_v1_1(text)','EXECUTE') AS anon_reclose,
      has_function_privilege('authenticated','feedback_core.reclose_feedback_v1_1(text)','EXECUTE') AS authenticated_reclose,
      has_function_privilege('service_role','feedback_core.reclose_feedback_v1_1(text)','EXECUTE') AS service_reclose`);
    expect(Object.values(privileges.rows[0]).every((value) => value === false)).toBe(true);
    const definitions = await db.query(`SELECT prosecdef, proconfig FROM pg_proc procedure
      JOIN pg_namespace namespace ON namespace.oid=procedure.pronamespace
      WHERE namespace.nspname='feedback_core' AND procedure.proname IN ('activate_feedback_v1_1','reclose_feedback_v1_1')
      ORDER BY procedure.proname`);
    expect(definitions.rows).toHaveLength(2);
    expect(definitions.rows.every(({ prosecdef, proconfig }) => prosecdef === false && proconfig?.includes("search_path=\"\"") === true)).toBe(true);
    await db.close();
  });

  it("pins eight bounded synthetic scenarios and all cleanup invariants", () => {
    const schema = JSON.parse(read(`${base}/activation-smoke-plan.schema.json`));
    const plan = JSON.parse(read(`${base}/activation-smoke-plan.json`));
    const validate = new Ajv2020({ strict: true }).compile(schema);
    expect(validate(plan), JSON.stringify(validate.errors)).toBe(true);
    expect(plan.scenarios.map(({ id }: { id: string }) => id)).toEqual([
      "adult_structured", "age_16_17_structured", "under_16_guardian_and_athlete", "optional_comment",
      "comment_decline", "comment_withdrawal", "account_deletion", "offline_retry",
    ]);
    expect(plan.synthetic_fixture_boundary).toMatchObject({ generated_users_only: true, profiles_is_test_user: true, program_instances_is_test_instance: true, real_athletes: false, real_text: false, permitted_comment_literal: "SYNTHETIC_OPTIONAL_COMMENT_V1_1", application_values_persisted_after_smoke: false });
    expect(plan.execution).toMatchObject({ one_outer_transaction: true, activate_once: true, smoke_once: true, retry_allowed: false, reclose_before_rollback: true, rollback_always: true, fresh_postrollback_metadata_audit: true, expected_fixture_rows_after_rollback: 0, expected_active_campaigns_after_rollback: 0, expected_active_guardian_policies_after_rollback: 0, expected_runtime_gates_after_rollback: false });
    expect(Object.values(plan.external_gates).every((value) => value === false)).toBe(true);
  });

  it("refuses to operate even with a valid reference until the external gate is separately authorized", () => {
    for (const args of [[], ["--legal-reference", "synthetic-sql-test-only"], ["--legal-reference", "legal-review-de-feedback-v1.1:qualified-counsel-reference-2026-08-13"]]) {
      const result = spawnSync(process.execPath, ["scripts/run-feedback-v1-1-activation-synthetic-smoke.mjs", ...args], { cwd: root, encoding: "utf8" });
      expect(result.status).not.toBe(0);
      expect(`${result.stdout}${result.stderr}`).not.toContain("SUPABASE");
    }
  });

  it("composes all eight real API paths inside one rollback transaction without treating a test reference as legal approval", () => {
    expect(() => composeActivationSmokeSql({ legalReference: "legal-review-de-feedback-v1.1:local-contract-test-input" }))
      .toThrow("qualified legal-review reference");
    const sql = composeActivationSmokeSql({ legalReference: "legal-review-de-feedback-v1.1:qualified-counsel-reference-2026-08-13" });
    expect((sql.match(/^BEGIN;$/gmu) ?? [])).toHaveLength(1);
    expect((sql.match(/^ROLLBACK;$/gmu) ?? [])).toHaveLength(1);
    expect(sql).not.toContain("COMMIT;");
    expect(sql).toContain("feedback_core.activate_feedback_v1_1");
    expect(sql).toContain("feedback_core.reclose_feedback_v1_1");
    expect(sql).toContain("public.claim_my_feedback_checkpoint");
    expect(sql).toContain("public.start_my_feedback_submission");
    expect(sql).toContain("public.save_my_feedback_draft");
    expect(sql).toContain("public.submit_my_feedback");
    expect(sql).toContain("public.withdraw_my_feedback_text");
    expect(sql).toContain("DELETE FROM auth.users");
    expect(sql).toContain("SYNTHETIC_OPTIONAL_COMMENT_V1_1");
    expect(syntheticSubjects).toHaveLength(8);
    expect(composeActivationPostrollbackAuditSql()).toContain("PASS_FEEDBACK_V1_1_SYNTHETIC_SMOKE_POSTROLLBACK");
  });

  it("runs exactly one smoke request and always one fresh postrollback audit with no retry", () => {
    const outputs = [
      [{ feedback_v1_1_smoke_status: { status: "PASS_FEEDBACK_V1_1_SYNTHETIC_SMOKE_ROLLED_BACK", scenario_count: 8, application_values_returned: false, legal_reference_returned: false } }],
      [{ feedback_v1_1_postrollback_status: { status: "PASS_FEEDBACK_V1_1_SYNTHETIC_SMOKE_POSTROLLBACK", fixture_rows: 0, runtime_gates_open: false, application_values_returned: false } }],
    ];
    const calls: Array<{ operation: string; sql: string }> = [];
    const runDirectSession = ({ operation, sqlPath }: { operation: string; sqlPath: string }) => {
      calls.push({ operation, sql: readFileSync(sqlPath, "utf8") });
      return { status: 0, stdout: JSON.stringify(outputs[calls.length - 1]), stderr: "" };
    };
    const result = runFeedbackActivationSyntheticSmoke({
      cwd: root,
      legalReference: "legal-review-de-feedback-v1.1:qualified-counsel-reference-2026-08-13",
      productionActivationApproved: true,
      productionCredentialApproved: true,
      syntheticSmokeApproved: true,
      directSessionPassword: "ephemeral-test-password",
      directSessionCaPath: "/not-read-by-mock.pem",
      runDirectSession,
    });
    expect(result).toMatchObject({ request_count: 2, smoke_request_count: 1, postrollback_audit_request_count: 1, retry_count: 0 });
    expect(calls.map(({ operation }) => operation)).toEqual(["activation-smoke", "activation-postrollback-audit"]);
    expect(calls[0].sql).toContain("ROLLBACK;");
    expect(calls[1].sql).toContain("postrollback");
  });

  it("keeps the existing real SQL API regressions green for comment, decline, withdrawal, deletion and retry", () => {
    for (const [script, expected] of [
      ["scripts/verify-feedback-intelligence-sql.mjs", "Feedback Intelligence SQL foundation checks passed."],
      ["scripts/verify-guardian-feedback-text-sql.mjs", "Guardian feedback text SQL verified:"],
    ] as const) {
      const result = spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8", timeout: 30_000 });
      expect(result.status, result.stderr || result.stdout).toBe(0);
      expect(result.stdout).toContain(expected);
    }
    const transactionApi = read("supabase/migrations/20260805103700_feedback_intelligence_v1_transaction_api.sql");
    expect(transactionApi).toContain("WHEN participant.age_band = 'age_16_17' THEN 'athlete_authorized'");
    expect(transactionApi).toContain("WHEN participant.age_band = 'under_16' THEN 'guardian_and_athlete_authorized'");
  });

  it("regenerates and pins every package byte", () => {
    const result = spawnSync(process.execPath, ["scripts/generate-feedback-v1-1-activation-smoke.mjs", "--check"], { cwd: root, encoding: "utf8" });
    expect(result.status, result.stderr || result.stdout).toBe(0);
    const manifest = JSON.parse(read(`${base}/producer-package-manifest.json`));
    const digestInput = manifest.files.map(({ path, sha256: pinned }: { path: string; sha256: string }) => {
      const actual = sha256(readFileSync(resolve(root, path)));
      expect(actual, path).toBe(pinned);
      return `${actual}  ${path}\n`;
    }).join("");
    expect(sha256(digestInput)).toBe(manifest.package_sha256);
    expect(Object.values(manifest.external_gates).every((value) => value === false)).toBe(true);
  });
});
