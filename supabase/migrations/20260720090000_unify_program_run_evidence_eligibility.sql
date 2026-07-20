BEGIN;

-- One aggregate contract powers both the coach development view and the
-- run-specific admin dossier. Eligibility is evaluated before any sensitive
-- value or n-threshold is calculated.
CREATE OR REPLACE FUNCTION public.get_program_run_development_evidence(
  _program_run_id uuid,
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
  target_run public.program_runs;
  target_team public.teams;
  effective_today date := CURRENT_DATE;
  result jsonb;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO target_run
  FROM public.program_runs pr
  WHERE pr.id = _program_run_id;

  IF target_run.id IS NULL THEN
    RAISE EXCEPTION 'program_run_not_found';
  END IF;

  IF NOT public.can_manage_team_program_runs(target_run.team_id) THEN
    RAISE EXCEPTION 'access_denied' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO target_team
  FROM public.teams t
  WHERE t.id = target_run.team_id;

  IF COALESCE(target_team.is_test_team, false) THEN
    SELECT qto.simulated_date
    INTO effective_today
    FROM public.qa_time_overrides qto
    WHERE qto.scope = 'team'
      AND qto.team_id = target_team.id
    ORDER BY qto.updated_at DESC, qto.id DESC
    LIMIT 1;
    effective_today := COALESCE(effective_today, CURRENT_DATE);
  END IF;

  WITH run_participants AS (
    SELECT
      pi.id AS program_instance_id,
      pi.user_id,
      pi.started_at,
      pi.ended_at,
      pi.status,
      COALESCE(p.is_test_user, false) AS is_test_user,
      COALESCE(pi.is_test_instance, false) AS is_test_instance,
      p.data_contribution_consented_at,
      epe.verified_at,
      public.evidence_eligibility_reason(pi.id, _protocol_version) AS eligibility_reason
    FROM public.program_instances pi
    JOIN public.profiles p ON p.id = pi.user_id
    JOIN public.user_roles ur
      ON ur.user_id = pi.user_id
     AND ur.role = 'athlete'::public.app_role
    LEFT JOIN public.evidence_participation_eligibility epe
      ON epe.program_instance_id = pi.id
    WHERE pi.program_run_id = target_run.id
      AND pi.status IN ('active', 'completed')
      AND (
        (
          COALESCE(target_team.is_test_team, false)
          AND COALESCE(p.is_test_user, false)
          AND COALESCE(pi.is_test_instance, false)
        )
        OR (
          NOT COALESCE(target_team.is_test_team, false)
          AND NOT COALESCE(p.is_test_user, false)
          AND NOT COALESCE(pi.is_test_instance, false)
        )
      )
  ), eligible AS (
    SELECT
      rp.*,
      CASE
        WHEN rp.eligibility_reason = 'eligible_test' THEN rp.started_at
        ELSE GREATEST(
          rp.started_at,
          rp.data_contribution_consented_at::date,
          rp.verified_at::date
        )
      END AS eligible_from,
      LEAST(effective_today, COALESCE(rp.ended_at, effective_today)) AS eligible_until
    FROM run_participants rp
    WHERE rp.eligibility_reason IN ('eligible', 'eligible_minor', 'eligible_test')
  ), completions AS (
    SELECT DISTINCT ON (udc.program_instance_id, udc.user_id, udc.day_number)
      udc.*
    FROM public.user_day_completion udc
    JOIN eligible e
      ON e.program_instance_id = udc.program_instance_id
     AND e.user_id = udc.user_id
    WHERE udc.completion_status = 'completed'
      AND udc.completed_at::date BETWEEN e.eligible_from AND e.eligible_until
      AND udc.day_number BETWEEN 1 AND LEAST(
        56,
        GREATEST(0, (e.eligible_until - e.started_at) + 1)
      )
    ORDER BY
      udc.program_instance_id,
      udc.user_id,
      udc.day_number,
      udc.completed_at DESC NULLS LAST,
      udc.id DESC
  ), checkin_rows AS (
    SELECT
      dc.user_id,
      dc.program_instance_id,
      dc.date,
      CASE WHEN dc.mood_before BETWEEN 1 AND 10 THEN dc.mood_before::numeric END AS mood,
      CASE WHEN dc.energy_level BETWEEN 1 AND 10 THEN dc.energy_level::numeric END AS energy,
      CASE WHEN dc.focus_rating BETWEEN 1 AND 10 THEN dc.focus_rating::numeric END AS focus,
      CASE WHEN dc.wellbeing_metrics ->> 'stress' ~ '^-?[0-9]+(\.[0-9]+)?$'
        AND (dc.wellbeing_metrics ->> 'stress')::numeric BETWEEN 1 AND 10
        THEN (dc.wellbeing_metrics ->> 'stress')::numeric END AS stress,
      CASE WHEN dc.wellbeing_metrics ->> 'recovery' ~ '^-?[0-9]+(\.[0-9]+)?$'
        AND (dc.wellbeing_metrics ->> 'recovery')::numeric BETWEEN 1 AND 10
        THEN (dc.wellbeing_metrics ->> 'recovery')::numeric END AS recovery,
      CASE WHEN dc.wellbeing_metrics ->> 'sleep_quality' ~ '^-?[0-9]+(\.[0-9]+)?$'
        AND (dc.wellbeing_metrics ->> 'sleep_quality')::numeric BETWEEN 1 AND 10
        THEN (dc.wellbeing_metrics ->> 'sleep_quality')::numeric END AS sleep,
      CASE WHEN dc.wellbeing_metrics ->> 'pressure' ~ '^-?[0-9]+(\.[0-9]+)?$'
        AND (dc.wellbeing_metrics ->> 'pressure')::numeric BETWEEN 1 AND 10
        THEN (dc.wellbeing_metrics ->> 'pressure')::numeric END AS pressure,
      CASE WHEN dc.wellbeing_metrics ->> 'team_connection' ~ '^-?[0-9]+(\.[0-9]+)?$'
        AND (dc.wellbeing_metrics ->> 'team_connection')::numeric BETWEEN 1 AND 10
        THEN (dc.wellbeing_metrics ->> 'team_connection')::numeric END AS team_connection
    FROM public.daily_checkins dc
    JOIN eligible e
      ON e.program_instance_id = dc.program_instance_id
     AND e.user_id = dc.user_id
    WHERE dc.date BETWEEN e.eligible_from AND e.eligible_until
  ), checkins AS (
    SELECT
      cr.user_id,
      cr.program_instance_id,
      cr.date,
      AVG(cr.mood) AS mood,
      AVG(cr.energy) AS energy,
      AVG(cr.focus) AS focus,
      AVG(cr.stress) AS stress,
      AVG(cr.recovery) AS recovery,
      AVG(cr.sleep) AS sleep,
      AVG(cr.pressure) AS pressure,
      AVG(cr.team_connection) AS team_connection
    FROM checkin_rows cr
    GROUP BY cr.user_id, cr.program_instance_id, cr.date
  ), latest_snapshots AS (
    SELECT DISTINCT ON (pps.program_instance_id)
      pps.*
    FROM public.program_progress_snapshots pps
    JOIN eligible e
      ON e.program_instance_id = pps.program_instance_id
     AND e.user_id = pps.user_id
    WHERE pps.date BETWEEN e.eligible_from AND e.eligible_until
      AND pps.days_available BETWEEN 0 AND 56
      AND pps.days_completed BETWEEN 0 AND pps.days_available
      AND pps.completion_rate BETWEEN 0 AND 1
      AND pps.current_streak BETWEEN 0 AND 56
      AND (pps.comprehension_average IS NULL OR pps.comprehension_average BETWEEN 0 AND 1)
    ORDER BY pps.program_instance_id, pps.date DESC, pps.updated_at DESC
  ), assessment_rows AS (
    SELECT DISTINCT ON (a.program_instance_id, a.assessment_type, a.timing)
      a.*
    FROM public.assessments a
    JOIN eligible e
      ON e.program_instance_id = a.program_instance_id
     AND e.user_id = a.user_id
    WHERE a.created_at::date BETWEEN e.eligible_from AND e.eligible_until
      AND a.timing IN ('pre', 'mid', 'post')
      AND jsonb_typeof(COALESCE(a.scores::jsonb, '{}'::jsonb)) = 'object'
      AND CASE a.assessment_type
        WHEN 'csai2r' THEN
          (SELECT COUNT(*) FROM jsonb_each(a.scores::jsonb)) = 3
          AND NOT EXISTS (
            SELECT 1 FROM jsonb_each_text(a.scores::jsonb) kv
            WHERE kv.key NOT IN ('cognitive_anxiety', 'somatic_anxiety', 'self_confidence')
              OR kv.value !~ '^-?[0-9]+(\.[0-9]+)?$'
              OR kv.value::numeric NOT BETWEEN 1 AND 4
          )
        WHEN 'smtq' THEN
          (SELECT COUNT(*) FROM jsonb_each(a.scores::jsonb)) = 3
          AND NOT EXISTS (
            SELECT 1 FROM jsonb_each_text(a.scores::jsonb) kv
            WHERE kv.key NOT IN ('confidence', 'constancy', 'control')
              OR kv.value !~ '^-?[0-9]+(\.[0-9]+)?$'
              OR kv.value::numeric NOT BETWEEN 1 AND 4
          )
        WHEN 'flow_short' THEN
          (SELECT COUNT(*) FROM jsonb_each(a.scores::jsonb)) = 3
          AND NOT EXISTS (
            SELECT 1 FROM jsonb_each_text(a.scores::jsonb) kv
            WHERE kv.key NOT IN ('absorption', 'fluency', 'anxiety')
              OR kv.value !~ '^-?[0-9]+(\.[0-9]+)?$'
              OR kv.value::numeric NOT BETWEEN 1 AND 5
          )
        ELSE false
      END
    ORDER BY
      a.program_instance_id,
      a.assessment_type,
      a.timing,
      a.created_at DESC,
      a.id DESC
  ), score_rows AS (
    SELECT
      a.program_instance_id,
      a.user_id,
      a.assessment_type,
      a.timing,
      kv.key AS subscale,
      kv.value::numeric AS score
    FROM assessment_rows a
    CROSS JOIN LATERAL jsonb_each_text(COALESCE(a.scores::jsonb, '{}'::jsonb)) kv
    WHERE kv.value ~ '^-?[0-9]+(\.[0-9]+)?$'
  ), paired_scores AS (
    SELECT
      pre.program_instance_id,
      pre.user_id,
      pre.assessment_type,
      pre.subscale,
      pre.score AS pre_score,
      mid.score AS mid_score,
      post.score AS post_score
    FROM score_rows pre
    LEFT JOIN score_rows mid
      ON mid.program_instance_id = pre.program_instance_id
     AND mid.assessment_type = pre.assessment_type
     AND mid.subscale = pre.subscale
     AND mid.timing = 'mid'
    LEFT JOIN score_rows post
      ON post.program_instance_id = pre.program_instance_id
     AND post.assessment_type = pre.assessment_type
     AND post.subscale = pre.subscale
     AND post.timing = 'post'
    WHERE pre.timing = 'pre'
  ), pre_post AS (
    SELECT
      ps.assessment_type,
      ps.subscale,
      COUNT(*)::integer AS n_pairs,
      CASE WHEN COUNT(*) >= 5 THEN ROUND(AVG(ps.pre_score)::numeric, 2) END AS avg_pre,
      CASE WHEN COUNT(*) >= 5 THEN ROUND(AVG(ps.post_score)::numeric, 2) END AS avg_post,
      CASE WHEN COUNT(*) >= 5
        THEN ROUND((AVG(ps.post_score) - AVG(ps.pre_score))::numeric, 2)
      END AS abs_change,
      NULL::numeric AS pct_change,
      CASE WHEN COUNT(*) >= 5 AND STDDEV_SAMP(ps.post_score - ps.pre_score) > 0
        THEN ROUND(
          (AVG(ps.post_score - ps.pre_score)
            / NULLIF(STDDEV_SAMP(ps.post_score - ps.pre_score), 0))::numeric,
          3
        )
      END AS cohens_d_z,
      COUNT(*) >= 5 AS sufficient_data,
      COUNT(*) BETWEEN 5 AND 9 AS low_confidence
    FROM paired_scores ps
    WHERE ps.post_score IS NOT NULL
    GROUP BY ps.assessment_type, ps.subscale
  ), pre_mid AS (
    SELECT
      ps.assessment_type,
      ps.subscale,
      COUNT(*)::integer AS n_pairs,
      CASE WHEN COUNT(*) >= 5 THEN ROUND(AVG(ps.pre_score)::numeric, 2) END AS avg_pre,
      CASE WHEN COUNT(*) >= 5 THEN ROUND(AVG(ps.mid_score)::numeric, 2) END AS avg_mid,
      CASE WHEN COUNT(*) >= 5
        THEN ROUND((AVG(ps.mid_score) - AVG(ps.pre_score))::numeric, 2)
      END AS abs_change,
      NULL::numeric AS pct_change,
      CASE WHEN COUNT(*) >= 5 AND STDDEV_SAMP(ps.mid_score - ps.pre_score) > 0
        THEN ROUND(
          (AVG(ps.mid_score - ps.pre_score)
            / NULLIF(STDDEV_SAMP(ps.mid_score - ps.pre_score), 0))::numeric,
          3
        )
      END AS cohens_d_z,
      COUNT(*) >= 5 AS sufficient_data,
      COUNT(*) BETWEEN 5 AND 9 AS low_confidence
    FROM paired_scores ps
    WHERE ps.mid_score IS NOT NULL
    GROUP BY ps.assessment_type, ps.subscale
  ), development_sources AS (
    SELECT
      dpa.program_instance_id,
      dpa.user_id,
      dpa.timing,
      dpa.created_at,
      CASE
        WHEN dpa.scores::jsonb ->> 'overall0to100' ~ '^-?[0-9]+(\.[0-9]+)?$'
          AND (dpa.scores::jsonb ->> 'overall0to100')::numeric BETWEEN 0 AND 100
          THEN (dpa.scores::jsonb ->> 'overall0to100')::numeric
      END AS overall
    FROM public.deep_profile_assessments dpa
    JOIN eligible e
      ON e.program_instance_id = dpa.program_instance_id
     AND e.user_id = dpa.user_id
    WHERE dpa.instrument_id = 'rewire_development_index'
      AND dpa.timing IN ('pre', 'mid', 'post')
      AND dpa.created_at::date BETWEEN e.eligible_from AND e.eligible_until
      AND dpa.scores::jsonb ->> 'overall0to100' ~ '^-?[0-9]+(\.[0-9]+)?$'
      AND (dpa.scores::jsonb ->> 'overall0to100')::numeric BETWEEN 0 AND 100
    UNION ALL
    SELECT
      qr.program_instance_id,
      qr.user_id,
      qr.timing,
      qr.created_at,
      CASE
        WHEN qr.scores::jsonb ->> 'overall0to100' ~ '^-?[0-9]+(\.[0-9]+)?$'
          AND (qr.scores::jsonb ->> 'overall0to100')::numeric BETWEEN 0 AND 100
          THEN (qr.scores::jsonb ->> 'overall0to100')::numeric
      END AS overall
    FROM public.questionnaire_responses qr
    JOIN eligible e
      ON e.program_instance_id = qr.program_instance_id
     AND e.user_id = qr.user_id
    WHERE qr.instrument_id = 'rewire_development_index'
      AND qr.is_complete = true
      AND qr.timing IN ('pre', 'mid', 'post')
      AND qr.created_at::date BETWEEN e.eligible_from AND e.eligible_until
      AND qr.scores::jsonb ->> 'overall0to100' ~ '^-?[0-9]+(\.[0-9]+)?$'
      AND (qr.scores::jsonb ->> 'overall0to100')::numeric BETWEEN 0 AND 100
  ), development_rows AS (
    SELECT DISTINCT ON (ds.program_instance_id, ds.timing)
      ds.program_instance_id,
      ds.user_id,
      ds.timing,
      ds.overall
    FROM development_sources ds
    ORDER BY ds.program_instance_id, ds.timing, ds.created_at DESC
  ), development_pairs AS (
    SELECT pre.user_id, pre.overall AS pre_score, post.overall AS post_score
    FROM development_rows pre
    JOIN development_rows post
      ON post.program_instance_id = pre.program_instance_id
     AND post.timing = 'post'
    WHERE pre.timing = 'pre'
      AND pre.overall IS NOT NULL
      AND post.overall IS NOT NULL
  ), participant_measurement_status AS (
    SELECT
      e.program_instance_id,
      e.user_id,
      EXISTS (
        SELECT 1 FROM assessment_rows ar
        WHERE ar.program_instance_id = e.program_instance_id AND ar.timing = 'pre'
      ) OR EXISTS (
        SELECT 1 FROM development_rows dr
        WHERE dr.program_instance_id = e.program_instance_id AND dr.timing = 'pre'
      ) AS has_pre,
      EXISTS (
        SELECT 1 FROM assessment_rows ar
        WHERE ar.program_instance_id = e.program_instance_id AND ar.timing = 'mid'
      ) OR EXISTS (
        SELECT 1 FROM development_rows dr
        WHERE dr.program_instance_id = e.program_instance_id AND dr.timing = 'mid'
      ) AS has_mid,
      EXISTS (
        SELECT 1 FROM assessment_rows ar
        WHERE ar.program_instance_id = e.program_instance_id AND ar.timing = 'post'
      ) OR EXISTS (
        SELECT 1 FROM development_rows dr
        WHERE dr.program_instance_id = e.program_instance_id AND dr.timing = 'post'
      ) AS has_post
    FROM eligible e
  ), comprehension_by_user AS (
    SELECT
      cci.user_id,
      COUNT(*)::integer AS completed_count,
      AVG(cci.correct_count::numeric / NULLIF(cci.total_count, 0)::numeric) AS correct_rate
    FROM public.comprehension_check_instances cci
    JOIN eligible e
      ON e.program_instance_id = cci.program_instance_id
     AND e.user_id = cci.user_id
    WHERE cci.status = 'completed'
      AND cci.total_count > 0
      AND cci.correct_count BETWEEN 0 AND cci.total_count
      AND COALESCE(cci.completed_at, cci.created_at)::date
          BETWEEN e.eligible_from AND e.eligible_until
    GROUP BY cci.user_id
  ), comprehension AS (
    SELECT
      COUNT(*)::integer AS distinct_users,
      COALESCE(SUM(cbu.completed_count), 0)::integer AS total_completed,
      CASE WHEN COUNT(*) >= 5
        THEN ROUND(AVG(cbu.correct_rate), 4)
      END AS avg_correct_rate
    FROM comprehension_by_user cbu
  ), daily_stats AS (
    SELECT
      c.date,
      COUNT(DISTINCT c.user_id)::integer AS n,
      COUNT(c.mood)::integer AS mood_n,
      COUNT(c.energy)::integer AS energy_n,
      COUNT(c.focus)::integer AS focus_n,
      COUNT(c.stress)::integer AS stress_n,
      COUNT(c.recovery)::integer AS recovery_n,
      COUNT(c.sleep)::integer AS sleep_n,
      COUNT(c.pressure)::integer AS pressure_n,
      COUNT(c.team_connection)::integer AS team_connection_n,
      ROUND(AVG(c.mood), 2) AS mood,
      ROUND(AVG(c.energy), 2) AS energy,
      ROUND(AVG(c.focus), 2) AS focus,
      ROUND(AVG(c.stress), 2) AS stress,
      ROUND(AVG(c.recovery), 2) AS recovery,
      ROUND(AVG(c.sleep), 2) AS sleep,
      ROUND(AVG(c.pressure), 2) AS pressure,
      ROUND(AVG(c.team_connection), 2) AS team_connection
    FROM checkins c
    GROUP BY c.date
  ), weekly_user_stats AS (
    SELECT
      date_trunc('week', c.date::timestamp)::date AS week_start,
      c.user_id,
      AVG(c.mood)::numeric AS mood,
      AVG(c.energy)::numeric AS energy,
      AVG(c.focus)::numeric AS focus,
      AVG(c.stress)::numeric AS stress,
      AVG(c.recovery)::numeric AS recovery,
      AVG(c.sleep)::numeric AS sleep,
      AVG(c.pressure)::numeric AS pressure,
      AVG(c.team_connection)::numeric AS team_connection
    FROM checkins c
    GROUP BY date_trunc('week', c.date::timestamp), c.user_id
  ), weekly_stats AS (
    SELECT
      wus.week_start,
      COUNT(*)::integer AS n,
      COUNT(wus.mood)::integer AS mood_n,
      COUNT(wus.energy)::integer AS energy_n,
      COUNT(wus.focus)::integer AS focus_n,
      COUNT(wus.stress)::integer AS stress_n,
      COUNT(wus.recovery)::integer AS recovery_n,
      COUNT(wus.sleep)::integer AS sleep_n,
      COUNT(wus.pressure)::integer AS pressure_n,
      COUNT(wus.team_connection)::integer AS team_connection_n,
      ROUND(AVG(wus.mood), 2) AS mood,
      ROUND(AVG(wus.energy), 2) AS energy,
      ROUND(AVG(wus.focus), 2) AS focus,
      ROUND(AVG(wus.stress), 2) AS stress,
      ROUND(AVG(wus.recovery), 2) AS recovery,
      ROUND(AVG(wus.sleep), 2) AS sleep,
      ROUND(AVG(wus.pressure), 2) AS pressure,
      ROUND(AVG(wus.team_connection), 2) AS team_connection
    FROM weekly_user_stats wus
    GROUP BY wus.week_start
  ), counts AS (
    SELECT
      (SELECT COUNT(DISTINCT rp.user_id) FROM run_participants rp)::integer AS athletes_total,
      (SELECT COUNT(DISTINCT e.user_id) FROM eligible e)::integer AS eligible_athletes,
      (SELECT COUNT(DISTINCT e.user_id) FROM eligible e
        WHERE EXISTS (
          SELECT 1 FROM completions co
          WHERE co.program_instance_id = e.program_instance_id AND co.day_number = 1
        ))::integer AS day_1_completion,
      (SELECT COUNT(DISTINCT e.user_id) FROM eligible e
        WHERE EXISTS (
          SELECT 1 FROM completions co
          WHERE co.program_instance_id = e.program_instance_id AND co.day_number >= 7
        ))::integer AS day_7_active,
      (SELECT COUNT(DISTINCT e.user_id) FROM eligible e
        WHERE EXISTS (
          SELECT 1 FROM completions co
          WHERE co.program_instance_id = e.program_instance_id AND co.day_number >= 14
        ))::integer AS day_14_active,
      (SELECT COUNT(DISTINCT e.user_id) FROM eligible e
        WHERE EXISTS (
          SELECT 1 FROM completions co
          WHERE co.program_instance_id = e.program_instance_id AND co.day_number >= 28
        ))::integer AS day_28_active,
      (SELECT COUNT(DISTINCT e.user_id) FROM eligible e
        WHERE EXISTS (
          SELECT 1 FROM completions co
          WHERE co.program_instance_id = e.program_instance_id AND co.day_number = 56
        ))::integer AS day_56_completed,
      (SELECT COUNT(*) FROM checkins)::integer AS total_checkins,
      (SELECT COUNT(*) FROM completions)::integer AS total_completed_days,
      (SELECT COUNT(DISTINCT (dj.user_id, dj.created_at::date)) FROM public.daily_journals dj
        JOIN eligible e
          ON e.program_instance_id = dj.program_instance_id
         AND e.user_id = dj.user_id
        WHERE dj.created_at::date BETWEEN e.eligible_from AND e.eligible_until
      )::integer AS journal_count_only,
      (SELECT COUNT(*) FROM latest_snapshots)::integer AS players_with_progress,
      (SELECT COUNT(ls.comprehension_average) FROM latest_snapshots ls)::integer AS players_with_comprehension,
      ROUND((SELECT AVG(ls.completion_rate) FROM latest_snapshots ls)::numeric, 4) AS avg_completion_rate,
      ROUND((SELECT AVG(ls.days_completed) FROM latest_snapshots ls)::numeric, 2) AS avg_days_completed,
      ROUND((SELECT AVG(ls.days_available) FROM latest_snapshots ls)::numeric, 2) AS avg_days_available,
      ROUND((SELECT AVG(ls.current_streak) FROM latest_snapshots ls)::numeric, 2) AS avg_streak,
      ROUND((SELECT AVG(ls.comprehension_average) FROM latest_snapshots ls)::numeric, 4) AS avg_comprehension,
      (SELECT COUNT(DISTINCT a.user_id) FROM assessment_rows a WHERE a.timing = 'pre')::integer AS pre_n,
      (SELECT COUNT(DISTINCT a.user_id) FROM assessment_rows a WHERE a.timing = 'mid')::integer AS mid_n,
      (SELECT COUNT(DISTINCT a.user_id) FROM assessment_rows a WHERE a.timing = 'post')::integer AS post_n,
      (SELECT COUNT(DISTINCT dr.user_id) FROM development_rows dr WHERE dr.timing = 'pre')::integer AS development_pre_n,
      (SELECT COUNT(DISTINCT dr.user_id) FROM development_rows dr WHERE dr.timing = 'mid')::integer AS development_mid_n,
      (SELECT COUNT(DISTINCT dr.user_id) FROM development_rows dr WHERE dr.timing = 'post')::integer AS development_post_n,
      (SELECT COUNT(DISTINCT ps.user_id) FROM paired_scores ps WHERE ps.post_score IS NOT NULL)::integer AS pre_post_users
  ), payloads AS (
    SELECT
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'date', ds.date,
          'n', ds.n,
          'mood_n', ds.mood_n,
          'energy_n', ds.energy_n,
          'focus_n', ds.focus_n,
          'stress_n', ds.stress_n,
          'recovery_n', ds.recovery_n,
          'sleep_n', ds.sleep_n,
          'pressure_n', ds.pressure_n,
          'team_connection_n', ds.team_connection_n,
          'sufficient_data', ds.n >= 5,
          'low_confidence', ds.n BETWEEN 5 AND 9,
          'mood', CASE WHEN ds.mood_n >= 5 THEN ds.mood END,
          'energy', CASE WHEN ds.energy_n >= 5 THEN ds.energy END,
          'focus', CASE WHEN ds.focus_n >= 5 THEN ds.focus END,
          'stress', CASE WHEN ds.stress_n >= 5 THEN ds.stress END,
          'recovery', CASE WHEN ds.recovery_n >= 5 THEN ds.recovery END,
          'sleep', CASE WHEN ds.sleep_n >= 5 THEN ds.sleep END,
          'pressure', CASE WHEN ds.pressure_n >= 5 THEN ds.pressure END,
          'team_connection', CASE WHEN ds.team_connection_n >= 5 THEN ds.team_connection END
        ) ORDER BY ds.date)
        FROM daily_stats ds
      ), '[]'::jsonb) AS daily,
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'week_start', ws.week_start,
          'n_users', ws.n,
          'mood_n', ws.mood_n,
          'energy_n', ws.energy_n,
          'focus_n', ws.focus_n,
          'stress_n', ws.stress_n,
          'recovery_n', ws.recovery_n,
          'sleep_n', ws.sleep_n,
          'pressure_n', ws.pressure_n,
          'team_connection_n', ws.team_connection_n,
          'sufficient_data', ws.n >= 5,
          'low_confidence', ws.n BETWEEN 5 AND 9,
          'mood', CASE WHEN ws.mood_n >= 5 THEN ws.mood END,
          'energy', CASE WHEN ws.energy_n >= 5 THEN ws.energy END,
          'focus', CASE WHEN ws.focus_n >= 5 THEN ws.focus END,
          'avg_mood', CASE WHEN ws.mood_n >= 5 THEN ws.mood END,
          'avg_energy', CASE WHEN ws.energy_n >= 5 THEN ws.energy END,
          'avg_focus', CASE WHEN ws.focus_n >= 5 THEN ws.focus END,
          'stress', CASE WHEN ws.stress_n >= 5 THEN ws.stress END,
          'recovery', CASE WHEN ws.recovery_n >= 5 THEN ws.recovery END,
          'sleep', CASE WHEN ws.sleep_n >= 5 THEN ws.sleep END,
          'pressure', CASE WHEN ws.pressure_n >= 5 THEN ws.pressure END,
          'team_connection', CASE WHEN ws.team_connection_n >= 5 THEN ws.team_connection END
        ) ORDER BY ws.week_start)
        FROM weekly_stats ws
      ), '[]'::jsonb) AS weekly
  )
  SELECT jsonb_build_object(
    'meta', jsonb_build_object(
      'team_id', target_team.id,
      'team', target_team.name,
      'program_run_id', target_run.id,
      'program_run', target_run.name,
      'start_date', target_run.started_at,
      'end_date', target_run.ended_at,
      'generated_at', now(),
      'effective_date', effective_today,
      'protocol_version', _protocol_version,
      'privacy_level', 'currently_authorized_run_scoped_aggregate_only',
      'consent_scope', 'Current protocol consent and age-appropriate authorization are evaluated before aggregation.',
      'claim_boundary', 'Beobachtete Veraenderung; keine Diagnose; keine medizinische Wirkung; keine Kausalaussage ohne geeignetes Studiendesign.'
    ),
    'sample', jsonb_build_object(
      'athletes_total', c.athletes_total,
      'eligible_athletes', c.eligible_athletes,
      'consented_athletes', c.eligible_athletes,
      'excluded_athletes', GREATEST(c.athletes_total - c.eligible_athletes, 0),
      'exclusion_reasons', CASE
        WHEN c.athletes_total > c.eligible_athletes
          THEN jsonb_build_object('not_currently_authorized', c.athletes_total - c.eligible_athletes)
        ELSE '{}'::jsonb
      END,
      'consent_rate', CASE WHEN c.athletes_total > 0
        THEN ROUND(c.eligible_athletes::numeric / c.athletes_total::numeric, 4)
      END,
      'aggregation_n', c.eligible_athletes,
      'aggregate_visible', c.eligible_athletes >= 5,
      'low_confidence', c.eligible_athletes BETWEEN 5 AND 9,
      'minimum_aggregate_n', 5
    ),
    'cohort_breakdown', jsonb_build_object(
      'never_started', (SELECT COUNT(*) FROM participant_measurement_status pms WHERE NOT pms.has_pre),
      'only_pre', (SELECT COUNT(*) FROM participant_measurement_status pms WHERE pms.has_pre AND NOT pms.has_mid AND NOT pms.has_post),
      'pre_and_mid_no_post', (SELECT COUNT(*) FROM participant_measurement_status pms WHERE pms.has_pre AND pms.has_mid AND NOT pms.has_post),
      'completed_pre_post', (SELECT COUNT(*) FROM participant_measurement_status pms WHERE pms.has_pre AND pms.has_post)
    ),
    'usage', jsonb_build_object(
      'day_1_completion', c.day_1_completion,
      'day_7_active', c.day_7_active,
      'day_14_active', c.day_14_active,
      'day_28_active', c.day_28_active,
      'day_56_completed', c.day_56_completed,
      'total_checkins', c.total_checkins,
      'total_completed_days', c.total_completed_days,
      'journal_entries_count_only', c.journal_count_only,
      'players_with_progress', c.players_with_progress,
      'players_with_comprehension', c.players_with_comprehension,
      'avg_completion_rate', CASE WHEN c.players_with_progress >= 5 THEN c.avg_completion_rate END,
      'avg_days_completed', CASE WHEN c.players_with_progress >= 5 THEN c.avg_days_completed END,
      'avg_days_available', CASE WHEN c.players_with_progress >= 5 THEN c.avg_days_available END,
      'avg_streak', CASE WHEN c.players_with_progress >= 5 THEN c.avg_streak END,
      'avg_comprehension', CASE WHEN c.players_with_comprehension >= 5 THEN c.avg_comprehension END
    ),
    'team_pulse', jsonb_build_object('daily', p.daily, 'weekly', p.weekly),
    'measurement', jsonb_build_object(
      'validated_assessments', jsonb_build_object(
        'pre_n', c.pre_n, 'mid_n', c.mid_n, 'post_n', c.post_n
      ),
      'development_index', jsonb_build_object(
        'pre_n', c.development_pre_n,
        'mid_n', c.development_mid_n,
        'post_n', c.development_post_n
      ),
      'pre_post_paired_n', c.pre_post_users,
      'missing_pre', GREATEST(c.eligible_athletes - GREATEST(c.pre_n, c.development_pre_n), 0),
      'missing_post', GREATEST(c.eligible_athletes - GREATEST(c.post_n, c.development_post_n), 0)
    ),
    'changes', jsonb_build_object(
      'pre_post', COALESCE((SELECT jsonb_agg(to_jsonb(pp) ORDER BY pp.assessment_type, pp.subscale) FROM pre_post pp), '[]'::jsonb),
      'pre_mid', COALESCE((SELECT jsonb_agg(to_jsonb(pm) ORDER BY pm.assessment_type, pm.subscale) FROM pre_mid pm), '[]'::jsonb)
    ),
    'outcomes', jsonb_build_object(
      'validated_pre_post', COALESCE((SELECT jsonb_agg(to_jsonb(pp) ORDER BY pp.assessment_type, pp.subscale) FROM pre_post pp), '[]'::jsonb),
      'validated_pre_mid', COALESCE((SELECT jsonb_agg(to_jsonb(pm) ORDER BY pm.assessment_type, pm.subscale) FROM pre_mid pm), '[]'::jsonb),
      'development_overall', jsonb_build_object(
        'n', (SELECT COUNT(*) FROM development_pairs),
        'avg_pre', CASE WHEN (SELECT COUNT(*) FROM development_pairs) >= 5
          THEN ROUND((SELECT AVG(dp.pre_score) FROM development_pairs dp)::numeric, 2)
        END,
        'avg_post', CASE WHEN (SELECT COUNT(*) FROM development_pairs) >= 5
          THEN ROUND((SELECT AVG(dp.post_score) FROM development_pairs dp)::numeric, 2)
        END,
        'observed_change', CASE WHEN (SELECT COUNT(*) FROM development_pairs) >= 5
          THEN ROUND((
            (SELECT AVG(dp.post_score) FROM development_pairs dp)
            - (SELECT AVG(dp.pre_score) FROM development_pairs dp)
          )::numeric, 2)
        END,
        'sufficient_data', (SELECT COUNT(*) FROM development_pairs) >= 5,
        'low_confidence', (SELECT COUNT(*) FROM development_pairs) BETWEEN 5 AND 9
      ),
      'comprehension', to_jsonb(comp)
    ),
    'comprehension', to_jsonb(comp),
    'data_quality', jsonb_build_object(
      'missing_pre', GREATEST(c.eligible_athletes - GREATEST(c.pre_n, c.development_pre_n), 0),
      'missing_post', GREATEST(c.eligible_athletes - GREATEST(c.post_n, c.development_post_n), 0),
      'test_data_included', COALESCE(target_team.is_test_team, false),
      'identifiers_present', false,
      'individual_values_present', false,
      'private_text_fields_present', false,
      'minimum_aggregate_n', 5,
      'authorization_gate', 'evidence_eligibility_reason',
      'duplicate_tracking_rows_collapsed', true,
      'source_value_ranges_validated', true
    ),
    'privacy_exclusions', jsonb_build_array(
      'email', 'full_name', 'journal_text', 'free_reflection', 'raw_checkins',
      'raw_answers', 'individual_scores', 'individual_psychological_labels'
    ),
    'claim_boundary', 'Beobachtete Veraenderung; keine Diagnose; keine medizinische Wirkung; keine Kausalaussage ohne geeignetes Studiendesign.'
  ) INTO result
  FROM counts c
  CROSS JOIN payloads p
  CROSS JOIN comprehension comp;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_program_run_development_evidence(uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_program_run_development_evidence(uuid, text)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.get_nlz_evidence_dossier(_program_run_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  evidence jsonb;
  readiness jsonb;
BEGIN
  evidence := public.get_program_run_development_evidence(
    _program_run_id,
    '56d-transfer-v2-2026-07'
  );
  readiness := public.get_nlz_pilot_readiness(NULL, _program_run_id)::jsonb;

  RETURN jsonb_build_object(
    'meta', evidence -> 'meta',
    'sample', evidence -> 'sample',
    'usage', evidence -> 'usage',
    'team_pulse', evidence -> 'team_pulse',
    'measurement', evidence -> 'measurement',
    'outcomes', evidence -> 'outcomes',
    'data_quality', (evidence -> 'data_quality') || jsonb_build_object(
      'readiness_status', readiness ->> 'status'
    ),
    'readiness', jsonb_build_object(
      'status', readiness ->> 'status',
      'label', readiness ->> 'status_label'
    ),
    'export_catalog', jsonb_build_array(
      'summary.csv', 'data_quality.csv', 'weekly_trends.csv',
      'assessment_aggregates.csv', 'dossier.json'
    ),
    'privacy_exclusions', evidence -> 'privacy_exclusions'
  )::json;
END;
$$;

CREATE OR REPLACE FUNCTION public.compute_team_outcomes(
  team_id_param uuid,
  min_n integer DEFAULT 5
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  target_run_id uuid;
  evidence jsonb;
  eligible_n integer;
BEGIN
  min_n := GREATEST(COALESCE(min_n, 5), 5);

  IF NOT public.can_manage_team_program_runs(team_id_param) THEN
    RAISE EXCEPTION 'access_denied' USING ERRCODE = '42501';
  END IF;

  SELECT pr.id INTO target_run_id
  FROM public.program_runs pr
  WHERE pr.team_id = team_id_param
    AND pr.status IN ('active', 'completed')
  ORDER BY
    CASE WHEN pr.status = 'active' THEN 0 ELSE 1 END,
    pr.started_at DESC,
    pr.created_at DESC
  LIMIT 1;

  IF target_run_id IS NULL THEN
    RETURN json_build_object(
      'sufficient_data', false,
      'reason', 'no_available_program_run',
      'total_athletes', 0,
      'min_n', min_n
    );
  END IF;

  evidence := public.get_program_run_development_evidence(
    target_run_id,
    '56d-transfer-v2-2026-07'
  );
  eligible_n := COALESCE((evidence #>> '{sample,eligible_athletes}')::integer, 0);

  RETURN jsonb_build_object(
    'team_id', team_id_param,
    'program_run_id', target_run_id,
    'min_n', min_n,
    'total_athletes', eligible_n,
    'sufficient_data', eligible_n >= min_n,
    'low_confidence', eligible_n BETWEEN min_n AND 9,
    'consent_scope', evidence #>> '{meta,consent_scope}',
    'cohort_breakdown', evidence -> 'cohort_breakdown',
    'assessment_completion', evidence #> '{measurement,validated_assessments}',
    'adherence', evidence -> 'usage',
    'changes', evidence -> 'changes',
    'comprehension', evidence -> 'comprehension',
    'weekly_trend', evidence #> '{team_pulse,weekly}',
    'disclaimer', evidence ->> 'claim_boundary'
  )::json;
END;
$$;

REVOKE ALL ON FUNCTION public.get_nlz_evidence_dossier(uuid)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.compute_team_outcomes(uuid, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_nlz_evidence_dossier(uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_team_outcomes(uuid, integer)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.get_solo_development_evidence_summary(
  _sport_category text DEFAULT NULL,
  _sport_level text DEFAULT NULL,
  _include_test boolean DEFAULT false,
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
  result jsonb;
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
      COALESCE(p.sport_category, public.classify_sport_category(p.sport)) AS sport_category,
      COALESCE(p.sport_format, public.classify_sport_format(p.sport)) AS sport_format,
      p.sport_level,
      COALESCE(p.is_test_user, false) AND COALESCE(pi.is_test_instance, false) AS synthetic_test,
      CASE
        WHEN COALESCE(p.is_test_user, false) AND COALESCE(pi.is_test_instance, false)
          THEN COALESCE((
            SELECT qto.simulated_date
            FROM public.qa_time_overrides qto
            WHERE qto.scope = 'user'
              AND qto.user_id = pi.user_id
            ORDER BY qto.updated_at DESC, qto.id DESC
            LIMIT 1
          ), CURRENT_DATE)
        ELSE CURRENT_DATE
      END AS effective_today,
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
      AND (
        (
          _include_test
          AND COALESCE(p.is_test_user, false)
          AND COALESCE(pi.is_test_instance, false)
        )
        OR (
          NOT _include_test
          AND NOT COALESCE(p.is_test_user, false)
          AND NOT COALESCE(pi.is_test_instance, false)
        )
      )
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
      LEAST(sp.effective_today, COALESCE(sp.ended_at, sp.effective_today)) AS eligible_until
    FROM scoped_participants sp
    WHERE sp.eligibility_reason IN ('eligible', 'eligible_minor', 'eligible_test')
  ), completions AS (
    SELECT DISTINCT ON (udc.program_instance_id, udc.user_id, udc.day_number)
      udc.*
    FROM public.user_day_completion udc
    JOIN eligible e
      ON e.program_instance_id = udc.program_instance_id AND e.user_id = udc.user_id
    WHERE udc.completion_status = 'completed'
      AND udc.completed_at::date BETWEEN e.eligible_from AND e.eligible_until
      AND udc.day_number BETWEEN 1 AND LEAST(
        56,
        GREATEST(0, (e.eligible_until - e.started_at) + 1)
      )
    ORDER BY
      udc.program_instance_id,
      udc.user_id,
      udc.day_number,
      udc.completed_at DESC NULLS LAST,
      udc.id DESC
  ), checkin_rows AS (
    SELECT
      dc.user_id,
      dc.program_instance_id,
      dc.date,
      e.started_at,
      CASE WHEN dc.mood_before BETWEEN 1 AND 10 THEN dc.mood_before::numeric END AS mood,
      CASE WHEN dc.energy_level BETWEEN 1 AND 10 THEN dc.energy_level::numeric END AS energy,
      CASE WHEN dc.focus_rating BETWEEN 1 AND 10 THEN dc.focus_rating::numeric END AS focus,
      CASE WHEN dc.wellbeing_metrics ->> 'stress' ~ '^-?[0-9]+(\.[0-9]+)?$'
        AND (dc.wellbeing_metrics ->> 'stress')::numeric BETWEEN 1 AND 10
        THEN (dc.wellbeing_metrics ->> 'stress')::numeric END AS stress
    FROM public.daily_checkins dc
    JOIN eligible e
      ON e.program_instance_id = dc.program_instance_id AND e.user_id = dc.user_id
    WHERE dc.date BETWEEN e.eligible_from AND e.eligible_until
  ), checkins AS (
    SELECT
      cr.user_id,
      cr.program_instance_id,
      cr.date,
      cr.started_at,
      AVG(cr.mood) AS mood,
      AVG(cr.energy) AS energy,
      AVG(cr.focus) AS focus,
      AVG(cr.stress) AS stress
    FROM checkin_rows cr
    GROUP BY cr.user_id, cr.program_instance_id, cr.date, cr.started_at
  ), latest_snapshots AS (
    SELECT DISTINCT ON (pps.program_instance_id)
      pps.*
    FROM public.program_progress_snapshots pps
    JOIN eligible e
      ON e.program_instance_id = pps.program_instance_id AND e.user_id = pps.user_id
    WHERE pps.date BETWEEN e.eligible_from AND e.eligible_until
      AND pps.days_available BETWEEN 0 AND 56
      AND pps.days_completed BETWEEN 0 AND pps.days_available
      AND pps.completion_rate BETWEEN 0 AND 1
      AND pps.current_streak BETWEEN 0 AND 56
      AND (pps.comprehension_average IS NULL OR pps.comprehension_average BETWEEN 0 AND 1)
    ORDER BY pps.program_instance_id, pps.date DESC, pps.updated_at DESC
  ), assessment_rows AS (
    SELECT DISTINCT ON (a.program_instance_id, a.assessment_type, a.timing)
      a.*
    FROM public.assessments a
    JOIN eligible e
      ON e.program_instance_id = a.program_instance_id AND e.user_id = a.user_id
    WHERE a.created_at::date BETWEEN e.eligible_from AND e.eligible_until
      AND a.timing IN ('pre', 'mid', 'post')
      AND jsonb_typeof(COALESCE(a.scores::jsonb, '{}'::jsonb)) = 'object'
      AND CASE a.assessment_type
        WHEN 'csai2r' THEN
          (SELECT COUNT(*) FROM jsonb_each(a.scores::jsonb)) = 3
          AND NOT EXISTS (
            SELECT 1 FROM jsonb_each_text(a.scores::jsonb) kv
            WHERE kv.key NOT IN ('cognitive_anxiety', 'somatic_anxiety', 'self_confidence')
              OR kv.value !~ '^-?[0-9]+(\.[0-9]+)?$'
              OR kv.value::numeric NOT BETWEEN 1 AND 4
          )
        WHEN 'smtq' THEN
          (SELECT COUNT(*) FROM jsonb_each(a.scores::jsonb)) = 3
          AND NOT EXISTS (
            SELECT 1 FROM jsonb_each_text(a.scores::jsonb) kv
            WHERE kv.key NOT IN ('confidence', 'constancy', 'control')
              OR kv.value !~ '^-?[0-9]+(\.[0-9]+)?$'
              OR kv.value::numeric NOT BETWEEN 1 AND 4
          )
        WHEN 'flow_short' THEN
          (SELECT COUNT(*) FROM jsonb_each(a.scores::jsonb)) = 3
          AND NOT EXISTS (
            SELECT 1 FROM jsonb_each_text(a.scores::jsonb) kv
            WHERE kv.key NOT IN ('absorption', 'fluency', 'anxiety')
              OR kv.value !~ '^-?[0-9]+(\.[0-9]+)?$'
              OR kv.value::numeric NOT BETWEEN 1 AND 5
          )
        ELSE false
      END
    ORDER BY a.program_instance_id, a.assessment_type, a.timing, a.created_at DESC, a.id DESC
  ), score_rows AS (
    SELECT
      a.program_instance_id,
      a.user_id,
      a.assessment_type,
      a.timing,
      kv.key AS subscale,
      kv.value::numeric AS score
    FROM assessment_rows a
    CROSS JOIN LATERAL jsonb_each_text(COALESCE(a.scores::jsonb, '{}'::jsonb)) kv
    WHERE kv.value ~ '^-?[0-9]+(\.[0-9]+)?$'
  ), paired_scores AS (
    SELECT
      pre.program_instance_id,
      pre.user_id,
      pre.assessment_type,
      pre.subscale,
      pre.score AS pre_score,
      mid.score AS mid_score,
      post.score AS post_score
    FROM score_rows pre
    LEFT JOIN score_rows mid
      ON mid.program_instance_id = pre.program_instance_id
     AND mid.assessment_type = pre.assessment_type
     AND mid.subscale = pre.subscale
     AND mid.timing = 'mid'
    LEFT JOIN score_rows post
      ON post.program_instance_id = pre.program_instance_id
     AND post.assessment_type = pre.assessment_type
     AND post.subscale = pre.subscale
     AND post.timing = 'post'
    WHERE pre.timing = 'pre'
  ), pre_post AS (
    SELECT
      ps.assessment_type,
      ps.subscale,
      COUNT(*)::integer AS n_pairs,
      CASE WHEN COUNT(*) >= 5 THEN ROUND(AVG(ps.pre_score)::numeric, 2) END AS avg_pre,
      CASE WHEN COUNT(*) >= 5 THEN ROUND(AVG(ps.post_score)::numeric, 2) END AS avg_post,
      CASE WHEN COUNT(*) >= 5 THEN ROUND((AVG(ps.post_score) - AVG(ps.pre_score))::numeric, 2) END AS abs_change,
      CASE WHEN COUNT(*) >= 5 AND STDDEV_SAMP(ps.post_score - ps.pre_score) > 0
        THEN ROUND((AVG(ps.post_score - ps.pre_score) / NULLIF(STDDEV_SAMP(ps.post_score - ps.pre_score), 0))::numeric, 3)
      END AS cohens_d_z,
      COUNT(*) >= 5 AS sufficient_data,
      COUNT(*) BETWEEN 5 AND 9 AS low_confidence
    FROM paired_scores ps
    WHERE ps.post_score IS NOT NULL
    GROUP BY ps.assessment_type, ps.subscale
  ), pre_mid AS (
    SELECT
      ps.assessment_type,
      ps.subscale,
      COUNT(*)::integer AS n_pairs,
      CASE WHEN COUNT(*) >= 5 THEN ROUND(AVG(ps.pre_score)::numeric, 2) END AS avg_pre,
      CASE WHEN COUNT(*) >= 5 THEN ROUND(AVG(ps.mid_score)::numeric, 2) END AS avg_mid,
      CASE WHEN COUNT(*) >= 5 THEN ROUND((AVG(ps.mid_score) - AVG(ps.pre_score))::numeric, 2) END AS abs_change,
      CASE WHEN COUNT(*) >= 5 AND STDDEV_SAMP(ps.mid_score - ps.pre_score) > 0
        THEN ROUND((AVG(ps.mid_score - ps.pre_score) / NULLIF(STDDEV_SAMP(ps.mid_score - ps.pre_score), 0))::numeric, 3)
      END AS cohens_d_z,
      COUNT(*) >= 5 AS sufficient_data,
      COUNT(*) BETWEEN 5 AND 9 AS low_confidence
    FROM paired_scores ps
    WHERE ps.mid_score IS NOT NULL
    GROUP BY ps.assessment_type, ps.subscale
  ), development_sources AS (
    SELECT
      dpa.program_instance_id,
      dpa.user_id,
      dpa.timing,
      dpa.created_at,
      CASE
        WHEN dpa.scores::jsonb ->> 'overall0to100' ~ '^-?[0-9]+(\.[0-9]+)?$'
          AND (dpa.scores::jsonb ->> 'overall0to100')::numeric BETWEEN 0 AND 100
          THEN (dpa.scores::jsonb ->> 'overall0to100')::numeric
      END AS overall
    FROM public.deep_profile_assessments dpa
    JOIN eligible e
      ON e.program_instance_id = dpa.program_instance_id AND e.user_id = dpa.user_id
    WHERE dpa.instrument_id = 'rewire_development_index'
      AND dpa.timing IN ('pre', 'mid', 'post')
      AND dpa.created_at::date BETWEEN e.eligible_from AND e.eligible_until
      AND dpa.scores::jsonb ->> 'overall0to100' ~ '^-?[0-9]+(\.[0-9]+)?$'
      AND (dpa.scores::jsonb ->> 'overall0to100')::numeric BETWEEN 0 AND 100
    UNION ALL
    SELECT
      qr.program_instance_id,
      qr.user_id,
      qr.timing,
      qr.created_at,
      CASE
        WHEN qr.scores::jsonb ->> 'overall0to100' ~ '^-?[0-9]+(\.[0-9]+)?$'
          AND (qr.scores::jsonb ->> 'overall0to100')::numeric BETWEEN 0 AND 100
          THEN (qr.scores::jsonb ->> 'overall0to100')::numeric
      END AS overall
    FROM public.questionnaire_responses qr
    JOIN eligible e
      ON e.program_instance_id = qr.program_instance_id AND e.user_id = qr.user_id
    WHERE qr.instrument_id = 'rewire_development_index'
      AND qr.is_complete = true
      AND qr.timing IN ('pre', 'mid', 'post')
      AND qr.created_at::date BETWEEN e.eligible_from AND e.eligible_until
      AND qr.scores::jsonb ->> 'overall0to100' ~ '^-?[0-9]+(\.[0-9]+)?$'
      AND (qr.scores::jsonb ->> 'overall0to100')::numeric BETWEEN 0 AND 100
  ), development_rows AS (
    SELECT DISTINCT ON (ds.program_instance_id, ds.timing)
      ds.program_instance_id,
      ds.user_id,
      ds.timing,
      ds.overall
    FROM development_sources ds
    ORDER BY ds.program_instance_id, ds.timing, ds.created_at DESC
  ), development_pairs AS (
    SELECT pre.user_id, pre.overall AS pre_score, post.overall AS post_score
    FROM development_rows pre
    JOIN development_rows post
      ON post.program_instance_id = pre.program_instance_id AND post.timing = 'post'
    WHERE pre.timing = 'pre' AND pre.overall IS NOT NULL AND post.overall IS NOT NULL
  ), participant_measurement_status AS (
    SELECT
      e.program_instance_id,
      EXISTS (SELECT 1 FROM assessment_rows ar WHERE ar.program_instance_id = e.program_instance_id AND ar.timing = 'pre')
        OR EXISTS (SELECT 1 FROM development_rows dr WHERE dr.program_instance_id = e.program_instance_id AND dr.timing = 'pre') AS has_pre,
      EXISTS (SELECT 1 FROM assessment_rows ar WHERE ar.program_instance_id = e.program_instance_id AND ar.timing = 'mid')
        OR EXISTS (SELECT 1 FROM development_rows dr WHERE dr.program_instance_id = e.program_instance_id AND dr.timing = 'mid') AS has_mid,
      EXISTS (SELECT 1 FROM assessment_rows ar WHERE ar.program_instance_id = e.program_instance_id AND ar.timing = 'post')
        OR EXISTS (SELECT 1 FROM development_rows dr WHERE dr.program_instance_id = e.program_instance_id AND dr.timing = 'post') AS has_post
    FROM eligible e
  ), comprehension_by_user AS (
    SELECT
      cci.user_id,
      COUNT(*)::integer AS completed_count,
      AVG(cci.correct_count::numeric / NULLIF(cci.total_count, 0)::numeric) AS correct_rate
    FROM public.comprehension_check_instances cci
    JOIN eligible e
      ON e.program_instance_id = cci.program_instance_id AND e.user_id = cci.user_id
    WHERE cci.status = 'completed'
      AND cci.total_count > 0
      AND cci.correct_count BETWEEN 0 AND cci.total_count
      AND COALESCE(cci.completed_at, cci.created_at)::date BETWEEN e.eligible_from AND e.eligible_until
    GROUP BY cci.user_id
  ), comprehension AS (
    SELECT
      COUNT(*)::integer AS distinct_users,
      COALESCE(SUM(cbu.completed_count), 0)::integer AS total_completed,
      CASE WHEN COUNT(*) >= 5 THEN ROUND(AVG(cbu.correct_rate), 4) END AS avg_correct_rate
    FROM comprehension_by_user cbu
  ), weekly_user_stats AS (
    SELECT
      GREATEST(1, LEAST(8, CEIL(((c.date - c.started_at) + 1) / 7.0)::integer)) AS program_week,
      c.user_id,
      AVG(c.mood)::numeric AS mood,
      AVG(c.energy)::numeric AS energy,
      AVG(c.focus)::numeric AS focus,
      AVG(c.stress)::numeric AS stress
    FROM checkins c
    GROUP BY GREATEST(1, LEAST(8, CEIL(((c.date - c.started_at) + 1) / 7.0)::integer)), c.user_id
  ), weekly_stats AS (
    SELECT
      wus.program_week,
      COUNT(*)::integer AS n,
      COUNT(wus.mood)::integer AS mood_n,
      COUNT(wus.energy)::integer AS energy_n,
      COUNT(wus.focus)::integer AS focus_n,
      COUNT(wus.stress)::integer AS stress_n,
      CASE WHEN COUNT(wus.mood) >= 5 THEN ROUND(AVG(wus.mood), 2) END AS mood,
      CASE WHEN COUNT(wus.energy) >= 5 THEN ROUND(AVG(wus.energy), 2) END AS energy,
      CASE WHEN COUNT(wus.focus) >= 5 THEN ROUND(AVG(wus.focus), 2) END AS focus,
      CASE WHEN COUNT(wus.stress) >= 5 THEN ROUND(AVG(wus.stress), 2) END AS stress
    FROM weekly_user_stats wus
    GROUP BY wus.program_week
  ), category_rows AS (
    SELECT
      sp.sport_category,
      sp.sport_format,
      sp.sport_level,
      COUNT(*) FILTER (WHERE sp.eligibility_reason IN ('eligible', 'eligible_minor', 'eligible_test'))::integer AS eligible_participants
    FROM scoped_participants sp
    GROUP BY sp.sport_category, sp.sport_format, sp.sport_level
  ), counts AS (
    SELECT
      (SELECT COUNT(*) FROM scoped_participants)::integer AS participants_total,
      (SELECT COUNT(*) FROM eligible)::integer AS eligible_participants,
      (SELECT COUNT(*) FROM latest_snapshots)::integer AS participants_with_snapshot,
      (SELECT COUNT(ls.comprehension_average) FROM latest_snapshots ls)::integer AS participants_with_snapshot_comprehension,
      (SELECT COUNT(*) FROM completions)::integer AS total_completed_days,
      (SELECT COUNT(*) FROM checkins)::integer AS total_checkins,
      (SELECT COUNT(DISTINCT (dj.user_id, dj.created_at::date)) FROM public.daily_journals dj JOIN eligible e ON e.program_instance_id = dj.program_instance_id AND e.user_id = dj.user_id WHERE dj.created_at::date BETWEEN e.eligible_from AND e.eligible_until)::integer AS journal_count_only,
      (SELECT COUNT(DISTINCT ar.user_id) FROM assessment_rows ar WHERE ar.timing = 'pre')::integer AS pre_n,
      (SELECT COUNT(DISTINCT ar.user_id) FROM assessment_rows ar WHERE ar.timing = 'mid')::integer AS mid_n,
      (SELECT COUNT(DISTINCT ar.user_id) FROM assessment_rows ar WHERE ar.timing = 'post')::integer AS post_n,
      (SELECT COUNT(DISTINCT dr.user_id) FROM development_rows dr WHERE dr.timing = 'pre')::integer AS development_pre_n,
      (SELECT COUNT(DISTINCT dr.user_id) FROM development_rows dr WHERE dr.timing = 'mid')::integer AS development_mid_n,
      (SELECT COUNT(DISTINCT dr.user_id) FROM development_rows dr WHERE dr.timing = 'post')::integer AS development_post_n,
      ROUND((SELECT AVG(ls.completion_rate) FROM latest_snapshots ls)::numeric, 4) AS avg_completion_rate,
      ROUND((SELECT AVG(ls.days_completed) FROM latest_snapshots ls)::numeric, 2) AS avg_days_completed,
      ROUND((SELECT AVG(ls.days_available) FROM latest_snapshots ls)::numeric, 2) AS avg_days_available,
      ROUND((SELECT AVG(ls.current_streak) FROM latest_snapshots ls)::numeric, 2) AS avg_streak,
      ROUND((SELECT AVG(ls.comprehension_average) FROM latest_snapshots ls)::numeric, 4) AS avg_comprehension
  )
  SELECT jsonb_build_object(
    'generated_at', now(),
    'schema_version', 'solo-development-evidence-v1-2026-07',
    'protocol_version', _protocol_version,
    'scope', jsonb_build_object(
      'type', 'solo_aggregate',
      'sport_category', _sport_category,
      'sport_level', _sport_level,
      'data_mode', CASE WHEN _include_test THEN 'qa_only' ELSE 'production_only' END,
      'taxonomy_version', 'sport-taxonomy-v1-2026-07'
    ),
    'sample', jsonb_build_object(
      'scope_participants_total', c.participants_total,
      'eligible_participants', c.eligible_participants,
      'excluded_participants', GREATEST(c.participants_total - c.eligible_participants, 0),
      'exclusion_reasons', CASE
        WHEN c.participants_total > c.eligible_participants
          THEN jsonb_build_object('not_currently_authorized', c.participants_total - c.eligible_participants)
        ELSE '{}'::jsonb
      END,
      'aggregate_visible', c.eligible_participants >= 5,
      'low_confidence', c.eligible_participants BETWEEN 5 AND 9,
      'minimum_aggregate_n', 5,
      'test_data_included', _include_test,
      'data_mode', CASE WHEN _include_test THEN 'qa_only' ELSE 'production_only' END
    ),
    'sport_catalog', COALESCE((
      SELECT jsonb_agg(to_jsonb(cr) ORDER BY cr.sport_category, cr.sport_level)
      FROM category_rows cr WHERE cr.eligible_participants >= 5
    ), '[]'::jsonb),
    'cohort_breakdown', jsonb_build_object(
      'never_started', (SELECT COUNT(*) FROM participant_measurement_status pms WHERE NOT pms.has_pre),
      'only_pre', (SELECT COUNT(*) FROM participant_measurement_status pms WHERE pms.has_pre AND NOT pms.has_mid AND NOT pms.has_post),
      'pre_and_mid_no_post', (SELECT COUNT(*) FROM participant_measurement_status pms WHERE pms.has_pre AND pms.has_mid AND NOT pms.has_post),
      'completed_pre_post', (SELECT COUNT(*) FROM participant_measurement_status pms WHERE pms.has_pre AND pms.has_post)
    ),
    'usage', jsonb_build_object(
      'participants_with_snapshot', c.participants_with_snapshot,
      'participants_with_comprehension', c.participants_with_snapshot_comprehension,
      'total_completed_days', c.total_completed_days,
      'total_checkins', c.total_checkins,
      'journal_entries_count_only', c.journal_count_only,
      'avg_completion_rate', CASE WHEN c.participants_with_snapshot >= 5 THEN c.avg_completion_rate END,
      'avg_days_completed', CASE WHEN c.participants_with_snapshot >= 5 THEN c.avg_days_completed END,
      'avg_days_available', CASE WHEN c.participants_with_snapshot >= 5 THEN c.avg_days_available END,
      'avg_streak', CASE WHEN c.participants_with_snapshot >= 5 THEN c.avg_streak END,
      'avg_comprehension', CASE WHEN c.participants_with_snapshot_comprehension >= 5 THEN c.avg_comprehension END
    ),
    'measurement', jsonb_build_object(
      'validated_assessments', jsonb_build_object('pre_n', c.pre_n, 'mid_n', c.mid_n, 'post_n', c.post_n),
      'development_index', jsonb_build_object('pre_n', c.development_pre_n, 'mid_n', c.development_mid_n, 'post_n', c.development_post_n)
    ),
    'outcomes', jsonb_build_object(
      'validated_pre_post', COALESCE((SELECT jsonb_agg(to_jsonb(pp) ORDER BY pp.assessment_type, pp.subscale) FROM pre_post pp), '[]'::jsonb),
      'validated_pre_mid', COALESCE((SELECT jsonb_agg(to_jsonb(pm) ORDER BY pm.assessment_type, pm.subscale) FROM pre_mid pm), '[]'::jsonb),
      'development_overall', jsonb_build_object(
        'n', (SELECT COUNT(*) FROM development_pairs),
        'avg_pre', CASE WHEN (SELECT COUNT(*) FROM development_pairs) >= 5 THEN ROUND((SELECT AVG(dp.pre_score) FROM development_pairs dp)::numeric, 2) END,
        'avg_post', CASE WHEN (SELECT COUNT(*) FROM development_pairs) >= 5 THEN ROUND((SELECT AVG(dp.post_score) FROM development_pairs dp)::numeric, 2) END,
        'observed_change', CASE WHEN (SELECT COUNT(*) FROM development_pairs) >= 5 THEN ROUND(((SELECT AVG(dp.post_score) FROM development_pairs dp) - (SELECT AVG(dp.pre_score) FROM development_pairs dp))::numeric, 2) END,
        'sufficient_data', (SELECT COUNT(*) FROM development_pairs) >= 5,
        'low_confidence', (SELECT COUNT(*) FROM development_pairs) BETWEEN 5 AND 9
      ),
      'comprehension', to_jsonb(comp)
    ),
    'weekly_state', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'program_week', ws.program_week,
        'n', ws.n,
        'mood_n', ws.mood_n,
        'energy_n', ws.energy_n,
        'focus_n', ws.focus_n,
        'stress_n', ws.stress_n,
        'mood', ws.mood,
        'energy', ws.energy,
        'focus', ws.focus,
        'stress', ws.stress,
        'sufficient_data', ws.n >= 5,
        'low_confidence', ws.n BETWEEN 5 AND 9
      ) ORDER BY ws.program_week) FROM weekly_stats ws
    ), '[]'::jsonb),
    'data_quality', jsonb_build_object(
      'suppressed_sport_catalog_groups', (SELECT COUNT(*) FROM category_rows cr WHERE cr.eligible_participants < 5),
      'private_text_fields_present', false,
      'identifiers_present', false,
      'individual_values_present', false,
      'minimum_aggregate_n', 5,
      'authorization_gate', 'evidence_eligibility_reason',
      'duplicate_tracking_rows_collapsed', true,
      'source_value_ranges_validated', true
    ),
    'claim_boundary', jsonb_build_object(
      'allowed', jsonb_build_array(
        'observed in-app development',
        'program usage and data coverage',
        'aggregated self-reported transfer trend'
      ),
      'not_allowed', jsonb_build_array(
        'diagnosis',
        'causal sport-performance claim without an appropriate study design',
        'individual psychological evaluation',
        'competition outcome attribution'
      )
    ),
    'privacy', jsonb_build_object(
      'consent_required', true,
      'age_appropriate_authorization_required', true,
      'minimum_aggregate_n', 5,
      'journal_or_reflection_text_exported', false,
      'individual_values_exported', false,
      'athlete_identifiers_exported', false
    )
  ) INTO result
  FROM counts c
  CROSS JOIN comprehension comp;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_solo_development_evidence_summary(text, text, boolean, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_solo_development_evidence_summary(text, text, boolean, text)
  TO authenticated;

-- The historical transfer aggregate remains useful, but its include-test flag
-- originally meant "Production plus QA". Keep the production-contamination
-- probe used by QA parity, while requiring every normal read to stay in one
-- explicit data mode.
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
  actor_id uuid := auth.uid();
  result jsonb;
  minor_enabled boolean;
  target_is_test boolean;
BEGIN
  IF actor_id IS NULL OR NOT public.has_role(actor_id, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'admin_role_required' USING ERRCODE = '42501';
  END IF;

  IF _program_run_id IS NULL AND _include_test THEN
    RAISE EXCEPTION 'use_solo_qa_evidence_summary';
  END IF;

  IF _program_run_id IS NOT NULL THEN
    SELECT COALESCE(t.is_test_team, false)
    INTO target_is_test
    FROM public.program_runs pr
    JOIN public.teams t ON t.id = pr.team_id
    WHERE pr.id = _program_run_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'program_run_not_found';
    END IF;

    -- A false call on a QA run is an intentional admin-only contamination
    -- probe. Every actual Production or QA aggregate must be internally pure.
    IF NOT (target_is_test AND NOT _include_test) THEN
      IF target_is_test IS DISTINCT FROM _include_test THEN
        RAISE EXCEPTION 'evidence_data_mode_mismatch';
      END IF;

      IF EXISTS (
        SELECT 1
        FROM public.program_instances pi
        JOIN public.profiles p ON p.id = pi.user_id
        WHERE pi.program_run_id = _program_run_id
          AND (
            (target_is_test AND NOT (
              COALESCE(p.is_test_user, false)
              AND COALESCE(pi.is_test_instance, false)
            ))
            OR (
              NOT target_is_test
              AND (
                COALESCE(p.is_test_user, false)
                OR COALESCE(pi.is_test_instance, false)
              )
            )
          )
      ) OR EXISTS (
        SELECT 1
        FROM public.athlete_transfer_observations ato
        WHERE ato.program_run_id = _program_run_id
          AND COALESCE(ato.is_test, false) IS DISTINCT FROM target_is_test
      ) OR EXISTS (
        SELECT 1
        FROM public.coach_evidence_reviews cer
        WHERE cer.program_run_id = _program_run_id
          AND COALESCE(cer.is_test, false) IS DISTINCT FROM target_is_test
      ) THEN
        RAISE EXCEPTION 'program_run_data_mode_contamination';
      END IF;
    END IF;
  END IF;

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

-- Freeze the complete run or solo dossier together with transfer evidence.
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
  run_evidence jsonb;
  transfer_evidence jsonb;
  manifest jsonb;
  lock_id uuid;
  schema_version text;
  checksum text;
  cutoff timestamptz := now();
  target_is_test boolean;
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
    SELECT COALESCE(t.is_test_team, false)
    INTO target_is_test
    FROM public.program_runs pr
    JOIN public.teams t ON t.id = pr.team_id
    WHERE pr.id = _program_run_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'program_run_not_found';
    END IF;
    IF target_is_test IS DISTINCT FROM _include_test THEN
      RAISE EXCEPTION 'evidence_data_mode_mismatch';
    END IF;

    run_evidence := public.get_program_run_development_evidence(
      _program_run_id,
      _protocol_version
    );
    transfer_evidence := public.get_performance_evidence_summary(
      _program_run_id,
      _include_test,
      _protocol_version
    )::jsonb;
    payload := jsonb_build_object(
      'generated_at', cutoff,
      'schema_version', 'program-run-evidence-lock-v2-2026-07',
      'scope', 'program_run',
      'protocol_version', _protocol_version,
      'meta', run_evidence -> 'meta',
      'sample', run_evidence -> 'sample',
      'usage', run_evidence -> 'usage',
      'team_pulse', run_evidence -> 'team_pulse',
      'measurement', run_evidence -> 'measurement',
      'outcomes', run_evidence -> 'outcomes',
      'transfer_evidence', transfer_evidence,
      'data_quality', (run_evidence -> 'data_quality') || jsonb_build_object(
        'transfer_data_quality', transfer_evidence -> 'data_quality'
      ),
      'claim_boundary', jsonb_build_object(
        'narrative', run_evidence ->> 'claim_boundary',
        'allowed', jsonb_build_array(
          'observed in-app development',
          'program usage and data coverage',
          'aggregated self-reported transfer trends',
          'aggregated structured coach observations'
        ),
        'not_allowed', jsonb_build_array(
          'diagnosis',
          'causal sport-performance claim without an appropriate study design',
          'individual psychological evaluation',
          'competition outcome attribution'
        )
      ),
      'privacy', jsonb_build_object(
        'consent_required', true,
        'age_appropriate_authorization_required', true,
        'minimum_aggregate_n', 5,
        'low_confidence_below_n', 10,
        'journal_or_reflection_text_exported', false,
        'individual_values_exported', false,
        'athlete_identifiers_exported', false
      )
    );
  ELSE
    run_evidence := public.get_solo_development_evidence_summary(
      _sport_category,
      _sport_level,
      _include_test,
      _protocol_version
    );
    transfer_evidence := public.get_solo_sport_evidence_summary(
      _sport_category,
      _sport_level,
      _include_test,
      _protocol_version
    )::jsonb;
    payload := jsonb_build_object(
      'generated_at', cutoff,
      'schema_version', 'solo-sport-evidence-lock-v2-2026-07',
      'scope', run_evidence -> 'scope',
      'protocol_version', _protocol_version,
      'sample', run_evidence -> 'sample',
      'sport_catalog', run_evidence -> 'sport_catalog',
      'cohort_breakdown', run_evidence -> 'cohort_breakdown',
      'usage', run_evidence -> 'usage',
      'measurement', run_evidence -> 'measurement',
      'outcomes', run_evidence -> 'outcomes',
      'weekly_state', run_evidence -> 'weekly_state',
      'transfer_evidence', transfer_evidence,
      'data_quality', (run_evidence -> 'data_quality') || jsonb_build_object(
        'transfer_data_quality', transfer_evidence -> 'data_quality'
      ),
      'claim_boundary', run_evidence -> 'claim_boundary',
      'privacy', run_evidence -> 'privacy'
    );
  END IF;

  schema_version := COALESCE(payload ->> 'schema_version', 'unknown');
  checksum := encode(extensions.digest(convert_to(payload::text, 'UTF8'), 'sha256'), 'hex');
  manifest := jsonb_build_object(
    'manifest_version', 'evidence-analysis-manifest-v2-2026-07',
    'source_cutoff', cutoff,
    'scope_type', CASE WHEN _program_run_id IS NULL THEN 'solo_aggregate' ELSE 'program_run' END,
    'program_run_id', _program_run_id,
    'sport_category', _sport_category,
    'sport_level', _sport_level,
    'data_mode', CASE WHEN _include_test THEN 'qa_only' ELSE 'production_only' END,
    'protocol_version', _protocol_version,
    'snapshot_schema_version', schema_version,
    'checksum_algorithm', 'sha256',
    'content_checksum', checksum,
    'minimum_aggregate_n', 5,
    'low_confidence_below_n', 10,
    'included_sections', CASE
      WHEN _program_run_id IS NULL THEN jsonb_build_array(
        'sample', 'sport_catalog', 'cohort_breakdown', 'usage',
        'measurement', 'outcomes', 'weekly_state', 'transfer_evidence',
        'data_quality', 'claim_boundary', 'privacy'
      )
      ELSE jsonb_build_array(
        'sample', 'usage', 'team_pulse', 'measurement', 'outcomes',
        'transfer_evidence', 'data_quality', 'claim_boundary', 'privacy'
      )
    END,
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

REVOKE ALL ON FUNCTION public.create_evidence_data_lock(uuid, text, text, boolean, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_evidence_data_lock(uuid, text, text, boolean, text)
  TO authenticated;

-- The Data Lock contract supersedes the older mutable snapshot builders. Keep
-- historical rows readable for internal operations, but remove every direct
-- authenticated creation path so exports cannot bypass current eligibility.
DO $$
DECLARE
  legacy_signature text;
BEGIN
  FOREACH legacy_signature IN ARRAY ARRAY[
    'public.create_study_aggregate_snapshot(uuid,boolean)',
    'public.create_nlz_evidence_snapshot(uuid,boolean)',
    'public.create_nlz_program_run_snapshot(uuid)'
  ] LOOP
    IF to_regprocedure(legacy_signature) IS NOT NULL THEN
      EXECUTE format(
        'REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',
        legacy_signature
      );
    END IF;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.get_program_run_development_evidence(uuid, text) IS
  'Current-consent and age-authorization-gated run aggregate shared by coach and admin evidence views. No individual values or private text are returned.';
COMMENT ON FUNCTION public.get_solo_development_evidence_summary(text, text, boolean, text) IS
  'Current-consent and age-authorization-gated solo aggregate for usage, measurement coverage, observed changes and program-week trends. No individual values or private text are returned.';
COMMENT ON FUNCTION public.create_evidence_data_lock(uuid, text, text, boolean, text) IS
  'Creates an immutable, checksummed aggregate snapshot. Program-run and solo locks combine development, usage, state trends and transfer evidence without individual values or private text.';

COMMIT;
