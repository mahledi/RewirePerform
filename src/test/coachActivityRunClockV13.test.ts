// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260901090453_coach_activity_run_clock_v1_3.sql",
  ),
  "utf8",
);

describe("coach activity run clock V1.3", () => {
  it("removes cached snapshots from the coach activity truth contract", () => {
    expect(migration).not.toContain("latest_snap");
    expect(migration).not.toContain("program_progress_snapshots");
    expect(migration).toContain("run.available_days");
    expect(migration).toContain("valid_day_completions");
    expect(migration).toContain("completion.completion_status = 'completed'");
    expect(migration).toContain("WHEN team_is_test THEN COALESCE");
    expect(migration).toContain("check_instance.status = 'completed'");
    expect(migration).toContain("::numeric(5,4)");
    expect(migration).toContain("idx_user_day_completion_instance_completed_day");
    expect(migration).toContain("idx_comprehension_instance_completed_at");
    expect(migration).toContain("BETWEEN run.started_at AND effective_today");
    expect(migration).toContain("SET search_path = pg_catalog");
  });

  it("returns a uniform run day immediately despite stale pre-run snapshots", async () => {
    const db = new PGlite();
    const coachId = "00000000-0000-4000-8000-000000000101";
    const athleteOne = "00000000-0000-4000-8000-000000000102";
    const athleteTwo = "00000000-0000-4000-8000-000000000103";
    const teamId = "00000000-0000-4000-8000-000000000104";
    const runId = "00000000-0000-4000-8000-000000000105";
    const instanceOne = "00000000-0000-4000-8000-000000000106";
    const instanceTwo = "00000000-0000-4000-8000-000000000107";
    const longAthlete = "00000000-0000-4000-8000-000000000123";
    const longInstance = "00000000-0000-4000-8000-000000000124";
    const realTeam = "00000000-0000-4000-8000-000000000125";
    const realAthlete = "00000000-0000-4000-8000-000000000126";
    const realRun = "00000000-0000-4000-8000-000000000127";
    const realInstance = "00000000-0000-4000-8000-000000000128";
    const noRunTeam = "00000000-0000-4000-8000-000000000129";
    const noRunAthlete = "00000000-0000-4000-8000-000000000130";
    const outsiderCoach = "00000000-0000-4000-8000-000000000137";
    const noInstanceAthlete = "00000000-0000-4000-8000-000000000139";

    await db.exec(`
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE SCHEMA auth;
      CREATE TYPE public.app_role AS ENUM ('athlete', 'coach', 'admin');
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
        SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
      CREATE TABLE public.profiles (id uuid PRIMARY KEY, full_name text);
      CREATE TABLE public.user_roles (user_id uuid, role public.app_role);
      CREATE TABLE public.teams (
        id uuid PRIMARY KEY,
        is_test_team boolean NOT NULL DEFAULT false
      );
      CREATE TABLE public.team_members (team_id uuid, user_id uuid);
      CREATE TABLE public.program_runs (
        id uuid PRIMARY KEY,
        team_id uuid,
        status text,
        started_at date,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE public.program_instances (
        id uuid PRIMARY KEY,
        user_id uuid,
        program_run_id uuid,
        status text
      );
      CREATE TABLE public.qa_time_overrides (
        scope text,
        team_id uuid,
        simulated_date date,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE public.user_day_assignments (id uuid PRIMARY KEY, date date);
      CREATE TABLE public.user_day_completion (
        id uuid PRIMARY KEY,
        program_instance_id uuid,
        day_number integer,
        completion_status text,
        completed_at timestamptz,
        assignment_id uuid
      );
      CREATE TABLE public.daily_checkins (
        id uuid PRIMARY KEY,
        program_instance_id uuid,
        date date,
        created_at timestamptz
      );
      CREATE TABLE public.daily_journals (
        id uuid PRIMARY KEY,
        program_instance_id uuid,
        date date,
        created_at timestamptz
      );
      CREATE TABLE public.comprehension_check_instances (
        id uuid PRIMARY KEY,
        program_instance_id uuid,
        assignment_id uuid,
        day_number integer,
        status text,
        completed_at timestamptz
      );
      CREATE TABLE public.program_progress_snapshots (
        id uuid PRIMARY KEY,
        user_id uuid,
        program_instance_id uuid,
        date date,
        days_available integer,
        days_completed integer,
        completion_rate numeric,
        current_streak integer,
        updated_at timestamptz
      );
      CREATE FUNCTION public.can_manage_team_program_runs(_team_id uuid)
      RETURNS boolean LANGUAGE sql STABLE AS $$
        SELECT EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_id = auth.uid() AND role IN ('coach', 'admin')
        )
        AND EXISTS (
          SELECT 1 FROM public.team_members
          WHERE team_id = _team_id AND user_id = auth.uid()
        )
      $$;
    `);
    await db.exec(migration);
    await db.exec(`
      INSERT INTO public.profiles(id, full_name) VALUES
        ('${coachId}', 'Coach'),
        ('${outsiderCoach}', 'Outsider Coach'),
        ('${athleteOne}', 'Athlete One'),
        ('${athleteTwo}', 'Athlete Two');
      INSERT INTO public.user_roles(user_id, role) VALUES
        ('${coachId}', 'coach'),
        ('${outsiderCoach}', 'coach'),
        ('${athleteOne}', 'athlete'),
        ('${athleteTwo}', 'athlete');
      INSERT INTO public.teams(id, is_test_team) VALUES ('${teamId}', true);
      INSERT INTO public.team_members(team_id, user_id) VALUES
        ('${teamId}', '${coachId}'),
        ('${teamId}', '${athleteOne}'),
        ('${teamId}', '${athleteTwo}');
      INSERT INTO public.program_runs(id, team_id, status, started_at)
      VALUES ('${runId}', '${teamId}', 'active', '2026-09-01');
      INSERT INTO public.program_instances(id, user_id, program_run_id, status) VALUES
        ('${instanceOne}', '${athleteOne}', '${runId}', 'active'),
        ('${instanceTwo}', '${athleteTwo}', '${runId}', 'active');
      INSERT INTO public.qa_time_overrides(scope, team_id, simulated_date)
      VALUES ('team', '${teamId}', '2026-09-01');

      -- These are the stale cached values that produced 1/6 and 0/9.
      INSERT INTO public.program_progress_snapshots(
        id, user_id, program_instance_id, date, days_available,
        days_completed, completion_rate, current_streak, updated_at
      ) VALUES
        ('00000000-0000-4000-8000-000000000108', '${athleteOne}', '${instanceOne}',
          '2026-09-01', 6, 1, 0.1667, 1, '2026-09-01T07:00:00Z'),
        ('00000000-0000-4000-8000-000000000109', '${athleteTwo}', '${instanceTwo}',
          '2026-09-01', 9, 0, 0, 0, '2026-09-01T07:00:00Z');

      INSERT INTO public.user_day_assignments(id, date) VALUES
        ('00000000-0000-4000-8000-000000000110', '2026-08-30'),
        ('00000000-0000-4000-8000-000000000111', '2026-09-01');
      INSERT INTO public.user_day_completion(
        id, program_instance_id, day_number, completion_status, completed_at, assignment_id
      ) VALUES
        ('00000000-0000-4000-8000-000000000112', '${instanceOne}', 1, 'completed',
          '2026-09-01T08:00:00Z', '00000000-0000-4000-8000-000000000110'),
        ('00000000-0000-4000-8000-000000000113', '${instanceOne}', 1, 'completed',
          '2026-08-20T08:00:00Z', '00000000-0000-4000-8000-000000000111');
      -- For QA, assignment.date is the logical program date. These physical
      -- timestamps are intentionally inverted to prove that precedence.
      INSERT INTO public.daily_checkins(id, program_instance_id, date, created_at) VALUES
        ('00000000-0000-4000-8000-000000000114', '${instanceOne}', '2026-09-01', '2026-08-19T08:01:00Z'),
        ('00000000-0000-4000-8000-000000000115', '${instanceTwo}', '2026-08-30', '2026-08-30T08:01:00Z');
      INSERT INTO public.comprehension_check_instances(
        id, program_instance_id, assignment_id, day_number, status, completed_at
      ) VALUES (
        '00000000-0000-4000-8000-000000000118', '${instanceTwo}',
        '00000000-0000-4000-8000-000000000111', 1, 'pending', '2026-09-01T08:02:00Z'
      );
    `);
    await db.query(`SELECT set_config('request.jwt.claim.sub', $1, false)`, [coachId]);

    const dayOne = await db.query<{
      user_id: string;
      last_activity_at: string | Date | null;
      days_completed: number;
      days_available: number;
      completion_rate: string | number;
      current_streak: number;
      checkins_last_7d: number;
      inactive_risk: boolean;
    }>(`SELECT * FROM public.get_coach_team_activity_status($1) ORDER BY full_name`, [teamId]);

    expect(dayOne.rows.map((row) => ({
      userId: row.user_id,
      lastActivity: row.last_activity_at
        ? new Date(row.last_activity_at).toISOString()
        : null,
      completed: row.days_completed,
      available: row.days_available,
      rate: Number(row.completion_rate),
      streak: row.current_streak,
      checkins: row.checkins_last_7d,
      inactive: row.inactive_risk,
    }))).toEqual([
      {
        userId: athleteOne,
        lastActivity: "2026-08-20T08:00:00.000Z",
        completed: 1,
        available: 1,
        rate: 1,
        streak: 1,
        checkins: 1,
        inactive: false,
      },
      {
        userId: athleteTwo,
        lastActivity: null,
        completed: 0,
        available: 1,
        rate: 0,
        streak: 0,
        checkins: 0,
        inactive: true,
      },
    ]);

    await db.exec(`
      UPDATE public.qa_time_overrides
      SET simulated_date = '2026-09-02', updated_at = now()
      WHERE team_id = '${teamId}';
      INSERT INTO public.user_day_assignments(id, date)
      VALUES
        ('00000000-0000-4000-8000-000000000116', '2026-09-02'),
        ('00000000-0000-4000-8000-000000000119', '2026-09-02'),
        ('00000000-0000-4000-8000-000000000120', '2026-09-03');
      INSERT INTO public.user_day_completion(
        id, program_instance_id, day_number, completion_status, completed_at, assignment_id
      ) VALUES
        ('00000000-0000-4000-8000-000000000117', '${instanceOne}', 2, 'completed',
          '2026-08-20T08:00:00Z', '00000000-0000-4000-8000-000000000116'),
        ('00000000-0000-4000-8000-000000000121', '${instanceOne}', 2, 'completed',
          '2026-08-21T08:00:00Z', '00000000-0000-4000-8000-000000000119'),
        ('00000000-0000-4000-8000-000000000122', '${instanceOne}', 3, 'completed',
          '2026-08-21T08:00:00Z', '00000000-0000-4000-8000-000000000120');
    `);

    const dayTwo = await db.query<{
      user_id: string;
      days_completed: number;
      days_available: number;
      completion_rate: string | number;
      current_streak: number;
    }>(`SELECT * FROM public.get_coach_team_activity_status($1) ORDER BY full_name`, [teamId]);
    expect(dayTwo.rows.map((row) => ({
      userId: row.user_id,
      completed: row.days_completed,
      available: row.days_available,
      rate: Number(row.completion_rate),
      streak: row.current_streak,
    }))).toEqual([
      { userId: athleteOne, completed: 2, available: 2, rate: 1, streak: 2 },
      { userId: athleteTwo, completed: 0, available: 2, rate: 0, streak: 0 },
    ]);

    await db.exec(`
      UPDATE public.user_day_completion
      SET completion_status = 'in_progress'
      WHERE id = '00000000-0000-4000-8000-000000000122';
      UPDATE public.qa_time_overrides
      SET simulated_date = '2026-09-04', updated_at = now()
      WHERE team_id = '${teamId}';
      INSERT INTO public.user_day_assignments(id, date)
      VALUES ('00000000-0000-4000-8000-000000000131', '2026-09-04');
      INSERT INTO public.user_day_completion(
        id, program_instance_id, day_number, completion_status, completed_at, assignment_id
      ) VALUES (
        '00000000-0000-4000-8000-000000000132', '${instanceOne}', 4, 'completed',
        '2026-08-22T08:00:00Z', '00000000-0000-4000-8000-000000000131'
      );
    `);

    const gapDay = await db.query<{
      days_completed: number;
      days_available: number;
      completion_rate: string | number;
      current_streak: number;
    }>(
      `SELECT days_completed, days_available, completion_rate, current_streak
       FROM public.get_coach_team_activity_status($1) WHERE user_id = $2`,
      [teamId, athleteOne],
    );
    expect({
      completed: gapDay.rows[0].days_completed,
      available: gapDay.rows[0].days_available,
      rate: Number(gapDay.rows[0].completion_rate),
      streak: gapDay.rows[0].current_streak,
    }).toEqual({ completed: 3, available: 4, rate: 0.75, streak: 1 });

    await db.exec(`
      UPDATE public.qa_time_overrides
      SET simulated_date = '2026-09-05', updated_at = now()
      WHERE team_id = '${teamId}';
    `);
    const openToday = await db.query<{ current_streak: number }>(
      `SELECT current_streak FROM public.get_coach_team_activity_status($1) WHERE user_id = $2`,
      [teamId, athleteOne],
    );
    expect(openToday.rows[0].current_streak).toBe(1);

    await db.exec(`
      UPDATE public.qa_time_overrides
      SET simulated_date = '2026-09-06', updated_at = now()
      WHERE team_id = '${teamId}';
    `);
    const expiredGap = await db.query<{ current_streak: number }>(
      `SELECT current_streak FROM public.get_coach_team_activity_status($1) WHERE user_id = $2`,
      [teamId, athleteOne],
    );
    expect(expiredGap.rows[0].current_streak).toBe(0);

    await db.exec(`
      INSERT INTO public.profiles(id, full_name) VALUES ('${longAthlete}', 'Long Runner');
      INSERT INTO public.user_roles(user_id, role) VALUES ('${longAthlete}', 'athlete');
      INSERT INTO public.team_members(team_id, user_id) VALUES ('${teamId}', '${longAthlete}');
      INSERT INTO public.program_instances(id, user_id, program_run_id, status)
      VALUES ('${longInstance}', '${longAthlete}', '${runId}', 'active');
      INSERT INTO public.user_day_assignments(id, date)
      SELECT
        ('10000000-0000-4000-8000-' || lpad(day_number::text, 12, '0'))::uuid,
        DATE '2026-09-01' + (day_number - 1)
      FROM generate_series(1, 56) AS day_number;
      INSERT INTO public.user_day_completion(
        id, program_instance_id, day_number, completion_status, completed_at, assignment_id
      )
      SELECT
        ('20000000-0000-4000-8000-' || lpad(day_number::text, 12, '0'))::uuid,
        '${longInstance}',
        day_number,
        'completed',
        '2026-09-01T08:00:00Z'::timestamptz,
        ('10000000-0000-4000-8000-' || lpad(day_number::text, 12, '0'))::uuid
      FROM generate_series(1, 56) AS day_number;
      UPDATE public.qa_time_overrides
      SET simulated_date = '2026-10-27', updated_at = now()
      WHERE team_id = '${teamId}';
    `);

    const day57 = await db.query<{
      days_completed: number;
      days_available: number;
      current_streak: number;
      inactive_risk: boolean;
    }>(
      `SELECT days_completed, days_available, current_streak, inactive_risk
       FROM public.get_coach_team_activity_status($1) WHERE user_id = $2`,
      [teamId, longAthlete],
    );
    expect(day57.rows[0]).toMatchObject({
      days_completed: 56,
      days_available: 56,
      current_streak: 56,
      inactive_risk: false,
    });

    await db.exec(`
      UPDATE public.qa_time_overrides
      SET simulated_date = '2026-10-28', updated_at = now()
      WHERE team_id = '${teamId}';
    `);
    const day58 = await db.query<{ current_streak: number }>(
      `SELECT current_streak FROM public.get_coach_team_activity_status($1) WHERE user_id = $2`,
      [teamId, longAthlete],
    );
    expect(day58.rows[0].current_streak).toBe(0);

    await db.exec(`
      INSERT INTO public.profiles(id, full_name)
      VALUES ('${noInstanceAthlete}', 'No Instance Athlete');
      INSERT INTO public.user_roles(user_id, role)
      VALUES ('${noInstanceAthlete}', 'athlete');
      INSERT INTO public.team_members(team_id, user_id)
      VALUES ('${teamId}', '${noInstanceAthlete}');
    `);
    const noInstance = await db.query<{
      days_completed: number;
      days_available: number;
      completion_rate: string | number;
      current_streak: number;
      inactive_risk: boolean;
    }>(
      `SELECT days_completed, days_available, completion_rate, current_streak, inactive_risk
       FROM public.get_coach_team_activity_status($1) WHERE user_id = $2`,
      [teamId, noInstanceAthlete],
    );
    expect({
      completed: noInstance.rows[0].days_completed,
      available: noInstance.rows[0].days_available,
      rate: Number(noInstance.rows[0].completion_rate),
      streak: noInstance.rows[0].current_streak,
      inactive: noInstance.rows[0].inactive_risk,
    }).toEqual({ completed: 0, available: 56, rate: 0, streak: 0, inactive: true });

    await db.exec(`
      INSERT INTO public.profiles(id, full_name) VALUES
        ('${realAthlete}', 'Real Athlete'),
        ('${noRunAthlete}', 'No Run Athlete');
      INSERT INTO public.user_roles(user_id, role) VALUES
        ('${realAthlete}', 'athlete'),
        ('${noRunAthlete}', 'athlete');
      INSERT INTO public.teams(id, is_test_team) VALUES
        ('${realTeam}', false),
        ('${noRunTeam}', false);
      INSERT INTO public.team_members(team_id, user_id) VALUES
        ('${realTeam}', '${coachId}'),
        ('${noRunTeam}', '${coachId}'),
        ('${realTeam}', '${realAthlete}'),
        ('${noRunTeam}', '${noRunAthlete}');
      INSERT INTO public.program_runs(id, team_id, status, started_at)
      VALUES ('${realRun}', '${realTeam}', 'active', CURRENT_DATE);
      INSERT INTO public.program_instances(id, user_id, program_run_id, status)
      VALUES ('${realInstance}', '${realAthlete}', '${realRun}', 'active');
      INSERT INTO public.user_day_assignments(id, date) VALUES
        ('00000000-0000-4000-8000-000000000133', CURRENT_DATE - 10),
        ('00000000-0000-4000-8000-000000000134', CURRENT_DATE);
      INSERT INTO public.user_day_completion(
        id, program_instance_id, day_number, completion_status, completed_at, assignment_id
      ) VALUES
        ('00000000-0000-4000-8000-000000000135', '${realInstance}', 1, 'completed',
          now(), '00000000-0000-4000-8000-000000000133'),
        ('00000000-0000-4000-8000-000000000136', '${realInstance}', 1, 'completed',
          now() - interval '10 days', '00000000-0000-4000-8000-000000000134'),
        ('00000000-0000-4000-8000-000000000138', '${realInstance}', 1, 'completed',
          now() + interval '10 days', '00000000-0000-4000-8000-000000000134');
    `);

    const realActivity = await db.query<{
      days_completed: number;
      days_available: number;
      completion_rate: string | number;
    }>(
      `SELECT days_completed, days_available, completion_rate
       FROM public.get_coach_team_activity_status($1) WHERE user_id = $2`,
      [realTeam, realAthlete],
    );
    expect({
      completed: realActivity.rows[0].days_completed,
      available: realActivity.rows[0].days_available,
      rate: Number(realActivity.rows[0].completion_rate),
    }).toEqual({ completed: 1, available: 1, rate: 1 });

    const noRun = await db.query<{
      days_completed: number;
      days_available: number;
      completion_rate: string | number;
    }>(
      `SELECT days_completed, days_available, completion_rate
       FROM public.get_coach_team_activity_status($1) WHERE user_id = $2`,
      [noRunTeam, noRunAthlete],
    );
    expect({
      completed: noRun.rows[0].days_completed,
      available: noRun.rows[0].days_available,
      rate: Number(noRun.rows[0].completion_rate),
    }).toEqual({ completed: 0, available: 0, rate: 0 });

    const privileges = await db.query<{ anon_execute: boolean; authenticated_execute: boolean }>(`
      SELECT
        has_function_privilege(
          'anon',
          'public.get_coach_team_activity_status(uuid)',
          'EXECUTE'
        ) AS anon_execute,
        has_function_privilege(
          'authenticated',
          'public.get_coach_team_activity_status(uuid)',
          'EXECUTE'
        ) AS authenticated_execute
    `);
    expect(privileges.rows[0]).toEqual({
      anon_execute: false,
      authenticated_execute: true,
    });

    await db.query(`SELECT set_config('request.jwt.claim.sub', $1, false)`, [coachId]);
    await db.exec(`SET ROLE authenticated`);
    const authenticatedCall = await db.query<{ user_id: string }>(
      `SELECT user_id FROM public.get_coach_team_activity_status($1)`,
      [teamId],
    );
    expect(authenticatedCall.rows).toHaveLength(4);
    await db.exec(`RESET ROLE`);

    await db.exec(`SET ROLE anon`);
    await expect(
      db.query(`SELECT * FROM public.get_coach_team_activity_status($1)`, [teamId]),
    ).rejects.toThrow(/permission denied/i);
    await db.exec(`RESET ROLE`);

    await db.query(`SELECT set_config('request.jwt.claim.sub', $1, false)`, [outsiderCoach]);
    await expect(
      db.query(`SELECT * FROM public.get_coach_team_activity_status($1)`, [teamId]),
    ).rejects.toThrow(/access_denied/);

    await db.close();
  });
});
