import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const script = resolve(process.cwd(), "scripts/validate-release-target.mjs");
const productionRef = "bqsbxesmybthwtxmowfz";

const runValidation = (overrides: Record<string, string>) =>
  spawnSync(
    process.execPath,
    [script, "--expected", "production", "--mode", "production"],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        VITE_APP_ENV: "production",
        VITE_SUPABASE_PROJECT_ID: productionRef,
        VITE_SUPABASE_URL: `https://${productionRef}.supabase.co`,
        VITE_SUPABASE_PUBLISHABLE_KEY:
          "sb_publishable_123456789012345678901234567890",
        ...overrides,
      },
    },
  );

describe("release target validation", () => {
  it("accepts the confirmed production target", () => {
    const result = runValidation({});

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("release target validation passed: production");
  });

  it("rejects a staging label on a production build", () => {
    const result = runValidation({ VITE_APP_ENV: "staging" });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("VITE_APP_ENV must be production");
  });

  it("rejects a URL and project ID mismatch", () => {
    const result = runValidation({
      VITE_SUPABASE_URL: "https://towgvykgezrmkbyudjen.supabase.co",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("VITE_SUPABASE_URL must select");
  });

  it("rejects the retired project as a Staging target", () => {
    const result = spawnSync(
      process.execPath,
      [script, "--expected", "staging", "--mode", "staging"],
      { encoding: "utf8", env: process.env },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("no approved Staging project exists");
    expect(result.stderr).toContain("towgvykgezrmkbyudjen is retired");
  });

  it("rejects an invalid publishable key shape", () => {
    const result = runValidation({
      VITE_SUPABASE_PUBLISHABLE_KEY: "not-a-real-key",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("valid Supabase publishable");
  });
});
