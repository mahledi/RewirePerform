// @vitest-environment node

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { composeProductionPostdeployAssurance } from
  "../../scripts/generate-v1-1-production-postdeploy-assurance.mjs";

const root = process.cwd();
const base = "docs/feedback-intelligence/contracts/production-postdeploy-assurance-v0.1";
const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");

describe("V1.1 Production postdeploy assurance contract", () => {
  it("expects the exact closed-runtime result after all 25 controlled steps", async () => {
    const { plan, schema } = await composeProductionPostdeployAssurance({ cwd: root });
    expect(plan).toMatchObject({
      status: "LOCAL_ASSURANCE_CONTRACT_PREPARED_PRODUCTION_NOT_APPLIED",
      project_ref: "bqsbxesmybthwtxmowfz",
      expected_result: {
        status: "PASS_V1_1_PRODUCTION_MIGRATIONS_APPLIED_RUNTIME_CLOSED",
        completed_migrations: 25,
        final_remote_migration_count: 104,
        target_audit_status: "PASS_V1_1_PERSISTENT_TARGET_METADATA_AUDIT",
        retry_count: 0,
        credential_persisted_by_operator: false,
        application_values_returned: false,
        runtime_activation_authorized: false,
      },
    });
    expect(Object.values(plan.activation).every((value) => value === false)).toBe(true);
    expect(schema.properties.control_plane.properties).toMatchObject({
      production_feedback_edge_present: { const: false },
      organization_inquiry_edge_present: { const: false },
      production_feedback_secrets_present: { const: false },
      production_feedback_reader_password_is_null: { const: true },
    });
  });

  it("allows no application values, credentials, or runtime activation in evidence", async () => {
    const { plan, schema } = await composeProductionPostdeployAssurance({ cwd: root });
    expect(plan.required_control_plane_evidence).toMatchObject({
      application_rows_read: false,
      application_values_persisted_in_evidence: false,
    });
    expect(schema.properties.privacy.properties).toEqual({
      application_rows_read: { const: false },
      application_values_persisted: { const: false },
      credential_value_persisted: { const: false },
    });
  });

  it("keeps plan, schema, and every package byte deterministic in CI", () => {
    const generated = spawnSync(
      process.execPath,
      ["scripts/generate-v1-1-production-postdeploy-assurance.mjs", "--check"],
      { cwd: root, encoding: "utf8" },
    );
    expect(generated.status, generated.stderr || generated.stdout).toBe(0);
    const result = JSON.parse(generated.stdout);
    expect(result).toMatchObject({
      status: "LOCAL_ASSURANCE_CONTRACT_PREPARED_PRODUCTION_NOT_APPLIED",
      expected_final_migrations: 104,
      all_external_gates_closed: true,
    });
    const manifest = JSON.parse(readFileSync(resolve(
      root,
      `${base}/producer-package-manifest.json`,
    ), "utf8"));
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
