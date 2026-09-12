// @vitest-environment node

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const base = "docs/feedback-intelligence/contracts/production-post-edge-deploy-preflight-v0.1";
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");

describe("V1.1 Production post-Edge-deploy credentialless preflight", () => {
  it("validates deployed byte parity with every activation gate closed", () => {
    const schema = JSON.parse(read(`${base}/evidence.schema.json`));
    const evidence = JSON.parse(read(`${base}/evidence.json`));
    const validate = new Ajv2020({ strict: true, validateFormats: false }).compile(schema);
    expect(validate(evidence), JSON.stringify(validate.errors)).toBe(true);
    expect(Object.values(evidence.gates).every((value) => value === false)).toBe(true);
    expect(Object.values(evidence.authorization_boundary).every((value) => value === false)).toBe(true);
    expect(evidence.edge_functions["mahleos-feedback-intelligence-production-read"]).toMatchObject({
      version: 1, status: "ACTIVE", verify_jwt: false,
    });
    expect(evidence.edge_functions["submit-organization-access-request"]).toMatchObject({
      version: 2, status: "ACTIVE", verify_jwt: false,
    });
  });

  it("pins only credential presence and a passwordless unprivileged reader", () => {
    const evidence = JSON.parse(read(`${base}/evidence.json`));
    expect(Object.values(evidence.secret_presence.feedback)).not.toContain(true);
    expect(Object.values(evidence.secret_presence.organization)).not.toContain(true);
    expect(evidence.secret_presence).toMatchObject({
      secret_values_read: false,
      secret_values_persisted: false,
      unrelated_secret_names_persisted: false,
    });
    expect(evidence.reader_boundary).toMatchObject({
      observed_at: "2026-08-13T11:20:16Z",
      observation_reused_after_edge_only_deploy: true,
      password_is_null: true,
      superuser: false,
      inherit: false,
      bypassrls: false,
      callable_rpc_count: 1,
      relation_privilege_count: 0,
      sequence_privilege_count: 0,
      public_callable_path_count: 0,
    });
  });

  it("keeps remote source pins equal to the committed local bytes", () => {
    const evidence = JSON.parse(read(`${base}/evidence.json`));
    for (const deployed of Object.values(evidence.edge_functions) as Array<{ remote_files: Record<string, string> }>) {
      for (const [path, pinned] of Object.entries(deployed.remote_files)) {
        expect(sha256(readFileSync(resolve(root, path))), path).toBe(pinned);
      }
    }
  });

  it("records fail-closed negative HTTP behavior without claiming a positive path", () => {
    const evidence = JSON.parse(read(`${base}/evidence.json`));
    expect(evidence.negative_http_matrix).toEqual(expect.arrayContaining([
      expect.objectContaining({ condition: "missing_machine_key", http_status: 503 }),
      expect.objectContaining({ condition: "allowed_origin_runtime_closed", http_status: 503 }),
      expect.objectContaining({ condition: "www_allowed_origin_runtime_closed", http_status: 503 }),
      expect.objectContaining({ condition: "foreign_origin", http_status: 403 }),
    ]));
    expect(evidence.privacy).toMatchObject({
      application_rows_read: false,
      database_mutated_by_audit: false,
      credential_values_read: false,
    });
  });

  it("keeps evidence and package bytes deterministic", () => {
    const generated = spawnSync(process.execPath, [
      "scripts/generate-v1-1-production-post-edge-deploy-preflight.mjs", "--check",
    ], { cwd: root, encoding: "utf8" });
    expect(generated.status, generated.stderr || generated.stdout).toBe(0);
    const manifest = JSON.parse(read(`${base}/producer-package-manifest.json`));
    const digestInput = manifest.files.map(({ path, sha256: pinned }: { path: string; sha256: string }) => {
      const actual = sha256(readFileSync(resolve(root, path)));
      expect(actual, path).toBe(pinned);
      return `${actual}  ${path}\n`;
    }).join("");
    expect(sha256(digestInput)).toBe(manifest.package_sha256);
  });
});
