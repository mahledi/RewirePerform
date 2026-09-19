// @vitest-environment node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

const base = "docs/feedback-intelligence/contracts/synthetic-staging-one-read-v0.3";
const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const parse = (name: string) => JSON.parse(read(`${base}/${name}`));
const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");

describe("Feedback Intelligence v0.3.3 synthetic Staging one-shot", () => {
  it("is strict-schema valid and records exactly one synthetic request", () => {
    const schema = parse("postread-evidence.schema.json");
    const evidence = parse("postread-evidence-v0.3.3.json");
    const validate = new Ajv2020({ strict: true, validateFormats: false }).compile(schema);

    expect(validate(evidence), JSON.stringify(validate.errors)).toBe(true);
    expect(evidence).toMatchObject({
      contract_status: "SANITIZED_V0_3_3_ONE_SYNTHETIC_READ_CLOSED",
      network_request_count: 1,
      data_scope: "synthetic",
      production: false,
      real_data_read: false,
    });
    expect(evidence.consumer_result).toMatchObject({
      http_status: 200,
      validated_item_count: 825,
      question_count: 55,
      raw_response_persisted: false,
      raw_text_persisted: false,
      subject_reference_persisted: false,
    });
  });

  it("binds the Edge and export receipts to the successful cycle", () => {
    const edge = parse("edge-request-evidence-v0.3.3.json");
    const postread = parse("postread-evidence-v0.3.3.json");
    const summary = parse("cycle-summary-v0.3.3.json");

    expect(edge.request_id).toBe(postread.request_id);
    expect(edge.request_id).toBe(summary.request_id);
    expect(edge.gateway_access_log).toMatchObject({ matching_rows: 1, outcome: "success" });
    expect(edge.export_access_log).toMatchObject({
      matching_success_rows_in_cycle_window: 1,
      returned_count: 825,
    });
  });

  it("proves complete credential, fixture, privilege, and gate cleanup", () => {
    const audit = parse("postread-metadata-audit-v0.3.3.json");
    const evidence = parse("postread-evidence-v0.3.3.json");
    const summary = parse("cycle-summary-v0.3.3.json");

    expect(Object.values(evidence.gate_close).every((value) => value === false)).toBe(true);
    expect(evidence.cleanup).toMatchObject({
      secret_names_present_after_cleanup: [],
      reader_password_state: "NULL",
      synthetic_fixture_users: 0,
      synthetic_fixture_rows: 0,
    });
    expect(evidence.cleanup.secret_names_removed).toHaveLength(4);
    expect(evidence.cleanup.all_current_secret_names_absent).toHaveLength(5);
    expect(audit).toMatchObject({
      status: "PASS_V0_3_3_POSTREAD_ASSURANCE",
      reader_password_state: "NULL",
      reader_callable_function_count: 1,
      reader_relation_privileges: [],
      reader_sequence_privileges: [],
      public_execute_defaults: [],
      application_rows_read: false,
      database_mutated: false,
    });
    expect(summary).toMatchObject({
      credentials_removed: true,
      keychain_absent: true,
      reader_password_null: true,
      all_gates_closed: true,
    });
    expect(evidence.postread_audit.result_sha256)
      .toBe(sha256(read(`${base}/postread-metadata-audit-v0.3.3.json`)));
  });

  it("keeps failed preconditions and the cleanup correction fail-closed", () => {
    const orchestration = parse("orchestration-evidence-v0.3.3.json");

    expect(orchestration.pre_request_holds).toHaveLength(2);
    expect(orchestration.pre_request_holds.every((hold: {
      provisioning_started: boolean;
      network_data_request_count: number;
      mutation_performed: boolean;
    }) => !hold.provisioning_started
      && hold.network_data_request_count === 0
      && !hold.mutation_performed)).toBe(true);
    expect(orchestration.successful_cycle).toMatchObject({
      network_data_request_count: 1,
      request_succeeded: true,
      request_retry_performed: false,
      cleanup_started_in_finally: true,
    });
    expect(orchestration.cleanup_correction).toMatchObject({
      initial_secret_delete_result: "HTTP_400_INVALID_BULK_BODY_SHAPE",
      corrected_body: "ARRAY_OF_EXACT_SECRET_NAMES",
      additional_network_data_request_count: 0,
      all_credentials_removed: true,
      all_gates_closed: true,
      postread_audit_passed: true,
    });
  });

  it("regenerates the evidence package deterministically", () => {
    const result = spawnSync(process.execPath, [
      "scripts/generate-feedback-intelligence-synthetic-cycle-v0-3.mjs",
      "--check",
    ], { cwd: process.cwd(), encoding: "utf8" });

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(result.stdout).toContain("COMPLETE_V0_3_3_POSTREAD_ASSURED_SANITIZED_STAGING_ONLY");
    expect(result.stdout).toContain('"network_request_count":1');
    expect(result.stdout).toContain('"all_credentials_removed":true');
    expect(result.stdout).toContain('"production":false');
  });

  it("pins every packaged byte without credential material", () => {
    const manifest = parse("producer-package-manifest.json");
    const packageInput = manifest.files
      .map(({ path, sha256: digest }: { path: string; sha256: string }) => `${digest}  ${path}\n`)
      .join("");

    expect(manifest.secret_values_included).toBe(false);
    expect(manifest.secret_digests_included).toBe(false);
    expect(manifest.activation).toEqual({
      staging_synthetic_cycle_complete: true,
      credentials_present: false,
      all_runtime_gates_closed: true,
      production: false,
      real_data: false,
      push: false,
      merge: false,
    });
    const readerCredentialPrefix = "postgresql" + "://mahleos_feedback_reader:";
    for (const file of manifest.files) {
      const value = readFileSync(resolve(process.cwd(), file.path));
      expect(file.sha256).toBe(sha256(value));
      expect(value.toString("utf8")).not.toContain(readerCredentialPrefix);
    }
    expect(manifest.package_sha256).toBe(sha256(packageInput));
  });
});
