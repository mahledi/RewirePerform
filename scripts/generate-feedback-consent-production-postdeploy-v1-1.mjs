#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const checkOnly = process.argv.includes("--check");
const base = "docs/feedback-intelligence/contracts/production-consent-postdeploy-v1.1";
const evidencePath = `${base}/postdeploy-evidence.json`;
const schemaPath = `${base}/evidence.schema.json`;
const manifestPath = `${base}/producer-package-manifest.json`;
const migrationPath =
  "supabase/migrations/20260813115737_feedback_consent_guardian_de_v1_1_final_contract.sql";
const consentManifestPath =
  "docs/feedback-intelligence/contracts/consent-v1.1/producer-package-manifest.json";
const generatorPath = "scripts/generate-feedback-consent-production-postdeploy-v1-1.mjs";
const testPath = "src/test/feedbackConsentProductionPostdeployV11.test.ts";
const handoffPath = "docs/feedback-intelligence/PRODUCTION_CONSENT_POSTDEPLOY_V1_1.md";

const expected = {
  producerCommit: "e50d6e68a0bbd25064e3752f94eed1ad9d5ff552",
  functionalCommit: "fabb7110970d6f48e3f2c4b104122320941c0e34",
  consentManifestSha256: "5a28d9f407ed59c45dbbdddc35699e3e848ee750a87f19720ed3995b2361b05e",
  consentPackageSha256: "7191f1ea0394b45cbce55e473f91461c6076a2db3586ce6a720f5568190d4ff3",
  migrationSha256: "6a2933e3d33a41fe0c35523be795160c04f030dfccf3f4579078fabb0784eba9",
  athleteNoticeSha256: "c308e8ad3d89b02c308a07090a4c09cb363f9cdb7d1e5d671ac295c545d95a16",
  guardianNoticeSha256: "90b0ede2a1a7671f1631e2048a605e6331006972ee05e63d38d229857f0aeb0b",
};

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const serialize = (value) => `${JSON.stringify(value, null, 2)}\n`;
const read = async (path) => readFile(resolve(root, path));

const migrationBytes = await read(migrationPath);
const consentManifestBytes = await read(consentManifestPath);
const consentManifest = JSON.parse(consentManifestBytes.toString("utf8"));
if (sha256(migrationBytes) !== expected.migrationSha256) {
  throw new Error("final consent migration byte drift");
}
if (sha256(consentManifestBytes) !== expected.consentManifestSha256) {
  throw new Error("final consent manifest byte drift");
}
if (consentManifest.package_sha256 !== expected.consentPackageSha256) {
  throw new Error("final consent package pin drift");
}

const campaignReferences = [
  "feedback-day-10-v1",
  "feedback-day-24-v1",
  "feedback-day-39-v1",
  "feedback-day-55-v1",
];
const runtimeGates = {
  athlete_collection_enabled: false,
  text_collection_enabled: false,
  privacy_notice_ready: false,
  app_store_declaration_ready: false,
  minor_policy_ready: false,
};
const authorization = {
  campaigns_active: false,
  guardian_policy_active: false,
  feedback_collection: false,
  feedback_comments: false,
  jarvis_credentials: false,
  jarvis_real_data_read: false,
  app_store_action: false,
  push: false,
  merge: false,
};

const evidence = {
  schema_version: "rewireperform-feedback-consent-production-postdeploy-v1.1-evidence-v1",
  evidence_status: "PASS_FINAL_CONSENT_REGISTERED_PRODUCTION_RUNTIME_GATES_CLOSED",
  recorded_date: "2026-08-13",
  project_ref: "bqsbxesmybthwtxmowfz",
  producer: {
    commit: expected.producerCommit,
    functional_commit: expected.functionalCommit,
    consent_manifest_sha256: expected.consentManifestSha256,
    consent_package_sha256: expected.consentPackageSha256,
  },
  migration: {
    local_path: migrationPath,
    local_sha256: expected.migrationSha256,
    remote_version: "20260813123955",
    remote_name: "feedback_consent_guardian_de_v1_1_final_contract",
    applied: true,
  },
  metadata_audit: {
    jurisdiction_policy: {
      jurisdiction: "DE",
      policy_version: "feedback-jurisdiction-minor-de-v1.1.0",
      product_minimum_age: 13,
      guardian_required_below_age: 16,
      structured_collection_status: "legal_review_required",
      raw_text_collection_status: "legal_review_required",
    },
    campaigns: {
      count: 4,
      references: campaignReferences,
      consent_version: "feedback-text-consent-v1.1.0",
      notice_sha256: expected.athleteNoticeSha256,
      status: "draft",
    },
    guardian_policy: {
      count: 1,
      policy_reference: "guardian-feedback-text-de-v1.1.0",
      consent_version: "feedback-text-consent-v1.1.0",
      athlete_notice_sha256: expected.athleteNoticeSha256,
      guardian_notice_sha256: expected.guardianNoticeSha256,
      raw_text_retention_days: 365,
      status: "draft",
      active_policy_count: 0,
    },
    runtime_gates: runtimeGates,
  },
  privacy_boundary: {
    metadata_only: true,
    application_rows_read: false,
    application_functions_called: false,
    application_values_persisted: false,
    secret_presence_checked: false,
    secret_values_read: false,
    credential_values_persisted: false,
    database_mutated_by_audit: false,
  },
  authorization,
  next_gate: "INDEPENDENT_CONSUMER_REVIEW_REQUIRED_EXTERNAL_GATES_REMAIN_CLOSED",
};

const evidenceBytes = serialize(evidence);
const packagePaths = [
  evidencePath,
  schemaPath,
  migrationPath,
  consentManifestPath,
  generatorPath,
  testPath,
  handoffPath,
];
const files = [];
const digestInput = [];
for (const path of packagePaths) {
  const bytes = path === evidencePath ? Buffer.from(evidenceBytes) : await read(path);
  const digest = sha256(bytes);
  files.push({ path, sha256: digest });
  digestInput.push(`${digest}  ${path}\n`);
}
const manifest = {
  schema_version: "rewireperform-feedback-consent-production-postdeploy-package-v1",
  package_status: "LOCAL_UNSIGNED_AWAITING_INDEPENDENT_CONSUMER_REVIEW",
  producer_commit: expected.producerCommit,
  package_sha256: sha256(digestInput.join("")),
  files,
  authorization,
};
const outputs = {
  [evidencePath]: evidenceBytes,
  [manifestPath]: serialize(manifest),
};

if (checkOnly) {
  for (const [path, expectedBytes] of Object.entries(outputs)) {
    const current = await readFile(resolve(root, path), "utf8");
    if (current !== expectedBytes) throw new Error(`${path}: generated evidence drift`);
  }
  console.log(JSON.stringify({
    status: evidence.evidence_status,
    evidence_sha256: sha256(evidenceBytes),
    package_sha256: manifest.package_sha256,
    all_external_gates_closed: Object.values(authorization).every((value) => value === false),
  }, null, 2));
} else {
  for (const [path, value] of Object.entries(outputs)) {
    await writeFile(resolve(root, path), value, "utf8");
  }
}
