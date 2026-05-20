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
    WHERE include_test OR NOT COALESCE(p.is_test_user, false)
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
    'privacy_level', 'aggregate_or_anonymized_only',
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
