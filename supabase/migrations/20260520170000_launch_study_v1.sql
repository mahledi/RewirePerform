-- Launch-Study V1
-- Privacy-safe internal evaluation layer for cohorts, aggregate snapshots,
-- and presentation exports. This migration does not delete or rewrite old data.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.study_cohorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  cohort_type text NOT NULL DEFAULT 'production'
    CHECK (cohort_type IN ('production', 'pilot', 'demo', 'qa', 'internal')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('planned', 'active', 'completed', 'archived')),
  sport text,
  organization text,
  start_date date,
  end_date date,
  include_test_data boolean NOT NULL DEFAULT false,
  min_aggregate_n integer NOT NULL DEFAULT 5 CHECK (min_aggregate_n >= 5),
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.study_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id uuid NOT NULL REFERENCES public.study_cohorts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  program_instance_id uuid REFERENCES public.program_instances(id) ON DELETE SET NULL,
  role text NOT NULL DEFAULT 'athlete',
  anonymized_key text NOT NULL DEFAULT encode(extensions.gen_random_bytes(12), 'hex'),
  consent_status text NOT NULL DEFAULT 'internal_evaluation',
  included boolean NOT NULL DEFAULT true,
  exclusion_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cohort_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.study_measurement_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id uuid NOT NULL REFERENCES public.study_cohorts(id) ON DELETE CASCADE,
  label text NOT NULL CHECK (label IN ('baseline', 'mid', 'post', 'follow_up')),
  planned_start_date date,
  planned_end_date date,
  actual_completed_count integer NOT NULL DEFAULT 0,
  target_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'open', 'complete', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.study_aggregate_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id uuid REFERENCES public.study_cohorts(id) ON DELETE SET NULL,
  generated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  n_participants integer NOT NULL DEFAULT 0,
  n_active integer NOT NULL DEFAULT 0,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  data_quality jsonb NOT NULL DEFAULT '{}'::jsonb,
  privacy_level text NOT NULL DEFAULT 'aggregate_only',
  claim_boundary text NOT NULL DEFAULT 'interne Programmevaluation; keine Diagnose; keine medizinische Wirkung; keine Kausalaussage ohne Kontrollgruppe'
);

CREATE TABLE IF NOT EXISTS public.study_export_manifests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id uuid REFERENCES public.study_cohorts(id) ON DELETE SET NULL,
  snapshot_id uuid REFERENCES public.study_aggregate_snapshots(id) ON DELETE SET NULL,
  generated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  export_type text NOT NULL DEFAULT 'launch_study_v1',
  included_exports text[] NOT NULL DEFAULT ARRAY[
    'study_summary.json',
    'cohort_metrics.csv',
    'measurement_windows.csv',
    'data_quality.csv',
    'export_manifest.json'
  ],
  privacy_exclusions text[] NOT NULL DEFAULT ARRAY[
    'journal_text',
    'free_reflection',
    'raw_individual_checkins',
    'raw_questionnaire_answers',
    'individual_psychological_scores',
    'player_identifying_development_labels'
  ],
  claim_boundary text NOT NULL DEFAULT 'interne Programmevaluation; beobachtete Entwicklung; keine Diagnose; keine Kausalaussage ohne Kontrollgruppe',
  source_version text NOT NULL DEFAULT 'launch_study_v1',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_study_participants_cohort
  ON public.study_participants(cohort_id);
CREATE INDEX IF NOT EXISTS idx_study_participants_user
  ON public.study_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_study_participants_team
  ON public.study_participants(team_id);
CREATE INDEX IF NOT EXISTS idx_study_windows_cohort
  ON public.study_measurement_windows(cohort_id);
CREATE INDEX IF NOT EXISTS idx_study_snapshots_cohort_generated
  ON public.study_aggregate_snapshots(cohort_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_manifests_cohort_generated
  ON public.study_export_manifests(cohort_id, generated_at DESC);

ALTER TABLE public.study_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_measurement_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_aggregate_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_export_manifests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage study cohorts" ON public.study_cohorts;
DROP POLICY IF EXISTS "Admins manage study participants" ON public.study_participants;
DROP POLICY IF EXISTS "Admins manage study windows" ON public.study_measurement_windows;
DROP POLICY IF EXISTS "Admins manage study snapshots" ON public.study_aggregate_snapshots;
DROP POLICY IF EXISTS "Admins manage study manifests" ON public.study_export_manifests;

CREATE POLICY "Admins manage study cohorts"
  ON public.study_cohorts FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins manage study participants"
  ON public.study_participants FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins manage study windows"
  ON public.study_measurement_windows FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins manage study snapshots"
  ON public.study_aggregate_snapshots FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins manage study manifests"
  ON public.study_export_manifests FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

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
    'privacy_level', 'cohort_or_team_aggregate_only',
    'claim_boundary', 'interne Programmevaluation; beobachtete Entwicklung; keine Diagnose; keine medizinische Wirkung; keine Kausalaussage ohne Kontrollgruppe',
    'summary', json_build_object(
      'athletes_total', a.athletes_total,
      'teams_total', a.teams_total,
      'study_cohorts_total', (SELECT COUNT(*) FROM public.study_cohorts),
      'active_study_cohorts', (SELECT COUNT(*) FROM public.study_cohorts WHERE status = 'active'),
      'study_participants_total', (SELECT COUNT(*) FROM public.study_participants WHERE included = true),
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
        SELECT cohort_id, COUNT(*)::int AS participant_count
        FROM public.study_participants
        WHERE included = true
        GROUP BY cohort_id
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
      'privacy_level', overview ->> 'privacy_level'
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
