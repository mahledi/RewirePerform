import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const migration = readFileSync(
  resolve("supabase/migrations/20260721082355_add_mahleos_operational_read_contract.sql"),
  "utf8",
);

const ids = {
  team: "10000000-0000-4000-8000-000000000301",
  run: "20000000-0000-4000-8000-000000000301",
  missingRun: "20000000-0000-4000-8000-000000000399",
  testTeam: "10000000-0000-4000-8000-000000000302",
  testRun: "20000000-0000-4000-8000-000000000302",
  request: "90000000-0000-4000-8000-000000000301",
  duplicateRequest: "90000000-0000-4000-8000-000000000302",
  missingRequest: "90000000-0000-4000-8000-000000000303",
  pilotRequest: "90000000-0000-4000-8000-000000000304",
  readyPilotRequest: "90000000-0000-4000-8000-000000000305",
  testPilotRequest: "90000000-0000-4000-8000-000000000306",
  rateLimitedRequest: "90000000-0000-4000-8000-000000000307",
  duplicateInstanceRequest: "90000000-0000-4000-8000-000000000308",
  teamMismatchRequest: "90000000-0000-4000-8000-000000000309",
  historicalDuplicateInstance: "30000000-0000-4000-8000-000000000390",
  testUser: "00000000-0000-4000-8000-000000000399",
  athletes: Array.from({ length: 5 }, (_, index) => ({
    user: `00000000-0000-4000-8000-0000000003${index + 1}0`,
    instance: `30000000-0000-4000-8000-0000000003${index + 1}0`,
  })),
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

const asObject = (value) => typeof value === "string" ? JSON.parse(value) : value;

const readAsService = async ({ requestId, view, programRunId = null, clientId = "mahleos-v1" }) => {
  await db.exec("SET ROLE service_role");
  try {
    const result = await db.query(
      `SELECT public.read_mahleos_operational_view($1, $2, $3, $4) AS response`,
      [requestId, clientId, view, programRunId],
    );
    return asObject(result.rows[0].response);
  } finally {
    await db.exec("RESET ROLE");
  }
};

try {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE SCHEMA extensions;

    -- PGlite has no pgcrypto bundle. This deterministic 32-byte test double
    -- preserves the production digest(bytea, text) signature.
    CREATE FUNCTION extensions.digest(_value bytea, _algorithm text)
    RETURNS bytea LANGUAGE sql IMMUTABLE AS $$
      SELECT decode(md5(_value), 'hex')
        || decode(md5(_value || convert_to(_algorithm, 'UTF8')), 'hex')
    $$;

    CREATE TABLE auth.users(id uuid PRIMARY KEY);
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
    CREATE TABLE public.teams(
      id uuid PRIMARY KEY,
      is_test_team boolean NOT NULL DEFAULT false
    );
    CREATE TABLE public.team_members(
      team_id uuid NOT NULL REFERENCES public.teams(id),
      user_id uuid NOT NULL REFERENCES auth.users(id),
      PRIMARY KEY(team_id, user_id)
    );
    CREATE TABLE public.program_runs(
      id uuid PRIMARY KEY,
      team_id uuid NOT NULL REFERENCES public.teams(id),
      status text NOT NULL,
      started_at date,
      ended_at date
    );
    CREATE TABLE public.program_instances(
      id uuid PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES auth.users(id),
      team_id uuid REFERENCES public.teams(id),
      program_run_id uuid REFERENCES public.program_runs(id),
      status text NOT NULL,
      is_test_instance boolean NOT NULL DEFAULT false,
      evidence_eligible boolean NOT NULL DEFAULT false
    );
    CREATE TABLE public.user_day_assignments(
      id uuid PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES auth.users(id),
      date date NOT NULL
    );
    CREATE TABLE public.user_day_completion(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      assignment_id uuid NOT NULL REFERENCES public.user_day_assignments(id),
      program_instance_id uuid REFERENCES public.program_instances(id),
      user_id uuid NOT NULL REFERENCES auth.users(id),
      completion_status text NOT NULL,
      day_number integer NOT NULL,
      completed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE public.daily_checkins(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES auth.users(id),
      program_instance_id uuid REFERENCES public.program_instances(id),
      date date NOT NULL DEFAULT CURRENT_DATE,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE public.assessments(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES auth.users(id),
      program_instance_id uuid REFERENCES public.program_instances(id),
      timing text NOT NULL,
      assessment_type text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE public.questionnaire_responses(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES auth.users(id),
      program_instance_id uuid REFERENCES public.program_instances(id),
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE public.comprehension_check_instances(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES auth.users(id),
      program_instance_id uuid REFERENCES public.program_instances(id),
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE public.program_progress_snapshots(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      program_instance_id uuid REFERENCES public.program_instances(id),
      date date NOT NULL
    );
    CREATE TABLE public.app_event_log(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at timestamptz NOT NULL DEFAULT now(),
      event_name text NOT NULL,
      status text NOT NULL,
      is_test boolean NOT NULL DEFAULT false,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb
    );
    CREATE TABLE public.notification_log(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES auth.users(id),
      status text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE public.feedback(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES auth.users(id),
      type text NOT NULL,
      message text NOT NULL,
      status text NOT NULL DEFAULT 'open',
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE public.athlete_transfer_observations(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES auth.users(id),
      program_instance_id uuid NOT NULL REFERENCES public.program_instances(id),
      program_run_id uuid REFERENCES public.program_runs(id),
      protocol_version text NOT NULL,
      is_test boolean NOT NULL DEFAULT false
    );
    CREATE TABLE public.coach_evidence_reviews(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      program_run_id uuid NOT NULL REFERENCES public.program_runs(id),
      scope_type text NOT NULL,
      is_test boolean NOT NULL DEFAULT false
    );
    CREATE TABLE public.evidence_transfer_schedule(
      protocol_version text NOT NULL,
      day_number integer NOT NULL,
      PRIMARY KEY(protocol_version, day_number)
    );

    CREATE FUNCTION public.evidence_eligibility_reason(
      _program_instance_id uuid,
      _protocol_version text
    ) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
      SELECT CASE WHEN pi.evidence_eligible THEN 'eligible' ELSE 'consent_required' END
      FROM public.program_instances pi
      WHERE pi.id = _program_instance_id
    $$;
  `);

  await db.exec(migration);

  const privileges = await db.query(`
    SELECT
      has_function_privilege(
        'service_role',
        'public.read_mahleos_operational_view(uuid,text,text,uuid)',
        'EXECUTE'
      ) AS service_can_read,
      has_function_privilege(
        'authenticated',
        'public.read_mahleos_operational_view(uuid,text,text,uuid)',
        'EXECUTE'
      ) AS authenticated_can_read,
      has_function_privilege(
        'anon',
        'public.read_mahleos_operational_view(uuid,text,text,uuid)',
        'EXECUTE'
      ) AS anon_can_read,
      has_function_privilege(
        'service_role',
        'public._mahleos_system_health()',
        'EXECUTE'
      ) AS service_can_call_helper,
      has_table_privilege(
        'service_role',
        'public.mahleos_operations_access_log',
        'SELECT'
      ) AS service_can_read_audit,
      has_table_privilege(
        'service_role',
        'public.mahleos_operations_access_log',
        'INSERT'
      ) AS service_can_write_audit
  `);
  const privilege = privileges.rows[0];
  assert(privilege.service_can_read === true, "Service role needs the narrow read RPC");
  assert(privilege.authenticated_can_read === false, "Authenticated users must not call the machine RPC");
  assert(privilege.anon_can_read === false, "Anonymous users must not call the machine RPC");
  assert(privilege.service_can_call_helper === false, "Service role must not bypass the read wrapper");
  assert(privilege.service_can_read_audit === false, "Service role must not browse the audit table");
  assert(privilege.service_can_write_audit === false, "Service role must not forge audit rows");

  await db.query(
    "INSERT INTO public.teams(id, is_test_team) VALUES ($1, false), ($2, true)",
    [ids.team, ids.testTeam],
  );
  await db.query(
    `INSERT INTO public.program_runs(id, team_id, status, started_at)
     VALUES ($1, $2, 'active', CURRENT_DATE), ($3, $4, 'active', CURRENT_DATE)`,
    [ids.run, ids.team, ids.testRun, ids.testTeam],
  );
  await db.exec(`
    INSERT INTO public.evidence_transfer_schedule(protocol_version, day_number)
    VALUES
      ('56d-transfer-v2-2026-07', 4),
      ('56d-transfer-v2-2026-07', 7),
      ('56d-transfer-v2-2026-07', 11);
  `);

  for (const [index, athlete] of ids.athletes.entries()) {
    await db.query("INSERT INTO auth.users(id) VALUES ($1)", [athlete.user]);
    await db.query(
      "INSERT INTO public.user_roles(user_id, role) VALUES ($1, 'athlete')",
      [athlete.user],
    );
    await db.query("INSERT INTO public.profiles(id) VALUES ($1)", [athlete.user]);
    await db.query(
      "INSERT INTO public.team_members(team_id, user_id) VALUES ($1, $2)",
      [ids.team, athlete.user],
    );
    await db.query(
      `INSERT INTO public.program_instances(
        id, user_id, team_id, program_run_id, status, evidence_eligible
      ) VALUES ($1, $2, $3, $4, 'active', $5)`,
      [athlete.instance, athlete.user, ids.team, ids.run, index < 4],
    );
  }

  await db.query("INSERT INTO auth.users(id) VALUES ($1)", [ids.testUser]);
  await db.query(
    "INSERT INTO public.profiles(id, is_test_user) VALUES ($1, true)",
    [ids.testUser],
  );

  await db.query(
    `INSERT INTO public.feedback(user_id, type, message)
     VALUES ($1, 'bug', 'PRIVATE-FEEDBACK-CONTENT')`,
    [ids.athletes[0].user],
  );
  await db.query(
    `INSERT INTO public.feedback(user_id, type, message)
     VALUES ($1, 'bug', 'QA-PRIVATE-FEEDBACK-CONTENT')`,
    [ids.testUser],
  );
  await db.exec(`
    INSERT INTO public.app_event_log(event_name, status, metadata, is_test)
    VALUES
      ('daily_checkin_saved', 'success', '{"private":"PRIVATE-METADATA-CONTENT"}'::jsonb, false),
      ('daily_checkin_saved', 'failed', '{"private":"QA-PRIVATE-METADATA"}'::jsonb, true);
  `);
  await db.query(
    `INSERT INTO public.notification_log(user_id, status)
     VALUES ($1, 'sent'), ($2, 'failed')`,
    [ids.athletes[0].user, ids.testUser],
  );

  const daily = await readAsService({
    requestId: ids.request,
    view: "daily_brief",
  });
  assert(daily.ok === true, "Daily brief should be served");
  assert(daily.view === "daily_brief", "Daily brief must identify its view");
  assert(daily.data.reporting_timezone === "UTC", "Date-based counters must declare their timezone");
  assert(/^[a-f0-9]{64}$/u.test(daily.response_checksum), "Daily brief needs a SHA-256 checksum");
  assert(daily.data.feedback_status.counts.open === 1, "Feedback backlog count should be available");
  assert(daily.data.feedback_status.open_by_category.bug === 1, "Bug backlog count should be available");
  assert(daily.data.system_health.notifications_7d.sent === 1, "Production notifications should be counted");
  assert(daily.data.system_health.notifications_7d.failed === 0, "QA notifications must be excluded");
  assert(
    daily.data.system_health.operations_24h.flow_failures.daily_checkin_saved === 0,
    "QA failures must be excluded from production operations",
  );
  const serializedDaily = JSON.stringify(daily);
  assert(!serializedDaily.includes("PRIVATE-FEEDBACK-CONTENT"), "Feedback text must not leave RewirePerform");
  assert(!serializedDaily.includes("PRIVATE-METADATA-CONTENT"), "Technical metadata must not leave RewirePerform");
  assert(!serializedDaily.includes("QA-PRIVATE-FEEDBACK-CONTENT"), "QA feedback must stay excluded");
  assert(!serializedDaily.includes(ids.athletes[0].user), "User IDs must not leave RewirePerform");

  const duplicate = await readAsService({
    requestId: ids.request,
    view: "daily_brief",
  });
  assert(duplicate.ok === false && duplicate.error === "invalid_request", "Request IDs must be one-time");

  const auditCount = await db.query(
    "SELECT COUNT(*)::integer AS count FROM public.mahleos_operations_access_log WHERE request_id = $1",
    [ids.request],
  );
  assert(auditCount.rows[0].count === 1, "A served request needs exactly one audit row");

  const unknownView = await readAsService({
    requestId: ids.duplicateRequest,
    view: "private_dump",
  });
  assert(
    unknownView.ok === false && unknownView.error === "invalid_request",
    "Unknown database views must fail closed",
  );

  const missingPilot = await readAsService({
    requestId: ids.missingRequest,
    view: "pilot_readiness",
    programRunId: ids.missingRun,
  });
  assert(
    missingPilot.ok === false && missingPilot.error === "not_found",
    "Unknown program runs must not leak lookup details",
  );

  const pilot = await readAsService({
    requestId: ids.pilotRequest,
    view: "pilot_readiness",
    programRunId: ids.run,
  });
  assert(pilot.ok === true, "Known production pilot should be served");
  assert(pilot.data.status === "YELLOW", "Incomplete authorization and pre data should stay yellow");
  assert(pilot.data.evidence_authorization.eligible === 4, "Eligibility should be count-only");
  assert(!JSON.stringify(pilot).includes(ids.athletes[4].user), "Pilot output must not list missing athletes");

  await db.query(
    "UPDATE public.program_instances SET evidence_eligible = true WHERE id = $1",
    [ids.athletes[4].instance],
  );
  for (const athlete of ids.athletes) {
    for (const assessmentType of ["csai2r", "smtq", "flow_short"]) {
      await db.query(
        `INSERT INTO public.assessments(
          user_id, program_instance_id, timing, assessment_type
        ) VALUES ($1, $2, 'pre', $3)`,
        [athlete.user, athlete.instance, assessmentType],
      );
    }
  }

  const readyPilot = await readAsService({
    requestId: ids.readyPilotRequest,
    view: "pilot_readiness",
    programRunId: ids.run,
  });
  assert(readyPilot.data.status === "GREEN", "Complete clean pilot setup should be green");
  assert(readyPilot.data.evidence_authorization.eligible === 5, "All five athletes should be eligible");
  assert(readyPilot.data.data_quality.aggregate_visible === true, "n=5 should unlock aggregates");
  assert(readyPilot.data.data_quality.low_confidence === true, "n=5 must remain low confidence");

  await db.query(
    "UPDATE public.program_instances SET team_id = $1 WHERE id = $2",
    [ids.testTeam, ids.athletes[0].instance],
  );
  const teamMismatchPilot = await readAsService({
    requestId: ids.teamMismatchRequest,
    view: "pilot_readiness",
    programRunId: ids.run,
  });
  assert(
    teamMismatchPilot.data.status === "RED"
      && teamMismatchPilot.data.setup.run_instance_team_mismatches === 1,
    "A run instance assigned to the wrong team must block readiness",
  );
  await db.query(
    "UPDATE public.program_instances SET team_id = $1 WHERE id = $2",
    [ids.team, ids.athletes[0].instance],
  );

  await db.query(
    `INSERT INTO public.program_instances(
      id, user_id, team_id, program_run_id, status, evidence_eligible
    ) VALUES ($1, $2, $3, $4, 'completed', true)`,
    [ids.historicalDuplicateInstance, ids.athletes[0].user, ids.team, ids.run],
  );
  const duplicateInstancePilot = await readAsService({
    requestId: ids.duplicateInstanceRequest,
    view: "pilot_readiness",
    programRunId: ids.run,
  });
  assert(
    duplicateInstancePilot.data.status === "RED",
    "Multiple run instances for one athlete must block a green pilot status",
  );
  assert(
    duplicateInstancePilot.data.setup.multiple_run_instances === 1,
    "Duplicate run instances need an explicit integrity count",
  );
  assert(
    duplicateInstancePilot.data.evidence_authorization.eligible === 5,
    "Eligibility must count athletes, not duplicate instance rows",
  );

  const testPilot = await readAsService({
    requestId: ids.testPilotRequest,
    view: "pilot_readiness",
    programRunId: ids.testRun,
  });
  assert(testPilot.data.status === "TEST_EXCLUDED", "QA teams must be explicitly excluded");
  assert(testPilot.data.test_data_included === false, "Test data must never enter production reports");

  const forbiddenColumns = await db.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'mahleos_operations_access_log'
      AND column_name IN ('payload', 'response_payload', 'user_id', 'email', 'message')
  `);
  assert(forbiddenColumns.rows.length === 0, "Audit log must not store payloads or user content");

  await expectFailure(
    () => db.query(
      "UPDATE public.mahleos_operations_access_log SET outcome = 'not_found' WHERE request_id = $1",
      [ids.request],
    ),
    "mahleos_operations_access_log_append_only",
  );

  await db.exec(`
    INSERT INTO public.mahleos_operations_access_log(
      request_id, client_id, view_name, outcome, requested_at
    )
    SELECT gen_random_uuid(), 'rate-client', 'daily_brief', 'served', now()
    FROM generate_series(1, 30);
  `);
  const rateLimited = await readAsService({
    requestId: ids.rateLimitedRequest,
    clientId: "rate-client",
    view: "daily_brief",
  });
  assert(
    rateLimited.ok === false && rateLimited.error === "rate_limited",
    "The 31st request in one minute must be rate limited",
  );

  console.log(JSON.stringify({
    migrationApplied: true,
    machineRpcServiceOnly: true,
    privacyPayloadCheck: true,
    pilotReadinessCheck: true,
    auditAppendOnly: true,
    rateLimitCheck: true,
  }));
} finally {
  await db.close();
}
