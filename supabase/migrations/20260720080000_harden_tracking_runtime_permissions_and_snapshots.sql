BEGIN;

-- Remove the anonymous RPC surface identified by the production advisor.
-- Authenticated grants remain only where RLS policies or app RPCs need them.
REVOKE ALL ON FUNCTION public.can_manage_team_calendar(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_admin_ops_status(boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_admin_overview_stats(boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_admin_teams_summary(boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_effective_today(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_coach_of_user(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_creator_of_team(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_member_of_team(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.can_manage_team_calendar(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_ops_status(boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_overview_stats(boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_teams_summary(boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_coach_of_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_creator_of_team(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_member_of_team(uuid) TO authenticated;

-- Signup trigger functions are internal trigger paths, never client RPCs.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;

-- Progress snapshots are derived server data. Athletes may read their own row,
-- but every write must pass through refresh_my_program_progress_snapshot.
DROP POLICY IF EXISTS "Users insert own snapshots" ON public.program_progress_snapshots;
DROP POLICY IF EXISTS "Users update own snapshots" ON public.program_progress_snapshots;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.program_progress_snapshots
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.program_progress_snapshots TO authenticated;

-- Role lookup is an explicit self-or-admin contract. RLS uses has_role()
-- directly and is therefore unaffected by this public helper restriction.
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS public.app_role
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  actor_id uuid := auth.uid();
  result public.app_role;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  IF actor_id <> _user_id
     AND NOT EXISTS (
       SELECT 1
       FROM public.user_roles ur
       WHERE ur.user_id = actor_id
         AND ur.role = 'admin'::public.app_role
     ) THEN
    RAISE EXCEPTION 'role_lookup_forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT ur.role
  INTO result
  FROM public.user_roles ur
  WHERE ur.user_id = _user_id
  ORDER BY CASE ur.role
    WHEN 'admin'::public.app_role THEN 1
    WHEN 'coach'::public.app_role THEN 2
    ELSE 3
  END
  LIMIT 1;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;

-- QA time can only be resolved for the current user or by an admin. This
-- prevents a known UUID from exposing another account's test/QA date state.
CREATE OR REPLACE FUNCTION public.get_effective_today(_user_id uuid)
RETURNS date
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  actor_id uuid := auth.uid();
  is_admin boolean := false;
  is_test boolean := false;
  simulated_today date;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = actor_id
      AND ur.role = 'admin'::public.app_role
  ) INTO is_admin;

  IF actor_id <> _user_id AND NOT is_admin THEN
    RAISE EXCEPTION 'effective_today_forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(p.is_test_user, false)
  INTO is_test
  FROM public.profiles p
  WHERE p.id = _user_id;

  IF NOT COALESCE(is_test, false) THEN
    RETURN CURRENT_DATE;
  END IF;

  SELECT qto.simulated_date
  INTO simulated_today
  FROM public.qa_time_overrides qto
  WHERE qto.scope = 'user'
    AND qto.user_id = _user_id
  ORDER BY qto.updated_at DESC
  LIMIT 1;

  IF simulated_today IS NOT NULL THEN
    RETURN simulated_today;
  END IF;

  SELECT qto.simulated_date
  INTO simulated_today
  FROM public.qa_time_overrides qto
  JOIN public.team_members tm ON tm.team_id = qto.team_id
  WHERE qto.scope = 'team'
    AND tm.user_id = _user_id
  ORDER BY qto.updated_at DESC
  LIMIT 1;

  RETURN COALESCE(simulated_today, CURRENT_DATE);
END;
$$;

REVOKE ALL ON FUNCTION public.get_effective_today(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_effective_today(uuid) TO authenticated;

-- Recompute the current athlete's progress in one server-side transaction.
-- The advisory lock plus the instance-scoped unique index make concurrent
-- dashboard loads and post-check-in refreshes idempotent.
CREATE OR REPLACE FUNCTION public.refresh_my_program_progress_snapshot(
  _program_instance_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  actor_id uuid := auth.uid();
  target_instance public.program_instances;
  effective_today date;
  program_day integer;
  days_available integer := 0;
  days_completed integer := 0;
  completion_rate numeric(5,4) := 0;
  current_streak integer := 0;
  longest_streak integer := 0;
  latest_run_length integer := 0;
  latest_completed_date date;
  comprehension_average numeric(5,4);
  tasks_completed_count integer := 0;
  checkins_completed_count integer := 0;
  journals_completed_count integer := 0;
  result jsonb;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  IF _program_instance_id IS NULL THEN
    SELECT pi.*
    INTO target_instance
    FROM public.program_instances pi
    WHERE pi.user_id = actor_id
      AND pi.status = 'active'
    ORDER BY pi.created_at DESC
    LIMIT 1;
  ELSE
    SELECT pi.*
    INTO target_instance
    FROM public.program_instances pi
    WHERE pi.id = _program_instance_id
      AND pi.user_id = actor_id
      AND pi.status = 'active';
  END IF;

  IF target_instance.id IS NULL THEN
    RAISE EXCEPTION 'active_program_instance_required';
  END IF;

  effective_today := public.get_effective_today(actor_id);
  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      actor_id::text || ':' || target_instance.id::text || ':' || effective_today::text,
      0
    )
  );

  IF effective_today < target_instance.started_at THEN
    program_day := NULL;
    days_available := 0;
  ELSE
    days_available := LEAST(56, (effective_today - target_instance.started_at) + 1);
    program_day := days_available;
  END IF;

  WITH latest_completed_days AS (
    SELECT DISTINCT ON (udc.day_number)
      udc.day_number,
      udc.task_completion
    FROM public.user_day_completion udc
    WHERE udc.user_id = actor_id
      AND udc.program_instance_id = target_instance.id
      AND udc.completion_status = 'completed'
      AND udc.day_number BETWEEN 1 AND days_available
    ORDER BY udc.day_number, udc.completed_at DESC NULLS LAST, udc.id DESC
  )
  SELECT
    COUNT(*)::integer,
    COALESCE(SUM(
      CASE
        WHEN jsonb_typeof(lcd.task_completion) = 'array'
          THEN jsonb_array_length(lcd.task_completion)
        ELSE 0
      END
    ), 0)::integer
  INTO days_completed, tasks_completed_count
  FROM latest_completed_days lcd;

  completion_rate := CASE
    WHEN days_available <= 0 THEN 0
    ELSE LEAST(1, days_completed::numeric / days_available::numeric)
  END::numeric(5,4);

  WITH latest_completed_days AS (
    SELECT DISTINCT ON (udc.day_number)
      udc.day_number,
      COALESCE(
        uda.date,
        udc.completed_at::date,
        target_instance.started_at + (udc.day_number - 1)
      ) AS completed_date
    FROM public.user_day_completion udc
    LEFT JOIN public.user_day_assignments uda ON uda.id = udc.assignment_id
    WHERE udc.user_id = actor_id
      AND udc.program_instance_id = target_instance.id
      AND udc.completion_status = 'completed'
      AND udc.day_number BETWEEN 1 AND days_available
    ORDER BY udc.day_number, udc.completed_at ASC NULLS LAST, udc.id ASC
  ), completed_dates AS (
    SELECT DISTINCT lcd.completed_date
    FROM latest_completed_days lcd
    WHERE lcd.completed_date <= effective_today
  ), ordered_dates AS (
    SELECT
      cd.completed_date,
      cd.completed_date - (ROW_NUMBER() OVER (ORDER BY cd.completed_date))::integer AS run_key
    FROM completed_dates cd
  ), runs AS (
    SELECT
      od.run_key,
      COUNT(*)::integer AS run_length,
      MAX(od.completed_date) AS run_end
    FROM ordered_dates od
    GROUP BY od.run_key
  )
  SELECT
    COALESCE(MAX(r.run_length), 0),
    COALESCE((ARRAY_AGG(r.run_length ORDER BY r.run_end DESC))[1], 0),
    MAX(r.run_end)
  INTO longest_streak, latest_run_length, latest_completed_date
  FROM runs r;

  current_streak := CASE
    WHEN latest_completed_date IS NOT NULL
      AND effective_today - latest_completed_date <= 1
      THEN latest_run_length
    ELSE 0
  END;

  SELECT COUNT(DISTINCT dc.date)::integer
  INTO checkins_completed_count
  FROM public.daily_checkins dc
  WHERE dc.user_id = actor_id
    AND dc.program_instance_id = target_instance.id;

  SELECT COUNT(DISTINCT dj.date)::integer
  INTO journals_completed_count
  FROM public.daily_journals dj
  WHERE dj.user_id = actor_id
    AND dj.program_instance_id = target_instance.id;

  SELECT ROUND(AVG(
    cci.correct_count::numeric / NULLIF(cci.total_count, 0)::numeric
  ), 4)::numeric(5,4)
  INTO comprehension_average
  FROM public.comprehension_check_instances cci
  WHERE cci.user_id = actor_id
    AND cci.program_instance_id = target_instance.id
    AND cci.status = 'completed'
    AND cci.total_count > 0
    AND cci.correct_count BETWEEN 0 AND cci.total_count;

  INSERT INTO public.program_progress_snapshots(
    user_id,
    team_id,
    program_instance_id,
    date,
    program_day,
    days_available,
    days_completed,
    completion_rate,
    current_streak,
    longest_streak,
    comprehension_average,
    tasks_completed_count,
    checkins_completed_count,
    journals_completed_count
  ) VALUES (
    actor_id,
    target_instance.team_id,
    target_instance.id,
    effective_today,
    program_day,
    days_available,
    days_completed,
    completion_rate,
    current_streak,
    longest_streak,
    comprehension_average,
    tasks_completed_count,
    checkins_completed_count,
    journals_completed_count
  )
  ON CONFLICT (user_id, program_instance_id, date)
    WHERE program_instance_id IS NOT NULL
  DO UPDATE SET
    team_id = EXCLUDED.team_id,
    program_day = EXCLUDED.program_day,
    days_available = EXCLUDED.days_available,
    days_completed = EXCLUDED.days_completed,
    completion_rate = EXCLUDED.completion_rate,
    current_streak = EXCLUDED.current_streak,
    longest_streak = EXCLUDED.longest_streak,
    comprehension_average = EXCLUDED.comprehension_average,
    tasks_completed_count = EXCLUDED.tasks_completed_count,
    checkins_completed_count = EXCLUDED.checkins_completed_count,
    journals_completed_count = EXCLUDED.journals_completed_count;

  SELECT to_jsonb(pps)
  INTO result
  FROM public.program_progress_snapshots pps
  WHERE pps.user_id = actor_id
    AND pps.program_instance_id = target_instance.id
    AND pps.date = effective_today;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_my_program_progress_snapshot(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refresh_my_program_progress_snapshot(uuid)
  TO authenticated;

COMMENT ON FUNCTION public.refresh_my_program_progress_snapshot(uuid) IS
  'Self-only, instance-scoped and concurrency-safe progress snapshot refresh. No journal or reflection content is read.';

COMMIT;
