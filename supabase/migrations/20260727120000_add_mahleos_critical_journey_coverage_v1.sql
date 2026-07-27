BEGIN;

-- Preserve the reviewed aggregate health implementation and wrap it with an
-- explicit coverage map. A zero counter must never imply that an unconnected
-- source is healthy.
ALTER FUNCTION public._mahleos_system_health()
  RENAME TO _mahleos_system_health_v1;

CREATE OR REPLACE FUNCTION public._mahleos_system_health()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  WITH base AS (
    SELECT public._mahleos_system_health_v1() AS payload
  ), journey AS (
    SELECT
      COUNT(*) FILTER (
        WHERE ael.event_name = 'team_join_attempt'
          AND ael.status = 'failed'
          AND NOT COALESCE(ael.is_test, false)
          AND ael.created_at >= now() - interval '24 hours'
      )::integer AS team_join_failures_24h,
      COALESCE((
        SELECT ss.enforcement_enabled
        FROM minor_auth.system_settings ss
        WHERE ss.singleton
      ), false) AS minor_enforcement_enabled,
      (
        SELECT COUNT(*)::integer
        FROM minor_auth.guardian_challenges gc
        JOIN public.profiles p ON p.id = gc.user_id
        WHERE gc.delivery_status = 'failed'
          AND gc.created_at >= now() - interval '24 hours'
          AND NOT COALESCE(p.is_test_user, false)
      ) AS minor_delivery_failures_24h
    FROM public.app_event_log ael
  )
  SELECT
    base.payload
    || jsonb_build_object(
      'schema_version', 'mahleos-system-health-v1.2',
      'critical_journey_coverage', jsonb_build_object(
        'auth_login', jsonb_build_object(
          'coverage', 'NOT_CONNECTED',
          'authority', 'supabase_auth_logs',
          'failures_24h', NULL
        ),
        'auth_signup', jsonb_build_object(
          'coverage', 'STRUCTURAL_ONLY',
          'authority', 'identity_integrity',
          'failures_24h', NULL
        ),
        'team_join', jsonb_build_object(
          'coverage', 'ADVISORY_ONLY',
          'authority', 'authenticated_incident_log',
          'failures_24h', journey.team_join_failures_24h
        ),
        'minor_authorization', jsonb_build_object(
          'coverage', CASE
            WHEN journey.minor_enforcement_enabled
              THEN 'STRUCTURAL_AND_DELIVERY_ONLY'
            ELSE 'NOT_CONNECTED'
          END,
          'authority', 'minor_auth_state_machine',
          'failures_24h', CASE
            WHEN journey.minor_enforcement_enabled
              THEN journey.minor_delivery_failures_24h
            ELSE NULL
          END
        )
      )
    )
  FROM base
  CROSS JOIN journey;
$$;

REVOKE ALL ON FUNCTION public._mahleos_system_health_v1()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public._mahleos_system_health()
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION public._mahleos_system_health() IS
  'Aggregate health plus explicit critical-journey source coverage. Unconnected sources return null counters and must not be interpreted as healthy.';

COMMIT;
