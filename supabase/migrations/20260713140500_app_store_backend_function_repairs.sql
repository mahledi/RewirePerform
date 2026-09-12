-- Repair functions that failed plpgsql_check in the confirmed remote schema.
-- This migration only tightens existing access and corrects compilation errors.
BEGIN;

CREATE OR REPLACE FUNCTION public.get_team_stats(team_id_param uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  team_owner uuid;
BEGIN
  SELECT t.created_by
  INTO team_owner
  FROM public.teams t
  WHERE t.id = team_id_param;

  IF team_owner IS NULL OR team_owner != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: only the team creator can view stats';
  END IF;

  SELECT json_build_object(
    'member_count', (
      SELECT COUNT(*)
      FROM public.team_members tm
      WHERE tm.team_id = team_id_param
    ),
    'checkins_last_week', (
      SELECT COUNT(*)
      FROM public.daily_checkins dc
      JOIN public.team_members tm ON dc.user_id = tm.user_id
      WHERE tm.team_id = team_id_param
        AND dc.date >= CURRENT_DATE - 7
    ),
    'assessments_completed', (
      SELECT COUNT(*)
      FROM public.assessments a
      JOIN public.team_members tm ON a.user_id = tm.user_id
      WHERE tm.team_id = team_id_param
    )
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_team_stats(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_team_stats(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_nlz_evidence_dossier(
  include_test boolean DEFAULT false,
  cohort_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  WITH eligible_profiles AS (
    SELECT
      p.id,
      COALESCE(p.is_test_user, false) AS is_test_user,
      COALESCE(p.data_contribution_consent, false) AS has_consent
    FROM public.profiles p
    WHERE $1 OR NOT COALESCE(p.is_test_user, false)
  ),
  all_athletes AS (
    SELECT ep.id, ep.has_consent
    FROM eligible_profiles ep
    JOIN public.user_roles ur ON ur.user_id = ep.id AND ur.role = 'athlete'
  ),
  scoped_athletes AS (
    SELECT aa.id, aa.has_consent
    FROM all_athletes aa
    WHERE $2 IS NULL
       OR EXISTS (
        SELECT 1
        FROM public.study_participants sp
        WHERE sp.cohort_id = $2
          AND sp.user_id = aa.id
          AND sp.included = true
       )
  ),
  consented_athletes AS (
    SELECT id
    FROM scoped_athletes
    WHERE has_consent = true
  ),
  athlete_teams AS (
    SELECT ca.id AS user_id, tm.team_id
    FROM consented_athletes ca
    LEFT JOIN public.team_members tm ON tm.user_id = ca.id
  ),
  latest_snapshots AS (
    SELECT DISTINCT ON (pps.user_id)
      pps.user_id,
      pps.team_id,
      pps.program_instance_id,
      pps.program_day,
      pps.days_available,
      pps.days_completed,
      pps.completion_rate,
      pps.current_streak,
      pps.longest_streak,
      pps.comprehension_average,
      pps.checkins_completed_count,
      pps.journals_completed_count,
      pps.tasks_completed_count,
      pps.date
    FROM public.program_progress_snapshots pps
    JOIN consented_athletes ca ON ca.id = pps.user_id
    ORDER BY pps.user_id, pps.date DESC
  ),
  activation AS (
    SELECT
      (SELECT COUNT(*) FROM scoped_athletes)::int AS athletes_total,
      (SELECT COUNT(*) FROM consented_athletes)::int AS consented_athletes,
      (SELECT COUNT(*) FROM scoped_athletes WHERE has_consent = false)::int AS athletes_without_consent,
      (SELECT COUNT(DISTINCT pi.user_id) FROM public.program_instances pi JOIN consented_athletes ca ON ca.id = pi.user_id)::int AS program_instances,
      (SELECT COUNT(DISTINCT udc.user_id) FROM public.user_day_completion udc JOIN consented_athletes ca ON ca.id = udc.user_id WHERE udc.completion_status = 'completed' AND udc.day_number = 1)::int AS day_1_completed,
      (SELECT COUNT(DISTINCT udc.user_id) FROM public.user_day_completion udc JOIN consented_athletes ca ON ca.id = udc.user_id WHERE udc.completion_status = 'completed' AND udc.day_number = 28)::int AS day_28_completed,
      (SELECT COUNT(DISTINCT udc.user_id) FROM public.user_day_completion udc JOIN consented_athletes ca ON ca.id = udc.user_id WHERE udc.completion_status = 'completed' AND udc.day_number = 56)::int AS day_56_completed,
      (SELECT COUNT(DISTINCT user_id) FROM (
        SELECT udc.user_id FROM public.user_day_completion udc JOIN consented_athletes ca ON ca.id = udc.user_id WHERE udc.completed_at >= now() - interval '7 days'
        UNION
        SELECT dc.user_id FROM public.daily_checkins dc JOIN consented_athletes ca ON ca.id = dc.user_id WHERE dc.created_at >= now() - interval '7 days'
      ) active_7)::int AS active_7d,
      (SELECT COUNT(DISTINCT user_id) FROM (
        SELECT udc.user_id FROM public.user_day_completion udc JOIN consented_athletes ca ON ca.id = udc.user_id WHERE udc.completed_at >= now() - interval '28 days'
        UNION
        SELECT dc.user_id FROM public.daily_checkins dc JOIN consented_athletes ca ON ca.id = dc.user_id WHERE dc.created_at >= now() - interval '28 days'
      ) active_28)::int AS active_28d
  ),
  activity AS (
    SELECT
      (SELECT COUNT(*) FROM public.user_day_completion udc JOIN consented_athletes ca ON ca.id = udc.user_id WHERE udc.completion_status = 'completed')::int AS completed_days_total,
      (SELECT COUNT(*) FROM public.daily_checkins dc JOIN consented_athletes ca ON ca.id = dc.user_id)::int AS checkins_total,
      (SELECT COUNT(*) FROM public.daily_journals dj JOIN consented_athletes ca ON ca.id = dj.user_id)::int AS journal_entries_count_only,
      (SELECT COUNT(*) FROM public.comprehension_check_instances cci JOIN consented_athletes ca ON ca.id = cci.user_id WHERE cci.status = 'completed')::int AS comprehension_checks_total,
      ROUND(AVG(ls.completion_rate)::numeric, 4) AS avg_completion_rate,
      ROUND(AVG(ls.days_completed)::numeric, 2) AS avg_days_completed,
      ROUND(AVG(ls.days_available)::numeric, 2) AS avg_days_available,
      ROUND(AVG(ls.current_streak)::numeric, 2) AS avg_current_streak,
      ROUND(AVG(ls.comprehension_average)::numeric, 4) AS avg_comprehension
    FROM latest_snapshots ls
  ),
  checkin_state AS (
    SELECT
      COUNT(DISTINCT dc.user_id)::int AS n_users,
      COUNT(*)::int AS n_checkins,
      ROUND(AVG(dc.mood_before)::numeric, 2) AS mood,
      ROUND(AVG(dc.energy_level)::numeric, 2) AS energy,
      ROUND(AVG(dc.focus_rating)::numeric, 2) AS focus,
      ROUND(AVG(NULLIF(dc.wellbeing_metrics ->> 'stress', '')::numeric)::numeric, 2) AS stress,
      ROUND(AVG(NULLIF(dc.wellbeing_metrics ->> 'recovery', '')::numeric)::numeric, 2) AS recovery,
      ROUND(AVG(NULLIF(dc.wellbeing_metrics ->> 'pressure', '')::numeric)::numeric, 2) AS pressure,
      ROUND(AVG(NULLIF(dc.wellbeing_metrics ->> 'team_connection', '')::numeric)::numeric, 2) AS team_connection,
      ROUND(AVG(NULLIF(dc.wellbeing_metrics ->> 'sleep_quality', '')::numeric)::numeric, 2) AS sleep
    FROM public.daily_checkins dc
    JOIN consented_athletes ca ON ca.id = dc.user_id
    WHERE dc.created_at >= now() - interval '28 days'
  ),
  assessment_counts AS (
    SELECT
      (COUNT(DISTINCT a.user_id) FILTER (WHERE a.timing = 'pre'))::int AS pre_n,
      (COUNT(DISTINCT a.user_id) FILTER (WHERE a.timing = 'mid'))::int AS mid_n,
      (COUNT(DISTINCT a.user_id) FILTER (WHERE a.timing = 'post'))::int AS post_n
    FROM public.assessments a
    JOIN consented_athletes ca ON ca.id = a.user_id
  ),
  assessment_pairs AS (
    WITH score_rows AS (
      SELECT
        a.user_id,
        a.assessment_type,
        a.timing,
        key AS subscale,
        value::numeric AS score
      FROM public.assessments a
      JOIN consented_athletes ca ON ca.id = a.user_id
      CROSS JOIN LATERAL jsonb_each_text(COALESCE(a.scores::jsonb, '{}'::jsonb)) s(key, value)
      WHERE a.timing IN ('pre', 'mid', 'post')
      UNION ALL
      SELECT
        a.user_id,
        a.assessment_type,
        a.timing,
        'total_score' AS subscale,
        a.total_score AS score
      FROM public.assessments a
      JOIN consented_athletes ca ON ca.id = a.user_id
      WHERE a.timing IN ('pre', 'mid', 'post')
        AND a.total_score IS NOT NULL
    ),
    paired AS (
      SELECT
        pre.assessment_type,
        pre.subscale,
        pre.score AS pre_score,
        post.score AS post_score,
        mid.score AS mid_score
      FROM score_rows pre
      LEFT JOIN score_rows post
        ON post.user_id = pre.user_id
       AND post.assessment_type = pre.assessment_type
       AND post.subscale = pre.subscale
       AND post.timing = 'post'
      LEFT JOIN score_rows mid
        ON mid.user_id = pre.user_id
       AND mid.assessment_type = pre.assessment_type
       AND mid.subscale = pre.subscale
       AND mid.timing = 'mid'
      WHERE pre.timing = 'pre'
    ),
    pre_post AS (
      SELECT
        assessment_type,
        subscale,
        (COUNT(*) FILTER (WHERE post_score IS NOT NULL))::int AS n_pairs,
        ROUND((AVG(pre_score) FILTER (WHERE post_score IS NOT NULL))::numeric, 2) AS avg_pre,
        ROUND(AVG(post_score)::numeric, 2) AS avg_post,
        ROUND((AVG(post_score) - (AVG(pre_score) FILTER (WHERE post_score IS NOT NULL)))::numeric, 2) AS abs_change,
        CASE
          WHEN COUNT(*) FILTER (WHERE post_score IS NOT NULL) >= 5
           AND (POWER((STDDEV_POP(pre_score) FILTER (WHERE post_score IS NOT NULL)), 2) + POWER(STDDEV_POP(post_score), 2)) > 0
          THEN ROUND(
            ((AVG(post_score) - (AVG(pre_score) FILTER (WHERE post_score IS NOT NULL))) /
             NULLIF(SQRT((POWER((STDDEV_POP(pre_score) FILTER (WHERE post_score IS NOT NULL)), 2) + POWER(STDDEV_POP(post_score), 2)) / 2.0), 0))::numeric,
            3
          )
          ELSE NULL
        END AS effect_size_d,
        (COUNT(*) FILTER (WHERE post_score IS NOT NULL) >= 5) AS sufficient_data
      FROM paired
      WHERE post_score IS NOT NULL
      GROUP BY assessment_type, subscale
    ),
    pre_mid AS (
      SELECT
        assessment_type,
        subscale,
        (COUNT(*) FILTER (WHERE mid_score IS NOT NULL))::int AS n_pairs,
        ROUND((AVG(pre_score) FILTER (WHERE mid_score IS NOT NULL))::numeric, 2) AS avg_pre,
        ROUND(AVG(mid_score)::numeric, 2) AS avg_mid,
        ROUND((AVG(mid_score) - (AVG(pre_score) FILTER (WHERE mid_score IS NOT NULL)))::numeric, 2) AS abs_change,
        (COUNT(*) FILTER (WHERE mid_score IS NOT NULL) >= 5) AS sufficient_data
      FROM paired
      WHERE mid_score IS NOT NULL
      GROUP BY assessment_type, subscale
    )
    SELECT json_build_object(
      'pre_post', COALESCE((SELECT json_agg(row_to_json(pre_post) ORDER BY assessment_type, subscale) FROM pre_post), '[]'::json),
      'pre_mid', COALESCE((SELECT json_agg(row_to_json(pre_mid) ORDER BY assessment_type, subscale) FROM pre_mid), '[]'::json),
      'max_pre_post_pairs', COALESCE((SELECT MAX(n_pairs) FROM pre_post), 0),
      'max_pre_mid_pairs', COALESCE((SELECT MAX(n_pairs) FROM pre_mid), 0)
    ) AS payload
  ),
  development_rows AS (
    SELECT
      dpa.user_id,
      CASE WHEN dpa.timing IN ('baseline', 'pre') THEN 'pre' WHEN dpa.timing IN ('retest', 'post') THEN 'post' ELSE dpa.timing END AS timing,
      NULLIF(dpa.scores::jsonb ->> 'overall0to100', '')::numeric AS overall,
      COALESCE(dpa.scores::jsonb -> 'subscores', '{}'::jsonb) AS subscores
    FROM public.deep_profile_assessments dpa
    JOIN consented_athletes ca ON ca.id = dpa.user_id
    WHERE dpa.timing IN ('baseline', 'pre', 'mid', 'post', 'retest')
    UNION ALL
    SELECT
      qr.user_id,
      qr.timing,
      NULLIF(qr.scores::jsonb ->> 'overall0to100', '')::numeric AS overall,
      COALESCE(qr.scores::jsonb -> 'subscores', '{}'::jsonb) AS subscores
    FROM public.questionnaire_responses qr
    JOIN consented_athletes ca ON ca.id = qr.user_id
    WHERE qr.instrument_id = 'rewire_development_index'
      AND qr.is_complete = true
      AND qr.timing IN ('pre', 'mid', 'post')
  ),
  development_counts AS (
    SELECT
      (COUNT(DISTINCT user_id) FILTER (WHERE timing = 'pre'))::int AS pre_n,
      (COUNT(DISTINCT user_id) FILTER (WHERE timing = 'mid'))::int AS mid_n,
      (COUNT(DISTINCT user_id) FILTER (WHERE timing = 'post'))::int AS post_n
    FROM development_rows
  ),
  development_pairs AS (
    WITH latest AS (
      SELECT DISTINCT ON (user_id, timing)
        user_id, timing, overall, subscores
      FROM development_rows
      ORDER BY user_id, timing, overall DESC NULLS LAST
    ),
    overall_pairs AS (
      SELECT
        'overall0to100' AS metric,
        (COUNT(*) FILTER (WHERE post.overall IS NOT NULL))::int AS n_pre_post,
        ROUND((AVG(pre.overall) FILTER (WHERE post.overall IS NOT NULL))::numeric, 2) AS avg_pre,
        ROUND(AVG(post.overall)::numeric, 2) AS avg_post,
        ROUND((AVG(post.overall) - (AVG(pre.overall) FILTER (WHERE post.overall IS NOT NULL)))::numeric, 2) AS abs_change,
        (COUNT(*) FILTER (WHERE post.overall IS NOT NULL) >= 5) AS sufficient_data
      FROM latest pre
      LEFT JOIN latest post ON post.user_id = pre.user_id AND post.timing = 'post'
      WHERE pre.timing = 'pre'
    ),
    subscale_rows AS (
      SELECT pre.user_id, key AS subscale, value::numeric AS pre_score
      FROM latest pre
      CROSS JOIN LATERAL jsonb_each_text(pre.subscores) s(key, value)
      WHERE pre.timing = 'pre'
    ),
    subscale_pairs AS (
      SELECT
        sr.subscale AS metric,
        COUNT(*)::int AS n_pre_post,
        ROUND(AVG(sr.pre_score)::numeric, 2) AS avg_pre,
        ROUND(AVG((post.subscores ->> sr.subscale)::numeric)::numeric, 2) AS avg_post,
        ROUND((AVG((post.subscores ->> sr.subscale)::numeric) - AVG(sr.pre_score))::numeric, 2) AS abs_change,
        (COUNT(*) >= 5) AS sufficient_data
      FROM subscale_rows sr
      JOIN latest post ON post.user_id = sr.user_id AND post.timing = 'post' AND post.subscores ? sr.subscale
      GROUP BY sr.subscale
    )
    SELECT json_build_object(
      'overall', COALESCE((SELECT row_to_json(overall_pairs) FROM overall_pairs), '{}'::json),
      'subscores', COALESCE((SELECT json_agg(row_to_json(subscale_pairs) ORDER BY metric) FROM subscale_pairs), '[]'::json),
      'max_pre_post_pairs', COALESCE((SELECT n_pre_post FROM overall_pairs), 0)
    ) AS payload
  ),
  team_readiness AS (
    SELECT
      t.id,
      t.name,
      COUNT(DISTINCT at.user_id)::int AS athlete_count,
      (COUNT(DISTINCT a.user_id) FILTER (WHERE a.timing = 'pre'))::int AS pre_n,
      (COUNT(DISTINCT a.user_id) FILTER (WHERE a.timing = 'post'))::int AS post_n,
      (COUNT(DISTINCT dr.user_id) FILTER (WHERE dr.timing = 'post'))::int AS development_post_n,
      ROUND(AVG(ls.completion_rate)::numeric, 4) AS avg_completion_rate
    FROM public.teams t
    JOIN athlete_teams at ON at.team_id = t.id
    LEFT JOIN public.assessments a ON a.user_id = at.user_id
    LEFT JOIN development_rows dr ON dr.user_id = at.user_id
    LEFT JOIN latest_snapshots ls ON ls.user_id = at.user_id
    WHERE $1 OR NOT COALESCE(t.is_test_team, false)
    GROUP BY t.id, t.name
  ),
  measurement_windows_rollup AS (
    SELECT json_agg(json_build_object(
      'label', smw.label,
      'planned_start_date', smw.planned_start_date,
      'planned_end_date', smw.planned_end_date,
      'actual_completed_count', smw.actual_completed_count,
      'target_count', smw.target_count,
      'status', smw.status
    ) ORDER BY smw.planned_start_date NULLS LAST, smw.label) AS windows
    FROM public.study_measurement_windows smw
    WHERE $2 IS NULL OR smw.cohort_id = $2
  ),
  quality AS (
    SELECT
      (SELECT COUNT(*) FROM scoped_athletes WHERE has_consent = false)::int AS athletes_without_consent,
      (SELECT COUNT(*) FROM consented_athletes ca WHERE NOT EXISTS (SELECT 1 FROM public.program_instances pi WHERE pi.user_id = ca.id))::int AS athletes_without_program_instance,
      (SELECT COUNT(*) FROM consented_athletes ca WHERE NOT EXISTS (SELECT 1 FROM public.user_day_completion udc WHERE udc.user_id = ca.id AND udc.day_number = 1 AND udc.completion_status = 'completed'))::int AS athletes_without_day_1,
      (SELECT COUNT(*) FROM consented_athletes ca WHERE NOT EXISTS (SELECT 1 FROM public.assessments a WHERE a.user_id = ca.id AND a.timing = 'pre') AND NOT EXISTS (SELECT 1 FROM development_rows dr WHERE dr.user_id = ca.id AND dr.timing = 'pre'))::int AS athletes_without_pre_measurement,
      (SELECT COUNT(*) FROM consented_athletes ca JOIN latest_snapshots ls ON ls.user_id = ca.id WHERE COALESCE(ls.program_day, 0) >= 56 AND NOT EXISTS (SELECT 1 FROM public.assessments a WHERE a.user_id = ca.id AND a.timing = 'post') AND NOT EXISTS (SELECT 1 FROM development_rows dr WHERE dr.user_id = ca.id AND dr.timing = 'post'))::int AS post_due_missing,
      (SELECT COUNT(*) FROM team_readiness WHERE athlete_count < 5)::int AS teams_below_min_n
  ),
  readiness_base AS (
    SELECT
      act.athletes_total,
      act.consented_athletes,
      act.active_7d,
      ac.pre_n AS validated_pre_n,
      ac.post_n AS validated_post_n,
      dc.pre_n AS development_pre_n,
      dc.post_n AS development_post_n,
      COALESCE((ap.payload ->> 'max_pre_post_pairs')::int, 0) AS max_validated_pairs,
      COALESCE((dp.payload ->> 'max_pre_post_pairs')::int, 0) AS max_development_pairs,
      (SELECT COUNT(*) FROM team_readiness WHERE athlete_count >= 5)::int AS teams_min_n,
      (SELECT COUNT(*) FROM team_readiness WHERE athlete_count >= 5 AND (post_n >= 5 OR development_post_n >= 5))::int AS teams_pre_post_ready,
      q.athletes_without_program_instance,
      q.athletes_without_pre_measurement,
      q.post_due_missing
    FROM activation act
    CROSS JOIN assessment_counts ac
    CROSS JOIN development_counts dc
    CROSS JOIN assessment_pairs ap
    CROSS JOIN development_pairs dp
    CROSS JOIN quality q
  ),
  readiness AS (
    SELECT
      CASE
        WHEN consented_athletes >= 20
          AND teams_min_n >= 2
          AND GREATEST(max_validated_pairs, max_development_pairs) >= 10
          AND athletes_without_program_instance = 0
          AND athletes_without_pre_measurement = 0
        THEN 'Study-ready'
        WHEN (consented_athletes >= 10 OR teams_pre_post_ready >= 1)
          AND (GREATEST(validated_post_n, development_post_n, max_validated_pairs, max_development_pairs) >= 5)
          AND athletes_without_program_instance = 0
        THEN 'NLZ präsentationsfähig'
        WHEN teams_min_n >= 1
          AND active_7d > 0
          AND GREATEST(validated_pre_n, development_pre_n) >= 5
        THEN 'NLZ pilot-ready'
        WHEN consented_athletes > 0
          OR active_7d > 0
          OR GREATEST(validated_pre_n, development_pre_n) > 0
        THEN 'Pilotdaten sammeln'
        ELSE 'Setup offen'
      END AS stage,
      CASE
        WHEN consented_athletes = 0 THEN 'Consent und erste Athletenmessungen aktivieren.'
        WHEN GREATEST(validated_pre_n, development_pre_n) < 5 THEN 'Pre-Messbasis auf mindestens n=5 bringen.'
        WHEN teams_min_n < 1 THEN 'Mindestens ein Team oder eine Cohort mit n>=5 aufbauen.'
        WHEN GREATEST(validated_post_n, development_post_n, max_validated_pairs, max_development_pairs) < 5 THEN 'Post- oder Development-Index-Paare für Veränderung sammeln.'
        WHEN athletes_without_program_instance > 0 THEN 'Programmlauf-Zuordnung bereinigen.'
        ELSE 'Datenlage ist für ein ehrliches NLZ-Gespräch strukturiert.'
      END AS next_focus
    FROM readiness_base
  )
  SELECT json_build_object(
    'generated_at', now(),
    'include_test', $1,
    'cohort_id', $2,
    'privacy_level', 'consented_aggregate_only',
    'consent_scope', 'only profiles with data_contribution_consent = true are included',
    'claim_boundary', 'beobachtete Entwicklung; keine Diagnose; keine medizinische Wirkung; keine Kausalaussage ohne Kontrollgruppe',
    'readiness', json_build_object(
      'stage', r.stage,
      'next_focus', r.next_focus
    ),
    'summary', json_build_object(
      'athletes_total', act.athletes_total,
      'consented_athletes', act.consented_athletes,
      'consent_rate', CASE WHEN act.athletes_total > 0 THEN ROUND((act.consented_athletes::numeric / act.athletes_total), 4) ELSE NULL END,
      'active_7d', act.active_7d,
      'active_28d', act.active_28d,
      'program_instances', act.program_instances,
      'day_1_completed', act.day_1_completed,
      'day_28_completed', act.day_28_completed,
      'day_56_completed', act.day_56_completed
    ),
    'usage', json_build_object(
      'completed_days_total', activity.completed_days_total,
      'checkins_total', activity.checkins_total,
      'journal_entries_count_only', activity.journal_entries_count_only,
      'comprehension_checks_total', activity.comprehension_checks_total
    ),
    'adherence', json_build_object(
      'avg_completion_rate', activity.avg_completion_rate,
      'avg_days_completed', activity.avg_days_completed,
      'avg_days_available', activity.avg_days_available,
      'avg_current_streak', activity.avg_current_streak,
      'avg_comprehension', activity.avg_comprehension
    ),
    'state_28d', json_build_object(
      'n_users', cs.n_users,
      'n_checkins', cs.n_checkins,
      'sufficient_data', cs.n_users >= 5,
      'mood', CASE WHEN cs.n_users >= 5 THEN cs.mood ELSE NULL END,
      'energy', CASE WHEN cs.n_users >= 5 THEN cs.energy ELSE NULL END,
      'focus', CASE WHEN cs.n_users >= 5 THEN cs.focus ELSE NULL END,
      'stress', CASE WHEN cs.n_users >= 5 THEN cs.stress ELSE NULL END,
      'recovery', CASE WHEN cs.n_users >= 5 THEN cs.recovery ELSE NULL END,
      'pressure', CASE WHEN cs.n_users >= 5 THEN cs.pressure ELSE NULL END,
      'team_connection', CASE WHEN cs.n_users >= 5 THEN cs.team_connection ELSE NULL END,
      'sleep', CASE WHEN cs.n_users >= 5 THEN cs.sleep ELSE NULL END
    ),
    'measurement', json_build_object(
      'validated_assessments', json_build_object('pre_n', ac.pre_n, 'mid_n', ac.mid_n, 'post_n', ac.post_n),
      'development_index', json_build_object('pre_n', dc.pre_n, 'mid_n', dc.mid_n, 'post_n', dc.post_n),
      'measurement_windows', COALESCE(mwr.windows, '[]'::json)
    ),
    'outcomes', json_build_object(
      'validated_assessments', ap.payload,
      'development_index', dp.payload
    ),
    'teams', COALESCE((
      SELECT json_agg(json_build_object(
        'team_id', id,
        'team', name,
        'athlete_count', athlete_count,
        'pre_n', pre_n,
        'post_n', post_n,
        'development_post_n', development_post_n,
        'avg_completion_rate', CASE WHEN athlete_count >= 5 THEN avg_completion_rate ELSE NULL END,
        'aggregate_visible', athlete_count >= 5,
        'evidence_ready', athlete_count >= 5 AND (post_n >= 5 OR development_post_n >= 5)
      ) ORDER BY name)
      FROM team_readiness
    ), '[]'::json),
    'outcome_definitions', COALESCE((
      SELECT json_agg(row_to_json(od) ORDER BY display_order)
      FROM (
        SELECT id, domain, label, source_table, source_field, direction, min_aggregate_n, claim_boundary
        FROM public.study_outcome_definitions
      ) od
    ), '[]'::json),
    'data_quality', json_build_object(
      'athletes_without_consent', q.athletes_without_consent,
      'athletes_without_program_instance', q.athletes_without_program_instance,
      'athletes_without_day_1', q.athletes_without_day_1,
      'athletes_without_pre_measurement', q.athletes_without_pre_measurement,
      'post_due_missing', q.post_due_missing,
      'teams_below_min_n', q.teams_below_min_n,
      'min_sensitive_aggregate_n', 5,
      'qa_included', $1
    ),
    'export_catalog', json_build_array(
      'nlz_evidence_dossier.json',
      'nlz_summary.csv',
      'nlz_outcomes.csv',
      'nlz_data_quality.csv',
      'claim_boundary.md'
    ),
    'privacy_exclusions', json_build_array(
      'journal_text',
      'free_reflection',
      'raw_individual_checkins',
      'raw_questionnaire_answers',
      'individual_psychological_scores',
      'individual_profiles'
    )
  ) INTO result
  FROM activation act
  CROSS JOIN activity
  CROSS JOIN checkin_state cs
  CROSS JOIN assessment_counts ac
  CROSS JOIN assessment_pairs ap
  CROSS JOIN development_counts dc
  CROSS JOIN development_pairs dp
  CROSS JOIN measurement_windows_rollup mwr
  CROSS JOIN quality q
  CROSS JOIN readiness r;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_nlz_evidence_dossier(boolean, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_nlz_evidence_dossier(boolean, uuid) TO authenticated;

COMMIT;
