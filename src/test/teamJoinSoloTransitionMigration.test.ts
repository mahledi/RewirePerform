// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260830133000_safe_solo_to_team_transition_v1_3.sql"),
  "utf8",
);

describe("V1.3 solo-to-team transition migration", () => {
  it("secures the V1.3 contract and routes installed V1.2 clients through it fail-closed", () => {
    expect(migration).toContain("FUNCTION public.join_team_by_code_v1_3(");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.join_team_by_code(_code text)");
    expect(migration).toContain("SELECT public.join_team_by_code_v1_3(_code, false)");
    expect(migration).toMatch(
      /REVOKE ALL ON FUNCTION public\.join_team_by_code_v1_3\(text, boolean\)[\s\S]*FROM PUBLIC, anon/,
    );
    expect(migration).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.join_team_by_code_v1_3\(text, boolean\)[\s\S]*TO authenticated/,
    );
  });

  it("checks authorization and active-program conflicts before membership is written", () => {
    const insertPosition = migration.indexOf("INSERT INTO public.team_members");
    expect(migration.indexOf("minor_auth.participant_authorizations")).toBeLessThan(insertPosition);
    expect(migration.indexOf("solo_program_transition_confirmation_required")).toBeLessThan(insertPosition);
    expect(migration.indexOf("active_other_team_program")).toBeLessThan(insertPosition);
  });

  it("preserves questionnaire-only state but treats real program records as activity", () => {
    expect(migration).toContain("completed_questionnaire_preserved");
    expect(migration).toContain("questionnaire_progress_preserved");
    for (const table of [
      "daily_checkins",
      "daily_journals",
      "user_day_completion",
      "comprehension_check_instances",
      "assessments",
      "deep_profile_assessments",
      "athlete_transfer_observations",
      "feedback_core.submissions",
    ]) {
      expect(migration).toContain(table);
    }
  });

  it("reuses a clean pre-start instance at run activation without requiring date equality", () => {
    const assignment = migration.slice(
      migration.indexOf("CREATE OR REPLACE FUNCTION public.assign_team_members_to_program_run"),
    );
    expect(assignment).toContain("AND NOT has_program_activity");
    expect(assignment).toContain("started_at = target_run.started_at");
    expect(assignment).not.toContain("existing_instance.started_at = target_run.started_at");
  });

  it("executes atomically in PostgreSQL for preserved questionnaires, explicit transitions and run assignment", async () => {
    const db = new PGlite();
    const questionnaireAthlete = "00000000-0000-4000-8000-000000000001";
    const activeSoloAthlete = "00000000-0000-4000-8000-000000000002";
    const teamId = "00000000-0000-4000-8000-000000000003";
    const policyId = "00000000-0000-4000-8000-000000000004";
    const questionnaireInstance = "00000000-0000-4000-8000-000000000005";
    const activeSoloInstance = "00000000-0000-4000-8000-000000000006";
    const runId = "00000000-0000-4000-8000-000000000007";

    await db.exec(`
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE SCHEMA auth;
      CREATE SCHEMA minor_auth;
      CREATE SCHEMA feedback_core;
      CREATE TYPE public.app_role AS ENUM ('athlete', 'coach', 'admin');
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
        SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
      CREATE TABLE public.user_roles (user_id uuid, role public.app_role);
      CREATE TABLE public.teams (
        id uuid PRIMARY KEY, name text, access_code text,
        is_archived boolean DEFAULT false, is_test_team boolean DEFAULT false
      );
      CREATE TABLE public.team_members (
        team_id uuid, user_id uuid, UNIQUE (team_id, user_id)
      );
      CREATE TABLE public.program_runs (
        id uuid PRIMARY KEY, team_id uuid, status text, started_at date
      );
      CREATE TABLE public.program_instances (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid,
        team_id uuid, program_run_id uuid, cycle_number integer,
        status text, started_at date, ended_at date,
        is_test_instance boolean DEFAULT false
      );
      CREATE TABLE public.questionnaire_responses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid,
        program_instance_id uuid, timing text, is_complete boolean,
        answers jsonb DEFAULT '{}'::jsonb
      );
      CREATE TABLE minor_auth.policy_versions (
        id uuid PRIMARY KEY, status text
      );
      CREATE TABLE minor_auth.participant_authorizations (
        user_id uuid PRIMARY KEY, policy_id uuid, product_status text,
        revoked_at timestamptz
      );
      CREATE TABLE public.daily_checkins (program_instance_id uuid);
      CREATE TABLE public.daily_journals (program_instance_id uuid);
      CREATE TABLE public.user_day_completion (program_instance_id uuid);
      CREATE TABLE public.comprehension_check_instances (program_instance_id uuid);
      CREATE TABLE public.assessments (program_instance_id uuid);
      CREATE TABLE public.deep_profile_assessments (program_instance_id uuid);
      CREATE TABLE public.athlete_transfer_observations (program_instance_id uuid);
      CREATE TABLE feedback_core.submissions (program_instance_id uuid);
      CREATE FUNCTION public.can_manage_team_program_runs(uuid)
      RETURNS boolean LANGUAGE sql STABLE AS 'SELECT true';
    `);
    await db.exec(migration);
    await db.exec(`
      INSERT INTO public.teams(id, name, access_code)
        VALUES ('${teamId}', 'Pilot Team', 'ABC123');
      INSERT INTO minor_auth.policy_versions(id, status)
        VALUES ('${policyId}', 'active');
      INSERT INTO public.user_roles(user_id, role) VALUES
        ('${questionnaireAthlete}', 'athlete'),
        ('${activeSoloAthlete}', 'athlete');
      INSERT INTO minor_auth.participant_authorizations(
        user_id, policy_id, product_status
      ) VALUES
        ('${questionnaireAthlete}', '${policyId}', 'authorized'),
        ('${activeSoloAthlete}', '${policyId}', 'authorized');
      INSERT INTO public.program_instances(
        id, user_id, cycle_number, status, started_at
      ) VALUES
        ('${questionnaireInstance}', '${questionnaireAthlete}', 1, 'active', '2026-08-01'),
        ('${activeSoloInstance}', '${activeSoloAthlete}', 1, 'active', '2026-08-01');
      INSERT INTO public.questionnaire_responses(
        user_id, program_instance_id, timing, is_complete, answers
      ) VALUES (
        '${questionnaireAthlete}', '${questionnaireInstance}', 'pre', true,
        '{"preserved": true}'
      );
      INSERT INTO public.daily_checkins(program_instance_id)
        VALUES ('${activeSoloInstance}');
    `);

    await db.query(`SELECT set_config('request.jwt.claim.sub', $1, false)`, [questionnaireAthlete]);
    const preserved = await db.query<{ result: { success: boolean; transition: string } }>(
      `SELECT public.join_team_by_code($1) AS result`,
      ["ABC123"],
    );
    expect(preserved.rows[0]?.result).toMatchObject({
      success: true,
      transition: "completed_questionnaire_preserved",
    });
    const preservedState = await db.query<{
      team_id: string;
      answers: { preserved: boolean };
    }>(`
      SELECT pi.team_id, qr.answers
      FROM public.program_instances pi
      JOIN public.questionnaire_responses qr ON qr.program_instance_id = pi.id
      WHERE pi.id = $1
    `, [questionnaireInstance]);
    expect(preservedState.rows[0]).toMatchObject({
      team_id: teamId,
      answers: { preserved: true },
    });

    await db.query(`SELECT set_config('request.jwt.claim.sub', $1, false)`, [activeSoloAthlete]);
    const blocked = await db.query<{ result: { success: boolean; error: string } }>(
      `SELECT public.join_team_by_code($1) AS result`,
      ["ABC123"],
    );
    expect(blocked.rows[0]?.result).toEqual({
      success: false,
      error: "solo_program_transition_confirmation_required",
    });
    const membershipBeforeConfirmation = await db.query<{ count: number }>(`
      SELECT count(*)::integer AS count FROM public.team_members WHERE user_id = $1
    `, [activeSoloAthlete]);
    expect(membershipBeforeConfirmation.rows[0]?.count).toBe(0);

    const transitioned = await db.query<{ result: { success: boolean; transition: string } }>(
      `SELECT public.join_team_by_code_v1_3($1, true) AS result`,
      ["ABC123"],
    );
    expect(transitioned.rows[0]?.result).toMatchObject({
      success: true,
      transition: "new_team_cycle_started",
    });
    const cycles = await db.query<{ status: string; team_id: string | null }>(`
      SELECT status, team_id FROM public.program_instances
      WHERE user_id = $1 ORDER BY cycle_number
    `, [activeSoloAthlete]);
    expect(cycles.rows).toEqual([
      { status: "abandoned", team_id: null },
      { status: "active", team_id: teamId },
    ]);

    await db.exec(`
      INSERT INTO public.program_runs(id, team_id, status, started_at)
        VALUES ('${runId}', '${teamId}', 'active', '2026-09-01');
    `);
    const assignment = await db.query<{
      result: { assigned_athletes: number; reused_instances: number; migrated_legacy_instances: number };
    }>(`SELECT public.assign_team_members_to_program_run($1) AS result`, [runId]);
    expect(assignment.rows[0]?.result).toMatchObject({
      assigned_athletes: 2,
      reused_instances: 2,
      migrated_legacy_instances: 2,
    });
    const assigned = await db.query<{ count: number }>(`
      SELECT count(*)::integer AS count
      FROM public.program_instances
      WHERE program_run_id = $1 AND status = 'active'
    `, [runId]);
    expect(assigned.rows[0]?.count).toBe(2);

    await db.close();
  });
});
