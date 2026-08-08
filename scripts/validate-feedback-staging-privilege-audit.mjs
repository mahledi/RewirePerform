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
const evidence = result.evidence;
const findings = [];
const add = (id, severity, message) => findings.push({ id, severity, message });

if (result.audit_phase === "PREDEPLOY_BASELINE") {
  if (evidence.reader_role.present || evidence.gateway_function.present) {
    add("PREDEPLOY_OBJECT_DRIFT", "NO_GO", "Predeploy baseline unexpectedly contains a reader role or gateway function.");
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
      || !gateway.function_settings.some((setting) => /^search_path=(?:"")?$/u.test(setting))) {
    add("GATEWAY_FUNCTION_DRIFT", "NO_GO", "Gateway signature, SECURITY DEFINER, or empty search_path differs.");
  }
  const matrix = evidence.gateway_execute_matrix;
  if (matrix.mahleos_feedback_reader !== true || matrix.anon !== false
      || matrix.authenticated !== false || matrix.service_role !== false) {
    add("GATEWAY_EXECUTE_ALLOWLIST_DRIFT", "NO_GO", "Gateway callability is not limited to the reader role.");
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
