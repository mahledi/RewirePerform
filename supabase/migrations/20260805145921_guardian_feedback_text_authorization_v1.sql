-- Separate guardian authorization for the narrowly-scoped optional product
-- feedback comments. This migration wires the consent contract but keeps the
-- policy in draft, so it does not expose the guardian option or activate raw
-- text collection by itself.

BEGIN;

CREATE TABLE feedback_consent.guardian_text_policy_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction text NOT NULL CHECK (jurisdiction = 'DE'),
  policy_reference text NOT NULL UNIQUE
    CHECK (policy_reference ~ '^[A-Za-z0-9_.:-]{8,128}$'),
  scope text NOT NULL
    CHECK (scope ~ '^[a-z0-9][a-z0-9_-]{7,95}$'),
  consent_version text NOT NULL
    CHECK (consent_version ~ '^[A-Za-z0-9_.:-]{8,96}$'),
  guardian_notice_hash text NOT NULL CHECK (guardian_notice_hash ~ '^[a-f0-9]{64}$'),
  athlete_notice_hash text NOT NULL CHECK (athlete_notice_hash ~ '^[a-f0-9]{64}$'),
  raw_text_retention_days smallint NOT NULL DEFAULT 365
    CHECK (raw_text_retention_days BETWEEN 30 AND 730),
  processor_mode text NOT NULL DEFAULT 'no_external_processor'
    CHECK (processor_mode IN ('no_external_processor', 'approved_processor')),
  processor_reference text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'retired')),
  effective_from timestamptz,
  retired_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'active') = (effective_from IS NOT NULL AND retired_at IS NULL)),
  CHECK (status <> 'retired' OR retired_at IS NOT NULL),
  CHECK (
    (processor_mode = 'no_external_processor' AND processor_reference IS NULL)
    OR (processor_mode = 'approved_processor' AND processor_reference IS NOT NULL)
  ),
  UNIQUE (
    policy_reference,
    scope,
    consent_version,
    guardian_notice_hash,
    athlete_notice_hash
  )
);

CREATE UNIQUE INDEX feedback_guardian_text_one_active_policy
  ON feedback_consent.guardian_text_policy_versions(jurisdiction)
  WHERE status = 'active';

INSERT INTO feedback_consent.guardian_text_policy_versions(
  jurisdiction,
  policy_reference,
  scope,
  consent_version,
  guardian_notice_hash,
  athlete_notice_hash,
  raw_text_retention_days,
  processor_mode,
  status
) VALUES (
  'DE',
  'guardian-feedback-text-de-v1.0.0-draft',
  'product-improvement-individual-text-ai-analysis-v1',
  'feedback-text-consent-v1.0.0-draft',
  '138843d107ec3681de41b00e71033a77ec67b143c6c4aacf67cc47f46b7bcfd9',
  '7da3fee62d13672430e7c288274994f3d284ad8dfd1b73a92ecc0c8d15962af4',
  365,
  'no_external_processor',
  'draft'
)
ON CONFLICT (policy_reference) DO NOTHING;

ALTER TABLE feedback_consent.guardian_text_authorizations
  ADD COLUMN guardian_notice_hash text;

UPDATE feedback_consent.guardian_text_authorizations guardian_receipt
SET guardian_notice_hash = policy.guardian_notice_hash
FROM feedback_consent.guardian_text_policy_versions policy
WHERE guardian_receipt.policy_reference = policy.policy_reference
  AND guardian_receipt.scope = policy.scope
  AND guardian_receipt.consent_version = policy.consent_version
  AND guardian_receipt.notice_hash = policy.athlete_notice_hash
  AND guardian_receipt.guardian_notice_hash IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM feedback_consent.guardian_text_authorizations guardian_receipt
    WHERE guardian_receipt.guardian_notice_hash IS NULL
  ) THEN
    RAISE EXCEPTION 'guardian_feedback_text_legacy_contract_unresolved';
  END IF;
END;
$$;

ALTER TABLE feedback_consent.guardian_text_authorizations
  ALTER COLUMN guardian_notice_hash SET NOT NULL,
  ADD CONSTRAINT feedback_guardian_text_policy_contract_fk
    FOREIGN KEY (
      policy_reference,
      scope,
      consent_version,
      guardian_notice_hash,
      notice_hash
    ) REFERENCES feedback_consent.guardian_text_policy_versions(
      policy_reference,
      scope,
      consent_version,
      guardian_notice_hash,
      athlete_notice_hash
    ) ON DELETE RESTRICT;

CREATE INDEX feedback_guardian_text_user_created_idx
  ON feedback_consent.guardian_text_authorizations(user_id, created_at DESC);
CREATE INDEX feedback_guardian_text_policy_contract_idx
  ON feedback_consent.guardian_text_authorizations(
    policy_reference,
    scope,
    consent_version,
    guardian_notice_hash,
    notice_hash
  );
CREATE INDEX feedback_text_consent_guardian_reference_idx
  ON feedback_consent.text_consent_receipts(guardian_authorization_reference)
  WHERE guardian_authorization_reference IS NOT NULL;

CREATE OR REPLACE FUNCTION feedback_consent.validate_guardian_text_authorization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.user_id <> OLD.user_id
       OR NEW.scope <> OLD.scope
       OR NEW.consent_version <> OLD.consent_version
       OR NEW.notice_hash <> OLD.notice_hash
       OR NEW.guardian_notice_hash <> OLD.guardian_notice_hash
       OR NEW.policy_reference <> OLD.policy_reference
       OR NEW.consent_reference <> OLD.consent_reference THEN
      RAISE EXCEPTION 'guardian_text_authorization_identity_immutable'
        USING ERRCODE = '42501';
    END IF;
    IF OLD.state = 'withdrawn' THEN
      RAISE EXCEPTION 'guardian_text_authorization_already_withdrawn'
        USING ERRCODE = '42501';
    END IF;
    IF OLD.state = 'declined' AND NEW.state <> 'declined' THEN
      RAISE EXCEPTION 'guardian_text_authorization_new_receipt_required'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF NEW.state = 'granted' THEN
    NEW.granted_at := COALESCE(NEW.granted_at, pg_catalog.clock_timestamp());
    NEW.withdrawn_at := NULL;
  ELSIF NEW.state = 'declined' THEN
    NEW.granted_at := NULL;
    NEW.withdrawn_at := NULL;
  ELSIF NEW.state = 'withdrawn' THEN
    NEW.withdrawn_at := COALESCE(NEW.withdrawn_at, pg_catalog.clock_timestamp());
  END IF;

  RETURN NEW;
END;
$$;

ALTER TABLE feedback_consent.guardian_text_policy_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE feedback_consent.guardian_text_policy_versions
  FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER feedback_guardian_text_policy_touch_updated_at
BEFORE UPDATE ON feedback_consent.guardian_text_policy_versions
FOR EACH ROW EXECUTE FUNCTION feedback_core.touch_updated_at();

CREATE OR REPLACE FUNCTION feedback_consent.validate_guardian_text_policy_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.status = 'retired' AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'guardian_feedback_text_policy_retired_immutable'
      USING ERRCODE = '42501';
  END IF;

  IF OLD.status = 'active' THEN
    IF NEW.jurisdiction <> OLD.jurisdiction
       OR NEW.policy_reference <> OLD.policy_reference
       OR NEW.scope <> OLD.scope
       OR NEW.consent_version <> OLD.consent_version
       OR NEW.guardian_notice_hash <> OLD.guardian_notice_hash
       OR NEW.athlete_notice_hash <> OLD.athlete_notice_hash
       OR NEW.raw_text_retention_days <> OLD.raw_text_retention_days
       OR NEW.processor_mode <> OLD.processor_mode
       OR NEW.processor_reference IS DISTINCT FROM OLD.processor_reference
       OR NEW.effective_from IS DISTINCT FROM OLD.effective_from
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'guardian_feedback_text_active_policy_immutable'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.status <> 'retired' THEN
      RAISE EXCEPTION 'guardian_feedback_text_policy_must_retire'
        USING ERRCODE = '42501';
    END IF;
  ELSIF OLD.status = 'draft' AND NEW.status NOT IN ('draft', 'active') THEN
    RAISE EXCEPTION 'guardian_feedback_text_policy_invalid_transition'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER feedback_guardian_text_policy_validate_transition
BEFORE UPDATE ON feedback_consent.guardian_text_policy_versions
FOR EACH ROW EXECUTE FUNCTION feedback_consent.validate_guardian_text_policy_transition();

CREATE OR REPLACE FUNCTION feedback_consent.guardian_text_policy_ready(
  _jurisdiction text DEFAULT 'DE'
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE((
    SELECT settings.text_collection_enabled
      AND settings.privacy_notice_ready
      AND settings.app_store_declaration_ready
      AND settings.minor_policy_ready
      AND feedback_core.jurisdiction_policy_ready(_jurisdiction, true)
      AND EXISTS (
        SELECT 1
        FROM feedback_consent.guardian_text_policy_versions policy
        WHERE policy.jurisdiction = _jurisdiction
          AND policy.status = 'active'
          AND policy.effective_from <= pg_catalog.clock_timestamp()
      )
    FROM feedback_core.system_settings settings
    WHERE settings.singleton
  ), false)
$$;

CREATE OR REPLACE FUNCTION feedback_consent.current_guardian_text_policy(
  _jurisdiction text DEFAULT 'DE'
)
RETURNS feedback_consent.guardian_text_policy_versions
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result feedback_consent.guardian_text_policy_versions%ROWTYPE;
BEGIN
  IF NOT feedback_consent.guardian_text_policy_ready(_jurisdiction) THEN
    RETURN NULL;
  END IF;

  SELECT policy.*
  INTO result
  FROM feedback_consent.guardian_text_policy_versions policy
  WHERE policy.jurisdiction = _jurisdiction
    AND policy.status = 'active'
    AND policy.effective_from <= pg_catalog.clock_timestamp()
  ORDER BY policy.effective_from DESC
  LIMIT 1;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.guardian_feedback_text_decision_status(
  _token_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  challenge minor_auth.guardian_challenges%ROWTYPE;
  participant minor_auth.participant_authorizations%ROWTYPE;
  policy feedback_consent.guardian_text_policy_versions%ROWTYPE;
BEGIN
  IF COALESCE(_token_hash, '') !~ '^[a-f0-9]{64}$' THEN
    RETURN pg_catalog.jsonb_build_object('available', false, 'state', 'invalid');
  END IF;

  SELECT row.* INTO challenge
  FROM minor_auth.guardian_challenges row
  WHERE row.token_hash = _token_hash
  FOR KEY SHARE;

  IF challenge.id IS NULL OR challenge.status <> 'pending' OR challenge.expires_at <= pg_catalog.clock_timestamp() THEN
    RETURN pg_catalog.jsonb_build_object('available', false, 'state', 'invalid');
  END IF;

  SELECT row.* INTO participant
  FROM minor_auth.participant_authorizations row
  WHERE row.user_id = challenge.user_id
  FOR KEY SHARE;

  policy := feedback_consent.current_guardian_text_policy('DE');
  IF participant.user_id IS NULL OR participant.age_band <> 'under_16' OR policy.id IS NULL THEN
    RETURN pg_catalog.jsonb_build_object('available', false, 'state', 'unavailable');
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'available', true,
    'state', 'not_asked',
    'policy_reference', policy.policy_reference,
    'consent_version', policy.consent_version,
    'raw_text_retention_days', policy.raw_text_retention_days,
    'processor_mode', policy.processor_mode
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.guardian_feedback_text_decide(
  _payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  product_authorized boolean;
  feedback_text_authorized boolean;
  base_result jsonb;
  actor_id uuid;
  policy feedback_consent.guardian_text_policy_versions%ROWTYPE;
  guardian_receipt feedback_consent.guardian_text_authorizations%ROWTYPE;
BEGIN
  IF pg_catalog.jsonb_typeof(_payload -> 'product_authorized') <> 'boolean'
     OR pg_catalog.jsonb_typeof(_payload -> 'data_contribution_authorized') <> 'boolean'
     OR pg_catalog.jsonb_typeof(_payload -> 'feedback_text_authorized') <> 'boolean'
     OR (_payload ->> 'guardian_declaration')::boolean IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'invalid_guardian_feedback_decision' USING ERRCODE = '22023';
  END IF;

  product_authorized := (_payload ->> 'product_authorized')::boolean;
  feedback_text_authorized := (_payload ->> 'feedback_text_authorized')::boolean;

  IF feedback_text_authorized AND NOT product_authorized THEN
    RAISE EXCEPTION 'guardian_feedback_text_requires_product_access' USING ERRCODE = '22023';
  END IF;

  IF feedback_text_authorized AND NOT feedback_consent.guardian_text_policy_ready('DE') THEN
    RAISE EXCEPTION 'guardian_feedback_text_policy_not_ready' USING ERRCODE = '42501';
  END IF;

  base_result := public.minor_service_action('guardian_decide', NULL, _payload);
  actor_id := NULLIF(base_result ->> 'user_id', '')::uuid;

  IF product_authorized THEN
    policy := feedback_consent.current_guardian_text_policy('DE');
    IF feedback_text_authorized AND policy.id IS NULL THEN
      RAISE EXCEPTION 'guardian_feedback_text_policy_not_ready' USING ERRCODE = '42501';
    END IF;
    IF policy.id IS NOT NULL THEN
      INSERT INTO feedback_consent.guardian_text_authorizations(
        user_id, scope, consent_version, notice_hash, guardian_notice_hash, state,
        granted_at, policy_reference
      ) VALUES (
        actor_id,
        policy.scope,
        policy.consent_version,
        policy.athlete_notice_hash,
        policy.guardian_notice_hash,
        CASE WHEN feedback_text_authorized THEN 'granted' ELSE 'declined' END,
        CASE WHEN feedback_text_authorized THEN pg_catalog.clock_timestamp() ELSE NULL END,
        policy.policy_reference
      )
      RETURNING * INTO guardian_receipt;

      INSERT INTO feedback_consent.audit_events(
        user_id, consent_reference, actor_type, event_type,
        scope, consent_version, notice_hash
      ) VALUES (
        actor_id,
        guardian_receipt.consent_reference,
        'guardian',
        CASE WHEN feedback_text_authorized
          THEN 'guardian_text_scope_granted'
          ELSE 'guardian_text_scope_declined'
        END,
        guardian_receipt.scope,
        guardian_receipt.consent_version,
        guardian_receipt.notice_hash
      );
    END IF;
  END IF;

  RETURN base_result || pg_catalog.jsonb_build_object(
    'feedback_text_authorization_state', CASE
      WHEN guardian_receipt.id IS NULL THEN 'unavailable'
      ELSE guardian_receipt.state
    END,
    'feedback_text_consent_reference', guardian_receipt.consent_reference
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.guardian_feedback_text_management_status(
  _token_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  access_token minor_auth.guardian_access_tokens%ROWTYPE;
  participant minor_auth.participant_authorizations%ROWTYPE;
  policy feedback_consent.guardian_text_policy_versions%ROWTYPE;
  guardian_receipt feedback_consent.guardian_text_authorizations%ROWTYPE;
BEGIN
  IF COALESCE(_token_hash, '') !~ '^[a-f0-9]{64}$' THEN
    RETURN pg_catalog.jsonb_build_object('available', false, 'state', 'invalid');
  END IF;

  SELECT row.* INTO access_token
  FROM minor_auth.guardian_access_tokens row
  WHERE row.token_hash = _token_hash
  FOR KEY SHARE;

  IF access_token.id IS NULL
     OR access_token.revoked_at IS NOT NULL
     OR access_token.consumed_at IS NOT NULL
     OR access_token.expires_at <= pg_catalog.clock_timestamp() THEN
    RETURN pg_catalog.jsonb_build_object('available', false, 'state', 'invalid');
  END IF;

  SELECT row.* INTO participant
  FROM minor_auth.participant_authorizations row
  WHERE row.user_id = access_token.user_id
  FOR KEY SHARE;

  IF participant.user_id IS NULL OR participant.age_band <> 'under_16' THEN
    RETURN pg_catalog.jsonb_build_object('available', false, 'state', 'invalid');
  END IF;

  policy := feedback_consent.current_guardian_text_policy('DE');

  SELECT row.* INTO guardian_receipt
  FROM feedback_consent.guardian_text_authorizations row
  WHERE row.user_id = access_token.user_id
  ORDER BY row.created_at DESC
  LIMIT 1;

  RETURN pg_catalog.jsonb_build_object(
    'available', policy.id IS NOT NULL,
    'state', COALESCE(guardian_receipt.state, 'not_asked'),
    'consent_reference', guardian_receipt.consent_reference,
    'policy_reference', policy.policy_reference,
    'raw_text_retention_days', policy.raw_text_retention_days,
    'processor_mode', policy.processor_mode
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.guardian_feedback_text_management_decide(
  _token_hash text,
  _authorized boolean
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  access_token minor_auth.guardian_access_tokens%ROWTYPE;
  participant minor_auth.participant_authorizations%ROWTYPE;
  policy feedback_consent.guardian_text_policy_versions%ROWTYPE;
  guardian_receipt feedback_consent.guardian_text_authorizations%ROWTYPE;
BEGIN
  IF COALESCE(_token_hash, '') !~ '^[a-f0-9]{64}$' OR _authorized IS NULL THEN
    RAISE EXCEPTION 'guardian_management_token_invalid' USING ERRCODE = '42501';
  END IF;

  SELECT row.* INTO access_token
  FROM minor_auth.guardian_access_tokens row
  WHERE row.token_hash = _token_hash
  FOR UPDATE;

  IF access_token.id IS NULL
     OR access_token.revoked_at IS NOT NULL
     OR access_token.consumed_at IS NOT NULL
     OR access_token.expires_at <= pg_catalog.clock_timestamp() THEN
    RAISE EXCEPTION 'guardian_management_token_invalid' USING ERRCODE = '42501';
  END IF;

  SELECT row.* INTO participant
  FROM minor_auth.participant_authorizations row
  WHERE row.user_id = access_token.user_id
  FOR UPDATE;

  IF participant.user_id IS NULL
     OR participant.age_band <> 'under_16'
     OR participant.guardian_status <> 'authorized'
     OR participant.product_status NOT IN ('pending', 'authorized') THEN
    RAISE EXCEPTION 'guardian_authorization_not_found' USING ERRCODE = '42501';
  END IF;

  IF NOT _authorized THEN
    PERFORM pg_catalog.set_config('app.feedback_consent_actor', 'guardian', true);
    UPDATE feedback_consent.guardian_text_authorizations row
    SET state = 'withdrawn', withdrawn_at = pg_catalog.clock_timestamp()
    WHERE row.user_id = access_token.user_id
      AND row.state = 'granted'
      AND row.withdrawn_at IS NULL;
    RETURN public.guardian_feedback_text_management_status(_token_hash);
  END IF;

  policy := feedback_consent.current_guardian_text_policy('DE');
  IF policy.id IS NULL THEN
    RAISE EXCEPTION 'guardian_feedback_text_policy_not_ready' USING ERRCODE = '42501';
  END IF;

  SELECT row.* INTO guardian_receipt
  FROM feedback_consent.guardian_text_authorizations row
  WHERE row.user_id = access_token.user_id
    AND row.scope = policy.scope
    AND row.consent_version = policy.consent_version
    AND row.notice_hash = policy.athlete_notice_hash
    AND row.guardian_notice_hash = policy.guardian_notice_hash
    AND row.state = 'granted'
    AND row.withdrawn_at IS NULL
  FOR UPDATE;

  IF guardian_receipt.id IS NULL THEN
    INSERT INTO feedback_consent.guardian_text_authorizations(
      user_id, scope, consent_version, notice_hash, guardian_notice_hash, state,
      granted_at, policy_reference
    ) VALUES (
      access_token.user_id,
      policy.scope,
      policy.consent_version,
      policy.athlete_notice_hash,
      policy.guardian_notice_hash,
      'granted',
      pg_catalog.clock_timestamp(),
      policy.policy_reference
    ) RETURNING * INTO guardian_receipt;

    INSERT INTO feedback_consent.audit_events(
      user_id, consent_reference, actor_type, event_type,
      scope, consent_version, notice_hash
    ) VALUES (
      guardian_receipt.user_id,
      guardian_receipt.consent_reference,
      'guardian',
      'guardian_text_scope_granted',
      guardian_receipt.scope,
      guardian_receipt.consent_version,
      guardian_receipt.notice_hash
    );
  END IF;

  RETURN public.guardian_feedback_text_management_status(_token_hash);
END;
$$;

CREATE OR REPLACE FUNCTION feedback_consent.withdraw_guardian_text_on_product_close()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.age_band = 'under_16'
     AND (NEW.guardian_status IN ('declined', 'revoked') OR NEW.product_status IN ('declined', 'revoked'))
     AND (OLD.guardian_status, OLD.product_status) IS DISTINCT FROM (NEW.guardian_status, NEW.product_status) THEN
    PERFORM pg_catalog.set_config('app.feedback_consent_actor', 'guardian', true);
    UPDATE feedback_consent.guardian_text_authorizations row
    SET state = 'withdrawn', withdrawn_at = pg_catalog.clock_timestamp()
    WHERE row.user_id = NEW.user_id
      AND row.state = 'granted'
      AND row.withdrawn_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER minor_guardian_feedback_text_close_with_product
AFTER UPDATE OF guardian_status, product_status
ON minor_auth.participant_authorizations
FOR EACH ROW EXECUTE FUNCTION feedback_consent.withdraw_guardian_text_on_product_close();

CREATE OR REPLACE FUNCTION feedback_consent.withdraw_guardian_text_on_policy_retire()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.status = 'active' AND NEW.status = 'retired' THEN
    PERFORM pg_catalog.set_config('app.feedback_consent_actor', 'system', true);
    UPDATE feedback_consent.guardian_text_authorizations row
    SET state = 'withdrawn', withdrawn_at = pg_catalog.clock_timestamp()
    WHERE row.policy_reference = OLD.policy_reference
      AND row.state = 'granted'
      AND row.withdrawn_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER feedback_guardian_text_close_on_policy_retire
AFTER UPDATE OF status ON feedback_consent.guardian_text_policy_versions
FOR EACH ROW EXECUTE FUNCTION feedback_consent.withdraw_guardian_text_on_policy_retire();

CREATE OR REPLACE FUNCTION feedback_consent.cleanup_withdrawn_guardian_text()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.state = 'granted' AND NEW.state = 'withdrawn' THEN
    PERFORM pg_catalog.set_config('app.feedback_consent_actor', 'guardian', true);
    UPDATE feedback_consent.text_consent_receipts receipt
    SET state = 'withdrawn',
        withdrawn_at = COALESCE(NEW.withdrawn_at, pg_catalog.clock_timestamp())
    WHERE receipt.guardian_authorization_reference = NEW.consent_reference
      AND receipt.state = 'granted';

    INSERT INTO feedback_consent.audit_events(
      user_id, consent_reference, actor_type, event_type,
      scope, consent_version, notice_hash
    ) VALUES (
      NEW.user_id, NEW.consent_reference, 'guardian',
      'guardian_text_scope_withdrawn', NEW.scope, NEW.consent_version, NEW.notice_hash
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION feedback_consent.cleanup_withdrawn_text()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  raw_count integer := 0;
  artifact_count integer := 0;
  cleanup_actor text := COALESCE(
    NULLIF(pg_catalog.current_setting('app.feedback_consent_actor', true), ''),
    'athlete'
  );
BEGIN
  IF cleanup_actor NOT IN ('athlete', 'guardian', 'system', 'support') THEN
    cleanup_actor := 'system';
  END IF;

  IF OLD.state = 'granted' AND NEW.state = 'withdrawn' THEN
    SELECT COUNT(*)::integer INTO artifact_count
    FROM feedback_analysis.comment_artifacts artifact
    INNER JOIN feedback_raw.comments comment ON comment.id = artifact.comment_id
    WHERE comment.consent_receipt_id = NEW.id;

    SELECT COUNT(*)::integer INTO raw_count
    FROM feedback_raw.comments comment
    WHERE comment.consent_receipt_id = NEW.id;

    DELETE FROM feedback_raw.comments comment
    WHERE comment.consent_receipt_id = NEW.id;

    IF raw_count > 0 THEN
      INSERT INTO feedback_consent.audit_events(
        user_id, submission_id, consent_reference, actor_type, event_type,
        scope, consent_version, notice_hash
      ) VALUES (
        NEW.user_id, NEW.submission_id, NEW.consent_reference, cleanup_actor,
        'raw_text_deleted', NEW.scope, NEW.consent_version, NEW.notice_hash
      );
    END IF;

    IF artifact_count > 0 THEN
      INSERT INTO feedback_consent.audit_events(
        user_id, submission_id, consent_reference, actor_type, event_type,
        scope, consent_version, notice_hash
      ) VALUES (
        NEW.user_id, NEW.submission_id, NEW.consent_reference, cleanup_actor,
        'attributable_artifacts_deleted', NEW.scope, NEW.consent_version, NEW.notice_hash
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION feedback_consent.cleanup_expired_text()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  affected integer := 0;
BEGIN
  PERFORM pg_catalog.set_config('app.feedback_consent_actor', 'system', true);
  UPDATE feedback_consent.text_consent_receipts receipt
  SET state = 'withdrawn',
      withdrawn_at = pg_catalog.clock_timestamp()
  FROM feedback_consent.guardian_text_policy_versions policy
  WHERE receipt.state = 'granted'
    AND receipt.scope = policy.scope
    AND receipt.consent_version = policy.consent_version
    AND receipt.notice_hash = policy.athlete_notice_hash
    AND receipt.granted_at < pg_catalog.clock_timestamp()
      - pg_catalog.make_interval(days => policy.raw_text_retention_days);
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

REVOKE ALL ON TABLE feedback_consent.guardian_text_policy_versions
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION feedback_consent.guardian_text_policy_ready(text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION feedback_consent.current_guardian_text_policy(text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION feedback_consent.validate_guardian_text_policy_transition()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION feedback_consent.validate_guardian_text_authorization()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION feedback_consent.withdraw_guardian_text_on_product_close()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION feedback_consent.withdraw_guardian_text_on_policy_retire()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION feedback_consent.cleanup_withdrawn_guardian_text()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION feedback_consent.cleanup_withdrawn_text()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION feedback_consent.cleanup_expired_text()
  FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.guardian_feedback_text_decision_status(text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.guardian_feedback_text_decide(jsonb)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.guardian_feedback_text_management_status(text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.guardian_feedback_text_management_decide(text, boolean)
  FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.guardian_feedback_text_decision_status(text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.guardian_feedback_text_decide(jsonb)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.guardian_feedback_text_management_status(text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.guardian_feedback_text_management_decide(text, boolean)
  TO service_role;

SELECT cron.schedule(
  'feedback-text-retention-daily',
  '41 3 * * *',
  'SELECT feedback_consent.cleanup_expired_text();'
);

COMMENT ON TABLE feedback_consent.guardian_text_policy_versions IS
  'Versioned DE guardian notice and retention contract for optional, explicitly labelled product-feedback comments. Draft rows never enable UI or collection.';
COMMENT ON FUNCTION public.guardian_feedback_text_decide(jsonb) IS
  'Service-role-only atomic wrapper: stores the existing guardian product decision and, only when the independent feedback policy is ready, the separate guardian feedback-text decision.';
COMMENT ON FUNCTION public.guardian_feedback_text_management_decide(text, boolean) IS
  'Service-role-only guardian grant or withdrawal for optional product-feedback text. Withdrawal remains available even while collection gates are closed.';

COMMIT;
