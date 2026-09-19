// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

const base = "docs/feedback-intelligence/contracts/staging-postdeploy-assurance-v0.2";
const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Feedback Intelligence staging postdeploy assurance v0.2", () => {
  it("schema-validates the exact sanitized evidence without open runtime gates", () => {
    const ajv = new Ajv2020({ strict: true, validateFormats: false });
    const validate = ajv.compile(JSON.parse(read(`${base}/evidence.schema.json`)));
    const evidence = JSON.parse(read(`${base}/postdeploy-evidence.json`));
    expect(validate(evidence), JSON.stringify(validate.errors)).toBe(true);
    expect(evidence.external_gates).toMatchObject({
      consumer_postdeploy_review_required: true,
      credentials_provisioned: false,
      reader_password_provisioned: false,
      network_read_performed: false,
      production_approved: false,
      real_data_read: false,
      push_performed: false,
      merge_performed: false,
    });
  });

  it("keeps the accepted predeploy packages immutable and verifies every postdeploy pin", () => {
    const result = spawnSync(process.execPath, [
      "scripts/generate-feedback-staging-postdeploy-assurance-v0-2.mjs",
      "--check",
    ], { cwd: process.cwd(), encoding: "utf8" });
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(result.stdout).toContain("PASS_POSTDEPLOY_ASSURANCE_UNSIGNED_AWAITING_CONSUMER_REVIEW");
    expect(result.stdout).toContain("all_runtime_and_production_gates_closed");
  });

  it("validates the actual remote metadata-only result through audit v0.2", () => {
    const result = spawnSync(process.execPath, [
      "scripts/validate-feedback-staging-privilege-audit-v0-2.mjs",
      "docs/feedback-intelligence/contracts/staging-privilege-audit-v0.2/remote-staging-postdeploy-result-2026-08-09.json",
    ], { cwd: process.cwd(), encoding: "utf8" });
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(result.stdout).toContain("PASS_POSTDEPLOY_ASSURANCE");
    expect(result.stdout).toContain('"no_go_count": 0');
  });
});
