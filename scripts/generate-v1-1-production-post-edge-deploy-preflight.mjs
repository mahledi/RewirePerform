#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = process.cwd();
const checkOnly = process.argv.includes("--check");
const base = "docs/feedback-intelligence/contracts/production-post-edge-deploy-preflight-v0.1";
const evidencePath = `${base}/evidence.json`;
const schemaPath = `${base}/evidence.schema.json`;
const manifestPath = `${base}/producer-package-manifest.json`;
const generatorPath = "scripts/generate-v1-1-production-post-edge-deploy-preflight.mjs";
const testPath = "src/test/v11ProductionPostEdgeDeployPreflight.test.ts";
const handoffPath = "docs/feedback-intelligence/PRODUCTION_POST_EDGE_DEPLOY_PREFLIGHT_V1_1.md";
const observedAt = "2026-08-13T11:59:14Z";
const readerObservedAt = "2026-08-13T11:20:16Z";
const projectRef = "bqsbxesmybthwtxmowfz";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const serialize = (value) => `${JSON.stringify(value, null, 2)}\n`;

const feedbackSecrets = [
  "MAHLEOS_FEEDBACK_PRODUCTION_MACHINE_KEY",
  "MAHLEOS_FEEDBACK_PRODUCTION_MACHINE_KEY_PREVIOUS",
  "MAHLEOS_FEEDBACK_PRODUCTION_READER_DATABASE_URL",
  "MAHLEOS_FEEDBACK_PRODUCTION_MACHINE_GATE",
  "MAHLEOS_FEEDBACK_PRODUCTION_REAL_DATA_GATE",
];
const organizationSecrets = [
  "TURNSTILE_SECRET_KEY",
  "ORGANIZATION_INQUIRY_ALLOWED_ORIGINS",
  "ORGANIZATION_INQUIRY_PUBLIC_ENABLED",
];

const functions = {
  "mahleos-feedback-intelligence-production-read": {
    id: "1daee0c6-0831-4136-80ca-796e7a7ac1e3",
    version: 1,
    status: "ACTIVE",
    verify_jwt: false,
    deployment_digest_sha256: "32f1d1f2c847fec8cf31f5821ead3c8e7e3d977fdf7d039964280be07e50503c",
    remote_files: {
      "supabase/functions/mahleos-feedback-intelligence-production-read/index.ts": "71767f232ca00c7e3def5c51683b47c7512130fb538197cf879ff5027261d1ae",
      "supabase/functions/_shared/feedbackIntelligenceProductionMachineAuth.ts": "0f120f08fafc95a6373f563f196ccd0efd06d1b4e9743eae3e3d45478a856f00",
      "supabase/functions/_shared/feedbackIntelligenceMachineAuthCore.ts": "78a3685d1b18e1fb5e70faf9fbc66dd6a419a5dc22a9cde18b78c9df6dda1ea1",
      "supabase/functions/_shared/feedbackIntelligenceGatewayHttp.ts": "61690142b2ff292a2bc82d60327332a5e93479da529f5462504a5a344792f0d8",
      "supabase/functions/_shared/feedbackIntelligenceProductionDatabase.ts": "735c670c9e6ed4994d0b12b5d23d617f038a85674d2dde4a9c2cb97e9d11a5e4",
      "supabase/functions/_shared/boundedRequestBody.ts": "7a707eb6a54df88e2314439658aca1fb53f7c666f53d58fd6a1dfd241323568e",
    },
  },
  "submit-organization-access-request": {
    id: "a81e37b6-7e58-4a78-8f45-0da426a073d7",
    version: 2,
    status: "ACTIVE",
    verify_jwt: false,
    deployment_digest_sha256: "96a2d7bdbd97b17700198890afe747f6554ee412ac62718e2032785d1a6c583a",
    remote_files: {
      "supabase/functions/submit-organization-access-request/index.ts": "1b6d9600f81bfa97ef7c979a1e689df4f02c4cc3eb8b2ced2be8f8da1ed58234",
      "supabase/functions/_shared/supabaseService.ts": "5310e93594f4088266845f21472b6c6f77d3b67e8bc26191b916e84dc2c4cd9e",
      "supabase/functions/_shared/boundedRequestBody.ts": "7a707eb6a54df88e2314439658aca1fb53f7c666f53d58fd6a1dfd241323568e",
    },
  },
};

for (const deployed of Object.values(functions)) {
  for (const [path, expected] of Object.entries(deployed.remote_files)) {
    const local = await readFile(resolve(root, path));
    if (sha256(local) !== expected) throw new Error(`${path}: deployed source pin drift`);
  }
}

const closedGates = {
  feedback_credentials: false,
  feedback_machine_runtime: false,
  feedback_real_data: false,
  feedback_collection: false,
  feedback_comments: false,
  minor_feedback: false,
  guardian_feedback: false,
  real_jarvis: false,
  organization_inquiry_public: false,
  app_store_submission: false,
};

const evidence = {
  schema_version: "rewireperform-v1.1-production-post-edge-deploy-preflight-v1",
  status: "PASS_PRODUCTION_EDGE_DEPLOYED_CREDENTIALLESS_RUNTIME_CLOSED",
  observed_at: observedAt,
  project_ref: projectRef,
  migration_state: {
    remote_migration_count: 104,
    remote_versions_sha256: "f20873d87cd352ceed9460bf995d20fdde4b7e984c660983f81a5277b312981b",
  },
  edge_functions: functions,
  secret_presence: {
    source: "supabase-secrets-list-presence-only-v1",
    feedback: Object.fromEntries(feedbackSecrets.map((name) => [name, false])),
    organization: Object.fromEntries(organizationSecrets.map((name) => [name, false])),
    secret_values_read: false,
    secret_values_persisted: false,
    unrelated_secret_names_persisted: false,
  },
  reader_boundary: {
    observed_at: readerObservedAt,
    observation_reused_after_edge_only_deploy: true,
    role_name: "mahleos_feedback_production_reader",
    password_is_null: true,
    login: true,
    superuser: false,
    inherit: false,
    bypassrls: false,
    callable_rpc_count: 1,
    relation_privilege_count: 0,
    sequence_privilege_count: 0,
    public_callable_path_count: 0,
  },
  negative_http_matrix: [
    {
      function: "mahleos-feedback-intelligence-production-read",
      condition: "missing_machine_key",
      http_status: 503,
      response_code: "service_not_configured",
    },
    {
      function: "submit-organization-access-request",
      condition: "allowed_origin_runtime_closed",
      origin: "https://rewireperform.com",
      http_status: 503,
      response_code: "service_not_available",
    },
    {
      function: "submit-organization-access-request",
      condition: "www_allowed_origin_runtime_closed",
      origin: "https://www.rewireperform.com",
      http_status: 503,
      response_code: "service_not_available",
    },
    {
      function: "submit-organization-access-request",
      condition: "foreign_origin",
      origin: "https://example.com",
      http_status: 403,
      response_code: "origin_not_allowed",
    },
  ],
  privacy: {
    application_rows_read: false,
    application_values_persisted: false,
    database_mutated_by_audit: false,
    credential_values_read: false,
    credential_values_persisted: false,
  },
  gates: closedGates,
  authorization_boundary: {
    authorizes_credentials: false,
    authorizes_feedback_read: false,
    authorizes_organization_write: false,
    authorizes_production_activation: false,
    historical_pre_edge_evidence_authorizes_current_state: false,
  },
};

const falseObjectSchema = (keys) => ({
  type: "object",
  additionalProperties: false,
  required: keys,
  properties: Object.fromEntries(keys.map((key) => [key, { const: false }])),
});
const functionSchema = (slug, files) => ({
  type: "object",
  additionalProperties: false,
  required: ["id", "version", "status", "verify_jwt", "deployment_digest_sha256", "remote_files"],
  properties: {
    id: { type: "string", minLength: 1 },
    version: { const: functions[slug].version },
    status: { const: "ACTIVE" },
    verify_jwt: { const: false },
    deployment_digest_sha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
    remote_files: {
      type: "object",
      additionalProperties: false,
      required: Object.keys(files),
      properties: Object.fromEntries(Object.entries(files).map(([path, digest]) => [path, { const: digest }])),
    },
  },
  title: slug,
});
const schema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://rewireperform.com/contracts/production-post-edge-deploy-preflight-v0.1.schema.json",
  type: "object",
  additionalProperties: false,
  required: [
    "schema_version", "status", "observed_at", "project_ref", "migration_state",
    "edge_functions", "secret_presence", "reader_boundary", "negative_http_matrix",
    "privacy", "gates", "authorization_boundary",
  ],
  properties: {
    schema_version: { const: evidence.schema_version },
    status: { const: evidence.status },
    observed_at: { const: observedAt },
    project_ref: { const: projectRef },
    migration_state: {
      type: "object", additionalProperties: false,
      required: ["remote_migration_count", "remote_versions_sha256"],
      properties: {
        remote_migration_count: { const: 104 },
        remote_versions_sha256: { const: evidence.migration_state.remote_versions_sha256 },
      },
    },
    edge_functions: {
      type: "object", additionalProperties: false,
      required: Object.keys(functions),
      properties: Object.fromEntries(Object.entries(functions).map(([slug, value]) => [slug, functionSchema(slug, value.remote_files)])),
    },
    secret_presence: {
      type: "object", additionalProperties: false,
      required: ["source", "feedback", "organization", "secret_values_read", "secret_values_persisted", "unrelated_secret_names_persisted"],
      properties: {
        source: { const: evidence.secret_presence.source },
        feedback: falseObjectSchema(feedbackSecrets),
        organization: falseObjectSchema(organizationSecrets),
        secret_values_read: { const: false },
        secret_values_persisted: { const: false },
        unrelated_secret_names_persisted: { const: false },
      },
    },
    reader_boundary: {
      type: "object", additionalProperties: false,
      required: Object.keys(evidence.reader_boundary),
      properties: {
        role_name: { const: evidence.reader_boundary.role_name },
        observed_at: { const: readerObservedAt },
        observation_reused_after_edge_only_deploy: { const: true },
        password_is_null: { const: true }, login: { const: true },
        superuser: { const: false }, inherit: { const: false }, bypassrls: { const: false },
        callable_rpc_count: { const: 1 }, relation_privilege_count: { const: 0 },
        sequence_privilege_count: { const: 0 }, public_callable_path_count: { const: 0 },
      },
    },
    negative_http_matrix: { const: evidence.negative_http_matrix },
    privacy: {
      type: "object", additionalProperties: false,
      required: Object.keys(evidence.privacy),
      properties: Object.fromEntries(Object.entries(evidence.privacy).map(([key, value]) => [key, { const: value }])),
    },
    gates: falseObjectSchema(Object.keys(closedGates)),
    authorization_boundary: falseObjectSchema(Object.keys(evidence.authorization_boundary)),
  },
};

const generated = {
  [evidencePath]: serialize(evidence),
  [schemaPath]: serialize(schema),
};
const packagePaths = [evidencePath, schemaPath, generatorPath, testPath, handoffPath];
const files = [];
const digestInput = [];
for (const path of packagePaths) {
  const bytes = generated[path] ?? await readFile(resolve(root, path));
  const digest = sha256(bytes);
  files.push({ path, sha256: digest });
  digestInput.push(`${digest}  ${path}\n`);
}
const manifest = {
  schema_version: "rewireperform-v1.1-production-post-edge-deploy-preflight-package-v1",
  status: evidence.status,
  observed_at: observedAt,
  package_sha256: sha256(digestInput.join("")),
  files,
  gates: closedGates,
};
const outputs = { ...generated, [manifestPath]: serialize(manifest) };

if (checkOnly) {
  for (const [path, expected] of Object.entries(outputs)) {
    const current = await readFile(resolve(root, path), "utf8");
    if (current !== expected) throw new Error(`${path}: generated preflight drift`);
  }
  console.log(JSON.stringify({
    status: evidence.status,
    evidence_sha256: sha256(generated[evidencePath]),
    package_sha256: manifest.package_sha256,
    all_gates_closed: Object.values(closedGates).every((value) => value === false),
  }, null, 2));
} else {
  for (const [path, value] of Object.entries(outputs)) {
    await mkdir(dirname(resolve(root, path)), { recursive: true });
    await writeFile(resolve(root, path), value, "utf8");
  }
}
