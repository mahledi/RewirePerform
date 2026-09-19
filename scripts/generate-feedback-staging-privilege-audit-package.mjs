#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const checkOnly = process.argv.includes("--check");
const base = "docs/feedback-intelligence/contracts/staging-privilege-audit-v0.1";
const manifestPath = `${base}/producer-package-manifest.json`;
const packageFiles = [
  `${base}/audit.sql`,
  `${base}/result.schema.json`,
  `${base}/predeploy.fixture.json`,
  `${base}/postdeploy-pass.fixture.json`,
  "scripts/validate-feedback-staging-privilege-audit.mjs",
  "src/test/feedbackIntelligenceStagingPrivilegeAudit.test.ts",
  "docs/feedback-intelligence/STAGING_PRIVILEGE_AUDIT_HANDOFF_V0_1.md"
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const files = [];
const digestInput = [];

for (const path of packageFiles) {
  const bytes = await readFile(resolve(root, path));
  const digest = sha256(bytes);
  files.push({ path, sha256: digest });
  digestInput.push(`${digest}  ${path}\n`);
}

const manifest = {
  schema_version: "rewireperform-feedback-intelligence-staging-privilege-audit-package-manifest-v1",
  contract_version: "0.1.0-draft",
  contract_status: "LOCAL_UNSIGNED_METADATA_ONLY_NOT_ACTIVATED",
  generated_at: "2026-08-08T10:00:00+02:00",
  producer_branch: "codex/feedback-intelligence-v1-1-20260805",
  producer_base_commit: "b35bfc89aa5c5781fb0b300440bb8cbb56f69658",
  target_project_ref: "zbeswjipayspgvcipzmx",
  package_signed: false,
  package_sha256: sha256(digestInput.join("")),
  files,
  upstream_gateway_pins: {
    producer_commit: "b35bfc89aa5c5781fb0b300440bb8cbb56f69658",
    manifest_sha256: "4c53990d8f1c751a2d2d9d5820abf0c418cf38c47cd59ecdbc90501d75e28d07",
    package_sha256: "5f89b849bb148f0d02b4bdafbb0b072bcec5087a02614856f011133b6f13a8d3",
    consumer_commit: "75b0cbc7ef2179b26cfff7db9817770f9ed2a3ea"
  },
  scope: {
    catalog_metadata_only: true,
    application_rows: false,
    application_function_calls: false,
    mutations: false,
    credentials: false,
    signing: false,
    migration: false,
    edge_deployment: false,
    production: false
  }
};
const serialized = `${JSON.stringify(manifest, null, 2)}\n`;

if (checkOnly) {
  const current = await readFile(resolve(root, manifestPath), "utf8");
  if (current !== serialized) {
    console.error(`${manifestPath}: generated manifest drift`);
    process.exit(1);
  }
  console.log(JSON.stringify({
    status: "FEEDBACK_STAGING_PRIVILEGE_AUDIT_PACKAGE_VERIFIED_NOT_EXECUTED",
    manifest_sha256: sha256(current),
    package_sha256: manifest.package_sha256,
    files: files.length,
    metadata_only: manifest.scope.catalog_metadata_only,
    all_external_mutations_closed: Object.entries(manifest.scope)
      .filter(([key]) => key !== "catalog_metadata_only")
      .every(([, value]) => value === false)
  }, null, 2));
} else {
  await writeFile(resolve(root, manifestPath), serialized, "utf8");
  console.log(`${manifestPath} written`);
}
