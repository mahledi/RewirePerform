BEGIN;

-- Extend the identifier-free critical-journey summary with an authoritative
-- count of newly created Auth accounts. Failed signup and login attempts are
-- deliberately still NULL: neither authenticated app events nor
-- auth.audit_log_entries prove all rejected password attempts.
ALTER FUNCTION public._mahleos_system_health()
  RENAME TO _mahleos_system_health_pre_auth_signup_success_v1_4;

CREATE OR REPLACE FUNCTION public._mahleos_system_health()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  WITH base AS (
    SELECT public._mahleos_system_health_pre_auth_signup_success_v1_4() AS payload
  ), signup_success AS (
    SELECT COUNT(*)::integer AS accounts_created_24h
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.id = au.id
    WHERE au.created_at >= now() - interval '24 hours'
      AND NOT COALESCE(p.is_test_user, false)
  )
  SELECT
    jsonb_set(
      jsonb_set(
        base.payload,
        '{schema_version}',
        to_jsonb('mahleos-system-health-v1.4'::text),
        false
      ),
      '{critical_journey_coverage,auth_signup}',
      jsonb_build_object(
        'coverage', 'SERVER_ACCOUNT_CREATION_ONLY',
        'authority', 'auth.users',
        'successes_24h', signup_success.accounts_created_24h,
        'failures_24h', NULL
      ),
      false
    )
  FROM base
  CROSS JOIN signup_success;
$$;

REVOKE ALL ON FUNCTION public._mahleos_system_health_pre_auth_signup_success_v1_4()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public._mahleos_system_health()
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION public._mahleos_system_health() IS
  'Identifier-free critical-journey aggregates. Auth account creations are authoritative and test-excluded; failed signup/login attempts stay explicitly unobserved and null.';

COMMIT;
