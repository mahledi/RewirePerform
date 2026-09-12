// @vitest-environment node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

const base = "docs/feedback-intelligence/contracts/combined-staging-postdeploy-v0.2";
const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");

describe("Feedback Intelligence v0.3.3 Combined Staging postdeploy evidence", () => {
  it("is strict-schema valid and keeps every external gate closed", () => {
    const schema = JSON.parse(read(`${base}/evidence.schema.json`));
    const evidence = JSON.parse(read(`${base}/postdeploy-evidence.json`));
    const validate = new Ajv2020({ strict: true, validateFormats: false }).compile(schema);

    expect(validate(evidence), JSON.stringify(validate.errors)).toBe(true);
    expect(evidence.evidence_status)
      .toBe("PASS_V0_3_3_POSTDEPLOY_ASSURANCE_UNSIGNED_AWAITING_CONSUMER_REVIEW");
    expect(Object.values(evidence.gates).every((value) => value === false)).toBe(true);
    expect(evidence.next_gate).toEqual({
      decision: "AWAITING_JARVIS_V0_3_3_POSTDEPLOY_REVIEW",
      consumer_review_required: true,
      credentials_allowed: false,
      network_read_allowed: false,
      production_allowed: false,
    });
  });

  it("pins the accepted v0.3.3 predeploy package and Consumer acceptance", () => {
    const evidence = JSON.parse(read(`${base}/postdeploy-evidence.json`));
    const predeployEvidencePath =
      "docs/feedback-intelligence/contracts/combined-staging-predeploy-v0.2/evidence.json";
    const predeployManifestPath =
      "docs/feedback-intelligence/contracts/combined-staging-predeploy-v0.2/producer-package-manifest.json";
    const predeployManifest = JSON.parse(read(predeployManifestPath));

    expect(evidence.producer_basis.apple_rc_commit)
      .toBe("f23aac2d1dd27d9f9bbcce2c690f7c14478d6969");
    expect(evidence.producer_basis.predeploy_integration_commit)
      .toBe("0a459a511d5271597294c0d926e05568ccaabbef");
    expect(evidence.accepted_predeploy.evidence_sha256)
      .toBe(sha256(read(predeployEvidencePath)));
    expect(evidence.accepted_predeploy.manifest_sha256)
      .toBe(sha256(read(predeployManifestPath)));
    expect(evidence.accepted_predeploy.package_sha256).toBe(predeployManifest.package_sha256);
    expect(evidence.accepted_predeploy.consumer_commit)
      .toBe("59e84cb70f07cb2e51c09e267d2d209aaf805421");
    expect(evidence.accepted_predeploy.consumer_acceptance_sha256)
      .toBe("cf352c7af509cd3ff1b61039e1437059d574697713e05b30e0cfa0224013554d");
  });

  it("proves exactly the one Registry apply and four unchanged-draft campaigns", () => {
    const evidence = JSON.parse(read(`${base}/postdeploy-evidence.json`));
    const migration = evidence.remote_registry_migration;
    const campaigns = evidence.database_assurance.draft_campaigns;

    expect(migration).toMatchObject({
      remote_version: "20260810183222",
      name: "feedback_intelligence_visualization_copy_v1_1_2",
      applied: true,
    });
    expect(migration.local_sha256).toBe(sha256(read(migration.local_path)));
    expect(campaigns).toHaveLength(4);
    expect(campaigns.map((campaign: { content_version: string }) => campaign.content_version))
      .toEqual(Array(4).fill("feedback-intelligence-content-v1.1.2"));
    expect(campaigns.map((campaign: { status: string }) => campaign.status))
      .toEqual(Array(4).fill("draft"));
    expect(campaigns.map((campaign: { questionnaire_manifest_hash: string }) => (
      campaign.questionnaire_manifest_hash
    ))).toEqual([
      "48c2bf887ec96a0cc49eb327b380f7da7d163beb08929b9b359bfa0356692f2c",
      "679f09ab0a4c08a0521404cbbef2d88a8f0121cb353c42f310a3f09cc20689e8",
      "b566002d6f1d0c74f1eafb8554f370fa7f409f871473717079a478ad7b238b44",
      "b8b1eb9e97348090e2993ee634dc0616228f6c1138b450174d132f48b1029600",
    ]);
  });

  it("keeps the audit metadata-only and the Runtime/Reader/Edge boundary unchanged", () => {
    const evidence = JSON.parse(read(`${base}/postdeploy-evidence.json`));
    const audit = JSON.parse(read(`${base}/remote-audit-result-2026-08-10-v0-3-3.json`));

    expect(audit.data_access).toEqual({
      catalog_metadata_only: true,
      application_rows_read: false,
      application_functions_called: false,
      database_mutated: false,
    });
    expect(evidence.database_assurance).toMatchObject({
      reader_direct_relation_privileges: 0,
      reader_direct_sequence_privileges: 0,
      reader_callable_function_count: 1,
      public_execute_default_count: 0,
    });
    expect(evidence.database_assurance.gateway_execute_matrix).toEqual({
      anon: false,
      authenticated: false,
      service_role: false,
      mahleos_feedback_reader: true,
    });
    expect(Object.values({
      export_unchanged: evidence.runtime_assurance.export_unchanged,
      request_schema_unchanged: evidence.runtime_assurance.request_schema_unchanged,
      gateway_definition_unchanged: evidence.runtime_assurance.gateway_definition_unchanged,
      internal_export_definition_unchanged:
        evidence.runtime_assurance.internal_export_definition_unchanged,
      edge_source_unchanged: evidence.edge_assurance.source_unchanged,
    }).every(Boolean)).toBe(true);
    expect(evidence.edge_assurance).toMatchObject({
      observed_version: 25,
      status: "ACTIVE",
      redeployed_for_v0_3_3: false,
    });
  });

  it("regenerates every evidence and package pin deterministically", () => {
    const result = spawnSync(process.execPath, [
      "scripts/generate-feedback-combined-staging-postdeploy-v0-2.mjs",
      "--check",
    ], { cwd: process.cwd(), encoding: "utf8" });

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(result.stdout).toContain(
      "PASS_V0_3_3_POSTDEPLOY_ASSURANCE_UNSIGNED_AWAITING_CONSUMER_REVIEW",
    );
    expect(result.stdout).toContain('"exact_registry_migrations_applied": 1');
    expect(result.stdout).toContain('"runtime_bytes_unchanged": true');
    expect(result.stdout).toContain('"all_external_gates_closed": true');
  });

  it("pins every packaged byte and its deterministic package digest", () => {
    const manifest = JSON.parse(read(`${base}/producer-package-manifest.json`));
    const packageInput = manifest.files
      .map(({ path, sha256: digest }: { path: string; sha256: string }) => `${digest}  ${path}\n`)
      .join("");

    for (const file of manifest.files) {
      expect(file.sha256).toBe(sha256(readFileSync(resolve(process.cwd(), file.path))));
    }
    expect(manifest.package_sha256).toBe(sha256(packageInput));
    expect(manifest.package_status)
      .toBe("SANITIZED_UNSIGNED_V0_3_3_AWAITING_CONSUMER_POSTDEPLOY_REVIEW");
  });
});
