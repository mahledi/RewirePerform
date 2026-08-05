import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const migration = readFileSync(
  resolve("supabase/migrations/20260805145921_guardian_feedback_text_authorization_v1.sql"),
  "utf8",
);

const ids = {
  child: "00000000-0000-4000-8000-000000009101",
  policy: "10000000-0000-4000-8000-000000009101",
  challenge: "20000000-0000-4000-8000-000000009101",
  access: "30000000-0000-4000-8000-000000009101",
  receipt: "40000000-0000-4000-8000-000000009101",
  structured: "50000000-0000-4000-8000-000000009101",
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const expectFailure = async (task, expectedMessage) => {
  try {
    await task();
  } catch (error) {
    assert(
      String(error).toLowerCase().includes(expectedMessage.toLowerCase()),
      `Expected ${expectedMessage}, received ${String(error)}`,
    );
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
    CREATE SCHEMA minor_auth;
    CREATE SCHEMA feedback_core;
    CREATE SCHEMA feedback_consent;
    CREATE SCHEMA feedback_raw;
    CREATE SCHEMA feedback_analysis;

    CREATE TABLE auth.users(id uuid PRIMARY KEY);

    CREATE TABLE feedback_core.system_settings(
      singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
      text_collection_enabled boolean NOT NULL DEFAULT false,
      privacy_notice_ready boolean NOT NULL DEFAULT false,
      app_store_declaration_ready boolean NOT NULL DEFAULT false,
      minor_policy_ready boolean NOT NULL DEFAULT false,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    INSERT INTO feedback_core.system_settings(singleton) VALUES (true);

    CREATE TABLE feedback_core.test_jurisdiction_gate(
      jurisdiction text PRIMARY KEY,
      structured_ready boolean NOT NULL DEFAULT false,
      raw_ready boolean NOT NULL DEFAULT false
    );
    INSERT INTO feedback_core.test_jurisdiction_gate VALUES ('DE', false, false);

    CREATE FUNCTION feedback_core.jurisdiction_policy_ready(
      _jurisdiction text,
      _include_raw_text boolean DEFAULT false
    ) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
      SELECT COALESCE((
        SELECT gate.structured_ready AND (NOT _include_raw_text OR gate.raw_ready)
        FROM feedback_core.test_jurisdiction_gate gate
        WHERE gate.jurisdiction = _jurisdiction
      ), false)
    $$;

    CREATE FUNCTION feedback_core.touch_updated_at()
    RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
    BEGIN
      NEW.updated_at := clock_timestamp();
      RETURN NEW;
    END;
    $$;

    CREATE TABLE feedback_consent.guardian_text_authorizations(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      consent_reference uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      scope text NOT NULL,
      consent_version text NOT NULL,
      notice_hash text NOT NULL,
      state text NOT NULL CHECK (state IN ('granted', 'declined', 'withdrawn')),
      granted_at timestamptz,
      withdrawn_at timestamptz,
      policy_reference text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      CHECK ((state = 'granted') = (granted_at IS NOT NULL AND withdrawn_at IS NULL)),
      CHECK (state <> 'withdrawn' OR withdrawn_at IS NOT NULL)
    );
    CREATE UNIQUE INDEX feedback_guardian_active_scope_idx
      ON feedback_consent.guardian_text_authorizations(user_id, scope)
      WHERE state = 'granted' AND withdrawn_at IS NULL;
    CREATE FUNCTION feedback_consent.validate_guardian_text_authorization()
    RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
    BEGIN
      RETURN NEW;
    END;
    $$;
    CREATE TRIGGER feedback_guardian_text_authorization_validate
    BEFORE INSERT OR UPDATE ON feedback_consent.guardian_text_authorizations
    FOR EACH ROW EXECUTE FUNCTION feedback_consent.validate_guardian_text_authorization();

    CREATE TABLE feedback_consent.text_consent_receipts(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      consent_reference uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
      submission_id uuid NOT NULL,
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      state text NOT NULL CHECK (state IN ('granted', 'declined', 'withdrawn')),
      scope text NOT NULL,
      consent_version text NOT NULL,
      notice_hash text NOT NULL,
      granted_at timestamptz,
      withdrawn_at timestamptz,
      guardian_authorization_reference uuid,
      CHECK ((state = 'granted') = (granted_at IS NOT NULL AND withdrawn_at IS NULL)),
      CHECK (state <> 'withdrawn' OR withdrawn_at IS NOT NULL)
    );

    CREATE TABLE feedback_consent.audit_events(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      submission_id uuid,
      consent_reference uuid,
      actor_type text NOT NULL,
      event_type text NOT NULL,
      scope text NOT NULL,
      consent_version text NOT NULL,
      notice_hash text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE feedback_raw.comments(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      consent_receipt_id uuid NOT NULL REFERENCES feedback_consent.text_consent_receipts(id) ON DELETE CASCADE,
      raw_text text NOT NULL
    );
    CREATE TABLE feedback_analysis.comment_artifacts(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      comment_id uuid NOT NULL REFERENCES feedback_raw.comments(id) ON DELETE CASCADE,
      artifact jsonb NOT NULL DEFAULT '{}'::jsonb
    );
    CREATE TABLE feedback_core.structured_answers(
      id uuid PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
    );

    CREATE FUNCTION feedback_consent.cleanup_withdrawn_guardian_text()
    RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;
    CREATE TRIGGER feedback_guardian_text_authorization_cleanup_withdrawal
      AFTER UPDATE ON feedback_consent.guardian_text_authorizations
      FOR EACH ROW EXECUTE FUNCTION feedback_consent.cleanup_withdrawn_guardian_text();

    CREATE FUNCTION feedback_consent.cleanup_withdrawn_text()
    RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;
    CREATE TRIGGER feedback_text_consent_cleanup_withdrawal
      AFTER UPDATE ON feedback_consent.text_consent_receipts
      FOR EACH ROW EXECUTE FUNCTION feedback_consent.cleanup_withdrawn_text();

    CREATE TABLE minor_auth.policy_versions(
      id uuid PRIMARY KEY,
      jurisdiction text NOT NULL,
      status text NOT NULL
    );
    CREATE TABLE minor_auth.participant_authorizations(
      user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      policy_id uuid NOT NULL REFERENCES minor_auth.policy_versions(id),
      age_band text NOT NULL,
      guardian_status text NOT NULL,
      athlete_status text NOT NULL,
      product_status text NOT NULL,
      data_contribution_guardian boolean,
      data_contribution_athlete boolean,
      data_contribution_status text NOT NULL,
      guardian_authorized_at timestamptz,
      revoked_at timestamptz
    );
    CREATE TABLE minor_auth.guardian_challenges(
      id uuid PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      policy_id uuid NOT NULL REFERENCES minor_auth.policy_versions(id),
      token_hash text NOT NULL UNIQUE,
      guardian_email_ciphertext text NOT NULL,
      guardian_email_iv text NOT NULL,
      guardian_email_mask text NOT NULL,
      status text NOT NULL,
      expires_at timestamptz NOT NULL,
      consumed_at timestamptz
    );
    CREATE TABLE minor_auth.guardian_access_tokens(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      policy_id uuid NOT NULL REFERENCES minor_auth.policy_versions(id),
      token_hash text NOT NULL UNIQUE,
      expires_at timestamptz NOT NULL,
      consumed_at timestamptz,
      revoked_at timestamptz
    );

    CREATE FUNCTION public.minor_service_action(
      _action text,
      _user_id uuid DEFAULT NULL,
      _payload jsonb DEFAULT '{}'::jsonb
    ) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
    DECLARE
      target_challenge minor_auth.guardian_challenges%ROWTYPE;
      target_participant minor_auth.participant_authorizations%ROWTYPE;
    BEGIN
      IF _action <> 'guardian_decide' THEN
        RAISE EXCEPTION 'unsupported_minor_action';
      END IF;
      SELECT row.* INTO target_challenge
      FROM minor_auth.guardian_challenges row
      WHERE row.token_hash = _payload ->> 'token_hash'
        AND row.status = 'pending'
        AND row.expires_at > clock_timestamp()
      FOR UPDATE;
      IF target_challenge.id IS NULL THEN RAISE EXCEPTION 'guardian_token_invalid'; END IF;

      SELECT row.* INTO target_participant
      FROM minor_auth.participant_authorizations row
      WHERE row.user_id = target_challenge.user_id
      FOR UPDATE;

      UPDATE minor_auth.guardian_challenges
      SET status = CASE WHEN (_payload ->> 'product_authorized')::boolean THEN 'approved' ELSE 'declined' END,
          consumed_at = clock_timestamp()
      WHERE id = target_challenge.id;
      UPDATE minor_auth.participant_authorizations
      SET guardian_status = CASE WHEN (_payload ->> 'product_authorized')::boolean THEN 'authorized' ELSE 'declined' END,
          product_status = CASE WHEN (_payload ->> 'product_authorized')::boolean THEN 'pending' ELSE 'declined' END,
          data_contribution_guardian = CASE
            WHEN (_payload ->> 'product_authorized')::boolean
              THEN (_payload ->> 'data_contribution_authorized')::boolean
            ELSE false
          END,
          guardian_authorized_at = CASE
            WHEN (_payload ->> 'product_authorized')::boolean THEN clock_timestamp()
            ELSE NULL
          END
      WHERE user_id = target_challenge.user_id;

      IF (_payload ->> 'product_authorized')::boolean THEN
        INSERT INTO minor_auth.guardian_access_tokens(
          user_id, policy_id, token_hash, expires_at
        ) VALUES (
          target_challenge.user_id,
          target_challenge.policy_id,
          _payload ->> 'management_token_hash',
          clock_timestamp() + interval '370 days'
        );
      END IF;

      RETURN jsonb_build_object(
        'state', CASE WHEN (_payload ->> 'product_authorized')::boolean THEN 'approved' ELSE 'declined' END,
        'user_id', target_challenge.user_id,
        'guardian_email_ciphertext', target_challenge.guardian_email_ciphertext,
        'guardian_email_iv', target_challenge.guardian_email_iv,
        'guardian_email_mask', target_challenge.guardian_email_mask
      );
    END;
    $$;

    CREATE FUNCTION cron.schedule(_name text, _schedule text, _command text)
    RETURNS bigint LANGUAGE sql AS $$ SELECT 1::bigint $$;
  `);

  await db.exec(migration);

  await db.query("INSERT INTO auth.users(id) VALUES ($1)", [ids.child]);
  await db.query("INSERT INTO minor_auth.policy_versions VALUES ($1, 'DE', 'active')", [ids.policy]);
  await db.query(`
    INSERT INTO minor_auth.participant_authorizations(
      user_id, policy_id, age_band, guardian_status, athlete_status,
      product_status, data_contribution_status
    ) VALUES ($1, $2, 'under_16', 'pending', 'required', 'pending', 'not_asked')
  `, [ids.child, ids.policy]);
  await db.query(`
    INSERT INTO minor_auth.guardian_challenges(
      id, user_id, policy_id, token_hash, guardian_email_ciphertext,
      guardian_email_iv, guardian_email_mask, status, expires_at
    ) VALUES ($1, $2, $3, $4, 'encrypted-email-payload', 'encrypted-iv', 'e•••@b•••.de', 'pending', now() + interval '1 day')
  `, [ids.challenge, ids.child, ids.policy, "a".repeat(64)]);

  const closed = await db.query(
    "SELECT public.guardian_feedback_text_decision_status($1) AS result",
    ["a".repeat(64)],
  );
  assert(closed.rows[0].result.available === false, "draft policy and closed rollout gates must hide the guardian option");
  await expectFailure(
    () => db.query(`
      SELECT public.guardian_feedback_text_decide(jsonb_build_object(
        'token_hash', $1::text,
        'product_authorized', true,
        'data_contribution_authorized', false,
        'feedback_text_authorized', true,
        'guardian_declaration', true,
        'management_token_hash', $2::text
      ))
    `, ["a".repeat(64), "b".repeat(64)]),
    "guardian_feedback_text_policy_not_ready",
  );
  const afterClosedAttempt = await db.query(`
    SELECT
      (SELECT status FROM minor_auth.guardian_challenges WHERE id = $1) AS challenge_status,
      (SELECT product_status FROM minor_auth.participant_authorizations WHERE user_id = $2) AS product_status
  `, [ids.challenge, ids.child]);
  assert(afterClosedAttempt.rows[0].challenge_status === "pending", "closed feedback gates must not consume the guardian challenge");
  assert(afterClosedAttempt.rows[0].product_status === "pending", "closed feedback gates must roll back the product decision atomically");

  await db.exec(`
    UPDATE feedback_core.system_settings
    SET text_collection_enabled = true,
        privacy_notice_ready = true,
        app_store_declaration_ready = true,
        minor_policy_ready = true;
    UPDATE feedback_core.test_jurisdiction_gate
    SET structured_ready = true, raw_ready = true
    WHERE jurisdiction = 'DE';
    UPDATE feedback_consent.guardian_text_policy_versions
    SET status = 'active', effective_from = now()
    WHERE policy_reference = 'guardian-feedback-text-de-v1.0.0-draft';
  `);

  const ready = await db.query(
    "SELECT public.guardian_feedback_text_decision_status($1) AS result",
    ["a".repeat(64)],
  );
  assert(ready.rows[0].result.available === true, "all exact gates must expose the separate guardian option");
  assert(ready.rows[0].result.raw_text_retention_days === 365, "guardian notice must expose the fixed 365-day maximum");

  const decision = await db.query(`
    SELECT public.guardian_feedback_text_decide(jsonb_build_object(
      'token_hash', $1::text,
      'product_authorized', true,
      'data_contribution_authorized', false,
      'feedback_text_authorized', true,
      'guardian_declaration', true,
      'management_token_hash', $2::text
    )) AS result
  `, ["a".repeat(64), "b".repeat(64)]);
  assert(decision.rows[0].result.state === "approved", "guardian product approval must remain atomic");
  assert(decision.rows[0].result.feedback_text_authorization_state === "granted", "separate feedback text choice must be granted");

  const authorization = await db.query(`
    SELECT consent_reference, notice_hash, guardian_notice_hash, policy_reference
    FROM feedback_consent.guardian_text_authorizations
    WHERE user_id = $1 AND state = 'granted'
  `, [ids.child]);
  assert(authorization.rows.length === 1, "one active guardian feedback scope must be stored");
  assert(
    authorization.rows[0].notice_hash === "7da3fee62d13672430e7c288274994f3d284ad8dfd1b73a92ecc0c8d15962af4",
    "guardian authorization must bind to the athlete checkpoint consent contract",
  );
  assert(
    authorization.rows[0].guardian_notice_hash === "138843d107ec3681de41b00e71033a77ec67b143c6c4aacf67cc47f46b7bcfd9",
    "guardian authorization must separately bind the exact visible guardian notice",
  );
  await expectFailure(
    () => db.query(`
      UPDATE feedback_consent.guardian_text_authorizations
      SET guardian_notice_hash = $1
      WHERE consent_reference = $2
    `, ["f".repeat(64), authorization.rows[0].consent_reference]),
    "guardian_text_authorization_identity_immutable",
  );

  await db.query(`
    INSERT INTO feedback_consent.text_consent_receipts(
      id, consent_reference, submission_id, user_id, state, scope,
      consent_version, notice_hash, granted_at, guardian_authorization_reference
    ) VALUES (
      $1, gen_random_uuid(), gen_random_uuid(), $2, 'granted',
      'product-improvement-individual-text-ai-analysis-v1',
      'feedback-text-consent-v1.0.0-draft',
      '7da3fee62d13672430e7c288274994f3d284ad8dfd1b73a92ecc0c8d15962af4',
      now(), $3
    )
  `, [ids.receipt, ids.child, authorization.rows[0].consent_reference]);
  await db.query(`
    INSERT INTO feedback_raw.comments(consent_receipt_id, raw_text)
    VALUES ($1, 'Ein bewusst abgegebener Produktfeedback-Kommentar')
  `, [ids.receipt]);
  await db.query(`
    INSERT INTO feedback_analysis.comment_artifacts(comment_id, artifact)
    SELECT id, '{"theme":"clarity"}'::jsonb FROM feedback_raw.comments WHERE consent_receipt_id = $1
  `, [ids.receipt]);
  await db.query(
    "INSERT INTO feedback_core.structured_answers(id, user_id) VALUES ($1, $2)",
    [ids.structured, ids.child],
  );

  const withdrawn = await db.query(
    "SELECT public.guardian_feedback_text_management_decide($1, false) AS result",
    ["b".repeat(64)],
  );
  assert(withdrawn.rows[0].result.state === "withdrawn", "guardian management withdrawal must return the new state");

  const afterWithdrawal = await db.query(`
    SELECT
      (SELECT state FROM feedback_consent.text_consent_receipts WHERE id = $1) AS receipt_state,
      (SELECT COUNT(*)::integer FROM feedback_raw.comments WHERE consent_receipt_id = $1) AS raw_count,
      (SELECT COUNT(*)::integer FROM feedback_analysis.comment_artifacts) AS artifact_count,
      (SELECT COUNT(*)::integer FROM feedback_core.structured_answers WHERE user_id = $2) AS structured_count
  `, [ids.receipt, ids.child]);
  assert(afterWithdrawal.rows[0].receipt_state === "withdrawn", "guardian withdrawal must cascade to the athlete receipt");
  assert(afterWithdrawal.rows[0].raw_count === 0, "guardian withdrawal must delete raw text");
  assert(afterWithdrawal.rows[0].artifact_count === 0, "guardian withdrawal must delete attributable artifacts");
  assert(afterWithdrawal.rows[0].structured_count === 1, "guardian withdrawal must preserve structured answers");

  const regranted = await db.query(
    "SELECT public.guardian_feedback_text_management_decide($1, true) AS result",
    ["b".repeat(64)],
  );
  assert(regranted.rows[0].result.state === "granted", "a later opt-in must create a new receipt under the current policy");
  const receiptCount = await db.query(`
    SELECT COUNT(*)::integer AS count
    FROM feedback_consent.guardian_text_authorizations
    WHERE user_id = $1
  `, [ids.child]);
  assert(receiptCount.rows[0].count === 2, "declined or withdrawn receipts must never be rewritten into a grant");

  const retentionReceipt = "40000000-0000-4000-8000-000000009102";
  await db.query(`
    INSERT INTO feedback_consent.text_consent_receipts(
      id, consent_reference, submission_id, user_id, state, scope,
      consent_version, notice_hash, granted_at
    ) VALUES (
      $1, gen_random_uuid(), gen_random_uuid(), $2, 'granted',
      'product-improvement-individual-text-ai-analysis-v1',
      'feedback-text-consent-v1.0.0-draft',
      '7da3fee62d13672430e7c288274994f3d284ad8dfd1b73a92ecc0c8d15962af4',
      now() - interval '366 days'
    )
  `, [retentionReceipt, ids.child]);
  await db.query(`
    INSERT INTO feedback_raw.comments(consent_receipt_id, raw_text)
    VALUES ($1, 'Dieser Testtext muss nach Ablauf automatisch verschwinden')
  `, [retentionReceipt]);
  const retention = await db.query("SELECT feedback_consent.cleanup_expired_text() AS affected");
  assert(retention.rows[0].affected === 1, "daily retention must withdraw every receipt beyond the 365-day maximum");
  const afterRetention = await db.query(`
    SELECT
      (SELECT state FROM feedback_consent.text_consent_receipts WHERE id = $1) AS state,
      (SELECT COUNT(*)::integer FROM feedback_raw.comments WHERE consent_receipt_id = $1) AS raw_count
  `, [retentionReceipt]);
  assert(afterRetention.rows[0].state === "withdrawn", "retention must close the consent receipt");
  assert(afterRetention.rows[0].raw_count === 0, "retention must delete expired raw text");

  const indexes = await db.query(`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'feedback_consent'
      AND indexname IN (
        'feedback_guardian_text_user_created_idx',
        'feedback_guardian_text_policy_contract_idx',
        'feedback_text_consent_guardian_reference_idx'
      )
  `);
  assert(indexes.rows.length === 3, "every new guardian lookup and foreign-key path must be indexed");

  await expectFailure(
    () => db.exec(`
      UPDATE feedback_consent.guardian_text_policy_versions
      SET raw_text_retention_days = 364
      WHERE policy_reference = 'guardian-feedback-text-de-v1.0.0-draft'
    `),
    "guardian_feedback_text_active_policy_immutable",
  );
  const activeGuardian = await db.query(`
    SELECT consent_reference
    FROM feedback_consent.guardian_text_authorizations
    WHERE user_id = $1 AND state = 'granted'
  `, [ids.child]);
  const retirementReceipt = "40000000-0000-4000-8000-000000009103";
  await db.query(`
    INSERT INTO feedback_consent.text_consent_receipts(
      id, consent_reference, submission_id, user_id, state, scope,
      consent_version, notice_hash, granted_at, guardian_authorization_reference
    ) VALUES (
      $1, gen_random_uuid(), gen_random_uuid(), $2, 'granted',
      'product-improvement-individual-text-ai-analysis-v1',
      'feedback-text-consent-v1.0.0-draft',
      '7da3fee62d13672430e7c288274994f3d284ad8dfd1b73a92ecc0c8d15962af4',
      now(), $3
    )
  `, [retirementReceipt, ids.child, activeGuardian.rows[0].consent_reference]);
  await db.query(`
    INSERT INTO feedback_raw.comments(consent_receipt_id, raw_text)
    VALUES ($1, 'Dieser Testtext muss bei Contract-Drift gelöscht werden')
  `, [retirementReceipt]);
  await db.exec(`
    UPDATE feedback_consent.guardian_text_policy_versions
    SET status = 'retired', retired_at = now()
    WHERE policy_reference = 'guardian-feedback-text-de-v1.0.0-draft'
  `);
  const afterRetirement = await db.query(`
    SELECT
      (SELECT state FROM feedback_consent.guardian_text_authorizations WHERE consent_reference = $1) AS guardian_state,
      (SELECT state FROM feedback_consent.text_consent_receipts WHERE id = $2) AS receipt_state,
      (SELECT COUNT(*)::integer FROM feedback_raw.comments WHERE consent_receipt_id = $2) AS raw_count
  `, [activeGuardian.rows[0].consent_reference, retirementReceipt]);
  assert(afterRetirement.rows[0].guardian_state === "withdrawn", "policy retirement must withdraw every old guardian authorization");
  assert(afterRetirement.rows[0].receipt_state === "withdrawn", "policy retirement must close dependent athlete consent receipts");
  assert(afterRetirement.rows[0].raw_count === 0, "policy retirement must delete raw text tied to the retired contract");
  await expectFailure(
    () => db.exec(`
      UPDATE feedback_consent.guardian_text_policy_versions
      SET processor_reference = 'forbidden-after-retirement'
      WHERE policy_reference = 'guardian-feedback-text-de-v1.0.0-draft'
    `),
    "guardian_feedback_text_policy_retired_immutable",
  );

  const privileges = await db.query(`
    SELECT
      has_function_privilege('anon', 'public.guardian_feedback_text_decide(jsonb)', 'EXECUTE') AS anon_decide,
      has_function_privilege('authenticated', 'public.guardian_feedback_text_management_decide(text,boolean)', 'EXECUTE') AS auth_manage,
      has_function_privilege('service_role', 'public.guardian_feedback_text_decide(jsonb)', 'EXECUTE') AS service_decide,
      has_table_privilege('service_role', 'feedback_consent.guardian_text_policy_versions', 'SELECT') AS service_policy_select
  `);
  assert(privileges.rows[0].anon_decide === false, "anon must not call guardian feedback decision RPCs");
  assert(privileges.rows[0].auth_manage === false, "authenticated must not call guardian management RPCs directly");
  assert(privileges.rows[0].service_decide === true, "only the Edge service role may call the guardian decision wrapper");
  assert(privileges.rows[0].service_policy_select === false, "service role must not read the private policy table directly");

  await db.exec("SET ROLE authenticated");
  await expectFailure(
    () => db.query("SELECT public.guardian_feedback_text_management_status($1)", ["b".repeat(64)]),
    "permission denied",
  );
  await db.exec("RESET ROLE");

  process.stdout.write(
    "Guardian feedback text SQL verified: draft gate, atomic rollback/grant, exact immutable notice binding, indexed relations, independent withdrawal, retention, contract-drift deletion and privileges.\n",
  );
} finally {
  await db.close();
}
