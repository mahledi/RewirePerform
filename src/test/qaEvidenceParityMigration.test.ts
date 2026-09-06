import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260717091518_qa_evidence_parity_gate.sql"),
  "utf8",
);

const body = (name: string, nextName?: string) => {
  const start = migration.indexOf(`CREATE OR REPLACE FUNCTION public.${name}`);
  const end = nextName
    ? migration.indexOf(`CREATE OR REPLACE FUNCTION public.${nextName}`, start + 1)
    : migration.length;
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return migration.slice(start, end);
};

describe("QA evidence parity migration", () => {
  it("keeps the QA report admin-only and count-only", () => {
    const parity = body("get_qa_evidence_parity", "archive_qa_cohort");
    expect(parity).toContain("admin_role_required");
    expect(parity).toContain("qa_test_run_required");
    expect(parity).toContain("public.get_performance_evidence_summary(\n    _program_run_id,\n    false");
    expect(parity).toContain("'response_values_exposed', false");
    expect(parity).toContain("'athlete_identifiers_exposed', false");
    expect(parity).toContain("'private_text_exposed', false");
    expect(parity).not.toContain("full_name");
    expect(parity).not.toContain("email");
    expect(parity).not.toContain("daily_journals");
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.get_qa_evidence_parity(uuid, text) FROM PUBLIC, anon;",
    );
  });

  it("checks all 16 days, atomic linkage, test flags, and production isolation", () => {
    const parity = body("get_qa_evidence_parity", "archive_qa_cohort");
    expect(parity).toContain("FROM public.evidence_transfer_schedule ets");
    expect(parity).toContain("completion_without_evidence");
    expect(parity).toContain("evidence_without_completion");
    expect(parity).toContain("observations_visible_in_production");
    expect(parity).toContain("participants_without_both_test_flags");
    expect(parity).toContain("COUNT(*) FROM day_status_rows");
  });

  it("uses simulated QA time for both coach read and write paths", () => {
    for (const functionName of ["get_coach_evidence_review_context", "save_coach_evidence_review"]) {
      const functionText = body(functionName, functionName === "get_coach_evidence_review_context"
        ? "save_coach_evidence_review"
        : undefined);
      expect(functionText).toContain("effective_today := public.get_effective_today(actor_id)");
      expect(functionText).toContain("effective_today - target_run.started_at");
      expect(functionText).not.toContain("CURRENT_DATE - target_run.started_at");
    }
  });

  it("wipes the new evidence rows before archiving a QA cohort", () => {
    const archive = body("archive_qa_cohort", "get_coach_evidence_review_context");
    expect(archive).toContain("refusing_to_archive_non_test_team");
    expect(archive).toContain("DELETE FROM public.athlete_transfer_observations");
    expect(archive).toContain("DELETE FROM public.coach_evidence_reviews");
    expect(archive).toContain("DELETE FROM public.study_evidence_snapshots");
    expect(archive).toContain("SET status = 'archived'");
  });
});
