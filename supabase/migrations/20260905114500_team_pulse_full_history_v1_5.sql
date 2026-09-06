-- V1.5: full 56-day coach team-pulse history.
--
-- This is deliberately separate from the existing snapshot RPC so the current
-- dashboard keeps working if the history extension is temporarily unavailable.
-- All values remain run-scoped, authorization-gated and suppressed per metric
-- until at least five currently authorized athletes contributed.
BEGIN;

CREATE OR REPLACE FUNCTION public.get_team_pulse_history_v1_5(
  _team_id uuid,
  _protocol_version text DEFAULT '56d-transfer-v2-2026-07'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  actor_id uuid := auth.uid();
  active_run_id uuid;
  run_start date;
  run_timezone text := 'Europe/Berlin';
  team_creator uuid;
  team_is_test boolean := false;
  effective_today date;
  assigned_count integer := 0;
  eligible_count integer := 0;
  result jsonb;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles role
    WHERE role.user_id = actor_id
      AND role.role IN ('coach'::public.app_role, 'admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'coach_or_admin_role_required' USING ERRCODE = '42501';
  END IF;

  SELECT team.created_by, COALESCE(team.is_test_team, false)
  INTO team_creator, team_is_test
  FROM public.teams team
  WHERE team.id = _team_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'team_not_found'; END IF;

  IF team_creator IS DISTINCT FROM actor_id
     AND NOT EXISTS (
       SELECT 1 FROM public.team_members member
       WHERE member.team_id = _team_id AND member.user_id = actor_id
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.user_roles role
       WHERE role.user_id = actor_id AND role.role = 'admin'::public.app_role
     ) THEN
    RAISE EXCEPTION 'team_access_forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT run.id, run.started_at, COALESCE(run.timezone, 'Europe/Berlin')
  INTO active_run_id, run_start, run_timezone
  FROM public.program_runs run
  WHERE run.team_id = _team_id AND run.status = 'active'
  ORDER BY run.started_at DESC NULLS LAST, run.created_at DESC
  LIMIT 1;

  IF active_run_id IS NULL OR run_start IS NULL THEN
    RETURN jsonb_build_object('available', false, 'reason', 'no_active_program_run');
  END IF;

  IF team_is_test THEN
    SELECT override.simulated_date
    INTO effective_today
    FROM public.qa_time_overrides override
    WHERE override.scope = 'team' AND override.team_id = _team_id
    ORDER BY override.updated_at DESC
    LIMIT 1;
  END IF;
  effective_today := COALESCE(
    effective_today,
    (pg_catalog.timezone(run_timezone, pg_catalog.now()))::date
  );

  SELECT
    COUNT(DISTINCT instance.user_id)::integer,
    COUNT(DISTINCT instance.user_id) FILTER (
      WHERE public.evidence_eligibility_reason(instance.id, _protocol_version)
        IN ('eligible', 'eligible_minor', 'eligible_test')
    )::integer
  INTO assigned_count, eligible_count
  FROM public.program_instances instance
  JOIN public.team_members member
    ON member.team_id = _team_id AND member.user_id = instance.user_id
  JOIN public.user_roles role
    ON role.user_id = instance.user_id AND role.role = 'athlete'::public.app_role
  JOIN public.profiles profile ON profile.id = instance.user_id
  WHERE instance.program_run_id = active_run_id
    AND instance.status = 'active'
    AND (
      (team_is_test AND COALESCE(profile.is_test_user, false) AND COALESCE(instance.is_test_instance, false))
      OR
      (NOT team_is_test AND NOT COALESCE(profile.is_test_user, false) AND NOT COALESCE(instance.is_test_instance, false))
    );

  IF assigned_count < 5 OR eligible_count < 5 THEN
    RETURN jsonb_build_object(
      'available', false,
      'reason', CASE WHEN assigned_count < 5 THEN 'run_below_min_n' ELSE 'insufficient_authorized_data' END,
      'minimum_aggregate_n', 5
    );
  END IF;

  WITH eligible_instances AS (
    SELECT instance.id, instance.user_id
    FROM public.program_instances instance
    JOIN public.team_members member
      ON member.team_id = _team_id AND member.user_id = instance.user_id
    JOIN public.user_roles role
      ON role.user_id = instance.user_id AND role.role = 'athlete'::public.app_role
    JOIN public.profiles profile ON profile.id = instance.user_id
    WHERE instance.program_run_id = active_run_id
      AND instance.status = 'active'
      AND (
        (team_is_test AND COALESCE(profile.is_test_user, false) AND COALESCE(instance.is_test_instance, false))
        OR
        (NOT team_is_test AND NOT COALESCE(profile.is_test_user, false) AND NOT COALESCE(instance.is_test_instance, false))
      )
      AND public.evidence_eligibility_reason(instance.id, _protocol_version)
        IN ('eligible', 'eligible_minor', 'eligible_test')
  ), safe_rows AS (
    SELECT
      checkin.user_id,
      checkin.date,
      COALESCE(
        CASE WHEN jsonb_typeof(checkin.wellbeing_metrics -> 'mood') = 'number'
          AND (checkin.wellbeing_metrics ->> 'mood')::numeric BETWEEN 1 AND 10
          THEN (checkin.wellbeing_metrics ->> 'mood')::numeric END,
        CASE WHEN checkin.mood_before BETWEEN 1 AND 10 THEN checkin.mood_before::numeric END
      ) AS mood,
      COALESCE(
        CASE WHEN jsonb_typeof(checkin.wellbeing_metrics -> 'energy') = 'number'
          AND (checkin.wellbeing_metrics ->> 'energy')::numeric BETWEEN 1 AND 10
          THEN (checkin.wellbeing_metrics ->> 'energy')::numeric END,
        CASE WHEN checkin.energy_level BETWEEN 1 AND 10 THEN checkin.energy_level::numeric END
      ) AS energy,
      COALESCE(
        CASE WHEN jsonb_typeof(checkin.wellbeing_metrics -> 'focus') = 'number'
          AND (checkin.wellbeing_metrics ->> 'focus')::numeric BETWEEN 0 AND 10
          THEN (checkin.wellbeing_metrics ->> 'focus')::numeric END,
        CASE WHEN checkin.focus_rating BETWEEN 0 AND 10 THEN checkin.focus_rating::numeric END
      ) AS focus,
      CASE WHEN jsonb_typeof(checkin.wellbeing_metrics -> 'stress') = 'number'
        AND (checkin.wellbeing_metrics ->> 'stress')::numeric BETWEEN 1 AND 10
        THEN (checkin.wellbeing_metrics ->> 'stress')::numeric END AS stress,
      CASE WHEN jsonb_typeof(checkin.wellbeing_metrics -> 'recovery') = 'number'
        AND (checkin.wellbeing_metrics ->> 'recovery')::numeric BETWEEN 1 AND 10
        THEN (checkin.wellbeing_metrics ->> 'recovery')::numeric END AS recovery,
      CASE WHEN jsonb_typeof(checkin.wellbeing_metrics -> 'sleep_quality') = 'number'
        AND (checkin.wellbeing_metrics ->> 'sleep_quality')::numeric BETWEEN 1 AND 10
        THEN (checkin.wellbeing_metrics ->> 'sleep_quality')::numeric END AS sleep_quality,
      CASE WHEN jsonb_typeof(checkin.wellbeing_metrics -> 'physical_readiness') = 'number'
        AND (checkin.wellbeing_metrics ->> 'physical_readiness')::numeric BETWEEN 1 AND 10
        THEN (checkin.wellbeing_metrics ->> 'physical_readiness')::numeric END AS physical_readiness,
      CASE WHEN jsonb_typeof(checkin.wellbeing_metrics -> 'motivation') = 'number'
        AND (checkin.wellbeing_metrics ->> 'motivation')::numeric BETWEEN 1 AND 10
        THEN (checkin.wellbeing_metrics ->> 'motivation')::numeric END AS motivation,
      CASE WHEN jsonb_typeof(checkin.wellbeing_metrics -> 'pressure') = 'number'
        AND (checkin.wellbeing_metrics ->> 'pressure')::numeric BETWEEN 1 AND 10
        THEN (checkin.wellbeing_metrics ->> 'pressure')::numeric END AS pressure,
      CASE WHEN jsonb_typeof(checkin.wellbeing_metrics -> 'team_connection') = 'number'
        AND (checkin.wellbeing_metrics ->> 'team_connection')::numeric BETWEEN 1 AND 10
        THEN (checkin.wellbeing_metrics ->> 'team_connection')::numeric END AS team_connection
    FROM public.daily_checkins checkin
    JOIN eligible_instances instance
      ON instance.id = checkin.program_instance_id AND instance.user_id = checkin.user_id
    WHERE checkin.date BETWEEN GREATEST(run_start, effective_today - 55) AND effective_today
  ), daily_user AS (
    SELECT
      row.user_id, row.date,
      AVG(row.mood) mood, AVG(row.energy) energy, AVG(row.focus) focus,
      AVG(row.stress) stress, AVG(row.recovery) recovery,
      AVG(row.sleep_quality) sleep_quality, AVG(row.physical_readiness) physical_readiness,
      AVG(row.motivation) motivation, AVG(row.pressure) pressure,
      AVG(row.team_connection) team_connection
    FROM safe_rows row
    GROUP BY row.user_id, row.date
  ), day_periods AS (
    SELECT period::date AS date
    FROM generate_series(
      GREATEST(run_start, effective_today - 55),
      effective_today,
      '1 day'::interval
    ) period
  ), day_stats AS (
    SELECT
      period.date,
      COUNT(DISTINCT day.user_id)::integer n_users,
      COUNT(day.mood)::integer mood_n, ROUND(AVG(day.mood), 1) mood,
      COUNT(day.energy)::integer energy_n, ROUND(AVG(day.energy), 1) energy,
      COUNT(day.focus)::integer focus_n, ROUND(AVG(day.focus), 1) focus,
      COUNT(day.stress)::integer stress_n, ROUND(AVG(day.stress), 1) stress,
      COUNT(day.recovery)::integer recovery_n, ROUND(AVG(day.recovery), 1) recovery,
      COUNT(day.sleep_quality)::integer sleep_quality_n, ROUND(AVG(day.sleep_quality), 1) sleep_quality,
      COUNT(day.physical_readiness)::integer physical_readiness_n, ROUND(AVG(day.physical_readiness), 1) physical_readiness,
      COUNT(day.motivation)::integer motivation_n, ROUND(AVG(day.motivation), 1) motivation,
      COUNT(day.pressure)::integer pressure_n, ROUND(AVG(day.pressure), 1) pressure,
      COUNT(day.team_connection)::integer team_connection_n, ROUND(AVG(day.team_connection), 1) team_connection
    FROM day_periods period
    LEFT JOIN daily_user day ON day.date = period.date
    GROUP BY period.date
  ), week_periods AS (
    SELECT period::date AS start
    FROM generate_series(
      date_trunc('week', GREATEST(run_start, effective_today - 55)::timestamp),
      date_trunc('week', effective_today::timestamp),
      '1 week'::interval
    ) period
  ), weekly_user AS (
    SELECT
      period.start,
      day.user_id,
      AVG(day.mood) mood, AVG(day.energy) energy, AVG(day.focus) focus,
      AVG(day.stress) stress, AVG(day.recovery) recovery,
      AVG(day.sleep_quality) sleep_quality, AVG(day.physical_readiness) physical_readiness,
      AVG(day.motivation) motivation, AVG(day.pressure) pressure,
      AVG(day.team_connection) team_connection
    FROM week_periods period
    JOIN daily_user day ON day.date >= period.start AND day.date < period.start + 7
    GROUP BY period.start, day.user_id
  ), week_stats AS (
    SELECT
      period.start,
      COUNT(week.user_id)::integer n_users,
      COUNT(week.mood)::integer mood_n, ROUND(AVG(week.mood), 1) mood,
      COUNT(week.energy)::integer energy_n, ROUND(AVG(week.energy), 1) energy,
      COUNT(week.focus)::integer focus_n, ROUND(AVG(week.focus), 1) focus,
      COUNT(week.stress)::integer stress_n, ROUND(AVG(week.stress), 1) stress,
      COUNT(week.recovery)::integer recovery_n, ROUND(AVG(week.recovery), 1) recovery,
      COUNT(week.sleep_quality)::integer sleep_quality_n, ROUND(AVG(week.sleep_quality), 1) sleep_quality,
      COUNT(week.physical_readiness)::integer physical_readiness_n, ROUND(AVG(week.physical_readiness), 1) physical_readiness,
      COUNT(week.motivation)::integer motivation_n, ROUND(AVG(week.motivation), 1) motivation,
      COUNT(week.pressure)::integer pressure_n, ROUND(AVG(week.pressure), 1) pressure,
      COUNT(week.team_connection)::integer team_connection_n, ROUND(AVG(week.team_connection), 1) team_connection
    FROM week_periods period
    LEFT JOIN weekly_user week ON week.start = period.start
    GROUP BY period.start
  )
  SELECT jsonb_build_object(
    'available', true,
    'daily_trends', (
      SELECT jsonb_agg(jsonb_build_object(
        'date', day.date, 'n_users', day.n_users,
        'sufficient_data', day.n_users >= 5, 'low_confidence', day.n_users BETWEEN 5 AND 9,
        'mood', CASE WHEN day.mood_n >= 5 THEN day.mood END,
        'energy', CASE WHEN day.energy_n >= 5 THEN day.energy END,
        'focus', CASE WHEN day.focus_n >= 5 THEN day.focus END,
        'stress', CASE WHEN day.stress_n >= 5 THEN day.stress END,
        'recovery', CASE WHEN day.recovery_n >= 5 THEN day.recovery END,
        'sleep_quality', CASE WHEN day.sleep_quality_n >= 5 THEN day.sleep_quality END,
        'physical_readiness', CASE WHEN day.physical_readiness_n >= 5 THEN day.physical_readiness END,
        'motivation', CASE WHEN day.motivation_n >= 5 THEN day.motivation END,
        'pressure', CASE WHEN day.pressure_n >= 5 THEN day.pressure END,
        'team_connection', CASE WHEN day.team_connection_n >= 5 THEN day.team_connection END
      ) ORDER BY day.date) FROM day_stats day
    ),
    'weekly_trends', (
      SELECT jsonb_agg(jsonb_build_object(
        'week', CASE
          WHEN week.start = date_trunc('week', effective_today::timestamp)::date THEN 'Diese Woche'
          WHEN week.start = date_trunc('week', effective_today::timestamp)::date - 7 THEN 'Letzte Woche'
          ELSE 'Woche ab ' || to_char(week.start, 'DD.MM.')
        END,
        'start', week.start, 'n_users', week.n_users,
        'sufficient_data', week.n_users >= 5, 'low_confidence', week.n_users BETWEEN 5 AND 9,
        'mood', CASE WHEN week.mood_n >= 5 THEN week.mood END,
        'energy', CASE WHEN week.energy_n >= 5 THEN week.energy END,
        'focus', CASE WHEN week.focus_n >= 5 THEN week.focus END,
        'stress', CASE WHEN week.stress_n >= 5 THEN week.stress END,
        'recovery', CASE WHEN week.recovery_n >= 5 THEN week.recovery END,
        'sleep_quality', CASE WHEN week.sleep_quality_n >= 5 THEN week.sleep_quality END,
        'physical_readiness', CASE WHEN week.physical_readiness_n >= 5 THEN week.physical_readiness END,
        'motivation', CASE WHEN week.motivation_n >= 5 THEN week.motivation END,
        'pressure', CASE WHEN week.pressure_n >= 5 THEN week.pressure END,
        'team_connection', CASE WHEN week.team_connection_n >= 5 THEN week.team_connection END
      ) ORDER BY week.start) FROM week_stats week
    ),
    'privacy', jsonb_build_object(
      'identifiers_returned', false,
      'individual_values_returned', false,
      'private_text_returned', false,
      'minimum_aggregate_n', 5,
      'authorization_gate', 'evidence_eligibility_reason'
    )
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_team_pulse_history_v1_5(uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_team_pulse_history_v1_5(uuid, text)
  TO authenticated;

COMMENT ON FUNCTION public.get_team_pulse_history_v1_5(uuid, text) IS
  'Coach/admin-only 56-day team pulse history. Returns per-metric n>=5 aggregates only and never returns athlete identifiers or private text.';

COMMIT;
