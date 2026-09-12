BEGIN;

CREATE TABLE public.evidence_api_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE,
  client_id text NOT NULL CHECK (client_id ~ '^[a-z0-9][a-z0-9_-]{2,63}$'),
  evidence_data_lock_id uuid REFERENCES public.evidence_data_locks(id) ON DELETE RESTRICT,
  outcome text NOT NULL CHECK (
    outcome IN ('served', 'not_found', 'checksum_mismatch', 'invalid_request', 'rate_limited')
  ),
  response_checksum text,
  requested_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_evidence_api_access_log_client_time
  ON public.evidence_api_access_log(client_id, requested_at DESC);

ALTER TABLE public.evidence_api_access_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.evidence_api_access_log
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.guard_evidence_api_access_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  RAISE EXCEPTION 'evidence_api_access_log_append_only';
END;
$$;

CREATE TRIGGER guard_evidence_api_access_log_mutation
BEFORE UPDATE OR DELETE ON public.evidence_api_access_log
FOR EACH ROW EXECUTE FUNCTION public.guard_evidence_api_access_log_mutation();

REVOKE ALL ON FUNCTION public.guard_evidence_api_access_log_mutation()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.read_evidence_data_lock_for_export(
  _request_id uuid,
  _client_id text,
  _lock_id uuid DEFAULT NULL,
  _scope_type text DEFAULT NULL,
  _program_run_id uuid DEFAULT NULL,
  _sport_category text DEFAULT NULL,
  _sport_level text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  target public.evidence_data_locks;
  calculated_checksum text;
  recent_requests integer := 0;
BEGIN
  IF _request_id IS NULL
     OR _client_id IS NULL
     OR _client_id !~ '^[a-z0-9][a-z0-9_-]{2,63}$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_request');
  END IF;

  -- Serialize requests per machine client so concurrent calls cannot bypass
  -- the rolling limit. Reused request IDs are rejected instead of being
  -- served without a matching audit row.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(_client_id, 0));

  IF EXISTS (
    SELECT 1
    FROM public.evidence_api_access_log eal
    WHERE eal.request_id = _request_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_request');
  END IF;

  SELECT COUNT(*)::integer
  INTO recent_requests
  FROM public.evidence_api_access_log eal
  WHERE eal.client_id = _client_id
    AND eal.requested_at >= now() - interval '1 minute';

  IF recent_requests >= 30 THEN
    INSERT INTO public.evidence_api_access_log(request_id, client_id, outcome)
    VALUES (_request_id, _client_id, 'rate_limited')
    ON CONFLICT (request_id) DO NOTHING;
    RETURN jsonb_build_object('ok', false, 'error', 'rate_limited');
  END IF;

  IF (_lock_id IS NULL AND _scope_type IS NULL)
     OR (_lock_id IS NOT NULL AND (
       _scope_type IS NOT NULL
       OR _program_run_id IS NOT NULL
       OR _sport_category IS NOT NULL
       OR _sport_level IS NOT NULL
     ))
     OR (_scope_type IS NOT NULL AND _scope_type NOT IN ('program_run', 'solo_aggregate'))
     OR (_scope_type = 'program_run' AND _program_run_id IS NULL)
     OR (_scope_type = 'program_run' AND (_sport_category IS NOT NULL OR _sport_level IS NOT NULL))
     OR (_scope_type = 'solo_aggregate' AND _program_run_id IS NOT NULL) THEN
    INSERT INTO public.evidence_api_access_log(request_id, client_id, outcome)
    VALUES (_request_id, _client_id, 'invalid_request')
    ON CONFLICT (request_id) DO NOTHING;
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_request');
  END IF;

  IF _lock_id IS NOT NULL THEN
    SELECT * INTO target
    FROM public.evidence_data_locks edl
    WHERE edl.id = _lock_id
      AND edl.status = 'active';
  ELSE
    SELECT * INTO target
    FROM public.evidence_data_locks edl
    WHERE edl.status = 'active'
      AND edl.scope_type = _scope_type
      AND (_program_run_id IS NULL OR edl.program_run_id = _program_run_id)
      AND (_sport_category IS NULL OR edl.sport_category = _sport_category)
      AND (_sport_level IS NULL OR edl.sport_level = _sport_level)
    ORDER BY edl.locked_at DESC
    LIMIT 1;
  END IF;

  IF target.id IS NULL THEN
    INSERT INTO public.evidence_api_access_log(request_id, client_id, outcome)
    VALUES (_request_id, _client_id, 'not_found')
    ON CONFLICT (request_id) DO NOTHING;
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  calculated_checksum := encode(
    extensions.digest(convert_to(target.evidence_payload::text, 'UTF8'), 'sha256'),
    'hex'
  );

  IF calculated_checksum IS DISTINCT FROM target.content_checksum
     OR target.checksum_algorithm <> 'sha256'
     OR target.analysis_manifest ->> 'content_checksum' IS DISTINCT FROM target.content_checksum THEN
    INSERT INTO public.evidence_api_access_log(
      request_id, client_id, evidence_data_lock_id, outcome, response_checksum
    ) VALUES (
      _request_id, _client_id, target.id, 'checksum_mismatch', calculated_checksum
    ) ON CONFLICT (request_id) DO NOTHING;
    RETURN jsonb_build_object('ok', false, 'error', 'checksum_mismatch');
  END IF;

  INSERT INTO public.evidence_api_access_log(
    request_id, client_id, evidence_data_lock_id, outcome, response_checksum
  ) VALUES (
    _request_id, _client_id, target.id, 'served', target.content_checksum
  ) ON CONFLICT (request_id) DO NOTHING;

  RETURN jsonb_build_object(
    'ok', true,
    'lock_id', target.id,
    'scope_type', target.scope_type,
    'program_run_id', target.program_run_id,
    'sport_category', target.sport_category,
    'sport_level', target.sport_level,
    'protocol_version', target.protocol_version,
    'snapshot_schema_version', target.snapshot_schema_version,
    'source_cutoff', target.source_cutoff,
    'locked_at', target.locked_at,
    'checksum_algorithm', target.checksum_algorithm,
    'content_checksum', target.content_checksum,
    'analysis_manifest', target.analysis_manifest,
    'evidence', target.evidence_payload
  );
END;
$$;

REVOKE ALL ON FUNCTION public.read_evidence_data_lock_for_export(
  uuid, text, uuid, text, uuid, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.read_evidence_data_lock_for_export(
  uuid, text, uuid, text, uuid, text, text
) TO service_role;

COMMENT ON TABLE public.evidence_api_access_log IS
  'Append-only machine-read audit. Stores request metadata and checksums, never athlete identifiers or evidence payloads.';
COMMENT ON FUNCTION public.read_evidence_data_lock_for_export(uuid, text, uuid, text, uuid, text, text) IS
  'Service-role-only read contract for active, checksum-verified aggregate Data Locks. It never reads live athlete tables.';

COMMIT;
