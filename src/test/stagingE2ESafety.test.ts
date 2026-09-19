import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const script = resolve(process.cwd(), "scripts/nlz-staging-e2e.mjs");
const stagingRef = "zbeswjipayspgvcipzmx";
const retiredStagingRef = "towgvykgezrmkbyudjen";
const productionRef = "bqsbxesmybthwtxmowfz";
const approval = "STAGING_SYNTHETIC_WRITE_APPROVED";

function cleanEnvironment(overrides: Record<string, string> = {}) {
  const environment = { ...process.env, ...overrides };
  delete environment.NLZ_QA_SUPABASE_URL;
  delete environment.NLZ_QA_ANON_KEY;
  delete environment.NLZ_QA_SERVICE_ROLE_KEY;
  delete environment.NLZ_QA_WRITE_APPROVAL;
  return { ...environment, ...overrides };
}

function run(args: string[], overrides: Record<string, string> = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: "utf8",
    env: cleanEnvironment(overrides),
  });
}

describe("staging E2E write safety", () => {
  it("prints the plan without credentials or network access", () => {
    const result = run(["--plan"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      `TARGET: approved Supabase Staging project ${stagingRef}`,
    );
    expect(result.stdout).toContain(
      `RETIRED PROJECT: ${retiredStagingRef} (execution blocked)`,
    );
    expect(result.stdout).toContain("NETWORK: disabled");
    expect(result.stdout).toContain("DAY CONTEXTS: training, rest and competition");
  });

  it("requires an explicit mode", () => {
    const result = run([]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Choose exactly one mode");
  });

  it("keeps NLZ writes to the approved Staging project separately gated", () => {
    const result = run(["--execute"], {
      NLZ_QA_SUPABASE_URL: `https://${stagingRef}.supabase.co`,
      NLZ_QA_ANON_KEY: "not-a-real-anon-key",
      NLZ_QA_SERVICE_ROLE_KEY: "not-a-real-service-key",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Remote NLZ staging E2E execution remains disabled");
  });

  it("permanently rejects the retired project", () => {
    const result = run(["--execute"], {
      NLZ_QA_SUPABASE_URL: `https://${retiredStagingRef}.supabase.co`,
      NLZ_QA_ANON_KEY: "not-a-real-anon-key",
      NLZ_QA_SERVICE_ROLE_KEY: "not-a-real-service-key",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      `Retired Supabase project ${retiredStagingRef} is permanently blocked`,
    );
  });

  it("permanently rejects the Production project", () => {
    const result = run(["--execute"], {
      NLZ_QA_SUPABASE_URL: `https://${productionRef}.supabase.co`,
      NLZ_QA_ANON_KEY: "not-a-real-anon-key",
      NLZ_QA_SERVICE_ROLE_KEY: "not-a-real-service-key",
      NLZ_QA_WRITE_APPROVAL: approval,
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Production is permanently blocked");
  });
});
