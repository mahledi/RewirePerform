import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const script = resolve(process.cwd(), "scripts/validate-release-target.mjs");
const productionRef = "bqsbxesmybthwtxmowfz";
const stagingRef = "zbeswjipayspgvcipzmx";
const retiredStagingRef = "towgvykgezrmkbyudjen";

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
        VITE_RELEASE_LINE: "1.1",
        VITE_FEEDBACK_INTELLIGENCE_V1_ENABLED: "false",
        VITE_FEEDBACK_TEXT_V1_ENABLED: "false",
        ...overrides,
      },
    },
  );

const runStagingValidation = (overrides: Record<string, string>) =>
  spawnSync(
    process.execPath,
    [script, "--expected", "staging", "--mode", "staging"],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        VITE_APP_ENV: "staging",
        VITE_SUPABASE_PROJECT_ID: stagingRef,
        VITE_SUPABASE_URL: `https://${stagingRef}.supabase.co`,
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

  it("accepts the confirmed isolated Staging target", () => {
    const result = runStagingValidation({});

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("release target validation passed: staging");
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
    const result = runStagingValidation({
      VITE_SUPABASE_PROJECT_ID: retiredStagingRef,
      VITE_SUPABASE_URL: `https://${retiredStagingRef}.supabase.co`,
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("retired Staging project");
    expect(result.stderr).toContain(retiredStagingRef);
  });

  it("rejects an invalid publishable key shape", () => {
    const result = runValidation({
      VITE_SUPABASE_PUBLISHABLE_KEY: "not-a-real-key",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("valid Supabase publishable");
  });

  it("rejects a valid-shaped Staging key on a Production build", () => {
    const result = runValidation({
      VITE_SUPABASE_PUBLISHABLE_KEY:
        "sb_publishable_098765432109876543210987654321",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("must match the confirmed production project");
  });

  it("rejects a V1.1 Production client that would activate Feedback Intelligence", () => {
    const result = runValidation({ VITE_FEEDBACK_INTELLIGENCE_V1_ENABLED: "true" });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "VITE_FEEDBACK_INTELLIGENCE_V1_ENABLED must be false for the V1.1 production client",
    );
  });

  it("accepts the complete V1.2 Feedback Intelligence production client", () => {
    const result = runValidation({
      VITE_RELEASE_LINE: "1.2",
      VITE_FEEDBACK_INTELLIGENCE_V1_ENABLED: "true",
      VITE_FEEDBACK_TEXT_V1_ENABLED: "true",
    });

    expect(result.status).toBe(0);
  });

  it("rejects a V1.2 production client that silently omits the agreed text path", () => {
    const result = runValidation({
      VITE_RELEASE_LINE: "1.2",
      VITE_FEEDBACK_INTELLIGENCE_V1_ENABLED: "true",
      VITE_FEEDBACK_TEXT_V1_ENABLED: "false",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "VITE_FEEDBACK_TEXT_V1_ENABLED must be true for the separately consented V1.2 text path",
    );
  });
});
