import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readRepoFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("NLZ privacy and tracking boundaries", () => {
  it("never selects private reflection text in the coach team pulse function", () => {
    const source = readRepoFile("supabase/functions/team-mental-state/index.ts");
    const aggregate = readRepoFile(
      "supabase/migrations/20260720082309_harden_team_mental_state_aggregate.sql",
    );

    expect(source).toContain('client.rpc("get_team_mental_state_aggregate"');
    expect(source).not.toContain('.from("daily_checkins")');
    expect(source).not.toContain("adminClient");
    expect(aggregate).not.toContain("dc.reflection");
    expect(aggregate).toContain("pi.program_run_id = active_run_id");
    expect(aggregate).toContain("'mood', CASE WHEN ds.mood_n >= 5 THEN ds.mood END");
    expect(aggregate).toContain("'stress', CASE WHEN ds.stress_n >= 5 THEN ds.stress END");
    expect(aggregate).toContain("GROUP BY scr.user_id, scr.date");
    expect(aggregate).toContain("GROUP BY wp.week_offset, wp.start_date, wp.label, sc.user_id");
  });

  it("returns direct team observations without unsupported psychological proxies", () => {
    const source = readRepoFile("supabase/functions/team-mental-state/index.ts");
    const coachView = readRepoFile("src/components/coach/TeamMentalState.tsx");

    for (const unsupportedField of [
      "readiness_index",
      "coach_hints",
      "egoFreedom",
      "teamChemistry",
      "questionnaire_responses",
      "tasks_completed",
    ]) {
      expect(source).not.toContain(unsupportedField);
    }

    expect(source).toContain("never receives athlete identifiers");
    expect(source).toContain("individual check-ins");
    expect(coachView).toContain("today?.low_confidence");
    expect(coachView).toContain("Kleine Datenbasis");
    expect(coachView).toContain("nicht als Bewertung einzelner Athleten");
  });

  it("keeps evidence locks aggregate-only, payload-immutable and invalidatable", () => {
    const migration = readRepoFile(
      "supabase/migrations/20260720080100_add_structured_solo_evidence_locks.sql",
    );

    expect(migration).toContain("minimum_aggregate_n', 5");
    expect(migration).toContain("individual_values_exported', false");
    expect(migration).toContain("evidence_data_lock_payload_immutable");
    expect(migration).toContain("status IN ('active', 'invalidated')");
    expect(migration).toContain("raw_questionnaire_answers");
  });

  it("suppresses run-scoped psychological aggregate values below n=5", () => {
    const migration = readRepoFile(
      "supabase/migrations/20260720090000_unify_program_run_evidence_eligibility.sql",
    );

    expect(migration).toContain("'mood', CASE WHEN ds.mood_n >= 5 THEN ds.mood END");
    expect(migration).toContain("'stress', CASE WHEN ds.stress_n >= 5 THEN ds.stress END");
    expect(migration).toContain("CASE WHEN c.players_with_progress >= 5 THEN c.avg_completion_rate END");
    expect(migration).toContain("CASE WHEN COUNT(*) >= 5 THEN ROUND(AVG(ps.pre_score)::numeric, 2) END");
    expect(migration).toContain("currently_authorized_run_scoped_aggregate_only");
  });

  it("applies the current consent and age gate before every run evidence source", () => {
    const migration = readRepoFile(
      "supabase/migrations/20260720090000_unify_program_run_evidence_eligibility.sql",
    );
    const gate = migration.indexOf("public.evidence_eligibility_reason(pi.id, _protocol_version)");
    const firstSensitiveSource = migration.indexOf("completions AS (");

    expect(gate).toBeGreaterThan(0);
    expect(firstSensitiveSource).toBeGreaterThan(gate);
    expect(migration).toContain("DISTINCT ON (a.program_instance_id, a.assessment_type, a.timing)");
    expect(migration).toContain("'not_currently_authorized'");
    expect(migration).not.toContain("jsonb_object_agg(er.eligibility_reason");
  });

  it("applies the same gate and suppression rules to full Solo development evidence", () => {
    const migration = readRepoFile(
      "supabase/migrations/20260720090000_unify_program_run_evidence_eligibility.sql",
    );
    const start = migration.indexOf("CREATE OR REPLACE FUNCTION public.get_solo_development_evidence_summary");
    const end = migration.indexOf("CREATE OR REPLACE FUNCTION public.create_evidence_data_lock", start);
    const soloFunction = migration.slice(start, end);

    expect(start).toBeGreaterThan(0);
    expect(soloFunction.indexOf("public.evidence_eligibility_reason(pi.id, _protocol_version)"))
      .toBeLessThan(soloFunction.indexOf("completions AS ("));
    expect(soloFunction).toContain("CASE WHEN c.participants_with_snapshot >= 5 THEN c.avg_completion_rate END");
    expect(soloFunction).toContain("CASE WHEN COUNT(*) >= 5 THEN ROUND(AVG(ps.pre_score)::numeric, 2) END");
    expect(soloFunction).toContain("'not_currently_authorized'");
    expect(soloFunction).toContain("'individual_values_present', false");
    expect(soloFunction).not.toContain("full_name");
    expect(soloFunction).not.toContain("email");
  });

  it("keeps the coach change rows aligned with the rendered UI contract", () => {
    const migration = readRepoFile(
      "supabase/migrations/20260720090000_unify_program_run_evidence_eligibility.sql",
    );

    for (const field of [
      "assessment_type",
      "subscale",
      "n_pairs",
      "avg_pre",
      "avg_post",
      "abs_change",
      "cohens_d_z",
      "sufficient_data",
      "low_confidence",
    ]) {
      expect(migration).toContain(field);
    }
    expect(migration).toContain("'changes', evidence -> 'changes'");
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
      "supabase/migrations/20260720090000_unify_program_run_evidence_eligibility.sql",
    );
    for (const field of ["journal_text", "free_reflection", "raw_checkins", "raw_answers", "individual_scores"]) {
      expect(migration).toContain(`'${field}'`);
    }
  });
});
