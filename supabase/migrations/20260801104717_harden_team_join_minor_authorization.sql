BEGIN;

-- Team membership makes an athlete visible to a coach. Keep that relationship
-- fail-closed until the same active product authorization used by the native
-- minor/guardian gate is present. This check lives inside the SECURITY DEFINER
-- RPC so a client cannot bypass it by calling the function directly.
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
  'Authenticated, product-authorized athlete-only team join. Team membership remains blocked until active minor/guardian product authorization is verified server-side.';

COMMIT;
