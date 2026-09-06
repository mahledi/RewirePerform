// @vitest-environment node

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const base = "docs/feedback-intelligence/contracts/production-consent-postdeploy-v1.1";
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");

describe("final V1.1 consent Production postdeploy evidence", () => {
  it("schema-validates the exact metadata-only closed-runtime observation", () => {
    const schema = JSON.parse(read(`${base}/evidence.schema.json`));
    const evidence = JSON.parse(read(`${base}/postdeploy-evidence.json`));
    const validate = new Ajv2020({ strict: true, validateFormats: false }).compile(schema);
    expect(validate(evidence), JSON.stringify(validate.errors)).toBe(true);
    expect(evidence.migration).toMatchObject({
      remote_version: "20260813123955",
      remote_name: "feedback_consent_guardian_de_v1_1_final_contract",
      applied: true,
    });
    expect(evidence.metadata_audit.campaigns).toMatchObject({ count: 4, status: "draft" });
    expect(evidence.metadata_audit.guardian_policy).toMatchObject({
      count: 1,
      status: "draft",
      active_policy_count: 0,
    });
  });

  it("does not turn metadata assurance into data, Secret or runtime authorization", () => {
    const evidence = JSON.parse(read(`${base}/postdeploy-evidence.json`));
    expect(evidence.privacy_boundary).toEqual({
      metadata_only: true,
      application_rows_read: false,
      application_functions_called: false,
      application_values_persisted: false,
      secret_presence_checked: false,
      secret_values_read: false,
      credential_values_persisted: false,
      database_mutated_by_audit: false,
    });
    expect(Object.values(evidence.metadata_audit.runtime_gates).every((value) => value === false)).toBe(true);
    expect(Object.values(evidence.authorization).every((value) => value === false)).toBe(true);
  });

  it("pins every package byte and regenerates deterministically", () => {
    const result = spawnSync(
      process.execPath,
      ["scripts/generate-feedback-consent-production-postdeploy-v1-1.mjs", "--check"],
      { cwd: root, encoding: "utf8" },
    );
    expect(result.status, result.stderr || result.stdout).toBe(0);
    const manifest = JSON.parse(read(`${base}/producer-package-manifest.json`));
    const digestInput = manifest.files.map(({ path, sha256: pinned }: { path: string; sha256: string }) => {
      const actual = sha256(readFileSync(resolve(root, path)));
      expect(actual, path).toBe(pinned);
      return `${actual}  ${path}\n`;
    }).join("");
    expect(sha256(digestInput)).toBe(manifest.package_sha256);
  });
});
