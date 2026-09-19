BEGIN;

-- Versioned guardian copy and pilot authorization. Existing decisions remain
-- auditable but are never silently reused for the expanded pilot scope.
UPDATE minor_auth.policy_versions
SET status = 'retired', retired_at = now()
WHERE jurisdiction = 'DE'
  AND status = 'active'
  AND policy_key <> 'de_minor_product_v2_2026_07';

INSERT INTO minor_auth.policy_versions(
  policy_key,
  jurisdiction,
  product_version,
  guardian_notice_version,
  guardian_decision_version,
  athlete_assent_version,
  data_contribution_version,
  content_hash,
  effective_from,
  status
)
VALUES (
  'de_minor_product_v2_2026_07',
  'DE',
  'minor_product_v1_2026_07',
  'guardian_notice_v2_2026_07',
  'guardian_decision_v2_2026_07',
  'athlete_assent_v2_2026_07',
  'data_contribution_v3_2026_07',
  '7b722f4ef844bcc8bba0a0feaf86a0f2c7e60039b33f4f9381c884e37d0f075d',
  '2026-07-19 00:00:00+00',
  'active'
)
ON CONFLICT (policy_key) DO UPDATE
SET product_version = EXCLUDED.product_version,
    guardian_notice_version = EXCLUDED.guardian_notice_version,
    guardian_decision_version = EXCLUDED.guardian_decision_version,
    athlete_assent_version = EXCLUDED.athlete_assent_version,
    data_contribution_version = EXCLUDED.data_contribution_version,
    content_hash = EXCLUDED.content_hash,
    effective_from = EXCLUDED.effective_from,
    retired_at = NULL,
    status = 'active';

-- The old protocol remains as immutable history but no longer accepts new
-- writes. V2 explicitly binds minor collection to the new receipt versions.
UPDATE public.evidence_protocols
SET status = 'retired'
WHERE version = '56d-transfer-v1-2026-07'
  AND status = 'pilot';

INSERT INTO public.evidence_protocols(
  version,
  status,
  program_days,
  required_consent_version,
  athlete_collection_enabled,
  coach_collection_enabled,
  minor_collection_enabled,
  required_guardian_consent_version,
  required_athlete_assent_version
)
VALUES (
  '56d-transfer-v2-2026-07',
  'pilot',
  56,
  'data_contribution_v3_2026_07',
  true,
  true,
  true,
  'guardian_decision_v2_2026_07',
  'athlete_assent_v2_2026_07'
)
ON CONFLICT (version) DO NOTHING;

INSERT INTO public.evidence_transfer_schedule(
  protocol_version,
  day_number,
  domain_id,
  replaces_optional_reflection,
  target_seconds
)
SELECT
  '56d-transfer-v2-2026-07',
  source.day_number,
  source.domain_id,
  source.replaces_optional_reflection,
  source.target_seconds
FROM public.evidence_transfer_schedule source
WHERE source.protocol_version = '56d-transfer-v1-2026-07'
ON CONFLICT (protocol_version, day_number) DO NOTHING;

-- A 16/17-year-old can authorize the pilot without a guardian in the German
-- flow. Under 16 retains the dual guardian-plus-athlete state.
ALTER TABLE public.evidence_participation_eligibility
  DROP CONSTRAINT IF EXISTS evidence_participation_eligibility_status_check;
ALTER TABLE public.evidence_participation_eligibility
  DROP CONSTRAINT IF EXISTS evidence_participation_eligibility_verification_basis_check;
ALTER TABLE public.evidence_participation_eligibility
  DROP CONSTRAINT IF EXISTS evidence_participation_eligibility_check;

ALTER TABLE public.evidence_participation_eligibility
  ADD CONSTRAINT evidence_participation_eligibility_status_v2_check
  CHECK (status IN ('adult_verified', 'minor_guardian_assent_verified', 'minor_self_assent_verified', 'revoked')),
  ADD CONSTRAINT evidence_participation_eligibility_basis_v2_check
  CHECK (
    verification_basis IN (
      'adult_status_confirmed_outside_app',
      'guardian_consent_and_athlete_assent_confirmed',
      'athlete_assent_confirmed_age_16_17'
    )
  ),
  ADD CONSTRAINT evidence_participation_eligibility_state_v2_check
  CHECK (
    (
      status = 'adult_verified'
      AND verification_basis = 'adult_status_confirmed_outside_app'
      AND guardian_consent_version IS NULL
      AND athlete_assent_version IS NULL
      AND verified_at IS NOT NULL
      AND revoked_at IS NULL
    )
    OR (
      status = 'minor_guardian_assent_verified'
      AND verification_basis = 'guardian_consent_and_athlete_assent_confirmed'
      AND guardian_consent_version IS NOT NULL
      AND athlete_assent_version IS NOT NULL
      AND verified_at IS NOT NULL
      AND revoked_at IS NULL
    )
    OR (
      status = 'minor_self_assent_verified'
      AND verification_basis = 'athlete_assent_confirmed_age_16_17'
      AND guardian_consent_version IS NULL
      AND athlete_assent_version IS NOT NULL
      AND verified_at IS NOT NULL
      AND revoked_at IS NULL
    )
    OR (status = 'revoked' AND revoked_at IS NOT NULL)
  );

ALTER TABLE public.evidence_eligibility_audit
  DROP CONSTRAINT IF EXISTS evidence_eligibility_audit_status_check;
ALTER TABLE public.evidence_eligibility_audit
  DROP CONSTRAINT IF EXISTS evidence_eligibility_audit_verification_basis_check;

ALTER TABLE public.evidence_eligibility_audit
  ADD CONSTRAINT evidence_eligibility_audit_status_v2_check
  CHECK (status IN ('adult_verified', 'minor_guardian_assent_verified', 'minor_self_assent_verified', 'revoked')),
  ADD CONSTRAINT evidence_eligibility_audit_basis_v2_check
  CHECK (
    verification_basis IN (
      'adult_status_confirmed_outside_app',
      'guardian_consent_and_athlete_assent_confirmed',
      'athlete_assent_confirmed_age_16_17'
    )
  );

CREATE OR REPLACE FUNCTION minor_auth.sync_evidence_eligibility(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  participant minor_auth.participant_authorizations;
  active_policy minor_auth.policy_versions;
  next_status text;
  next_basis text;
  next_guardian_version text;
BEGIN
  SELECT * INTO participant
  FROM minor_auth.participant_authorizations pa
  WHERE pa.user_id = _user_id;

  -- A minor authorization can only apply to the athlete's current active
  -- program instances. Revoke stale minor rows before any early return so an
  -- instance reassignment to an adult or unknown participant also fails closed.
  WITH changed AS (
    UPDATE public.evidence_participation_eligibility epe
    SET status = 'revoked',
        revoked_by = NULL,
        revoked_at = now()
    FROM public.program_instances pi
    WHERE epe.program_instance_id = pi.id
      AND pi.user_id = _user_id
      AND epe.status IN ('minor_guardian_assent_verified', 'minor_self_assent_verified')
      AND (
        participant.user_id IS NULL
        OR participant.age_band = 'adult'
        OR pi.status <> 'active'
      )
    RETURNING
      epe.program_instance_id,
      epe.status,
      epe.verification_basis,
      epe.guardian_consent_version,
      epe.athlete_assent_version
  )
  INSERT INTO public.evidence_eligibility_audit(
    program_instance_id,
    status,
    verification_basis,
    guardian_consent_version,
    athlete_assent_version,
    actor_id
  )
  SELECT
    changed.program_instance_id,
    changed.status,
    changed.verification_basis,
    changed.guardian_consent_version,
    changed.athlete_assent_version,
    NULL
  FROM changed;

  IF participant.user_id IS NULL OR participant.age_band = 'adult' THEN
    RETURN;
  END IF;

  SELECT * INTO active_policy
  FROM minor_auth.policy_versions pv
  WHERE pv.jurisdiction = 'DE' AND pv.status = 'active'
  ORDER BY pv.effective_from DESC
  LIMIT 1;

  IF participant.policy_id = active_policy.id
     AND participant.product_status = 'authorized'
     AND participant.athlete_status = 'authorized'
     AND participant.data_contribution_status = 'authorized'
     AND participant.data_contribution_athlete = true
     AND participant.revoked_at IS NULL
     AND (
       participant.age_band = 'age_16_17'
       OR (
         participant.age_band = 'under_16'
         AND participant.guardian_status = 'authorized'
         AND participant.data_contribution_guardian = true
       )
     ) THEN
    next_status := CASE
      WHEN participant.age_band = 'under_16' THEN 'minor_guardian_assent_verified'
      ELSE 'minor_self_assent_verified'
    END;
    next_basis := CASE
      WHEN participant.age_band = 'under_16' THEN 'guardian_consent_and_athlete_assent_confirmed'
      ELSE 'athlete_assent_confirmed_age_16_17'
    END;
    next_guardian_version := CASE
      WHEN participant.age_band = 'under_16' THEN active_policy.guardian_decision_version
      ELSE NULL
    END;

    WITH changed AS (
      INSERT INTO public.evidence_participation_eligibility(
        program_instance_id,
        status,
        verification_basis,
        guardian_consent_version,
        athlete_assent_version,
        verified_by,
        verified_at,
        revoked_by,
        revoked_at
      )
      SELECT
        pi.id,
        next_status,
        next_basis,
        next_guardian_version,
        active_policy.athlete_assent_version,
        NULL,
        now(),
        NULL,
        NULL
      FROM public.program_instances pi
      WHERE pi.user_id = _user_id
        AND pi.status = 'active'
      ON CONFLICT (program_instance_id) DO UPDATE
      SET status = EXCLUDED.status,
          verification_basis = EXCLUDED.verification_basis,
          guardian_consent_version = EXCLUDED.guardian_consent_version,
          athlete_assent_version = EXCLUDED.athlete_assent_version,
          verified_by = NULL,
          verified_at = now(),
          revoked_by = NULL,
          revoked_at = NULL
      WHERE public.evidence_participation_eligibility.status IS DISTINCT FROM EXCLUDED.status
         OR public.evidence_participation_eligibility.verification_basis IS DISTINCT FROM EXCLUDED.verification_basis
         OR public.evidence_participation_eligibility.guardian_consent_version IS DISTINCT FROM EXCLUDED.guardian_consent_version
         OR public.evidence_participation_eligibility.athlete_assent_version IS DISTINCT FROM EXCLUDED.athlete_assent_version
         OR public.evidence_participation_eligibility.revoked_at IS NOT NULL
      RETURNING
        program_instance_id,
        status,
        verification_basis,
        guardian_consent_version,
        athlete_assent_version
    )
    INSERT INTO public.evidence_eligibility_audit(
      program_instance_id,
      status,
      verification_basis,
      guardian_consent_version,
      athlete_assent_version,
      actor_id
    )
    SELECT
      changed.program_instance_id,
      changed.status,
      changed.verification_basis,
      changed.guardian_consent_version,
      changed.athlete_assent_version,
      NULL
    FROM changed;
  ELSE
    WITH changed AS (
      UPDATE public.evidence_participation_eligibility epe
      SET status = 'revoked',
          revoked_by = NULL,
          revoked_at = now()
      WHERE epe.program_instance_id IN (
        SELECT pi.id
        FROM public.program_instances pi
        WHERE pi.user_id = _user_id
      )
        AND epe.status <> 'revoked'
      RETURNING
        epe.program_instance_id,
        epe.status,
        epe.verification_basis,
        epe.guardian_consent_version,
        epe.athlete_assent_version
    )
    INSERT INTO public.evidence_eligibility_audit(
      program_instance_id,
      status,
      verification_basis,
      guardian_consent_version,
      athlete_assent_version,
      actor_id
    )
    SELECT
      changed.program_instance_id,
      changed.status,
      changed.verification_basis,
      changed.guardian_consent_version,
      changed.athlete_assent_version,
      NULL
    FROM changed;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION minor_auth.sync_evidence_after_authorization_change()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.data_contribution_status = 'authorized'
     AND NEW.data_contribution_status IN ('declined', 'revoked') THEN
    DELETE FROM public.athlete_transfer_observations ato
    WHERE ato.user_id = NEW.user_id;

    DELETE FROM public.coach_evidence_reviews cer
    WHERE cer.scope_type = 'athlete'
      AND cer.target_program_instance_id IN (
        SELECT pi.id
        FROM public.program_instances pi
        WHERE pi.user_id = NEW.user_id
      );
  END IF;

  PERFORM minor_auth.sync_evidence_eligibility(NEW.user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS minor_auth_sync_evidence ON minor_auth.participant_authorizations;
CREATE TRIGGER minor_auth_sync_evidence
AFTER INSERT OR UPDATE OF
  policy_id,
  age_band,
  guardian_status,
  athlete_status,
  product_status,
  data_contribution_guardian,
  data_contribution_athlete,
  data_contribution_status,
  revoked_at
ON minor_auth.participant_authorizations
FOR EACH ROW EXECUTE FUNCTION minor_auth.sync_evidence_after_authorization_change();

CREATE OR REPLACE FUNCTION minor_auth.sync_evidence_after_program_instance_change()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  PERFORM minor_auth.sync_evidence_eligibility(NEW.user_id);
  IF TG_OP = 'UPDATE' AND OLD.user_id IS DISTINCT FROM NEW.user_id THEN
    PERFORM minor_auth.sync_evidence_eligibility(OLD.user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS minor_auth_sync_new_program_instance ON public.program_instances;
CREATE TRIGGER minor_auth_sync_new_program_instance
AFTER INSERT OR UPDATE OF user_id, status ON public.program_instances
FOR EACH ROW EXECUTE FUNCTION minor_auth.sync_evidence_after_program_instance_change();

-- Evidence reads re-check the active participant receipt as well as the
-- profile consent and eligibility row. No single flag can authorize a minor.
CREATE OR REPLACE FUNCTION public.evidence_eligibility_reason(
  _program_instance_id uuid,
  _protocol_version text
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  target_instance public.program_instances;
  target_profile public.profiles;
  target_protocol public.evidence_protocols;
  eligibility_status text;
  eligibility_guardian_version text;
  eligibility_assent_version text;
  participant minor_auth.participant_authorizations;
  participant_policy minor_auth.policy_versions;
BEGIN
  SELECT * INTO target_instance
  FROM public.program_instances pi
  WHERE pi.id = _program_instance_id;

  IF target_instance.id IS NULL THEN
    RETURN 'program_instance_not_found';
  END IF;

  IF target_instance.status <> 'active' THEN
    RETURN 'program_inactive';
  END IF;

  SELECT * INTO target_protocol
  FROM public.evidence_protocols ep
  WHERE ep.version = _protocol_version;

  IF target_protocol.version IS NULL
     OR target_protocol.status <> 'pilot'
     OR NOT target_protocol.athlete_collection_enabled THEN
    RETURN 'protocol_disabled';
  END IF;

  SELECT * INTO target_profile
  FROM public.profiles p
  WHERE p.id = target_instance.user_id;

  IF COALESCE(target_profile.is_test_user, false)
     AND COALESCE(target_instance.is_test_instance, false) THEN
    RETURN 'eligible_test';
  END IF;

  IF COALESCE(target_profile.data_contribution_consent, false) = false THEN
    RETURN 'consent_required';
  END IF;

  IF target_profile.data_contribution_consent_version IS DISTINCT FROM target_protocol.required_consent_version
     OR target_profile.data_contribution_consented_at IS NULL THEN
    RETURN 'consent_version_outdated';
  END IF;

  SELECT
    epe.status,
    epe.guardian_consent_version,
    epe.athlete_assent_version
  INTO eligibility_status, eligibility_guardian_version, eligibility_assent_version
  FROM public.evidence_participation_eligibility epe
  WHERE epe.program_instance_id = target_instance.id;

  IF eligibility_status = 'adult_verified' THEN
    RETURN 'eligible';
  END IF;

  IF eligibility_status NOT IN ('minor_guardian_assent_verified', 'minor_self_assent_verified') THEN
    RETURN 'participation_authorization_required';
  END IF;

  IF NOT target_protocol.minor_collection_enabled THEN
    RETURN 'minor_participation_not_enabled';
  END IF;

  SELECT * INTO participant
  FROM minor_auth.participant_authorizations pa
  WHERE pa.user_id = target_instance.user_id;

  SELECT * INTO participant_policy
  FROM minor_auth.policy_versions pv
  WHERE pv.id = participant.policy_id
    AND pv.status = 'active';

  IF participant.user_id IS NULL
     OR participant_policy.id IS NULL
     OR participant.product_status <> 'authorized'
     OR participant.athlete_status <> 'authorized'
     OR participant.data_contribution_status <> 'authorized'
     OR participant.data_contribution_athlete IS DISTINCT FROM true
     OR participant.revoked_at IS NOT NULL THEN
    RETURN 'minor_authorization_required';
  END IF;

  IF participant_policy.data_contribution_version IS DISTINCT FROM target_protocol.required_consent_version
     OR participant_policy.athlete_assent_version IS DISTINCT FROM target_protocol.required_athlete_assent_version
     OR eligibility_assent_version IS DISTINCT FROM target_protocol.required_athlete_assent_version THEN
    RETURN 'minor_authorization_version_outdated';
  END IF;

  IF participant.age_band = 'under_16' THEN
    IF eligibility_status <> 'minor_guardian_assent_verified'
       OR participant.guardian_status <> 'authorized'
       OR participant.data_contribution_guardian IS DISTINCT FROM true
       OR target_protocol.required_guardian_consent_version IS NULL
       OR participant_policy.guardian_decision_version IS DISTINCT FROM target_protocol.required_guardian_consent_version
       OR eligibility_guardian_version IS DISTINCT FROM target_protocol.required_guardian_consent_version THEN
      RETURN 'minor_authorization_version_outdated';
    END IF;
    RETURN 'eligible_minor';
  END IF;

  IF participant.age_band = 'age_16_17' THEN
    IF eligibility_status <> 'minor_self_assent_verified'
       OR eligibility_guardian_version IS NOT NULL THEN
      RETURN 'minor_authorization_version_outdated';
    END IF;
    RETURN 'eligible_minor';
  END IF;

  RETURN 'minor_authorization_required';
END;
$$;

REVOKE ALL ON FUNCTION public.evidence_eligibility_reason(uuid, text)
  FROM PUBLIC, anon, authenticated;

-- Admin listing follows the runtime protocol instead of reporting the retired
-- V1 gate to operators.
CREATE OR REPLACE FUNCTION public.get_admin_evidence_eligibility(
  _include_test boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  actor_id uuid := auth.uid();
  result json;
BEGIN
  IF actor_id IS NULL OR NOT public.has_role(actor_id, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'admin_role_required';
  END IF;

  SELECT json_build_object(
    'generated_at', now(),
    'protocol_version', '56d-transfer-v2-2026-07',
    'stores_age_or_birthdate', false,
    'participants', COALESCE(json_agg(row_data ORDER BY full_name, program_started_at), '[]'::json)
  ) INTO result
  FROM (
    SELECT
      pi.id AS program_instance_id,
      pi.user_id,
      COALESCE(NULLIF(btrim(p.full_name), ''), 'Athlet ' || left(pi.user_id::text, 8)) AS full_name,
      p.sport,
      pi.started_at AS program_started_at,
      pi.status AS program_status,
      pi.team_id,
      t.name AS team_name,
      pi.program_run_id,
      pr.name AS program_run_name,
      COALESCE(p.is_test_user, false) OR COALESCE(pi.is_test_instance, false) AS is_test,
      epe.status AS verification_status,
      p.data_contribution_consent AS consent,
      p.data_contribution_consent_version AS consent_version,
      public.evidence_eligibility_reason(pi.id, '56d-transfer-v2-2026-07') AS eligibility_reason
    FROM public.program_instances pi
    JOIN public.profiles p ON p.id = pi.user_id
    JOIN public.user_roles ur ON ur.user_id = pi.user_id AND ur.role = 'athlete'::public.app_role
    LEFT JOIN public.teams t ON t.id = pi.team_id
    LEFT JOIN public.program_runs pr ON pr.id = pi.program_run_id
    LEFT JOIN public.evidence_participation_eligibility epe ON epe.program_instance_id = pi.id
    WHERE pi.status = 'active'
      AND (
        _include_test
        OR NOT (COALESCE(p.is_test_user, false) OR COALESCE(pi.is_test_instance, false))
      )
    ORDER BY COALESCE(NULLIF(btrim(p.full_name), ''), pi.user_id::text)
    LIMIT 500
  ) row_data;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_evidence_eligibility(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_evidence_eligibility(boolean) TO authenticated;

-- Keep the mature aggregate query and correct its protocol metadata through a
-- narrow wrapper, avoiding a duplicated 300-line analytics implementation.
ALTER FUNCTION public.get_performance_evidence_summary(uuid, boolean, text)
  RENAME TO get_performance_evidence_summary_v1_core;
REVOKE ALL ON FUNCTION public.get_performance_evidence_summary_v1_core(uuid, boolean, text)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_performance_evidence_summary(
  _program_run_id uuid DEFAULT NULL,
  _include_test boolean DEFAULT false,
  _protocol_version text DEFAULT '56d-transfer-v2-2026-07'
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  result jsonb;
  minor_enabled boolean;
BEGIN
  result := public.get_performance_evidence_summary_v1_core(
    _program_run_id,
    _include_test,
    _protocol_version
  )::jsonb;

  SELECT ep.minor_collection_enabled
  INTO minor_enabled
  FROM public.evidence_protocols ep
  WHERE ep.version = _protocol_version;

  RETURN jsonb_set(
    result,
    '{privacy,minor_collection_enabled}',
    to_jsonb(COALESCE(minor_enabled, false)),
    true
  )::json;
END;
$$;

REVOKE ALL ON FUNCTION public.get_performance_evidence_summary(uuid, boolean, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_performance_evidence_summary(uuid, boolean, text)
  TO authenticated;

-- The high-entropy one-time or management token is the authorization context.
-- Only the minimized first name is returned to the service-role Edge Function.
CREATE OR REPLACE FUNCTION public.minor_guardian_challenge_display_name(_token_hash text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT NULLIF(
    left(split_part(regexp_replace(btrim(p.full_name), E'\\s+', ' ', 'g'), ' ', 1), 40),
    ''
  )
  FROM minor_auth.guardian_challenges gc
  JOIN minor_auth.policy_versions pv ON pv.id = gc.policy_id
  JOIN public.profiles p ON p.id = gc.user_id
  WHERE _token_hash ~ '^[0-9a-f]{64}$'
    AND gc.token_hash = _token_hash
    AND gc.status = 'pending'
    AND gc.expires_at > now()
    AND pv.status = 'active'
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.minor_guardian_management_display_name(_token_hash text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT NULLIF(
    left(split_part(regexp_replace(btrim(p.full_name), E'\\s+', ' ', 'g'), ' ', 1), 40),
    ''
  )
  FROM minor_auth.guardian_access_tokens gat
  JOIN public.profiles p ON p.id = gat.user_id
  WHERE _token_hash ~ '^[0-9a-f]{64}$'
    AND gat.token_hash = _token_hash
    AND gat.consumed_at IS NULL
    AND gat.revoked_at IS NULL
    AND gat.expires_at > now()
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.minor_guardian_challenge_display_name(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.minor_guardian_challenge_display_name(text)
  TO service_role;
REVOKE ALL ON FUNCTION public.minor_guardian_management_display_name(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.minor_guardian_management_display_name(text)
  TO service_role;

REVOKE ALL ON FUNCTION minor_auth.sync_evidence_eligibility(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION minor_auth.sync_evidence_after_authorization_change()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION minor_auth.sync_evidence_after_program_instance_change()
  FROM PUBLIC, anon, authenticated;

-- Existing decisions are moved to a refresh state by the normal status call.
-- Evidence rows are revoked immediately at migration time so V1 can never
-- continue collecting while a participant has not accepted V2/V3.
DO $$
DECLARE
  participant record;
BEGIN
  FOR participant IN
    SELECT pa.user_id FROM minor_auth.participant_authorizations pa
  LOOP
    PERFORM minor_auth.sync_evidence_eligibility(participant.user_id);
  END LOOP;
END;
$$;

COMMENT ON FUNCTION minor_auth.sync_evidence_eligibility(uuid) IS
  'Synchronizes minor pilot eligibility from the active versioned guardian and athlete authorization receipt.';
COMMENT ON FUNCTION public.minor_guardian_challenge_display_name(text) IS
  'Returns a minimized participant first name only for a live guardian challenge; service-role only.';
COMMENT ON FUNCTION public.minor_guardian_management_display_name(text) IS
  'Returns a minimized participant first name only for a live guardian management token; service-role only.';
COMMENT ON TABLE public.evidence_participation_eligibility IS
  'Age-appropriate evidence gate: separately verified adults, dual authorization under 16, and self-assent at 16/17.';

COMMIT;
