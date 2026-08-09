#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const checkOnly = process.argv.includes("--check");
const base = "docs/feedback-intelligence/contracts/staging-postdeploy-assurance-v0.2";
const resultPath = "docs/feedback-intelligence/contracts/staging-privilege-audit-v0.2/remote-staging-postdeploy-result-2026-08-09.json";
const auditPath = "docs/feedback-intelligence/contracts/staging-privilege-audit-v0.2/audit.sql";
const auditManifestPath = "docs/feedback-intelligence/contracts/staging-privilege-audit-v0.2/producer-package-manifest.json";
const gatewayManifestPath = "docs/feedback-intelligence/contracts/machine-gateway-v0.1/producer-package-manifest.json";
const releasePairPath = "docs/feedback-intelligence/contracts/staging-release-pair-v0.2/release-pair.json";
const migrationPath = "supabase/migrations/20260809093000_feedback_intelligence_declined_consent_export_remediation.sql";
const evidencePath = `${base}/postdeploy-evidence.json`;
const manifestPath = `${base}/producer-package-manifest.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const bytes = async (path) => readFile(resolve(root, path));

const [resultBytes, auditBytes, auditManifestBytes, gatewayManifestBytes, releasePairBytes, migrationBytes] =
  await Promise.all([
    bytes(resultPath),
    bytes(auditPath),
    bytes(auditManifestPath),
    bytes(gatewayManifestPath),
    bytes(releasePairPath),
    bytes(migrationPath),
  ]);
const result = JSON.parse(resultBytes.toString("utf8"));
const auditManifest = JSON.parse(auditManifestBytes.toString("utf8"));
const gatewayManifest = JSON.parse(gatewayManifestBytes.toString("utf8"));

const expected = {
  result: "087ed49f622cc6eca77177c31229601c1dafb72ba005365c2c14098518f48fb0",
  auditSql: "7f7865f769f46bfab204c37d071ee743636fe183f6d6876a24557e51dc508bd3",
  auditManifest: "8b2a98c143780056046a2d98d83b25786e58c31f800ffb726d20ff12528690b5",
  auditPackage: "06e86e836f8100a3e377a26d137881831aeaa456ecf1a8eaf13530a11863e4cf",
  gatewayManifest: "97b4caf3109650be74963587c1340ddd699e0aa80b6acf587da79cfdf0ed001d",
  gatewayPackage: "15c85f345592c7df3b0c700134ff5ab2c6b7b86b3ea64e4a7088168a488dbbbb",
  releasePair: "21028aba62cc882b6a57c65e7a039b64f980d15393c4d7757ece43fd7574b585",
  migration: "b82bdda5a60133e8ada310bfacdfbf50475f4a56d65668b41a3dcd96071ed2e6",
  gatewayDefinition: "0d617fcb5e5a7ece31ca94b7ff0cf07026712b0d9ed4206c95bee9f4b198a8af",
  internalDefinition: "89420ddf3f79ad57538f4fb1ad56458717874490ddbc88b52d577e081d3e872f",
};
const actual = {
  result: sha256(resultBytes),
  auditSql: sha256(auditBytes),
  auditManifest: sha256(auditManifestBytes),
  auditPackage: auditManifest.package_sha256,
  gatewayManifest: sha256(gatewayManifestBytes),
  gatewayPackage: gatewayManifest.package_sha256,
  releasePair: sha256(releasePairBytes),
  migration: sha256(migrationBytes),
  gatewayDefinition: result.evidence?.gateway_function?.definition_sha256,
  internalDefinition: result.evidence?.internal_export_function?.definition_sha256,
};
for (const [key, digest] of Object.entries(expected)) {
  if (actual[key] !== digest) throw new Error(`${key} pin drift: ${actual[key]}`);
}
if (
  result.audit_phase !== "POSTDEPLOY_ASSURANCE" ||
  result.data_access?.catalog_metadata_only !== true ||
  result.data_access?.application_rows_read !== false ||
  result.data_access?.application_functions_called !== false ||
  result.data_access?.database_mutated !== false
) throw new Error("Remote result scope/status drift");

const evidence = {
  schema_version: "rewireperform-feedback-intelligence-staging-postdeploy-assurance-v2",
  contract_status: "PASS_POSTDEPLOY_ASSURANCE_UNSIGNED_AWAITING_CONSUMER_REVIEW",
  target_project_ref: "zbeswjipayspgvcipzmx",
  remote_migration: {
    version: "20260809113253",
    name: "feedback_intelligence_declined_consent_export_remediation",
    local_path: migrationPath,
    local_sha256: expected.migration,
    applied: true,
  },
  database_assurance: {
    executed_at: result.executed_at,
    audit_phase: result.audit_phase,
    validator_status: "PASS_POSTDEPLOY_ASSURANCE",
    result_path: resultPath,
    result_sha256: expected.result,
    audit_sql_sha256: expected.auditSql,
    audit_package_manifest_sha256: expected.auditManifest,
    audit_package_sha256: expected.auditPackage,
    application_rows_read: false,
    application_functions_called: false,
    database_mutated: false,
    function_definition_sha256: {
      gateway: expected.gatewayDefinition,
      internal_export: expected.internalDefinition,
    },
  },
  edge_assurance: {
    slug: "mahleos-feedback-intelligence-read",
    deployment_id: "4579d2b9-16c9-4387-be84-d5a5b440265e",
    observed_version: 11,
    status: "ACTIVE",
    verify_jwt: false,
    ezbr_sha256: "952c86471d41377314d53c1663716717957519132233ddd7abf6aee68c7be8ee",
    source_file_count: 6,
    source_manifest_sha256: "97d6714a8871f510996cfd39fc23505fde0f5b82a02e1acfd4627f201eecbf91",
    deployed_source_byte_match: true,
    redeployed_in_this_gate: false,
  },
  approved_inputs: {
    producer_deployment_source_commit: "1e34e4559d6f5df5aab162f84786f8262ddedea8",
    producer_implementation_commit: "970f581fb855ecff432283f099de6b85a95fc564",
    gateway_manifest_sha256: expected.gatewayManifest,
    gateway_package_sha256: expected.gatewayPackage,
    release_pair_sha256: expected.releasePair,
    consumer_acceptance_commit: "abfc59fe92d33b5f5ef8a36626ba89c92a5d4de0",
    consumer_acceptance_sha256: "52faaedc994af43b2c0f0c99cb11680072e2581dedcfddf04fcfc2bbd4d71b51",
  },
  external_gates: {
    consumer_postdeploy_review_required: true,
    credentials_provisioned: false,
    reader_password_provisioned: false,
    network_read_performed: false,
    production_approved: false,
    real_data_read: false,
    push_performed: false,
    merge_performed: false,
  },
};
const evidenceSerialized = `${JSON.stringify(evidence, null, 2)}\n`;
const packageFiles = [
  [`${base}/postdeploy-evidence.json`, Buffer.from(evidenceSerialized)],
  [`${base}/evidence.schema.json`, await bytes(`${base}/evidence.schema.json`)],
  ["scripts/generate-feedback-staging-postdeploy-assurance-v0-2.mjs", await bytes("scripts/generate-feedback-staging-postdeploy-assurance-v0-2.mjs")],
  ["src/test/feedbackIntelligenceStagingPostdeployAssuranceV02.test.ts", await bytes("src/test/feedbackIntelligenceStagingPostdeployAssuranceV02.test.ts")],
  ["docs/feedback-intelligence/REMOTE_STAGING_POSTDEPLOY_ASSURANCE_V0_2_2026-08-09.md", await bytes("docs/feedback-intelligence/REMOTE_STAGING_POSTDEPLOY_ASSURANCE_V0_2_2026-08-09.md")],
  [resultPath, resultBytes],
];
const files = packageFiles.map(([path, value]) => ({ path, sha256: sha256(value) }));
const manifest = {
  schema_version: "rewireperform-feedback-intelligence-staging-postdeploy-assurance-package-v2",
  package_status: "SANITIZED_UNSIGNED_AWAITING_CONSUMER_POSTDEPLOY_REVIEW",
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
    console.error("Staging postdeploy assurance evidence drift");
    process.exit(1);
  }
  console.log(JSON.stringify({
    status: evidence.contract_status,
    evidence_sha256: sha256(currentEvidence),
    manifest_sha256: sha256(currentManifest),
    package_sha256: manifest.package_sha256,
    postdeploy_assurance: evidence.database_assurance.validator_status,
    consumer_review_required: evidence.external_gates.consumer_postdeploy_review_required,
    all_runtime_and_production_gates_closed: [
      evidence.external_gates.credentials_provisioned,
      evidence.external_gates.reader_password_provisioned,
      evidence.external_gates.network_read_performed,
      evidence.external_gates.production_approved,
      evidence.external_gates.real_data_read,
    ].every((value) => value === false),
  }, null, 2));
} else {
  await writeFile(resolve(root, evidencePath), evidenceSerialized, "utf8");
  await writeFile(resolve(root, manifestPath), manifestSerialized, "utf8");
  console.log(`${evidencePath} and ${manifestPath} written`);
}
