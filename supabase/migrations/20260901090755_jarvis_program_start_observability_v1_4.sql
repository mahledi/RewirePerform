-- Add identifier-free reconciliation for the complete team-program activation
-- transaction. This intentionally observes state contradictions rather than a
-- single known bug: activated team -> active run -> every production athlete's
-- active instance assigned to that run. No row identifiers leave the helper.

BEGIN;

ALTER FUNCTION public._mahleos_system_health()
  RENAME TO _mahleos_system_health_pre_program_start_observability_v1_4;

CREATE OR REPLACE FUNCTION public._mahleos_system_health()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  WITH base AS (
    SELECT public._mahleos_system_health_pre_program_start_observability_v1_4() AS payload
  ), production_teams AS (
    SELECT team.id, team.program_activated_at
    FROM public.teams team
    WHERE NOT COALESCE(team.is_test_team, false)
      AND NOT COALESCE(team.is_archived, false)
  ), active_runs AS (
    SELECT run.id, run.team_id
    FROM public.program_runs run
    JOIN production_teams team ON team.id = run.team_id
    WHERE run.status = 'active'
  ), production_athletes AS (
    SELECT DISTINCT member.team_id, member.user_id
    FROM public.team_members member
    JOIN production_teams team ON team.id = member.team_id
    JOIN public.user_roles role
      ON role.user_id = member.user_id
     AND role.role = 'athlete'::public.app_role
    JOIN public.profiles profile ON profile.id = member.user_id
    WHERE NOT COALESCE(profile.is_test_user, false)
  ), active_assignments AS (
    SELECT DISTINCT run.id AS run_id, run.team_id, instance.user_id
    FROM active_runs run
    JOIN public.program_instances instance
      ON instance.program_run_id = run.id
     AND instance.team_id = run.team_id
     AND instance.status = 'active'
     AND NOT COALESCE(instance.is_test_instance, false)
    LEFT JOIN public.profiles profile ON profile.id = instance.user_id
    WHERE profile.id IS NULL
       OR NOT COALESCE(profile.is_test_user, false)
  ), run_assignment_reconciliation AS (
    SELECT
      run.id AS run_id,
      run.team_id,
      NOT EXISTS (
        SELECT 1
        FROM production_athletes athlete
        WHERE athlete.team_id = run.team_id
      ) AS has_no_expected_athletes,
      EXISTS (
        SELECT 1
        FROM production_athletes athlete
        WHERE athlete.team_id = run.team_id
          AND NOT EXISTS (
            SELECT 1
            FROM active_assignments assignment
            WHERE assignment.run_id = run.id
              AND assignment.user_id = athlete.user_id
          )
      ) AS has_missing_expected_assignment,
      EXISTS (
        SELECT 1
        FROM active_assignments assignment
        WHERE assignment.run_id = run.id
          AND NOT EXISTS (
            SELECT 1
            FROM production_athletes athlete
            WHERE athlete.team_id = run.team_id
              AND athlete.user_id = assignment.user_id
          )
      ) AS has_unexpected_assignment
    FROM active_runs run
  ), reconciliation AS (
    SELECT
      (
        SELECT COUNT(*)::integer
        FROM production_teams team
        WHERE team.program_activated_at IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM active_runs run
            WHERE run.team_id = team.id
          )
      ) AS activated_teams_without_active_run,
      (
        SELECT COUNT(*)::integer
        FROM production_teams team
        WHERE team.program_activated_at IS NOT NULL
          AND (
            SELECT COUNT(*)
            FROM active_runs run
            WHERE run.team_id = team.id
          ) > 1
      ) AS activated_teams_with_multiple_active_runs,
      (
        SELECT COUNT(*)::integer
        FROM run_assignment_reconciliation check_result
        WHERE check_result.has_no_expected_athletes
           OR check_result.has_missing_expected_assignment
           OR check_result.has_unexpected_assignment
      ) AS active_runs_with_assignment_set_mismatch,
      (
        SELECT COUNT(*)::integer
        FROM production_teams team
        WHERE team.program_activated_at >= now() - interval '24 hours'
          AND (
            SELECT COUNT(*)
            FROM active_runs run
            WHERE run.team_id = team.id
          ) = 1
          AND EXISTS (
            SELECT 1
            FROM run_assignment_reconciliation check_result
            WHERE check_result.team_id = team.id
              AND NOT check_result.has_no_expected_athletes
              AND NOT check_result.has_missing_expected_assignment
              AND NOT check_result.has_unexpected_assignment
          )
      ) AS successful_team_activations_24h
  ), projected AS (
    SELECT
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              jsonb_set(
                base.payload,
                '{schema_version}',
                to_jsonb('mahleos-system-health-v1.5'::text),
                false
              ),
              '{program_integrity,activated_teams_without_active_run}',
              to_jsonb(reconciliation.activated_teams_without_active_run),
              true
            ),
            '{program_integrity,activated_teams_with_multiple_active_runs}',
            to_jsonb(reconciliation.activated_teams_with_multiple_active_runs),
            true
          ),
          '{program_integrity,active_runs_with_assignment_set_mismatch}',
          to_jsonb(reconciliation.active_runs_with_assignment_set_mismatch),
          true
        ),
        '{critical_journey_coverage,program_start}',
        jsonb_build_object(
          'coverage', 'SERVER_ACTIVATION_SUCCESS_AND_STATE_RECONCILIATION',
          'authority', 'teams_program_runs_program_instances',
          'successes_24h', reconciliation.successful_team_activations_24h,
          'failures_24h', NULL,
          'attempts_24h', NULL,
          'state_reconciliation', 'COMPLETE'
        ),
        true
      ) AS payload,
      reconciliation.activated_teams_without_active_run,
      reconciliation.activated_teams_with_multiple_active_runs,
      reconciliation.active_runs_with_assignment_set_mismatch
    FROM base
    CROSS JOIN reconciliation
  )
  SELECT CASE
    WHEN projected.activated_teams_without_active_run > 0
      OR projected.activated_teams_with_multiple_active_runs > 0
      OR projected.active_runs_with_assignment_set_mismatch > 0
    THEN jsonb_set(projected.payload, '{status}', to_jsonb('RED'::text), false)
    ELSE projected.payload
  END
  FROM projected;
$$;

REVOKE ALL ON FUNCTION public._mahleos_system_health_pre_program_start_observability_v1_4()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public._mahleos_system_health()
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION public._mahleos_system_health() IS
  'Identifier-free pilot safety reconciliation. Detects activated production teams without exactly one active run and exact active-run assignment-set mismatches, including empty, missing, or unexpected production assignments. Attempt and failure coverage remains explicitly null.';

COMMIT;
