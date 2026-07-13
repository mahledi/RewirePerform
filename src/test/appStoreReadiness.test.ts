import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("App Store static readiness gate", () => {
  it("keeps the native identity, privacy contract and icon valid", () => {
    const result = spawnSync(
      process.execPath,
      [resolve(process.cwd(), "scripts/verify-app-store-readiness.mjs")],
      { encoding: "utf8" },
    );

    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("App Store static readiness checks passed.");
  });
});
