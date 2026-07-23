-- Harden the still-inactive MahleOS feedback channel and the privacy-safe
-- operational event intake. This migration does not activate any scheduler,
-- secret, Edge Function, or external connector.

CREATE OR REPLACE FUNCTION public.redact_mahleos_feedback_text(_value text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
DECLARE
  sanitized text := btrim(COALESCE(_value, ''));
BEGIN
  sanitized := regexp_replace(
    sanitized,
    '[[:alnum:]._%+\-]+@[[:alnum:].\-]+\.[[:alpha:]]{2,}',
    '[E-MAIL ENTFERNT]',
    'gi'
  );
  sanitized := regexp_replace(
    sanitized,
    '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}',
    '[KENNUNG ENTFERNT]',
    'gi'
  );
  sanitized := regexp_replace(
    sanitized,
    'Bearer[[:space:]]+[A-Za-z0-9._~+/=-]{20,}',
    '[TOKEN ENTFERNT]',
    'gi'
  );
  sanitized := regexp_replace(
    sanitized,
    'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}',
    '[TOKEN ENTFERNT]',
    'g'
  );
  sanitized := regexp_replace(
    sanitized,
    '[A-Fa-f0-9]{40,}',
    '[SCHLUESSEL ENTFERNT]',
    'g'
  );
  sanitized := regexp_replace(
    sanitized,
    '\+?[0-9][0-9 ()/.\-]{6,}[0-9]',
    '[TELEFONNUMMER ENTFERNT]',
    'g'
  );

  RETURN left(sanitized, 2000);
END;
$$;

REVOKE ALL ON FUNCTION public.redact_mahleos_feedback_text(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redact_mahleos_feedback_text(text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.canonicalize_feedback_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := auth.uid();
  submitted_context jsonb;
  submitted_message text;
  safe_runtime text;
  safe_platform text;
  safe_online jsonb;
  safe_app_version text;
BEGIN
  -- Service-owned maintenance remains possible. Browser and native clients
  -- always have auth.uid() and are canonicalized below.
  IF actor_id IS NULL THEN
    RETURN NEW;
  END IF;

  submitted_message := btrim(COALESCE(NEW.message, ''));
  IF char_length(submitted_message) NOT BETWEEN 5 AND 2000 THEN
    RAISE EXCEPTION 'feedback_message_invalid'
      USING ERRCODE = '22023';
  END IF;

  submitted_context := CASE
    WHEN jsonb_typeof(NEW.technical_context) = 'object'
      THEN NEW.technical_context
    ELSE '{}'::jsonb
  END;
  safe_runtime := CASE submitted_context->>'runtime'
    WHEN 'native' THEN 'native'
    WHEN 'standalone' THEN 'standalone'
    WHEN 'browser' THEN 'browser'
    ELSE 'unknown'
  END;
  safe_platform := CASE submitted_context->>'platform'
    WHEN 'ios' THEN 'ios'
    WHEN 'android' THEN 'android'
    WHEN 'web' THEN 'web'
    ELSE 'unknown'
  END;
  safe_online := CASE
    WHEN jsonb_typeof(submitted_context->'online') = 'boolean'
      THEN submitted_context->'online'
    ELSE 'null'::jsonb
  END;
  safe_app_version := CASE
    WHEN COALESCE(submitted_context->>'app_version', '') ~ '^[A-Za-z0-9_.:/-]{1,96}$'
      THEN submitted_context->>'app_version'
    ELSE 'unknown'
  END;

  NEW.id := gen_random_uuid();
  NEW.user_id := actor_id;
  NEW.type := CASE NEW.type
    WHEN 'bug' THEN 'bug'
    WHEN 'suggestion' THEN 'suggestion'
    ELSE 'general'
  END;
  NEW.message := submitted_message;
  NEW.status := 'open';
  NEW.admin_note := NULL;
  NEW.reviewed_at := NULL;
  NEW.created_at := clock_timestamp();
  NEW.technical_context := jsonb_build_object(
    'schema_version', 'feedback-technical-context-v1',
    'runtime', safe_runtime,
    'platform', safe_platform,
    'route', '/settings',
    'online', safe_online,
    'app_version', safe_app_version
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS canonicalize_feedback_insert
  ON public.feedback;
CREATE TRIGGER canonicalize_feedback_insert
BEFORE INSERT ON public.feedback
FOR EACH ROW
EXECUTE FUNCTION public.canonicalize_feedback_insert();

ALTER TABLE public.feedback
  DROP CONSTRAINT IF EXISTS feedback_message_bounds_v1;
ALTER TABLE public.feedback
  ADD CONSTRAINT feedback_message_bounds_v1
  CHECK (char_length(btrim(message)) BETWEEN 5 AND 2000)
  NOT VALID;

REVOKE ALL ON FUNCTION public.canonicalize_feedback_insert()
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.canonicalize_app_event_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := auth.uid();
  derived_role text;
  derived_is_test boolean := false;
  safe_metadata jsonb := '{}'::jsonb;
BEGIN
  IF actor_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.event_name NOT IN (
    'auth_login',
    'auth_signup',
    'team_join_attempt',
    'team_join_success',
    'onboarding_completed',
    'assessment_saved',
    'deep_profile_saved',
    'daily_checkin_saved',
    'feedback_submitted',
    'journal_saved',
    'pre_training_opened',
    'push_clicked',
    'coach_dashboard_loaded',
    'coach_evidence_load_failed',
    'coach_evidence_save_failed',
    'coach_mental_state_load_failed',
    'evidence_status_load_failed',
    'app_runtime_error',
    'admin_export_downloaded'
  ) THEN
    RAISE EXCEPTION 'app_event_name_invalid'
      USING ERRCODE = '22023';
  END IF;

  SELECT ur.role::text
  INTO derived_role
  FROM public.user_roles ur
  WHERE ur.user_id = actor_id
  ORDER BY CASE ur.role::text
    WHEN 'admin' THEN 1
    WHEN 'coach' THEN 2
    WHEN 'athlete' THEN 3
    ELSE 4
  END
  LIMIT 1;

  SELECT COALESCE(p.is_test_user, false)
  INTO derived_is_test
  FROM public.profiles p
  WHERE p.id = actor_id;

  SELECT COALESCE(jsonb_object_agg(entry.key, entry.value), '{}'::jsonb)
  INTO safe_metadata
  FROM jsonb_each(
    CASE
      WHEN jsonb_typeof(NEW.metadata) = 'object' THEN NEW.metadata
      ELSE '{}'::jsonb
    END
  ) AS entry
  WHERE entry.key IN (
    'action',
    'answer_count',
    'assessment_type',
    'day_number',
    'event_type',
    'has_notification_id',
    'has_program_instance',
    'instrument_id',
    'item_count',
    'questionnaire_version',
    'scope',
    'source',
    'stage',
    'timing'
  )
    AND (
      jsonb_typeof(entry.value) IN ('number', 'boolean', 'null')
      OR (
        jsonb_typeof(entry.value) = 'string'
        AND entry.value #>> '{}' ~ '^[A-Za-z0-9_.:/-]{1,96}$'
      )
    );

  NEW.id := gen_random_uuid();
  NEW.created_at := clock_timestamp();
  NEW.user_id := actor_id;
  NEW.role := CASE
    WHEN derived_role IN ('athlete', 'coach', 'admin') THEN derived_role
    ELSE NULL
  END;
  NEW.team_id := CASE
    WHEN NEW.team_id IS NOT NULL
      AND (
        EXISTS (
          SELECT 1
          FROM public.team_members tm
          WHERE tm.team_id = NEW.team_id
            AND tm.user_id = actor_id
        )
        OR EXISTS (
          SELECT 1
          FROM public.teams t
          WHERE t.id = NEW.team_id
            AND t.created_by = actor_id
        )
      )
      THEN NEW.team_id
    ELSE NULL
  END;
  NEW.route := CASE NEW.route
    WHEN '/auth' THEN '/auth'
    WHEN '/dashboard' THEN '/dashboard'
    WHEN '/questionnaire' THEN '/questionnaire'
    WHEN '/assessment' THEN '/assessment'
    WHEN '/deep-profile' THEN '/deep-profile'
    WHEN '/journal' THEN '/journal'
    WHEN '/pre-training' THEN '/pre-training'
    WHEN '/settings' THEN '/settings'
    WHEN '/coach' THEN '/coach'
    ELSE NULL
  END;
  NEW.error_code := CASE
    WHEN NEW.error_code ~ '^[A-Za-z0-9_.:/-]{1,96}$' THEN NEW.error_code
    ELSE NULL
  END;
  NEW.is_test := derived_is_test;
  NEW.metadata := safe_metadata;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS canonicalize_app_event_insert
  ON public.app_event_log;
CREATE TRIGGER canonicalize_app_event_insert
BEFORE INSERT ON public.app_event_log
FOR EACH ROW
EXECUTE FUNCTION public.canonicalize_app_event_insert();

REVOKE ALL ON FUNCTION public.canonicalize_app_event_insert()
  FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS mahleos_feedback_access_client_time_idx
  ON public.mahleos_feedback_access_log (client_id, requested_at DESC);

CREATE OR REPLACE FUNCTION public.mahleos_feedback_access_log_append_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE'
    AND current_setting('app.mahleos_feedback_retention', true) = 'enabled'
    AND OLD.requested_at < now() - interval '90 days'
  THEN
    RETURN OLD;
  END IF;

  RAISE EXCEPTION 'mahleos_feedback_access_log is append-only'
    USING ERRCODE = '42501';
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_mahleos_feedback_access_log()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  removed_rows integer;
BEGIN
  PERFORM set_config('app.mahleos_feedback_retention', 'enabled', true);
  DELETE FROM public.mahleos_feedback_access_log access_log
  WHERE access_log.requested_at < now() - interval '90 days';
  GET DIAGNOSTICS removed_rows = ROW_COUNT;
  RETURN removed_rows;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_mahleos_feedback_access_log()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_mahleos_feedback_access_log()
  TO service_role;

CREATE OR REPLACE FUNCTION public.read_mahleos_feedback_page(
  _request_id uuid,
  _client_id text,
  _cursor_created_at timestamptz DEFAULT NULL,
  _cursor_id uuid DEFAULT NULL,
  _limit integer DEFAULT 25
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  recent_requests integer;
  response_payload jsonb;
  returned_count integer;
BEGIN
  IF _request_id IS NULL
    OR _client_id <> 'mahleos-feedback-v1'
    OR _limit NOT BETWEEN 1 AND 25
    OR ((_cursor_created_at IS NULL) <> (_cursor_id IS NULL))
  THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_request');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('mahleos-feedback-read:' || _client_id));

  SELECT COUNT(*)::integer
  INTO recent_requests
  FROM public.mahleos_feedback_access_log access_log
  WHERE access_log.client_id = _client_id
    AND access_log.requested_at >= now() - interval '1 minute';

  IF recent_requests >= 30 THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.mahleos_feedback_access_log access_log
      WHERE access_log.client_id = _client_id
        AND access_log.outcome = 'rate_limited'
        AND access_log.requested_at >= now() - interval '1 minute'
    ) THEN
      INSERT INTO public.mahleos_feedback_access_log (
        request_id,
        client_id,
        outcome,
        returned_count
      )
      VALUES (_request_id, _client_id, 'rate_limited', 0);
    END IF;

    RETURN jsonb_build_object('ok', false, 'error', 'rate_limited');
  END IF;

  WITH candidates AS MATERIALIZED (
    SELECT
      f.id,
      f.created_at,
      jsonb_build_object(
        'feedback_reference',
          encode(extensions.digest(convert_to(f.id::text, 'UTF8'), 'sha256'), 'hex'),
        'category',
          CASE
            WHEN f.type IN ('bug', 'suggestion', 'general') THEN f.type
            ELSE 'other'
          END,
        'status',
          CASE
            WHEN f.status IN ('open', 'reviewed', 'resolved') THEN f.status
            ELSE 'unknown'
          END,
        'created_at', f.created_at,
        'message', public.redact_mahleos_feedback_text(f.message),
        'technical_context', jsonb_build_object(
          'schema_version', 'feedback-technical-context-v1',
          'runtime', CASE
            WHEN f.technical_context->>'runtime' IN ('native', 'standalone', 'browser')
              THEN f.technical_context->>'runtime'
            ELSE 'unknown'
          END,
          'platform', CASE
            WHEN f.technical_context->>'platform' IN ('ios', 'android', 'web')
              THEN f.technical_context->>'platform'
            ELSE 'unknown'
          END,
          'route', CASE
            WHEN f.technical_context->>'route' = '/settings' THEN '/settings'
            ELSE NULL
          END,
          'online', CASE
            WHEN jsonb_typeof(f.technical_context->'online') = 'boolean'
              THEN f.technical_context->'online'
            ELSE 'null'::jsonb
          END,
          'app_version', CASE
            WHEN COALESCE(f.technical_context->>'app_version', '') ~ '^[A-Za-z0-9_.:/-]{1,96}$'
              THEN f.technical_context->>'app_version'
            ELSE 'unknown'
          END
        )
      ) AS item
    FROM public.feedback f
    INNER JOIN public.profiles p
      ON p.id = f.user_id
     AND NOT COALESCE(p.is_test_user, false)
    WHERE char_length(btrim(f.message)) BETWEEN 1 AND 2000
      AND (
        _cursor_created_at IS NULL
        OR f.created_at < _cursor_created_at
        OR (f.created_at = _cursor_created_at AND f.id < _cursor_id)
      )
    ORDER BY f.created_at DESC, f.id DESC
    LIMIT _limit + 1
  ),
  page_rows AS MATERIALIZED (
    SELECT *
    FROM candidates
    ORDER BY created_at DESC, id DESC
    LIMIT _limit
  ),
  page_summary AS (
    SELECT
      COALESCE(jsonb_agg(item ORDER BY created_at DESC, id DESC), '[]'::jsonb) AS items,
      COUNT(*)::integer AS item_count
    FROM page_rows
  ),
  cursor_row AS (
    SELECT created_at, id
    FROM page_rows
    ORDER BY created_at ASC, id ASC
    LIMIT 1
  )
  SELECT jsonb_build_object(
    'ok', true,
    'schema_version', 'mahleos-feedback-read-v1.1',
    'request_id', _request_id,
    'generated_at', now(),
    'items', page_summary.items,
    'has_more', (SELECT COUNT(*) FROM candidates) > _limit,
    'next_cursor_created_at',
      CASE
        WHEN (SELECT COUNT(*) FROM candidates) > _limit THEN cursor_row.created_at
        ELSE NULL
      END,
    'next_cursor_id',
      CASE
        WHEN (SELECT COUNT(*) FROM candidates) > _limit THEN cursor_row.id
        ELSE NULL
      END,
    'privacy', jsonb_build_object(
      'structured_user_identifiers_exported', false,
      'recognized_direct_identifiers_redacted', true,
      'free_text_may_contain_personal_data', true,
      'admin_notes_exported', false,
      'attachments_exported', false,
      'model_safe_without_redaction', false
    )
  ),
  page_summary.item_count
  INTO response_payload, returned_count
  FROM page_summary
  LEFT JOIN cursor_row ON true;

  INSERT INTO public.mahleos_feedback_access_log (
    request_id,
    client_id,
    outcome,
    returned_count,
    response_checksum
  )
  VALUES (
    _request_id,
    _client_id,
    'success',
    returned_count,
    encode(
      extensions.digest(convert_to(response_payload::text, 'UTF8'), 'sha256'),
      'hex'
    )
  );

  RETURN response_payload;
END;
$$;

REVOKE ALL ON FUNCTION public.read_mahleos_feedback_page(
  uuid,
  text,
  timestamptz,
  uuid,
  integer
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.read_mahleos_feedback_page(
  uuid,
  text,
  timestamptz,
  uuid,
  integer
) TO service_role;

COMMENT ON FUNCTION public.cleanup_mahleos_feedback_access_log() IS
  'Manual, service-role-only 90-day retention gate. This migration does not schedule it.';
COMMENT ON FUNCTION public.redact_mahleos_feedback_text(text) IS
  'Best-effort direct identifier redaction. Free text can still contain personal data.';
