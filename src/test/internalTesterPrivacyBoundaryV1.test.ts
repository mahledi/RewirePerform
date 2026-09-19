// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

const migrationPaths = [
  "supabase/migrations/20260906133746_internal_tester_privacy_boundary_v1.sql",
  "supabase/migrations/20260906135858_internal_tester_coach_core_v1.sql",
  "supabase/migrations/20260906135859_internal_tester_admin_truth_v1.sql",
  "supabase/migrations/20260906135900_internal_tester_reminder_boundary_v1.sql",
  "supabase/migrations/20260906135901_internal_tester_evidence_boundary_v1.sql",
] as const;
const migration = migrationPaths
  .map((path) => readFileSync(resolve(process.cwd(), path), "utf8"))
  .join("\n");

describe("internal tester privacy boundary V1", () => {
  it("uses durable flags instead of names and closes every known coach path", () => {
    expect(migration).toContain("classify_internal_tester_v1");
    expect(migration).toContain("classify_internal_test_team_v1");
    expect(migration).toContain("enforce_internal_test_program_instance_v1");
    expect(migration).toContain("preserve_internal_test_profile_v1");
    expect(migration).toContain("preserve_internal_test_team_v1");
    expect(migration).toContain("NOT COALESCE(profile.is_test_user, false)");
    expect(migration).toContain("NOT COALESCE(instance.is_test_instance, false)");
    expect(migration).toContain("get_team_questionnaire_status");
    expect(migration).toContain("get_coach_team_checkin_status_v1_4");
    expect(migration).toContain("claim_coach_checkin_reminder_v1_4");
    expect(migration).toContain("get_coach_evidence_review_context");
    expect(migration).toContain("get_team_program_run_status");
    expect(migration).toContain("get_team_stats");
    expect(migration).not.toMatch(/full_name\s+(?:ILIKE|LIKE)|email\s+(?:ILIKE|LIKE)/i);
    expect(migration).not.toMatch(/Mahle|Herzog Male/i);
  });

  it("keeps classification and direct identifiers outside browser roles", () => {
    expect(migration).toContain(
      "REVOKE ALL ON TABLE app_private.internal_test_classification_audit",
    );
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION app_private.classify_internal_tester_v1(uuid, uuid, text)",
    );
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION app_private.classify_internal_tester_v1(uuid, uuid, text)\n  TO service_role",
    );
    expect(migration).not.toMatch(
      /GRANT EXECUTE ON FUNCTION app_private\.classify_internal_tester_v1[\s\S]{0,120}TO authenticated/,
    );
  });

  it("executes the migration and hides one internal tester inside a real team", async () => {
    const db = new PGlite();
    const coach = "00000000-0000-4000-8000-000000000001";
    const athlete = "00000000-0000-4000-8000-000000000002";
    const tester = "00000000-0000-4000-8000-000000000003";
    const team = "00000000-0000-4000-8000-000000000004";
    const run = "00000000-0000-4000-8000-000000000005";
    const athleteInstance = "00000000-0000-4000-8000-000000000006";
    const testerInstance = "00000000-0000-4000-8000-000000000007";

    await db.exec(`
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE ROLE service_role;
      CREATE SCHEMA auth;
      CREATE SCHEMA app_private;
      CREATE TYPE public.app_role AS ENUM ('athlete', 'coach', 'admin');
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
        SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
      CREATE TABLE auth.users (id uuid PRIMARY KEY);
      CREATE TABLE public.profiles (
        id uuid PRIMARY KEY REFERENCES auth.users(id),
        full_name text,
        is_test_user boolean NOT NULL DEFAULT false
      );
      CREATE TABLE public.teams (
        id uuid PRIMARY KEY,
        created_by uuid REFERENCES auth.users(id),
        name text,
        sport text,
        program_start_date date,
        is_archived boolean NOT NULL DEFAULT false,
        is_test_team boolean NOT NULL DEFAULT false
      );
      CREATE TABLE public.team_staff_memberships (
        team_id uuid,
        user_id uuid,
        status text,
        role text
      );
      CREATE TABLE public.team_members (team_id uuid, user_id uuid);
      CREATE TABLE public.user_roles (user_id uuid, role public.app_role);
      CREATE TABLE public.program_runs (
        id uuid PRIMARY KEY,
        team_id uuid,
        name text,
        status text,
        started_at date,
        created_at timestamptz NOT NULL DEFAULT now(),
        timezone text NOT NULL DEFAULT 'UTC'
      );
      CREATE TABLE public.program_instances (
        id uuid PRIMARY KEY,
        user_id uuid,
        team_id uuid,
        program_run_id uuid,
        status text,
        is_test_instance boolean NOT NULL DEFAULT false
      );
      CREATE TABLE public.questionnaire_responses (
        user_id uuid,
        program_instance_id uuid,
        instrument_id text,
        is_complete boolean,
        last_category_index integer,
        progress_updated_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE public.daily_checkins (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid,
        program_instance_id uuid,
        date date,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE public.assessments (
        user_id uuid,
        timing text,
        program_instance_id uuid
      );
      CREATE TABLE public.user_day_completion (
        user_id uuid,
        program_instance_id uuid
      );
      CREATE TABLE public.program_progress_snapshots (
        user_id uuid,
        completion_rate numeric,
        days_completed integer,
        date date
      );
      CREATE TABLE public.qa_time_overrides (
        scope text,
        team_id uuid,
        simulated_date date,
        updated_at timestamptz DEFAULT now()
      );
      CREATE TABLE public.notification_log (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid,
        notification_type text,
        sent_date date,
        status text,
        scheduled_for timestamptz,
        target_url text,
        metadata jsonb,
        UNIQUE (user_id, notification_type, sent_date)
      );
      CREATE TABLE public.native_push_devices (user_id uuid, platform text);
      CREATE TABLE public.push_subscriptions (user_id uuid);
      CREATE TABLE app_private.coach_checkin_reminder_campaigns (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id uuid,
        program_run_id uuid,
        requested_by uuid,
        program_date date,
        timezone text,
        is_test boolean,
        eligible_count integer DEFAULT 0,
        UNIQUE (team_id, program_date)
      );
      CREATE TABLE public.evidence_protocols (
        version text PRIMARY KEY,
        coach_collection_enabled boolean,
        status text
      );
      CREATE TABLE public.coach_evidence_reviews (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        coach_id uuid,
        scope_type text,
        team_id uuid,
        program_run_id uuid,
        target_program_instance_id uuid,
        week_number integer,
        observation_context text,
        observed_athlete_count integer,
        is_test boolean NOT NULL DEFAULT false
      );
      CREATE TABLE public.coach_evidence_observations (
        review_id uuid,
        domain_id text,
        score integer,
        not_observed boolean
      );

      ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Users can view own profile" ON public.profiles
        FOR SELECT TO authenticated USING (id = auth.uid());
      CREATE POLICY "Members can view own team memberships" ON public.team_members
        FOR SELECT TO authenticated USING (user_id = auth.uid());
      CREATE POLICY "Users read own role" ON public.user_roles
        FOR SELECT TO authenticated USING (user_id = auth.uid());

      GRANT SELECT ON public.profiles, public.team_members, public.user_roles TO authenticated;

      CREATE FUNCTION public.can_manage_team_program_runs(_team_id uuid)
      RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
        SELECT EXISTS (
          SELECT 1 FROM public.teams team
          WHERE team.id = _team_id AND team.created_by = auth.uid()
        )
      $$;
      CREATE FUNCTION public.is_member_of_team(_team_id uuid)
      RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
        SELECT EXISTS (
          SELECT 1 FROM public.team_members member
          WHERE member.team_id = _team_id AND member.user_id = auth.uid()
        )
      $$;
      CREATE FUNCTION public.get_effective_today(_actor_id uuid)
      RETURNS date LANGUAGE sql STABLE AS $$ SELECT DATE '2026-09-06' $$;
      CREATE FUNCTION public.evidence_eligibility_reason(uuid, text)
      RETURNS text LANGUAGE sql STABLE AS $$ SELECT 'eligible'::text $$;
      CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
      RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
        SELECT EXISTS (
          SELECT 1 FROM public.user_roles role
          WHERE role.user_id = _user_id AND role.role = _role
        )
      $$;
      CREATE FUNCTION public.get_coach_team_activity_status(_team_id uuid)
      RETURNS TABLE (
        user_id uuid,
        full_name text,
        last_activity_at timestamptz,
        days_completed integer,
        days_available integer,
        completion_rate numeric,
        current_streak integer,
        checkins_last_7d integer,
        last_checkin_date date,
        journal_entries_count integer,
        inactive_risk boolean
      ) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
        SELECT profile.id, profile.full_name, NULL::timestamptz,
          0, 6, 0::numeric, 0, 0, NULL::date, 0, true
        FROM public.profiles profile
        JOIN public.team_members member ON member.user_id = profile.id
        JOIN public.user_roles role
          ON role.user_id = profile.id AND role.role = 'athlete'::public.app_role
        WHERE member.team_id = _team_id
      $$;
    `);

    await db.exec(migration);
    await db.exec(`
      INSERT INTO auth.users(id) VALUES ('${coach}'), ('${athlete}'), ('${tester}');
      INSERT INTO public.profiles(id, full_name, is_test_user) VALUES
        ('${coach}', 'Coach', false),
        ('${athlete}', 'Official Athlete', false),
        ('${tester}', 'Internal Tester', true);
      INSERT INTO public.teams(id, created_by, is_test_team)
        VALUES ('${team}', '${coach}', false);
      INSERT INTO public.team_staff_memberships(team_id, user_id, status, role)
        VALUES ('${team}', '${coach}', 'active', 'lead_coach');
      INSERT INTO public.user_roles(user_id, role) VALUES
        ('${coach}', 'admin'), ('${athlete}', 'athlete'), ('${tester}', 'athlete');
      INSERT INTO public.team_members(team_id, user_id) VALUES
        ('${team}', '${coach}'), ('${team}', '${athlete}'), ('${team}', '${tester}');
      INSERT INTO public.program_runs(id, team_id, name, status, started_at)
        VALUES ('${run}', '${team}', 'Pilot', 'active', '2026-09-01');
      INSERT INTO public.program_instances(
        id, user_id, team_id, program_run_id, status, is_test_instance
      ) VALUES
        ('${athleteInstance}', '${athlete}', '${team}', '${run}', 'active', false),
        ('${testerInstance}', '${tester}', '${team}', '${run}', 'active', false);
      INSERT INTO public.questionnaire_responses(
        user_id, program_instance_id, instrument_id, is_complete, last_category_index
      ) VALUES
        ('${athlete}', '${athleteInstance}', 'onboarding_v2', true, 4),
        ('${tester}', '${testerInstance}', 'onboarding_v2', true, 4);
      INSERT INTO public.evidence_protocols(version, coach_collection_enabled, status)
        VALUES ('56d-transfer-v1-2026-07', true, 'pilot');
      SELECT set_config('request.jwt.claim.sub', '${coach}', false);
    `);

    const instances = await db.query<{ user_id: string; is_test_instance: boolean }>(
      `SELECT user_id, is_test_instance FROM public.program_instances ORDER BY user_id`,
    );
    expect(instances.rows).toEqual([
      { user_id: athlete, is_test_instance: false },
      { user_id: tester, is_test_instance: true },
    ]);

    await db.exec(`
      UPDATE public.profiles SET is_test_user = false WHERE id = '${tester}';
      UPDATE public.program_instances
      SET is_test_instance = false WHERE id = '${testerInstance}';
    `);
    const preservedTester = await db.query<{
      is_test_user: boolean;
      is_test_instance: boolean;
    }>(`
      SELECT profile.is_test_user, instance.is_test_instance
      FROM public.profiles profile
      JOIN public.program_instances instance ON instance.user_id = profile.id
      WHERE profile.id = '${tester}'
    `);
    expect(preservedTester.rows).toEqual([
      { is_test_user: true, is_test_instance: true },
    ]);

    const questionnaire = await db.query<{ full_name: string }>(
      `SELECT full_name FROM public.get_team_questionnaire_status($1)`,
      [team],
    );
    expect(questionnaire.rows).toEqual([{ full_name: "Official Athlete" }]);

    const checkins = await db.query<{ full_name: string }>(
      `SELECT full_name FROM public.get_coach_team_checkin_status_v1_4($1)`,
      [team],
    );
    expect(checkins.rows).toEqual([{ full_name: "Official Athlete" }]);

    const activity = await db.query<{ full_name: string }>(
      `SELECT full_name FROM public.get_coach_team_activity_status($1)`,
      [team],
    );
    expect(activity.rows).toEqual([{ full_name: "Official Athlete" }]);

    const runStatus = await db.query<{ status: Record<string, number> }>(
      `SELECT public.get_team_program_run_status($1) AS status`,
      [run],
    );
    expect(runStatus.rows[0]?.status.athletes_total).toBe(1);
    expect(runStatus.rows[0]?.status.athletes_assigned).toBe(1);

    const teamStats = await db.query<{ stats: Record<string, number> }>(
      `SELECT public.get_team_stats($1) AS stats`,
      [team],
    );
    expect(teamStats.rows[0]?.stats.member_count).toBe(2);

    const adminTeams = await db.query<{ teams: Array<Record<string, number>> }>(
      `SELECT public.get_admin_teams_summary(false) AS teams`,
    );
    expect(adminTeams.rows[0]?.teams[0]?.member_count).toBe(2);
    expect(adminTeams.rows[0]?.teams[0]?.athlete_count).toBe(1);

    const evidence = await db.query<{ context: Record<string, unknown> }>(
      `SELECT public.get_coach_evidence_review_context($1) AS context`,
      [team],
    );
    expect(evidence.rows[0]?.context.athlete_count).toBe(1);
    expect(JSON.stringify(evidence.rows[0]?.context)).not.toContain(tester);
    expect(JSON.stringify(evidence.rows[0]?.context)).not.toContain("Internal Tester");

    await db.exec(`
      UPDATE public.teams SET is_test_team = true WHERE id = '${team}';
      INSERT INTO public.qa_time_overrides(scope, team_id, simulated_date)
        VALUES ('team', '${team}', '2026-09-06');
    `);
    const reminder = await db.query<{ user_id: string }>(
      `SELECT user_id FROM public.claim_coach_checkin_reminder_v1_4($1, $2)`,
      [team, coach],
    );
    expect(reminder.rows).toEqual([{ user_id: athlete }]);
    const reminderRecipients = await db.query<{ user_id: string }>(
      `SELECT user_id FROM public.notification_log
       WHERE notification_type = 'coach_checkin_reminder'`,
    );
    expect(reminderRecipients.rows).toEqual([{ user_id: athlete }]);
    await db.exec(`UPDATE public.teams SET is_test_team = false WHERE id = '${team}'`);
    const preservedTeam = await db.query<{ is_test_team: boolean }>(
      `SELECT is_test_team FROM public.teams WHERE id = $1`,
      [team],
    );
    expect(preservedTeam.rows).toEqual([{ is_test_team: true }]);

    await db.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub', '${coach}', false);`);
    const visibleMembers = await db.query<{ user_id: string }>(
      `SELECT user_id FROM public.team_members WHERE team_id = $1 ORDER BY user_id`,
      [team],
    );
    expect(visibleMembers.rows.map((row) => row.user_id)).toEqual([coach, athlete]);
    await db.exec("RESET ROLE");

    await db.exec(`SELECT set_config('request.jwt.claim.sub', '${tester}', false); SET ROLE authenticated;`);
    const ownMembership = await db.query<{ user_id: string }>(
      `SELECT user_id FROM public.team_members WHERE user_id = $1`,
      [tester],
    );
    const ownProfile = await db.query<{ full_name: string }>(
      `SELECT full_name FROM public.profiles WHERE id = $1`,
      [tester],
    );
    expect(ownMembership.rows).toEqual([{ user_id: tester }]);
    expect(ownProfile.rows).toEqual([{ full_name: "Internal Tester" }]);
    await db.exec("RESET ROLE");
  });
});
