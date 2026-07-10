-- Run-scoped NLZ pilot readiness and consent-aware evidence V2.
-- Sensitive aggregates are suppressed in SQL when fewer than five distinct
-- athletes contribute. n < 10 is explicitly marked low confidence.

BEGIN;

ALTER TABLE public.study_evidence_snapshots
  ADD COLUMN IF NOT EXISTS program_run_id uuid REFERENCES public.program_runs(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_study_evidence_snapshots_program_run
  ON public.study_evidence_snapshots(program_run_id, generated_at DESC)
  WHERE program_run_id IS NOT NULL;

ALTER TABLE public.study_evidence_snapshots
  DROP CONSTRAINT IF EXISTS study_evidence_snapshots_scope_type_check;
ALTER TABLE public.study_evidence_snapshots
  ADD CONSTRAINT study_evidence_snapshots_scope_type_check
  CHECK (scope_type IN ('project', 'cohort', 'team', 'program_run'));

CREATE OR REPLACE FUNCTION public.get_nlz_pilot_readiness(
  _team_id uuid DEFAULT NULL,
  _program_run_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_team_id uuid := _team_id;
  target_run public.program_runs;
  result json;
BEGIN
  IF _program_run_id IS NOT NULL THEN
    SELECT * INTO target_run
    FROM public.program_runs
    WHERE id = _program_run_id;
    IF target_run.id IS NULL THEN
      RAISE EXCEPTION 'program_run_not_found';
    END IF;
    IF target_team_id IS NOT NULL AND target_team_id <> target_run.team_id THEN
      RAISE EXCEPTION 'team_and_program_run_mismatch';
    END IF;
    target_team_id := target_run.team_id;
  ELSIF target_team_id IS NOT NULL THEN
    SELECT * INTO target_run
    FROM public.program_runs
    WHERE team_id = target_team_id AND status = 'active'
    ORDER BY started_at DESC, created_at DESC
    LIMIT 1;
  ELSE
    RAISE EXCEPTION 'team_or_program_run_required';
  END IF;

  IF NOT public.can_manage_team_program_runs(target_team_id) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  WITH athletes AS (
    SELECT DISTINCT tm.user_id, p.full_name,
      p.data_contribution_consent,
      COALESCE(p.is_test_user, false) AS is_test_user
    FROM public.team_members tm
    JOIN public.user_roles ur
      ON ur.user_id = tm.user_id AND ur.role = 'athlete'
    JOIN public.profiles p ON p.id = tm.user_id
    WHERE tm.team_id = target_team_id
  ), run_instances AS (
    SELECT pi.*
    FROM public.program_instances pi
    JOIN athletes a ON a.user_id = pi.user_id
    WHERE target_run.id IS NOT NULL AND pi.program_run_id = target_run.id
  ), completed_validated_pre AS (
    SELECT a.user_id
    FROM public.assessments a
    JOIN run_instances ri ON ri.id = a.program_instance_id AND ri.user_id = a.user_id
    WHERE a.timing = 'pre'
      AND a.assessment_type IN ('csai2r', 'smtq', 'flow_short')
    GROUP BY a.user_id
    HAVING COUNT(DISTINCT a.assessment_type) = 3
  ), development_pre AS (
    SELECT DISTINCT dpa.user_id
    FROM public.deep_profile_assessments dpa
    JOIN run_instances ri ON ri.id = dpa.program_instance_id AND ri.user_id = dpa.user_id
    WHERE dpa.instrument_id = 'rewire_development_index'
      AND dpa.timing = 'pre'
    UNION
    SELECT DISTINCT qr.user_id
    FROM public.questionnaire_responses qr
    JOIN run_instances ri ON ri.id = qr.program_instance_id AND ri.user_id = qr.user_id
    WHERE qr.instrument_id = 'rewire_development_index'
      AND qr.timing = 'pre'
      AND qr.is_complete = true
  ), latest_snapshots AS (
    SELECT DISTINCT ON (pps.user_id)
      pps.user_id, pps.days_completed, pps.days_available, pps.completion_rate,
      pps.current_streak, pps.comprehension_average, pps.date
    FROM public.program_progress_snapshots pps
    JOIN run_instances ri ON ri.id = pps.program_instance_id
    ORDER BY pps.user_id, pps.date DESC
  ), integrity AS (
    SELECT
      (
        SELECT COUNT(*) FROM (
          SELECT dc.user_id, dc.program_instance_id, dc.date
          FROM public.daily_checkins dc
          JOIN run_instances ri ON ri.id = dc.program_instance_id
          GROUP BY dc.user_id, dc.program_instance_id, dc.date
          HAVING COUNT(*) > 1
        ) duplicates
      )::int AS duplicate_checkins,
      (
        SELECT COUNT(*) FROM public.daily_checkins dc
        JOIN athletes a ON a.user_id = dc.user_id
        WHERE dc.program_instance_id IS NULL
          AND target_run.started_at IS NOT NULL
          AND dc.date >= target_run.started_at
      )::int AS checkins_without_instance,
      (
        SELECT COUNT(*) FROM public.user_day_completion udc
        JOIN run_instances ri ON ri.id = udc.program_instance_id
        JOIN public.user_day_assignments uda ON uda.id = udc.assignment_id
        WHERE udc.completion_status = 'completed'
          AND NOT EXISTS (
            SELECT 1 FROM public.daily_checkins dc
            WHERE dc.user_id = udc.user_id
              AND dc.program_instance_id = udc.program_instance_id
              AND dc.date = uda.date
          )
      )::int AS completions_without_checkin,
      (
        SELECT COUNT(*) FROM public.user_day_completion udc
        JOIN athletes a ON a.user_id = udc.user_id
        WHERE udc.program_instance_id IS NULL
          AND udc.created_at::date >= COALESCE(target_run.started_at, CURRENT_DATE)
      )::int AS completions_without_instance,
      (
        SELECT COUNT(*) FROM public.assessments ass
        JOIN athletes a ON a.user_id = ass.user_id
        WHERE ass.program_instance_id IS NULL
          AND ass.created_at::date >= COALESCE(target_run.started_at, CURRENT_DATE)
      )::int AS assessments_without_instance,
      (
        SELECT COUNT(*) FROM public.questionnaire_responses qr
        JOIN athletes a ON a.user_id = qr.user_id
        WHERE qr.program_instance_id IS NULL
          AND qr.created_at::date >= COALESCE(target_run.started_at, CURRENT_DATE)
      )::int AS questionnaires_without_instance,
      (
        SELECT COUNT(*) FROM public.deep_profile_assessments dpa
        JOIN athletes a ON a.user_id = dpa.user_id
        WHERE dpa.program_instance_id IS NULL
          AND dpa.created_at::date >= COALESCE(target_run.started_at, CURRENT_DATE)
      )::int AS development_assessments_without_instance,
      (
        SELECT COUNT(*) FROM (
          SELECT pi.user_id
          FROM public.program_instances pi
          JOIN athletes a ON a.user_id = pi.user_id
          WHERE pi.status = 'active'
          GROUP BY pi.user_id
          HAVING COUNT(*) > 1
        ) multiple_active
      )::int AS multiple_active_instances,
      (
        SELECT COUNT(*) FROM athletes a
        WHERE a.is_test_user = true
          AND NOT COALESCE((SELECT is_test_team FROM public.teams WHERE id = target_team_id), false)
      )::int AS test_users_in_production
  ), counts AS (
    SELECT
      (SELECT COUNT(*) FROM athletes)::int AS athletes_total,
      (SELECT COUNT(*) FROM athletes WHERE data_contribution_consent = true)::int AS consent_true,
      (SELECT COUNT(*) FROM athletes WHERE data_contribution_consent = false)::int AS consent_false,
      (SELECT COUNT(*) FROM athletes WHERE data_contribution_consent IS NULL)::int AS consent_null,
      (SELECT COUNT(DISTINCT user_id) FROM run_instances)::int AS athletes_with_instance,
      (SELECT COUNT(*) FROM run_instances WHERE status = 'active')::int AS active_instances,
      (SELECT COUNT(*) FROM completed_validated_pre)::int AS validated_pre_complete,
      (SELECT COUNT(*) FROM development_pre)::int AS development_pre_complete,
      (SELECT COUNT(DISTINCT dc.user_id) FROM public.daily_checkins dc JOIN run_instances ri ON ri.id = dc.program_instance_id WHERE dc.date = CURRENT_DATE)::int AS checkins_today,
      (SELECT COUNT(DISTINCT dc.user_id) FROM public.daily_checkins dc JOIN run_instances ri ON ri.id = dc.program_instance_id WHERE dc.date >= CURRENT_DATE - 6)::int AS active_7d,
      (SELECT COUNT(DISTINCT udc.user_id) FROM public.user_day_completion udc JOIN run_instances ri ON ri.id = udc.program_instance_id WHERE udc.completion_status = 'completed' AND udc.day_number = 1)::int AS day_1_completed,
      COALESCE(ROUND((SELECT AVG(completion_rate) FROM latest_snapshots)::numeric, 4), 0) AS avg_completion_rate,
      COALESCE(ROUND((SELECT AVG(days_completed) FROM latest_snapshots)::numeric, 2), 0) AS avg_days_completed
  ), status_base AS (
    SELECT
      CASE
        WHEN target_run.id IS NULL OR target_run.status <> 'active' OR target_run.started_at IS NULL THEN 'RED'
        WHEN c.athletes_total = 0 THEN 'RED'
        WHEN c.athletes_with_instance <> c.athletes_total OR c.active_instances <> c.athletes_total THEN 'RED'
        WHEN i.duplicate_checkins > 0
          OR i.checkins_without_instance > 0
          OR i.completions_without_checkin > 0
          OR i.completions_without_instance > 0
          OR i.assessments_without_instance > 0
          OR i.questionnaires_without_instance > 0
          OR i.development_assessments_without_instance > 0
          OR i.multiple_active_instances > 0
          OR i.test_users_in_production > 0
        THEN 'RED'
        WHEN c.athletes_total < 5
          OR c.consent_true < c.athletes_total
          OR c.validated_pre_complete < c.athletes_total
          OR c.development_pre_complete < c.athletes_total
        THEN 'YELLOW'
        ELSE 'GREEN'
      END AS status
    FROM counts c CROSS JOIN integrity i
  ), messages AS (
    SELECT
      COALESCE((
        SELECT jsonb_agg(message) FROM (VALUES
          (CASE WHEN target_run.id IS NULL THEN 'Kein aktiver Program Run vorhanden.' END),
          (CASE WHEN target_run.id IS NOT NULL AND target_run.status <> 'active' THEN 'Der Program Run ist nicht aktiv.' END),
          (CASE WHEN target_run.id IS NOT NULL AND target_run.started_at IS NULL THEN 'Dem Program Run fehlt ein Startdatum.' END),
          (CASE WHEN c.athletes_total = 0 THEN 'Das Team enthält keine Athleten.' END),
          (CASE WHEN c.athletes_with_instance <> c.athletes_total THEN 'Nicht alle Athleten sind dem Program Run zugeordnet.' END),
          (CASE WHEN c.active_instances <> c.athletes_total THEN 'Nicht alle Run-Instanzen sind aktiv.' END),
          (CASE WHEN i.duplicate_checkins > 0 THEN 'Doppelte Check-ins wurden erkannt.' END),
          (CASE WHEN i.checkins_without_instance > 0 THEN 'Check-ins ohne Programminstanz wurden erkannt.' END),
          (CASE WHEN i.completions_without_checkin > 0 THEN 'Abgeschlossene Tage ohne Check-in wurden erkannt.' END),
          (CASE WHEN i.completions_without_instance > 0 THEN 'Completions ohne Programminstanz wurden erkannt.' END),
          (CASE WHEN i.assessments_without_instance > 0 THEN 'Assessments ohne Programminstanz wurden erkannt.' END),
          (CASE WHEN i.questionnaires_without_instance > 0 THEN 'Fragebögen ohne Programminstanz wurden erkannt.' END),
          (CASE WHEN i.development_assessments_without_instance > 0 THEN 'Development-Index-Messungen ohne Programminstanz wurden erkannt.' END),
          (CASE WHEN i.multiple_active_instances > 0 THEN 'Mehrere aktive Instanzen pro Athlet wurden erkannt.' END),
          (CASE WHEN i.test_users_in_production > 0 THEN 'Testnutzer befinden sich in einem Production-Team.' END)
        ) v(message) WHERE message IS NOT NULL
      ), '[]'::jsonb) AS blockers,
      COALESCE((
        SELECT jsonb_agg(message) FROM (VALUES
          (CASE WHEN c.athletes_total > 0 AND c.athletes_total < 5 THEN 'Psychologische Teamaggregate benötigen mindestens fünf Athleten.' END),
          (CASE WHEN c.athletes_total >= 5 AND c.athletes_total < 10 THEN 'Aggregate sind sichtbar, aber wegen n < 10 als Low Confidence zu behandeln.' END),
          (CASE WHEN c.consent_true < c.athletes_total THEN 'Nicht alle Athleten haben der Evaluation zugestimmt.' END),
          (CASE WHEN c.validated_pre_complete < c.athletes_total THEN 'Die validierte Pre-Messung ist noch nicht bei allen Athleten vollständig.' END),
          (CASE WHEN c.development_pre_complete < c.athletes_total THEN 'Der Development Index Pre ist noch nicht bei allen Athleten vollständig.' END)
        ) v(message) WHERE message IS NOT NULL
      ), '[]'::jsonb) AS warnings
    FROM counts c CROSS JOIN integrity i
  )
  SELECT json_build_object(
    'generated_at', now(),
    'status', sb.status,
    'status_label', CASE sb.status WHEN 'GREEN' THEN 'Bereit' WHEN 'YELLOW' THEN 'Startbar mit Datenlücken' ELSE 'Nicht starten' END,
    'team', json_build_object(
      'id', t.id,
      'name', t.name,
      'sport', t.sport,
      'is_test_team', COALESCE(t.is_test_team, false),
      'coach', coach.full_name
    ),
    'program_run', CASE WHEN target_run.id IS NULL THEN NULL ELSE row_to_json(target_run) END,
    'setup', json_build_object(
      'team_members', (SELECT COUNT(*) FROM public.team_members tm WHERE tm.team_id = target_team_id),
      'athletes', c.athletes_total,
      'coaches', (SELECT COUNT(DISTINCT tm.user_id) FROM public.team_members tm JOIN public.user_roles ur ON ur.user_id = tm.user_id AND ur.role = 'coach' WHERE tm.team_id = target_team_id)
    ),
    'consent', json_build_object(
      'true', c.consent_true,
      'false', c.consent_false,
      'null', c.consent_null,
      'rate', CASE WHEN c.athletes_total > 0 THEN ROUND(c.consent_true::numeric / c.athletes_total, 4) ELSE NULL END
    ),
    'activation', json_build_object(
      'accounts', c.athletes_total,
      'with_program_instance', c.athletes_with_instance,
      'with_program_run_id', c.athletes_with_instance,
      'without_program_instance', c.athletes_total - c.athletes_with_instance,
      'active_instances', c.active_instances,
      'multiple_active_instances', i.multiple_active_instances
    ),
    'pre_measurement', json_build_object(
      'validated_complete', c.validated_pre_complete,
      'validated_missing', c.athletes_total - c.validated_pre_complete,
      'validated_rate', CASE WHEN c.athletes_total > 0 THEN ROUND(c.validated_pre_complete::numeric / c.athletes_total, 4) ELSE NULL END,
      'development_index_complete', c.development_pre_complete,
      'development_index_missing', c.athletes_total - c.development_pre_complete,
      'development_index_rate', CASE WHEN c.athletes_total > 0 THEN ROUND(c.development_pre_complete::numeric / c.athletes_total, 4) ELSE NULL END
    ),
    'daily_tracking', json_build_object(
      'day_1_completed', c.day_1_completed,
      'checkins_today', c.checkins_today,
      'active_7d', c.active_7d,
      'inactive_7d', GREATEST(c.athletes_total - c.active_7d, 0),
      'avg_completion_rate', c.avg_completion_rate,
      'avg_days_completed', c.avg_days_completed
    ),
    'data_quality', json_build_object(
      'duplicate_checkins', i.duplicate_checkins,
      'checkins_without_program_instance', i.checkins_without_instance,
      'completion_without_checkin', i.completions_without_checkin,
      'completion_without_program_instance', i.completions_without_instance,
      'assessment_without_program_instance', i.assessments_without_instance,
      'questionnaire_without_program_instance', i.questionnaires_without_instance,
      'development_assessment_without_program_instance', i.development_assessments_without_instance,
      'test_users_in_production', i.test_users_in_production,
      'aggregate_visible', c.athletes_total >= 5,
      'low_confidence', c.athletes_total >= 5 AND c.athletes_total < 10,
      'min_sensitive_aggregate_n', 5
    ),
    'missing_players', json_build_object(
      'program_instance', COALESCE((
        SELECT json_agg(json_build_object('user_id', a.user_id, 'full_name', a.full_name) ORDER BY a.full_name)
        FROM athletes a WHERE NOT EXISTS (SELECT 1 FROM run_instances ri WHERE ri.user_id = a.user_id)
      ), '[]'::json),
      'validated_pre', COALESCE((
        SELECT json_agg(json_build_object('user_id', a.user_id, 'full_name', a.full_name) ORDER BY a.full_name)
        FROM athletes a WHERE NOT EXISTS (SELECT 1 FROM completed_validated_pre p WHERE p.user_id = a.user_id)
      ), '[]'::json),
      'development_pre', COALESCE((
        SELECT json_agg(json_build_object('user_id', a.user_id, 'full_name', a.full_name) ORDER BY a.full_name)
        FROM athletes a WHERE NOT EXISTS (SELECT 1 FROM development_pre p WHERE p.user_id = a.user_id)
      ), '[]'::json)
    ),
    'blockers', m.blockers,
    'warnings', m.warnings,
    'privacy_level', 'admin_operational_no_private_content'
  ) INTO result
  FROM public.teams t
  LEFT JOIN public.profiles coach ON coach.id = t.created_by
  CROSS JOIN counts c
  CROSS JOIN integrity i
  CROSS JOIN status_base sb
  CROSS JOIN messages m
  WHERE t.id = target_team_id;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_nlz_evidence_dossier(_program_run_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_run public.program_runs;
  readiness json;
  result json;
BEGIN
  SELECT * INTO target_run FROM public.program_runs WHERE id = _program_run_id;
  IF target_run.id IS NULL THEN
    RAISE EXCEPTION 'program_run_not_found';
  END IF;
  IF NOT public.can_manage_team_program_runs(target_run.team_id) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  readiness := public.get_nlz_pilot_readiness(target_run.team_id, target_run.id);

  WITH team_athletes AS (
    SELECT DISTINCT tm.user_id, p.data_contribution_consent,
      COALESCE(p.is_test_user, false) AS is_test_user
    FROM public.team_members tm
    JOIN public.user_roles ur ON ur.user_id = tm.user_id AND ur.role = 'athlete'
    JOIN public.profiles p ON p.id = tm.user_id
    WHERE tm.team_id = target_run.team_id
  ), eligible AS (
    SELECT ta.user_id, pi.id AS program_instance_id
    FROM team_athletes ta
    JOIN public.program_instances pi
      ON pi.user_id = ta.user_id AND pi.program_run_id = target_run.id
    WHERE ta.data_contribution_consent = true
      AND (
        COALESCE((SELECT is_test_team FROM public.teams WHERE id = target_run.team_id), false)
        OR ta.is_test_user = false
      )
  ), latest_snapshots AS (
    SELECT DISTINCT ON (pps.user_id)
      pps.user_id, pps.days_available, pps.days_completed, pps.completion_rate,
      pps.current_streak, pps.longest_streak, pps.comprehension_average,
      pps.checkins_completed_count, pps.journals_completed_count, pps.date
    FROM public.program_progress_snapshots pps
    JOIN eligible e ON e.program_instance_id = pps.program_instance_id
    ORDER BY pps.user_id, pps.date DESC
  ), usage AS (
    SELECT
      (SELECT COUNT(*) FROM team_athletes)::int AS athletes_total,
      (SELECT COUNT(*) FROM eligible)::int AS consented_athletes,
      (SELECT COUNT(DISTINCT udc.user_id) FROM public.user_day_completion udc JOIN eligible e ON e.program_instance_id = udc.program_instance_id WHERE udc.completion_status = 'completed' AND udc.day_number = 1)::int AS day_1_completion,
      (SELECT COUNT(DISTINCT udc.user_id) FROM public.user_day_completion udc JOIN eligible e ON e.program_instance_id = udc.program_instance_id WHERE udc.completion_status = 'completed' AND udc.day_number >= 7)::int AS day_7_active,
      (SELECT COUNT(DISTINCT udc.user_id) FROM public.user_day_completion udc JOIN eligible e ON e.program_instance_id = udc.program_instance_id WHERE udc.completion_status = 'completed' AND udc.day_number >= 14)::int AS day_14_active,
      (SELECT COUNT(DISTINCT udc.user_id) FROM public.user_day_completion udc JOIN eligible e ON e.program_instance_id = udc.program_instance_id WHERE udc.completion_status = 'completed' AND udc.day_number >= 28)::int AS day_28_active,
      (SELECT COUNT(DISTINCT udc.user_id) FROM public.user_day_completion udc JOIN eligible e ON e.program_instance_id = udc.program_instance_id WHERE udc.completion_status = 'completed' AND udc.day_number = 56)::int AS day_56_completed,
      (SELECT COUNT(*) FROM public.daily_checkins dc JOIN eligible e ON e.program_instance_id = dc.program_instance_id)::int AS total_checkins,
      (SELECT COUNT(*) FROM public.user_day_completion udc JOIN eligible e ON e.program_instance_id = udc.program_instance_id WHERE udc.completion_status = 'completed')::int AS total_completed_days,
      (SELECT COUNT(*) FROM public.comprehension_check_instances cci JOIN eligible e ON e.program_instance_id = cci.program_instance_id WHERE cci.status = 'completed')::int AS total_comprehension,
      (SELECT COUNT(*) FROM public.daily_journals dj JOIN eligible e ON e.program_instance_id = dj.program_instance_id)::int AS journal_count_only,
      ROUND(AVG(ls.completion_rate)::numeric, 4) AS avg_completion_rate,
      ROUND(AVG(ls.days_completed)::numeric, 2) AS avg_days_completed,
      ROUND(AVG(ls.comprehension_average)::numeric, 4) AS avg_comprehension
    FROM latest_snapshots ls
  ), daily_pulse AS (
    SELECT dc.date, COUNT(DISTINCT dc.user_id)::int AS n,
      ROUND(AVG(dc.mood_before)::numeric, 2) AS mood,
      ROUND(AVG(dc.energy_level)::numeric, 2) AS energy,
      ROUND(AVG(dc.focus_rating)::numeric, 2) AS focus,
      ROUND(AVG(NULLIF(dc.wellbeing_metrics ->> 'stress', '')::numeric)::numeric, 2) AS stress,
      ROUND(AVG(NULLIF(dc.wellbeing_metrics ->> 'recovery', '')::numeric)::numeric, 2) AS recovery,
      ROUND(AVG(NULLIF(dc.wellbeing_metrics ->> 'sleep_quality', '')::numeric)::numeric, 2) AS sleep,
      ROUND(AVG(NULLIF(dc.wellbeing_metrics ->> 'physical_readiness', '')::numeric)::numeric, 2) AS physical,
      ROUND(AVG(NULLIF(dc.wellbeing_metrics ->> 'motivation', '')::numeric)::numeric, 2) AS motivation,
      ROUND(AVG(NULLIF(dc.wellbeing_metrics ->> 'pressure', '')::numeric)::numeric, 2) AS pressure,
      ROUND(AVG(NULLIF(dc.wellbeing_metrics ->> 'team_connection', '')::numeric)::numeric, 2) AS team_connection
    FROM public.daily_checkins dc
    JOIN eligible e ON e.program_instance_id = dc.program_instance_id
    GROUP BY dc.date
  ), weekly_pulse AS (
    SELECT date_trunc('week', dc.date::timestamp)::date AS week_start,
      COUNT(DISTINCT dc.user_id)::int AS n,
      ROUND(AVG(dc.mood_before)::numeric, 2) AS mood,
      ROUND(AVG(dc.energy_level)::numeric, 2) AS energy,
      ROUND(AVG(dc.focus_rating)::numeric, 2) AS focus,
      ROUND(AVG(NULLIF(dc.wellbeing_metrics ->> 'stress', '')::numeric)::numeric, 2) AS stress,
      ROUND(AVG(NULLIF(dc.wellbeing_metrics ->> 'recovery', '')::numeric)::numeric, 2) AS recovery,
      ROUND(AVG(NULLIF(dc.wellbeing_metrics ->> 'sleep_quality', '')::numeric)::numeric, 2) AS sleep,
      ROUND(AVG(NULLIF(dc.wellbeing_metrics ->> 'pressure', '')::numeric)::numeric, 2) AS pressure,
      ROUND(AVG(NULLIF(dc.wellbeing_metrics ->> 'team_connection', '')::numeric)::numeric, 2) AS team_connection
    FROM public.daily_checkins dc
    JOIN eligible e ON e.program_instance_id = dc.program_instance_id
    GROUP BY date_trunc('week', dc.date::timestamp)
  ), assessment_counts AS (
    SELECT
      COUNT(DISTINCT a.user_id) FILTER (WHERE a.timing = 'pre')::int AS pre_n,
      COUNT(DISTINCT a.user_id) FILTER (WHERE a.timing = 'mid')::int AS mid_n,
      COUNT(DISTINCT a.user_id) FILTER (WHERE a.timing = 'post')::int AS post_n
    FROM public.assessments a
    JOIN eligible e ON e.program_instance_id = a.program_instance_id
  ), score_rows AS (
    SELECT a.user_id, a.assessment_type, a.timing, kv.key AS metric, kv.value::numeric AS score
    FROM public.assessments a
    JOIN eligible e ON e.program_instance_id = a.program_instance_id
    CROSS JOIN LATERAL jsonb_each_text(COALESCE(a.scores::jsonb, '{}'::jsonb)) kv
    WHERE a.timing IN ('pre', 'mid', 'post') AND kv.value ~ '^-?[0-9]+(\.[0-9]+)?$'
    UNION ALL
    SELECT a.user_id, a.assessment_type, a.timing, 'total_score', a.total_score
    FROM public.assessments a
    JOIN eligible e ON e.program_instance_id = a.program_instance_id
    WHERE a.timing IN ('pre', 'mid', 'post') AND a.total_score IS NOT NULL
  ), paired_assessments AS (
    SELECT pre.assessment_type, pre.metric, pre.user_id, pre.score AS pre_score,
      post.score AS post_score, mid.score AS mid_score
    FROM score_rows pre
    LEFT JOIN score_rows post ON post.user_id = pre.user_id AND post.assessment_type = pre.assessment_type AND post.metric = pre.metric AND post.timing = 'post'
    LEFT JOIN score_rows mid ON mid.user_id = pre.user_id AND mid.assessment_type = pre.assessment_type AND mid.metric = pre.metric AND mid.timing = 'mid'
    WHERE pre.timing = 'pre'
  ), pre_post AS (
    SELECT assessment_type, metric, COUNT(*)::int AS n,
      CASE WHEN COUNT(*) >= 5 THEN ROUND(AVG(pre_score)::numeric, 2) END AS avg_pre,
      CASE WHEN COUNT(*) >= 5 THEN ROUND(AVG(post_score)::numeric, 2) END AS avg_post,
      CASE WHEN COUNT(*) >= 5 THEN ROUND((AVG(post_score) - AVG(pre_score))::numeric, 2) END AS observed_change,
      CASE WHEN COUNT(*) >= 5 AND STDDEV_SAMP(post_score - pre_score) > 0
        THEN ROUND((AVG(post_score - pre_score) / NULLIF(STDDEV_SAMP(post_score - pre_score), 0))::numeric, 3)
      END AS effect_size_dz,
      COUNT(*) >= 5 AS sufficient_data,
      COUNT(*) < 10 AS low_confidence
    FROM paired_assessments WHERE post_score IS NOT NULL
    GROUP BY assessment_type, metric
  ), pre_mid AS (
    SELECT assessment_type, metric, COUNT(*)::int AS n,
      CASE WHEN COUNT(*) >= 5 THEN ROUND(AVG(pre_score)::numeric, 2) END AS avg_pre,
      CASE WHEN COUNT(*) >= 5 THEN ROUND(AVG(mid_score)::numeric, 2) END AS avg_mid,
      CASE WHEN COUNT(*) >= 5 THEN ROUND((AVG(mid_score) - AVG(pre_score))::numeric, 2) END AS observed_change,
      COUNT(*) >= 5 AS sufficient_data,
      COUNT(*) < 10 AS low_confidence
    FROM paired_assessments WHERE mid_score IS NOT NULL
    GROUP BY assessment_type, metric
  ), development_rows AS (
    SELECT dpa.user_id, dpa.timing,
      NULLIF(dpa.scores::jsonb ->> 'overall0to100', '')::numeric AS overall,
      COALESCE(dpa.scores::jsonb -> 'subscores', '{}'::jsonb) AS subscores
    FROM public.deep_profile_assessments dpa
    JOIN eligible e ON e.program_instance_id = dpa.program_instance_id
    WHERE dpa.instrument_id = 'rewire_development_index'
      AND dpa.timing IN ('pre', 'mid', 'post')
    UNION ALL
    SELECT qr.user_id, qr.timing,
      NULLIF(qr.scores::jsonb ->> 'overall0to100', '')::numeric AS overall,
      COALESCE(qr.scores::jsonb -> 'subscores', '{}'::jsonb) AS subscores
    FROM public.questionnaire_responses qr
    JOIN eligible e ON e.program_instance_id = qr.program_instance_id
    WHERE qr.instrument_id = 'rewire_development_index'
      AND qr.is_complete = true AND qr.timing IN ('pre', 'mid', 'post')
  ), development_counts AS (
    SELECT
      COUNT(DISTINCT user_id) FILTER (WHERE timing = 'pre')::int AS pre_n,
      COUNT(DISTINCT user_id) FILTER (WHERE timing = 'mid')::int AS mid_n,
      COUNT(DISTINCT user_id) FILTER (WHERE timing = 'post')::int AS post_n
    FROM development_rows
  ), development_pairs AS (
    SELECT pre.user_id, pre.overall AS pre_score, post.overall AS post_score
    FROM development_rows pre
    JOIN development_rows post ON post.user_id = pre.user_id AND post.timing = 'post'
    WHERE pre.timing = 'pre' AND pre.overall IS NOT NULL AND post.overall IS NOT NULL
  ), comprehension AS (
    SELECT COUNT(DISTINCT cci.user_id)::int AS n,
      COUNT(*)::int AS total,
      CASE WHEN COUNT(DISTINCT cci.user_id) >= 5
        THEN ROUND(AVG(cci.correct_count::numeric / NULLIF(cci.total_count, 0))::numeric, 4)
      END AS avg_correct_rate
    FROM public.comprehension_check_instances cci
    JOIN eligible e ON e.program_instance_id = cci.program_instance_id
    WHERE cci.status = 'completed'
  )
  SELECT json_build_object(
    'meta', json_build_object(
      'team_id', t.id,
      'team', t.name,
      'program_run_id', target_run.id,
      'program_run', target_run.name,
      'start_date', target_run.started_at,
      'end_date', target_run.ended_at,
      'generated_at', now(),
      'privacy_level', 'consented_run_scoped_aggregate_only',
      'consent_scope', 'Only explicit consent=true; production runs exclude test users.',
      'claim_boundary', 'Beobachtete Veraenderung; keine Diagnose; keine medizinische Wirkung; keine Kausalaussage ohne geeignetes Studiendesign.'
    ),
    'sample', json_build_object(
      'athletes_total', u.athletes_total,
      'consented_athletes', u.consented_athletes,
      'consent_rate', CASE WHEN u.athletes_total > 0 THEN ROUND(u.consented_athletes::numeric / u.athletes_total, 4) END,
      'aggregation_n', u.consented_athletes,
      'aggregate_visible', u.consented_athletes >= 5,
      'low_confidence', u.consented_athletes >= 5 AND u.consented_athletes < 10,
      'drop_off_before_day_7', GREATEST(u.consented_athletes - u.day_7_active, 0)
    ),
    'usage', json_build_object(
      'day_1_completion', u.day_1_completion,
      'day_7_active', u.day_7_active,
      'day_14_active', u.day_14_active,
      'day_28_active', u.day_28_active,
      'day_56_completed', u.day_56_completed,
      'total_checkins', u.total_checkins,
      'total_completed_days', u.total_completed_days,
      'total_comprehension', u.total_comprehension,
      'journal_entries_count_only', u.journal_count_only,
      'avg_completion_rate', u.avg_completion_rate,
      'avg_days_completed', u.avg_days_completed,
      'avg_comprehension', u.avg_comprehension
    ),
    'team_pulse', json_build_object(
      'daily', COALESCE((SELECT json_agg(json_build_object(
        'date', date, 'n', n, 'sufficient_data', n >= 5, 'low_confidence', n >= 5 AND n < 10,
        'mood', CASE WHEN n >= 5 THEN mood END, 'energy', CASE WHEN n >= 5 THEN energy END,
        'focus', CASE WHEN n >= 5 THEN focus END, 'stress', CASE WHEN n >= 5 THEN stress END,
        'recovery', CASE WHEN n >= 5 THEN recovery END, 'sleep', CASE WHEN n >= 5 THEN sleep END,
        'physical', CASE WHEN n >= 5 THEN physical END, 'motivation', CASE WHEN n >= 5 THEN motivation END,
        'pressure', CASE WHEN n >= 5 THEN pressure END, 'team_connection', CASE WHEN n >= 5 THEN team_connection END
      ) ORDER BY date) FROM daily_pulse), '[]'::json),
      'weekly', COALESCE((SELECT json_agg(json_build_object(
        'week_start', week_start, 'n', n, 'sufficient_data', n >= 5, 'low_confidence', n >= 5 AND n < 10,
        'mood', CASE WHEN n >= 5 THEN mood END, 'energy', CASE WHEN n >= 5 THEN energy END,
        'focus', CASE WHEN n >= 5 THEN focus END, 'stress', CASE WHEN n >= 5 THEN stress END,
        'recovery', CASE WHEN n >= 5 THEN recovery END, 'sleep', CASE WHEN n >= 5 THEN sleep END,
        'pressure', CASE WHEN n >= 5 THEN pressure END, 'team_connection', CASE WHEN n >= 5 THEN team_connection END
      ) ORDER BY week_start) FROM weekly_pulse), '[]'::json)
    ),
    'measurement', json_build_object(
      'validated_assessments', json_build_object('pre_n', ac.pre_n, 'mid_n', ac.mid_n, 'post_n', ac.post_n),
      'development_index', json_build_object('pre_n', dc.pre_n, 'mid_n', dc.mid_n, 'post_n', dc.post_n),
      'pre_post_paired_n', COALESCE((SELECT MAX(n) FROM pre_post), 0),
      'missing_pre', GREATEST(u.consented_athletes - GREATEST(ac.pre_n, dc.pre_n), 0),
      'missing_post', GREATEST(u.consented_athletes - GREATEST(ac.post_n, dc.post_n), 0)
    ),
    'outcomes', json_build_object(
      'validated_pre_post', COALESCE((SELECT json_agg(row_to_json(pre_post) ORDER BY assessment_type, metric) FROM pre_post), '[]'::json),
      'validated_pre_mid', COALESCE((SELECT json_agg(row_to_json(pre_mid) ORDER BY assessment_type, metric) FROM pre_mid), '[]'::json),
      'development_overall', json_build_object(
        'n', (SELECT COUNT(*) FROM development_pairs),
        'avg_pre', CASE WHEN (SELECT COUNT(*) FROM development_pairs) >= 5 THEN ROUND((SELECT AVG(pre_score) FROM development_pairs)::numeric, 2) END,
        'avg_post', CASE WHEN (SELECT COUNT(*) FROM development_pairs) >= 5 THEN ROUND((SELECT AVG(post_score) FROM development_pairs)::numeric, 2) END,
        'observed_change', CASE WHEN (SELECT COUNT(*) FROM development_pairs) >= 5 THEN ROUND(((SELECT AVG(post_score) FROM development_pairs) - (SELECT AVG(pre_score) FROM development_pairs))::numeric, 2) END,
        'sufficient_data', (SELECT COUNT(*) FROM development_pairs) >= 5,
        'low_confidence', (SELECT COUNT(*) FROM development_pairs) < 10
      ),
      'comprehension', row_to_json(comp)
    ),
    'data_quality', readiness -> 'data_quality',
    'readiness', json_build_object('status', readiness ->> 'status', 'label', readiness ->> 'status_label'),
    'export_catalog', json_build_array('summary.csv', 'data_quality.csv', 'weekly_trends.csv', 'assessment_aggregates.csv', 'dossier.json'),
    'privacy_exclusions', json_build_array(
      'email', 'journal_text', 'free_reflection', 'raw_checkins', 'raw_answers',
      'individual_scores', 'individual_psychological_labels'
    )
  ) INTO result
  FROM public.teams t
  CROSS JOIN usage u
  CROSS JOIN assessment_counts ac
  CROSS JOIN development_counts dc
  CROSS JOIN comprehension comp
  WHERE t.id = target_run.team_id;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_nlz_program_run_snapshot(_program_run_id uuid)
RETURNS json
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dossier json;
  target_run public.program_runs;
  snapshot_id uuid;
BEGIN
  SELECT * INTO target_run FROM public.program_runs WHERE id = _program_run_id;
  IF target_run.id IS NULL THEN RAISE EXCEPTION 'program_run_not_found'; END IF;
  IF NOT public.can_manage_team_program_runs(target_run.team_id) THEN RAISE EXCEPTION 'access_denied'; END IF;

  dossier := public.get_nlz_evidence_dossier(target_run.id);

  INSERT INTO public.study_evidence_snapshots(
    scope_type, scope_id, program_run_id, generated_by, include_test,
    readiness_stage, n_participants, n_active, metrics, outcome_summary,
    data_quality, privacy_level, claim_boundary
  ) VALUES (
    'program_run', target_run.id, target_run.id, auth.uid(),
    COALESCE((SELECT is_test_team FROM public.teams WHERE id = target_run.team_id), false),
    COALESCE(dossier #>> '{readiness,label}', 'Unbekannt'),
    COALESCE((dossier #>> '{sample,consented_athletes}')::int, 0),
    COALESCE((dossier #>> '{usage,day_7_active}')::int, 0),
    dossier::jsonb,
    COALESCE((dossier -> 'outcomes')::jsonb, '{}'::jsonb),
    COALESCE((dossier -> 'data_quality')::jsonb, '{}'::jsonb),
    COALESCE(dossier #>> '{meta,privacy_level}', 'consented_run_scoped_aggregate_only'),
    COALESCE(dossier #>> '{meta,claim_boundary}', 'Beobachtete Veraenderung; keine Kausalaussage.')
  ) RETURNING id INTO snapshot_id;

  RETURN json_build_object('snapshot_id', snapshot_id, 'program_run_id', target_run.id, 'dossier', dossier);
END;
$$;

-- Coach-facing outcomes now use the active run and inherit SQL-level n<5
-- suppression from the run-scoped dossier.
CREATE OR REPLACE FUNCTION public.compute_team_outcomes(
  team_id_param uuid,
  min_n integer DEFAULT 5
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_run_id uuid;
  dossier json;
  consented_n integer;
BEGIN
  IF min_n < 5 THEN min_n := 5; END IF;
  IF NOT public.can_manage_team_program_runs(team_id_param) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  SELECT id INTO active_run_id
  FROM public.program_runs
  WHERE team_id = team_id_param AND status = 'active'
  ORDER BY started_at DESC, created_at DESC
  LIMIT 1;

  IF active_run_id IS NULL THEN
    RETURN json_build_object(
      'sufficient_data', false,
      'reason', 'no_active_program_run',
      'total_athletes', 0,
      'min_n', min_n
    );
  END IF;

  dossier := public.get_nlz_evidence_dossier(active_run_id);
  consented_n := COALESCE((dossier #>> '{sample,consented_athletes}')::int, 0);

  RETURN json_build_object(
    'team_id', team_id_param,
    'program_run_id', active_run_id,
    'min_n', min_n,
    'total_athletes', consented_n,
    'sufficient_data', consented_n >= min_n,
    'low_confidence', consented_n >= min_n AND consented_n < 10,
    'consent_scope', dossier #>> '{meta,consent_scope}',
    'cohort_breakdown', json_build_object(
      'never_started', GREATEST(consented_n - COALESCE((dossier #>> '{usage,day_1_completion}')::int, 0), 0),
      'only_pre', GREATEST(COALESCE((dossier #>> '{measurement,validated_assessments,pre_n}')::int, 0) - COALESCE((dossier #>> '{measurement,validated_assessments,post_n}')::int, 0), 0),
      'pre_and_mid_no_post', GREATEST(COALESCE((dossier #>> '{measurement,validated_assessments,mid_n}')::int, 0) - COALESCE((dossier #>> '{measurement,validated_assessments,post_n}')::int, 0), 0),
      'completed_pre_post', COALESCE((dossier #>> '{measurement,pre_post_paired_n}')::int, 0)
    ),
    'assessment_completion', dossier #> '{measurement,validated_assessments}',
    'adherence', json_build_object(
      'players_with_progress', COALESCE((dossier #>> '{usage,day_1_completion}')::int, 0),
      'avg_completion_rate', CASE WHEN consented_n >= min_n THEN dossier #> '{usage,avg_completion_rate}' ELSE 'null'::json END,
      'avg_days_completed', CASE WHEN consented_n >= min_n THEN dossier #> '{usage,avg_days_completed}' ELSE 'null'::json END,
      'avg_comprehension', CASE WHEN consented_n >= min_n THEN dossier #> '{usage,avg_comprehension}' ELSE 'null'::json END
    ),
    'changes', json_build_object(
      'pre_post', dossier #> '{outcomes,validated_pre_post}',
      'pre_mid', dossier #> '{outcomes,validated_pre_mid}'
    ),
    'comprehension', dossier #> '{outcomes,comprehension}',
    'weekly_trend', dossier #> '{team_pulse,weekly}',
    'disclaimer', dossier #>> '{meta,claim_boundary}'
  );
END;
$$;

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
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_manage_team_program_runs(_team_id) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  RETURN QUERY
  WITH active_run AS (
    SELECT pr.id
    FROM public.program_runs pr
    WHERE pr.team_id = _team_id AND pr.status = 'active'
    ORDER BY pr.started_at DESC, pr.created_at DESC
    LIMIT 1
  ), athletes AS (
    SELECT DISTINCT tm.user_id
    FROM public.team_members tm
    JOIN public.user_roles ur ON ur.user_id = tm.user_id AND ur.role = 'athlete'
    WHERE tm.team_id = _team_id
  ), instances AS (
    SELECT pi.id, pi.user_id
    FROM public.program_instances pi
    JOIN active_run ar ON ar.id = pi.program_run_id
    JOIN athletes a ON a.user_id = pi.user_id
  ), latest_q AS (
    SELECT DISTINCT ON (qr.user_id)
      qr.user_id, qr.is_complete, qr.last_category_index, qr.progress_updated_at
    FROM public.questionnaire_responses qr
    JOIN instances i ON i.id = qr.program_instance_id AND i.user_id = qr.user_id
    WHERE qr.instrument_id = 'onboarding_v2' OR qr.instrument_id IS NULL
    ORDER BY qr.user_id, qr.is_complete DESC, qr.progress_updated_at DESC, qr.created_at DESC
  )
  SELECT
    a.user_id,
    p.full_name,
    COALESCE(lq.is_complete, false),
    COALESCE(lq.last_category_index, 0),
    lq.progress_updated_at
  FROM athletes a
  LEFT JOIN public.profiles p ON p.id = a.user_id
  LEFT JOIN latest_q lq ON lq.user_id = a.user_id
  ORDER BY p.full_name NULLS LAST, a.user_id;
END;
$$;

-- The latest legacy version returned last_checkin_date as text. PostgreSQL
-- cannot replace a table-returning function when an OUT type changes.
DROP FUNCTION IF EXISTS public.get_coach_team_activity_status(uuid);

CREATE OR REPLACE FUNCTION public.get_coach_team_activity_status(_team_id uuid)
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
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_manage_team_program_runs(_team_id) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  RETURN QUERY
  WITH active_run AS (
    SELECT pr.id
    FROM public.program_runs pr
    WHERE pr.team_id = _team_id AND pr.status = 'active'
    ORDER BY pr.started_at DESC, pr.created_at DESC
    LIMIT 1
  ), athletes AS (
    SELECT DISTINCT tm.user_id
    FROM public.team_members tm
    JOIN public.user_roles ur ON ur.user_id = tm.user_id AND ur.role = 'athlete'
    WHERE tm.team_id = _team_id
  ), active_instances AS (
    SELECT pi.user_id, pi.id AS program_instance_id
    FROM public.program_instances pi
    JOIN active_run ar ON ar.id = pi.program_run_id
    JOIN athletes a ON a.user_id = pi.user_id
    WHERE pi.status = 'active'
  ), latest_snap AS (
    SELECT DISTINCT ON (pps.user_id)
      pps.user_id, pps.days_completed, pps.days_available,
      pps.completion_rate, pps.current_streak
    FROM public.program_progress_snapshots pps
    JOIN active_instances ai ON ai.program_instance_id = pps.program_instance_id
    ORDER BY pps.user_id, pps.date DESC
  ), activity AS (
    SELECT
      a.user_id,
      GREATEST(
        COALESCE((SELECT MAX(udc.completed_at) FROM public.user_day_completion udc WHERE udc.program_instance_id = ai.program_instance_id), '-infinity'::timestamptz),
        COALESCE((SELECT MAX(dc.created_at) FROM public.daily_checkins dc WHERE dc.program_instance_id = ai.program_instance_id), '-infinity'::timestamptz),
        COALESCE((SELECT MAX(cci.completed_at) FROM public.comprehension_check_instances cci WHERE cci.program_instance_id = ai.program_instance_id), '-infinity'::timestamptz),
        COALESCE((SELECT MAX(dj.created_at) FROM public.daily_journals dj WHERE dj.program_instance_id = ai.program_instance_id), '-infinity'::timestamptz)
      ) AS raw_last_activity_at,
      (SELECT COUNT(*)::int FROM public.daily_checkins dc WHERE dc.program_instance_id = ai.program_instance_id AND dc.date >= CURRENT_DATE - 6) AS checkins_last_7d,
      (SELECT MAX(dc.date) FROM public.daily_checkins dc WHERE dc.program_instance_id = ai.program_instance_id) AS last_checkin_date,
      (SELECT COUNT(*)::int FROM public.daily_journals dj WHERE dj.program_instance_id = ai.program_instance_id) AS journal_entries_count
    FROM athletes a
    LEFT JOIN active_instances ai ON ai.user_id = a.user_id
  )
  SELECT
    a.user_id,
    p.full_name,
    NULLIF(act.raw_last_activity_at, '-infinity'::timestamptz),
    COALESCE(ls.days_completed, 0)::int,
    COALESCE(ls.days_available, 0)::int,
    ls.completion_rate,
    COALESCE(ls.current_streak, 0)::int,
    COALESCE(act.checkins_last_7d, 0)::int,
    act.last_checkin_date,
    COALESCE(act.journal_entries_count, 0)::int,
    (
      NULLIF(act.raw_last_activity_at, '-infinity'::timestamptz) IS NULL
      OR act.raw_last_activity_at < now() - interval '7 days'
    )
  FROM athletes a
  LEFT JOIN public.profiles p ON p.id = a.user_id
  LEFT JOIN latest_snap ls ON ls.user_id = a.user_id
  LEFT JOIN activity act ON act.user_id = a.user_id
  ORDER BY
    (
      NULLIF(act.raw_last_activity_at, '-infinity'::timestamptz) IS NULL
      OR act.raw_last_activity_at < now() - interval '7 days'
    ) DESC,
    act.raw_last_activity_at NULLS FIRST,
    p.full_name NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION public.get_nlz_pilot_readiness(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_nlz_evidence_dossier(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_nlz_program_run_snapshot(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.compute_team_outcomes(uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_team_questionnaire_status(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_coach_team_activity_status(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_nlz_pilot_readiness(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_nlz_evidence_dossier(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_nlz_program_run_snapshot(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_team_outcomes(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_questionnaire_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_coach_team_activity_status(uuid) TO authenticated;

COMMIT;
