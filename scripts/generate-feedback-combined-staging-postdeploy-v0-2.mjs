#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const checkOnly = process.argv.includes("--check");
const base = "docs/feedback-intelligence/contracts/combined-staging-postdeploy-v0.2";
const evidencePath = `${base}/postdeploy-evidence.json`;
const manifestPath = `${base}/producer-package-manifest.json`;
const auditResultPath = `${base}/remote-audit-result-2026-08-10-v0-3-3.json`;
const schemaPath = `${base}/evidence.schema.json`;
const generatorPath = "scripts/generate-feedback-combined-staging-postdeploy-v0-2.mjs";
const testPath = "src/test/feedbackIntelligenceCombinedStagingPostdeployV02.test.ts";
const handoffPath = "docs/feedback-intelligence/COMBINED_STAGING_POSTDEPLOY_V0_3_3_V1_1.md";
const auditSqlPath = "docs/feedback-intelligence/contracts/staging-privilege-audit-v0.2/audit.sql";
const migrationPath = "supabase/migrations/20260810154932_feedback_intelligence_visualization_copy_v1_1_2.sql";
const predeployEvidencePath = "docs/feedback-intelligence/contracts/combined-staging-predeploy-v0.2/evidence.json";
const predeployManifestPath = "docs/feedback-intelligence/contracts/combined-staging-predeploy-v0.2/producer-package-manifest.json";
const semanticsManifestPath = "docs/feedback-intelligence/contracts/v0.3/producer-package-manifest.json";
const exportManifestPath = "docs/feedback-intelligence/contracts/v0.2.1/producer-package-manifest.json";
const exportSchemaPath = "docs/feedback-intelligence/contracts/v0.2.1/proposed-export.schema.json";
const gatewayContractPath = "docs/feedback-intelligence/contracts/machine-gateway-v0.1/gateway-contract.json";
const gatewayManifestPath = "docs/feedback-intelligence/contracts/machine-gateway-v0.1/producer-package-manifest.json";
const requestSchemaPath = "docs/feedback-intelligence/contracts/machine-gateway-v0.1/request.schema.json";
const historicalPostdeployPath = "docs/feedback-intelligence/contracts/combined-staging-postdeploy-v0.1/postdeploy-evidence.json";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const bytes = (path) => readFile(resolve(root, path));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const pins = {
  appleRc: "f23aac2d1dd27d9f9bbcce2c690f7c14478d6969",
  predeployIntegration: "0a459a511d5271597294c0d926e05568ccaabbef",
  predeployEvidence: "c7beb25bc3af8278835029aa9bc1b6cdd78d598969f2eac7757da7cee8e97984",
  predeployManifest: "a39a0836dcfdd8b93e7ab785f056c8946a8b59ebed1220c32197a31675fb8cfa",
  predeployPackage: "ce262b8af6cef042e82ada1b1ddd5f54262dbaa0b621908b58eabf3735d4f2dc",
  predeployConsumerCommit: "59e84cb70f07cb2e51c09e267d2d209aaf805421",
  predeployConsumerAcceptance: "cf352c7af509cd3ff1b61039e1437059d574697713e05b30e0cfa0224013554d",
  auditSql: "7f7865f769f46bfab204c37d071ee743636fe183f6d6876a24557e51dc508bd3",
  migration: "d7160cb28eb64529ba95fe4c9d47ceab352dc194cc105b6194670a9479a265a9",
  semanticsManifest: "eccdf05956b68d457d3fc2135e3984d2b56242e4742fc3379152587bc5e7c33f",
  semanticsPackage: "c5df75dd0ddbf717b039e1c809d9e06b06219b7e55e1d4384886a07496e210d5",
  exportManifest: "89298e177f65a7f517e9cc930c0dc9e0af588875117bf4449e7898200e31dfab",
  exportPackage: "8c1bd5807865c41c7572ddd47872bca355515f99a4f7ef1f17a017d1bd35794b",
  exportSchema: "e90eb3fc2ce717ef91ae35bcfcd5bc7944d3cc941faa8f071b42e934e967023d",
  gatewayManifest: "bc69e224b22e568269a74eff7d021533075dab931fb8adf6bc212f79a58d9f0e",
  gatewayPackage: "5828858602b3a28374b6e11ea5c80649f908eef2f1c0527f1382a39d2b477ed0",
  requestSchema: "74e3616a67975766b51238d5573671d8e086014392d0e59e3ee9696ab287d204",
  gatewayDefinition: "d08d3fbf17420570ad6e8f29f0e3e19717a874f19a767c8eb7c7656acf7aedfd",
  internalDefinition: "534d0d8770899566658b7efb68c6bc31cfecc068dcf5cf94c30f09143b2ab043",
  edgeSource: "b1e1cf077970011f6f62beef121ec617c94a4f37849163958bc1a2840199c384",
  edgeSourceManifest: "cd76527cbe5bd3accfc7b64c8860b2ad5a11042bcecb2f5b4722510255f2eb6a",
  historicalPostdeploy: "3ff7ed70bf0523c0e23b5e1800a6c0143d4edcd6a6a215597a3c081919101b55",
};

const edgeFiles = [
  ["supabase/functions/mahleos-feedback-intelligence-read/index.ts", pins.edgeSource],
  ["supabase/functions/_shared/boundedRequestBody.ts", "7a707eb6a54df88e2314439658aca1fb53f7c666f53d58fd6a1dfd241323568e"],
  ["supabase/functions/_shared/feedbackIntelligenceGatewayHttp.ts", "61690142b2ff292a2bc82d60327332a5e93479da529f5462504a5a344792f0d8"],
  ["supabase/functions/_shared/feedbackIntelligenceMachineAuthCore.ts", "78a3685d1b18e1fb5e70faf9fbc66dd6a419a5dc22a9cde18b78c9df6dda1ea1"],
  ["supabase/functions/_shared/feedbackIntelligenceMachineAuth.ts", "03dc6c5ba920be84957ff36bd9544188ff7a759b78b5a7c8e21e8859ee8cbc3c"],
  ["supabase/functions/_shared/feedbackIntelligenceDatabase.ts", "13b39c3b60f1abc973d0126a653185ec9506673b7ee428e358596e9719d8a2d5"],
];

const campaignPins = [
  ["feedback-day-10-v1", "feedback-d10-v1.1.2", "48c2bf887ec96a0cc49eb327b380f7da7d163beb08929b9b359bfa0356692f2c"],
  ["feedback-day-24-v1", "feedback-d24-v1.1.2", "679f09ab0a4c08a0521404cbbef2d88a8f0121cb353c42f310a3f09cc20689e8"],
  ["feedback-day-39-v1", "feedback-d39-v1.1.2", "b566002d6f1d0c74f1eafb8554f370fa7f409f871473717079a478ad7b238b44"],
  ["feedback-day-55-v1", "feedback-d55-v1.1.2", "b8b1eb9e97348090e2993ee634dc0616228f6c1138b450174d132f48b1029600"],
];

const inputPaths = [
  auditResultPath,
  auditSqlPath,
  migrationPath,
  predeployEvidencePath,
  predeployManifestPath,
  semanticsManifestPath,
  exportManifestPath,
  exportSchemaPath,
  gatewayContractPath,
  gatewayManifestPath,
  requestSchemaPath,
  historicalPostdeployPath,
];
const inputValues = Object.fromEntries(await Promise.all(inputPaths.map(async (path) => [path, await bytes(path)])));
const audit = JSON.parse(inputValues[auditResultPath].toString("utf8"));
const predeploy = JSON.parse(inputValues[predeployEvidencePath].toString("utf8"));
const predeployManifest = JSON.parse(inputValues[predeployManifestPath].toString("utf8"));
const semanticsManifest = JSON.parse(inputValues[semanticsManifestPath].toString("utf8"));
const exportManifest = JSON.parse(inputValues[exportManifestPath].toString("utf8"));
const gatewayManifest = JSON.parse(inputValues[gatewayManifestPath].toString("utf8"));

for (const [path, expected] of [
  [auditSqlPath, pins.auditSql],
  [migrationPath, pins.migration],
  [predeployEvidencePath, pins.predeployEvidence],
  [predeployManifestPath, pins.predeployManifest],
  [semanticsManifestPath, pins.semanticsManifest],
  [exportManifestPath, pins.exportManifest],
  [exportSchemaPath, pins.exportSchema],
  [gatewayManifestPath, pins.gatewayManifest],
  [requestSchemaPath, pins.requestSchema],
  [historicalPostdeployPath, pins.historicalPostdeploy],
]) {
  assert(sha256(inputValues[path]) === expected, `${path}: byte pin drift`);
}
assert(predeployManifest.package_sha256 === pins.predeployPackage, "Predeploy package pin drift");
assert(semanticsManifest.package_sha256 === pins.semanticsPackage, "Semantics package pin drift");
assert(exportManifest.package_sha256 === pins.exportPackage, "Export package pin drift");
assert(gatewayManifest.package_sha256 === pins.gatewayPackage, "Gateway package pin drift");
assert(predeploy.evidence_status === "PREPARED_FAIL_CLOSED_V0_3_3_AWAITING_SINGLE_REGISTRY_MIGRATION_APPLY", "Predeploy status drift");
assert(predeploy.staging_delta.pending_migrations.length === 1, "Predeploy migration count drift");

for (const [path, digest] of edgeFiles) {
  assert(sha256(await bytes(path)) === digest, `${path}: Edge byte drift`);
}
assert(
  sha256(edgeFiles.map(([path, digest]) => `${digest}  ${path}\n`).join("")) === pins.edgeSourceManifest,
  "Edge source manifest drift",
);

assert(audit.project_ref === "zbeswjipayspgvcipzmx", "Audit target drift");
assert(audit.executed_at === "2026-08-10T18:33:18.574371+00:00", "Audit time drift");
assert(audit.audit_phase === "POSTDEPLOY_ASSURANCE", "Audit phase drift");
assert(audit.contract_status === "METADATA_ONLY_UNSIGNED_NOT_ACTIVATED", "Audit status drift");
assert(audit.data_access.catalog_metadata_only === true, "Audit is not metadata-only");
assert(audit.data_access.application_rows_read === false, "Audit read application rows");
assert(audit.data_access.application_functions_called === false, "Audit called an application function");
assert(audit.data_access.database_mutated === false, "Audit mutated the database");

const observed = audit.evidence;
assert(observed.gateway_function.definition_sha256 === pins.gatewayDefinition, "Gateway definition drift");
assert(observed.internal_export_function.definition_sha256 === pins.internalDefinition, "Internal export definition drift");
assert(JSON.stringify(observed.gateway_execute_matrix) === JSON.stringify({
  anon: false,
  authenticated: false,
  service_role: false,
  mahleos_feedback_reader: true,
}), "Gateway execute matrix drift");
assert(observed.reader_callable_functions.length === 1, "Reader RPC allowlist drift");
assert(observed.reader_callable_functions[0].function_name === "read_feedback_intelligence_v0_2_draft", "Reader RPC target drift");
assert(observed.reader_relation_privileges.length === 0, "Reader relation privilege drift");
assert(observed.reader_sequence_privileges.length === 0, "Reader sequence privilege drift");
assert(observed.public_execute_defaults.length === 0, "PUBLIC execute default drift");
assert(observed.draft_campaigns.length === 4, "Draft campaign count drift");
for (const [reference, questionnaire, digest] of campaignPins) {
  const campaign = observed.draft_campaigns.find((entry) => entry.campaign_reference === reference);
  assert(campaign?.content_version === "feedback-intelligence-content-v1.1.2", `${reference}: content version drift`);
  assert(campaign?.questionnaire_version === questionnaire, `${reference}: questionnaire version drift`);
  assert(campaign?.questionnaire_manifest_hash === digest, `${reference}: questionnaire hash drift`);
  assert(campaign?.status === "draft", `${reference}: campaign activation drift`);
}

const evidence = {
  schema_version: "rewireperform-feedback-intelligence-combined-staging-postdeploy-v2",
  evidence_status: "PASS_V0_3_3_POSTDEPLOY_ASSURANCE_UNSIGNED_AWAITING_CONSUMER_REVIEW",
  target: {
    project_ref: "zbeswjipayspgvcipzmx",
    environment: "staging",
    region: "eu-central-1",
    jurisdiction: "DE",
    data_scope: "synthetic_only",
  },
  producer_basis: {
    apple_rc_commit: pins.appleRc,
    predeploy_integration_commit: pins.predeployIntegration,
    repository_state: "PINNED_COMMITTED_INPUTS",
  },
  accepted_predeploy: {
    evidence_sha256: pins.predeployEvidence,
    manifest_sha256: pins.predeployManifest,
    package_sha256: pins.predeployPackage,
    consumer_commit: pins.predeployConsumerCommit,
    consumer_acceptance_sha256: pins.predeployConsumerAcceptance,
  },
  remote_registry_migration: {
    remote_version: "20260810183222",
    name: "feedback_intelligence_visualization_copy_v1_1_2",
    local_path: migrationPath,
    local_sha256: pins.migration,
    applied: true,
  },
  database_assurance: {
    executed_at: audit.executed_at,
    audit_phase: audit.audit_phase,
    audit_result_path: auditResultPath,
    audit_result_sha256: sha256(inputValues[auditResultPath]),
    audit_sql_sha256: pins.auditSql,
    application_rows_read: false,
    application_functions_called: false,
    database_mutated: false,
    draft_campaigns: observed.draft_campaigns,
    reader_direct_relation_privileges: 0,
    reader_direct_sequence_privileges: 0,
    reader_callable_function_count: 1,
    gateway_execute_matrix: observed.gateway_execute_matrix,
    public_execute_default_count: 0,
  },
  runtime_assurance: {
    export_manifest_sha256: pins.exportManifest,
    export_package_sha256: pins.exportPackage,
    export_schema_sha256: pins.exportSchema,
    gateway_request_schema_sha256: pins.requestSchema,
    gateway_definition_sha256: pins.gatewayDefinition,
    internal_export_definition_sha256: pins.internalDefinition,
    export_unchanged: true,
    request_schema_unchanged: true,
    gateway_definition_unchanged: true,
    internal_export_definition_unchanged: true,
  },
  edge_assurance: {
    slug: "mahleos-feedback-intelligence-read",
    observed_version: 25,
    status: "ACTIVE",
    source_sha256: pins.edgeSource,
    source_manifest_sha256: pins.edgeSourceManifest,
    source_unchanged: true,
    redeployed_for_v0_3_3: false,
  },
  historical_evidence: {
    v0_3_2_authorizes_v0_3_3: false,
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
    reader_password_provisioned_by_this_gate: false,
    machine_key_provisioned_by_this_gate: false,
    credential_mutation_performed: false,
    network_read_performed: false,
    export_function_called: false,
    production_export_enabled: false,
    real_data_read_enabled: false,
    additional_database_write_performed: false,
    edge_deploy_performed: false,
    push_performed: false,
    merge_performed: false,
    app_store_release_authorized: false,
  },
  next_gate: {
    decision: "AWAITING_JARVIS_V0_3_3_POSTDEPLOY_REVIEW",
    consumer_review_required: true,
    credentials_allowed: false,
    network_read_allowed: false,
    production_allowed: false,
  },
};

const evidenceSerialized = `${JSON.stringify(evidence, null, 2)}\n`;
const packagePaths = [
  schemaPath,
  generatorPath,
  testPath,
  handoffPath,
  auditResultPath,
  auditSqlPath,
  migrationPath,
  predeployEvidencePath,
  predeployManifestPath,
  semanticsManifestPath,
  exportManifestPath,
  exportSchemaPath,
  gatewayContractPath,
  gatewayManifestPath,
  requestSchemaPath,
  historicalPostdeployPath,
  ...edgeFiles.map(([path]) => path),
];
const packageFiles = [[evidencePath, Buffer.from(evidenceSerialized)]];
for (const path of packagePaths) packageFiles.push([path, await bytes(path)]);
const files = packageFiles.map(([path, value]) => ({ path, sha256: sha256(value) }));
const manifest = {
  schema_version: "rewireperform-feedback-intelligence-combined-staging-postdeploy-package-v2",
  package_status: "SANITIZED_UNSIGNED_V0_3_3_AWAITING_CONSUMER_POSTDEPLOY_REVIEW",
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
    console.error("Combined Staging v0.3.3 postdeploy evidence drift");
    process.exit(1);
  }
  console.log(JSON.stringify({
    status: evidence.evidence_status,
    evidence_sha256: sha256(currentEvidence),
    manifest_sha256: sha256(currentManifest),
    package_sha256: manifest.package_sha256,
    exact_registry_migrations_applied: 1,
    runtime_bytes_unchanged: true,
    edge_version_unchanged: true,
    application_rows_read: false,
    all_external_gates_closed: Object.values(evidence.gates).every((value) => value === false),
  }, null, 2));
  process.exit(0);
}

await Promise.all([
  writeFile(resolve(root, evidencePath), evidenceSerialized),
  writeFile(resolve(root, manifestPath), manifestSerialized),
]);
console.log(`Generated ${evidencePath}`);
console.log(`Generated ${manifestPath}`);
