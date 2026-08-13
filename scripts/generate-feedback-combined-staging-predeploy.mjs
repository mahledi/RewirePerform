#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";

const root = process.cwd();
const checkOnly = process.argv.includes("--check");
const base = "docs/feedback-intelligence/contracts/combined-staging-predeploy-v0.1";
const evidencePath = `${base}/evidence.json`;
const manifestPath = `${base}/producer-package-manifest.json`;
const schemaPath = `${base}/evidence.schema.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const bytes = (path) => readFile(resolve(root, path));

const paths = {
  semanticsManifest: "docs/feedback-intelligence/contracts/v0.3/producer-package-manifest.json",
  exportManifest: "docs/feedback-intelligence/contracts/v0.2.1/producer-package-manifest.json",
  gatewayManifest: "docs/feedback-intelligence/contracts/machine-gateway-v0.1/producer-package-manifest.json",
  athleteNotice: "supabase/migrations/20260810122000_feedback_text_consent_notice_v1_1.sql",
  guardianNotice: "supabase/migrations/20260810122100_guardian_feedback_text_notice_v1_1.sql",
  transfer: "supabase/migrations/20260810122749_feedback_intelligence_transfer_pulse_count_v0_2_1.sql",
  edge: "supabase/functions/mahleos-feedback-intelligence-read/index.ts",
};

const [
  semanticsManifestBytes,
  exportManifestBytes,
  gatewayManifestBytes,
  athleteNoticeBytes,
  guardianNoticeBytes,
  transferBytes,
  edgeBytes,
  schemaBytes,
] = await Promise.all([
  bytes(paths.semanticsManifest),
  bytes(paths.exportManifest),
  bytes(paths.gatewayManifest),
  bytes(paths.athleteNotice),
  bytes(paths.guardianNotice),
  bytes(paths.transfer),
  bytes(paths.edge),
  bytes(schemaPath),
]);

const semanticsManifest = JSON.parse(semanticsManifestBytes.toString("utf8"));
const exportManifest = JSON.parse(exportManifestBytes.toString("utf8"));
const gatewayManifest = JSON.parse(gatewayManifestBytes.toString("utf8"));

const expected = {
  semanticsManifest: "cb5d8df3a20903e08f874294f14d149f4e6615f26381e6118d4f5dd4e74f34df",
  semanticsPackage: "f38ae254af315eb6656edaddf7c196870f40b536c39817abc0a26123395de363",
  semanticsConsumerAcceptance: "b9120325896db715655fc5c59310c09e92e955a480873d4791b4a015575e9e74",
  exportManifest: "89298e177f65a7f517e9cc930c0dc9e0af588875117bf4449e7898200e31dfab",
  exportPackage: "8c1bd5807865c41c7572ddd47872bca355515f99a4f7ef1f17a017d1bd35794b",
  exportConsumerAcceptance: "9cd280b2e5ebe958237d6ba77e4f7c6f06217a5b0daf4897aea02c9c72396cfb",
  gatewayManifest: "386551e8e6c14868599711b8d9c2392bf7a4a4faf21a834f2134cdf188344bf1",
  gatewayPackage: "a540bb8fdbef4800bcb2329236364d6c87ffa9fa0d2516a114d2aa5459862c62",
  gatewayConsumerAcceptance: "35606d4e9a963fc15e658ae369931be0db22bac0d6a9b2614c6555eff9e8009d",
  athleteNotice: "50eea80f6977972c921429db697e295dfe6134c74ea8a480c937537f549e9f6f",
  guardianNotice: "3663a7f385cbf168aac2d200ced3a7aa68906de5f736a1a768e401480e1788d1",
  transfer: "463bf24d04eb981fa6509b47e0ce97487d8f51061f4ba514f652052399ab06e6",
  edge: "b1e1cf077970011f6f62beef121ec617c94a4f37849163958bc1a2840199c384",
};

for (const [name, actual, pinned] of [
  ["semantics manifest", sha256(semanticsManifestBytes), expected.semanticsManifest],
  ["semantics package", semanticsManifest.package_sha256, expected.semanticsPackage],
  ["export manifest", sha256(exportManifestBytes), expected.exportManifest],
  ["export package", exportManifest.package_sha256, expected.exportPackage],
  ["gateway manifest", sha256(gatewayManifestBytes), expected.gatewayManifest],
  ["gateway package", gatewayManifest.package_sha256, expected.gatewayPackage],
  ["athlete notice migration", sha256(athleteNoticeBytes), expected.athleteNotice],
  ["guardian notice migration", sha256(guardianNoticeBytes), expected.guardianNotice],
  ["transfer migration", sha256(transferBytes), expected.transfer],
  ["edge source", sha256(edgeBytes), expected.edge],
]) {
  if (actual !== pinned) throw new Error(`${name} pin drift: ${actual}`);
}

for (const [name, activation] of [
  ["semantics", semanticsManifest.activation],
  ["export", exportManifest.activation],
  ["gateway", gatewayManifest.activation],
]) {
  if (!Object.values(activation).every((value) => value === false)) {
    throw new Error(`${name} activation gate unexpectedly open`);
  }
}

const consumerCommit = "f203e8efc28b76921f21458dcc0ce473b5d279ad";
const evidence = {
  schema_version: "rewireperform-feedback-intelligence-combined-staging-predeploy-v1",
  evidence_status: "PREPARED_FAIL_CLOSED_AWAITING_SEPARATE_STAGING_APPLY",
  generated_at: "2026-08-10T13:30:00+02:00",
  target: {
    project_ref: "zbeswjipayspgvcipzmx",
    environment: "staging",
    jurisdiction: "DE",
    data_scope: "synthetic_only",
  },
  producer_inputs: {
    semantics: {
      contract_version: "0.3.2-draft",
      producer_commit: "1975f767a61a0f481247aa1a5138846b5e2addb8",
      manifest_sha256: expected.semanticsManifest,
      package_sha256: expected.semanticsPackage,
      consumer_commit: consumerCommit,
      consumer_acceptance_sha256: expected.semanticsConsumerAcceptance,
      consumer_status: "ACCEPTED_LOCAL_UNSIGNED_AWAITING_COMBINED_STAGING_ASSURANCE",
    },
    export: {
      contract_version: "0.2.1-draft",
      producer_commit: "1eb9de1960213878fc4186f76aca0bd59b2c99c9",
      manifest_sha256: expected.exportManifest,
      package_sha256: expected.exportPackage,
      consumer_commit: consumerCommit,
      consumer_acceptance_sha256: expected.exportConsumerAcceptance,
      consumer_status: "ACCEPTED_LOCAL_UNSIGNED_AWAITING_COMBINED_STAGING_ASSURANCE",
    },
    gateway: {
      contract_version: "0.2.1+0.3.2-draft",
      producer_commit: "f6978da52e08265de1ec1c9e9385f94910a91c08",
      manifest_sha256: expected.gatewayManifest,
      package_sha256: expected.gatewayPackage,
      consumer_commit: consumerCommit,
      consumer_acceptance_sha256: expected.gatewayConsumerAcceptance,
      consumer_status: "ACCEPTED_LOCAL_UNSIGNED_AWAITING_COMBINED_STAGING_ASSURANCE",
    },
  },
  staging_payload: {
    migrations: [
      { path: paths.athleteNotice, sha256: expected.athleteNotice, status: "NOT_APPLIED_BY_THIS_GATE" },
      { path: paths.guardianNotice, sha256: expected.guardianNotice, status: "NOT_APPLIED_BY_THIS_GATE" },
      { path: paths.transfer, sha256: expected.transfer, status: "NOT_APPLIED_BY_THIS_GATE" },
    ],
    edge: {
      slug: "mahleos-feedback-intelligence-read",
      source_sha256: expected.edge,
      status: "NOT_DEPLOYED_BY_THIS_GATE",
      verify_jwt: false,
    },
  },
  historical_evidence: {
    v0_3_1_authorizes_v0_3_2: false,
    v0_2_0_authorizes_v0_2_1: false,
    prior_gateway_authorizes_combined_gate: false,
    historical_bytes_preserved: true,
  },
  gates: {
    feedback_collection_enabled: false,
    text_collection_enabled: false,
    minor_policy_enabled: false,
    guardian_policy_enabled: false,
    consumer_pin_enabled: false,
    synthetic_export_enabled: false,
    reader_password_provisioned: false,
    machine_key_provisioned: false,
    edge_runtime_enabled: false,
    network_read_performed: false,
    production_export_enabled: false,
    real_data_read_enabled: false,
    database_write_performed: false,
    push_performed: false,
    merge_performed: false,
    app_store_release_authorized: false,
  },
  next_gate: {
    decision: "READY_FOR_SEPARATELY_APPROVED_METADATA_ONLY_STAGING_APPLY",
    separate_staging_apply_approval_required: true,
    metadata_only_postdeploy_assurance_required: true,
    credentials_allowed: false,
    network_read_allowed: false,
    production_allowed: false,
  },
};

const schema = JSON.parse(schemaBytes.toString("utf8"));
const validate = new Ajv2020({ strict: true, validateFormats: false }).compile(schema);
if (!validate(evidence)) {
  console.error(JSON.stringify(validate.errors, null, 2));
  process.exit(1);
}

const evidenceSerialized = `${JSON.stringify(evidence, null, 2)}\n`;
const packageFiles = [
  [evidencePath, Buffer.from(evidenceSerialized)],
  [schemaPath, schemaBytes],
  ["scripts/generate-feedback-combined-staging-predeploy.mjs", await bytes("scripts/generate-feedback-combined-staging-predeploy.mjs")],
  ["src/test/feedbackIntelligenceCombinedStagingPredeploy.test.ts", await bytes("src/test/feedbackIntelligenceCombinedStagingPredeploy.test.ts")],
  ["docs/feedback-intelligence/COMBINED_STAGING_PREDEPLOY_V1_1.md", await bytes("docs/feedback-intelligence/COMBINED_STAGING_PREDEPLOY_V1_1.md")],
];
const files = packageFiles.map(([path, value]) => ({ path, sha256: sha256(value) }));
const manifest = {
  schema_version: "rewireperform-feedback-intelligence-combined-staging-predeploy-package-v1",
  package_status: "LOCAL_UNSIGNED_FAIL_CLOSED_AWAITING_SEPARATE_STAGING_APPLY",
  package_sha256: sha256(files.map(({ path, sha256: digest }) => `${digest}  ${path}\n`).join("")),
  files,
};
const manifestSerialized = `${JSON.stringify(manifest, null, 2)}\n`;

if (checkOnly) {
  const [currentEvidence, currentManifest] = await Promise.all([
    readFile(resolve(root, evidencePath), "utf8"),
    readFile(resolve(root, manifestPath), "utf8"),
  ]);
  if (currentEvidence !== evidenceSerialized || currentManifest !== manifestSerialized) {
    console.error("Combined Staging predeploy evidence drift");
    process.exit(1);
  }
  console.log(JSON.stringify({
    status: evidence.evidence_status,
    evidence_sha256: sha256(currentEvidence),
    manifest_sha256: sha256(currentManifest),
    package_sha256: manifest.package_sha256,
    consumer_commit: consumerCommit,
    all_runtime_and_production_gates_closed: Object.values(evidence.gates).every((value) => value === false),
    external_actions_performed: false,
  }, null, 2));
} else {
  await writeFile(resolve(root, evidencePath), evidenceSerialized, "utf8");
  await writeFile(resolve(root, manifestPath), manifestSerialized, "utf8");
  console.log(`${evidencePath} and ${manifestPath} written`);
}
