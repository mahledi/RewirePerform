-- 1. Tighten team_members INSERT: only via RPC (no direct client insert)
DROP POLICY IF EXISTS "Users can join teams" ON public.team_members;

-- Keep an admin escape hatch (admins manage memberships)
CREATE POLICY "Admins can insert team_members"
  ON public.team_members FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2. RPC: join team by access code (validates code, inserts membership as definer)
CREATE OR REPLACE FUNCTION public.join_team_by_code(_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_team_id uuid;
  v_team_name text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _code IS NULL OR length(trim(_code)) = 0 THEN
    RAISE EXCEPTION 'Code required';
  END IF;

  SELECT id, name INTO v_team_id, v_team_name
  FROM public.teams
  WHERE access_code = upper(trim(_code))
  LIMIT 1;

  IF v_team_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'invalid_code');
  END IF;

  INSERT INTO public.team_members (team_id, user_id)
  VALUES (v_team_id, v_user)
  ON CONFLICT DO NOTHING;

  RETURN json_build_object('success', true, 'team_id', v_team_id, 'team_name', v_team_name);
END;
$$;

REVOKE ALL ON FUNCTION public.join_team_by_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_team_by_code(text) TO authenticated;

-- 3. Coach access to questionnaire_responses: only status, no raw answers
DROP POLICY IF EXISTS "Coaches can view team questionnaire status" ON public.questionnaire_responses;

CREATE OR REPLACE FUNCTION public.get_team_questionnaire_status(_team_id uuid)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  is_complete boolean,
  last_category_index integer,
  progress_updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Authorize: caller must be admin OR creator of this team
  IF NOT (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = _team_id AND t.created_by = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    tm.user_id,
    p.full_name,
    COALESCE(qr.is_complete, false) AS is_complete,
    COALESCE(qr.last_category_index, 0) AS last_category_index,
    qr.progress_updated_at
  FROM public.team_members tm
  LEFT JOIN public.profiles p ON p.id = tm.user_id
  LEFT JOIN public.questionnaire_responses qr ON qr.user_id = tm.user_id
  WHERE tm.team_id = _team_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_team_questionnaire_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_team_questionnaire_status(uuid) TO authenticated;