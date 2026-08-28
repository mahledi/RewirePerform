// @vitest-environment node

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260828152000_fix_prestart_system_health_v1_3.sql",
  ),
  "utf8",
);

describe("MahleOS system-health pre-start semantics", () => {
  it("counts an unassigned team instance only after that team has an active run", () => {
    expect(migration).toContain("instance.program_run_id IS NULL");
    expect(migration).toMatch(
      /EXISTS\s*\([\s\S]*FROM public\.program_runs run[\s\S]*run\.team_id = instance\.team_id[\s\S]*run\.status = 'active'[\s\S]*\)/,
    );
    expect(migration).not.toMatch(
      /NOT EXISTS\s*\([\s\S]*FROM public\.program_runs run[\s\S]*run\.team_id = instance\.team_id/,
    );
  });

  it("excludes every canonical test scope without relying on names", () => {
    expect(migration).toContain("NOT COALESCE(instance.is_test_instance, false)");
    expect(migration).toContain("NOT COALESCE(profile.is_test_user, false)");
    expect(migration).toContain("NOT COALESCE(team.is_test_team, false)");
    expect(migration.toLowerCase()).not.toMatch(/herzog|full_name|email|\blike\b/);
  });

  it("recomputes the overall signal and keeps the internal helper closed", () => {
    expect(migration).toContain("OR metrics.active_team_instances_without_run > 0");
    expect(migration).toContain("THEN 'RED'::text");
    expect(migration).toContain("THEN 'YELLOW'::text");
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public._mahleos_system_health()",
    );
    expect(migration).not.toMatch(/GRANT EXECUTE[\s\S]*_mahleos_system_health/i);
  });

  it("keeps a real pre-start instance green and turns it red only after run activation", async () => {
    const db = new PGlite();
    try {
      await db.exec(`
        CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
        CREATE TABLE public.profiles(id text PRIMARY KEY, is_test_user boolean NOT NULL DEFAULT false);
        CREATE TABLE public.teams(id text PRIMARY KEY, is_test_team boolean NOT NULL DEFAULT false);
        CREATE TABLE public.program_runs(id text PRIMARY KEY, team_id text NOT NULL, status text NOT NULL);
        CREATE TABLE public.program_instances(
          id text PRIMARY KEY,
          user_id text NOT NULL REFERENCES public.profiles(id),
          team_id text REFERENCES public.teams(id),
          program_run_id text,
          status text NOT NULL,
          is_test_instance boolean NOT NULL DEFAULT false
        );
        CREATE FUNCTION public._mahleos_system_health()
        RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
          SELECT '{
            "schema_version":"mahleos-system-health-v1.3",
            "status":"RED",
            "identity_integrity":{"users_missing_profile":0,"production_profiles_missing_role":0},
            "program_integrity":{"athletes_without_program_instance":0,"athletes_with_multiple_active_instances":0,"active_team_instances_without_run":99,"active_runs_without_start_date":0},
            "tracking_integrity_7d":{"checkins_missing_instance":0,"completions_missing_instance":0,"assessments_missing_instance":0,"questionnaires_missing_instance":0,"comprehension_missing_instance":0},
            "operations_24h":{"failed_events":0,"critical_failed_events":0,"flow_failures":0},
            "feedback":{"open":0}
          }'::jsonb
        $$;
        INSERT INTO public.profiles(id) VALUES ('athlete');
        INSERT INTO public.teams(id) VALUES ('team');
        INSERT INTO public.program_instances(id,user_id,team_id,program_run_id,status)
        VALUES ('instance','athlete','team',NULL,'active');
      `);
      await db.exec(migration);

      const before = await db.query<{ payload: Record<string, any> }>(
        "SELECT public._mahleos_system_health() AS payload",
      );
      expect(before.rows[0]?.payload.status).toBe("GREEN");
      expect(
        before.rows[0]?.payload.program_integrity.active_team_instances_without_run,
      ).toBe(0);

      await db.exec(
        "INSERT INTO public.program_runs(id,team_id,status) VALUES ('run','team','active')",
      );
      const active = await db.query<{ payload: Record<string, any> }>(
        "SELECT public._mahleos_system_health() AS payload",
      );
      expect(active.rows[0]?.payload.status).toBe("RED");
      expect(
        active.rows[0]?.payload.program_integrity.active_team_instances_without_run,
      ).toBe(1);

      await db.exec("UPDATE public.teams SET is_test_team = true WHERE id = 'team'");
      const testTeam = await db.query<{ payload: Record<string, any> }>(
        "SELECT public._mahleos_system_health() AS payload",
      );
      expect(testTeam.rows[0]?.payload.status).toBe("GREEN");
      expect(
        testTeam.rows[0]?.payload.program_integrity.active_team_instances_without_run,
      ).toBe(0);
    } finally {
      await db.close();
    }
  });
});
