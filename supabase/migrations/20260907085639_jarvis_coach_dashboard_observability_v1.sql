-- Observe the delivered coach activity snapshot as an outcome contract.
-- The client reports only a bounded row count for an authorized team. The
-- private system-health helper compares that count with the server-side
-- production roster and emits identifier-free counters only.

BEGIN;

ALTER FUNCTION public._mahleos_system_health()
  RENAME TO _mahleos_system_health_pre_coach_dashboard_observability_v1_6;

CREATE OR REPLACE FUNCTION public._mahleos_system_health()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  WITH base AS (
    SELECT public._mahleos_system_health_pre_coach_dashboard_observability_v1_6() AS payload
  ), production_team_expectations AS (
    SELECT
      team.id AS team_id,
      COUNT(DISTINCT member.user_id) FILTER (
        WHERE role.role = 'athlete'::public.app_role
          AND profile.id IS NOT NULL
          AND NOT COALESCE(profile.is_test_user, false)
      )::integer AS expected_athletes
    FROM public.teams team
    LEFT JOIN public.team_members member ON member.team_id = team.id
    LEFT JOIN public.user_roles role ON role.user_id = member.user_id
    LEFT JOIN public.profiles profile ON profile.id = member.user_id
    WHERE NOT COALESCE(team.is_test_team, false)
      AND NOT COALESCE(team.is_archived, false)
    GROUP BY team.id
  ), dashboard_events AS (
    SELECT
      event.team_id,
      event.created_at,
      event.status,
      event.metadata,
      expectation.expected_athletes
    FROM public.app_event_log event
    JOIN production_team_expectations expectation
      ON expectation.team_id = event.team_id
    WHERE event.event_name = 'coach_dashboard_loaded'
      AND event.role = 'coach'
      AND NOT COALESCE(event.is_test, false)
      AND event.created_at >= now() - interval '24 hours'
  ), latest_dashboard_deliveries AS (
    SELECT DISTINCT ON (dashboard_events.team_id)
      dashboard_events.team_id,
      dashboard_events.metadata,
      dashboard_events.expected_athletes
    FROM dashboard_events
    WHERE dashboard_events.status = 'success'
      AND dashboard_events.metadata->>'stage' = 'team_overview_activity_snapshot'
    ORDER BY dashboard_events.team_id, dashboard_events.created_at DESC
  ), dashboard_metrics AS (
    SELECT
      (SELECT COUNT(*)::integer FROM latest_dashboard_deliveries)
        AS successful_deliveries_24h,
      (SELECT COUNT(*)::integer FROM dashboard_events WHERE status = 'failed')
        AS failures_24h,
      (SELECT COUNT(*)::integer
       FROM latest_dashboard_deliveries delivery
       WHERE COALESCE(delivery.metadata->>'item_count', '') ~ '^[0-9]{1,6}$'
         AND (delivery.metadata->>'item_count')::integer <> delivery.expected_athletes)
        AS roster_mismatches_24h,
      (SELECT COUNT(*)::integer
       FROM latest_dashboard_deliveries delivery
       WHERE COALESCE(delivery.metadata->>'item_count', '') !~ '^[0-9]{1,6}$')
        AS unverifiable_successes_24h
  ), projected AS (
    SELECT jsonb_set(
      jsonb_set(
        base.payload,
        '{schema_version}',
        to_jsonb('mahleos-system-health-v1.6'::text),
        false
      ),
      '{critical_journey_coverage,coach_dashboard}',
      jsonb_build_object(
        'coverage', 'AUTHENTICATED_DELIVERY_AND_SERVER_ROSTER_RECONCILIATION',
        'authority', 'authenticated_app_event_log_plus_server_roster',
        'successful_deliveries_24h', dashboard_metrics.successful_deliveries_24h,
        'failures_24h', dashboard_metrics.failures_24h,
        'roster_mismatches_24h', dashboard_metrics.roster_mismatches_24h,
        'unverifiable_successes_24h', dashboard_metrics.unverifiable_successes_24h,
        'state', CASE
          WHEN dashboard_metrics.roster_mismatches_24h > 0 THEN 'MISMATCH'
          WHEN dashboard_metrics.unverifiable_successes_24h > 0 THEN 'UNVERIFIABLE'
          WHEN dashboard_metrics.failures_24h > 0
            AND dashboard_metrics.successful_deliveries_24h > 0 THEN 'PARTIAL_FAILURE'
          WHEN dashboard_metrics.failures_24h > 0 THEN 'FAILED'
          WHEN dashboard_metrics.successful_deliveries_24h > 0 THEN 'OBSERVED_MATCHING'
          ELSE 'NO_RECENT_OBSERVATION'
        END
      ),
      true
    ) AS payload
    FROM base
    CROSS JOIN dashboard_metrics
  )
  SELECT projected.payload
  FROM projected;
$$;

REVOKE ALL ON FUNCTION public._mahleos_system_health_pre_coach_dashboard_observability_v1_6()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public._mahleos_system_health()
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION public._mahleos_system_health() IS
  'Identifier-free system health v1.6. Reconciles bounded authenticated coach activity delivery counts with the server-side production roster; client events remain non-authoritative and test users and teams stay excluded.';

COMMIT;
