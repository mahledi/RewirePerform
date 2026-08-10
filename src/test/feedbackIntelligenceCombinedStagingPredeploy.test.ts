import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

const base = "docs/feedback-intelligence/contracts/combined-staging-predeploy-v0.1";
const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

describe("Feedback Intelligence combined Staging predeploy evidence", () => {
  it("is strict-schema valid and keeps every external gate closed", () => {
    const schema = JSON.parse(read(`${base}/evidence.schema.json`));
    const evidence = JSON.parse(read(`${base}/evidence.json`));
    const validate = new Ajv2020({ strict: true, validateFormats: false }).compile(schema);

    expect(validate(evidence), JSON.stringify(validate.errors)).toBe(true);
    expect(Object.values(evidence.gates).every((value) => value === false)).toBe(true);
    expect(evidence.evidence_status).toBe("PREPARED_FAIL_CLOSED_AWAITING_SEPARATE_STAGING_APPLY");
    expect(evidence.next_gate.separate_staging_apply_approval_required).toBe(true);
  });

  it("pins the exact locally accepted semantics, export and combined gateway packages", () => {
    const evidence = JSON.parse(read(`${base}/evidence.json`));
    const paths = {
      semantics: "docs/feedback-intelligence/contracts/v0.3/producer-package-manifest.json",
      export: "docs/feedback-intelligence/contracts/v0.2.1/producer-package-manifest.json",
      gateway: "docs/feedback-intelligence/contracts/machine-gateway-v0.1/producer-package-manifest.json",
    };

    for (const [key, path] of Object.entries(paths)) {
      const source = read(path);
      const manifest = JSON.parse(source);
      expect(evidence.producer_inputs[key].manifest_sha256).toBe(sha256(source));
      expect(evidence.producer_inputs[key].package_sha256).toBe(manifest.package_sha256);
    }
    expect(evidence.producer_inputs.gateway.consumer_commit)
      .toBe("f203e8efc28b76921f21458dcc0ce473b5d279ad");
    expect(evidence.producer_inputs.gateway.consumer_acceptance_sha256)
      .toBe("35606d4e9a963fc15e658ae369931be0db22bac0d6a9b2614c6555eff9e8009d");
  });

  it("pins only unapplied Staging payload bytes and rejects historical authorization", () => {
    const evidence = JSON.parse(read(`${base}/evidence.json`));

    for (const migration of evidence.staging_payload.migrations) {
      expect(migration.sha256).toBe(sha256(read(migration.path)));
      expect(migration.status).toBe("NOT_APPLIED_BY_THIS_GATE");
    }
    expect(evidence.staging_payload.edge.status).toBe("NOT_DEPLOYED_BY_THIS_GATE");
    expect(evidence.historical_evidence).toEqual({
      v0_3_1_authorizes_v0_3_2: false,
      v0_2_0_authorizes_v0_2_1: false,
      prior_gateway_authorizes_combined_gate: false,
      historical_bytes_preserved: true,
    });
  });
});
