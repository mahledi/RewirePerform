// @vitest-environment node

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const base = "docs/feedback-intelligence/contracts/production-postdeploy-assurance-v0.1";
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");

describe("V1.1 Production postdeploy evidence", () => {
  it("validates the real sanitized closed-runtime evidence", () => {
    const schema = JSON.parse(read(`${base}/postdeploy-evidence.schema.json`));
    const evidence = JSON.parse(read(`${base}/postdeploy-evidence.json`));
    const validate = new Ajv2020({ strict: true, validateFormats: false }).compile(schema);
    expect(validate(evidence), JSON.stringify(validate.errors)).toBe(true);
    expect(evidence.operator_result).toMatchObject({
      status: "PASS_V1_1_PRODUCTION_MIGRATIONS_APPLIED_RUNTIME_CLOSED",
      final_remote_migration_count: 104,
      retry_count: 0,
      credential_persisted_by_operator: false,
      runtime_activation_authorized: false,
    });
    expect(Object.values(evidence.gates).every((value) => value === false)).toBe(true);
  });

  it("pins observations without application or credential values", () => {
    const evidence = JSON.parse(read(`${base}/postdeploy-evidence.json`));
    const observations = [
      ["edge-presence-observation-2026-08-13.json", evidence.control_plane.edge_presence_observation.observation_sha256],
      ["secret-presence-observation-2026-08-13.json", evidence.control_plane.secret_presence_observation.observation_sha256],
      ["reader-role-observation-2026-08-13.json", evidence.control_plane.reader_role_observation.observation_sha256],
      ["combined-control-plane-observation-2026-08-13.json", evidence.control_plane.combined_audit_provenance.audit_sha256],
    ];
    for (const [name, pinned] of observations) {
      expect(sha256(read(`${base}/${name}`)), name).toBe(pinned);
    }
    expect(evidence.privacy).toMatchObject({
      postdeploy_metadata_audit_application_rows_read: false,
      application_values_persisted: false,
      credential_value_persisted: false,
    });
    expect(evidence.control_plane.secret_presence_observation).toMatchObject({
      secret_values_read: false,
      secret_values_persisted: false,
      unrelated_secret_names_persisted: false,
    });
  });

  it("keeps the result package deterministic", () => {
    const generated = spawnSync(
      process.execPath,
      ["scripts/generate-v1-1-production-postdeploy-evidence.mjs", "--check"],
      { cwd: root, encoding: "utf8" },
    );
    expect(generated.status, generated.stderr || generated.stdout).toBe(0);
    const manifest = JSON.parse(read(`${base}/postdeploy-result-manifest.json`));
    const digestInput = manifest.files.map(({ path, sha256: pinned }: {
      path: string;
      sha256: string;
    }) => {
      const actual = sha256(readFileSync(resolve(root, path)));
      expect(actual, path).toBe(pinned);
      return `${actual}  ${path}\n`;
    }).join("");
    expect(sha256(digestInput)).toBe(manifest.package_sha256);
  });
});
