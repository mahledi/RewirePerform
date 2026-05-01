-- 1) Add separate coach access code (player code remains in `access_code`)
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS coach_access_code text
    UNIQUE
    DEFAULT upper(substring(gen_random_uuid()::text from 1 for 6));

-- Backfill existing teams with a coach code if missing
UPDATE public.teams
SET coach_access_code = upper(substring(gen_random_uuid()::text from 1 for 6))
WHERE coach_access_code IS NULL;

ALTER TABLE public.teams
  ALTER COLUMN coach_access_code SET NOT NULL;

-- 2) Replace join_team_by_code so it recognizes both codes and SETS the role
--    server-side. Player code => 'athlete', Coach code => 'coach'.
--    The user's signup-meta role is irrelevant here: the code is the source of truth.
CREATE OR REPLACE FUNCTION public.join_team_by_code(_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_team_id uuid;
  v_team_name text;
  v_role public.app_role;
  v_normalized text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _code IS NULL OR length(trim(_code)) = 0 THEN
    RAISE EXCEPTION 'Code required';
  END IF;

  v_normalized := upper(trim(_code));

  -- Try player code first
  SELECT id, name, 'athlete'::public.app_role
    INTO v_team_id, v_team_name, v_role
  FROM public.teams
  WHERE access_code = v_normalized
  LIMIT 1;

  -- Then coach code
  IF v_team_id IS NULL THEN
    SELECT id, name, 'coach'::public.app_role
      INTO v_team_id, v_team_name, v_role
    FROM public.teams
    WHERE coach_access_code = v_normalized
    LIMIT 1;
  END IF;

  IF v_team_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'invalid_code');
  END IF;

  -- Enforce role from code (replace any existing role to avoid mismatch)
  DELETE FROM public.user_roles WHERE user_id = v_user;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Join the team
  INSERT INTO public.team_members (team_id, user_id)
  VALUES (v_team_id, v_user)
  ON CONFLICT DO NOTHING;

  RETURN json_build_object(
    'success', true,
    'team_id', v_team_id,
    'team_name', v_team_name,
    'role', v_role
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.join_team_by_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_team_by_code(text) TO authenticated;

-- 3) Allow coaches who are members of a team to also see the team (so co-coaches
--    can view the team & both codes after joining). This is already covered by
--    "Members and creator can view teams" since they become a team_member.
--    No additional policy needed.
