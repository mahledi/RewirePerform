#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

const root = process.cwd();
const checkOnly = process.argv.includes("--check");
const migrationDir = "supabase/migrations";
const base = "docs/feedback-intelligence/contracts/production-migration-plan-v0.1";
const planPath = `${base}/plan.json`;
const manifestPath = `${base}/producer-package-manifest.json`;
const remoteFloor = "20260801104717_harden_team_join_minor_authorization.sql";
const neverExecute = "20260808074346_feedback_intelligence_synthetic_staging_read_gate_v0_1.sql";
const teamStaffBackfill = "20260807092005_coach_enterprise_onboarding_v1_1.sql";

const expected = [
  "20260805103400_feedback_intelligence_v1_foundation.sql",
  "20260805103500_feedback_intelligence_v1_security.sql",
  "20260805103600_feedback_intelligence_v1_registry.sql",
  "20260805103650_feedback_intelligence_v1_dach_minor_policy.sql",
  "20260805103700_feedback_intelligence_v1_transaction_api.sql",
  "20260805103840_feedback_intelligence_v1_activity_snapshot.sql",
  "20260805103900_feedback_intelligence_v1_admin_aggregates.sql",
  "20260805104000_feedback_intelligence_v0_2_machine_export.sql",
  "20260805104100_feedback_intelligence_v1_consent_self_service.sql",
  "20260805145921_guardian_feedback_text_authorization_v1.sql",
  "20260806081925_feedback_intelligence_fk_indexes.sql",
  "20260806110000_feedback_intelligence_rest_visualization_v1_1.sql",
  "20260807090000_feedback_intelligence_machine_gateway_v0_1.sql",
  "20260807092005_coach_enterprise_onboarding_v1_1.sql",
  neverExecute,
  "20260808074742_feedback_intelligence_synthetic_staging_read_gate_close_v0_1.sql",
  "20260808093000_feedback_intelligence_machine_gateway_privilege_remediation.sql",
  "20260809093000_feedback_intelligence_declined_consent_export_remediation.sql",
  "20260810082841_extend_organization_inquiry_team_path_v1_1.sql",
  "20260810091629_organization_inquiry_retention_v1_1.sql",
  "20260810122000_feedback_text_consent_notice_v1_1.sql",
  "20260810122100_guardian_feedback_text_notice_v1_1.sql",
  "20260810122749_feedback_intelligence_transfer_pulse_count_v0_2_1.sql",
  "20260810154932_feedback_intelligence_visualization_copy_v1_1_2.sql",
  "20260811071836_feedback_intelligence_production_gateway_v0_1.sql",
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const migrationNames = (await readdir(resolve(root, migrationDir)))
  .filter((name) => /^\d{14}_.+\.sql$/u.test(name) && name > remoteFloor)
  .sort();

if (JSON.stringify(migrationNames) !== JSON.stringify(expected)) {
  throw new Error(`Production migration inventory drift:\n${migrationNames.join("\n")}`);
}

const migrations = [];
for (const file of expected) {
  const path = `${migrationDir}/${file}`;
  const bytes = await readFile(resolve(root, path));
  migrations.push({
    version: file.slice(0, 14),
    file,
    path,
    sha256: sha256(bytes),
    action: file === neverExecute
      ? "MARK_APPLIED_WITHOUT_EXECUTION"
      : "APPLY_EXACT_BYTES",
    rationale: file === neverExecute
      ? "Staging-only migration opens the synthetic database gates and must never execute in Production."
      : "Required ordered V1.1 schema or hardening delta.",
    application_data_impact: file === teamStaffBackfill
      ? "Reads existing public.teams rows and backfills derived team_staff_memberships; a rollback dry-run still performs this work transiently."
      : "No existing application-row backfill is executed by this migration.",
  });
}

const plan = {
  schema_version: "rewireperform-v1.1-production-migration-plan-v1",
  status: "LOCAL_PREPARED_AWAITING_TRANSACTIONAL_ROLLBACK_DRY_RUN",
  generated_at: "2026-08-11T10:05:00+02:00",
  project_ref: "bqsbxesmybthwtxmowfz",
  jurisdiction: "DE",
  observed_remote_state: {
    checked_at: "2026-08-11T09:30:00+02:00",
    latest_applied_migration: remoteFloor.slice(0, 14),
    feedback_production_reader_present: false,
    production_gateway_rpc_present: false,
    production_edge_function_present: false,
    application_rows_read: false,
  },
  execution_contract: {
    bulk_db_push_allowed: false,
    ordered_apply_only: true,
    backup_required_before_persistent_apply: true,
    transactional_rollback_dry_run_complete: false,
    application_data_access_required_for_full_rollback_dry_run: true,
    application_data_access_approved: true,
    application_data_access_approval_scope: [
      "public.teams.id",
      "public.teams.created_by",
      "public.user_roles.user_id",
      "public.user_roles.role",
    ],
    application_data_access_approval_basis: "Mahle confirmed on 2026-08-11 that the existing teams are his test data and the bounded rollback dry-run is acceptable.",
    persistent_production_apply_approved: false,
    credentials_allowed: false,
    data_reads_allowed: false,
    edge_deploy_allowed: false,
    runtime_gates_must_remain_closed: true,
  },
  migration_count: migrations.length,
  apply_count: migrations.filter(({ action }) => action === "APPLY_EXACT_BYTES").length,
  history_only_count: migrations.filter(({ action }) => action === "MARK_APPLIED_WITHOUT_EXECUTION").length,
  migrations,
};

const serializedPlan = `${JSON.stringify(plan, null, 2)}\n`;
const packageFiles = [
  planPath,
  ".github/workflows/ci.yml",
  "docs/feedback-intelligence/PRODUCTION_MIGRATION_PLAN_V1_1.md",
  "scripts/generate-v1-1-production-migration-plan.mjs",
  "scripts/generate-v1-1-production-rollback-dry-run.mjs",
  "scripts/execute-postgres-simple-query.mjs",
  "scripts/run-v1-1-production-rollback-dry-run.mjs",
  "tools/production-rollback-dry-run/package.json",
  "tools/production-rollback-dry-run/package-lock.json",
  "src/test/postgresSimpleQueryWorker.test.ts",
  "src/test/v11ProductionMigrationPlan.test.ts",
  "src/test/v11ProductionRollbackDryRun.test.ts",
  ...migrations.map(({ path }) => path),
];

const buildManifest = async (planBytes) => {
  const files = [];
  const digestInput = [];
  for (const path of packageFiles) {
    const bytes = path === planPath ? Buffer.from(planBytes) : await readFile(resolve(root, path));
    const digest = sha256(bytes);
    files.push({ path, sha256: digest });
    digestInput.push(`${digest}  ${path}\n`);
  }
  return {
    schema_version: "rewireperform-v1.1-production-migration-plan-package-v1",
    status: "LOCAL_UNSIGNED_EXTERNAL_GATES_CLOSED",
    generated_at: plan.generated_at,
    package_sha256: sha256(digestInput.join("")),
    files,
    activation: {
      production_apply: false,
      edge_deploy: false,
      credentials: false,
      data_reads: false,
      feedback_collection: false,
      minor_feedback: false,
      real_jarvis: false,
    },
  };
};

const manifest = await buildManifest(serializedPlan);
const serializedManifest = `${JSON.stringify(manifest, null, 2)}\n`;

if (checkOnly) {
  const [currentPlan, currentManifest] = await Promise.all([
    readFile(resolve(root, planPath), "utf8"),
    readFile(resolve(root, manifestPath), "utf8"),
  ]);
  if (currentPlan !== serializedPlan) throw new Error(`${planPath}: generated plan drift`);
  if (currentManifest !== serializedManifest) throw new Error(`${manifestPath}: generated manifest drift`);
  console.log(JSON.stringify({
    status: plan.status,
    migrations: migrations.length,
    apply: plan.apply_count,
    history_only: plan.history_only_count,
    manifest_sha256: sha256(currentManifest),
    package_sha256: manifest.package_sha256,
    all_external_gates_closed: Object.values(manifest.activation).every((value) => value === false),
  }, null, 2));
} else {
  await writeFile(resolve(root, planPath), serializedPlan, "utf8");
  await writeFile(resolve(root, manifestPath), serializedManifest, "utf8");
}
