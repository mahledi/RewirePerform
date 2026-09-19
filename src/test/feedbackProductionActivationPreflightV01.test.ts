// @vitest-environment node

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const base = "docs/feedback-intelligence/contracts/production-feedback-activation-preflight-v0.1";
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");

describe("Production Feedback activation post-install credentialless preflight v0.1", () => {
  it("pins final Main and the exact 107-version Production history", () => {
    const evidence = JSON.parse(read(`${base}/post-install-preflight-evidence.json`));
    expect(evidence.source_main_commit).toBe("62f14138c889c526e6ee180a4f1d76c9a997d9d3");
    expect(evidence.migration_state.remote_migration_count).toBe(107);
    expect(evidence.migration_state.remote_versions).toHaveLength(107);
    expect(sha256(`${evidence.migration_state.remote_versions.join("\n")}\n`)).toBe(
      "6c7caf62ddca94cef7e5b5bd116f18aa2e5696bb9436bf52c74029a9002e26c9",
    );
    expect(evidence.migration_state.controlled_remote_additions).toEqual([
      expect.objectContaining({ local_version: "20260813115737", remote_version: "20260813123955" }),
      expect.objectContaining({ local_version: "20260813125221", remote_version: "20260813125221" }),
      expect.objectContaining({ local_version: "20260813125222", remote_version: "20260813125222" }),
    ]);
  });

  it("records two installed owner-only contracts while runtime remains closed", () => {
    const evidence = JSON.parse(read(`${base}/post-install-preflight-evidence.json`));
    expect(evidence.activation_contracts.installed_function_count).toBe(2);
    expect(Object.values(evidence.activation_contracts.functions)).toEqual([
      expect.objectContaining({
        installed: true, security_mode: "INVOKER", public_execute: false,
        anon_execute: false, authenticated_execute: false, service_role_execute: false,
      }),
      expect.objectContaining({
        installed: true, security_mode: "INVOKER", public_execute: false,
        anon_execute: false, authenticated_execute: false, service_role_execute: false,
      }),
    ]);
    expect(evidence.activation_contracts.runtime_state_changed_by_installation).toBe(false);
    expect(evidence.registry_state.campaigns).toMatchObject({ count: 4, status: "draft", active_count: 0 });
    expect(evidence.registry_state.guardian_policy).toMatchObject({ count: 1, status: "draft", active_count: 0 });
    expect(Object.values(evidence.registry_state.runtime_gates)).not.toContain(true);
  });

  it("pins current Edge bytes, exactly five absent secrets and the unprivileged reader", () => {
    const evidence = JSON.parse(read(`${base}/post-install-preflight-evidence.json`));
    for (const deployed of Object.values(evidence.edge_functions) as Array<{ remote_files: Record<string, string> }>) {
      for (const [path, pinned] of Object.entries(deployed.remote_files)) {
        expect(sha256(readFileSync(resolve(root, path))), path).toBe(pinned);
      }
    }
    expect(evidence.secret_presence.expected_secret_names).toHaveLength(5);
    expect(Object.keys(evidence.secret_presence.observed_presence)).toEqual(
      evidence.secret_presence.expected_secret_names,
    );
    expect(Object.values(evidence.secret_presence.observed_presence)).not.toContain(true);
    expect(evidence.secret_presence).toMatchObject({
      secret_values_read: false,
      secret_values_persisted: false,
      unrelated_secret_names_persisted: false,
    });
    expect(evidence.reader_boundary).toMatchObject({
      role_name: "mahleos_feedback_production_reader",
      password_is_null: true,
      superuser: false,
      createdb: false,
      createrole: false,
      inherit: false,
      replication: false,
      bypassrls: false,
      callable_rpc_count: 1,
      relation_privilege_count: 0,
      sequence_privilege_count: 0,
      public_callable_path_count: 0,
    });
  });

  it("keeps every collection, minor, Guardian, Jarvis, real-data and App-Store gate closed", () => {
    const schema = JSON.parse(read(`${base}/evidence.schema.json`));
    const evidence = JSON.parse(read(`${base}/post-install-preflight-evidence.json`));
    const validate = new Ajv2020({ strict: true, validateFormats: false }).compile(schema);
    expect(validate(evidence), JSON.stringify(validate.errors)).toBe(true);
    expect(Object.values(evidence.gates)).not.toContain(true);
    expect(Object.values(evidence.authorization_boundary)).not.toContain(true);
    expect(evidence.privacy_boundary).toMatchObject({
      metadata_and_presence_only: true,
      application_rows_read: false,
      raw_feedback_read: false,
      raw_comment_text_read: false,
      subject_reference_read: false,
      secret_values_read: false,
      database_mutated_by_audit: false,
    });
  });

  it("recomputes the complete byte-pinned package deterministically", () => {
    const generated = spawnSync(process.execPath, [
      "scripts/generate-feedback-production-activation-preflight-v0-1.mjs", "--check",
    ], { cwd: root, encoding: "utf8" });
    expect(generated.status, generated.stderr || generated.stdout).toBe(0);
    const manifest = JSON.parse(read(`${base}/producer-package-manifest.json`));
    const digestInput = manifest.files.map(({ path, sha256: pinned }: { path: string; sha256: string }) => {
      const actual = sha256(readFileSync(resolve(root, path)));
      expect(actual, path).toBe(pinned);
      return `${actual}  ${path}\n`;
    }).join("");
    expect(sha256(digestInput)).toBe(manifest.package_sha256);
    expect(manifest.evidence_sha256).toBe(
      sha256(readFileSync(resolve(root, `${base}/post-install-preflight-evidence.json`))),
    );
  });
});
