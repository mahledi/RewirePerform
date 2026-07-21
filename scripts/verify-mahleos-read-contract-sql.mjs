import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import Ajv2020 from "ajv/dist/2020.js";

const db = new PGlite();
const migration = readFileSync(
  resolve("supabase/migrations/20260721082355_add_mahleos_operational_read_contract.sql"),
  "utf8",
);
const legacyRunMigration = readFileSync(
  resolve("supabase/migrations/20260721142328_preserve_legacy_team_instances_on_run_assignment.sql"),
  "utf8",
);
const extensionMigration = readFileSync(
  resolve("supabase/migrations/20260721153000_extend_mahleos_operational_read_contract.sql"),
  "utf8",
);
const hardeningMigration = readFileSync(
  resolve("supabase/migrations/20260721181524_harden_mahleos_readiness_statuses.sql"),
  "utf8",
);
const contractSchemaNames = [
  "system-health",
  "tracking-quality",
  "feedback-status",
  "pilot-readiness",
  "pilot-catalog",
  "solo-readiness",
  "evidence-status",
  "daily-brief",
  "operations-success",
];
const contractValidator = new Ajv2020({
  allErrors: true,
  allowUnionTypes: true,
  strict: true,
});
for (const name of contractSchemaNames) {
  contractValidator.addSchema(JSON.parse(readFileSync(
    resolve(`docs/mahleos-handoff/contracts/v1/schemas/${name}.schema.json`),
    "utf8",
  )));
}
const validateOperationsResponse = contractValidator.getSchema(
  "https://rewireperform.com/contracts/mahleos/v1/operations-success.schema.json",
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
  pilotCatalogRequest: "90000000-0000-4000-8000-000000000310",
  soloSuppressedRequest: "90000000-0000-4000-8000-000000000311",
  soloVisibleRequest: "90000000-0000-4000-8000-000000000312",
  evidenceStatusRequest: "90000000-0000-4000-8000-000000000313",
  evidenceInvalidRequest: "90000000-0000-4000-8000-000000000314",
  emptyTrackingRequest: "90000000-0000-4000-8000-000000000315",
  pilotUsageMissingRequest: "90000000-0000-4000-8000-000000000316",
  pilotDueMissingRequest: "90000000-0000-4000-8000-000000000317",
  pilotDueCompleteRequest: "90000000-0000-4000-8000-000000000318",
  evidenceLock: "70000000-0000-4000-8000-000000000301",
  qaEvidenceLock: "70000000-0000-4000-8000-000000000302",
  historicalDuplicateInstance: "30000000-0000-4000-8000-000000000390",
  legacyTeam: "10000000-0000-4000-8000-000000000390",
  legacyRun: "20000000-0000-4000-8000-000000000390",
  legacyUser: "00000000-0000-4000-8000-000000000390",
  legacyInstance: "30000000-0000-4000-8000-000000000391",
  testUser: "00000000-0000-4000-8000-000000000399",
  athletes: Array.from({ length: 5 }, (_, index) => ({
    user: `00000000-0000-4000-8000-0000000003${index + 1}0`,
    instance: `30000000-0000-4000-8000-0000000003${index + 1}0`,
    assignment: `40000000-0000-4000-8000-0000000003${index + 1}0`,
  })),
  soloAthletes: Array.from({ length: 5 }, (_, index) => ({
    user: `00000000-0000-4000-8000-0000000004${index + 1}0`,
    instance: `30000000-0000-4000-8000-0000000004${index + 1}0`,
    assignment: `40000000-0000-4000-8000-0000000004${index + 1}0`,
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

const assertContractResponse = (response, context) => {
  assert(validateOperationsResponse, "Operations response schema must compile");
  const valid = validateOperationsResponse(response);
  assert(
    valid,
    `${context} must match the published contract: ${JSON.stringify(validateOperationsResponse.errors)}`,
  );
};

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
      is_test_user boolean NOT NULL DEFAULT false,
      sport_category text,
      sport_level text
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
      cycle_number integer NOT NULL DEFAULT 1,
      status text NOT NULL,
      started_at date NOT NULL DEFAULT CURRENT_DATE,
      ended_at date,
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
      day_number integer NOT NULL,
      is_test boolean NOT NULL DEFAULT false
    );
    CREATE TABLE public.coach_evidence_reviews(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      program_run_id uuid NOT NULL REFERENCES public.program_runs(id),
      scope_type text NOT NULL,
      week_number integer NOT NULL,
      is_test boolean NOT NULL DEFAULT false
    );
    CREATE TABLE public.evidence_transfer_schedule(
      protocol_version text NOT NULL,
      day_number integer NOT NULL,
      PRIMARY KEY(protocol_version, day_number)
    );
    CREATE TABLE public.evidence_data_locks(
      id uuid PRIMARY KEY,
      status text NOT NULL DEFAULT 'active',
      scope_type text NOT NULL,
      program_run_id uuid REFERENCES public.program_runs(id),
      sport_category text,
      sport_level text,
      protocol_version text NOT NULL,
      snapshot_schema_version text NOT NULL,
      source_cutoff timestamptz NOT NULL,
      locked_at timestamptz NOT NULL DEFAULT now(),
      locked_by uuid REFERENCES public.profiles(id),
      include_test boolean NOT NULL DEFAULT false,
      checksum_algorithm text NOT NULL DEFAULT 'sha256',
      content_checksum text NOT NULL,
      evidence_payload jsonb NOT NULL,
      analysis_manifest jsonb NOT NULL
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

    CREATE FUNCTION public.can_manage_team_program_runs(_team_id uuid)
    RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
      SELECT COALESCE(current_setting('app.test_can_manage', true), 'false') = 'true'
    $$;
  `);

  await db.exec(migration);
  await db.exec(legacyRunMigration);
  await db.exec(extensionMigration);
  await db.exec(hardeningMigration);

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
      has_function_privilege(
        'service_role',
        'public._mahleos_solo_readiness()',
        'EXECUTE'
      ) AS service_can_call_solo_helper,
      has_function_privilege(
        'authenticated',
        'public._mahleos_evidence_status()',
        'EXECUTE'
      ) AS authenticated_can_call_evidence_helper,
      has_table_privilege(
        'service_role',
        'public.mahleos_operations_access_log',
        'SELECT'
      ) AS service_can_read_audit,
      has_table_privilege(
        'service_role',
        'public.mahleos_operations_access_log',
        'INSERT'
      ) AS service_can_write_audit,
      has_function_privilege(
        'authenticated',
        'public.assign_team_members_to_program_run(uuid)',
        'EXECUTE'
      ) AS authenticated_can_assign_run,
      has_function_privilege(
        'anon',
        'public.assign_team_members_to_program_run(uuid)',
        'EXECUTE'
      ) AS anon_can_assign_run
  `);
  const privilege = privileges.rows[0];
  assert(privilege.service_can_read === true, "Service role needs the narrow read RPC");
  assert(privilege.authenticated_can_read === false, "Authenticated users must not call the machine RPC");
  assert(privilege.anon_can_read === false, "Anonymous users must not call the machine RPC");
  assert(privilege.service_can_call_helper === false, "Service role must not bypass the read wrapper");
  assert(privilege.service_can_call_solo_helper === false, "Service role must not bypass the solo wrapper");
  assert(privilege.authenticated_can_call_evidence_helper === false, "Authenticated users must not browse Data Lock metadata");
  assert(privilege.service_can_read_audit === false, "Service role must not browse the audit table");
  assert(privilege.service_can_write_audit === false, "Service role must not forge audit rows");
  assert(privilege.authenticated_can_assign_run === true, "Authenticated managers need the guarded run assignment RPC");
  assert(privilege.anon_can_assign_run === false, "Anonymous users must not call the run assignment RPC");

  const emptyTracking = await readAsService({
    requestId: ids.emptyTrackingRequest,
    view: "tracking_quality",
  });
  assertContractResponse(emptyTracking, "Empty tracking quality");
  assert(emptyTracking.data.activity.active_instances === 0, "Empty coverage needs an explicit zero count");
  assert(emptyTracking.data.status === "YELLOW", "No active source coverage must never report green");

  await db.query(
    "INSERT INTO public.teams(id, is_test_team) VALUES ($1, false)",
    [ids.legacyTeam],
  );
  await db.query(
    `INSERT INTO public.program_runs(id, team_id, status, started_at)
     VALUES ($1, $2, 'active', CURRENT_DATE - 3)`,
    [ids.legacyRun, ids.legacyTeam],
  );
  await db.query("INSERT INTO auth.users(id) VALUES ($1)", [ids.legacyUser]);
  await db.query("INSERT INTO public.profiles(id) VALUES ($1)", [ids.legacyUser]);
  await db.query(
    "INSERT INTO public.user_roles(user_id, role) VALUES ($1, 'athlete')",
    [ids.legacyUser],
  );
  await db.query(
    "INSERT INTO public.team_members(team_id, user_id) VALUES ($1, $2)",
    [ids.legacyTeam, ids.legacyUser],
  );
  await db.query(
    `INSERT INTO public.program_instances(
      id, user_id, team_id, status, started_at, cycle_number
    ) VALUES ($1, $2, $3, 'active', CURRENT_DATE - 3, 1)`,
    [ids.legacyInstance, ids.legacyUser, ids.legacyTeam],
  );

  await db.exec("SET ROLE authenticated");
  let legacyAssignment;
  try {
    await expectFailure(
      () => db.query(
        "SELECT public.assign_team_members_to_program_run($1)",
        [ids.legacyRun],
      ),
      "access_denied",
    );
    await db.query("SELECT set_config('app.test_can_manage', 'true', false)");
    const result = await db.query(
      "SELECT public.assign_team_members_to_program_run($1) AS response",
      [ids.legacyRun],
    );
    legacyAssignment = asObject(result.rows[0].response);
  } finally {
    await db.exec("RESET ROLE");
  }
  assert(legacyAssignment.migrated_legacy_instances === 1, "Matching legacy cycles must be linked in place");
  const preservedLegacy = await db.query(
    `SELECT id, program_run_id, status, cycle_number
     FROM public.program_instances
     WHERE user_id = $1`,
    [ids.legacyUser],
  );
  assert(preservedLegacy.rows.length === 1, "Legacy assignment must not create a replacement cycle");
  assert(preservedLegacy.rows[0].id === ids.legacyInstance, "Legacy instance identity must stay stable");
  assert(preservedLegacy.rows[0].program_run_id === ids.legacyRun, "Legacy instance must be linked to the run");
  assert(preservedLegacy.rows[0].status === "active", "Preserved legacy instance must remain active");

  const assignmentConfig = await db.query(`
    SELECT p.proconfig::text AS config
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'assign_team_members_to_program_run'
  `);
  assert(
    String(assignmentConfig.rows[0].config).includes("search_path=pg_catalog"),
    "Run assignment SECURITY DEFINER must use a fixed safe search path",
  );

  await db.query(
    "UPDATE public.program_instances SET status = 'completed', ended_at = CURRENT_DATE WHERE id = $1",
    [ids.legacyInstance],
  );
  await db.query(
    "UPDATE public.program_runs SET status = 'completed', ended_at = CURRENT_DATE WHERE id = $1",
    [ids.legacyRun],
  );

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
      ('56d-transfer-v2-2026-07', 11),
      ('56d-transfer-v2-2026-07', 18);
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

  for (const [index, athlete] of ids.soloAthletes.entries()) {
    await db.query("INSERT INTO auth.users(id) VALUES ($1)", [athlete.user]);
    await db.query(
      `INSERT INTO public.profiles(id, sport_category, sport_level)
       VALUES ($1, 'combat_sport', 'competitive_amateur')`,
      [athlete.user],
    );
    await db.query(
      "INSERT INTO public.user_roles(user_id, role) VALUES ($1, 'athlete')",
      [athlete.user],
    );
    await db.query(
      `INSERT INTO public.program_instances(
        id, user_id, status, started_at, evidence_eligible
      ) VALUES ($1, $2, 'active', CURRENT_DATE - 7, $3)`,
      [athlete.instance, athlete.user, index < 2],
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
  assertContractResponse(daily, "Daily brief");
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
  assertContractResponse(pilot, "Pilot readiness");
  assert(pilot.data.evidence_authorization.eligible === 4, "Eligibility should be count-only");
  assert(!JSON.stringify(pilot).includes(ids.athletes[4].user), "Pilot output must not list missing athletes");

  const pilotCatalog = await readAsService({
    requestId: ids.pilotCatalogRequest,
    view: "pilot_catalog",
  });
  assertContractResponse(pilotCatalog, "Pilot catalog");
  assert(pilotCatalog.data.total_active_runs === 1, "Only one production run belongs in the catalog");
  assert(pilotCatalog.data.runs.length === 1, "QA runs must not enter the catalog");
  assert(pilotCatalog.data.runs[0].program_run_id === ids.run, "Catalog needs the opaque production run reference");
  assert(!JSON.stringify(pilotCatalog).includes(ids.testRun), "QA run IDs must remain excluded");
  assert(!JSON.stringify(pilotCatalog).includes(ids.team), "Team IDs must not leave RewirePerform");

  const soloSuppressed = await readAsService({
    requestId: ids.soloSuppressedRequest,
    view: "solo_readiness",
  });
  assertContractResponse(soloSuppressed, "Suppressed solo readiness");
  assert(soloSuppressed.data.setup.athletes === 5, "Solo readiness should count active production athletes");
  assert(soloSuppressed.data.evidence_authorization.eligible === 2, "Solo authorization must remain count-only");
  assert(soloSuppressed.data.cohort_breakdown.length === 0, "A cohort with fewer than five eligible athletes must be hidden");
  assert(soloSuppressed.data.suppressed_cohort_count === 1, "Suppressed cohorts need an explicit coverage signal");
  assert(!JSON.stringify(soloSuppressed).includes("combat_sport"), "Suppressed sport dimensions must not leave RewirePerform");

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

  const usageMissingPilot = await readAsService({
    requestId: ids.pilotUsageMissingRequest,
    view: "pilot_readiness",
    programRunId: ids.run,
  });
  assertContractResponse(usageMissingPilot, "Pilot with missing usage coverage");
  assert(usageMissingPilot.data.status === "YELLOW", "Missing Day 1 and activity must prevent green");
  assert(usageMissingPilot.data.daily_tracking.day_1_completed === 0, "Missing Day 1 must remain visible as a count");
  assert(usageMissingPilot.data.daily_tracking.active_7d === 0, "Missing recent activity must remain visible as a count");

  for (const athlete of ids.athletes) {
    await db.query(
      `INSERT INTO public.daily_checkins(user_id, program_instance_id, date)
       VALUES ($1, $2, CURRENT_DATE)`,
      [athlete.user, athlete.instance],
    );
    await db.query(
      `INSERT INTO public.user_day_assignments(id, user_id, date)
       VALUES ($1, $2, CURRENT_DATE)`,
      [athlete.assignment, athlete.user],
    );
    await db.query(
      `INSERT INTO public.user_day_completion(
        assignment_id, program_instance_id, user_id, completion_status, day_number, completed_at
      ) VALUES ($1, $2, $3, 'completed', 1, now())`,
      [athlete.assignment, athlete.instance, athlete.user],
    );
    await db.query(
      `INSERT INTO public.program_progress_snapshots(program_instance_id, date)
       VALUES ($1, CURRENT_DATE)`,
      [athlete.instance],
    );
  }

  const readyPilot = await readAsService({
    requestId: ids.readyPilotRequest,
    view: "pilot_readiness",
    programRunId: ids.run,
  });
  assert(readyPilot.data.status === "GREEN", "Complete clean pilot setup should be green");
  assertContractResponse(readyPilot, "Ready pilot");
  assert(readyPilot.data.evidence_authorization.eligible === 5, "All five athletes should be eligible");
  assert(readyPilot.data.data_quality.aggregate_visible === true, "n=5 should unlock aggregates");
  assert(readyPilot.data.data_quality.low_confidence === true, "n=5 must remain low confidence");

  await db.query(
    "UPDATE public.program_runs SET started_at = CURRENT_DATE - 13 WHERE id = $1",
    [ids.run],
  );
  for (const athlete of ids.athletes) {
    await db.query(
      `INSERT INTO public.athlete_transfer_observations(
        user_id, program_instance_id, program_run_id, protocol_version, day_number, is_test
      ) VALUES ($1, $2, $3, '56d-transfer-v2-2026-07', 18, false)`,
      [athlete.user, athlete.instance, ids.run],
    );
  }
  await db.query(
    `INSERT INTO public.coach_evidence_reviews(program_run_id, scope_type, week_number, is_test)
     VALUES ($1, 'team', 1, false), ($1, 'team', 1, false)`,
    [ids.run],
  );

  const dueMissingPilot = await readAsService({
    requestId: ids.pilotDueMissingRequest,
    view: "pilot_readiness",
    programRunId: ids.run,
  });
  assertContractResponse(dueMissingPilot, "Pilot with due measurements missing");
  assert(dueMissingPilot.data.status === "YELLOW", "Missing due transfer and coach weeks must prevent green");
  assert(dueMissingPilot.data.transfer_tracking.measurements_expected === 15, "Day 14 should require three transfer points per eligible athlete");
  assert(dueMissingPilot.data.transfer_tracking.measurements_completed === 0, "Future transfer observations must not satisfy current requirements");
  assert(dueMissingPilot.data.coach_tracking.weekly_reviews_due === 2, "Day 14 should require two coach weeks");
  assert(dueMissingPilot.data.coach_tracking.weekly_reviews_completed === 1, "Duplicate reviews for one week must count once");

  for (const athlete of ids.athletes) {
    for (const dayNumber of [4, 7, 11]) {
      await db.query(
        `INSERT INTO public.athlete_transfer_observations(
          user_id, program_instance_id, program_run_id, protocol_version, day_number, is_test
        ) VALUES ($1, $2, $3, '56d-transfer-v2-2026-07', $4, false)`,
        [athlete.user, athlete.instance, ids.run, dayNumber],
      );
    }
  }
  await db.query(
    `INSERT INTO public.coach_evidence_reviews(program_run_id, scope_type, week_number, is_test)
     VALUES ($1, 'team', 2, false)`,
    [ids.run],
  );

  const dueCompletePilot = await readAsService({
    requestId: ids.pilotDueCompleteRequest,
    view: "pilot_readiness",
    programRunId: ids.run,
  });
  assertContractResponse(dueCompletePilot, "Pilot with due measurements complete");
  assert(dueCompletePilot.data.status === "GREEN", "Complete due coverage should restore green");
  assert(dueCompletePilot.data.transfer_tracking.measurements_completed === 15, "Only due transfer observations should count");
  assert(dueCompletePilot.data.coach_tracking.weekly_reviews_completed === 2, "Distinct completed coach weeks should count");

  for (const athlete of ids.soloAthletes) {
    await db.query(
      "UPDATE public.program_instances SET evidence_eligible = true WHERE id = $1",
      [athlete.instance],
    );
    for (const assessmentType of ["csai2r", "smtq", "flow_short"]) {
      await db.query(
        `INSERT INTO public.assessments(
          user_id, program_instance_id, timing, assessment_type
        ) VALUES ($1, $2, 'pre', $3)`,
        [athlete.user, athlete.instance, assessmentType],
      );
    }
    await db.query(
      `INSERT INTO public.daily_checkins(user_id, program_instance_id, date)
       VALUES ($1, $2, CURRENT_DATE)`,
      [athlete.user, athlete.instance],
    );
    await db.query(
      `INSERT INTO public.user_day_assignments(id, user_id, date)
       VALUES ($1, $2, CURRENT_DATE)`,
      [athlete.assignment, athlete.user],
    );
    await db.query(
      `INSERT INTO public.user_day_completion(
        assignment_id, program_instance_id, user_id, completion_status, day_number, completed_at
      ) VALUES ($1, $2, $3, 'completed', 1, now())`,
      [athlete.assignment, athlete.instance, athlete.user],
    );
    for (const dayNumber of [4, 7]) {
      await db.query(
        `INSERT INTO public.athlete_transfer_observations(
          user_id, program_instance_id, protocol_version, day_number, is_test
        ) VALUES ($1, $2, '56d-transfer-v2-2026-07', $3, false)`,
        [athlete.user, athlete.instance, dayNumber],
      );
    }
  }

  const soloVisible = await readAsService({
    requestId: ids.soloVisibleRequest,
    view: "solo_readiness",
  });
  assertContractResponse(soloVisible, "Visible solo readiness");
  assert(soloVisible.data.status === "GREEN", "Complete solo tracking should become green");
  assert(soloVisible.data.cohort_breakdown.length === 1, "Five eligible athletes should unlock one cohort");
  assert(soloVisible.data.cohort_breakdown[0].sport_category === "combat_sport", "Visible cohort should retain the approved taxonomy");
  assert(soloVisible.data.cohort_breakdown[0].low_confidence === true, "n=5 remains low confidence");
  assert(soloVisible.data.transfer_tracking.measurements_expected === 10, "Solo transfer expectations must respect each start day");
  assert(soloVisible.data.transfer_tracking.measurements_completed === 10, "Solo transfer completion should be counted exactly");
  assert(!ids.soloAthletes.some(({ user }) => JSON.stringify(soloVisible).includes(user)), "Solo output must not contain user IDs");

  await db.query(
    `WITH source AS (
       SELECT '{"schema_version":"program-run-evidence-lock-v2-2026-07","private_probe":"MUST-NOT-LEAVE"}'::jsonb AS payload
     ), checksummed AS (
       SELECT
         payload,
         encode(extensions.digest(convert_to(payload::text, 'UTF8'), 'sha256'), 'hex') AS checksum
       FROM source
     )
     INSERT INTO public.evidence_data_locks(
       id,
       scope_type,
       program_run_id,
       protocol_version,
       snapshot_schema_version,
       source_cutoff,
       content_checksum,
       evidence_payload,
       analysis_manifest
     )
     SELECT
       $1,
       'program_run',
       $2,
       '56d-transfer-v2-2026-07',
       'program-run-evidence-lock-v2-2026-07',
       now(),
       checksum,
       payload,
       jsonb_build_object('content_checksum', checksum)
     FROM checksummed`,
    [ids.evidenceLock, ids.run],
  );
  await db.query(
    `WITH source AS (
       SELECT '{"schema_version":"solo-sport-evidence-lock-v2-2026-07","qa_private_probe":"QA-MUST-NOT-LEAVE"}'::jsonb AS payload
     ), checksummed AS (
       SELECT
         payload,
         encode(extensions.digest(convert_to(payload::text, 'UTF8'), 'sha256'), 'hex') AS checksum
       FROM source
     )
     INSERT INTO public.evidence_data_locks(
       id,
       scope_type,
       sport_category,
       protocol_version,
       snapshot_schema_version,
       source_cutoff,
       include_test,
       content_checksum,
       evidence_payload,
       analysis_manifest
     )
     SELECT
       $1,
       'solo_aggregate',
       'combat_sport',
       '56d-transfer-v2-2026-07',
       'solo-sport-evidence-lock-v2-2026-07',
       now(),
       true,
       checksum,
       payload,
       jsonb_build_object('content_checksum', checksum)
     FROM checksummed`,
    [ids.qaEvidenceLock],
  );

  const evidenceStatus = await readAsService({
    requestId: ids.evidenceStatusRequest,
    view: "evidence_status",
  });
  assertContractResponse(evidenceStatus, "Evidence status");
  assert(evidenceStatus.data.status === "GREEN", "A valid production Data Lock should be green");
  assert(evidenceStatus.data.active_locks === 1, "QA Data Locks must not enter production status");
  assert(evidenceStatus.data.checksum_valid === 1, "Valid Data Lock checksum should be visible as a count");
  assert(evidenceStatus.data.locks[0].lock_id === ids.evidenceLock, "MahleOS needs the opaque lock reference");
  const serializedEvidenceStatus = JSON.stringify(evidenceStatus);
  assert(!serializedEvidenceStatus.includes("MUST-NOT-LEAVE"), "Evidence payload must not leave RewirePerform status");
  assert(!serializedEvidenceStatus.includes(ids.qaEvidenceLock), "QA lock references must remain excluded");
  assert(!serializedEvidenceStatus.includes('"analysis_manifest":'), "Analysis manifests belong only to evidence-read");
  assert(!serializedEvidenceStatus.includes('"evidence_payload":'), "Evidence payloads belong only to evidence-read");

  await db.query(
    "UPDATE public.evidence_data_locks SET content_checksum = $1 WHERE id = $2",
    ["b".repeat(64), ids.evidenceLock],
  );
  const invalidEvidence = await readAsService({
    requestId: ids.evidenceInvalidRequest,
    view: "evidence_status",
  });
  assertContractResponse(invalidEvidence, "Invalid evidence status");
  assert(invalidEvidence.data.status === "RED", "Checksum mismatch must fail the Evidence status red");
  assert(invalidEvidence.data.checksum_invalid === 1, "Checksum mismatch needs an explicit count");
  assert(invalidEvidence.data.locks[0].integrity_status === "INVALID", "Invalid lock metadata must be explicit");

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
  assertContractResponse(testPilot, "Excluded QA pilot");
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
    pilotCatalogCheck: true,
    soloReadinessCheck: true,
    evidenceStatusCheck: true,
    publishedSchemaCheck: true,
    auditAppendOnly: true,
    rateLimitCheck: true,
  }));
} finally {
  await db.close();
}
