import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const migration = readFileSync(
  resolve("supabase/migrations/20260723151225_harden_public_coach_access.sql"),
  "utf8",
);
const teamJoinAuthorizationMigration = readFileSync(
  resolve("supabase/migrations/20260801104717_harden_team_join_minor_authorization.sql"),
  "utf8",
);

const ids = {
  admin: "00000000-0000-4000-8000-000000000001",
  athlete: "00000000-0000-4000-8000-000000000002",
  candidate: "00000000-0000-4000-8000-000000000003",
  coach: "00000000-0000-4000-8000-000000000004",
  unconfirmed: "00000000-0000-4000-8000-000000000005",
  rollbackCandidate: "00000000-0000-4000-8000-000000000006",
  blockedAthlete: "00000000-0000-4000-8000-000000000007",
  activePolicy: "20000000-0000-4000-8000-000000000001",
  teamOne: "10000000-0000-4000-8000-000000000001",
  teamTwo: "10000000-0000-4000-8000-000000000002",
  missingTeam: "10000000-0000-4000-8000-000000000099",
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const expectFailure = async (task, expectedMessage) => {
  try {
    await task();
  } catch (error) {
    assert(
      String(error).includes(expectedMessage),
      `Expected ${expectedMessage}, received ${String(error)}`,
    );
    return;
  }
  throw new Error(`Expected failure containing ${expectedMessage}`);
};

const setActor = async (userId) => {
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [userId]);
};

const roleFor = async (userId) => {
  const result = await db.query(
    "SELECT role::text FROM public.user_roles WHERE user_id = $1::uuid ORDER BY role::text",
    [userId],
  );
  return result.rows.map((row) => row.role);
};

const membershipsFor = async (userId) => {
  const result = await db.query(
    "SELECT team_id::text FROM public.team_members WHERE user_id = $1::uuid ORDER BY team_id",
    [userId],
  );
  return result.rows.map((row) => row.team_id);
};

const ownerFor = async (teamId) => {
  const result = await db.query(
    "SELECT created_by::text FROM public.teams WHERE id = $1::uuid",
    [teamId],
  );
  return result.rows[0]?.created_by ?? null;
};

try {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE SCHEMA minor_auth;

    CREATE FUNCTION auth.uid()
    RETURNS uuid
    LANGUAGE sql
    STABLE
    AS $$
      SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;

    CREATE TYPE public.app_role AS ENUM ('athlete', 'coach', 'admin');

    CREATE TABLE auth.users (
      id uuid PRIMARY KEY,
      email text UNIQUE,
      email_confirmed_at timestamptz,
      raw_user_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb
    );

    CREATE TABLE public.user_roles (
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      role public.app_role NOT NULL,
      UNIQUE (user_id, role)
    );

    CREATE TABLE public.profiles (
      id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      full_name text
    );

    CREATE TABLE public.teams (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      sport text,
      created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
      access_code text UNIQUE,
      coach_access_code text UNIQUE,
      is_archived boolean NOT NULL DEFAULT false
    );

    CREATE TABLE public.team_members (
      team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      PRIMARY KEY (team_id, user_id)
    );

    CREATE TABLE minor_auth.system_settings (
      singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
      enforcement_enabled boolean NOT NULL DEFAULT false
    );
    INSERT INTO minor_auth.system_settings(singleton, enforcement_enabled)
    VALUES (true, false);

    CREATE TABLE minor_auth.policy_versions (
      id uuid PRIMARY KEY,
      status text NOT NULL
    );

    CREATE TABLE minor_auth.participant_authorizations (
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      policy_id uuid NOT NULL REFERENCES minor_auth.policy_versions(id),
      product_status text NOT NULL,
      revoked_at timestamptz,
      PRIMARY KEY (user_id, policy_id)
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
        FROM public.user_roles ur
        WHERE ur.user_id = _user_id
          AND ur.role = _role
      )
    $$;

    ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users read own role"
      ON public.user_roles
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());

    CREATE POLICY "Admins can insert user_roles"
      ON public.user_roles
      FOR INSERT
      TO authenticated
      WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

    CREATE POLICY "Admins can update user_roles"
      ON public.user_roles
      FOR UPDATE
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::public.app_role));

    CREATE POLICY "Admins can delete user_roles"
      ON public.user_roles
      FOR DELETE
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::public.app_role));

    CREATE FUNCTION public.handle_new_user_role()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    BEGIN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (
        NEW.id,
        CASE
          WHEN NEW.raw_user_meta_data->>'role' = 'coach'
            THEN 'coach'::public.app_role
          ELSE 'athlete'::public.app_role
        END
      );
      RETURN NEW;
    END;
    $$;

    CREATE TRIGGER on_auth_user_created_role
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

    CREATE FUNCTION public.join_team_by_code(_code text)
    RETURNS json
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    BEGIN
      RETURN json_build_object('success', false, 'error', 'legacy');
    END;
    $$;

    ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Authenticated users can create teams"
      ON public.teams
      FOR INSERT
      TO authenticated
      WITH CHECK (created_by = auth.uid());

    CREATE POLICY "Team creator can update"
      ON public.teams
      FOR UPDATE
      TO authenticated
      USING (created_by = auth.uid());

    CREATE POLICY "Team creator can join own team"
      ON public.team_members
      FOR INSERT
      TO authenticated
      WITH CHECK (
        user_id = auth.uid()
        AND team_id IN (
          SELECT t.id
          FROM public.teams t
          WHERE t.created_by = auth.uid()
        )
      );

    GRANT USAGE ON SCHEMA public, auth TO authenticated;
    GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
    GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
    GRANT SELECT, INSERT, UPDATE ON public.teams TO authenticated;
    GRANT SELECT, INSERT ON public.team_members TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
  `);

  await db.exec(migration);
  await db.exec(teamJoinAuthorizationMigration);

  await db.query(
    `INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data)
     VALUES
       ($1::uuid, 'admin@example.test', now(), '{"role":"admin"}'::jsonb),
       ($2::uuid, 'athlete@example.test', now(), '{"role":"coach"}'::jsonb),
       ($3::uuid, 'candidate@example.test', now(), '{"role":"coach"}'::jsonb),
       ($4::uuid, 'coach@example.test', now(), '{"role":"coach"}'::jsonb),
       ($5::uuid, 'unconfirmed@example.test', null, '{"role":"coach"}'::jsonb),
       ($6::uuid, 'rollback@example.test', now(), '{"role":"coach"}'::jsonb),
       ($7::uuid, 'blocked@example.test', now(), '{}'::jsonb)`,
    [
      ids.admin,
      ids.athlete,
      ids.candidate,
      ids.coach,
      ids.unconfirmed,
      ids.rollbackCandidate,
      ids.blockedAthlete,
    ],
  );

  await db.query(
    "INSERT INTO minor_auth.policy_versions(id, status) VALUES ($1::uuid, 'active')",
    [ids.activePolicy],
  );
  await db.query(
    `INSERT INTO minor_auth.participant_authorizations(
       user_id, policy_id, product_status, revoked_at
     ) VALUES ($1::uuid, $2::uuid, 'authorized', null)`,
    [ids.athlete, ids.activePolicy],
  );

  assert(
    JSON.stringify(await roleFor(ids.athlete)) === JSON.stringify(["athlete"]),
    "Manipulated signup metadata must still create an athlete",
  );

  await db.query("DELETE FROM public.user_roles WHERE user_id IN ($1::uuid, $2::uuid)", [
    ids.admin,
    ids.coach,
  ]);
  await db.query(
    `INSERT INTO public.user_roles (user_id, role)
     VALUES ($1::uuid, 'admin'), ($2::uuid, 'coach')`,
    [ids.admin, ids.coach],
  );

  await db.query(
    `INSERT INTO public.profiles (id, full_name)
     VALUES ($1::uuid, 'Candidate Athlete')`,
    [ids.candidate],
  );

  await db.query(
    `INSERT INTO public.teams (
       id, name, sport, created_by, access_code, coach_access_code
     )
     VALUES
       ($1::uuid, 'Team One', 'Fußball', $3::uuid, 'ATH123', 'OLD999'),
       ($2::uuid, 'Team Two', 'Boxen', $3::uuid, 'ATH456', 'COA456')`,
    [ids.teamOne, ids.teamTwo, ids.admin],
  );
  await db.query(
    "UPDATE public.teams SET created_by = $1::uuid WHERE id = $2::uuid",
    [ids.coach, ids.teamOne],
  );

  await setActor(ids.blockedAthlete);
  const blockedJoin = await db.query(
    "SELECT public.join_team_by_code('ath456') AS result",
  );
  assert(
    blockedJoin.rows[0].result.error === "minor_product_authorization_required",
    "An athlete without active product authorization must not join a team",
  );
  assert(
    (await membershipsFor(ids.blockedAthlete)).length === 0,
    "Blocked athlete must not receive a team membership",
  );

  await db.query(
    `INSERT INTO minor_auth.participant_authorizations(
       user_id, policy_id, product_status, revoked_at
     ) VALUES ($1::uuid, $2::uuid, 'authorized', now())`,
    [ids.blockedAthlete, ids.activePolicy],
  );
  const revokedJoin = await db.query(
    "SELECT public.join_team_by_code('ath456') AS result",
  );
  assert(
    revokedJoin.rows[0].result.error === "minor_product_authorization_required",
    "A revoked product authorization must not create team membership",
  );
  await db.query(
    `UPDATE minor_auth.participant_authorizations
     SET revoked_at = null
     WHERE user_id = $1::uuid AND policy_id = $2::uuid`,
    [ids.blockedAthlete, ids.activePolicy],
  );
  const authorizedJoin = await db.query(
    "SELECT public.join_team_by_code('ath456') AS result",
  );
  assert(
    authorizedJoin.rows[0].result.success === true,
    "The same athlete should join after product authorization",
  );

  await setActor(ids.athlete);
  const athleteJoin = await db.query(
    "SELECT public.join_team_by_code('ath123') AS result",
  );
  assert(athleteJoin.rows[0].result.success === true, "Athlete code should join");
  assert(
    JSON.stringify(await roleFor(ids.athlete)) === JSON.stringify(["athlete"]),
    "Athlete join must not mutate role",
  );

  const legacyCoachJoin = await db.query(
    "SELECT public.join_team_by_code('coa456') AS result",
  );
  assert(
    legacyCoachJoin.rows[0].result.error === "invalid_code",
    "Legacy coach code must not be accepted",
  );
  assert(
    JSON.stringify(await roleFor(ids.athlete)) === JSON.stringify(["athlete"]),
    "Legacy coach code must not elevate role",
  );

  await setActor(ids.coach);
  const coachJoin = await db.query(
    "SELECT public.join_team_by_code('ath456') AS result",
  );
  assert(
    coachJoin.rows[0].result.error === "athlete_account_required",
    "Coach accounts must not use public team joining",
  );

  await db.query(
    "INSERT INTO public.team_members (team_id, user_id) VALUES ($1::uuid, $2::uuid)",
    [ids.teamOne, ids.candidate],
  );

  await setActor(ids.athlete);
  await expectFailure(
    () =>
      db.query(
        "SELECT public.approve_coach_access($1::uuid, $2::uuid, null, null)",
        [ids.candidate, ids.teamTwo],
      ),
    "admin_required",
  );

  await setActor(ids.admin);
  const lookup = await db.query(
    "SELECT public.find_coach_access_candidate(' CANDIDATE@example.test ') AS result",
  );
  assert(
    lookup.rows[0].result.full_name === "Candidate Athlete",
    "Admin exact-email lookup should return the candidate",
  );

  const approval = await db.query(
    "SELECT public.approve_coach_access($1::uuid, $2::uuid, null, null) AS result",
    [ids.candidate, ids.teamTwo],
  );
  assert(approval.rows[0].result.role === "coach", "Approval should assign coach");
  assert(
    JSON.stringify(await roleFor(ids.candidate)) === JSON.stringify(["coach"]),
    "Approved candidate should have exactly the coach role",
  );
  assert(
    JSON.stringify(await membershipsFor(ids.candidate)) ===
      JSON.stringify([ids.teamTwo]),
    "Athlete memberships must not survive coach approval",
  );
  assert(
    await ownerFor(ids.teamTwo) === ids.candidate,
    "Admin-owned team must be handed over to the approved coach",
  );

  await expectFailure(
    () =>
      db.query(
        "SELECT public.approve_coach_access($1::uuid, $2::uuid, null, null)",
        [ids.unconfirmed, ids.teamTwo],
      ),
    "target_email_not_confirmed",
  );

  await expectFailure(
    () =>
      db.query(
        "SELECT public.approve_coach_access($1::uuid, $2::uuid, null, null)",
        [ids.rollbackCandidate, ids.missingTeam],
      ),
    "active_team_not_found",
  );
  assert(
    JSON.stringify(await roleFor(ids.rollbackCandidate)) ===
      JSON.stringify(["athlete"]),
    "Failed approval must leave the athlete role unchanged",
  );

  await db.query(
    "INSERT INTO public.team_members (team_id, user_id) VALUES ($1::uuid, $2::uuid)",
    [ids.teamOne, ids.coach],
  );
  await db.query(
    "SELECT public.approve_coach_access($1::uuid, $2::uuid, null, null)",
    [ids.coach, ids.teamOne],
  );
  assert(
    JSON.stringify(await membershipsFor(ids.coach)) ===
      JSON.stringify([ids.teamOne]),
    "An existing coach should keep an existing owned team assignment",
  );

  await expectFailure(
    () =>
      db.query(
        "SELECT public.approve_coach_access($1::uuid, $2::uuid, null, null)",
        [ids.coach, ids.teamTwo],
      ),
    "team_already_has_different_coach",
  );
  assert(
    JSON.stringify(await membershipsFor(ids.coach)) ===
      JSON.stringify([ids.teamOne]),
    "A team owned by another coach must not be reassigned",
  );
  assert(
    await ownerFor(ids.teamTwo) === ids.candidate,
    "Rejected reassignment must preserve the current coach owner",
  );

  const audit = await db.query(
    `SELECT action, COUNT(*)::integer AS count
     FROM public.coach_access_audit
     GROUP BY action
     ORDER BY action`,
  );
  assert(
    audit.rows.some(
      (row) => row.action === "coach_approved_and_assigned" && row.count === 1,
    ),
    "New coach approval should be audited once",
  );
  assert(
    audit.rows.some(
      (row) => row.action === "coach_assigned_to_team" && row.count === 1,
    ),
    "Existing coach assignment should be audited once",
  );

  const grants = await db.query(`
    SELECT
      has_function_privilege(
        'anon',
        'public.join_team_by_code(text)'::regprocedure,
        'EXECUTE'
      ) AS anon_join,
      has_function_privilege(
        'authenticated',
        'public.join_team_by_code(text)'::regprocedure,
        'EXECUTE'
      ) AS authenticated_join,
      has_function_privilege(
        'anon',
        'public.approve_coach_access(uuid,uuid,text,text)'::regprocedure,
        'EXECUTE'
      ) AS anon_approve
  `);
  assert(grants.rows[0].anon_join === false, "Anon join execution must be revoked");
  assert(
    grants.rows[0].authenticated_join === true,
    "Authenticated athletes need join execution",
  );
  assert(
    grants.rows[0].anon_approve === false,
    "Anon coach approval execution must be revoked",
  );

  await setActor(ids.athlete);
  await db.exec("SET ROLE authenticated");
  await expectFailure(
    () =>
      db.query(
        `INSERT INTO public.user_roles (user_id, role)
         VALUES ($1::uuid, 'coach'::public.app_role)`,
        [ids.athlete],
      ),
    "row-level security",
  );
  await expectFailure(
    () =>
      db.query(
        `INSERT INTO public.teams (id, name, created_by)
         VALUES (gen_random_uuid(), 'Unauthorized Team', $1::uuid)`,
        [ids.athlete],
      ),
    "row-level security",
  );
  await db.exec("RESET ROLE");

  console.log("Public access security SQL verification passed.");
} finally {
  await db.close();
}
