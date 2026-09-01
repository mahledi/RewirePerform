import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(path), "utf8");

describe("V1.4 official pilot data boundary", () => {
  const migration = read("supabase/migrations/20260901143153_v1_4_official_pilot_data_boundary.sql");
  const contract = read("docs/evidence-v1.4/PILOT_DATA_BOUNDARY.md");

  it("separates legitimate onboarding baseline from in-program activity", () => {
    expect(migration).toContain("baseline_started_at");
    expect(migration).toContain("activity_started_at");
    expect(migration).toContain("baseline_started_at <= activity_started_at");
    expect(migration).toContain("before_activity_window");
    expect(contract).toContain("28 vollständige `onboarding_v2/v2`-Startfragebögen");
    expect(contract).toContain("Vier Pre-Assessments vor dem 1. September");
  });

  it("fails closed for unknown, unapproved, incomplete, QA and derived data", () => {
    expect(migration).toContain("pilot_window_not_approved");
    expect(migration).toContain("unknown_source");
    expect(migration).toContain("derived_output_not_source");
    expect(migration).toContain("q.is_complete row_complete");
    expect(migration).toContain("COALESCE(p.is_test_user,false)");
    expect(migration).toContain("COALESCE(pi.is_test_instance,false)");
    expect(migration).toContain("COALESCE(t.is_test_team,false)");
  });

  it("keeps private content and identifiers out of reconciliation", () => {
    expect(migration).toContain("'contains_identifiers',false");
    expect(migration).not.toMatch(/SELECT\s+[^;]*(answers|reflection|email)/i);
    expect(contract).toContain("niemals Namen, E-Mails, Antworten, Scores, Journale oder Freitext");
    expect(migration).toContain("REVOKE ALL ON FUNCTION evidence_private.reconcile_program_run_boundary_v1_4(uuid)");
    expect(migration).toContain("TO service_role");
  });

  it("adds comprehension as a separate descriptive source", () => {
    expect(migration).toContain("'comprehension_learning'");
    expect(migration).toContain("Question-level correctness and understanding rates remain descriptive");
    expect(migration).toContain("c.completed_at");
    expect(migration).toContain("c.day_number");
  });
});
