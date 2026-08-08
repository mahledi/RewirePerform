#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const checkOnly = process.argv.includes("--check");
const base = "docs/feedback-intelligence/contracts/staging-privilege-audit-v0.1";
const resultPath = `${base}/remote-staging-result-2026-08-08.json`;
const auditPath = `${base}/audit.sql`;
const auditManifestPath = `${base}/producer-package-manifest.json`;
const resultManifestPath = `${base}/remote-result-manifest.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const resultBytes = await readFile(resolve(root, resultPath));
const auditBytes = await readFile(resolve(root, auditPath));
const auditManifestBytes = await readFile(resolve(root, auditManifestPath));
const auditManifest = JSON.parse(auditManifestBytes.toString("utf8"));
const result = JSON.parse(resultBytes.toString("utf8"));

const manifest = {
  schema_version: "rewireperform-feedback-intelligence-staging-privilege-audit-remote-result-manifest-v1",
  contract_status: "REMOTE_METADATA_ONLY_PREDEPLOY_BASELINE_UNSIGNED",
  target_project_ref: "zbeswjipayspgvcipzmx",
  executed_at: result.executed_at,
  audit_phase: result.audit_phase,
  result_sha256: sha256(resultBytes),
  audit_sql_sha256: sha256(auditBytes),
  audit_package_manifest_sha256: sha256(auditManifestBytes),
  audit_package_sha256: auditManifest.package_sha256,
  upstream_gateway: {
    producer_commit: "b35bfc89aa5c5781fb0b300440bb8cbb56f69658",
    consumer_commit: "75b0cbc7ef2179b26cfff7db9817770f9ed2a3ea"
  },
  sanitized_evidence: true,
  application_rows_read: false,
  database_mutated: false,
  postdeploy_assurance_complete: false,
  signed_release_pair_complete: false,
  production_approved: false
};
const serialized = `${JSON.stringify(manifest, null, 2)}\n`;

if (checkOnly) {
  const current = await readFile(resolve(root, resultManifestPath), "utf8");
  if (current !== serialized) {
    console.error(`${resultManifestPath}: generated manifest drift`);
    process.exit(1);
  }
  console.log(JSON.stringify({
    status: "REMOTE_STAGING_PREDEPLOY_BASELINE_RESULT_VERIFIED_UNSIGNED",
    result_manifest_sha256: sha256(current),
    result_sha256: manifest.result_sha256,
    audit_sql_sha256: manifest.audit_sql_sha256,
    postdeploy_assurance_complete: false
  }, null, 2));
} else {
  await writeFile(resolve(root, resultManifestPath), serialized, "utf8");
  console.log(`${resultManifestPath} written`);
}
