// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import {
  getPulseDelta,
  groupPulseDaysByWeek,
  ownCheckinToPulseDay,
  type PulseDay,
} from "@/lib/pulseHistory";

const readRepoFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const values = (mood: number): PulseDay["values"] => ({
  mood,
  energy: null,
  focus: null,
  stress: null,
  recovery: null,
  sleep_quality: null,
  physical_readiness: null,
  motivation: null,
  pressure: null,
  team_connection: null,
});

describe("V1.5 pulse history", () => {
  it("maps only the athlete's structured check-in values", () => {
    const day = ownCheckinToPulseDay({
      date: "2026-09-05",
      mood_before: 6,
      energy_level: 7,
      focus_rating: 8,
      wellbeing_metrics: {
        mood: 9,
        stress: 4,
        recovery: 7,
        team_connection: 8,
        reflection: "must stay private",
      },
    });

    expect(day.values).toMatchObject({ mood: 9, energy: 7, focus: 8, stress: 4, recovery: 7, team_connection: 8 });
    expect(JSON.stringify(day)).not.toContain("reflection");
    expect(JSON.stringify(day)).not.toContain("must stay private");
  });

  it("groups Monday-based weeks newest first and compares against the previous check-in", () => {
    const days: PulseDay[] = [
      { date: "2026-09-05", sufficient_data: true, values: values(8) },
      { date: "2026-09-03", sufficient_data: true, values: values(6.5) },
      { date: "2026-08-30", sufficient_data: true, values: values(7) },
    ];

    const weeks = groupPulseDaysByWeek(days);
    expect(weeks.map((week) => week.key)).toEqual(["2026-08-31", "2026-08-24"]);
    expect(weeks[0].label).toBe("Diese Woche");
    expect(getPulseDelta(days, days[0], "mood")).toBe(1.5);
  });

  it("keeps athlete team momentum anonymous and self-scoped", () => {
    const migration = readRepoFile("supabase/migrations/20260905113000_athlete_team_momentum_v1_5.sql");
    const functionBody = migration.slice(migration.indexOf("CREATE OR REPLACE FUNCTION"));

    expect(functionBody).toContain("actor_id uuid := auth.uid()");
    expect(functionBody).toContain("instance.user_id = actor_id");
    expect(functionBody).toContain("assigned_count < 5");
    expect(functionBody).toContain("'individual_status_returned', false");
    expect(functionBody).not.toContain("full_name");
    expect(functionBody).not.toContain("reflection");
    expect(functionBody).toContain("REVOKE ALL ON FUNCTION public.get_athlete_team_momentum_v1_5()");
  });

  it("keeps full coach history at 56 days, authorized and n>=5 per metric", () => {
    const migration = readRepoFile("supabase/migrations/20260905114500_team_pulse_full_history_v1_5.sql");
    const edge = readRepoFile("supabase/functions/team-mental-state/index.ts");

    expect(migration).toContain("effective_today - 55");
    expect(migration).toContain("date_trunc('week'");
    expect(migration).toContain("public.evidence_eligibility_reason(instance.id, _protocol_version)");
    expect(migration).toContain("CASE WHEN day.mood_n >= 5 THEN day.mood END");
    expect(migration).toContain("CASE WHEN week.team_connection_n >= 5 THEN week.team_connection END");
    expect(migration).not.toContain("checkin.reflection");
    expect(migration).not.toContain("profile.full_name");
    expect(edge).toContain('client.rpc("get_team_pulse_history_v1_5"');
  });

  it("compiles both RPCs and returns only aggregate fixture data", async () => {
    const db = new PGlite();
    await db.exec(`
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE SCHEMA auth;
      CREATE TYPE public.app_role AS ENUM ('athlete', 'coach', 'admin');
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
        $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      CREATE TABLE public.user_roles(user_id uuid, role public.app_role);
      CREATE TABLE public.teams(id uuid PRIMARY KEY, created_by uuid, is_test_team boolean DEFAULT false);
      CREATE TABLE public.team_members(team_id uuid, user_id uuid);
      CREATE TABLE public.profiles(id uuid PRIMARY KEY, is_test_user boolean DEFAULT false);
      CREATE TABLE public.program_runs(
        id uuid PRIMARY KEY, team_id uuid, started_at date, timezone text,
        status text, created_at timestamptz DEFAULT now()
      );
      CREATE TABLE public.program_instances(
        id uuid PRIMARY KEY, user_id uuid, program_run_id uuid,
        status text, is_test_instance boolean DEFAULT false
      );
      CREATE TABLE public.qa_time_overrides(
        scope text, team_id uuid, simulated_date date, updated_at timestamptz DEFAULT now()
      );
      CREATE TABLE public.daily_checkins(
        id uuid DEFAULT gen_random_uuid(), user_id uuid, program_instance_id uuid,
        date date, mood_before integer, energy_level integer, focus_rating integer,
        wellbeing_metrics jsonb DEFAULT '{}'::jsonb
      );
      CREATE FUNCTION public.evidence_eligibility_reason(uuid, text)
      RETURNS text LANGUAGE sql STABLE AS $$ SELECT 'eligible'::text $$;
    `);

    await db.exec(readRepoFile("supabase/migrations/20260905113000_athlete_team_momentum_v1_5.sql"));
    await db.exec(readRepoFile("supabase/migrations/20260905114500_team_pulse_full_history_v1_5.sql"));

    const coach = "10000000-0000-4000-8000-000000000001";
    const team = "20000000-0000-4000-8000-000000000001";
    const run = "30000000-0000-4000-8000-000000000001";
    const athletes = Array.from({ length: 5 }, (_, index) =>
      `40000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    );
    const instances = Array.from({ length: 5 }, (_, index) =>
      `50000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    );

    await db.query("INSERT INTO public.teams(id, created_by) VALUES ($1, $2)", [team, coach]);
    await db.query("INSERT INTO public.program_runs(id, team_id, started_at, timezone, status) VALUES ($1, $2, CURRENT_DATE - 4, 'Europe/Berlin', 'active')", [run, team]);
    await db.query("INSERT INTO public.user_roles(user_id, role) VALUES ($1, 'coach')", [coach]);
    for (let index = 0; index < athletes.length; index += 1) {
      await db.query("INSERT INTO public.profiles(id) VALUES ($1)", [athletes[index]]);
      await db.query("INSERT INTO public.user_roles(user_id, role) VALUES ($1, 'athlete')", [athletes[index]]);
      await db.query("INSERT INTO public.team_members(team_id, user_id) VALUES ($1, $2)", [team, athletes[index]]);
      await db.query("INSERT INTO public.program_instances(id, user_id, program_run_id, status) VALUES ($1, $2, $3, 'active')", [instances[index], athletes[index], run]);
      await db.query(
        "INSERT INTO public.daily_checkins(user_id, program_instance_id, date, mood_before, energy_level, focus_rating, wellbeing_metrics) VALUES ($1, $2, CURRENT_DATE, 7, 6, 8, '{\"team_connection\":8,\"stress\":4}')",
        [athletes[index], instances[index]],
      );
    }

    await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [athletes[0]]);
    const momentum = await db.query<{ payload: { available: boolean; team_size: number; checked_in_today: number } }>(
      "SELECT public.get_athlete_team_momentum_v1_5() AS payload",
    );
    expect(momentum.rows[0].payload).toMatchObject({ available: true, team_size: 5, checked_in_today: 5 });
    expect(JSON.stringify(momentum.rows[0].payload)).not.toContain(athletes[0]);

    await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [coach]);
    const history = await db.query<{ payload: { available: boolean; daily_trends: unknown[]; weekly_trends: unknown[] } }>(
      "SELECT public.get_team_pulse_history_v1_5($1) AS payload",
      [team],
    );
    expect(history.rows[0].payload.available).toBe(true);
    expect(history.rows[0].payload.daily_trends).toHaveLength(5);
    expect(history.rows[0].payload.weekly_trends.length).toBeGreaterThan(0);
    expect(JSON.stringify(history.rows[0].payload)).not.toContain(athletes[0]);
    await db.close();
  });
});
