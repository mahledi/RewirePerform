#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const checkOnly = process.argv.includes("--check");
const base = "docs/feedback-intelligence/contracts/combined-staging-postdeploy-v0.1";
const evidencePath = `${base}/postdeploy-evidence.json`;
const manifestPath = `${base}/producer-package-manifest.json`;
const auditResultPath = `${base}/remote-audit-result-2026-08-10.json`;
const schemaPath = `${base}/evidence.schema.json`;
const generatorPath = "scripts/generate-feedback-combined-staging-postdeploy.mjs";
const testPath = "src/test/feedbackIntelligenceCombinedStagingPostdeploy.test.ts";
const handoffPath = "docs/feedback-intelligence/COMBINED_STAGING_POSTDEPLOY_V1_1.md";
const auditSqlPath = "docs/feedback-intelligence/contracts/staging-privilege-audit-v0.2/audit.sql";
const predeployEvidencePath = "docs/feedback-intelligence/contracts/combined-staging-predeploy-v0.1/evidence.json";
const predeployManifestPath = "docs/feedback-intelligence/contracts/combined-staging-predeploy-v0.1/producer-package-manifest.json";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const bytes = (path) => readFile(resolve(root, path));

const migrations = [
  {
    remote_version: "20260810114642",
    name: "feedback_text_consent_notice_v1_1",
    local_path: "supabase/migrations/20260810122000_feedback_text_consent_notice_v1_1.sql",
    local_sha256: "50eea80f6977972c921429db697e295dfe6134c74ea8a480c937537f549e9f6f",
    applied: true,
  },
  {
    remote_version: "20260810114651",
    name: "guardian_feedback_text_notice_v1_1",
    local_path: "supabase/migrations/20260810122100_guardian_feedback_text_notice_v1_1.sql",
    local_sha256: "3663a7f385cbf168aac2d200ced3a7aa68906de5f736a1a768e401480e1788d1",
    applied: true,
  },
  {
    remote_version: "20260810114708",
    name: "feedback_intelligence_transfer_pulse_count_v0_2_1",
    local_path: "supabase/migrations/20260810122749_feedback_intelligence_transfer_pulse_count_v0_2_1.sql",
    local_sha256: "463bf24d04eb981fa6509b47e0ce97487d8f51061f4ba514f652052399ab06e6",
    applied: true,
  },
];

const edgeFiles = [
  ["supabase/functions/mahleos-feedback-intelligence-read/index.ts", "b1e1cf077970011f6f62beef121ec617c94a4f37849163958bc1a2840199c384"],
  ["supabase/functions/_shared/boundedRequestBody.ts", "7a707eb6a54df88e2314439658aca1fb53f7c666f53d58fd6a1dfd241323568e"],
  ["supabase/functions/_shared/feedbackIntelligenceGatewayHttp.ts", "61690142b2ff292a2bc82d60327332a5e93479da529f5462504a5a344792f0d8"],
  ["supabase/functions/_shared/feedbackIntelligenceMachineAuthCore.ts", "78a3685d1b18e1fb5e70faf9fbc66dd6a419a5dc22a9cde18b78c9df6dda1ea1"],
  ["supabase/functions/_shared/feedbackIntelligenceMachineAuth.ts", "03dc6c5ba920be84957ff36bd9544188ff7a759b78b5a7c8e21e8859ee8cbc3c"],
  ["supabase/functions/_shared/feedbackIntelligenceDatabase.ts", "13b39c3b60f1abc973d0126a653185ec9506673b7ee428e358596e9719d8a2d5"],
];

const [auditResultBytes, auditSqlBytes, predeployEvidenceBytes, predeployManifestBytes] =
  await Promise.all([
    bytes(auditResultPath),
    bytes(auditSqlPath),
    bytes(predeployEvidencePath),
    bytes(predeployManifestPath),
  ]);
const audit = JSON.parse(auditResultBytes.toString("utf8"));
const predeploy = JSON.parse(predeployEvidenceBytes.toString("utf8"));
const predeployManifest = JSON.parse(predeployManifestBytes.toString("utf8"));

const expected = {
  auditSql: "7f7865f769f46bfab204c37d071ee743636fe183f6d6876a24557e51dc508bd3",
  predeployEvidence: "78caa5bd105045b5430391d70f2b905a82326f5f5e637d4cd85b5712e4d46c9e",
  predeployManifest: "6cb065724144a9d390432307cc524382269ce9611ffa4b607a2fb3b1cb28424e",
  predeployPackage: "8b27e88fb03081a751e2062ec263400b0736dc7d70e893c83ea2e3deefdf8e26",
  gatewayDefinition: "d08d3fbf17420570ad6e8f29f0e3e19717a874f19a767c8eb7c7656acf7aedfd",
  internalDefinition: "534d0d8770899566658b7efb68c6bc31cfecc068dcf5cf94c30f09143b2ab043",
  sourceManifest: "cd76527cbe5bd3accfc7b64c8860b2ad5a11042bcecb2f5b4722510255f2eb6a",
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(sha256(auditSqlBytes) === expected.auditSql, "Audit SQL pin drift");
assert(sha256(predeployEvidenceBytes) === expected.predeployEvidence, "Predeploy evidence drift");
assert(sha256(predeployManifestBytes) === expected.predeployManifest, "Predeploy manifest drift");
assert(predeployManifest.package_sha256 === expected.predeployPackage, "Predeploy package drift");
assert(predeploy.evidence_status === "PREPARED_FAIL_CLOSED_AWAITING_SEPARATE_STAGING_APPLY", "Predeploy status drift");

for (const migration of migrations) {
  const migrationBytes = await bytes(migration.local_path);
  assert(sha256(migrationBytes) === migration.local_sha256, `${migration.name}: migration byte drift`);
}
for (const [path, digest] of edgeFiles) {
  assert(sha256(await bytes(path)) === digest, `${path}: Edge source byte drift`);
}
const sourceManifest = sha256(edgeFiles.map(([path, digest]) => `${digest}  ${path}\n`).join(""));
assert(sourceManifest === expected.sourceManifest, "Edge source manifest drift");

assert(audit.project_ref === "zbeswjipayspgvcipzmx", "Remote audit target drift");
assert(audit.audit_phase === "POSTDEPLOY_ASSURANCE", "Remote audit phase drift");
assert(audit.contract_status === "METADATA_ONLY_UNSIGNED_NOT_ACTIVATED", "Remote audit status drift");
assert(audit.data_access?.catalog_metadata_only === true, "Remote audit is not metadata-only");
assert(audit.data_access?.application_rows_read === false, "Remote audit read application rows");
assert(audit.data_access?.application_functions_called === false, "Remote audit called an application function");
assert(audit.data_access?.database_mutated === false, "Remote audit mutated the database");

const evidence = audit.evidence;
assert(evidence.reader_role?.present === true, "Reader role missing");
for (const key of ["superuser", "inherit", "create_role", "create_db", "replication", "bypass_rls"]) {
  assert(evidence.reader_role[key] === false, `Reader role ${key} drift`);
}
assert(evidence.reader_role.can_login === true && evidence.reader_role.database_connect === true, "Reader login shell drift");
assert(evidence.gateway_function?.definition_sha256 === expected.gatewayDefinition, "Gateway definition drift");
assert(evidence.internal_export_function?.definition_sha256 === expected.internalDefinition, "Internal export definition drift");
assert(JSON.stringify(evidence.gateway_execute_matrix) === JSON.stringify({
  anon: false,
  authenticated: false,
  service_role: false,
  mahleos_feedback_reader: true,
}), "Gateway execute matrix drift");
assert(evidence.reader_callable_functions?.length === 1, "Reader function allowlist drift");
assert(evidence.reader_callable_functions[0]?.function_name === "read_feedback_intelligence_v0_2_draft", "Reader function target drift");
assert(evidence.reader_relation_privileges?.length === 0, "Reader has relation privileges");
assert(evidence.reader_sequence_privileges?.length === 0, "Reader has sequence privileges");
assert(JSON.stringify(evidence.reader_schema_usage) === JSON.stringify(["public"]), "Reader schema usage drift");
assert(evidence.public_execute_defaults?.length === 0, "PUBLIC default execute path exists");
const unapprovedPaths = (evidence.denied_role_machine_paths ?? []).filter((path) => !(
  path.subject_role === "authenticated"
  && path.schema_name === "public"
  && path.function_name === "get_admin_feedback_intelligence_insights"
  && path.identity_arguments === "text"
  && path.definition_sha256 === "9beef5048a25069c5fe381232dc81414ab3d62e300629a5fbf1a986e4c8d38ca"
));
assert(unapprovedPaths.length === 0, "Unapproved Machine/Export side path exists");

const postdeployEvidence = {
  schema_version: "rewireperform-feedback-intelligence-combined-staging-postdeploy-v1",
  evidence_status: "PASS_POSTDEPLOY_ASSURANCE_UNSIGNED_AWAITING_CONSUMER_REVIEW",
  target: {
    project_ref: "zbeswjipayspgvcipzmx",
    project_name: "RewirePerform Staging",
    region: "eu-central-1",
    environment: "staging",
    jurisdiction: "DE",
    data_scope: "synthetic_only",
  },
  accepted_predeploy: {
    producer_commit: "1e4f3581d7d9c174fa65bf7d3475b78955b9f4c8",
    evidence_sha256: expected.predeployEvidence,
    manifest_sha256: expected.predeployManifest,
    package_sha256: expected.predeployPackage,
    consumer_commit: "d349421da0a5fb137ce2cb121654c78a0cda4b42",
    consumer_acceptance_sha256: "079129b700d1a33025ea49480334eabc2aa8d9923f6d2fce233a3db79b60d235",
  },
  remote_migrations: migrations,
  database_assurance: {
    executed_at: audit.executed_at,
    audit_phase: audit.audit_phase,
    audit_result_path: auditResultPath,
    audit_result_sha256: sha256(auditResultBytes),
    audit_sql_sha256: expected.auditSql,
    application_rows_read: false,
    application_functions_called: false,
    database_mutated: false,
    contract_version: "0.2.1-draft",
    schema_version: "rewire-feedback-intelligence-export-v0.2.1-draft",
    contract_status: "PRODUCER_CONFIRMED_DRAFT_NOT_ACTIVATED",
    activation_flags_closed: true,
    four_draft_campaigns_pinned: true,
    guardian_draft_exact: true,
    reader_password_is_null: true,
    standard_runtime_execute_denied: true,
    reader_execute_allowlisted: true,
    reader_direct_relation_privileges: 0,
    reader_direct_sequence_privileges: 0,
    function_definition_sha256: {
      gateway: expected.gatewayDefinition,
      internal_export: expected.internalDefinition,
    },
  },
  edge_assurance: {
    slug: "mahleos-feedback-intelligence-read",
    deployment_id: "4579d2b9-16c9-4387-be84-d5a5b440265e",
    observed_version: 25,
    status: "ACTIVE",
    verify_jwt: false,
    ezbr_sha256: "ff2e9862d07cf237f906c861e0c81e9760f6d56f8a3f3a0251cdeeb9e9c8900c",
    source_file_count: 6,
    source_manifest_sha256: expected.sourceManifest,
    deployed_source_byte_match: true,
  },
  advisor_assurance: {
    security_errors: 0,
    performance_errors: 0,
    new_block_finding: false,
    private_tables_have_client_privileges: false,
    intentional_private_rls_info_count: 3,
  },
  gates: {
    feedback_collection_enabled: false,
    text_collection_enabled: false,
    minor_policy_enabled: false,
    guardian_policy_enabled: false,
    consumer_pin_enabled: false,
    synthetic_export_enabled: false,
    reader_password_provisioned: false,
    machine_key_provisioned_by_this_gate: false,
    credential_mutation_performed: false,
    network_read_performed: false,
    export_function_called: false,
    production_export_enabled: false,
    real_data_read_enabled: false,
    push_performed: false,
    merge_performed: false,
    app_store_release_authorized: false,
  },
  next_gate: {
    decision: "AWAITING_CONSUMER_POSTDEPLOY_REVIEW",
    consumer_review_required: true,
    credentials_allowed: false,
    network_read_allowed: false,
    production_allowed: false,
  },
};

const evidenceSerialized = `${JSON.stringify(postdeployEvidence, null, 2)}\n`;
const packageFiles = [
  [evidencePath, Buffer.from(evidenceSerialized)],
  [schemaPath, await bytes(schemaPath)],
  [generatorPath, await bytes(generatorPath)],
  [testPath, await bytes(testPath)],
  [handoffPath, await bytes(handoffPath)],
  [auditResultPath, auditResultBytes],
];
const files = packageFiles.map(([path, value]) => ({ path, sha256: sha256(value) }));
const manifest = {
  schema_version: "rewireperform-feedback-intelligence-combined-staging-postdeploy-package-v1",
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
    console.error("Combined Staging postdeploy evidence drift");
    process.exit(1);
  }
  console.log(JSON.stringify({
    status: postdeployEvidence.evidence_status,
    evidence_sha256: sha256(currentEvidence),
    manifest_sha256: sha256(currentManifest),
    package_sha256: manifest.package_sha256,
    migrations_applied: postdeployEvidence.remote_migrations.length,
    edge_source_byte_match: postdeployEvidence.edge_assurance.deployed_source_byte_match,
    application_rows_read: postdeployEvidence.database_assurance.application_rows_read,
    network_read_performed: postdeployEvidence.gates.network_read_performed,
    all_runtime_and_production_gates_closed: Object.entries(postdeployEvidence.gates)
      .filter(([key]) => key.endsWith("enabled") || key.endsWith("performed") || key.endsWith("provisioned") || key.endsWith("authorized"))
      .every(([, value]) => value === false),
  }, null, 2));
} else {
  await writeFile(resolve(root, evidencePath), evidenceSerialized, "utf8");
  await writeFile(resolve(root, manifestPath), manifestSerialized, "utf8");
  console.log(`${evidencePath} and ${manifestPath} written`);
}
