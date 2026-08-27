import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();

const ids = {
  admin: "00000000-0000-4000-8000-000000000901",
  outsider: "00000000-0000-4000-8000-000000000902",
  realTeam: "10000000-0000-4000-8000-000000000901",
  testTeam: "10000000-0000-4000-8000-000000000902",
};

const uuid = (group, index) => `${group}0000000-0000-4000-8000-${String(index).padStart(12, "0")}`;

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

const readTrend = async () => {
  const result = await db.query("SELECT public.get_admin_activity_trends() AS payload");
  return result.rows[0].payload;
};

const addAthlete = async ({ userId, instanceId, teamId = null, isTestUser = false, isTestInstance = false }) => {
  await db.query(
    "INSERT INTO public.profiles(id, is_test_user, full_name, email) VALUES ($1, $2, $3, $4)",
    [userId, isTestUser, `Private Athlete ${userId.slice(-3)}`, `${userId.slice(-3)}@private.invalid`],
  );
  await db.query(
    "INSERT INTO public.user_roles(user_id, role) VALUES ($1, 'athlete')",
    [userId],
  );
  await db.query(
    `INSERT INTO public.program_instances(id, user_id, team_id, is_test_instance)
     VALUES ($1, $2, $3, $4)`,
    [instanceId, userId, teamId, isTestInstance],
  );
};

const addCheckin = async ({ userId, instanceId = null, dayOffset, suffix }) => {
  await db.query(
    `INSERT INTO public.daily_checkins(id, session_id, user_id, program_instance_id, date)
     VALUES ($1, $2, $3, $4, CURRENT_DATE + $5::integer)`,
    [uuid("7", suffix), `session-${suffix}-${dayOffset}`, userId, instanceId, dayOffset],
  );
};

const addCompletion = async ({ userId, instanceId, dayOffset, suffix }) => {
  await db.query(
    `INSERT INTO public.user_day_completion(
       id, assignment_id, user_id, program_instance_id, completion_status, completed_at
     ) VALUES (
       $1, $2, $3, $4, 'completed',
       (CURRENT_DATE + $5::integer)::timestamp + interval '12 hours'
     )`,
    [uuid("8", suffix), uuid("9", suffix), userId, instanceId, dayOffset],
  );
};

try {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    CREATE SCHEMA auth;

    CREATE FUNCTION auth.uid()
    RETURNS uuid
    LANGUAGE sql
    STABLE
    AS $$
      SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;

    CREATE TYPE public.app_role AS ENUM ('athlete', 'coach', 'admin');

    CREATE TABLE public.profiles (
      id uuid PRIMARY KEY,
      is_test_user boolean NOT NULL DEFAULT false,
      full_name text,
      email text
    );

    CREATE TABLE public.user_roles (
      user_id uuid NOT NULL,
      role public.app_role NOT NULL,
      UNIQUE (user_id, role)
    );

    CREATE TABLE public.teams (
      id uuid PRIMARY KEY,
      is_test_team boolean NOT NULL DEFAULT false
    );

    CREATE TABLE public.program_runs (
      id uuid PRIMARY KEY,
      team_id uuid
    );

    CREATE TABLE public.program_instances (
      id uuid PRIMARY KEY,
      user_id uuid NOT NULL,
      team_id uuid,
      program_run_id uuid,
      is_test_instance boolean NOT NULL DEFAULT false
    );

    CREATE TABLE public.daily_checkins (
      id uuid PRIMARY KEY,
      session_id text NOT NULL,
      user_id uuid,
      program_instance_id uuid,
      date date NOT NULL
    );

    CREATE TABLE public.user_day_completion (
      id uuid PRIMARY KEY,
      assignment_id uuid NOT NULL,
      user_id uuid NOT NULL,
      program_instance_id uuid,
      completion_status text NOT NULL,
      completed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
    RETURNS boolean
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = pg_catalog
    AS $$
      SELECT EXISTS (
        SELECT 1
        FROM public.user_roles role
        WHERE role.user_id = _user_id
          AND role.role = _role
      )
    $$;

    INSERT INTO public.profiles(id, is_test_user, full_name, email)
    VALUES
      ('${ids.admin}', true, 'Admin Private', 'admin@private.invalid'),
      ('${ids.outsider}', false, 'Outsider Private', 'outsider@private.invalid');

    INSERT INTO public.user_roles(user_id, role)
    VALUES ('${ids.admin}', 'admin');

    INSERT INTO public.teams(id, is_test_team)
    VALUES
      ('${ids.realTeam}', false),
      ('${ids.testTeam}', true);
  `);

  const migration = readFileSync(
    resolve("supabase/migrations/20260827153944_admin_activity_trends_v1.sql"),
    "utf8",
  );
  await db.exec(migration);

  const grants = await db.query(`
    SELECT
      has_function_privilege('anon', 'public.get_admin_activity_trends()', 'EXECUTE') AS anon_execute,
      has_function_privilege('authenticated', 'public.get_admin_activity_trends()', 'EXECUTE') AS authenticated_execute
  `);
  assert(grants.rows[0].anon_execute === false, "anon must not execute trend RPC");
  assert(grants.rows[0].authenticated_execute === true, "authenticated RPC entry must exist");

  await setActor(ids.outsider);
  await expectFailure(() => readTrend(), "admin_role_required");
  await setActor(ids.admin);

  const teamAthletes = [];
  const soloAthletes = [];
  for (let index = 1; index <= 5; index += 1) {
    const teamUser = uuid("2", index);
    const teamInstance = uuid("3", index);
    teamAthletes.push({ userId: teamUser, instanceId: teamInstance });
    await addAthlete({ userId: teamUser, instanceId: teamInstance, teamId: ids.realTeam });

    const soloUser = uuid("4", index);
    const soloInstance = uuid("5", index);
    soloAthletes.push({ userId: soloUser, instanceId: soloInstance });
    await addAthlete({ userId: soloUser, instanceId: soloInstance });
  }

  for (let index = 0; index < teamAthletes.length; index += 1) {
    await addCheckin({ ...teamAthletes[index], dayOffset: -8, suffix: 100 + index });
    if (index < 4) await addCheckin({ ...teamAthletes[index], dayOffset: -1, suffix: 200 + index });
  }
  for (let index = 0; index < soloAthletes.length; index += 1) {
    if (index < 3) await addCheckin({ ...soloAthletes[index], dayOffset: -8, suffix: 300 + index });
    await addCheckin({ ...soloAthletes[index], dayOffset: -1, suffix: 400 + index });
  }
  await addCompletion({ ...teamAthletes[0], dayOffset: -8, suffix: 501 });
  await addCompletion({ ...teamAthletes[0], dayOffset: -1, suffix: 502 });
  await addCompletion({ ...soloAthletes[0], dayOffset: -1, suffix: 503 });

  const legacyUser = uuid("6", 1);
  await db.query(
    "INSERT INTO public.profiles(id, is_test_user) VALUES ($1, false)",
    [legacyUser],
  );
  await db.query("INSERT INTO public.user_roles(user_id, role) VALUES ($1, 'athlete')", [legacyUser]);
  await addCheckin({ userId: legacyUser, instanceId: null, dayOffset: -1, suffix: 601 });

  const testProfileUser = uuid("6", 2);
  const testProfileInstance = uuid("6", 102);
  await addAthlete({ userId: testProfileUser, instanceId: testProfileInstance, isTestUser: true });
  await addCheckin({ userId: testProfileUser, instanceId: testProfileInstance, dayOffset: -1, suffix: 602 });

  const testInstanceUser = uuid("6", 3);
  const testInstance = uuid("6", 103);
  await addAthlete({ userId: testInstanceUser, instanceId: testInstance, isTestInstance: true });
  await addCheckin({ userId: testInstanceUser, instanceId: testInstance, dayOffset: -1, suffix: 603 });

  const testTeamUser = uuid("6", 4);
  const testTeamInstance = uuid("6", 104);
  await addAthlete({ userId: testTeamUser, instanceId: testTeamInstance, teamId: ids.testTeam });
  await addCheckin({ userId: testTeamUser, instanceId: testTeamInstance, dayOffset: -1, suffix: 604 });

  const trend = await readTrend();
  const all = trend.segments.find((segment) => segment.participation_mode === "all");
  const team = trend.segments.find((segment) => segment.participation_mode === "team");
  const solo = trend.segments.find((segment) => segment.participation_mode === "solo");

  assert(trend.window_days === 7, "trend must use seven-day windows");
  assert(all.sample_size === 11, "overall sample must contain ten classified plus one legacy athlete");
  assert(all.previous_active_athletes === 8, "overall previous active count mismatch");
  assert(all.current_active_athletes === 10, "overall current active count mismatch");
  assert(all.direction === "up" && all.active_athlete_delta === 2, "overall trend mismatch");
  assert(team.sample_size === 5, "team sample mismatch");
  assert(team.previous_active_athletes === 5 && team.current_active_athletes === 4, "team trend counts mismatch");
  assert(team.direction === "down" && team.active_athlete_delta === -1, "team trend direction mismatch");
  assert(solo.sample_size === 5, "solo sample mismatch");
  assert(solo.previous_active_athletes === 3 && solo.current_active_athletes === 5, "solo trend counts mismatch");
  assert(solo.direction === "up" && solo.active_athlete_delta === 2, "solo trend direction mismatch");
  assert(trend.data_quality.current_unclassified_events === 1, "legacy unclassified event must stay visible as missingness");

  await db.query("UPDATE public.profiles SET is_test_user = true WHERE id = $1", [soloAthletes[4].userId]);
  const suppressed = await readTrend();
  const suppressedSolo = suppressed.segments.find((segment) => segment.participation_mode === "solo");
  assert(suppressedSolo.sample_size === 4, "test profile must leave the solo segment");
  assert(suppressedSolo.sufficient_data === false, "solo segment below n=5 must be suppressed");
  assert(suppressedSolo.current_active_athletes === null, "suppressed solo count leaked");
  assert(suppressedSolo.direction === "insufficient_data", "suppressed solo direction leaked");

  const serialized = JSON.stringify(trend);
  for (const forbidden of [
    "Admin Private",
    "admin@private.invalid",
    "Private Athlete",
    "@private.invalid",
    '"user_id":',
    '"team_id":',
    '"program_instance_id":',
    '"reflection":',
  ]) {
    assert(!serialized.includes(forbidden), `private field leaked: ${forbidden}`);
  }
  assert(trend.privacy.test_profiles_excluded === true, "test profile exclusion contract missing");
  assert(trend.privacy.test_program_instances_excluded === true, "test instance exclusion contract missing");
  assert(trend.privacy.test_teams_excluded === true, "test team exclusion contract missing");

  console.log(
    "Admin activity trends SQL verified: admin-only, equal windows, all/team/solo aggregates, canonical test exclusion, n<5 suppression, legacy missingness and no identifiers.",
  );
} finally {
  await db.close();
}
