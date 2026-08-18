BEGIN;

-- A shareable Coach code must never be consumed by the lead coach who created
-- it, nor by a person who is already in that team. The client makes the
-- current personal account visible, but this server-side guard remains the
-- authoritative protection against accidental role changes on a warm device.
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
    SELECT 1
    FROM auth.users u
    WHERE u.id = actor_id
      AND u.email_confirmed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'confirmed_email_required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO target_invite
  FROM app_private.team_coach_invitation_codes invitation
  WHERE invitation.code_digest = encode(extensions.digest(normalized_code, 'sha256'), 'hex')
  FOR UPDATE;

  IF target_invite.id IS NULL THEN
    RAISE EXCEPTION 'invalid_invitation' USING ERRCODE = '22023';
  END IF;
  IF target_invite.status <> 'pending' OR target_invite.expires_at <= now() THEN
    RAISE EXCEPTION 'invitation_expired_or_used' USING ERRCODE = '22023';
  END IF;
  IF app_private.is_admin(actor_id) THEN
    RAISE EXCEPTION 'admin_account_invitation_requires_review' USING ERRCODE = '42501';
  END IF;

  IF actor_id = target_invite.invited_by
    OR EXISTS (
      SELECT 1
      FROM public.team_staff_memberships staff
      WHERE staff.team_id = target_invite.team_id
        AND staff.user_id = actor_id
        AND staff.status = 'active'
    )
    OR EXISTS (
      SELECT 1
      FROM public.team_members member
      WHERE member.team_id = target_invite.team_id
        AND member.user_id = actor_id
    ) THEN
    RAISE EXCEPTION 'already_team_member' USING ERRCODE = '42501';
  END IF;

  -- A brand-new invited signup receives the product's default athlete role.
  -- Convert only a data-empty account. Existing athlete accounts stay
  -- fail-closed and require an explicit admin-led role migration.
  IF NOT public.has_role(actor_id, 'coach'::public.app_role) AND (
    EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.user_id = actor_id)
    OR EXISTS (SELECT 1 FROM public.questionnaire_responses qr WHERE qr.user_id = actor_id)
    OR EXISTS (SELECT 1 FROM public.program_instances pi WHERE pi.user_id = actor_id)
    OR EXISTS (SELECT 1 FROM public.daily_checkins dc WHERE dc.user_id = actor_id)
    OR EXISTS (SELECT 1 FROM public.daily_journals dj WHERE dj.user_id = actor_id)
    OR EXISTS (SELECT 1 FROM public.assessments a WHERE a.user_id = actor_id)
    OR EXISTS (SELECT 1 FROM public.deep_profile_assessments dpa WHERE dpa.user_id = actor_id)
    OR EXISTS (SELECT 1 FROM public.user_day_completion udc WHERE udc.user_id = actor_id)
    OR EXISTS (SELECT 1 FROM minor_auth.participant_authorizations pa WHERE pa.user_id = actor_id)
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
    target_invite.organization_id,
    actor_id,
    'coach',
    target_invite.invited_by
  ) ON CONFLICT (organization_id, user_id) DO UPDATE
    SET role = EXCLUDED.role, status = 'active', updated_at = now();

  INSERT INTO public.team_staff_memberships(team_id, user_id, role, created_by)
  VALUES (
    target_invite.team_id,
    actor_id,
    target_invite.team_role,
    target_invite.invited_by
  ) ON CONFLICT (team_id, user_id) DO UPDATE
    SET role = EXCLUDED.role, status = 'active', updated_at = now();

  INSERT INTO public.team_members(team_id, user_id)
  VALUES (target_invite.team_id, actor_id)
  ON CONFLICT (team_id, user_id) DO NOTHING;

  -- The code has fulfilled its only purpose. Delete its digest immediately;
  -- memberships remain the authoritative access record.
  DELETE FROM app_private.team_coach_invitation_codes
  WHERE id = target_invite.id;

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', target_invite.organization_id,
    'team_id', target_invite.team_id,
    'organization_role', 'coach',
    'team_role', target_invite.team_role
  );
END;
$$;

REVOKE ALL ON FUNCTION public.accept_team_coach_invitation(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_team_coach_invitation(text)
  TO authenticated;

COMMIT;
