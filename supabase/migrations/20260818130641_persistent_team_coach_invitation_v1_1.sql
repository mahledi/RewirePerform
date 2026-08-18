BEGIN;

-- V1.1 product correction: one Lead Coach manages one reusable Co-Coach link
-- for a team. The raw high-entropy code remains in the private schema and is
-- returned only by authenticated, server-authorized Lead-Coach RPCs.
ALTER TABLE app_private.team_coach_invitation_codes
  ADD COLUMN invitation_code text;

ALTER TABLE app_private.team_coach_invitation_codes
  ADD CONSTRAINT team_coach_invitation_codes_code_format_check
  CHECK (invitation_code IS NULL OR invitation_code ~ '^[A-F0-9]{20}$');

ALTER TABLE app_private.team_coach_invitation_codes
  ALTER COLUMN expires_at DROP NOT NULL;

-- Previous one-time rows contain only a digest. Their raw code cannot be
-- safely reconstructed, so Lead Coaches receive one new reusable link.
UPDATE app_private.team_coach_invitation_codes
SET status = 'revoked'
WHERE status = 'pending';

-- Repair legacy teams created by an already-valid coach before the staff-role
-- table was introduced. This makes the authoritative Lead-Coach role visible
-- to the existing can_administer_team guard; it does not grant any new role to
-- athletes or unrelated users.
INSERT INTO public.team_staff_memberships(
  team_id, user_id, role, status, created_by
)
SELECT
  team.id,
  team.created_by,
  'lead_coach',
  'active',
  team.created_by
FROM public.teams team
WHERE team.created_by IS NOT NULL
  AND public.has_role(team.created_by, 'coach'::public.app_role)
ON CONFLICT (team_id, user_id) DO UPDATE
SET role = 'lead_coach', status = 'active', updated_at = now();

CREATE OR REPLACE FUNCTION public.get_or_create_team_coach_invitation(_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  actor_id uuid := auth.uid();
  target_team public.teams;
  target_invitation app_private.team_coach_invitation_codes;
  resolved_organization_id uuid;
  invitation_id uuid;
  raw_code text := upper(encode(extensions.gen_random_bytes(10), 'hex'));
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO target_team
  FROM public.teams team
  WHERE team.id = _team_id
  FOR UPDATE;

  IF target_team.id IS NULL THEN
    RAISE EXCEPTION 'team_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT (
    app_private.is_admin(actor_id)
    OR EXISTS (
      SELECT 1
      FROM public.team_staff_memberships staff
      WHERE staff.team_id = _team_id
        AND staff.user_id = actor_id
        AND staff.role = 'lead_coach'
        AND staff.status = 'active'
    )
  ) THEN
    RAISE EXCEPTION 'team_owner_required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO target_invitation
  FROM app_private.team_coach_invitation_codes invitation
  WHERE invitation.team_id = _team_id
    AND invitation.status = 'pending'
    AND invitation.expires_at IS NULL
    AND invitation.invitation_code IS NOT NULL
  ORDER BY invitation.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF target_invitation.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'invitation_id', target_invitation.id,
      'invitation_code', target_invitation.invitation_code,
      'expires_at', NULL
    );
  END IF;

  UPDATE app_private.team_coach_invitation_codes
  SET status = 'revoked'
  WHERE team_id = _team_id
    AND status = 'pending';

  resolved_organization_id := target_team.organization_id;
  IF resolved_organization_id IS NULL THEN
    INSERT INTO public.organizations(
      name, organization_type, country_code, status, access_tier, created_by
    ) VALUES (
      target_team.name, 'other', 'DE', 'active', 'community', actor_id
    ) RETURNING id INTO resolved_organization_id;

    UPDATE public.teams
    SET organization_id = resolved_organization_id
    WHERE id = _team_id;

    INSERT INTO public.organization_memberships(
      organization_id, user_id, role, created_by
    ) VALUES (
      resolved_organization_id, actor_id, 'owner', actor_id
    ) ON CONFLICT (organization_id, user_id) DO NOTHING;
  END IF;

  INSERT INTO app_private.team_coach_invitation_codes(
    organization_id,
    team_id,
    code_digest,
    invitation_code,
    team_role,
    expires_at,
    invited_by
  ) VALUES (
    resolved_organization_id,
    _team_id,
    encode(extensions.digest(lower(raw_code), 'sha256'), 'hex'),
    raw_code,
    'co_coach',
    NULL,
    actor_id
  ) RETURNING id INTO invitation_id;

  RETURN jsonb_build_object(
    'success', true,
    'invitation_id', invitation_id,
    'invitation_code', raw_code,
    'expires_at', NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.renew_team_coach_invitation(_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  actor_id uuid := auth.uid();
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  IF NOT (
    app_private.is_admin(actor_id)
    OR EXISTS (
      SELECT 1
      FROM public.team_staff_memberships staff
      WHERE staff.team_id = _team_id
        AND staff.user_id = actor_id
        AND staff.role = 'lead_coach'
        AND staff.status = 'active'
    )
  ) THEN
    RAISE EXCEPTION 'team_owner_required' USING ERRCODE = '42501';
  END IF;

  UPDATE app_private.team_coach_invitation_codes
  SET status = 'revoked'
  WHERE team_id = _team_id
    AND status = 'pending';

  RETURN public.get_or_create_team_coach_invitation(_team_id);
END;
$$;

-- A valid reusable link stays active for further fresh, confirmed Coach
-- accounts. Existing members remain blocked before any role mutation.
CREATE OR REPLACE FUNCTION public.accept_team_coach_invitation(_code text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  actor_id uuid := auth.uid();
  normalized_code text := lower(regexp_replace(COALESCE(_code, ''), '[-[:space:]]', '', 'g'));
  target_invite app_private.team_coach_invitation_codes;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  IF normalized_code !~ '^[a-f0-9]{20}$' THEN
    RAISE EXCEPTION 'invalid_invitation' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM auth.users user_record
    WHERE user_record.id = actor_id
      AND user_record.email_confirmed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'confirmed_email_required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO target_invite
  FROM app_private.team_coach_invitation_codes invitation
  WHERE invitation.code_digest = encode(extensions.digest(normalized_code, 'sha256'), 'hex')
  FOR UPDATE;

  IF target_invite.id IS NULL
    OR target_invite.status <> 'pending'
    OR (target_invite.expires_at IS NOT NULL AND target_invite.expires_at <= now()) THEN
    RAISE EXCEPTION 'invitation_expired_or_used' USING ERRCODE = '22023';
  END IF;
  IF app_private.is_admin(actor_id) THEN
    RAISE EXCEPTION 'admin_account_invitation_requires_review' USING ERRCODE = '42501';
  END IF;

  IF actor_id = target_invite.invited_by
    OR EXISTS (
      SELECT 1 FROM public.team_staff_memberships staff
      WHERE staff.team_id = target_invite.team_id
        AND staff.user_id = actor_id
        AND staff.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.team_members member
      WHERE member.team_id = target_invite.team_id
        AND member.user_id = actor_id
    ) THEN
    RAISE EXCEPTION 'already_team_member' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_role(actor_id, 'coach'::public.app_role) AND (
    EXISTS (SELECT 1 FROM public.team_members member WHERE member.user_id = actor_id)
    OR EXISTS (SELECT 1 FROM public.questionnaire_responses response WHERE response.user_id = actor_id)
    OR EXISTS (SELECT 1 FROM public.program_instances instance WHERE instance.user_id = actor_id)
    OR EXISTS (SELECT 1 FROM public.daily_checkins checkin WHERE checkin.user_id = actor_id)
    OR EXISTS (SELECT 1 FROM public.daily_journals journal WHERE journal.user_id = actor_id)
    OR EXISTS (SELECT 1 FROM public.assessments assessment WHERE assessment.user_id = actor_id)
    OR EXISTS (SELECT 1 FROM public.deep_profile_assessments profile_assessment WHERE profile_assessment.user_id = actor_id)
    OR EXISTS (SELECT 1 FROM public.user_day_completion completion WHERE completion.user_id = actor_id)
    OR EXISTS (
      SELECT 1
      FROM minor_auth.participant_authorizations participant_authorization
      WHERE participant_authorization.user_id = actor_id
    )
  ) THEN
    RAISE EXCEPTION 'existing_athlete_account_requires_admin_review' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.user_roles
  WHERE user_id = actor_id
    AND role = 'athlete'::public.app_role;

  INSERT INTO public.user_roles(user_id, role)
  VALUES (actor_id, 'coach'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.organization_memberships(
    organization_id, user_id, role, created_by
  ) VALUES (
    target_invite.organization_id, actor_id, 'coach', target_invite.invited_by
  ) ON CONFLICT (organization_id, user_id) DO UPDATE
    SET role = EXCLUDED.role, status = 'active', updated_at = now();

  INSERT INTO public.team_staff_memberships(team_id, user_id, role, created_by)
  VALUES (
    target_invite.team_id, actor_id, target_invite.team_role, target_invite.invited_by
  ) ON CONFLICT (team_id, user_id) DO UPDATE
    SET role = EXCLUDED.role, status = 'active', updated_at = now();

  INSERT INTO public.team_members(team_id, user_id)
  VALUES (target_invite.team_id, actor_id)
  ON CONFLICT (team_id, user_id) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', target_invite.organization_id,
    'team_id', target_invite.team_id,
    'organization_role', 'coach',
    'team_role', target_invite.team_role
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_team_coach_invitation(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_team_coach_invitation(uuid)
  TO authenticated;
REVOKE ALL ON FUNCTION public.renew_team_coach_invitation(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.renew_team_coach_invitation(uuid)
  TO authenticated;
REVOKE ALL ON FUNCTION public.accept_team_coach_invitation(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_team_coach_invitation(text)
  TO authenticated;

COMMENT ON TABLE app_private.team_coach_invitation_codes IS
  'Private reusable Co-Coach links. Raw high-entropy codes are returned only to an authorized Lead Coach; digests authorize fresh confirmed Coach accounts until the Lead Coach renews the link.';
COMMENT ON FUNCTION public.get_or_create_team_coach_invitation(uuid) IS
  'Returns the team''s active reusable Co-Coach link, creating it only for a Lead Coach or platform admin.';
COMMENT ON FUNCTION public.renew_team_coach_invitation(uuid) IS
  'Revokes the previous reusable Co-Coach link and creates a replacement for a Lead Coach or platform admin.';
COMMENT ON FUNCTION public.accept_team_coach_invitation(text) IS
  'Adds a fresh confirmed Coach account to the team without consuming its reusable Lead-Coach link.';

COMMIT;
