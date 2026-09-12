#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { composeDryRunSql, freshPostRollbackAuditSql } from "./generate-v1-1-production-rollback-dry-run.mjs";

const projectRef = "bqsbxesmybthwtxmowfz";
const remoteFloor = "20260801104717";
const expectedDirectTarget = {
  host: "aws-1-eu-central-1.pooler.supabase.com",
  port: "5432",
  user: `postgres.${projectRef}`,
  database: "postgres",
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const directToolDirectory = resolve(scriptDirectory, "../tools/production-rollback-dry-run");
const pinnedPgVersion = "8.23.0";

const safeDryRunMarkers = [
  "v1_1_dry_run_collection_gates_not_closed",
  "v1_1_dry_run_feedback_schema_must_be_absent",
  "v1_1_dry_run_forbidden_callable_inventory",
  "v1_1_dry_run_legacy_reader_callable_inventory",
  "v1_1_dry_run_machine_gates_not_closed",
  "v1_1_dry_run_private_function_inventory_drift",
  "v1_1_dry_run_private_rpc_public_callable_inventory",
  "v1_1_dry_run_private_schema_owner_drift",
  "v1_1_dry_run_reader_membership_drift",
  "v1_1_dry_run_reader_relation_privilege_inventory",
  "v1_1_dry_run_reader_sequence_privilege_inventory",
  "v1_1_dry_run_production_reader_membership_drift",
  "v1_1_dry_run_production_reader_not_hardened",
  "v1_1_dry_run_production_rpc_not_callable",
  "v1_1_dry_run_public_security_definer_drift",
  "v1_1_dry_run_reader_role_must_be_absent",
  "v1_1_dry_run_remote_floor_drift",
  "v1_1_dry_run_rollback_floor_drift",
  "v1_1_dry_run_rollback_reader_persisted",
  "v1_1_dry_run_rollback_schema_persisted",
];

const byteLength = (value) => Buffer.byteLength(typeof value === "string" ? value : "", "utf8");

export const sanitizeCliFailure = (result, { requestBytes = 0 } = {}) => {
  const stdout = typeof result?.stdout === "string" ? result.stdout : "";
  const stderr = typeof result?.stderr === "string" ? result.stderr : "";
  const combined = `${stderr}\n${stdout}`;
  const httpStatus = combined.match(/unexpected status\s+(\d{3})(?:\D|$)/iu)?.[1];
  const sqlstate = combined.match(/(?:SQLSTATE[\s:=]+|["'](?:code|sqlstate)["']\s*:\s*["'])([0-9A-Z]{5})(?:["']|\b)/u)?.[1];
  const guardMarker = safeDryRunMarkers.find((marker) => combined.includes(marker));
  const spawnCode = typeof result?.error?.code === "string"
    && /^[A-Z0-9_]{2,32}$/u.test(result.error.code)
    ? result.error.code
    : undefined;
  const signal = typeof result?.signal === "string" && /^[A-Z0-9]{2,16}$/u.test(result.signal)
    ? result.signal
    : undefined;

  const failureClass = guardMarker
    ? "DRY_RUN_GUARD_REJECTED"
    : httpStatus
      ? "MANAGEMENT_API_HTTP_ERROR"
      : spawnCode
        ? "CLI_PROCESS_ERROR"
        : signal
          ? "CLI_PROCESS_SIGNAL"
          : "UNCLASSIFIED_CLI_FAILURE";

  return {
    failure_class: failureClass,
    exit_status: Number.isInteger(result?.status) ? result.status : null,
    signal: signal ?? null,
    spawn_code: spawnCode ?? null,
    http_status: httpStatus ? Number(httpStatus) : null,
    sqlstate: sqlstate ?? null,
    dry_run_guard: guardMarker ?? null,
    request_bytes: Number.isSafeInteger(requestBytes) && requestBytes >= 0 ? requestBytes : 0,
    stdout_bytes: byteLength(stdout),
    stderr_bytes: byteLength(stderr),
    raw_output_persisted: false,
    output_digest_persisted: false,
    cli_output_forwarded_by_runner: false,
  };
};

const sanitizedCliError = (label, result, requestBytes = 0) => new Error(
  `${label}: ${JSON.stringify(sanitizeCliFailure(result, { requestBytes }))}`,
);

const parseJson = (value, label) => {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${label}: CLI did not return valid JSON`);
  }
};

const parseDirectRows = (value, label) => {
  const rows = parseJson(value, label);
  if (!Array.isArray(rows)) throw new Error(`${label}: direct session did not return a JSON row array`);
  return rows;
};

const assertExactKeys = (value, expected, label) => {
  const keys = Object.keys(value ?? {}).sort();
  if (JSON.stringify(keys) !== JSON.stringify([...expected].sort())) {
    throw new Error(`${label}: unexpected result keys`);
  }
};

const targetStatus = {
  status: "PASS_V1_1_TARGET_STATE_BEFORE_ROLLBACK",
  application_values_returned: false,
  persistent_mutation_authorized: false,
};
const rollbackStatus = {
  status: "PASS_V1_1_POST_ROLLBACK_METADATA_AUDIT",
  application_values_returned: false,
  persistent_mutation_detected: false,
};

export const validateDryRunResult = (stdout) => {
  const rows = parseDirectRows(stdout, "dry-run");
  if (rows.length !== 1) {
    throw new Error("dry-run: expected exactly one sanitized status row");
  }
  const row = rows[0];
  assertExactKeys(row, ["v1_1_dry_run_target_status", "v1_1_dry_run_rollback_status"], "dry-run");
  assertExactKeys(row.v1_1_dry_run_target_status, Object.keys(targetStatus), "dry-run target status");
  assertExactKeys(row.v1_1_dry_run_rollback_status, Object.keys(rollbackStatus), "dry-run rollback status");
  if (Object.entries(targetStatus).some(([key, value]) => row.v1_1_dry_run_target_status[key] !== value)
      || Object.entries(rollbackStatus).some(([key, value]) => row.v1_1_dry_run_rollback_status[key] !== value)) {
    throw new Error("dry-run: status evidence drift");
  }
  return { target: targetStatus, rollback: rollbackStatus };
};

export const validatePostRollbackResult = (stdout) => {
  const rows = parseDirectRows(stdout, "postrollback-audit");
  if (rows.length !== 1) {
    throw new Error("postrollback-audit: expected exactly one sanitized status row");
  }
  const row = rows[0];
  assertExactKeys(row, ["v1_1_dry_run_rollback_status"], "postrollback-audit");
  assertExactKeys(row.v1_1_dry_run_rollback_status, Object.keys(rollbackStatus), "postrollback status");
  if (Object.entries(rollbackStatus).some(([key, value]) => row.v1_1_dry_run_rollback_status[key] !== value)) {
    throw new Error("postrollback-audit: status evidence drift");
  }
  return rollbackStatus;
};

export const expectedRemoteMigrationVersions = (cwd) => readdirSync(resolve(cwd, "supabase/migrations"))
  .filter((name) => /^\d{14}_.+\.sql$/u.test(name) && name.slice(0, 14) <= remoteFloor)
  .map((name) => name.slice(0, 14))
  .sort();

export const parseRemoteMigrationVersions = (stdout) => {
  const rows = parseDirectRows(stdout, "migration-preflight");
  const versions = rows.map((entry) => {
    assertExactKeys(entry, ["remote"], "migration-preflight entry");
    if (typeof entry.remote !== "string" || !/^\d{14}$/u.test(entry.remote)) {
      throw new Error("migration-preflight: invalid remote version");
    }
    return entry.remote;
  });
  if (new Set(versions).size !== versions.length) {
    throw new Error("migration-preflight: duplicate remote version");
  }
  if (JSON.stringify(versions) !== JSON.stringify([...versions].sort())) {
    throw new Error("migration-preflight: remote versions are not ordered");
  }
  return versions;
};

export const sanitizedDirectChildEnv = () => ({
  // Positive allowlist only. No ambient NODE_*, PG*, TLS/keylog, proxy,
  // loader, debug, service, credential, locale-file, or CA overrides.
  LANG: "C",
  LC_ALL: "C",
  TZ: "UTC",
});

export const assertDirectToolInstalled = (toolDirectory = directToolDirectory) => {
  let packageJson;
  let lock;
  let installed;
  try {
    packageJson = JSON.parse(readFileSync(resolve(toolDirectory, "package.json"), "utf8"));
    lock = JSON.parse(readFileSync(resolve(toolDirectory, "package-lock.json"), "utf8"));
    installed = JSON.parse(readFileSync(
      resolve(toolDirectory, "node_modules/pg/package.json"),
      "utf8",
    ));
  } catch {
    throw new Error("direct-session pg installation missing or invalid; run the pinned isolated npm ci");
  }
  if (JSON.stringify(packageJson.dependencies) !== JSON.stringify({ pg: pinnedPgVersion })
      || lock.lockfileVersion !== 3
      || lock.packages?.[""]?.dependencies?.pg !== pinnedPgVersion
      || lock.packages?.["node_modules/pg"]?.version !== pinnedPgVersion
      || installed.version !== pinnedPgVersion) {
    throw new Error("direct-session pg installation drift; run the pinned isolated npm ci");
  }
  return pinnedPgVersion;
};

export const resolveDirectTarget = () => ({ ...expectedDirectTarget });

export const directWorkerArgs = (target, sqlPath, caFile) => [
  resolve(scriptDirectory, "execute-postgres-simple-query.mjs"),
  "--host", target.host,
  "--port", target.port,
  "--user", target.user,
  "--database", target.database,
  "--file", sqlPath,
  "--ca-file", caFile,
  "--operation", "rollback-dry-run",
];

const defaultRunDirectSession = ({ target, sqlPath, caFile, password, cwd }) => spawnSync(
  process.execPath,
  directWorkerArgs(target, sqlPath, caFile),
  {
    cwd,
    env: sanitizedDirectChildEnv(process.env),
    input: JSON.stringify({ password }),
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
    timeout: 240_000,
    killSignal: "SIGKILL",
  },
);

export const runProductionRollbackDryRun = async ({
  cwd = process.cwd(),
  runDirectSession = defaultRunDirectSession,
  directSessionCredentialApproved = false,
  directSessionPassword = process.env.SUPABASE_DB_PASSWORD,
  directSessionCaPath = process.env.SUPABASE_DB_CA_CERT_PATH,
} = {}) => {
  const plan = JSON.parse(readFileSync(
    resolve(cwd, "docs/feedback-intelligence/contracts/production-migration-plan-v0.1/plan.json"),
    "utf8",
  ));
  if (plan.execution_contract.application_data_access_approved !== true
      || plan.execution_contract.persistent_production_apply_approved !== false) {
    throw new Error("bounded data-read approval missing or persistent apply unexpectedly approved");
  }
  if (directSessionCredentialApproved !== true) {
    throw new Error("direct-session Production credential approval is required");
  }
  if (typeof directSessionPassword !== "string" || directSessionPassword.length < 8) {
    throw new Error("SUPABASE_DB_PASSWORD must be supplied ephemerally for the direct session");
  }
  if (typeof directSessionCaPath !== "string" || directSessionCaPath.length === 0) {
    throw new Error("SUPABASE_DB_CA_CERT_PATH must identify the pinned Supabase root certificate");
  }
  delete process.env.SUPABASE_DB_PASSWORD;
  delete process.env.SUPABASE_DB_CA_CERT_PATH;
  assertDirectToolInstalled();
  const directTarget = resolveDirectTarget();

  const { sql, summary } = await composeDryRunSql({ cwd });
  if (summary.application_data_access_approved !== true) {
    throw new Error("generated operator does not carry the bounded read approval");
  }

  const tempRoot = mkdtempSync(resolve(tmpdir(), "rewire-v11-production-dry-run-"));
  const historyPath = resolve(tempRoot, "migration-history.sql");
  const dryRunPath = resolve(tempRoot, "rollback-dry-run.sql");
  const postRollbackPath = resolve(tempRoot, "postrollback-audit.sql");
  writeFileSync(historyPath, `SELECT version::text AS remote\nFROM supabase_migrations.schema_migrations\nORDER BY version;\n`, { encoding: "utf8", mode: 0o600 });
  writeFileSync(dryRunPath, sql, { encoding: "utf8", mode: 0o600 });
  writeFileSync(postRollbackPath, freshPostRollbackAuditSql, { encoding: "utf8", mode: 0o600 });

  let observedVersions;
  let dryRunAttempted = false;
  let dryRunSucceeded = false;
  let dryRunEvidence;
  let postRollbackEvidence;
  let dryRunFailure = null;
  try {
    const history = runDirectSession({
      target: directTarget,
      sqlPath: historyPath,
      caFile: directSessionCaPath,
      password: directSessionPassword,
      cwd,
    });
    if (history.status !== 0) {
      throw sanitizedCliError("fresh remote migration preflight failed", history);
    }
    observedVersions = parseRemoteMigrationVersions(history.stdout);
    const expectedVersions = expectedRemoteMigrationVersions(cwd);
    if (JSON.stringify(observedVersions) !== JSON.stringify(expectedVersions)) {
      throw new Error("fresh remote migration inventory drift");
    }

    dryRunAttempted = true;
    const result = runDirectSession({
      target: directTarget,
      sqlPath: dryRunPath,
      caFile: directSessionCaPath,
      password: directSessionPassword,
      cwd,
    });
    if (result.status !== 0) {
      dryRunFailure = sanitizedCliError(
        "Production rollback dry-run query failed",
        result,
        byteLength(sql),
      );
    } else {
      dryRunEvidence = validateDryRunResult(result.stdout);
      dryRunSucceeded = true;
    }
  } finally {
    try {
      if (dryRunAttempted) {
        const audit = runDirectSession({
          target: directTarget,
          sqlPath: postRollbackPath,
          caFile: directSessionCaPath,
          password: directSessionPassword,
          cwd,
        });
        if (audit.status !== 0) {
          throw sanitizedCliError(
            "fresh postrollback metadata audit failed",
            audit,
            byteLength(freshPostRollbackAuditSql),
          );
        }
        postRollbackEvidence = validatePostRollbackResult(audit.stdout);
      }
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  }

  if (dryRunFailure) throw dryRunFailure;
  if (!dryRunSucceeded || !dryRunEvidence || !postRollbackEvidence) {
    throw new Error("Production rollback dry-run evidence incomplete");
  }

  return {
    status: "PASS_V1_1_PRODUCTION_ROLLBACK_DRY_RUN",
    project_ref: projectRef,
    remote_migration_count: observedVersions.length,
    remote_migration_inventory_sha256: sha256(`${observedVersions.join("\n")}\n`),
    generated_sql_sha256: summary.sql_sha256,
    transport: "direct_node_postgres_simple_protocol",
    credential_persisted_by_operator: false,
    dry_run_request_count: 1,
    postrollback_audit_request_count: 1,
    retry_count: 0,
    application_values_returned: false,
    persistent_mutation_detected: false,
  };
};

if (process.argv[1]?.endsWith("run-v1-1-production-rollback-dry-run.mjs")) {
  if (!process.argv.includes("--execute")) {
    throw new Error("Refusing to connect without explicit --execute");
  }
  if (!process.argv.includes("--direct-session-credential-approved")) {
    throw new Error("Refusing direct Production session without explicit credential approval");
  }
  const result = await runProductionRollbackDryRun({
    directSessionCredentialApproved: true,
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
