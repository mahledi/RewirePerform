-- Preserve already-running team cycles when the program_runs model is enabled
-- for a legacy team. A matching unassigned instance is linked to the run in
-- place so its check-ins, journals, assessments and progress stay continuous.

BEGIN;

CREATE OR REPLACE FUNCTION public.assign_team_members_to_program_run(_program_run_id uuid)
RETURNS json
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_run public.program_runs;
  athlete record;
  existing_instance public.program_instances;
  next_cycle integer;
  assigned_count integer := 0;
  created_count integer := 0;
  reused_count integer := 0;
  migrated_count integer := 0;
BEGIN
  SELECT * INTO target_run
  FROM public.program_runs
  WHERE id = _program_run_id
  FOR UPDATE;

  IF target_run.id IS NULL THEN
    RAISE EXCEPTION 'program_run_not_found';
  END IF;
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
      ON ur.user_id = tm.user_id AND ur.role = 'athlete'
    WHERE tm.team_id = target_run.team_id
  LOOP
    SELECT * INTO existing_instance
    FROM public.program_instances pi
    WHERE pi.user_id = athlete.user_id AND pi.status = 'active'
    FOR UPDATE;

    IF existing_instance.id IS NOT NULL
       AND existing_instance.program_run_id = target_run.id THEN
      UPDATE public.program_instances
      SET team_id = target_run.team_id,
          started_at = target_run.started_at,
          is_test_instance = COALESCE(
            (SELECT is_test_team FROM public.teams WHERE id = target_run.team_id),
            false
          )
      WHERE id = existing_instance.id;
      reused_count := reused_count + 1;
    ELSIF existing_instance.id IS NOT NULL
       AND existing_instance.program_run_id IS NULL
       AND existing_instance.team_id = target_run.team_id
       AND existing_instance.started_at = target_run.started_at THEN
      UPDATE public.program_instances
      SET program_run_id = target_run.id,
          is_test_instance = COALESCE(
            (SELECT is_test_team FROM public.teams WHERE id = target_run.team_id),
            false
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

      SELECT COALESCE(MAX(pi.cycle_number), 0) + 1
      INTO next_cycle
      FROM public.program_instances pi
      WHERE pi.user_id = athlete.user_id;

      INSERT INTO public.program_instances(
        user_id, team_id, program_run_id, cycle_number, status, started_at, is_test_instance
      )
      VALUES (
        athlete.user_id,
        target_run.team_id,
        target_run.id,
        next_cycle,
        'active',
        target_run.started_at,
        COALESCE(
          (SELECT is_test_team FROM public.teams WHERE id = target_run.team_id),
          false
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

REVOKE ALL ON FUNCTION public.assign_team_members_to_program_run(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_team_members_to_program_run(uuid) TO authenticated;

COMMENT ON FUNCTION public.assign_team_members_to_program_run(uuid) IS
  'Assigns the authenticated manager team roster to a run; matching legacy active instances are linked in place to preserve their tracking history.';

COMMIT;
