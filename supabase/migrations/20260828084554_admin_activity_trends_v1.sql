-- Admin-only activity trends from two equal, non-overlapping UTC date windows.
-- Production data excludes canonical test profiles, test program instances,
-- and test teams. The RPC returns aggregates only and suppresses every segment
-- below five distinct athletes across the two compared windows.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_admin_activity_trends()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  actor_id uuid := auth.uid();
  payload jsonb;
BEGIN
  IF actor_id IS NULL
     OR NOT public.has_role(actor_id, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'admin_role_required';
  END IF;

  WITH bounds AS MATERIALIZED (
    SELECT
      CURRENT_DATE - 13 AS previous_start,
      CURRENT_DATE - 7 AS previous_end,
      CURRENT_DATE - 6 AS current_start,
      CURRENT_DATE AS current_end
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
  INTO payload
  FROM bounds
  CROSS JOIN unclassified;

  RETURN payload;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_activity_trends()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_activity_trends()
  TO authenticated;

COMMENT ON FUNCTION public.get_admin_activity_trends() IS
  'Admin-only production activity trends across equal non-overlapping 7-day UTC windows. Returns aggregate all/team/solo segments, excludes canonical test data, suppresses segments below n=5, and never returns identifiers or free text.';

COMMIT;
