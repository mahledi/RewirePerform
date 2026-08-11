#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const planPath = "docs/feedback-intelligence/contracts/production-migration-plan-v0.1/plan.json";
const remoteFloor = "20260801104717";
const skippedMigration = "20260808074346_feedback_intelligence_synthetic_staging_read_gate_v0_1.sql";
const productionFunction = "read_feedback_intelligence_production_v0_2_draft";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export const normalizeOuterTransaction = (source, file = "migration.sql") => {
  const terminalNewline = source.endsWith("\n");
  const lines = source.split(/\r?\n/u);
  if (terminalNewline) lines.pop();
  const beginIndexes = [];
  const commitIndexes = [];
  lines.forEach((line, index) => {
    if (line.trim() === "BEGIN;") beginIndexes.push(index);
    if (line.trim() === "COMMIT;") commitIndexes.push(index);
  });
  if (beginIndexes.length !== 1 || commitIndexes.length !== 1) {
    throw new Error(`${file}: expected exactly one standalone BEGIN; and COMMIT; wrapper`);
  }
  const [beginIndex] = beginIndexes;
  const [commitIndex] = commitIndexes;
  if (beginIndex >= commitIndex) throw new Error(`${file}: outer transaction wrapper order is invalid`);
  if (commitIndex !== lines.findLastIndex((line) => line.trim() !== "")) {
    throw new Error(`${file}: COMMIT; must be the final material line`);
  }
  const normalized = lines
    .filter((_, index) => index !== beginIndex && index !== commitIndex)
    .join("\n");
  return terminalNewline ? `${normalized}\n` : normalized;
};

const preflightSql = `
DO $dry_run_preflight$
DECLARE latest_version text;
BEGIN
  SELECT max(version) INTO latest_version FROM supabase_migrations.schema_migrations;
  IF latest_version IS DISTINCT FROM '${remoteFloor}' THEN
    RAISE EXCEPTION 'v1_1_dry_run_remote_floor_drift:%', latest_version;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_roles
    WHERE rolname IN ('mahleos_feedback_reader', 'mahleos_feedback_production_reader')
  ) THEN
    RAISE EXCEPTION 'v1_1_dry_run_reader_role_must_be_absent';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_namespace
    WHERE nspname IN (
      'feedback_core', 'feedback_consent', 'feedback_raw', 'feedback_analysis',
      'feedback_machine_production'
    )
  ) THEN
    RAISE EXCEPTION 'v1_1_dry_run_feedback_schema_must_be_absent';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc procedure
    JOIN pg_catalog.pg_namespace namespace ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.prosecdef
      AND EXISTS (
        SELECT 1
        FROM pg_catalog.aclexplode(
          COALESCE(procedure.proacl, pg_catalog.acldefault('f', procedure.proowner))
        ) privilege
        WHERE privilege.grantee = 0 AND privilege.privilege_type = 'EXECUTE'
      )
  ) THEN
    RAISE EXCEPTION 'v1_1_dry_run_public_security_definer_drift';
  END IF;
END;
$dry_run_preflight$;
`;

const targetAuditSql = `
DO $dry_run_target$
DECLARE
  settings_count integer;
  private_function_count integer;
  forbidden_callable_count integer;
  production_reader record;
BEGIN
  SELECT count(*) INTO settings_count
  FROM feedback_core.machine_contract_settings
  WHERE contract_version = '0.2.1-draft'
    AND consumer_pin_ready = false
    AND synthetic_export_enabled = false
    AND production_export_enabled = false
    AND machine_credential_ready = false
    AND privacy_notice_ready = false
    AND app_store_declaration_ready = false
    AND minor_policy_ready = false;
  IF settings_count <> 1 THEN
    RAISE EXCEPTION 'v1_1_dry_run_machine_gates_not_closed:%', settings_count;
  END IF;

  SELECT
    role.rolsuper, role.rolinherit, role.rolcreaterole, role.rolcreatedb,
    role.rolcanlogin, role.rolreplication, role.rolbypassrls,
    auth.rolpassword IS NULL AS password_is_null
  INTO production_reader
  FROM pg_catalog.pg_roles role
  JOIN pg_catalog.pg_authid auth ON auth.oid = role.oid
  WHERE role.rolname = 'mahleos_feedback_production_reader';
  IF production_reader IS NULL
     OR production_reader.rolsuper OR production_reader.rolinherit
     OR production_reader.rolcreaterole OR production_reader.rolcreatedb
     OR NOT production_reader.rolcanlogin OR production_reader.rolreplication
     OR production_reader.rolbypassrls OR NOT production_reader.password_is_null THEN
    RAISE EXCEPTION 'v1_1_dry_run_production_reader_not_hardened';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_auth_members membership
    JOIN pg_catalog.pg_roles granted ON granted.oid = membership.roleid
    JOIN pg_catalog.pg_roles member ON member.oid = membership.member
    WHERE granted.rolname = 'mahleos_feedback_production_reader'
       OR member.rolname = 'mahleos_feedback_production_reader'
  ) THEN
    RAISE EXCEPTION 'v1_1_dry_run_production_reader_membership_drift';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_namespace namespace
    JOIN pg_catalog.pg_roles owner ON owner.oid = namespace.nspowner
    WHERE namespace.nspname = 'feedback_machine_production' AND owner.rolname = 'postgres'
  ) THEN
    RAISE EXCEPTION 'v1_1_dry_run_private_schema_owner_drift';
  END IF;

  SELECT count(*) INTO private_function_count
  FROM pg_catalog.pg_proc procedure
  JOIN pg_catalog.pg_namespace namespace ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'feedback_machine_production';
  IF private_function_count <> 1 OR to_regprocedure(
    'feedback_machine_production.${productionFunction}(text,text,text,text)'
  ) IS NULL THEN
    RAISE EXCEPTION 'v1_1_dry_run_private_function_inventory_drift:%', private_function_count;
  END IF;

  SELECT count(*) INTO forbidden_callable_count
  FROM pg_catalog.pg_proc procedure
  JOIN pg_catalog.pg_namespace namespace ON namespace.oid = procedure.pronamespace
  WHERE procedure.prosecdef
    AND has_schema_privilege('mahleos_feedback_production_reader', namespace.oid, 'USAGE')
    AND has_function_privilege('mahleos_feedback_production_reader', procedure.oid, 'EXECUTE')
    AND NOT (
      namespace.nspname = 'feedback_machine_production'
      AND procedure.oid = to_regprocedure(
        'feedback_machine_production.${productionFunction}(text,text,text,text)'
      )
    );
  IF forbidden_callable_count <> 0 THEN
    RAISE EXCEPTION 'v1_1_dry_run_forbidden_callable_inventory:%', forbidden_callable_count;
  END IF;

  IF NOT has_function_privilege(
    'mahleos_feedback_production_reader',
    'feedback_machine_production.${productionFunction}(text,text,text,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'v1_1_dry_run_production_rpc_not_callable';
  END IF;
END;
$dry_run_target$;

SELECT json_build_object(
  'status', 'PASS_V1_1_TARGET_STATE_BEFORE_ROLLBACK',
  'application_values_returned', false,
  'persistent_mutation_authorized', false
) AS v1_1_dry_run_target_status;
`;

const postRollbackAuditSql = `
DO $dry_run_rollback$
DECLARE latest_version text;
BEGIN
  SELECT max(version) INTO latest_version FROM supabase_migrations.schema_migrations;
  IF latest_version IS DISTINCT FROM '${remoteFloor}' THEN
    RAISE EXCEPTION 'v1_1_dry_run_rollback_floor_drift:%', latest_version;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_roles
    WHERE rolname IN ('mahleos_feedback_reader', 'mahleos_feedback_production_reader')
  ) THEN
    RAISE EXCEPTION 'v1_1_dry_run_rollback_reader_persisted';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_namespace
    WHERE nspname IN (
      'feedback_core', 'feedback_consent', 'feedback_raw', 'feedback_analysis',
      'feedback_machine_production'
    )
  ) THEN
    RAISE EXCEPTION 'v1_1_dry_run_rollback_schema_persisted';
  END IF;
END;
$dry_run_rollback$;

SELECT json_build_object(
  'status', 'PASS_V1_1_POST_ROLLBACK_METADATA_AUDIT',
  'application_values_returned', false,
  'persistent_mutation_detected', false
) AS v1_1_dry_run_rollback_status;
`;

export const composeDryRunSql = async ({ cwd = root } = {}) => {
  const plan = JSON.parse(await readFile(resolve(cwd, planPath), "utf8"));
  if (plan.status !== "LOCAL_PREPARED_AWAITING_TRANSACTIONAL_ROLLBACK_DRY_RUN") {
    throw new Error(`Production migration plan status drift: ${plan.status}`);
  }
  if (typeof plan.execution_contract.application_data_access_approved !== "boolean"
      || plan.execution_contract.persistent_production_apply_approved !== false) {
    throw new Error("Production dry-run access approval must be explicit and persistent apply must remain unapproved");
  }

  const normalizedMigrations = [];
  const skipped = [];
  for (const migration of plan.migrations) {
    const source = await readFile(resolve(cwd, migration.path), "utf8");
    const actualSha = sha256(source);
    if (actualSha !== migration.sha256) throw new Error(`${migration.file}: migration SHA-256 drift`);
    if (migration.action === "MARK_APPLIED_WITHOUT_EXECUTION") {
      if (migration.file !== skippedMigration) throw new Error(`${migration.file}: unexpected history-only migration`);
      skipped.push(migration.file);
      continue;
    }
    if (migration.action !== "APPLY_EXACT_BYTES") {
      throw new Error(`${migration.file}: unsupported migration action ${migration.action}`);
    }
    normalizedMigrations.push({
      file: migration.file,
      source_sha256: actualSha,
      sql: normalizeOuterTransaction(source, migration.file),
    });
  }
  if (normalizedMigrations.length !== 24 || skipped.length !== 1) {
    throw new Error("Production rollback dry-run inventory drift");
  }

  const migrationSql = normalizedMigrations.map(({ file, source_sha256, sql }) =>
    `\n-- BEGIN_NORMALIZED_MIGRATION ${file} SHA256 ${source_sha256}\n${sql}`
      + `-- END_NORMALIZED_MIGRATION ${file}\n`
  ).join("");
  const sql = `-- Generated V1.1 Production rollback dry-run. DO NOT use for persistent apply.\n`
    + `BEGIN;\nSET LOCAL lock_timeout = '5s';\nSET LOCAL statement_timeout = '180s';\n`
    + preflightSql + migrationSql + targetAuditSql + `ROLLBACK;\n` + postRollbackAuditSql;
  if (sql.includes(skippedMigration) || sql.includes("machine_credential_ready = true")) {
    throw new Error("Staging gate-open bytes leaked into Production rollback dry-run SQL");
  }
  return {
    sql,
    summary: {
      status: "LOCAL_OPERATOR_READY_EXTERNAL_DATA_READ_NOT_APPROVED",
      sql_sha256: sha256(sql),
      sql_bytes: Buffer.byteLength(sql),
      normalized_apply_migrations: normalizedMigrations.length,
      history_only_migrations_skipped: skipped.length,
      application_data_access_required: true,
      application_data_access_approved: plan.execution_contract.application_data_access_approved,
      persistent_production_apply_authorized: false,
    },
  };
};

const isMain = process.argv[1]
  && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const { sql, summary } = await composeDryRunSql();
  process.stdout.write(process.argv.includes("--print") ? sql : `${JSON.stringify(summary, null, 2)}\n`);
}
