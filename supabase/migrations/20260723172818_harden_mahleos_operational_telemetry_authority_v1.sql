BEGIN;

-- Browser and native app events are useful operational signals, but they are
-- client-reported and therefore cannot independently establish a global RED
-- state. Structural integrity failures remain RED. Client telemetry can make
-- the status YELLOW until the Guardian reproduces and confirms the incident.
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

REVOKE ALL ON FUNCTION public._mahleos_system_health()
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION public._mahleos_system_health() IS
  'Aggregate health view. Client-reported app events are advisory and cannot independently produce RED.';

COMMIT;
