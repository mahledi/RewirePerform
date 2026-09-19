BEGIN;

-- Extend the existing private aggregate helper without widening its grants.
-- Counters intentionally exclude test profiles and never contain identifiers,
-- invite codes, routes, metadata, IP addresses, user agents, or free text.
ALTER FUNCTION public._mahleos_system_health()
  RENAME TO _mahleos_system_health_pre_critical_journey_v1_1;

CREATE OR REPLACE FUNCTION public._mahleos_system_health()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  WITH base AS (
    SELECT public._mahleos_system_health_pre_critical_journey_v1_1() AS payload
  ), app_journey AS (
    SELECT
      COUNT(*) FILTER (
        WHERE ael.event_name = 'auth_login'
          AND ael.status = 'success'
          AND NOT COALESCE(ael.is_test, false)
          AND ael.created_at >= now() - interval '24 hours'
      )::integer AS auth_login_successes_24h,
      COUNT(*) FILTER (
        WHERE ael.event_name = 'team_join_attempt'
          AND ael.status = 'attempted'
          AND NOT COALESCE(ael.is_test, false)
          AND ael.created_at >= now() - interval '24 hours'
      )::integer AS team_join_attempts_24h,
      COUNT(*) FILTER (
        WHERE ael.event_name = 'team_join_attempt'
          AND ael.status = 'failed'
          AND NOT COALESCE(ael.is_test, false)
          AND ael.created_at >= now() - interval '24 hours'
      )::integer AS team_join_failures_24h,
      COUNT(*) FILTER (
        WHERE ael.event_name = 'team_join_success'
          AND ael.status = 'success'
          AND NOT COALESCE(ael.is_test, false)
          AND ael.created_at >= now() - interval '24 hours'
      )::integer AS team_join_successes_24h
    FROM public.app_event_log ael
  ), minor_journey AS (
    SELECT
      COALESCE((
        SELECT ss.enforcement_enabled
        FROM minor_auth.system_settings ss
        WHERE ss.singleton
      ), false) AS enforcement_enabled,
      (
        SELECT COUNT(*)::integer
        FROM minor_auth.guardian_challenges gc
        JOIN public.profiles p ON p.id = gc.user_id
        WHERE gc.delivery_status = 'failed'
          AND gc.created_at >= now() - interval '24 hours'
          AND NOT COALESCE(p.is_test_user, false)
      ) AS delivery_failures_24h
  )
  SELECT
    base.payload
    || jsonb_build_object(
      'schema_version', 'mahleos-system-health-v1.3',
      'critical_journey_coverage', jsonb_build_object(
        'auth_login', jsonb_build_object(
          'coverage', 'AUTHENTICATED_SUCCESS_ONLY',
          'authority', 'authenticated_app_event_log',
          'successes_24h', app_journey.auth_login_successes_24h,
          'failures_24h', NULL
        ),
        'auth_signup', jsonb_build_object(
          'coverage', 'STRUCTURAL_ONLY',
          'authority', 'identity_integrity',
          'successes_24h', NULL,
          'failures_24h', NULL
        ),
        'team_join', jsonb_build_object(
          'coverage', 'AUTHENTICATED_APP_EVENTS',
          'authority', 'authenticated_app_event_log',
          'attempts_24h', app_journey.team_join_attempts_24h,
          'successes_24h', app_journey.team_join_successes_24h,
          'failures_24h', app_journey.team_join_failures_24h
        ),
        'minor_authorization', jsonb_build_object(
          'coverage', CASE
            WHEN minor_journey.enforcement_enabled
              THEN 'STRUCTURAL_AND_DELIVERY_ONLY'
            ELSE 'NOT_CONNECTED'
          END,
          'authority', 'minor_auth_state_machine',
          'delivery_failures_24h', CASE
            WHEN minor_journey.enforcement_enabled
              THEN minor_journey.delivery_failures_24h
            ELSE NULL
          END
        )
      )
    )
  FROM base
  CROSS JOIN app_journey
  CROSS JOIN minor_journey;
$$;

REVOKE ALL ON FUNCTION public._mahleos_system_health_pre_critical_journey_v1_1()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public._mahleos_system_health()
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION public._mahleos_system_health() IS
  'Identifier-free critical-journey aggregates. Login failures and signup outcomes remain explicitly unobserved; null must never be interpreted as zero.';

COMMIT;
