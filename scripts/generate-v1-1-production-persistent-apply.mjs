#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  adaptHostedRoleAdministration,
  assertNoCredentialBearingRoleStatement,
  hostedProductionAdaptedMigrations,
  normalizeOuterTransaction,
} from "./generate-v1-1-production-rollback-dry-run.mjs";

const root = process.cwd();
const checkOnly = process.argv.includes("--check");
const sourcePlanPath =
  "docs/feedback-intelligence/contracts/production-migration-plan-v0.1/plan.json";
const base = "docs/feedback-intelligence/contracts/production-persistent-apply-v0.1";
const applyPlanPath = `${base}/plan.json`;
const manifestPath = `${base}/producer-package-manifest.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const sqlLiteral = (value) => `'${value.replaceAll("'", "''")}'`;
const dollarLiteral = (value, seed) => {
  const tag = `$rewire_${seed.slice(0, 24)}$`;
  if (value.includes(tag)) throw new Error("Production apply SQL dollar-tag collision");
  return `${tag}${value}${tag}`;
};

const forbiddenOutsideTransaction = [
  /\bCREATE\s+(?:UNIQUE\s+)?INDEX\s+CONCURRENTLY\b/iu,
  /\bREINDEX\b[\s\S]*\bCONCURRENTLY\b/iu,
  /(^|;)\s*VACUUM(?:\s|\(|;)/imu,
  /(^|;)\s*ALTER\s+SYSTEM(?:\s|;)/imu,
  /(^|;)\s*CLUSTER(?:\s|;)/imu,
];

// PostgreSQL-aware splitter for migration history. It preserves quoted strings,
// nested block comments, dollar-quoted function bodies, and parenthesized SQL.
// This matches the material contract used by Supabase CLI v2.113.0: the applied
// statement list, rather than one opaque migration-file blob, is stored in
// supabase_migrations.schema_migrations.statements.
export const splitMigrationStatements = (source) => {
  const statements = [];
  let buffer = "";
  let singleQuoted = false;
  let doubleQuoted = false;
  let lineComment = false;
  let blockCommentDepth = 0;
  let dollarTag = null;
  let parenthesisDepth = 0;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    buffer += char;
    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockCommentDepth > 0) {
      if (char === "/" && next === "*") {
        blockCommentDepth += 1;
        buffer += next;
        index += 1;
      } else if (char === "*" && next === "/") {
        blockCommentDepth -= 1;
        buffer += next;
        index += 1;
      }
      continue;
    }
    if (dollarTag !== null) {
      if (source.startsWith(dollarTag, index)) {
        buffer += dollarTag.slice(1);
        index += dollarTag.length - 1;
        dollarTag = null;
      }
      continue;
    }
    if (singleQuoted) {
      if (char === "'" && next === "'") {
        buffer += next;
        index += 1;
      } else if (char === "'") {
        singleQuoted = false;
      }
      continue;
    }
    if (doubleQuoted) {
      if (char === '"' && next === '"') {
        buffer += next;
        index += 1;
      } else if (char === '"') {
        doubleQuoted = false;
      }
      continue;
    }
    if (char === "-" && next === "-") {
      lineComment = true;
      buffer += next;
      index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      blockCommentDepth = 1;
      buffer += next;
      index += 1;
      continue;
    }
    if (char === "'") {
      singleQuoted = true;
      continue;
    }
    if (char === '"') {
      doubleQuoted = true;
      continue;
    }
    if (char === "$") {
      const match = source.slice(index).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/u);
      if (match) {
        dollarTag = match[0];
        buffer += dollarTag.slice(1);
        index += dollarTag.length - 1;
        continue;
      }
    }
    if (char === "(") parenthesisDepth += 1;
    if (char === ")") parenthesisDepth -= 1;
    if (parenthesisDepth < 0) throw new Error("Migration SQL parenthesis drift");
    if (char === ";" && parenthesisDepth === 0) {
      const statement = buffer.slice(0, -1).trim();
      if (statement.length > 0) statements.push(statement);
      buffer = "";
    }
  }
  if (singleQuoted || doubleQuoted || blockCommentDepth !== 0 || dollarTag !== null
      || parenthesisDepth !== 0) {
    throw new Error("Migration SQL lexical state drift");
  }
  const trailing = buffer.trim();
  if (trailing.length > 0) statements.push(trailing);
  return statements;
};

export const composePersistentMigrationStepSql = ({ migration, source }) => {
  const sourceSha = sha256(source);
  if (sourceSha !== migration.sha256) {
    throw new Error(`${migration.file}: persistent apply source SHA-256 drift`);
  }
  assertNoCredentialBearingRoleStatement(source, migration.file);

  const isHistoryOnly = migration.action === "MARK_APPLIED_WITHOUT_EXECUTION";
  const isHostedAdapted = hostedProductionAdaptedMigrations.has(migration.file);
  if ((migration.action === "APPLY_HOSTED_PRODUCTION_ADAPTED_BYTES") !== isHostedAdapted) {
    if (!isHistoryOnly && migration.action !== "APPLY_EXACT_BYTES") {
      throw new Error(`${migration.file}: unsupported persistent action ${migration.action}`);
    }
    if (isHostedAdapted) throw new Error(`${migration.file}: hosted Production action drift`);
  }

  const executionSource = isHistoryOnly
    ? ""
    : adaptHostedRoleAdministration(source, migration.file);
  if (!isHistoryOnly && sha256(executionSource) !== migration.production_execution_sha256) {
    throw new Error(`${migration.file}: persistent execution SHA-256 drift`);
  }
  if (isHostedAdapted && sha256(executionSource) !== migration.production_adapted_sha256) {
    throw new Error(`${migration.file}: persistent hosted-adaptation SHA-256 drift`);
  }

  const body = isHistoryOnly ? "" : normalizeOuterTransaction(executionSource, migration.file);
  if (forbiddenOutsideTransaction.some((pattern) => pattern.test(body))) {
    throw new Error(`${migration.file}: nontransactional SQL is forbidden in persistent apply`);
  }
  const name = migration.file.slice(15, -4);
  const historyStatements = isHistoryOnly ? [] : splitMigrationStatements(body);
  if (!isHistoryOnly && historyStatements.length === 0) {
    throw new Error(`${migration.file}: persistent migration has no statements`);
  }
  const historyArray = isHistoryOnly
    ? "ARRAY[]::text[]"
    : `ARRAY[${historyStatements.map((statement, index) => dollarLiteral(
      statement,
      sha256(`${migration.production_execution_sha256}:${index}`),
    )).join(", ")}]::text[]`;
  const status = isHistoryOnly
    ? "PASS_V1_1_HISTORY_ONLY_MIGRATION_RECORDED"
    : "PASS_V1_1_PRODUCTION_MIGRATION_APPLIED";
  const sql = `RESET ALL;\nBEGIN;\nSET LOCAL lock_timeout = '5s';\n`
    + `SET LOCAL statement_timeout = '180s';\n`
    + (body ? `${body}\n` : "")
    + `INSERT INTO supabase_migrations.schema_migrations(version, name, statements)\n`
    + `VALUES (${sqlLiteral(migration.version)}, ${sqlLiteral(name)}, `
    + `${historyArray});\nCOMMIT;\n`
    + `SELECT json_build_object(\n`
    + `  'status', ${sqlLiteral(status)},\n`
    + `  'version', ${sqlLiteral(migration.version)},\n`
    + `  'application_values_returned', false\n`
    + `) AS v1_1_persistent_step_status;\n`;
  return {
    sql,
    status,
    sql_sha256: sha256(sql),
    sql_bytes: Buffer.byteLength(sql),
    execution_sha256: isHistoryOnly ? null : sha256(executionSource),
    history_only: isHistoryOnly,
    history_statement_count: historyStatements.length,
  };
};

export const composePersistentApplyPlan = async ({ cwd = root } = {}) => {
  const sourcePlanBytes = await readFile(resolve(cwd, sourcePlanPath));
  const sourcePlan = JSON.parse(sourcePlanBytes.toString("utf8"));
  if (sourcePlan.project_ref !== "bqsbxesmybthwtxmowfz"
      || sourcePlan.execution_contract.persistent_production_apply_approved !== false
      || sourcePlan.execution_contract.persistent_execution_strategy
        !== "ordered_stop_on_first_error_one_migration_per_step") {
    throw new Error("Production migration source plan contract drift");
  }

  const steps = [];
  for (const migration of sourcePlan.migrations) {
    const source = await readFile(resolve(cwd, migration.path), "utf8");
    const composed = composePersistentMigrationStepSql({ migration, source });
    steps.push({
      ordinal: steps.length + 1,
      version: migration.version,
      file: migration.file,
      action: migration.action,
      source_sha256: migration.sha256,
      execution_sha256: composed.execution_sha256,
      transaction_sql_sha256: composed.sql_sha256,
      transaction_sql_bytes: composed.sql_bytes,
      expected_status: composed.status,
      history_only: composed.history_only,
    });
  }
  if (steps.length !== 25
      || steps.filter(({ history_only }) => history_only).length !== 1
      || steps.filter(({ action }) => action === "APPLY_HOSTED_PRODUCTION_ADAPTED_BYTES").length !== 2) {
    throw new Error("Production persistent apply inventory drift");
  }
  return {
    schema_version: "rewireperform-v1.1-production-persistent-apply-v1",
    status: "LOCAL_PREPARED_EXTERNAL_GATES_CLOSED",
    generated_at: "2026-08-13T10:40:00+02:00",
    project_ref: sourcePlan.project_ref,
    source_plan_sha256: sha256(sourcePlanBytes),
    execution: {
      persistent_apply_approved: false,
      credential_approved: false,
      rollback_dry_run_verified: false,
      backup_and_recovery_verified: false,
      stop_on_first_error: true,
      retry_allowed: false,
      one_password_prompt_supported: true,
      application_values_returned: false,
      edge_deploy: false,
      runtime_activation: false,
    },
    step_count: steps.length,
    steps,
  };
};

const basePackageFiles = [
  applyPlanPath,
  sourcePlanPath,
  "docs/feedback-intelligence/contracts/production-migration-plan-v0.1/producer-package-manifest.json",
  "docs/feedback-intelligence/PRODUCTION_MIGRATION_PLAN_V1_1.md",
  "scripts/generate-v1-1-production-persistent-apply.mjs",
  "scripts/run-v1-1-production-persistent-apply.mjs",
  "scripts/execute-postgres-simple-query.mjs",
  "scripts/run-v1-1-production-rollback-dry-run.mjs",
  "scripts/generate-v1-1-production-migration-plan.mjs",
  "scripts/generate-v1-1-production-rollback-dry-run.mjs",
  "config/certs/supabase-prod-root-2021.crt",
  "tools/production-rollback-dry-run/package.json",
  "tools/production-rollback-dry-run/package-lock.json",
  ".github/workflows/ci.yml",
  "package.json",
  "src/test/postgresSimpleQueryWorker.test.ts",
  "src/test/v11ProductionRollbackDryRun.test.ts",
  "src/test/v11ProductionPersistentApply.test.ts",
  "src/test/v11ProductionPersistentRunner.test.ts",
];
const isMain = process.argv[1]
  && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const plan = await composePersistentApplyPlan();
  const serializedPlan = `${JSON.stringify(plan, null, 2)}\n`;
  const packageFiles = [
    ...basePackageFiles,
    ...plan.steps.map(({ file }) => `supabase/migrations/${file}`),
  ];
  const files = [];
  const digestInput = [];
  for (const path of packageFiles) {
    const bytes = path === applyPlanPath ? Buffer.from(serializedPlan) : await readFile(resolve(root, path));
    const digest = sha256(bytes);
    files.push({ path, sha256: digest });
    digestInput.push(`${digest}  ${path}\n`);
  }
  const manifest = {
    schema_version: "rewireperform-v1.1-production-persistent-apply-package-v1",
    status: plan.status,
    generated_at: plan.generated_at,
    package_sha256: sha256(digestInput.join("")),
    files,
    activation: {
      persistent_apply: false,
      credentials: false,
      rollback_dry_run: false,
      feedback_collection: false,
      minor_feedback: false,
      real_jarvis: false,
      edge_deploy: false,
    },
  };
  const serializedManifest = `${JSON.stringify(manifest, null, 2)}\n`;
  if (checkOnly) {
    const [currentPlan, currentManifest] = await Promise.all([
      readFile(resolve(root, applyPlanPath), "utf8"),
      readFile(resolve(root, manifestPath), "utf8"),
    ]);
    if (currentPlan !== serializedPlan) throw new Error(`${applyPlanPath}: generated plan drift`);
    if (currentManifest !== serializedManifest) throw new Error(`${manifestPath}: generated manifest drift`);
    console.log(JSON.stringify({
      status: plan.status,
      steps: plan.step_count,
      package_sha256: manifest.package_sha256,
      all_external_gates_closed: Object.values(manifest.activation).every((value) => value === false),
    }, null, 2));
  } else {
    await writeFile(resolve(root, applyPlanPath), serializedPlan, "utf8");
    await writeFile(resolve(root, manifestPath), serializedManifest, "utf8");
  }
}
