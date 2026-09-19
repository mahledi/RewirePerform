#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const checkOnly = process.argv.includes("--check");
const base = "docs/feedback-intelligence/contracts/structured-production-gateway-v1.2";
const manifestPath = `${base}/producer-package-manifest.json`;
const packageFiles = [
  "docs/feedback-intelligence/contracts/v1.2.0-structured-only-draft/structured-export.schema.json",
  "docs/feedback-intelligence/contracts/v1.2.0-structured-only-draft/consumer-contract.json",
  "docs/feedback-intelligence/contracts/v1.2.0-structured-only-draft/jarvis-consumer-package-pin.json",
  `${base}/request.schema.json`,
  `${base}/gateway-contract.json`,
  "supabase/migrations/20260824121000_feedback_jarvis_structured_only_v1_2.sql",
  "supabase/migrations/20260824143000_feedback_machine_reader_net_privilege_hardening_v1_2.sql",
  "supabase/migrations/20260824150000_feedback_jarvis_structured_contract_v1_2.sql",
  "supabase/functions/_shared/boundedRequestBody.ts",
  "supabase/functions/_shared/feedbackIntelligenceGatewayHttp.ts",
  "supabase/functions/_shared/feedbackIntelligenceMachineAuthCore.ts",
  "supabase/functions/_shared/feedbackIntelligenceProductionMachineAuth.ts",
  "supabase/functions/_shared/feedbackIntelligenceProductionDatabase.ts",
  "supabase/functions/mahleos-feedback-structured-production-read/index.ts",
  "src/test/feedbackJarvisStructuredContractV12.test.ts",
  "src/test/feedbackMachineReaderNetPrivilegeHardeningV12.test.ts",
  "scripts/generate-feedback-structured-production-gateway-v1-2-package.mjs"
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
  schema_version: "rewireperform-feedback-structured-production-package-v1.2.0-draft",
  contract_version: "1.2.0-structured-only-draft",
  package_status: "LOCAL_PREPARED_NOT_ACTIVATED",
  package_sha256: sha256(digestInput.join("")),
  files,
  pins: {
    endpoint: "/functions/v1/mahleos-feedback-structured-production-read",
    rpc: "feedback_machine_production.read_feedback_intelligence_production_structured_v1_2(text,text,text,text)",
    schema_sha256: "1aa3b1ed3a56722c0b496b8dfc4a661bc364df4cec3bb838f41715e7b8570cff",
    jarvis_commit: "ef1b7ce40d09894ccb0fb8fa8d3b03784f6f9979",
    jarvis_consumer_manifest_sha256: "788d9bb1c6d66473abad9f8be1ad53e2e1535da6f8ad45c67d16d2745418f541",
    jarvis_consumer_package_sha256: "3c5925eb341a9f827ff93ec4fc3c0c0bb71519ecf8dcc0076ef4636b988a5543"
  },
  activation: {
    migration_applied: false,
    edge_deployed: false,
    credentials_ready: false,
    runtime_gates_open: false,
    production_read_performed: false
  }
};
const serialized = `${JSON.stringify(manifest, null, 2)}\n`;

if (checkOnly) {
  const current = await readFile(resolve(root, manifestPath), "utf8");
  if (current !== serialized) throw new Error(`${manifestPath}: generated manifest drift`);
  if (!Object.values(manifest.activation).every((value) => value === false)) {
    throw new Error("Structured Production gateway unexpectedly activated");
  }
  console.log(JSON.stringify({
    status: "STRUCTURED_PRODUCTION_GATEWAY_VERIFIED_NOT_ACTIVATED",
    package_sha256: manifest.package_sha256,
    files: files.length
  }, null, 2));
} else {
  await writeFile(resolve(root, manifestPath), serialized, "utf8");
  console.log(`${manifestPath} written`);
}
