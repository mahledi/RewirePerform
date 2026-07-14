BEGIN;

-- RewirePerform 56-day transfer evidence layer.
-- This migration deliberately stores no date of birth or age. Real users are
-- eligible only after current consent and an age-appropriate participation
-- authorization. Minor collection remains disabled in this protocol version.

CREATE TABLE public.evidence_protocols (
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

CREATE TABLE public.evidence_transfer_schedule (
  protocol_version text NOT NULL REFERENCES public.evidence_protocols(version) ON DELETE RESTRICT,
  day_number smallint NOT NULL CHECK (day_number BETWEEN 1 AND 56),
  domain_id text NOT NULL CHECK (
    domain_id IN (
      'attention_return',
      'error_recovery',
      'pressure_regulation',
      'process_execution',
      'action_under_uncertainty'
    )
  ),
  replaces_optional_reflection boolean NOT NULL DEFAULT true CHECK (replaces_optional_reflection),
  target_seconds smallint NOT NULL CHECK (target_seconds BETWEEN 1 AND 25),
  PRIMARY KEY (protocol_version, day_number)
);

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
  '56d-transfer-v1-2026-07',
  'pilot',
  56,
  'data_contribution_v2_2026_07',
  true,
  true,
  false,
  NULL,
  NULL
)
ON CONFLICT (version) DO NOTHING;

INSERT INTO public.evidence_transfer_schedule(
  protocol_version,
  day_number,
  domain_id,
  replaces_optional_reflection,
  target_seconds
)
VALUES
  ('56d-transfer-v1-2026-07', 4,  'attention_return',         true, 20),
  ('56d-transfer-v1-2026-07', 7,  'error_recovery',           true, 20),
  ('56d-transfer-v1-2026-07', 11, 'pressure_regulation',      true, 20),
  ('56d-transfer-v1-2026-07', 14, 'process_execution',        true, 20),
  ('56d-transfer-v1-2026-07', 18, 'action_under_uncertainty', true, 20),
  ('56d-transfer-v1-2026-07', 21, 'attention_return',         true, 20),
  ('56d-transfer-v1-2026-07', 25, 'error_recovery',           true, 20),
  ('56d-transfer-v1-2026-07', 28, 'pressure_regulation',      true, 20),
  ('56d-transfer-v1-2026-07', 32, 'process_execution',        true, 20),
  ('56d-transfer-v1-2026-07', 35, 'action_under_uncertainty', true, 20),
  ('56d-transfer-v1-2026-07', 39, 'attention_return',         true, 20),
  ('56d-transfer-v1-2026-07', 42, 'error_recovery',           true, 20),
  ('56d-transfer-v1-2026-07', 46, 'pressure_regulation',      true, 20),
  ('56d-transfer-v1-2026-07', 49, 'process_execution',        true, 20),
  ('56d-transfer-v1-2026-07', 53, 'action_under_uncertainty', true, 20),
  ('56d-transfer-v1-2026-07', 56, 'attention_return',         true, 20)
ON CONFLICT (protocol_version, day_number) DO NOTHING;

CREATE TABLE public.evidence_participation_eligibility (
  program_instance_id uuid PRIMARY KEY REFERENCES public.program_instances(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('adult_verified', 'minor_guardian_assent_verified', 'revoked')),
  verification_basis text NOT NULL DEFAULT 'adult_status_confirmed_outside_app'
    CHECK (
      verification_basis IN (
        'adult_status_confirmed_outside_app',
        'guardian_consent_and_athlete_assent_confirmed'
      )
    ),
  guardian_consent_version text,
  athlete_assent_version text,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  revoked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
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
    OR (status = 'revoked' AND revoked_at IS NOT NULL)
  )
);

CREATE TABLE public.evidence_eligibility_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_instance_id uuid NOT NULL REFERENCES public.program_instances(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('adult_verified', 'minor_guardian_assent_verified', 'revoked')),
  verification_basis text NOT NULL DEFAULT 'adult_status_confirmed_outside_app'
    CHECK (
      verification_basis IN (
        'adult_status_confirmed_outside_app',
        'guardian_consent_and_athlete_assent_confirmed'
      )
    ),
  guardian_consent_version text,
  athlete_assent_version text,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_evidence_eligibility_audit_instance
  ON public.evidence_eligibility_audit(program_instance_id, created_at DESC);

CREATE TABLE public.athlete_transfer_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_instance_id uuid NOT NULL REFERENCES public.program_instances(id) ON DELETE CASCADE,
  program_run_id uuid REFERENCES public.program_runs(id) ON DELETE SET NULL,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  assignment_id uuid NOT NULL REFERENCES public.user_day_assignments(id) ON DELETE CASCADE,
  protocol_version text NOT NULL REFERENCES public.evidence_protocols(version) ON DELETE RESTRICT,
  day_number smallint NOT NULL CHECK (day_number BETWEEN 1 AND 56),
  domain_id text NOT NULL CHECK (
    domain_id IN (
      'attention_return',
      'error_recovery',
      'pressure_regulation',
      'process_execution',
      'action_under_uncertainty'
    )
  ),
  event_type text NOT NULL CHECK (event_type IN ('training', 'competition')),
  score smallint CHECK (score BETWEEN 1 AND 4),
  not_observed boolean NOT NULL DEFAULT false,
  response_duration_ms integer CHECK (response_duration_ms BETWEEN 0 AND 900000),
  consent_version text NOT NULL,
  consented_at timestamptz NOT NULL,
  is_test boolean NOT NULL DEFAULT false,
  collected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (not_observed = true AND score IS NULL)
    OR (not_observed = false AND score IS NOT NULL)
  ),
  UNIQUE (user_id, program_instance_id, protocol_version, day_number)
);

CREATE INDEX idx_athlete_transfer_observations_instance
  ON public.athlete_transfer_observations(program_instance_id, day_number);
CREATE INDEX idx_athlete_transfer_observations_run
  ON public.athlete_transfer_observations(program_run_id, day_number)
  WHERE program_run_id IS NOT NULL;
CREATE INDEX idx_athlete_transfer_observations_solo
  ON public.athlete_transfer_observations(day_number, domain_id)
  WHERE program_run_id IS NULL AND team_id IS NULL;

CREATE TABLE public.coach_evidence_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope_type text NOT NULL CHECK (scope_type IN ('team', 'athlete')),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  program_run_id uuid NOT NULL REFERENCES public.program_runs(id) ON DELETE CASCADE,
  target_program_instance_id uuid REFERENCES public.program_instances(id) ON DELETE CASCADE,
  protocol_version text NOT NULL REFERENCES public.evidence_protocols(version) ON DELETE RESTRICT,
  week_number smallint NOT NULL CHECK (week_number BETWEEN 1 AND 8),
  observation_context text NOT NULL CHECK (observation_context IN ('training', 'competition', 'mixed')),
  observed_athlete_count smallint NOT NULL CHECK (observed_athlete_count >= 1),
  completion_duration_ms integer CHECK (completion_duration_ms BETWEEN 0 AND 900000),
  is_test boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (scope_type = 'team' AND target_program_instance_id IS NULL)
    OR (scope_type = 'athlete' AND target_program_instance_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX uniq_coach_evidence_team_review
  ON public.coach_evidence_reviews(coach_id, program_run_id, week_number)
  WHERE scope_type = 'team';
CREATE UNIQUE INDEX uniq_coach_evidence_athlete_review
  ON public.coach_evidence_reviews(coach_id, target_program_instance_id, week_number)
  WHERE scope_type = 'athlete';
CREATE INDEX idx_coach_evidence_reviews_run_week
  ON public.coach_evidence_reviews(program_run_id, week_number);

CREATE TABLE public.coach_evidence_observations (
  review_id uuid NOT NULL REFERENCES public.coach_evidence_reviews(id) ON DELETE CASCADE,
  domain_id text NOT NULL CHECK (
    domain_id IN (
      'attention_return',
      'error_recovery',
      'pressure_regulation',
      'process_execution',
      'action_under_uncertainty'
    )
  ),
  score smallint CHECK (score BETWEEN 1 AND 4),
  not_observed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (not_observed = true AND score IS NULL)
    OR (not_observed = false AND score IS NOT NULL)
  ),
  PRIMARY KEY (review_id, domain_id)
);

ALTER TABLE public.evidence_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_transfer_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_participation_eligibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_eligibility_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_transfer_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_evidence_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_evidence_observations ENABLE ROW LEVEL SECURITY;

-- No table is directly exposed to a browser role. All access is mediated by
-- the narrowly-scoped functions below, even if Data API defaults change.
REVOKE ALL ON TABLE public.evidence_protocols FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.evidence_transfer_schedule FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.evidence_participation_eligibility FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.evidence_eligibility_audit FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.athlete_transfer_observations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.coach_evidence_reviews FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.coach_evidence_observations FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.touch_evidence_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.touch_evidence_updated_at() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_touch_evidence_eligibility
  BEFORE UPDATE ON public.evidence_participation_eligibility
  FOR EACH ROW EXECUTE FUNCTION public.touch_evidence_updated_at();

CREATE TRIGGER trg_touch_coach_evidence_reviews
  BEFORE UPDATE ON public.coach_evidence_reviews
  FOR EACH ROW EXECUTE FUNCTION public.touch_evidence_updated_at();

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
BEGIN
  SELECT * INTO target_instance
  FROM public.program_instances pi
  WHERE pi.id = _program_instance_id;

  IF target_instance.id IS NULL THEN
    RETURN 'program_instance_not_found';
  END IF;

  SELECT * INTO target_protocol
  FROM public.evidence_protocols ep
  WHERE ep.version = _protocol_version;

  IF target_protocol.version IS NULL OR target_protocol.status <> 'pilot' OR NOT target_protocol.athlete_collection_enabled THEN
    RETURN 'protocol_disabled';
  END IF;

  SELECT * INTO target_profile
  FROM public.profiles p
  WHERE p.id = target_instance.user_id;

  IF COALESCE(target_profile.is_test_user, false) AND COALESCE(target_instance.is_test_instance, false) THEN
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

  IF eligibility_status = 'minor_guardian_assent_verified' THEN
    IF NOT target_protocol.minor_collection_enabled THEN
      RETURN 'minor_participation_not_enabled';
    END IF;
    IF target_protocol.required_guardian_consent_version IS NULL
       OR target_protocol.required_athlete_assent_version IS NULL
       OR eligibility_guardian_version IS DISTINCT FROM target_protocol.required_guardian_consent_version
       OR eligibility_assent_version IS DISTINCT FROM target_protocol.required_athlete_assent_version THEN
      RETURN 'minor_authorization_version_outdated';
    END IF;
    RETURN 'eligible_minor';
  END IF;

  RETURN 'participation_authorization_required';
END;
$$;

REVOKE ALL ON FUNCTION public.evidence_eligibility_reason(uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_evidence_status(
  _program_instance_id uuid,
  _protocol_version text,
  _day_number integer,
  _event_type text
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  actor_id uuid := auth.uid();
  owner_id uuid;
  scheduled_domain text;
  eligibility_reason text;
  existing_response text;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;

  IF _event_type NOT IN ('training', 'rest', 'competition') OR _day_number NOT BETWEEN 1 AND 56 THEN
    RAISE EXCEPTION 'invalid_evidence_status_request';
  END IF;

  SELECT pi.user_id INTO owner_id
  FROM public.program_instances pi
  WHERE pi.id = _program_instance_id;

  IF owner_id IS NULL OR owner_id <> actor_id THEN
    RAISE EXCEPTION 'program_instance_not_owned';
  END IF;

  IF _event_type = 'rest' THEN
    RETURN json_build_object(
      'eligible', false,
      'reason', 'not_scheduled',
      'protocol_version', _protocol_version,
      'domain_id', NULL,
      'existing_response', NULL,
      'locked', false
    );
  END IF;

  SELECT ets.domain_id INTO scheduled_domain
  FROM public.evidence_transfer_schedule ets
  WHERE ets.protocol_version = _protocol_version
    AND ets.day_number = _day_number;

  IF scheduled_domain IS NULL THEN
    RETURN json_build_object(
      'eligible', false,
      'reason', 'not_scheduled',
      'protocol_version', _protocol_version,
      'domain_id', NULL,
      'existing_response', NULL,
      'locked', false
    );
  END IF;

  eligibility_reason := public.evidence_eligibility_reason(_program_instance_id, _protocol_version);

  SELECT CASE
           WHEN ato.not_observed THEN 'not_observed'
           ELSE ato.score::text
         END
  INTO existing_response
  FROM public.athlete_transfer_observations ato
  WHERE ato.user_id = actor_id
    AND ato.program_instance_id = _program_instance_id
    AND ato.protocol_version = _protocol_version
    AND ato.day_number = _day_number;

  RETURN json_build_object(
    'eligible', eligibility_reason IN ('eligible', 'eligible_minor', 'eligible_test'),
    'reason', eligibility_reason,
    'protocol_version', _protocol_version,
    'domain_id', scheduled_domain,
    'existing_response', existing_response,
    'locked', existing_response IS NOT NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_evidence_status(uuid, text, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_evidence_status(uuid, text, integer, text) TO authenticated;

-- Extends the existing atomic daily transaction. If evidence validation fails,
-- check-in, completion, comprehension and evidence all roll back together.
CREATE OR REPLACE FUNCTION public.save_daily_tracking_v3(
  _assignment_id uuid,
  _date date,
  _event_type text,
  _day_number integer,
  _variant_used text,
  _program_instance_id uuid,
  _tasks_completed jsonb DEFAULT '[]'::jsonb,
  _reflection text DEFAULT NULL,
  _mood_before integer DEFAULT NULL,
  _energy_level integer DEFAULT NULL,
  _focus_rating integer DEFAULT NULL,
  _stress integer DEFAULT NULL,
  _recovery integer DEFAULT NULL,
  _sleep_quality integer DEFAULT NULL,
  _physical_readiness integer DEFAULT NULL,
  _motivation integer DEFAULT NULL,
  _pressure integer DEFAULT NULL,
  _team_connection integer DEFAULT NULL,
  _comprehension_questions jsonb DEFAULT NULL,
  _comprehension_results jsonb DEFAULT NULL,
  _evidence_protocol_version text DEFAULT NULL,
  _evidence_domain_id text DEFAULT NULL,
  _evidence_response text DEFAULT NULL,
  _evidence_response_duration_ms integer DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  actor_id uuid := auth.uid();
  base_result json;
  target_instance public.program_instances;
  target_profile public.profiles;
  scheduled_domain text;
  eligibility_reason text;
  evidence_id uuid;
  existing_observation public.athlete_transfer_observations;
  existing_response text;
  parsed_score smallint;
  parsed_not_observed boolean := false;
BEGIN
  base_result := public.save_daily_tracking_v2(
    _assignment_id,
    _date,
    _event_type,
    _day_number,
    _variant_used,
    _program_instance_id,
    _tasks_completed,
    _reflection,
    _mood_before,
    _energy_level,
    _focus_rating,
    _stress,
    _recovery,
    _sleep_quality,
    _physical_readiness,
    _motivation,
    _pressure,
    _team_connection,
    _comprehension_questions,
    _comprehension_results
  );

  IF _evidence_protocol_version IS NULL
     AND _evidence_domain_id IS NULL
     AND _evidence_response IS NULL
     AND _evidence_response_duration_ms IS NULL THEN
    RETURN base_result;
  END IF;

  IF _evidence_protocol_version IS NULL
     OR _evidence_domain_id IS NULL
     OR _evidence_response IS NULL THEN
    RAISE EXCEPTION 'incomplete_evidence_payload';
  END IF;

  IF _event_type = 'rest' THEN
    RAISE EXCEPTION 'evidence_not_allowed_on_rest_day';
  END IF;

  IF NULLIF(btrim(COALESCE(_reflection, '')), '') IS NOT NULL THEN
    RAISE EXCEPTION 'evidence_replaces_optional_reflection';
  END IF;

  SELECT * INTO target_instance
  FROM public.program_instances pi
  WHERE pi.id = _program_instance_id AND pi.user_id = actor_id
  FOR SHARE;

  IF target_instance.id IS NULL THEN
    RAISE EXCEPTION 'program_instance_not_owned';
  END IF;

  SELECT * INTO target_profile
  FROM public.profiles p
  WHERE p.id = actor_id
  FOR SHARE;

  IF target_profile.id IS NULL THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  -- Keep authorization stable until this transaction commits. A concurrent
  -- consent or participation revocation then wins before or after this save,
  -- never halfway through it.
  PERFORM 1
  FROM public.evidence_participation_eligibility epe
  WHERE epe.program_instance_id = target_instance.id
  FOR SHARE;

  SELECT ets.domain_id INTO scheduled_domain
  FROM public.evidence_transfer_schedule ets
  WHERE ets.protocol_version = _evidence_protocol_version
    AND ets.day_number = _day_number;

  IF scheduled_domain IS NULL OR scheduled_domain <> _evidence_domain_id THEN
    RAISE EXCEPTION 'evidence_schedule_mismatch';
  END IF;

  eligibility_reason := public.evidence_eligibility_reason(_program_instance_id, _evidence_protocol_version);
  IF eligibility_reason NOT IN ('eligible', 'eligible_minor', 'eligible_test') THEN
    RAISE EXCEPTION 'evidence_not_eligible:%', eligibility_reason;
  END IF;

  IF _evidence_response = 'not_observed' THEN
    parsed_not_observed := true;
    parsed_score := NULL;
  ELSIF _evidence_response IN ('1', '2', '3', '4') THEN
    parsed_score := _evidence_response::smallint;
  ELSE
    RAISE EXCEPTION 'invalid_evidence_response';
  END IF;

  IF _evidence_response_duration_ms IS NOT NULL
     AND _evidence_response_duration_ms NOT BETWEEN 0 AND 900000 THEN
    RAISE EXCEPTION 'invalid_evidence_response_duration';
  END IF;

  SELECT * INTO existing_observation
  FROM public.athlete_transfer_observations ato
  WHERE ato.user_id = actor_id
    AND ato.program_instance_id = _program_instance_id
    AND ato.protocol_version = _evidence_protocol_version
    AND ato.day_number = _day_number
  FOR UPDATE;

  IF existing_observation.id IS NOT NULL THEN
    existing_response := CASE
      WHEN existing_observation.not_observed THEN 'not_observed'
      ELSE existing_observation.score::text
    END;
    IF existing_response <> _evidence_response THEN
      RAISE EXCEPTION 'evidence_observation_already_locked';
    END IF;
    evidence_id := existing_observation.id;
  ELSE
    INSERT INTO public.athlete_transfer_observations(
      user_id,
      program_instance_id,
      program_run_id,
      team_id,
      assignment_id,
      protocol_version,
      day_number,
      domain_id,
      event_type,
      score,
      not_observed,
      response_duration_ms,
      consent_version,
      consented_at,
      is_test
    )
    VALUES (
      actor_id,
      target_instance.id,
      target_instance.program_run_id,
      target_instance.team_id,
      _assignment_id,
      _evidence_protocol_version,
      _day_number,
      _evidence_domain_id,
      _event_type,
      parsed_score,
      parsed_not_observed,
      _evidence_response_duration_ms,
      COALESCE(target_profile.data_contribution_consent_version, 'synthetic_test'),
      COALESCE(target_profile.data_contribution_consented_at, now()),
      COALESCE(target_profile.is_test_user, false) OR COALESCE(target_instance.is_test_instance, false)
    )
    RETURNING id INTO evidence_id;
  END IF;

  RETURN (
    base_result::jsonb
    || jsonb_build_object(
      'evidence_observation_id', evidence_id,
      'evidence_protocol_version', _evidence_protocol_version,
      'evidence_domain_id', _evidence_domain_id
    )
  )::json;
END;
$$;

REVOKE ALL ON FUNCTION public.save_daily_tracking_v3(
  uuid, date, text, integer, text, uuid, jsonb, text,
  integer, integer, integer, integer, integer, integer, integer, integer, integer, integer,
  jsonb, jsonb, text, text, text, integer
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_daily_tracking_v3(
  uuid, date, text, integer, text, uuid, jsonb, text,
  integer, integer, integer, integer, integer, integer, integer, integer, integer, integer,
  jsonb, jsonb, text, text, text, integer
) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_evidence_adult_eligibility(
  _program_instance_id uuid,
  _verified boolean
)
RETURNS json
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  actor_id uuid := auth.uid();
  target_instance public.program_instances;
  next_status text := CASE WHEN _verified THEN 'adult_verified' ELSE 'revoked' END;
BEGIN
  IF actor_id IS NULL OR NOT public.has_role(actor_id, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'admin_role_required';
  END IF;

  SELECT * INTO target_instance
  FROM public.program_instances pi
  WHERE pi.id = _program_instance_id;

  IF target_instance.id IS NULL THEN
    RAISE EXCEPTION 'program_instance_not_found';
  END IF;

  IF NOT public.has_role(target_instance.user_id, 'athlete'::public.app_role) THEN
    RAISE EXCEPTION 'athlete_instance_required';
  END IF;

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
  VALUES (
    target_instance.id,
    next_status,
    'adult_status_confirmed_outside_app',
    NULL,
    NULL,
    CASE WHEN _verified THEN actor_id ELSE NULL END,
    CASE WHEN _verified THEN now() ELSE NULL END,
    CASE WHEN _verified THEN NULL ELSE actor_id END,
    CASE WHEN _verified THEN NULL ELSE now() END
  )
  ON CONFLICT (program_instance_id) DO UPDATE
  SET status = EXCLUDED.status,
      verification_basis = EXCLUDED.verification_basis,
      guardian_consent_version = NULL,
      athlete_assent_version = NULL,
      verified_by = CASE WHEN _verified THEN actor_id ELSE public.evidence_participation_eligibility.verified_by END,
      verified_at = CASE WHEN _verified THEN now() ELSE public.evidence_participation_eligibility.verified_at END,
      revoked_by = CASE WHEN _verified THEN NULL ELSE actor_id END,
      revoked_at = CASE WHEN _verified THEN NULL ELSE now() END;

  INSERT INTO public.evidence_eligibility_audit(
    program_instance_id,
    status,
    verification_basis,
    guardian_consent_version,
    athlete_assent_version,
    actor_id
  )
  VALUES (
    target_instance.id,
    next_status,
    'adult_status_confirmed_outside_app',
    NULL,
    NULL,
    actor_id
  );

  RETURN json_build_object(
    'program_instance_id', target_instance.id,
    'status', next_status,
    'stores_age_or_birthdate', false,
    'updated_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.set_evidence_adult_eligibility(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_evidence_adult_eligibility(uuid, boolean) TO authenticated;

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
    'protocol_version', '56d-transfer-v1-2026-07',
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
      public.evidence_eligibility_reason(pi.id, '56d-transfer-v1-2026-07') AS eligibility_reason
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

CREATE OR REPLACE FUNCTION public.get_coach_evidence_review_context(
  _team_id uuid,
  _protocol_version text DEFAULT '56d-transfer-v1-2026-07'
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  actor_id uuid := auth.uid();
  target_run public.program_runs;
  current_week integer;
  athlete_count integer;
  eligible_count integer;
  athletes_json json;
  team_review_json json;
  protocol_enabled boolean;
BEGIN
  IF actor_id IS NULL OR NOT public.can_manage_team_program_runs(_team_id) THEN
    RAISE EXCEPTION 'coach_team_access_required';
  END IF;

  SELECT ep.coach_collection_enabled AND ep.status = 'pilot'
  INTO protocol_enabled
  FROM public.evidence_protocols ep
  WHERE ep.version = _protocol_version;

  IF COALESCE(protocol_enabled, false) = false THEN
    RETURN json_build_object(
      'enabled', false,
      'reason', 'protocol_disabled',
      'protocol_version', _protocol_version,
      'run', NULL,
      'week_number', NULL,
      'team_eligible', false,
      'athlete_count', 0,
      'eligible_athlete_count', 0,
      'athletes', '[]'::json,
      'team_review', NULL
    );
  END IF;

  SELECT * INTO target_run
  FROM public.program_runs pr
  WHERE pr.team_id = _team_id AND pr.status = 'active'
  ORDER BY pr.started_at DESC, pr.created_at DESC
  LIMIT 1;

  IF target_run.id IS NULL OR target_run.started_at IS NULL THEN
    RETURN json_build_object(
      'enabled', false,
      'reason', 'no_active_program_run',
      'protocol_version', _protocol_version,
      'run', NULL,
      'week_number', NULL,
      'team_eligible', false,
      'athlete_count', 0,
      'eligible_athlete_count', 0,
      'athletes', '[]'::json,
      'team_review', NULL
    );
  END IF;

  current_week := GREATEST(1, LEAST(8, ((CURRENT_DATE - target_run.started_at) / 7) + 1));

  WITH athlete_instances AS (
    SELECT
      pi.id AS program_instance_id,
      pi.user_id,
      COALESCE(NULLIF(btrim(p.full_name), ''), 'Athlet ' || left(pi.user_id::text, 8)) AS full_name,
      public.evidence_eligibility_reason(pi.id, _protocol_version) AS eligibility_reason
    FROM public.program_instances pi
    JOIN public.profiles p ON p.id = pi.user_id
    JOIN public.user_roles ur ON ur.user_id = pi.user_id AND ur.role = 'athlete'::public.app_role
    WHERE pi.program_run_id = target_run.id
      AND pi.team_id = _team_id
      AND pi.status = 'active'
  )
  SELECT
    COUNT(*)::integer,
    COUNT(*) FILTER (WHERE eligibility_reason IN ('eligible', 'eligible_minor', 'eligible_test'))::integer,
    COALESCE(
      json_agg(
        json_build_object(
          'program_instance_id', ai.program_instance_id,
          'user_id', ai.user_id,
          'full_name', ai.full_name,
          'eligible', ai.eligibility_reason IN ('eligible', 'eligible_minor', 'eligible_test'),
          'eligibility_reason', ai.eligibility_reason,
          'review', (
            SELECT json_build_object(
              'context', cer.observation_context,
              'values', (
                SELECT COALESCE(
                  json_object_agg(
                    ceo.domain_id,
                    CASE WHEN ceo.not_observed THEN 'not_observed' ELSE ceo.score::text END
                  ),
                  '{}'::json
                )
                FROM public.coach_evidence_observations ceo
                WHERE ceo.review_id = cer.id
              )
            )
            FROM public.coach_evidence_reviews cer
            WHERE cer.coach_id = actor_id
              AND cer.scope_type = 'athlete'
              AND cer.target_program_instance_id = ai.program_instance_id
              AND cer.week_number = current_week
          )
        )
        ORDER BY ai.full_name
      ),
      '[]'::json
    )
  INTO athlete_count, eligible_count, athletes_json
  FROM athlete_instances ai;

  SELECT json_build_object(
    'context', cer.observation_context,
    'values', (
      SELECT COALESCE(
        json_object_agg(
          ceo.domain_id,
          CASE WHEN ceo.not_observed THEN 'not_observed' ELSE ceo.score::text END
        ),
        '{}'::json
      )
      FROM public.coach_evidence_observations ceo
      WHERE ceo.review_id = cer.id
    )
  ) INTO team_review_json
  FROM public.coach_evidence_reviews cer
  WHERE cer.coach_id = actor_id
    AND cer.scope_type = 'team'
    AND cer.program_run_id = target_run.id
    AND cer.week_number = current_week;

  RETURN json_build_object(
    'enabled', true,
    'reason', CASE
      WHEN athlete_count = 0 THEN 'no_athletes'
      WHEN eligible_count <> athlete_count THEN 'participants_not_eligible'
      ELSE 'ready'
    END,
    'protocol_version', _protocol_version,
    'run', json_build_object(
      'id', target_run.id,
      'name', target_run.name,
      'started_at', target_run.started_at,
      'status', target_run.status
    ),
    'week_number', current_week,
    'team_eligible', athlete_count > 0 AND eligible_count = athlete_count,
    'athlete_count', athlete_count,
    'eligible_athlete_count', eligible_count,
    'athletes', athletes_json,
    'team_review', team_review_json,
    'individual_visibility', 'entering_coach_only',
    'external_export_includes_individual_reviews', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_coach_evidence_review_context(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_coach_evidence_review_context(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.save_coach_evidence_review(
  _scope text,
  _team_id uuid,
  _program_instance_id uuid,
  _protocol_version text,
  _week_number integer,
  _context text,
  _observations jsonb,
  _completion_duration_ms integer DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  actor_id uuid := auth.uid();
  target_run public.program_runs;
  target_instance public.program_instances;
  current_week integer;
  review_id uuid;
  athlete_count integer;
  eligible_count integer;
  observation_key_count integer;
  valid_observation_count integer;
  target_is_test boolean := false;
BEGIN
  IF actor_id IS NULL OR NOT public.can_manage_team_program_runs(_team_id) THEN
    RAISE EXCEPTION 'coach_team_access_required';
  END IF;

  IF _scope NOT IN ('team', 'athlete') THEN
    RAISE EXCEPTION 'invalid_coach_review_scope';
  END IF;

  IF _context NOT IN ('training', 'competition', 'mixed') THEN
    RAISE EXCEPTION 'invalid_coach_review_context';
  END IF;

  IF _observations IS NULL OR jsonb_typeof(_observations) <> 'object' THEN
    RAISE EXCEPTION 'coach_observations_must_be_object';
  END IF;

  IF _completion_duration_ms IS NOT NULL
     AND _completion_duration_ms NOT BETWEEN 0 AND 900000 THEN
    RAISE EXCEPTION 'invalid_coach_review_duration';
  END IF;

  SELECT COUNT(*)::integer INTO observation_key_count
  FROM jsonb_object_keys(_observations);

  SELECT COUNT(*)::integer INTO valid_observation_count
  FROM jsonb_each(_observations) item
  WHERE item.key IN (
      'attention_return',
      'error_recovery',
      'pressure_regulation',
      'process_execution',
      'action_under_uncertainty'
    )
    AND (
      (jsonb_typeof(item.value) = 'number' AND (item.value #>> '{}') IN ('1', '2', '3', '4'))
      OR (jsonb_typeof(item.value) = 'string' AND item.value #>> '{}' = 'not_observed')
    );

  IF observation_key_count <> 5 OR valid_observation_count <> 5 THEN
    RAISE EXCEPTION 'exactly_five_valid_coach_observations_required';
  END IF;

  SELECT * INTO target_run
  FROM public.program_runs pr
  WHERE pr.team_id = _team_id AND pr.status = 'active'
  ORDER BY pr.started_at DESC, pr.created_at DESC
  LIMIT 1
  FOR SHARE;

  IF target_run.id IS NULL OR target_run.started_at IS NULL THEN
    RAISE EXCEPTION 'active_program_run_required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.evidence_protocols ep
    WHERE ep.version = _protocol_version
      AND ep.status = 'pilot'
      AND ep.coach_collection_enabled
  ) THEN
    RAISE EXCEPTION 'coach_evidence_protocol_disabled';
  END IF;

  current_week := GREATEST(1, LEAST(8, ((CURRENT_DATE - target_run.started_at) / 7) + 1));
  IF _week_number <> current_week THEN
    RAISE EXCEPTION 'coach_review_week_mismatch';
  END IF;

  IF _scope = 'team' THEN
    IF _program_instance_id IS NOT NULL THEN
      RAISE EXCEPTION 'team_review_must_not_target_athlete';
    END IF;

    -- Stabilize all participation inputs until the review commits. Concurrent
    -- consent or eligibility revocation then happens wholly before or after
    -- this save, never between authorization and persistence.
    PERFORM 1
    FROM public.program_instances pi
    WHERE pi.program_run_id = target_run.id
      AND pi.team_id = _team_id
      AND pi.status = 'active'
    FOR SHARE;

    PERFORM 1
    FROM public.profiles p
    JOIN public.program_instances pi ON pi.user_id = p.id
    WHERE pi.program_run_id = target_run.id
      AND pi.team_id = _team_id
      AND pi.status = 'active'
    FOR SHARE OF p;

    PERFORM 1
    FROM public.evidence_participation_eligibility epe
    JOIN public.program_instances pi ON pi.id = epe.program_instance_id
    WHERE pi.program_run_id = target_run.id
      AND pi.team_id = _team_id
      AND pi.status = 'active'
    FOR SHARE OF epe;

    SELECT
      COUNT(*)::integer,
      COUNT(*) FILTER (
        WHERE public.evidence_eligibility_reason(pi.id, _protocol_version) IN ('eligible', 'eligible_minor', 'eligible_test')
      )::integer,
      COALESCE(bool_or(COALESCE(p.is_test_user, false) OR COALESCE(pi.is_test_instance, false)), false)
    INTO athlete_count, eligible_count, target_is_test
    FROM public.program_instances pi
    JOIN public.profiles p ON p.id = pi.user_id
    JOIN public.user_roles ur ON ur.user_id = pi.user_id AND ur.role = 'athlete'::public.app_role
    WHERE pi.program_run_id = target_run.id
      AND pi.team_id = _team_id
      AND pi.status = 'active';

    IF athlete_count = 0 OR eligible_count <> athlete_count THEN
      RAISE EXCEPTION 'all_team_athletes_must_be_evidence_eligible';
    END IF;
  ELSE
    SELECT * INTO target_instance
    FROM public.program_instances pi
    WHERE pi.id = _program_instance_id
      AND pi.team_id = _team_id
      AND pi.program_run_id = target_run.id
      AND pi.status = 'active'
    FOR SHARE;

    IF target_instance.id IS NULL
       OR NOT public.has_role(target_instance.user_id, 'athlete'::public.app_role) THEN
      RAISE EXCEPTION 'eligible_team_athlete_instance_required';
    END IF;

    PERFORM 1
    FROM public.profiles p
    WHERE p.id = target_instance.user_id
    FOR SHARE;

    PERFORM 1
    FROM public.evidence_participation_eligibility epe
    WHERE epe.program_instance_id = target_instance.id
    FOR SHARE;

    IF public.evidence_eligibility_reason(target_instance.id, _protocol_version)
       NOT IN ('eligible', 'eligible_minor', 'eligible_test') THEN
      RAISE EXCEPTION 'target_athlete_not_evidence_eligible';
    END IF;

    SELECT COALESCE(p.is_test_user, false) OR COALESCE(target_instance.is_test_instance, false)
    INTO target_is_test
    FROM public.profiles p
    WHERE p.id = target_instance.user_id;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      actor_id::text || ':' || target_run.id::text || ':' || _scope || ':'
      || COALESCE(_program_instance_id::text, 'team') || ':' || _week_number::text,
      0
    )
  );

  IF _scope = 'team' THEN
    SELECT cer.id INTO review_id
    FROM public.coach_evidence_reviews cer
    WHERE cer.coach_id = actor_id
      AND cer.program_run_id = target_run.id
      AND cer.scope_type = 'team'
      AND cer.week_number = _week_number
    FOR UPDATE;
  ELSE
    SELECT cer.id INTO review_id
    FROM public.coach_evidence_reviews cer
    WHERE cer.coach_id = actor_id
      AND cer.target_program_instance_id = target_instance.id
      AND cer.scope_type = 'athlete'
      AND cer.week_number = _week_number
    FOR UPDATE;
  END IF;

  IF review_id IS NULL THEN
    INSERT INTO public.coach_evidence_reviews(
      coach_id,
      scope_type,
      team_id,
      program_run_id,
      target_program_instance_id,
      protocol_version,
      week_number,
      observation_context,
      observed_athlete_count,
      completion_duration_ms,
      is_test
    )
    VALUES (
      actor_id,
      _scope,
      _team_id,
      target_run.id,
      CASE WHEN _scope = 'athlete' THEN target_instance.id ELSE NULL END,
      _protocol_version,
      _week_number,
      _context,
      CASE WHEN _scope = 'team' THEN athlete_count ELSE 1 END,
      _completion_duration_ms,
      target_is_test
    )
    RETURNING id INTO review_id;
  ELSE
    UPDATE public.coach_evidence_reviews
    SET observation_context = _context,
        protocol_version = _protocol_version,
        observed_athlete_count = CASE WHEN _scope = 'team' THEN athlete_count ELSE 1 END,
        completion_duration_ms = COALESCE(_completion_duration_ms, completion_duration_ms),
        is_test = target_is_test
    WHERE id = review_id;

    DELETE FROM public.coach_evidence_observations ceo
    WHERE ceo.review_id = review_id;
  END IF;

  INSERT INTO public.coach_evidence_observations(
    review_id,
    domain_id,
    score,
    not_observed
  )
  SELECT
    review_id,
    item.key,
    CASE WHEN jsonb_typeof(item.value) = 'number' THEN (item.value #>> '{}')::smallint ELSE NULL END,
    jsonb_typeof(item.value) = 'string' AND item.value #>> '{}' = 'not_observed'
  FROM jsonb_each(_observations) item;

  RETURN json_build_object(
    'review_id', review_id,
    'scope', _scope,
    'team_id', _team_id,
    'program_run_id', target_run.id,
    'program_instance_id', CASE WHEN _scope = 'athlete' THEN target_instance.id ELSE NULL END,
    'week_number', _week_number,
    'saved_at', now(),
    'individual_visibility', CASE WHEN _scope = 'athlete' THEN 'entering_coach_only' ELSE 'team_observation' END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.save_coach_evidence_review(text, uuid, uuid, text, integer, text, jsonb, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_coach_evidence_review(text, uuid, uuid, text, integer, text, jsonb, integer)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_transfer_evidence_summary(
  _program_instance_id uuid,
  _protocol_version text DEFAULT '56d-transfer-v1-2026-07'
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  actor_id uuid := auth.uid();
  owner_id uuid;
  result json;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;

  SELECT pi.user_id INTO owner_id
  FROM public.program_instances pi
  WHERE pi.id = _program_instance_id;

  IF owner_id IS NULL OR owner_id <> actor_id THEN
    RAISE EXCEPTION 'program_instance_not_owned';
  END IF;

  WITH observations AS (
    SELECT
      ato.day_number,
      ato.domain_id,
      ato.event_type,
      ato.score,
      ato.not_observed,
      ato.collected_at
    FROM public.athlete_transfer_observations ato
    WHERE ato.user_id = actor_id
      AND ato.program_instance_id = _program_instance_id
      AND ato.protocol_version = _protocol_version
  ),
  domain_rows AS (
    SELECT
      domain_id,
      COUNT(*) FILTER (WHERE score IS NOT NULL)::integer AS scored_n,
      COUNT(*) FILTER (WHERE not_observed)::integer AS not_observed_n,
      ROUND(AVG(score)::numeric, 2) AS average_score
    FROM observations
    GROUP BY domain_id
  )
  SELECT json_build_object(
    'protocol_version', _protocol_version,
    'program_instance_id', _program_instance_id,
    'source', 'personal_self_report',
    'claim_boundary', 'Personal self-reported in-app trend. No diagnosis, causality, or proof of sport performance.',
    'observations', COALESCE((SELECT json_agg(o ORDER BY o.day_number) FROM observations o), '[]'::json),
    'domains', COALESCE((SELECT json_agg(d ORDER BY d.domain_id) FROM domain_rows d), '[]'::json)
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_transfer_evidence_summary(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_transfer_evidence_summary(uuid, text) TO authenticated;

-- Export-safe aggregate. Null run means solo-only instances. Individual coach
-- reviews are counted for QA but their values are never returned.
CREATE OR REPLACE FUNCTION public.get_performance_evidence_summary(
  _program_run_id uuid DEFAULT NULL,
  _include_test boolean DEFAULT false,
  _protocol_version text DEFAULT '56d-transfer-v1-2026-07'
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  actor_id uuid := auth.uid();
  target_run public.program_runs;
  result json;
BEGIN
  IF actor_id IS NULL OR NOT public.has_role(actor_id, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'admin_role_required';
  END IF;

  IF _program_run_id IS NOT NULL THEN
    SELECT * INTO target_run
    FROM public.program_runs pr
    WHERE pr.id = _program_run_id;
    IF target_run.id IS NULL THEN
      RAISE EXCEPTION 'program_run_not_found';
    END IF;
  END IF;

  WITH scoped_observations AS (
    SELECT ato.*
    FROM public.athlete_transfer_observations ato
    JOIN public.profiles p ON p.id = ato.user_id
    JOIN public.user_roles ur
      ON ur.user_id = ato.user_id AND ur.role = 'athlete'::public.app_role
    JOIN public.evidence_protocols ep ON ep.version = ato.protocol_version
    WHERE ato.protocol_version = _protocol_version
      AND (
        (_program_run_id IS NOT NULL AND ato.program_run_id = _program_run_id)
        OR (_program_run_id IS NULL AND ato.program_run_id IS NULL AND ato.team_id IS NULL)
      )
      AND (_include_test OR NOT ato.is_test)
      AND COALESCE(p.data_contribution_consent, false)
      AND p.data_contribution_consent_version = ep.required_consent_version
      AND public.evidence_eligibility_reason(ato.program_instance_id, _protocol_version)
          IN ('eligible', 'eligible_minor', 'eligible_test')
  ),
  scope_participants AS (
    SELECT
      pi.id AS program_instance_id,
      pi.user_id,
      pi.started_at,
      pi.ended_at,
      COALESCE(p.is_test_user, false) AND COALESCE(pi.is_test_instance, false) AS synthetic_test,
      p.data_contribution_consented_at,
      public.evidence_eligibility_reason(pi.id, _protocol_version) AS eligibility_reason
    FROM public.program_instances pi
    JOIN public.profiles p ON p.id = pi.user_id
    JOIN public.user_roles ur
      ON ur.user_id = pi.user_id AND ur.role = 'athlete'::public.app_role
    WHERE (
        (_program_run_id IS NOT NULL AND pi.program_run_id = _program_run_id)
        OR (_program_run_id IS NULL AND pi.program_run_id IS NULL AND pi.team_id IS NULL)
      )
      AND (_include_test OR NOT (COALESCE(p.is_test_user, false) OR COALESCE(pi.is_test_instance, false)))
  ),
  eligible_scope_participants AS (
    SELECT
      sp.program_instance_id,
      sp.user_id,
      CASE
        WHEN sp.synthetic_test THEN sp.started_at
        ELSE GREATEST(
          sp.started_at,
          sp.data_contribution_consented_at::date,
          epe.verified_at::date
        )
      END AS eligible_from,
      LEAST(CURRENT_DATE, COALESCE(sp.ended_at, CURRENT_DATE)) AS eligible_until
    FROM scope_participants sp
    LEFT JOIN public.evidence_participation_eligibility epe
      ON epe.program_instance_id = sp.program_instance_id
    WHERE sp.eligibility_reason IN ('eligible', 'eligible_minor', 'eligible_test')
  ),
  participant_exclusion_reasons AS (
    SELECT eligibility_reason, COUNT(*)::integer AS n
    FROM scope_participants
    WHERE eligibility_reason NOT IN ('eligible', 'eligible_minor', 'eligible_test')
    GROUP BY eligibility_reason
  ),
  eligible_run_sample AS (
    SELECT COUNT(*)::integer AS athlete_n
    FROM eligible_scope_participants
  ),
  transfer_opportunities AS (
    SELECT
      uda.id AS assignment_id,
      esp.program_instance_id,
      esp.user_id,
      uda.date,
      uda.assigned_day_number AS day_number,
      ets.domain_id,
      uda.context_type,
      uda.context_type <> 'rest' AS expected
    FROM eligible_scope_participants esp
    JOIN public.user_day_assignments uda ON uda.user_id = esp.user_id
    JOIN public.evidence_transfer_schedule ets
      ON ets.protocol_version = _protocol_version
     AND ets.day_number = uda.assigned_day_number
    WHERE uda.date BETWEEN esp.eligible_from AND esp.eligible_until
  ),
  transfer_coverage AS (
    SELECT
      (SELECT COUNT(*) FROM transfer_opportunities WHERE expected)::integer AS expected_observations,
      (
        SELECT COUNT(*)
        FROM transfer_opportunities tmo
        JOIN scoped_observations so
          ON so.assignment_id = tmo.assignment_id
         AND so.program_instance_id = tmo.program_instance_id
        WHERE tmo.expected
      )::integer AS collected_observations,
      (SELECT COUNT(*) FROM transfer_opportunities WHERE NOT expected)::integer AS rest_day_skips
  ),
  domain_rows AS (
    SELECT
      domain_id,
      COUNT(DISTINCT user_id) FILTER (WHERE score IS NOT NULL)::integer AS n,
      COUNT(*) FILTER (WHERE score IS NOT NULL)::integer AS scored_observations,
      COUNT(*) FILTER (WHERE not_observed)::integer AS not_observed,
      COUNT(response_duration_ms)::integer AS timed_observations,
      COUNT(DISTINCT user_id) FILTER (WHERE response_duration_ms IS NOT NULL)::integer AS timed_n,
      CASE
        WHEN COUNT(DISTINCT user_id) FILTER (WHERE score IS NOT NULL) >= 5
          THEN ROUND(AVG(score)::numeric, 2)
        ELSE NULL
      END AS average_score,
      CASE
        WHEN COUNT(DISTINCT user_id) FILTER (WHERE response_duration_ms IS NOT NULL) >= 5
          THEN ROUND(AVG(response_duration_ms)::numeric, 0)
        ELSE NULL
      END AS average_response_duration_ms,
      COUNT(DISTINCT user_id) FILTER (WHERE response_duration_ms IS NOT NULL) >= 5
        AS duration_sufficient_data,
      COUNT(DISTINCT user_id) FILTER (WHERE score IS NOT NULL) BETWEEN 5 AND 9 AS low_confidence,
      COUNT(DISTINCT user_id) FILTER (WHERE score IS NOT NULL) >= 5 AS sufficient_data
    FROM scoped_observations
    GROUP BY domain_id
  ),
  weekly_rows AS (
    SELECT
      CEIL(day_number / 7.0)::integer AS week_number,
      domain_id,
      COUNT(DISTINCT user_id) FILTER (WHERE score IS NOT NULL)::integer AS n,
      COUNT(*) FILTER (WHERE not_observed)::integer AS not_observed,
      COUNT(response_duration_ms)::integer AS timed_observations,
      COUNT(DISTINCT user_id) FILTER (WHERE response_duration_ms IS NOT NULL)::integer AS timed_n,
      CASE
        WHEN COUNT(DISTINCT user_id) FILTER (WHERE score IS NOT NULL) >= 5
          THEN ROUND(AVG(score)::numeric, 2)
        ELSE NULL
      END AS average_score,
      CASE
        WHEN COUNT(DISTINCT user_id) FILTER (WHERE response_duration_ms IS NOT NULL) >= 5
          THEN ROUND(AVG(response_duration_ms)::numeric, 0)
        ELSE NULL
      END AS average_response_duration_ms,
      COUNT(DISTINCT user_id) FILTER (WHERE response_duration_ms IS NOT NULL) >= 5
        AS duration_sufficient_data,
      COUNT(DISTINCT user_id) FILTER (WHERE score IS NOT NULL) BETWEEN 5 AND 9 AS low_confidence,
      COUNT(DISTINCT user_id) FILTER (WHERE score IS NOT NULL) >= 5 AS sufficient_data
    FROM scoped_observations
    GROUP BY CEIL(day_number / 7.0)::integer, domain_id
  ),
  coach_team_rows AS (
    SELECT
      cer.week_number,
      ceo.domain_id,
      LEAST(MIN(cer.observed_athlete_count)::integer, ers.athlete_n) AS athlete_n,
      MIN(cer.observed_athlete_count)::integer AS observed_athlete_n,
      ers.athlete_n AS currently_eligible_athlete_n,
      COUNT(DISTINCT cer.coach_id) FILTER (WHERE ceo.score IS NOT NULL)::integer AS observer_n,
      COUNT(*) FILTER (WHERE ceo.not_observed)::integer AS not_observed,
      CASE
        WHEN LEAST(MIN(cer.observed_athlete_count)::integer, ers.athlete_n) >= 5
          THEN ROUND(AVG(ceo.score)::numeric, 2)
        ELSE NULL
      END AS average_score,
      LEAST(MIN(cer.observed_athlete_count)::integer, ers.athlete_n) BETWEEN 5 AND 9 AS low_confidence,
      LEAST(MIN(cer.observed_athlete_count)::integer, ers.athlete_n) >= 5 AS sufficient_data,
      true AS observational_only
    FROM public.coach_evidence_reviews cer
    JOIN public.coach_evidence_observations ceo ON ceo.review_id = cer.id
    CROSS JOIN eligible_run_sample ers
    WHERE _program_run_id IS NOT NULL
      AND cer.program_run_id = _program_run_id
      AND cer.protocol_version = _protocol_version
      AND cer.scope_type = 'team'
      AND (_include_test OR NOT cer.is_test)
    GROUP BY cer.week_number, ceo.domain_id, ers.athlete_n
  )
  SELECT json_build_object(
    'generated_at', now(),
    'schema_version', 'performance_evidence_summary_v1',
    'protocol_version', _protocol_version,
    'scope', CASE WHEN _program_run_id IS NULL THEN 'solo_aggregate' ELSE 'program_run' END,
    'program_run', CASE WHEN target_run.id IS NULL THEN NULL ELSE json_build_object(
      'id', target_run.id,
      'team_id', target_run.team_id,
      'name', target_run.name,
      'started_at', target_run.started_at,
      'status', target_run.status
    ) END,
    'sample', json_build_object(
      'scope_participants_total', (SELECT COUNT(*) FROM scope_participants),
      'eligible_participants', (SELECT athlete_n FROM eligible_run_sample),
      'excluded_participants', (
        SELECT COUNT(*)
        FROM scope_participants
        WHERE eligibility_reason NOT IN ('eligible', 'eligible_minor', 'eligible_test')
      ),
      'exclusion_reasons', COALESCE((
        SELECT json_object_agg(per.eligibility_reason, per.n ORDER BY per.eligibility_reason)
        FROM participant_exclusion_reasons per
      ), '{}'::json),
      'participants_with_observation', (SELECT COUNT(DISTINCT user_id) FROM scoped_observations),
      'total_observations', (SELECT COUNT(*) FROM scoped_observations),
      'not_observed', (SELECT COUNT(*) FROM scoped_observations WHERE not_observed),
      'observation_period_start', (SELECT MIN(collected_at) FROM scoped_observations),
      'observation_period_end', (SELECT MAX(collected_at) FROM scoped_observations),
      'minimum_aggregate_n', 5,
      'low_confidence_below_n', 10,
      'test_data_included', _include_test
    ),
    'coverage', json_build_object(
      'expected_transfer_observations', (SELECT expected_observations FROM transfer_coverage),
      'collected_transfer_observations', (SELECT collected_observations FROM transfer_coverage),
      'missing_transfer_observations', (
        SELECT GREATEST(expected_observations - collected_observations, 0)
        FROM transfer_coverage
      ),
      'transfer_completion_rate', (
        SELECT CASE
          WHEN expected_observations = 0 THEN NULL
          ELSE ROUND(collected_observations::numeric / expected_observations, 4)
        END
        FROM transfer_coverage
      ),
      'rest_day_pulses_skipped', (SELECT rest_day_skips FROM transfer_coverage),
      'not_observed_responses', (SELECT COUNT(*) FROM scoped_observations WHERE not_observed),
      'definition', 'Expected counts only scheduled non-rest assignments on or after current consent and participation authorization.'
    ),
    'domain_aggregates', COALESCE((SELECT json_agg(d ORDER BY d.domain_id) FROM domain_rows d), '[]'::json),
    'weekly_aggregates', COALESCE((SELECT json_agg(w ORDER BY w.week_number, w.domain_id) FROM weekly_rows w), '[]'::json),
    'coach_team_observations', COALESCE((SELECT json_agg(c ORDER BY c.week_number, c.domain_id) FROM coach_team_rows c), '[]'::json),
    'data_quality', json_build_object(
      'individual_coach_reviews_excluded', (
        SELECT COUNT(*)
        FROM public.coach_evidence_reviews cer
        WHERE _program_run_id IS NOT NULL
          AND cer.program_run_id = _program_run_id
          AND cer.scope_type = 'athlete'
          AND cer.protocol_version = _protocol_version
      ),
      'coach_team_values_suppressed_below_n', (
        SELECT COUNT(*)
        FROM coach_team_rows ctr
        WHERE NOT ctr.sufficient_data
      ),
      'private_text_fields_present', false,
      'identifiers_present', false
    ),
    'claim_boundary', json_build_object(
      'allowed', json_build_array(
        'observed self-reported in-app transfer trend',
        'structured coach-observed team trend',
        'participation and data coverage'
      ),
      'not_allowed', json_build_array(
        'diagnosis',
        'causal sport-performance claim',
        'individual psychological evaluation',
        'qualification or competition outcome attribution'
      )
    ),
    'privacy', json_build_object(
      'consent_required', true,
      'age_appropriate_authorization_required', true,
      'minor_collection_enabled', false,
      'coach_team_minimum_n', 5,
      'individual_coach_values_exported', false,
      'journal_or_reflection_text_exported', false
    )
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_performance_evidence_summary(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_performance_evidence_summary(uuid, boolean, text) TO authenticated;

COMMENT ON TABLE public.athlete_transfer_observations IS
  'Locked, structured athlete self-reports from the 56-day transfer schedule. No free text.';
COMMENT ON TABLE public.coach_evidence_reviews IS
  'Structured weekly coach observations. Athlete-scoped rows are never included in external exports.';
COMMENT ON TABLE public.evidence_participation_eligibility IS
  'Age-appropriate participation gate without date of birth or age storage. Minor collection stays disabled until approved guardian-consent and athlete-assent versions exist.';
COMMENT ON FUNCTION public.save_daily_tracking_v3 IS
  'Atomic daily tracking v2 plus optional, consented and age-appropriately authorized transfer evidence.';
COMMENT ON FUNCTION public.get_performance_evidence_summary IS
  'Admin-only aggregate export with n>=5 suppression and no individual coach observations.';

COMMIT;
