import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

const base = "docs/feedback-intelligence/contracts/combined-staging-predeploy-v0.2";
const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");

describe("Feedback Intelligence v0.3.3 Combined Staging predeploy evidence", () => {
  it("is strict-schema valid and keeps every external gate closed", () => {
    const schema = JSON.parse(read(`${base}/evidence.schema.json`));
    const evidence = JSON.parse(read(`${base}/evidence.json`));
    const validate = new Ajv2020({ strict: true, validateFormats: false }).compile(schema);

    expect(validate(evidence), JSON.stringify(validate.errors)).toBe(true);
    expect(evidence.evidence_status)
      .toBe("PREPARED_FAIL_CLOSED_V0_3_3_AWAITING_SINGLE_REGISTRY_MIGRATION_APPLY");
    expect(Object.values(evidence.gates).every((value) => value === false)).toBe(true);
    expect(evidence.next_gate.separate_staging_apply_approval_required).toBe(true);
    expect(evidence.next_gate.credentials_allowed).toBe(false);
    expect(evidence.next_gate.network_read_allowed).toBe(false);
    expect(evidence.next_gate.production_allowed).toBe(false);
  });

  it("pins the exact v0.3.3 Jarvis acceptances and unchanged v0.2.1 export", () => {
    const evidence = JSON.parse(read(`${base}/evidence.json`));
    const semanticsSource = read("docs/feedback-intelligence/contracts/v0.3/producer-package-manifest.json");
    const exportSource = read("docs/feedback-intelligence/contracts/v0.2.1/producer-package-manifest.json");
    const gatewaySource = read("docs/feedback-intelligence/contracts/machine-gateway-v0.1/producer-package-manifest.json");

    expect(evidence.producer_basis.release_commit)
      .toBe("c132feba8e2b540475a54fef258b17bd4dafc7df");
    expect(evidence.producer_basis.feedback_integration_commit)
      .toBe("b418a54a06fadf8fc4d1e7f96ec3ebe7b27e3c7c");

    expect(evidence.producer_inputs.semantics.manifest_sha256).toBe(sha256(semanticsSource));
    expect(evidence.producer_inputs.semantics.consumer_commit)
      .toBe("71f853da86a0d6450233c695702747d52059cd6e");
    expect(evidence.producer_inputs.semantics.consumer_acceptance_sha256)
      .toBe("a5563f83bcaef42d743ee898cdf02331d7965d18b88ab4ad431bde35f6176818");

    expect(evidence.producer_inputs.export.manifest_sha256).toBe(sha256(exportSource));
    expect(evidence.producer_inputs.export.package_sha256)
      .toBe("8c1bd5807865c41c7572ddd47872bca355515f99a4f7ef1f17a017d1bd35794b");

    expect(evidence.producer_inputs.gateway.manifest_sha256).toBe(sha256(gatewaySource));
    expect(evidence.producer_inputs.gateway.consumer_commit)
      .toBe("71f853da86a0d6450233c695702747d52059cd6e");
    expect(evidence.producer_inputs.gateway.consumer_acceptance_sha256)
      .toBe("a2a236212b7e4e1f5c6ce323c9ddd9ee1b583f4f1974bcb251a33603f4a0f8d6");
  });

  it("contains exactly one new Registry migration and no runtime or Edge delta", () => {
    const evidence = JSON.parse(read(`${base}/evidence.json`));
    const [migration] = evidence.staging_delta.pending_migrations;
    const runtime = evidence.staging_delta.runtime_bytes;

    expect(evidence.staging_delta.pending_migrations).toHaveLength(1);
    expect(migration.path)
      .toBe("supabase/migrations/20260810154932_feedback_intelligence_visualization_copy_v1_1_2.sql");
    expect(migration.sha256).toBe(sha256(read(migration.path)));
    expect(migration.status).toBe("NOT_APPLIED_BY_THIS_GATE");

    expect(runtime.export_manifest_sha256)
      .toBe(sha256(read("docs/feedback-intelligence/contracts/v0.2.1/producer-package-manifest.json")));
    expect(runtime.export_schema_sha256)
      .toBe(sha256(read("docs/feedback-intelligence/contracts/v0.2.1/proposed-export.schema.json")));
    expect(runtime.gateway_request_schema_sha256)
      .toBe(sha256(read("docs/feedback-intelligence/contracts/machine-gateway-v0.1/request.schema.json")));
    expect(runtime.edge_source_sha256)
      .toBe(sha256(read("supabase/functions/mahleos-feedback-intelligence-read/index.ts")));
    expect(runtime.export_unchanged).toBe(true);
    expect(runtime.request_schema_unchanged).toBe(true);
    expect(runtime.edge_source_unchanged).toBe(true);
    expect(runtime.edge_redeploy_required).toBe(false);
    expect(evidence.next_gate.exact_database_mutations_required).toBe(1);
    expect(evidence.next_gate.edge_redeploy_required).toBe(false);
  });

  it("keeps prior Staging evidence historical and states the exact audit boundary", () => {
    const evidence = JSON.parse(read(`${base}/evidence.json`));
    const historicalPredeploy = read(
      "docs/feedback-intelligence/contracts/combined-staging-predeploy-v0.1/evidence.json",
    );
    const historicalPostdeploy = read(
      "docs/feedback-intelligence/contracts/combined-staging-postdeploy-v0.1/postdeploy-evidence.json",
    );

    expect(evidence.accepted_historical_staging.predeploy_evidence_sha256)
      .toBe(sha256(historicalPredeploy));
    expect(evidence.accepted_historical_staging.postdeploy_evidence_sha256)
      .toBe(sha256(historicalPostdeploy));
    expect(evidence.accepted_historical_staging.historical_baseline_only).toBe(true);
    expect(evidence.historical_evidence.v0_3_2_postdeploy_authorizes_v0_3_3).toBe(false);
    expect(evidence.historical_evidence.v0_3_2_synthetic_read_authorizes_v0_3_3).toBe(false);
    expect(evidence.historical_evidence.silent_reinterpretation_allowed).toBe(false);

    expect(evidence.next_gate.metadata_only_audit_without_prior_apply_sufficient).toBe(false);
    expect(evidence.next_gate.metadata_only_audit_after_apply_sufficient).toBe(true);
    expect(evidence.gates.database_write_performed).toBe(false);
    expect(evidence.gates.edge_deploy_performed).toBe(false);
  });

  it("pins every packaged file and the deterministic package digest", () => {
    const manifest = JSON.parse(read(`${base}/producer-package-manifest.json`));
    const packageInput = manifest.files
      .map(({ path, sha256: digest }: { path: string; sha256: string }) => `${digest}  ${path}\n`)
      .join("");

    for (const file of manifest.files) {
      expect(file.sha256).toBe(sha256(readFileSync(resolve(process.cwd(), file.path))));
    }
    expect(manifest.package_sha256).toBe(sha256(packageInput));
    expect(manifest.package_status)
      .toBe("LOCAL_UNSIGNED_FAIL_CLOSED_AWAITING_SINGLE_REGISTRY_MIGRATION_APPLY");
  });
});
