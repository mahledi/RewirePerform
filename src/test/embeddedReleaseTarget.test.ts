import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const script = resolve(process.cwd(), "scripts/verify-embedded-ios-target.mjs");
const productionRef = "bqsbxesmybthwtxmowfz";
const stagingRef = "towgvykgezrmkbyudjen";
const temporaryRoots: string[] = [];

function fixture(content: string) {
  const root = mkdtempSync(join(tmpdir(), "rewire-ios-target-"));
  temporaryRoots.push(root);
  const assets = join(root, "assets");
  mkdirSync(assets);
  writeFileSync(join(assets, "app.js"), content);
  return root;
}

function verify(root: string) {
  return spawnSync(process.execPath, [script, "--root", root], {
    encoding: "utf8",
  });
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("embedded iOS release target", () => {
  it("accepts a Production-only native bundle", () => {
    const result = verify(fixture(`const project = "${productionRef}";`));

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("iOS embedded target validation passed");
  });

  it("rejects a Staging ref even when Production is also present", () => {
    const result = verify(
      fixture(`const refs = ["${productionRef}", "${stagingRef}"];`),
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("forbidden non-Production refs");
  });

  it("rejects a bundle without the Production ref", () => {
    const result = verify(fixture("const project = 'missing';"));

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("do not contain Production ref");
  });
});
