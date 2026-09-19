BEGIN;

-- RewirePerform minor/guardian authorization foundation.
-- The schema is deliberately excluded from direct client access. Every state
-- transition is performed through the service-role-only RPC below.

CREATE SCHEMA IF NOT EXISTS minor_auth;
REVOKE ALL ON SCHEMA minor_auth FROM PUBLIC, anon, authenticated;

CREATE TABLE minor_auth.system_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  enforcement_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO minor_auth.system_settings(singleton, enforcement_enabled)
VALUES (true, false)
ON CONFLICT (singleton) DO NOTHING;

CREATE TABLE minor_auth.policy_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_key text NOT NULL UNIQUE,
  jurisdiction text NOT NULL CHECK (jurisdiction = 'DE'),
  product_version text NOT NULL,
  guardian_notice_version text NOT NULL,
  guardian_decision_version text NOT NULL,
  athlete_assent_version text NOT NULL,
  data_contribution_version text NOT NULL,
  content_hash text NOT NULL CHECK (content_hash ~ '^[0-9a-f]{64}$'),
  effective_from timestamptz NOT NULL,
  retired_at timestamptz,
  status text NOT NULL CHECK (status IN ('draft', 'active', 'retired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'retired') = (retired_at IS NOT NULL))
);

CREATE UNIQUE INDEX minor_auth_one_active_policy
  ON minor_auth.policy_versions(jurisdiction)
  WHERE status = 'active';

INSERT INTO minor_auth.policy_versions(
  policy_key,
  jurisdiction,
  product_version,
  guardian_notice_version,
  guardian_decision_version,
  athlete_assent_version,
  data_contribution_version,
  content_hash,
  effective_from,
  status
)
VALUES (
  'de_minor_product_v1_2026_07',
  'DE',
  'minor_product_v1_2026_07',
  'guardian_notice_v1_2026_07',
  'guardian_decision_v1_2026_07',
  'athlete_assent_v1_2026_07',
  'data_contribution_v2_2026_07',
  'f2fb64cc68d5808147b60972f500ffa4cdc9440143df9d700c4c123f063f8ae8',
  '2026-07-18 00:00:00+00',
  'active'
)
ON CONFLICT (policy_key) DO NOTHING;

CREATE TABLE minor_auth.participant_authorizations (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  policy_id uuid NOT NULL REFERENCES minor_auth.policy_versions(id) ON DELETE RESTRICT,
  jurisdiction text NOT NULL DEFAULT 'DE' CHECK (jurisdiction = 'DE'),
  age_band text NOT NULL CHECK (age_band IN ('under_16', 'age_16_17', 'adult')),
  age_assurance_method text NOT NULL DEFAULT 'age_band_self_declaration'
    CHECK (age_assurance_method IN ('age_band_self_declaration', 'support_verified_correction')),
  guardian_status text NOT NULL
    CHECK (guardian_status IN ('not_required', 'required', 'pending', 'authorized', 'declined', 'expired', 'revoked')),
  athlete_status text NOT NULL
    CHECK (athlete_status IN ('not_required', 'required', 'authorized', 'declined', 'revoked')),
  product_status text NOT NULL
    CHECK (product_status IN ('pending', 'authorized', 'declined', 'revoked', 'policy_refresh_required')),
  data_contribution_guardian boolean,
  data_contribution_athlete boolean,
  data_contribution_status text NOT NULL DEFAULT 'not_asked'
    CHECK (data_contribution_status IN ('not_asked', 'authorized', 'declined', 'revoked', 'policy_refresh_required')),
  guardian_authorized_at timestamptz,
  athlete_assented_at timestamptz,
  product_authorized_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    age_band = 'under_16'
    OR guardian_status = 'not_required'
  ),
  CHECK (
    product_status <> 'authorized'
    OR (
      athlete_status IN ('authorized', 'not_required')
      AND guardian_status IN ('authorized', 'not_required')
      AND product_authorized_at IS NOT NULL
      AND revoked_at IS NULL
    )
  ),
  CHECK (
    data_contribution_status <> 'authorized'
    OR (
      data_contribution_athlete = true
      AND (age_band <> 'under_16' OR data_contribution_guardian = true)
      AND product_status = 'authorized'
    )
  )
);

CREATE TABLE minor_auth.guardian_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  policy_id uuid NOT NULL REFERENCES minor_auth.policy_versions(id) ON DELETE RESTRICT,
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  guardian_email_ciphertext text NOT NULL,
  guardian_email_iv text NOT NULL,
  guardian_email_hash text NOT NULL CHECK (guardian_email_hash ~ '^[0-9a-f]{64}$'),
  guardian_email_mask text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'declined', 'expired', 'revoked', 'delivery_failed')),
  delivery_status text NOT NULL DEFAULT 'queued'
    CHECK (delivery_status IN ('queued', 'sent', 'failed')),
  provider_message_id text,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  last_sent_at timestamptz,
  send_count smallint NOT NULL DEFAULT 0 CHECK (send_count BETWEEN 0 AND 20),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX minor_auth_one_pending_challenge_per_user
  ON minor_auth.guardian_challenges(user_id)
  WHERE status = 'pending';
CREATE INDEX minor_auth_challenge_rate_user
  ON minor_auth.guardian_challenges(user_id, created_at DESC);
CREATE INDEX minor_auth_challenge_rate_email
  ON minor_auth.guardian_challenges(guardian_email_hash, created_at DESC);

CREATE TABLE minor_auth.guardian_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  policy_id uuid NOT NULL REFERENCES minor_auth.policy_versions(id) ON DELETE RESTRICT,
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  scope text NOT NULL DEFAULT 'withdraw' CHECK (scope = 'withdraw'),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX minor_auth_guardian_access_user
  ON minor_auth.guardian_access_tokens(user_id, created_at DESC);

CREATE TABLE minor_auth.authorization_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  policy_id uuid REFERENCES minor_auth.policy_versions(id) ON DELETE SET NULL,
  actor_type text NOT NULL CHECK (actor_type IN ('athlete', 'guardian', 'system', 'support')),
  event_type text NOT NULL,
  resulting_product_status text,
  resulting_data_contribution_status text,
  receipt_id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX minor_auth_audit_user_created
  ON minor_auth.authorization_audit(user_id, created_at DESC);

ALTER TABLE minor_auth.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE minor_auth.policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE minor_auth.participant_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE minor_auth.guardian_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE minor_auth.guardian_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE minor_auth.authorization_audit ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON ALL TABLES IN SCHEMA minor_auth FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA minor_auth FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION minor_auth.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER minor_auth_participant_touch
BEFORE UPDATE ON minor_auth.participant_authorizations
FOR EACH ROW EXECUTE FUNCTION minor_auth.touch_updated_at();

CREATE TRIGGER minor_auth_challenge_touch
BEFORE UPDATE ON minor_auth.guardian_challenges
FOR EACH ROW EXECUTE FUNCTION minor_auth.touch_updated_at();

CREATE OR REPLACE FUNCTION minor_auth.active_policy_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT pv.id
  FROM minor_auth.policy_versions pv
  WHERE pv.jurisdiction = 'DE' AND pv.status = 'active'
  ORDER BY pv.effective_from DESC
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION minor_auth.enforcement_enabled()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT COALESCE(
    (SELECT ss.enforcement_enabled FROM minor_auth.system_settings ss WHERE ss.singleton),
    false
  )
$$;

CREATE OR REPLACE FUNCTION minor_auth.is_product_authorized(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF NOT minor_auth.enforcement_enabled() THEN
    RETURN true;
  END IF;

  PERFORM 1
  FROM minor_auth.participant_authorizations pa
  JOIN minor_auth.policy_versions pv ON pv.id = pa.policy_id
  WHERE pa.user_id = _user_id
    AND pa.product_status = 'authorized'
    AND pa.revoked_at IS NULL
    AND pv.status = 'active'
  FOR SHARE OF pa;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION minor_auth.is_data_contribution_authorized(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF NOT minor_auth.enforcement_enabled() THEN
    RETURN true;
  END IF;

  PERFORM 1
  FROM minor_auth.participant_authorizations pa
  JOIN minor_auth.policy_versions pv ON pv.id = pa.policy_id
  WHERE pa.user_id = _user_id
    AND pa.product_status = 'authorized'
    AND pa.data_contribution_status = 'authorized'
    AND pa.revoked_at IS NULL
    AND pv.status = 'active'
  FOR SHARE OF pa;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION minor_auth.cleanup_retention()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  UPDATE minor_auth.guardian_challenges gc
  SET status = 'expired', consumed_at = COALESCE(gc.consumed_at, now())
  WHERE gc.status = 'pending' AND gc.expires_at <= now();

  UPDATE minor_auth.participant_authorizations pa
  SET guardian_status = 'expired'
  WHERE pa.guardian_status = 'pending'
    AND NOT EXISTS (
      SELECT 1
      FROM minor_auth.guardian_challenges gc
      WHERE gc.user_id = pa.user_id AND gc.status = 'pending'
    );

  -- Guardian addresses and decision tokens are short-lived operational data.
  DELETE FROM minor_auth.guardian_challenges gc
  WHERE gc.created_at < now() - interval '7 days';

  DELETE FROM minor_auth.guardian_access_tokens gat
  WHERE (
      gat.consumed_at IS NOT NULL
      OR gat.revoked_at IS NOT NULL
      OR gat.expires_at <= now()
    )
    AND COALESCE(gat.consumed_at, gat.revoked_at, gat.expires_at) < now() - interval '7 days';

  -- Minimized consent receipts are retained for accountability, then removed.
  DELETE FROM minor_auth.authorization_audit aa
  WHERE aa.created_at < now() - interval '3 years';

  DELETE FROM public.app_event_log ael
  WHERE ael.created_at < now() - interval '30 days';

  DELETE FROM public.notification_log nl
  WHERE nl.created_at < now() - interval '90 days';
END;
$$;

CREATE OR REPLACE FUNCTION minor_auth.enforce_product_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  target_user_id := NULLIF(to_jsonb(NEW) ->> TG_ARGV[0], '')::uuid;
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'minor_authorization_user_required';
  END IF;
  IF NOT minor_auth.is_product_authorized(target_user_id) THEN
    RAISE EXCEPTION 'minor_product_authorization_required';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION minor_auth.enforce_profile_data_contribution()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.data_contribution_consent = true
     AND NOT minor_auth.is_data_contribution_authorized(NEW.id) THEN
    RAISE EXCEPTION 'minor_data_contribution_authorization_required';
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  item record;
BEGIN
  FOR item IN
    SELECT * FROM (VALUES
      ('questionnaire_responses', 'user_id'),
      ('daily_checkins', 'user_id'),
      ('daily_journals', 'user_id'),
      ('assessments', 'user_id'),
      ('deep_profile_assessments', 'user_id'),
      ('user_day_assignments', 'user_id'),
      ('user_day_completion', 'user_id'),
      ('comprehension_check_instances', 'user_id'),
      ('program_progress_snapshots', 'user_id'),
      ('athlete_transfer_observations', 'user_id'),
      ('calendar_events', 'user_id'),
      ('program_settings', 'user_id'),
      ('program_instances', 'user_id'),
      ('training_schedule', 'user_id'),
      ('push_subscriptions', 'user_id'),
      ('personalized_tasks', 'user_id')
    ) AS guarded(table_name, user_column)
  LOOP
    IF to_regclass('public.' || item.table_name) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', 'minor_product_authorization_guard', item.table_name);
      EXECUTE format(
        'CREATE TRIGGER %I BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION minor_auth.enforce_product_write(%L)',
        'minor_product_authorization_guard',
        item.table_name,
        item.user_column
      );
    END IF;
  END LOOP;
END;
$$;

DROP TRIGGER IF EXISTS minor_profile_product_authorization_guard ON public.profiles;
CREATE TRIGGER minor_profile_product_authorization_guard
BEFORE UPDATE OF full_name, sport, team, position ON public.profiles
FOR EACH ROW EXECUTE FUNCTION minor_auth.enforce_product_write('id');

DROP TRIGGER IF EXISTS minor_data_contribution_guard ON public.profiles;
CREATE TRIGGER minor_data_contribution_guard
BEFORE INSERT OR UPDATE OF data_contribution_consent ON public.profiles
FOR EACH ROW EXECUTE FUNCTION minor_auth.enforce_profile_data_contribution();

CREATE OR REPLACE FUNCTION public.minor_service_action(
  _action text,
  _user_id uuid DEFAULT NULL,
  _payload jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  active_policy minor_auth.policy_versions;
  participant minor_auth.participant_authorizations;
  challenge minor_auth.guardian_challenges;
  access_token minor_auth.guardian_access_tokens;
  selected_age_band text;
  product_choice boolean;
  contribution_choice boolean;
  guardian_declaration boolean;
  challenge_id uuid;
  rate_hour integer;
  rate_day integer;
  status_payload jsonb;
  affected_rows integer;
  data_not_ready integer;
BEGIN
  SELECT * INTO active_policy
  FROM minor_auth.policy_versions pv
  WHERE pv.jurisdiction = 'DE' AND pv.status = 'active'
  ORDER BY pv.effective_from DESC
  LIMIT 1;

  IF active_policy.id IS NULL THEN
    RAISE EXCEPTION 'minor_policy_not_configured';
  END IF;

  IF _action = 'filter_data_contribution' THEN
    IF jsonb_typeof(_payload -> 'user_ids') IS DISTINCT FROM 'array'
       OR jsonb_array_length(_payload -> 'user_ids') > 5000 THEN
      RAISE EXCEPTION 'invalid_user_id_list';
    END IF;
    RETURN jsonb_build_object(
      'user_ids', COALESCE((
        SELECT jsonb_agg(pa.user_id ORDER BY pa.user_id)
        FROM minor_auth.participant_authorizations pa
        WHERE pa.user_id IN (
          SELECT value::uuid
          FROM jsonb_array_elements_text(_payload -> 'user_ids') AS candidate(value)
        )
          AND pa.policy_id = active_policy.id
          AND pa.product_status = 'authorized'
          AND pa.data_contribution_status = 'authorized'
          AND pa.revoked_at IS NULL
      ), '[]'::jsonb)
    );
  END IF;

  IF _action = 'status' THEN
    IF _user_id IS NULL THEN RAISE EXCEPTION 'user_required'; END IF;

    SELECT * INTO participant
    FROM minor_auth.participant_authorizations pa
    WHERE pa.user_id = _user_id;

    IF participant.user_id IS NULL THEN
      RETURN jsonb_build_object(
        'state', 'unknown_age',
        'age_band', NULL,
        'product_status', 'pending',
        'guardian_status', 'not_required',
        'athlete_status', 'required',
        'data_contribution_status', 'not_asked',
        'guardian_email_mask', NULL,
        'policy_key', active_policy.policy_key,
        'product_version', active_policy.product_version,
        'guardian_notice_version', active_policy.guardian_notice_version,
        'guardian_decision_version', active_policy.guardian_decision_version,
        'athlete_assent_version', active_policy.athlete_assent_version,
        'data_contribution_version', active_policy.data_contribution_version,
        'enforcement_enabled', minor_auth.enforcement_enabled()
      );
    END IF;

    SELECT * INTO challenge
    FROM minor_auth.guardian_challenges gc
    WHERE gc.user_id = _user_id
    ORDER BY gc.created_at DESC
    LIMIT 1;

    IF challenge.id IS NOT NULL AND challenge.status = 'pending' AND challenge.expires_at <= now() THEN
      UPDATE minor_auth.guardian_challenges
      SET status = 'expired', consumed_at = now()
      WHERE id = challenge.id;
      UPDATE minor_auth.participant_authorizations
      SET guardian_status = 'expired'
      WHERE user_id = _user_id AND guardian_status = 'pending';
      challenge.status := 'expired';
      participant.guardian_status := 'expired';
    END IF;

    IF participant.policy_id <> active_policy.id THEN
      UPDATE minor_auth.participant_authorizations
      SET product_status = 'policy_refresh_required',
          data_contribution_status = CASE
            WHEN data_contribution_status = 'authorized' THEN 'policy_refresh_required'
            ELSE data_contribution_status
          END
      WHERE user_id = _user_id;
      participant.product_status := 'policy_refresh_required';
      IF participant.data_contribution_status = 'authorized' THEN
        participant.data_contribution_status := 'policy_refresh_required';
      END IF;
    END IF;

    RETURN jsonb_build_object(
      'state', CASE
        WHEN participant.product_status = 'authorized' THEN 'product_authorized'
        WHEN participant.product_status = 'revoked' THEN 'revoked'
        WHEN participant.product_status = 'declined' THEN 'declined'
        WHEN participant.product_status = 'policy_refresh_required' THEN 'policy_refresh_required'
        WHEN participant.age_band = 'under_16' AND participant.guardian_status = 'required' THEN 'guardian_contact_required'
        WHEN participant.age_band = 'under_16' AND participant.guardian_status = 'pending' THEN 'guardian_pending'
        WHEN participant.age_band = 'under_16' AND participant.guardian_status = 'declined' THEN 'guardian_declined'
        WHEN participant.age_band = 'under_16' AND participant.guardian_status = 'expired' THEN 'guardian_expired'
        WHEN participant.athlete_status = 'required' THEN 'athlete_assent_required'
        ELSE 'pending'
      END,
      'age_band', participant.age_band,
      'product_status', participant.product_status,
      'guardian_status', participant.guardian_status,
      'athlete_status', participant.athlete_status,
      'data_contribution_status', participant.data_contribution_status,
      'data_contribution_guardian', participant.data_contribution_guardian,
      'data_contribution_athlete', participant.data_contribution_athlete,
      'guardian_email_mask', challenge.guardian_email_mask,
      'challenge_expires_at', challenge.expires_at,
      'policy_key', active_policy.policy_key,
      'product_version', active_policy.product_version,
      'guardian_notice_version', active_policy.guardian_notice_version,
      'guardian_decision_version', active_policy.guardian_decision_version,
      'athlete_assent_version', active_policy.athlete_assent_version,
      'data_contribution_version', active_policy.data_contribution_version,
      'enforcement_enabled', minor_auth.enforcement_enabled()
    );
  END IF;

  IF _action = 'set_age' THEN
    IF _user_id IS NULL THEN RAISE EXCEPTION 'user_required'; END IF;
    IF NOT public.has_role(_user_id, 'athlete'::public.app_role) THEN
      RAISE EXCEPTION 'athlete_role_required';
    END IF;
    selected_age_band := _payload ->> 'age_band';
    IF selected_age_band IS NULL OR selected_age_band NOT IN ('under_16', 'age_16_17', 'adult') THEN
      RAISE EXCEPTION 'invalid_age_band';
    END IF;

    IF selected_age_band = 'adult' THEN
      SELECT CASE
        WHEN p.data_contribution_consent_version = active_policy.data_contribution_version
          THEN p.data_contribution_consent
        ELSE NULL
      END
      INTO contribution_choice
      FROM public.profiles p
      WHERE p.id = _user_id;
    ELSE
      contribution_choice := NULL;
    END IF;

    SELECT * INTO participant
    FROM minor_auth.participant_authorizations pa
    WHERE pa.user_id = _user_id
    FOR UPDATE;

    IF participant.user_id IS NOT NULL
       AND participant.age_band <> selected_age_band THEN
      RAISE EXCEPTION 'age_band_change_requires_support';
    END IF;

    INSERT INTO minor_auth.participant_authorizations(
      user_id, policy_id, age_band, guardian_status, athlete_status,
      product_status, data_contribution_athlete, data_contribution_status,
      product_authorized_at, revoked_at
    )
    VALUES (
      _user_id,
      active_policy.id,
      selected_age_band,
      CASE WHEN selected_age_band = 'under_16' THEN 'required' ELSE 'not_required' END,
      CASE WHEN selected_age_band = 'adult' THEN 'not_required' ELSE 'required' END,
      CASE WHEN selected_age_band = 'adult' THEN 'authorized' ELSE 'pending' END,
      CASE WHEN selected_age_band = 'adult' THEN contribution_choice ELSE NULL END,
      CASE
        WHEN selected_age_band <> 'adult' OR contribution_choice IS NULL THEN 'not_asked'
        WHEN contribution_choice THEN 'authorized'
        ELSE 'declined'
      END,
      CASE WHEN selected_age_band = 'adult' THEN now() ELSE NULL END,
      NULL
    )
    ON CONFLICT (user_id) DO UPDATE
    SET policy_id = active_policy.id,
        age_band = EXCLUDED.age_band,
        guardian_status = EXCLUDED.guardian_status,
        athlete_status = EXCLUDED.athlete_status,
        product_status = EXCLUDED.product_status,
        data_contribution_guardian = NULL,
        data_contribution_athlete = EXCLUDED.data_contribution_athlete,
        data_contribution_status = EXCLUDED.data_contribution_status,
        guardian_authorized_at = NULL,
        athlete_assented_at = NULL,
        product_authorized_at = EXCLUDED.product_authorized_at,
        revoked_at = NULL;

    IF selected_age_band <> 'adult' THEN
      UPDATE public.profiles
      SET data_contribution_consent = NULL,
          data_contribution_consent_version = NULL,
          data_contribution_consented_at = NULL,
          data_contribution_updated_at = now()
      WHERE id = _user_id;
    END IF;

    INSERT INTO minor_auth.authorization_audit(
      user_id, policy_id, actor_type, event_type,
      resulting_product_status, resulting_data_contribution_status
    ) VALUES (
      _user_id, active_policy.id, 'athlete', 'age_band_recorded',
      CASE WHEN selected_age_band = 'adult' THEN 'authorized' ELSE 'pending' END,
      CASE
        WHEN selected_age_band <> 'adult' OR contribution_choice IS NULL THEN 'not_asked'
        WHEN contribution_choice THEN 'authorized'
        ELSE 'declined'
      END
    );

    RETURN public.minor_service_action('status', _user_id, '{}'::jsonb);
  END IF;

  IF _action = 'start_challenge' THEN
    IF _user_id IS NULL THEN RAISE EXCEPTION 'user_required'; END IF;
    SELECT * INTO participant
    FROM minor_auth.participant_authorizations pa
    WHERE pa.user_id = _user_id
    FOR UPDATE;
    IF participant.user_id IS NULL OR participant.age_band <> 'under_16' THEN
      RAISE EXCEPTION 'guardian_flow_not_required';
    END IF;

    IF COALESCE(_payload ->> 'token_hash', '') !~ '^[0-9a-f]{64}$'
       OR COALESCE(_payload ->> 'guardian_email_hash', '') !~ '^[0-9a-f]{64}$'
       OR length(COALESCE(_payload ->> 'guardian_email_ciphertext', '')) < 20
       OR length(COALESCE(_payload ->> 'guardian_email_iv', '')) < 12
       OR length(COALESCE(_payload ->> 'guardian_email_mask', '')) < 5 THEN
      RAISE EXCEPTION 'invalid_challenge_payload';
    END IF;

    SELECT COUNT(*)::integer INTO rate_hour
    FROM minor_auth.guardian_challenges gc
    WHERE (gc.user_id = _user_id OR gc.guardian_email_hash = (_payload ->> 'guardian_email_hash'))
      AND gc.created_at >= now() - interval '1 hour';
    SELECT COUNT(*)::integer INTO rate_day
    FROM minor_auth.guardian_challenges gc
    WHERE (gc.user_id = _user_id OR gc.guardian_email_hash = (_payload ->> 'guardian_email_hash'))
      AND gc.created_at >= now() - interval '24 hours';
    IF rate_hour >= 3 OR rate_day >= 6 THEN
      RAISE EXCEPTION 'guardian_rate_limit_reached';
    END IF;

    UPDATE minor_auth.guardian_challenges
    SET status = 'revoked', consumed_at = now()
    WHERE user_id = _user_id AND status = 'pending';

    INSERT INTO minor_auth.guardian_challenges(
      user_id, policy_id, token_hash, guardian_email_ciphertext,
      guardian_email_iv, guardian_email_hash, guardian_email_mask, expires_at
    ) VALUES (
      _user_id,
      active_policy.id,
      _payload ->> 'token_hash',
      _payload ->> 'guardian_email_ciphertext',
      _payload ->> 'guardian_email_iv',
      _payload ->> 'guardian_email_hash',
      _payload ->> 'guardian_email_mask',
      now() + interval '48 hours'
    ) RETURNING id INTO challenge_id;

    UPDATE minor_auth.participant_authorizations
    SET policy_id = active_policy.id,
        guardian_status = 'pending',
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

    INSERT INTO minor_auth.authorization_audit(
      user_id, policy_id, actor_type, event_type,
      resulting_product_status, resulting_data_contribution_status
    ) VALUES (_user_id, active_policy.id, 'athlete', 'guardian_challenge_created', 'pending', 'not_asked');

    RETURN jsonb_build_object('challenge_id', challenge_id, 'expires_in_seconds', 172800);
  END IF;

  IF _action = 'delivery_sent' THEN
    challenge_id := NULLIF(_payload ->> 'challenge_id', '')::uuid;
    UPDATE minor_auth.guardian_challenges
    SET delivery_status = 'sent',
        provider_message_id = NULLIF(_payload ->> 'provider_message_id', ''),
        last_sent_at = now(),
        send_count = send_count + 1
    WHERE id = challenge_id AND user_id = _user_id AND status = 'pending';
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows <> 1 THEN RAISE EXCEPTION 'challenge_not_found'; END IF;
    RETURN jsonb_build_object('ok', true);
  END IF;

  IF _action = 'delivery_failed' THEN
    challenge_id := NULLIF(_payload ->> 'challenge_id', '')::uuid;
    UPDATE minor_auth.guardian_challenges
    SET delivery_status = 'failed', status = 'delivery_failed', consumed_at = now()
    WHERE id = challenge_id AND user_id = _user_id AND status = 'pending';
    UPDATE minor_auth.participant_authorizations
    SET guardian_status = 'required'
    WHERE user_id = _user_id AND guardian_status = 'pending';
    RETURN jsonb_build_object('ok', true);
  END IF;

  IF _action = 'prepare_resend' THEN
    IF _user_id IS NULL THEN RAISE EXCEPTION 'user_required'; END IF;
    SELECT * INTO challenge
    FROM minor_auth.guardian_challenges gc
    WHERE gc.user_id = _user_id
      AND gc.status IN ('pending', 'expired', 'delivery_failed')
    ORDER BY gc.created_at DESC
    LIMIT 1;
    IF challenge.id IS NULL THEN RAISE EXCEPTION 'challenge_not_found'; END IF;
    RETURN jsonb_build_object(
      'guardian_email_ciphertext', challenge.guardian_email_ciphertext,
      'guardian_email_iv', challenge.guardian_email_iv,
      'guardian_email_hash', challenge.guardian_email_hash,
      'guardian_email_mask', challenge.guardian_email_mask
    );
  END IF;

  IF _action = 'challenge_lookup' THEN
    SELECT * INTO challenge
    FROM minor_auth.guardian_challenges gc
    WHERE gc.token_hash = (_payload ->> 'token_hash')
    FOR UPDATE;
    IF challenge.id IS NULL THEN
      RETURN jsonb_build_object('state', 'invalid');
    END IF;
    IF challenge.policy_id <> active_policy.id THEN
      UPDATE minor_auth.guardian_challenges
      SET status = 'revoked', consumed_at = COALESCE(consumed_at, now())
      WHERE id = challenge.id AND status = 'pending';
      RETURN jsonb_build_object('state', 'invalid');
    END IF;
    IF challenge.status = 'pending' AND challenge.expires_at <= now() THEN
      UPDATE minor_auth.guardian_challenges
      SET status = 'expired', consumed_at = now()
      WHERE id = challenge.id;
      UPDATE minor_auth.participant_authorizations
      SET guardian_status = 'expired'
      WHERE user_id = challenge.user_id AND guardian_status = 'pending';
      challenge.status := 'expired';
    END IF;
    RETURN jsonb_build_object(
      'state', challenge.status,
      'expires_at', challenge.expires_at,
      'guardian_email_mask', challenge.guardian_email_mask,
      'policy_key', active_policy.policy_key,
      'product_version', active_policy.product_version,
      'guardian_notice_version', active_policy.guardian_notice_version,
      'guardian_decision_version', active_policy.guardian_decision_version,
      'data_contribution_version', active_policy.data_contribution_version
    );
  END IF;

  IF _action = 'guardian_decide' THEN
    product_choice := (_payload ->> 'product_authorized')::boolean;
    contribution_choice := COALESCE((_payload ->> 'data_contribution_authorized')::boolean, false);
    guardian_declaration := COALESCE((_payload ->> 'guardian_declaration')::boolean, false);
    IF NOT guardian_declaration THEN RAISE EXCEPTION 'guardian_declaration_required'; END IF;

    SELECT * INTO challenge
    FROM minor_auth.guardian_challenges gc
    WHERE gc.token_hash = (_payload ->> 'token_hash')
    FOR UPDATE;
    IF challenge.id IS NULL OR challenge.status <> 'pending' OR challenge.expires_at <= now() THEN
      RAISE EXCEPTION 'guardian_token_invalid';
    END IF;
    IF challenge.policy_id <> active_policy.id THEN
      RAISE EXCEPTION 'guardian_policy_replaced';
    END IF;
    IF product_choice = false THEN contribution_choice := false; END IF;

    UPDATE minor_auth.guardian_challenges
    SET status = CASE WHEN product_choice THEN 'approved' ELSE 'declined' END,
        consumed_at = now()
    WHERE id = challenge.id;

    UPDATE minor_auth.participant_authorizations
    SET policy_id = challenge.policy_id,
        guardian_status = CASE WHEN product_choice THEN 'authorized' ELSE 'declined' END,
        athlete_status = CASE WHEN product_choice THEN 'required' ELSE 'declined' END,
        product_status = CASE WHEN product_choice THEN 'pending' ELSE 'declined' END,
        data_contribution_guardian = contribution_choice,
        data_contribution_athlete = CASE WHEN product_choice THEN NULL ELSE false END,
        data_contribution_status = CASE WHEN product_choice THEN 'not_asked' ELSE 'declined' END,
        guardian_authorized_at = CASE WHEN product_choice THEN now() ELSE NULL END,
        athlete_assented_at = NULL,
        product_authorized_at = NULL,
        revoked_at = NULL
    WHERE user_id = challenge.user_id;

    IF product_choice THEN
      IF COALESCE(_payload ->> 'management_token_hash', '') !~ '^[0-9a-f]{64}$' THEN
        RAISE EXCEPTION 'invalid_management_token';
      END IF;
      UPDATE minor_auth.guardian_access_tokens
      SET revoked_at = now()
      WHERE user_id = challenge.user_id AND consumed_at IS NULL AND revoked_at IS NULL;
      INSERT INTO minor_auth.guardian_access_tokens(
        user_id, policy_id, token_hash, expires_at
      ) VALUES (
        challenge.user_id,
        challenge.policy_id,
        _payload ->> 'management_token_hash',
        now() + interval '370 days'
      );
    ELSE
      UPDATE public.profiles
      SET data_contribution_consent = false,
          data_contribution_consent_version = active_policy.data_contribution_version,
          data_contribution_consented_at = NULL,
          data_contribution_updated_at = now()
      WHERE id = challenge.user_id;
      UPDATE public.evidence_participation_eligibility
      SET status = 'revoked', revoked_at = now(), revoked_by = NULL
      WHERE program_instance_id IN (
        SELECT pi.id FROM public.program_instances pi WHERE pi.user_id = challenge.user_id
      );
    END IF;

    INSERT INTO minor_auth.authorization_audit(
      user_id, policy_id, actor_type, event_type,
      resulting_product_status, resulting_data_contribution_status
    ) VALUES (
      challenge.user_id,
      challenge.policy_id,
      'guardian',
      CASE WHEN product_choice THEN 'guardian_authorized' ELSE 'guardian_declined' END,
      CASE WHEN product_choice THEN 'pending' ELSE 'declined' END,
      CASE WHEN product_choice THEN 'not_asked' ELSE 'declined' END
    );

    RETURN jsonb_build_object(
      'state', CASE WHEN product_choice THEN 'approved' ELSE 'declined' END,
      'user_id', challenge.user_id,
      'guardian_email_ciphertext', challenge.guardian_email_ciphertext,
      'guardian_email_iv', challenge.guardian_email_iv,
      'guardian_email_mask', challenge.guardian_email_mask
    );
  END IF;

  IF _action = 'management_lookup' THEN
    SELECT * INTO access_token
    FROM minor_auth.guardian_access_tokens gat
    WHERE gat.token_hash = (_payload ->> 'token_hash')
    FOR UPDATE;
    IF access_token.id IS NULL OR access_token.revoked_at IS NOT NULL OR access_token.consumed_at IS NOT NULL THEN
      RETURN jsonb_build_object('state', 'invalid');
    END IF;
    IF access_token.expires_at <= now() THEN
      UPDATE minor_auth.guardian_access_tokens SET revoked_at = now() WHERE id = access_token.id;
      RETURN jsonb_build_object('state', 'expired');
    END IF;
    SELECT * INTO participant
    FROM minor_auth.participant_authorizations pa
    WHERE pa.user_id = access_token.user_id;
    RETURN jsonb_build_object(
      'state', 'active',
      'data_contribution_guardian', participant.data_contribution_guardian,
      'policy_key', active_policy.policy_key
    );
  END IF;

  IF _action = 'guardian_withdraw_data_contribution' THEN
    SELECT * INTO access_token
    FROM minor_auth.guardian_access_tokens gat
    WHERE gat.token_hash = (_payload ->> 'token_hash')
    FOR UPDATE;
    IF access_token.id IS NULL
       OR access_token.revoked_at IS NOT NULL
       OR access_token.consumed_at IS NOT NULL
       OR access_token.expires_at <= now() THEN
      RAISE EXCEPTION 'guardian_management_token_invalid';
    END IF;

    SELECT * INTO participant
    FROM minor_auth.participant_authorizations pa
    WHERE pa.user_id = access_token.user_id
    FOR UPDATE;
    IF participant.user_id IS NULL OR participant.age_band <> 'under_16' THEN
      RAISE EXCEPTION 'guardian_authorization_not_found';
    END IF;

    UPDATE minor_auth.participant_authorizations
    SET data_contribution_guardian = false,
        data_contribution_status = 'declined'
    WHERE user_id = access_token.user_id;
    UPDATE public.profiles
    SET data_contribution_consent = false,
        data_contribution_consent_version = active_policy.data_contribution_version,
        data_contribution_consented_at = NULL,
        data_contribution_updated_at = now()
    WHERE id = access_token.user_id;
    UPDATE public.evidence_participation_eligibility
    SET status = 'revoked', revoked_at = now(), revoked_by = NULL
    WHERE program_instance_id IN (
      SELECT pi.id FROM public.program_instances pi WHERE pi.user_id = access_token.user_id
    );
    INSERT INTO minor_auth.authorization_audit(
      user_id, policy_id, actor_type, event_type,
      resulting_product_status, resulting_data_contribution_status
    ) VALUES (
      access_token.user_id,
      participant.policy_id,
      'guardian',
      'guardian_data_contribution_withdrawn',
      participant.product_status,
      'declined'
    );
    RETURN public.minor_service_action('management_lookup', NULL, _payload);
  END IF;

  IF _action = 'guardian_revoke' THEN
    SELECT * INTO access_token
    FROM minor_auth.guardian_access_tokens gat
    WHERE gat.token_hash = (_payload ->> 'token_hash')
    FOR UPDATE;
    IF access_token.id IS NULL
       OR access_token.revoked_at IS NOT NULL
       OR access_token.consumed_at IS NOT NULL
       OR access_token.expires_at <= now() THEN
      RAISE EXCEPTION 'guardian_management_token_invalid';
    END IF;
    UPDATE minor_auth.guardian_access_tokens SET consumed_at = now() WHERE id = access_token.id;
    UPDATE minor_auth.participant_authorizations
    SET guardian_status = 'revoked', athlete_status = 'revoked', product_status = 'revoked',
        data_contribution_status = 'revoked', data_contribution_guardian = false,
        data_contribution_athlete = false, revoked_at = now()
    WHERE user_id = access_token.user_id;
    UPDATE public.profiles
    SET data_contribution_consent = false,
        data_contribution_consent_version = active_policy.data_contribution_version,
        data_contribution_consented_at = NULL,
        data_contribution_updated_at = now()
    WHERE id = access_token.user_id;
    UPDATE public.evidence_participation_eligibility
    SET status = 'revoked', revoked_at = now(), revoked_by = NULL
    WHERE program_instance_id IN (
      SELECT pi.id FROM public.program_instances pi WHERE pi.user_id = access_token.user_id
    );
    INSERT INTO minor_auth.authorization_audit(
      user_id, policy_id, actor_type, event_type,
      resulting_product_status, resulting_data_contribution_status
    ) VALUES (access_token.user_id, access_token.policy_id, 'guardian', 'guardian_revoked', 'revoked', 'revoked');
    RETURN jsonb_build_object('state', 'revoked');
  END IF;

  IF _action IN ('assent', 'set_data_contribution') THEN
    IF _user_id IS NULL THEN RAISE EXCEPTION 'user_required'; END IF;
    SELECT * INTO participant
    FROM minor_auth.participant_authorizations pa
    WHERE pa.user_id = _user_id
    FOR UPDATE;
    IF participant.user_id IS NULL THEN RAISE EXCEPTION 'age_band_required'; END IF;

    IF _action = 'assent' THEN
      IF participant.age_band = 'adult' THEN RAISE EXCEPTION 'athlete_assent_not_required'; END IF;
      product_choice := COALESCE((_payload ->> 'product_authorized')::boolean, false);
    ELSE
      IF participant.product_status <> 'authorized' THEN RAISE EXCEPTION 'product_authorization_required'; END IF;
      product_choice := true;
    END IF;
    contribution_choice := COALESCE((_payload ->> 'data_contribution_authorized')::boolean, false);

    IF participant.age_band = 'under_16' AND participant.guardian_status <> 'authorized' THEN
      RAISE EXCEPTION 'guardian_authorization_required';
    END IF;
    IF participant.age_band = 'under_16'
       AND contribution_choice
       AND participant.data_contribution_guardian IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'guardian_data_contribution_authorization_required';
    END IF;

    IF NOT product_choice THEN contribution_choice := false; END IF;

    UPDATE minor_auth.participant_authorizations
    SET policy_id = active_policy.id,
        athlete_status = CASE
          WHEN _action = 'assent' THEN CASE WHEN product_choice THEN 'authorized' ELSE 'declined' END
          ELSE athlete_status
        END,
        product_status = CASE
          WHEN _action = 'assent' THEN CASE WHEN product_choice THEN 'authorized' ELSE 'declined' END
          ELSE product_status
        END,
        data_contribution_athlete = contribution_choice,
        data_contribution_status = CASE WHEN contribution_choice THEN 'authorized' ELSE 'declined' END,
        athlete_assented_at = CASE
          WHEN _action = 'assent' THEN CASE WHEN product_choice THEN now() ELSE NULL END
          ELSE athlete_assented_at
        END,
        product_authorized_at = CASE
          WHEN _action = 'assent' THEN CASE WHEN product_choice THEN now() ELSE NULL END
          ELSE product_authorized_at
        END,
        revoked_at = NULL
    WHERE user_id = _user_id;

    UPDATE public.profiles
    SET data_contribution_consent = contribution_choice,
        data_contribution_consent_version = active_policy.data_contribution_version,
        data_contribution_consented_at = CASE WHEN contribution_choice THEN now() ELSE NULL END,
        data_contribution_updated_at = now()
    WHERE id = _user_id;

    -- Product contribution never grants transfer-evidence eligibility. Adult
    -- eligibility still requires the existing separate admin verification;
    -- minors remain disabled. A withdrawal does revoke any prior eligibility.
    IF NOT contribution_choice THEN
      UPDATE public.evidence_participation_eligibility
      SET status = 'revoked', revoked_at = now(), revoked_by = _user_id
      WHERE program_instance_id IN (
        SELECT pi.id FROM public.program_instances pi WHERE pi.user_id = _user_id
      );
    END IF;

    INSERT INTO minor_auth.authorization_audit(
      user_id, policy_id, actor_type, event_type,
      resulting_product_status, resulting_data_contribution_status
    ) VALUES (
      _user_id,
      active_policy.id,
      'athlete',
      CASE WHEN _action = 'assent' THEN 'athlete_decision_recorded' ELSE 'data_contribution_changed' END,
      CASE WHEN product_choice THEN 'authorized' ELSE 'declined' END,
      CASE WHEN contribution_choice THEN 'authorized' ELSE 'declined' END
    );
    RETURN public.minor_service_action('status', _user_id, '{}'::jsonb);
  END IF;

  IF _action = 'revoke' THEN
    IF _user_id IS NULL THEN RAISE EXCEPTION 'user_required'; END IF;
    SELECT * INTO participant
    FROM minor_auth.participant_authorizations pa
    WHERE pa.user_id = _user_id
    FOR UPDATE;
    IF participant.user_id IS NULL THEN RAISE EXCEPTION 'authorization_not_found'; END IF;
    UPDATE minor_auth.participant_authorizations
    SET guardian_status = CASE WHEN age_band = 'under_16' THEN 'revoked' ELSE 'not_required' END,
        athlete_status = 'revoked', product_status = 'revoked',
        data_contribution_guardian = CASE WHEN age_band = 'under_16' THEN false ELSE NULL END,
        data_contribution_athlete = false, data_contribution_status = 'revoked', revoked_at = now()
    WHERE user_id = _user_id;
    UPDATE minor_auth.guardian_challenges
    SET status = 'revoked', consumed_at = COALESCE(consumed_at, now())
    WHERE user_id = _user_id AND status = 'pending';
    UPDATE minor_auth.guardian_access_tokens
    SET revoked_at = now()
    WHERE user_id = _user_id AND consumed_at IS NULL AND revoked_at IS NULL;
    UPDATE public.profiles
    SET data_contribution_consent = false,
        data_contribution_consent_version = active_policy.data_contribution_version,
        data_contribution_consented_at = NULL,
        data_contribution_updated_at = now()
    WHERE id = _user_id;
    UPDATE public.evidence_participation_eligibility
    SET status = 'revoked', revoked_at = now(), revoked_by = _user_id
    WHERE program_instance_id IN (
      SELECT pi.id FROM public.program_instances pi WHERE pi.user_id = _user_id
    );
    INSERT INTO minor_auth.authorization_audit(
      user_id, policy_id, actor_type, event_type,
      resulting_product_status, resulting_data_contribution_status
    ) VALUES (_user_id, participant.policy_id, 'athlete', 'athlete_revoked', 'revoked', 'revoked');
    RETURN public.minor_service_action('status', _user_id, '{}'::jsonb);
  END IF;

  IF _action = 'restart' THEN
    IF _user_id IS NULL THEN RAISE EXCEPTION 'user_required'; END IF;
    SELECT * INTO participant
    FROM minor_auth.participant_authorizations pa
    WHERE pa.user_id = _user_id
    FOR UPDATE;
    IF participant.user_id IS NULL THEN RAISE EXCEPTION 'authorization_not_found'; END IF;
    UPDATE minor_auth.participant_authorizations
    SET policy_id = active_policy.id,
        guardian_status = CASE WHEN age_band = 'under_16' THEN 'required' ELSE 'not_required' END,
        athlete_status = CASE WHEN age_band = 'adult' THEN 'not_required' ELSE 'required' END,
        product_status = CASE WHEN age_band = 'adult' THEN 'authorized' ELSE 'pending' END,
        data_contribution_guardian = NULL,
        data_contribution_athlete = NULL,
        data_contribution_status = 'not_asked',
        guardian_authorized_at = NULL,
        athlete_assented_at = NULL,
        product_authorized_at = CASE WHEN age_band = 'adult' THEN now() ELSE NULL END,
        revoked_at = NULL
    WHERE user_id = _user_id;
    INSERT INTO minor_auth.authorization_audit(
      user_id, policy_id, actor_type, event_type,
      resulting_product_status, resulting_data_contribution_status
    ) VALUES (
      _user_id, active_policy.id, 'athlete', 'authorization_restarted',
      CASE WHEN participant.age_band = 'adult' THEN 'authorized' ELSE 'pending' END,
      'not_asked'
    );
    RETURN public.minor_service_action('status', _user_id, '{}'::jsonb);
  END IF;

  IF _action = 'enforcement_preflight' THEN
    SELECT COUNT(*)::integer INTO affected_rows
    FROM public.user_roles ur
    LEFT JOIN minor_auth.participant_authorizations pa ON pa.user_id = ur.user_id
    WHERE ur.role = 'athlete'::public.app_role
      AND (pa.user_id IS NULL OR pa.product_status <> 'authorized' OR pa.policy_id <> active_policy.id);

    SELECT COUNT(*)::integer INTO data_not_ready
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'athlete'::public.app_role
    LEFT JOIN minor_auth.participant_authorizations pa ON pa.user_id = p.id
    WHERE p.data_contribution_consent = true
      AND p.data_contribution_consent_version = active_policy.data_contribution_version
      AND (
        pa.user_id IS NULL
        OR pa.policy_id <> active_policy.id
        OR pa.product_status <> 'authorized'
        OR pa.data_contribution_status <> 'authorized'
        OR pa.revoked_at IS NOT NULL
      );

    RETURN jsonb_build_object(
      'ready', affected_rows = 0 AND data_not_ready = 0,
      'athletes_not_ready', affected_rows,
      'data_contributions_not_ready', data_not_ready,
      'enforcement_enabled', minor_auth.enforcement_enabled(),
      'policy_key', active_policy.policy_key
    );
  END IF;

  IF _action = 'set_enforcement' THEN
    product_choice := COALESCE((_payload ->> 'enabled')::boolean, false);
    IF product_choice THEN
      status_payload := public.minor_service_action('enforcement_preflight', NULL, '{}'::jsonb);
      IF COALESCE((status_payload ->> 'ready')::boolean, false) = false THEN
        RAISE EXCEPTION 'minor_enforcement_preflight_failed';
      END IF;
    END IF;
    UPDATE minor_auth.system_settings
    SET enforcement_enabled = product_choice, updated_at = now()
    WHERE singleton;
    RETURN jsonb_build_object('enforcement_enabled', product_choice);
  END IF;

  RAISE EXCEPTION 'unsupported_minor_action';
END;
$$;

REVOKE ALL ON FUNCTION public.minor_service_action(text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.minor_service_action(text, uuid, jsonb) TO service_role;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA minor_auth FROM PUBLIC, anon, authenticated;

SELECT cron.schedule(
  'minor-auth-retention-daily',
  '17 3 * * *',
  'SELECT minor_auth.cleanup_retention();'
);

COMMENT ON FUNCTION public.minor_service_action(text, uuid, jsonb) IS
  'Service-role-only state machine for age-band, guardian authorization, athlete assent, withdrawal and rollout enforcement.';

COMMIT;
