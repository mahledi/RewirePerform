-- NLZ pilot runs and atomic daily tracking V2
--
-- Additive data model for a synchronized team pilot. Existing program instances
-- and tracking rows remain untouched until a manager explicitly assigns a run.

BEGIN;

CREATE TABLE IF NOT EXISTS public.program_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 120),
  status text NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'active', 'completed', 'archived')),
  started_at date,
  ended_at date,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  CHECK (ended_at IS NULL OR started_at IS NULL OR ended_at >= started_at),
  CHECK (status IN ('planned', 'archived') OR started_at IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_program_runs_active_per_team
  ON public.program_runs(team_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_program_runs_team_created
  ON public.program_runs(team_id, created_at DESC);

ALTER TABLE public.program_instances
  ADD COLUMN IF NOT EXISTS program_run_id uuid REFERENCES public.program_runs(id) ON DELETE RESTRICT;

ALTER TABLE public.deep_profile_assessments
  ADD COLUMN IF NOT EXISTS program_instance_id uuid;

CREATE INDEX IF NOT EXISTS idx_program_instances_run_user
  ON public.program_instances(program_run_id, user_id)
  WHERE program_run_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_deep_profile_program_instance
  ON public.deep_profile_assessments(program_instance_id, timing)
  WHERE program_instance_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_deep_profile_instance_instrument_timing
  ON public.deep_profile_assessments(user_id, program_instance_id, instrument_id, timing)
  WHERE user_id IS NOT NULL AND program_instance_id IS NOT NULL AND instrument_id IS NOT NULL;

-- The original schema still had a session/date constraint. It prevents a new
-- cycle on the same calendar date even though the newer uniqueness is scoped
-- by program_instance_id.
ALTER TABLE public.daily_checkins
  DROP CONSTRAINT IF EXISTS daily_checkins_session_id_date_key;

-- Enforce instance ownership for all new tracking rows without rejecting
-- historical orphan rows during migration deployment.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'daily_checkins_program_instance_fkey') THEN
    ALTER TABLE public.daily_checkins
      ADD CONSTRAINT daily_checkins_program_instance_fkey
      FOREIGN KEY (program_instance_id) REFERENCES public.program_instances(id) ON DELETE RESTRICT NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'daily_journals_program_instance_fkey') THEN
    ALTER TABLE public.daily_journals
      ADD CONSTRAINT daily_journals_program_instance_fkey
      FOREIGN KEY (program_instance_id) REFERENCES public.program_instances(id) ON DELETE RESTRICT NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_day_completion_program_instance_fkey') THEN
    ALTER TABLE public.user_day_completion
      ADD CONSTRAINT user_day_completion_program_instance_fkey
      FOREIGN KEY (program_instance_id) REFERENCES public.program_instances(id) ON DELETE RESTRICT NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comprehension_program_instance_fkey') THEN
    ALTER TABLE public.comprehension_check_instances
      ADD CONSTRAINT comprehension_program_instance_fkey
      FOREIGN KEY (program_instance_id) REFERENCES public.program_instances(id) ON DELETE RESTRICT NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assessments_program_instance_fkey') THEN
    ALTER TABLE public.assessments
      ADD CONSTRAINT assessments_program_instance_fkey
      FOREIGN KEY (program_instance_id) REFERENCES public.program_instances(id) ON DELETE RESTRICT NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'snapshots_program_instance_fkey') THEN
    ALTER TABLE public.program_progress_snapshots
      ADD CONSTRAINT snapshots_program_instance_fkey
      FOREIGN KEY (program_instance_id) REFERENCES public.program_instances(id) ON DELETE RESTRICT NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deep_profile_program_instance_fkey') THEN
    ALTER TABLE public.deep_profile_assessments
      ADD CONSTRAINT deep_profile_program_instance_fkey
      FOREIGN KEY (program_instance_id) REFERENCES public.program_instances(id) ON DELETE RESTRICT NOT VALID;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.touch_program_runs_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_program_runs ON public.program_runs;
CREATE TRIGGER trg_touch_program_runs
  BEFORE UPDATE ON public.program_runs
  FOR EACH ROW EXECUTE FUNCTION public.touch_program_runs_updated_at();

CREATE OR REPLACE FUNCTION public.archive_program_runs_with_team()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(OLD.is_archived, false) = false AND COALESCE(NEW.is_archived, false) = true THEN
    UPDATE public.program_runs
    SET status = 'archived',
        ended_at = CASE WHEN started_at IS NOT NULL THEN COALESCE(ended_at, CURRENT_DATE) ELSE ended_at END
    WHERE team_id = NEW.id AND status IN ('planned', 'active', 'completed');

    UPDATE public.program_instances
    SET status = CASE WHEN status = 'active' THEN 'abandoned' ELSE status END,
        ended_at = CASE WHEN status = 'active' THEN COALESCE(ended_at, CURRENT_DATE) ELSE ended_at END
    WHERE team_id = NEW.id AND status = 'active';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_archive_program_runs_with_team ON public.teams;
CREATE TRIGGER trg_archive_program_runs_with_team
  AFTER UPDATE OF is_archived ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.archive_program_runs_with_team();

CREATE OR REPLACE FUNCTION public.can_manage_team_program_runs(_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = _team_id AND t.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.team_members tm
      JOIN public.user_roles ur
        ON ur.user_id = tm.user_id AND ur.role = 'coach'
      WHERE tm.team_id = _team_id AND tm.user_id = auth.uid()
    )
  );
$$;

REVOKE ALL ON FUNCTION public.can_manage_team_program_runs(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_team_program_runs(uuid) TO authenticated;

ALTER TABLE public.program_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team members read program runs" ON public.program_runs;
DROP POLICY IF EXISTS "Managers create program runs" ON public.program_runs;
DROP POLICY IF EXISTS "Managers update program runs" ON public.program_runs;
DROP POLICY IF EXISTS "Managers delete planned program runs" ON public.program_runs;

CREATE POLICY "Team members read program runs"
  ON public.program_runs FOR SELECT TO authenticated
  USING (
    public.can_manage_team_program_runs(team_id)
    OR public.is_member_of_team(team_id)
    OR EXISTS (
      SELECT 1 FROM public.program_instances pi
      WHERE pi.program_run_id = program_runs.id AND pi.user_id = auth.uid()
    )
  );

-- Athletes may create a solo/team-member instance, but may not self-assign a
-- managed run or alter cohort ownership after creation.
DROP POLICY IF EXISTS "Users insert own instances" ON public.program_instances;
DROP POLICY IF EXISTS "Users update own instances" ON public.program_instances;
DROP POLICY IF EXISTS "Managers read team instances" ON public.program_instances;

CREATE POLICY "Users insert own unassigned instances"
  ON public.program_instances FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND program_run_id IS NULL
    AND status = 'active'
    AND (team_id IS NULL OR public.is_member_of_team(team_id))
  );

CREATE POLICY "Managers read team instances"
  ON public.program_instances FOR SELECT TO authenticated
  USING (team_id IS NOT NULL AND public.can_manage_team_program_runs(team_id));

CREATE OR REPLACE FUNCTION public.validate_program_instance_run()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  run_team_id uuid;
  run_start date;
BEGIN
  IF NEW.program_run_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT pr.team_id, pr.started_at
  INTO run_team_id, run_start
  FROM public.program_runs pr
  WHERE pr.id = NEW.program_run_id;

  IF run_team_id IS NULL THEN
    RAISE EXCEPTION 'program_run_not_found';
  END IF;
  IF NEW.team_id IS DISTINCT FROM run_team_id THEN
    RAISE EXCEPTION 'program_instance_team_must_match_run';
  END IF;
  IF run_start IS NOT NULL AND NEW.started_at IS DISTINCT FROM run_start THEN
    RAISE EXCEPTION 'program_instance_start_must_match_run';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_program_instance_run ON public.program_instances;
CREATE TRIGGER trg_validate_program_instance_run
  BEFORE INSERT OR UPDATE OF program_run_id, team_id, started_at
  ON public.program_instances
  FOR EACH ROW EXECUTE FUNCTION public.validate_program_instance_run();

CREATE OR REPLACE FUNCTION public.create_team_program_run(
  _team_id uuid,
  _name text,
  _started_at date DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  created_run public.program_runs;
BEGIN
  IF NOT public.can_manage_team_program_runs(_team_id) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;
  IF length(btrim(COALESCE(_name, ''))) < 2 THEN
    RAISE EXCEPTION 'program_run_name_required';
  END IF;

  INSERT INTO public.program_runs(team_id, name, status, started_at, created_by)
  VALUES (_team_id, btrim(_name), 'planned', _started_at, auth.uid())
  RETURNING * INTO created_run;

  RETURN row_to_json(created_run);
END;
$$;

CREATE OR REPLACE FUNCTION public.activate_team_program_run(_program_run_id uuid)
RETURNS json
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_run public.program_runs;
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
  IF target_run.status IN ('completed', 'archived') THEN
    RAISE EXCEPTION 'completed_or_archived_run_cannot_be_activated';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.program_runs pr
    WHERE pr.team_id = target_run.team_id
      AND pr.status = 'active'
      AND pr.id <> target_run.id
  ) THEN
    RAISE EXCEPTION 'team_already_has_active_program_run';
  END IF;

  UPDATE public.program_runs
  SET status = 'active', started_at = COALESCE(started_at, CURRENT_DATE), ended_at = NULL
  WHERE id = target_run.id
  RETURNING * INTO target_run;

  RETURN row_to_json(target_run);
END;
$$;

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
          is_test_instance = COALESCE((SELECT is_test_team FROM public.teams WHERE id = target_run.team_id), false)
      WHERE id = existing_instance.id;
      reused_count := reused_count + 1;
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
        COALESCE((SELECT is_test_team FROM public.teams WHERE id = target_run.team_id), false)
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
    'reused_instances', reused_count
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_active_team_program_run(_team_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_run public.program_runs;
BEGIN
  IF NOT (
    public.can_manage_team_program_runs(_team_id)
    OR public.is_member_of_team(_team_id)
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  SELECT * INTO active_run
  FROM public.program_runs
  WHERE team_id = _team_id AND status = 'active'
  ORDER BY started_at DESC, created_at DESC
  LIMIT 1;

  RETURN CASE WHEN active_run.id IS NULL THEN NULL ELSE row_to_json(active_run) END;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_team_program_run_status(_program_run_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_run public.program_runs;
  result json;
BEGIN
  SELECT * INTO target_run FROM public.program_runs WHERE id = _program_run_id;
  IF target_run.id IS NULL THEN
    RAISE EXCEPTION 'program_run_not_found';
  END IF;
  IF NOT (
    public.can_manage_team_program_runs(target_run.team_id)
    OR public.is_member_of_team(target_run.team_id)
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  WITH athletes AS (
    SELECT DISTINCT tm.user_id
    FROM public.team_members tm
    JOIN public.user_roles ur
      ON ur.user_id = tm.user_id AND ur.role = 'athlete'
    WHERE tm.team_id = target_run.team_id
  ), assigned AS (
    SELECT pi.user_id, pi.id, pi.status
    FROM public.program_instances pi
    JOIN athletes a ON a.user_id = pi.user_id
    WHERE pi.program_run_id = target_run.id
  )
  SELECT json_build_object(
    'run', row_to_json(target_run),
    'athletes_total', (SELECT COUNT(*) FROM athletes),
    'athletes_assigned', (SELECT COUNT(DISTINCT user_id) FROM assigned),
    'active_instances', (SELECT COUNT(*) FROM assigned WHERE status = 'active'),
    'athletes_missing_instance', (
      SELECT COUNT(*) FROM athletes a
      WHERE NOT EXISTS (SELECT 1 FROM assigned x WHERE x.user_id = a.user_id)
    )
  ) INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_team_program_run_status(
  _program_run_id uuid,
  _status text
)
RETURNS json
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_run public.program_runs;
BEGIN
  SELECT * INTO target_run
  FROM public.program_runs
  WHERE id = _program_run_id
  FOR UPDATE;

  IF target_run.id IS NULL THEN RAISE EXCEPTION 'program_run_not_found'; END IF;
  IF NOT public.can_manage_team_program_runs(target_run.team_id) THEN RAISE EXCEPTION 'access_denied'; END IF;
  IF _status NOT IN ('completed', 'archived') THEN RAISE EXCEPTION 'invalid_target_status'; END IF;
  IF _status = 'archived' AND target_run.status = 'active' THEN
    RAISE EXCEPTION 'active_run_must_be_completed_before_archiving';
  END IF;

  UPDATE public.program_runs
  SET status = _status,
      ended_at = CASE WHEN _status = 'completed' THEN COALESCE(ended_at, CURRENT_DATE) ELSE ended_at END
  WHERE id = target_run.id
  RETURNING * INTO target_run;

  IF _status = 'completed' THEN
    UPDATE public.program_instances
    SET status = 'completed', ended_at = COALESCE(ended_at, target_run.ended_at)
    WHERE program_run_id = target_run.id AND status = 'active';
  END IF;

  RETURN row_to_json(target_run);
END;
$$;

-- Atomic final save. Check-in, day completion and optional comprehension are
-- committed together. A failed check-in can therefore never create a false
-- completed day.
CREATE OR REPLACE FUNCTION public.save_daily_tracking_v2(
  _assignment_id uuid,
  _date date,
  _event_type text,
  _day_number integer,
  _variant_used text,
  _program_instance_id uuid,
  _tasks_completed jsonb DEFAULT '[]'::jsonb,
  _reflection text DEFAULT NULL,
  _mood_before integer DEFAULT NULL,
  _energy_level integer DEFAULT NULL,
  _focus_rating integer DEFAULT NULL,
  _stress integer DEFAULT NULL,
  _recovery integer DEFAULT NULL,
  _sleep_quality integer DEFAULT NULL,
  _physical_readiness integer DEFAULT NULL,
  _motivation integer DEFAULT NULL,
  _pressure integer DEFAULT NULL,
  _team_connection integer DEFAULT NULL,
  _comprehension_questions jsonb DEFAULT NULL,
  _comprehension_results jsonb DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id uuid := auth.uid();
  target_instance public.program_instances;
  target_assignment public.user_day_assignments;
  checkin_id uuid;
  completion_id uuid;
  comprehension_id uuid;
  existing_completion public.user_day_completion;
  existing_comprehension public.comprehension_check_instances;
  v_correct_count integer := 0;
  v_total_count integer := 0;
  wellbeing jsonb;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;
  IF _event_type NOT IN ('training', 'rest', 'competition') THEN
    RAISE EXCEPTION 'invalid_event_type';
  END IF;
  IF _tasks_completed IS NULL OR jsonb_typeof(_tasks_completed) <> 'array' THEN
    RAISE EXCEPTION 'tasks_completed_must_be_array';
  END IF;

  IF _program_instance_id IS NULL THEN
    SELECT * INTO target_instance
    FROM public.program_instances
    WHERE user_id = actor_id AND status = 'active'
    ORDER BY started_at DESC, created_at DESC
    LIMIT 1;
  ELSE
    SELECT * INTO target_instance
    FROM public.program_instances
    WHERE id = _program_instance_id;
  END IF;

  IF target_instance.id IS NULL OR target_instance.user_id <> actor_id OR target_instance.status <> 'active' THEN
    RAISE EXCEPTION 'active_program_instance_required';
  END IF;

  SELECT * INTO target_assignment
  FROM public.user_day_assignments
  WHERE id = _assignment_id AND user_id = actor_id;

  IF target_assignment.id IS NULL THEN
    RAISE EXCEPTION 'assignment_not_found_or_not_owned';
  END IF;
  IF target_assignment.date <> _date OR target_assignment.assigned_day_number <> _day_number THEN
    RAISE EXCEPTION 'assignment_date_or_day_mismatch';
  END IF;
  IF _day_number < 1 OR _day_number > 56 THEN
    RAISE EXCEPTION 'invalid_program_day';
  END IF;

  IF (_mood_before IS NOT NULL AND _mood_before NOT BETWEEN 1 AND 10)
    OR (_energy_level IS NOT NULL AND _energy_level NOT BETWEEN 1 AND 10)
    OR (_focus_rating IS NOT NULL AND _focus_rating NOT BETWEEN 1 AND 10)
    OR (_stress IS NOT NULL AND _stress NOT BETWEEN 1 AND 10)
    OR (_recovery IS NOT NULL AND _recovery NOT BETWEEN 1 AND 10)
    OR (_sleep_quality IS NOT NULL AND _sleep_quality NOT BETWEEN 1 AND 10)
    OR (_physical_readiness IS NOT NULL AND _physical_readiness NOT BETWEEN 1 AND 10)
    OR (_motivation IS NOT NULL AND _motivation NOT BETWEEN 1 AND 10)
    OR (_pressure IS NOT NULL AND _pressure NOT BETWEEN 1 AND 10)
    OR (_team_connection IS NOT NULL AND _team_connection NOT BETWEEN 1 AND 10)
  THEN
    RAISE EXCEPTION 'pulse_values_must_be_between_1_and_10';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(actor_id::text || ':' || target_instance.id::text || ':' || _date::text, 0)
  );

  wellbeing := jsonb_build_object(
    'mood', _mood_before,
    'energy', _energy_level,
    'focus', _focus_rating,
    'stress', _stress,
    'recovery', _recovery,
    'sleep_quality', _sleep_quality,
    'physical_readiness', _physical_readiness,
    'motivation', _motivation,
    'pressure', _pressure,
    'team_connection', _team_connection
  );

  SELECT dc.id INTO checkin_id
  FROM public.daily_checkins dc
  WHERE dc.user_id = actor_id
    AND dc.program_instance_id = target_instance.id
    AND dc.date = _date
  FOR UPDATE;

  IF checkin_id IS NULL THEN
    INSERT INTO public.daily_checkins(
      session_id, user_id, date, event_type, mood_before, energy_level,
      focus_rating, tasks_completed, reflection, wellbeing_metrics, program_instance_id
    )
    VALUES (
      actor_id::text, actor_id, _date, _event_type, _mood_before, _energy_level,
      _focus_rating, _tasks_completed, NULLIF(btrim(COALESCE(_reflection, '')), ''),
      wellbeing, target_instance.id
    )
    RETURNING id INTO checkin_id;
  ELSE
    UPDATE public.daily_checkins
    SET event_type = _event_type,
        mood_before = _mood_before,
        energy_level = _energy_level,
        focus_rating = _focus_rating,
        tasks_completed = _tasks_completed,
        reflection = NULLIF(btrim(COALESCE(_reflection, '')), ''),
        wellbeing_metrics = wellbeing
    WHERE id = checkin_id;
  END IF;

  SELECT * INTO existing_completion
  FROM public.user_day_completion
  WHERE assignment_id = target_assignment.id
  FOR UPDATE;

  IF existing_completion.id IS NULL THEN
    INSERT INTO public.user_day_completion(
      assignment_id, user_id, day_number, opened_at, completed_at,
      completion_status, task_completion, variant_used, program_instance_id
    )
    VALUES (
      target_assignment.id, actor_id, _day_number, now(), now(),
      'completed', _tasks_completed, _variant_used, target_instance.id
    )
    RETURNING id INTO completion_id;
  ELSE
    UPDATE public.user_day_completion
    SET day_number = _day_number,
        completion_status = 'completed',
        task_completion = _tasks_completed,
        variant_used = _variant_used,
        program_instance_id = target_instance.id,
        completed_at = COALESCE(existing_completion.completed_at, now())
    WHERE id = existing_completion.id
    RETURNING id INTO completion_id;
  END IF;

  IF _comprehension_results IS NOT NULL OR _comprehension_questions IS NOT NULL THEN
    IF jsonb_typeof(COALESCE(_comprehension_questions, 'null'::jsonb)) <> 'array'
       OR jsonb_typeof(COALESCE(_comprehension_results, 'null'::jsonb)) <> 'array' THEN
      RAISE EXCEPTION 'comprehension_payload_must_use_arrays';
    END IF;

    v_total_count := jsonb_array_length(_comprehension_questions);
    SELECT COUNT(*)::integer INTO v_correct_count
    FROM jsonb_array_elements(_comprehension_results) item
    WHERE lower(COALESCE(item ->> 'isCorrect', 'false')) = 'true';

    IF jsonb_array_length(_comprehension_results) <> v_total_count THEN
      RAISE EXCEPTION 'comprehension_question_result_count_mismatch';
    END IF;

    SELECT * INTO existing_comprehension
    FROM public.comprehension_check_instances
    WHERE assignment_id = target_assignment.id
    FOR UPDATE;

    IF existing_comprehension.id IS NULL THEN
      INSERT INTO public.comprehension_check_instances(
        assignment_id, user_id, day_number, generated_questions, results,
        correct_count, total_count, status, completed_at, program_instance_id
      )
      VALUES (
        target_assignment.id, actor_id, _day_number, _comprehension_questions,
        _comprehension_results, v_correct_count, v_total_count, 'completed', now(), target_instance.id
      )
      RETURNING id INTO comprehension_id;
    ELSE
      UPDATE public.comprehension_check_instances
      SET day_number = _day_number,
          generated_questions = _comprehension_questions,
          results = _comprehension_results,
          correct_count = v_correct_count,
          total_count = v_total_count,
          status = 'completed',
          completed_at = COALESCE(existing_comprehension.completed_at, now()),
          program_instance_id = target_instance.id
      WHERE id = existing_comprehension.id
      RETURNING id INTO comprehension_id;
    END IF;
  END IF;

  RETURN json_build_object(
    'checkin_id', checkin_id,
    'completion_id', completion_id,
    'comprehension_id', comprehension_id,
    'program_instance_id', target_instance.id,
    'program_run_id', target_instance.program_run_id,
    'date', _date,
    'day_number', _day_number
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_team_program_run(uuid, text, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.activate_team_program_run(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.assign_team_members_to_program_run(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_active_team_program_run(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_team_program_run_status(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_team_program_run_status(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.save_daily_tracking_v2(
  uuid, date, text, integer, text, uuid, jsonb, text,
  integer, integer, integer, integer, integer, integer, integer, integer, integer, integer,
  jsonb, jsonb
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_team_program_run(uuid, text, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.activate_team_program_run(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_team_members_to_program_run(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_team_program_run(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_program_run_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_team_program_run_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_daily_tracking_v2(
  uuid, date, text, integer, text, uuid, jsonb, text,
  integer, integer, integer, integer, integer, integer, integer, integer, integer, integer,
  jsonb, jsonb
) TO authenticated;

COMMENT ON TABLE public.program_runs IS
  'Synchronized team pilot/program cohort. One active run per team.';
COMMENT ON COLUMN public.program_instances.program_run_id IS
  'Optional synchronized team run. Historical and solo instances may remain null.';
COMMENT ON FUNCTION public.save_daily_tracking_v2 IS
  'Atomically persists a private daily check-in, completed day and optional comprehension result.';

COMMIT;
