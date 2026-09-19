BEGIN;

-- V1.3 uses a new RPC instead of changing the V1.2 signature. Existing native
-- builds therefore keep their proven contract while V1.3 can make the data
-- transition explicit and atomic.
CREATE OR REPLACE FUNCTION public.join_team_by_code_v1_3(
  _code text,
  _confirm_solo_transition boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  actor_id uuid := auth.uid();
  target_team_id uuid;
  target_team_name text;
  target_run public.program_runs;
  active_instance public.program_instances;
  normalized_code text := upper(trim(COALESCE(_code, '')));
  has_program_activity boolean := false;
  has_questionnaire boolean := false;
  questionnaire_complete boolean := false;
  next_cycle integer;
  transition_kind text := 'team_joined';
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  IF length(normalized_code) <> 6
     OR normalized_code !~ '^[A-Z0-9]{6}$' THEN
    RETURN json_build_object('success', false, 'error', 'invalid_code');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = actor_id
      AND ur.role IN ('coach'::public.app_role, 'admin'::public.app_role)
  ) THEN
    RETURN json_build_object('success', false, 'error', 'athlete_account_required');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = actor_id AND ur.role = 'athlete'::public.app_role
  ) THEN
    RETURN json_build_object('success', false, 'error', 'athlete_role_required');
  END IF;

  PERFORM 1
  FROM minor_auth.participant_authorizations pa
  JOIN minor_auth.policy_versions pv ON pv.id = pa.policy_id
  WHERE pa.user_id = actor_id
    AND pa.product_status = 'authorized'
    AND pa.revoked_at IS NULL
    AND pv.status = 'active'
  FOR SHARE OF pa;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'minor_product_authorization_required'
    );
  END IF;

  SELECT t.id, t.name
  INTO target_team_id, target_team_name
  FROM public.teams t
  WHERE t.access_code = normalized_code
    AND COALESCE(t.is_archived, false) = false
  LIMIT 1;

  IF target_team_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'invalid_code');
  END IF;

  SELECT pi.*
  INTO active_instance
  FROM public.program_instances pi
  WHERE pi.user_id = actor_id AND pi.status = 'active'
  FOR UPDATE;

  IF active_instance.id IS NOT NULL
     AND active_instance.team_id IS NOT NULL
     AND active_instance.team_id <> target_team_id THEN
    RETURN json_build_object('success', false, 'error', 'active_other_team_program');
  END IF;

  IF active_instance.id IS NOT NULL THEN
    has_program_activity :=
      EXISTS (SELECT 1 FROM public.daily_checkins x WHERE x.program_instance_id = active_instance.id)
      OR EXISTS (SELECT 1 FROM public.daily_journals x WHERE x.program_instance_id = active_instance.id)
      OR EXISTS (SELECT 1 FROM public.user_day_completion x WHERE x.program_instance_id = active_instance.id)
      OR EXISTS (SELECT 1 FROM public.comprehension_check_instances x WHERE x.program_instance_id = active_instance.id)
      OR EXISTS (SELECT 1 FROM public.assessments x WHERE x.program_instance_id = active_instance.id)
      OR EXISTS (SELECT 1 FROM public.deep_profile_assessments x WHERE x.program_instance_id = active_instance.id)
      OR EXISTS (SELECT 1 FROM public.athlete_transfer_observations x WHERE x.program_instance_id = active_instance.id)
      OR EXISTS (SELECT 1 FROM feedback_core.submissions x WHERE x.program_instance_id = active_instance.id);

    SELECT
      COUNT(*) > 0,
      COALESCE(bool_or(qr.is_complete), false)
    INTO has_questionnaire, questionnaire_complete
    FROM public.questionnaire_responses qr
    WHERE qr.user_id = actor_id
      AND qr.program_instance_id = active_instance.id
      AND qr.timing = 'pre';
  END IF;

  IF active_instance.id IS NOT NULL
     AND active_instance.team_id IS NULL
     AND has_program_activity
     AND NOT _confirm_solo_transition THEN
    RETURN json_build_object(
      'success', false,
      'error', 'solo_program_transition_confirmation_required'
    );
  END IF;

  SELECT pr.*
  INTO target_run
  FROM public.program_runs pr
  WHERE pr.team_id = target_team_id AND pr.status = 'active'
  FOR SHARE;

  IF active_instance.id IS NOT NULL
     AND active_instance.team_id IS NULL
     AND has_program_activity
     AND _confirm_solo_transition THEN
    UPDATE public.program_instances
    SET status = 'abandoned', ended_at = CURRENT_DATE
    WHERE id = active_instance.id;
    active_instance := NULL;
    transition_kind := 'new_team_cycle_started';
  END IF;

  INSERT INTO public.team_members (team_id, user_id)
  VALUES (target_team_id, actor_id)
  ON CONFLICT (team_id, user_id) DO NOTHING;

  IF active_instance.id IS NOT NULL THEN
    UPDATE public.program_instances
    SET team_id = target_team_id,
        program_run_id = COALESCE(target_run.id, program_run_id),
        started_at = COALESCE(target_run.started_at, started_at),
        is_test_instance = COALESCE(
          (SELECT t.is_test_team FROM public.teams t WHERE t.id = target_team_id),
          false
        )
    WHERE id = active_instance.id;

    transition_kind := CASE
      WHEN questionnaire_complete THEN 'completed_questionnaire_preserved'
      WHEN has_questionnaire THEN 'questionnaire_progress_preserved'
      ELSE 'team_scope_attached'
    END;
  ELSIF target_run.id IS NOT NULL OR _confirm_solo_transition THEN
    SELECT COALESCE(MAX(pi.cycle_number), 0) + 1
    INTO next_cycle
    FROM public.program_instances pi
    WHERE pi.user_id = actor_id;

    INSERT INTO public.program_instances (
      user_id, team_id, program_run_id, cycle_number, status, started_at, is_test_instance
    ) VALUES (
      actor_id,
      target_team_id,
      target_run.id,
      next_cycle,
      'active',
      COALESCE(target_run.started_at, CURRENT_DATE),
      COALESCE(
        (SELECT t.is_test_team FROM public.teams t WHERE t.id = target_team_id),
        false
      )
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'team_id', target_team_id,
    'team_name', target_team_name,
    'role', 'athlete',
    'transition', transition_kind
  );
END;
$$;

REVOKE ALL ON FUNCTION public.join_team_by_code_v1_3(text, boolean)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_team_by_code_v1_3(text, boolean)
  TO authenticated;

COMMENT ON FUNCTION public.join_team_by_code_v1_3(text, boolean) IS
  'V1.3 authenticated athlete team join. Preserves questionnaire-only solo state atomically and requires explicit confirmation before isolating real solo-program activity in a historical cycle.';

-- Installed V1.2 clients can remain active during the App Store rollout. Route
-- their original RPC through the same fail-closed transition contract so an
-- older client can never create a membership while silently leaving its
-- questionnaire attached to a solo program instance. A real solo history is
-- never abandoned by an older client because that requires the explicit V1.3
-- confirmation parameter.
CREATE OR REPLACE FUNCTION public.join_team_by_code(_code text)
RETURNS json
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT public.join_team_by_code_v1_3(_code, false);
$$;

REVOKE ALL ON FUNCTION public.join_team_by_code(text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_team_by_code(text)
  TO authenticated;

COMMENT ON FUNCTION public.join_team_by_code(text) IS
  'Compatibility entry point for installed V1.2 clients. Uses the V1.3 fail-closed solo-to-team transition without permission to abandon real solo activity.';

-- When a planned team run starts, questionnaire-only pre-start instances are
-- safe to reuse even if their provisional date differs from the run date.
CREATE OR REPLACE FUNCTION public.assign_team_members_to_program_run(_program_run_id uuid)
RETURNS json
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  target_run public.program_runs;
  athlete record;
  existing_instance public.program_instances;
  next_cycle integer;
  has_program_activity boolean;
  assigned_count integer := 0;
  created_count integer := 0;
  reused_count integer := 0;
  migrated_count integer := 0;
BEGIN
  SELECT * INTO target_run
  FROM public.program_runs
  WHERE id = _program_run_id
  FOR UPDATE;

  IF target_run.id IS NULL THEN RAISE EXCEPTION 'program_run_not_found'; END IF;
  IF NOT public.can_manage_team_program_runs(target_run.team_id) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;
  IF target_run.status <> 'active' OR target_run.started_at IS NULL THEN
    RAISE EXCEPTION 'program_run_must_be_active_before_assignment';
  END IF;

  FOR athlete IN
    SELECT DISTINCT tm.user_id
    FROM public.team_members tm
    JOIN public.user_roles ur
      ON ur.user_id = tm.user_id AND ur.role = 'athlete'::public.app_role
    WHERE tm.team_id = target_run.team_id
  LOOP
    SELECT * INTO existing_instance
    FROM public.program_instances pi
    WHERE pi.user_id = athlete.user_id AND pi.status = 'active'
    FOR UPDATE;

    has_program_activity := false;
    IF existing_instance.id IS NOT NULL THEN
      has_program_activity :=
        EXISTS (SELECT 1 FROM public.daily_checkins x WHERE x.program_instance_id = existing_instance.id)
        OR EXISTS (SELECT 1 FROM public.daily_journals x WHERE x.program_instance_id = existing_instance.id)
        OR EXISTS (SELECT 1 FROM public.user_day_completion x WHERE x.program_instance_id = existing_instance.id)
        OR EXISTS (SELECT 1 FROM public.comprehension_check_instances x WHERE x.program_instance_id = existing_instance.id)
        OR EXISTS (SELECT 1 FROM public.assessments x WHERE x.program_instance_id = existing_instance.id)
        OR EXISTS (SELECT 1 FROM public.deep_profile_assessments x WHERE x.program_instance_id = existing_instance.id)
        OR EXISTS (SELECT 1 FROM public.athlete_transfer_observations x WHERE x.program_instance_id = existing_instance.id)
        OR EXISTS (SELECT 1 FROM feedback_core.submissions x WHERE x.program_instance_id = existing_instance.id);
    END IF;

    IF existing_instance.id IS NOT NULL
       AND existing_instance.program_run_id = target_run.id THEN
      UPDATE public.program_instances
      SET team_id = target_run.team_id,
          started_at = target_run.started_at,
          is_test_instance = COALESCE(
            (SELECT t.is_test_team FROM public.teams t WHERE t.id = target_run.team_id), false
          )
      WHERE id = existing_instance.id;
      reused_count := reused_count + 1;
    ELSIF existing_instance.id IS NOT NULL
       AND existing_instance.program_run_id IS NULL
       AND existing_instance.team_id = target_run.team_id
       AND NOT has_program_activity THEN
      UPDATE public.program_instances
      SET program_run_id = target_run.id,
          started_at = target_run.started_at,
          is_test_instance = COALESCE(
            (SELECT t.is_test_team FROM public.teams t WHERE t.id = target_run.team_id), false
          )
      WHERE id = existing_instance.id;
      reused_count := reused_count + 1;
      migrated_count := migrated_count + 1;
    ELSE
      IF existing_instance.id IS NOT NULL THEN
        UPDATE public.program_instances
        SET status = 'abandoned', ended_at = CURRENT_DATE
        WHERE id = existing_instance.id;
      END IF;

      SELECT COALESCE(MAX(pi.cycle_number), 0) + 1 INTO next_cycle
      FROM public.program_instances pi WHERE pi.user_id = athlete.user_id;

      INSERT INTO public.program_instances (
        user_id, team_id, program_run_id, cycle_number, status, started_at, is_test_instance
      ) VALUES (
        athlete.user_id, target_run.team_id, target_run.id, next_cycle, 'active',
        target_run.started_at,
        COALESCE(
          (SELECT t.is_test_team FROM public.teams t WHERE t.id = target_run.team_id), false
        )
      );
      created_count := created_count + 1;
    END IF;
    assigned_count := assigned_count + 1;
  END LOOP;

  RETURN json_build_object(
    'program_run_id', target_run.id,
    'team_id', target_run.team_id,
    'assigned_athletes', assigned_count,
    'created_instances', created_count,
    'reused_instances', reused_count,
    'migrated_legacy_instances', migrated_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.assign_team_members_to_program_run(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_team_members_to_program_run(uuid)
  TO authenticated;

COMMENT ON FUNCTION public.assign_team_members_to_program_run(uuid) IS
  'Assigns a managed team run while preserving questionnaire-only pre-start instances regardless of provisional date; instances with real program activity remain isolated in their own cycle.';

COMMIT;
