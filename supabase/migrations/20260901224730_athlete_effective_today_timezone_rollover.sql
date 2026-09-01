-- Align the athlete day boundary with the timezone of the active program run.
--
-- Root cause: get_effective_today() historically returned CURRENT_DATE for
-- real users. Production database sessions use UTC, so team athletes in
-- Europe/Berlin remained on the previous program day between local midnight
-- and 02:00 CEST (01:00 CET). Coach run-scoped RPCs already used the run
-- timezone, which made the two surfaces disagree.
BEGIN;

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
  run_timezone text;
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

  -- A team athlete follows the timezone of the active run assigned through
  -- the active program instance. Solo instances intentionally fall through to
  -- Europe/Berlin because they have no program_run_id.
  SELECT NULLIF(pg_catalog.btrim(run.timezone), '')
  INTO run_timezone
  FROM public.program_instances instance
  JOIN public.program_runs run
    ON run.id = instance.program_run_id
   AND run.status = 'active'
  WHERE instance.user_id = _user_id
    AND instance.status = 'active'
  ORDER BY instance.created_at DESC, run.created_at DESC
  LIMIT 1;

  IF run_timezone IS NULL OR NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_timezone_names timezone_name
    WHERE timezone_name.name = run_timezone
  ) THEN
    run_timezone := 'Europe/Berlin';
  END IF;

  SELECT COALESCE(profile.is_test_user, false)
  INTO is_test
  FROM public.profiles profile
  WHERE profile.id = _user_id;

  IF COALESCE(is_test, false) THEN
    -- User-scoped QA override keeps its existing highest precedence.
    SELECT override.simulated_date
    INTO simulated_today
    FROM public.qa_time_overrides override
    WHERE override.scope = 'user'
      AND override.user_id = _user_id
    ORDER BY override.updated_at DESC
    LIMIT 1;

    IF simulated_today IS NOT NULL THEN
      RETURN simulated_today;
    END IF;

    -- Team-scoped QA override keeps its existing second precedence.
    SELECT override.simulated_date
    INTO simulated_today
    FROM public.qa_time_overrides override
    JOIN public.team_members member ON member.team_id = override.team_id
    WHERE override.scope = 'team'
      AND member.user_id = _user_id
    ORDER BY override.updated_at DESC
    LIMIT 1;

    IF simulated_today IS NOT NULL THEN
      RETURN simulated_today;
    END IF;
  END IF;

  RETURN (
    pg_catalog.timezone(run_timezone, pg_catalog.now())
  )::date;
END;
$$;

-- Preserve the existing self/admin execution contract exactly.
REVOKE ALL ON FUNCTION public.get_effective_today(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_effective_today(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_effective_today(uuid) IS
  'Returns the current program calendar date for self/admin. QA overrides win; otherwise an active run timezone is validated against pg_timezone_names with Europe/Berlin fallback.';

COMMIT;
