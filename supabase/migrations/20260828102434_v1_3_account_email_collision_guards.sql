BEGIN;

-- V1.3 closes two related account-identity gaps:
-- 1) a Main-Coach invitation must never be created for an active athlete login;
-- 2) an admin may correct the intended personal Coach email before approval,
--    without recreating the public inquiry or silently converting an account.

ALTER TABLE public.organization_access_request_events
  DROP CONSTRAINT organization_access_request_events_event_type_check;
ALTER TABLE public.organization_access_request_events
  ADD CONSTRAINT organization_access_request_events_event_type_check
  CHECK (event_type IN (
    'submitted', 'status_changed', 'research_prepared', 'note_added',
    'login_email_changed', 'invitation_created', 'invitation_reissued',
    'invitation_accepted', 'withdrawn'
  ));

CREATE OR REPLACE FUNCTION public.approve_organization_access_request(
  _request_id uuid,
  _access_tier text,
  _team_name text DEFAULT NULL,
  _team_sport text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  actor_id uuid := auth.uid();
  target_request public.organization_access_requests;
  matching_user_id uuid;
  organization_id uuid;
  team_id uuid;
  invitation_id uuid;
  raw_token text := encode(extensions.gen_random_bytes(32), 'hex');
  approved_status text;
BEGIN
  IF actor_id IS NULL OR NOT app_private.is_admin(actor_id) THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;
  IF _access_tier NOT IN ('community', 'partner', 'enterprise') THEN
    RAISE EXCEPTION 'invalid_access_tier' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO target_request
  FROM public.organization_access_requests request
  WHERE request.id = _request_id
  FOR UPDATE;
  IF target_request.id IS NULL THEN
    RAISE EXCEPTION 'request_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF target_request.status NOT IN ('submitted', 'needs_information', 'review_ready', 'call_requested') THEN
    RAISE EXCEPTION 'request_not_approvable' USING ERRCODE = '22023';
  END IF;

  SELECT account.id INTO matching_user_id
  FROM auth.users account
  WHERE account.email = lower(target_request.work_email)
  LIMIT 1;

  IF matching_user_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.user_roles role_row
    WHERE role_row.user_id = matching_user_id
      AND role_row.role = 'athlete'::public.app_role
  ) THEN
    RAISE EXCEPTION 'coach_email_is_active_athlete' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.organizations(
    name, organization_type, country_code, website, status, access_tier,
    source_request_id, created_by
  ) VALUES (
    target_request.organization_name, target_request.organization_type,
    target_request.country_code, target_request.website, 'pending_activation',
    _access_tier, target_request.id, actor_id
  ) RETURNING id INTO organization_id;

  IF NULLIF(btrim(COALESCE(_team_name, '')), '') IS NOT NULL THEN
    INSERT INTO public.teams(name, sport, created_by, organization_id)
    VALUES (btrim(_team_name), NULLIF(btrim(COALESCE(_team_sport, '')), ''), actor_id, organization_id)
    RETURNING id INTO team_id;
  END IF;

  INSERT INTO public.organization_invitations(
    organization_id, team_id, email, organization_role, team_role,
    token_digest, expires_at, invited_by
  ) VALUES (
    organization_id, team_id, lower(target_request.work_email), 'owner',
    CASE WHEN team_id IS NULL THEN NULL ELSE 'lead_coach' END,
    encode(extensions.digest(raw_token, 'sha256'), 'hex'), now() + interval '7 days', actor_id
  ) RETURNING id INTO invitation_id;

  approved_status := CASE _access_tier
    WHEN 'community' THEN 'approved_community'
    WHEN 'partner' THEN 'approved_partner'
    ELSE 'approved_enterprise'
  END;

  UPDATE public.organization_access_requests
  SET status = approved_status, updated_at = now()
  WHERE id = target_request.id;

  INSERT INTO public.organization_access_request_events(
    request_id, event_type, actor_user_id, from_status, to_status, metadata
  ) VALUES (
    target_request.id, 'invitation_created', actor_id, target_request.status,
    approved_status, jsonb_build_object(
      'organization_id', organization_id,
      'team_id', team_id,
      'invitation_id', invitation_id,
      'access_tier', _access_tier
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', organization_id,
    'team_id', team_id,
    'invitation_id', invitation_id,
    'invitation_token', raw_token,
    'invitation_email', lower(target_request.work_email),
    'expires_at', now() + interval '7 days'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.approve_organization_access_request(uuid, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_organization_access_request(uuid, text, text, text)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.prepare_organization_access_invitation_v1_3(
  _request_id uuid,
  _access_tier text,
  _team_name text DEFAULT NULL,
  _team_sport text DEFAULT NULL,
  _invitation_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  actor_id uuid := auth.uid();
  target_request public.organization_access_requests;
  normalized_email text := lower(btrim(COALESCE(_invitation_email, '')));
  previous_email text;
  matching_user_id uuid;
  approval jsonb;
BEGIN
  IF actor_id IS NULL OR NOT app_private.is_admin(actor_id) THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;
  IF normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     OR char_length(normalized_email) > 254 THEN
    RAISE EXCEPTION 'invalid_coach_email' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO target_request
  FROM public.organization_access_requests request
  WHERE request.id = _request_id
  FOR UPDATE;
  IF target_request.id IS NULL THEN
    RAISE EXCEPTION 'request_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF target_request.status NOT IN ('submitted', 'needs_information', 'review_ready', 'call_requested') THEN
    RAISE EXCEPTION 'request_not_approvable' USING ERRCODE = '22023';
  END IF;

  SELECT account.id INTO matching_user_id
  FROM auth.users account
  WHERE account.email = normalized_email
  LIMIT 1;
  IF matching_user_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.user_roles role_row
    WHERE role_row.user_id = matching_user_id
      AND role_row.role = 'athlete'::public.app_role
  ) THEN
    RAISE EXCEPTION 'coach_email_is_active_athlete' USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.organization_invitations invitation
    WHERE lower(invitation.email) = normalized_email
      AND invitation.status = 'pending'
      AND invitation.accepted_at IS NULL
      AND invitation.expires_at > now()
  ) THEN
    RAISE EXCEPTION 'coach_email_already_invited' USING ERRCODE = '23505';
  END IF;

  previous_email := target_request.work_email;
  IF lower(previous_email) <> normalized_email THEN
    UPDATE public.organization_access_requests
    SET work_email = normalized_email, updated_at = now()
    WHERE id = target_request.id;

    INSERT INTO public.organization_access_request_events(
      request_id, event_type, actor_user_id, from_status, to_status, metadata
    ) VALUES (
      target_request.id, 'login_email_changed', actor_id,
      target_request.status, target_request.status,
      jsonb_build_object('previous_email', lower(previous_email), 'new_email', normalized_email)
    );
  END IF;

  approval := public.approve_organization_access_request(
    _request_id, _access_tier, _team_name, _team_sport
  );
  RETURN approval || jsonb_build_object('invitation_email', normalized_email);
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_organization_access_invitation_v1_3(uuid, text, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prepare_organization_access_invitation_v1_3(uuid, text, text, text, text)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.reissue_organization_access_invitation_v1_3(
  _request_id uuid,
  _invitation_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  actor_id uuid := auth.uid();
  target_request public.organization_access_requests;
  target_invitation public.organization_invitations;
  normalized_email text := lower(btrim(COALESCE(_invitation_email, '')));
  matching_user_id uuid;
  raw_token text := encode(extensions.gen_random_bytes(32), 'hex');
  replacement_invitation_id uuid;
BEGIN
  IF actor_id IS NULL OR NOT app_private.is_admin(actor_id) THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;
  IF normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     OR char_length(normalized_email) > 254 THEN
    RAISE EXCEPTION 'invalid_coach_email' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO target_request
  FROM public.organization_access_requests request
  WHERE request.id = _request_id
  FOR UPDATE;
  IF target_request.id IS NULL THEN
    RAISE EXCEPTION 'request_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF target_request.status NOT IN ('approved_community', 'approved_partner', 'approved_enterprise') THEN
    RAISE EXCEPTION 'invitation_not_reissuable' USING ERRCODE = '22023';
  END IF;

  SELECT invitation.* INTO target_invitation
  FROM public.organization_invitations invitation
  JOIN public.organizations organization
    ON organization.id = invitation.organization_id
  WHERE organization.source_request_id = target_request.id
    AND invitation.status = 'pending'
    AND invitation.accepted_at IS NULL
  ORDER BY invitation.created_at DESC
  LIMIT 1
  FOR UPDATE OF invitation;
  IF target_invitation.id IS NULL THEN
    RAISE EXCEPTION 'invitation_not_reissuable' USING ERRCODE = '22023';
  END IF;

  SELECT account.id INTO matching_user_id
  FROM auth.users account
  WHERE account.email = normalized_email
  LIMIT 1;
  IF matching_user_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.user_roles role_row
    WHERE role_row.user_id = matching_user_id
      AND role_row.role = 'athlete'::public.app_role
  ) THEN
    RAISE EXCEPTION 'coach_email_is_active_athlete' USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.organization_invitations invitation
    WHERE lower(invitation.email) = normalized_email
      AND invitation.status = 'pending'
      AND invitation.id <> target_invitation.id
  ) THEN
    RAISE EXCEPTION 'coach_email_already_invited' USING ERRCODE = '23505';
  END IF;

  UPDATE public.organization_invitations
  SET status = 'revoked'
  WHERE id = target_invitation.id;

  INSERT INTO public.organization_invitations(
    organization_id, team_id, email, organization_role, team_role,
    token_digest, expires_at, invited_by
  ) VALUES (
    target_invitation.organization_id, target_invitation.team_id,
    normalized_email, target_invitation.organization_role, target_invitation.team_role,
    encode(extensions.digest(raw_token, 'sha256'), 'hex'), now() + interval '7 days', actor_id
  ) RETURNING id INTO replacement_invitation_id;

  IF lower(target_request.work_email) <> normalized_email THEN
    UPDATE public.organization_access_requests
    SET work_email = normalized_email, updated_at = now()
    WHERE id = target_request.id;

    INSERT INTO public.organization_access_request_events(
      request_id, event_type, actor_user_id, from_status, to_status, metadata
    ) VALUES (
      target_request.id, 'login_email_changed', actor_id,
      target_request.status, target_request.status,
      jsonb_build_object(
        'previous_email', lower(target_request.work_email),
        'new_email', normalized_email
      )
    );
  END IF;

  INSERT INTO public.organization_access_request_events(
    request_id, event_type, actor_user_id, from_status, to_status, metadata
  ) VALUES (
    target_request.id, 'invitation_reissued', actor_id,
    target_request.status, target_request.status,
    jsonb_build_object(
      'previous_invitation_id', target_invitation.id,
      'replacement_invitation_id', replacement_invitation_id
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'invitation_id', replacement_invitation_id,
    'invitation_token', raw_token,
    'invitation_email', normalized_email,
    'expires_at', now() + interval '7 days'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reissue_organization_access_invitation_v1_3(uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reissue_organization_access_invitation_v1_3(uuid, text)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.get_organization_invitation_email_hint(_token text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  invitation_email text;
  local_part text;
  domain_part text;
BEGIN
  IF _token IS NULL OR _token !~ '^[a-f0-9]{64}$' THEN
    RETURN NULL;
  END IF;

  SELECT lower(invitation.email) INTO invitation_email
  FROM public.organization_invitations invitation
  WHERE invitation.token_digest = encode(extensions.digest(_token, 'sha256'), 'hex')
    AND invitation.status = 'pending'
    AND invitation.accepted_at IS NULL
    AND invitation.expires_at > now()
  LIMIT 1;
  IF invitation_email IS NULL THEN RETURN NULL; END IF;

  local_part := split_part(invitation_email, '@', 1);
  domain_part := split_part(invitation_email, '@', 2);
  RETURN left(local_part, 1)
    || repeat('*', greatest(2, least(6, char_length(local_part) - 1)))
    || '@' || domain_part;
END;
$$;

REVOKE ALL ON FUNCTION public.get_organization_invitation_email_hint(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_organization_invitation_email_hint(text) TO anon, authenticated;

COMMENT ON FUNCTION public.prepare_organization_access_invitation_v1_3(uuid, text, text, text, text) IS
  'Admin-only atomic V1.3 preparation of a Main-Coach invitation. Rejects active athlete accounts and audits an approved login-email correction.';
COMMENT ON FUNCTION public.reissue_organization_access_invitation_v1_3(uuid, text) IS
  'Admin-only replacement of one still-open Main-Coach invitation. Revokes the old token, creates a fresh invitation row and audits the correction.';
COMMENT ON FUNCTION public.get_organization_invitation_email_hint(text) IS
  'Returns only a masked bound email for a valid unaccepted personal invitation capability; exposes no account or role state.';

COMMIT;
