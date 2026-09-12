BEGIN;

-- Shareable Co-Coach invitations are deliberately separate from the existing
-- email-bound organization invitations. The public client receives a one-time
-- high-entropy code, while only its SHA-256 digest is stored in the private
-- schema. No browser role can read the invitation table directly.
CREATE TABLE app_private.team_coach_invitation_codes (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  code_digest text NOT NULL UNIQUE CHECK (code_digest ~ '^[a-f0-9]{64}$'),
  team_role text NOT NULL DEFAULT 'co_coach' CHECK (team_role = 'co_coach'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'revoked')),
  expires_at timestamptz NOT NULL,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_team_coach_invitation_codes_pending
  ON app_private.team_coach_invitation_codes(team_id, expires_at)
  WHERE status = 'pending';

ALTER TABLE app_private.team_coach_invitation_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE app_private.team_coach_invitation_codes
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION app_private.cleanup_team_coach_invitation_codes()
RETURNS integer
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  deleted_count integer;
BEGIN
  WITH deleted AS (
    DELETE FROM app_private.team_coach_invitation_codes invitation
    WHERE invitation.expires_at <= now()
    RETURNING invitation.id
  )
  SELECT count(*)::integer INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION app_private.cleanup_team_coach_invitation_codes()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.create_team_coach_invitation(_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  actor_id uuid := auth.uid();
  target_team public.teams;
  resolved_organization_id uuid;
  invitation_id uuid;
  raw_code text := upper(encode(extensions.gen_random_bytes(10), 'hex'));
  expiration timestamptz := now() + interval '7 days';
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO target_team
  FROM public.teams t
  WHERE t.id = _team_id
  FOR UPDATE;

  IF target_team.id IS NULL THEN
    RAISE EXCEPTION 'team_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT (
    app_private.is_admin(actor_id)
    OR EXISTS (
      SELECT 1
      FROM public.team_staff_memberships tsm
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

    INSERT INTO public.organization_memberships(
      organization_id, user_id, role, created_by
    ) VALUES (
      resolved_organization_id, actor_id, 'owner', actor_id
    ) ON CONFLICT (organization_id, user_id) DO NOTHING;

    INSERT INTO public.team_staff_memberships(team_id, user_id, role, created_by)
    VALUES (_team_id, actor_id, 'lead_coach', actor_id)
    ON CONFLICT (team_id, user_id) DO NOTHING;
  END IF;

  -- Keep the lead-coach experience as simple and predictable as the athlete
  -- invite: one current code per team. Creating a replacement revokes the old
  -- pending code without touching accepted staff memberships.
  UPDATE app_private.team_coach_invitation_codes
  SET status = 'revoked'
  WHERE team_id = _team_id
    AND status = 'pending';

  INSERT INTO app_private.team_coach_invitation_codes(
    organization_id,
    team_id,
    code_digest,
    team_role,
    expires_at,
    invited_by
  ) VALUES (
    resolved_organization_id,
    _team_id,
    encode(extensions.digest(lower(raw_code), 'sha256'), 'hex'),
    'co_coach',
    expiration,
    actor_id
  ) RETURNING id INTO invitation_id;

  RETURN jsonb_build_object(
    'success', true,
    'invitation_id', invitation_id,
    'invitation_code', raw_code,
    'expires_at', expiration
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_team_coach_invitation(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_team_coach_invitation(uuid)
  TO authenticated;

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

-- An individual weekly review is the entering coach's own structured
-- observation. It does not read athlete answers, journals, check-ins or raw
-- scores and is never part of athlete or machine exports. Athlete evidence
-- eligibility remains visible as a separate aggregate/team gate.
CREATE OR REPLACE FUNCTION public.get_coach_evidence_review_context(
  _team_id uuid,
  _protocol_version text DEFAULT '56d-transfer-v1-2026-07'
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  actor_id uuid := auth.uid();
  target_run public.program_runs;
  effective_today date;
  current_week integer;
  athlete_count integer;
  eligible_count integer;
  athletes_json json;
  team_review_json json;
  protocol_enabled boolean;
BEGIN
  IF actor_id IS NULL OR NOT public.can_manage_team_program_runs(_team_id) THEN
    RAISE EXCEPTION 'coach_team_access_required';
  END IF;

  SELECT ep.coach_collection_enabled AND ep.status = 'pilot'
  INTO protocol_enabled
  FROM public.evidence_protocols ep
  WHERE ep.version = _protocol_version;

  IF COALESCE(protocol_enabled, false) = false THEN
    RETURN json_build_object(
      'enabled', false,
      'reason', 'protocol_disabled',
      'protocol_version', _protocol_version,
      'run', NULL,
      'week_number', NULL,
      'team_eligible', false,
      'athlete_count', 0,
      'eligible_athlete_count', 0,
      'athletes', '[]'::json,
      'team_review', NULL
    );
  END IF;

  SELECT * INTO target_run
  FROM public.program_runs pr
  WHERE pr.team_id = _team_id
    AND pr.status = 'active'
  ORDER BY pr.started_at DESC, pr.created_at DESC
  LIMIT 1;

  IF target_run.id IS NULL OR target_run.started_at IS NULL THEN
    RETURN json_build_object(
      'enabled', false,
      'reason', 'no_active_program_run',
      'protocol_version', _protocol_version,
      'run', NULL,
      'week_number', NULL,
      'team_eligible', false,
      'athlete_count', 0,
      'eligible_athlete_count', 0,
      'athletes', '[]'::json,
      'team_review', NULL
    );
  END IF;

  effective_today := public.get_effective_today(actor_id);
  current_week := GREATEST(1, LEAST(8, ((effective_today - target_run.started_at) / 7) + 1));

  WITH athlete_instances AS (
    SELECT
      pi.id AS program_instance_id,
      pi.user_id,
      COALESCE(NULLIF(btrim(p.full_name), ''), 'Athlet ' || left(pi.user_id::text, 8)) AS full_name,
      public.evidence_eligibility_reason(pi.id, _protocol_version) AS eligibility_reason
    FROM public.program_instances pi
    JOIN public.profiles p ON p.id = pi.user_id
    JOIN public.user_roles ur
      ON ur.user_id = pi.user_id
      AND ur.role = 'athlete'::public.app_role
    WHERE pi.program_run_id = target_run.id
      AND pi.team_id = _team_id
      AND pi.status = 'active'
  )
  SELECT
    COUNT(*)::integer,
    COUNT(*) FILTER (
      WHERE eligibility_reason IN ('eligible', 'eligible_minor', 'eligible_test')
    )::integer,
    COALESCE(
      json_agg(
        json_build_object(
          'program_instance_id', ai.program_instance_id,
          'user_id', ai.user_id,
          'full_name', ai.full_name,
          'observation_available', true,
          'eligible', ai.eligibility_reason IN ('eligible', 'eligible_minor', 'eligible_test'),
          'eligibility_reason', ai.eligibility_reason,
          'review', (
            SELECT json_build_object(
              'context', cer.observation_context,
              'values', (
                SELECT COALESCE(
                  json_object_agg(
                    ceo.domain_id,
                    CASE WHEN ceo.not_observed THEN 'not_observed' ELSE ceo.score::text END
                  ),
                  '{}'::json
                )
                FROM public.coach_evidence_observations ceo
                WHERE ceo.review_id = cer.id
              )
            )
            FROM public.coach_evidence_reviews cer
            WHERE cer.coach_id = actor_id
              AND cer.scope_type = 'athlete'
              AND cer.target_program_instance_id = ai.program_instance_id
              AND cer.week_number = current_week
          )
        )
        ORDER BY ai.full_name
      ),
      '[]'::json
    )
  INTO athlete_count, eligible_count, athletes_json
  FROM athlete_instances ai;

  SELECT json_build_object(
    'context', cer.observation_context,
    'values', (
      SELECT COALESCE(
        json_object_agg(
          ceo.domain_id,
          CASE WHEN ceo.not_observed THEN 'not_observed' ELSE ceo.score::text END
        ),
        '{}'::json
      )
      FROM public.coach_evidence_observations ceo
      WHERE ceo.review_id = cer.id
    )
  ) INTO team_review_json
  FROM public.coach_evidence_reviews cer
  WHERE cer.coach_id = actor_id
    AND cer.scope_type = 'team'
    AND cer.program_run_id = target_run.id
    AND cer.week_number = current_week;

  RETURN json_build_object(
    'enabled', true,
    'reason', CASE
      WHEN athlete_count = 0 THEN 'no_athletes'
      WHEN eligible_count <> athlete_count THEN 'individual_observation_ready_team_evidence_restricted'
      ELSE 'ready'
    END,
    'protocol_version', _protocol_version,
    'run', json_build_object(
      'id', target_run.id,
      'name', target_run.name,
      'started_at', target_run.started_at,
      'status', target_run.status
    ),
    'week_number', current_week,
    'effective_date', effective_today,
    'team_eligible', athlete_count > 0 AND eligible_count = athlete_count,
    'athlete_count', athlete_count,
    'eligible_athlete_count', eligible_count,
    'athletes', athletes_json,
    'team_review', team_review_json,
    'individual_visibility', 'entering_coach_only',
    'individual_observation_uses_athlete_private_content', false,
    'external_export_includes_individual_reviews', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_coach_evidence_review_context(uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_coach_evidence_review_context(uuid, text)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.save_coach_evidence_review(
  _scope text,
  _team_id uuid,
  _program_instance_id uuid,
  _protocol_version text,
  _week_number integer,
  _context text,
  _observations jsonb,
  _completion_duration_ms integer DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  actor_id uuid := auth.uid();
  target_run public.program_runs;
  target_instance public.program_instances;
  effective_today date;
  current_week integer;
  review_id uuid;
  athlete_count integer;
  eligible_count integer;
  observation_key_count integer;
  valid_observation_count integer;
  target_is_test boolean := false;
BEGIN
  IF actor_id IS NULL OR NOT public.can_manage_team_program_runs(_team_id) THEN
    RAISE EXCEPTION 'coach_team_access_required';
  END IF;

  IF _scope NOT IN ('team', 'athlete') THEN
    RAISE EXCEPTION 'invalid_coach_review_scope';
  END IF;
  IF _context NOT IN ('training', 'competition', 'mixed') THEN
    RAISE EXCEPTION 'invalid_coach_review_context';
  END IF;
  IF _observations IS NULL OR jsonb_typeof(_observations) <> 'object' THEN
    RAISE EXCEPTION 'coach_observations_must_be_object';
  END IF;
  IF _completion_duration_ms IS NOT NULL
     AND _completion_duration_ms NOT BETWEEN 0 AND 900000 THEN
    RAISE EXCEPTION 'invalid_coach_review_duration';
  END IF;

  SELECT COUNT(*)::integer INTO observation_key_count
  FROM jsonb_object_keys(_observations);

  SELECT COUNT(*)::integer INTO valid_observation_count
  FROM jsonb_each(_observations) item
  WHERE item.key IN (
      'attention_return',
      'error_recovery',
      'pressure_regulation',
      'process_execution',
      'action_under_uncertainty'
    )
    AND (
      (jsonb_typeof(item.value) = 'number' AND (item.value #>> '{}') IN ('1', '2', '3', '4'))
      OR (jsonb_typeof(item.value) = 'string' AND item.value #>> '{}' = 'not_observed')
    );

  IF observation_key_count <> 5 OR valid_observation_count <> 5 THEN
    RAISE EXCEPTION 'exactly_five_valid_coach_observations_required';
  END IF;

  SELECT * INTO target_run
  FROM public.program_runs pr
  WHERE pr.team_id = _team_id
    AND pr.status = 'active'
  ORDER BY pr.started_at DESC, pr.created_at DESC
  LIMIT 1
  FOR SHARE;

  IF target_run.id IS NULL OR target_run.started_at IS NULL THEN
    RAISE EXCEPTION 'active_program_run_required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.evidence_protocols ep
    WHERE ep.version = _protocol_version
      AND ep.status = 'pilot'
      AND ep.coach_collection_enabled
  ) THEN
    RAISE EXCEPTION 'coach_evidence_protocol_disabled';
  END IF;

  effective_today := public.get_effective_today(actor_id);
  current_week := GREATEST(1, LEAST(8, ((effective_today - target_run.started_at) / 7) + 1));
  IF _week_number <> current_week THEN
    RAISE EXCEPTION 'coach_review_week_mismatch';
  END IF;

  IF _scope = 'team' THEN
    IF _program_instance_id IS NOT NULL THEN
      RAISE EXCEPTION 'team_review_must_not_target_athlete';
    END IF;

    PERFORM 1
    FROM public.program_instances pi
    WHERE pi.program_run_id = target_run.id
      AND pi.team_id = _team_id
      AND pi.status = 'active'
    FOR SHARE;

    PERFORM 1
    FROM public.profiles p
    JOIN public.program_instances pi ON pi.user_id = p.id
    WHERE pi.program_run_id = target_run.id
      AND pi.team_id = _team_id
      AND pi.status = 'active'
    FOR SHARE OF p;

    PERFORM 1
    FROM public.evidence_participation_eligibility epe
    JOIN public.program_instances pi ON pi.id = epe.program_instance_id
    WHERE pi.program_run_id = target_run.id
      AND pi.team_id = _team_id
      AND pi.status = 'active'
    FOR SHARE OF epe;

    SELECT
      COUNT(*)::integer,
      COUNT(*) FILTER (
        WHERE public.evidence_eligibility_reason(pi.id, _protocol_version)
          IN ('eligible', 'eligible_minor', 'eligible_test')
      )::integer,
      COALESCE(
        bool_or(COALESCE(p.is_test_user, false) OR COALESCE(pi.is_test_instance, false)),
        false
      )
    INTO athlete_count, eligible_count, target_is_test
    FROM public.program_instances pi
    JOIN public.profiles p ON p.id = pi.user_id
    JOIN public.user_roles ur
      ON ur.user_id = pi.user_id
      AND ur.role = 'athlete'::public.app_role
    WHERE pi.program_run_id = target_run.id
      AND pi.team_id = _team_id
      AND pi.status = 'active';

    IF athlete_count = 0 OR eligible_count <> athlete_count THEN
      RAISE EXCEPTION 'all_team_athletes_must_be_evidence_eligible';
    END IF;
  ELSE
    SELECT * INTO target_instance
    FROM public.program_instances pi
    WHERE pi.id = _program_instance_id
      AND pi.team_id = _team_id
      AND pi.program_run_id = target_run.id
      AND pi.status = 'active'
    FOR SHARE;

    IF target_instance.id IS NULL
       OR NOT public.has_role(target_instance.user_id, 'athlete'::public.app_role) THEN
      RAISE EXCEPTION 'active_team_athlete_instance_required';
    END IF;

    SELECT COALESCE(p.is_test_user, false) OR COALESCE(target_instance.is_test_instance, false)
    INTO target_is_test
    FROM public.profiles p
    WHERE p.id = target_instance.user_id;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      actor_id::text || ':' || target_run.id::text || ':' || _scope || ':'
      || COALESCE(_program_instance_id::text, 'team') || ':' || _week_number::text,
      0
    )
  );

  IF _scope = 'team' THEN
    SELECT cer.id INTO review_id
    FROM public.coach_evidence_reviews cer
    WHERE cer.coach_id = actor_id
      AND cer.program_run_id = target_run.id
      AND cer.scope_type = 'team'
      AND cer.week_number = _week_number
    FOR UPDATE;
  ELSE
    SELECT cer.id INTO review_id
    FROM public.coach_evidence_reviews cer
    WHERE cer.coach_id = actor_id
      AND cer.target_program_instance_id = target_instance.id
      AND cer.scope_type = 'athlete'
      AND cer.week_number = _week_number
    FOR UPDATE;
  END IF;

  IF review_id IS NULL THEN
    INSERT INTO public.coach_evidence_reviews(
      coach_id,
      scope_type,
      team_id,
      program_run_id,
      target_program_instance_id,
      protocol_version,
      week_number,
      observation_context,
      observed_athlete_count,
      completion_duration_ms,
      is_test
    ) VALUES (
      actor_id,
      _scope,
      _team_id,
      target_run.id,
      CASE WHEN _scope = 'athlete' THEN target_instance.id ELSE NULL END,
      _protocol_version,
      _week_number,
      _context,
      CASE WHEN _scope = 'team' THEN athlete_count ELSE 1 END,
      _completion_duration_ms,
      target_is_test
    ) RETURNING id INTO review_id;
  ELSE
    UPDATE public.coach_evidence_reviews
    SET observation_context = _context,
        protocol_version = _protocol_version,
        observed_athlete_count = CASE WHEN _scope = 'team' THEN athlete_count ELSE 1 END,
        completion_duration_ms = COALESCE(_completion_duration_ms, completion_duration_ms),
        is_test = target_is_test
    WHERE id = review_id;

    DELETE FROM public.coach_evidence_observations ceo
    WHERE ceo.review_id = review_id;
  END IF;

  INSERT INTO public.coach_evidence_observations(
    review_id, domain_id, score, not_observed
  )
  SELECT
    review_id,
    item.key,
    CASE WHEN jsonb_typeof(item.value) = 'number'
      THEN (item.value #>> '{}')::smallint
      ELSE NULL
    END,
    jsonb_typeof(item.value) = 'string'
      AND item.value #>> '{}' = 'not_observed'
  FROM jsonb_each(_observations) item;

  RETURN json_build_object(
    'review_id', review_id,
    'scope', _scope,
    'team_id', _team_id,
    'program_run_id', target_run.id,
    'program_instance_id', CASE WHEN _scope = 'athlete' THEN target_instance.id ELSE NULL END,
    'week_number', _week_number,
    'effective_date', effective_today,
    'saved_at', now(),
    'individual_visibility', CASE
      WHEN _scope = 'athlete' THEN 'entering_coach_only'
      ELSE 'team_observation'
    END,
    'uses_athlete_private_content', false,
    'external_export_included', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.save_coach_evidence_review(
  text, uuid, uuid, text, integer, text, jsonb, integer
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_coach_evidence_review(
  text, uuid, uuid, text, integer, text, jsonb, integer
) TO authenticated;

COMMENT ON TABLE app_private.team_coach_invitation_codes IS
  'Private one-time Co-Coach invite codes. Only digests are stored; accepted codes are deleted immediately and expired codes are purged daily.';
COMMENT ON FUNCTION public.create_team_coach_invitation(uuid) IS
  'Creates one current seven-day Co-Coach code for a team. Lead coach or platform admin only.';
COMMENT ON FUNCTION public.accept_team_coach_invitation(text) IS
  'Accepts one confirmed-account Co-Coach code and grants the same active coach/team memberships as a normal Co-Coach.';
COMMENT ON FUNCTION public.get_coach_evidence_review_context(uuid, text) IS
  'Returns coach-owned structured observation context separately from athlete evidence eligibility. No athlete private content is returned.';

SELECT cron.schedule(
  'team-coach-invitation-retention-daily',
  '29 4 * * *',
  'SELECT app_private.cleanup_team_coach_invitation_codes();'
);

COMMIT;
