import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readRepoFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("NLZ privacy and tracking boundaries", () => {
  it("never selects private reflection text in the coach team pulse function", () => {
    const source = readRepoFile("supabase/functions/team-mental-state/index.ts");
    const numericCheckinSelect = source.match(
      /\.from\("daily_checkins"\)\s*\.select\("([^"]+)"\)/,
    )?.[1];

    expect(numericCheckinSelect).toBeTruthy();
    expect(numericCheckinSelect).not.toContain("reflection");
    expect(source).toContain('.eq("program_run_id", activeRun.id)');
  });

  it("suppresses run-scoped psychological aggregate values below n=5", () => {
    const migration = readRepoFile(
      "supabase/migrations/20260710130000_nlz_pilot_readiness_evidence_v2.sql",
    );

    expect(migration).toContain("'sufficient_data', n >= 5");
    expect(migration).toContain("'mood', CASE WHEN n >= 5 THEN mood END");
    expect(migration).toContain("COUNT(*) >= 5 THEN ROUND(AVG(pre_score)");
    expect(migration).toContain("consented_run_scoped_aggregate_only");
  });

  it("commits the check-in before completion inside one atomic database function", () => {
    const migration = readRepoFile(
      "supabase/migrations/20260710120000_program_runs_tracking_pipeline_v2.sql",
    );
    const functionBody = migration.slice(migration.indexOf("CREATE OR REPLACE FUNCTION public.save_daily_tracking_v2"));

    expect(functionBody.indexOf("INSERT INTO public.daily_checkins")).toBeGreaterThan(-1);
    expect(functionBody.indexOf("INSERT INTO public.user_day_completion"))
      .toBeGreaterThan(functionBody.indexOf("INSERT INTO public.daily_checkins"));
    expect(functionBody).toContain("pg_advisory_xact_lock");
    expect(functionBody).toContain("active_program_instance_required");
  });

  it("declares private fields as excluded from every run dossier", () => {
    const migration = readRepoFile(
      "supabase/migrations/20260710130000_nlz_pilot_readiness_evidence_v2.sql",
    );
    for (const field of ["journal_text", "free_reflection", "raw_checkins", "raw_answers", "individual_scores"]) {
      expect(migration).toContain(`'${field}'`);
    }
  });
});
