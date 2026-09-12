#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const checkOnly = process.argv.includes("--check");
const base = "docs/feedback-intelligence/contracts/production-machine-gateway-v0.1";
const manifestPath = `${base}/producer-package-manifest.json`;
const packageFiles = [
  "docs/feedback-intelligence/contracts/v0.2.1/proposed-export.schema.json",
  "docs/feedback-intelligence/contracts/v0.2.1/producer-package-manifest.json",
  "docs/feedback-intelligence/contracts/v0.3/producer-package-manifest.json",
  `${base}/request.schema.json`,
  `${base}/gateway-contract.json`,
  "docs/feedback-intelligence/contracts/machine-gateway-v0.1/error.schema.json",
  "supabase/migrations/20260811071836_feedback_intelligence_production_gateway_v0_1.sql",
  "supabase/functions/_shared/boundedRequestBody.ts",
  "supabase/functions/_shared/feedbackIntelligenceGatewayHttp.ts",
  "supabase/functions/_shared/feedbackIntelligenceMachineAuthCore.ts",
  "supabase/functions/_shared/feedbackIntelligenceProductionMachineAuth.ts",
  "supabase/functions/_shared/feedbackIntelligenceProductionDatabase.ts",
  "supabase/functions/mahleos-feedback-intelligence-production-read/index.ts",
  "src/test/feedbackIntelligenceProductionGateway.test.ts",
  "docs/feedback-intelligence/PRODUCTION_MACHINE_GATEWAY_HANDOFF_V0_1.md",
  "scripts/generate-feedback-production-gateway-package.mjs"
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
  schema_version: "rewireperform-feedback-intelligence-production-gateway-package-v1",
  contract_version: "0.1.0-draft",
  contract_status: "LOCAL_PREPARED_UNSIGNED_NOT_ACTIVATED",
  generated_at: "2026-08-11T09:30:00+02:00",
  package_signed: false,
  package_status: "LOCAL_UNSIGNED_AWAITING_INDEPENDENT_REVIEW",
  digest_algorithm: "sha256",
  package_digest_algorithm:
    "sha256 over exact file digest lines in manifest order with two spaces and relative path",
  package_sha256: sha256(digestInput.join("")),
  files,
  upstream_pins: {
    endpoint: "/functions/v1/mahleos-feedback-intelligence-production-read",
    role: "mahleos_feedback_production_reader",
    rpc: "feedback_machine_production.read_feedback_intelligence_production_v0_2_draft(text,text,text,text)",
    export_contract_version: "0.2.1-draft",
    export_manifest_sha256: "89298e177f65a7f517e9cc930c0dc9e0af588875117bf4449e7898200e31dfab",
    export_package_sha256: "8c1bd5807865c41c7572ddd47872bca355515f99a4f7ef1f17a017d1bd35794b",
    export_schema_sha256: "e90eb3fc2ce717ef91ae35bcfcd5bc7944d3cc941faa8f071b42e934e967023d",
    semantics_contract_version: "0.3.3-draft",
    semantics_manifest_sha256: "eccdf05956b68d457d3fc2135e3984d2b56242e4742fc3379152587bc5e7c33f",
    semantics_package_sha256: "c5df75dd0ddbf717b039e1c809d9e06b06219b7e55e1d4384886a07496e210d5",
    semantics_catalog_sha256: "f8a15bedd179c2f6dc4176a8296437e87b175d6e5747d8faa187154b8eee9c4a",
    question_count: 55
  },
  activation: {
    collection_enabled: false,
    production_gateway_deployed: false,
    reader_password_provisioned: false,
    machine_key_provisioned: false,
    edge_machine_gate_open: false,
    edge_real_data_gate_open: false,
    database_consumer_pin_ready: false,
    database_production_export_enabled: false,
    privacy_notice_ready: false,
    app_store_declaration_ready: false,
    minor_policy_ready: false,
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
    status: "PRODUCTION_GATEWAY_PACKAGE_VERIFIED_NOT_ACTIVATED",
    manifest_sha256: sha256(current),
    package_sha256: manifest.package_sha256,
    files: files.length,
    activation_gates_closed: Object.values(manifest.activation).every((value) => value === false)
  }, null, 2));
} else {
  await writeFile(resolve(root, manifestPath), serialized, "utf8");
  console.log(`${manifestPath} written`);
}
