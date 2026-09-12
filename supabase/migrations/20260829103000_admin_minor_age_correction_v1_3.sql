BEGIN;

-- Founder-only lookup for one exact account. This deliberately returns no
-- questionnaire answers, journal content, birth date, or other program data.
CREATE OR REPLACE FUNCTION public.find_admin_minor_age_candidate(_email text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  actor_id uuid := auth.uid();
  normalized_email text := lower(btrim(COALESCE(_email, '')));
  candidate jsonb;
BEGIN
  IF actor_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = actor_id
      AND ur.role = 'admin'::public.app_role
  ) THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;

  IF length(normalized_email) > 254
     OR normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'valid_email_required' USING ERRCODE = '22023';
  END IF;

  SELECT jsonb_build_object(
    'user_id', u.id,
    'email', lower(u.email),
    'full_name', COALESCE(NULLIF(btrim(p.full_name), ''), 'Ohne Namen'),
    'role', 'athlete',
    'team_names', COALESCE((
      SELECT jsonb_agg(t.name ORDER BY t.name)
      FROM public.team_members tm
      JOIN public.teams t ON t.id = tm.team_id
      WHERE tm.user_id = u.id
        AND COALESCE(t.is_archived, false) = false
    ), '[]'::jsonb),
    'age_band', pa.age_band,
    'age_assurance_method', pa.age_assurance_method,
    'product_status', pa.product_status,
    'guardian_status', pa.guardian_status
  )
  INTO candidate
  FROM auth.users u
  JOIN public.user_roles ur
    ON ur.user_id = u.id
   AND ur.role = 'athlete'::public.app_role
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN minor_auth.participant_authorizations pa ON pa.user_id = u.id
  WHERE lower(u.email) = normalized_email
  LIMIT 1;

  RETURN candidate;
END;
$$;

REVOKE ALL ON FUNCTION public.find_admin_minor_age_candidate(text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_admin_minor_age_candidate(text)
  TO authenticated;

COMMENT ON FUNCTION public.find_admin_minor_age_candidate(text) IS
  'Founder-only exact-email lookup for the V1.3 age-correction flow. Returns identity and authorization status only; never program answers or free text.';

CREATE OR REPLACE FUNCTION public.admin_correct_athlete_to_under_16(
  _user_id uuid,
  _confirmation text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  actor_id uuid := auth.uid();
  active_policy minor_auth.policy_versions;
  participant minor_auth.participant_authorizations;
BEGIN
  IF actor_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = actor_id
      AND ur.role = 'admin'::public.app_role
  ) THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;

  IF _user_id IS NULL OR _confirmation IS DISTINCT FROM 'ALTERSGRUPPE_UNTER_16_BESTAETIGT' THEN
    RAISE EXCEPTION 'explicit_confirmation_required' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = 'athlete'::public.app_role
  ) THEN
    RAISE EXCEPTION 'athlete_required' USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO active_policy
  FROM minor_auth.policy_versions pv
  WHERE pv.jurisdiction = 'DE'
    AND pv.status = 'active'
  ORDER BY pv.effective_from DESC
  LIMIT 1;

  IF active_policy.id IS NULL THEN
    RAISE EXCEPTION 'minor_policy_not_configured';
  END IF;

  SELECT *
  INTO participant
  FROM minor_auth.participant_authorizations pa
  WHERE pa.user_id = _user_id
  FOR UPDATE;

  IF participant.user_id IS NULL THEN
    RAISE EXCEPTION 'age_band_not_recorded' USING ERRCODE = '22023';
  END IF;

  IF participant.age_band = 'under_16' THEN
    RETURN jsonb_build_object(
      'success', true,
      'changed', false,
      'user_id', _user_id,
      'age_band', participant.age_band,
      'age_assurance_method', participant.age_assurance_method,
      'product_status', participant.product_status,
      'guardian_status', participant.guardian_status
    );
  END IF;

  IF participant.age_band NOT IN ('age_16_17', 'adult') THEN
    RAISE EXCEPTION 'unsupported_age_band_correction' USING ERRCODE = '22023';
  END IF;

  -- Invalidate any stale authorization links before changing the product gate.
  UPDATE minor_auth.guardian_challenges
  SET status = 'revoked',
      consumed_at = COALESCE(consumed_at, now())
  WHERE user_id = _user_id
    AND status IN ('pending', 'approved', 'delivery_failed');

  UPDATE minor_auth.guardian_access_tokens
  SET revoked_at = now()
  WHERE user_id = _user_id
    AND revoked_at IS NULL;

  -- Only the authorization basis changes. All questionnaire, dashboard,
  -- membership, calendar, and program-progress rows remain untouched.
  UPDATE minor_auth.participant_authorizations
  SET policy_id = active_policy.id,
      age_band = 'under_16',
      age_assurance_method = 'support_verified_correction',
      guardian_status = 'required',
      athlete_status = 'required',
      product_status = 'pending',
      data_contribution_guardian = NULL,
      data_contribution_athlete = NULL,
      data_contribution_status = 'not_asked',
      guardian_authorized_at = NULL,
      athlete_assented_at = NULL,
      product_authorized_at = NULL,
      revoked_at = NULL
  WHERE user_id = _user_id;

  UPDATE public.profiles
  SET data_contribution_consent = NULL,
      data_contribution_consent_version = NULL,
      data_contribution_consented_at = NULL,
      data_contribution_updated_at = now()
  WHERE id = _user_id;

  INSERT INTO minor_auth.authorization_audit(
    user_id,
    policy_id,
    actor_type,
    event_type,
    resulting_product_status,
    resulting_data_contribution_status
  ) VALUES (
    _user_id,
    active_policy.id,
    'support',
    'age_band_corrected_to_under_16',
    'pending',
    'not_asked'
  );

  RETURN jsonb_build_object(
    'success', true,
    'changed', true,
    'user_id', _user_id,
    'age_band', 'under_16',
    'age_assurance_method', 'support_verified_correction',
    'product_status', 'pending',
    'guardian_status', 'required'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_correct_athlete_to_under_16(uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_correct_athlete_to_under_16(uuid, text)
  TO authenticated;

COMMENT ON FUNCTION public.admin_correct_athlete_to_under_16(uuid, text) IS
  'Founder-only, auditable correction from 16/17 or adult to under 16. Preserves all product data and forces a fresh Guardian plus athlete authorization.';

COMMIT;
