BEGIN;

CREATE OR REPLACE FUNCTION public.classify_sport_category(_sport text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $$
  SELECT CASE
    WHEN NULLIF(btrim(_sport), '') IS NULL THEN 'unknown_or_other'
    WHEN _sport ~* '(fussball|fu.ball|soccer|football|basketball|handball|hockey|rugby|lacrosse)'
      THEN 'invasion_team_sport'
    WHEN _sport ~* '(tennis|badminton|volleyball|tischtennis|table tennis|padel|squash)'
      THEN 'net_or_target_sport'
    WHEN _sport ~* '(box|boxing|mma|mixed martial|judo|ringen|wrestling|karate|taekwondo|kickbox|muay thai|bjj|jiu)'
      THEN 'combat_sport'
    WHEN _sport ~* '(turn|gymnast|eiskunst|figure skat|tanz|dance|cheer|akrobat|trampolin)'
      THEN 'aesthetic_or_technical_sport'
    WHEN _sport ~* '(lauf|running|marathon|schwimm|swim|freistil|rad|cycling|bike|triathlon|rudern|rowing|langlauf)'
      THEN 'endurance_sport'
    WHEN _sport ~* '(gewichtheben|weightlifting|powerlifting|sprint|wurf|throw|sprung|jump|crossfit)'
      THEN 'strength_power_sport'
    WHEN _sport ~* '(golf|bogen|archery|schie.|shooting|dart|billard|snooker)'
      THEN 'precision_sport'
    ELSE 'unknown_or_other'
  END
$$;

CREATE OR REPLACE FUNCTION public.classify_sport_format(_sport text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $$
  SELECT CASE
    WHEN NULLIF(btrim(_sport), '') IS NULL THEN 'mixed_or_unknown'
    WHEN _sport ~* '(fussball|fu.ball|soccer|football|basketball|handball|hockey|rugby|lacrosse|volleyball)'
      THEN 'team'
    WHEN _sport ~* '(tennis|badminton|tischtennis|table tennis|padel|squash|box|boxing|mma|mixed martial|judo|ringen|wrestling|karate|taekwondo|kickbox|muay thai|bjj|jiu|turn|gymnast|eiskunst|figure skat|tanz|dance|akrobat|trampolin|lauf|running|marathon|schwimm|swim|freistil|rad|cycling|bike|triathlon|rudern|rowing|langlauf|gewichtheben|weightlifting|powerlifting|sprint|wurf|throw|sprung|jump|crossfit|golf|bogen|archery|schie.|shooting|dart|billard|snooker)'
      THEN 'individual'
    ELSE 'mixed_or_unknown'
  END
$$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sport_category text,
  ADD COLUMN IF NOT EXISTS sport_format text,
  ADD COLUMN IF NOT EXISTS sport_level text,
  ADD COLUMN IF NOT EXISTS sport_taxonomy_version text;

-- Backfills are system-owned and run under the migration transaction. The
-- product-write trigger is recreated below with the expanded field set.
DROP TRIGGER IF EXISTS minor_profile_product_authorization_guard ON public.profiles;

UPDATE public.profiles p
SET sport_category = public.classify_sport_category(p.sport),
    sport_format = public.classify_sport_format(p.sport),
    sport_taxonomy_version = 'sport-taxonomy-v1-2026-07'
WHERE p.sport_category IS NULL
   OR p.sport_format IS NULL
   OR p.sport_taxonomy_version IS NULL;

UPDATE public.profiles p
SET sport_level = (
  SELECT qr.answers ->> 'sport-03'
  FROM public.questionnaire_responses qr
  WHERE qr.user_id = p.id
    AND qr.answers ->> 'sport-03' IN (
      'youth', 'amateur', 'competitive_amateur', 'semi_pro', 'pro', 'college'
    )
  ORDER BY qr.created_at DESC
  LIMIT 1
)
WHERE p.sport_level IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.questionnaire_responses qr
    WHERE qr.user_id = p.id
      AND qr.answers ->> 'sport-03' IN (
        'youth', 'amateur', 'competitive_amateur', 'semi_pro', 'pro', 'college'
      )
  );

UPDATE public.profiles p
SET position = (
  SELECT NULLIF(btrim(qr.answers ->> 'sport-02'), '')
  FROM public.questionnaire_responses qr
  WHERE qr.user_id = p.id
    AND NULLIF(btrim(qr.answers ->> 'sport-02'), '') IS NOT NULL
  ORDER BY qr.created_at DESC
  LIMIT 1
)
WHERE p.position IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.questionnaire_responses qr
    WHERE qr.user_id = p.id
      AND NULLIF(btrim(qr.answers ->> 'sport-02'), '') IS NOT NULL
  );

ALTER TABLE public.profiles
  ALTER COLUMN sport_category SET DEFAULT 'unknown_or_other',
  ALTER COLUMN sport_format SET DEFAULT 'mixed_or_unknown',
  ALTER COLUMN sport_taxonomy_version SET DEFAULT 'sport-taxonomy-v1-2026-07';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_sport_category_check,
  DROP CONSTRAINT IF EXISTS profiles_sport_format_check,
  DROP CONSTRAINT IF EXISTS profiles_sport_level_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_sport_category_check CHECK (
    sport_category IS NULL OR sport_category IN (
      'invasion_team_sport',
      'net_or_target_sport',
      'combat_sport',
      'aesthetic_or_technical_sport',
      'endurance_sport',
      'strength_power_sport',
      'precision_sport',
      'unknown_or_other'
    )
  ),
  ADD CONSTRAINT profiles_sport_format_check CHECK (
    sport_format IS NULL OR sport_format IN ('individual', 'team', 'mixed_or_unknown')
  ),
  ADD CONSTRAINT profiles_sport_level_check CHECK (
    sport_level IS NULL OR sport_level IN (
      'youth', 'amateur', 'competitive_amateur', 'semi_pro', 'pro', 'college'
    )
  );

CREATE INDEX IF NOT EXISTS idx_profiles_sport_evidence_scope
  ON public.profiles(sport_category, sport_format, sport_level)
  WHERE sport_category IS NOT NULL;

-- The structured fields reuse existing onboarding answers and add no player
-- step. They remain protected by the same minor product-write gate.
CREATE TRIGGER minor_profile_product_authorization_guard
BEFORE UPDATE OF
  full_name,
  sport,
  sport_category,
  sport_format,
  sport_level,
  sport_taxonomy_version,
  team,
  position
ON public.profiles
FOR EACH ROW EXECUTE FUNCTION minor_auth.enforce_product_write('id');

REVOKE ALL ON FUNCTION public.classify_sport_category(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.classify_sport_format(text) FROM PUBLIC, anon, authenticated;

-- Collection requires an active instance through save_daily_tracking_v2.
-- Read eligibility also preserves a completed 56-day run while current
-- consent/authorization remains valid, so finishing a run cannot erase its
-- evidence from an aggregate dossier.
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
  eligibility_basis text;
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

  IF target_instance.status NOT IN ('active', 'completed') THEN
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
    epe.verification_basis,
    epe.guardian_consent_version,
    epe.athlete_assent_version
  INTO
    eligibility_status,
    eligibility_basis,
    eligibility_guardian_version,
    eligibility_assent_version
  FROM public.evidence_participation_eligibility epe
  WHERE epe.program_instance_id = target_instance.id;

  IF eligibility_status = 'adult_verified' THEN
    RETURN 'eligible';
  END IF;

  IF target_instance.status = 'active'
     AND eligibility_status NOT IN ('minor_guardian_assent_verified', 'minor_self_assent_verified') THEN
    RETURN 'participation_authorization_required';
  END IF;

  IF target_instance.status = 'completed'
     AND NOT (
       eligibility_status IN ('minor_guardian_assent_verified', 'minor_self_assent_verified')
       OR (
         eligibility_status = 'revoked'
         AND eligibility_basis IN (
           'guardian_consent_and_athlete_assent_confirmed',
           'athlete_assent_confirmed_age_16_17'
         )
       )
     ) THEN
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
    IF eligibility_basis <> 'guardian_consent_and_athlete_assent_confirmed'
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
    IF eligibility_basis <> 'athlete_assent_confirmed_age_16_17'
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

CREATE OR REPLACE FUNCTION public.get_solo_sport_evidence_summary(
  _sport_category text DEFAULT NULL,
  _sport_level text DEFAULT NULL,
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
  actor_id uuid := auth.uid();
  result json;
BEGIN
  IF actor_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = actor_id AND ur.role = 'admin'::public.app_role
  ) THEN
    RAISE EXCEPTION 'admin_role_required' USING ERRCODE = '42501';
  END IF;

  IF _sport_category IS NOT NULL AND _sport_category NOT IN (
    'invasion_team_sport', 'net_or_target_sport', 'combat_sport',
    'aesthetic_or_technical_sport', 'endurance_sport',
    'strength_power_sport', 'precision_sport', 'unknown_or_other'
  ) THEN
    RAISE EXCEPTION 'invalid_sport_category';
  END IF;

  IF _sport_level IS NOT NULL AND _sport_level NOT IN (
    'youth', 'amateur', 'competitive_amateur', 'semi_pro', 'pro', 'college'
  ) THEN
    RAISE EXCEPTION 'invalid_sport_level';
  END IF;

  WITH scoped_participants AS (
    SELECT
      pi.id AS program_instance_id,
      pi.user_id,
      pi.started_at,
      pi.ended_at,
      pi.status,
      COALESCE(p.sport_category, public.classify_sport_category(p.sport)) AS sport_category,
      COALESCE(p.sport_format, public.classify_sport_format(p.sport)) AS sport_format,
      p.sport_level,
      COALESCE(p.is_test_user, false) AND COALESCE(pi.is_test_instance, false) AS synthetic_test,
      p.data_contribution_consented_at,
      epe.verified_at,
      public.evidence_eligibility_reason(pi.id, _protocol_version) AS eligibility_reason
    FROM public.program_instances pi
    JOIN public.profiles p ON p.id = pi.user_id
    JOIN public.user_roles ur
      ON ur.user_id = pi.user_id AND ur.role = 'athlete'::public.app_role
    LEFT JOIN public.evidence_participation_eligibility epe
      ON epe.program_instance_id = pi.id
    WHERE pi.team_id IS NULL
      AND pi.program_run_id IS NULL
      AND pi.status IN ('active', 'completed')
      AND (_include_test OR NOT (COALESCE(p.is_test_user, false) OR COALESCE(pi.is_test_instance, false)))
      AND (_sport_category IS NULL OR COALESCE(p.sport_category, public.classify_sport_category(p.sport)) = _sport_category)
      AND (_sport_level IS NULL OR p.sport_level = _sport_level)
  ), eligible AS (
    SELECT
      sp.*,
      CASE
        WHEN sp.synthetic_test THEN sp.started_at
        ELSE GREATEST(
          sp.started_at,
          sp.data_contribution_consented_at::date,
          sp.verified_at::date
        )
      END AS eligible_from,
      LEAST(CURRENT_DATE, COALESCE(sp.ended_at, CURRENT_DATE)) AS eligible_until
    FROM scoped_participants sp
    WHERE sp.eligibility_reason IN ('eligible', 'eligible_minor', 'eligible_test')
  ), observations AS (
    SELECT ato.*
    FROM public.athlete_transfer_observations ato
    JOIN eligible e ON e.program_instance_id = ato.program_instance_id
    WHERE ato.protocol_version = _protocol_version
      AND (_include_test OR NOT ato.is_test)
      AND ato.collected_at::date BETWEEN e.eligible_from AND e.eligible_until
  ), domain_rows AS (
    SELECT
      o.domain_id,
      COUNT(DISTINCT o.user_id) FILTER (WHERE o.score IS NOT NULL)::integer AS n,
      COUNT(*) FILTER (WHERE o.score IS NOT NULL)::integer AS scored_observations,
      COUNT(*) FILTER (WHERE o.not_observed)::integer AS not_observed,
      CASE WHEN COUNT(DISTINCT o.user_id) FILTER (WHERE o.score IS NOT NULL) >= 5
        THEN ROUND(AVG(o.score)::numeric, 2)
        ELSE NULL
      END AS average_score,
      COUNT(DISTINCT o.user_id) FILTER (WHERE o.score IS NOT NULL) >= 5 AS sufficient_data,
      COUNT(DISTINCT o.user_id) FILTER (WHERE o.score IS NOT NULL) BETWEEN 5 AND 9 AS low_confidence
    FROM observations o
    GROUP BY o.domain_id
  ), weekly_rows AS (
    SELECT
      CEIL(o.day_number / 7.0)::integer AS week_number,
      o.domain_id,
      COUNT(DISTINCT o.user_id) FILTER (WHERE o.score IS NOT NULL)::integer AS n,
      COUNT(*) FILTER (WHERE o.not_observed)::integer AS not_observed,
      CASE WHEN COUNT(DISTINCT o.user_id) FILTER (WHERE o.score IS NOT NULL) >= 5
        THEN ROUND(AVG(o.score)::numeric, 2)
        ELSE NULL
      END AS average_score,
      COUNT(DISTINCT o.user_id) FILTER (WHERE o.score IS NOT NULL) >= 5 AS sufficient_data,
      COUNT(DISTINCT o.user_id) FILTER (WHERE o.score IS NOT NULL) BETWEEN 5 AND 9 AS low_confidence
    FROM observations o
    GROUP BY CEIL(o.day_number / 7.0)::integer, o.domain_id
  ), latest_snapshots AS (
    SELECT DISTINCT ON (pps.program_instance_id)
      pps.program_instance_id,
      pps.days_available,
      pps.days_completed,
      pps.completion_rate,
      pps.comprehension_average,
      pps.checkins_completed_count,
      pps.date
    FROM public.program_progress_snapshots pps
    JOIN eligible e ON e.program_instance_id = pps.program_instance_id
    WHERE pps.date BETWEEN e.eligible_from AND e.eligible_until
    ORDER BY pps.program_instance_id, pps.date DESC
  ), usage AS (
    SELECT
      COUNT(*)::integer AS participants_with_snapshot,
      COUNT(ls.comprehension_average)::integer AS participants_with_comprehension,
      CASE WHEN COUNT(*) >= 5 THEN ROUND(AVG(ls.days_available)::numeric, 2) END AS average_days_available,
      CASE WHEN COUNT(*) >= 5 THEN ROUND(AVG(ls.days_completed)::numeric, 2) END AS average_days_completed,
      CASE WHEN COUNT(*) >= 5 THEN ROUND(AVG(ls.completion_rate)::numeric, 4) END AS average_completion_rate,
      CASE WHEN COUNT(ls.comprehension_average) >= 5 THEN ROUND(AVG(ls.comprehension_average)::numeric, 4) END AS average_comprehension,
      SUM(ls.checkins_completed_count)::integer AS total_checkins
    FROM latest_snapshots ls
  ), category_rows AS (
    SELECT
      sp.sport_category,
      sp.sport_format,
      sp.sport_level,
      COUNT(*)::integer AS participants,
      COUNT(*) FILTER (WHERE sp.eligibility_reason IN ('eligible', 'eligible_minor', 'eligible_test'))::integer AS eligible_participants
    FROM scoped_participants sp
    GROUP BY sp.sport_category, sp.sport_format, sp.sport_level
  )
  SELECT json_build_object(
    'generated_at', now(),
    'schema_version', 'solo_sport_evidence_v1',
    'protocol_version', _protocol_version,
    'scope', json_build_object(
      'type', 'solo_aggregate',
      'sport_category', _sport_category,
      'sport_level', _sport_level,
      'taxonomy_version', 'sport-taxonomy-v1-2026-07'
    ),
    'sample', json_build_object(
      'scope_participants_total', (SELECT COUNT(*) FROM scoped_participants),
      'eligible_participants', (SELECT COUNT(*) FROM eligible),
      'participants_with_observation', (SELECT COUNT(DISTINCT user_id) FROM observations),
      'total_observations', (SELECT COUNT(*) FROM observations),
      'minimum_aggregate_n', 5,
      'low_confidence_below_n', 10,
      'test_data_included', _include_test,
      'exclusion_reasons', CASE
        WHEN (SELECT COUNT(*) FROM scoped_participants) > (SELECT COUNT(*) FROM eligible)
          THEN json_build_object(
            'not_currently_authorized',
            (SELECT COUNT(*) FROM scoped_participants) - (SELECT COUNT(*) FROM eligible)
          )
        ELSE '{}'::json
      END
    ),
    'sport_catalog', COALESCE((
      SELECT json_agg(c ORDER BY c.sport_category, c.sport_level)
      FROM category_rows c
      WHERE c.eligible_participants >= 5
    ), '[]'::json),
    'usage', (SELECT row_to_json(u) FROM usage u),
    'domain_aggregates', COALESCE((SELECT json_agg(d ORDER BY d.domain_id) FROM domain_rows d), '[]'::json),
    'weekly_aggregates', COALESCE((SELECT json_agg(w ORDER BY w.week_number, w.domain_id) FROM weekly_rows w), '[]'::json),
    'data_quality', json_build_object(
      'private_text_fields_present', false,
      'identifiers_present', false,
      'individual_values_present', false,
      'suppressed_sport_catalog_groups', (
        SELECT COUNT(*) FROM category_rows c WHERE c.eligible_participants < 5
      ),
      'taxonomy_unknown_participants', (
        SELECT COUNT(*) FROM scoped_participants sp WHERE sp.sport_category = 'unknown_or_other'
      )
    ),
    'claim_boundary', json_build_object(
      'allowed', json_build_array(
        'observed self-reported in-app transfer trend',
        'program usage and data coverage',
        'descriptive sport-category comparison when n is sufficient'
      ),
      'not_allowed', json_build_array(
        'diagnosis',
        'causal sport-performance claim',
        'individual psychological evaluation',
        'competition outcome attribution'
      )
    ),
    'privacy', json_build_object(
      'consent_required', true,
      'age_appropriate_authorization_required', true,
      'minimum_aggregate_n', 5,
      'journal_or_reflection_text_exported', false,
      'individual_values_exported', false
    )
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_solo_sport_evidence_summary(text, text, boolean, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_solo_sport_evidence_summary(text, text, boolean, text)
  TO authenticated;

CREATE TABLE IF NOT EXISTS public.evidence_data_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invalidated')),
  scope_type text NOT NULL CHECK (scope_type IN ('program_run', 'solo_aggregate')),
  program_run_id uuid REFERENCES public.program_runs(id) ON DELETE RESTRICT,
  sport_category text,
  sport_level text,
  protocol_version text NOT NULL,
  snapshot_schema_version text NOT NULL,
  source_cutoff timestamptz NOT NULL,
  locked_at timestamptz NOT NULL DEFAULT now(),
  locked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  include_test boolean NOT NULL DEFAULT false,
  checksum_algorithm text NOT NULL DEFAULT 'sha256' CHECK (checksum_algorithm = 'sha256'),
  content_checksum text NOT NULL,
  evidence_payload jsonb NOT NULL,
  analysis_manifest jsonb NOT NULL,
  invalidated_at timestamptz,
  invalidated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  invalidation_reason text,
  CONSTRAINT evidence_data_locks_scope_check CHECK (
    (scope_type = 'program_run' AND program_run_id IS NOT NULL AND sport_category IS NULL AND sport_level IS NULL)
    OR (scope_type = 'solo_aggregate' AND program_run_id IS NULL)
  ),
  CONSTRAINT evidence_data_locks_invalidation_check CHECK (
    (status = 'active' AND invalidated_at IS NULL AND invalidated_by IS NULL AND invalidation_reason IS NULL)
    OR (
      status = 'invalidated'
      AND invalidated_at IS NOT NULL
      AND invalidated_by IS NOT NULL
      AND char_length(invalidation_reason) BETWEEN 3 AND 500
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_evidence_data_locks_scope
  ON public.evidence_data_locks(scope_type, program_run_id, sport_category, sport_level, locked_at DESC);

ALTER TABLE public.evidence_data_locks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.evidence_data_locks FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.guard_evidence_data_lock_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'evidence_data_lock_delete_forbidden';
  END IF;

  IF OLD.id IS DISTINCT FROM NEW.id
     OR OLD.scope_type IS DISTINCT FROM NEW.scope_type
     OR OLD.program_run_id IS DISTINCT FROM NEW.program_run_id
     OR OLD.sport_category IS DISTINCT FROM NEW.sport_category
     OR OLD.sport_level IS DISTINCT FROM NEW.sport_level
     OR OLD.protocol_version IS DISTINCT FROM NEW.protocol_version
     OR OLD.snapshot_schema_version IS DISTINCT FROM NEW.snapshot_schema_version
     OR OLD.source_cutoff IS DISTINCT FROM NEW.source_cutoff
     OR OLD.locked_at IS DISTINCT FROM NEW.locked_at
     OR OLD.locked_by IS DISTINCT FROM NEW.locked_by
     OR OLD.include_test IS DISTINCT FROM NEW.include_test
     OR OLD.checksum_algorithm IS DISTINCT FROM NEW.checksum_algorithm
     OR OLD.content_checksum IS DISTINCT FROM NEW.content_checksum
     OR OLD.evidence_payload IS DISTINCT FROM NEW.evidence_payload
     OR OLD.analysis_manifest IS DISTINCT FROM NEW.analysis_manifest THEN
    RAISE EXCEPTION 'evidence_data_lock_payload_immutable';
  END IF;

  IF OLD.status <> 'active'
     OR NEW.status <> 'invalidated'
     OR NEW.invalidated_at IS NULL
     OR NEW.invalidated_by IS NULL
     OR char_length(NEW.invalidation_reason) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION 'invalid_evidence_data_lock_transition';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_evidence_data_lock_mutation ON public.evidence_data_locks;
CREATE TRIGGER guard_evidence_data_lock_mutation
BEFORE UPDATE OR DELETE ON public.evidence_data_locks
FOR EACH ROW EXECUTE FUNCTION public.guard_evidence_data_lock_mutation();

REVOKE ALL ON FUNCTION public.guard_evidence_data_lock_mutation()
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_evidence_data_lock(
  _program_run_id uuid DEFAULT NULL,
  _sport_category text DEFAULT NULL,
  _sport_level text DEFAULT NULL,
  _include_test boolean DEFAULT false,
  _protocol_version text DEFAULT '56d-transfer-v2-2026-07'
)
RETURNS json
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  actor_id uuid := auth.uid();
  payload jsonb;
  manifest jsonb;
  lock_id uuid;
  schema_version text;
  checksum text;
  cutoff timestamptz := now();
BEGIN
  IF actor_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = actor_id AND ur.role = 'admin'::public.app_role
  ) THEN
    RAISE EXCEPTION 'admin_role_required' USING ERRCODE = '42501';
  END IF;

  IF _program_run_id IS NOT NULL AND (_sport_category IS NOT NULL OR _sport_level IS NOT NULL) THEN
    RAISE EXCEPTION 'program_run_and_solo_filter_conflict';
  END IF;

  IF _program_run_id IS NOT NULL THEN
    payload := public.get_performance_evidence_summary(
      _program_run_id,
      _include_test,
      _protocol_version
    )::jsonb;
  ELSE
    payload := public.get_solo_sport_evidence_summary(
      _sport_category,
      _sport_level,
      _include_test,
      _protocol_version
    )::jsonb;
  END IF;

  schema_version := COALESCE(payload ->> 'schema_version', 'unknown');
  checksum := encode(extensions.digest(convert_to(payload::text, 'UTF8'), 'sha256'), 'hex');
  manifest := jsonb_build_object(
    'manifest_version', 'evidence-analysis-manifest-v1-2026-07',
    'source_cutoff', cutoff,
    'scope_type', CASE WHEN _program_run_id IS NULL THEN 'solo_aggregate' ELSE 'program_run' END,
    'program_run_id', _program_run_id,
    'sport_category', _sport_category,
    'sport_level', _sport_level,
    'protocol_version', _protocol_version,
    'snapshot_schema_version', schema_version,
    'checksum_algorithm', 'sha256',
    'content_checksum', checksum,
    'minimum_aggregate_n', 5,
    'low_confidence_below_n', 10,
    'included_sections', jsonb_build_array(
      'sample', 'usage', 'domain_aggregates', 'weekly_aggregates',
      'data_quality', 'claim_boundary', 'privacy'
    ),
    'excluded_fields', jsonb_build_array(
      'email', 'full_name', 'journal_text', 'free_reflection',
      'raw_checkins', 'raw_questionnaire_answers', 'individual_scores',
      'individual_coach_observations'
    ),
    'claim_boundary', payload -> 'claim_boundary'
  );

  INSERT INTO public.evidence_data_locks(
    scope_type,
    program_run_id,
    sport_category,
    sport_level,
    protocol_version,
    snapshot_schema_version,
    source_cutoff,
    locked_by,
    include_test,
    content_checksum,
    evidence_payload,
    analysis_manifest
  ) VALUES (
    CASE WHEN _program_run_id IS NULL THEN 'solo_aggregate' ELSE 'program_run' END,
    _program_run_id,
    _sport_category,
    _sport_level,
    _protocol_version,
    schema_version,
    cutoff,
    actor_id,
    _include_test,
    checksum,
    payload,
    manifest
  ) RETURNING id INTO lock_id;

  RETURN json_build_object(
    'lock_id', lock_id,
    'content_checksum', checksum,
    'analysis_manifest', manifest,
    'evidence', payload
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_evidence_data_lock(_lock_id uuid)
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
  IF actor_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = actor_id AND ur.role = 'admin'::public.app_role
  ) THEN
    RAISE EXCEPTION 'admin_role_required' USING ERRCODE = '42501';
  END IF;

  SELECT json_build_object(
    'lock_id', edl.id,
    'status', edl.status,
    'scope_type', edl.scope_type,
    'program_run_id', edl.program_run_id,
    'sport_category', edl.sport_category,
    'sport_level', edl.sport_level,
    'protocol_version', edl.protocol_version,
    'snapshot_schema_version', edl.snapshot_schema_version,
    'source_cutoff', edl.source_cutoff,
    'locked_at', edl.locked_at,
    'include_test', edl.include_test,
    'checksum_algorithm', edl.checksum_algorithm,
    'content_checksum', edl.content_checksum,
    'invalidated_at', edl.invalidated_at,
    'invalidation_reason', edl.invalidation_reason,
    'analysis_manifest', edl.analysis_manifest,
    'evidence', edl.evidence_payload
  ) INTO result
  FROM public.evidence_data_locks edl
  WHERE edl.id = _lock_id;

  IF result IS NULL THEN
    RAISE EXCEPTION 'evidence_data_lock_not_found';
  END IF;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.invalidate_evidence_data_lock(
  _lock_id uuid,
  _reason text
)
RETURNS json
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  actor_id uuid := auth.uid();
  result json;
BEGIN
  IF actor_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = actor_id AND ur.role = 'admin'::public.app_role
  ) THEN
    RAISE EXCEPTION 'admin_role_required' USING ERRCODE = '42501';
  END IF;

  IF char_length(NULLIF(btrim(_reason), '')) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION 'invalidation_reason_required';
  END IF;

  UPDATE public.evidence_data_locks
  SET status = 'invalidated',
      invalidated_at = now(),
      invalidated_by = actor_id,
      invalidation_reason = btrim(_reason)
  WHERE id = _lock_id
    AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'active_evidence_data_lock_not_found';
  END IF;

  SELECT public.get_evidence_data_lock(_lock_id) INTO result;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.create_evidence_data_lock(uuid, text, text, boolean, text)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_evidence_data_lock(uuid)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.invalidate_evidence_data_lock(uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_evidence_data_lock(uuid, text, text, boolean, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_evidence_data_lock(uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.invalidate_evidence_data_lock(uuid, text)
  TO authenticated;

COMMENT ON TABLE public.evidence_data_locks IS
  'Payload-immutable, admin-created aggregate evidence snapshots for reproducible read-only exports. Locks can only be invalidated, never rewritten or deleted.';
COMMENT ON FUNCTION public.get_solo_sport_evidence_summary(text, text, boolean, text) IS
  'Admin-only solo aggregate by structured sport taxonomy. Values are suppressed below five distinct contributors.';

COMMIT;
