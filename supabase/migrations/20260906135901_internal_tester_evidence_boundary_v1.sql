-- Internal tester boundary: coach Evidence context and writes.
BEGIN;

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
  effective_today date;
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

  SELECT protocol.coach_collection_enabled AND protocol.status = 'pilot'
  INTO protocol_enabled
  FROM public.evidence_protocols protocol
  WHERE protocol.version = _protocol_version;

  IF COALESCE(protocol_enabled, false) = false THEN
    RETURN pg_catalog.json_build_object(
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
  FROM public.program_runs run
  WHERE run.team_id = _team_id
    AND run.status = 'active'
  ORDER BY run.started_at DESC, run.created_at DESC
  LIMIT 1;

  IF target_run.id IS NULL OR target_run.started_at IS NULL THEN
    RETURN pg_catalog.json_build_object(
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

  effective_today := public.get_effective_today(actor_id);
  current_week := GREATEST(1, LEAST(8, ((effective_today - target_run.started_at) / 7) + 1));

  WITH athlete_instances AS (
    SELECT
      instance.id AS program_instance_id,
      instance.user_id,
      COALESCE(
        NULLIF(btrim(profile.full_name), ''),
        'Athlet ' || left(instance.user_id::text, 8)
      ) AS full_name,
      public.evidence_eligibility_reason(instance.id, _protocol_version) AS eligibility_reason
    FROM public.program_instances instance
    JOIN public.profiles profile ON profile.id = instance.user_id
    JOIN public.user_roles role
      ON role.user_id = instance.user_id
     AND role.role = 'athlete'::public.app_role
    WHERE instance.program_run_id = target_run.id
      AND instance.team_id = _team_id
      AND instance.status = 'active'
      AND NOT COALESCE(profile.is_test_user, false)
      AND NOT COALESCE(instance.is_test_instance, false)
  )
  SELECT
    COUNT(*)::integer,
    COUNT(*) FILTER (
      WHERE eligibility_reason IN ('eligible', 'eligible_minor')
    )::integer,
    COALESCE(
      pg_catalog.json_agg(
        pg_catalog.json_build_object(
          'program_instance_id', item.program_instance_id,
          'user_id', item.user_id,
          'full_name', item.full_name,
          'observation_available', true,
          'eligible', item.eligibility_reason IN ('eligible', 'eligible_minor'),
          'eligibility_reason', item.eligibility_reason,
          'review', (
            SELECT pg_catalog.json_build_object(
              'context', review.observation_context,
              'values', (
                SELECT COALESCE(
                  pg_catalog.json_object_agg(
                    observation.domain_id,
                    CASE
                      WHEN observation.not_observed THEN 'not_observed'
                      ELSE observation.score::text
                    END
                  ),
                  '{}'::json
                )
                FROM public.coach_evidence_observations observation
                WHERE observation.review_id = review.id
              )
            )
            FROM public.coach_evidence_reviews review
            WHERE review.coach_id = actor_id
              AND review.scope_type = 'athlete'
              AND review.target_program_instance_id = item.program_instance_id
              AND review.week_number = current_week
              AND NOT review.is_test
          )
        ) ORDER BY item.full_name
      ),
      '[]'::json
    )
  INTO athlete_count, eligible_count, athletes_json
  FROM athlete_instances item;

  SELECT pg_catalog.json_build_object(
    'context', review.observation_context,
    'values', (
      SELECT COALESCE(
        pg_catalog.json_object_agg(
          observation.domain_id,
          CASE
            WHEN observation.not_observed THEN 'not_observed'
            ELSE observation.score::text
          END
        ),
        '{}'::json
      )
      FROM public.coach_evidence_observations observation
      WHERE observation.review_id = review.id
    )
  ) INTO team_review_json
  FROM public.coach_evidence_reviews review
  WHERE review.coach_id = actor_id
    AND review.scope_type = 'team'
    AND review.program_run_id = target_run.id
    AND review.week_number = current_week
    AND NOT review.is_test;

  RETURN pg_catalog.json_build_object(
    'enabled', true,
    'reason', CASE
      WHEN athlete_count = 0 THEN 'no_athletes'
      WHEN eligible_count <> athlete_count THEN 'individual_observation_ready_team_evidence_restricted'
      ELSE 'ready'
    END,
    'protocol_version', _protocol_version,
    'run', pg_catalog.json_build_object(
      'id', target_run.id,
      'name', target_run.name,
      'started_at', target_run.started_at,
      'status', target_run.status
    ),
    'week_number', current_week,
    'effective_date', effective_today,
    'team_eligible', athlete_count > 0 AND eligible_count = athlete_count,
    'athlete_count', athlete_count,
    'eligible_athlete_count', eligible_count,
    'athletes', athletes_json,
    'team_review', team_review_json,
    'individual_visibility', 'entering_coach_only',
    'individual_observation_uses_athlete_private_content', false,
    'external_export_includes_individual_reviews', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_coach_evidence_review_context(uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_coach_evidence_review_context(uuid, text)
  TO authenticated;

-- Defense in depth for direct calls to the write RPC: an internal tester can
-- never become an athlete-scoped coach observation. Team reviews are normalized
-- to the number of official athletes and remain test-only only for test teams.
CREATE OR REPLACE FUNCTION app_private.enforce_internal_test_coach_review_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  target_is_internal_test boolean := false;
  official_athlete_count integer := 0;
  target_team_is_test boolean := false;
BEGIN
  SELECT COALESCE(team.is_test_team, false)
  INTO target_team_is_test
  FROM public.teams team
  WHERE team.id = NEW.team_id;

  IF NEW.scope_type = 'athlete' THEN
    SELECT
      COALESCE(profile.is_test_user, false)
      OR COALESCE(instance.is_test_instance, false)
    INTO target_is_internal_test
    FROM public.program_instances instance
    JOIN public.profiles profile ON profile.id = instance.user_id
    WHERE instance.id = NEW.target_program_instance_id;

    IF COALESCE(target_is_internal_test, false) THEN
      RAISE EXCEPTION 'internal_test_athlete_not_coach_visible' USING ERRCODE = '42501';
    END IF;
  ELSE
    SELECT COUNT(*)::integer
    INTO official_athlete_count
    FROM public.program_instances instance
    JOIN public.profiles profile ON profile.id = instance.user_id
    JOIN public.user_roles role
      ON role.user_id = instance.user_id
     AND role.role = 'athlete'::public.app_role
    WHERE instance.program_run_id = NEW.program_run_id
      AND instance.team_id = NEW.team_id
      AND instance.status = 'active'
      AND NOT COALESCE(profile.is_test_user, false)
      AND NOT COALESCE(instance.is_test_instance, false);

    IF official_athlete_count < 1 THEN
      RAISE EXCEPTION 'no_official_athletes_for_team_review';
    END IF;
    NEW.observed_athlete_count := official_athlete_count;
    NEW.is_test := target_team_is_test;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION app_private.enforce_internal_test_coach_review_v1()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_enforce_internal_test_coach_review_v1
  ON public.coach_evidence_reviews;
CREATE TRIGGER trg_enforce_internal_test_coach_review_v1
  BEFORE INSERT OR UPDATE OF scope_type, team_id, program_run_id,
    target_program_instance_id, observed_athlete_count, is_test
  ON public.coach_evidence_reviews
  FOR EACH ROW EXECUTE FUNCTION app_private.enforce_internal_test_coach_review_v1();


COMMIT;

