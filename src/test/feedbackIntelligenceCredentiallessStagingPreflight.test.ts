// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

const base = "docs/feedback-intelligence/contracts/credentialless-staging-preflight-v0.1";
const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Feedback Intelligence credentialless Staging preflight v0.1", () => {
  it("schema-validates the sanitized presence-only evidence", () => {
    const ajv = new Ajv2020({ strict: true, validateFormats: false });
    const validate = ajv.compile(JSON.parse(read(`${base}/evidence.schema.json`)));
    const evidence = JSON.parse(read(`${base}/preflight-evidence.json`));
    expect(validate(evidence), JSON.stringify(validate.errors)).toBe(true);
  });

  it("proves every Feedback credential and runtime gate secret absent without persisting unrelated names", () => {
    const evidence = JSON.parse(read(`${base}/preflight-evidence.json`));
    expect(evidence.secret_presence_observation).toMatchObject({
      method: "SUPABASE_DASHBOARD_SECRET_NAME_PRESENCE_ONLY",
      custom_secret_count: 3,
      secret_values_read: false,
      secret_values_persisted: false,
      secret_digests_persisted: false,
      unrelated_secret_names_persisted: false,
    });
    expect(Object.values(evidence.secret_presence_observation.expected_feedback_secrets)).toEqual([
      false,
      false,
      false,
      false,
      false,
    ]);
  });

  it("keeps the reader credentialless and all data/export gates closed", () => {
    const evidence = JSON.parse(read(`${base}/preflight-evidence.json`));
    expect(evidence.database_preflight).toMatchObject({
      application_rows_read: false,
      application_functions_called: false,
      database_mutated: false,
      reader_password_is_null: true,
      reader_role_is_hardened: true,
      producer_package_unset: true,
    });
    expect(Object.values(evidence.database_preflight.database_gates).every((value) => value === false)).toBe(true);
    expect(Object.values(evidence.runtime_gates).every((value) => value === false)).toBe(true);
  });

  it("regenerates exact byte pins and still forbids the next external gates", () => {
    const result = spawnSync(process.execPath, [
      "scripts/generate-feedback-credentialless-staging-preflight.mjs",
      "--check",
    ], { cwd: process.cwd(), encoding: "utf8" });
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(result.stdout).toContain("PASS_CREDENTIALLESS_PREFLIGHT_UNSIGNED_AWAITING_CONSUMER_REVIEW");
    expect(result.stdout).toContain('"expected_feedback_secrets_absent": true');
    expect(result.stdout).toContain('"all_database_gates_closed": true');
    expect(result.stdout).toContain('"all_runtime_gates_closed": true');
  });
});
