#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const planPath = "docs/feedback-intelligence/contracts/production-migration-plan-v0.1/plan.json";
const remoteFloor = "20260801104717";
const skippedMigration = "20260808074346_feedback_intelligence_synthetic_staging_read_gate_v0_1.sql";
const stagingRoleRemediationMigration =
  "20260808093000_feedback_intelligence_machine_gateway_privilege_remediation.sql";
const productionReaderMigration =
  "20260811071836_feedback_intelligence_production_gateway_v0_1.sql";
const productionFunction = "read_feedback_intelligence_production_v0_2_draft";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export const hostedProductionAdaptedMigrations = new Set([
  stagingRoleRemediationMigration,
  productionReaderMigration,
]);

export const assertNoCredentialBearingRoleStatement = (source, file = "migration.sql") => {
  const rolePasswordLines = source.split(/\r?\n/u).filter((line) =>
    /^\s*(?:(?:CREATE|ALTER)\s+ROLE\b.*\bPASSWORD\b|PASSWORD\b)/iu.test(line)
  );
  if (rolePasswordLines.some((line) => !/\bPASSWORD\s+NULL(?:\s|;|$)/iu.test(line))) {
    throw new Error(`${file}: credential-bearing role statement is forbidden`);
  }
};

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

export const adaptHostedRoleAdministration = (source, file) => {
  let adapted = source;
  if (file === stagingRoleRemediationMigration) {
    const membershipRevoke = "REVOKE mahleos_feedback_reader FROM postgres;";
    if (adapted.split(membershipRevoke).length !== 2) {
      throw new Error(`${file}: expected hosted reader membership revoke is missing`);
    }
    adapted = adapted.replace(membershipRevoke, "");
  } else if (file === productionReaderMigration) {
    const membershipCleanupStart = "DO $$\nDECLARE\n  membership record;";
    const start = adapted.indexOf(membershipCleanupStart);
    const end = adapted.indexOf("$$;", start);
    if (start < 0 || end < start) {
      throw new Error(`${file}: expected hosted Production membership cleanup is missing`);
    }
    adapted = `${adapted.slice(0, start)}${adapted.slice(end + 3)}`;

    const roleComment = "COMMENT ON ROLE mahleos_feedback_production_reader IS";
    if (adapted.split(roleComment).length !== 2) {
      throw new Error(`${file}: expected unique Production reader comment marker is missing`);
    }
    const retireStagingReader = `-- Production never uses the historical synthetic Staging reader.\n`
      + `REVOKE ALL ON FUNCTION public.read_feedback_intelligence_v0_2_draft(text, text, text, text)\n`
      + `  FROM mahleos_feedback_reader;\n`
      + `REVOKE USAGE ON SCHEMA public FROM mahleos_feedback_reader;\n\n`;
    adapted = adapted.replace(roleComment, `${retireStagingReader}${roleComment}`);
  }
  return adapted;
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

export const targetAuditSql = `
DO $dry_run_target$
DECLARE
  settings_count integer;
  collection_settings_count integer;
  private_function_count integer;
  private_rpc_public_callable_count integer;
  forbidden_callable_count integer;
  legacy_reader_callable_count integer;
  reader_relation_privilege_count integer;
  reader_sequence_privilege_count integer;
  reader_membership_count integer;
  hosted_management_membership_count integer;
  hosted_management_reader_count integer;
  production_reader record;
BEGIN
  SELECT count(*) INTO collection_settings_count
  FROM feedback_core.system_settings
  WHERE singleton
    AND athlete_collection_enabled = false
    AND text_collection_enabled = false
    AND privacy_notice_ready = false
    AND app_store_declaration_ready = false
    AND minor_policy_ready = false;
  IF collection_settings_count <> 1 THEN
    RAISE EXCEPTION 'v1_1_dry_run_collection_gates_not_closed:%',
      collection_settings_count;
  END IF;

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
    role.rolcanlogin, role.rolreplication, role.rolbypassrls
  INTO production_reader
  FROM pg_catalog.pg_roles role
  WHERE role.rolname = 'mahleos_feedback_production_reader';
  IF production_reader IS NULL
     OR production_reader.rolsuper OR production_reader.rolinherit
     OR production_reader.rolcreaterole OR production_reader.rolcreatedb
     OR NOT production_reader.rolcanlogin OR production_reader.rolreplication
     OR production_reader.rolbypassrls THEN
    RAISE EXCEPTION 'v1_1_dry_run_production_reader_not_hardened';
  END IF;

  SELECT count(*), count(DISTINCT granted.rolname) INTO
    reader_membership_count, hosted_management_reader_count
    FROM pg_catalog.pg_auth_members membership
    JOIN pg_catalog.pg_roles granted ON granted.oid = membership.roleid
    JOIN pg_catalog.pg_roles member ON member.oid = membership.member
    WHERE granted.rolname IN (
      'mahleos_feedback_reader', 'mahleos_feedback_production_reader'
    ) OR member.rolname IN (
      'mahleos_feedback_reader', 'mahleos_feedback_production_reader'
    );

  SELECT count(*) INTO hosted_management_membership_count
  FROM pg_catalog.pg_auth_members membership
  JOIN pg_catalog.pg_roles granted ON granted.oid = membership.roleid
  JOIN pg_catalog.pg_roles member ON member.oid = membership.member
  JOIN pg_catalog.pg_roles grantor ON grantor.oid = membership.grantor
  WHERE granted.rolname IN (
      'mahleos_feedback_reader', 'mahleos_feedback_production_reader'
    )
    AND member.rolname = 'postgres'
    AND grantor.rolname = 'supabase_admin'
    AND membership.admin_option
    AND NOT membership.inherit_option
    AND NOT membership.set_option;

  IF reader_membership_count <> 2
     OR hosted_management_membership_count <> 2
     OR hosted_management_reader_count <> 2 THEN
    RAISE EXCEPTION 'v1_1_dry_run_reader_membership_drift:%:%:%',
      reader_membership_count,
      hosted_management_membership_count,
      hosted_management_reader_count;
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

  SELECT count(*) INTO legacy_reader_callable_count
  FROM pg_catalog.pg_proc procedure
  JOIN pg_catalog.pg_namespace namespace ON namespace.oid = procedure.pronamespace
  WHERE procedure.prosecdef
    AND has_schema_privilege('mahleos_feedback_reader', namespace.oid, 'USAGE')
    AND has_function_privilege('mahleos_feedback_reader', procedure.oid, 'EXECUTE');
  IF legacy_reader_callable_count <> 0 THEN
    RAISE EXCEPTION 'v1_1_dry_run_legacy_reader_callable_inventory:%',
      legacy_reader_callable_count;
  END IF;

  SELECT count(*) INTO reader_relation_privilege_count
  FROM pg_catalog.pg_class relation
  JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
  WHERE relation.relkind IN ('r', 'p', 'v', 'm', 'f')
    AND namespace.nspname IN (
      'public', 'app_private', 'feedback_core', 'feedback_consent',
      'feedback_raw', 'feedback_analysis', 'feedback_machine_production'
    )
    AND (
      has_table_privilege(
        'mahleos_feedback_reader', relation.oid,
        'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
      )
      OR has_table_privilege(
        'mahleos_feedback_production_reader', relation.oid,
        'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
      )
    );
  IF reader_relation_privilege_count <> 0 THEN
    RAISE EXCEPTION 'v1_1_dry_run_reader_relation_privilege_inventory:%',
      reader_relation_privilege_count;
  END IF;

  SELECT count(*) INTO reader_sequence_privilege_count
  FROM pg_catalog.pg_class sequence
  JOIN pg_catalog.pg_namespace namespace ON namespace.oid = sequence.relnamespace
  WHERE sequence.relkind = 'S'
    AND namespace.nspname IN (
      'public', 'app_private', 'feedback_core', 'feedback_consent',
      'feedback_raw', 'feedback_analysis', 'feedback_machine_production'
    )
    AND (
      has_sequence_privilege('mahleos_feedback_reader', sequence.oid, 'USAGE,SELECT,UPDATE')
      OR has_sequence_privilege(
        'mahleos_feedback_production_reader', sequence.oid, 'USAGE,SELECT,UPDATE'
      )
    );
  IF reader_sequence_privilege_count <> 0 THEN
    RAISE EXCEPTION 'v1_1_dry_run_reader_sequence_privilege_inventory:%',
      reader_sequence_privilege_count;
  END IF;

  IF NOT has_function_privilege(
    'mahleos_feedback_production_reader',
    'feedback_machine_production.${productionFunction}(text,text,text,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'v1_1_dry_run_production_rpc_not_callable';
  END IF;

  SELECT count(*) INTO private_rpc_public_callable_count
  FROM pg_catalog.pg_roles role
  WHERE role.rolname IN ('anon', 'authenticated', 'service_role')
    AND (
      has_schema_privilege(role.rolname, 'feedback_machine_production', 'USAGE')
      OR has_function_privilege(
        role.rolname,
        'feedback_machine_production.${productionFunction}(text,text,text,text)',
        'EXECUTE'
      )
    );
  IF private_rpc_public_callable_count <> 0 THEN
    RAISE EXCEPTION 'v1_1_dry_run_private_rpc_public_callable_inventory:%',
      private_rpc_public_callable_count;
  END IF;
END;
$dry_run_target$;
`;

export const persistentTargetAuditSql = `${targetAuditSql}
SELECT json_build_object(
  'status', 'PASS_V1_1_PERSISTENT_TARGET_METADATA_AUDIT',
  'application_values_returned', false,
  'runtime_activation_authorized', false
) AS v1_1_persistent_target_status;
`;

const postRollbackDoSql = `
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
`;

const postRollbackAuditSql = `${postRollbackDoSql}
SELECT
  json_build_object(
    'status', 'PASS_V1_1_TARGET_STATE_BEFORE_ROLLBACK',
    'application_values_returned', false,
    'persistent_mutation_authorized', false
  ) AS v1_1_dry_run_target_status,
  json_build_object(
    'status', 'PASS_V1_1_POST_ROLLBACK_METADATA_AUDIT',
    'application_values_returned', false,
    'persistent_mutation_detected', false
  ) AS v1_1_dry_run_rollback_status;
`;

export const freshPostRollbackAuditSql = `${postRollbackDoSql}
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
    assertNoCredentialBearingRoleStatement(source, migration.file);
    if (migration.action === "MARK_APPLIED_WITHOUT_EXECUTION") {
      if (migration.file !== skippedMigration) throw new Error(`${migration.file}: unexpected history-only migration`);
      skipped.push(migration.file);
      continue;
    }
    if (!["APPLY_EXACT_BYTES", "APPLY_HOSTED_PRODUCTION_ADAPTED_BYTES"].includes(
      migration.action,
    )) {
      throw new Error(`${migration.file}: unsupported migration action ${migration.action}`);
    }
    const adaptedSource = adaptHostedRoleAdministration(source, migration.file);
    const isHostedAdapted = hostedProductionAdaptedMigrations.has(migration.file);
    if ((migration.action === "APPLY_HOSTED_PRODUCTION_ADAPTED_BYTES") !== isHostedAdapted) {
      throw new Error(`${migration.file}: hosted Production action drift`);
    }
    if (isHostedAdapted && sha256(adaptedSource) !== migration.production_adapted_sha256) {
      throw new Error(`${migration.file}: hosted Production adapted SHA-256 drift`);
    }
    normalizedMigrations.push({
      file: migration.file,
      source_sha256: actualSha,
      sql: normalizeOuterTransaction(adaptedSource, migration.file),
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
      status: plan.execution_contract.application_data_access_approved
        ? "LOCAL_OPERATOR_READY_BOUNDED_DATA_READ_APPROVED"
        : "LOCAL_OPERATOR_READY_EXTERNAL_DATA_READ_NOT_APPROVED",
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
  if (process.argv.includes("--postrollback-audit-print")) {
    process.stdout.write(freshPostRollbackAuditSql);
  } else {
    process.stdout.write(process.argv.includes("--print") ? sql : `${JSON.stringify(summary, null, 2)}\n`);
  }
}
