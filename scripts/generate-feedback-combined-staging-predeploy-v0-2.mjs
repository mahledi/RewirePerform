#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";

const root = process.cwd();
const checkOnly = process.argv.includes("--check");
const base = "docs/feedback-intelligence/contracts/combined-staging-predeploy-v0.2";
const evidencePath = `${base}/evidence.json`;
const manifestPath = `${base}/producer-package-manifest.json`;
const schemaPath = `${base}/evidence.schema.json`;
const docPath = "docs/feedback-intelligence/COMBINED_STAGING_PREDEPLOY_V0_3_3_V1_1.md";
const testPath = "src/test/feedbackIntelligenceCombinedStagingPredeployV02.test.ts";
const generatorPath = "scripts/generate-feedback-combined-staging-predeploy-v0-2.mjs";

const paths = {
  semanticsManifest: "docs/feedback-intelligence/contracts/v0.3/producer-package-manifest.json",
  exportManifest: "docs/feedback-intelligence/contracts/v0.2.1/producer-package-manifest.json",
  exportSchema: "docs/feedback-intelligence/contracts/v0.2.1/proposed-export.schema.json",
  gatewayContract: "docs/feedback-intelligence/contracts/machine-gateway-v0.1/gateway-contract.json",
  gatewayManifest: "docs/feedback-intelligence/contracts/machine-gateway-v0.1/producer-package-manifest.json",
  gatewayRequestSchema: "docs/feedback-intelligence/contracts/machine-gateway-v0.1/request.schema.json",
  registryMigration: "supabase/migrations/20260810154932_feedback_intelligence_visualization_copy_v1_1_2.sql",
  edge: "supabase/functions/mahleos-feedback-intelligence-read/index.ts",
  historicalPredeploy: "docs/feedback-intelligence/contracts/combined-staging-predeploy-v0.1/evidence.json",
  historicalPostdeploy: "docs/feedback-intelligence/contracts/combined-staging-postdeploy-v0.1/postdeploy-evidence.json",
};

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const bytes = (path) => readFile(resolve(root, path));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const [
  semanticsManifestBytes,
  exportManifestBytes,
  exportSchemaBytes,
  gatewayContractBytes,
  gatewayManifestBytes,
  gatewayRequestSchemaBytes,
  registryMigrationBytes,
  edgeBytes,
  historicalPredeployBytes,
  historicalPostdeployBytes,
  schemaBytes,
] = await Promise.all([
  bytes(paths.semanticsManifest),
  bytes(paths.exportManifest),
  bytes(paths.exportSchema),
  bytes(paths.gatewayContract),
  bytes(paths.gatewayManifest),
  bytes(paths.gatewayRequestSchema),
  bytes(paths.registryMigration),
  bytes(paths.edge),
  bytes(paths.historicalPredeploy),
  bytes(paths.historicalPostdeploy),
  bytes(schemaPath),
]);

const semanticsManifest = JSON.parse(semanticsManifestBytes.toString("utf8"));
const exportManifest = JSON.parse(exportManifestBytes.toString("utf8"));
const gatewayContract = JSON.parse(gatewayContractBytes.toString("utf8"));
const gatewayManifest = JSON.parse(gatewayManifestBytes.toString("utf8"));
const historicalPredeploy = JSON.parse(historicalPredeployBytes.toString("utf8"));
const historicalPostdeploy = JSON.parse(historicalPostdeployBytes.toString("utf8"));

const expected = {
  semanticsManifest: "eccdf05956b68d457d3fc2135e3984d2b56242e4742fc3379152587bc5e7c33f",
  semanticsPackage: "c5df75dd0ddbf717b039e1c809d9e06b06219b7e55e1d4384886a07496e210d5",
  semanticsConsumerAcceptance: "a5563f83bcaef42d743ee898cdf02331d7965d18b88ab4ad431bde35f6176818",
  exportManifest: "89298e177f65a7f517e9cc930c0dc9e0af588875117bf4449e7898200e31dfab",
  exportPackage: "8c1bd5807865c41c7572ddd47872bca355515f99a4f7ef1f17a017d1bd35794b",
  exportSchema: "e90eb3fc2ce717ef91ae35bcfcd5bc7944d3cc941faa8f071b42e934e967023d",
  exportConsumerAcceptance: "9cd280b2e5ebe958237d6ba77e4f7c6f06217a5b0daf4897aea02c9c72396cfb",
  gatewayContract: "625371ec54a78a1e9b26cf7ae485a4bcf07ee5705a0ea9c1166c71bad5d1be7c",
  gatewayManifest: "bc69e224b22e568269a74eff7d021533075dab931fb8adf6bc212f79a58d9f0e",
  gatewayPackage: "5828858602b3a28374b6e11ea5c80649f908eef2f1c0527f1382a39d2b477ed0",
  gatewayRequestSchema: "74e3616a67975766b51238d5573671d8e086014392d0e59e3ee9696ab287d204",
  gatewayConsumerAcceptance: "a2a236212b7e4e1f5c6ce323c9ddd9ee1b583f4f1974bcb251a33603f4a0f8d6",
  registryMigration: "d7160cb28eb64529ba95fe4c9d47ceab352dc194cc105b6194670a9479a265a9",
  edge: "b1e1cf077970011f6f62beef121ec617c94a4f37849163958bc1a2840199c384",
  historicalPredeploy: "78caa5bd105045b5430391d70f2b905a82326f5f5e637d4cd85b5712e4d46c9e",
  historicalPostdeploy: "3ff7ed70bf0523c0e23b5e1800a6c0143d4edcd6a6a215597a3c081919101b55",
  historicalPostdeployPackage: "4be78184303b4d4547dcb5730da8cbcb4dedd45d2ebb1d6df273ff5b1c5e98cd",
};

for (const [name, actual, pinned] of [
  ["semantics manifest", sha256(semanticsManifestBytes), expected.semanticsManifest],
  ["semantics package", semanticsManifest.package_sha256, expected.semanticsPackage],
  ["export manifest", sha256(exportManifestBytes), expected.exportManifest],
  ["export package", exportManifest.package_sha256, expected.exportPackage],
  ["export schema", sha256(exportSchemaBytes), expected.exportSchema],
  ["gateway contract", sha256(gatewayContractBytes), expected.gatewayContract],
  ["gateway manifest", sha256(gatewayManifestBytes), expected.gatewayManifest],
  ["gateway package", gatewayManifest.package_sha256, expected.gatewayPackage],
  ["gateway request schema", sha256(gatewayRequestSchemaBytes), expected.gatewayRequestSchema],
  ["registry migration", sha256(registryMigrationBytes), expected.registryMigration],
  ["edge source", sha256(edgeBytes), expected.edge],
  ["historical predeploy evidence", sha256(historicalPredeployBytes), expected.historicalPredeploy],
  ["historical postdeploy evidence", sha256(historicalPostdeployBytes), expected.historicalPostdeploy],
]) {
  assert(actual === pinned, `${name} pin drift: ${actual}`);
}

for (const [name, activation] of [
  ["semantics", semanticsManifest.activation],
  ["export", exportManifest.activation],
  ["gateway", gatewayManifest.activation],
]) {
  assert(Object.values(activation).every((value) => value === false), `${name} activation gate unexpectedly open`);
}

assert(gatewayContract.producer_pins.export_manifest_sha256 === expected.exportManifest, "gateway export manifest pin drift");
assert(gatewayContract.producer_pins.export_package_sha256 === expected.exportPackage, "gateway export package pin drift");
assert(gatewayContract.producer_pins.export_schema_sha256 === expected.exportSchema, "gateway export schema pin drift");
assert(gatewayContract.producer_pins.semantics_manifest_sha256 === expected.semanticsManifest, "gateway semantics manifest pin drift");
assert(gatewayContract.producer_pins.semantics_package_sha256 === expected.semanticsPackage, "gateway semantics package pin drift");

assert(historicalPostdeploy.evidence_status === "PASS_POSTDEPLOY_ASSURANCE_UNSIGNED_AWAITING_CONSUMER_REVIEW", "historical postdeploy status drift");
assert(historicalPredeploy.staging_payload.edge.source_sha256 === expected.edge, "historical predeploy Edge source drift");
assert(historicalPostdeploy.edge_assurance.deployed_source_byte_match === true, "historical edge byte match missing");
assert(historicalPostdeploy.edge_assurance.ezbr_sha256 === "ff2e9862d07cf237f906c861e0c81e9760f6d56f8a3f3a0251cdeeb9e9c8900c", "historical Edge bundle drift");
assert(historicalPostdeploy.gates.network_read_performed === false, "historical postdeploy unexpectedly read data");
assert(historicalPostdeploy.gates.export_function_called === false, "historical postdeploy unexpectedly called export");

const historicalMigrations = historicalPostdeploy.remote_migrations.map(({ local_path, local_sha256, applied }) => ({
  path: local_path,
  sha256: local_sha256,
  historically_applied: applied,
}));
assert(historicalMigrations.length === 3, "historical migration count drift");
for (const migration of historicalMigrations) {
  assert(migration.historically_applied === true, `historical migration not applied: ${migration.path}`);
  assert(sha256(await bytes(migration.path)) === migration.sha256, `historical migration byte drift: ${migration.path}`);
}

const currentConsumerCommit = "71f853da86a0d6450233c695702747d52059cd6e";
const integrationCommit = "b418a54a06fadf8fc4d1e7f96ec3ebe7b27e3c7c";
const releaseCommit = "c132feba8e2b540475a54fef258b17bd4dafc7df";
const evidence = {
  schema_version: "rewireperform-feedback-intelligence-combined-staging-predeploy-v2",
  evidence_status: "PREPARED_FAIL_CLOSED_V0_3_3_AWAITING_SINGLE_REGISTRY_MIGRATION_APPLY",
  generated_at: "2026-08-10T19:30:00+02:00",
  target: {
    project_ref: "zbeswjipayspgvcipzmx",
    environment: "staging",
    jurisdiction: "DE",
    data_scope: "synthetic_only",
  },
  producer_basis: {
    release_commit: releaseCommit,
    feedback_integration_commit: integrationCommit,
    repository_state: "PINNED_COMMITTED_INPUTS",
  },
  producer_inputs: {
    semantics: {
      contract_version: "0.3.3-draft",
      source_commit: "6beef95999bdddc78b9f7bfc8a40d725f4b1af96",
      integration_commit: integrationCommit,
      manifest_sha256: expected.semanticsManifest,
      package_sha256: expected.semanticsPackage,
      consumer_commit: currentConsumerCommit,
      consumer_acceptance_sha256: expected.semanticsConsumerAcceptance,
      consumer_status: "ACCEPTED_LOCAL_UNSIGNED",
    },
    export: {
      contract_version: "0.2.1-draft",
      source_commit: "1eb9de1960213878fc4186f76aca0bd59b2c99c9",
      integration_commit: integrationCommit,
      manifest_sha256: expected.exportManifest,
      package_sha256: expected.exportPackage,
      consumer_commit: "91983b226ddac2c068c55b62c7dc706baedfee93",
      consumer_acceptance_sha256: expected.exportConsumerAcceptance,
      consumer_status: "ACCEPTED_LOCAL_UNSIGNED",
    },
    gateway: {
      contract_version: "0.2.1+0.3.3-draft",
      source_commit: "e0de56f3dfdf6dc540fae1759b5bb4d8e12fafd3",
      integration_commit: integrationCommit,
      manifest_sha256: expected.gatewayManifest,
      package_sha256: expected.gatewayPackage,
      consumer_commit: currentConsumerCommit,
      consumer_acceptance_sha256: expected.gatewayConsumerAcceptance,
      consumer_status: "ACCEPTED_LOCAL_UNSIGNED",
    },
  },
  accepted_historical_staging: {
    predeploy_evidence_sha256: expected.historicalPredeploy,
    postdeploy_evidence_sha256: expected.historicalPostdeploy,
    postdeploy_package_sha256: expected.historicalPostdeployPackage,
    historical_baseline_only: true,
    applied_migrations: historicalMigrations,
    edge_source_sha256: expected.edge,
    edge_deployed_byte_match: true,
  },
  staging_delta: {
    pending_migrations: [{
      path: paths.registryMigration,
      sha256: expected.registryMigration,
      purpose: "DRAFT_CAMPAIGN_REGISTRY_METADATA_ONLY",
      status: "NOT_APPLIED_BY_THIS_GATE",
    }],
    runtime_bytes: {
      export_manifest_sha256: expected.exportManifest,
      export_package_sha256: expected.exportPackage,
      export_schema_sha256: expected.exportSchema,
      gateway_request_schema_sha256: expected.gatewayRequestSchema,
      edge_source_sha256: expected.edge,
      export_unchanged: true,
      request_schema_unchanged: true,
      edge_source_unchanged: true,
      edge_redeploy_required: false,
    },
  },
  historical_evidence: {
    v0_3_2_postdeploy_authorizes_v0_3_3: false,
    v0_3_2_synthetic_read_authorizes_v0_3_3: false,
    silent_reinterpretation_allowed: false,
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
    edge_deploy_performed: false,
    push_performed: false,
    merge_performed: false,
    app_store_release_authorized: false,
  },
  next_gate: {
    decision: "READY_FOR_SEPARATELY_APPROVED_SINGLE_REGISTRY_MIGRATION_APPLY",
    separate_staging_apply_approval_required: true,
    exact_database_mutations_required: 1,
    edge_redeploy_required: false,
    metadata_only_audit_without_prior_apply_sufficient: false,
    metadata_only_audit_after_apply_sufficient: true,
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
  [generatorPath, await bytes(generatorPath)],
  [testPath, await bytes(testPath)],
  [docPath, await bytes(docPath)],
  [paths.registryMigration, registryMigrationBytes],
  [paths.semanticsManifest, semanticsManifestBytes],
  [paths.exportManifest, exportManifestBytes],
  [paths.exportSchema, exportSchemaBytes],
  [paths.gatewayContract, gatewayContractBytes],
  [paths.gatewayManifest, gatewayManifestBytes],
  [paths.gatewayRequestSchema, gatewayRequestSchemaBytes],
  [paths.edge, edgeBytes],
  [paths.historicalPredeploy, historicalPredeployBytes],
  [paths.historicalPostdeploy, historicalPostdeployBytes],
];
const files = packageFiles.map(([path, value]) => ({ path, sha256: sha256(value) }));
const manifest = {
  schema_version: "rewireperform-feedback-intelligence-combined-staging-predeploy-package-v2",
  package_status: "LOCAL_UNSIGNED_FAIL_CLOSED_AWAITING_SINGLE_REGISTRY_MIGRATION_APPLY",
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
    console.error("Feedback Intelligence v0.3.3 Combined Staging predeploy evidence drift");
    process.exit(1);
  }
  console.log(JSON.stringify({
    status: evidence.evidence_status,
    evidence_sha256: sha256(currentEvidence),
    manifest_sha256: sha256(currentManifest),
    package_sha256: manifest.package_sha256,
    consumer_commit: currentConsumerCommit,
    pending_registry_migrations: evidence.staging_delta.pending_migrations.length,
    runtime_and_edge_bytes_unchanged: evidence.staging_delta.runtime_bytes.export_unchanged
      && evidence.staging_delta.runtime_bytes.request_schema_unchanged
      && evidence.staging_delta.runtime_bytes.edge_source_unchanged,
    all_runtime_and_production_gates_closed: Object.values(evidence.gates).every((value) => value === false),
    external_actions_performed: false,
  }, null, 2));
} else {
  await writeFile(resolve(root, evidencePath), evidenceSerialized, "utf8");
  await writeFile(resolve(root, manifestPath), manifestSerialized, "utf8");
  console.log(`${evidencePath} and ${manifestPath} written`);
}
