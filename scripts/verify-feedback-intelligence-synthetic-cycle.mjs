import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve("docs/feedback-intelligence/contracts/synthetic-staging-one-read-v0.2");
const manifest = JSON.parse(readFileSync(resolve(root, "producer-package-manifest.json"), "utf8"));
const parse = (name) => JSON.parse(readFileSync(resolve(root, name), "utf8"));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const assert = (value, message) => { if (!value) throw new Error(message); };
const exactKeys = (value, keys, message) => {
  assert(value && typeof value === "object" && !Array.isArray(value), message);
  assert(JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort()), message);
};
const historicalPackageCommit = "1c394d8d7b1c47597ca1d1c37bf17d8a7c5bda2e";
const historicalBytes = (path) => execFileSync(
  "git",
  ["show", `${historicalPackageCommit}:${path}`],
  { cwd: process.cwd(), encoding: null, maxBuffer: 16 * 1024 * 1024 },
);

assert(manifest.schema_version === "rewireperform-feedback-intelligence-synthetic-cycle-package-v1", "manifest schema drift");
assert(manifest.package_status === "COMPLETE_POSTREAD_ASSURED_SANITIZED_STAGING_ONLY", "manifest status drift");
assert(manifest.project_ref === "zbeswjipayspgvcipzmx", "project drift");
assert(manifest.secret_values_included === false, "secret inclusion drift");
assert(manifest.activation.production === false && manifest.activation.real_data === false, "activation drift");
assert(new Set(manifest.files.map((file) => file.path)).size === manifest.files.length, "duplicate manifest path");
const digestLines = manifest.files.map((file) => {
  exactKeys(file, ["path", "sha256"], "manifest file shape drift");
  // The package is immutable historical evidence. Verify its bytes at the
  // commit that first contained the exact manifest instead of requiring
  // actively maintained files such as package.json to remain frozen forever.
  const bytes = historicalBytes(file.path);
  const digest = sha256(bytes);
  assert(digest === file.sha256, `${file.path} hash drift`);
  return `${digest}  ${file.path}\n`;
}).join("");
assert(sha256(Buffer.from(digestLines, "utf8")) === manifest.package_sha256, "package hash drift");

const abort = parse("pre-network-abort-evidence.json");
assert(abort.contract_status === "SANITIZED_PRE_NETWORK_ABORT_CLOSED", "abort status drift");
assert(JSON.stringify(abort.failure) === JSON.stringify({
  error_code: "MACHINE_KEY_UNAVAILABLE_OR_INVALID",
  operator_state_at_failure: "ARMED_FOR_ONE_SYNTHETIC_READ",
  request_budget: 1,
  requests_consumed: 0,
  replay_headers_created: false,
  request_id: null,
  network_request_count: 0,
  retry_performed: false,
}), "abort boundary drift");
assert(abort.cleanup.reader_password_state === "NULL" && abort.cleanup.synthetic_fixture_users === 0 && abort.cleanup.synthetic_fixture_rows === 0, "abort cleanup drift");
assert(abort.postabort_audit.status === "PASS_POSTABORT_ASSURANCE", "abort audit drift");

const provisioning = parse("provisioning-evidence-v0.3.json");
assert(provisioning.contract_status === "SANITIZED_STAGING_PROVISIONING_READY", "provisioning status drift");
assert(provisioning.consumer_operator_commit === "21108bc928210599504673846ff41aa83dc990b0", "consumer pin drift");
assert(provisioning.network_read_performed === false && provisioning.secret_values_included === false, "provisioning privacy drift");
assert(provisioning.gates.consumer_pin_ready === true && provisioning.gates.synthetic_export_enabled === true && provisioning.gates.machine_credential_ready === true, "synthetic gate drift");
assert(provisioning.gates.production_export_enabled === false && provisioning.gates.real_feedback_collection_enabled === false, "production gate drift");
assert(provisioning.pre_read_audit.status === "PASS_POSTPROVISION_ASSURANCE", "postprovision audit drift");

const edge = parse("edge-request-evidence-v0.3.json");
const postread = parse("postread-evidence-v0.3.json");
const summary = parse("cycle-summary-v0.3.json");
assert(edge.contract_status === "SANITIZED_SYNTHETIC_REQUEST_OBSERVED", "edge evidence status drift");
assert(edge.request_id === postread.request_id && edge.request_id === summary.successful_cycle.request_id, "request id drift");
assert(edge.network_request_count === 1 && edge.http_status === 200 && edge.gateway_access_log.matching_rows === 1 && edge.gateway_access_log.outcome === "success", "request evidence drift");
assert(postread.contract_status === "SANITIZED_ONE_SYNTHETIC_READ_CLOSED" && postread.network_request_count === 1 && postread.data_scope === "synthetic", "postread status drift");
assert(Object.values(postread.gate_close).every((value) => value === false), "gate close drift");
assert(postread.cleanup.edge_secret_names_removed.length === 4 && postread.cleanup.edge_secret_names_present_after_cleanup.length === 0 && postread.cleanup.forbidden_edge_secret_names_present_after_cleanup.length === 0, "secret cleanup drift");
assert(postread.cleanup.reader_password_state === "NULL" && postread.cleanup.synthetic_fixture_users === 0 && postread.cleanup.synthetic_fixture_rows === 0, "fixture cleanup drift");
assert(postread.postread_audit.status === "PASS_POSTREAD_ASSURANCE" && postread.postread_audit.reader_callable_function_count === 1, "postread audit drift");
assert(postread.postread_audit.reader_relation_privileges.length === 0 && postread.postread_audit.reader_sequence_privileges.length === 0 && postread.postread_audit.public_execute_defaults.length === 0, "reader privilege drift");
assert(postread.production === false && postread.real_data_read === false && postread.secret_values_included === false, "postread privacy drift");
assert(summary.contract_status === "COMPLETE_POSTREAD_ASSURED", "summary status drift");
assert(summary.successful_cycle.network_request_count === 1 && summary.successful_cycle.validated_item_count === 825 && summary.successful_cycle.question_count === 55, "summary validation drift");
assert(summary.privacy.raw_response_persisted === false && summary.privacy.raw_text_persisted === false && summary.privacy.subject_reference_persisted === false, "summary persistence drift");
assert(summary.cleanup.local_keychain_item_removed === true && summary.cleanup.local_keychain_absence_verified === true, "keychain cleanup drift");
assert(summary.activation.production === false && summary.activation.real_data === false && summary.activation.push === false && summary.activation.merge === false, "summary activation drift");

for (const file of manifest.files) {
  const value = readFileSync(resolve(file.path), "utf8");
  const readerCredentialPrefix = "postgresql" + "://mahleos_feedback_reader:";
  assert(!value.includes(readerCredentialPrefix), `${file.path} contains reader credential`);
}

console.log(`Feedback Intelligence synthetic cycle verified (${manifest.files.length} files, ${manifest.package_sha256})`);
