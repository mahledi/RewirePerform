// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

const base = "docs/feedback-intelligence/contracts/combined-staging-postdeploy-v0.1";
const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Feedback Intelligence combined Staging postdeploy assurance v0.1", () => {
  it("schema-validates the exact fail-closed postdeploy evidence", () => {
    const ajv = new Ajv2020({ strict: true, validateFormats: false });
    const validate = ajv.compile(JSON.parse(read(`${base}/evidence.schema.json`)));
    const evidence = JSON.parse(read(`${base}/postdeploy-evidence.json`));
    expect(validate(evidence), JSON.stringify(validate.errors)).toBe(true);
    expect(evidence.remote_migrations).toHaveLength(3);
    expect(evidence.edge_assurance).toMatchObject({
      observed_version: 25,
      source_file_count: 6,
      deployed_source_byte_match: true,
    });
  });

  it("regenerates every pin without opening a runtime or Production gate", () => {
    const result = spawnSync(process.execPath, [
      "scripts/generate-feedback-combined-staging-postdeploy.mjs",
      "--check",
    ], { cwd: process.cwd(), encoding: "utf8" });
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(result.stdout).toContain("PASS_POSTDEPLOY_ASSURANCE_UNSIGNED_AWAITING_CONSUMER_REVIEW");
    expect(result.stdout).toContain('"application_rows_read": false');
    expect(result.stdout).toContain('"network_read_performed": false');
    expect(result.stdout).toContain('"all_runtime_and_production_gates_closed": true');
  });

  it("preserves metadata-only scope and the exact reader allowlist", () => {
    const result = JSON.parse(read(`${base}/remote-audit-result-2026-08-10.json`));
    expect(result.data_access).toEqual({
      catalog_metadata_only: true,
      application_rows_read: false,
      application_functions_called: false,
      database_mutated: false,
    });
    expect(result.evidence.gateway_execute_matrix).toEqual({
      anon: false,
      authenticated: false,
      service_role: false,
      mahleos_feedback_reader: true,
    });
    expect(result.evidence.reader_relation_privileges).toEqual([]);
    expect(result.evidence.reader_sequence_privileges).toEqual([]);
  });

  it("keeps the accepted predeploy package historical and unchanged", () => {
    const predeploy = JSON.parse(read(
      "docs/feedback-intelligence/contracts/combined-staging-predeploy-v0.1/evidence.json",
    ));
    expect(predeploy.evidence_status).toBe("PREPARED_FAIL_CLOSED_AWAITING_SEPARATE_STAGING_APPLY");
    expect(predeploy.gates.network_read_performed).toBe(false);
    expect(predeploy.gates.production_export_enabled).toBe(false);
  });
});
