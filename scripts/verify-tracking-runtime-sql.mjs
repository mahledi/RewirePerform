import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const migration = readFileSync(
  resolve("supabase/migrations/20260720080000_harden_tracking_runtime_permissions_and_snapshots.sql"),
  "utf8",
);

const ids = {
  athlete: "00000000-0000-4000-8000-000000000201",
  other: "00000000-0000-4000-8000-000000000202",
  admin: "00000000-0000-4000-8000-000000000203",
  instance: "10000000-0000-4000-8000-000000000201",
  otherInstance: "10000000-0000-4000-8000-000000000202",
  assignments: [
    "20000000-0000-4000-8000-000000000201",
    "20000000-0000-4000-8000-000000000202",
    "20000000-0000-4000-8000-000000000203",
  ],
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const expectFailure = async (task, expectedMessage) => {
  try {
    await task();
  } catch (error) {
    assert(String(error).includes(expectedMessage), `Expected ${expectedMessage}, received ${String(error)}`);
    return;
  }
  throw new Error(`Expected failure containing ${expectedMessage}`);
};

const setActor = async (userId) => {
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [userId]);
};

try {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE AS $$
      SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated;
    GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;

    CREATE TYPE public.app_role AS ENUM ('athlete', 'coach', 'admin');
    CREATE TABLE public.user_roles(
      user_id uuid NOT NULL REFERENCES auth.users(id),
      role public.app_role NOT NULL,
      UNIQUE(user_id, role)
    );
    CREATE TABLE public.profiles(
      id uuid PRIMARY KEY REFERENCES auth.users(id),
      is_test_user boolean NOT NULL DEFAULT false
    );
    CREATE TABLE public.team_members(
      team_id uuid NOT NULL,
      user_id uuid NOT NULL REFERENCES auth.users(id)
    );
    CREATE TABLE public.qa_time_overrides(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      scope text NOT NULL,
      team_id uuid,
      user_id uuid REFERENCES auth.users(id),
      simulated_date date NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE public.program_instances(
      id uuid PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES auth.users(id),
      team_id uuid,
      status text NOT NULL,
      started_at date NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE public.user_day_assignments(
      id uuid PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES auth.users(id),
      date date NOT NULL
    );
    CREATE TABLE public.user_day_completion(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      assignment_id uuid REFERENCES public.user_day_assignments(id),
      program_instance_id uuid REFERENCES public.program_instances(id),
      user_id uuid NOT NULL REFERENCES auth.users(id),
      day_number integer NOT NULL,
      completion_status text NOT NULL,
      task_completion jsonb,
      completed_at timestamptz
    );
    CREATE TABLE public.daily_checkins(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES auth.users(id),
      program_instance_id uuid REFERENCES public.program_instances(id),
      date date NOT NULL DEFAULT CURRENT_DATE
    );
    CREATE TABLE public.daily_journals(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES auth.users(id),
      program_instance_id uuid REFERENCES public.program_instances(id),
      date date NOT NULL DEFAULT CURRENT_DATE
    );
    CREATE TABLE public.comprehension_check_instances(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES auth.users(id),
      program_instance_id uuid REFERENCES public.program_instances(id),
      status text NOT NULL,
      correct_count integer NOT NULL,
      total_count integer NOT NULL
    );
    CREATE TABLE public.program_progress_snapshots(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES auth.users(id),
      team_id uuid,
      program_instance_id uuid REFERENCES public.program_instances(id),
      date date NOT NULL,
      program_day integer,
      days_available integer NOT NULL DEFAULT 0,
      days_completed integer NOT NULL DEFAULT 0,
      completion_rate numeric(5,4) NOT NULL DEFAULT 0,
      current_streak integer NOT NULL DEFAULT 0,
      longest_streak integer NOT NULL DEFAULT 0,
      comprehension_average numeric(5,4),
      tasks_completed_count integer NOT NULL DEFAULT 0,
      checkins_completed_count integer NOT NULL DEFAULT 0,
      journals_completed_count integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX uniq_snapshots_user_instance_date
      ON public.program_progress_snapshots(user_id, program_instance_id, date)
      WHERE program_instance_id IS NOT NULL;

    CREATE FUNCTION public.can_manage_team_calendar(uuid) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$ SELECT false $$;
    CREATE FUNCTION public.get_admin_ops_status(boolean) RETURNS json LANGUAGE sql SECURITY DEFINER AS $$ SELECT '{}'::json $$;
    CREATE FUNCTION public.get_admin_overview_stats(boolean) RETURNS json LANGUAGE sql SECURITY DEFINER AS $$ SELECT '{}'::json $$;
    CREATE FUNCTION public.get_admin_teams_summary(boolean) RETURNS json LANGUAGE sql SECURITY DEFINER AS $$ SELECT '{}'::json $$;
    CREATE FUNCTION public.get_effective_today(uuid) RETURNS date LANGUAGE sql SECURITY DEFINER AS $$ SELECT CURRENT_DATE $$;
    CREATE FUNCTION public.get_user_role(uuid) RETURNS public.app_role LANGUAGE sql SECURITY DEFINER AS $$ SELECT NULL::public.app_role $$;
    CREATE FUNCTION public.has_role(uuid, public.app_role) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$ SELECT false $$;
    CREATE FUNCTION public.is_coach_of_user(uuid) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$ SELECT false $$;
    CREATE FUNCTION public.is_creator_of_team(uuid) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$ SELECT false $$;
    CREATE FUNCTION public.is_member_of_team(uuid) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$ SELECT false $$;
    CREATE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN NEW; END $$;
    CREATE FUNCTION public.handle_new_user_role() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN NEW; END $$;

    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
  `);

  await db.exec(migration);

  const privileges = await db.query(`
    SELECT
      has_function_privilege('anon', 'public.get_user_role(uuid)', 'EXECUTE') AS anon_role_lookup,
      has_function_privilege('anon', 'public.get_effective_today(uuid)', 'EXECUTE') AS anon_effective_today,
      has_function_privilege('authenticated', 'public.handle_new_user()', 'EXECUTE') AS auth_signup_trigger,
      has_function_privilege('authenticated', 'public.handle_new_user_role()', 'EXECUTE') AS auth_role_trigger,
      has_function_privilege('authenticated', 'public.refresh_my_program_progress_snapshot(uuid)', 'EXECUTE') AS auth_snapshot;
  `);
  const privilege = privileges.rows[0];
  assert(privilege.anon_role_lookup === false, "Anonymous role lookup must be revoked");
  assert(privilege.anon_effective_today === false, "Anonymous QA date lookup must be revoked");
  assert(privilege.auth_signup_trigger === false, "Signup trigger function must not be an authenticated RPC");
  assert(privilege.auth_role_trigger === false, "Role trigger function must not be an authenticated RPC");
  assert(privilege.auth_snapshot === true, "Authenticated users need the self-only snapshot RPC");

  await db.query("INSERT INTO auth.users(id) VALUES ($1), ($2), ($3)", [ids.athlete, ids.other, ids.admin]);
  await db.query(
    "INSERT INTO public.user_roles(user_id, role) VALUES ($1, 'athlete'), ($2, 'athlete'), ($3, 'admin')",
    [ids.athlete, ids.other, ids.admin],
  );
  await db.query("INSERT INTO public.profiles(id) VALUES ($1), ($2), ($3)", [ids.athlete, ids.other, ids.admin]);
  await db.query(
    `INSERT INTO public.program_instances(id, user_id, status, started_at) VALUES
      ($1, $2, 'active', CURRENT_DATE - 6),
      ($3, $4, 'active', CURRENT_DATE - 2)`,
    [ids.instance, ids.athlete, ids.otherInstance, ids.other],
  );
  await db.query(
    `INSERT INTO public.user_day_assignments(id, user_id, date) VALUES
      ($1, $4, CURRENT_DATE - 2),
      ($2, $4, CURRENT_DATE - 1),
      ($3, $4, CURRENT_DATE)`,
    [...ids.assignments, ids.athlete],
  );
  await db.query(
    `INSERT INTO public.user_day_completion(
      assignment_id, program_instance_id, user_id, day_number,
      completion_status, task_completion, completed_at
    ) VALUES
      ($1, $4, $5, 1, 'completed', '["task-a"]'::jsonb, now() - interval '2 days'),
      ($2, $4, $5, 2, 'completed', '["task-b", "task-c"]'::jsonb, now() - interval '1 day'),
      ($3, $4, $5, 3, 'completed', '[]'::jsonb, now()),
      (NULL, $4, $5, 2, 'completed', '["task-b", "task-c"]'::jsonb, now() + interval '1 minute'),
      (NULL, $4, $5, 8, 'completed', '["future-task"]'::jsonb, now())`,
    [...ids.assignments, ids.instance, ids.athlete],
  );
  await db.query(
    `INSERT INTO public.daily_checkins(user_id, program_instance_id) VALUES
      ($1, $2), ($1, $2)`,
    [ids.athlete, ids.instance],
  );
  await db.query(
    "INSERT INTO public.daily_journals(user_id, program_instance_id) VALUES ($1, $2)",
    [ids.athlete, ids.instance],
  );
  await db.query(
    `INSERT INTO public.comprehension_check_instances(
      user_id, program_instance_id, status, correct_count, total_count
    ) VALUES ($1, $2, 'completed', 3, 4)`,
    [ids.athlete, ids.instance],
  );

  await db.exec("SET ROLE authenticated");
  await setActor(ids.athlete);
  const ownRole = await db.query("SELECT public.get_user_role($1) AS role", [ids.athlete]);
  assert(ownRole.rows[0].role === "athlete", "Users must be able to read their own role");
  await expectFailure(
    () => db.query("SELECT public.get_user_role($1)", [ids.other]),
    "role_lookup_forbidden",
  );

  const firstRefresh = await db.query(
    "SELECT public.refresh_my_program_progress_snapshot($1) AS snapshot",
    [ids.instance],
  );
  const snapshot = firstRefresh.rows[0].snapshot;
  assert(snapshot.user_id === ids.athlete, "Snapshot must stay scoped to the authenticated user");
  assert(snapshot.program_instance_id === ids.instance, "Snapshot must stay scoped to the active instance");
  assert(snapshot.days_available === 7, "Seven program days should be available");
  assert(snapshot.days_completed === 3, "Three unique completed days should be counted");
  assert(Math.abs(Number(snapshot.completion_rate) - 3 / 7) < 0.0001, "Completion rate must be 3/7");
  assert(snapshot.current_streak === 3 && snapshot.longest_streak === 3, "Streaks must use unique completion dates");
  assert(snapshot.tasks_completed_count === 3, "Task count must sum completed task arrays");
  assert(snapshot.checkins_completed_count === 1, "Duplicate check-ins on one date must count once");
  assert(snapshot.journals_completed_count === 1, "Journal count must be instance scoped");
  assert(Number(snapshot.comprehension_average) === 0.75, "Comprehension must use correct/total counts");

  await db.query("SELECT public.refresh_my_program_progress_snapshot($1)", [ids.instance]);
  await db.exec("RESET ROLE");
  const snapshotRows = await db.query(
    "SELECT COUNT(*)::integer AS n FROM public.program_progress_snapshots WHERE user_id = $1 AND program_instance_id = $2",
    [ids.athlete, ids.instance],
  );
  assert(snapshotRows.rows[0].n === 1, "Repeated refreshes must upsert instead of duplicating snapshots");

  await db.exec("SET ROLE authenticated");
  await setActor(ids.athlete);
  await expectFailure(
    () => db.query("SELECT public.refresh_my_program_progress_snapshot($1)", [ids.otherInstance]),
    "active_program_instance_required",
  );
  await db.exec("RESET ROLE");

  await db.exec("SET ROLE authenticated");
  await setActor(ids.admin);
  const adminLookup = await db.query("SELECT public.get_user_role($1) AS role", [ids.other]);
  assert(adminLookup.rows[0].role === "athlete", "Admins must retain explicit support lookup access");
  await db.exec("RESET ROLE");

  process.stdout.write("Tracking runtime SQL verified: grants, self-scope, duplicate/future-day resistance, idempotency, streaks and instance isolation.\n");
} finally {
  await db.close();
}
