-- V1.2 Production reader hardening.
--
-- PostgreSQL grants to PUBLIC are inherited by every role and cannot be
-- overridden with a role-specific REVOKE. pg_net 0.20.3 grants EXECUTE on its
-- functions to PUBLIC, which would otherwise give the dedicated feedback
-- reader unrelated outbound-network capabilities once its LOGIN is enabled.
--
-- Keep Supabase's explicitly supported callers unchanged while removing the
-- implicit PUBLIC path. This migration does not create a credential, enable a
-- machine gate, read application data, or touch the public schema.

BEGIN;

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA net FROM PUBLIC;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA net TO
  supabase_admin,
  supabase_functions_admin,
  postgres,
  anon,
  authenticated,
  service_role;

DO $$
DECLARE
  reader_net_function_count integer;
  reader_public_function_count integer;
  reader_feedback_function_count integer;
BEGIN
  SELECT COUNT(*)::integer
  INTO reader_net_function_count
  FROM pg_catalog.pg_proc procedure
  INNER JOIN pg_catalog.pg_namespace namespace
    ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'net'
    AND pg_catalog.has_schema_privilege(
      'mahleos_feedback_production_reader', namespace.oid, 'USAGE'
    )
    AND pg_catalog.has_function_privilege(
      'mahleos_feedback_production_reader', procedure.oid, 'EXECUTE'
    );

  SELECT COUNT(*)::integer
  INTO reader_public_function_count
  FROM pg_catalog.pg_proc procedure
  INNER JOIN pg_catalog.pg_namespace namespace
    ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'public'
    AND pg_catalog.has_schema_privilege(
      'mahleos_feedback_production_reader', namespace.oid, 'USAGE'
    )
    AND pg_catalog.has_function_privilege(
      'mahleos_feedback_production_reader', procedure.oid, 'EXECUTE'
    );

  SELECT COUNT(*)::integer
  INTO reader_feedback_function_count
  FROM pg_catalog.pg_proc procedure
  INNER JOIN pg_catalog.pg_namespace namespace
    ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'feedback_machine_production'
    AND pg_catalog.has_schema_privilege(
      'mahleos_feedback_production_reader', namespace.oid, 'USAGE'
    )
    AND pg_catalog.has_function_privilege(
      'mahleos_feedback_production_reader', procedure.oid, 'EXECUTE'
    );

  IF reader_net_function_count <> 0 THEN
    RAISE EXCEPTION 'feedback_reader_net_execute_not_closed';
  END IF;
  IF reader_public_function_count <> 0 THEN
    RAISE EXCEPTION 'feedback_reader_public_execute_not_closed';
  END IF;
  IF reader_feedback_function_count <> 1 THEN
    RAISE EXCEPTION 'feedback_reader_function_scope_invalid';
  END IF;
END;
$$;

COMMIT;
