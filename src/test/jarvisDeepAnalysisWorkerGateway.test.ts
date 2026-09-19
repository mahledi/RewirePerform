import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(
  "supabase/functions/jarvis-deep-analysis-worker/index.ts",
), "utf8");
const config = readFileSync(resolve("supabase/config.toml"), "utf8");

describe("Jarvis deep-analysis worker gateway", () => {
  it("reuses machine authentication and has no table path", () => {
    expect(source).toContain("authenticateMahleOsMachine(request)");
    expect(source).toContain('client.rpc("claim_jarvis_deep_analysis_job"');
    expect(source).toContain('client.rpc("complete_jarvis_deep_analysis_job"');
    expect(source).not.toContain(".from(");
    expect(source).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("bounds and validates completion output", () => {
    expect(source).toContain("readBoundedRequestText(request, 52_000)");
    expect(source).toContain("jarvis-deep-analysis-result-v1");
    expect(source).toContain("subject_reference");
    expect(source).toContain("individual_score");
  });

  it("is explicitly configured for machine auth", () => {
    expect(config).toContain("[functions.jarvis-deep-analysis-worker]\nverify_jwt = false");
  });
});
