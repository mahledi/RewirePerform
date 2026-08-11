#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { composeDryRunSql, freshPostRollbackAuditSql } from "./generate-v1-1-production-rollback-dry-run.mjs";

const projectRef = "bqsbxesmybthwtxmowfz";
const remoteFloor = "20260801104717";
const cliVersion = "2.113.0";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const parseJson = (value, label) => {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${label}: CLI did not return valid JSON`);
  }
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
  const payload = parseJson(stdout, "dry-run");
  if (!Array.isArray(payload.rows) || payload.rows.length !== 1) {
    throw new Error("dry-run: expected exactly one sanitized status row");
  }
  const row = payload.rows[0];
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
  const payload = parseJson(stdout, "postrollback-audit");
  if (!Array.isArray(payload.rows) || payload.rows.length !== 1) {
    throw new Error("postrollback-audit: expected exactly one sanitized status row");
  }
  const row = payload.rows[0];
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

const defaultRunCli = (args, cwd) => spawnSync(
  "npx",
  ["--yes", `supabase@${cliVersion}`, ...args],
  { cwd, encoding: "utf8", maxBuffer: 32 * 1024 * 1024, timeout: 240_000 },
);

export const runProductionRollbackDryRun = async ({
  cwd = process.cwd(),
  linkedWorkdir,
  runCli = defaultRunCli,
} = {}) => {
  if (!linkedWorkdir) throw new Error("linked Supabase workdir is required");
  const linkedRef = readFileSync(resolve(linkedWorkdir, "supabase/.temp/project-ref"), "utf8").trim();
  if (linkedRef !== projectRef) throw new Error(`linked project drift: ${linkedRef}`);

  const plan = JSON.parse(readFileSync(
    resolve(cwd, "docs/feedback-intelligence/contracts/production-migration-plan-v0.1/plan.json"),
    "utf8",
  ));
  if (plan.execution_contract.application_data_access_approved !== true
      || plan.execution_contract.persistent_production_apply_approved !== false) {
    throw new Error("bounded data-read approval missing or persistent apply unexpectedly approved");
  }

  const history = runCli(["migration", "list", "--linked"], linkedWorkdir);
  if (history.status !== 0) throw new Error("fresh remote migration preflight failed");
  const observedVersions = parseJson(history.stdout, "migration-preflight").migrations
    ?.map(({ remote }) => remote);
  const expectedVersions = expectedRemoteMigrationVersions(cwd);
  if (JSON.stringify(observedVersions) !== JSON.stringify(expectedVersions)) {
    throw new Error("fresh remote migration inventory drift");
  }

  const { sql, summary } = await composeDryRunSql({ cwd });
  if (summary.application_data_access_approved !== true) {
    throw new Error("generated operator does not carry the bounded read approval");
  }

  const tempRoot = mkdtempSync(resolve(tmpdir(), "rewire-v11-production-dry-run-"));
  const dryRunPath = resolve(tempRoot, "rollback-dry-run.sql");
  const postRollbackPath = resolve(tempRoot, "postrollback-audit.sql");
  writeFileSync(dryRunPath, sql, { encoding: "utf8", mode: 0o600 });
  writeFileSync(postRollbackPath, freshPostRollbackAuditSql, { encoding: "utf8", mode: 0o600 });

  let dryRunAttempted = false;
  let dryRunSucceeded = false;
  let dryRunEvidence;
  let postRollbackEvidence;
  let dryRunFailure = null;
  try {
    dryRunAttempted = true;
    const result = runCli(
      ["db", "query", "--linked", "--output-format", "json", "--file", dryRunPath],
      linkedWorkdir,
    );
    if (result.status !== 0) {
      dryRunFailure = new Error("Production rollback dry-run query failed");
    } else {
      dryRunEvidence = validateDryRunResult(result.stdout);
      dryRunSucceeded = true;
    }
  } finally {
    try {
      if (dryRunAttempted) {
        const audit = runCli(
          ["db", "query", "--linked", "--output-format", "json", "--file", postRollbackPath],
          linkedWorkdir,
        );
        if (audit.status !== 0) {
          throw new Error("fresh postrollback metadata audit failed");
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
  const workdirIndex = process.argv.indexOf("--linked-workdir");
  const linkedWorkdir = workdirIndex >= 0 ? process.argv[workdirIndex + 1] : null;
  const result = await runProductionRollbackDryRun({ linkedWorkdir });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
