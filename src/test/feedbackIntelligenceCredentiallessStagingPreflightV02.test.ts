// @vitest-environment node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

const base = "docs/feedback-intelligence/contracts/credentialless-staging-preflight-v0.2";
const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const evidence = () => JSON.parse(read(`${base}/preflight-evidence.json`));

describe("Feedback Intelligence credentialless Staging preflight v0.2", () => {
  it("schema-validates the exact V0.3.3 evidence on the approved Apple RC", () => {
    const ajv = new Ajv2020({ strict: true, validateFormats: false });
    const validate = ajv.compile(JSON.parse(read(`${base}/evidence.schema.json`)));
    const value = evidence();
    expect(validate(value), JSON.stringify(validate.errors)).toBe(true);
    expect(value.producer_basis).toEqual({
      apple_rc_commit: "5eadb046d4a4902d98393bb0284a5471bc3d2a20",
      postdeploy_integration_commit: "061076d5d35e4c443ca6a482c0dc6676a46a0832",
      repository_state: "PINNED_COMMITTED_INPUTS",
    });
  });

  it("pins the independently accepted V0.3.3 postdeploy package", () => {
    expect(evidence().accepted_postdeploy).toEqual({
      producer_commit: "bdba136a30e95718f47da545ec575b81378f659f",
      evidence_sha256: "cb48c6efaf4ac0da906608ac0191e749850693016a3d6379ae8a69acae8a6999",
      manifest_sha256: "39d3188144515cf48ac5ac7bdb3ad4275a3698ccf5430355b8cc59bdb01401d9",
      package_sha256: "2dc086363fd4bfe8523550471fa24548de838e57d9a53200226613b15f49e479",
      consumer_commit: "602945a7b67fbc09a99f41361888b0447f6ec1e2",
      consumer_acceptance_sha256: "0941fd066378e4e5ec16435dc2c789dde9476f9073e24921c695be49f6981164",
      review_status: "ACCEPTED_V0_3_3_POSTDEPLOY_ASSURANCE_AWAITING_FRESH_CREDENTIALLESS_PREFLIGHT",
    });
  });

  it("proves only the five current Gateway secret names absent without retaining secret material", () => {
    const observation = evidence().observations.secret_presence;
    expect(observation).toMatchObject({
      method: "SUPABASE_MANAGEMENT_API_SECRET_NAME_PRESENCE_ONLY",
      custom_secret_count: 10,
      secret_values_read: false,
      secret_values_persisted: false,
      secret_digests_persisted: false,
      unrelated_secret_names_persisted: false,
    });
    expect(observation.expected_feedback_secrets).toEqual({
      MAHLEOS_FEEDBACK_INTELLIGENCE_MACHINE_KEY: false,
      MAHLEOS_FEEDBACK_INTELLIGENCE_MACHINE_KEY_PREVIOUS: false,
      MAHLEOS_FEEDBACK_READER_DATABASE_URL: false,
      MAHLEOS_FEEDBACK_INTELLIGENCE_MACHINE_GATE: false,
      MAHLEOS_FEEDBACK_INTELLIGENCE_PRODUCTION_GATE: false,
    });
    const source = read(observation.source_path);
    expect(sha256(source)).toBe(observation.source_sha256);
    expect(Object.keys(JSON.parse(source))).toEqual([
      "schema_version",
      "observed_at",
      "target",
      "method",
      "custom_secret_count",
      "expected_feedback_secrets",
      "secret_values_read",
      "secret_values_persisted",
      "secret_digests_persisted",
      "unrelated_secret_names_persisted",
    ]);
  });

  it("keeps the Reader credentialless and every data, collection and minor gate closed", () => {
    const observation = evidence().observations.database_preflight;
    expect(observation.reader_role).toMatchObject({
      present: true,
      can_login: true,
      superuser: false,
      create_db: false,
      create_role: false,
      inherit: false,
      replication: false,
      bypass_rls: false,
      password_is_null: true,
    });
    expect(observation.machine_contract).toMatchObject({
      consumer_pin_ready: false,
      synthetic_export_enabled: false,
      production_export_enabled: false,
      machine_credential_ready: false,
      minor_policy_ready: false,
    });
    expect(observation.collection_settings).toMatchObject({
      athlete_collection_enabled: false,
      text_collection_enabled: false,
      minor_policy_ready: false,
    });
    expect(observation.guardian_policy).toEqual({ active_policy_count: 0, non_draft_policy_count: 0 });
    expect(observation).toMatchObject({
      application_rows_read: false,
      configuration_rows_read: true,
      application_functions_called: false,
      database_mutated: false,
    });
  });

  it("leaves all runtime and external gates closed and historical evidence non-authorizing", () => {
    const value = evidence();
    expect(Object.keys(value.runtime_gates)).toHaveLength(22);
    expect(Object.values(value.runtime_gates).every((gate) => gate === false)).toBe(true);
    expect(value.historical_evidence).toEqual({
      v0_3_2_preflight_authorizes_v0_3_3: false,
      prior_synthetic_read_authorizes_current_read: false,
      silent_reinterpretation_allowed: false,
      historical_bytes_preserved: true,
    });
    expect(value.next_gate).toEqual({
      decision: "AWAITING_JARVIS_V0_3_3_CREDENTIALLESS_PREFLIGHT_REVIEW",
      consumer_review_required: true,
      credentials_allowed: false,
      one_shot_read_allowed: false,
      production_allowed: false,
    });
  });

  it("regenerates the evidence and all package byte pins deterministically", () => {
    const result = spawnSync(process.execPath, [
      "scripts/generate-feedback-credentialless-staging-preflight-v0-2.mjs",
      "--check",
    ], { cwd: process.cwd(), encoding: "utf8" });
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(result.stdout).toContain("PASS_V0_3_3_CREDENTIALLESS_PREFLIGHT_UNSIGNED_AWAITING_CONSUMER_REVIEW");
    expect(result.stdout).toContain('"expected_feedback_secrets_absent": true');
    expect(result.stdout).toContain('"reader_password_is_null": true');
    expect(result.stdout).toContain('"all_runtime_gates_closed": true');
    expect(result.stdout).toContain('"credentials_allowed": false');
  });
});
