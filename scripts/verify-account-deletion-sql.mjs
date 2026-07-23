import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const migration = readFileSync(
  resolve("supabase/migrations/20260714084351_account_deletion_self_service.sql"),
  "utf8",
);

const ids = {
  athlete: "00000000-0000-4000-8000-000000000701",
  athleteLegacyOwner: "00000000-0000-4000-8000-000000000702",
  coach: "00000000-0000-4000-8000-000000000703",
  successor: "00000000-0000-4000-8000-000000000704",
  invalidSuccessor: "00000000-0000-4000-8000-000000000705",
  coachWithoutPlan: "00000000-0000-4000-8000-000000000706",
  coachWithStalePlan: "00000000-0000-4000-8000-000000000707",
  team: "10000000-0000-4000-8000-000000000701",
  teamWithoutPlan: "10000000-0000-4000-8000-000000000702",
  teamWithStalePlan: "10000000-0000-4000-8000-000000000703",
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const count = async (table, where = "true", values = []) => {
  const result = await db.query(
    `SELECT COUNT(*)::integer AS count FROM ${table} WHERE ${where}`,
    values,
  );
  return result.rows[0].count;
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

const personalTables = [
  ["daily_checkins", "user_id"],
  ["daily_journals", "user_id"],
  ["user_day_completion", "user_id"],
  ["comprehension_check_instances", "user_id"],
  ["assessments", "user_id"],
  ["deep_profile_assessments", "user_id"],
  ["program_progress_snapshots", "user_id"],
  ["questionnaire_responses", "user_id"],
  ["user_day_assignments", "user_id"],
  ["study_participants", "user_id"],
  ["app_event_log", "user_id"],
  ["notification_log", "user_id"],
  ["push_subscriptions", "user_id"],
  ["training_schedule", "user_id"],
  ["feedback", "user_id"],
  ["personalized_tasks", "user_id"],
  ["program_settings", "user_id"],
  ["calendar_events", "user_id"],
  ["program_instances", "user_id"],
];

const insertPersonalRows = async (userId) => {
  for (const [table, column] of personalTables) {
    await db.query(`INSERT INTO public.${table}(${column}) VALUES ($1)`, [userId]);
  }
  await db.query("INSERT INTO public.coach_journals(coach_id) VALUES ($1)", [userId]);
  await db.query(
    "INSERT INTO public.qa_time_overrides(user_id, created_by) VALUES ($1, $1)",
    [userId],
  );
};

const assertNoPersonalRows = async (userId) => {
  for (const [table, column] of personalTables) {
    assert(
      await count(`public.${table}`, `${column} = $1`, [userId]) === 0,
      `${table} retained personal rows after account deletion`,
    );
  }
  assert(
    await count("public.coach_journals", "coach_id = $1", [userId]) === 0,
    "coach_journals retained personal rows after account deletion",
  );
  assert(
    await count(
      "public.qa_time_overrides",
      "user_id = $1 OR created_by = $1",
      [userId],
    ) === 0,
    "qa_time_overrides retained personal rows after account deletion",
  );
};

try {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    CREATE SCHEMA auth;

    CREATE TYPE public.app_role AS ENUM ('athlete', 'coach', 'admin');
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE TABLE public.profiles(
      id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      full_name text
    );
    CREATE TABLE public.user_roles(
      user_id uuid NOT NULL,
      role public.app_role NOT NULL,
      UNIQUE(user_id, role)
    );
    CREATE TABLE public.teams(
      id uuid PRIMARY KEY,
      name text NOT NULL,
      created_by uuid,
      program_activated_by uuid
    );
    CREATE TABLE public.team_members(
      team_id uuid NOT NULL,
      user_id uuid NOT NULL,
      PRIMARY KEY(team_id, user_id)
    );

    CREATE TABLE public.program_runs(id bigserial PRIMARY KEY, created_by uuid);
    CREATE TABLE public.study_cohorts(id bigserial PRIMARY KEY, created_by uuid);
    CREATE TABLE public.study_aggregate_snapshots(
      id bigserial PRIMARY KEY,
      generated_by uuid,
      payload jsonb NOT NULL DEFAULT '{}'::jsonb
    );
    CREATE TABLE public.study_export_manifests(id bigserial PRIMARY KEY, generated_by uuid);
    CREATE TABLE public.study_evidence_snapshots(
      id bigserial PRIMARY KEY,
      generated_by uuid,
      payload jsonb NOT NULL DEFAULT '{}'::jsonb
    );
    CREATE TABLE public.team_calendar_events(id bigserial PRIMARY KEY, created_by uuid);
    CREATE TABLE public.team_training_schedule(id bigserial PRIMARY KEY, created_by uuid);
    CREATE TABLE public.qa_time_overrides(
      id bigserial PRIMARY KEY,
      user_id uuid,
      created_by uuid
    );

    CREATE TABLE public.daily_checkins(id bigserial PRIMARY KEY, user_id uuid, session_id text);
    CREATE TABLE public.daily_journals(id bigserial PRIMARY KEY, user_id uuid);
    CREATE TABLE public.user_day_completion(id bigserial PRIMARY KEY, user_id uuid);
    CREATE TABLE public.comprehension_check_instances(id bigserial PRIMARY KEY, user_id uuid);
    CREATE TABLE public.assessments(id bigserial PRIMARY KEY, user_id uuid, session_id text);
    CREATE TABLE public.deep_profile_assessments(id bigserial PRIMARY KEY, user_id uuid, session_id text);
    CREATE TABLE public.program_progress_snapshots(id bigserial PRIMARY KEY, user_id uuid);
    CREATE TABLE public.questionnaire_responses(id bigserial PRIMARY KEY, user_id uuid, session_id text);
    CREATE TABLE public.user_day_assignments(id bigserial PRIMARY KEY, user_id uuid);
    CREATE TABLE public.study_participants(id bigserial PRIMARY KEY, user_id uuid);
    CREATE TABLE public.app_event_log(id bigserial PRIMARY KEY, user_id uuid);
    CREATE TABLE public.coach_journals(id bigserial PRIMARY KEY, coach_id uuid);
    CREATE TABLE public.notification_log(id bigserial PRIMARY KEY, user_id uuid);
    CREATE TABLE public.push_subscriptions(id bigserial PRIMARY KEY, user_id uuid);
    CREATE TABLE public.training_schedule(id bigserial PRIMARY KEY, user_id uuid);
    CREATE TABLE public.feedback(id bigserial PRIMARY KEY, user_id uuid);
    CREATE TABLE public.personalized_tasks(id bigserial PRIMARY KEY, user_id uuid, session_id text);
    CREATE TABLE public.program_settings(id bigserial PRIMARY KEY, user_id uuid, session_id text);
    CREATE TABLE public.calendar_events(id bigserial PRIMARY KEY, user_id uuid, session_id text);
    CREATE TABLE public.program_instances(id bigserial PRIMARY KEY, user_id uuid);
  `);

  await db.exec(migration);

  const functionPrivileges = await db.query(`
    SELECT
      has_function_privilege('anon', 'public.cleanup_deleted_account()', 'EXECUTE') AS anon_execute,
      has_function_privilege('authenticated', 'public.cleanup_deleted_account()', 'EXECUTE') AS authenticated_execute,
      has_table_privilege('authenticated', 'public.account_deletion_requests', 'SELECT') AS authenticated_read
  `);
  assert(
    functionPrivileges.rows[0].anon_execute === false
      && functionPrivileges.rows[0].authenticated_execute === false
      && functionPrivileges.rows[0].authenticated_read === false,
    "Account deletion internals must remain unavailable to app roles",
  );

  await db.query(
    `INSERT INTO auth.users(id) VALUES
      ($1), ($2), ($3), ($4), ($5), ($6), ($7)`,
    [
      ids.athlete,
      ids.athleteLegacyOwner,
      ids.coach,
      ids.successor,
      ids.invalidSuccessor,
      ids.coachWithoutPlan,
      ids.coachWithStalePlan,
    ],
  );
  await db.query(
    `INSERT INTO public.profiles(id, full_name) VALUES
      ($1, 'Synthetic Athlete'),
      ($2, 'Synthetic Legacy Owner'),
      ($3, 'Synthetic Coach'),
      ($4, 'Synthetic Successor'),
      ($5, 'Synthetic Athlete Candidate'),
      ($6, 'Synthetic Coach Without Plan'),
      ($7, 'Synthetic Coach With Stale Plan')`,
    [
      ids.athlete,
      ids.athleteLegacyOwner,
      ids.coach,
      ids.successor,
      ids.invalidSuccessor,
      ids.coachWithoutPlan,
      ids.coachWithStalePlan,
    ],
  );
  await db.query(
    `INSERT INTO public.user_roles(user_id, role) VALUES
      ($1, 'athlete'),
      ($2, 'athlete'),
      ($3, 'coach'),
      ($4, 'coach'),
      ($5, 'athlete'),
      ($6, 'coach'),
      ($7, 'coach')`,
    [
      ids.athlete,
      ids.athleteLegacyOwner,
      ids.coach,
      ids.successor,
      ids.invalidSuccessor,
      ids.coachWithoutPlan,
      ids.coachWithStalePlan,
    ],
  );

  await insertPersonalRows(ids.athlete);
  for (const table of [
    "daily_checkins",
    "assessments",
    "deep_profile_assessments",
    "questionnaire_responses",
    "personalized_tasks",
    "program_settings",
    "calendar_events",
  ]) {
    await db.query(
      `INSERT INTO public.${table}(user_id, session_id) VALUES ($1, $2)`,
      [ids.athleteLegacyOwner, ids.athlete],
    );
  }
  await db.query("DELETE FROM auth.users WHERE id = $1", [ids.athlete]);
  assert(await count("auth.users", "id = $1", [ids.athlete]) === 0, "Athlete Auth row was retained");
  assert(await count("public.profiles", "id = $1", [ids.athlete]) === 0, "Athlete profile was retained");
  await assertNoPersonalRows(ids.athlete);
  for (const table of [
    "daily_checkins",
    "assessments",
    "deep_profile_assessments",
    "questionnaire_responses",
    "personalized_tasks",
    "program_settings",
    "calendar_events",
  ]) {
    assert(
      await count(`public.${table}`, "session_id = $1", [ids.athlete]) === 0,
      `${table} retained a legacy session reference after deletion`,
    );
  }

  await insertPersonalRows(ids.coach);
  await db.query(
    `INSERT INTO public.teams(id, name, created_by, program_activated_by)
     VALUES ($1, 'Synthetic Team', $2, $2)`,
    [ids.team, ids.coach],
  );
  await db.query(
    `INSERT INTO public.team_members(team_id, user_id) VALUES
      ($1, $2), ($1, $3), ($1, $4)`,
    [ids.team, ids.coach, ids.successor, ids.invalidSuccessor],
  );
  for (const table of [
    "program_runs",
    "study_cohorts",
    "study_export_manifests",
    "team_calendar_events",
    "team_training_schedule",
  ]) {
    const column = table.startsWith("study_") && table !== "study_cohorts"
      ? "generated_by"
      : table.startsWith("team_") || table === "program_runs" || table === "study_cohorts"
        ? "created_by"
        : "created_by";
    await db.query(`INSERT INTO public.${table}(${column}) VALUES ($1)`, [ids.coach]);
  }
  await db.query(
    "INSERT INTO public.study_aggregate_snapshots(generated_by, payload) VALUES ($1, '{\"aggregate\":true}')",
    [ids.coach],
  );
  await db.query(
    "INSERT INTO public.study_evidence_snapshots(generated_by, payload) VALUES ($1, '{\"aggregate\":true}')",
    [ids.coach],
  );
  await db.query(
    `INSERT INTO public.account_deletion_requests(user_id, transfer_plan)
     VALUES ($1, jsonb_build_object($2::text, $3::text))`,
    [ids.coach, ids.team, ids.successor],
  );
  await db.query("DELETE FROM auth.users WHERE id = $1", [ids.coach]);

  const transferredTeam = await db.query(
    "SELECT created_by, program_activated_by FROM public.teams WHERE id = $1",
    [ids.team],
  );
  assert(
    transferredTeam.rows[0].created_by === ids.successor,
    "Owned team was not transferred atomically to the approved co-coach",
  );
  assert(
    transferredTeam.rows[0].program_activated_by === null,
    "Team activation retained the deleted coach identifier",
  );
  assert(
    await count("public.team_members", "user_id = $1", [ids.coach]) === 0,
    "Deleted coach membership was retained",
  );
  await assertNoPersonalRows(ids.coach);
  for (const [table, column] of [
    ["program_runs", "created_by"],
    ["study_cohorts", "created_by"],
    ["study_export_manifests", "generated_by"],
    ["team_calendar_events", "created_by"],
    ["team_training_schedule", "created_by"],
  ]) {
    assert(
      await count(`public.${table}`, `${column} = $1`, [ids.coach]) === 0,
      `${table} retained the deleted coach identifier`,
    );
  }
  for (const table of ["study_aggregate_snapshots", "study_evidence_snapshots"]) {
    assert(await count(`public.${table}`) === 1, `${table} aggregate row was deleted`);
    assert(
      await count(`public.${table}`, "generated_by IS NULL") === 1,
      `${table} retained its operator identifier`,
    );
  }

  await db.query(
    `INSERT INTO public.teams(id, name, created_by)
     VALUES ($1, 'No Plan Team', $2)`,
    [ids.teamWithoutPlan, ids.coachWithoutPlan],
  );
  await expectFailure(
    () => db.query("DELETE FROM auth.users WHERE id = $1", [ids.coachWithoutPlan]),
    "account_deletion_requires_team_transfer",
  );
  assert(
    await count("auth.users", "id = $1", [ids.coachWithoutPlan]) === 1,
    "A failed ownership transfer partially deleted the coach",
  );
  assert(
    await count("public.teams", "id = $1 AND created_by = $2", [ids.teamWithoutPlan, ids.coachWithoutPlan]) === 1,
    "A failed ownership transfer partially changed the team",
  );

  await db.query(
    `INSERT INTO public.teams(id, name, created_by)
     VALUES ($1, 'Stale Plan Team', $2)`,
    [ids.teamWithStalePlan, ids.coachWithStalePlan],
  );
  await db.query(
    `INSERT INTO public.team_members(team_id, user_id) VALUES ($1, $2)`,
    [ids.teamWithStalePlan, ids.successor],
  );
  await db.query(
    `INSERT INTO public.account_deletion_requests(user_id, transfer_plan, requested_at)
     VALUES ($1, jsonb_build_object($2::text, $3::text), now() - interval '16 minutes')`,
    [ids.coachWithStalePlan, ids.teamWithStalePlan, ids.successor],
  );
  await expectFailure(
    () => db.query("DELETE FROM auth.users WHERE id = $1", [ids.coachWithStalePlan]),
    "account_deletion_requires_team_transfer",
  );
  assert(
    await count("auth.users", "id = $1", [ids.coachWithStalePlan]) === 1,
    "An expired deletion request removed the coach",
  );

  await db.query(
    `UPDATE public.account_deletion_requests
     SET transfer_plan = jsonb_build_object($2::text, $3::text), requested_at = now()
     WHERE user_id = $1`,
    [ids.coachWithStalePlan, ids.teamWithStalePlan, ids.invalidSuccessor],
  );
  await db.query(
    `INSERT INTO public.team_members(team_id, user_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [ids.teamWithStalePlan, ids.invalidSuccessor],
  );
  await expectFailure(
    () => db.query("DELETE FROM auth.users WHERE id = $1", [ids.coachWithStalePlan]),
    "account_deletion_invalid_team_successor",
  );
  assert(
    await count("auth.users", "id = $1", [ids.coachWithStalePlan]) === 1,
    "An athlete successor was accepted as a coach",
  );

  process.stdout.write(
    "Account deletion SQL verified: athlete cleanup, legacy references, coach transfer, rollback, retention and privileges.\n",
  );
} finally {
  await db.close();
}
