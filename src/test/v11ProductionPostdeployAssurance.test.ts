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
const historicalAssuranceCommit = "38b3f3da54550447207c92e04a049e2410dc1197";
const historicalBytes = (path: string) => spawnSync(
  "git",
  ["show", `${historicalAssuranceCommit}:${path}`],
  { cwd: root, encoding: null, maxBuffer: 16 * 1024 * 1024 },
).stdout;

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
      edge_presence_observation: expect.any(Object),
      secret_presence_observation: expect.any(Object),
      reader_role_observation: expect.any(Object),
      combined_audit_provenance: expect.any(Object),
    });
    expect(schema.properties.control_plane.properties.secret_presence_observation
      .properties.expected_secret_names.prefixItems).toHaveLength(5);
    expect(Object.keys(schema.properties.control_plane.properties.edge_presence_observation
      .properties.observed_slugs.properties)).toEqual([
      "mahleos-feedback-intelligence-production-read",
      "submit-organization-access-request",
    ]);
  });

  it("allows no application values, credentials, or runtime activation in evidence", async () => {
    const { plan, schema } = await composeProductionPostdeployAssurance({ cwd: root });
    expect(plan.required_control_plane_evidence).toMatchObject({
      migration_application_rows_read: true,
      migration_application_read_scope: {
        "public.teams": ["id", "created_by"],
        "public.user_roles": ["user_id", "role"],
      },
      postdeploy_metadata_audit_application_rows_read: false,
      application_values_persisted_in_evidence: false,
    });
    expect(schema.properties.privacy.properties).toEqual({
      migration_application_rows_read: { const: true },
      migration_application_read_scope: expect.any(Object),
      postdeploy_metadata_audit_application_rows_read: { const: false },
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
      const actual = sha256(historicalBytes(path));
      expect(actual, path).toBe(pinned);
      return `${actual}  ${path}\n`;
    }).join("");
    expect(sha256(digestInput)).toBe(manifest.package_sha256);
  });
});
