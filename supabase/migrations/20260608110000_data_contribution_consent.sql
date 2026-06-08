-- Data contribution consent for App Store-ready pilot reporting
-- Adds explicit, revocable consent fields and ensures presentation/study exports
-- only count athletes who opted into anonymized or aggregate contribution.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS data_contribution_consent boolean,
  ADD COLUMN IF NOT EXISTS data_contribution_consent_version text,
  ADD COLUMN IF NOT EXISTS data_contribution_consented_at timestamptz,
  ADD COLUMN IF NOT EXISTS data_contribution_updated_at timestamptz;

COMMENT ON COLUMN public.profiles.data_contribution_consent IS
  'Optional user consent for anonymized or aggregate product improvement, pilot reporting, and presentation metrics. Null means no decision yet.';
COMMENT ON COLUMN public.profiles.data_contribution_consent_version IS
  'Version of the product copy shown when the user made the optional data contribution decision.';
COMMENT ON COLUMN public.profiles.data_contribution_consented_at IS
  'Timestamp when the user last explicitly opted into optional data contribution. Null when declined or not decided.';
COMMENT ON COLUMN public.profiles.data_contribution_updated_at IS
  'Timestamp when the optional data contribution decision was last changed.';

-- Tracking / Presentation Metrics: athlete-only activity counts
-- Privacy goal: presentation-ready aggregate data without raw journals,
-- free-text reflections, individual check-in history, or individual scores.
--
-- Data-quality goal: presentation metrics count program activity from athletes
-- only. Admin/coach QA clicks must not appear as production adherence.

DROP POLICY IF EXISTS "Coaches can view team daily_journals" ON public.daily_journals;

CREATE OR REPLACE FUNCTION public.get_admin_presentation_metrics(include_test boolean DEFAULT false)
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

  WITH eligible_users AS (
    SELECT p.id, COALESCE(p.is_test_user, false) AS is_test_user
    FROM public.profiles p
    WHERE COALESCE(p.data_contribution_consent, false) = true
      AND (include_test OR NOT COALESCE(p.is_test_user, false))
  ),
  eligible_athletes AS (
    SELECT eu.id
    FROM eligible_users eu
    JOIN public.user_roles ur ON ur.user_id = eu.id AND ur.role = 'athlete'
  ),
  eligible_teams AS (
    SELECT t.id, t.name, t.sport, t.created_by, t.program_start_date, COALESCE(t.is_test_team, false) AS is_test_team
    FROM public.teams t
    WHERE (include_test OR NOT COALESCE(t.is_test_team, false))
      AND NOT COALESCE(t.is_archived, false)
  ),
  team_athletes AS (
    SELECT et.id AS team_id, tm.user_id
    FROM eligible_teams et
    JOIN public.team_members tm ON tm.team_id = et.id
    JOIN eligible_athletes ea ON ea.id = tm.user_id
  ),
  latest_snapshots AS (
    SELECT DISTINCT ON (pps.user_id)
      pps.user_id,
      pps.team_id,
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
    JOIN eligible_athletes ea ON ea.id = pps.user_id
    ORDER BY pps.user_id, pps.date DESC
  ),
  team_snapshot_rollup AS (
    SELECT
      ta.team_id,
      ROUND(AVG(ls.completion_rate)::numeric, 4) AS avg_completion_rate,
      ROUND(AVG(ls.days_completed)::numeric, 2) AS avg_days_completed,
      ROUND(AVG(ls.days_available)::numeric, 2) AS avg_days_available,
      ROUND(AVG(ls.current_streak)::numeric, 2) AS avg_current_streak,
      ROUND(AVG(ls.comprehension_average)::numeric, 4) AS avg_comprehension
    FROM team_athletes ta
    LEFT JOIN latest_snapshots ls ON ls.user_id = ta.user_id
    GROUP BY ta.team_id
  ),
  team_instance_counts AS (
    SELECT ta.team_id, COUNT(DISTINCT pi.id)::int AS program_instances
    FROM team_athletes ta
    LEFT JOIN public.program_instances pi ON pi.team_id = ta.team_id AND pi.user_id = ta.user_id
    GROUP BY ta.team_id
  ),
  team_activity_counts AS (
    SELECT
      ta.team_id,
      COUNT(DISTINCT dc.id)::int AS checkins,
      COUNT(DISTINCT udc.id)::int AS completed_days,
      COUNT(DISTINCT cci.id)::int AS comprehension_checks,
      COUNT(DISTINCT dj.id)::int AS journal_entries
    FROM team_athletes ta
    LEFT JOIN public.daily_checkins dc ON dc.user_id = ta.user_id
    LEFT JOIN public.user_day_completion udc ON udc.user_id = ta.user_id AND udc.completion_status = 'completed'
    LEFT JOIN public.comprehension_check_instances cci ON cci.user_id = ta.user_id AND cci.status = 'completed'
    LEFT JOIN public.daily_journals dj ON dj.user_id = ta.user_id
    GROUP BY ta.team_id
  ),
  team_assessment_counts AS (
    SELECT
      ta.team_id,
      (COUNT(DISTINCT a.user_id) FILTER (WHERE a.timing = 'pre'))::int AS pre_n,
      (COUNT(DISTINCT a.user_id) FILTER (WHERE a.timing = 'mid'))::int AS mid_n,
      (COUNT(DISTINCT a.user_id) FILTER (WHERE a.timing = 'post'))::int AS post_n
    FROM team_athletes ta
    LEFT JOIN public.assessments a ON a.user_id = ta.user_id
    GROUP BY ta.team_id
  ),
  team_rollup AS (
    SELECT
      et.id,
      et.name,
      et.sport,
      et.program_start_date,
      p.full_name AS coach_name,
      COUNT(DISTINCT ta.user_id)::int AS athlete_count,
      COALESCE(tic.program_instances, 0) AS program_instances,
      COALESCE(tac.checkins, 0) AS checkins,
      COALESCE(tac.completed_days, 0) AS completed_days,
      COALESCE(tac.comprehension_checks, 0) AS comprehension_checks,
      COALESCE(tac.journal_entries, 0) AS journal_entries,
      tsr.avg_completion_rate,
      tsr.avg_days_completed,
      tsr.avg_days_available,
      tsr.avg_current_streak,
      tsr.avg_comprehension,
      COALESCE(tas.pre_n, 0) AS pre_n,
      COALESCE(tas.mid_n, 0) AS mid_n,
      COALESCE(tas.post_n, 0) AS post_n
    FROM eligible_teams et
    LEFT JOIN public.profiles p ON p.id = et.created_by
    LEFT JOIN team_athletes ta ON ta.team_id = et.id
    LEFT JOIN team_snapshot_rollup tsr ON tsr.team_id = et.id
    LEFT JOIN team_instance_counts tic ON tic.team_id = et.id
    LEFT JOIN team_activity_counts tac ON tac.team_id = et.id
    LEFT JOIN team_assessment_counts tas ON tas.team_id = et.id
    GROUP BY
      et.id, et.name, et.sport, et.program_start_date, p.full_name,
      tic.program_instances, tac.checkins, tac.completed_days, tac.comprehension_checks,
      tac.journal_entries, tsr.avg_completion_rate, tsr.avg_days_completed,
      tsr.avg_days_available, tsr.avg_current_streak, tsr.avg_comprehension,
      tas.pre_n, tas.mid_n, tas.post_n
  ),
  global_activity AS (
    SELECT
      (SELECT COUNT(*) FROM eligible_users)::int AS users_total,
      (SELECT COUNT(*) FROM eligible_athletes)::int AS athletes_total,
      (SELECT COUNT(*) FROM public.user_roles ur JOIN eligible_users eu ON eu.id = ur.user_id WHERE ur.role = 'coach')::int AS coaches_total,
      (SELECT COUNT(*) FROM eligible_teams)::int AS teams_total,
      (SELECT COUNT(*) FROM public.program_instances pi JOIN eligible_athletes ea ON ea.id = pi.user_id)::int AS program_instances_total,
      (SELECT COUNT(*) FROM public.user_day_completion udc JOIN eligible_athletes ea ON ea.id = udc.user_id WHERE udc.completion_status = 'completed')::int AS completed_days_total,
      (SELECT COUNT(*) FROM public.daily_checkins dc JOIN eligible_athletes ea ON ea.id = dc.user_id)::int AS checkins_total,
      (SELECT COUNT(*) FROM public.comprehension_check_instances cci JOIN eligible_athletes ea ON ea.id = cci.user_id WHERE cci.status = 'completed')::int AS comprehension_total,
      (SELECT COUNT(*) FROM public.daily_journals dj JOIN eligible_athletes ea ON ea.id = dj.user_id)::int AS journals_total,
      (SELECT COUNT(DISTINCT user_id) FROM (
        SELECT udc.user_id FROM public.user_day_completion udc JOIN eligible_athletes ea ON ea.id = udc.user_id WHERE udc.completed_at >= now() - interval '7 days'
        UNION
        SELECT dc.user_id FROM public.daily_checkins dc JOIN eligible_athletes ea ON ea.id = dc.user_id WHERE dc.created_at >= now() - interval '7 days'
      ) active)::int AS active_users_7d
  )
  SELECT json_build_object(
    'generated_at', now(),
    'include_test', include_test,
    'privacy_level', 'consented_aggregate_or_anonymized_only',
    'consent_scope', 'only profiles with data_contribution_consent = true are included',
    'claim_boundary', 'internal program evaluation; no diagnosis, no medical claim, no causal claim without control group',
    'summary', json_build_object(
      'users_total', ga.users_total,
      'athletes_total', ga.athletes_total,
      'coaches_total', ga.coaches_total,
      'teams_total', ga.teams_total,
      'program_instances_total', ga.program_instances_total
    ),
    'activity', json_build_object(
      'completed_days_total', ga.completed_days_total,
      'checkins_total', ga.checkins_total,
      'comprehension_checks_total', ga.comprehension_total,
      'journal_entries_total', ga.journals_total,
      'active_users_7d', ga.active_users_7d,
      'avg_completion_rate', (SELECT ROUND(AVG(completion_rate)::numeric, 4) FROM latest_snapshots),
      'avg_days_completed', (SELECT ROUND(AVG(days_completed)::numeric, 2) FROM latest_snapshots),
      'avg_days_available', (SELECT ROUND(AVG(days_available)::numeric, 2) FROM latest_snapshots),
      'avg_current_streak', (SELECT ROUND(AVG(current_streak)::numeric, 2) FROM latest_snapshots),
      'avg_comprehension', (SELECT ROUND(AVG(comprehension_average)::numeric, 4) FROM latest_snapshots)
    ),
    'evidence_readiness', json_build_object(
      'teams_with_min_5_athletes', (SELECT COUNT(*) FROM team_rollup WHERE athlete_count >= 5),
      'teams_with_pre_n_5', (SELECT COUNT(*) FROM team_rollup WHERE pre_n >= 5),
      'teams_with_mid_n_5', (SELECT COUNT(*) FROM team_rollup WHERE mid_n >= 5),
      'teams_with_pre_post_n_5', (SELECT COUNT(*) FROM team_rollup WHERE pre_n >= 5 AND post_n >= 5),
      'teams_below_min_n', (SELECT COUNT(*) FROM team_rollup WHERE athlete_count < 5)
    ),
    'presentation_kpis', json_build_array(
      json_build_object('label', 'Aktive Athleten', 'value', ga.athletes_total, 'type', 'count'),
      json_build_object('label', 'Abgeschlossene Programmtage', 'value', ga.completed_days_total, 'type', 'count'),
      json_build_object('label', 'Check-ins', 'value', ga.checkins_total, 'type', 'count'),
      json_build_object('label', 'Verständnis-Checks', 'value', ga.comprehension_total, 'type', 'count'),
      json_build_object('label', 'Ø Completion-Rate', 'value', (SELECT ROUND(AVG(completion_rate)::numeric, 4) FROM latest_snapshots), 'type', 'rate'),
      json_build_object('label', 'Teams mit Evidence-Basis', 'value', (SELECT COUNT(*) FROM team_rollup WHERE athlete_count >= 5), 'type', 'count')
    ),
    'team_summaries', COALESCE((
      SELECT json_agg(json_build_object(
        'team', name,
        'sport', sport,
        'coach', coach_name,
        'program_start_date', program_start_date,
        'athlete_count', athlete_count,
        'program_instances', program_instances,
        'completed_days', completed_days,
        'checkins', checkins,
        'comprehension_checks', comprehension_checks,
        'journal_entries_count_only', journal_entries,
        'avg_completion_rate', avg_completion_rate,
        'avg_days_completed', avg_days_completed,
        'avg_days_available', avg_days_available,
        'avg_current_streak', avg_current_streak,
        'avg_comprehension', avg_comprehension,
        'pre_n', pre_n,
        'mid_n', mid_n,
        'post_n', post_n,
        'evidence_status', CASE
          WHEN pre_n >= 5 AND post_n >= 5 THEN 'pre_post_ready'
          WHEN mid_n >= 5 THEN 'mid_ready'
          WHEN pre_n >= 5 THEN 'pre_ready'
          WHEN pre_n > 0 THEN 'pre_partial'
          ELSE 'not_enough_data'
        END
      ) ORDER BY name)
      FROM team_rollup
    ), '[]'::json),
    'export_catalog', json_build_array(
      'teams_summary.csv',
      'adherence.csv',
      'program_progress.csv',
      'checkin_activity.csv',
      'comprehension_summary.csv',
      'evidence_aggregate.csv',
      'system_health.csv',
      'presentation_metrics.json'
    ),
    'privacy_exclusions', json_build_array(
      'journal_text',
      'free_reflection',
      'individual_checkin_history',
      'individual_assessment_answers',
      'individual_questionnaire_scores'
    )
  ) INTO result
  FROM global_activity ga;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_presentation_metrics(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_presentation_metrics(boolean) TO authenticated;


CREATE OR REPLACE FUNCTION public.get_admin_study_overview(include_test boolean DEFAULT false)
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

  WITH eligible_users AS (
    SELECT p.id, COALESCE(p.is_test_user, false) AS is_test_user
    FROM public.profiles p
    WHERE COALESCE(p.data_contribution_consent, false) = true
      AND (include_test OR NOT COALESCE(p.is_test_user, false))
  ),
  eligible_athletes AS (
    SELECT eu.id
    FROM eligible_users eu
    JOIN public.user_roles ur ON ur.user_id = eu.id AND ur.role = 'athlete'
  ),
  eligible_teams AS (
    SELECT t.id, t.name, t.sport, t.created_by, t.program_start_date, COALESCE(t.is_test_team, false) AS is_test_team
    FROM public.teams t
    WHERE (include_test OR NOT COALESCE(t.is_test_team, false))
      AND NOT COALESCE(t.is_archived, false)
  ),
  team_athletes AS (
    SELECT et.id AS team_id, et.name, et.sport, et.program_start_date, tm.user_id
    FROM eligible_teams et
    JOIN public.team_members tm ON tm.team_id = et.id
    JOIN eligible_athletes ea ON ea.id = tm.user_id
  ),
  latest_snapshots AS (
    SELECT DISTINCT ON (pps.user_id)
      pps.user_id,
      pps.team_id,
      pps.days_completed,
      pps.days_available,
      pps.completion_rate,
      pps.current_streak,
      pps.longest_streak,
      pps.comprehension_average,
      pps.checkins_completed_count,
      pps.journals_completed_count,
      pps.tasks_completed_count,
      pps.date
    FROM public.program_progress_snapshots pps
    JOIN eligible_athletes ea ON ea.id = pps.user_id
    ORDER BY pps.user_id, pps.date DESC
  ),
  activity AS (
    SELECT
      (SELECT COUNT(*) FROM eligible_athletes)::int AS athletes_total,
      (SELECT COUNT(*) FROM eligible_teams)::int AS teams_total,
      (SELECT COUNT(DISTINCT pi.user_id) FROM public.program_instances pi JOIN eligible_athletes ea ON ea.id = pi.user_id)::int AS activated_athletes,
      (SELECT COUNT(DISTINCT udc.user_id) FROM public.user_day_completion udc JOIN eligible_athletes ea ON ea.id = udc.user_id WHERE udc.completion_status = 'completed' AND udc.day_number = 1)::int AS day_1_completed,
      (SELECT COUNT(DISTINCT udc.user_id) FROM public.user_day_completion udc JOIN eligible_athletes ea ON ea.id = udc.user_id WHERE udc.completion_status = 'completed' AND udc.day_number = 56)::int AS day_56_completed,
      (SELECT COUNT(*) FROM public.user_day_completion udc JOIN eligible_athletes ea ON ea.id = udc.user_id WHERE udc.completion_status = 'completed')::int AS completed_days_total,
      (SELECT COUNT(*) FROM public.daily_checkins dc JOIN eligible_athletes ea ON ea.id = dc.user_id)::int AS checkins_total,
      (SELECT COUNT(*) FROM public.comprehension_check_instances cci JOIN eligible_athletes ea ON ea.id = cci.user_id WHERE cci.status = 'completed')::int AS comprehension_checks_total,
      (SELECT COUNT(*) FROM public.daily_journals dj JOIN eligible_athletes ea ON ea.id = dj.user_id)::int AS journal_entries_count_only,
      (SELECT COUNT(DISTINCT user_id) FROM (
        SELECT udc.user_id FROM public.user_day_completion udc JOIN eligible_athletes ea ON ea.id = udc.user_id WHERE udc.completed_at >= now() - interval '7 days'
        UNION
        SELECT dc.user_id FROM public.daily_checkins dc JOIN eligible_athletes ea ON ea.id = dc.user_id WHERE dc.created_at >= now() - interval '7 days'
      ) active_7)::int AS active_7d,
      (SELECT COUNT(DISTINCT user_id) FROM (
        SELECT udc.user_id FROM public.user_day_completion udc JOIN eligible_athletes ea ON ea.id = udc.user_id WHERE udc.completed_at >= now() - interval '28 days'
        UNION
        SELECT dc.user_id FROM public.daily_checkins dc JOIN eligible_athletes ea ON ea.id = dc.user_id WHERE dc.created_at >= now() - interval '28 days'
      ) active_28)::int AS active_28d
  ),
  assessment_counts AS (
    SELECT
      (COUNT(DISTINCT a.user_id) FILTER (WHERE a.timing = 'pre'))::int AS pre_n,
      (COUNT(DISTINCT a.user_id) FILTER (WHERE a.timing = 'mid'))::int AS mid_n,
      (COUNT(DISTINCT a.user_id) FILTER (WHERE a.timing = 'post'))::int AS post_n
    FROM eligible_athletes ea
    LEFT JOIN public.assessments a ON a.user_id = ea.id
  ),
  development_counts AS (
    SELECT
      (COUNT(DISTINCT qr.user_id) FILTER (WHERE qr.timing = 'pre'))::int AS pre_n,
      (COUNT(DISTINCT qr.user_id) FILTER (WHERE qr.timing = 'mid'))::int AS mid_n,
      (COUNT(DISTINCT qr.user_id) FILTER (WHERE qr.timing = 'post'))::int AS post_n
    FROM eligible_athletes ea
    LEFT JOIN public.questionnaire_responses qr
      ON qr.user_id = ea.id
      AND qr.is_complete = true
      AND qr.instrument_id = 'rewire_development_index'
  ),
  team_rollup AS (
    SELECT
      ta.team_id,
      ta.name,
      ta.sport,
      ta.program_start_date,
      COUNT(DISTINCT ta.user_id)::int AS athlete_count,
      COUNT(DISTINCT pi.id)::int AS program_instances,
      COUNT(DISTINCT udc.id) FILTER (WHERE udc.completion_status = 'completed')::int AS completed_days,
      COUNT(DISTINCT dc.id)::int AS checkins,
      COUNT(DISTINCT cci.id) FILTER (WHERE cci.status = 'completed')::int AS comprehension_checks,
      COUNT(DISTINCT dj.id)::int AS journal_entries_count_only,
      ROUND(AVG(ls.completion_rate)::numeric, 4) AS avg_completion_rate,
      ROUND(AVG(ls.days_completed)::numeric, 2) AS avg_days_completed,
      ROUND(AVG(ls.comprehension_average)::numeric, 4) AS avg_comprehension,
      (COUNT(DISTINCT a.user_id) FILTER (WHERE a.timing = 'pre'))::int AS pre_n,
      (COUNT(DISTINCT a.user_id) FILTER (WHERE a.timing = 'mid'))::int AS mid_n,
      (COUNT(DISTINCT a.user_id) FILTER (WHERE a.timing = 'post'))::int AS post_n
    FROM team_athletes ta
    LEFT JOIN public.program_instances pi ON pi.team_id = ta.team_id AND pi.user_id = ta.user_id
    LEFT JOIN public.user_day_completion udc ON udc.user_id = ta.user_id
    LEFT JOIN public.daily_checkins dc ON dc.user_id = ta.user_id
    LEFT JOIN public.comprehension_check_instances cci ON cci.user_id = ta.user_id
    LEFT JOIN public.daily_journals dj ON dj.user_id = ta.user_id
    LEFT JOIN latest_snapshots ls ON ls.user_id = ta.user_id
    LEFT JOIN public.assessments a ON a.user_id = ta.user_id
    GROUP BY ta.team_id, ta.name, ta.sport, ta.program_start_date
  ),
  missingness AS (
    SELECT
      (SELECT COUNT(*) FROM eligible_athletes ea WHERE NOT EXISTS (SELECT 1 FROM public.program_instances pi WHERE pi.user_id = ea.id))::int AS athletes_without_program_instance,
      (SELECT COUNT(*) FROM eligible_athletes ea WHERE NOT EXISTS (SELECT 1 FROM public.user_day_completion udc WHERE udc.user_id = ea.id AND udc.day_number = 1 AND udc.completion_status = 'completed'))::int AS athletes_without_day_1,
      (SELECT COUNT(*) FROM eligible_athletes ea WHERE NOT EXISTS (SELECT 1 FROM public.assessments a WHERE a.user_id = ea.id AND a.timing = 'pre'))::int AS athletes_without_pre_assessment,
      (SELECT COUNT(*) FROM eligible_athletes ea WHERE NOT EXISTS (
        SELECT 1 FROM public.user_day_completion udc WHERE udc.user_id = ea.id
        UNION
        SELECT 1 FROM public.daily_checkins dc WHERE dc.user_id = ea.id
      ))::int AS athletes_without_any_activity
  )
  SELECT json_build_object(
    'generated_at', now(),
    'include_test', include_test,
    'privacy_level', 'consented_cohort_or_team_aggregate_only',
    'consent_scope', 'only profiles with data_contribution_consent = true are included',
    'claim_boundary', 'interne Programmevaluation; beobachtete Entwicklung; keine Diagnose; keine medizinische Wirkung; keine Kausalaussage ohne Kontrollgruppe',
    'summary', json_build_object(
      'athletes_total', a.athletes_total,
      'teams_total', a.teams_total,
      'study_cohorts_total', (SELECT COUNT(*) FROM public.study_cohorts),
      'active_study_cohorts', (SELECT COUNT(*) FROM public.study_cohorts WHERE status = 'active'),
      'study_participants_total', (
        SELECT COUNT(*)
        FROM public.study_participants sp
        JOIN public.profiles p ON p.id = sp.user_id
        WHERE sp.included = true
          AND COALESCE(p.data_contribution_consent, false) = true
      ),
      'aggregate_visible', a.athletes_total >= 5,
      'low_confidence', a.athletes_total < 10
    ),
    'activation', json_build_object(
      'activated_athletes', a.activated_athletes,
      'activation_rate', CASE WHEN a.athletes_total > 0 THEN ROUND((a.activated_athletes::numeric / a.athletes_total), 4) ELSE NULL END,
      'day_1_completed', a.day_1_completed,
      'day_1_rate', CASE WHEN a.athletes_total > 0 THEN ROUND((a.day_1_completed::numeric / a.athletes_total), 4) ELSE NULL END,
      'active_7d', a.active_7d,
      'active_7d_rate', CASE WHEN a.athletes_total > 0 THEN ROUND((a.active_7d::numeric / a.athletes_total), 4) ELSE NULL END,
      'active_28d', a.active_28d,
      'active_28d_rate', CASE WHEN a.athletes_total > 0 THEN ROUND((a.active_28d::numeric / a.athletes_total), 4) ELSE NULL END,
      'day_56_completed', a.day_56_completed,
      'day_56_completion_rate', CASE WHEN a.athletes_total > 0 THEN ROUND((a.day_56_completed::numeric / a.athletes_total), 4) ELSE NULL END
    ),
    'activity', json_build_object(
      'completed_days_total', a.completed_days_total,
      'checkins_total', a.checkins_total,
      'comprehension_checks_total', a.comprehension_checks_total,
      'journal_entries_count_only', a.journal_entries_count_only,
      'avg_completed_days', (SELECT ROUND(AVG(days_completed)::numeric, 2) FROM latest_snapshots),
      'avg_completion_rate', (SELECT ROUND(AVG(completion_rate)::numeric, 4) FROM latest_snapshots),
      'avg_comprehension', (SELECT ROUND(AVG(comprehension_average)::numeric, 4) FROM latest_snapshots)
    ),
    'measurement_readiness', json_build_object(
      'validated_assessments_pre_n', ac.pre_n,
      'validated_assessments_mid_n', ac.mid_n,
      'validated_assessments_post_n', ac.post_n,
      'development_index_pre_n', dc.pre_n,
      'development_index_mid_n', dc.mid_n,
      'development_index_post_n', dc.post_n,
      'pre_ready', ac.pre_n >= 5 OR dc.pre_n >= 5,
      'mid_ready', ac.mid_n >= 5 OR dc.mid_n >= 5,
      'post_ready', ac.post_n >= 5 OR dc.post_n >= 5
    ),
    'data_quality', json_build_object(
      'athletes_without_program_instance', m.athletes_without_program_instance,
      'athletes_without_day_1', m.athletes_without_day_1,
      'athletes_without_pre_assessment', m.athletes_without_pre_assessment,
      'athletes_without_any_activity', m.athletes_without_any_activity,
      'low_confidence', a.athletes_total < 10,
      'min_sensitive_aggregate_n', 5,
      'sensitive_aggregate_allowed', a.athletes_total >= 5
    ),
    'cohort_summaries', COALESCE((
      SELECT json_agg(json_build_object(
        'id', sc.id,
        'name', sc.name,
        'cohort_type', sc.cohort_type,
        'status', sc.status,
        'organization', sc.organization,
        'sport', sc.sport,
        'start_date', sc.start_date,
        'end_date', sc.end_date,
        'include_test_data', sc.include_test_data,
        'participant_count', COALESCE(sp.participant_count, 0),
        'min_aggregate_n', sc.min_aggregate_n,
        'aggregate_visible', COALESCE(sp.participant_count, 0) >= sc.min_aggregate_n
      ) ORDER BY sc.created_at DESC)
      FROM public.study_cohorts sc
      LEFT JOIN (
        SELECT sp.cohort_id, COUNT(*)::int AS participant_count
        FROM public.study_participants sp
        JOIN public.profiles p ON p.id = sp.user_id
        WHERE sp.included = true
          AND COALESCE(p.data_contribution_consent, false) = true
        GROUP BY sp.cohort_id
      ) sp ON sp.cohort_id = sc.id
    ), '[]'::json),
    'team_summaries', COALESCE((
      SELECT json_agg(json_build_object(
        'team', name,
        'sport', sport,
        'program_start_date', program_start_date,
        'athlete_count', athlete_count,
        'aggregate_visible', athlete_count >= 5,
        'program_instances', program_instances,
        'completed_days', completed_days,
        'checkins', checkins,
        'comprehension_checks', comprehension_checks,
        'journal_entries_count_only', journal_entries_count_only,
        'avg_completion_rate', CASE WHEN athlete_count >= 5 THEN avg_completion_rate ELSE NULL END,
        'avg_days_completed', CASE WHEN athlete_count >= 5 THEN avg_days_completed ELSE NULL END,
        'avg_comprehension', CASE WHEN athlete_count >= 5 THEN avg_comprehension ELSE NULL END,
        'pre_n', pre_n,
        'mid_n', mid_n,
        'post_n', post_n,
        'low_confidence', athlete_count < 10
      ) ORDER BY name)
      FROM team_rollup
    ), '[]'::json),
    'measurement_windows', COALESCE((
      SELECT json_agg(json_build_object(
        'cohort_id', smw.cohort_id,
        'label', smw.label,
        'planned_start_date', smw.planned_start_date,
        'planned_end_date', smw.planned_end_date,
        'actual_completed_count', smw.actual_completed_count,
        'target_count', smw.target_count,
        'status', smw.status
      ) ORDER BY smw.planned_start_date NULLS LAST, smw.label)
      FROM public.study_measurement_windows smw
    ), '[]'::json),
    'export_catalog', json_build_array(
      'study_summary.json',
      'cohort_metrics.csv',
      'measurement_windows.csv',
      'data_quality.csv',
      'export_manifest.json'
    ),
    'privacy_exclusions', json_build_array(
      'journal_text',
      'free_reflection',
      'raw_individual_checkins',
      'raw_questionnaire_answers',
      'individual_psychological_scores',
      'player_identifying_development_labels'
    )
  ) INTO result
  FROM activity a
  CROSS JOIN assessment_counts ac
  CROSS JOIN development_counts dc
  CROSS JOIN missingness m;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_study_aggregate_snapshot(
  _cohort_id uuid DEFAULT NULL,
  include_test boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  overview json;
  snapshot_id uuid;
  manifest_id uuid;
  participants_count integer;
  active_count integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  overview := public.get_admin_study_overview(include_test);
  participants_count := COALESCE((overview #>> '{summary,athletes_total}')::integer, 0);
  active_count := COALESCE((overview #>> '{activation,active_7d}')::integer, 0);

  INSERT INTO public.study_aggregate_snapshots (
    cohort_id,
    generated_by,
    n_participants,
    n_active,
    metrics,
    data_quality
  )
  VALUES (
    _cohort_id,
    auth.uid(),
    participants_count,
    active_count,
    overview::jsonb,
    COALESCE((overview -> 'data_quality')::jsonb, '{}'::jsonb)
  )
  RETURNING id INTO snapshot_id;

  INSERT INTO public.study_export_manifests (
    cohort_id,
    snapshot_id,
    generated_by,
    metadata
  )
  VALUES (
    _cohort_id,
    snapshot_id,
    auth.uid(),
    jsonb_build_object(
      'overview_generated_at', overview ->> 'generated_at',
      'include_test', include_test,
      'privacy_level', overview ->> 'privacy_level',
      'consent_scope', overview ->> 'consent_scope'
    )
  )
  RETURNING id INTO manifest_id;

  RETURN json_build_object(
    'snapshot_id', snapshot_id,
    'manifest_id', manifest_id,
    'overview', overview
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_study_overview(boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_study_aggregate_snapshot(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_study_overview(boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_study_aggregate_snapshot(uuid, boolean) TO authenticated;


-- ============================================
-- 6. REWRITE compute_team_outcomes
-- ============================================
DROP FUNCTION IF EXISTS public.compute_team_outcomes(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.compute_team_outcomes(
  team_id_param UUID,
  min_n INTEGER DEFAULT 5
)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  team_owner UUID;
  athlete_ids UUID[];
  instance_ids UUID[];
  total_athletes INT;
  pre_n INT; mid_n INT; post_n INT;
  only_pre INT; pre_and_mid_no_post INT; completed_pre_post INT; never_started INT;
  adherence JSON;
  comprehension_agg JSON;
  weekly_trend JSON;
  subscale_changes JSON;
  result JSON;
BEGIN
  -- Authorize: only team creator
  SELECT created_by INTO team_owner FROM public.teams WHERE id = team_id_param;
  IF team_owner IS NULL OR team_owner != auth.uid() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Athletes in this team (role=athlete) who explicitly opted into optional
  -- anonymized/aggregate contribution for effectiveness reporting.
  SELECT array_agg(tm.user_id) INTO athlete_ids
  FROM public.team_members tm
  JOIN public.user_roles ur ON ur.user_id = tm.user_id AND ur.role = 'athlete'
  JOIN public.profiles p ON p.id = tm.user_id
  WHERE tm.team_id = team_id_param
    AND COALESCE(p.data_contribution_consent, false) = true;
  athlete_ids := COALESCE(athlete_ids, ARRAY[]::UUID[]);
  total_athletes := COALESCE(array_length(athlete_ids, 1), 0);

  IF total_athletes = 0 THEN
    RETURN json_build_object(
      'sufficient_data', false, 'reason', 'no_consented_athletes',
      'total_athletes', 0, 'min_n', min_n,
      'consent_scope', 'only profiles with data_contribution_consent = true are included'
    );
  END IF;

  -- Program instances tied to this team for these athletes
  SELECT array_agg(id) INTO instance_ids
  FROM public.program_instances
  WHERE user_id = ANY(athlete_ids) AND team_id = team_id_param;
  instance_ids := COALESCE(instance_ids, ARRAY[]::UUID[]);

  -- Assessment counts (distinct athletes)
  SELECT COUNT(DISTINCT user_id)::int INTO pre_n
  FROM public.assessments
  WHERE program_instance_id = ANY(instance_ids) AND timing = 'pre';

  SELECT COUNT(DISTINCT user_id)::int INTO mid_n
  FROM public.assessments
  WHERE program_instance_id = ANY(instance_ids) AND timing = 'mid';

  SELECT COUNT(DISTINCT user_id)::int INTO post_n
  FROM public.assessments
  WHERE program_instance_id = ANY(instance_ids) AND timing = 'post';

  -- Cohort breakdown
  WITH per_user AS (
    SELECT
      u AS user_id,
      EXISTS (SELECT 1 FROM public.assessments a WHERE a.user_id = u AND a.program_instance_id = ANY(instance_ids) AND a.timing = 'pre') AS has_pre,
      EXISTS (SELECT 1 FROM public.assessments a WHERE a.user_id = u AND a.program_instance_id = ANY(instance_ids) AND a.timing = 'mid') AS has_mid,
      EXISTS (SELECT 1 FROM public.assessments a WHERE a.user_id = u AND a.program_instance_id = ANY(instance_ids) AND a.timing = 'post') AS has_post
    FROM unnest(athlete_ids) AS u
  )
  SELECT
    COUNT(*) FILTER (WHERE NOT has_pre AND NOT has_mid AND NOT has_post)::int,
    COUNT(*) FILTER (WHERE has_pre AND NOT has_mid AND NOT has_post)::int,
    COUNT(*) FILTER (WHERE has_pre AND has_mid AND NOT has_post)::int,
    COUNT(*) FILTER (WHERE has_pre AND has_post)::int
  INTO never_started, only_pre, pre_and_mid_no_post, completed_pre_post
  FROM per_user;

  -- Adherence: latest snapshot per athlete within these instances
  WITH latest_snap AS (
    SELECT DISTINCT ON (user_id)
      user_id, days_available, days_completed, completion_rate,
      comprehension_average, current_streak, longest_streak
    FROM public.program_progress_snapshots
    WHERE program_instance_id = ANY(instance_ids)
    ORDER BY user_id, date DESC
  )
  SELECT json_build_object(
    'players_with_progress', COUNT(*)::int,
    'avg_completion_rate', ROUND(AVG(completion_rate)::numeric, 4),
    'avg_days_completed', ROUND(AVG(days_completed)::numeric, 2),
    'avg_days_available', ROUND(AVG(days_available)::numeric, 2),
    'avg_streak', ROUND(AVG(current_streak)::numeric, 2),
    'avg_comprehension', ROUND(AVG(comprehension_average)::numeric, 4)
  ) INTO adherence
  FROM latest_snap;

  -- Weekly mood/energy/focus trend (only buckets with >= min_n)
  WITH weekly AS (
    SELECT
      date_trunc('week', date::timestamp)::date AS week_start,
      COUNT(DISTINCT user_id)::int AS n_users,
      ROUND(AVG(mood_before)::numeric, 2) AS avg_mood,
      ROUND(AVG(energy_level)::numeric, 2) AS avg_energy,
      ROUND(AVG(focus_rating)::numeric, 2) AS avg_focus
    FROM public.daily_checkins
    WHERE program_instance_id = ANY(instance_ids)
    GROUP BY date_trunc('week', date::timestamp)
  )
  SELECT COALESCE(json_agg(
    json_build_object(
      'week_start', week_start, 'n_users', n_users,
      'avg_mood',   CASE WHEN n_users >= min_n THEN avg_mood   ELSE NULL END,
      'avg_energy', CASE WHEN n_users >= min_n THEN avg_energy ELSE NULL END,
      'avg_focus',  CASE WHEN n_users >= min_n THEN avg_focus  ELSE NULL END,
      'sufficient_data', n_users >= min_n
    ) ORDER BY week_start
  ), '[]'::json) INTO weekly_trend
  FROM weekly;

  -- Comprehension aggregate
  SELECT json_build_object(
    'avg_correct_rate',
      ROUND(AVG(CASE WHEN total_count > 0 THEN correct_count::numeric / total_count ELSE NULL END)::numeric, 4),
    'total_completed', COUNT(*)::int,
    'distinct_users', COUNT(DISTINCT user_id)::int
  ) INTO comprehension_agg
  FROM public.comprehension_check_instances
  WHERE program_instance_id = ANY(instance_ids) AND status = 'completed';

  -- Subscale-level paired changes (Pre→Post and Pre→Mid)
  -- Unpivot scores jsonb into (user_id, instance_id, assessment_type, subscale, timing, score)
  WITH unpivoted AS (
    SELECT
      a.user_id,
      a.program_instance_id,
      a.assessment_type,
      a.timing,
      kv.key   AS subscale,
      (kv.value)::numeric AS score
    FROM public.assessments a
    CROSS JOIN LATERAL jsonb_each_text(a.scores) AS kv(key, value)
    WHERE a.program_instance_id = ANY(instance_ids)
      AND a.scores IS NOT NULL
      AND kv.value ~ '^-?[0-9]+(\.[0-9]+)?$'
  ),
  per_user_avg AS (
    SELECT user_id, assessment_type, subscale, timing, AVG(score) AS score
    FROM unpivoted
    GROUP BY user_id, assessment_type, subscale, timing
  ),
  pp_pairs AS (
    SELECT a.assessment_type, a.subscale, a.user_id,
           a.score AS pre_score, b.score AS post_score,
           (b.score - a.score) AS diff
    FROM per_user_avg a
    JOIN per_user_avg b
      ON a.user_id = b.user_id
     AND a.assessment_type = b.assessment_type
     AND a.subscale = b.subscale
    WHERE a.timing = 'pre' AND b.timing = 'post'
  ),
  pm_pairs AS (
    SELECT a.assessment_type, a.subscale, a.user_id,
           a.score AS pre_score, m.score AS mid_score,
           (m.score - a.score) AS diff
    FROM per_user_avg a
    JOIN per_user_avg m
      ON a.user_id = m.user_id
     AND a.assessment_type = m.assessment_type
     AND a.subscale = m.subscale
    WHERE a.timing = 'pre' AND m.timing = 'mid'
  ),
  pp_summary AS (
    SELECT
      assessment_type, subscale,
      COUNT(*)::int AS n_pairs,
      ROUND(AVG(pre_score)::numeric, 2)  AS avg_pre,
      ROUND(AVG(post_score)::numeric, 2) AS avg_post,
      ROUND((AVG(post_score) - AVG(pre_score))::numeric, 2) AS abs_change,
      CASE WHEN ABS(AVG(pre_score)) > 0.5
        THEN ROUND((((AVG(post_score) - AVG(pre_score)) / NULLIF(AVG(pre_score),0)) * 100)::numeric, 1)
        ELSE NULL END AS pct_change,
      CASE
        WHEN COUNT(*) >= min_n AND STDDEV_SAMP(diff) > 0
        THEN ROUND((AVG(diff) / NULLIF(STDDEV_SAMP(diff),0))::numeric, 3)
        ELSE NULL END AS cohens_d_z,
      (COUNT(*) >= min_n) AS sufficient_data,
      (COUNT(*) < 10)     AS low_confidence
    FROM pp_pairs
    GROUP BY assessment_type, subscale
  ),
  pm_summary AS (
    SELECT
      assessment_type, subscale,
      COUNT(*)::int AS n_pairs,
      ROUND(AVG(pre_score)::numeric, 2) AS avg_pre,
      ROUND(AVG(mid_score)::numeric, 2) AS avg_mid,
      ROUND((AVG(mid_score) - AVG(pre_score))::numeric, 2) AS abs_change,
      CASE WHEN ABS(AVG(pre_score)) > 0.5
        THEN ROUND((((AVG(mid_score) - AVG(pre_score)) / NULLIF(AVG(pre_score),0)) * 100)::numeric, 1)
        ELSE NULL END AS pct_change,
      (COUNT(*) >= min_n) AS sufficient_data,
      (COUNT(*) < 10)     AS low_confidence
    FROM pm_pairs
    GROUP BY assessment_type, subscale
  )
  SELECT json_build_object(
    'pre_post', COALESCE((SELECT json_agg(row_to_json(pp_summary) ORDER BY assessment_type, subscale) FROM pp_summary), '[]'::json),
    'pre_mid',  COALESCE((SELECT json_agg(row_to_json(pm_summary) ORDER BY assessment_type, subscale) FROM pm_summary), '[]'::json)
  ) INTO subscale_changes;

  result := json_build_object(
    'team_id', team_id_param,
    'min_n', min_n,
    'total_athletes', total_athletes,
    'sufficient_data', total_athletes >= min_n,
    'consent_scope', 'only profiles with data_contribution_consent = true are included',
    'cohort_breakdown', json_build_object(
      'never_started', never_started,
      'only_pre', only_pre,
      'pre_and_mid_no_post', pre_and_mid_no_post,
      'completed_pre_post', completed_pre_post
    ),
    'assessment_completion', json_build_object(
      'pre_n', pre_n, 'mid_n', mid_n, 'post_n', post_n
    ),
    'adherence', adherence,
    'changes', subscale_changes,
    'comprehension', comprehension_agg,
    'weekly_trend', weekly_trend,
    'disclaimer', 'Hinweis: Veränderungen sind beobachtet, nicht kausal. Ohne Kontrollgruppe keine Wirksamkeitsaussage.'
  );

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.compute_team_outcomes(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.compute_team_outcomes(UUID, INTEGER) TO authenticated;
