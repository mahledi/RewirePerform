BEGIN;

CREATE OR REPLACE FUNCTION public.get_team_mental_state_aggregate(
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
  team_creator uuid;
  team_is_test boolean := false;
  effective_today date := CURRENT_DATE;
  assigned_count integer := 0;
  eligible_count integer := 0;
  active_last_7d integer := 0;
  participation_rate integer := 0;
  result jsonb;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = actor_id
      AND ur.role IN ('coach'::public.app_role, 'admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'coach_or_admin_role_required' USING ERRCODE = '42501';
  END IF;

  SELECT t.created_by, COALESCE(t.is_test_team, false)
  INTO team_creator, team_is_test
  FROM public.teams t
  WHERE t.id = _team_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'team_not_found';
  END IF;

  IF team_creator IS DISTINCT FROM actor_id
     AND NOT EXISTS (
       SELECT 1
       FROM public.team_members tm
       WHERE tm.team_id = _team_id
         AND tm.user_id = actor_id
     )
     AND NOT EXISTS (
       SELECT 1
       FROM public.user_roles ur
       WHERE ur.user_id = actor_id
         AND ur.role = 'admin'::public.app_role
     ) THEN
    RAISE EXCEPTION 'team_access_forbidden' USING ERRCODE = '42501';
  END IF;

  IF team_is_test THEN
    SELECT qto.simulated_date
    INTO effective_today
    FROM public.qa_time_overrides qto
    WHERE qto.scope = 'team'
      AND qto.team_id = _team_id
    ORDER BY qto.updated_at DESC
    LIMIT 1;
    effective_today := COALESCE(effective_today, CURRENT_DATE);
  END IF;

  SELECT pr.id
  INTO active_run_id
  FROM public.program_runs pr
  WHERE pr.team_id = _team_id
    AND pr.status = 'active'
  ORDER BY pr.started_at DESC NULLS LAST, pr.created_at DESC
  LIMIT 1;

  IF active_run_id IS NULL THEN
    RETURN jsonb_build_object(
      'insufficient_data', true,
      'insufficient_reason', 'no_active_program_run',
      'min_n', 5,
      'teamSize', 0,
      'energy', jsonb_build_object('current', NULL, 'trend', '[]'::jsonb),
      'mood', jsonb_build_object('current', NULL, 'trend', '[]'::jsonb),
      'focus', jsonb_build_object('current', NULL, 'trend', '[]'::jsonb),
      'participation', jsonb_build_object('rate', 0, 'total', 0),
      'stressWarning', false
    );
  END IF;

  SELECT COUNT(DISTINCT pi.user_id)::integer
  INTO assigned_count
  FROM public.program_instances pi
  JOIN public.team_members tm
    ON tm.team_id = _team_id AND tm.user_id = pi.user_id
  JOIN public.user_roles ur
    ON ur.user_id = pi.user_id AND ur.role = 'athlete'::public.app_role
  JOIN public.profiles p ON p.id = pi.user_id
  WHERE pi.program_run_id = active_run_id
    AND pi.status = 'active'
    AND (
      (
        team_is_test
        AND COALESCE(p.is_test_user, false)
        AND COALESCE(pi.is_test_instance, false)
      )
      OR (
        NOT team_is_test
        AND NOT COALESCE(p.is_test_user, false)
        AND NOT COALESCE(pi.is_test_instance, false)
      )
    );

  IF assigned_count < 5 THEN
    RETURN jsonb_build_object(
      'insufficient_data', true,
      'insufficient_reason', 'run_below_min_n',
      'min_n', 5,
      'teamSize', assigned_count,
      'energy', jsonb_build_object('current', NULL, 'trend', '[]'::jsonb),
      'mood', jsonb_build_object('current', NULL, 'trend', '[]'::jsonb),
      'focus', jsonb_build_object('current', NULL, 'trend', '[]'::jsonb),
      'participation', jsonb_build_object('rate', 0, 'total', 0),
      'stressWarning', false
    );
  END IF;

  SELECT COUNT(DISTINCT dc.user_id)::integer
  INTO active_last_7d
  FROM public.daily_checkins dc
  JOIN public.program_instances pi
    ON pi.id = dc.program_instance_id
   AND pi.program_run_id = active_run_id
   AND pi.status = 'active'
  JOIN public.profiles p ON p.id = pi.user_id
  WHERE dc.date >= effective_today - 6
    AND dc.date <= effective_today
    AND (
      (
        team_is_test
        AND COALESCE(p.is_test_user, false)
        AND COALESCE(pi.is_test_instance, false)
      )
      OR (
        NOT team_is_test
        AND NOT COALESCE(p.is_test_user, false)
        AND NOT COALESCE(pi.is_test_instance, false)
      )
    );

  participation_rate := ROUND((active_last_7d::numeric / assigned_count::numeric) * 100)::integer;

  SELECT COUNT(DISTINCT pi.user_id)::integer
  INTO eligible_count
  FROM public.program_instances pi
  JOIN public.team_members tm
    ON tm.team_id = _team_id AND tm.user_id = pi.user_id
  JOIN public.user_roles ur
    ON ur.user_id = pi.user_id AND ur.role = 'athlete'::public.app_role
  JOIN public.profiles p ON p.id = pi.user_id
  WHERE pi.program_run_id = active_run_id
    AND pi.status = 'active'
    AND (
      (
        team_is_test
        AND COALESCE(p.is_test_user, false)
        AND COALESCE(pi.is_test_instance, false)
      )
      OR (
        NOT team_is_test
        AND NOT COALESCE(p.is_test_user, false)
        AND NOT COALESCE(pi.is_test_instance, false)
      )
    )
    AND public.evidence_eligibility_reason(pi.id, _protocol_version)
      IN ('eligible', 'eligible_minor', 'eligible_test');

  IF eligible_count < 5 THEN
    RETURN jsonb_build_object(
      'insufficient_data', true,
      'insufficient_reason', 'insufficient_authorized_data',
      'min_n', 5,
      'teamSize', assigned_count,
      'program_run_id', active_run_id,
      'energy', jsonb_build_object('current', NULL, 'trend', '[]'::jsonb),
      'mood', jsonb_build_object('current', NULL, 'trend', '[]'::jsonb),
      'focus', jsonb_build_object('current', NULL, 'trend', '[]'::jsonb),
      'participation', jsonb_build_object('rate', participation_rate, 'total', active_last_7d),
      'stressWarning', false
    );
  END IF;

  WITH eligible_instances AS (
    SELECT pi.id, pi.user_id
    FROM public.program_instances pi
    JOIN public.team_members tm
      ON tm.team_id = _team_id AND tm.user_id = pi.user_id
    JOIN public.user_roles ur
      ON ur.user_id = pi.user_id AND ur.role = 'athlete'::public.app_role
    JOIN public.profiles p ON p.id = pi.user_id
    WHERE pi.program_run_id = active_run_id
      AND pi.status = 'active'
      AND (
        (
          team_is_test
          AND COALESCE(p.is_test_user, false)
          AND COALESCE(pi.is_test_instance, false)
        )
        OR (
          NOT team_is_test
          AND NOT COALESCE(p.is_test_user, false)
          AND NOT COALESCE(pi.is_test_instance, false)
        )
      )
      AND public.evidence_eligibility_reason(pi.id, _protocol_version)
        IN ('eligible', 'eligible_minor', 'eligible_test')
  ), safe_checkin_rows AS (
    SELECT
      dc.user_id,
      dc.date,
      COALESCE(
        CASE WHEN jsonb_typeof(dc.wellbeing_metrics -> 'mood') = 'number'
          AND (dc.wellbeing_metrics ->> 'mood')::numeric BETWEEN 1 AND 10
          THEN (dc.wellbeing_metrics ->> 'mood')::numeric END,
        CASE WHEN dc.mood_before BETWEEN 1 AND 10 THEN dc.mood_before::numeric END
      ) AS mood,
      COALESCE(
        CASE WHEN jsonb_typeof(dc.wellbeing_metrics -> 'energy') = 'number'
          AND (dc.wellbeing_metrics ->> 'energy')::numeric BETWEEN 1 AND 10
          THEN (dc.wellbeing_metrics ->> 'energy')::numeric END,
        CASE WHEN dc.energy_level BETWEEN 1 AND 10 THEN dc.energy_level::numeric END
      ) AS energy,
      COALESCE(
        CASE WHEN jsonb_typeof(dc.wellbeing_metrics -> 'focus') = 'number'
          AND (dc.wellbeing_metrics ->> 'focus')::numeric BETWEEN 1 AND 10
          THEN (dc.wellbeing_metrics ->> 'focus')::numeric END,
        CASE WHEN dc.focus_rating BETWEEN 1 AND 10 THEN dc.focus_rating::numeric END
      ) AS focus,
      CASE WHEN jsonb_typeof(dc.wellbeing_metrics -> 'stress') = 'number'
        AND (dc.wellbeing_metrics ->> 'stress')::numeric BETWEEN 1 AND 10
        THEN (dc.wellbeing_metrics ->> 'stress')::numeric END AS stress,
      CASE WHEN jsonb_typeof(dc.wellbeing_metrics -> 'recovery') = 'number'
        AND (dc.wellbeing_metrics ->> 'recovery')::numeric BETWEEN 1 AND 10
        THEN (dc.wellbeing_metrics ->> 'recovery')::numeric END AS recovery,
      CASE WHEN jsonb_typeof(dc.wellbeing_metrics -> 'sleep_quality') = 'number'
        AND (dc.wellbeing_metrics ->> 'sleep_quality')::numeric BETWEEN 1 AND 10
        THEN (dc.wellbeing_metrics ->> 'sleep_quality')::numeric END AS sleep_quality,
      CASE WHEN jsonb_typeof(dc.wellbeing_metrics -> 'physical_readiness') = 'number'
        AND (dc.wellbeing_metrics ->> 'physical_readiness')::numeric BETWEEN 1 AND 10
        THEN (dc.wellbeing_metrics ->> 'physical_readiness')::numeric END AS physical_readiness,
      CASE WHEN jsonb_typeof(dc.wellbeing_metrics -> 'motivation') = 'number'
        AND (dc.wellbeing_metrics ->> 'motivation')::numeric BETWEEN 1 AND 10
        THEN (dc.wellbeing_metrics ->> 'motivation')::numeric END AS motivation,
      CASE WHEN jsonb_typeof(dc.wellbeing_metrics -> 'pressure') = 'number'
        AND (dc.wellbeing_metrics ->> 'pressure')::numeric BETWEEN 1 AND 10
        THEN (dc.wellbeing_metrics ->> 'pressure')::numeric END AS pressure,
      CASE WHEN jsonb_typeof(dc.wellbeing_metrics -> 'team_connection') = 'number'
        AND (dc.wellbeing_metrics ->> 'team_connection')::numeric BETWEEN 1 AND 10
        THEN (dc.wellbeing_metrics ->> 'team_connection')::numeric END AS team_connection
    FROM public.daily_checkins dc
    JOIN eligible_instances ei
      ON ei.id = dc.program_instance_id AND ei.user_id = dc.user_id
    WHERE dc.date >= effective_today - 27
      AND dc.date <= effective_today
  ), safe_checkins AS (
    SELECT
      scr.user_id,
      scr.date,
      AVG(scr.mood) AS mood,
      AVG(scr.energy) AS energy,
      AVG(scr.focus) AS focus,
      AVG(scr.stress) AS stress,
      AVG(scr.recovery) AS recovery,
      AVG(scr.sleep_quality) AS sleep_quality,
      AVG(scr.physical_readiness) AS physical_readiness,
      AVG(scr.motivation) AS motivation,
      AVG(scr.pressure) AS pressure,
      AVG(scr.team_connection) AS team_connection
    FROM safe_checkin_rows scr
    GROUP BY scr.user_id, scr.date
  ), daily_periods AS (
    SELECT (effective_today - offset_days)::date AS period_date
    FROM generate_series(13, 0, -1) AS offsets(offset_days)
  ), daily_stats AS (
    SELECT
      dp.period_date,
      COUNT(DISTINCT sc.user_id)::integer AS n_users,
      COUNT(sc.mood)::integer AS mood_n,
      COUNT(sc.energy)::integer AS energy_n,
      COUNT(sc.focus)::integer AS focus_n,
      COUNT(sc.stress)::integer AS stress_n,
      COUNT(sc.recovery)::integer AS recovery_n,
      COUNT(sc.sleep_quality)::integer AS sleep_quality_n,
      COUNT(sc.physical_readiness)::integer AS physical_readiness_n,
      COUNT(sc.motivation)::integer AS motivation_n,
      COUNT(sc.pressure)::integer AS pressure_n,
      COUNT(sc.team_connection)::integer AS team_connection_n,
      ROUND(AVG(sc.mood), 1) AS mood,
      ROUND(AVG(sc.energy), 1) AS energy,
      ROUND(AVG(sc.focus), 1) AS focus,
      ROUND(AVG(sc.stress), 1) AS stress,
      ROUND(AVG(sc.recovery), 1) AS recovery,
      ROUND(AVG(sc.sleep_quality), 1) AS sleep_quality,
      ROUND(AVG(sc.physical_readiness), 1) AS physical_readiness,
      ROUND(AVG(sc.motivation), 1) AS motivation,
      ROUND(AVG(sc.pressure), 1) AS pressure,
      ROUND(AVG(sc.team_connection), 1) AS team_connection
    FROM daily_periods dp
    LEFT JOIN safe_checkins sc ON sc.date = dp.period_date
    GROUP BY dp.period_date
  ), weekly_periods AS (
    SELECT
      week_offset,
      (effective_today - (week_offset * 7))::date AS start_date,
      (effective_today - (week_offset * 7) + 7)::date AS end_date,
      CASE
        WHEN week_offset = 0 THEN 'Diese Woche'
        WHEN week_offset = 1 THEN 'Letzte Woche'
        ELSE 'Vor ' || week_offset::text || ' Wochen'
      END AS label
    FROM generate_series(3, 0, -1) AS offsets(week_offset)
  ), weekly_user_stats AS (
    SELECT
      wp.week_offset,
      wp.start_date,
      wp.label,
      sc.user_id,
      AVG(sc.mood) AS mood,
      AVG(sc.energy) AS energy,
      AVG(sc.focus) AS focus,
      AVG(sc.stress) AS stress,
      AVG(sc.recovery) AS recovery,
      AVG(sc.sleep_quality) AS sleep_quality,
      AVG(sc.physical_readiness) AS physical_readiness,
      AVG(sc.motivation) AS motivation,
      AVG(sc.pressure) AS pressure,
      AVG(sc.team_connection) AS team_connection
    FROM weekly_periods wp
    JOIN safe_checkins sc
      ON sc.date >= wp.start_date AND sc.date < wp.end_date
    GROUP BY wp.week_offset, wp.start_date, wp.label, sc.user_id
  ), weekly_stats AS (
    SELECT
      wp.week_offset,
      wp.start_date,
      wp.label,
      COUNT(wus.user_id)::integer AS n_users,
      COUNT(wus.mood)::integer AS mood_n,
      COUNT(wus.energy)::integer AS energy_n,
      COUNT(wus.focus)::integer AS focus_n,
      COUNT(wus.stress)::integer AS stress_n,
      COUNT(wus.recovery)::integer AS recovery_n,
      COUNT(wus.sleep_quality)::integer AS sleep_quality_n,
      COUNT(wus.physical_readiness)::integer AS physical_readiness_n,
      COUNT(wus.motivation)::integer AS motivation_n,
      COUNT(wus.pressure)::integer AS pressure_n,
      COUNT(wus.team_connection)::integer AS team_connection_n,
      ROUND(AVG(wus.mood), 1) AS mood,
      ROUND(AVG(wus.energy), 1) AS energy,
      ROUND(AVG(wus.focus), 1) AS focus,
      ROUND(AVG(wus.stress), 1) AS stress,
      ROUND(AVG(wus.recovery), 1) AS recovery,
      ROUND(AVG(wus.sleep_quality), 1) AS sleep_quality,
      ROUND(AVG(wus.physical_readiness), 1) AS physical_readiness,
      ROUND(AVG(wus.motivation), 1) AS motivation,
      ROUND(AVG(wus.pressure), 1) AS pressure,
      ROUND(AVG(wus.team_connection), 1) AS team_connection
    FROM weekly_periods wp
    LEFT JOIN weekly_user_stats wus ON wus.week_offset = wp.week_offset
    GROUP BY wp.week_offset, wp.start_date, wp.label
  ), daily_payload AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'date', ds.period_date,
        'n_users', ds.n_users,
        'sufficient_data', ds.n_users >= 5,
        'low_confidence', ds.n_users BETWEEN 5 AND 9,
        'mood_n', ds.mood_n,
        'energy_n', ds.energy_n,
        'focus_n', ds.focus_n,
        'stress_n', ds.stress_n,
        'recovery_n', ds.recovery_n,
        'sleep_quality_n', ds.sleep_quality_n,
        'physical_readiness_n', ds.physical_readiness_n,
        'motivation_n', ds.motivation_n,
        'pressure_n', ds.pressure_n,
        'team_connection_n', ds.team_connection_n,
        'mood', CASE WHEN ds.mood_n >= 5 THEN ds.mood END,
        'energy', CASE WHEN ds.energy_n >= 5 THEN ds.energy END,
        'focus', CASE WHEN ds.focus_n >= 5 THEN ds.focus END,
        'stress', CASE WHEN ds.stress_n >= 5 THEN ds.stress END,
        'recovery', CASE WHEN ds.recovery_n >= 5 THEN ds.recovery END,
        'sleep_quality', CASE WHEN ds.sleep_quality_n >= 5 THEN ds.sleep_quality END,
        'physical_readiness', CASE WHEN ds.physical_readiness_n >= 5 THEN ds.physical_readiness END,
        'motivation', CASE WHEN ds.motivation_n >= 5 THEN ds.motivation END,
        'pressure', CASE WHEN ds.pressure_n >= 5 THEN ds.pressure END,
        'team_connection', CASE WHEN ds.team_connection_n >= 5 THEN ds.team_connection END
      ) ORDER BY ds.period_date
    ) AS payload
    FROM daily_stats ds
  ), weekly_payload AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'week', ws.label,
        'start', ws.start_date,
        'n_users', ws.n_users,
        'sufficient_data', ws.n_users >= 5,
        'low_confidence', ws.n_users BETWEEN 5 AND 9,
        'mood_n', ws.mood_n,
        'energy_n', ws.energy_n,
        'focus_n', ws.focus_n,
        'stress_n', ws.stress_n,
        'recovery_n', ws.recovery_n,
        'sleep_quality_n', ws.sleep_quality_n,
        'physical_readiness_n', ws.physical_readiness_n,
        'motivation_n', ws.motivation_n,
        'pressure_n', ws.pressure_n,
        'team_connection_n', ws.team_connection_n,
        'mood', CASE WHEN ws.mood_n >= 5 THEN ws.mood END,
        'energy', CASE WHEN ws.energy_n >= 5 THEN ws.energy END,
        'focus', CASE WHEN ws.focus_n >= 5 THEN ws.focus END,
        'stress', CASE WHEN ws.stress_n >= 5 THEN ws.stress END,
        'recovery', CASE WHEN ws.recovery_n >= 5 THEN ws.recovery END,
        'sleep_quality', CASE WHEN ws.sleep_quality_n >= 5 THEN ws.sleep_quality END,
        'physical_readiness', CASE WHEN ws.physical_readiness_n >= 5 THEN ws.physical_readiness END,
        'motivation', CASE WHEN ws.motivation_n >= 5 THEN ws.motivation END,
        'pressure', CASE WHEN ws.pressure_n >= 5 THEN ws.pressure END,
        'team_connection', CASE WHEN ws.team_connection_n >= 5 THEN ws.team_connection END
      ) ORDER BY ws.week_offset DESC
    ) AS payload
    FROM weekly_stats ws
  ), trend_payload AS (
    SELECT
      jsonb_agg(jsonb_build_object(
        'week', ws.label,
        'value', CASE WHEN ws.energy_n >= 5 THEN ws.energy END,
        'n_users', ws.energy_n,
        'sufficient_data', ws.energy_n >= 5
      ) ORDER BY ws.week_offset DESC) AS energy,
      jsonb_agg(jsonb_build_object(
        'week', ws.label,
        'value', CASE WHEN ws.mood_n >= 5 THEN ws.mood END,
        'n_users', ws.mood_n,
        'sufficient_data', ws.mood_n >= 5
      ) ORDER BY ws.week_offset DESC) AS mood,
      jsonb_agg(jsonb_build_object(
        'week', ws.label,
        'value', CASE WHEN ws.focus_n >= 5 THEN ws.focus END,
        'n_users', ws.focus_n,
        'sufficient_data', ws.focus_n >= 5
      ) ORDER BY ws.week_offset DESC) AS focus
    FROM weekly_stats ws
  ), current_week AS (
    SELECT * FROM weekly_stats WHERE week_offset = 0
  ), today AS (
    SELECT * FROM daily_stats WHERE period_date = effective_today
  )
  SELECT jsonb_build_object(
    'insufficient_data', false,
    'min_n', 5,
    'teamSize', assigned_count,
    'program_run_id', active_run_id,
    'energy', jsonb_build_object(
      'current', CASE WHEN cw.energy_n >= 5 THEN cw.energy END,
      'trend', tp.energy
    ),
    'mood', jsonb_build_object(
      'current', CASE WHEN cw.mood_n >= 5 THEN cw.mood END,
      'trend', tp.mood
    ),
    'focus', jsonb_build_object(
      'current', CASE WHEN cw.focus_n >= 5 THEN cw.focus END,
      'trend', tp.focus
    ),
    'participation', jsonb_build_object('rate', participation_rate, 'total', active_last_7d),
    'stressWarning', (
      cw.n_users >= 5
      AND (
        (cw.mood_n >= 5 AND cw.mood IS NOT NULL AND cw.mood < 4)
        OR (cw.energy_n >= 5 AND cw.energy IS NOT NULL AND cw.energy < 4)
      )
    ),
    'wellbeing', jsonb_build_object(
      'today', jsonb_build_object(
        'date', t.period_date,
        'n_users', t.n_users,
        'sufficient_data', t.n_users >= 5,
        'low_confidence', t.n_users BETWEEN 5 AND 9,
        'mood_n', t.mood_n,
        'energy_n', t.energy_n,
        'focus_n', t.focus_n,
        'stress_n', t.stress_n,
        'recovery_n', t.recovery_n,
        'sleep_quality_n', t.sleep_quality_n,
        'physical_readiness_n', t.physical_readiness_n,
        'motivation_n', t.motivation_n,
        'pressure_n', t.pressure_n,
        'team_connection_n', t.team_connection_n,
        'mood', CASE WHEN t.mood_n >= 5 THEN t.mood END,
        'energy', CASE WHEN t.energy_n >= 5 THEN t.energy END,
        'focus', CASE WHEN t.focus_n >= 5 THEN t.focus END,
        'stress', CASE WHEN t.stress_n >= 5 THEN t.stress END,
        'recovery', CASE WHEN t.recovery_n >= 5 THEN t.recovery END,
        'sleep_quality', CASE WHEN t.sleep_quality_n >= 5 THEN t.sleep_quality END,
        'physical_readiness', CASE WHEN t.physical_readiness_n >= 5 THEN t.physical_readiness END,
        'motivation', CASE WHEN t.motivation_n >= 5 THEN t.motivation END,
        'pressure', CASE WHEN t.pressure_n >= 5 THEN t.pressure END,
        'team_connection', CASE WHEN t.team_connection_n >= 5 THEN t.team_connection END
      ),
      'daily_trends', dp.payload,
      'weekly_trends', wp.payload
    ),
    'privacy', jsonb_build_object(
      'individual_values_returned', false,
      'identifiers_returned', false,
      'private_text_returned', false,
      'minimum_aggregate_n', 5,
      'authorization_gate', 'evidence_eligibility_reason'
    )
  ) INTO result
  FROM current_week cw
  CROSS JOIN today t
  CROSS JOIN daily_payload dp
  CROSS JOIN weekly_payload wp
  CROSS JOIN trend_payload tp;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_team_mental_state_aggregate(uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_team_mental_state_aggregate(uuid, text)
  TO authenticated;

COMMENT ON FUNCTION public.get_team_mental_state_aggregate(uuid, text) IS
  'Coach/admin-only team pulse. Returns server-side aggregates only, suppresses every sensitive value below five authorized contributors and never returns athlete identifiers or text.';

COMMIT;
