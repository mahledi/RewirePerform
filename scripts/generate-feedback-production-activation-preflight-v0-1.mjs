#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = process.cwd();
const checkOnly = process.argv.includes("--check");
const base = "docs/feedback-intelligence/contracts/production-feedback-activation-preflight-v0.1";
const evidencePath = `${base}/post-install-preflight-evidence.json`;
const schemaPath = `${base}/evidence.schema.json`;
const manifestPath = `${base}/producer-package-manifest.json`;
const generatorPath = "scripts/generate-feedback-production-activation-preflight-v0-1.mjs";
const testPath = "src/test/feedbackProductionActivationPreflightV01.test.ts";
const handoffPath = "docs/feedback-intelligence/PRODUCTION_FEEDBACK_ACTIVATION_PREFLIGHT_V0_1.md";
const persistentPlanPath =
  "docs/feedback-intelligence/contracts/production-persistent-apply-v0.1/plan.json";
const historicalPreflightPath =
  "docs/feedback-intelligence/contracts/production-post-edge-deploy-preflight-v0.1/evidence.json";
const historicalPreflightManifestPath =
  "docs/feedback-intelligence/contracts/production-post-edge-deploy-preflight-v0.1/producer-package-manifest.json";
const consentPostdeployManifestPath =
  "docs/feedback-intelligence/contracts/production-consent-postdeploy-v1.1/producer-package-manifest.json";
const activationPackageManifestPath =
  "docs/feedback-intelligence/contracts/production-activation-synthetic-smoke-v0.1/producer-package-manifest.json";
const gatewayPackageManifestPath =
  "docs/feedback-intelligence/contracts/production-machine-gateway-v0.1/producer-package-manifest.json";

const sourceMainCommit = "62f14138c889c526e6ee180a4f1d76c9a997d9d3";
const projectRef = "bqsbxesmybthwtxmowfz";
const historicalRemoteCount = 104;
const historicalRemoteSha256 = "f20873d87cd352ceed9460bf995d20fdde4b7e984c660983f81a5277b312981b";
const finalRemoteSha256 = "6c7caf62ddca94cef7e5b5bd116f18aa2e5696bb9436bf52c74029a9002e26c9";
const remoteFloor = "20260801104717";
const controlledRemoteAdditions = [
  {
    local_version: "20260813115737",
    remote_version: "20260813123955",
    mode: "CONTROLLED_VERSION_MAPPING_EXACT_BYTES",
  },
  {
    local_version: "20260813125221",
    remote_version: "20260813125221",
    mode: "APPLIED_EXACT_VERSION_AND_BYTES",
  },
  {
    local_version: "20260813125222",
    remote_version: "20260813125222",
    mode: "APPLIED_EXACT_VERSION_AND_BYTES",
  },
];
const feedbackSecrets = [
  "MAHLEOS_FEEDBACK_PRODUCTION_MACHINE_KEY",
  "MAHLEOS_FEEDBACK_PRODUCTION_MACHINE_KEY_PREVIOUS",
  "MAHLEOS_FEEDBACK_PRODUCTION_READER_DATABASE_URL",
  "MAHLEOS_FEEDBACK_PRODUCTION_MACHINE_GATE",
  "MAHLEOS_FEEDBACK_PRODUCTION_REAL_DATA_GATE",
];
const activationMigration =
  "supabase/migrations/20260813125221_feedback_intelligence_v1_1_activation_contract.sql";
const recloseMigration =
  "supabase/migrations/20260813125222_feedback_intelligence_v1_1_reclose_contract.sql";
const consentMigration =
  "supabase/migrations/20260813115737_feedback_consent_guardian_de_v1_1_final_contract.sql";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const serialize = (value) => `${JSON.stringify(value, null, 2)}\n`;
const read = async (path) => readFile(resolve(root, path));
const exactObjectSchema = (properties) => ({
  type: "object",
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
});
const falseObjectSchema = (keys) => exactObjectSchema(Object.fromEntries(
  keys.map((key) => [key, { const: false }]),
));

const [
  persistentPlanBytes,
  historicalPreflightBytes,
  historicalPreflightManifestBytes,
  consentPostdeployManifestBytes,
  activationPackageManifestBytes,
  gatewayPackageManifestBytes,
] = await Promise.all([
  read(persistentPlanPath),
  read(historicalPreflightPath),
  read(historicalPreflightManifestPath),
  read(consentPostdeployManifestPath),
  read(activationPackageManifestPath),
  read(gatewayPackageManifestPath),
]);
const persistentPlan = JSON.parse(persistentPlanBytes.toString("utf8"));
const historicalPreflight = JSON.parse(historicalPreflightBytes.toString("utf8"));
const historicalPreflightManifest = JSON.parse(historicalPreflightManifestBytes.toString("utf8"));
const consentPostdeployManifest = JSON.parse(consentPostdeployManifestBytes.toString("utf8"));
const activationPackageManifest = JSON.parse(activationPackageManifestBytes.toString("utf8"));
const gatewayPackageManifest = JSON.parse(gatewayPackageManifestBytes.toString("utf8"));

if (persistentPlan.project_ref !== projectRef || persistentPlan.step_count !== 25) {
  throw new Error("persistent Production plan drift");
}
if (historicalPreflight.migration_state.remote_migration_count !== historicalRemoteCount
    || historicalPreflight.migration_state.remote_versions_sha256 !== historicalRemoteSha256
    || historicalPreflightManifest.package_sha256
      !== "15a30cbc5caf508338c033f89cf87e3bc1cb62b7bb2cfa5ac93686a3c57a99f9") {
  throw new Error("historical credentialless Production preflight drift");
}

const floor = (await readdir(resolve(root, "supabase/migrations")))
  .filter((name) => /^\d{14}_.+\.sql$/u.test(name) && name.slice(0, 14) <= remoteFloor)
  .map((name) => name.slice(0, 14))
  .sort();
const historicalVersions = [...floor, ...persistentPlan.steps.map(({ version }) => version)];
if (historicalVersions.length !== historicalRemoteCount
    || sha256(`${historicalVersions.join("\n")}\n`) !== historicalRemoteSha256) {
  throw new Error("historical remote migration inventory drift");
}
const finalRemoteVersions = [
  ...historicalVersions,
  ...controlledRemoteAdditions.map(({ remote_version }) => remote_version),
];
if (finalRemoteVersions.length !== 107
    || new Set(finalRemoteVersions).size !== finalRemoteVersions.length
    || JSON.stringify(finalRemoteVersions) !== JSON.stringify([...finalRemoteVersions].sort())
    || sha256(`${finalRemoteVersions.join("\n")}\n`) !== finalRemoteSha256) {
  throw new Error("final remote migration inventory drift");
}

const edgeFunctions = historicalPreflight.edge_functions;
for (const deployed of Object.values(edgeFunctions)) {
  for (const [path, expectedSha] of Object.entries(deployed.remote_files)) {
    if (sha256(await read(path)) !== expectedSha) {
      throw new Error(`deployed Edge byte drift: ${path}`);
    }
  }
}

const migrationPins = {};
for (const path of [consentMigration, activationMigration, recloseMigration]) {
  migrationPins[path] = sha256(await read(path));
}
if (migrationPins[activationMigration]
      !== "960d5809ed248c05c5f7e64b36fdf0f12a160f9e9f7b3a3c663bda434e375ba4"
    || migrationPins[recloseMigration]
      !== "be999f2f69b9c6c75abde320a8d3521ca4425c2db0426cf32c629c918205278b") {
  throw new Error("activation contract migration byte drift");
}

const runtimeGates = {
  athlete_collection_enabled: false,
  text_collection_enabled: false,
  privacy_notice_ready: false,
  app_store_declaration_ready: false,
  minor_policy_ready: false,
};
const externalGates = {
  campaigns_active: false,
  guardian_policy_active: false,
  feedback_credentials: false,
  feedback_machine_runtime: false,
  feedback_real_data: false,
  feedback_collection: false,
  feedback_comments: false,
  minor_feedback: false,
  guardian_feedback: false,
  real_jarvis: false,
  app_store_action: false,
  production_activation: false,
  synthetic_smoke: false,
};
const secretPresence = Object.fromEntries(feedbackSecrets.map((name) => [name, false]));
const campaignReferences = [
  "feedback-day-10-v1",
  "feedback-day-24-v1",
  "feedback-day-39-v1",
  "feedback-day-55-v1",
];
const installedFunctions = {
  "feedback_core.activate_feedback_v1_1(text)": {
    installed: true,
    security_mode: "INVOKER",
    public_execute: false,
    anon_execute: false,
    authenticated_execute: false,
    service_role_execute: false,
    source_migration: activationMigration,
    source_sha256: migrationPins[activationMigration],
  },
  "feedback_core.reclose_feedback_v1_1(text)": {
    installed: true,
    security_mode: "INVOKER",
    public_execute: false,
    anon_execute: false,
    authenticated_execute: false,
    service_role_execute: false,
    source_migration: recloseMigration,
    source_sha256: migrationPins[recloseMigration],
  },
};

const sanitizedObservation = {
  migration_inventory_sha256: finalRemoteSha256,
  installed_function_names: Object.keys(installedFunctions),
  campaigns_active: 0,
  guardian_policies_active: 0,
  runtime_gates: runtimeGates,
  feedback_secret_presence: secretPresence,
  reader_password_is_null: true,
  reader_callable_rpc_count: 1,
  reader_relation_privilege_count: 0,
  reader_sequence_privilege_count: 0,
  reader_public_callable_path_count: 0,
};

const evidence = {
  schema_version: "rewireperform-feedback-production-activation-preflight-v0.1-evidence-v1",
  status: "PASS_PRODUCTION_ACTIVATION_CONTRACTS_INSTALLED_CREDENTIALLESS_RUNTIME_CLOSED",
  recorded_date: "2026-08-13",
  project_ref: projectRef,
  source_main_commit: sourceMainCommit,
  provenance: {
    source: "sanitized-production-post-install-metadata-and-presence-audit-v1",
    sanitized_observation_sha256: sha256(serialize(sanitizedObservation)),
    application_rows_read: false,
    application_functions_called: false,
    database_mutated_by_audit: false,
  },
  migration_state: {
    remote_migration_count: finalRemoteVersions.length,
    remote_versions_sha256: finalRemoteSha256,
    remote_versions: finalRemoteVersions,
    controlled_remote_additions: controlledRemoteAdditions.map((entry) => ({
      ...entry,
      local_path: entry.local_version === "20260813115737"
        ? consentMigration
        : entry.local_version === "20260813125221" ? activationMigration : recloseMigration,
      local_sha256: migrationPins[
        entry.local_version === "20260813115737"
          ? consentMigration
          : entry.local_version === "20260813125221" ? activationMigration : recloseMigration
      ],
    })),
  },
  activation_contracts: {
    installed_function_count: 2,
    functions: installedFunctions,
    runtime_state_changed_by_installation: false,
  },
  registry_state: {
    campaigns: {
      count: 4,
      references: campaignReferences,
      status: "draft",
      active_count: 0,
      content_version: "feedback-intelligence-content-v1.1.2",
      consent_version: "feedback-text-consent-v1.1.0",
    },
    guardian_policy: {
      count: 1,
      policy_reference: "guardian-feedback-text-de-v1.1.0",
      status: "draft",
      active_count: 0,
    },
    runtime_gates: runtimeGates,
  },
  edge_functions: edgeFunctions,
  secret_presence: {
    source: "supabase-secrets-list-presence-only-v1",
    expected_secret_names: feedbackSecrets,
    observed_presence: secretPresence,
    secret_values_read: false,
    secret_values_persisted: false,
    unrelated_secret_names_persisted: false,
  },
  reader_boundary: {
    source: "postgres-catalog-metadata-audit-v1",
    role_name: "mahleos_feedback_production_reader",
    password_is_null: true,
    login: true,
    superuser: false,
    createdb: false,
    createrole: false,
    inherit: false,
    replication: false,
    bypassrls: false,
    callable_rpc_count: 1,
    relation_privilege_count: 0,
    sequence_privilege_count: 0,
    public_callable_path_count: 0,
  },
  upstream_packages: {
    consent_postdeploy_manifest_sha256: sha256(consentPostdeployManifestBytes),
    consent_postdeploy_package_sha256: consentPostdeployManifest.package_sha256,
    activation_smoke_manifest_sha256: sha256(activationPackageManifestBytes),
    activation_smoke_package_sha256: activationPackageManifest.package_sha256,
    production_gateway_manifest_sha256: sha256(gatewayPackageManifestBytes),
    production_gateway_package_sha256: gatewayPackageManifest.package_sha256,
    historical_credentialless_preflight_manifest_sha256: sha256(historicalPreflightManifestBytes),
    historical_credentialless_preflight_package_sha256: historicalPreflightManifest.package_sha256,
  },
  privacy_boundary: {
    metadata_and_presence_only: true,
    application_rows_read: false,
    application_values_persisted: false,
    raw_feedback_read: false,
    raw_comment_text_read: false,
    subject_reference_read: false,
    secret_values_read: false,
    credential_values_persisted: false,
    database_mutated_by_audit: false,
  },
  gates: externalGates,
  authorization_boundary: {
    authorizes_activation: false,
    authorizes_synthetic_smoke: false,
    authorizes_credentials: false,
    authorizes_feedback_read: false,
    authorizes_minor_or_guardian_collection: false,
    authorizes_real_data_processing: false,
    authorizes_app_store_action: false,
  },
  next_gate: "INDEPENDENT_JARVIS_CONSUMER_BYTE_AND_SEMANTIC_ACCEPTANCE_REQUIRED",
};

const schema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://rewireperform.com/contracts/production-feedback-activation-preflight-v0.1.schema.json",
  ...exactObjectSchema({
    schema_version: { const: evidence.schema_version },
    status: { const: evidence.status },
    recorded_date: { const: evidence.recorded_date },
    project_ref: { const: projectRef },
    source_main_commit: { const: sourceMainCommit },
    provenance: { const: evidence.provenance },
    migration_state: { const: evidence.migration_state },
    activation_contracts: { const: evidence.activation_contracts },
    registry_state: { const: evidence.registry_state },
    edge_functions: { const: evidence.edge_functions },
    secret_presence: { const: evidence.secret_presence },
    reader_boundary: { const: evidence.reader_boundary },
    upstream_packages: { const: evidence.upstream_packages },
    privacy_boundary: { const: evidence.privacy_boundary },
    gates: falseObjectSchema(Object.keys(externalGates)),
    authorization_boundary: falseObjectSchema(Object.keys(evidence.authorization_boundary)),
    next_gate: { const: evidence.next_gate },
  }),
};

const generated = {
  [evidencePath]: serialize(evidence),
  [schemaPath]: serialize(schema),
};
const packagePaths = [
  evidencePath,
  schemaPath,
  generatorPath,
  testPath,
  handoffPath,
  consentMigration,
  activationMigration,
  recloseMigration,
  ...Object.values(edgeFunctions).flatMap(({ remote_files }) => Object.keys(remote_files)),
  consentPostdeployManifestPath,
  activationPackageManifestPath,
  gatewayPackageManifestPath,
  historicalPreflightManifestPath,
];
const uniquePackagePaths = [...new Set(packagePaths)];
const files = [];
const digestInput = [];
for (const path of uniquePackagePaths) {
  const bytes = generated[path] ?? await read(path);
  const digest = sha256(bytes);
  files.push({ path, sha256: digest });
  digestInput.push(`${digest}  ${path}\n`);
}
const manifest = {
  schema_version: "rewireperform-feedback-production-activation-preflight-v0.1-package-v1",
  status: evidence.status,
  recorded_date: evidence.recorded_date,
  source_main_commit: sourceMainCommit,
  evidence_sha256: sha256(generated[evidencePath]),
  package_sha256: sha256(digestInput.join("")),
  files,
  gates: externalGates,
};
const outputs = { ...generated, [manifestPath]: serialize(manifest) };

if (checkOnly) {
  for (const [path, expected] of Object.entries(outputs)) {
    const current = await readFile(resolve(root, path), "utf8");
    if (current !== expected) throw new Error(`${path}: generated activation preflight drift`);
  }
  console.log(JSON.stringify({
    status: evidence.status,
    source_main_commit: sourceMainCommit,
    remote_migration_count: finalRemoteVersions.length,
    remote_versions_sha256: finalRemoteSha256,
    evidence_sha256: manifest.evidence_sha256,
    package_sha256: manifest.package_sha256,
    all_gates_closed: Object.values(externalGates).every((value) => value === false),
  }, null, 2));
} else {
  for (const [path, value] of Object.entries(outputs)) {
    await mkdir(dirname(resolve(root, path)), { recursive: true });
    await writeFile(resolve(root, path), value, "utf8");
  }
}
