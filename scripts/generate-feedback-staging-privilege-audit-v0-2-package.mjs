#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const checkOnly = process.argv.includes("--check");
const base = "docs/feedback-intelligence/contracts/staging-privilege-audit-v0.2";
const manifestPath = `${base}/producer-package-manifest.json`;
const packageFiles = [
  `${base}/audit.sql`,
  `${base}/result.schema.json`,
  `${base}/predeploy.fixture.json`,
  `${base}/postdeploy-pass.fixture.json`,
  "scripts/validate-feedback-staging-privilege-audit-v0-2.mjs",
  "src/test/feedbackIntelligenceStagingPrivilegeAuditV02.test.ts",
  "docs/feedback-intelligence/STAGING_PRIVILEGE_AUDIT_HANDOFF_V0_2.md"
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
  schema_version: "rewireperform-feedback-intelligence-staging-privilege-audit-package-manifest-v2",
  contract_version: "0.2.0-draft",
  contract_status: "LOCAL_UNSIGNED_METADATA_ONLY_AWAITING_CONSUMER_REVIEW",
  generated_at: "2026-08-09T10:30:00+02:00",
  producer_branch: "codex/feedback-intelligence-v1-1-20260805",
  producer_source_commit: "cbecd9066a1004ddb284ddcad3ae443d73b85451",
  target_project_ref: "zbeswjipayspgvcipzmx",
  package_signed: false,
  package_sha256: sha256(digestInput.join("")),
  files,
  executed_data_path_pins: {
    gateway: {
      signature: "public.read_feedback_intelligence_v0_2_draft(text,text,text,text)",
      definition_sha256: "0d617fcb5e5a7ece31ca94b7ff0cf07026712b0d9ed4206c95bee9f4b198a8af",
    },
    internal_export: {
      signature: "feedback_analysis.export_feedback_intelligence_v0_2_internal(text,text,text,text)",
      definition_sha256: "89420ddf3f79ad57538f4fb1ad56458717874490ddbc88b52d577e081d3e872f",
    },
  },
  upstream_gateway_pins: {
    producer_commit: "cbecd9066a1004ddb284ddcad3ae443d73b85451",
    manifest_sha256: "97b4caf3109650be74963587c1340ddd699e0aa80b6acf587da79cfdf0ed001d",
    package_sha256: "15c85f345592c7df3b0c700134ff5ab2c6b7b86b3ea64e4a7088168a488dbbbb",
    consumer_branch: "agent/feedback-intelligence-machine-gateway-v0-1-20260807",
    consumer_commit: "ec197d6bcfb32e02596024f61d0fa2e0011fb871",
    consumer_acceptance: "PENDING_CURRENT_PACKAGE_REVIEW",
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
    synthetic_network_read: false,
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
    status: "FEEDBACK_STAGING_PRIVILEGE_AUDIT_V02_PACKAGE_VERIFIED_NOT_EXECUTED",
    manifest_sha256: sha256(current),
    package_sha256: manifest.package_sha256,
    files: files.length,
    metadata_only: manifest.scope.catalog_metadata_only,
    consumer_review_pending: true,
    all_external_mutations_closed: Object.entries(manifest.scope)
      .filter(([key]) => key !== "catalog_metadata_only")
      .every(([, value]) => value === false)
  }, null, 2));
} else {
  await writeFile(resolve(root, manifestPath), serialized, "utf8");
  console.log(`${manifestPath} written`);
}
