BEGIN;

-- Admin-only QA parity report. This deliberately exposes counts and state only:
-- no response values, names, email addresses, journals, or reflections.
CREATE OR REPLACE FUNCTION public.get_qa_evidence_parity(
  _program_run_id uuid,
  _protocol_version text DEFAULT '56d-transfer-v1-2026-07'
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  actor_id uuid := auth.uid();
  target_run public.program_runs;
  target_team public.teams;
  simulated_date date;
  simulated_day integer;
  production_summary json;
  result json;
BEGIN
  IF actor_id IS NULL OR NOT public.has_role(actor_id, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'admin_role_required';
  END IF;

  SELECT pr.* INTO target_run
  FROM public.program_runs pr
  WHERE pr.id = _program_run_id;

  IF target_run.id IS NULL OR target_run.started_at IS NULL THEN
    RAISE EXCEPTION 'qa_program_run_not_found';
  END IF;

  SELECT t.* INTO target_team
  FROM public.teams t
  WHERE t.id = target_run.team_id;

  IF target_team.id IS NULL OR NOT COALESCE(target_team.is_test_team, false) THEN
    RAISE EXCEPTION 'qa_test_run_required';
  END IF;

  SELECT qto.simulated_date, qto.simulated_day_number
  INTO simulated_date, simulated_day
  FROM public.qa_time_overrides qto
  WHERE qto.scope = 'team' AND qto.team_id = target_team.id
  ORDER BY qto.updated_at DESC
  LIMIT 1;

  simulated_date := COALESCE(simulated_date, CURRENT_DATE);
  simulated_day := COALESCE(
    simulated_day,
    GREATEST(1, LEAST(56, (simulated_date - target_run.started_at) + 1))
  );

  -- A QA run must remain empty through the production-only export path.
  production_summary := public.get_performance_evidence_summary(
    _program_run_id,
    false,
    _protocol_version
  );

  WITH participants AS (
    SELECT
      pi.id AS program_instance_id,
      pi.user_id,
      pi.started_at,
      pi.ended_at,
      pi.status,
      COALESCE(pi.is_test_instance, false) AS is_test_instance,
      COALESCE(p.is_test_user, false) AS is_test_user
    FROM public.program_instances pi
    JOIN public.profiles p ON p.id = pi.user_id
    JOIN public.user_roles ur
      ON ur.user_id = pi.user_id AND ur.role = 'athlete'::public.app_role
    WHERE pi.program_run_id = target_run.id
      AND pi.team_id = target_team.id
  ),
  schedule AS (
    SELECT ets.day_number, ets.domain_id
    FROM public.evidence_transfer_schedule ets
    WHERE ets.protocol_version = _protocol_version
  ),
  assignments AS (
    SELECT
      uda.id AS assignment_id,
      uda.user_id,
      p.program_instance_id,
      uda.assigned_day_number AS day_number,
      uda.context_type
    FROM participants p
    JOIN public.user_day_assignments uda ON uda.user_id = p.user_id
    JOIN schedule s ON s.day_number = uda.assigned_day_number
    WHERE uda.date BETWEEN p.started_at AND LEAST(
      simulated_date,
      COALESCE(p.ended_at, simulated_date)
    )
  ),
  completions AS (
    SELECT DISTINCT
      udc.assignment_id,
      udc.program_instance_id,
      udc.user_id
    FROM public.user_day_completion udc
    JOIN assignments a
      ON a.assignment_id = udc.assignment_id
     AND a.program_instance_id = udc.program_instance_id
     AND a.user_id = udc.user_id
    WHERE udc.completion_status = 'completed'
  ),
  observations AS (
    SELECT ato.*
    FROM public.athlete_transfer_observations ato
    WHERE ato.program_run_id = target_run.id
      AND ato.protocol_version = _protocol_version
  ),
  day_rows AS (
    SELECT
      s.day_number,
      s.domain_id,
      (target_run.started_at + (s.day_number - 1)) <= simulated_date AS reached,
      (SELECT COUNT(*)::integer FROM participants) AS athlete_count,
      COUNT(DISTINCT a.user_id)::integer AS assigned_athletes,
      COUNT(DISTINCT a.user_id) FILTER (WHERE a.context_type <> 'rest')::integer AS expected_observations,
      COUNT(DISTINCT a.user_id) FILTER (WHERE a.context_type = 'rest')::integer AS rest_skips,
      COUNT(DISTINCT c.user_id)::integer AS completed_athletes,
      COUNT(DISTINCT o.id)::integer AS collected_observations,
      COUNT(DISTINCT o.id) FILTER (WHERE o.not_observed)::integer AS not_observed,
      GREATEST(
        COUNT(DISTINCT a.user_id) FILTER (WHERE a.context_type <> 'rest')
        - COUNT(DISTINCT o.id),
        0
      )::integer AS missing_observations,
      COUNT(DISTINCT c.user_id) FILTER (
        WHERE a.context_type <> 'rest' AND o.id IS NULL
      )::integer AS completion_without_evidence,
      COUNT(DISTINCT o.id) FILTER (WHERE c.assignment_id IS NULL)::integer AS evidence_without_completion
    FROM schedule s
    LEFT JOIN assignments a ON a.day_number = s.day_number
    LEFT JOIN completions c
      ON c.assignment_id = a.assignment_id
     AND c.program_instance_id = a.program_instance_id
    LEFT JOIN observations o
      ON o.assignment_id = a.assignment_id
     AND o.program_instance_id = a.program_instance_id
     AND o.day_number = s.day_number
    GROUP BY s.day_number, s.domain_id
  ),
  day_status_rows AS (
    SELECT
      dr.*,
      CASE
        WHEN NOT dr.reached THEN 'not_reached'
        WHEN dr.assigned_athletes = 0 THEN 'not_started'
        WHEN dr.completion_without_evidence > 0 OR dr.evidence_without_completion > 0 THEN 'failed'
        WHEN dr.assigned_athletes = dr.athlete_count
          AND dr.completed_athletes = dr.athlete_count
          AND dr.collected_observations = dr.expected_observations
          THEN 'passed'
        ELSE 'in_progress'
      END AS status
    FROM day_rows dr
  ),
  coach_week_rows AS (
    SELECT
      gs.week_number,
      (gs.week_number * 7) <= simulated_day AS reached,
      EXISTS (
        SELECT 1
        FROM public.coach_evidence_reviews cer
        WHERE cer.program_run_id = target_run.id
          AND cer.protocol_version = _protocol_version
          AND cer.scope_type = 'team'
          AND cer.week_number = gs.week_number
      ) AS completed
    FROM generate_series(1, 8) AS gs(week_number)
  ),
  integrity AS (
    SELECT
      (SELECT COUNT(*)::integer FROM participants) AS athlete_count,
      (SELECT COUNT(*)::integer FROM participants WHERE status = 'active') AS active_instances,
      (
        SELECT COUNT(*)::integer
        FROM participants
        WHERE NOT is_test_user OR NOT is_test_instance
      ) AS participants_without_both_test_flags,
      (
        SELECT COUNT(*)::integer
        FROM observations
        WHERE NOT is_test
      ) AS observations_without_test_flag,
      (
        SELECT COUNT(*)::integer
        FROM public.coach_evidence_reviews cer
        WHERE cer.program_run_id = target_run.id AND NOT cer.is_test
      ) AS coach_reviews_without_test_flag,
      (
        SELECT COUNT(*)::integer
        FROM observations o
        LEFT JOIN schedule s
          ON s.day_number = o.day_number AND s.domain_id = o.domain_id
        WHERE s.day_number IS NULL
      ) AS schedule_mismatches,
      COALESCE((production_summary #>> '{sample,total_observations}')::integer, 0)
        AS observations_visible_in_production,
      COALESCE((production_summary #>> '{sample,scope_participants_total}')::integer, 0)
        AS participants_visible_in_production,
      COALESCE((SELECT SUM(completion_without_evidence)::integer FROM day_status_rows), 0)
        AS completion_without_evidence,
      COALESCE((SELECT SUM(evidence_without_completion)::integer FROM day_status_rows), 0)
        AS evidence_without_completion
  ),
  state AS (
    SELECT CASE
      WHEN i.athlete_count <> 5
        OR i.active_instances <> i.athlete_count
        OR i.participants_without_both_test_flags > 0
        OR i.observations_without_test_flag > 0
        OR i.coach_reviews_without_test_flag > 0
        OR i.schedule_mismatches > 0
        OR i.observations_visible_in_production > 0
        OR i.participants_visible_in_production > 0
        OR i.completion_without_evidence > 0
        OR i.evidence_without_completion > 0
        OR EXISTS (SELECT 1 FROM day_status_rows WHERE status = 'failed')
        THEN 'FAIL'
      WHEN EXISTS (
        SELECT 1 FROM day_status_rows
        WHERE reached AND status IN ('not_started', 'in_progress')
      ) OR EXISTS (
        SELECT 1 FROM coach_week_rows WHERE reached AND NOT completed
      )
        THEN 'IN_PROGRESS'
      WHEN EXISTS (SELECT 1 FROM day_status_rows WHERE status = 'passed')
        THEN 'PASS'
      ELSE 'READY'
    END AS value
    FROM integrity i
  )
  SELECT json_build_object(
    'schema_version', 'qa_evidence_parity_v1',
    'generated_at', now(),
    'protocol_version', _protocol_version,
    'state', st.value,
    'state_label', CASE st.value
      WHEN 'PASS' THEN 'Bisherige QA-Messpunkte vollständig bestanden'
      WHEN 'IN_PROGRESS' THEN 'QA-Durchlauf noch nicht vollständig'
      WHEN 'FAIL' THEN 'Datenintegritätsfehler erkannt'
      ELSE 'Bereit für den ersten QA-Messpunkt'
    END,
    'scope', json_build_object(
      'team_id', target_team.id,
      'team_name', target_team.name,
      'program_run_id', target_run.id,
      'program_run_name', target_run.name,
      'simulated_date', simulated_date,
      'simulated_day_number', simulated_day,
      'test_only', true
    ),
    'setup', json_build_object(
      'athletes', i.athlete_count,
      'active_instances', i.active_instances,
      'expected_qa_athletes', 5,
      'all_participants_test_flagged', i.participants_without_both_test_flags = 0
    ),
    'coverage', json_build_object(
      'scheduled_days', (SELECT COUNT(*) FROM day_status_rows),
      'reached_days', (SELECT COUNT(*) FROM day_status_rows WHERE reached),
      'passed_days', (SELECT COUNT(*) FROM day_status_rows WHERE status = 'passed'),
      'expected_observations', COALESCE((SELECT SUM(expected_observations) FROM day_status_rows), 0),
      'collected_observations', COALESCE((SELECT SUM(collected_observations) FROM day_status_rows), 0),
      'missing_observations', COALESCE((SELECT SUM(missing_observations) FROM day_status_rows), 0),
      'not_observed_responses', COALESCE((SELECT SUM(not_observed) FROM day_status_rows), 0),
      'completed_coach_weeks', (SELECT COUNT(*) FROM coach_week_rows WHERE completed),
      'reached_coach_weeks', (SELECT COUNT(*) FROM coach_week_rows WHERE reached)
    ),
    'days', COALESCE((
      SELECT json_agg(row_to_json(dsr) ORDER BY dsr.day_number)
      FROM day_status_rows dsr
    ), '[]'::json),
    'coach_weeks', COALESCE((
      SELECT json_agg(row_to_json(cwr) ORDER BY cwr.week_number)
      FROM coach_week_rows cwr
    ), '[]'::json),
    'checks', json_build_object(
      'participants_without_both_test_flags', i.participants_without_both_test_flags,
      'observations_without_test_flag', i.observations_without_test_flag,
      'coach_reviews_without_test_flag', i.coach_reviews_without_test_flag,
      'schedule_mismatches', i.schedule_mismatches,
      'observations_visible_in_production', i.observations_visible_in_production,
      'participants_visible_in_production', i.participants_visible_in_production,
      'completion_without_evidence', i.completion_without_evidence,
      'evidence_without_completion', i.evidence_without_completion
    ),
    'privacy', json_build_object(
      'response_values_exposed', false,
      'athlete_identifiers_exposed', false,
      'private_text_exposed', false,
      'production_export_includes_qa', false
    )
  ) INTO result
  FROM integrity i CROSS JOIN state st;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_qa_evidence_parity(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_qa_evidence_parity(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.get_qa_evidence_parity IS
  'Admin-only, count-only QA parity gate. Verifies the real evidence write path without exposing response values or mixing QA into production exports.';

-- Archive remains destructive only for explicitly flagged QA teams. New
-- evidence rows and snapshots are removed before the synthetic cohort is
-- detached; Auth users remain available for audit and can be removed later.
CREATE OR REPLACE FUNCTION public.archive_qa_cohort(_team_id uuid)
RETURNS json
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_user_ids uuid[];
  v_run_ids uuid[];
  v_is_test boolean;
  v_evidence_observations integer := 0;
  v_coach_reviews integer := 0;
  v_snapshots integer := 0;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'admin_role_required';
  END IF;

  SELECT t.is_test_team INTO v_is_test
  FROM public.teams t
  WHERE t.id = _team_id;

  IF NOT COALESCE(v_is_test, false) THEN
    RAISE EXCEPTION 'refusing_to_archive_non_test_team';
  END IF;

  SELECT COALESCE(array_agg(tm.user_id), ARRAY[]::uuid[]) INTO v_user_ids
  FROM public.team_members tm
  JOIN public.profiles p ON p.id = tm.user_id AND p.is_test_user = true
  WHERE tm.team_id = _team_id;

  SELECT COALESCE(array_agg(pr.id), ARRAY[]::uuid[]) INTO v_run_ids
  FROM public.program_runs pr
  WHERE pr.team_id = _team_id;

  DELETE FROM public.athlete_transfer_observations ato
  WHERE ato.team_id = _team_id
     OR ato.program_run_id = ANY(v_run_ids);
  GET DIAGNOSTICS v_evidence_observations = ROW_COUNT;

  DELETE FROM public.coach_evidence_reviews cer
  WHERE cer.team_id = _team_id
     OR cer.program_run_id = ANY(v_run_ids);
  GET DIAGNOSTICS v_coach_reviews = ROW_COUNT;

  DELETE FROM public.study_evidence_snapshots ses
  WHERE ses.program_run_id = ANY(v_run_ids);
  GET DIAGNOSTICS v_snapshots = ROW_COUNT;

  IF array_length(v_user_ids, 1) > 0 THEN
    DELETE FROM public.daily_checkins WHERE user_id = ANY(v_user_ids);
    DELETE FROM public.daily_journals WHERE user_id = ANY(v_user_ids);
    DELETE FROM public.user_day_completion WHERE user_id = ANY(v_user_ids);
    DELETE FROM public.user_day_assignments WHERE user_id = ANY(v_user_ids);
    DELETE FROM public.comprehension_check_instances WHERE user_id = ANY(v_user_ids);
    DELETE FROM public.program_progress_snapshots WHERE user_id = ANY(v_user_ids);
    DELETE FROM public.assessments WHERE user_id = ANY(v_user_ids);
    DELETE FROM public.deep_profile_assessments WHERE user_id = ANY(v_user_ids);
    DELETE FROM public.questionnaire_responses WHERE user_id = ANY(v_user_ids);
    DELETE FROM public.personalized_tasks WHERE user_id = ANY(v_user_ids);
    DELETE FROM public.program_settings WHERE user_id = ANY(v_user_ids);
    DELETE FROM public.calendar_events WHERE user_id = ANY(v_user_ids);
    DELETE FROM public.training_schedule WHERE user_id = ANY(v_user_ids);
    DELETE FROM public.program_instances WHERE user_id = ANY(v_user_ids);
  END IF;

  UPDATE public.program_runs
  SET status = 'archived',
      ended_at = COALESCE(ended_at, CURRENT_DATE),
      updated_at = now()
  WHERE id = ANY(v_run_ids);

  DELETE FROM public.qa_time_overrides WHERE team_id = _team_id;
  DELETE FROM public.team_members WHERE team_id = _team_id;

  UPDATE public.teams
  SET is_archived = true,
      name = name || ' [archived ' || to_char(now(), 'YYYY-MM-DD HH24:MI') || ']'
  WHERE id = _team_id;

  RETURN json_build_object(
    'success', true,
    'archived_team_id', _team_id,
    'wiped_users', COALESCE(array_length(v_user_ids, 1), 0),
    'wiped_evidence_observations', v_evidence_observations,
    'wiped_coach_reviews', v_coach_reviews,
    'wiped_evidence_snapshots', v_snapshots
  );
END;
$$;

REVOKE ALL ON FUNCTION public.archive_qa_cohort(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.archive_qa_cohort(uuid) TO authenticated;

-- Coaches on a synthetic QA team follow the same simulated date as the QA
-- athletes. For every real profile get_effective_today() still returns the real
-- calendar date, so production behavior is unchanged.
CREATE OR REPLACE FUNCTION public.get_coach_evidence_review_context(
  _team_id uuid,
  _protocol_version text DEFAULT '56d-transfer-v1-2026-07'
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  actor_id uuid := auth.uid();
  target_run public.program_runs;
  effective_today date;
  current_week integer;
  athlete_count integer;
  eligible_count integer;
  athletes_json json;
  team_review_json json;
  protocol_enabled boolean;
BEGIN
  IF actor_id IS NULL OR NOT public.can_manage_team_program_runs(_team_id) THEN
    RAISE EXCEPTION 'coach_team_access_required';
  END IF;

  SELECT ep.coach_collection_enabled AND ep.status = 'pilot'
  INTO protocol_enabled
  FROM public.evidence_protocols ep
  WHERE ep.version = _protocol_version;

  IF COALESCE(protocol_enabled, false) = false THEN
    RETURN json_build_object(
      'enabled', false,
      'reason', 'protocol_disabled',
      'protocol_version', _protocol_version,
      'run', NULL,
      'week_number', NULL,
      'team_eligible', false,
      'athlete_count', 0,
      'eligible_athlete_count', 0,
      'athletes', '[]'::json,
      'team_review', NULL
    );
  END IF;

  SELECT * INTO target_run
  FROM public.program_runs pr
  WHERE pr.team_id = _team_id AND pr.status = 'active'
  ORDER BY pr.started_at DESC, pr.created_at DESC
  LIMIT 1;

  IF target_run.id IS NULL OR target_run.started_at IS NULL THEN
    RETURN json_build_object(
      'enabled', false,
      'reason', 'no_active_program_run',
      'protocol_version', _protocol_version,
      'run', NULL,
      'week_number', NULL,
      'team_eligible', false,
      'athlete_count', 0,
      'eligible_athlete_count', 0,
      'athletes', '[]'::json,
      'team_review', NULL
    );
  END IF;

  effective_today := public.get_effective_today(actor_id);
  current_week := GREATEST(1, LEAST(8, ((effective_today - target_run.started_at) / 7) + 1));

  WITH athlete_instances AS (
    SELECT
      pi.id AS program_instance_id,
      pi.user_id,
      COALESCE(NULLIF(btrim(p.full_name), ''), 'Athlet ' || left(pi.user_id::text, 8)) AS full_name,
      public.evidence_eligibility_reason(pi.id, _protocol_version) AS eligibility_reason
    FROM public.program_instances pi
    JOIN public.profiles p ON p.id = pi.user_id
    JOIN public.user_roles ur ON ur.user_id = pi.user_id AND ur.role = 'athlete'::public.app_role
    WHERE pi.program_run_id = target_run.id
      AND pi.team_id = _team_id
      AND pi.status = 'active'
  )
  SELECT
    COUNT(*)::integer,
    COUNT(*) FILTER (WHERE eligibility_reason IN ('eligible', 'eligible_minor', 'eligible_test'))::integer,
    COALESCE(
      json_agg(
        json_build_object(
          'program_instance_id', ai.program_instance_id,
          'user_id', ai.user_id,
          'full_name', ai.full_name,
          'eligible', ai.eligibility_reason IN ('eligible', 'eligible_minor', 'eligible_test'),
          'eligibility_reason', ai.eligibility_reason,
          'review', (
            SELECT json_build_object(
              'context', cer.observation_context,
              'values', (
                SELECT COALESCE(
                  json_object_agg(
                    ceo.domain_id,
                    CASE WHEN ceo.not_observed THEN 'not_observed' ELSE ceo.score::text END
                  ),
                  '{}'::json
                )
                FROM public.coach_evidence_observations ceo
                WHERE ceo.review_id = cer.id
              )
            )
            FROM public.coach_evidence_reviews cer
            WHERE cer.coach_id = actor_id
              AND cer.scope_type = 'athlete'
              AND cer.target_program_instance_id = ai.program_instance_id
              AND cer.week_number = current_week
          )
        )
        ORDER BY ai.full_name
      ),
      '[]'::json
    )
  INTO athlete_count, eligible_count, athletes_json
  FROM athlete_instances ai;

  SELECT json_build_object(
    'context', cer.observation_context,
    'values', (
      SELECT COALESCE(
        json_object_agg(
          ceo.domain_id,
          CASE WHEN ceo.not_observed THEN 'not_observed' ELSE ceo.score::text END
        ),
        '{}'::json
      )
      FROM public.coach_evidence_observations ceo
      WHERE ceo.review_id = cer.id
    )
  ) INTO team_review_json
  FROM public.coach_evidence_reviews cer
  WHERE cer.coach_id = actor_id
    AND cer.scope_type = 'team'
    AND cer.program_run_id = target_run.id
    AND cer.week_number = current_week;

  RETURN json_build_object(
    'enabled', true,
    'reason', CASE
      WHEN athlete_count = 0 THEN 'no_athletes'
      WHEN eligible_count <> athlete_count THEN 'participants_not_eligible'
      ELSE 'ready'
    END,
    'protocol_version', _protocol_version,
    'run', json_build_object(
      'id', target_run.id,
      'name', target_run.name,
      'started_at', target_run.started_at,
      'status', target_run.status
    ),
    'week_number', current_week,
    'effective_date', effective_today,
    'team_eligible', athlete_count > 0 AND eligible_count = athlete_count,
    'athlete_count', athlete_count,
    'eligible_athlete_count', eligible_count,
    'athletes', athletes_json,
    'team_review', team_review_json,
    'individual_visibility', 'entering_coach_only',
    'external_export_includes_individual_reviews', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_coach_evidence_review_context(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_coach_evidence_review_context(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.save_coach_evidence_review(
  _scope text,
  _team_id uuid,
  _program_instance_id uuid,
  _protocol_version text,
  _week_number integer,
  _context text,
  _observations jsonb,
  _completion_duration_ms integer DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  actor_id uuid := auth.uid();
  target_run public.program_runs;
  target_instance public.program_instances;
  effective_today date;
  current_week integer;
  review_id uuid;
  athlete_count integer;
  eligible_count integer;
  observation_key_count integer;
  valid_observation_count integer;
  target_is_test boolean := false;
BEGIN
  IF actor_id IS NULL OR NOT public.can_manage_team_program_runs(_team_id) THEN
    RAISE EXCEPTION 'coach_team_access_required';
  END IF;

  IF _scope NOT IN ('team', 'athlete') THEN
    RAISE EXCEPTION 'invalid_coach_review_scope';
  END IF;

  IF _context NOT IN ('training', 'competition', 'mixed') THEN
    RAISE EXCEPTION 'invalid_coach_review_context';
  END IF;

  IF _observations IS NULL OR jsonb_typeof(_observations) <> 'object' THEN
    RAISE EXCEPTION 'coach_observations_must_be_object';
  END IF;

  IF _completion_duration_ms IS NOT NULL
     AND _completion_duration_ms NOT BETWEEN 0 AND 900000 THEN
    RAISE EXCEPTION 'invalid_coach_review_duration';
  END IF;

  SELECT COUNT(*)::integer INTO observation_key_count
  FROM jsonb_object_keys(_observations);

  SELECT COUNT(*)::integer INTO valid_observation_count
  FROM jsonb_each(_observations) item
  WHERE item.key IN (
      'attention_return',
      'error_recovery',
      'pressure_regulation',
      'process_execution',
      'action_under_uncertainty'
    )
    AND (
      (jsonb_typeof(item.value) = 'number' AND (item.value #>> '{}') IN ('1', '2', '3', '4'))
      OR (jsonb_typeof(item.value) = 'string' AND item.value #>> '{}' = 'not_observed')
    );

  IF observation_key_count <> 5 OR valid_observation_count <> 5 THEN
    RAISE EXCEPTION 'exactly_five_valid_coach_observations_required';
  END IF;

  SELECT * INTO target_run
  FROM public.program_runs pr
  WHERE pr.team_id = _team_id AND pr.status = 'active'
  ORDER BY pr.started_at DESC, pr.created_at DESC
  LIMIT 1
  FOR SHARE;

  IF target_run.id IS NULL OR target_run.started_at IS NULL THEN
    RAISE EXCEPTION 'active_program_run_required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.evidence_protocols ep
    WHERE ep.version = _protocol_version
      AND ep.status = 'pilot'
      AND ep.coach_collection_enabled
  ) THEN
    RAISE EXCEPTION 'coach_evidence_protocol_disabled';
  END IF;

  effective_today := public.get_effective_today(actor_id);
  current_week := GREATEST(1, LEAST(8, ((effective_today - target_run.started_at) / 7) + 1));
  IF _week_number <> current_week THEN
    RAISE EXCEPTION 'coach_review_week_mismatch';
  END IF;

  IF _scope = 'team' THEN
    IF _program_instance_id IS NOT NULL THEN
      RAISE EXCEPTION 'team_review_must_not_target_athlete';
    END IF;

    PERFORM 1
    FROM public.program_instances pi
    WHERE pi.program_run_id = target_run.id
      AND pi.team_id = _team_id
      AND pi.status = 'active'
    FOR SHARE;

    PERFORM 1
    FROM public.profiles p
    JOIN public.program_instances pi ON pi.user_id = p.id
    WHERE pi.program_run_id = target_run.id
      AND pi.team_id = _team_id
      AND pi.status = 'active'
    FOR SHARE OF p;

    PERFORM 1
    FROM public.evidence_participation_eligibility epe
    JOIN public.program_instances pi ON pi.id = epe.program_instance_id
    WHERE pi.program_run_id = target_run.id
      AND pi.team_id = _team_id
      AND pi.status = 'active'
    FOR SHARE OF epe;

    SELECT
      COUNT(*)::integer,
      COUNT(*) FILTER (
        WHERE public.evidence_eligibility_reason(pi.id, _protocol_version) IN ('eligible', 'eligible_minor', 'eligible_test')
      )::integer,
      COALESCE(bool_or(COALESCE(p.is_test_user, false) OR COALESCE(pi.is_test_instance, false)), false)
    INTO athlete_count, eligible_count, target_is_test
    FROM public.program_instances pi
    JOIN public.profiles p ON p.id = pi.user_id
    JOIN public.user_roles ur ON ur.user_id = pi.user_id AND ur.role = 'athlete'::public.app_role
    WHERE pi.program_run_id = target_run.id
      AND pi.team_id = _team_id
      AND pi.status = 'active';

    IF athlete_count = 0 OR eligible_count <> athlete_count THEN
      RAISE EXCEPTION 'all_team_athletes_must_be_evidence_eligible';
    END IF;
  ELSE
    SELECT * INTO target_instance
    FROM public.program_instances pi
    WHERE pi.id = _program_instance_id
      AND pi.team_id = _team_id
      AND pi.program_run_id = target_run.id
      AND pi.status = 'active'
    FOR SHARE;

    IF target_instance.id IS NULL
       OR NOT public.has_role(target_instance.user_id, 'athlete'::public.app_role) THEN
      RAISE EXCEPTION 'eligible_team_athlete_instance_required';
    END IF;

    PERFORM 1
    FROM public.profiles p
    WHERE p.id = target_instance.user_id
    FOR SHARE;

    PERFORM 1
    FROM public.evidence_participation_eligibility epe
    WHERE epe.program_instance_id = target_instance.id
    FOR SHARE;

    IF public.evidence_eligibility_reason(target_instance.id, _protocol_version)
       NOT IN ('eligible', 'eligible_minor', 'eligible_test') THEN
      RAISE EXCEPTION 'target_athlete_not_evidence_eligible';
    END IF;

    SELECT COALESCE(p.is_test_user, false) OR COALESCE(target_instance.is_test_instance, false)
    INTO target_is_test
    FROM public.profiles p
    WHERE p.id = target_instance.user_id;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      actor_id::text || ':' || target_run.id::text || ':' || _scope || ':'
      || COALESCE(_program_instance_id::text, 'team') || ':' || _week_number::text,
      0
    )
  );

  IF _scope = 'team' THEN
    SELECT cer.id INTO review_id
    FROM public.coach_evidence_reviews cer
    WHERE cer.coach_id = actor_id
      AND cer.program_run_id = target_run.id
      AND cer.scope_type = 'team'
      AND cer.week_number = _week_number
    FOR UPDATE;
  ELSE
    SELECT cer.id INTO review_id
    FROM public.coach_evidence_reviews cer
    WHERE cer.coach_id = actor_id
      AND cer.target_program_instance_id = target_instance.id
      AND cer.scope_type = 'athlete'
      AND cer.week_number = _week_number
    FOR UPDATE;
  END IF;

  IF review_id IS NULL THEN
    INSERT INTO public.coach_evidence_reviews(
      coach_id,
      scope_type,
      team_id,
      program_run_id,
      target_program_instance_id,
      protocol_version,
      week_number,
      observation_context,
      observed_athlete_count,
      completion_duration_ms,
      is_test
    )
    VALUES (
      actor_id,
      _scope,
      _team_id,
      target_run.id,
      CASE WHEN _scope = 'athlete' THEN target_instance.id ELSE NULL END,
      _protocol_version,
      _week_number,
      _context,
      CASE WHEN _scope = 'team' THEN athlete_count ELSE 1 END,
      _completion_duration_ms,
      target_is_test
    )
    RETURNING id INTO review_id;
  ELSE
    UPDATE public.coach_evidence_reviews
    SET observation_context = _context,
        protocol_version = _protocol_version,
        observed_athlete_count = CASE WHEN _scope = 'team' THEN athlete_count ELSE 1 END,
        completion_duration_ms = COALESCE(_completion_duration_ms, completion_duration_ms),
        is_test = target_is_test
    WHERE id = review_id;

    DELETE FROM public.coach_evidence_observations ceo
    WHERE ceo.review_id = review_id;
  END IF;

  INSERT INTO public.coach_evidence_observations(
    review_id,
    domain_id,
    score,
    not_observed
  )
  SELECT
    review_id,
    item.key,
    CASE WHEN jsonb_typeof(item.value) = 'number' THEN (item.value #>> '{}')::smallint ELSE NULL END,
    jsonb_typeof(item.value) = 'string' AND item.value #>> '{}' = 'not_observed'
  FROM jsonb_each(_observations) item;

  RETURN json_build_object(
    'review_id', review_id,
    'scope', _scope,
    'team_id', _team_id,
    'program_run_id', target_run.id,
    'program_instance_id', CASE WHEN _scope = 'athlete' THEN target_instance.id ELSE NULL END,
    'week_number', _week_number,
    'effective_date', effective_today,
    'saved_at', now(),
    'individual_visibility', CASE WHEN _scope = 'athlete' THEN 'entering_coach_only' ELSE 'team_observation' END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.save_coach_evidence_review(text, uuid, uuid, text, integer, text, jsonb, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_coach_evidence_review(text, uuid, uuid, text, integer, text, jsonb, integer)
  TO authenticated;

COMMIT;
