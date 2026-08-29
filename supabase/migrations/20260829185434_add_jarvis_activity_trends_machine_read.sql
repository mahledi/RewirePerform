-- Expose the existing admin activity trend contract through the fixed,
-- machine-authenticated MahleOS reader. This migration adds no general table
-- access and keeps the aggregate implementation uncallable by API roles.

BEGIN;

ALTER TABLE public.mahleos_operations_access_log
  DROP CONSTRAINT IF EXISTS mahleos_operations_access_log_view_name_check;

ALTER TABLE public.mahleos_operations_access_log
  ADD CONSTRAINT mahleos_operations_access_log_view_name_check CHECK (
    view_name IN (
      'daily_brief', 'system_health', 'tracking_quality', 'feedback_status',
      'pilot_readiness', 'pilot_catalog', 'solo_readiness', 'evidence_status',
      'admin_overview', 'admin_teams', 'admin_comprehension',
      'admin_feedback_metadata', 'admin_partner_requests',
      'admin_activity_trends'
    )
  );

CREATE OR REPLACE FUNCTION public._mahleos_admin_activity_trends()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  WITH bounds AS MATERIALIZED (
    SELECT
      (pg_catalog.timezone('UTC', pg_catalog.now()))::date - 13 AS previous_start,
      (pg_catalog.timezone('UTC', pg_catalog.now()))::date - 7 AS previous_end,
      (pg_catalog.timezone('UTC', pg_catalog.now()))::date - 6 AS current_start,
      (pg_catalog.timezone('UTC', pg_catalog.now()))::date AS current_end
  ), production_athletes AS MATERIALIZED (
    SELECT DISTINCT profile.id
    FROM public.profiles profile
    INNER JOIN public.user_roles role
      ON role.user_id = profile.id
     AND role.role = 'athlete'::public.app_role
    WHERE NOT COALESCE(profile.is_test_user, false)
  ), raw_events AS MATERIALIZED (
    SELECT
      checkin.user_id,
      checkin.program_instance_id,
      checkin.date AS event_date,
      'checkin'::text AS event_kind
    FROM public.daily_checkins checkin
    INNER JOIN production_athletes athlete ON athlete.id = checkin.user_id
    CROSS JOIN bounds
    WHERE checkin.user_id IS NOT NULL
      AND checkin.date BETWEEN bounds.previous_start AND bounds.current_end

    UNION ALL

    SELECT
      completion.user_id,
      completion.program_instance_id,
      (pg_catalog.timezone('UTC', COALESCE(completion.completed_at, completion.created_at)))::date AS event_date,
      'completed_day'::text AS event_kind
    FROM public.user_day_completion completion
    INNER JOIN production_athletes athlete ON athlete.id = completion.user_id
    CROSS JOIN bounds
    WHERE completion.completion_status = 'completed'
      AND (pg_catalog.timezone('UTC', COALESCE(completion.completed_at, completion.created_at)))::date
        BETWEEN bounds.previous_start AND bounds.current_end
  ), classified_events AS MATERIALIZED (
    SELECT
      event.user_id,
      event.event_date,
      event.event_kind,
      CASE
        WHEN event.program_instance_id IS NULL THEN 'unclassified'
        WHEN COALESCE(instance.team_id, run.team_id) IS NULL
             AND instance.program_run_id IS NULL THEN 'solo'
        WHEN team.id IS NOT NULL THEN 'team'
        ELSE 'unclassified'
      END AS participation_mode
    FROM raw_events event
    LEFT JOIN public.program_instances instance
      ON instance.id = event.program_instance_id
    LEFT JOIN public.program_runs run
      ON run.id = instance.program_run_id
    LEFT JOIN public.teams team
      ON team.id = COALESCE(instance.team_id, run.team_id)
    WHERE (
        event.program_instance_id IS NULL
        OR (
          instance.id IS NOT NULL
          AND instance.user_id = event.user_id
          AND NOT COALESCE(instance.is_test_instance, false)
        )
      )
      AND NOT COALESCE(team.is_test_team, false)
  ), segment_names(participation_mode, sort_order) AS (
    VALUES ('all'::text, 1), ('team'::text, 2), ('solo'::text, 3)
  ), segment_metrics AS MATERIALIZED (
    SELECT
      segment.participation_mode,
      segment.sort_order,
      COUNT(DISTINCT event.user_id)::integer AS sample_size,
      COUNT(DISTINCT event.user_id) FILTER (
        WHERE event.event_date BETWEEN bounds.previous_start AND bounds.previous_end
      )::integer AS previous_active_athletes,
      COUNT(DISTINCT event.user_id) FILTER (
        WHERE event.event_date BETWEEN bounds.current_start AND bounds.current_end
      )::integer AS current_active_athletes,
      COUNT(*) FILTER (
        WHERE event.event_kind = 'checkin'
          AND event.event_date BETWEEN bounds.previous_start AND bounds.previous_end
      )::integer AS previous_checkins,
      COUNT(*) FILTER (
        WHERE event.event_kind = 'checkin'
          AND event.event_date BETWEEN bounds.current_start AND bounds.current_end
      )::integer AS current_checkins,
      COUNT(*) FILTER (
        WHERE event.event_kind = 'completed_day'
          AND event.event_date BETWEEN bounds.previous_start AND bounds.previous_end
      )::integer AS previous_completed_days,
      COUNT(*) FILTER (
        WHERE event.event_kind = 'completed_day'
          AND event.event_date BETWEEN bounds.current_start AND bounds.current_end
      )::integer AS current_completed_days
    FROM segment_names segment
    CROSS JOIN bounds
    LEFT JOIN classified_events event
      ON segment.participation_mode = 'all'
      OR event.participation_mode = segment.participation_mode
    GROUP BY segment.participation_mode, segment.sort_order
  ), unclassified AS (
    SELECT
      COUNT(*) FILTER (
        WHERE event.event_date BETWEEN bounds.previous_start AND bounds.previous_end
      )::integer AS previous_events,
      COUNT(*) FILTER (
        WHERE event.event_date BETWEEN bounds.current_start AND bounds.current_end
      )::integer AS current_events
    FROM classified_events event
    CROSS JOIN bounds
    WHERE event.participation_mode = 'unclassified'
  )
  SELECT pg_catalog.jsonb_build_object(
    'schema_version', 'admin-activity-trends-v1',
    'generated_at', pg_catalog.now(),
    'reporting_timezone', 'UTC',
    'window_days', 7,
    'previous_window', pg_catalog.jsonb_build_object(
      'start_date', bounds.previous_start,
      'end_date', bounds.previous_end
    ),
    'current_window', pg_catalog.jsonb_build_object(
      'start_date', bounds.current_start,
      'end_date', bounds.current_end
    ),
    'segments', COALESCE((
      SELECT pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'participation_mode', metric.participation_mode,
          'sample_size', metric.sample_size,
          'sufficient_data', metric.sample_size >= 5,
          'previous_active_athletes', CASE WHEN metric.sample_size >= 5 THEN metric.previous_active_athletes END,
          'current_active_athletes', CASE WHEN metric.sample_size >= 5 THEN metric.current_active_athletes END,
          'active_athlete_delta', CASE WHEN metric.sample_size >= 5 THEN metric.current_active_athletes - metric.previous_active_athletes END,
          'active_athlete_change_rate', CASE
            WHEN metric.sample_size >= 5 AND metric.previous_active_athletes > 0
              THEN pg_catalog.round(
                (metric.current_active_athletes - metric.previous_active_athletes)::numeric
                  / metric.previous_active_athletes,
                4
              )
          END,
          'direction', CASE
            WHEN metric.sample_size < 5 THEN 'insufficient_data'
            WHEN metric.current_active_athletes > metric.previous_active_athletes THEN 'up'
            WHEN metric.current_active_athletes < metric.previous_active_athletes THEN 'down'
            ELSE 'flat'
          END,
          'previous_checkins', CASE WHEN metric.sample_size >= 5 THEN metric.previous_checkins END,
          'current_checkins', CASE WHEN metric.sample_size >= 5 THEN metric.current_checkins END,
          'previous_completed_days', CASE WHEN metric.sample_size >= 5 THEN metric.previous_completed_days END,
          'current_completed_days', CASE WHEN metric.sample_size >= 5 THEN metric.current_completed_days END
        )
        ORDER BY metric.sort_order
      )
      FROM segment_metrics metric
    ), '[]'::jsonb),
    'data_quality', pg_catalog.jsonb_build_object(
      'previous_unclassified_events', unclassified.previous_events,
      'current_unclassified_events', unclassified.current_events,
      'unclassified_events_in_overall', true
    ),
    'privacy', pg_catalog.jsonb_build_object(
      'minimum_distinct_athletes_per_segment', 5,
      'test_profiles_excluded', true,
      'test_program_instances_excluded', true,
      'test_teams_excluded', true,
      'names_or_emails_included', false,
      'direct_identifiers_included', false,
      'individual_rows_included', false,
      'free_text_included', false,
      'observational_not_causal', true
    )
  )
  FROM bounds
  CROSS JOIN unclassified;
$$;

REVOKE ALL ON FUNCTION public._mahleos_admin_activity_trends()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_admin_activity_trends()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  actor_id uuid := auth.uid();
BEGIN
  IF actor_id IS NULL
     OR NOT public.has_role(actor_id, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'admin_role_required';
  END IF;

  RETURN public._mahleos_admin_activity_trends();
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_activity_trends()
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_activity_trends()
  TO authenticated;

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
       'daily_brief', 'system_health', 'tracking_quality', 'feedback_status',
       'pilot_readiness', 'pilot_catalog', 'solo_readiness', 'evidence_status',
       'admin_overview', 'admin_teams', 'admin_comprehension',
       'admin_feedback_metadata', 'admin_partner_requests',
       'admin_activity_trends'
     )
     OR (_view_name = 'pilot_readiness' AND _program_run_id IS NULL)
     OR (_view_name <> 'pilot_readiness' AND _program_run_id IS NOT NULL) THEN
    IF _request_id IS NOT NULL
       AND _client_id ~ '^[a-z0-9][a-z0-9_-]{2,63}$'
       AND _view_name IN (
         'daily_brief', 'system_health', 'tracking_quality', 'feedback_status',
         'pilot_readiness', 'pilot_catalog', 'solo_readiness', 'evidence_status',
         'admin_overview', 'admin_teams', 'admin_comprehension',
         'admin_feedback_metadata', 'admin_partner_requests',
         'admin_activity_trends'
       ) THEN
      INSERT INTO public.mahleos_operations_access_log(
        request_id, client_id, view_name, program_run_id, outcome
      ) VALUES (
        _request_id, _client_id, _view_name, NULL, 'invalid_request'
      ) ON CONFLICT (request_id) DO NOTHING;
    END IF;
    RETURN pg_catalog.jsonb_build_object('ok', false, 'error', 'invalid_request');
  END IF;

  IF _program_run_id IS NOT NULL THEN
    SELECT run.id INTO audit_program_run_id
    FROM public.program_runs run
    WHERE run.id = _program_run_id
    FOR KEY SHARE;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(_client_id, 0));

  IF EXISTS (SELECT 1 FROM public.mahleos_operations_access_log log WHERE log.request_id = _request_id) THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'error', 'invalid_request');
  END IF;

  SELECT COUNT(*)::integer INTO recent_requests
  FROM public.mahleos_operations_access_log log
  WHERE log.client_id = _client_id
    AND log.requested_at >= pg_catalog.now() - interval '1 minute';

  IF recent_requests >= 30 THEN
    INSERT INTO public.mahleos_operations_access_log(
      request_id, client_id, view_name, program_run_id, outcome
    ) VALUES (
      _request_id, _client_id, _view_name, audit_program_run_id, 'rate_limited'
    ) ON CONFLICT (request_id) DO NOTHING;
    RETURN pg_catalog.jsonb_build_object('ok', false, 'error', 'rate_limited');
  END IF;

  payload := CASE _view_name
    WHEN 'daily_brief' THEN pg_catalog.jsonb_build_object(
      'schema_version', 'mahleos-daily-brief-v1',
      'generated_at', pg_catalog.now(),
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
    WHEN 'pilot_catalog' THEN public._mahleos_pilot_catalog()
    WHEN 'solo_readiness' THEN public._mahleos_solo_readiness()
    WHEN 'evidence_status' THEN public._mahleos_evidence_status()
    WHEN 'admin_overview' THEN public._mahleos_admin_overview()
    WHEN 'admin_teams' THEN public._mahleos_admin_teams()
    WHEN 'admin_comprehension' THEN public._mahleos_admin_comprehension()
    WHEN 'admin_feedback_metadata' THEN public._mahleos_admin_feedback_metadata()
    WHEN 'admin_partner_requests' THEN public._mahleos_admin_partner_requests()
    WHEN 'admin_activity_trends' THEN public._mahleos_admin_activity_trends()
  END;

  IF payload IS NULL THEN
    INSERT INTO public.mahleos_operations_access_log(
      request_id, client_id, view_name, program_run_id, outcome
    ) VALUES (
      _request_id, _client_id, _view_name, audit_program_run_id, 'not_found'
    ) ON CONFLICT (request_id) DO NOTHING;
    RETURN pg_catalog.jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  response_checksum := pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(payload::text, 'UTF8'), 'sha256'),
    'hex'
  );

  INSERT INTO public.mahleos_operations_access_log(
    request_id, client_id, view_name, program_run_id, outcome, response_checksum
  ) VALUES (
    _request_id, _client_id, _view_name, audit_program_run_id, 'served', response_checksum
  ) ON CONFLICT (request_id) DO NOTHING;

  RETURN pg_catalog.jsonb_build_object(
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

COMMENT ON FUNCTION public._mahleos_admin_activity_trends() IS
  'Fixed Production activity aggregates for MahleOS across equal non-overlapping UTC windows. Direct execution is revoked from API roles.';
COMMENT ON FUNCTION public.get_admin_activity_trends() IS
  'Admin-only activity trends. Returns aggregate all/team/solo segments, excludes canonical test data, suppresses segments below n=5, and never returns identifiers or free text.';

COMMIT;
