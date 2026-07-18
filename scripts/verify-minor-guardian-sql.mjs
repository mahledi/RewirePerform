import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const migrationPath = resolve("supabase/migrations/20260718122735_minor_guardian_authorization_v1.sql");
const migration = readFileSync(migrationPath, "utf8");
const indexMigrationPath = resolve("supabase/migrations/20260718160000_minor_guardian_fk_indexes.sql");
const indexMigration = readFileSync(indexMigrationPath, "utf8");

const ids = {
  adult: "00000000-0000-4000-8000-000000000101",
  teen: "00000000-0000-4000-8000-000000000102",
  child: "00000000-0000-4000-8000-000000000103",
  blocked: "00000000-0000-4000-8000-000000000104",
  adultInstance: "10000000-0000-4000-8000-000000000101",
  teenInstance: "10000000-0000-4000-8000-000000000102",
  childInstance: "10000000-0000-4000-8000-000000000103",
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

    CREATE TABLE auth.users(id uuid PRIMARY KEY);
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
      data_contribution_consent boolean,
      data_contribution_consent_version text,
      data_contribution_consented_at timestamptz,
      data_contribution_updated_at timestamptz
    );
    CREATE TABLE public.program_instances(
      id uuid PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      status text NOT NULL
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

    CREATE TABLE public.questionnaire_responses(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id));
    CREATE TABLE public.daily_checkins(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id));
    CREATE TABLE public.daily_journals(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id));
    CREATE TABLE public.assessments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id));
    CREATE TABLE public.deep_profile_assessments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id));
    CREATE TABLE public.user_day_assignments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id));
    CREATE TABLE public.user_day_completion(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id));
    CREATE TABLE public.comprehension_check_instances(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id));
    CREATE TABLE public.program_progress_snapshots(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id));
    CREATE TABLE public.athlete_transfer_observations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id));
    CREATE TABLE public.app_event_log(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE public.notification_log(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now());

    CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
    RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
      SELECT EXISTS(
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = _user_id AND ur.role = _role
      )
    $$;

    CREATE FUNCTION cron.schedule(_name text, _schedule text, _command text)
    RETURNS bigint LANGUAGE sql AS $$ SELECT 1::bigint $$;
  `);

  await db.exec(migration);
  await db.exec(indexMigration);

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
  assert(await count("public.evidence_participation_eligibility", `program_instance_id = '${ids.teenInstance}'`) === 0, "Minor transfer evidence must stay disabled");

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

  await action("start_challenge", ids.child, {
    token_hash: "f".repeat(64),
    guardian_email_ciphertext: "encrypted-email-payload-long-enough",
    guardian_email_iv: "encrypted-iv-value",
    guardian_email_hash: "b".repeat(64),
    guardian_email_mask: "e•••@b•••.de",
  });

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
  assert(await count("public.evidence_participation_eligibility", `program_instance_id = '${ids.childInstance}'`) === 0, "Under-16 transfer evidence must stay disabled");

  const filtered = await action("filter_data_contribution", null, { user_ids: [ids.adult, ids.teen, ids.child] });
  assert(filtered.user_ids.length === 3, "Authorized contributors were not returned by the aggregate filter");
  const guardianContributionWithdrawal = await action("guardian_withdraw_data_contribution", null, { token_hash: "c".repeat(64) });
  assert(guardianContributionWithdrawal.data_contribution_guardian === false, "Optional guardian withdrawal was not stored");
  const childAfterContributionWithdrawal = await action("status", ids.child);
  assert(childAfterContributionWithdrawal.product_status === "authorized", "Optional guardian withdrawal must preserve product access");
  assert(childAfterContributionWithdrawal.data_contribution_status === "declined", "Optional guardian withdrawal must disable contribution");
  await action("set_data_contribution", ids.teen, { data_contribution_authorized: false });
  const filteredAfterWithdrawal = await action("filter_data_contribution", null, { user_ids: [ids.adult, ids.teen, ids.child] });
  assert(!filteredAfterWithdrawal.user_ids.includes(ids.teen), "Withdrawn data contribution must be excluded immediately");
  assert(!filteredAfterWithdrawal.user_ids.includes(ids.child), "Guardian-withdrawn data contribution must be excluded immediately");

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

  process.stdout.write("Minor guardian SQL verified: state machine, consent filter, write guards, revocation, retention and privileges.\n");
} finally {
  await db.close();
}
