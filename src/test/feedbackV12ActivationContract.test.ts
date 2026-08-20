import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260820080207_structured_feedback_v1_2_activation_contract.sql",
  ),
  "utf8",
);

describe("V1.2 Feedback Intelligence activation contract", () => {
  it("jointly opens structured checkpoints and the separately consented text path", () => {
    expect(migration).toContain("athlete_collection_enabled = true");
    expect(migration).toContain("text_collection_enabled = true");
    expect(migration).toContain("structured_collection_status = 'approved'");
    expect(migration).toContain("raw_text_collection_status = 'approved'");
    expect(migration).toContain("feedback_core.jurisdiction_policy_ready('DE', true)");
    expect(migration).toContain("guardian-feedback-text-de-v1.2.0");
    expect(migration).toContain("guardian_text_policy_active', true");
  });

  it("versions the admin-only consent while preserving the historical baseline", () => {
    expect(migration).toContain("product-improvement-internal-admin-review-v1");
    expect(migration).toContain("feedback-text-consent-v1.2.0");
    expect(migration).toContain("product-improvement-individual-text-ai-analysis-v1");
    expect(migration).toContain("raw_text_retention_days = 365");
    expect(migration).toContain("processor_mode = 'no_external_processor'");
    expect(migration).toContain("minor_auth.enforcement_enabled()");
    expect(migration).toContain("Runtime collection remains closed");
  });

  it("is owner-only, fail-closed and ships a complete emergency re-close", () => {
    expect(migration).toMatch(/controller-assessment-de-feedback-v1\\\.2:/);
    expect(migration).toContain("feedback_v1_2_activation_runtime_baseline_drift");
    expect(migration).toContain("reclose_feedback_v1_2");
    expect(migration).toContain("raw_text_collection_status = 'paused'");
    expect(migration).toContain("status = 'retired'");
    expect(migration).toMatch(/REVOKE ALL ON FUNCTION feedback_core\.activate_feedback_v1_2\(text\)[\s\S]*FROM PUBLIC, anon, authenticated, service_role/);
    expect(migration).toMatch(/REVOKE ALL ON FUNCTION feedback_core\.reclose_feedback_v1_2\(text\)[\s\S]*FROM PUBLIC, anon, authenticated, service_role/);
  });
});
