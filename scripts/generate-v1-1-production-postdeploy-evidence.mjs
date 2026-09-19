#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const checkOnly = process.argv.includes("--check");
const base = "docs/feedback-intelligence/contracts/production-postdeploy-assurance-v0.1";
const evidencePath = `${base}/postdeploy-evidence.json`;
const resultManifestPath = `${base}/postdeploy-result-manifest.json`;
const schemaPath = `${base}/postdeploy-evidence.schema.json`;
const generatorPath = "scripts/generate-v1-1-production-postdeploy-evidence.mjs";
const testPath = "src/test/v11ProductionPostdeployEvidence.test.ts";
const handoffPath = "docs/feedback-intelligence/PRODUCTION_POSTDEPLOY_ASSURANCE_V1_1.md";
const observedAt = "2026-08-13T11:20:16Z";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const serialize = (value) => `${JSON.stringify(value, null, 2)}\n`;

const observationPaths = {
  edge: `${base}/edge-presence-observation-2026-08-13.json`,
  secret: `${base}/secret-presence-observation-2026-08-13.json`,
  reader: `${base}/reader-role-observation-2026-08-13.json`,
  combined: `${base}/combined-control-plane-observation-2026-08-13.json`,
};
const secretNames = [
  "MAHLEOS_FEEDBACK_PRODUCTION_MACHINE_KEY",
  "MAHLEOS_FEEDBACK_PRODUCTION_MACHINE_KEY_PREVIOUS",
  "MAHLEOS_FEEDBACK_PRODUCTION_READER_DATABASE_URL",
  "MAHLEOS_FEEDBACK_PRODUCTION_MACHINE_GATE",
  "MAHLEOS_FEEDBACK_PRODUCTION_REAL_DATA_GATE",
];
const edgeObservation = {
  schema_version: "rewireperform-production-edge-presence-observation-v1",
  observed_at: observedAt,
  project_ref: "bqsbxesmybthwtxmowfz",
  source: "supabase-functions-list-metadata-v1",
  observed_slugs: {
    "mahleos-feedback-intelligence-production-read": false,
    "submit-organization-access-request": false,
  },
  application_rows_read: false,
};
const secretObservation = {
  schema_version: "rewireperform-production-secret-presence-observation-v1",
  observed_at: observedAt,
  project_ref: "bqsbxesmybthwtxmowfz",
  source: "supabase-secrets-list-presence-only-v1",
  expected_secret_names: secretNames,
  observed_presence: Object.fromEntries(secretNames.map((name) => [name, false])),
  secret_values_read: false,
  secret_values_persisted: false,
  unrelated_secret_names_persisted: false,
};
const readerObservation = {
  schema_version: "rewireperform-production-reader-role-observation-v1",
  observed_at: observedAt,
  project_ref: "bqsbxesmybthwtxmowfz",
  source: "postgres-catalog-metadata-audit-v1",
  role_name: "mahleos_feedback_production_reader",
  password_is_null: true,
  login: true,
  superuser: false,
  inherit: false,
  bypassrls: false,
  application_rows_read: false,
};
const combinedObservation = {
  schema_version: "rewireperform-production-postdeploy-control-plane-observation-v1",
  observed_at: observedAt,
  project_ref: "bqsbxesmybthwtxmowfz",
  contract: "rewireperform-production-postdeploy-control-plane-audit-v1",
  migration_count: 104,
  reader_password_is_null: true,
  collection_closed: true,
  machine_closed: true,
  private_function_count: 1,
  public_runtime_callable_count: 0,
  application_rows_read: false,
  database_mutated: false,
};
const observations = {
  [observationPaths.edge]: edgeObservation,
  [observationPaths.secret]: secretObservation,
  [observationPaths.reader]: readerObservation,
  [observationPaths.combined]: combinedObservation,
};
const observationBytes = Object.fromEntries(
  Object.entries(observations).map(([path, value]) => [path, serialize(value)]),
);
const observationSha = Object.fromEntries(
  Object.entries(observationBytes).map(([path, value]) => [path, sha256(value)]),
);
const gates = {
  database_apply_gate_open: false,
  edge_deploy: false,
  credentials: false,
  feedback_collection: false,
  feedback_comments: false,
  minor_feedback: false,
  real_jarvis: false,
  organization_inquiry_public: false,
  app_store_submission: false,
};
const evidence = {
  schema_version: "rewireperform-v1.1-production-postdeploy-assurance-evidence-v1",
  observed_at: observedAt,
  operator_result: {
    status: "PASS_V1_1_PRODUCTION_MIGRATIONS_APPLIED_RUNTIME_CLOSED",
    project_ref: "bqsbxesmybthwtxmowfz",
    source_package_sha256: "dffeace2c2e26436f6ceffba71a4938b7cafab26425b9a722be5136650c0657a",
    completed_migrations: 25,
    completed_versions_sha256: "42ea240bbf1289cc6772615584c311b5672953d2344baab7d041c1b4ede6c5ac",
    final_remote_migration_count: 104,
    final_remote_versions_sha256: "f20873d87cd352ceed9460bf995d20fdde4b7e984c660983f81a5277b312981b",
    target_audit_status: "PASS_V1_1_PERSISTENT_TARGET_METADATA_AUDIT",
    retry_count: 0,
    credential_persisted_by_operator: false,
    application_values_returned: false,
    runtime_activation_authorized: false,
  },
  control_plane: {
    final_remote_migration_count: 104,
    final_remote_versions_sha256: "f20873d87cd352ceed9460bf995d20fdde4b7e984c660983f81a5277b312981b",
    edge_presence_observation: {
      source: edgeObservation.source,
      observation_sha256: observationSha[observationPaths.edge],
      observed_slugs: edgeObservation.observed_slugs,
    },
    secret_presence_observation: {
      source: secretObservation.source,
      observation_sha256: observationSha[observationPaths.secret],
      expected_secret_names: secretNames,
      observed_presence: secretObservation.observed_presence,
      secret_values_read: false,
      secret_values_persisted: false,
      unrelated_secret_names_persisted: false,
    },
    reader_role_observation: {
      source: readerObservation.source,
      observation_sha256: observationSha[observationPaths.reader],
      role_name: readerObservation.role_name,
      password_is_null: true,
      application_rows_read: false,
    },
    combined_audit_provenance: {
      project_ref: combinedObservation.project_ref,
      contract: combinedObservation.contract,
      audit_sha256: observationSha[observationPaths.combined],
    },
  },
  privacy: {
    migration_application_rows_read: true,
    migration_application_read_scope: {
      "public.teams": ["id", "created_by"],
      "public.user_roles": ["user_id", "role"],
    },
    postdeploy_metadata_audit_application_rows_read: false,
    application_values_persisted: false,
    credential_value_persisted: false,
  },
  gates,
};
const generatedBytes = {
  [evidencePath]: serialize(evidence),
  ...observationBytes,
};
const packagePaths = [
  evidencePath,
  schemaPath,
  ...Object.keys(observations),
  generatorPath,
  testPath,
  handoffPath,
];
const files = [];
const digestInput = [];
for (const path of packagePaths) {
  const bytes = generatedBytes[path] ?? await readFile(resolve(root, path));
  const digest = sha256(bytes);
  files.push({ path, sha256: digest });
  digestInput.push(`${digest}  ${path}\n`);
}
const manifest = {
  schema_version: "rewireperform-v1.1-production-postdeploy-result-package-v1",
  status: "PASS_PRODUCTION_DATABASE_APPLIED_RUNTIME_GATES_CLOSED",
  observed_at: observedAt,
  package_sha256: sha256(digestInput.join("")),
  files,
  gates,
};
const outputs = {
  ...generatedBytes,
  [resultManifestPath]: serialize(manifest),
};
if (checkOnly) {
  for (const [path, expected] of Object.entries(outputs)) {
    const current = await readFile(resolve(root, path), "utf8");
    if (current !== expected) throw new Error(`${path}: generated evidence drift`);
  }
  console.log(JSON.stringify({
    status: manifest.status,
    evidence_sha256: sha256(generatedBytes[evidencePath]),
    package_sha256: manifest.package_sha256,
    all_runtime_gates_closed: Object.values(gates).every((value) => value === false),
  }, null, 2));
} else {
  for (const [path, value] of Object.entries(outputs)) {
    await writeFile(resolve(root, path), value, "utf8");
  }
}
