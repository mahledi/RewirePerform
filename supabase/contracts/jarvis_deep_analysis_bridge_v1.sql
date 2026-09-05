-- PREPARED CONTRACT ONLY. This file is intentionally not a migration.
-- Generate a migration with `supabase migration new jarvis_deep_analysis_bridge_v1`
-- and copy this exact reviewed contract only after the separate Production gate.

CREATE SCHEMA IF NOT EXISTS jarvis_private;
REVOKE ALL ON SCHEMA jarvis_private FROM PUBLIC, anon, authenticated;

CREATE TABLE jarvis_private.deep_analysis_jobs (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  created_by uuid NOT NULL,
  request_key text NOT NULL CHECK (request_key ~ '^[a-f0-9]{64}$'),
  question text NOT NULL CHECK (char_length(question) BETWEEN 3 AND 500),
  snapshot_sha256 text NOT NULL CHECK (snapshot_sha256 ~ '^[a-f0-9]{64}$'),
  source_states jsonb NOT NULL CHECK (jsonb_typeof(source_states) = 'object'),
  analysis_mode text NOT NULL DEFAULT 'DESCRIPTIVE_STRUCTURED_ONLY'
    CHECK (analysis_mode = 'DESCRIPTIVE_STRUCTURED_ONLY'),
  claimed_by text CHECK (claimed_by IS NULL OR claimed_by ~ '^mahleos-local-[a-f0-9]{16}$'),
  status text NOT NULL DEFAULT 'ANGEFORDERT'
    CHECK (status IN ('ANGEFORDERT', 'LAEUFT', 'FERTIG', 'BLOCKIERT', 'FEHLGESCHLAGEN')),
  result jsonb,
  failure_code text,
  requested_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CHECK ((status = 'FERTIG') = (result IS NOT NULL)),
  CHECK (failure_code IS NULL OR failure_code ~ '^[A-Z0-9_]{2,80}$'),
  UNIQUE (created_by, request_key)
);

ALTER TABLE jarvis_private.deep_analysis_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE jarvis_private.deep_analysis_jobs FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE jarvis_private.deep_analysis_jobs FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.request_jarvis_deep_analysis(
  _question text,
  _snapshot_sha256 text,
  _source_states jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := auth.uid();
  normalized_question text := pg_catalog.regexp_replace(pg_catalog.btrim(_question), '\s+', ' ', 'g');
  request_key_value text;
  selected jarvis_private.deep_analysis_jobs%ROWTYPE;
  inserted_count integer;
BEGIN
  IF actor_id IS NULL OR NOT app_private.is_admin(actor_id) THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;
  IF char_length(normalized_question) NOT BETWEEN 3 AND 500
     OR normalized_question ~* '[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+'
     OR normalized_question ~* '\m(user|athlete|coach|team|program|subject)[_-]?id\M'
     OR normalized_question ~* '\m[0-9a-f]{8}-[0-9a-f-]{27,36}\M'
     OR _snapshot_sha256 !~ '^[a-f0-9]{64}$'
     OR jsonb_typeof(_source_states) <> 'object'
     OR _source_states::text ~* '[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+'
     OR _source_states::text ~* '"(name|email|user_id|athlete_id|coach_id|team_id|program_id|subject_reference)"\s*:'
     OR (SELECT count(*) FROM pg_catalog.jsonb_each_text(_source_states)) NOT BETWEEN 1 AND 32
     OR EXISTS (
       SELECT 1 FROM pg_catalog.jsonb_each_text(_source_states) source
       WHERE source.value NOT IN ('CURRENT', 'STALE', 'UNKNOWN', 'FAILED', 'OFFLINE', 'NOT_CONNECTED')
          OR char_length(source.key) NOT BETWEEN 1 AND 80
     ) THEN
    RAISE EXCEPTION 'invalid_request' USING ERRCODE = '22023';
  END IF;

  request_key_value := pg_catalog.encode(
    extensions.digest(
      pg_catalog.convert_to(
        pg_catalog.lower(normalized_question) || ':' || _snapshot_sha256 || ':DESCRIPTIVE_STRUCTURED_ONLY',
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  INSERT INTO jarvis_private.deep_analysis_jobs (
    created_by, request_key, question, snapshot_sha256, source_states
  ) VALUES (
    actor_id, request_key_value, normalized_question, _snapshot_sha256, _source_states
  ) ON CONFLICT (created_by, request_key) DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  SELECT * INTO STRICT selected
  FROM jarvis_private.deep_analysis_jobs job
  WHERE job.created_by = actor_id AND job.request_key = request_key_value;

  RETURN pg_catalog.jsonb_build_object(
    'request_id', selected.id,
    'status', selected.status,
    'requested_at', selected.requested_at,
    'updated_at', selected.updated_at,
    'result', selected.result,
    'failure_code', selected.failure_code,
    'reused', inserted_count = 0
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_jarvis_deep_analysis(_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := auth.uid();
  selected jarvis_private.deep_analysis_jobs%ROWTYPE;
  visible_status text;
BEGIN
  IF actor_id IS NULL OR NOT app_private.is_admin(actor_id) THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO STRICT selected
  FROM jarvis_private.deep_analysis_jobs job
  WHERE job.id = _request_id AND job.created_by = actor_id;
  visible_status := CASE
    WHEN selected.status = 'ANGEFORDERT'
      AND selected.requested_at < pg_catalog.now() - interval '90 seconds'
      THEN 'WARTET_AUF_MAC'
    ELSE selected.status
  END;
  RETURN pg_catalog.jsonb_build_object(
    'request_id', selected.id,
    'status', visible_status,
    'requested_at', selected.requested_at,
    'updated_at', selected.updated_at,
    'result', selected.result,
    'failure_code', selected.failure_code,
    'reused', true
  );
EXCEPTION WHEN no_data_found THEN
  RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_jarvis_deep_analysis_job(_worker_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  selected jarvis_private.deep_analysis_jobs%ROWTYPE;
BEGIN
  IF auth.role() <> 'service_role' OR _worker_id !~ '^mahleos-local-[a-f0-9]{16}$' THEN
    RAISE EXCEPTION 'worker_required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO selected
  FROM jarvis_private.deep_analysis_jobs job
  WHERE job.status = 'ANGEFORDERT'
     OR (job.status = 'LAEUFT' AND job.claimed_by = _worker_id)
  ORDER BY (job.status = 'LAEUFT') DESC, job.requested_at, job.id
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  IF selected.id IS NULL THEN
    RETURN pg_catalog.jsonb_build_object('job', null);
  END IF;
  UPDATE jarvis_private.deep_analysis_jobs
  SET status = 'LAEUFT', claimed_by = _worker_id,
      started_at = COALESCE(started_at, pg_catalog.now()), updated_at = pg_catalog.now()
  WHERE id = selected.id;
  RETURN pg_catalog.jsonb_build_object('job', pg_catalog.jsonb_build_object(
    'request_id', selected.id,
    'question', selected.question,
    'snapshot_sha256', selected.snapshot_sha256,
    'source_states', selected.source_states,
    'analysis_mode', selected.analysis_mode
  ));
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_jarvis_deep_analysis_job(
  _request_id uuid,
  _worker_id text,
  _status text,
  _result jsonb,
  _failure_code text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.role() <> 'service_role'
     OR _worker_id !~ '^mahleos-local-[a-f0-9]{16}$'
     OR _status NOT IN ('FERTIG', 'BLOCKIERT', 'FEHLGESCHLAGEN')
     OR (_status = 'FERTIG') <> (_result IS NOT NULL)
     OR (_failure_code IS NOT NULL AND _failure_code !~ '^[A-Z0-9_]{2,80}$')
     OR (_result IS NOT NULL AND (
       jsonb_typeof(_result) <> 'object'
       OR _result::text ~* '[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+'
       OR _result::text ~* '"(name|email|user_id|athlete_id|coach_id|team_id|program_id|subject_reference|journal|reflection|comment|free_text|raw_text|raw_answer|individual_score)"\s*:'
     )) THEN
    RAISE EXCEPTION 'invalid_result' USING ERRCODE = '22023';
  END IF;
  UPDATE jarvis_private.deep_analysis_jobs
  SET status = _status,
      result = _result,
      failure_code = _failure_code,
      completed_at = pg_catalog.now(),
      updated_at = pg_catalog.now()
  WHERE id = _request_id AND status = 'LAEUFT' AND claimed_by = _worker_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'job_not_running' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.request_jarvis_deep_analysis(text, text, jsonb) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_jarvis_deep_analysis(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.claim_jarvis_deep_analysis_job(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.complete_jarvis_deep_analysis_job(uuid, text, text, jsonb, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_jarvis_deep_analysis(text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_jarvis_deep_analysis(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_jarvis_deep_analysis_job(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_jarvis_deep_analysis_job(uuid, text, text, jsonb, text) TO service_role;

COMMENT ON TABLE jarvis_private.deep_analysis_jobs IS
  'Private founder-triggered structured analysis queue. Never exposed directly through the Data API.';
