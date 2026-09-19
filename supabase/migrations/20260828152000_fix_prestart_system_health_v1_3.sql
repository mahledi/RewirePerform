-- Preserve the documented pre-start team state in the MahleOS health signal.
-- An active team instance without a program_run_id is valid until that team has
-- an active run. Once a run is active, an unassigned production instance is a
-- genuine integrity deviation. No identifiers or row payloads leave this RPC.

BEGIN;

ALTER FUNCTION public._mahleos_system_health()
  RENAME TO _mahleos_system_health_pre_prestart_fix_v1_3;

CREATE OR REPLACE FUNCTION public._mahleos_system_health()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  WITH base AS (
    SELECT public._mahleos_system_health_pre_prestart_fix_v1_3() AS payload
  ), corrected_program_integrity AS (
    SELECT COUNT(*)::integer AS active_team_instances_without_run
    FROM public.program_instances instance
    JOIN public.profiles profile ON profile.id = instance.user_id
    JOIN public.teams team ON team.id = instance.team_id
    WHERE instance.status = 'active'
      AND instance.team_id IS NOT NULL
      AND instance.program_run_id IS NULL
      AND NOT COALESCE(instance.is_test_instance, false)
      AND NOT COALESCE(profile.is_test_user, false)
      AND NOT COALESCE(team.is_test_team, false)
      AND EXISTS (
        SELECT 1
        FROM public.program_runs run
        WHERE run.team_id = instance.team_id
          AND run.status = 'active'
      )
  ), metrics AS (
    SELECT
      base.payload,
      corrected.active_team_instances_without_run,
      (base.payload #>> '{identity_integrity,users_missing_profile}')::integer
        AS users_missing_profile,
      (base.payload #>> '{identity_integrity,production_profiles_missing_role}')::integer
        AS production_profiles_missing_role,
      (base.payload #>> '{program_integrity,athletes_without_program_instance}')::integer
        AS athletes_without_program_instance,
      (base.payload #>> '{program_integrity,athletes_with_multiple_active_instances}')::integer
        AS athletes_with_multiple_active_instances,
      (base.payload #>> '{program_integrity,active_runs_without_start_date}')::integer
        AS active_runs_without_start_date,
      (base.payload #>> '{tracking_integrity_7d,checkins_missing_instance}')::integer
        AS checkins_missing_instance,
      (base.payload #>> '{tracking_integrity_7d,completions_missing_instance}')::integer
        AS completions_missing_instance,
      (base.payload #>> '{tracking_integrity_7d,assessments_missing_instance}')::integer
        AS assessments_missing_instance,
      (base.payload #>> '{tracking_integrity_7d,questionnaires_missing_instance}')::integer
        AS questionnaires_missing_instance,
      (base.payload #>> '{tracking_integrity_7d,comprehension_missing_instance}')::integer
        AS comprehension_missing_instance,
      (base.payload #>> '{operations_24h,failed_events}')::integer
        AS failed_events,
      (base.payload #>> '{operations_24h,critical_failed_events}')::integer
        AS critical_failed_events,
      (base.payload #>> '{feedback,open}')::integer AS open_feedback
    FROM base
    CROSS JOIN corrected_program_integrity corrected
  ), projected AS (
    SELECT
      jsonb_set(
        metrics.payload,
        ARRAY['program_integrity', 'active_team_instances_without_run'],
        to_jsonb(metrics.active_team_instances_without_run),
        false
      ) AS payload,
      CASE
        WHEN metrics.users_missing_profile > 0
          OR metrics.production_profiles_missing_role > 0
          OR metrics.athletes_with_multiple_active_instances > 0
          OR metrics.active_team_instances_without_run > 0
          OR metrics.active_runs_without_start_date > 0
          OR metrics.checkins_missing_instance > 0
          OR metrics.completions_missing_instance > 0
          OR metrics.assessments_missing_instance > 0
          OR metrics.questionnaires_missing_instance > 0
          OR metrics.comprehension_missing_instance > 0
          OR metrics.critical_failed_events > 0
        THEN 'RED'::text
        WHEN metrics.athletes_without_program_instance > 0
          OR metrics.failed_events > 0
          OR metrics.open_feedback > 0
        THEN 'YELLOW'::text
        ELSE 'GREEN'::text
      END AS status
    FROM metrics
  )
  SELECT jsonb_set(
    projected.payload,
    ARRAY['status'],
    to_jsonb(projected.status),
    false
  )
  FROM projected;
$$;

REVOKE ALL ON FUNCTION public._mahleos_system_health_pre_prestart_fix_v1_3()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public._mahleos_system_health()
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION public._mahleos_system_health() IS
  'Identifier-free system-health aggregates. Pre-start team instances without a run are valid; only unassigned instances while the team has an active run are integrity deviations.';

COMMIT;
