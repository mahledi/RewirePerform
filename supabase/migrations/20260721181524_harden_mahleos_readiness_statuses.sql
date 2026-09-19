-- Keep operational status conservative: incomplete source coverage must never
-- look healthy to MahleOS. Preserve the published JSON contract while adding
-- stricter classification and due-only measurement counts.

BEGIN;

ALTER FUNCTION public.assign_team_members_to_program_run(uuid)
  SET search_path = pg_catalog;
ALTER FUNCTION public.can_manage_team_program_runs(uuid)
  SET search_path = pg_catalog;

ALTER FUNCTION public._mahleos_tracking_quality()
  RENAME TO _mahleos_tracking_quality_base_v1;

REVOKE ALL ON FUNCTION public._mahleos_tracking_quality_base_v1()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public._mahleos_tracking_quality()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  WITH base AS (
    SELECT public._mahleos_tracking_quality_base_v1() AS payload
  )
  SELECT jsonb_set(
    base.payload,
    '{status}',
    to_jsonb(
      CASE
        WHEN base.payload ->> 'status' IN ('RED', 'YELLOW')
        THEN base.payload ->> 'status'
        WHEN COALESCE((base.payload #>> '{activity,active_instances}')::integer, 0) = 0
        THEN 'YELLOW'
        WHEN COALESCE((base.payload #>> '{activity,active_athletes_7d}')::integer, 0)
          < COALESCE((base.payload #>> '{activity,active_instances}')::integer, 0)
        THEN 'YELLOW'
        WHEN COALESCE((base.payload #>> '{activity,fresh_snapshots_today}')::integer, 0)
          < COALESCE((base.payload #>> '{activity,active_instances}')::integer, 0)
        THEN 'YELLOW'
        ELSE 'GREEN'
      END
    ),
    false
  )
  FROM base;
$$;

REVOKE ALL ON FUNCTION public._mahleos_tracking_quality()
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION public._mahleos_tracking_quality() IS
  'Returns aggregate tracking quality; no active cohort, incomplete 7-day activity, or stale progress snapshots prevent GREEN.';

ALTER FUNCTION public._mahleos_pilot_readiness(uuid)
  RENAME TO _mahleos_pilot_readiness_base_v1;

REVOKE ALL ON FUNCTION public._mahleos_pilot_readiness_base_v1(uuid)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public._mahleos_pilot_readiness(
  _program_run_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  payload jsonb;
  current_program_day integer;
  athletes_total integer;
  active_7d integer;
  day_1_completed integer;
  transfer_measurements_expected integer;
  due_transfer_measurements integer := 0;
  weekly_reviews_due integer;
  due_weekly_reviews integer := 0;
  hardened_status text;
BEGIN
  payload := public._mahleos_pilot_readiness_base_v1(_program_run_id);

  IF payload IS NULL OR payload ->> 'status' = 'TEST_EXCLUDED' THEN
    RETURN payload;
  END IF;

  current_program_day := COALESCE((payload ->> 'current_program_day')::integer, 0);
  athletes_total := COALESCE((payload #>> '{setup,athletes}')::integer, 0);
  active_7d := COALESCE((payload #>> '{daily_tracking,active_7d}')::integer, 0);
  day_1_completed := COALESCE((payload #>> '{daily_tracking,day_1_completed}')::integer, 0);
  transfer_measurements_expected := COALESCE(
    (payload #>> '{transfer_tracking,measurements_expected}')::integer,
    0
  );
  weekly_reviews_due := COALESCE((payload #>> '{coach_tracking,weekly_reviews_due}')::integer, 0);

  SELECT COUNT(*)::integer
  INTO due_transfer_measurements
  FROM public.athlete_transfer_observations ato
  JOIN public.program_instances pi
    ON pi.id = ato.program_instance_id
   AND pi.user_id = ato.user_id
   AND pi.program_run_id = _program_run_id
  JOIN public.evidence_transfer_schedule ets
    ON ets.protocol_version = ato.protocol_version
   AND ets.day_number = ato.day_number
  WHERE ato.program_run_id = _program_run_id
    AND ato.protocol_version = '56d-transfer-v2-2026-07'
    AND ets.day_number <= current_program_day
    AND NOT COALESCE(ato.is_test, false)
    AND public.evidence_eligibility_reason(
      pi.id,
      '56d-transfer-v2-2026-07'
    ) IN ('eligible', 'eligible_minor');

  SELECT COUNT(DISTINCT cer.week_number)::integer
  INTO due_weekly_reviews
  FROM public.coach_evidence_reviews cer
  WHERE cer.program_run_id = _program_run_id
    AND cer.scope_type = 'team'
    AND cer.week_number <= weekly_reviews_due
    AND NOT COALESCE(cer.is_test, false);

  payload := jsonb_set(
    payload,
    '{transfer_tracking,measurements_completed}',
    to_jsonb(COALESCE(due_transfer_measurements, 0)),
    false
  );
  payload := jsonb_set(
    payload,
    '{coach_tracking,weekly_reviews_completed}',
    to_jsonb(COALESCE(due_weekly_reviews, 0)),
    false
  );

  hardened_status := CASE
    WHEN payload ->> 'status' = 'RED' THEN 'RED'
    WHEN payload ->> 'status' = 'YELLOW'
      OR day_1_completed < athletes_total
      OR active_7d < athletes_total
      OR COALESCE(due_transfer_measurements, 0) < transfer_measurements_expected
      OR COALESCE(due_weekly_reviews, 0) < weekly_reviews_due
    THEN 'YELLOW'
    ELSE 'GREEN'
  END;

  RETURN jsonb_set(payload, '{status}', to_jsonb(hardened_status), false);
END;
$$;

REVOKE ALL ON FUNCTION public._mahleos_pilot_readiness(uuid)
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION public._mahleos_pilot_readiness(uuid) IS
  'Returns run-scoped aggregate readiness; missing Day 1, 7-day activity, due transfer points, or due coach weeks prevent GREEN.';

COMMIT;
