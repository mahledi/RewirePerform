-- Internal tester boundary: coach core views and team counts.
BEGIN;

CREATE OR REPLACE FUNCTION public.get_team_questionnaire_status(_team_id uuid)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  is_complete boolean,
  last_category_index integer,
  progress_updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF NOT public.can_manage_team_program_runs(_team_id) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  RETURN QUERY
  WITH active_run AS (
    SELECT run.id
    FROM public.program_runs run
    WHERE run.team_id = _team_id AND run.status = 'active'
    ORDER BY run.started_at DESC, run.created_at DESC
    LIMIT 1
  ), athletes AS (
    SELECT DISTINCT member.user_id
    FROM public.team_members member
    JOIN public.user_roles role
      ON role.user_id = member.user_id
     AND role.role = 'athlete'::public.app_role
    JOIN public.profiles profile ON profile.id = member.user_id
    WHERE member.team_id = _team_id
      AND NOT COALESCE(profile.is_test_user, false)
  ), instances AS (
    SELECT instance.id, instance.user_id
    FROM public.program_instances instance
    JOIN athletes athlete ON athlete.user_id = instance.user_id
    WHERE instance.team_id = _team_id
      AND instance.status = 'active'
      AND NOT COALESCE(instance.is_test_instance, false)
      AND (
        instance.program_run_id = (SELECT run.id FROM active_run run)
        OR (
          instance.program_run_id IS NULL
          AND NOT EXISTS (SELECT 1 FROM active_run)
        )
      )
  ), latest_q AS (
    SELECT DISTINCT ON (response.user_id)
      response.user_id,
      response.is_complete,
      response.last_category_index,
      response.progress_updated_at
    FROM public.questionnaire_responses response
    JOIN instances instance
      ON instance.id = response.program_instance_id
     AND instance.user_id = response.user_id
    WHERE response.instrument_id = 'onboarding_v2' OR response.instrument_id IS NULL
    ORDER BY response.user_id, response.is_complete DESC,
      response.progress_updated_at DESC, response.created_at DESC
  )
  SELECT
    athlete.user_id,
    profile.full_name,
    COALESCE(latest.is_complete, false),
    COALESCE(latest.last_category_index, 0),
    latest.progress_updated_at
  FROM athletes athlete
  LEFT JOIN public.profiles profile ON profile.id = athlete.user_id
  LEFT JOIN latest_q latest ON latest.user_id = athlete.user_id
  ORDER BY profile.full_name NULLS LAST, athlete.user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_team_questionnaire_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_team_questionnaire_status(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_team_stats(team_id_param uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  result json;
  team_owner uuid;
BEGIN
  SELECT team.created_by
  INTO team_owner
  FROM public.teams team
  WHERE team.id = team_id_param;

  IF team_owner IS NULL OR team_owner != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: only the team creator can view stats';
  END IF;

  WITH official_members AS (
    SELECT member.user_id
    FROM public.team_members member
    JOIN public.profiles profile ON profile.id = member.user_id
    WHERE member.team_id = team_id_param
      AND NOT COALESCE(profile.is_test_user, false)
  )
  SELECT pg_catalog.json_build_object(
    'member_count', (SELECT COUNT(*) FROM official_members),
    'checkins_last_week', (
      SELECT COUNT(*)
      FROM public.daily_checkins checkin
      JOIN official_members member ON member.user_id = checkin.user_id
      WHERE checkin.date >= CURRENT_DATE - 7
    ),
    'assessments_completed', (
      SELECT COUNT(*)
      FROM public.assessments assessment
      JOIN official_members member ON member.user_id = assessment.user_id
    )
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_team_stats(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_team_stats(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_team_program_run_status(_program_run_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  target_run public.program_runs;
  result json;
BEGIN
  SELECT * INTO target_run
  FROM public.program_runs run
  WHERE run.id = _program_run_id;

  IF target_run.id IS NULL THEN
    RAISE EXCEPTION 'program_run_not_found';
  END IF;
  IF NOT (
    public.can_manage_team_program_runs(target_run.team_id)
    OR public.is_member_of_team(target_run.team_id)
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  WITH athletes AS (
    SELECT DISTINCT member.user_id
    FROM public.team_members member
    JOIN public.user_roles role
      ON role.user_id = member.user_id
     AND role.role = 'athlete'::public.app_role
    JOIN public.profiles profile ON profile.id = member.user_id
    WHERE member.team_id = target_run.team_id
      AND NOT COALESCE(profile.is_test_user, false)
  ), assigned AS (
    SELECT instance.user_id, instance.id, instance.status
    FROM public.program_instances instance
    JOIN athletes athlete ON athlete.user_id = instance.user_id
    WHERE instance.program_run_id = target_run.id
      AND NOT COALESCE(instance.is_test_instance, false)
  )
  SELECT pg_catalog.json_build_object(
    'run', row_to_json(target_run),
    'athletes_total', (SELECT COUNT(*) FROM athletes),
    'athletes_assigned', (SELECT COUNT(DISTINCT user_id) FROM assigned),
    'active_instances', (SELECT COUNT(*) FROM assigned WHERE status = 'active'),
    'athletes_missing_instance', (
      SELECT COUNT(*) FROM athletes athlete
      WHERE NOT EXISTS (
        SELECT 1 FROM assigned item WHERE item.user_id = athlete.user_id
      )
    )
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_team_program_run_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_team_program_run_status(uuid) TO authenticated;

-- Preserve the battle-tested run-clock implementation privately, then expose a
-- filtered wrapper. This keeps the activity semantics unchanged while ensuring
-- an internal tester can never appear in the coach dashboard.
ALTER FUNCTION public.get_coach_team_activity_status(uuid) SET SCHEMA app_private;
ALTER FUNCTION app_private.get_coach_team_activity_status(uuid)
  RENAME TO get_coach_team_activity_status_unfiltered_v1_3;
REVOKE ALL ON FUNCTION app_private.get_coach_team_activity_status_unfiltered_v1_3(uuid)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.get_coach_team_activity_status(_team_id uuid)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  last_activity_at timestamptz,
  days_completed integer,
  days_available integer,
  completion_rate numeric,
  current_streak integer,
  checkins_last_7d integer,
  last_checkin_date date,
  journal_entries_count integer,
  inactive_risk boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT status.*
  FROM app_private.get_coach_team_activity_status_unfiltered_v1_3(_team_id) status
  JOIN public.profiles profile ON profile.id = status.user_id
  WHERE NOT COALESCE(profile.is_test_user, false)
    AND NOT EXISTS (
      SELECT 1
      FROM public.program_instances instance
      WHERE instance.user_id = status.user_id
        AND instance.team_id = _team_id
        AND instance.status = 'active'
        AND COALESCE(instance.is_test_instance, false)
    );
$$;

REVOKE ALL ON FUNCTION public.get_coach_team_activity_status(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_coach_team_activity_status(uuid)
  TO authenticated;


COMMIT;

