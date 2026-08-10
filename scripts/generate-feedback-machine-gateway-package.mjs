#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const checkOnly = process.argv.includes("--check");
const manifestPath = "docs/feedback-intelligence/contracts/machine-gateway-v0.1/producer-package-manifest.json";
const packageFiles = [
  "docs/feedback-intelligence/contracts/v0.2.1/proposed-export.schema.json",
  "docs/feedback-intelligence/contracts/v0.2.1/producer-package-manifest.json",
  "docs/feedback-intelligence/contracts/v0.3/producer-package-manifest.json",
  "docs/feedback-intelligence/contracts/machine-gateway-v0.1/request.schema.json",
  "docs/feedback-intelligence/contracts/machine-gateway-v0.1/error.schema.json",
  "docs/feedback-intelligence/contracts/machine-gateway-v0.1/gateway-contract.json",
  "supabase/migrations/20260807090000_feedback_intelligence_machine_gateway_v0_1.sql",
  "supabase/migrations/20260809093000_feedback_intelligence_declined_consent_export_remediation.sql",
  "supabase/functions/_shared/boundedRequestBody.ts",
  "supabase/functions/_shared/feedbackIntelligenceGatewayHttp.ts",
  "supabase/functions/_shared/feedbackIntelligenceMachineAuthCore.ts",
  "supabase/functions/_shared/feedbackIntelligenceMachineAuth.ts",
  "supabase/functions/_shared/feedbackIntelligenceDatabase.ts",
  "supabase/functions/mahleos-feedback-intelligence-read/index.ts",
  "src/test/feedbackIntelligenceMachineAuth.test.ts",
  "src/test/feedbackIntelligenceMachineGateway.test.ts",
  "scripts/verify-feedback-intelligence-sql.mjs",
  "docs/feedback-intelligence/MACHINE_GATEWAY_HANDOFF_V0_1_DRAFT.md"
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
  schema_version: "rewireperform-feedback-intelligence-machine-gateway-package-manifest-v1",
  contract_version: "0.1.0-draft",
  contract_status: "PRODUCER_PREPARED_UNSIGNED_NOT_ACTIVATED",
  generated_at: "2026-08-07T11:30:00+02:00",
  producer_branch: "codex/feedback-intelligence-v1-1-20260805",
  producer_base_commit: "731db19c407f1849556bff8e8ae1b3aadf905a50",
  package_signed: false,
  package_status: "LOCAL_UNSIGNED_AWAITING_CONSUMER_REVIEW",
  digest_algorithm: "sha256",
  package_digest_algorithm:
    "sha256 over the exact UTF-8 output of shasum -a 256 for files in manifest order, including two spaces and each relative path",
  package_sha256: sha256(digestInput.join("")),
  files,
  upstream_pins: {
    endpoint: "/functions/v1/mahleos-feedback-intelligence-read",
    role: "mahleos_feedback_reader",
    rpc: "public.read_feedback_intelligence_v0_2_draft(text,text,text,text)",
    export_contract_version: "0.2.1-draft",
    export_producer_commit: "1eb9de1960213878fc4186f76aca0bd59b2c99c9",
    export_manifest_sha256: "89298e177f65a7f517e9cc930c0dc9e0af588875117bf4449e7898200e31dfab",
    export_package_sha256: "8c1bd5807865c41c7572ddd47872bca355515f99a4f7ef1f17a017d1bd35794b",
    export_schema_sha256: "e90eb3fc2ce717ef91ae35bcfcd5bc7944d3cc941faa8f071b42e934e967023d",
    semantics_contract_version: "0.3.2-draft",
    semantics_producer_commit: "1975f767a61a0f481247aa1a5138846b5e2addb8",
    semantics_manifest_sha256: "cb5d8df3a20903e08f874294f14d149f4e6615f26381e6118d4f5dd4e74f34df",
    semantics_package_sha256: "f38ae254af315eb6656edaddf7c196870f40b536c39817abc0a26123395de363",
    semantics_catalog_sha256: "aeea5f6a68b3bc4532328331130d2f07af8302f7c7cc4b80c04bbac9e3fc1e20",
    question_count: 55
  },
  activation: {
    collection_enabled: false,
    machine_gateway_deployed: false,
    reader_password_provisioned: false,
    machine_key_provisioned: false,
    edge_runtime_gate_open: false,
    database_consumer_pin_ready: false,
    database_synthetic_export_enabled: false,
    synthetic_network_read_approved: false,
    production_export_enabled: false,
    real_data_read_enabled: false
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
    status: "FEEDBACK_MACHINE_GATEWAY_PACKAGE_VERIFIED_NOT_ACTIVATED",
    manifest_sha256: sha256(current),
    package_sha256: manifest.package_sha256,
    files: files.length,
    activation_gates_closed: Object.values(manifest.activation).every((value) => value === false)
  }, null, 2));
} else {
  await writeFile(resolve(root, manifestPath), serialized, "utf8");
  console.log(`${manifestPath} written`);
}
