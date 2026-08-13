#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { composeActivationPostrollbackAuditSql, composeActivationSmokeSql } from "./feedback-v1-1-activation-smoke-sql.mjs";
import { assertDirectToolInstalled, resolveDirectTarget, sanitizedDirectChildEnv } from "./run-v1-1-production-rollback-dry-run.mjs";

const root = process.cwd();
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const planPath = "docs/feedback-intelligence/contracts/production-activation-synthetic-smoke-v0.1/activation-smoke-plan.json";
const manifestPath = "docs/feedback-intelligence/contracts/production-activation-synthetic-smoke-v0.1/producer-package-manifest.json";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
export const localOnlyTestLegalReference = "legal-review-de-feedback-v1.1:local-contract-input-not-production-authorization";

const validLegalReference = (value) => typeof value === "string"
  && /^legal-review-de-feedback-v1\.1:[A-Za-z0-9][A-Za-z0-9._/-]{15,159}$/u.test(value)
  && !/(draft|pending|unreviewed|synthetic|test|fixture|local-contract)/iu.test(value);

const assertPackageBytes = ({ cwd, manifest }) => {
  const seen = new Set();
  const digestInput = [];
  for (const entry of manifest.files ?? []) {
    if (typeof entry?.path !== "string" || entry.path.startsWith("/") || entry.path.split("/").includes("..")
        || typeof entry.sha256 !== "string" || !/^[a-f0-9]{64}$/u.test(entry.sha256) || seen.has(entry.path)) {
      throw new Error("activation smoke package inventory drift");
    }
    seen.add(entry.path);
    const actual = sha256(readFileSync(resolve(cwd, entry.path)));
    if (actual !== entry.sha256) throw new Error(`activation smoke package byte drift: ${entry.path}`);
    digestInput.push(`${actual}  ${entry.path}\n`);
  }
  if (seen.size === 0 || sha256(digestInput.join("")) !== manifest.package_sha256) {
    throw new Error("activation smoke package SHA-256 drift");
  }
};

const parseOneStatus = (stdout, key, expected) => {
  let rows;
  try { rows = JSON.parse(stdout); } catch { throw new Error(`${key}: invalid JSON`); }
  if (!Array.isArray(rows) || rows.length !== 1 || JSON.stringify(Object.keys(rows[0])) !== JSON.stringify([key])
      || JSON.stringify(rows[0][key]) !== JSON.stringify(expected)) throw new Error(`${key}: status drift`);
};

export const activationSmokeWorkerArgs = (target, sqlPath, caFile, operation) => [
  resolve(scriptDirectory, "execute-feedback-v1-1-activation-smoke-query.mjs"),
  "--host", target.host, "--port", target.port, "--user", target.user, "--database", target.database,
  "--file", sqlPath, "--ca-file", caFile, "--operation", operation,
];

const defaultRunDirectSession = ({ target, sqlPath, caFile, password, operation, cwd }) => spawnSync(
  process.execPath, activationSmokeWorkerArgs(target, sqlPath, caFile, operation), {
    cwd, env: sanitizedDirectChildEnv(), input: JSON.stringify({ password }), encoding: "utf8",
    maxBuffer: 1024 * 1024, timeout: 240_000, killSignal: "SIGKILL",
  },
);

export const runFeedbackActivationSyntheticSmoke = ({
  cwd = root,
  legalReference,
  productionActivationApproved = false,
  productionCredentialApproved = false,
  syntheticSmokeApproved = false,
  directSessionPassword = process.env.SUPABASE_DB_PASSWORD,
  directSessionCaPath = process.env.SUPABASE_DB_CA_CERT_PATH,
  runDirectSession = defaultRunDirectSession,
} = {}) => {
  if (!validLegalReference(legalReference) || legalReference === localOnlyTestLegalReference) {
    throw new Error("qualified external legal-review reference required");
  }
  if (productionActivationApproved !== true) throw new Error("Production activation approval required");
  if (productionCredentialApproved !== true) throw new Error("Production credential approval required");
  if (syntheticSmokeApproved !== true) throw new Error("Production synthetic-smoke approval required");
  if (typeof directSessionPassword !== "string" || directSessionPassword.length < 8) throw new Error("ephemeral Production database password required");
  if (typeof directSessionCaPath !== "string" || directSessionCaPath.length === 0) throw new Error("pinned Production CA path required");
  delete process.env.SUPABASE_DB_PASSWORD;
  delete process.env.SUPABASE_DB_CA_CERT_PATH;
  assertDirectToolInstalled();
  const plan = JSON.parse(readFileSync(resolve(cwd, planPath), "utf8"));
  const manifest = JSON.parse(readFileSync(resolve(cwd, manifestPath), "utf8"));
  if (Object.values(plan.external_gates).some((value) => value !== false)
      || Object.values(manifest.external_gates).some((value) => value !== false)) {
    throw new Error("repository activation smoke gates must remain closed");
  }
  assertPackageBytes({ cwd, manifest });
  const target = resolveDirectTarget();
  const tempRoot = mkdtempSync(resolve(tmpdir(), "rewire-feedback-v11-activation-smoke-"));
  const smokePath = resolve(tempRoot, "activation-smoke.sql");
  const auditPath = resolve(tempRoot, "postrollback-audit.sql");
  writeFileSync(smokePath, composeActivationSmokeSql({ legalReference }), { mode: 0o600 });
  writeFileSync(auditPath, composeActivationPostrollbackAuditSql(), { mode: 0o600 });
  let smokeResult;
  let auditResult;
  try {
    smokeResult = runDirectSession({ target, sqlPath: smokePath, caFile: directSessionCaPath,
      password: directSessionPassword, operation: "activation-smoke", cwd });
  } finally {
    auditResult = runDirectSession({ target, sqlPath: auditPath, caFile: directSessionCaPath,
      password: directSessionPassword, operation: "activation-postrollback-audit", cwd });
    rmSync(tempRoot, { recursive: true, force: true });
  }
  if (auditResult.status !== 0) throw new Error("fresh activation-smoke postrollback audit failed");
  parseOneStatus(auditResult.stdout, "feedback_v1_1_postrollback_status", {
    status: "PASS_FEEDBACK_V1_1_SYNTHETIC_SMOKE_POSTROLLBACK", fixture_rows: 0,
    runtime_gates_open: false, application_values_returned: false,
  });
  if (smokeResult.status !== 0) throw new Error("Production activation synthetic smoke failed and was rolled back");
  parseOneStatus(smokeResult.stdout, "feedback_v1_1_smoke_status", {
    status: "PASS_FEEDBACK_V1_1_SYNTHETIC_SMOKE_ROLLED_BACK", scenario_count: 8,
    application_values_returned: false, legal_reference_returned: false,
  });
  return { status: "PASS_FEEDBACK_V1_1_SYNTHETIC_SMOKE_AND_POSTROLLBACK", request_count: 2,
    smoke_request_count: 1, postrollback_audit_request_count: 1, retry_count: 0,
    application_values_returned: false, legal_reference_returned: false };
};

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const value = (name) => { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; };
  try {
    const result = runFeedbackActivationSyntheticSmoke({
      legalReference: value("--legal-reference"),
      productionActivationApproved: process.argv.includes("--production-activation-approved"),
      productionCredentialApproved: process.argv.includes("--production-credential-approved"),
      syntheticSmokeApproved: process.argv.includes("--synthetic-smoke-approved"),
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({ status: "FAIL_CLOSED", message: error.message,
      raw_output_persisted: false, legal_reference_persisted: false })}\n`);
    process.exitCode = 1;
  }
}
