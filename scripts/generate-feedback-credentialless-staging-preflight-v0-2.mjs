#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const checkOnly = process.argv.includes("--check");
const base = "docs/feedback-intelligence/contracts/credentialless-staging-preflight-v0.2";
const evidencePath = `${base}/preflight-evidence.json`;
const manifestPath = `${base}/producer-package-manifest.json`;
const schemaPath = `${base}/evidence.schema.json`;
const secretObservationPath = `${base}/secret-presence-observation-2026-08-10.json`;
const databaseObservationPath = `${base}/database-preflight-observation-2026-08-10.json`;
const generatorPath = "scripts/generate-feedback-credentialless-staging-preflight-v0-2.mjs";
const testPath = "src/test/feedbackIntelligenceCredentiallessStagingPreflightV02.test.ts";
const handoffPath = "docs/feedback-intelligence/CREDENTIALLESS_STAGING_PREFLIGHT_V0_3_3_V1_1.md";
const postdeployEvidencePath = "docs/feedback-intelligence/contracts/combined-staging-postdeploy-v0.2/postdeploy-evidence.json";
const postdeployManifestPath = "docs/feedback-intelligence/contracts/combined-staging-postdeploy-v0.2/producer-package-manifest.json";
const semanticsManifestPath = "docs/feedback-intelligence/contracts/v0.3/producer-package-manifest.json";
const exportManifestPath = "docs/feedback-intelligence/contracts/v0.2.1/producer-package-manifest.json";
const gatewayContractPath = "docs/feedback-intelligence/contracts/machine-gateway-v0.1/gateway-contract.json";
const gatewayManifestPath = "docs/feedback-intelligence/contracts/machine-gateway-v0.1/producer-package-manifest.json";
const edgePath = "supabase/functions/mahleos-feedback-intelligence-read/index.ts";
const machineAuthPath = "supabase/functions/_shared/feedbackIntelligenceMachineAuth.ts";
const databasePath = "supabase/functions/_shared/feedbackIntelligenceDatabase.ts";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const bytes = (path) => readFile(resolve(root, path));
const json = async (path) => JSON.parse(await readFile(resolve(root, path), "utf8"));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const [
  secretObservation,
  databaseObservation,
  secretObservationBytes,
  databaseObservationBytes,
  postdeploy,
  postdeployManifest,
  postdeployBytes,
  postdeployManifestBytes,
  semanticsManifest,
  gatewayContract,
  edgeBytes,
  machineAuthBytes,
  databaseBytes,
] = await Promise.all([
  json(secretObservationPath),
  json(databaseObservationPath),
  bytes(secretObservationPath),
  bytes(databaseObservationPath),
  json(postdeployEvidencePath),
  json(postdeployManifestPath),
  bytes(postdeployEvidencePath),
  bytes(postdeployManifestPath),
  json(semanticsManifestPath),
  json(gatewayContractPath),
  bytes(edgePath),
  bytes(machineAuthPath),
  bytes(databasePath),
]);

const expectedSecrets = [
  "MAHLEOS_FEEDBACK_INTELLIGENCE_MACHINE_KEY",
  "MAHLEOS_FEEDBACK_INTELLIGENCE_MACHINE_KEY_PREVIOUS",
  "MAHLEOS_FEEDBACK_READER_DATABASE_URL",
  "MAHLEOS_FEEDBACK_INTELLIGENCE_MACHINE_GATE",
  "MAHLEOS_FEEDBACK_INTELLIGENCE_PRODUCTION_GATE",
];

assert(postdeploy.evidence_status === "PASS_V0_3_3_POSTDEPLOY_ASSURANCE_UNSIGNED_AWAITING_CONSUMER_REVIEW", "Postdeploy status drift");
assert(sha256(postdeployBytes) === "cb48c6efaf4ac0da906608ac0191e749850693016a3d6379ae8a69acae8a6999", "Postdeploy evidence pin drift");
assert(sha256(postdeployManifestBytes) === "39d3188144515cf48ac5ac7bdb3ad4275a3698ccf5430355b8cc59bdb01401d9", "Postdeploy manifest pin drift");
assert(postdeployManifest.package_sha256 === "2dc086363fd4bfe8523550471fa24548de838e57d9a53200226613b15f49e479", "Postdeploy package pin drift");
assert(semanticsManifest.contract_version === "0.3.3-draft", "Feedback semantics version drift");
assert(secretObservation.method === "SUPABASE_MANAGEMENT_API_SECRET_NAME_PRESENCE_ONLY", "Secret observation method drift");
assert(databaseObservation.method === "SUPABASE_MCP_READ_ONLY_METADATA_AND_CONFIGURATION_QUERY", "Database observation method drift");
assert(secretObservation.target.project_ref === "zbeswjipayspgvcipzmx", "Secret observation target drift");
assert(databaseObservation.target.project_ref === "zbeswjipayspgvcipzmx", "Database observation target drift");
assert(Object.keys(secretObservation.expected_feedback_secrets).join("\n") === expectedSecrets.join("\n"), "Secret-name scope drift");
for (const name of expectedSecrets) {
  assert(secretObservation.expected_feedback_secrets[name] === false, `${name}: expected secret is present`);
}
for (const field of ["secret_values_read", "secret_values_persisted", "secret_digests_persisted", "unrelated_secret_names_persisted"]) {
  assert(secretObservation[field] === false, `${field}: sanitized secret boundary drift`);
}
assert(databaseObservation.reader_role.password_is_null === true, "Reader password is not null");
for (const field of ["superuser", "create_db", "create_role", "inherit", "replication", "bypass_rls"]) {
  assert(databaseObservation.reader_role[field] === false, `Reader role ${field} drift`);
}
for (const field of ["consumer_pin_ready", "synthetic_export_enabled", "production_export_enabled", "machine_credential_ready", "privacy_notice_ready", "app_store_declaration_ready", "minor_policy_ready"]) {
  assert(databaseObservation.machine_contract[field] === false, `Machine contract gate ${field} is open`);
}
for (const field of ["athlete_collection_enabled", "text_collection_enabled", "privacy_notice_ready", "app_store_declaration_ready", "minor_policy_ready"]) {
  assert(databaseObservation.collection_settings[field] === false, `Collection gate ${field} is open`);
}
assert(databaseObservation.guardian_policy.active_policy_count === 0, "Guardian policy unexpectedly active");
assert(databaseObservation.guardian_policy.non_draft_policy_count === 0, "Guardian policy unexpectedly non-draft");
assert(databaseObservation.application_rows_read === false, "Application rows were read");
assert(databaseObservation.configuration_rows_read === true, "Configuration evidence missing");
assert(databaseObservation.application_functions_called === false, "Application/export function was called");
assert(databaseObservation.database_mutated === false, "Database was mutated");

const edgeSource = edgeBytes.toString("utf8");
const machineAuthSource = machineAuthBytes.toString("utf8");
const databaseSource = databaseBytes.toString("utf8");
assert(machineAuthSource.includes(expectedSecrets[0]) && machineAuthSource.includes(expectedSecrets[1]), "Machine-key source names drift");
assert(databaseSource.includes(expectedSecrets[2]), "Reader database URL source name drift");
assert(edgeSource.includes(expectedSecrets[3]) && edgeSource.includes(expectedSecrets[4]), "Edge gate source names drift");
assert(gatewayContract.authentication.machine_key_environment_name === expectedSecrets[0], "Gateway current-key name drift");
assert(gatewayContract.authentication.previous_key_environment_name === expectedSecrets[1], "Gateway previous-key name drift");

const evidence = {
  schema_version: "rewireperform-feedback-intelligence-credentialless-staging-preflight-v2",
  evidence_status: "PASS_V0_3_3_CREDENTIALLESS_PREFLIGHT_UNSIGNED_AWAITING_CONSUMER_REVIEW",
  target: {
    project_ref: "zbeswjipayspgvcipzmx",
    project_name: "RewirePerform Staging",
    region: "eu-central-1",
    environment: "staging",
    jurisdiction: "DE",
    data_scope: "synthetic_only",
  },
  producer_basis: {
    apple_rc_commit: "5eadb046d4a4902d98393bb0284a5471bc3d2a20",
    postdeploy_integration_commit: "061076d5d35e4c443ca6a482c0dc6676a46a0832",
    repository_state: "PINNED_COMMITTED_INPUTS",
  },
  accepted_postdeploy: {
    producer_commit: "bdba136a30e95718f47da545ec575b81378f659f",
    evidence_sha256: sha256(postdeployBytes),
    manifest_sha256: sha256(postdeployManifestBytes),
    package_sha256: postdeployManifest.package_sha256,
    consumer_commit: "602945a7b67fbc09a99f41361888b0447f6ec1e2",
    consumer_acceptance_sha256: "0941fd066378e4e5ec16435dc2c789dde9476f9073e24921c695be49f6981164",
    review_status: "ACCEPTED_V0_3_3_POSTDEPLOY_ASSURANCE_AWAITING_FRESH_CREDENTIALLESS_PREFLIGHT",
  },
  observations: {
    secret_presence: {
      source_path: secretObservationPath,
      source_sha256: sha256(secretObservationBytes),
      ...secretObservation,
    },
    database_preflight: {
      source_path: databaseObservationPath,
      source_sha256: sha256(databaseObservationBytes),
      ...databaseObservation,
    },
  },
  runtime_gates: {
    credentials_provisioned: false,
    keychain_written: false,
    reader_password_set: false,
    consumer_enabled: false,
    synthetic_read_enabled: false,
    machine_read_enabled: false,
    real_data_read_enabled: false,
    production_read_enabled: false,
    feedback_collection_enabled: false,
    text_collection_enabled: false,
    minor_policy_enabled: false,
    guardian_policy_enabled: false,
    network_read_performed: false,
    application_rows_read: false,
    export_function_called: false,
    credential_mutation_performed: false,
    edge_deploy_performed: false,
    database_mutation_performed: false,
    production_mutation_performed: false,
    push_performed: false,
    merge_performed: false,
    app_store_release_authorized: false,
  },
  historical_evidence: {
    v0_3_2_preflight_authorizes_v0_3_3: false,
    prior_synthetic_read_authorizes_current_read: false,
    silent_reinterpretation_allowed: false,
    historical_bytes_preserved: true,
  },
  next_gate: {
    decision: "AWAITING_JARVIS_V0_3_3_CREDENTIALLESS_PREFLIGHT_REVIEW",
    consumer_review_required: true,
    credentials_allowed: false,
    one_shot_read_allowed: false,
    production_allowed: false,
  },
};
const evidenceSerialized = `${JSON.stringify(evidence, null, 2)}\n`;

const packagePaths = [
  evidencePath,
  schemaPath,
  generatorPath,
  testPath,
  handoffPath,
  secretObservationPath,
  databaseObservationPath,
  postdeployEvidencePath,
  postdeployManifestPath,
  semanticsManifestPath,
  exportManifestPath,
  gatewayContractPath,
  gatewayManifestPath,
  edgePath,
  machineAuthPath,
  databasePath,
];

const packageBytes = await Promise.all(packagePaths.map(async (path) => [
  path,
  path === evidencePath ? Buffer.from(evidenceSerialized) : await bytes(path),
]));
const files = packageBytes.map(([path, value]) => ({ path, sha256: sha256(value) }));
const manifest = {
  schema_version: "rewireperform-feedback-intelligence-credentialless-staging-preflight-package-v2",
  package_status: "SANITIZED_UNSIGNED_V0_3_3_AWAITING_CONSUMER_CREDENTIALLESS_PREFLIGHT_REVIEW",
  package_sha256: sha256(files.map(({ path, sha256: digest }) => `${digest}  ${path}\n`).join("")),
  files,
};
const manifestSerialized = `${JSON.stringify(manifest, null, 2)}\n`;

if (checkOnly) {
  const [currentEvidence, currentManifest] = await Promise.all([
    readFile(resolve(root, evidencePath), "utf8"),
    readFile(resolve(root, manifestPath), "utf8"),
  ]);
  if (currentEvidence !== evidenceSerialized) {
    console.error("Credentialless Staging preflight v0.2 evidence drift");
    process.exit(1);
  }
  if (currentManifest !== manifestSerialized) {
    console.error("Credentialless Staging preflight v0.2 package drift");
    process.exit(1);
  }
  console.log(JSON.stringify({
    status: evidence.evidence_status,
    evidence_sha256: sha256(currentEvidence),
    manifest_sha256: sha256(currentManifest),
    package_sha256: manifest.package_sha256,
    expected_feedback_secrets_absent: Object.values(secretObservation.expected_feedback_secrets).every((value) => value === false),
    reader_password_is_null: databaseObservation.reader_role.password_is_null,
    all_runtime_gates_closed: Object.values(evidence.runtime_gates).every((value) => value === false),
    credentials_allowed: evidence.next_gate.credentials_allowed,
  }, null, 2));
} else {
  await writeFile(resolve(root, evidencePath), evidenceSerialized);
  await writeFile(resolve(root, manifestPath), manifestSerialized);
  console.log(`Wrote ${evidencePath}`);
  console.log(`Wrote ${manifestPath}`);
}
