#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";

const root = process.cwd();
const base = "docs/feedback-intelligence/contracts/staging-privilege-audit-v0.1";
const inputPath = process.argv[2] ?? `${base}/predeploy.fixture.json`;
const schema = JSON.parse(await readFile(resolve(root, `${base}/result.schema.json`), "utf8"));
const result = JSON.parse(await readFile(resolve(root, inputPath), "utf8"));
const validate = new Ajv2020({ strict: true, validateFormats: false }).compile(schema);

if (!validate(result)) {
  console.error(JSON.stringify(validate.errors, null, 2));
  process.exit(1);
}

const expectedSignature = "public.read_feedback_intelligence_v0_2_draft(text, text, text, text)";
const expectedSettings = ["search_path=\"\""];
const guardedAdminAggregate = {
  subject_role: "authenticated",
  schema_name: "public",
  function_name: "get_admin_feedback_intelligence_insights",
  identity_arguments: "text",
  owner_name: "postgres",
  security_definer: true,
  function_settings: ["search_path=\"\""],
  return_type: "jsonb",
  volatility: "STABLE",
  definition_sha256: "9beef5048a25069c5fe381232dc81414ab3d62e300629a5fbf1a986e4c8d38ca",
};
const isGuardedAdminAggregate = (path) => Object.entries(guardedAdminAggregate)
  .every(([key, value]) => Array.isArray(value)
    ? JSON.stringify(path[key]) === JSON.stringify(value)
    : path[key] === value);
const evidence = result.evidence;
const findings = [];
const add = (id, severity, message) => findings.push({ id, severity, message });

if (result.audit_phase === "PREDEPLOY_BASELINE") {
  if (evidence.reader_role.present) {
    add("PREDEPLOY_READER_ROLE_DRIFT", "NO_GO", "Predeploy baseline unexpectedly contains the dedicated reader role.");
  }
  const gateway = evidence.gateway_function;
  if (gateway.present && (gateway.signature !== expectedSignature || !gateway.security_definer
      || JSON.stringify(gateway.function_settings) !== JSON.stringify(expectedSettings)
      || gateway.owner_name !== "postgres" || gateway.owner_superuser !== false
      || gateway.owner_bypass_rls !== true)) {
    add("PREDEPLOY_GATEWAY_FUNCTION_DRIFT", "NO_GO", "Existing predeploy export RPC has different signature, settings, or Hosted-Staging owner attributes.");
  }
  const matrix = evidence.gateway_execute_matrix;
  if (matrix.anon !== false || matrix.authenticated !== false || matrix.service_role !== false) {
    add("PREDEPLOY_RUNTIME_EXECUTE_PATH", "NO_GO", "A standard runtime role can call the existing export RPC.");
  }
  const unapprovedMachinePaths = evidence.denied_role_machine_paths.filter(
    (path) => !isGuardedAdminAggregate(path),
  );
  if (unapprovedMachinePaths.length > 0) {
    add("PREDEPLOY_MACHINE_EXPORT_SIDE_PATH", "NO_GO", "PUBLIC or a standard runtime role can call an unallowlisted Machine/Export-path function.");
  }
  if (evidence.reader_callable_functions.length > 0
      || evidence.reader_relation_privileges.length > 0
      || evidence.reader_sequence_privileges.length > 0
      || evidence.reader_schema_usage.length > 0
      || evidence.reader_memberships.length > 0) {
    add("PREDEPLOY_READER_EVIDENCE_DRIFT", "NO_GO", "Reader-specific privileges exist before the reader role is provisioned.");
  }
  if (evidence.public_execute_defaults.length > 0) {
    add("PUBLIC_EXECUTE_DEFAULT_PATH", "NO_GO", "At least one audited function owner still gives PUBLIC default EXECUTE in schema public.");
  }
  add("POSTDEPLOY_ASSURANCE_PENDING", "WAITING", "Exact reader allowlist cannot pass until the separately approved gateway migration exists.");
} else {
  const role = evidence.reader_role;
  if (!role.present || role.superuser || role.inherit || role.create_role || role.create_db
      || !role.can_login || role.replication || role.bypass_rls || !role.database_connect) {
    add("READER_ROLE_NOT_HARDENED", "NO_GO", "Reader role attributes differ from the fail-closed contract.");
  }
  if (evidence.reader_memberships.length > 0) {
    add("READER_ROLE_MEMBERSHIP_PATH", "NO_GO", "Reader participates in a role membership path.");
  }
  const gateway = evidence.gateway_function;
  if (!gateway.present || gateway.signature !== expectedSignature || !gateway.security_definer
      || JSON.stringify(gateway.function_settings) !== JSON.stringify(expectedSettings)
      || gateway.owner_name !== "postgres" || gateway.owner_superuser !== false
      || gateway.owner_bypass_rls !== true) {
    add("GATEWAY_FUNCTION_DRIFT", "NO_GO", "Gateway signature, settings, or Hosted-Staging owner attributes differ.");
  }
  const matrix = evidence.gateway_execute_matrix;
  if (matrix.mahleos_feedback_reader !== true || matrix.anon !== false
      || matrix.authenticated !== false || matrix.service_role !== false) {
    add("GATEWAY_EXECUTE_ALLOWLIST_DRIFT", "NO_GO", "Gateway callability is not limited to the reader role.");
  }
  const unapprovedMachinePaths = evidence.denied_role_machine_paths.filter(
    (path) => !isGuardedAdminAggregate(path),
  );
  if (unapprovedMachinePaths.length > 0) {
    add("MACHINE_EXPORT_SIDE_PATH", "NO_GO", "PUBLIC or a standard runtime role can call an unallowlisted Machine/Export-path function.");
  }
  const callable = evidence.reader_callable_functions.map(
    (fn) => `${fn.schema_name}.${fn.function_name}(${fn.identity_arguments})`,
  );
  if (callable.length !== 1 || callable[0] !== expectedSignature) {
    add("READER_EFFECTIVE_FUNCTION_SCOPE_DRIFT", "NO_GO", "Reader can call functions outside the exact allowlisted RPC.");
  }
  if (evidence.reader_relation_privileges.length > 0 || evidence.reader_sequence_privileges.length > 0) {
    add("READER_DIRECT_RELATION_ACCESS", "NO_GO", "Reader has a direct table, view, materialized view, or sequence privilege.");
  }
  if (JSON.stringify(evidence.reader_schema_usage) !== JSON.stringify(["public"])) {
    add("READER_SCHEMA_SCOPE_DRIFT", "NO_GO", "Reader schema USAGE differs from public-only.");
  }
  if (evidence.public_execute_defaults.length > 0) {
    add("PUBLIC_EXECUTE_DEFAULT_PATH", "NO_GO", "At least one audited function owner still gives PUBLIC default EXECUTE in schema public.");
  }
}

const noGoCount = findings.filter((finding) => finding.severity === "NO_GO").length;
const output = {
  status: noGoCount === 0 && result.audit_phase === "POSTDEPLOY_ASSURANCE"
    ? "PASS_POSTDEPLOY_ASSURANCE"
    : noGoCount === 0
      ? "PREDEPLOY_BASELINE_CLEAR_POSTDEPLOY_PENDING"
      : "NO_GO_FAIL_CLOSED",
  input: inputPath,
  audit_phase: result.audit_phase,
  no_go_count: noGoCount,
  findings,
};

console.log(JSON.stringify(output, null, 2));
if (noGoCount > 0) process.exitCode = 2;
