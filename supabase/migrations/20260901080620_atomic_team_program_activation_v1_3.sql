-- Atomically activates a managed team program and binds every athlete's
-- existing team instance to the shared run. This closes the legacy split in
-- which teams.program_start_date could start the athlete experience while
-- run-scoped coach aggregates remained empty.

BEGIN;

CREATE OR REPLACE FUNCTION public.activate_team_program_v1_3(
  _team_id uuid,
  _started_at date
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  actor_id uuid := auth.uid();
  target_team public.teams;
  target_run public.program_runs;
  athlete record;
  existing_instance public.program_instances;
  next_cycle integer;
  athlete_count integer := 0;
  linked_count integer := 0;
  created_count integer := 0;
  reused_count integer := 0;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;
  IF _started_at IS NULL THEN
    RAISE EXCEPTION 'program_start_required' USING ERRCODE = '22004';
  END IF;
  IF NOT public.can_manage_team_program_runs(_team_id) THEN
    RAISE EXCEPTION 'access_denied' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO target_team
  FROM public.teams
  WHERE id = _team_id
  FOR UPDATE;

  IF target_team.id IS NULL THEN
    RAISE EXCEPTION 'team_not_found';
  END IF;
  IF COALESCE(target_team.is_archived, false) THEN
    RAISE EXCEPTION 'archived_team_cannot_start';
  END IF;
  IF target_team.program_activated_at IS NOT NULL
     AND target_team.program_start_date IS DISTINCT FROM _started_at THEN
    RAISE EXCEPTION 'program_start_locked' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO target_run
  FROM public.program_runs
  WHERE team_id = _team_id
    AND status = 'active'
  ORDER BY started_at DESC, created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF target_run.id IS NULL THEN
    INSERT INTO public.program_runs(
      team_id,
      name,
      status,
      started_at,
      created_by,
      metadata
    ) VALUES (
      _team_id,
      left(btrim(target_team.name) || ' · 56-Tage-Programm', 120),
      'active',
      _started_at,
      actor_id,
      jsonb_build_object('activation_source', 'coach_program_start_v1_3')
    )
    RETURNING * INTO target_run;
  ELSIF target_run.started_at IS DISTINCT FROM _started_at THEN
    RAISE EXCEPTION 'active_program_run_start_mismatch';
  END IF;

  SELECT COUNT(DISTINCT member.user_id)::integer
  INTO athlete_count
  FROM public.team_members member
  JOIN public.user_roles role
    ON role.user_id = member.user_id
   AND role.role = 'athlete'::public.app_role
  WHERE member.team_id = _team_id;

  IF athlete_count = 0 THEN
    RAISE EXCEPTION 'team_has_no_athletes';
  END IF;

  FOR athlete IN
    SELECT DISTINCT member.user_id
    FROM public.team_members member
    JOIN public.user_roles role
      ON role.user_id = member.user_id
     AND role.role = 'athlete'::public.app_role
    WHERE member.team_id = _team_id
    ORDER BY member.user_id
  LOOP
    IF (
      SELECT COUNT(*)
      FROM public.program_instances instance
      WHERE instance.user_id = athlete.user_id
        AND instance.status = 'active'
    ) > 1 THEN
      RAISE EXCEPTION 'multiple_active_program_instances';
    END IF;

    SELECT * INTO existing_instance
    FROM public.program_instances instance
    WHERE instance.user_id = athlete.user_id
      AND instance.status = 'active'
    FOR UPDATE;

    IF existing_instance.id IS NULL THEN
      SELECT COALESCE(MAX(instance.cycle_number), 0) + 1
      INTO next_cycle
      FROM public.program_instances instance
      WHERE instance.user_id = athlete.user_id;

      INSERT INTO public.program_instances(
        user_id,
        team_id,
        program_run_id,
        cycle_number,
        status,
        started_at,
        is_test_instance
      ) VALUES (
        athlete.user_id,
        _team_id,
        target_run.id,
        next_cycle,
        'active',
        _started_at,
        COALESCE(target_team.is_test_team, false)
      );
      created_count := created_count + 1;
    ELSIF existing_instance.team_id = _team_id
       AND (
         existing_instance.program_run_id IS NULL
         OR existing_instance.program_run_id = target_run.id
       ) THEN
      UPDATE public.program_instances
      SET program_run_id = target_run.id,
          team_id = _team_id,
          started_at = _started_at,
          is_test_instance = COALESCE(target_team.is_test_team, false)
      WHERE id = existing_instance.id;

      IF existing_instance.program_run_id IS NULL THEN
        linked_count := linked_count + 1;
      ELSE
        reused_count := reused_count + 1;
      END IF;
    ELSE
      -- Never abandon or silently move real activity during team activation.
      RAISE EXCEPTION 'active_program_instance_conflict';
    END IF;
  END LOOP;

  UPDATE public.teams
  SET program_start_date = _started_at,
      program_activated_by = COALESCE(program_activated_by, actor_id),
      program_activated_at = COALESCE(program_activated_at, now())
  WHERE id = _team_id;

  RETURN jsonb_build_object(
    'team_id', _team_id,
    'program_run_id', target_run.id,
    'started_at', _started_at,
    'athletes', athlete_count,
    'linked_existing_instances', linked_count,
    'reused_linked_instances', reused_count,
    'created_instances', created_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.activate_team_program_v1_3(uuid, date)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activate_team_program_v1_3(uuid, date)
  TO authenticated;

COMMENT ON FUNCTION public.activate_team_program_v1_3(uuid, date) IS
  'Atomically confirms a team start, creates its shared run and preserves existing same-team instance IDs while linking them to that run.';

-- Older native builds and already-cached web bundles still write the legacy
-- activation columns directly. Keep that supported, but enforce the same
-- atomic run/instance contract at the database boundary so no client version
-- can create another split-brain team start.
CREATE OR REPLACE FUNCTION public.ensure_activated_team_program_run_v1_3()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.program_activated_at IS NOT NULL
     AND NEW.program_start_date IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM public.program_runs run
       WHERE run.team_id = NEW.id
         AND run.status = 'active'
     ) THEN
    PERFORM public.activate_team_program_v1_3(
      NEW.id,
      NEW.program_start_date
    );
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_activated_team_program_run_v1_3()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS ensure_activated_team_program_run_v1_3
  ON public.teams;
CREATE TRIGGER ensure_activated_team_program_run_v1_3
AFTER UPDATE OF program_start_date, program_activated_at
ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.ensure_activated_team_program_run_v1_3();

COMMENT ON FUNCTION public.ensure_activated_team_program_run_v1_3() IS
  'Backward-compatible database guard: every legacy direct team activation is converted into the canonical shared program run atomically.';

COMMIT;
