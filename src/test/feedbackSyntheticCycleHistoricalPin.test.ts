import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const verifier = readFileSync(
  resolve(process.cwd(), "scripts/verify-feedback-intelligence-synthetic-cycle.mjs"),
  "utf8",
);
const manifest = JSON.parse(
  readFileSync(
    resolve(
      process.cwd(),
      "docs/feedback-intelligence/contracts/synthetic-staging-one-read-v0.2/producer-package-manifest.json",
    ),
    "utf8",
  ),
) as { files: Array<{ path: string; sha256: string }> };

describe("historical synthetic-cycle evidence", () => {
  it("verifies immutable package bytes at an exact historical commit", () => {
    expect(verifier).toContain(
      'const historicalPackageCommit = "1c394d8d7b1c47597ca1d1c37bf17d8a7c5bda2e";',
    );
    expect(verifier).toContain('["show", `${historicalPackageCommit}:${path}`]');
    expect(verifier).not.toContain("readFileSync(resolve(file.path))");
  });

  it("keeps the historical manifest itself byte-pinned", () => {
    const packageEntry = manifest.files.find(({ path }) => path === "package.json");
    expect(packageEntry?.sha256).toBe(
      "ad038e0f60dbe2989d2c775119fe417560bd4ba72fd2055ebbf7fd1ac5364c74",
    );

    const digest = createHash("sha256")
      .update(readFileSync(resolve(process.cwd(), "package.json")))
      .digest("hex");
    expect(digest).not.toBe(packageEntry?.sha256);
  });
});
