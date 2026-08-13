#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  composePersistentApplyPlan,
  composePersistentMigrationStepSql,
} from "./generate-v1-1-production-persistent-apply.mjs";
import { persistentTargetAuditSql } from "./generate-v1-1-production-rollback-dry-run.mjs";
import {
  assertDirectToolInstalled,
  expectedRemoteMigrationVersions,
  parseRemoteMigrationVersions,
  resolveDirectTarget,
  sanitizeCliFailure,
  sanitizedDirectChildEnv,
} from "./run-v1-1-production-rollback-dry-run.mjs";

const root = process.cwd();
const projectRef = "bqsbxesmybthwtxmowfz";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const persistentPackageManifestPath = resolve(
  root,
  "docs/feedback-intelligence/contracts/production-persistent-apply-v0.1/producer-package-manifest.json",
);

export const persistentPreapplyBaselineSql = `
DO $v1_1_persistent_preapply$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_roles
    WHERE rolname IN ('mahleos_feedback_reader', 'mahleos_feedback_production_reader')
  ) THEN
    RAISE EXCEPTION 'v1_1_persistent_reader_role_must_be_absent';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_namespace
    WHERE nspname IN (
      'feedback_core', 'feedback_consent', 'feedback_raw', 'feedback_analysis',
      'feedback_machine', 'feedback_machine_production'
    )
  ) THEN
    RAISE EXCEPTION 'v1_1_persistent_feedback_schema_must_be_absent';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc procedure
    JOIN pg_catalog.pg_namespace namespace ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.proname = ANY (ARRAY[
        'claim_my_feedback_checkpoint',
        'dismiss_my_feedback_checkpoint',
        'start_my_feedback_submission',
        'get_my_feedback_draft',
        'save_my_feedback_draft',
        'submit_my_feedback',
        'get_admin_feedback_intelligence_insights',
        'list_my_feedback_text_consents',
        'withdraw_my_feedback_text',
        'guardian_feedback_text_decision_status',
        'guardian_feedback_text_decide',
        'guardian_feedback_text_management_status',
        'guardian_feedback_text_management_decide',
        'read_feedback_intelligence_v0_2_draft'
      ]::name[])
  ) THEN
    RAISE EXCEPTION 'v1_1_persistent_feedback_rpc_must_be_absent';
  END IF;
END;
$v1_1_persistent_preapply$;
SELECT json_build_object(
  'status', 'PASS_V1_1_PERSISTENT_PREAPPLY_BASELINE',
  'application_values_returned', false
) AS v1_1_persistent_preapply_status;
`;

export const assertPersistentPackageBytes = ({ cwd, manifest }) => {
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
    throw new Error("persistent Production package file inventory drift");
  }
  const seen = new Set();
  const digestInput = [];
  for (const entry of manifest.files) {
    if (typeof entry?.path !== "string"
        || entry.path.startsWith("/")
        || entry.path.split("/").includes("..")
        || typeof entry.sha256 !== "string"
        || !/^[a-f0-9]{64}$/u.test(entry.sha256)
        || seen.has(entry.path)) {
      throw new Error("persistent Production package inventory entry drift");
    }
    seen.add(entry.path);
    const actual = sha256(readFileSync(resolve(cwd, entry.path)));
    if (actual !== entry.sha256) {
      throw new Error(`persistent Production package byte drift: ${entry.path}`);
    }
    digestInput.push(`${actual}  ${entry.path}\n`);
  }
  if (sha256(digestInput.join("")) !== manifest.package_sha256) {
    throw new Error("persistent Production package SHA-256 drift");
  }
};

export const persistentWorkerArgs = (target, sqlPath, caFile) => [
  resolve(scriptDirectory, "execute-postgres-simple-query.mjs"),
  "--host", target.host,
  "--port", target.port,
  "--user", target.user,
  "--database", target.database,
  "--file", sqlPath,
  "--ca-file", caFile,
  "--operation", "persistent-apply",
];

const defaultRunDirectSession = ({ target, sqlPath, caFile, password, cwd }) => spawnSync(
  process.execPath,
  persistentWorkerArgs(target, sqlPath, caFile),
  {
    cwd,
    env: sanitizedDirectChildEnv(),
    input: JSON.stringify({ password }),
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
    timeout: 240_000,
    killSignal: "SIGKILL",
  },
);

const parseRows = (stdout, label) => {
  let rows;
  try {
    rows = JSON.parse(stdout);
  } catch {
    throw new Error(`${label}: invalid JSON`);
  }
  if (!Array.isArray(rows) || rows.length !== 1 || typeof rows[0] !== "object") {
    throw new Error(`${label}: expected exactly one row`);
  }
  return rows[0];
};

const validateStepResult = (stdout, step) => {
  const row = parseRows(stdout, `persistent-step-${step.ordinal}`);
  if (JSON.stringify(Object.keys(row).sort()) !== JSON.stringify(["v1_1_persistent_step_status"])) {
    throw new Error(`persistent-step-${step.ordinal}: unexpected result keys`);
  }
  const status = row.v1_1_persistent_step_status;
  if (JSON.stringify(Object.keys(status ?? {}).sort())
      !== JSON.stringify(["application_values_returned", "status", "version"])) {
    throw new Error(`persistent-step-${step.ordinal}: unexpected status keys`);
  }
  if (status.status !== step.expected_status
      || status.version !== step.version
      || status.application_values_returned !== false) {
    throw new Error(`persistent-step-${step.ordinal}: status drift`);
  }
};

const validateTargetAudit = (stdout) => {
  const row = parseRows(stdout, "persistent-target-audit");
  if (JSON.stringify(Object.keys(row).sort())
      !== JSON.stringify(["v1_1_persistent_target_status"])) {
    throw new Error("persistent-target-audit: unexpected result keys");
  }
  const status = row.v1_1_persistent_target_status;
  if (JSON.stringify(status) !== JSON.stringify({
    status: "PASS_V1_1_PERSISTENT_TARGET_METADATA_AUDIT",
    application_values_returned: false,
    runtime_activation_authorized: false,
  })) {
    throw new Error("persistent-target-audit: status drift");
  }
};

const validatePreapplyBaseline = (stdout) => {
  const row = parseRows(stdout, "persistent-preapply-baseline");
  if (JSON.stringify(Object.keys(row).sort())
      !== JSON.stringify(["v1_1_persistent_preapply_status"])) {
    throw new Error("persistent-preapply-baseline: unexpected result keys");
  }
  if (JSON.stringify(row.v1_1_persistent_preapply_status) !== JSON.stringify({
    status: "PASS_V1_1_PERSISTENT_PREAPPLY_BASELINE",
    application_values_returned: false,
  })) {
    throw new Error("persistent-preapply-baseline: status drift");
  }
};

const sanitizedStepError = (step, result) => new Error(
  `Production persistent apply stopped at step ${step.ordinal}: `
  + JSON.stringify({
    ordinal: step.ordinal,
    version: step.version,
    transaction_sql_sha256: step.transaction_sql_sha256,
    ...sanitizeCliFailure(result, { requestBytes: step.transaction_sql_bytes }),
  }),
);

const classifyPostFailureHistory = ({ versions, expectedBefore, currentVersion }) => {
  const before = JSON.stringify(expectedBefore);
  const withCurrent = JSON.stringify([...expectedBefore, currentVersion]);
  const actual = JSON.stringify(versions);
  if (actual === before) return "FAILED_STEP_NOT_RECORDED";
  if (actual === withCurrent) return "FAILED_STEP_RECORDED_BEFORE_RESPONSE_FAILURE";
  return "POST_FAILURE_MIGRATION_HISTORY_DRIFT";
};

export const runProductionPersistentApply = async ({
  cwd = root,
  runDirectSession = defaultRunDirectSession,
  persistentApplyApproved = false,
  directSessionCredentialApproved = false,
  rollbackDryRunVerified = false,
  backupAndRecoveryVerified = false,
  directSessionPassword = process.env.SUPABASE_DB_PASSWORD,
  directSessionCaPath = process.env.SUPABASE_DB_CA_CERT_PATH,
} = {}) => {
  if (persistentApplyApproved !== true) throw new Error("persistent Production apply approval required");
  if (directSessionCredentialApproved !== true) throw new Error("Production credential approval required");
  if (rollbackDryRunVerified !== true) throw new Error("green Production rollback dry-run proof required");
  if (backupAndRecoveryVerified !== true) throw new Error("current Production backup and recovery proof required");
  if (typeof directSessionPassword !== "string" || directSessionPassword.length < 8) {
    throw new Error("ephemeral Production database password required");
  }
  if (typeof directSessionCaPath !== "string" || directSessionCaPath.length === 0) {
    throw new Error("pinned Production CA path required");
  }
  delete process.env.SUPABASE_DB_PASSWORD;
  delete process.env.SUPABASE_DB_CA_CERT_PATH;
  assertDirectToolInstalled();
  const target = resolveDirectTarget();
  const plan = await composePersistentApplyPlan({ cwd });
  const persistentPackageManifest = JSON.parse(readFileSync(
    cwd === root
      ? persistentPackageManifestPath
      : resolve(
        cwd,
        "docs/feedback-intelligence/contracts/production-persistent-apply-v0.1/producer-package-manifest.json",
      ),
    "utf8",
  ));
  if (persistentPackageManifest.status !== "LOCAL_PREPARED_EXTERNAL_GATES_CLOSED"
      || typeof persistentPackageManifest.package_sha256 !== "string"
      || !/^[a-f0-9]{64}$/u.test(persistentPackageManifest.package_sha256)) {
    throw new Error("persistent Production package manifest drift");
  }
  assertPersistentPackageBytes({ cwd, manifest: persistentPackageManifest });
  if (plan.execution.persistent_apply_approved !== false
      || plan.execution.credential_approved !== false
      || plan.execution.rollback_dry_run_verified !== false
      || plan.execution.backup_and_recovery_verified !== false) {
    throw new Error("repository package must remain externally gated");
  }

  const tempRoot = mkdtempSync(resolve(tmpdir(), "rewire-v11-production-persistent-"));
  const historyPath = resolve(tempRoot, "history.sql");
  const baselinePath = resolve(tempRoot, "preapply-baseline.sql");
  const auditPath = resolve(tempRoot, "target-audit.sql");
  writeFileSync(historyPath, `SELECT version::text AS remote\nFROM supabase_migrations.schema_migrations\nORDER BY version;\n`, { encoding: "utf8", mode: 0o600 });
  writeFileSync(baselinePath, persistentPreapplyBaselineSql, { encoding: "utf8", mode: 0o600 });
  writeFileSync(auditPath, persistentTargetAuditSql, { encoding: "utf8", mode: 0o600 });
  const completed = [];
  try {
    const preflight = runDirectSession({
      target, sqlPath: historyPath, caFile: directSessionCaPath,
      password: directSessionPassword, cwd,
    });
    if (preflight.status !== 0) throw sanitizedStepError({
      ordinal: 0, version: "preflight", transaction_sql_sha256: null,
      transaction_sql_bytes: 0,
    }, preflight);
    const expectedFloor = expectedRemoteMigrationVersions(cwd);
    if (JSON.stringify(parseRemoteMigrationVersions(preflight.stdout))
        !== JSON.stringify(expectedFloor)) {
      throw new Error("fresh Production migration floor drift");
    }

    const baseline = runDirectSession({
      target, sqlPath: baselinePath, caFile: directSessionCaPath,
      password: directSessionPassword, cwd,
    });
    if (baseline.status !== 0) throw sanitizedStepError({
      ordinal: 0, version: "preapply-baseline",
      transaction_sql_sha256: sha256(persistentPreapplyBaselineSql),
      transaction_sql_bytes: Buffer.byteLength(persistentPreapplyBaselineSql),
    }, baseline);
    validatePreapplyBaseline(baseline.stdout);

    for (const step of plan.steps) {
      const source = readFileSync(resolve(cwd, `supabase/migrations/${step.file}`), "utf8");
      const migration = JSON.parse(readFileSync(resolve(
        cwd,
        "docs/feedback-intelligence/contracts/production-migration-plan-v0.1/plan.json",
      ), "utf8")).migrations[step.ordinal - 1];
      const composed = composePersistentMigrationStepSql({ migration, source });
      if (composed.sql_sha256 !== step.transaction_sql_sha256) {
        throw new Error(`persistent-step-${step.ordinal}: generated SQL drift`);
      }
      const stepPath = resolve(tempRoot, `step-${String(step.ordinal).padStart(2, "0")}.sql`);
      writeFileSync(stepPath, composed.sql, { encoding: "utf8", mode: 0o600 });
      const result = runDirectSession({
        target, sqlPath: stepPath, caFile: directSessionCaPath,
        password: directSessionPassword, cwd,
      });
      let stepFailure;
      try {
        if (result.status !== 0) throw sanitizedStepError(step, result);
        validateStepResult(result.stdout, step);
      } catch (error) {
        stepFailure = error;
      }
      if (stepFailure) {
        const failureHistory = runDirectSession({
          target, sqlPath: historyPath, caFile: directSessionCaPath,
          password: directSessionPassword, cwd,
        });
        let postFailureHistory = "POST_FAILURE_HISTORY_AUDIT_FAILED";
        if (failureHistory.status === 0) {
          postFailureHistory = classifyPostFailureHistory({
            versions: parseRemoteMigrationVersions(failureHistory.stdout),
            expectedBefore: [...expectedFloor, ...completed],
            currentVersion: step.version,
          });
        }
        throw new Error(`Production persistent apply stopped without retry: ${JSON.stringify({
          ordinal: step.ordinal,
          version: step.version,
          completed_before_failure: completed.length,
          post_failure_history: postFailureHistory,
          original_failure_sanitized: true,
        })}`);
      }
      completed.push(step.version);
    }

    const finalHistory = runDirectSession({
      target, sqlPath: historyPath, caFile: directSessionCaPath,
      password: directSessionPassword, cwd,
    });
    if (finalHistory.status !== 0) throw sanitizedStepError({
      ordinal: 26, version: "final-history", transaction_sql_sha256: null,
      transaction_sql_bytes: 0,
    }, finalHistory);
    const expectedFinal = [...expectedFloor, ...plan.steps.map(({ version }) => version)];
    if (JSON.stringify(parseRemoteMigrationVersions(finalHistory.stdout))
        !== JSON.stringify(expectedFinal)) {
      throw new Error("final Production migration history drift");
    }

    const audit = runDirectSession({
      target, sqlPath: auditPath, caFile: directSessionCaPath,
      password: directSessionPassword, cwd,
    });
    if (audit.status !== 0) throw sanitizedStepError({
      ordinal: 27, version: "target-audit", transaction_sql_sha256: sha256(persistentTargetAuditSql),
      transaction_sql_bytes: Buffer.byteLength(persistentTargetAuditSql),
    }, audit);
    validateTargetAudit(audit.stdout);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }

  return {
    status: "PASS_V1_1_PRODUCTION_MIGRATIONS_APPLIED_RUNTIME_CLOSED",
    project_ref: projectRef,
    source_package_sha256: persistentPackageManifest.package_sha256,
    completed_migrations: completed.length,
    completed_versions_sha256: sha256(`${completed.join("\n")}\n`),
    final_remote_migration_count: expectedRemoteMigrationVersions(cwd).length + completed.length,
    final_remote_versions_sha256: sha256(
      `${[...expectedRemoteMigrationVersions(cwd), ...completed].join("\n")}\n`,
    ),
    target_audit_status: "PASS_V1_1_PERSISTENT_TARGET_METADATA_AUDIT",
    retry_count: 0,
    credential_persisted_by_operator: false,
    application_values_returned: false,
    runtime_activation_authorized: false,
  };
};

if (process.argv[1]?.endsWith("run-v1-1-production-persistent-apply.mjs")) {
  if (!process.argv.includes("--execute")
      || !process.argv.includes("--persistent-apply-approved")
      || !process.argv.includes("--direct-session-credential-approved")
      || !process.argv.includes("--rollback-dry-run-verified")
      || !process.argv.includes("--backup-and-recovery-verified")) {
    throw new Error("Refusing persistent Production apply: required explicit gates are missing");
  }
  const result = await runProductionPersistentApply({
    persistentApplyApproved: true,
    directSessionCredentialApproved: true,
    rollbackDryRunVerified: true,
    backupAndRecoveryVerified: true,
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
