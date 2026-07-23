import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const migrationPath = resolve("supabase/migrations/20260718122735_minor_guardian_authorization_v1.sql");
const migration = readFileSync(migrationPath, "utf8");
const indexMigrationPath = resolve("supabase/migrations/20260718160000_minor_guardian_fk_indexes.sql");
const indexMigration = readFileSync(indexMigrationPath, "utf8");
const upgradeMigrationPath = resolve("supabase/migrations/20260719085701_guardian_personalization_v2.sql");
const upgradeMigration = readFileSync(upgradeMigrationPath, "utf8");
const soloEvidenceMigrationPath = resolve("supabase/migrations/20260720080100_add_structured_solo_evidence_locks.sql");
const soloEvidenceMigration = readFileSync(soloEvidenceMigrationPath, "utf8");
const teamAggregateMigrationPath = resolve("supabase/migrations/20260720082309_harden_team_mental_state_aggregate.sql");
const teamAggregateMigration = readFileSync(teamAggregateMigrationPath, "utf8");
const evidenceApiMigrationPath = resolve("supabase/migrations/20260720082953_add_evidence_read_api_contract.sql");
const evidenceApiMigration = readFileSync(evidenceApiMigrationPath, "utf8");
const unifiedRunEvidenceMigrationPath = resolve("supabase/migrations/20260720090000_unify_program_run_evidence_eligibility.sql");
const unifiedRunEvidenceMigration = readFileSync(unifiedRunEvidenceMigrationPath, "utf8");

const ids = {
  adult: "00000000-0000-4000-8000-000000000101",
  teen: "00000000-0000-4000-8000-000000000102",
  child: "00000000-0000-4000-8000-000000000103",
  blocked: "00000000-0000-4000-8000-000000000104",
  admin: "00000000-0000-4000-8000-000000000105",
  declinedChild: "00000000-0000-4000-8000-000000000106",
  stalePolicyChild: "00000000-0000-4000-8000-000000000107",
  adultInstance: "10000000-0000-4000-8000-000000000101",
  teenInstance: "10000000-0000-4000-8000-000000000102",
  childInstance: "10000000-0000-4000-8000-000000000103",
};

const soloAthletes = Array.from({ length: 5 }, (_, index) => ({
  user: `00000000-0000-4000-8000-00000000030${index + 1}`,
  instance: `10000000-0000-4000-8000-00000000030${index + 1}`,
  score: 6 + index,
  assessmentScore: 2 + index * 0.2,
}));

const teamPulse = {
  team: "20000000-0000-4000-8000-000000000301",
  run: "30000000-0000-4000-8000-000000000301",
};

const qaSolo = {
  user: "00000000-0000-4000-8000-000000000399",
  instance: "10000000-0000-4000-8000-000000000399",
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const action = async (name, userId, payload = {}) => {
  const result = await db.query(
    "SELECT public.minor_service_action($1, $2::uuid, $3::jsonb) AS result",
    [name, userId, JSON.stringify(payload)],
  );
  return result.rows[0].result;
};

const count = async (table, where = "true") => {
  const result = await db.query(`SELECT COUNT(*)::integer AS count FROM ${table} WHERE ${where}`);
  return result.rows[0].count;
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

try {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE SCHEMA cron;
    CREATE SCHEMA extensions;
    -- PGlite does not bundle pgcrypto. This deterministic 32-byte test double
    -- preserves the production digest(bytea, text) contract used by the migration.
    CREATE FUNCTION extensions.digest(_value bytea, _algorithm text)
    RETURNS bytea LANGUAGE sql IMMUTABLE AS $$
      SELECT decode(md5(_value), 'hex') || decode(md5(_value || convert_to(_algorithm, 'UTF8')), 'hex')
    $$;

    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE AS $$
      SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    CREATE TYPE public.app_role AS ENUM ('athlete', 'coach', 'admin');
    CREATE TABLE public.user_roles(
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      role public.app_role NOT NULL,
      UNIQUE(user_id, role)
    );
    CREATE TABLE public.profiles(
      id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      full_name text,
      sport text,
      team text,
      position text,
      is_test_user boolean NOT NULL DEFAULT false,
      data_contribution_consent boolean,
      data_contribution_consent_version text,
      data_contribution_consented_at timestamptz,
      data_contribution_updated_at timestamptz
    );
    CREATE TABLE public.program_instances(
      id uuid PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      team_id uuid,
      program_run_id uuid,
      status text NOT NULL,
      started_at date NOT NULL DEFAULT CURRENT_DATE,
      ended_at date,
      is_test_instance boolean NOT NULL DEFAULT false
    );
    CREATE TABLE public.teams(
      id uuid PRIMARY KEY,
      name text NOT NULL,
      created_by uuid REFERENCES auth.users(id),
      is_test_team boolean NOT NULL DEFAULT false
    );
    CREATE TABLE public.team_members(
      team_id uuid NOT NULL REFERENCES public.teams(id),
      user_id uuid NOT NULL REFERENCES auth.users(id),
      PRIMARY KEY(team_id, user_id)
    );
    CREATE TABLE public.qa_time_overrides(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      scope text NOT NULL,
      team_id uuid REFERENCES public.teams(id),
      user_id uuid REFERENCES auth.users(id),
      simulated_date date NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE public.program_runs(
      id uuid PRIMARY KEY,
      team_id uuid NOT NULL REFERENCES public.teams(id),
      name text NOT NULL,
      status text NOT NULL DEFAULT 'active',
      started_at date,
      ended_at date,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE public.evidence_protocols(
      version text PRIMARY KEY,
      status text NOT NULL CHECK (status IN ('draft', 'pilot', 'retired')),
      program_days smallint NOT NULL CHECK (program_days = 56),
      required_consent_version text NOT NULL,
      athlete_collection_enabled boolean NOT NULL DEFAULT false,
      coach_collection_enabled boolean NOT NULL DEFAULT false,
      minor_collection_enabled boolean NOT NULL DEFAULT false,
      required_guardian_consent_version text,
      required_athlete_assent_version text,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE public.evidence_transfer_schedule(
      protocol_version text NOT NULL REFERENCES public.evidence_protocols(version),
      day_number smallint NOT NULL,
      domain_id text NOT NULL,
      replaces_optional_reflection boolean NOT NULL DEFAULT true,
      target_seconds smallint NOT NULL,
      PRIMARY KEY(protocol_version, day_number)
    );
    CREATE TABLE public.evidence_participation_eligibility(
      program_instance_id uuid PRIMARY KEY REFERENCES public.program_instances(id) ON DELETE CASCADE,
      status text NOT NULL CHECK (status IN ('adult_verified', 'minor_guardian_assent_verified', 'revoked')),
      verification_basis text NOT NULL CHECK (verification_basis IN ('adult_status_confirmed_outside_app', 'guardian_consent_and_athlete_assent_confirmed')),
      guardian_consent_version text,
      athlete_assent_version text,
      verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
      verified_at timestamptz,
      revoked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
      revoked_at timestamptz,
      CHECK (
        (status = 'adult_verified' AND verification_basis = 'adult_status_confirmed_outside_app' AND guardian_consent_version IS NULL AND athlete_assent_version IS NULL AND verified_at IS NOT NULL AND revoked_at IS NULL)
        OR (status = 'minor_guardian_assent_verified' AND verification_basis = 'guardian_consent_and_athlete_assent_confirmed' AND guardian_consent_version IS NOT NULL AND athlete_assent_version IS NOT NULL AND verified_at IS NOT NULL AND revoked_at IS NULL)
        OR (status = 'revoked' AND revoked_at IS NOT NULL)
      )
    );
    CREATE TABLE public.evidence_eligibility_audit(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      program_instance_id uuid NOT NULL REFERENCES public.program_instances(id) ON DELETE CASCADE,
      status text NOT NULL CHECK (status IN ('adult_verified', 'minor_guardian_assent_verified', 'revoked')),
      verification_basis text NOT NULL CHECK (verification_basis IN ('adult_status_confirmed_outside_app', 'guardian_consent_and_athlete_assent_confirmed')),
      guardian_consent_version text,
      athlete_assent_version text,
      actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE public.questionnaire_responses(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES auth.users(id),
      answers jsonb NOT NULL DEFAULT '{}'::jsonb,
      program_instance_id uuid REFERENCES public.program_instances(id),
      instrument_id text,
      is_complete boolean NOT NULL DEFAULT false,
      scores jsonb NOT NULL DEFAULT '{}'::jsonb,
      timing text NOT NULL DEFAULT 'pre',
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE public.daily_checkins(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES auth.users(id),
      program_instance_id uuid REFERENCES public.program_instances(id),
      date date NOT NULL DEFAULT CURRENT_DATE,
      mood_before integer,
      energy_level integer,
      focus_rating integer,
      wellbeing_metrics jsonb NOT NULL DEFAULT '{}'::jsonb
    );
    CREATE TABLE public.daily_journals(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES auth.users(id),
      program_instance_id uuid REFERENCES public.program_instances(id),
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE public.assessments(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES auth.users(id),
      program_instance_id uuid REFERENCES public.program_instances(id),
      assessment_type text NOT NULL DEFAULT 'csai2r',
      timing text NOT NULL DEFAULT 'pre',
      scores jsonb NOT NULL DEFAULT '{}'::jsonb,
      total_score numeric,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE public.deep_profile_assessments(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES auth.users(id),
      program_instance_id uuid REFERENCES public.program_instances(id),
      instrument_id text,
      timing text NOT NULL DEFAULT 'pre',
      scores jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE public.user_day_assignments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id));
    CREATE TABLE public.user_day_completion(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES auth.users(id),
      program_instance_id uuid REFERENCES public.program_instances(id),
      completion_status text NOT NULL DEFAULT 'completed',
      day_number integer NOT NULL DEFAULT 1,
      completed_at timestamptz
    );
    CREATE TABLE public.comprehension_check_instances(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES auth.users(id),
      program_instance_id uuid REFERENCES public.program_instances(id),
      status text NOT NULL DEFAULT 'completed',
      total_count integer,
      correct_count integer,
      completed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE public.program_progress_snapshots(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES auth.users(id),
      program_instance_id uuid REFERENCES public.program_instances(id),
      date date NOT NULL DEFAULT CURRENT_DATE,
      days_available integer NOT NULL DEFAULT 0,
      days_completed integer NOT NULL DEFAULT 0,
      completion_rate numeric(5,4) NOT NULL DEFAULT 0,
      comprehension_average numeric(5,4),
      checkins_completed_count integer NOT NULL DEFAULT 0,
      current_streak integer NOT NULL DEFAULT 0,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE public.athlete_transfer_observations(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES auth.users(id),
      program_instance_id uuid REFERENCES public.program_instances(id),
      program_run_id uuid,
      team_id uuid,
      protocol_version text,
      domain_id text NOT NULL DEFAULT 'attention_return',
      day_number integer NOT NULL DEFAULT 4,
      score numeric,
      not_observed boolean NOT NULL DEFAULT false,
      is_test boolean NOT NULL DEFAULT false,
      collected_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE public.coach_evidence_reviews(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      scope_type text NOT NULL,
      target_program_instance_id uuid REFERENCES public.program_instances(id) ON DELETE CASCADE,
      program_run_id uuid,
      is_test boolean NOT NULL DEFAULT false
    );
    CREATE TABLE public.coach_evidence_observations(
      review_id uuid REFERENCES public.coach_evidence_reviews(id) ON DELETE CASCADE
    );
    CREATE TABLE public.app_event_log(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE public.notification_log(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now());

    CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
    RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
      SELECT EXISTS(
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = _user_id AND ur.role = _role
      )
    $$;

    CREATE FUNCTION public.can_manage_team_program_runs(_team_id uuid)
    RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
      SELECT public.has_role(auth.uid(), 'admin'::public.app_role)
        OR EXISTS (
          SELECT 1 FROM public.teams t
          WHERE t.id = _team_id AND t.created_by = auth.uid()
        )
    $$;

    CREATE FUNCTION public.get_nlz_pilot_readiness(_team_id uuid DEFAULT NULL, _program_run_id uuid DEFAULT NULL)
    RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
      SELECT json_build_object('status', 'GREEN', 'status_label', 'Bereit')
    $$;

    CREATE FUNCTION cron.schedule(_name text, _schedule text, _command text)
    RETURNS bigint LANGUAGE sql AS $$ SELECT 1::bigint $$;

    CREATE FUNCTION public.get_performance_evidence_summary(
      _program_run_id uuid DEFAULT NULL,
      _include_test boolean DEFAULT false,
      _protocol_version text DEFAULT '56d-transfer-v1-2026-07'
    ) RETURNS json
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
      SELECT json_build_object(
        'protocol_version', _protocol_version,
        'privacy', json_build_object('minor_collection_enabled', false)
      )
    $$;

    -- Historical export builders are present in Production before the current
    -- hardening migration. The harness grants them deliberately so the new
    -- migration must prove that it closes the bypass.
    CREATE FUNCTION public.create_study_aggregate_snapshot(_cohort_id uuid, include_test boolean)
    RETURNS json LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog AS $$
      SELECT json_build_object('legacy', true)
    $$;
    CREATE FUNCTION public.create_nlz_evidence_snapshot(_team_id uuid, _include_test boolean)
    RETURNS json LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog AS $$
      SELECT json_build_object('legacy', true)
    $$;
    CREATE FUNCTION public.create_nlz_program_run_snapshot(_program_run_id uuid)
    RETURNS json LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog AS $$
      SELECT json_build_object('legacy', true)
    $$;
    GRANT EXECUTE ON FUNCTION public.create_study_aggregate_snapshot(uuid, boolean) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.create_nlz_evidence_snapshot(uuid, boolean) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.create_nlz_program_run_snapshot(uuid) TO authenticated;

    INSERT INTO public.evidence_protocols(
      version, status, program_days, required_consent_version,
      athlete_collection_enabled, coach_collection_enabled,
      minor_collection_enabled, required_guardian_consent_version,
      required_athlete_assent_version
    ) VALUES (
      '56d-transfer-v1-2026-07', 'pilot', 56, 'data_contribution_v2_2026_07',
      true, true, false, NULL, NULL
    );

    INSERT INTO public.evidence_transfer_schedule(
      protocol_version, day_number, domain_id, replaces_optional_reflection, target_seconds
    )
    SELECT
      '56d-transfer-v1-2026-07',
      day_number,
      CASE (day_number - 1) % 5
        WHEN 0 THEN 'attention_return'
        WHEN 1 THEN 'error_recovery'
        WHEN 2 THEN 'pressure_regulation'
        WHEN 3 THEN 'process_execution'
        ELSE 'action_under_uncertainty'
      END,
      true,
      20
    FROM unnest(ARRAY[4,7,11,14,18,21,25,28,32,35,39,42,46,49,53,56]) AS schedule(day_number);
  `);

  await db.exec(migration);
  await db.exec(indexMigration);
  await db.exec(upgradeMigration);
  await db.exec(soloEvidenceMigration);
  await db.exec(teamAggregateMigration);
  await db.exec(evidenceApiMigration);
  await db.exec(unifiedRunEvidenceMigration);

  const legacySnapshotPrivileges = await db.query(`
    SELECT
      has_function_privilege('anon', 'public.create_study_aggregate_snapshot(uuid,boolean)', 'EXECUTE') AS anon_study,
      has_function_privilege('authenticated', 'public.create_study_aggregate_snapshot(uuid,boolean)', 'EXECUTE') AS auth_study,
      has_function_privilege('anon', 'public.create_nlz_evidence_snapshot(uuid,boolean)', 'EXECUTE') AS anon_nlz,
      has_function_privilege('authenticated', 'public.create_nlz_evidence_snapshot(uuid,boolean)', 'EXECUTE') AS auth_nlz,
      has_function_privilege('anon', 'public.create_nlz_program_run_snapshot(uuid)', 'EXECUTE') AS anon_run,
      has_function_privilege('authenticated', 'public.create_nlz_program_run_snapshot(uuid)', 'EXECUTE') AS auth_run
  `);
  assert(
    Object.values(legacySnapshotPrivileges.rows[0]).every((allowed) => allowed === false),
    "Legacy snapshot builders must not remain executable by app roles",
  );

  const sqlTaxonomy = await db.query(`
    SELECT
      public.classify_sport_category('Boxen') AS boxing_category,
      public.classify_sport_format('Boxen') AS boxing_format,
      public.classify_sport_category('Volleyball') AS volleyball_category,
      public.classify_sport_format('Volleyball') AS volleyball_format,
      public.classify_sport_category('Unbekannte neue Sportart') AS unknown_category
  `);
  assert(sqlTaxonomy.rows[0].boxing_category === "combat_sport", "SQL taxonomy must classify boxing as combat sport");
  assert(sqlTaxonomy.rows[0].boxing_format === "individual", "SQL taxonomy must classify boxing as individual");
  assert(sqlTaxonomy.rows[0].volleyball_category === "net_or_target_sport", "SQL taxonomy must classify volleyball consistently");
  assert(sqlTaxonomy.rows[0].volleyball_format === "team", "SQL taxonomy must preserve team participation for volleyball");
  assert(sqlTaxonomy.rows[0].unknown_category === "unknown_or_other", "Unknown sports must fail closed");
  await db.exec("SET ROLE authenticated");
  await expectFailure(
    () => db.query("SELECT public.classify_sport_category('Boxen')"),
    "permission denied",
  );
  await db.exec("RESET ROLE");

  await db.query("INSERT INTO auth.users(id) VALUES ($1), ($2), ($3)", [ids.adult, ids.teen, ids.child]);
  await db.query(
    "INSERT INTO public.user_roles(user_id, role) VALUES ($1, 'athlete'), ($2, 'athlete'), ($3, 'athlete')",
    [ids.adult, ids.teen, ids.child],
  );
  await db.query("INSERT INTO public.profiles(id) VALUES ($1), ($2), ($3)", [ids.adult, ids.teen, ids.child]);
  await db.query(
    `INSERT INTO public.program_instances(id, user_id, status) VALUES
       ($4, $1, 'active'), ($5, $2, 'active'), ($6, $3, 'active')`,
    [ids.adult, ids.teen, ids.child, ids.adultInstance, ids.teenInstance, ids.childInstance],
  );

  const unknown = await action("status", ids.teen);
  assert(unknown.state === "unknown_age", "New athletes must start with an unknown age band");

  const adult = await action("set_age", ids.adult, { age_band: "adult" });
  assert(adult.state === "product_authorized", "Adults must receive product access without a guardian");
  const adultContribution = await action("set_data_contribution", ids.adult, { data_contribution_authorized: true });
  assert(adultContribution.data_contribution_status === "authorized", "Adult data contribution must be stored");
  assert(adultContribution.athlete_status === "not_required", "Changing adult data contribution must not rewrite product assent state");
  assert(await count("public.evidence_participation_eligibility", `program_instance_id = '${ids.adultInstance}'`) === 0, "Age self-declaration must not create adult evidence eligibility");

  const teenAge = await action("set_age", ids.teen, { age_band: "age_16_17" });
  assert(teenAge.state === "athlete_assent_required", "A 16/17-year-old must receive an own decision");
  const teenAssent = await action("assent", ids.teen, {
    product_authorized: true,
    data_contribution_authorized: true,
  });
  assert(teenAssent.state === "product_authorized", "Teen assent must unlock the product");
  const teenEligibility = await db.query(
    "SELECT status FROM public.evidence_participation_eligibility WHERE program_instance_id = $1",
    [ids.teenInstance],
  );
  assert(teenEligibility.rows[0].status === "minor_self_assent_verified", "16/17-year-old pilot assent must create the self-assent evidence gate");
  const teenReason = await db.query(
    "SELECT public.evidence_eligibility_reason($1, '56d-transfer-v2-2026-07') AS reason",
    [ids.teenInstance],
  );
  assert(teenReason.rows[0].reason === "eligible_minor", "16/17-year-old pilot consent must be evidence eligible");

  await db.query("UPDATE public.program_instances SET status = 'completed' WHERE id = $1", [ids.teenInstance]);
  const teenInactiveEligibility = await db.query(
    "SELECT status FROM public.evidence_participation_eligibility WHERE program_instance_id = $1",
    [ids.teenInstance],
  );
  assert(teenInactiveEligibility.rows[0].status === "revoked", "Completing a program must revoke stale minor evidence eligibility");
  const teenInactiveReason = await db.query(
    "SELECT public.evidence_eligibility_reason($1, '56d-transfer-v2-2026-07') AS reason",
    [ids.teenInstance],
  );
  assert(teenInactiveReason.rows[0].reason === "eligible_minor", "A completed run must remain aggregate-eligible while its current authorization remains valid");

  await db.query("UPDATE public.program_instances SET status = 'active' WHERE id = $1", [ids.teenInstance]);
  const teenReactivatedEligibility = await db.query(
    "SELECT status FROM public.evidence_participation_eligibility WHERE program_instance_id = $1",
    [ids.teenInstance],
  );
  assert(teenReactivatedEligibility.rows[0].status === "minor_self_assent_verified", "Reactivating an authorized minor program must restore current eligibility");

  const childAge = await action("set_age", ids.child, { age_band: "under_16" });
  assert(childAge.state === "guardian_contact_required", "Under-16 users must require a guardian contact");
  await expectFailure(
    () => action("set_age", ids.child, { age_band: "adult" }),
    "age_band_change_requires_support",
  );
  const childAfterBypassAttempt = await action("status", ids.child);
  assert(childAfterBypassAttempt.age_band === "under_16", "A recorded under-16 age band must not be self-upgradable");
  await action("start_challenge", ids.child, {
    token_hash: "a".repeat(64),
    guardian_email_ciphertext: "encrypted-email-payload-long-enough",
    guardian_email_iv: "encrypted-iv-value",
    guardian_email_hash: "b".repeat(64),
    guardian_email_mask: "e•••@b•••.de",
  });
  const pending = await action("status", ids.child);
  assert(pending.state === "guardian_pending", "Guardian invitation must produce a pending state");

  await db.query(
    "UPDATE minor_auth.guardian_challenges SET expires_at = now() - interval '1 minute' WHERE user_id = $1 AND status = 'pending'",
    [ids.child],
  );
  const expired = await action("status", ids.child);
  assert(expired.state === "guardian_expired", "Expired links must fail closed without waiting for the retention cron");

  const resendPayload = await action("prepare_resend", ids.child);
  assert(
    resendPayload.guardian_email_ciphertext === "encrypted-email-payload-long-enough"
      && resendPayload.guardian_email_iv === "encrypted-iv-value"
      && resendPayload.guardian_email_hash === "b".repeat(64),
    "Resend preparation must recover only the encrypted guardian contact payload",
  );

  await action("start_challenge", ids.child, {
    token_hash: "f".repeat(64),
    guardian_email_ciphertext: "encrypted-email-payload-long-enough",
    guardian_email_iv: "encrypted-iv-value",
    guardian_email_hash: "b".repeat(64),
    guardian_email_mask: "e•••@b•••.de",
  });

  await db.query("INSERT INTO auth.users(id) VALUES ($1), ($2)", [ids.declinedChild, ids.stalePolicyChild]);
  await db.query(
    "INSERT INTO public.user_roles(user_id, role) VALUES ($1, 'athlete'), ($2, 'athlete')",
    [ids.declinedChild, ids.stalePolicyChild],
  );
  await db.query(
    "INSERT INTO public.profiles(id) VALUES ($1), ($2)",
    [ids.declinedChild, ids.stalePolicyChild],
  );

  await action("set_age", ids.declinedChild, { age_band: "under_16" });
  await action("start_challenge", ids.declinedChild, {
    token_hash: "1".repeat(64),
    guardian_email_ciphertext: "decline-encrypted-email-payload",
    guardian_email_iv: "decline-iv-value",
    guardian_email_hash: "2".repeat(64),
    guardian_email_mask: "d•••@e•••.de",
  });
  const declinedDecision = await action("guardian_decide", null, {
    token_hash: "1".repeat(64),
    product_authorized: false,
    data_contribution_authorized: true,
    guardian_declaration: true,
  });
  assert(declinedDecision.state === "declined", "Guardian product rejection must be stored");
  const declinedStatus = await action("status", ids.declinedChild);
  assert(declinedStatus.state === "declined", "Guardian rejection must keep product access closed");
  assert(
    declinedStatus.data_contribution_status === "declined",
    "Guardian rejection must also disable optional data contribution",
  );
  assert(
    await count("minor_auth.guardian_access_tokens", `user_id = '${ids.declinedChild}'`) === 0,
    "A declined guardian decision must not create a management token",
  );

  await action("set_age", ids.stalePolicyChild, { age_band: "under_16" });
  await action("start_challenge", ids.stalePolicyChild, {
    token_hash: "3".repeat(64),
    guardian_email_ciphertext: "stale-encrypted-email-payload",
    guardian_email_iv: "stale-iv-value",
    guardian_email_hash: "4".repeat(64),
    guardian_email_mask: "s•••@e•••.de",
  });
  const activePolicy = await db.query(
    "SELECT id FROM minor_auth.policy_versions WHERE jurisdiction = 'DE' AND status = 'active'",
  );
  const activePolicyId = activePolicy.rows[0].id;
  await db.query(
    "UPDATE minor_auth.policy_versions SET status = 'retired', retired_at = now() WHERE id = $1",
    [activePolicyId],
  );
  await db.query(
    `INSERT INTO minor_auth.policy_versions(
       policy_key, jurisdiction, product_version, guardian_notice_version,
       guardian_decision_version, athlete_assent_version, data_contribution_version,
       content_hash, effective_from, status
     ) VALUES (
       'de_minor_product_test_replacement', 'DE', 'minor_product_test',
       'guardian_notice_test', 'guardian_decision_test', 'athlete_assent_test',
       'data_contribution_test', $1, now(), 'active'
     )`,
    ["5".repeat(64)],
  );
  await expectFailure(
    () => action("guardian_decide", null, {
      token_hash: "3".repeat(64),
      product_authorized: true,
      data_contribution_authorized: true,
      guardian_declaration: true,
      management_token_hash: "6".repeat(64),
    }),
    "guardian_policy_replaced",
  );
  const staleLookup = await action("challenge_lookup", null, { token_hash: "3".repeat(64) });
  assert(staleLookup.state === "invalid", "A challenge for a replaced policy must fail closed");
  const staleStatus = await action("status", ids.stalePolicyChild);
  assert(
    staleStatus.state === "policy_refresh_required",
    "A participant bound to a replaced policy must require a fresh decision",
  );
  await db.exec(
    "UPDATE minor_auth.policy_versions SET status = 'retired', retired_at = now() WHERE policy_key = 'de_minor_product_test_replacement'",
  );
  await db.query(
    "UPDATE minor_auth.policy_versions SET status = 'active', retired_at = NULL WHERE id = $1",
    [activePolicyId],
  );
  await db.query(
    "DELETE FROM auth.users WHERE id IN ($1, $2)",
    [ids.declinedChild, ids.stalePolicyChild],
  );

  const guardianDecision = await action("guardian_decide", null, {
    token_hash: "f".repeat(64),
    product_authorized: true,
    data_contribution_authorized: true,
    guardian_declaration: true,
    management_token_hash: "c".repeat(64),
  });
  assert(guardianDecision.state === "approved", "Guardian approval was not stored");
  const childAssent = await action("assent", ids.child, {
    product_authorized: true,
    data_contribution_authorized: true,
  });
  assert(childAssent.state === "product_authorized", "Guardian approval plus athlete assent must unlock the product");
  const childEligibility = await db.query(
    "SELECT status, guardian_consent_version, athlete_assent_version FROM public.evidence_participation_eligibility WHERE program_instance_id = $1",
    [ids.childInstance],
  );
  assert(childEligibility.rows[0].status === "minor_guardian_assent_verified", "Under-16 dual consent must create the guardian-and-assent evidence gate");
  assert(childEligibility.rows[0].guardian_consent_version === "guardian_decision_v2_2026_07", "Guardian receipt version was not bound to evidence eligibility");
  assert(childEligibility.rows[0].athlete_assent_version === "athlete_assent_v2_2026_07", "Athlete assent version was not bound to evidence eligibility");
  const childReason = await db.query(
    "SELECT public.evidence_eligibility_reason($1, '56d-transfer-v2-2026-07') AS reason",
    [ids.childInstance],
  );
  assert(childReason.rows[0].reason === "eligible_minor", "Under-16 dual consent must be evidence eligible");

  await db.query(
    "INSERT INTO public.athlete_transfer_observations(user_id, program_instance_id, protocol_version) VALUES ($1, $2, '56d-transfer-v2-2026-07')",
    [ids.child, ids.childInstance],
  );

  const filtered = await action("filter_data_contribution", null, { user_ids: [ids.adult, ids.teen, ids.child] });
  assert(filtered.user_ids.length === 3, "Authorized contributors were not returned by the aggregate filter");
  const guardianContributionWithdrawal = await action("guardian_withdraw_data_contribution", null, { token_hash: "c".repeat(64) });
  assert(guardianContributionWithdrawal.data_contribution_guardian === false, "Optional guardian withdrawal was not stored");
  const childAfterContributionWithdrawal = await action("status", ids.child);
  assert(childAfterContributionWithdrawal.product_status === "authorized", "Optional guardian withdrawal must preserve product access");
  assert(childAfterContributionWithdrawal.data_contribution_status === "declined", "Optional guardian withdrawal must disable contribution");
  assert(await count("public.athlete_transfer_observations", `user_id = '${ids.child}'`) === 0, "Guardian pilot withdrawal must remove personal transfer observations");
  const childRevokedEligibility = await db.query(
    "SELECT status FROM public.evidence_participation_eligibility WHERE program_instance_id = $1",
    [ids.childInstance],
  );
  assert(childRevokedEligibility.rows[0].status === "revoked", "Guardian pilot withdrawal must revoke evidence eligibility");
  await action("set_data_contribution", ids.teen, { data_contribution_authorized: false });
  const filteredAfterWithdrawal = await action("filter_data_contribution", null, { user_ids: [ids.adult, ids.teen, ids.child] });
  assert(!filteredAfterWithdrawal.user_ids.includes(ids.teen), "Withdrawn data contribution must be excluded immediately");
  assert(!filteredAfterWithdrawal.user_ids.includes(ids.child), "Guardian-withdrawn data contribution must be excluded immediately");

  await db.query("INSERT INTO auth.users(id) VALUES ($1)", [ids.admin]);
  await db.query("INSERT INTO public.user_roles(user_id, role) VALUES ($1, 'admin')", [ids.admin]);
  await db.query("INSERT INTO public.profiles(id, full_name) VALUES ($1, 'Evidence Admin')", [ids.admin]);

  for (const [index, athlete] of soloAthletes.entries()) {
    await db.query("INSERT INTO auth.users(id) VALUES ($1)", [athlete.user]);
    await db.query("INSERT INTO public.user_roles(user_id, role) VALUES ($1, 'athlete')", [athlete.user]);
    await db.query(
      `INSERT INTO public.profiles(
        id, sport, position, sport_category, sport_format, sport_level,
        sport_taxonomy_version, data_contribution_consent,
        data_contribution_consent_version, data_contribution_consented_at
      ) VALUES (
        $1, 'Boxen', 'Weltergewicht', 'combat_sport', 'individual',
        'competitive_amateur', 'sport-taxonomy-v1-2026-07', true,
        'data_contribution_v3_2026_07', now()
      )`,
      [athlete.user],
    );
    await action("set_age", athlete.user, { age_band: "adult" });
    await action("set_data_contribution", athlete.user, { data_contribution_authorized: true });
    await db.query(
      "INSERT INTO public.program_instances(id, user_id, status, started_at) VALUES ($1, $2, 'active', CURRENT_DATE - 13)",
      [athlete.instance, athlete.user],
    );
    await db.query(
      `INSERT INTO public.evidence_participation_eligibility(
        program_instance_id, status, verification_basis, verified_by, verified_at
      ) VALUES ($1, 'adult_verified', 'adult_status_confirmed_outside_app', $2, now())`,
      [athlete.instance, ids.admin],
    );
    await db.query(
      `INSERT INTO public.athlete_transfer_observations(
        user_id, program_instance_id, protocol_version, domain_id,
        day_number, score, not_observed, is_test
      ) VALUES ($1, $2, '56d-transfer-v2-2026-07', 'attention_return', 4, $3, false, false)`,
      [athlete.user, athlete.instance, athlete.score],
    );
    await db.query(
      `INSERT INTO public.program_progress_snapshots(
        user_id, program_instance_id, days_available, days_completed,
        completion_rate, comprehension_average, checkins_completed_count
      ) VALUES ($1, $2, 14, 10, 0.7143, 0.8, 10)`,
      [athlete.user, athlete.instance],
    );
    await db.query(
      `INSERT INTO public.daily_checkins(
        user_id, program_instance_id, date, mood_before, energy_level,
        focus_rating, wellbeing_metrics
      ) VALUES (
        $1, $2, CURRENT_DATE, $3::integer, 7, 8,
        jsonb_build_object(
          'mood', $3::integer, 'energy', 7, 'focus', 8, 'stress', 3,
          'recovery', 7, 'sleep_quality', 7, 'physical_readiness', 8,
          'motivation', 8, 'pressure', 4, 'team_connection', 8
        )
      )`,
      [athlete.user, athlete.instance, athlete.score],
    );
    const postDelta = [0.2, 0.4, 0.2, 0.5, 0.3][index];
    await db.query(
      `INSERT INTO public.assessments(
        user_id, program_instance_id, assessment_type, timing, scores, created_at
      ) VALUES
        ($1, $2, 'smtq', 'pre', jsonb_build_object('confidence', $3::numeric, 'constancy', $3::numeric, 'control', $3::numeric), now() - interval '1 hour'),
        ($1, $2, 'smtq', 'pre', jsonb_build_object('confidence', 99, 'constancy', 99, 'control', 99), now() - interval '30 minutes'),
        ($1, $2, 'smtq', 'post', jsonb_build_object('confidence', $4::numeric, 'constancy', $4::numeric, 'control', $4::numeric), now())`,
      [athlete.user, athlete.instance, athlete.assessmentScore, athlete.assessmentScore + postDelta],
    );
    await db.query(
      `INSERT INTO public.questionnaire_responses(
        user_id, program_instance_id, instrument_id, is_complete, scores, timing, created_at
      ) VALUES
        ($1, $2, 'rewire_development_index', true, jsonb_build_object('overall0to100', $3::numeric), 'pre', now() - interval '1 hour'),
        ($1, $2, 'rewire_development_index', true, jsonb_build_object('overall0to100', $4::numeric), 'post', now())`,
      [athlete.user, athlete.instance, 50 + index, 55 + index],
    );
    await db.query(
      `INSERT INTO public.user_day_completion(
        user_id, program_instance_id, completion_status, day_number, completed_at
      ) VALUES ($1, $2, 'completed', 1, now())`,
      [athlete.user, athlete.instance],
    );
    await db.query(
      `INSERT INTO public.comprehension_check_instances(
        user_id, program_instance_id, status, total_count, correct_count, completed_at
      ) VALUES ($1, $2, 'completed', 5, $3, now())`,
      [athlete.user, athlete.instance, 3 + (index % 3)],
    );
    await db.query(
      "INSERT INTO public.daily_journals(user_id, program_instance_id) VALUES ($1, $2)",
      [athlete.user, athlete.instance],
    );
  }

  await db.query("INSERT INTO auth.users(id) VALUES ($1)", [qaSolo.user]);
  await db.query("INSERT INTO public.user_roles(user_id, role) VALUES ($1, 'athlete')", [qaSolo.user]);
  await db.query(
    `INSERT INTO public.profiles(
      id, sport, sport_category, sport_format, sport_level,
      sport_taxonomy_version, is_test_user
    ) VALUES (
      $1, 'Boxen', 'combat_sport', 'individual', 'competitive_amateur',
      'sport-taxonomy-v1-2026-07', true
    )`,
    [qaSolo.user],
  );
  await action("set_age", qaSolo.user, { age_band: "adult" });
  await action("set_data_contribution", qaSolo.user, { data_contribution_authorized: true });
  await db.query(
    `INSERT INTO public.program_instances(
      id, user_id, status, started_at, is_test_instance
    ) VALUES ($1, $2, 'active', CURRENT_DATE - 13, true)`,
    [qaSolo.instance, qaSolo.user],
  );
  await db.query(
    `INSERT INTO public.athlete_transfer_observations(
      user_id, program_instance_id, protocol_version, domain_id,
      day_number, score, not_observed, is_test
    ) VALUES (
      $1, $2, '56d-transfer-v2-2026-07', 'attention_return', 4, 4, false, true
    )`,
    [qaSolo.user, qaSolo.instance],
  );
  await db.query(
    `INSERT INTO public.daily_checkins(
      user_id, program_instance_id, date, mood_before, energy_level,
      focus_rating, wellbeing_metrics
    ) VALUES ($1, $2, CURRENT_DATE, 10, 10, 10, jsonb_build_object('stress', 1))`,
    [qaSolo.user, qaSolo.instance],
  );

  const firstSolo = soloAthletes[0];
  await db.query(
    `INSERT INTO public.user_day_completion(
      user_id, program_instance_id, completion_status, day_number, completed_at
    ) VALUES
      ($1, $2, 'completed', 1, now()),
      ($1, $2, 'completed', 56, now())`,
    [firstSolo.user, firstSolo.instance],
  );
  await db.query(
    `INSERT INTO public.daily_checkins(
      user_id, program_instance_id, date, mood_before, energy_level,
      focus_rating, wellbeing_metrics
    ) VALUES (
      $1, $2, CURRENT_DATE, $3::integer, 7, 8,
      jsonb_build_object('stress', 3)
    )`,
    [firstSolo.user, firstSolo.instance, firstSolo.score],
  );
  await db.query(
    `INSERT INTO public.comprehension_check_instances(
      user_id, program_instance_id, status, total_count, correct_count, completed_at
    ) VALUES ($1, $2, 'completed', 5, 99, now())`,
    [firstSolo.user, firstSolo.instance],
  );
  await db.query(
    `INSERT INTO public.program_progress_snapshots(
      user_id, program_instance_id, days_available, days_completed,
      completion_rate, comprehension_average, checkins_completed_count,
      updated_at
    ) VALUES ($1, $2, 14, 99, 9, 4, 99, now() + interval '1 minute')`,
    [firstSolo.user, firstSolo.instance],
  );
  await db.query(
    `INSERT INTO public.questionnaire_responses(
      user_id, program_instance_id, instrument_id, is_complete, scores, timing, created_at
    ) VALUES (
      $1, $2, 'rewire_development_index', true,
      jsonb_build_object('overall0to100', 999), 'pre', now() - interval '15 minutes'
    )`,
    [firstSolo.user, firstSolo.instance],
  );

  await db.query(
    "UPDATE public.athlete_transfer_observations SET is_test = true WHERE user_id = $1",
    [soloAthletes[4].user],
  );

  await db.exec("SET ROLE authenticated");
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [ids.admin]);
  const qaOnlyTransfer = await db.query(
    "SELECT public.get_solo_sport_evidence_summary('combat_sport', 'competitive_amateur', true, '56d-transfer-v2-2026-07') AS summary",
  );
  assert(qaOnlyTransfer.rows[0].summary.sample.scope_participants_total === 1, "QA Solo transfer evidence must exclude Production participants");
  assert(qaOnlyTransfer.rows[0].summary.sample.total_observations === 1, "QA Solo transfer evidence must contain only QA observations");
  assert(qaOnlyTransfer.rows[0].summary.sample.data_mode === "qa_only", "QA Solo transfer evidence must declare its data mode");
  assert(qaOnlyTransfer.rows[0].summary.domain_aggregates[0].n === 1, "QA Solo transfer n must not be inflated by Production athletes");
  const qaOnlyDevelopment = await db.query(
    "SELECT public.get_solo_development_evidence_summary('combat_sport', 'competitive_amateur', true, '56d-transfer-v2-2026-07') AS summary",
  );
  assert(qaOnlyDevelopment.rows[0].summary.sample.scope_participants_total === 1, "QA Solo development evidence must exclude Production participants");
  assert(qaOnlyDevelopment.rows[0].summary.sample.eligible_participants === 1, "A fully test-marked Solo participant must be QA eligible");
  assert(qaOnlyDevelopment.rows[0].summary.sample.data_mode === "qa_only", "QA Solo development evidence must declare its data mode");
  const belowThreshold = await db.query(
    "SELECT public.get_solo_sport_evidence_summary('combat_sport', 'competitive_amateur', false, '56d-transfer-v2-2026-07') AS summary",
  );
  const suppressedDomain = belowThreshold.rows[0].summary.domain_aggregates[0];
  assert(suppressedDomain.n === 4, "The test setup must produce four production contributors");
  assert(suppressedDomain.average_score === null, "Values below n=5 must be suppressed");
  assert(suppressedDomain.sufficient_data === false, "Below-threshold aggregates must be marked insufficient");
  await db.exec("RESET ROLE");

  await db.query(
    "UPDATE public.athlete_transfer_observations SET is_test = false WHERE user_id = $1",
    [soloAthletes[4].user],
  );
  await db.exec("SET ROLE authenticated");
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [ids.admin]);
  const sufficient = await db.query(
    "SELECT public.get_solo_sport_evidence_summary('combat_sport', 'competitive_amateur', false, '56d-transfer-v2-2026-07') AS summary",
  );
  const sufficientDomain = sufficient.rows[0].summary.domain_aggregates[0];
  assert(sufficientDomain.n === 5, "Five distinct contributors must be counted");
  assert(Number(sufficientDomain.average_score) === 8, "The aggregate must use the five authorized scores");
  assert(sufficientDomain.low_confidence === true, "n=5 must remain explicitly low-confidence");
  assert(sufficient.rows[0].summary.data_quality.identifiers_present === false, "Solo evidence must declare identifier exclusion");

  const soloDevelopment = await db.query(
    "SELECT public.get_solo_development_evidence_summary('combat_sport', 'competitive_amateur', false, '56d-transfer-v2-2026-07') AS summary",
  );
  const soloDevelopmentResult = soloDevelopment.rows[0].summary;
  const soloPrePost = soloDevelopmentResult.outcomes.validated_pre_post.find(
    (row) => row.assessment_type === "smtq" && row.subscale === "confidence",
  );
  assert(soloDevelopmentResult.sample.eligible_participants === 5, "Solo development evidence must count five authorized athletes");
  assert(soloDevelopmentResult.cohort_breakdown.completed_pre_post === 5, "Solo cohorts must use actual participant measurement paths");
  assert(soloPrePost.n_pairs === 5, "Repeated Solo Pre submissions must not inflate paired n");
  assert(Number(soloPrePost.avg_pre) === 2.4, "Solo evidence must use the latest valid Pre submission per athlete");
  assert(Number(soloPrePost.abs_change) === 0.32, "Solo observed change must use five deduplicated pairs");
  assert(soloDevelopmentResult.outcomes.development_overall.n === 5, "Solo Development Index must preserve five pairs");
  assert(Number(soloDevelopmentResult.outcomes.development_overall.observed_change) === 5, "Solo Development Index must use paired values");
  assert(soloDevelopmentResult.weekly_state[0].mood_n === 5, "Solo weekly state must report metric-specific n");
  assert(Number(soloDevelopmentResult.weekly_state[0].mood) === 8, "Solo weekly state must aggregate per athlete");
  assert(soloDevelopmentResult.usage.avg_completion_rate !== null, "Five Solo snapshots must allow an aggregate completion rate");
  assert(soloDevelopmentResult.usage.total_completed_days === 5, "Duplicate and future Solo completions must not inflate usage");
  assert(soloDevelopmentResult.usage.total_checkins === 5, "Duplicate Solo check-ins must collapse to one athlete-day");
  assert(soloDevelopmentResult.outcomes.comprehension.total_completed === 5, "Invalid comprehension rows must be excluded");
  for (const athlete of soloAthletes) {
    assert(!JSON.stringify(soloDevelopmentResult).includes(athlete.user), "Solo development evidence must not return athlete identifiers");
  }

  const createdLock = await db.query(
    "SELECT public.create_evidence_data_lock(NULL, 'combat_sport', 'competitive_amateur', false, '56d-transfer-v2-2026-07') AS result",
  );
  const lockId = createdLock.rows[0].result.lock_id;
  assert(createdLock.rows[0].result.content_checksum.length === 64, "Evidence locks must use a SHA-256 checksum");
  assert(createdLock.rows[0].result.evidence.schema_version === "solo-sport-evidence-lock-v2-2026-07", "Solo locks must freeze the unified evidence schema");
  assert(createdLock.rows[0].result.evidence.measurement.validated_assessments.pre_n === 5, "Solo locks must freeze measurement readiness");
  assert(createdLock.rows[0].result.evidence.transfer_evidence.domain_aggregates[0].n === 5, "Solo locks must freeze transfer evidence");
  assert(createdLock.rows[0].result.analysis_manifest.included_sections.includes("outcomes"), "Solo manifests must declare outcome coverage");
  assert(createdLock.rows[0].result.analysis_manifest.included_sections.includes("transfer_evidence"), "Solo manifests must declare transfer coverage");
  const readLock = await db.query("SELECT public.get_evidence_data_lock($1) AS result", [lockId]);
  assert(readLock.rows[0].result.status === "active", "A new evidence lock must be active");
  assert(readLock.rows[0].result.evidence.data_quality.individual_values_present === false, "A lock must contain aggregate evidence only");

  await expectFailure(
    () => db.query("SELECT * FROM public.evidence_data_locks"),
    "permission denied",
  );
  await db.query("SELECT public.invalidate_evidence_data_lock($1, 'Consent scope changed')", [lockId]);
  const invalidatedLock = await db.query("SELECT public.get_evidence_data_lock($1) AS result", [lockId]);
  assert(invalidatedLock.rows[0].result.status === "invalidated", "Invalidated locks must remain auditable");
  await expectFailure(
    () => db.query("SELECT public.invalidate_evidence_data_lock($1, 'Second invalidation')", [lockId]),
    "active_evidence_data_lock_not_found",
  );
  await db.exec("RESET ROLE");

  await db.exec("SET ROLE authenticated");
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [ids.teen]);
  await expectFailure(
    () => db.query("SELECT public.get_solo_sport_evidence_summary(NULL, NULL, false, '56d-transfer-v2-2026-07')"),
    "admin_role_required",
  );
  await expectFailure(
    () => db.query("SELECT public.get_performance_evidence_summary(NULL, false, '56d-transfer-v2-2026-07')"),
    "admin_role_required",
  );
  await db.exec("RESET ROLE");

  await db.query(
    `UPDATE public.evidence_participation_eligibility
     SET status = 'revoked', revoked_by = $2, revoked_at = now()
     WHERE program_instance_id = $1`,
    [soloAthletes[4].instance, ids.admin],
  );
  await db.exec("SET ROLE authenticated");
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [ids.admin]);
  const suppressedSoloDevelopment = await db.query(
    "SELECT public.get_solo_development_evidence_summary('combat_sport', 'competitive_amateur', false, '56d-transfer-v2-2026-07') AS summary",
  );
  const suppressedSoloPrePost = suppressedSoloDevelopment.rows[0].summary.outcomes.validated_pre_post.find(
    (row) => row.assessment_type === "smtq" && row.subscale === "confidence",
  );
  assert(suppressedSoloDevelopment.rows[0].summary.sample.eligible_participants === 4, "Revoked Solo authorization must leave the sample immediately");
  assert(suppressedSoloDevelopment.rows[0].summary.sample.exclusion_reasons.not_currently_authorized === 1, "Solo evidence may expose only a generic exclusion count");
  assert(suppressedSoloDevelopment.rows[0].summary.usage.avg_completion_rate === null, "Solo usage averages below n=5 must be suppressed");
  assert(suppressedSoloPrePost.n_pairs === 4 && suppressedSoloPrePost.avg_pre === null, "Solo paired changes below n=5 must contain no values");
  await db.exec("RESET ROLE");
  await db.query(
    `UPDATE public.evidence_participation_eligibility
     SET status = 'adult_verified', verified_by = $2, verified_at = now(), revoked_by = NULL, revoked_at = NULL
     WHERE program_instance_id = $1`,
    [soloAthletes[4].instance, ids.admin],
  );

  await expectFailure(
    () => db.query(
      "UPDATE public.evidence_data_locks SET evidence_payload = '{}'::jsonb WHERE id = $1",
      [lockId],
    ),
    "evidence_data_lock_payload_immutable",
  );
  await expectFailure(
    () => db.query("DELETE FROM public.evidence_data_locks WHERE id = $1", [lockId]),
    "evidence_data_lock_delete_forbidden",
  );

  await db.exec("SET ROLE authenticated");
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [ids.admin]);
  const activeLock = await db.query(
    "SELECT public.create_evidence_data_lock(NULL, 'combat_sport', 'competitive_amateur', false, '56d-transfer-v2-2026-07') AS result",
  );
  const activeLockId = activeLock.rows[0].result.lock_id;
  await expectFailure(
    () => db.query(
      "SELECT public.read_evidence_data_lock_for_export($1::uuid, $2, $3::uuid, NULL, NULL, NULL, NULL)",
      ["40000000-0000-4000-8000-000000000301", "mahleos-v1", activeLockId],
    ),
    "permission denied",
  );
  await db.exec("RESET ROLE");

  await db.exec("SET ROLE service_role");
  const machineRead = await db.query(
    "SELECT public.read_evidence_data_lock_for_export($1::uuid, $2, $3::uuid, NULL, NULL, NULL, NULL) AS result",
    ["40000000-0000-4000-8000-000000000301", "mahleos-v1", activeLockId],
  );
  assert(machineRead.rows[0].result.ok === true, "The machine contract must serve an active Data Lock");
  assert(machineRead.rows[0].result.lock_id === activeLockId, "An exact machine read must return the requested lock");
  assert(
    machineRead.rows[0].result.content_checksum === machineRead.rows[0].result.analysis_manifest.content_checksum,
    "Machine evidence and its analysis manifest must expose the same checksum",
  );
  assert(
    machineRead.rows[0].result.evidence.data_quality.individual_values_present === false,
    "The machine contract must serve aggregate evidence only",
  );

  const reusedRequest = await db.query(
    "SELECT public.read_evidence_data_lock_for_export($1::uuid, $2, $3::uuid, NULL, NULL, NULL, NULL) AS result",
    ["40000000-0000-4000-8000-000000000301", "mahleos-v1", activeLockId],
  );
  assert(reusedRequest.rows[0].result.error === "invalid_request", "A machine request ID must not be reusable");

  const latestMachineRead = await db.query(
    "SELECT public.read_evidence_data_lock_for_export($1::uuid, $2, NULL, 'solo_aggregate', NULL, 'combat_sport', 'competitive_amateur') AS result",
    ["40000000-0000-4000-8000-000000000302", "mahleos-v1"],
  );
  assert(latestMachineRead.rows[0].result.lock_id === activeLockId, "A scoped read must return the latest active matching lock");

  const invalidatedMachineRead = await db.query(
    "SELECT public.read_evidence_data_lock_for_export($1::uuid, $2, $3::uuid, NULL, NULL, NULL, NULL) AS result",
    ["40000000-0000-4000-8000-000000000303", "mahleos-v1", lockId],
  );
  assert(invalidatedMachineRead.rows[0].result.error === "not_found", "Invalidated locks must never be served");
  await expectFailure(
    () => db.query("SELECT * FROM public.evidence_api_access_log"),
    "permission denied",
  );
  await db.exec("RESET ROLE");

  const corruptLockId = "50000000-0000-4000-8000-000000000301";
  await db.query(
    `INSERT INTO public.evidence_data_locks(
      id, scope_type, sport_category, protocol_version, snapshot_schema_version,
      source_cutoff, locked_by, content_checksum, evidence_payload, analysis_manifest
    ) VALUES (
      $1::uuid, 'solo_aggregate', 'combat_sport', '56d-transfer-v2-2026-07',
      'solo-sport-evidence-v1-2026-07', now(), $2::uuid, $3::text,
      '{"data_quality":{"individual_values_present":false}}'::jsonb,
      jsonb_build_object('content_checksum', $3::text)
    )`,
    [corruptLockId, ids.admin, "0".repeat(64)],
  );
  await db.exec("SET ROLE service_role");
  const corruptMachineRead = await db.query(
    "SELECT public.read_evidence_data_lock_for_export($1::uuid, $2, $3::uuid, NULL, NULL, NULL, NULL) AS result",
    ["40000000-0000-4000-8000-000000000304", "mahleos-v1", corruptLockId],
  );
  assert(corruptMachineRead.rows[0].result.error === "checksum_mismatch", "A checksum mismatch must fail closed");
  await db.exec("RESET ROLE");

  await db.exec(`
    INSERT INTO public.evidence_api_access_log(request_id, client_id, outcome)
    SELECT gen_random_uuid(), 'rate-client', 'invalid_request'
    FROM generate_series(1, 30)
  `);
  await db.exec("SET ROLE service_role");
  const rateLimitedRead = await db.query(
    "SELECT public.read_evidence_data_lock_for_export($1::uuid, $2, $3::uuid, NULL, NULL, NULL, NULL) AS result",
    ["40000000-0000-4000-8000-000000000305", "rate-client", activeLockId],
  );
  assert(rateLimitedRead.rows[0].result.error === "rate_limited", "The machine contract must enforce its per-client limit");
  await db.exec("RESET ROLE");

  const accessOutcomes = await db.query(
    "SELECT outcome, COUNT(*)::integer AS count FROM public.evidence_api_access_log WHERE client_id = 'mahleos-v1' GROUP BY outcome",
  );
  const outcomeCounts = Object.fromEntries(accessOutcomes.rows.map((row) => [row.outcome, row.count]));
  assert(outcomeCounts.served === 2, "Both successful machine reads must be audited");
  assert(outcomeCounts.not_found === 1, "Invalidated-lock reads must be audited");
  assert(outcomeCounts.checksum_mismatch === 1, "Checksum failures must be audited");
  await expectFailure(
    () => db.query(
      "UPDATE public.evidence_api_access_log SET outcome = 'served' WHERE request_id = $1",
      ["40000000-0000-4000-8000-000000000303"],
    ),
    "evidence_api_access_log_append_only",
  );
  await expectFailure(
    () => db.query(
      "DELETE FROM public.evidence_api_access_log WHERE request_id = $1",
      ["40000000-0000-4000-8000-000000000303"],
    ),
    "evidence_api_access_log_append_only",
  );

  await db.query(
    "INSERT INTO public.teams(id, name, created_by) VALUES ($1, 'Aggregate Team', $2)",
    [teamPulse.team, ids.admin],
  );
  await db.query(
    "INSERT INTO public.program_runs(id, team_id, name, status, started_at) VALUES ($1, $2, 'Pilot Run', 'active', CURRENT_DATE - 13)",
    [teamPulse.run, teamPulse.team],
  );
  for (const athlete of soloAthletes) {
    await db.query(
      "INSERT INTO public.team_members(team_id, user_id) VALUES ($1, $2)",
      [teamPulse.team, athlete.user],
    );
    await db.query(
      "UPDATE public.program_instances SET team_id = $1, program_run_id = $2 WHERE id = $3",
      [teamPulse.team, teamPulse.run, athlete.instance],
    );
  }

  await db.exec("SET ROLE authenticated");
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [ids.admin]);
  const teamAggregate = await db.query(
    "SELECT public.get_team_mental_state_aggregate($1, '56d-transfer-v2-2026-07') AS result",
    [teamPulse.team],
  );
  const teamResult = teamAggregate.rows[0].result;
  assert(teamResult.insufficient_data === false, "Five authorized athletes must produce a team aggregate");
  assert(teamResult.teamSize === 5 && teamResult.wellbeing.today.n_users === 5, "Team aggregate n must count distinct eligible athletes");
  assert(Number(teamResult.wellbeing.today.mood) === 8, "Team mood must be the aggregate of five direct values");
  assert(teamResult.participation.rate === 100, "Operational participation must include all five active athletes");
  assert(teamResult.privacy.identifiers_returned === false, "Team aggregate must declare identifier exclusion");
  for (const athlete of soloAthletes) {
    assert(!JSON.stringify(teamResult).includes(athlete.user), "Team aggregate must not return athlete identifiers");
  }

  await db.exec("RESET ROLE");
  const qaDate = (await db.query("SELECT (CURRENT_DATE + 30)::text AS value")).rows[0].value;
  await db.query("UPDATE public.teams SET is_test_team = true WHERE id = $1", [teamPulse.team]);
  await db.query(
    "UPDATE public.profiles SET is_test_user = true WHERE id IN (SELECT user_id FROM public.program_instances WHERE program_run_id = $1)",
    [teamPulse.run],
  );
  await db.query(
    "UPDATE public.program_instances SET is_test_instance = true WHERE program_run_id = $1",
    [teamPulse.run],
  );
  await db.query(
    "INSERT INTO public.qa_time_overrides(scope, team_id, simulated_date) VALUES ('team', $1, CURRENT_DATE + 30)",
    [teamPulse.team],
  );
  await db.query(
    "UPDATE public.daily_checkins SET date = CURRENT_DATE + 30 WHERE program_instance_id IN (SELECT id FROM public.program_instances WHERE program_run_id = $1)",
    [teamPulse.run],
  );
  await db.exec("SET ROLE authenticated");
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [ids.admin]);
  await expectFailure(
    () => db.query(
      "SELECT public.create_evidence_data_lock($1, NULL, NULL, false, '56d-transfer-v2-2026-07')",
      [teamPulse.run],
    ),
    "evidence_data_mode_mismatch",
  );
  const qaTeamAggregate = await db.query(
    "SELECT public.get_team_mental_state_aggregate($1, '56d-transfer-v2-2026-07') AS result",
    [teamPulse.team],
  );
  assert(qaTeamAggregate.rows[0].result.wellbeing.today.date === qaDate, "QA team pulse must use the simulated team date");
  assert(qaTeamAggregate.rows[0].result.wellbeing.today.n_users === 5, "QA time travel must preserve the real aggregate path");
  const qaRunEvidence = await db.query(
    "SELECT public.get_program_run_development_evidence($1, '56d-transfer-v2-2026-07') AS result",
    [teamPulse.run],
  );
  assert(qaRunEvidence.rows[0].result.meta.effective_date === qaDate, "QA run evidence must use the simulated team date");
  assert(qaRunEvidence.rows[0].result.team_pulse.daily[0].date === qaDate, "QA run evidence must include simulated-date check-ins");
  await db.exec("RESET ROLE");
  await db.query("UPDATE public.teams SET is_test_team = false WHERE id = $1", [teamPulse.team]);
  await db.query(
    "UPDATE public.profiles SET is_test_user = false WHERE id IN (SELECT user_id FROM public.program_instances WHERE program_run_id = $1)",
    [teamPulse.run],
  );
  await db.query(
    "UPDATE public.program_instances SET is_test_instance = false WHERE program_run_id = $1",
    [teamPulse.run],
  );
  await db.query("DELETE FROM public.qa_time_overrides WHERE team_id = $1", [teamPulse.team]);
  await db.query(
    "UPDATE public.daily_checkins SET date = CURRENT_DATE WHERE program_instance_id IN (SELECT id FROM public.program_instances WHERE program_run_id = $1)",
    [teamPulse.run],
  );

  await db.exec("RESET ROLE");
  await db.query(
    "UPDATE public.daily_checkins SET wellbeing_metrics = jsonb_set(jsonb_set(wellbeing_metrics, '{stress}', to_jsonb('not-recorded'::text)), '{pressure}', to_jsonb(99)) WHERE user_id = $1",
    [soloAthletes[4].user],
  );
  await db.exec("SET ROLE authenticated");
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [ids.admin]);
  const metricSuppressedTeamAggregate = await db.query(
    "SELECT public.get_team_mental_state_aggregate($1, '56d-transfer-v2-2026-07') AS result",
    [teamPulse.team],
  );
  const metricSuppressedTeam = metricSuppressedTeamAggregate.rows[0].result;
  assert(metricSuppressedTeam.wellbeing.today.mood_n === 5, "Team pulse must report five valid mood contributors");
  assert(metricSuppressedTeam.wellbeing.today.mood !== null, "Five valid mood contributors may produce an aggregate");
  assert(metricSuppressedTeam.wellbeing.today.stress_n === 4, "Team pulse must count valid stress values per metric");
  assert(metricSuppressedTeam.wellbeing.today.stress === null, "Team pulse must suppress a metric with fewer than five valid contributors");
  assert(metricSuppressedTeam.wellbeing.today.pressure_n === 4, "Out-of-range team values must not count as valid contributors");
  assert(metricSuppressedTeam.wellbeing.today.pressure === null, "Out-of-range team values must remain suppressed");
  const runEvidence = await db.query(
    "SELECT public.get_program_run_development_evidence($1, '56d-transfer-v2-2026-07') AS result",
    [teamPulse.run],
  );
  const runResult = runEvidence.rows[0].result;
  const prePostChange = runResult.changes.pre_post.find(
    (row) => row.assessment_type === "smtq" && row.subscale === "confidence",
  );
  assert(runResult.sample.eligible_athletes === 5, "Run evidence must count five currently authorized athletes");
  assert(runResult.sample.low_confidence === true, "A five-person run must be explicitly low-confidence");
  assert(runResult.cohort_breakdown.completed_pre_post === 5, "Cohort status must use actual participant measurement paths");
  assert(runResult.cohort_breakdown.never_started === 0, "Completed Pre/Post participants must not be counted as never started");
  assert(prePostChange.n_pairs === 5, "Repeated Pre submissions must not inflate paired n");
  assert(Number(prePostChange.avg_pre) === 2.4, "The latest valid Pre submission must be used per athlete");
  assert(Number(prePostChange.abs_change) === 0.32, "Observed change must use the five deduplicated pairs");
  assert(runResult.outcomes.development_overall.n === 5, "Development Index must preserve five pairs");
  assert(Number(runResult.outcomes.development_overall.observed_change) === 5, "Development Index change must use paired values");
  assert(runResult.team_pulse.daily[0].mood_n === 5, "Metric-level n must be reported for available mood values");
  assert(runResult.team_pulse.daily[0].stress_n === 4, "Malformed stress input must be excluded from metric-level n");
  assert(runResult.team_pulse.daily[0].stress === null, "A sensitive metric with fewer than five valid values must be suppressed");
  assert(runResult.team_pulse.daily[0].pressure_n === 4, "Out-of-range run values must be excluded from metric-level n");
  assert(runResult.team_pulse.daily[0].pressure === null, "Out-of-range run values must remain suppressed");
  assert(runResult.team_pulse.daily[0].mood !== null, "A sensitive metric with five valid values may be aggregated");
  assert(runResult.usage.avg_completion_rate !== null, "Five current progress snapshots must allow an aggregate average");
  assert(runResult.usage.total_completed_days === 5, "Duplicate and future run completions must not inflate usage");
  assert(runResult.usage.total_checkins === 5, "Duplicate run check-ins must collapse to one athlete-day");
  for (const athlete of soloAthletes) {
    assert(!JSON.stringify(runResult).includes(athlete.user), "Run evidence must not return athlete identifiers");
  }

  const coachEvidence = await db.query(
    "SELECT public.compute_team_outcomes($1, 5) AS result",
    [teamPulse.team],
  );
  const coachChange = coachEvidence.rows[0].result.changes.pre_post[0];
  assert(coachEvidence.rows[0].result.total_athletes === 5, "Coach evidence must use the central eligibility sample");
  assert(coachChange.assessment_type && coachChange.subscale, "Coach evidence must preserve the UI assessment schema");
  assert(coachChange.n_pairs === 5 && coachChange.sufficient_data === true, "Coach change rows must expose only valid paired aggregates");

  const runLock = await db.query(
    "SELECT public.create_evidence_data_lock($1, NULL, NULL, false, '56d-transfer-v2-2026-07') AS result",
    [teamPulse.run],
  );
  const runLockResult = runLock.rows[0].result;
  assert(runLockResult.evidence.schema_version === "program-run-evidence-lock-v2-2026-07", "A run lock must use the unified dossier schema");
  assert(runLockResult.evidence.measurement.validated_assessments.pre_n === 5, "A run lock must freeze measurement readiness");
  assert(runLockResult.evidence.transfer_evidence.protocol_version === "56d-transfer-v2-2026-07", "A run lock must include transfer evidence");
  assert(runLockResult.analysis_manifest.included_sections.includes("outcomes"), "The run analysis manifest must declare outcome coverage");
  assert(runLockResult.analysis_manifest.included_sections.includes("transfer_evidence"), "The run analysis manifest must declare transfer coverage");
  const storedRunLock = await db.query("SELECT public.get_evidence_data_lock($1) AS result", [runLockResult.lock_id]);
  assert(storedRunLock.rows[0].result.content_checksum === runLockResult.content_checksum, "Stored run evidence must preserve its checksum");
  for (const athlete of soloAthletes) {
    assert(!JSON.stringify(runLockResult.evidence).includes(athlete.user), "A run Data Lock must not expose athlete identifiers");
  }
  await db.exec("RESET ROLE");

  await action("set_data_contribution", soloAthletes[4].user, { data_contribution_authorized: false });
  await db.exec("SET ROLE authenticated");
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [ids.admin]);
  const suppressedTeam = await db.query(
    "SELECT public.get_team_mental_state_aggregate($1, '56d-transfer-v2-2026-07') AS result",
    [teamPulse.team],
  );
  assert(suppressedTeam.rows[0].result.insufficient_data === true, "Four authorized athletes must suppress team values");
  assert(suppressedTeam.rows[0].result.insufficient_reason === "insufficient_authorized_data", "Suppression must expose only a safe reason");
  assert(suppressedTeam.rows[0].result.energy.current === null, "Suppressed team state must not leak a value");
  const suppressedRunEvidence = await db.query(
    "SELECT public.get_program_run_development_evidence($1, '56d-transfer-v2-2026-07') AS result",
    [teamPulse.run],
  );
  const suppressedRun = suppressedRunEvidence.rows[0].result;
  const suppressedChange = suppressedRun.changes.pre_post.find(
    (row) => row.assessment_type === "smtq" && row.subscale === "confidence",
  );
  assert(suppressedRun.sample.eligible_athletes === 4, "Withdrawn contribution must leave the run sample immediately");
  assert(suppressedRun.sample.exclusion_reasons.not_currently_authorized === 1, "Coach output may expose only a generic exclusion count");
  assert(Object.keys(suppressedRun.sample.exclusion_reasons).length === 1, "Coach output must not reveal age or consent failure categories");
  assert(suppressedRun.usage.avg_completion_rate === null, "Progress averages below n=5 must be suppressed server-side");
  assert(suppressedChange.n_pairs === 4 && suppressedChange.avg_pre === null, "Paired changes below n=5 must contain no values");
  await db.exec("RESET ROLE");
  await action("set_data_contribution", soloAthletes[4].user, { data_contribution_authorized: true });
  await db.query(
    `UPDATE public.evidence_participation_eligibility
     SET status = 'adult_verified', verified_by = $2, verified_at = now(), revoked_by = NULL, revoked_at = NULL
     WHERE program_instance_id = $1`,
    [soloAthletes[4].instance, ids.admin],
  );

  await db.query("UPDATE public.program_runs SET status = 'completed', ended_at = CURRENT_DATE WHERE id = $1", [teamPulse.run]);
  await db.query("UPDATE public.program_instances SET status = 'completed', ended_at = CURRENT_DATE WHERE program_run_id = $1", [teamPulse.run]);
  await db.exec("SET ROLE authenticated");
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [ids.admin]);
  const completedRunEvidence = await db.query("SELECT public.compute_team_outcomes($1, 5) AS result", [teamPulse.team]);
  assert(completedRunEvidence.rows[0].result.program_run_id === teamPulse.run, "A completed pilot must remain available to the coach evidence view");
  assert(
    completedRunEvidence.rows[0].result.total_athletes === 5,
    `Completed runs must preserve currently authorized aggregate evidence: ${JSON.stringify(completedRunEvidence.rows[0].result)}`,
  );
  await db.exec("RESET ROLE");
  await db.query("UPDATE public.program_runs SET status = 'active', ended_at = NULL WHERE id = $1", [teamPulse.run]);
  await db.query("UPDATE public.program_instances SET status = 'active', ended_at = NULL WHERE program_run_id = $1", [teamPulse.run]);

  await db.exec("SET ROLE authenticated");
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [ids.teen]);
  await expectFailure(
    () => db.query(
      "SELECT public.get_team_mental_state_aggregate($1, '56d-transfer-v2-2026-07')",
      [teamPulse.team],
    ),
    "coach_or_admin_role_required",
  );
  await expectFailure(
    () => db.query(
      "SELECT public.get_program_run_development_evidence($1, '56d-transfer-v2-2026-07')",
      [teamPulse.run],
    ),
    "access_denied",
  );
  await expectFailure(
    () => db.query("SELECT public.compute_team_outcomes($1, 5)", [teamPulse.team]),
    "access_denied",
  );
  await db.exec("RESET ROLE");

  const preflight = await action("enforcement_preflight", null);
  assert(preflight.ready === true, "Enforcement preflight should pass after all athletes complete the flow");
  const enforcement = await action("set_enforcement", null, { enabled: true });
  assert(enforcement.enforcement_enabled === true, "Enforcement could not be enabled after a clean preflight");

  await db.query("INSERT INTO auth.users(id) VALUES ($1)", [ids.blocked]);
  await db.query("INSERT INTO public.user_roles(user_id, role) VALUES ($1, 'athlete')", [ids.blocked]);
  await db.query("INSERT INTO public.profiles(id) VALUES ($1)", [ids.blocked]);
  await expectFailure(
    () => db.query("INSERT INTO public.daily_checkins(user_id) VALUES ($1)", [ids.blocked]),
    "minor_product_authorization_required",
  );
  await db.query("INSERT INTO public.daily_checkins(user_id) VALUES ($1)", [ids.adult]);

  const management = await action("management_lookup", null, { token_hash: "c".repeat(64) });
  assert(management.state === "active", "Guardian management link must remain active after approval");
  await action("guardian_revoke", null, { token_hash: "c".repeat(64) });
  await expectFailure(
    () => db.query("INSERT INTO public.daily_checkins(user_id) VALUES ($1)", [ids.child]),
    "minor_product_authorization_required",
  );
  const childProfile = await db.query("SELECT data_contribution_consent FROM public.profiles WHERE id = $1", [ids.child]);
  assert(childProfile.rows[0].data_contribution_consent === false, "Guardian withdrawal must disable data contribution");

  await db.exec("SET ROLE authenticated");
  await expectFailure(
    () => db.query("SELECT public.minor_service_action('status', $1::uuid, '{}'::jsonb)", [ids.adult]),
    "permission denied",
  );
  await expectFailure(
    () => db.query("SELECT * FROM minor_auth.participant_authorizations"),
    "permission denied",
  );
  await db.exec("RESET ROLE");

  const policy = await db.query("SELECT id FROM minor_auth.policy_versions WHERE status = 'active'");
  const policyId = policy.rows[0].id;
  await db.query(
    `INSERT INTO minor_auth.guardian_challenges(
       user_id, policy_id, token_hash, guardian_email_ciphertext, guardian_email_iv,
       guardian_email_hash, guardian_email_mask, status, delivery_status, expires_at, created_at
     ) VALUES ($1, $2, $3, 'old-encrypted-email-payload', 'old-iv-value-123', $4, 'o•••@e•••.de', 'approved', 'sent', now() - interval '20 days', now() - interval '20 days')`,
    [ids.adult, policyId, "d".repeat(64), "e".repeat(64)],
  );
  await db.query(
    "INSERT INTO minor_auth.authorization_audit(user_id, policy_id, actor_type, event_type, created_at) VALUES ($1, $2, 'system', 'old_receipt', now() - interval '4 years')",
    [ids.adult, policyId],
  );
  await db.exec("INSERT INTO public.app_event_log(created_at) VALUES (now() - interval '31 days')");
  await db.exec("INSERT INTO public.notification_log(created_at) VALUES (now() - interval '91 days')");
  await db.exec("SELECT minor_auth.cleanup_retention()");
  assert(await count("minor_auth.guardian_challenges", "created_at < now() - interval '7 days'") === 0, "Expired guardian challenge was not removed");
  assert(await count("minor_auth.authorization_audit", "created_at < now() - interval '3 years'") === 0, "Old authorization receipt was not removed");
  assert(await count("public.app_event_log", "created_at < now() - interval '30 days'") === 0, "Old app event was not removed");
  assert(await count("public.notification_log", "created_at < now() - interval '90 days'") === 0, "Old notification log was not removed");

  process.stdout.write("Minor, solo, team and machine Evidence SQL verified: authorization, n-thresholds, immutable locks, audit, revocation, retention and privileges.\n");
} finally {
  await db.close();
}
