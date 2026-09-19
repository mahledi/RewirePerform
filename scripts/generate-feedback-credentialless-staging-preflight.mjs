#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const checkOnly = process.argv.includes("--check");
const base = "docs/feedback-intelligence/contracts/credentialless-staging-preflight-v0.1";
const evidencePath = `${base}/preflight-evidence.json`;
const manifestPath = `${base}/producer-package-manifest.json`;
const schemaPath = `${base}/evidence.schema.json`;
const generatorPath = "scripts/generate-feedback-credentialless-staging-preflight.mjs";
const testPath = "src/test/feedbackIntelligenceCredentiallessStagingPreflight.test.ts";
const handoffPath = "docs/feedback-intelligence/CREDENTIALLESS_STAGING_PREFLIGHT_V1_1.md";
const postdeployEvidencePath = "docs/feedback-intelligence/contracts/combined-staging-postdeploy-v0.1/postdeploy-evidence.json";
const postdeployManifestPath = "docs/feedback-intelligence/contracts/combined-staging-postdeploy-v0.1/producer-package-manifest.json";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const bytes = (path) => readFile(resolve(root, path));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const [currentEvidence, schemaBytes, generatorBytes, testBytes, handoffBytes, postdeployEvidenceBytes, postdeployManifestBytes] =
  await Promise.all([
    readFile(resolve(root, evidencePath), "utf8"),
    bytes(schemaPath),
    bytes(generatorPath),
    bytes(testPath),
    bytes(handoffPath),
    bytes(postdeployEvidencePath),
    bytes(postdeployManifestPath),
  ]);

const evidence = JSON.parse(currentEvidence);
const postdeploy = JSON.parse(postdeployEvidenceBytes.toString("utf8"));
const postdeployManifest = JSON.parse(postdeployManifestBytes.toString("utf8"));

assert(sha256(postdeployEvidenceBytes) === evidence.accepted_postdeploy.evidence_sha256, "Postdeploy evidence pin drift");
assert(sha256(postdeployManifestBytes) === evidence.accepted_postdeploy.manifest_sha256, "Postdeploy manifest pin drift");
assert(postdeployManifest.package_sha256 === evidence.accepted_postdeploy.package_sha256, "Postdeploy package pin drift");
assert(postdeploy.evidence_status === "PASS_POSTDEPLOY_ASSURANCE_UNSIGNED_AWAITING_CONSUMER_REVIEW", "Postdeploy status drift");
assert(evidence.evidence_status === "PASS_CREDENTIALLESS_PREFLIGHT_UNSIGNED_AWAITING_CONSUMER_REVIEW", "Preflight status drift");
assert(evidence.target.project_ref === "zbeswjipayspgvcipzmx", "Preflight target drift");
assert(evidence.secret_presence_observation.method === "SUPABASE_DASHBOARD_SECRET_NAME_PRESENCE_ONLY", "Secret observation method drift");
assert(evidence.secret_presence_observation.custom_secret_count === 3, "Custom secret count drift");

for (const [name, present] of Object.entries(evidence.secret_presence_observation.expected_feedback_secrets)) {
  assert(present === false, `${name}: expected credential/gate secret is present`);
}
for (const field of ["secret_values_read", "secret_values_persisted", "secret_digests_persisted", "unrelated_secret_names_persisted"]) {
  assert(evidence.secret_presence_observation[field] === false, `${field}: sanitized preflight drift`);
}
assert(evidence.database_preflight.reader_password_is_null === true, "Reader password is not null");
assert(evidence.database_preflight.reader_role_is_hardened === true, "Reader role hardening drift");
assert(evidence.database_preflight.producer_package_unset === true, "Producer package unexpectedly set");
assert(evidence.database_preflight.application_rows_read === false, "Application rows were read");
assert(evidence.database_preflight.application_functions_called === false, "Application function was called");
assert(evidence.database_preflight.database_mutated === false, "Database was mutated");
for (const [name, enabled] of Object.entries(evidence.database_preflight.database_gates)) {
  assert(enabled === false, `${name}: database gate is open`);
}
for (const [name, enabled] of Object.entries(evidence.runtime_gates)) {
  assert(enabled === false, `${name}: runtime or external gate is open`);
}
assert(evidence.next_gate.consumer_review_required === true, "Consumer review no longer required");
assert(evidence.next_gate.credentials_allowed === false, "Credentials unexpectedly allowed");
assert(evidence.next_gate.one_shot_read_allowed === false, "One-shot read unexpectedly allowed");
assert(evidence.next_gate.production_allowed === false, "Production unexpectedly allowed");

const packageFiles = [
  [evidencePath, Buffer.from(currentEvidence)],
  [schemaPath, schemaBytes],
  [generatorPath, generatorBytes],
  [testPath, testBytes],
  [handoffPath, handoffBytes],
];
const files = packageFiles.map(([path, value]) => ({ path, sha256: sha256(value) }));
const manifest = {
  schema_version: "rewireperform-feedback-intelligence-credentialless-staging-preflight-package-v1",
  package_status: "SANITIZED_UNSIGNED_AWAITING_CONSUMER_CREDENTIALLESS_PREFLIGHT_REVIEW",
  package_sha256: sha256(files.map(({ path, sha256: digest }) => `${digest}  ${path}\n`).join("")),
  files,
};
const manifestSerialized = `${JSON.stringify(manifest, null, 2)}\n`;

if (checkOnly) {
  const currentManifest = await readFile(resolve(root, manifestPath), "utf8");
  if (currentManifest !== manifestSerialized) {
    console.error("Credentialless Staging preflight package drift");
    process.exit(1);
  }
  console.log(JSON.stringify({
    status: evidence.evidence_status,
    evidence_sha256: sha256(currentEvidence),
    manifest_sha256: sha256(currentManifest),
    package_sha256: manifest.package_sha256,
    expected_feedback_secrets_absent: Object.values(evidence.secret_presence_observation.expected_feedback_secrets).every((value) => value === false),
    reader_password_is_null: evidence.database_preflight.reader_password_is_null,
    all_database_gates_closed: Object.values(evidence.database_preflight.database_gates).every((value) => value === false),
    all_runtime_gates_closed: Object.values(evidence.runtime_gates).every((value) => value === false),
  }, null, 2));
} else {
  await writeFile(resolve(root, manifestPath), manifestSerialized);
  console.log(`Wrote ${manifestPath}`);
}
