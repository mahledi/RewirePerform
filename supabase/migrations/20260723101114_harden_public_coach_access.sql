BEGIN;

-- New public signups are always athletes. raw_user_meta_data is controlled by
-- the client and must never be an authorization source.
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'athlete'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user_role()
  FROM PUBLIC, anon, authenticated;

-- Public team codes are athlete-only. Legacy coach codes remain stored for
-- backwards-compatible rows, but are no longer read by any public join path.
CREATE OR REPLACE FUNCTION public.join_team_by_code(_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  actor_id uuid := auth.uid();
  target_team_id uuid;
  target_team_name text;
  normalized_code text := upper(trim(COALESCE(_code, '')));
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  IF length(normalized_code) <> 6
     OR normalized_code !~ '^[A-Z0-9]{6}$' THEN
    RETURN json_build_object('success', false, 'error', 'invalid_code');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = actor_id
      AND ur.role IN (
        'coach'::public.app_role,
        'admin'::public.app_role
      )
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'athlete_account_required'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = actor_id
      AND ur.role = 'athlete'::public.app_role
  ) THEN
    RETURN json_build_object('success', false, 'error', 'athlete_role_required');
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

  INSERT INTO public.team_members (team_id, user_id)
  VALUES (target_team_id, actor_id)
  ON CONFLICT (team_id, user_id) DO NOTHING;

  RETURN json_build_object(
    'success', true,
    'team_id', target_team_id,
    'team_name', target_team_name,
    'role', 'athlete'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.join_team_by_code(text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_team_by_code(text)
  TO authenticated;

COMMENT ON FUNCTION public.join_team_by_code(text) IS
  'Authenticated athlete-only team join. Coach and admin role elevation is impossible through team codes.';
COMMENT ON COLUMN public.teams.coach_access_code IS
  'Legacy compatibility value. It is not an authorization credential and is not accepted by public join flows.';

-- Team creation and creator membership require a role that was already
-- approved. Admin functions below can still create and assign a team atomically.
DROP POLICY IF EXISTS "Authenticated users can create teams" ON public.teams;
DROP POLICY IF EXISTS "Approved coaches can create teams" ON public.teams;
CREATE POLICY "Approved coaches can create teams"
  ON public.teams
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      public.has_role(auth.uid(), 'coach'::public.app_role)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "Team creator can update" ON public.teams;
DROP POLICY IF EXISTS "Approved coaches and admins can update teams" ON public.teams;
CREATE POLICY "Approved coaches and admins can update teams"
  ON public.teams
  FOR UPDATE
  TO authenticated
  USING (
    (
      created_by = auth.uid()
      AND public.has_role(auth.uid(), 'coach'::public.app_role)
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    (
      created_by = auth.uid()
      AND public.has_role(auth.uid(), 'coach'::public.app_role)
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "Team creator can join own team" ON public.team_members;
CREATE POLICY "Approved team creator can join own team"
  ON public.team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND team_id IN (
      SELECT t.id
      FROM public.teams t
      WHERE t.created_by = auth.uid()
    )
    AND (
      public.has_role(auth.uid(), 'coach'::public.app_role)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

CREATE TABLE public.coach_access_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (
    action IN ('coach_approved_and_assigned', 'coach_assigned_to_team')
  ),
  previous_role public.app_role,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX coach_access_audit_target_user_idx
  ON public.coach_access_audit(target_user_id);
CREATE INDEX coach_access_audit_approved_by_idx
  ON public.coach_access_audit(approved_by);
CREATE INDEX coach_access_audit_team_idx
  ON public.coach_access_audit(team_id);
CREATE INDEX coach_access_audit_created_at_idx
  ON public.coach_access_audit(created_at DESC);

ALTER TABLE public.coach_access_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read coach access audit"
  ON public.coach_access_audit
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

REVOKE ALL ON TABLE public.coach_access_audit
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.coach_access_audit
  TO authenticated;

COMMENT ON TABLE public.coach_access_audit IS
  'Minimal audit trail for manual, admin-approved coach access. No email address or free text is retained.';

CREATE OR REPLACE FUNCTION public.find_coach_access_candidate(_email text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  actor_id uuid := auth.uid();
  normalized_email text := lower(trim(COALESCE(_email, '')));
  result jsonb;
BEGIN
  IF actor_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = actor_id
      AND ur.role = 'admin'::public.app_role
  ) THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;

  IF normalized_email = ''
     OR normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'valid_email_required' USING ERRCODE = '22023';
  END IF;

  SELECT jsonb_build_object(
    'user_id', u.id,
    'email', lower(u.email),
    'full_name', COALESCE(NULLIF(trim(p.full_name), ''), 'Ohne Namen'),
    'email_confirmed', u.email_confirmed_at IS NOT NULL,
    'role', (
      SELECT ur.role::text
      FROM public.user_roles ur
      WHERE ur.user_id = u.id
      ORDER BY CASE ur.role
        WHEN 'admin'::public.app_role THEN 1
        WHEN 'coach'::public.app_role THEN 2
        ELSE 3
      END
      LIMIT 1
    )
  )
  INTO result
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE lower(u.email) = normalized_email
  LIMIT 1;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.find_coach_access_candidate(text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_coach_access_candidate(text)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.approve_coach_access(
  _user_id uuid,
  _team_id uuid DEFAULT NULL,
  _new_team_name text DEFAULT NULL,
  _new_team_sport text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  actor_id uuid := auth.uid();
  target_confirmed_at timestamptz;
  previous_role public.app_role;
  resolved_team_id uuid;
  resolved_team_name text;
  normalized_team_name text := NULLIF(trim(COALESCE(_new_team_name, '')), '');
  normalized_team_sport text := NULLIF(trim(COALESCE(_new_team_sport, '')), '');
  audit_action text;
BEGIN
  IF actor_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = actor_id
      AND ur.role = 'admin'::public.app_role
  ) THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;

  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'target_user_required' USING ERRCODE = '22023';
  END IF;

  IF (_team_id IS NULL AND normalized_team_name IS NULL)
     OR (_team_id IS NOT NULL AND normalized_team_name IS NOT NULL) THEN
    RAISE EXCEPTION 'choose_existing_or_new_team' USING ERRCODE = '22023';
  END IF;

  IF normalized_team_name IS NOT NULL
     AND (length(normalized_team_name) < 2 OR length(normalized_team_name) > 100) THEN
    RAISE EXCEPTION 'valid_team_name_required' USING ERRCODE = '22023';
  END IF;

  IF normalized_team_sport IS NOT NULL
     AND length(normalized_team_sport) > 100 THEN
    RAISE EXCEPTION 'team_sport_too_long' USING ERRCODE = '22023';
  END IF;

  SELECT u.email_confirmed_at
  INTO target_confirmed_at
  FROM auth.users u
  WHERE u.id = _user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'target_user_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF target_confirmed_at IS NULL THEN
    RAISE EXCEPTION 'target_email_not_confirmed' USING ERRCODE = '22023';
  END IF;

  SELECT ur.role
  INTO previous_role
  FROM public.user_roles ur
  WHERE ur.user_id = _user_id
  ORDER BY CASE ur.role
    WHEN 'admin'::public.app_role THEN 1
    WHEN 'coach'::public.app_role THEN 2
    ELSE 3
  END
  LIMIT 1
  FOR UPDATE;

  IF previous_role IS NULL THEN
    RAISE EXCEPTION 'target_role_missing' USING ERRCODE = '22023';
  END IF;

  IF previous_role = 'admin'::public.app_role THEN
    RAISE EXCEPTION 'admin_role_cannot_be_changed' USING ERRCODE = '42501';
  END IF;

  IF _team_id IS NOT NULL THEN
    SELECT t.id, t.name
    INTO resolved_team_id, resolved_team_name
    FROM public.teams t
    WHERE t.id = _team_id
      AND COALESCE(t.is_archived, false) = false
    FOR UPDATE;

    IF resolved_team_id IS NULL THEN
      RAISE EXCEPTION 'active_team_not_found' USING ERRCODE = 'P0002';
    END IF;
  ELSE
    INSERT INTO public.teams (name, sport, created_by)
    VALUES (normalized_team_name, normalized_team_sport, _user_id)
    RETURNING id, name
    INTO resolved_team_id, resolved_team_name;
  END IF;

  IF previous_role <> 'coach'::public.app_role THEN
    -- An athlete's former memberships must not silently become coach access.
    DELETE FROM public.team_members tm
    WHERE tm.user_id = _user_id;

    DELETE FROM public.user_roles ur
    WHERE ur.user_id = _user_id;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'coach'::public.app_role);

    audit_action := 'coach_approved_and_assigned';
  ELSE
    audit_action := 'coach_assigned_to_team';
  END IF;

  INSERT INTO public.team_members (team_id, user_id)
  VALUES (resolved_team_id, _user_id)
  ON CONFLICT (team_id, user_id) DO NOTHING;

  INSERT INTO public.coach_access_audit (
    target_user_id,
    approved_by,
    team_id,
    action,
    previous_role
  ) VALUES (
    _user_id,
    actor_id,
    resolved_team_id,
    audit_action,
    previous_role
  );

  RETURN jsonb_build_object(
    'success', true,
    'user_id', _user_id,
    'role', 'coach',
    'team_id', resolved_team_id,
    'team_name', resolved_team_name,
    'action', audit_action
  );
END;
$$;

REVOKE ALL ON FUNCTION public.approve_coach_access(uuid, uuid, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_coach_access(uuid, uuid, text, text)
  TO authenticated;

COMMENT ON FUNCTION public.approve_coach_access(uuid, uuid, text, text) IS
  'Admin-only atomic coach approval and team assignment with a minimal audit record.';

COMMIT;
