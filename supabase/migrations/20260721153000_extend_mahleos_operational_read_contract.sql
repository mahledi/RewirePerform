BEGIN;

-- Extend the fixed MahleOS contract without changing any existing response.
-- The new views remain aggregate, production-only and service-role mediated.
ALTER TABLE public.mahleos_operations_access_log
  DROP CONSTRAINT IF EXISTS mahleos_operations_access_log_view_name_check;

ALTER TABLE public.mahleos_operations_access_log
  ADD CONSTRAINT mahleos_operations_access_log_view_name_check CHECK (
    view_name IN (
      'daily_brief',
      'system_health',
      'tracking_quality',
      'feedback_status',
      'pilot_readiness',
      'pilot_catalog',
      'solo_readiness',
      'evidence_status'
    )
  );

CREATE OR REPLACE FUNCTION public._mahleos_pilot_catalog()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  WITH production_runs AS MATERIALIZED (
    SELECT pr.id, pr.status, pr.started_at
    FROM public.program_runs pr
    JOIN public.teams t ON t.id = pr.team_id
    WHERE pr.status = 'active'
      AND NOT COALESCE(t.is_test_team, false)
  ), selected_runs AS MATERIALIZED (
    SELECT pr.*
    FROM production_runs pr
    ORDER BY pr.started_at NULLS FIRST, pr.id
    LIMIT 20
  ), run_readiness AS MATERIALIZED (
    SELECT
      sr.id,
      sr.status,
      sr.started_at,
      public._mahleos_pilot_readiness(sr.id) AS readiness
    FROM selected_runs sr
  ), metrics AS (
    SELECT
      (SELECT COUNT(*)::integer FROM production_runs) AS total_active_runs,
      (SELECT COUNT(*)::integer FROM run_readiness) AS returned_runs,
      COALESCE(
        bool_or(rr.readiness ->> 'status' = 'RED'),
        false
      ) AS has_red,
      COALESCE(
        bool_or(rr.readiness ->> 'status' = 'YELLOW'),
        false
      ) AS has_yellow
    FROM run_readiness rr
  )
  SELECT jsonb_build_object(
    'schema_version', 'mahleos-pilot-catalog-v1',
    'generated_at', now(),
    'reporting_timezone', 'UTC',
    'status', CASE
      WHEN m.total_active_runs = 0 THEN 'NO_DATA'
      WHEN m.has_red THEN 'RED'
      WHEN m.has_yellow OR m.total_active_runs > m.returned_runs THEN 'YELLOW'
      ELSE 'GREEN'
    END,
    'total_active_runs', m.total_active_runs,
    'returned_runs', m.returned_runs,
    'truncated', m.total_active_runs > m.returned_runs,
    'runs', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'program_run_id', rr.id,
          'run_status', rr.status,
          'started_at', rr.started_at,
          'current_program_day', rr.readiness -> 'current_program_day',
          'readiness_status', rr.readiness -> 'status',
          'athletes', rr.readiness #> '{setup,athletes}',
          'evidence_eligible', rr.readiness #> '{evidence_authorization,eligible}',
          'validated_pre_complete', rr.readiness #> '{pre_measurement,validated_complete}',
          'active_7d', rr.readiness #> '{daily_tracking,active_7d}',
          'aggregate_visible', rr.readiness #> '{data_quality,aggregate_visible}',
          'low_confidence', rr.readiness #> '{data_quality,low_confidence}'
        )
        ORDER BY rr.started_at NULLS FIRST, rr.id
      )
      FROM run_readiness rr
    ), '[]'::jsonb),
    'test_data_included', false,
    'privacy_level', 'opaque_run_references_and_operational_counts_only',
    'privacy_exclusions', jsonb_build_array(
      'team_name',
      'athlete_names',
      'user_ids',
      'missing_player_lists',
      'individual_scores',
      'coach_observation_values',
      'journal_text',
      'reflection'
    )
  )
  FROM metrics m;
$$;

CREATE OR REPLACE FUNCTION public._mahleos_solo_readiness()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  WITH solo_instances AS MATERIALIZED (
    SELECT
      pi.id,
      pi.user_id,
      pi.started_at,
      LEAST(
        56,
        GREATEST(0, (CURRENT_DATE - pi.started_at) + 1)
      )::integer AS current_program_day,
      public.evidence_eligibility_reason(
        pi.id,
        '56d-transfer-v2-2026-07'
      ) AS eligibility_reason,
      COALESCE(p.sport_category, 'unknown_or_other') AS sport_category,
      p.sport_level
    FROM public.program_instances pi
    JOIN public.profiles p ON p.id = pi.user_id
    JOIN public.user_roles ur
      ON ur.user_id = pi.user_id
     AND ur.role = 'athlete'::public.app_role
    WHERE pi.status = 'active'
      AND pi.team_id IS NULL
      AND pi.program_run_id IS NULL
      AND NOT COALESCE(pi.is_test_instance, false)
      AND NOT COALESCE(p.is_test_user, false)
  ), validated_pre AS (
    SELECT a.user_id, a.program_instance_id
    FROM public.assessments a
    JOIN solo_instances si
      ON si.id = a.program_instance_id AND si.user_id = a.user_id
    WHERE a.timing = 'pre'
      AND a.assessment_type IN ('csai2r', 'smtq', 'flow_short')
    GROUP BY a.user_id, a.program_instance_id
    HAVING COUNT(DISTINCT a.assessment_type) = 3
  ), active_users_7d AS (
    SELECT dc.user_id
    FROM public.daily_checkins dc
    JOIN solo_instances si
      ON si.id = dc.program_instance_id AND si.user_id = dc.user_id
    WHERE dc.date >= CURRENT_DATE - 6
    UNION
    SELECT udc.user_id
    FROM public.user_day_completion udc
    JOIN solo_instances si
      ON si.id = udc.program_instance_id AND si.user_id = udc.user_id
    WHERE udc.completion_status = 'completed'
      AND COALESCE(udc.completed_at, udc.created_at) >= now() - interval '7 days'
  ), integrity AS (
    SELECT
      (
        SELECT COUNT(*)::integer
        FROM (
          SELECT dc.user_id, dc.program_instance_id, dc.date
          FROM public.daily_checkins dc
          JOIN solo_instances si
            ON si.id = dc.program_instance_id AND si.user_id = dc.user_id
          GROUP BY dc.user_id, dc.program_instance_id, dc.date
          HAVING COUNT(*) > 1
        ) duplicates
      ) AS duplicate_checkins,
      (
        SELECT COUNT(*)::integer
        FROM public.user_day_completion udc
        JOIN solo_instances si
          ON si.id = udc.program_instance_id AND si.user_id = udc.user_id
        JOIN public.user_day_assignments uda ON uda.id = udc.assignment_id
        WHERE udc.completion_status = 'completed'
          AND NOT EXISTS (
            SELECT 1
            FROM public.daily_checkins dc
            WHERE dc.user_id = udc.user_id
              AND dc.program_instance_id = udc.program_instance_id
              AND dc.date = uda.date
          )
      ) AS completions_without_checkin,
      (
        SELECT COUNT(*)::integer
        FROM (
          SELECT si.user_id
          FROM solo_instances si
          GROUP BY si.user_id
          HAVING COUNT(*) > 1
        ) duplicate_active
      ) AS multiple_active_instances
  ), cohort_counts AS (
    SELECT
      si.sport_category,
      si.sport_level,
      COUNT(DISTINCT si.user_id)::integer AS athletes,
      COUNT(DISTINCT si.user_id) FILTER (
        WHERE si.eligibility_reason IN ('eligible', 'eligible_minor')
      )::integer AS evidence_eligible
    FROM solo_instances si
    GROUP BY si.sport_category, si.sport_level
  ), counts AS (
    SELECT
      (SELECT COUNT(DISTINCT si.user_id)::integer FROM solo_instances si) AS athletes_total,
      (SELECT COUNT(*)::integer FROM solo_instances) AS active_instances,
      (
        SELECT COUNT(DISTINCT si.user_id)::integer
        FROM solo_instances si
        WHERE si.eligibility_reason IN ('eligible', 'eligible_minor')
      ) AS evidence_eligible,
      (SELECT COUNT(DISTINCT vp.user_id)::integer FROM validated_pre vp) AS validated_pre_complete,
      (
        SELECT COUNT(DISTINCT dc.user_id)::integer
        FROM public.daily_checkins dc
        JOIN solo_instances si
          ON si.id = dc.program_instance_id AND si.user_id = dc.user_id
        WHERE dc.date = CURRENT_DATE
      ) AS checkins_today,
      (SELECT COUNT(*)::integer FROM active_users_7d) AS active_7d,
      (
        SELECT COUNT(DISTINCT udc.user_id)::integer
        FROM public.user_day_completion udc
        JOIN solo_instances si
          ON si.id = udc.program_instance_id AND si.user_id = udc.user_id
        WHERE udc.completion_status = 'completed'
          AND udc.day_number = 1
      ) AS day_1_completed,
      (
        SELECT COUNT(*)::integer
        FROM public.athlete_transfer_observations ato
        JOIN solo_instances si
          ON si.id = ato.program_instance_id AND si.user_id = ato.user_id
        WHERE ato.program_run_id IS NULL
          AND ato.protocol_version = '56d-transfer-v2-2026-07'
          AND NOT COALESCE(ato.is_test, false)
          AND si.eligibility_reason IN ('eligible', 'eligible_minor')
      ) AS transfer_measurements,
      COALESCE((
        SELECT SUM((
          SELECT COUNT(*)
          FROM public.evidence_transfer_schedule ets
          WHERE ets.protocol_version = '56d-transfer-v2-2026-07'
            AND ets.day_number <= si.current_program_day
        ))::integer
        FROM solo_instances si
        WHERE si.eligibility_reason IN ('eligible', 'eligible_minor')
      ), 0)::integer AS transfer_measurements_expected,
      (
        SELECT COUNT(*)::integer
        FROM cohort_counts cc
        WHERE cc.evidence_eligible < 5
      ) AS suppressed_cohort_count
  )
  SELECT jsonb_build_object(
    'schema_version', 'mahleos-solo-readiness-v1',
    'generated_at', now(),
    'reporting_timezone', 'UTC',
    'status', CASE
      WHEN c.athletes_total = 0 THEN 'NO_DATA'
      WHEN i.duplicate_checkins > 0
        OR i.completions_without_checkin > 0
        OR i.multiple_active_instances > 0
      THEN 'RED'
      WHEN c.athletes_total < 5
        OR c.evidence_eligible < c.athletes_total
        OR c.validated_pre_complete < c.athletes_total
        OR c.active_7d < c.athletes_total
        OR c.day_1_completed < c.athletes_total
        OR c.transfer_measurements < c.transfer_measurements_expected
      THEN 'YELLOW'
      ELSE 'GREEN'
    END,
    'setup', jsonb_build_object(
      'athletes', c.athletes_total,
      'active_instances', c.active_instances,
      'multiple_active_instances', i.multiple_active_instances
    ),
    'evidence_authorization', jsonb_build_object(
      'eligible', c.evidence_eligible,
      'not_eligible', GREATEST(c.athletes_total - c.evidence_eligible, 0),
      'complete', c.athletes_total > 0 AND c.evidence_eligible = c.athletes_total
    ),
    'pre_measurement', jsonb_build_object(
      'validated_complete', c.validated_pre_complete,
      'validated_missing', GREATEST(c.athletes_total - c.validated_pre_complete, 0)
    ),
    'daily_tracking', jsonb_build_object(
      'day_1_completed', c.day_1_completed,
      'checkins_today', c.checkins_today,
      'active_7d', c.active_7d,
      'inactive_7d', GREATEST(c.athletes_total - c.active_7d, 0)
    ),
    'transfer_tracking', jsonb_build_object(
      'measurements_completed', c.transfer_measurements,
      'measurements_expected', c.transfer_measurements_expected
    ),
    'cohort_breakdown', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'sport_category', cc.sport_category,
          'sport_level', cc.sport_level,
          'athletes', cc.athletes,
          'evidence_eligible', cc.evidence_eligible,
          'aggregate_visible', true,
          'low_confidence', cc.evidence_eligible < 10
        )
        ORDER BY cc.sport_category, cc.sport_level NULLS LAST
      )
      FROM cohort_counts cc
      WHERE cc.evidence_eligible >= 5
    ), '[]'::jsonb),
    'suppressed_cohort_count', c.suppressed_cohort_count,
    'data_quality', jsonb_build_object(
      'duplicate_checkins', i.duplicate_checkins,
      'completions_without_checkin', i.completions_without_checkin,
      'aggregate_visible', c.evidence_eligible >= 5,
      'low_confidence', c.evidence_eligible >= 5 AND c.evidence_eligible < 10,
      'minimum_aggregate_n', 5
    ),
    'test_data_included', false,
    'privacy_level', 'solo_operational_counts_with_suppressed_cohorts',
    'privacy_exclusions', jsonb_build_array(
      'athlete_names',
      'user_ids',
      'individual_checkins',
      'individual_scores',
      'journal_text',
      'reflection'
    )
  )
  FROM counts c
  CROSS JOIN integrity i;
$$;

CREATE OR REPLACE FUNCTION public._mahleos_evidence_status()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  WITH production_locks AS MATERIALIZED (
    SELECT
      edl.id,
      edl.scope_type,
      edl.program_run_id,
      edl.sport_category,
      edl.sport_level,
      edl.protocol_version,
      edl.snapshot_schema_version,
      edl.source_cutoff,
      edl.locked_at,
      edl.checksum_algorithm = 'sha256'
        AND edl.content_checksum = encode(
          extensions.digest(convert_to(edl.evidence_payload::text, 'UTF8'), 'sha256'),
          'hex'
        )
        AND edl.analysis_manifest ->> 'content_checksum' = edl.content_checksum
        AS checksum_valid
    FROM public.evidence_data_locks edl
    WHERE edl.status = 'active'
      AND NOT edl.include_test
  ), selected_locks AS MATERIALIZED (
    SELECT pl.*
    FROM production_locks pl
    ORDER BY pl.locked_at DESC, pl.id
    LIMIT 100
  ), metrics AS (
    SELECT
      COUNT(*)::integer AS active_locks,
      COUNT(*) FILTER (WHERE pl.scope_type = 'program_run')::integer AS program_run_locks,
      COUNT(*) FILTER (WHERE pl.scope_type = 'solo_aggregate')::integer AS solo_aggregate_locks,
      COUNT(*) FILTER (WHERE pl.checksum_valid)::integer AS checksum_valid,
      COUNT(*) FILTER (WHERE NOT pl.checksum_valid)::integer AS checksum_invalid
    FROM production_locks pl
  )
  SELECT jsonb_build_object(
    'schema_version', 'mahleos-evidence-status-v1',
    'generated_at', now(),
    'reporting_timezone', 'UTC',
    'status', CASE
      WHEN m.active_locks = 0 THEN 'NO_DATA'
      WHEN m.checksum_invalid > 0 THEN 'RED'
      WHEN m.active_locks > 100 THEN 'YELLOW'
      ELSE 'GREEN'
    END,
    'active_locks', m.active_locks,
    'program_run_locks', m.program_run_locks,
    'solo_aggregate_locks', m.solo_aggregate_locks,
    'checksum_valid', m.checksum_valid,
    'checksum_invalid', m.checksum_invalid,
    'returned_locks', (SELECT COUNT(*)::integer FROM selected_locks),
    'truncated', m.active_locks > 100,
    'locks', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'lock_id', sl.id,
          'scope_type', sl.scope_type,
          'program_run_id', sl.program_run_id,
          'sport_category', sl.sport_category,
          'sport_level', sl.sport_level,
          'protocol_version', sl.protocol_version,
          'snapshot_schema_version', sl.snapshot_schema_version,
          'source_cutoff', sl.source_cutoff,
          'locked_at', sl.locked_at,
          'integrity_status', CASE WHEN sl.checksum_valid THEN 'VALID' ELSE 'INVALID' END
        )
        ORDER BY sl.locked_at DESC, sl.id
      )
      FROM selected_locks sl
    ), '[]'::jsonb),
    'test_data_included', false,
    'privacy_level', 'data_lock_metadata_and_integrity_only',
    'privacy_exclusions', jsonb_build_array(
      'evidence_payload',
      'analysis_manifest',
      'locked_by',
      'athlete_identifiers',
      'private_text',
      'individual_values'
    )
  )
  FROM metrics m;
$$;

REVOKE ALL ON FUNCTION public._mahleos_pilot_catalog()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public._mahleos_solo_readiness()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public._mahleos_evidence_status()
  FROM PUBLIC, anon, authenticated, service_role;

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
       'daily_brief',
       'system_health',
       'tracking_quality',
       'feedback_status',
       'pilot_readiness',
       'pilot_catalog',
       'solo_readiness',
       'evidence_status'
     )
     OR (_view_name = 'pilot_readiness' AND _program_run_id IS NULL)
     OR (_view_name <> 'pilot_readiness' AND _program_run_id IS NOT NULL) THEN
    IF _request_id IS NOT NULL
       AND _client_id ~ '^[a-z0-9][a-z0-9_-]{2,63}$'
       AND _view_name IN (
         'daily_brief',
         'system_health',
         'tracking_quality',
         'feedback_status',
         'pilot_readiness',
         'pilot_catalog',
         'solo_readiness',
         'evidence_status'
       ) THEN
      INSERT INTO public.mahleos_operations_access_log(
        request_id, client_id, view_name, program_run_id, outcome
      ) VALUES (
        _request_id, _client_id, _view_name, NULL, 'invalid_request'
      ) ON CONFLICT (request_id) DO NOTHING;
    END IF;
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_request');
  END IF;

  IF _program_run_id IS NOT NULL THEN
    SELECT pr.id
    INTO audit_program_run_id
    FROM public.program_runs pr
    WHERE pr.id = _program_run_id
    FOR KEY SHARE;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(_client_id, 0)
  );

  IF EXISTS (
    SELECT 1
    FROM public.mahleos_operations_access_log moal
    WHERE moal.request_id = _request_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_request');
  END IF;

  SELECT COUNT(*)::integer
  INTO recent_requests
  FROM public.mahleos_operations_access_log moal
  WHERE moal.client_id = _client_id
    AND moal.requested_at >= now() - interval '1 minute';

  IF recent_requests >= 30 THEN
    INSERT INTO public.mahleos_operations_access_log(
      request_id, client_id, view_name, program_run_id, outcome
    ) VALUES (
      _request_id, _client_id, _view_name, audit_program_run_id, 'rate_limited'
    ) ON CONFLICT (request_id) DO NOTHING;
    RETURN jsonb_build_object('ok', false, 'error', 'rate_limited');
  END IF;

  payload := CASE _view_name
    WHEN 'daily_brief' THEN jsonb_build_object(
      'schema_version', 'mahleos-daily-brief-v1',
      'generated_at', now(),
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
  END;

  IF payload IS NULL THEN
    INSERT INTO public.mahleos_operations_access_log(
      request_id, client_id, view_name, program_run_id, outcome
    ) VALUES (
      _request_id, _client_id, _view_name, audit_program_run_id, 'not_found'
    ) ON CONFLICT (request_id) DO NOTHING;
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  response_checksum := encode(
    extensions.digest(convert_to(payload::text, 'UTF8'), 'sha256'),
    'hex'
  );

  INSERT INTO public.mahleos_operations_access_log(
    request_id,
    client_id,
    view_name,
    program_run_id,
    outcome,
    response_checksum
  ) VALUES (
    _request_id,
    _client_id,
    _view_name,
    audit_program_run_id,
    'served',
    response_checksum
  ) ON CONFLICT (request_id) DO NOTHING;

  RETURN jsonb_build_object(
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

COMMENT ON FUNCTION public._mahleos_pilot_catalog() IS
  'Production-only active pilot references and operational counts for MahleOS; no team or athlete identity.';
COMMENT ON FUNCTION public._mahleos_solo_readiness() IS
  'Production-only solo operational readiness; cohort dimensions remain hidden until five evidence-eligible athletes.';
COMMENT ON FUNCTION public._mahleos_evidence_status() IS
  'Production-only Data Lock metadata and checksum status; never exports manifests or evidence payloads.';

COMMIT;
