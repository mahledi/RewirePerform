// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260901224730_athlete_effective_today_timezone_rollover.sql",
  ),
  "utf8",
);

describe("athlete effective-today timezone migration", () => {
  it("uses DST-correct Berlin calendar dates rather than the UTC date", async () => {
    const db = new PGlite();
    const result = await db.query<{
      winter_before: string;
      winter_after: string;
      summer_before: string;
      summer_after: string;
      utc_at_summer_boundary: string;
    }>(`
      SELECT
        timezone('Europe/Berlin', timestamptz '2026-01-01 22:59:59+00')::date::text AS winter_before,
        timezone('Europe/Berlin', timestamptz '2026-01-01 23:00:00+00')::date::text AS winter_after,
        timezone('Europe/Berlin', timestamptz '2026-07-01 21:59:59+00')::date::text AS summer_before,
        timezone('Europe/Berlin', timestamptz '2026-07-01 22:00:00+00')::date::text AS summer_after,
        timezone('UTC', timestamptz '2026-07-01 22:00:00+00')::date::text AS utc_at_summer_boundary
    `);

    expect(result.rows[0]).toEqual({
      winter_before: "2026-01-01",
      winter_after: "2026-01-02",
      summer_before: "2026-07-01",
      summer_after: "2026-07-02",
      utc_at_summer_boundary: "2026-07-01",
    });
  });

  it("preserves QA/auth guards and resolves active-run, fallback and solo dates", async () => {
    const db = new PGlite();
    const actor = "00000000-0000-4000-8000-000000000001";
    const other = "00000000-0000-4000-8000-000000000002";
    const admin = "00000000-0000-4000-8000-000000000003";
    const qaUser = "00000000-0000-4000-8000-000000000004";
    const qaTeamUser = "00000000-0000-4000-8000-000000000005";
    const invalidTimezoneUser = "00000000-0000-4000-8000-000000000006";
    const missingTimezoneUser = "00000000-0000-4000-8000-000000000007";
    const soloUser = "00000000-0000-4000-8000-000000000008";
    const activeRun = "00000000-0000-4000-8000-000000000101";
    const invalidRun = "00000000-0000-4000-8000-000000000102";
    const missingRun = "00000000-0000-4000-8000-000000000103";
    const team = "00000000-0000-4000-8000-000000000201";

    await db.exec(`
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE SCHEMA auth;
      CREATE TYPE public.app_role AS ENUM ('athlete', 'coach', 'admin');
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
        SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
      CREATE TABLE public.user_roles (user_id uuid, role public.app_role);
      CREATE TABLE public.profiles (id uuid PRIMARY KEY, is_test_user boolean NOT NULL DEFAULT false);
      CREATE TABLE public.team_members (team_id uuid, user_id uuid);
      CREATE TABLE public.qa_time_overrides (
        scope text,
        team_id uuid,
        user_id uuid,
        simulated_date date,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE public.program_runs (
        id uuid PRIMARY KEY,
        timezone text,
        status text,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE public.program_instances (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid,
        program_run_id uuid,
        status text,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await db.exec(migration);
    await db.exec(`
      INSERT INTO public.profiles(id, is_test_user) VALUES
        ('${actor}', false),
        ('${other}', false),
        ('${admin}', false),
        ('${qaUser}', true),
        ('${qaTeamUser}', true),
        ('${invalidTimezoneUser}', false),
        ('${missingTimezoneUser}', false),
        ('${soloUser}', false);
      INSERT INTO public.user_roles(user_id, role) VALUES
        ('${actor}', 'athlete'),
        ('${other}', 'athlete'),
        ('${admin}', 'admin'),
        ('${qaUser}', 'athlete'),
        ('${qaTeamUser}', 'athlete'),
        ('${invalidTimezoneUser}', 'athlete'),
        ('${missingTimezoneUser}', 'athlete'),
        ('${soloUser}', 'athlete');
      INSERT INTO public.program_runs(id, timezone, status) VALUES
        ('${activeRun}', 'Pacific/Auckland', 'active'),
        ('${invalidRun}', 'Europe/Definitely_Not_A_Zone', 'active'),
        ('${missingRun}', NULL, 'active');
      INSERT INTO public.program_instances(user_id, program_run_id, status) VALUES
        ('${actor}', '${activeRun}', 'active'),
        ('${invalidTimezoneUser}', '${invalidRun}', 'active'),
        ('${missingTimezoneUser}', '${missingRun}', 'active'),
        ('${soloUser}', NULL, 'active');
      INSERT INTO public.qa_time_overrides(scope, user_id, simulated_date, updated_at)
        VALUES ('user', '${qaUser}', '2030-05-06', now());
      INSERT INTO public.team_members(team_id, user_id) VALUES ('${team}', '${qaTeamUser}');
      INSERT INTO public.qa_time_overrides(scope, team_id, simulated_date, updated_at)
        VALUES ('team', '${team}', '2031-06-07', now());
    `);

    const callAs = async (caller: string, target: string) => {
      await db.exec(`SELECT set_config('request.jwt.claim.sub', '${caller}', false)`);
      return db.query<{ actual: string; auckland: string; berlin: string }>(`
        SELECT
          public.get_effective_today($1)::text AS actual,
          timezone('Pacific/Auckland', now())::date::text AS auckland,
          timezone('Europe/Berlin', now())::date::text AS berlin
      `, [target]);
    };

    const activeTeam = await callAs(actor, actor);
    expect(activeTeam.rows[0].actual).toBe(activeTeam.rows[0].auckland);

    const invalidTimezone = await callAs(invalidTimezoneUser, invalidTimezoneUser);
    expect(invalidTimezone.rows[0].actual).toBe(invalidTimezone.rows[0].berlin);

    const missingTimezone = await callAs(missingTimezoneUser, missingTimezoneUser);
    expect(missingTimezone.rows[0].actual).toBe(missingTimezone.rows[0].berlin);

    const solo = await callAs(soloUser, soloUser);
    expect(solo.rows[0].actual).toBe(solo.rows[0].berlin);

    const qaOverride = await callAs(qaUser, qaUser);
    expect(qaOverride.rows[0].actual).toBe("2030-05-06");

    const teamOverride = await callAs(qaTeamUser, qaTeamUser);
    expect(teamOverride.rows[0].actual).toBe("2031-06-07");

    await expect(callAs(actor, other)).rejects.toThrow("effective_today_forbidden");
    const adminLookup = await callAs(admin, other);
    expect(adminLookup.rows[0].actual).toBe(adminLookup.rows[0].berlin);

    const grants = await db.query<{ anon: boolean; authenticated: boolean }>(`
      SELECT
        has_function_privilege('anon', 'public.get_effective_today(uuid)', 'EXECUTE') AS anon,
        has_function_privilege('authenticated', 'public.get_effective_today(uuid)', 'EXECUTE') AS authenticated
    `);
    expect(grants.rows[0]).toEqual({ anon: false, authenticated: true });

    await db.exec("SELECT set_config('request.jwt.claim.sub', '', false)");
    await expect(db.query(`SELECT public.get_effective_today('${actor}')`))
      .rejects.toThrow("authentication_required");
  });

  it("keeps the function contract intentionally narrow", () => {
    expect(migration).toContain("SET search_path = pg_catalog");
    expect(migration).toContain("JOIN public.program_runs run");
    expect(migration).toContain("instance.status = 'active'");
    expect(migration).toContain("run.status = 'active'");
    expect(migration).toContain("pg_catalog.pg_timezone_names");
    expect(migration).toContain("run_timezone := 'Europe/Berlin'");
    expect(migration).toContain("pg_catalog.timezone(run_timezone, pg_catalog.now())");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.get_effective_today(uuid) FROM PUBLIC, anon");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.get_effective_today(uuid) TO authenticated");
  });
});
