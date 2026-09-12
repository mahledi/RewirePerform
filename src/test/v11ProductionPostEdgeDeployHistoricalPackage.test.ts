// @vitest-environment node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const base = "docs/feedback-intelligence/contracts/production-post-edge-deploy-preflight-v0.1";
const producerCommit = "caf779bdf7594851d85b048e7e102448b87e7058";
const activationProducerCommit = "62f14138c889c526e6ee180a4f1d76c9a997d9d3";
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const sourcePinsAt = (commit: string, edgeFunctions: Record<string, { remote_files: Record<string, string> }>) => {
  execFileSync("git", ["rev-parse", "--verify", `${commit}^{commit}`], { cwd: root });
  for (const deployed of Object.values(edgeFunctions)) {
    for (const [path, pinned] of Object.entries(deployed.remote_files)) {
      const content = execFileSync("git", ["show", `${commit}:${path}`], { cwd: root });
      expect(sha256(content), path).toBe(pinned);
    }
  }
};

describe("V1.1 historical Production post-Edge-deploy preflight package", () => {
  it("keeps the historical package immutable and schema-valid", () => {
    const schema = JSON.parse(read(`${base}/evidence.schema.json`));
    const evidence = JSON.parse(read(`${base}/evidence.json`));
    const validate = new Ajv2020({ strict: true, validateFormats: false }).compile(schema);
    expect(validate(evidence), JSON.stringify(validate.errors)).toBe(true);

    const manifest = JSON.parse(read(`${base}/producer-package-manifest.json`));
    const digestInput = manifest.files.map(({ path, sha256: pinned }: { path: string; sha256: string }) => {
      const actual = sha256(readFileSync(resolve(root, path)));
      expect(actual, path).toBe(pinned);
      return `${actual}  ${path}\n`;
    }).join("");
    expect(sha256(digestInput)).toBe(manifest.package_sha256);
  });

  it("verifies recorded remote source pins at their original producer commit", () => {
    const evidence = JSON.parse(read(`${base}/evidence.json`));
    sourcePinsAt(producerCommit, evidence.edge_functions);
  });

  it("keeps the activation preflight historical, closed, and byte-pinned at its recorded Main commit", () => {
    const activationBase = "docs/feedback-intelligence/contracts/production-feedback-activation-preflight-v0.1";
    const schema = JSON.parse(read(`${activationBase}/evidence.schema.json`));
    const evidence = JSON.parse(read(`${activationBase}/post-install-preflight-evidence.json`));
    const validate = new Ajv2020({ strict: true, validateFormats: false }).compile(schema);
    expect(validate(evidence), JSON.stringify(validate.errors)).toBe(true);
    expect(evidence.source_main_commit).toBe(activationProducerCommit);
    expect(Object.values(evidence.gates)).not.toContain(true);
    expect(Object.values(evidence.authorization_boundary)).not.toContain(true);
    sourcePinsAt(activationProducerCommit, evidence.edge_functions);

    const historicalSourcePaths = new Set(
      Object.values(evidence.edge_functions).flatMap(
        ({ remote_files }: { remote_files: Record<string, string> }) => Object.keys(remote_files),
      ),
    );
    const manifest = JSON.parse(read(`${activationBase}/producer-package-manifest.json`));
    const digestInput = manifest.files.map(({ path, sha256: pinned }: { path: string; sha256: string }) => {
      const bytes = historicalSourcePaths.has(path)
        ? execFileSync("git", ["show", `${activationProducerCommit}:${path}`], { cwd: root })
        : readFileSync(resolve(root, path));
      const actual = sha256(bytes);
      expect(actual, path).toBe(pinned);
      return `${actual}  ${path}\n`;
    }).join("");
    expect(sha256(digestInput)).toBe(manifest.package_sha256);
  });
});
