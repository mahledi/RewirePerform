#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const checkOnly = process.argv.includes("--check");
const manifestPath = "docs/feedback-intelligence/contracts/machine-gateway-v0.1/producer-package-manifest.json";
const packageFiles = [
  "docs/feedback-intelligence/contracts/v0.2/proposed-export.schema.json",
  "docs/feedback-intelligence/contracts/v0.3/producer-package-manifest.json",
  "docs/feedback-intelligence/contracts/machine-gateway-v0.1/request.schema.json",
  "docs/feedback-intelligence/contracts/machine-gateway-v0.1/error.schema.json",
  "docs/feedback-intelligence/contracts/machine-gateway-v0.1/gateway-contract.json",
  "supabase/migrations/20260807090000_feedback_intelligence_machine_gateway_v0_1.sql",
  "supabase/functions/_shared/boundedRequestBody.ts",
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
  producer_base_commit: "088aea294edbbfeaf76638cd21bb6b48fc95a653",
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
    export_schema_sha256: "fb1ef751bc4701a497f224bb421220e08b3387eba5c2eaec9e91e2cbf474b4e9",
    semantics_manifest_sha256: "6e54438f5bddadd7e31423d76414d8e8cbde005e8cf552ee5708e328397db12e",
    semantics_package_sha256: "81247edb1c42c25884505b4af3a2e25d5521a4bad3e838d0e783e87e17017c12",
    semantics_catalog_sha256: "d0343c14ef9f17239ac7d01545b146acc8290c1abe451e28218a5f134d563b2d",
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
