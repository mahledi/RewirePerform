BEGIN;

-- MahleOS receives a fixed, aggregate operational contract. The audit log is
-- append-only and deliberately stores neither response payloads nor athlete
-- identifiers.
CREATE TABLE public.mahleos_operations_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE,
  client_id text NOT NULL CHECK (client_id ~ '^[a-z0-9][a-z0-9_-]{2,63}$'),
  view_name text NOT NULL CHECK (
    view_name IN (
      'daily_brief',
      'system_health',
      'tracking_quality',
      'feedback_status',
      'pilot_readiness'
    )
  ),
  program_run_id uuid REFERENCES public.program_runs(id) ON DELETE RESTRICT,
  outcome text NOT NULL CHECK (
    outcome IN ('served', 'not_found', 'invalid_request', 'rate_limited')
  ),
  response_checksum text,
  requested_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mahleos_operations_access_client_time
  ON public.mahleos_operations_access_log(client_id, requested_at DESC);

ALTER TABLE public.mahleos_operations_access_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.mahleos_operations_access_log
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.guard_mahleos_operations_access_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  RAISE EXCEPTION 'mahleos_operations_access_log_append_only';
END;
$$;

CREATE TRIGGER guard_mahleos_operations_access_log_mutation
BEFORE UPDATE OR DELETE ON public.mahleos_operations_access_log
FOR EACH ROW EXECUTE FUNCTION public.guard_mahleos_operations_access_log_mutation();

REVOKE ALL ON FUNCTION public.guard_mahleos_operations_access_log_mutation()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public._mahleos_system_health()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  WITH recent_failed_events AS MATERIALIZED (
    SELECT ael.event_name
    FROM public.app_event_log ael
    WHERE NOT COALESCE(ael.is_test, false)
      AND ael.status = 'failed'
      AND ael.created_at >= now() - interval '24 hours'
  ), flow_metrics AS (
    SELECT
      COUNT(*)::integer AS failed_events,
      COUNT(*) FILTER (
        WHERE rfe.event_name IN (
          'auth_login',
          'auth_signup',
          'team_join_attempt',
          'daily_checkin_saved',
          'journal_saved',
          'assessment_saved',
          'deep_profile_saved'
        )
      )::integer AS critical_failed_events,
      jsonb_build_object(
        'auth_login', COUNT(*) FILTER (WHERE rfe.event_name = 'auth_login'),
        'auth_signup', COUNT(*) FILTER (WHERE rfe.event_name = 'auth_signup'),
        'team_join_attempt', COUNT(*) FILTER (WHERE rfe.event_name = 'team_join_attempt'),
        'daily_checkin_saved', COUNT(*) FILTER (WHERE rfe.event_name = 'daily_checkin_saved'),
        'journal_saved', COUNT(*) FILTER (WHERE rfe.event_name = 'journal_saved'),
        'assessment_saved', COUNT(*) FILTER (WHERE rfe.event_name = 'assessment_saved'),
        'coach_evidence_load_failed', COUNT(*) FILTER (
          WHERE rfe.event_name = 'coach_evidence_load_failed'
        ),
        'app_runtime_error', COUNT(*) FILTER (WHERE rfe.event_name = 'app_runtime_error')
      ) AS flow_failures
    FROM recent_failed_events rfe
  ), notification_metrics AS (
    SELECT jsonb_build_object(
      'sent', COUNT(*) FILTER (WHERE nl.status = 'sent'),
      'opened', COUNT(*) FILTER (WHERE nl.status = 'opened'),
      'failed', COUNT(*) FILTER (WHERE nl.status = 'failed'),
      'expired_subscriptions', COUNT(*) FILTER (
        WHERE nl.status = 'expired_subscription'
      )
    ) AS notifications
    FROM public.notification_log nl
    JOIN public.profiles p ON p.id = nl.user_id
    WHERE nl.created_at >= now() - interval '7 days'
      AND NOT COALESCE(p.is_test_user, false)
  ), metrics AS (
    SELECT
      (
        SELECT COUNT(*)::integer
        FROM public.user_roles ur
        WHERE NOT EXISTS (
          SELECT 1 FROM public.profiles p WHERE p.id = ur.user_id
        )
      ) AS users_missing_profile,
      (
        SELECT COUNT(*)::integer
        FROM public.profiles p
        WHERE NOT COALESCE(p.is_test_user, false)
          AND NOT EXISTS (
            SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id
          )
      ) AS production_profiles_missing_role,
      (
        SELECT COUNT(*)::integer
        FROM public.user_roles ur
        JOIN public.profiles p ON p.id = ur.user_id
        WHERE ur.role = 'athlete'::public.app_role
          AND NOT COALESCE(p.is_test_user, false)
          AND NOT EXISTS (
            SELECT 1
            FROM public.program_instances pi
            WHERE pi.user_id = ur.user_id
              AND NOT COALESCE(pi.is_test_instance, false)
          )
      ) AS athletes_without_program_instance,
      (
        SELECT COUNT(*)::integer
        FROM (
          SELECT pi.user_id
          FROM public.program_instances pi
          JOIN public.profiles p ON p.id = pi.user_id
          WHERE pi.status = 'active'
            AND NOT COALESCE(pi.is_test_instance, false)
            AND NOT COALESCE(p.is_test_user, false)
          GROUP BY pi.user_id
          HAVING COUNT(*) > 1
        ) duplicated_active
      ) AS athletes_with_multiple_active_instances,
      (
        SELECT COUNT(*)::integer
        FROM public.program_instances pi
        JOIN public.profiles p ON p.id = pi.user_id
        WHERE pi.status = 'active'
          AND pi.team_id IS NOT NULL
          AND pi.program_run_id IS NULL
          AND NOT COALESCE(pi.is_test_instance, false)
          AND NOT COALESCE(p.is_test_user, false)
      ) AS active_team_instances_without_run,
      (
        SELECT COUNT(*)::integer
        FROM public.program_runs pr
        JOIN public.teams t ON t.id = pr.team_id
        WHERE pr.status = 'active'
          AND pr.started_at IS NULL
          AND NOT COALESCE(t.is_test_team, false)
      ) AS active_runs_without_start_date,
      (
        SELECT COUNT(*)::integer
        FROM public.daily_checkins dc
        JOIN public.profiles p ON p.id = dc.user_id
        WHERE dc.program_instance_id IS NULL
          AND dc.created_at >= now() - interval '7 days'
          AND NOT COALESCE(p.is_test_user, false)
      ) AS checkins_missing_instance_7d,
      (
        SELECT COUNT(*)::integer
        FROM public.user_day_completion udc
        JOIN public.profiles p ON p.id = udc.user_id
        WHERE udc.program_instance_id IS NULL
          AND udc.created_at >= now() - interval '7 days'
          AND NOT COALESCE(p.is_test_user, false)
      ) AS completions_missing_instance_7d,
      (
        SELECT COUNT(*)::integer
        FROM public.assessments a
        JOIN public.profiles p ON p.id = a.user_id
        WHERE a.program_instance_id IS NULL
          AND a.created_at >= now() - interval '7 days'
          AND NOT COALESCE(p.is_test_user, false)
      ) AS assessments_missing_instance_7d,
      (
        SELECT COUNT(*)::integer
        FROM public.questionnaire_responses qr
        JOIN public.profiles p ON p.id = qr.user_id
        WHERE qr.program_instance_id IS NULL
          AND qr.created_at >= now() - interval '7 days'
          AND NOT COALESCE(p.is_test_user, false)
      ) AS questionnaires_missing_instance_7d,
      (
        SELECT COUNT(*)::integer
        FROM public.comprehension_check_instances cci
        JOIN public.profiles p ON p.id = cci.user_id
        WHERE cci.program_instance_id IS NULL
          AND cci.created_at >= now() - interval '7 days'
          AND NOT COALESCE(p.is_test_user, false)
      ) AS comprehension_missing_instance_7d,
      (SELECT fm.failed_events FROM flow_metrics fm) AS failed_events_24h,
      (SELECT fm.critical_failed_events FROM flow_metrics fm) AS critical_failed_events_24h,
      (
        SELECT COUNT(*)::integer
        FROM public.feedback f
        JOIN public.profiles p ON p.id = f.user_id
        WHERE f.status = 'open'
          AND NOT COALESCE(p.is_test_user, false)
      ) AS open_feedback,
      (SELECT fm.flow_failures FROM flow_metrics fm) AS flow_failures_24h,
      (SELECT nm.notifications FROM notification_metrics nm) AS notifications_7d
  )
  SELECT jsonb_build_object(
    'schema_version', 'mahleos-system-health-v1',
    'generated_at', now(),
    'reporting_timezone', 'UTC',
    'status', CASE
      WHEN m.users_missing_profile > 0
        OR m.production_profiles_missing_role > 0
        OR m.athletes_with_multiple_active_instances > 0
        OR m.active_team_instances_without_run > 0
        OR m.active_runs_without_start_date > 0
        OR m.checkins_missing_instance_7d > 0
        OR m.completions_missing_instance_7d > 0
        OR m.assessments_missing_instance_7d > 0
        OR m.questionnaires_missing_instance_7d > 0
        OR m.comprehension_missing_instance_7d > 0
        OR m.critical_failed_events_24h > 0
      THEN 'RED'
      WHEN m.athletes_without_program_instance > 0
        OR m.failed_events_24h > 0
        OR m.open_feedback > 0
      THEN 'YELLOW'
      ELSE 'GREEN'
    END,
    'identity_integrity', jsonb_build_object(
      'users_missing_profile', m.users_missing_profile,
      'production_profiles_missing_role', m.production_profiles_missing_role
    ),
    'program_integrity', jsonb_build_object(
      'athletes_without_program_instance', m.athletes_without_program_instance,
      'athletes_with_multiple_active_instances', m.athletes_with_multiple_active_instances,
      'active_team_instances_without_run', m.active_team_instances_without_run,
      'active_runs_without_start_date', m.active_runs_without_start_date
    ),
    'tracking_integrity_7d', jsonb_build_object(
      'checkins_missing_instance', m.checkins_missing_instance_7d,
      'completions_missing_instance', m.completions_missing_instance_7d,
      'assessments_missing_instance', m.assessments_missing_instance_7d,
      'questionnaires_missing_instance', m.questionnaires_missing_instance_7d,
      'comprehension_missing_instance', m.comprehension_missing_instance_7d
    ),
    'operations_24h', jsonb_build_object(
      'failed_events', m.failed_events_24h,
      'critical_failed_events', m.critical_failed_events_24h,
      'flow_failures', m.flow_failures_24h
    ),
    'notifications_7d', m.notifications_7d,
    'feedback', jsonb_build_object('open', m.open_feedback),
    'privacy_level', 'aggregate_operational_no_user_content',
    'privacy_exclusions', jsonb_build_array(
      'names',
      'emails',
      'user_ids',
      'team_names',
      'feedback_text',
      'journal_text',
      'free_reflection',
      'individual_scores',
      'raw_checkins'
    )
  )
  FROM metrics m;
$$;

CREATE OR REPLACE FUNCTION public._mahleos_tracking_quality()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  WITH production_instances AS (
    SELECT pi.id, pi.user_id
    FROM public.program_instances pi
    JOIN public.profiles p ON p.id = pi.user_id
    WHERE pi.status = 'active'
      AND NOT COALESCE(pi.is_test_instance, false)
      AND NOT COALESCE(p.is_test_user, false)
  ), active_users_7d AS (
    SELECT dc.user_id
    FROM public.daily_checkins dc
    JOIN production_instances pi
      ON pi.id = dc.program_instance_id AND pi.user_id = dc.user_id
    WHERE dc.date >= CURRENT_DATE - 6
    UNION
    SELECT udc.user_id
    FROM public.user_day_completion udc
    JOIN production_instances pi
      ON pi.id = udc.program_instance_id AND pi.user_id = udc.user_id
    WHERE udc.completion_status = 'completed'
      AND COALESCE(udc.completed_at, udc.created_at) >= now() - interval '7 days'
  ), metrics AS (
    SELECT
      (SELECT COUNT(*)::integer FROM production_instances) AS active_instances,
      (SELECT COUNT(*)::integer FROM active_users_7d) AS active_athletes_7d,
      (
        SELECT COUNT(*)::integer
        FROM public.daily_checkins dc
        JOIN production_instances pi
          ON pi.id = dc.program_instance_id AND pi.user_id = dc.user_id
        WHERE dc.date = CURRENT_DATE
      ) AS checkins_today,
      (
        SELECT COUNT(*)::integer
        FROM public.daily_checkins dc
        JOIN production_instances pi
          ON pi.id = dc.program_instance_id AND pi.user_id = dc.user_id
        WHERE dc.date >= CURRENT_DATE - 6
      ) AS checkins_7d,
      (
        SELECT COUNT(*)::integer
        FROM public.user_day_completion udc
        JOIN production_instances pi
          ON pi.id = udc.program_instance_id AND pi.user_id = udc.user_id
        WHERE udc.completion_status = 'completed'
          AND COALESCE(udc.completed_at, udc.created_at) >= CURRENT_DATE
      ) AS completed_days_today,
      (
        SELECT COUNT(*)::integer
        FROM public.user_day_completion udc
        JOIN production_instances pi
          ON pi.id = udc.program_instance_id AND pi.user_id = udc.user_id
        WHERE udc.completion_status = 'completed'
          AND COALESCE(udc.completed_at, udc.created_at) >= now() - interval '7 days'
      ) AS completed_days_7d,
      (
        SELECT COUNT(DISTINCT pps.program_instance_id)::integer
        FROM public.program_progress_snapshots pps
        JOIN production_instances pi ON pi.id = pps.program_instance_id
        WHERE pps.date = CURRENT_DATE
      ) AS fresh_snapshots_today,
      (
        SELECT COUNT(*)::integer
        FROM (
          SELECT dc.user_id, dc.program_instance_id, dc.date
          FROM public.daily_checkins dc
          JOIN production_instances pi
            ON pi.id = dc.program_instance_id AND pi.user_id = dc.user_id
          WHERE dc.date >= CURRENT_DATE - 55
          GROUP BY dc.user_id, dc.program_instance_id, dc.date
          HAVING COUNT(*) > 1
        ) duplicates
      ) AS duplicate_checkins_56d,
      (
        SELECT COUNT(*)::integer
        FROM public.daily_checkins dc
        JOIN public.profiles p ON p.id = dc.user_id
        WHERE dc.program_instance_id IS NULL
          AND dc.created_at >= now() - interval '7 days'
          AND NOT COALESCE(p.is_test_user, false)
      ) AS checkins_missing_instance_7d,
      (
        SELECT COUNT(*)::integer
        FROM public.user_day_completion udc
        JOIN public.profiles p ON p.id = udc.user_id
        WHERE udc.program_instance_id IS NULL
          AND udc.created_at >= now() - interval '7 days'
          AND NOT COALESCE(p.is_test_user, false)
      ) AS completions_missing_instance_7d,
      (
        SELECT COUNT(*)::integer
        FROM public.user_day_completion udc
        JOIN public.user_day_assignments uda ON uda.id = udc.assignment_id
        JOIN production_instances pi
          ON pi.id = udc.program_instance_id AND pi.user_id = udc.user_id
        WHERE udc.completion_status = 'completed'
          AND COALESCE(udc.completed_at, udc.created_at) >= now() - interval '7 days'
          AND NOT EXISTS (
            SELECT 1
            FROM public.daily_checkins dc
            WHERE dc.user_id = udc.user_id
              AND dc.program_instance_id = udc.program_instance_id
              AND dc.date = uda.date
          )
      ) AS completions_without_checkin_7d,
      (
        SELECT COUNT(*)::integer
        FROM public.app_event_log ael
        WHERE NOT COALESCE(ael.is_test, false)
          AND ael.event_name = 'daily_checkin_saved'
          AND ael.status = 'success'
          AND ael.created_at >= now() - interval '24 hours'
      ) AS checkin_save_success_24h,
      (
        SELECT COUNT(*)::integer
        FROM public.app_event_log ael
        WHERE NOT COALESCE(ael.is_test, false)
          AND ael.event_name = 'daily_checkin_saved'
          AND ael.status = 'failed'
          AND ael.created_at >= now() - interval '24 hours'
      ) AS checkin_save_failures_24h
  )
  SELECT jsonb_build_object(
    'schema_version', 'mahleos-tracking-quality-v1',
    'generated_at', now(),
    'reporting_timezone', 'UTC',
    'status', CASE
      WHEN m.duplicate_checkins_56d > 0
        OR m.checkins_missing_instance_7d > 0
        OR m.completions_missing_instance_7d > 0
        OR m.completions_without_checkin_7d > 0
      THEN 'RED'
      WHEN m.checkin_save_failures_24h > 0 THEN 'YELLOW'
      ELSE 'GREEN'
    END,
    'activity', jsonb_build_object(
      'active_instances', m.active_instances,
      'active_athletes_7d', m.active_athletes_7d,
      'checkins_today', m.checkins_today,
      'checkins_7d', m.checkins_7d,
      'completed_days_today', m.completed_days_today,
      'completed_days_7d', m.completed_days_7d,
      'fresh_snapshots_today', m.fresh_snapshots_today
    ),
    'integrity', jsonb_build_object(
      'duplicate_checkins_56d', m.duplicate_checkins_56d,
      'checkins_missing_instance_7d', m.checkins_missing_instance_7d,
      'completions_missing_instance_7d', m.completions_missing_instance_7d,
      'completions_without_checkin_7d', m.completions_without_checkin_7d
    ),
    'save_pipeline_24h', jsonb_build_object(
      'success', m.checkin_save_success_24h,
      'failed', m.checkin_save_failures_24h
    ),
    'test_data_included', false,
    'privacy_level', 'aggregate_tracking_counts_only',
    'privacy_exclusions', jsonb_build_array(
      'user_ids',
      'daily_checkin_values',
      'wellbeing_metrics',
      'reflection',
      'journal_text',
      'assessment_scores'
    )
  )
  FROM metrics m;
$$;

CREATE OR REPLACE FUNCTION public._mahleos_feedback_status()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  WITH production_feedback AS (
    SELECT f.status, f.type, f.created_at
    FROM public.feedback f
    JOIN public.profiles p ON p.id = f.user_id
    WHERE NOT COALESCE(p.is_test_user, false)
  )
  SELECT jsonb_build_object(
    'schema_version', 'mahleos-feedback-status-v1',
    'generated_at', now(),
    'reporting_timezone', 'UTC',
    'status', CASE
      WHEN COUNT(*) FILTER (WHERE f.status = 'open' AND f.type = 'bug') > 0 THEN 'NEEDS_ATTENTION'
      WHEN COUNT(*) FILTER (WHERE f.status = 'open') > 0 THEN 'OPEN'
      ELSE 'CLEAR'
    END,
    'counts', jsonb_build_object(
      'open', COUNT(*) FILTER (WHERE f.status = 'open'),
      'reviewed', COUNT(*) FILTER (WHERE f.status = 'reviewed'),
      'resolved', COUNT(*) FILTER (WHERE f.status = 'resolved'),
      'new_24h', COUNT(*) FILTER (WHERE f.created_at >= now() - interval '24 hours'),
      'new_7d', COUNT(*) FILTER (WHERE f.created_at >= now() - interval '7 days')
    ),
    'open_by_category', jsonb_build_object(
      'bug', COUNT(*) FILTER (WHERE f.status = 'open' AND f.type = 'bug'),
      'suggestion', COUNT(*) FILTER (WHERE f.status = 'open' AND f.type = 'suggestion'),
      'general', COUNT(*) FILTER (WHERE f.status = 'open' AND f.type = 'general'),
      'other', COUNT(*) FILTER (
        WHERE f.status = 'open' AND f.type NOT IN ('bug', 'suggestion', 'general')
      )
    ),
    'feedback_text_exported', false,
    'user_identifiers_exported', false,
    'privacy_level', 'backlog_counts_only'
  )
  FROM production_feedback f;
$$;

CREATE OR REPLACE FUNCTION public._mahleos_pilot_readiness(
  _program_run_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  target_run public.program_runs;
  target_team public.teams;
  result jsonb;
BEGIN
  SELECT * INTO target_run
  FROM public.program_runs pr
  WHERE pr.id = _program_run_id;

  IF target_run.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO target_team
  FROM public.teams t
  WHERE t.id = target_run.team_id;

  IF COALESCE(target_team.is_test_team, false) THEN
    RETURN jsonb_build_object(
      'schema_version', 'mahleos-pilot-readiness-v1',
      'generated_at', now(),
      'reporting_timezone', 'UTC',
      'program_run_id', target_run.id,
      'status', 'TEST_EXCLUDED',
      'test_data_included', false,
      'privacy_level', 'aggregate_operational_no_user_content'
    );
  END IF;

  WITH athletes AS (
    SELECT DISTINCT tm.user_id
    FROM public.team_members tm
    JOIN public.user_roles ur
      ON ur.user_id = tm.user_id
     AND ur.role = 'athlete'::public.app_role
    JOIN public.profiles p ON p.id = tm.user_id
    WHERE tm.team_id = target_run.team_id
      AND NOT COALESCE(p.is_test_user, false)
  ), run_instances AS (
    SELECT
      pi.id,
      pi.user_id,
      pi.team_id,
      pi.status,
      public.evidence_eligibility_reason(
        pi.id,
        '56d-transfer-v2-2026-07'
      ) AS eligibility_reason
    FROM public.program_instances pi
    JOIN athletes a ON a.user_id = pi.user_id
    WHERE pi.program_run_id = target_run.id
      AND NOT COALESCE(pi.is_test_instance, false)
  ), validated_pre AS (
    SELECT a.user_id, a.program_instance_id
    FROM public.assessments a
    JOIN run_instances ri
      ON ri.id = a.program_instance_id AND ri.user_id = a.user_id
    WHERE a.timing = 'pre'
      AND a.assessment_type IN ('csai2r', 'smtq', 'flow_short')
    GROUP BY a.user_id, a.program_instance_id
    HAVING COUNT(DISTINCT a.assessment_type) = 3
  ), integrity AS (
    SELECT
      (
        SELECT COUNT(*)::integer
        FROM (
          SELECT dc.user_id, dc.program_instance_id, dc.date
          FROM public.daily_checkins dc
          JOIN run_instances ri
            ON ri.id = dc.program_instance_id AND ri.user_id = dc.user_id
          GROUP BY dc.user_id, dc.program_instance_id, dc.date
          HAVING COUNT(*) > 1
        ) duplicates
      ) AS duplicate_checkins,
      (
        SELECT COUNT(*)::integer
        FROM public.user_day_completion udc
        JOIN run_instances ri
          ON ri.id = udc.program_instance_id AND ri.user_id = udc.user_id
        JOIN public.user_day_assignments uda ON uda.id = udc.assignment_id
        WHERE udc.completion_status = 'completed'
          AND NOT EXISTS (
            SELECT 1
            FROM public.daily_checkins dc
            WHERE dc.user_id = udc.user_id
              AND dc.program_instance_id = udc.program_instance_id
              AND dc.date = uda.date
          )
      ) AS completions_without_checkin,
      (
        SELECT COUNT(*)::integer
        FROM run_instances ri
        WHERE ri.team_id IS DISTINCT FROM target_run.team_id
      ) AS run_instance_team_mismatches,
      (
        SELECT COUNT(*)::integer
        FROM public.program_instances pi
        JOIN public.profiles p ON p.id = pi.user_id
        WHERE pi.program_run_id = target_run.id
          AND NOT COALESCE(pi.is_test_instance, false)
          AND NOT COALESCE(p.is_test_user, false)
          AND NOT EXISTS (
            SELECT 1 FROM athletes a WHERE a.user_id = pi.user_id
          )
      ) AS run_instances_outside_team_roster,
      (
        SELECT COUNT(*)::integer
        FROM (
          SELECT ri.user_id
          FROM run_instances ri
          GROUP BY ri.user_id
          HAVING COUNT(*) > 1
        ) duplicated_run_instances
      ) AS multiple_run_instances,
      (
        SELECT COUNT(*)::integer
        FROM (
          SELECT pi.user_id
          FROM public.program_instances pi
          JOIN athletes a ON a.user_id = pi.user_id
          WHERE pi.status = 'active'
            AND NOT COALESCE(pi.is_test_instance, false)
          GROUP BY pi.user_id
          HAVING COUNT(*) > 1
        ) multiple_active
      ) AS multiple_active_instances
  ), counts AS (
    SELECT
      (SELECT COUNT(*)::integer FROM athletes) AS athletes_total,
      (SELECT COUNT(DISTINCT user_id)::integer FROM run_instances) AS athletes_with_instance,
      (SELECT COUNT(*)::integer FROM run_instances WHERE status = 'active') AS active_instances,
      (
        SELECT COUNT(DISTINCT user_id)::integer
        FROM run_instances
        WHERE eligibility_reason IN ('eligible', 'eligible_minor')
      ) AS evidence_eligible,
      (SELECT COUNT(DISTINCT user_id)::integer FROM validated_pre) AS validated_pre_complete,
      (
        SELECT COUNT(DISTINCT dc.user_id)::integer
        FROM public.daily_checkins dc
        JOIN run_instances ri
          ON ri.id = dc.program_instance_id AND ri.user_id = dc.user_id
        WHERE dc.date = CURRENT_DATE
      ) AS checkins_today,
      (
        SELECT COUNT(DISTINCT dc.user_id)::integer
        FROM public.daily_checkins dc
        JOIN run_instances ri
          ON ri.id = dc.program_instance_id AND ri.user_id = dc.user_id
        WHERE dc.date >= CURRENT_DATE - 6
      ) AS active_7d,
      (
        SELECT COUNT(DISTINCT udc.user_id)::integer
        FROM public.user_day_completion udc
        JOIN run_instances ri
          ON ri.id = udc.program_instance_id AND ri.user_id = udc.user_id
        WHERE udc.completion_status = 'completed'
          AND udc.day_number = 1
      ) AS day_1_completed,
      (
        SELECT COUNT(*)::integer
        FROM public.athlete_transfer_observations ato
        JOIN run_instances ri
          ON ri.id = ato.program_instance_id AND ri.user_id = ato.user_id
        WHERE ato.program_run_id = target_run.id
          AND ato.protocol_version = '56d-transfer-v2-2026-07'
          AND NOT COALESCE(ato.is_test, false)
          AND ri.eligibility_reason IN ('eligible', 'eligible_minor')
      ) AS transfer_measurements,
      (
        SELECT COUNT(*)::integer
        FROM public.coach_evidence_reviews cer
        WHERE cer.program_run_id = target_run.id
          AND cer.scope_type = 'team'
          AND NOT COALESCE(cer.is_test, false)
      ) AS coach_weekly_reviews
  ), state AS (
    SELECT
      LEAST(
        56,
        GREATEST(
          0,
          CASE
            WHEN target_run.started_at IS NULL THEN 0
            ELSE (CURRENT_DATE - target_run.started_at) + 1
          END
        )
      )::integer AS current_program_day,
      c.*,
      i.*
    FROM counts c
    CROSS JOIN integrity i
  ), classified AS (
    SELECT
      s.*,
      (
        SELECT COUNT(*)::integer
        FROM public.evidence_transfer_schedule ets
        WHERE ets.protocol_version = '56d-transfer-v2-2026-07'
          AND ets.day_number <= s.current_program_day
      ) AS transfer_points_due_per_athlete,
      LEAST(8, FLOOR(s.current_program_day / 7.0))::integer AS coach_reviews_due,
      CASE
        WHEN target_run.status <> 'active'
          OR target_run.started_at IS NULL
          OR s.athletes_total = 0
          OR s.athletes_with_instance <> s.athletes_total
          OR s.active_instances <> s.athletes_total
          OR s.duplicate_checkins > 0
          OR s.completions_without_checkin > 0
          OR s.run_instance_team_mismatches > 0
          OR s.run_instances_outside_team_roster > 0
          OR s.multiple_run_instances > 0
          OR s.multiple_active_instances > 0
        THEN 'RED'
        WHEN s.athletes_total < 5
          OR s.evidence_eligible < s.athletes_total
          OR s.validated_pre_complete < s.athletes_total
        THEN 'YELLOW'
        ELSE 'GREEN'
      END AS readiness_status
    FROM state s
  )
  SELECT jsonb_build_object(
    'schema_version', 'mahleos-pilot-readiness-v1',
    'generated_at', now(),
    'reporting_timezone', 'UTC',
    'program_run_id', target_run.id,
    'run_status', target_run.status,
    'started_at', target_run.started_at,
    'ended_at', target_run.ended_at,
    'status', c.readiness_status,
    'current_program_day', c.current_program_day,
    'setup', jsonb_build_object(
      'athletes', c.athletes_total,
      'with_program_instance', c.athletes_with_instance,
      'active_instances', c.active_instances,
      'run_instance_team_mismatches', c.run_instance_team_mismatches,
      'run_instances_outside_team_roster', c.run_instances_outside_team_roster,
      'multiple_run_instances', c.multiple_run_instances,
      'multiple_active_instances', c.multiple_active_instances
    ),
    'evidence_authorization', jsonb_build_object(
      'eligible', c.evidence_eligible,
      'not_eligible', GREATEST(c.athletes_total - c.evidence_eligible, 0),
      'complete', c.athletes_total > 0 AND c.evidence_eligible = c.athletes_total
    ),
    'pre_measurement', jsonb_build_object(
      'validated_complete', c.validated_pre_complete,
      'validated_missing', GREATEST(c.athletes_total - c.validated_pre_complete, 0)
    ),
    'daily_tracking', jsonb_build_object(
      'day_1_completed', c.day_1_completed,
      'checkins_today', c.checkins_today,
      'active_7d', c.active_7d,
      'inactive_7d', GREATEST(c.athletes_total - c.active_7d, 0)
    ),
    'transfer_tracking', jsonb_build_object(
      'measurements_completed', c.transfer_measurements,
      'points_due_per_athlete', c.transfer_points_due_per_athlete,
      'measurements_expected', c.transfer_points_due_per_athlete * c.evidence_eligible
    ),
    'coach_tracking', jsonb_build_object(
      'weekly_reviews_completed', c.coach_weekly_reviews,
      'weekly_reviews_due', c.coach_reviews_due
    ),
    'data_quality', jsonb_build_object(
      'duplicate_checkins', c.duplicate_checkins,
      'completions_without_checkin', c.completions_without_checkin,
      'run_instance_team_mismatches', c.run_instance_team_mismatches,
      'run_instances_outside_team_roster', c.run_instances_outside_team_roster,
      'multiple_run_instances', c.multiple_run_instances,
      'aggregate_visible', c.evidence_eligible >= 5,
      'low_confidence', c.evidence_eligible >= 5 AND c.evidence_eligible < 10,
      'minimum_aggregate_n', 5
    ),
    'test_data_included', false,
    'privacy_level', 'run_scoped_operational_counts_only',
    'privacy_exclusions', jsonb_build_array(
      'team_name',
      'athlete_names',
      'user_ids',
      'missing_player_lists',
      'individual_scores',
      'coach_observation_values',
      'journal_text',
      'reflection'
    )
  ) INTO result
  FROM classified c;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public._mahleos_system_health()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public._mahleos_tracking_quality()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public._mahleos_feedback_status()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public._mahleos_pilot_readiness(uuid)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.read_mahleos_operational_view(
  _request_id uuid,
  _client_id text,
  _view_name text DEFAULT 'daily_brief',
  _program_run_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  payload jsonb;
  response_checksum text;
  recent_requests integer := 0;
  audit_program_run_id uuid;
BEGIN
  IF _request_id IS NULL
     OR _client_id IS NULL
     OR _client_id !~ '^[a-z0-9][a-z0-9_-]{2,63}$'
     OR _view_name NOT IN (
       'daily_brief',
       'system_health',
       'tracking_quality',
       'feedback_status',
       'pilot_readiness'
     )
     OR (_view_name = 'pilot_readiness' AND _program_run_id IS NULL)
     OR (_view_name <> 'pilot_readiness' AND _program_run_id IS NOT NULL) THEN
    IF _request_id IS NOT NULL
       AND _client_id ~ '^[a-z0-9][a-z0-9_-]{2,63}$'
       AND _view_name IN (
         'daily_brief',
         'system_health',
         'tracking_quality',
         'feedback_status',
         'pilot_readiness'
       ) THEN
      INSERT INTO public.mahleos_operations_access_log(
        request_id, client_id, view_name, program_run_id, outcome
      ) VALUES (
        _request_id, _client_id, _view_name, NULL, 'invalid_request'
      ) ON CONFLICT (request_id) DO NOTHING;
    END IF;
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_request');
  END IF;

  IF _program_run_id IS NOT NULL THEN
    SELECT pr.id
    INTO audit_program_run_id
    FROM public.program_runs pr
    WHERE pr.id = _program_run_id
    FOR KEY SHARE;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(_client_id, 0)
  );

  IF EXISTS (
    SELECT 1
    FROM public.mahleos_operations_access_log moal
    WHERE moal.request_id = _request_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_request');
  END IF;

  SELECT COUNT(*)::integer
  INTO recent_requests
  FROM public.mahleos_operations_access_log moal
  WHERE moal.client_id = _client_id
    AND moal.requested_at >= now() - interval '1 minute';

  IF recent_requests >= 30 THEN
    INSERT INTO public.mahleos_operations_access_log(
      request_id, client_id, view_name, program_run_id, outcome
    ) VALUES (
      _request_id, _client_id, _view_name, audit_program_run_id, 'rate_limited'
    ) ON CONFLICT (request_id) DO NOTHING;
    RETURN jsonb_build_object('ok', false, 'error', 'rate_limited');
  END IF;

  payload := CASE _view_name
    WHEN 'daily_brief' THEN jsonb_build_object(
      'schema_version', 'mahleos-daily-brief-v1',
      'generated_at', now(),
      'reporting_timezone', 'UTC',
      'system_health', public._mahleos_system_health(),
      'tracking_quality', public._mahleos_tracking_quality(),
      'feedback_status', public._mahleos_feedback_status(),
      'claim_boundary', 'operational monitoring only; no effectiveness or causal conclusion'
    )
    WHEN 'system_health' THEN public._mahleos_system_health()
    WHEN 'tracking_quality' THEN public._mahleos_tracking_quality()
    WHEN 'feedback_status' THEN public._mahleos_feedback_status()
    WHEN 'pilot_readiness' THEN public._mahleos_pilot_readiness(_program_run_id)
  END;

  IF payload IS NULL THEN
    INSERT INTO public.mahleos_operations_access_log(
      request_id, client_id, view_name, program_run_id, outcome
    ) VALUES (
      _request_id, _client_id, _view_name, audit_program_run_id, 'not_found'
    ) ON CONFLICT (request_id) DO NOTHING;
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  response_checksum := encode(
    extensions.digest(convert_to(payload::text, 'UTF8'), 'sha256'),
    'hex'
  );

  INSERT INTO public.mahleos_operations_access_log(
    request_id,
    client_id,
    view_name,
    program_run_id,
    outcome,
    response_checksum
  ) VALUES (
    _request_id,
    _client_id,
    _view_name,
    audit_program_run_id,
    'served',
    response_checksum
  ) ON CONFLICT (request_id) DO NOTHING;

  RETURN jsonb_build_object(
    'ok', true,
    'request_id', _request_id,
    'view', _view_name,
    'checksum_algorithm', 'sha256',
    'response_checksum', response_checksum,
    'data', payload
  );
END;
$$;

REVOKE ALL ON FUNCTION public.read_mahleos_operational_view(uuid, text, text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.read_mahleos_operational_view(uuid, text, text, uuid)
  TO service_role;

COMMENT ON TABLE public.mahleos_operations_access_log IS
  'Append-only MahleOS operations audit. Stores request metadata and checksums, never response payloads, user identifiers or private content.';
COMMENT ON FUNCTION public.read_mahleos_operational_view(uuid, text, text, uuid) IS
  'Service-role-only, allow-listed operational read contract for MahleOS. It returns aggregate counts and sanitized technical signals only.';

COMMIT;
