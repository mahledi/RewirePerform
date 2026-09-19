-- V1.5: privacy-safe team momentum for athletes.
--
-- This intentionally returns participation counts only. It never returns names,
-- user ids, check-in values, journals, reflections or a list of missing players.
BEGIN;

CREATE OR REPLACE FUNCTION public.get_athlete_team_momentum_v1_5()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  actor_id uuid := auth.uid();
  active_run_id uuid;
  active_team_id uuid;
  run_timezone text := 'Europe/Berlin';
  team_is_test boolean := false;
  effective_today date;
  assigned_count integer := 0;
  checked_in_today_count integer := 0;
  active_last_7d_count integer := 0;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles role
    WHERE role.user_id = actor_id
      AND role.role = 'athlete'::public.app_role
  ) THEN
    RAISE EXCEPTION 'athlete_role_required' USING ERRCODE = '42501';
  END IF;

  SELECT run.id, run.team_id, COALESCE(run.timezone, 'Europe/Berlin')
  INTO active_run_id, active_team_id, run_timezone
  FROM public.program_instances instance
  JOIN public.program_runs run ON run.id = instance.program_run_id
  JOIN public.team_members member
    ON member.team_id = run.team_id
   AND member.user_id = actor_id
  WHERE instance.user_id = actor_id
    AND instance.status = 'active'
    AND run.status = 'active'
  ORDER BY run.started_at DESC NULLS LAST, run.created_at DESC
  LIMIT 1;

  IF active_run_id IS NULL OR active_team_id IS NULL THEN
    RETURN jsonb_build_object(
      'available', false,
      'reason', 'no_active_team_run',
      'team_size', 0,
      'checked_in_today', 0,
      'active_7d', 0
    );
  END IF;

  SELECT COALESCE(team.is_test_team, false)
  INTO team_is_test
  FROM public.teams team
  WHERE team.id = active_team_id;

  IF team_is_test THEN
    SELECT override.simulated_date
    INTO effective_today
    FROM public.qa_time_overrides override
    WHERE override.scope = 'team'
      AND override.team_id = active_team_id
    ORDER BY override.updated_at DESC
    LIMIT 1;
  END IF;

  effective_today := COALESCE(
    effective_today,
    (pg_catalog.timezone(run_timezone, pg_catalog.now()))::date
  );

  SELECT COUNT(DISTINCT instance.user_id)::integer
  INTO assigned_count
  FROM public.program_instances instance
  JOIN public.team_members member
    ON member.team_id = active_team_id
   AND member.user_id = instance.user_id
  JOIN public.user_roles role
    ON role.user_id = instance.user_id
   AND role.role = 'athlete'::public.app_role
  JOIN public.profiles profile ON profile.id = instance.user_id
  WHERE instance.program_run_id = active_run_id
    AND instance.status = 'active'
    AND (
      (
        team_is_test
        AND COALESCE(profile.is_test_user, false)
        AND COALESCE(instance.is_test_instance, false)
      )
      OR (
        NOT team_is_test
        AND NOT COALESCE(profile.is_test_user, false)
        AND NOT COALESCE(instance.is_test_instance, false)
      )
    );

  IF assigned_count < 5 THEN
    RETURN jsonb_build_object(
      'available', false,
      'reason', 'team_below_minimum',
      'minimum_team_size', 5,
      'team_size', assigned_count,
      'checked_in_today', 0,
      'active_7d', 0,
      'today', effective_today
    );
  END IF;

  WITH run_athletes AS (
    SELECT instance.id, instance.user_id
    FROM public.program_instances instance
    JOIN public.team_members member
      ON member.team_id = active_team_id
     AND member.user_id = instance.user_id
    JOIN public.user_roles role
      ON role.user_id = instance.user_id
     AND role.role = 'athlete'::public.app_role
    JOIN public.profiles profile ON profile.id = instance.user_id
    WHERE instance.program_run_id = active_run_id
      AND instance.status = 'active'
      AND (
        (
          team_is_test
          AND COALESCE(profile.is_test_user, false)
          AND COALESCE(instance.is_test_instance, false)
        )
        OR (
          NOT team_is_test
          AND NOT COALESCE(profile.is_test_user, false)
          AND NOT COALESCE(instance.is_test_instance, false)
        )
      )
  )
  SELECT
    COUNT(DISTINCT checkin.user_id) FILTER (
      WHERE checkin.date = effective_today
    )::integer,
    COUNT(DISTINCT checkin.user_id) FILTER (
      WHERE checkin.date BETWEEN effective_today - 6 AND effective_today
    )::integer
  INTO checked_in_today_count, active_last_7d_count
  FROM public.daily_checkins checkin
  JOIN run_athletes athlete
    ON athlete.id = checkin.program_instance_id
   AND athlete.user_id = checkin.user_id
  WHERE checkin.date BETWEEN effective_today - 6 AND effective_today;

  RETURN jsonb_build_object(
    'available', true,
    'team_size', assigned_count,
    'checked_in_today', COALESCE(checked_in_today_count, 0),
    'active_7d', COALESCE(active_last_7d_count, 0),
    'today', effective_today,
    'privacy', jsonb_build_object(
      'identifiers_returned', false,
      'individual_status_returned', false,
      'checkin_values_returned', false,
      'private_text_returned', false,
      'minimum_team_size', 5
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_athlete_team_momentum_v1_5()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_athlete_team_momentum_v1_5()
  TO authenticated;

COMMENT ON FUNCTION public.get_athlete_team_momentum_v1_5() IS
  'Athlete-only team momentum. Returns anonymous run-scoped participation counts for teams with at least five athletes; never returns identities, individual status, check-in values or private text.';

COMMIT;
