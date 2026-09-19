#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const checkOnly = process.argv.includes("--check");
const base = "docs/feedback-intelligence/contracts/synthetic-staging-one-read-v0.3";
const manifestPath = `${base}/producer-package-manifest.json`;
const paths = {
  readme: `${base}/README.md`,
  schema: `${base}/postread-evidence.schema.json`,
  provisioning: `${base}/provisioning-evidence-v0.3.3.json`,
  postprovision: `${base}/postprovision-metadata-audit-v0.3.3.json`,
  edge: `${base}/edge-request-evidence-v0.3.3.json`,
  postreadAudit: `${base}/postread-metadata-audit-v0.3.3.json`,
  postread: `${base}/postread-evidence-v0.3.3.json`,
  summary: `${base}/cycle-summary-v0.3.3.json`,
  orchestration: `${base}/orchestration-evidence-v0.3.3.json`,
  generator: "scripts/generate-feedback-intelligence-synthetic-cycle-v0-3.mjs",
  test: "src/test/feedbackIntelligenceSyntheticCycleV03.test.ts",
  handoff: "docs/feedback-intelligence/FEEDBACK_V0_3_3_SYNTHETIC_ONE_SHOT_HANDOFF_2026-08-11.md",
  preflightEvidence: "docs/feedback-intelligence/contracts/credentialless-staging-preflight-v0.2/preflight-evidence.json",
  preflightManifest: "docs/feedback-intelligence/contracts/credentialless-staging-preflight-v0.2/producer-package-manifest.json",
  postdeployEvidence: "docs/feedback-intelligence/contracts/combined-staging-postdeploy-v0.2/postdeploy-evidence.json",
  postdeployManifest: "docs/feedback-intelligence/contracts/combined-staging-postdeploy-v0.2/producer-package-manifest.json",
  semanticsManifest: "docs/feedback-intelligence/contracts/v0.3/producer-package-manifest.json",
  exportManifest: "docs/feedback-intelligence/contracts/v0.2.1/producer-package-manifest.json",
  exportSchema: "docs/feedback-intelligence/contracts/v0.2.1/proposed-export.schema.json",
  gatewayManifest: "docs/feedback-intelligence/contracts/machine-gateway-v0.1/producer-package-manifest.json",
  requestSchema: "docs/feedback-intelligence/contracts/machine-gateway-v0.1/request.schema.json",
};

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const bytes = (path) => readFile(resolve(root, path));
const parse = async (path) => JSON.parse((await bytes(path)).toString("utf8"));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const [
  provisioning,
  postprovision,
  edge,
  postreadAudit,
  postread,
  summary,
  orchestration,
  preflightManifest,
  postdeployManifest,
  semanticsManifest,
  exportManifest,
  gatewayManifest,
] = await Promise.all([
  parse(paths.provisioning),
  parse(paths.postprovision),
  parse(paths.edge),
  parse(paths.postreadAudit),
  parse(paths.postread),
  parse(paths.summary),
  parse(paths.orchestration),
  parse(paths.preflightManifest),
  parse(paths.postdeployManifest),
  parse(paths.semanticsManifest),
  parse(paths.exportManifest),
  parse(paths.gatewayManifest),
]);

const pins = {
  appleRc: "408b653953d2d9be7c29f8ada2924d7333746a62",
  operator: "d50b8967df8abd21cd581f752136ff5c3613a6ac",
  requestId: "1502b081-854f-4758-ba5a-2717ab09a766",
  preflightEvidence: "af4b0ea0b50474e314d4066503ce64d18a2f5570c6a7c81ed0efc783c82e645d",
  preflightManifest: "c2a5a45bff2d0ead25bcbd8324c721da09a9ece0d43c68a4b0372374f54250ea",
  preflightPackage: "fcd02e01e1c4a2e632d2d223999b2727db75c4dd772346a84de471b5556e7ca5",
  preflightAcceptance: "adcf46dbc00a5db16872b5ddf74fbe3a0dd86ddfabfa32917d7de1a857b373fd",
  postdeployEvidence: "cb48c6efaf4ac0da906608ac0191e749850693016a3d6379ae8a69acae8a6999",
  postdeployManifest: "39d3188144515cf48ac5ac7bdb3ad4275a3698ccf5430355b8cc59bdb01401d9",
  postdeployPackage: "2dc086363fd4bfe8523550471fa24548de838e57d9a53200226613b15f49e479",
  postdeployAcceptance: "0941fd066378e4e5ec16435dc2c789dde9476f9073e24921c695be49f6981164",
  semanticsManifest: "eccdf05956b68d457d3fc2135e3984d2b56242e4742fc3379152587bc5e7c33f",
  semanticsPackage: "c5df75dd0ddbf717b039e1c809d9e06b06219b7e55e1d4384886a07496e210d5",
  exportManifest: "89298e177f65a7f517e9cc930c0dc9e0af588875117bf4449e7898200e31dfab",
  exportPackage: "8c1bd5807865c41c7572ddd47872bca355515f99a4f7ef1f17a017d1bd35794b",
  exportSchema: "e90eb3fc2ce717ef91ae35bcfcd5bc7944d3cc941faa8f071b42e934e967023d",
  gatewayManifest: "bc69e224b22e568269a74eff7d021533075dab931fb8adf6bc212f79a58d9f0e",
  gatewayPackage: "5828858602b3a28374b6e11ea5c80649f908eef2f1c0527f1382a39d2b477ed0",
  requestSchema: "74e3616a67975766b51238d5573671d8e086014392d0e59e3ee9696ab287d204",
};

for (const [path, expected] of [
  [paths.preflightEvidence, pins.preflightEvidence],
  [paths.preflightManifest, pins.preflightManifest],
  [paths.postdeployEvidence, pins.postdeployEvidence],
  [paths.postdeployManifest, pins.postdeployManifest],
  [paths.semanticsManifest, pins.semanticsManifest],
  [paths.exportManifest, pins.exportManifest],
  [paths.exportSchema, pins.exportSchema],
  [paths.gatewayManifest, pins.gatewayManifest],
  [paths.requestSchema, pins.requestSchema],
]) {
  assert(sha256(await bytes(path)) === expected, `${path}: upstream byte pin drift`);
}
assert(preflightManifest.package_sha256 === pins.preflightPackage, "Preflight package drift");
assert(postdeployManifest.package_sha256 === pins.postdeployPackage, "Postdeploy package drift");
assert(semanticsManifest.package_sha256 === pins.semanticsPackage, "Semantics package drift");
assert(exportManifest.package_sha256 === pins.exportPackage, "Export package drift");
assert(gatewayManifest.package_sha256 === pins.gatewayPackage, "Gateway package drift");

assert(provisioning.apple_rc_release_basis === pins.appleRc, "Provisioning RC drift");
assert(provisioning.consumer_operator_commit === pins.operator, "Provisioning operator drift");
assert(provisioning.network_read_performed === false, "Provisioning read drift");
assert(provisioning.pre_read_audit.result_sha256 === sha256(await bytes(paths.postprovision)), "Postprovision audit hash drift");
assert(provisioning.accepted_pins.credentialless_preflight_v0_2_acceptance_sha256 === pins.preflightAcceptance, "Preflight acceptance drift");
assert(provisioning.accepted_pins.combined_postdeploy_v0_2_acceptance_sha256 === pins.postdeployAcceptance, "Postdeploy acceptance drift");
assert(provisioning.gates.production_gate === false && provisioning.gates.real_data_read_enabled === false, "Provisioning Production drift");

assert(edge.request_id === pins.requestId, "Edge request id drift");
assert(edge.network_request_count === 1 && edge.http_status === 200, "Request count/status drift");
assert(edge.gateway_access_log.matching_rows === 1 && edge.gateway_access_log.outcome === "success", "Gateway receipt drift");
assert(edge.export_access_log.matching_success_rows_in_cycle_window === 1 && edge.export_access_log.returned_count === 825, "Export receipt drift");
assert(edge.validated_item_count === 825 && edge.question_count === 55, "Response shape drift");

assert(postread.request_id === pins.requestId, "Postread request id drift");
assert(postread.apple_rc_release_basis === pins.appleRc, "Postread RC drift");
assert(postread.consumer_operator_commit === pins.operator, "Postread operator drift");
assert(postread.network_request_count === 1 && postread.data_scope === "synthetic", "Postread scope drift");
assert(Object.values(postread.gate_close).every((value) => value === false), "Gate close drift");
assert(postread.cleanup.secret_names_removed.length === 4, "Removed secret count drift");
assert(postread.cleanup.secret_names_present_after_cleanup.length === 0, "Secret cleanup drift");
assert(postread.cleanup.all_current_secret_names_absent.length === 5, "Secret absence drift");
assert(postread.cleanup.reader_password_state === "NULL", "Reader password cleanup drift");
assert(postread.cleanup.synthetic_fixture_users === 0 && postread.cleanup.synthetic_fixture_rows === 0, "Fixture cleanup drift");
assert(postread.postread_audit.result_sha256 === sha256(await bytes(paths.postreadAudit)), "Postread audit hash drift");
assert(postread.production === false && postread.real_data_read === false, "Postread Production drift");

assert(summary.status === "COMPLETE_V0_3_3_SYNTHETIC_ONE_SHOT_POSTREAD_ASSURED", "Cycle status drift");
assert(summary.network_request_count === 1 && summary.request_id === pins.requestId, "Cycle request drift");
assert(summary.credentials_removed && summary.keychain_absent && summary.reader_password_null && summary.all_gates_closed, "Cycle cleanup drift");
assert(orchestration.successful_cycle.network_data_request_count === 1, "Orchestrator request drift");
assert(orchestration.successful_cycle.request_retry_performed === false, "Orchestrator retry drift");
assert(orchestration.cleanup_correction.additional_network_data_request_count === 0, "Cleanup data request drift");
assert(orchestration.cleanup_correction.all_credentials_removed && orchestration.cleanup_correction.postread_audit_passed, "Cleanup correction drift");

const packagePaths = Object.values(paths).filter((path) => path !== manifestPath);
const files = [];
for (const path of packagePaths) files.push({ path, sha256: sha256(await bytes(path)) });
const packageSha = sha256(files.map(({ path, sha256: digest }) => `${digest}  ${path}\n`).join(""));
const manifest = {
  schema_version: "rewireperform-feedback-intelligence-synthetic-cycle-package-v2",
  package_status: "COMPLETE_V0_3_3_POSTREAD_ASSURED_SANITIZED_STAGING_ONLY",
  project_ref: "zbeswjipayspgvcipzmx",
  generated_at: summary.generated_at,
  producer_gate_basis_commit: pins.appleRc,
  consumer_operator_commit: pins.operator,
  package_sha256: packageSha,
  secret_values_included: false,
  secret_digests_included: false,
  files,
  activation: {
    staging_synthetic_cycle_complete: true,
    credentials_present: false,
    all_runtime_gates_closed: true,
    production: false,
    real_data: false,
    push: false,
    merge: false,
  },
  next_gate: "AWAITING_INDEPENDENT_JARVIS_V0_3_3_POSTREAD_ACCEPTANCE",
};
const serialized = `${JSON.stringify(manifest, null, 2)}\n`;

if (checkOnly) {
  const current = await readFile(resolve(root, manifestPath), "utf8");
  assert(current === serialized, "Synthetic cycle v0.3 package manifest drift");
  console.log(JSON.stringify({
    status: manifest.package_status,
    package_sha256: manifest.package_sha256,
    files: manifest.files.length,
    network_request_count: 1,
    all_credentials_removed: true,
    all_runtime_gates_closed: true,
    production: false,
    real_data: false,
  }));
} else {
  await writeFile(resolve(root, manifestPath), serialized, "utf8");
  console.log(`Wrote ${manifestPath}`);
}
