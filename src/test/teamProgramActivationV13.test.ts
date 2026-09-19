// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260901080620_atomic_team_program_activation_v1_3.sql",
  ),
  "utf8",
);

const management = readFileSync(
  resolve(process.cwd(), "src/components/coach/TeamManagement.tsx"),
  "utf8",
);

describe("atomic team program activation V1.3", () => {
  it("routes both coach start paths through the atomic database contract", () => {
    expect(management).toContain('supabase.rpc("activate_team_program_v1_3"');
    expect(management).toContain("await persistProgramStart(teamId, date)");
    expect(management).toContain("await persistProgramStart(team.id, tomorrow)");
    expect(migration).toContain("SECURITY DEFINER");
    expect(migration).toContain("SET search_path = pg_catalog");
    expect(migration).toMatch(
      /REVOKE ALL ON FUNCTION public\.activate_team_program_v1_3\(uuid, date\)[\s\S]*FROM PUBLIC, anon/,
    );
    expect(migration).toContain("CREATE TRIGGER ensure_activated_team_program_run_v1_3");
    expect(migration).toContain("AFTER UPDATE OF program_start_date, program_activated_at");
  });

  it("preserves existing instance IDs and tracking while creating one idempotent shared run", async () => {
    const db = new PGlite();
    const coachId = "00000000-0000-4000-8000-000000000001";
    const athleteOne = "00000000-0000-4000-8000-000000000002";
    const athleteTwo = "00000000-0000-4000-8000-000000000003";
    const teamId = "00000000-0000-4000-8000-000000000004";
    const instanceOne = "00000000-0000-4000-8000-000000000005";
    const instanceTwo = "00000000-0000-4000-8000-000000000006";
    const checkinId = "00000000-0000-4000-8000-000000000007";
    const legacyAthlete = "00000000-0000-4000-8000-000000000008";
    const legacyTeam = "00000000-0000-4000-8000-000000000009";
    const legacyInstance = "00000000-0000-4000-8000-000000000010";

    await db.exec(`
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE SCHEMA auth;
      CREATE TYPE public.app_role AS ENUM ('athlete', 'coach', 'admin');
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
        SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
      CREATE TABLE public.profiles (id uuid PRIMARY KEY);
      CREATE TABLE public.user_roles (user_id uuid, role public.app_role);
      CREATE TABLE public.teams (
        id uuid PRIMARY KEY,
        name text NOT NULL,
        is_archived boolean DEFAULT false,
        is_test_team boolean DEFAULT false,
        program_start_date date,
        program_activated_by uuid,
        program_activated_at timestamptz
      );
      CREATE TABLE public.team_members (
        team_id uuid NOT NULL,
        user_id uuid NOT NULL,
        UNIQUE(team_id, user_id)
      );
      CREATE TABLE public.program_runs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id uuid NOT NULL,
        name text NOT NULL,
        status text NOT NULL,
        started_at date,
        ended_at date,
        created_by uuid,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb
      );
      CREATE UNIQUE INDEX one_active_run_per_team
        ON public.program_runs(team_id) WHERE status = 'active';
      CREATE TABLE public.program_instances (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        team_id uuid,
        program_run_id uuid,
        cycle_number integer NOT NULL,
        status text NOT NULL,
        started_at date,
        ended_at date,
        is_test_instance boolean DEFAULT false
      );
      CREATE TABLE public.daily_checkins (
        id uuid PRIMARY KEY,
        user_id uuid NOT NULL,
        program_instance_id uuid NOT NULL,
        date date NOT NULL
      );
      CREATE FUNCTION public.can_manage_team_program_runs(_team_id uuid)
      RETURNS boolean LANGUAGE sql STABLE AS $$
        SELECT EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_id = auth.uid() AND role IN ('coach', 'admin')
        )
      $$;
    `);
    await db.exec(migration);
    await db.exec(`
      INSERT INTO public.profiles(id) VALUES
        ('${coachId}'), ('${athleteOne}'), ('${athleteTwo}');
      INSERT INTO public.user_roles(user_id, role) VALUES
        ('${coachId}', 'coach'),
        ('${athleteOne}', 'athlete'),
        ('${athleteTwo}', 'athlete');
      INSERT INTO public.teams(id, name) VALUES ('${teamId}', 'Pilot Team');
      INSERT INTO public.team_members(team_id, user_id) VALUES
        ('${teamId}', '${athleteOne}'),
        ('${teamId}', '${athleteTwo}');
      INSERT INTO public.program_instances(
        id, user_id, team_id, cycle_number, status, started_at
      ) VALUES
        ('${instanceOne}', '${athleteOne}', '${teamId}', 1, 'active', '2026-08-27'),
        ('${instanceTwo}', '${athleteTwo}', '${teamId}', 1, 'active', '2026-08-29');
      INSERT INTO public.daily_checkins(id, user_id, program_instance_id, date)
      VALUES ('${checkinId}', '${athleteOne}', '${instanceOne}', '2026-09-01');
    `);
    await db.query(`SELECT set_config('request.jwt.claim.sub', $1, false)`, [coachId]);

    const first = await db.query<{
      result: {
        athletes: number;
        linked_existing_instances: number;
        created_instances: number;
      };
    }>(`SELECT public.activate_team_program_v1_3($1, $2) AS result`, [teamId, "2026-09-01"]);
    expect(first.rows[0]?.result).toMatchObject({
      athletes: 2,
      linked_existing_instances: 2,
      created_instances: 0,
    });

    const state = await db.query<{
      active_runs: number;
      linked_instances: number;
      preserved_checkins: number;
      correct_start_dates: number;
    }>(`
      SELECT
        (SELECT count(*)::integer FROM public.program_runs
          WHERE team_id = $1 AND status = 'active') AS active_runs,
        (SELECT count(*)::integer FROM public.program_instances
          WHERE team_id = $1 AND status = 'active' AND program_run_id IS NOT NULL) AS linked_instances,
        (SELECT count(*)::integer FROM public.daily_checkins
          WHERE id = $2 AND program_instance_id = $3) AS preserved_checkins,
        (SELECT count(*)::integer FROM public.program_instances
          WHERE team_id = $1 AND started_at = '2026-09-01') AS correct_start_dates
    `, [teamId, checkinId, instanceOne]);
    expect(state.rows[0]).toEqual({
      active_runs: 1,
      linked_instances: 2,
      preserved_checkins: 1,
      correct_start_dates: 2,
    });

    const second = await db.query<{
      result: { linked_existing_instances: number; reused_linked_instances: number };
    }>(`SELECT public.activate_team_program_v1_3($1, $2) AS result`, [teamId, "2026-09-01"]);
    expect(second.rows[0]?.result).toMatchObject({
      linked_existing_instances: 0,
      reused_linked_instances: 2,
    });

    await expect(
      db.query(`SELECT public.activate_team_program_v1_3($1, $2)`, [teamId, "2026-09-02"]),
    ).rejects.toThrow(/program_start_locked/);

    await db.exec(`
      INSERT INTO public.profiles(id) VALUES ('${legacyAthlete}');
      INSERT INTO public.user_roles(user_id, role) VALUES ('${legacyAthlete}', 'athlete');
      INSERT INTO public.teams(id, name) VALUES ('${legacyTeam}', 'Legacy Client Team');
      INSERT INTO public.team_members(team_id, user_id)
      VALUES ('${legacyTeam}', '${legacyAthlete}');
      INSERT INTO public.program_instances(
        id, user_id, team_id, cycle_number, status, started_at
      ) VALUES (
        '${legacyInstance}', '${legacyAthlete}', '${legacyTeam}', 1, 'active', '2026-08-30'
      );
      UPDATE public.teams
      SET program_start_date = '2026-09-03',
          program_activated_by = '${coachId}',
          program_activated_at = now()
      WHERE id = '${legacyTeam}';
    `);

    const legacyState = await db.query<{
      active_runs: number;
      linked_instances: number;
      preserved_instance: number;
    }>(`
      SELECT
        (SELECT count(*)::integer FROM public.program_runs
          WHERE team_id = $1 AND status = 'active' AND started_at = '2026-09-03') AS active_runs,
        (SELECT count(*)::integer FROM public.program_instances
          WHERE team_id = $1 AND status = 'active' AND program_run_id IS NOT NULL) AS linked_instances,
        (SELECT count(*)::integer FROM public.program_instances
          WHERE id = $2 AND team_id = $1 AND started_at = '2026-09-03') AS preserved_instance
    `, [legacyTeam, legacyInstance]);
    expect(legacyState.rows[0]).toEqual({
      active_runs: 1,
      linked_instances: 1,
      preserved_instance: 1,
    });

    await db.close();
  });
});
