BEGIN;

-- Draft-only V1.1 foundation. This migration is versioned for isolated review
-- and must not be applied to Production without a separate Mahle approval.

CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon, authenticated;

CREATE TABLE public.organization_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code text NOT NULL UNIQUE DEFAULT (
    'RP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
  ),
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN (
    'submitted', 'needs_information', 'review_ready', 'call_requested',
    'approved_community', 'approved_partner', 'approved_enterprise',
    'declined', 'withdrawn', 'activated'
  )),
  contact_name text NOT NULL CHECK (char_length(contact_name) BETWEEN 2 AND 120),
  work_email text NOT NULL CHECK (char_length(work_email) BETWEEN 5 AND 254),
  phone text CHECK (phone IS NULL OR char_length(phone) <= 60),
  job_title text NOT NULL CHECK (char_length(job_title) BETWEEN 2 AND 120),
  preferred_contact text NOT NULL DEFAULT 'email' CHECK (preferred_contact IN ('email', 'phone', 'video_call')),
  organization_name text NOT NULL CHECK (char_length(organization_name) BETWEEN 2 AND 180),
  organization_type text NOT NULL CHECK (organization_type IN (
    'local_club', 'academy', 'performance_center', 'school', 'university',
    'association', 'federation', 'private_provider', 'other'
  )),
  country_code text NOT NULL DEFAULT 'DE' CHECK (country_code ~ '^[A-Z]{2}$'),
  website text CHECK (website IS NULL OR char_length(website) <= 500),
  sports text[] NOT NULL DEFAULT '{}',
  athlete_age_groups text[] NOT NULL DEFAULT '{}',
  performance_levels text[] NOT NULL DEFAULT '{}',
  team_count_band text NOT NULL CHECK (team_count_band IN ('1', '2_5', '6_15', '16_plus', 'unknown')),
  athlete_count_band text NOT NULL CHECK (athlete_count_band IN ('under_25', '25_99', '100_499', '500_plus', 'unknown')),
  coach_count_band text NOT NULL CHECK (coach_count_band IN ('1', '2_5', '6_20', '21_plus', 'unknown')),
  rollout_scope text NOT NULL CHECK (rollout_scope IN ('single_team', 'pilot', 'multi_team', 'organization_wide', 'exploring')),
  desired_start text NOT NULL CHECK (desired_start IN ('asap', 'next_4_weeks', 'next_3_months', 'later', 'unknown')),
  goals text[] NOT NULL DEFAULT '{}',
  support_needs text[] NOT NULL DEFAULT '{}',
  context_note text CHECK (context_note IS NULL OR char_length(context_note) <= 1600),
  source text NOT NULL DEFAULT 'web' CHECK (source IN ('web', 'ios', 'admin', 'referral')),
  locale text NOT NULL DEFAULT 'de-DE' CHECK (char_length(locale) <= 16),
  privacy_version text NOT NULL,
  public_research_notice_acknowledged boolean NOT NULL DEFAULT false,
  email_verified_at timestamptz,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX organization_access_requests_work_email_open_idx
  ON public.organization_access_requests (lower(work_email))
  WHERE status IN ('submitted', 'needs_information', 'review_ready', 'call_requested');
CREATE INDEX organization_access_requests_status_submitted_idx
  ON public.organization_access_requests (status, submitted_at DESC);
CREATE INDEX organization_access_requests_organization_idx
  ON public.organization_access_requests (lower(organization_name));

CREATE TABLE public.organization_access_request_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.organization_access_requests(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'submitted', 'status_changed', 'research_prepared', 'note_added',
    'invitation_created', 'invitation_accepted', 'withdrawn'
  )),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  from_status text,
  to_status text,
  internal_note text CHECK (internal_note IS NULL OR char_length(internal_note) <= 2400),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX organization_access_request_events_request_idx
  ON public.organization_access_request_events(request_id, created_at DESC);

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 180),
  organization_type text NOT NULL CHECK (organization_type IN (
    'local_club', 'academy', 'performance_center', 'school', 'university',
    'association', 'federation', 'private_provider', 'other'
  )),
  country_code text NOT NULL DEFAULT 'DE' CHECK (country_code ~ '^[A-Z]{2}$'),
  website text CHECK (website IS NULL OR char_length(website) <= 500),
  status text NOT NULL DEFAULT 'pending_activation' CHECK (status IN ('pending_activation', 'active', 'paused', 'archived')),
  access_tier text NOT NULL DEFAULT 'community' CHECK (access_tier IN ('community', 'partner', 'enterprise')),
  source_request_id uuid UNIQUE REFERENCES public.organization_access_requests(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.organization_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'coach')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS teams_organization_id_idx ON public.teams(organization_id);

CREATE TABLE public.team_staff_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('lead_coach', 'co_coach')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);

CREATE INDEX team_staff_memberships_user_idx
  ON public.team_staff_memberships(user_id, status);

CREATE TABLE public.organization_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  email text NOT NULL CHECK (char_length(email) BETWEEN 5 AND 254),
  organization_role text CHECK (organization_role IS NULL OR organization_role IN ('owner', 'admin', 'coach')),
  team_role text CHECK (team_role IS NULL OR team_role IN ('lead_coach', 'co_coach')),
  token_digest text NOT NULL UNIQUE CHECK (char_length(token_digest) = 64),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz NOT NULL,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (organization_id IS NOT NULL OR team_id IS NOT NULL)
);

CREATE UNIQUE INDEX organization_invitations_open_email_team_idx
  ON public.organization_invitations(lower(email), COALESCE(team_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE status = 'pending';

CREATE TABLE app_private.organization_inquiry_machine_read_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer text NOT NULL,
  purpose text NOT NULL,
  request_id uuid,
  rows_returned integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organization_access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_access_request_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_staff_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.organization_inquiry_machine_read_audit ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.organization_access_requests FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.organization_access_request_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.organizations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.organization_memberships FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.team_staff_memberships FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.organization_invitations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE app_private.organization_inquiry_machine_read_audit FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT ON public.organizations, public.organization_memberships, public.team_staff_memberships TO authenticated;

CREATE OR REPLACE FUNCTION app_private.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.role = 'admin'::public.app_role
  );
$$;

CREATE OR REPLACE FUNCTION app_private.has_organization_access(_organization_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT app_private.is_admin(_user_id) OR EXISTS (
    SELECT 1 FROM public.organization_memberships om
    WHERE om.organization_id = _organization_id
      AND om.user_id = _user_id
      AND om.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION app_private.has_team_staff_access(_team_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT app_private.is_admin(_user_id) OR EXISTS (
    SELECT 1 FROM public.team_staff_memberships tsm
    WHERE tsm.team_id = _team_id
      AND tsm.user_id = _user_id
      AND tsm.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION app_private.can_administer_team(_team_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT app_private.is_admin(_user_id) OR EXISTS (
    SELECT 1
    FROM public.teams t
    WHERE t.id = _team_id
      AND (
        t.created_by = _user_id
        OR EXISTS (
          SELECT 1
          FROM public.team_staff_memberships tsm
          WHERE tsm.team_id = t.id
            AND tsm.user_id = _user_id
            AND tsm.role = 'lead_coach'
            AND tsm.status = 'active'
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION app_private.is_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION app_private.has_organization_access(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION app_private.has_team_staff_access(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION app_private.can_administer_team(uuid, uuid) FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA app_private TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.has_organization_access(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.has_team_staff_access(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.can_administer_team(uuid, uuid) TO authenticated;

CREATE POLICY "Organization members read organization"
  ON public.organizations FOR SELECT TO authenticated
  USING (app_private.has_organization_access(id, (select auth.uid())));

CREATE POLICY "Organization members read memberships"
  ON public.organization_memberships FOR SELECT TO authenticated
  USING (app_private.has_organization_access(organization_id, (select auth.uid())));

CREATE POLICY "Team staff read staff memberships"
  ON public.team_staff_memberships FOR SELECT TO authenticated
  USING (app_private.has_team_staff_access(team_id, (select auth.uid())));

-- Existing coach program-run RPCs already authorize coaches who are team
-- members. The explicit staff table adds role truth; team_members remains the
-- compatibility bridge for the current Coach Console and aggregate RPCs.
DROP POLICY IF EXISTS "Coaches can view team members" ON public.team_members;
CREATE POLICY "Team staff can view team members"
  ON public.team_members FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid())
    OR app_private.has_team_staff_access(team_id, (select auth.uid()))
  );

CREATE OR REPLACE FUNCTION public.is_coach_of_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT public.has_role(auth.uid(), 'coach'::public.app_role)
    AND EXISTS (
      SELECT 1
      FROM public.team_members athlete_tm
      JOIN public.team_staff_memberships staff
        ON staff.team_id = athlete_tm.team_id
       AND staff.user_id = auth.uid()
       AND staff.status = 'active'
      WHERE athlete_tm.user_id = _user_id
    );
$$;
REVOKE ALL ON FUNCTION public.is_coach_of_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_coach_of_user(uuid) TO authenticated;

-- Deliberately do not add team-staff policies to assessments, daily_checkins,
-- profiles or journals. Coaches consume purpose-limited aggregate RPCs only.
CREATE POLICY "Lead coach updates assigned team"
  ON public.teams FOR UPDATE TO authenticated
  USING (app_private.can_administer_team(id, (select auth.uid())))
  WITH CHECK (app_private.can_administer_team(id, (select auth.uid())));

CREATE OR REPLACE FUNCTION public.can_administer_team(_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT auth.uid() IS NOT NULL
    AND app_private.can_administer_team(_team_id, auth.uid());
$$;
REVOKE ALL ON FUNCTION public.can_administer_team(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_administer_team(uuid) TO authenticated;

-- Team creation is no longer a public coach self-service action. It happens
-- only inside a founder-approved active organization through the RPC below.
DROP POLICY IF EXISTS "Authenticated users can create teams" ON public.teams;
DROP POLICY IF EXISTS "Approved coaches can create teams" ON public.teams;

CREATE OR REPLACE FUNCTION public.create_organization_team(
  _organization_id uuid,
  _name text,
  _sport text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  actor_id uuid := auth.uid();
  created_team public.teams;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;
  IF char_length(btrim(COALESCE(_name, ''))) NOT BETWEEN 2 AND 120 THEN
    RAISE EXCEPTION 'valid_team_name_required' USING ERRCODE = '22023';
  END IF;
  IF _sport IS NOT NULL AND char_length(btrim(_sport)) > 120 THEN
    RAISE EXCEPTION 'invalid_sport' USING ERRCODE = '22023';
  END IF;
  IF NOT app_private.is_admin(actor_id) AND NOT EXISTS (
    SELECT 1
    FROM public.organization_memberships om
    JOIN public.organizations o ON o.id = om.organization_id
    WHERE om.organization_id = _organization_id
      AND om.user_id = actor_id
      AND om.status = 'active'
      AND om.role IN ('owner', 'admin')
      AND o.status = 'active'
  ) THEN
    RAISE EXCEPTION 'organization_admin_required' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.teams(name, sport, created_by, organization_id)
  VALUES (
    btrim(_name), NULLIF(btrim(COALESCE(_sport, '')), ''),
    actor_id, _organization_id
  ) RETURNING * INTO created_team;

  INSERT INTO public.team_staff_memberships(team_id, user_id, role, created_by)
  VALUES (created_team.id, actor_id, 'lead_coach', actor_id);
  INSERT INTO public.team_members(team_id, user_id)
  VALUES (created_team.id, actor_id)
  ON CONFLICT (team_id, user_id) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'team_id', created_team.id,
    'organization_id', _organization_id
  );
END;
$$;
REVOKE ALL ON FUNCTION public.create_organization_team(uuid, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_organization_team(uuid, text, text)
  TO authenticated;

-- Service-only atomic boundary for the public Edge Function. The request and
-- its immutable submitted event can never drift apart.
CREATE OR REPLACE FUNCTION public.submit_organization_access_request_service(_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  inserted_request public.organization_access_requests;
BEGIN
  IF _payload IS NULL OR jsonb_typeof(_payload) <> 'object' THEN
    RAISE EXCEPTION 'invalid_request_payload' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.organization_access_requests(
    contact_name, work_email, phone, job_title, preferred_contact,
    organization_name, organization_type, country_code, website, sports,
    athlete_age_groups, performance_levels, team_count_band,
    athlete_count_band, coach_count_band, rollout_scope, desired_start,
    goals, support_needs, context_note, source, locale, privacy_version,
    public_research_notice_acknowledged
  ) VALUES (
    _payload->>'contact_name', _payload->>'work_email', NULLIF(_payload->>'phone', ''),
    _payload->>'job_title', _payload->>'preferred_contact',
    _payload->>'organization_name', _payload->>'organization_type',
    _payload->>'country_code', NULLIF(_payload->>'website', ''),
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(_payload->'sports', '[]'::jsonb))),
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(_payload->'athlete_age_groups', '[]'::jsonb))),
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(_payload->'performance_levels', '[]'::jsonb))),
    _payload->>'team_count_band', _payload->>'athlete_count_band',
    _payload->>'coach_count_band', _payload->>'rollout_scope',
    _payload->>'desired_start',
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(_payload->'goals', '[]'::jsonb))),
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(_payload->'support_needs', '[]'::jsonb))),
    NULLIF(_payload->>'context_note', ''), _payload->>'source',
    _payload->>'locale', _payload->>'privacy_version',
    COALESCE((_payload->>'public_research_notice_acknowledged')::boolean, false)
  ) RETURNING * INTO inserted_request;

  INSERT INTO public.organization_access_request_events(
    request_id, event_type, metadata
  ) VALUES (
    inserted_request.id, 'submitted',
    jsonb_build_object('source', inserted_request.source)
  );

  RETURN jsonb_build_object(
    'id', inserted_request.id,
    'reference_code', inserted_request.reference_code
  );
END;
$$;
REVOKE ALL ON FUNCTION public.submit_organization_access_request_service(jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_organization_access_request_service(jsonb)
  TO service_role;

CREATE OR REPLACE FUNCTION public.get_admin_organization_access_requests(_status text DEFAULT NULL)
RETURNS SETOF public.organization_access_requests
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT app_private.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT r.*
  FROM public.organization_access_requests r
  WHERE _status IS NULL OR r.status = _status
  ORDER BY
    CASE r.status
      WHEN 'submitted' THEN 1
      WHEN 'review_ready' THEN 2
      WHEN 'needs_information' THEN 3
      WHEN 'call_requested' THEN 4
      ELSE 5
    END,
    r.submitted_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_organization_access_requests(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_organization_access_requests(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_organization_access_request(
  _request_id uuid,
  _status text,
  _internal_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  actor_id uuid := auth.uid();
  previous_status text;
BEGIN
  IF actor_id IS NULL OR NOT app_private.is_admin(actor_id) THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;
  IF _status NOT IN (
    'submitted', 'needs_information', 'review_ready', 'call_requested',
    'approved_community', 'approved_partner', 'approved_enterprise',
    'declined', 'withdrawn', 'activated'
  ) THEN
    RAISE EXCEPTION 'invalid_request_status' USING ERRCODE = '22023';
  END IF;
  IF _internal_note IS NOT NULL AND char_length(_internal_note) > 2400 THEN
    RAISE EXCEPTION 'internal_note_too_long' USING ERRCODE = '22023';
  END IF;

  SELECT r.status INTO previous_status
  FROM public.organization_access_requests r
  WHERE r.id = _request_id
  FOR UPDATE;
  IF previous_status IS NULL THEN
    RAISE EXCEPTION 'request_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF previous_status IN (
    'approved_community', 'approved_partner', 'approved_enterprise',
    'activated', 'declined', 'withdrawn'
  ) THEN
    RAISE EXCEPTION 'request_status_is_final' USING ERRCODE = '22023';
  END IF;
  IF _status NOT IN (
    'submitted', 'needs_information', 'review_ready',
    'call_requested', 'declined', 'withdrawn'
  ) THEN
    RAISE EXCEPTION 'invalid_manual_transition' USING ERRCODE = '22023';
  END IF;

  UPDATE public.organization_access_requests
  SET status = _status, updated_at = now()
  WHERE id = _request_id;

  INSERT INTO public.organization_access_request_events(
    request_id, event_type, actor_user_id, from_status, to_status, internal_note
  ) VALUES (
    _request_id,
    CASE WHEN _internal_note IS NULL THEN 'status_changed' ELSE 'note_added' END,
    actor_id, previous_status, _status, NULLIF(btrim(_internal_note), '')
  );

  RETURN jsonb_build_object('success', true, 'request_id', _request_id, 'status', _status);
END;
$$;

REVOKE ALL ON FUNCTION public.update_organization_access_request(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_organization_access_request(uuid, text, text) TO authenticated;

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
  FROM public.organization_access_requests r
  WHERE r.id = _request_id
  FOR UPDATE;
  IF target_request.id IS NULL THEN
    RAISE EXCEPTION 'request_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF target_request.status NOT IN (
    'submitted', 'needs_information', 'review_ready', 'call_requested'
  ) THEN
    RAISE EXCEPTION 'request_not_approvable' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.organizations(
    name, organization_type, country_code, website, status, access_tier,
    source_request_id, created_by
  ) VALUES (
    target_request.organization_name, target_request.organization_type,
    target_request.country_code, target_request.website, 'pending_activation',
    _access_tier, target_request.id, actor_id
  )
  RETURNING id INTO organization_id;

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
    'expires_at', now() + interval '7 days'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.approve_organization_access_request(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_organization_access_request(uuid, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_team_staff_invitation(
  _team_id uuid,
  _email text,
  _team_role text DEFAULT 'co_coach'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  actor_id uuid := auth.uid();
  normalized_email text := lower(btrim(COALESCE(_email, '')));
  target_team public.teams;
  resolved_organization_id uuid;
  invitation_id uuid;
  raw_token text := encode(extensions.gen_random_bytes(32), 'hex');
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;
  IF _team_role NOT IN ('lead_coach', 'co_coach') THEN
    RAISE EXCEPTION 'invalid_team_role' USING ERRCODE = '22023';
  END IF;
  IF normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'valid_email_required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO target_team FROM public.teams t WHERE t.id = _team_id FOR UPDATE;
  IF target_team.id IS NULL THEN
    RAISE EXCEPTION 'team_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT (
    app_private.is_admin(actor_id)
    OR target_team.created_by = actor_id
    OR EXISTS (
      SELECT 1 FROM public.team_staff_memberships tsm
      WHERE tsm.team_id = _team_id
        AND tsm.user_id = actor_id
        AND tsm.role = 'lead_coach'
        AND tsm.status = 'active'
    )
  ) THEN
    RAISE EXCEPTION 'team_owner_required' USING ERRCODE = '42501';
  END IF;

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
    INSERT INTO public.organization_memberships(organization_id, user_id, role, created_by)
    VALUES (resolved_organization_id, actor_id, 'owner', actor_id)
    ON CONFLICT (organization_id, user_id) DO NOTHING;
    INSERT INTO public.team_staff_memberships(team_id, user_id, role, created_by)
    VALUES (_team_id, actor_id, 'lead_coach', actor_id)
    ON CONFLICT (team_id, user_id) DO NOTHING;
  END IF;

  UPDATE public.organization_invitations
  SET status = 'revoked'
  WHERE team_id = _team_id AND lower(email) = normalized_email AND status = 'pending';

  INSERT INTO public.organization_invitations(
    organization_id, team_id, email, organization_role, team_role,
    token_digest, expires_at, invited_by
  ) VALUES (
    resolved_organization_id, _team_id, normalized_email, 'coach', _team_role,
    encode(extensions.digest(raw_token, 'sha256'), 'hex'), now() + interval '7 days', actor_id
  ) RETURNING id INTO invitation_id;

  RETURN jsonb_build_object(
    'success', true,
    'invitation_id', invitation_id,
    'invitation_token', raw_token,
    'expires_at', now() + interval '7 days'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_team_staff_invitation(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_team_staff_invitation(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_organization_invitation(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  actor_id uuid := auth.uid();
  actor_email text;
  target_invite public.organization_invitations;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  SELECT lower(u.email) INTO actor_email
  FROM auth.users u
  WHERE u.id = actor_id AND u.email_confirmed_at IS NOT NULL;
  IF actor_email IS NULL THEN
    RAISE EXCEPTION 'confirmed_email_required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO target_invite
  FROM public.organization_invitations oi
  WHERE oi.token_digest = encode(extensions.digest(COALESCE(_token, ''), 'sha256'), 'hex')
  FOR UPDATE;
  IF target_invite.id IS NULL THEN
    RAISE EXCEPTION 'invalid_invitation' USING ERRCODE = '22023';
  END IF;
  IF target_invite.status <> 'pending' OR target_invite.expires_at <= now() THEN
    RAISE EXCEPTION 'invitation_expired_or_used' USING ERRCODE = '22023';
  END IF;
  IF lower(target_invite.email) <> actor_email THEN
    RAISE EXCEPTION 'invitation_email_mismatch' USING ERRCODE = '42501';
  END IF;
  IF app_private.is_admin(actor_id) THEN
    RAISE EXCEPTION 'admin_account_invitation_requires_review' USING ERRCODE = '42501';
  END IF;

  -- A brand-new invited signup receives the app's default athlete role before
  -- accepting. Conversion is safe only while the account has no athlete data
  -- and no minor-authorization record. Existing athlete accounts require a
  -- deliberate admin-led migration instead of silent role conversion.
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
  WHERE user_id = actor_id AND role = 'athlete'::public.app_role;
  INSERT INTO public.user_roles(user_id, role)
  VALUES (actor_id, 'coach'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF target_invite.organization_id IS NOT NULL THEN
    INSERT INTO public.organization_memberships(
      organization_id, user_id, role, created_by
    ) VALUES (
      target_invite.organization_id, actor_id,
      COALESCE(target_invite.organization_role, 'coach'), target_invite.invited_by
    ) ON CONFLICT (organization_id, user_id) DO UPDATE
      SET role = EXCLUDED.role, status = 'active', updated_at = now();
  END IF;

  IF target_invite.team_id IS NOT NULL THEN
    INSERT INTO public.team_staff_memberships(team_id, user_id, role, created_by)
    VALUES (
      target_invite.team_id, actor_id,
      COALESCE(target_invite.team_role, 'co_coach'), target_invite.invited_by
    ) ON CONFLICT (team_id, user_id) DO UPDATE
      SET role = EXCLUDED.role, status = 'active', updated_at = now();

    INSERT INTO public.team_members(team_id, user_id)
    VALUES (target_invite.team_id, actor_id)
    ON CONFLICT (team_id, user_id) DO NOTHING;

    IF target_invite.team_role = 'lead_coach' THEN
      UPDATE public.teams SET created_by = actor_id WHERE id = target_invite.team_id;
    END IF;
  END IF;

  UPDATE public.organization_invitations
  SET status = 'accepted', accepted_by = actor_id, accepted_at = now()
  WHERE id = target_invite.id;

  IF target_invite.organization_id IS NOT NULL THEN
    UPDATE public.organizations
    SET status = 'active', updated_at = now()
    WHERE id = target_invite.organization_id AND status = 'pending_activation';

    UPDATE public.organization_access_requests r
    SET status = 'activated', updated_at = now()
    FROM public.organizations o
    WHERE o.id = target_invite.organization_id
      AND o.source_request_id = r.id
      AND r.status IN ('approved_community', 'approved_partner', 'approved_enterprise');

    INSERT INTO public.organization_access_request_events(
      request_id, event_type, actor_user_id, from_status, to_status,
      metadata
    )
    SELECT
      o.source_request_id, 'invitation_accepted', actor_id,
      CASE o.access_tier
        WHEN 'community' THEN 'approved_community'
        WHEN 'partner' THEN 'approved_partner'
        ELSE 'approved_enterprise'
      END,
      'activated',
      jsonb_build_object(
        'organization_id', target_invite.organization_id,
        'team_id', target_invite.team_id,
        'invitation_id', target_invite.id
      )
    FROM public.organizations o
    WHERE o.id = target_invite.organization_id
      AND o.source_request_id IS NOT NULL;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', target_invite.organization_id,
    'team_id', target_invite.team_id,
    'organization_role', target_invite.organization_role,
    'team_role', target_invite.team_role
  );
END;
$$;

REVOKE ALL ON FUNCTION public.accept_organization_invitation(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_organization_invitation(text) TO authenticated;

-- Closed Jarvis source contract. The private view contains only business
-- inquiry fields and deliberately excludes internal notes and athlete data.
CREATE OR REPLACE VIEW app_private.organization_inquiry_machine_read_v1
WITH (security_invoker = true)
AS
SELECT
  r.id,
  r.reference_code,
  r.status,
  r.contact_name,
  r.work_email,
  r.job_title,
  r.organization_name,
  r.organization_type,
  r.country_code,
  r.website,
  r.sports,
  r.athlete_age_groups,
  r.performance_levels,
  r.team_count_band,
  r.athlete_count_band,
  r.coach_count_band,
  r.rollout_scope,
  r.desired_start,
  r.goals,
  r.support_needs,
  r.submitted_at,
  r.updated_at
FROM public.organization_access_requests r;

REVOKE ALL ON app_private.organization_inquiry_machine_read_v1
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON VIEW app_private.organization_inquiry_machine_read_v1 IS
  'Fail-closed Jarvis draft contract. No grant, network consumer, credentials or Production activation in V1.1 local scope.';

INSERT INTO public.organization_access_request_events(request_id, event_type, metadata)
SELECT r.id, 'submitted', jsonb_build_object('source', r.source)
FROM public.organization_access_requests r
WHERE NOT EXISTS (
  SELECT 1 FROM public.organization_access_request_events e
  WHERE e.request_id = r.id AND e.event_type = 'submitted'
);

COMMIT;
