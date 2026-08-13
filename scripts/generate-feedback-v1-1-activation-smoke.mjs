#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const checkOnly = process.argv.includes("--check");
const base = "docs/feedback-intelligence/contracts/production-activation-synthetic-smoke-v0.1";
const planPath = `${base}/activation-smoke-plan.json`;
const schemaPath = `${base}/activation-smoke-plan.schema.json`;
const manifestPath = `${base}/producer-package-manifest.json`;
const activationMigration = "supabase/migrations/20260813125221_feedback_intelligence_v1_1_activation_contract.sql";
const recloseMigration = "supabase/migrations/20260813125222_feedback_intelligence_v1_1_reclose_contract.sql";
const finalConsentMigration = "supabase/migrations/20260813115737_feedback_consent_guardian_de_v1_1_final_contract.sql";
const finalContentMigration = "supabase/migrations/20260810154932_feedback_intelligence_visualization_copy_v1_1_2.sql";
const generatorPath = "scripts/generate-feedback-v1-1-activation-smoke.mjs";
const runnerPath = "scripts/run-feedback-v1-1-activation-synthetic-smoke.mjs";
const feedbackSqlHarnessPath = "scripts/verify-feedback-intelligence-sql.mjs";
const guardianSqlHarnessPath = "scripts/verify-guardian-feedback-text-sql.mjs";
const testPath = "src/test/feedbackIntelligenceProductionActivationSmoke.test.ts";
const handoffPath = "docs/feedback-intelligence/PRODUCTION_ACTIVATION_SYNTHETIC_SMOKE_V0_1.md";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const read = (path) => readFile(resolve(root, path));
const serialize = (value) => `${JSON.stringify(value, null, 2)}\n`;

const externalGates = {
  qualified_legal_reference_supplied: false,
  production_activation_approved: false,
  production_database_credential_approved: false,
  synthetic_smoke_approved: false,
  real_athlete_data: false,
  real_comment_text: false,
  jarvis_credential: false,
  jarvis_read: false,
  push: false,
  merge: false,
  deploy: false,
  app_store_action: false,
};

const plan = {
  schema_version: "rewireperform-feedback-v1.1-production-activation-synthetic-smoke-plan-v1",
  status: "LOCAL_CONTRACT_READY_EXTERNAL_GATES_CLOSED",
  source_base_commit: "acae4d643984f77fcd009804d69cfd114ab970e0",
  project_ref: "bqsbxesmybthwtxmowfz",
  activation_contract: {
    function: "feedback_core.activate_feedback_v1_1(text)",
    legal_reference_format: "legal-review-de-feedback-v1.1:<qualified-reference>",
    missing_or_unqualified_reference: "FAIL_CLOSED_BEFORE_ACTIVATION",
    exact_campaigns: [
      "feedback-day-10-v1", "feedback-day-24-v1",
      "feedback-day-39-v1", "feedback-day-55-v1",
    ],
    guardian_policy: "guardian-feedback-text-de-v1.1.0",
    jurisdiction_policy: "feedback-jurisdiction-minor-de-v1.1.0",
    runtime_gates_opened: [
      "athlete_collection_enabled", "text_collection_enabled",
      "privacy_notice_ready", "app_store_declaration_ready", "minor_policy_ready",
    ],
    machine_or_jarvis_gates_opened: [],
  },
  synthetic_fixture_boundary: {
    generated_users_only: true,
    profiles_is_test_user: true,
    program_instances_is_test_instance: true,
    real_athletes: false,
    real_text: false,
    permitted_comment_literal: "SYNTHETIC_OPTIONAL_COMMENT_V1_1",
    application_values_persisted_after_smoke: false,
  },
  scenarios: [
    { id: "adult_structured", age_band: "adult", guardian: "not_required", comment: "declined", outcome: "submitted" },
    { id: "age_16_17_structured", age_band: "age_16_17", guardian: "not_required", comment: "declined", outcome: "submitted" },
    { id: "under_16_guardian_and_athlete", age_band: "under_16", guardian: "granted", athlete: "granted", comment: "declined", outcome: "submitted" },
    { id: "optional_comment", age_band: "adult", guardian: "not_required", comment: "granted_synthetic_literal_only", outcome: "submitted" },
    { id: "comment_decline", age_band: "adult", guardian: "not_required", comment: "declined", outcome: "structured_preserved_no_raw_text" },
    { id: "comment_withdrawal", age_band: "adult", guardian: "not_required", comment: "withdrawn", outcome: "structured_preserved_raw_text_deleted" },
    { id: "account_deletion", age_band: "adult", guardian: "not_required", comment: "granted_synthetic_literal_only", outcome: "all_subject_rows_deleted" },
    { id: "offline_retry", age_band: "adult", guardian: "not_required", comment: "declined", outcome: "same_mutation_idempotent_stale_ignored" },
  ],
  execution: {
    one_outer_transaction: true,
    activate_once: true,
    smoke_once: true,
    retry_allowed: false,
    reclose_before_rollback: true,
    rollback_always: true,
    fresh_postrollback_metadata_audit: true,
    expected_fixture_rows_after_rollback: 0,
    expected_active_campaigns_after_rollback: 0,
    expected_active_guardian_policies_after_rollback: 0,
    expected_runtime_gates_after_rollback: false,
  },
  external_gates: externalGates,
  next_gate: "QUALIFIED_LEGAL_REFERENCE_AND_SEPARATE_PRODUCTION_SYNTHETIC_SMOKE_APPROVAL_REQUIRED",
};

const planBytes = serialize(plan);
const packagePaths = [
  planPath, schemaPath, finalConsentMigration, finalContentMigration,
  activationMigration, recloseMigration, generatorPath, runnerPath,
  feedbackSqlHarnessPath, guardianSqlHarnessPath, testPath, handoffPath,
];
const files = [];
const digestInput = [];
for (const path of packagePaths) {
  const bytes = path === planPath ? Buffer.from(planBytes) : await read(path);
  const digest = sha256(bytes);
  files.push({ path, sha256: digest });
  digestInput.push(`${digest}  ${path}\n`);
}
const manifest = {
  schema_version: "rewireperform-feedback-v1.1-production-activation-synthetic-smoke-package-v1",
  package_status: "LOCAL_UNSIGNED_EXTERNAL_GATES_CLOSED",
  source_base_commit: plan.source_base_commit,
  package_sha256: sha256(digestInput.join("")),
  files,
  external_gates: externalGates,
};

const outputs = { [planPath]: planBytes, [manifestPath]: serialize(manifest) };
for (const [path, bytes] of Object.entries(outputs)) {
  if (checkOnly) {
    if ((await read(path)).toString("utf8") !== bytes) throw new Error(`generated file drift: ${path}`);
  } else {
    await writeFile(resolve(root, path), bytes, "utf8");
  }
}

process.stdout.write(serialize({ status: plan.status, scenarios: plan.scenarios.length, package_sha256: manifest.package_sha256 }));
