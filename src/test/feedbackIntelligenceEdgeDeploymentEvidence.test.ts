import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

const base = "docs/feedback-intelligence/contracts/edge-deployment-evidence-v0.1";
const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Feedback Intelligence Edge deployment evidence", () => {
  it("is strict-schema valid and keeps every runtime/Production gate closed", () => {
    const schema = JSON.parse(read(`${base}/evidence.schema.json`));
    const evidence = JSON.parse(read(`${base}/edge-deployment-evidence.json`));
    const validate = new Ajv2020({ strict: true }).compile(schema);
    expect(validate(evidence), JSON.stringify(validate.errors)).toBe(true);
    expect(evidence.runtime_configuration.every((item: { present: boolean }) => !item.present)).toBe(true);
    expect(evidence.network_invocation_performed).toBe(false);
    expect(evidence.production).toBe(false);
  });

  it("pins the six exact deployed source files and opaque Supabase bundle hash separately", () => {
    const evidence = JSON.parse(read(`${base}/edge-deployment-evidence.json`));
    expect(evidence.sources).toHaveLength(6);
    expect(evidence.sources.every((source: { deployed_byte_match: boolean }) => source.deployed_byte_match)).toBe(true);
    expect(evidence.source_manifest_sha256).toBe("97d6714a8871f510996cfd39fc23505fde0f5b82a02e1acfd4627f201eecbf91");
    expect(evidence.deployment.ezbr_sha256).toBe("952c86471d41377314d53c1663716717957519132233ddd7abf6aee68c7be8ee");
    expect(evidence.hash_semantics.ezbr_sha256).toContain("not treated as a local-source digest");
  });

  it("fails generated checks when local source or config bytes drift", () => {
    const generator = read("scripts/generate-feedback-edge-deployment-evidence.mjs");
    expect(generator).toContain("Edge config verify_jwt drift");
    expect(generator).toContain("currentEvidence !== evidenceSerialized");
    expect(generator).toContain("currentManifest !== manifestSerialized");
  });
});
