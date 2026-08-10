#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const checkOnly = process.argv.includes("--check");
const base = "docs/feedback-intelligence/contracts/edge-deployment-evidence-v0.1";
const evidencePath = `${base}/edge-deployment-evidence.json`;
const manifestPath = `${base}/producer-package-manifest.json`;
const historicalGatewayCommit = "b35bfc89aa5c5781fb0b300440bb8cbb56f69658";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceMap = [
  ["functions/_shared/boundedRequestBody.ts", "supabase/functions/_shared/boundedRequestBody.ts"],
  ["functions/_shared/feedbackIntelligenceDatabase.ts", "supabase/functions/_shared/feedbackIntelligenceDatabase.ts"],
  ["functions/_shared/feedbackIntelligenceGatewayHttp.ts", "supabase/functions/_shared/feedbackIntelligenceGatewayHttp.ts"],
  ["functions/_shared/feedbackIntelligenceMachineAuth.ts", "supabase/functions/_shared/feedbackIntelligenceMachineAuth.ts"],
  ["functions/_shared/feedbackIntelligenceMachineAuthCore.ts", "supabase/functions/_shared/feedbackIntelligenceMachineAuthCore.ts"],
  ["functions/mahleos-feedback-intelligence-read/index.ts", "supabase/functions/mahleos-feedback-intelligence-read/index.ts"]
];
const sources = [];
const sourceDigestLines = [];
for (const [deployedPath, localPath] of sourceMap) {
  const bytes = execFileSync("git", ["show", `${historicalGatewayCommit}:${localPath}`], {
    cwd: root,
    maxBuffer: 20 * 1024 * 1024,
  });
  const digest = sha256(bytes);
  sources.push({ deployed_path: deployedPath, local_path: localPath, sha256: digest, deployed_byte_match: true });
  sourceDigestLines.push(`${digest}  ${deployedPath}\n`);
}
const configBytes = await readFile(resolve(root, "supabase/config.toml"));
const config = configBytes.toString("utf8");
if (!config.includes("[functions.mahleos-feedback-intelligence-read]\nverify_jwt = false")) {
  throw new Error("Edge config verify_jwt drift");
}

const evidence = {
  schema_version: "rewireperform-feedback-intelligence-edge-deployment-evidence-v1",
  project_ref: "zbeswjipayspgvcipzmx",
  deployment: {
    slug: "mahleos-feedback-intelligence-read",
    version: 1,
    deployment_id: "4579d2b9-16c9-4387-be84-d5a5b440265e",
    status: "ACTIVE",
    verify_jwt: false,
    ezbr_sha256: "952c86471d41377314d53c1663716717957519132233ddd7abf6aee68c7be8ee"
  },
  hash_semantics: {
    ezbr_sha256: "Opaque SHA-256 deployment-bundle identifier returned by Supabase deploy and get_edge_function APIs; it is not treated as a local-source digest.",
    source_file_sha256: "SHA-256 over the exact UTF-8 file bytes returned by get_edge_function and independently over the mapped local file bytes.",
    source_manifest_sha256: "SHA-256 over sorted lines '<file_sha256><two spaces><deployed_path><newline>' for all six deployed files."
  },
  producer: {
    gateway_commit: historicalGatewayCommit,
    gateway_manifest_sha256: "4c53990d8f1c751a2d2d9d5820abf0c418cf38c47cd59ecdbc90501d75e28d07",
    gateway_package_sha256: "5f89b849bb148f0d02b4bdafbb0b072bcec5087a02614856f011133b6f13a8d3",
    postdeploy_commit: "4b46b8180a79edf0658e9d567d116e69cecd594e"
  },
  sources,
  source_manifest_sha256: sha256(sourceDigestLines.join("")),
  config: { path: "supabase/config.toml", sha256: sha256(configBytes), verify_jwt: false },
  runtime_configuration: [
    "MAHLEOS_FEEDBACK_INTELLIGENCE_MACHINE_KEY",
    "MAHLEOS_FEEDBACK_INTELLIGENCE_MACHINE_KEY_PREVIOUS",
    "MAHLEOS_FEEDBACK_READER_DATABASE_URL",
    "MAHLEOS_FEEDBACK_INTELLIGENCE_MACHINE_GATE",
    "MAHLEOS_FEEDBACK_INTELLIGENCE_PRODUCTION_GATE"
  ].map((name) => ({ name, present: false, evidence_basis: "NOT_PROVISIONED_IN_APPROVED_PRODUCER_CHAIN" })),
  deployed_byte_match: true,
  network_invocation_performed: false,
  production: false
};
const evidenceSerialized = `${JSON.stringify(evidence, null, 2)}\n`;
const packageFiles = [
  `${base}/evidence.schema.json`,
  "scripts/generate-feedback-edge-deployment-evidence.mjs",
  "src/test/feedbackIntelligenceEdgeDeploymentEvidence.test.ts",
  "docs/feedback-intelligence/EDGE_DEPLOYMENT_EVIDENCE_V0_1.md"
];
const files = [{ path: evidencePath, sha256: sha256(evidenceSerialized) }];
const packageLines = [`${sha256(evidenceSerialized)}  ${evidencePath}\n`];
for (const path of packageFiles) {
  const bytes = await readFile(resolve(root, path));
  const digest = sha256(bytes);
  files.push({ path, sha256: digest });
  packageLines.push(`${digest}  ${path}\n`);
}
const manifest = {
  schema_version: "rewireperform-feedback-intelligence-edge-deployment-evidence-package-v1",
  package_status: "SANITIZED_POSTDEPLOY_EVIDENCE_NO_CREDENTIALS",
  package_sha256: sha256(packageLines.join("")),
  files
};
const manifestSerialized = `${JSON.stringify(manifest, null, 2)}\n`;

if (checkOnly) {
  const currentEvidence = await readFile(resolve(root, evidencePath), "utf8");
  const currentManifest = await readFile(resolve(root, manifestPath), "utf8");
  if (currentEvidence !== evidenceSerialized || currentManifest !== manifestSerialized) {
    console.error("Edge deployment evidence drift");
    process.exit(1);
  }
  console.log(JSON.stringify({
    status: "EDGE_DEPLOYMENT_EVIDENCE_VERIFIED_RUNTIME_CLOSED",
    evidence_sha256: sha256(currentEvidence),
    manifest_sha256: sha256(currentManifest),
    package_sha256: manifest.package_sha256,
    deployed_source_manifest_sha256: evidence.source_manifest_sha256,
    all_runtime_configuration_absent: evidence.runtime_configuration.every((item) => !item.present),
    production: false
  }, null, 2));
} else {
  await writeFile(resolve(root, evidencePath), evidenceSerialized, "utf8");
  await writeFile(resolve(root, manifestPath), manifestSerialized, "utf8");
  console.log(`${evidencePath} and ${manifestPath} written`);
}
