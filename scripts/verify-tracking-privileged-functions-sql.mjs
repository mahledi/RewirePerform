import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();

const ids = {
  admin: "00000000-0000-4000-8000-000000000701",
  coach: "00000000-0000-4000-8000-000000000702",
  athlete: "00000000-0000-4000-8000-000000000703",
  outsider: "00000000-0000-4000-8000-000000000704",
  team: "10000000-0000-4000-8000-000000000701",
  run: "20000000-0000-4000-8000-000000000701",
  feedback: "90000000-0000-4000-8000-000000000701",
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

const readMigration = (fileName) =>
  readFileSync(resolve("supabase/migrations", fileName), "utf8");

const extractFunction = (sql, name) => {
  const marker = `CREATE OR REPLACE FUNCTION public.${name}`;
  const start = sql.lastIndexOf(marker);
  assert(start >= 0, `Missing ${name} in selected migration`);

  const bodyMarker = sql.indexOf("AS $$", start);
  assert(bodyMarker >= 0, `Missing body delimiter for ${name}`);
  const end = sql.indexOf("\n$$;", bodyMarker);
  assert(end >= 0, `Missing body end for ${name}`);

  return sql.slice(start, end + 4);
};

const setActor = async (userId) => {
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [userId]);
};

const call = async (sql, params = []) => db.query(sql, params);

const programRunMigration = readMigration(
  "20260710120000_program_runs_tracking_pipeline_v2.sql",
);
const runAssignmentMigration = readMigration(
  "20260721142328_preserve_legacy_team_instances_on_run_assignment.sql",
);
const pilotReadinessMigration = readMigration(
  "20260710130000_nlz_pilot_readiness_evidence_v2.sql",
);
const adminCoreMigration = readMigration(
  "20260430043545_f4a642ae-3715-4155-b84c-ac9ae7be1d0b.sql",
);
const consentMigration = readMigration(
  "20260608110000_data_contribution_consent.sql",
);
const evidenceMigration = readMigration(
  "20260627120000_nlz_evidence_tracking_v1.sql",
);
const unifiedEvidenceMigration = readMigration(
  "20260720090000_unify_program_run_evidence_eligibility.sql",
);

const testedFunctions = [
  "activate_team_program_run",
  "assign_team_members_to_program_run",
  "create_team_program_run",
  "get_active_team_program_run",
  "get_team_program_run_status",
  "set_team_program_run_status",
  "get_coach_team_activity_status",
  "get_team_questionnaire_status",
  "get_admin_evidence_quality",
  "get_admin_presentation_metrics",
  "get_admin_study_overview",
  "get_admin_system_health",
  "update_feedback_status",
  "get_program_run_development_evidence",
  "get_nlz_evidence_dossier",
];

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

    CREATE TABLE public.user_roles (
      user_id uuid NOT NULL,
      role public.app_role NOT NULL,
      UNIQUE (user_id, role)
    );

    CREATE TABLE public.teams (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      sport text,
      created_by uuid,
      is_archived boolean NOT NULL DEFAULT false,
      is_test_team boolean NOT NULL DEFAULT false
    );

    CREATE TABLE public.team_members (
      team_id uuid NOT NULL,
      user_id uuid NOT NULL,
      PRIMARY KEY (team_id, user_id)
    );

    CREATE TABLE public.program_runs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      team_id uuid NOT NULL,
      name text NOT NULL,
      status text NOT NULL DEFAULT 'planned',
      started_at date,
      ended_at date,
      created_by uuid,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb
    );

    CREATE TABLE public.program_instances (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL,
      team_id uuid,
      program_run_id uuid,
      cycle_number integer NOT NULL DEFAULT 1,
      status text NOT NULL DEFAULT 'active',
      started_at date NOT NULL DEFAULT CURRENT_DATE,
      ended_at date,
      is_test_instance boolean NOT NULL DEFAULT false
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

    CREATE FUNCTION public.is_member_of_team(_team_id uuid)
    RETURNS boolean
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = pg_catalog
    AS $$
      SELECT auth.uid() IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.team_members tm
          WHERE tm.team_id = _team_id
            AND tm.user_id = auth.uid()
        )
    $$;
  `);

  await db.exec(extractFunction(programRunMigration, "can_manage_team_program_runs"));
  await db.exec(extractFunction(programRunMigration, "create_team_program_run"));
  await db.exec(extractFunction(programRunMigration, "activate_team_program_run"));
  await db.exec(extractFunction(runAssignmentMigration, "assign_team_members_to_program_run"));
  await db.exec(extractFunction(programRunMigration, "get_active_team_program_run"));
  await db.exec(extractFunction(programRunMigration, "get_team_program_run_status"));
  await db.exec(extractFunction(programRunMigration, "set_team_program_run_status"));
  await db.exec(extractFunction(pilotReadinessMigration, "get_team_questionnaire_status"));
  await db.exec(extractFunction(pilotReadinessMigration, "get_coach_team_activity_status"));
  await db.exec(
    extractFunction(unifiedEvidenceMigration, "get_program_run_development_evidence"),
  );
  await db.exec(extractFunction(unifiedEvidenceMigration, "get_nlz_evidence_dossier"));

  await db.exec(extractFunction(adminCoreMigration, "get_admin_system_health"));
  await db.exec(extractFunction(adminCoreMigration, "update_feedback_status"));
  await db.exec(extractFunction(consentMigration, "get_admin_presentation_metrics"));
  await db.exec(extractFunction(consentMigration, "get_admin_study_overview"));
  await db.exec(extractFunction(evidenceMigration, "get_admin_evidence_quality"));

  await db.exec(`
    REVOKE ALL ON FUNCTION public.can_manage_team_program_runs(uuid)
      FROM PUBLIC, anon;
    REVOKE ALL ON FUNCTION public.create_team_program_run(uuid, text, date)
      FROM PUBLIC, anon;
    REVOKE ALL ON FUNCTION public.activate_team_program_run(uuid)
      FROM PUBLIC, anon;
    REVOKE ALL ON FUNCTION public.assign_team_members_to_program_run(uuid)
      FROM PUBLIC, anon;
    REVOKE ALL ON FUNCTION public.get_active_team_program_run(uuid)
      FROM PUBLIC, anon;
    REVOKE ALL ON FUNCTION public.get_team_program_run_status(uuid)
      FROM PUBLIC, anon;
    REVOKE ALL ON FUNCTION public.set_team_program_run_status(uuid, text)
      FROM PUBLIC, anon;
    REVOKE ALL ON FUNCTION public.get_team_questionnaire_status(uuid)
      FROM PUBLIC, anon;
    REVOKE ALL ON FUNCTION public.get_coach_team_activity_status(uuid)
      FROM PUBLIC, anon;
    REVOKE ALL ON FUNCTION public.get_program_run_development_evidence(uuid, text)
      FROM PUBLIC, anon;
    REVOKE ALL ON FUNCTION public.get_nlz_evidence_dossier(uuid)
      FROM PUBLIC, anon;
    REVOKE ALL ON FUNCTION public.get_admin_system_health()
      FROM PUBLIC, anon;
    REVOKE ALL ON FUNCTION public.update_feedback_status(uuid, text, text)
      FROM PUBLIC, anon;
    REVOKE ALL ON FUNCTION public.get_admin_presentation_metrics(boolean)
      FROM PUBLIC, anon;
    REVOKE ALL ON FUNCTION public.get_admin_study_overview(boolean)
      FROM PUBLIC, anon;
    REVOKE ALL ON FUNCTION public.get_admin_evidence_quality(boolean)
      FROM PUBLIC, anon;

    GRANT USAGE ON SCHEMA public, auth TO authenticated;
    GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
    GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)
      TO authenticated;
    GRANT EXECUTE ON FUNCTION public.is_member_of_team(uuid)
      TO authenticated;
    GRANT EXECUTE ON FUNCTION public.can_manage_team_program_runs(uuid)
      TO authenticated;
    GRANT EXECUTE ON FUNCTION public.create_team_program_run(uuid, text, date)
      TO authenticated;
    GRANT EXECUTE ON FUNCTION public.activate_team_program_run(uuid)
      TO authenticated;
    GRANT EXECUTE ON FUNCTION public.assign_team_members_to_program_run(uuid)
      TO authenticated;
    GRANT EXECUTE ON FUNCTION public.get_active_team_program_run(uuid)
      TO authenticated;
    GRANT EXECUTE ON FUNCTION public.get_team_program_run_status(uuid)
      TO authenticated;
    GRANT EXECUTE ON FUNCTION public.set_team_program_run_status(uuid, text)
      TO authenticated;
    GRANT EXECUTE ON FUNCTION public.get_team_questionnaire_status(uuid)
      TO authenticated;
    GRANT EXECUTE ON FUNCTION public.get_coach_team_activity_status(uuid)
      TO authenticated;
    GRANT EXECUTE ON FUNCTION public.get_program_run_development_evidence(uuid, text)
      TO authenticated;
    GRANT EXECUTE ON FUNCTION public.get_nlz_evidence_dossier(uuid)
      TO authenticated;
    GRANT EXECUTE ON FUNCTION public.get_admin_system_health()
      TO authenticated;
    GRANT EXECUTE ON FUNCTION public.update_feedback_status(uuid, text, text)
      TO authenticated;
    GRANT EXECUTE ON FUNCTION public.get_admin_presentation_metrics(boolean)
      TO authenticated;
    GRANT EXECUTE ON FUNCTION public.get_admin_study_overview(boolean)
      TO authenticated;
    GRANT EXECUTE ON FUNCTION public.get_admin_evidence_quality(boolean)
      TO authenticated;
  `);

  const grants = await db.query(`
    SELECT
      p.proname,
      has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
      has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY($1::text[])
    ORDER BY p.proname
  `, [testedFunctions]);
  assert(grants.rows.length === testedFunctions.length, "Every focused function must exist");
  for (const row of grants.rows) {
    assert(row.anon_execute === false, `${row.proname} must reject anonymous execution`);
    assert(
      row.authenticated_execute === true,
      `${row.proname} needs its guarded authenticated entry point`,
    );
  }

  await db.query(
    `INSERT INTO public.user_roles(user_id, role)
     VALUES
       ($1, 'admin'),
       ($2, 'coach'),
       ($3, 'athlete'),
       ($4, 'athlete')`,
    [ids.admin, ids.coach, ids.athlete, ids.outsider],
  );
  await db.query(
    `INSERT INTO public.teams(id, name, sport, created_by)
     VALUES ($1, 'Final Gate Team', 'football', $2)`,
    [ids.team, ids.coach],
  );
  await db.query(
    `INSERT INTO public.team_members(team_id, user_id)
     VALUES ($1, $2), ($1, $3)`,
    [ids.team, ids.coach, ids.athlete],
  );
  await db.query(
    `INSERT INTO public.program_runs(
       id, team_id, name, status, started_at, created_by
     ) VALUES ($1, $2, 'Existing Run', 'planned', CURRENT_DATE, $3)`,
    [ids.run, ids.team, ids.coach],
  );

  await setActor(ids.outsider);
  await expectFailure(
    () => call("SELECT public.create_team_program_run($1, 'Blocked Run', CURRENT_DATE)", [ids.team]),
    "access_denied",
  );
  await expectFailure(
    () => call("SELECT public.activate_team_program_run($1)", [ids.run]),
    "access_denied",
  );
  await expectFailure(
    () => call("SELECT public.assign_team_members_to_program_run($1)", [ids.run]),
    "access_denied",
  );
  await expectFailure(
    () => call("SELECT public.get_active_team_program_run($1)", [ids.team]),
    "access_denied",
  );
  await expectFailure(
    () => call("SELECT public.get_team_program_run_status($1)", [ids.run]),
    "access_denied",
  );
  await expectFailure(
    () => call("SELECT public.set_team_program_run_status($1, 'completed')", [ids.run]),
    "access_denied",
  );
  await expectFailure(
    () => call("SELECT * FROM public.get_team_questionnaire_status($1)", [ids.team]),
    "access_denied",
  );
  await expectFailure(
    () => call("SELECT * FROM public.get_coach_team_activity_status($1)", [ids.team]),
    "access_denied",
  );
  await expectFailure(
    () => call("SELECT public.get_program_run_development_evidence($1, '56d-transfer-v2-2026-07')", [ids.run]),
    "access_denied",
  );
  await expectFailure(
    () => call("SELECT public.get_nlz_evidence_dossier($1)", [ids.run]),
    "access_denied",
  );

  const adminOnlyCalls = [
    ["get_admin_system_health", "SELECT public.get_admin_system_health()"],
    [
      "update_feedback_status",
      "SELECT public.update_feedback_status($1, 'reviewed', NULL)",
      [ids.feedback],
    ],
    [
      "get_admin_presentation_metrics",
      "SELECT public.get_admin_presentation_metrics(false)",
    ],
    ["get_admin_study_overview", "SELECT public.get_admin_study_overview(false)"],
    [
      "get_admin_evidence_quality",
      "SELECT public.get_admin_evidence_quality(false)",
    ],
  ];
  for (const [name, sql, params = []] of adminOnlyCalls) {
    await expectFailure(
      () => call(sql, params),
      "admin role required",
    );
    assert(name, "Named admin test required");
  }

  await setActor(ids.athlete);
  const memberRead = await call(
    "SELECT public.get_team_program_run_status($1) AS result",
    [ids.run],
  );
  assert(
    memberRead.rows[0].result.run.id === ids.run,
    "A team athlete may read the operational status of their own run",
  );
  await expectFailure(
    () => call("SELECT public.activate_team_program_run($1)", [ids.run]),
    "access_denied",
  );

  await setActor(ids.coach);
  const activated = await call(
    "SELECT public.activate_team_program_run($1) AS result",
    [ids.run],
  );
  assert(activated.rows[0].result.status === "active", "Coach should activate own team run");

  const assigned = await call(
    "SELECT public.assign_team_members_to_program_run($1) AS result",
    [ids.run],
  );
  assert(
    assigned.rows[0].result.assigned_athletes === 1,
    "The athlete-role team member should receive a run instance",
  );

  const active = await call(
    "SELECT public.get_active_team_program_run($1) AS result",
    [ids.team],
  );
  assert(active.rows[0].result.id === ids.run, "Coach should read active own-team run");

  const completed = await call(
    "SELECT public.set_team_program_run_status($1, 'completed') AS result",
    [ids.run],
  );
  assert(completed.rows[0].result.status === "completed", "Coach should complete own-team run");

  const state = await db.query(
    `SELECT
       (SELECT COUNT(*)::integer FROM public.program_runs WHERE team_id = $1) AS run_count,
       (SELECT COUNT(*)::integer FROM public.program_instances WHERE program_run_id = $2) AS instance_count,
       (SELECT COUNT(*)::integer FROM public.program_instances
          WHERE program_run_id = $2 AND status = 'completed') AS completed_instances`,
    [ids.team, ids.run],
  );
  assert(state.rows[0].run_count === 1, "Denied run creation must not leave a row");
  assert(state.rows[0].instance_count === 1, "Exactly one assigned instance expected");
  assert(state.rows[0].completed_instances === 1, "Run completion must close active instances");

  console.log(
    `Privileged function focused verification passed: ${testedFunctions.length} functions, outsider/admin/member/manager negative paths.`,
  );
} finally {
  await db.close();
}
