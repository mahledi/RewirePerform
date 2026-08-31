import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const migrationPath = resolve("supabase/migrations/20260831183516_v1_4_longitudinal_evidence_system.sql");
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const expectFailure = async (task, expected) => {
  try { await task(); } catch (error) {
    assert(String(error).includes(expected), `Expected ${expected}, received ${String(error)}`);
    return;
  }
  throw new Error(`Expected failure containing ${expected}`);
};
const setActor = (id) => db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [id]);

try {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE SCHEMA minor_auth;
    CREATE SCHEMA extensions;
    CREATE FUNCTION extensions.digest(data bytea, algorithm text)
    RETURNS bytea LANGUAGE sql IMMUTABLE AS $$ SELECT data $$;

    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;

    CREATE TYPE public.app_role AS ENUM ('athlete','coach','admin');
    CREATE TABLE public.user_roles(user_id uuid NOT NULL, role public.app_role NOT NULL, UNIQUE(user_id,role));
    CREATE TABLE public.profiles(
      id uuid PRIMARY KEY REFERENCES auth.users(id),
      is_test_user boolean NOT NULL DEFAULT false,
      data_contribution_consent boolean,
      data_contribution_consent_version text,
      data_contribution_consented_at timestamptz
    );
    CREATE TABLE public.teams(id uuid PRIMARY KEY, created_by uuid);
    CREATE TABLE public.program_runs(id uuid PRIMARY KEY, team_id uuid REFERENCES public.teams(id));
    CREATE TABLE public.program_instances(
      id uuid PRIMARY KEY, user_id uuid NOT NULL, team_id uuid, program_run_id uuid,
      is_test_instance boolean NOT NULL DEFAULT false
    );
    CREATE TABLE public.questionnaire_responses(
      id uuid PRIMARY KEY, session_id text NOT NULL, answers jsonb NOT NULL DEFAULT '{}', analysis jsonb,
      created_at timestamptz NOT NULL DEFAULT now(), user_id uuid, is_complete boolean NOT NULL DEFAULT false,
      instrument_id text, questionnaire_version text, timing text NOT NULL DEFAULT 'pre', scores jsonb NOT NULL DEFAULT '{}',
      program_instance_id uuid
    );
    CREATE TABLE minor_auth.policy_versions(id uuid PRIMARY KEY);
    CREATE TABLE minor_auth.participant_authorizations(
      user_id uuid PRIMARY KEY, policy_id uuid, jurisdiction text, age_band text,
      age_assurance_method text, guardian_status text, athlete_status text, product_status text,
      data_contribution_guardian boolean, data_contribution_athlete boolean,
      data_contribution_status text, guardian_authorized_at timestamptz,
      athlete_assented_at timestamptz, product_authorized_at timestamptz, revoked_at timestamptz,
      created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
    );
    CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
    RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
      SELECT EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=_user_id AND r.role=_role)
    $$;
    CREATE FUNCTION public.can_manage_team_program_runs(_team_id uuid)
    RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
      SELECT public.has_role(auth.uid(),'admin'::public.app_role)
        OR EXISTS(SELECT 1 FROM public.teams t WHERE t.id=_team_id AND t.created_by=auth.uid())
    $$;
  `);

  await db.exec(readFileSync(migrationPath, "utf8"));

  const protocol = (await db.query(`
    SELECT status, required_consent_version, retention_policy, minimum_group_size
    FROM evidence_derived.analysis_protocols
  `)).rows[0];
  assert(protocol.status === "draft", "V1.4 protocol must default to draft");
  assert(protocol.required_consent_version.includes("pending-block-9"), "Consent gate must remain pending");
  assert(protocol.retention_policy.includes("pending-block-9"), "Retention gate must remain pending");
  assert(protocol.minimum_group_size === 5, "Minimum group size must be five");

  const contract = (await db.query(`
    SELECT count(*)::integer AS item_count,
      count(*) FILTER (WHERE privacy_scope='private_only' AND (internal_pseudonymous_allowed OR coach_aggregate_allowed))::integer AS private_leaks
    FROM evidence_derived.measurement_contract_items
  `)).rows[0];
  assert(contract.item_count === 36, "Expected 36 measurement contract items");
  assert(contract.private_leaks === 0, "Private-only items must not leak to evidence surfaces");
  const source = readFileSync(migrationPath, "utf8");
  assert(source.includes("AND coach_aggregate_allowed"), "Coach RPC must enforce the per-value coach flag");
  assert(source.match(/AND internal_pseudonymous_allowed/g)?.length >= 2, "Internal RPCs must enforce the per-value internal flag");

  const grants = (await db.query(`
    SELECT
      has_schema_privilege('authenticated','evidence_private','USAGE') AS private_schema,
      has_schema_privilege('authenticated','evidence_derived','USAGE') AS derived_schema,
      has_table_privilege('authenticated','evidence_private.subject_registry','SELECT') AS private_select,
      has_table_privilege('authenticated','evidence_derived.measurement_values','SELECT') AS derived_select,
      has_function_privilege('anon','public.get_my_longitudinal_evidence_v1_4()','EXECUTE') AS anon_athlete,
      has_function_privilege('authenticated','public.get_my_longitudinal_evidence_v1_4()','EXECUTE') AS athlete_rpc,
      has_function_privilege('authenticated','evidence_private.capture_onboarding_baseline_v1_4(uuid)','EXECUTE') AS capture_rpc
  `)).rows[0];
  assert(!grants.private_schema && !grants.derived_schema, "Browser roles must not use evidence schemas");
  assert(!grants.private_select && !grants.derived_select, "Browser roles must not select evidence tables");
  assert(!grants.anon_athlete && grants.athlete_rpc && !grants.capture_rpc, "Function grants are not least privilege");

  const athlete = "00000000-0000-4000-8000-000000000001";
  const outsider = "00000000-0000-4000-8000-000000000002";
  await db.query("INSERT INTO auth.users(id) VALUES ($1),($2)", [athlete, outsider]);
  await db.query("INSERT INTO public.profiles(id) VALUES ($1),($2)", [athlete, outsider]);
  await setActor(athlete);
  const own = (await db.query("SELECT public.get_my_longitudinal_evidence_v1_4() AS payload")).rows[0].payload;
  assert(own.status === "not_activated" && own.timeline.length === 0, "Draft athlete surface must be safely inactive");
  await expectFailure(
    () => db.query("SELECT public.get_admin_evidence_workbench_v1_4($1::uuid)", ["10000000-0000-4000-8000-000000000001"]),
    "access_denied",
  );
  await expectFailure(
    () => db.query("SELECT evidence_private.capture_onboarding_baseline_v1_4($1::uuid)", ["20000000-0000-4000-8000-000000000001"]),
    "evidence_v1_4_not_activated",
  );

  const claims = await db.query("SELECT claim_class,active FROM evidence_derived.claims_ledger ORDER BY claim_class");
  assert(claims.rows.find((row) => row.claim_class === "use")?.active === true, "Use claim should remain descriptive");
  assert(claims.rows.find((row) => row.claim_class === "causality")?.active === false, "Causality must be locked");

  console.log("Longitudinal evidence V1.4 SQL checks passed");
} finally {
  await db.close();
}
