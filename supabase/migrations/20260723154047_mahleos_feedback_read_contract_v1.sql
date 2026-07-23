ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS technical_context jsonb NOT NULL DEFAULT jsonb_build_object(
    'schema_version', 'feedback-technical-context-v1',
    'runtime', 'unknown',
    'platform', 'unknown',
    'route', NULL,
    'online', NULL,
    'app_version', 'unknown'
  );

ALTER TABLE public.feedback
  DROP CONSTRAINT IF EXISTS feedback_technical_context_contract_v1;

ALTER TABLE public.feedback
  ADD CONSTRAINT feedback_technical_context_contract_v1
  CHECK (
    jsonb_typeof(technical_context) = 'object'
    AND technical_context ?& ARRAY[
      'schema_version',
      'runtime',
      'platform',
      'route',
      'online',
      'app_version'
    ]
    AND technical_context - ARRAY[
      'schema_version',
      'runtime',
      'platform',
      'route',
      'online',
      'app_version'
    ] = '{}'::jsonb
    AND technical_context->>'schema_version' = 'feedback-technical-context-v1'
    AND technical_context->>'runtime' IN ('native', 'standalone', 'browser', 'unknown')
    AND technical_context->>'platform' IN ('ios', 'android', 'web', 'unknown')
    AND (
      jsonb_typeof(technical_context->'route') = 'null'
      OR (
        jsonb_typeof(technical_context->'route') = 'string'
        AND technical_context->>'route' ~ '^/[^?#]{0,159}$'
      )
    )
    AND (
      jsonb_typeof(technical_context->'online') = 'null'
      OR jsonb_typeof(technical_context->'online') = 'boolean'
    )
    AND jsonb_typeof(technical_context->'app_version') = 'string'
    AND technical_context->>'app_version' ~ '^[A-Za-z0-9_.:/-]{1,96}$'
  );

CREATE INDEX IF NOT EXISTS feedback_created_at_id_desc_idx
  ON public.feedback (created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS public.mahleos_feedback_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE,
  client_id text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  outcome text NOT NULL CHECK (outcome IN ('success', 'rate_limited')),
  returned_count integer NOT NULL DEFAULT 0 CHECK (returned_count BETWEEN 0 AND 25),
  response_checksum text
    CHECK (response_checksum IS NULL OR response_checksum ~ '^[a-f0-9]{64}$')
);

ALTER TABLE public.mahleos_feedback_access_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.mahleos_feedback_access_log FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.mahleos_feedback_access_log TO service_role;

CREATE OR REPLACE FUNCTION public.mahleos_feedback_access_log_append_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'mahleos_feedback_access_log is append-only'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS mahleos_feedback_access_log_append_only
  ON public.mahleos_feedback_access_log;

CREATE TRIGGER mahleos_feedback_access_log_append_only
BEFORE UPDATE OR DELETE ON public.mahleos_feedback_access_log
FOR EACH ROW
EXECUTE FUNCTION public.mahleos_feedback_access_log_append_only();

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
SET search_path = public, extensions
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
    INSERT INTO public.mahleos_feedback_access_log (
      request_id,
      client_id,
      outcome,
      returned_count
    )
    VALUES (_request_id, _client_id, 'rate_limited', 0);

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
        'message', left(f.message, 2000),
        'technical_context', f.technical_context
      ) AS item
    FROM public.feedback f
    INNER JOIN public.profiles p
      ON p.id = f.user_id
     AND NOT COALESCE(p.is_test_user, false)
    WHERE _cursor_created_at IS NULL
      OR f.created_at < _cursor_created_at
      OR (f.created_at = _cursor_created_at AND f.id < _cursor_id)
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
    'schema_version', 'mahleos-feedback-read-v1',
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
      'user_identifiers_exported', false,
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

REVOKE ALL ON FUNCTION public.mahleos_feedback_access_log_append_only()
  FROM PUBLIC, anon, authenticated;
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
