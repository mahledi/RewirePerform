-- V1.2 Jarvis boundary: Production machine reads may contain structured
-- feedback answers and minimized activity counts, but never feedback text.
--
-- The already reviewed v0.2.1 producer remains the source of the structured
-- contract. This wrapper removes the optional `comment` value inside Postgres
-- before the dedicated reader or Edge Function can observe the payload. The
-- private upstream function is explicitly removed from the reader's grants.
-- Applying this migration does not create a credential or open any runtime
-- gate and performs no application-data read.

BEGIN;

ALTER FUNCTION feedback_machine_production.read_feedback_intelligence_production_v0_2_draft(
  text, text, text, text
) RENAME TO read_feedback_intelligence_production_v0_2_raw_internal;

REVOKE ALL ON FUNCTION feedback_machine_production.read_feedback_intelligence_production_v0_2_raw_internal(
  text, text, text, text
) FROM PUBLIC, anon, authenticated, service_role, mahleos_feedback_reader,
  mahleos_feedback_production_reader;

CREATE FUNCTION feedback_machine_production.read_feedback_intelligence_production_v0_2_draft(
  _client_id text,
  _contract_version text,
  _schema_sha256 text,
  _data_scope text DEFAULT 'production'
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_role text := COALESCE(
    NULLIF(pg_catalog.current_setting('role', true), 'none'),
    session_user
  );
  payload jsonb;
  structured_items jsonb;
BEGIN
  IF caller_role IS DISTINCT FROM 'mahleos_feedback_production_reader' THEN
    RETURN pg_catalog.jsonb_build_object('_gateway_error', 'access_denied');
  END IF;

  payload := feedback_machine_production.read_feedback_intelligence_production_v0_2_raw_internal(
    _client_id,
    _contract_version,
    _schema_sha256,
    _data_scope
  );

  IF payload ? '_gateway_error' THEN
    RETURN payload;
  END IF;
  IF payload ->> 'schema_version' IS DISTINCT FROM 'rewire-feedback-intelligence-export-v0.2.1-draft'
     OR pg_catalog.jsonb_typeof(payload -> 'items') IS DISTINCT FROM 'array' THEN
    RETURN pg_catalog.jsonb_build_object('_gateway_error', 'contract_drift');
  END IF;

  SELECT COALESCE(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_set(item.value, '{comment}', 'null'::jsonb, false)
      ORDER BY item.ordinality
    ),
    '[]'::jsonb
  )
  INTO structured_items
  FROM pg_catalog.jsonb_array_elements(payload -> 'items') WITH ORDINALITY AS item(value, ordinality);

  payload := pg_catalog.jsonb_set(payload, '{items}', structured_items, false);

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_array_elements(payload -> 'items') item
    WHERE item -> 'comment' IS DISTINCT FROM 'null'::jsonb
  ) THEN
    RETURN pg_catalog.jsonb_build_object('_gateway_error', 'raw_text_boundary_failed');
  END IF;

  RETURN payload;
END;
$$;

REVOKE ALL ON FUNCTION feedback_machine_production.read_feedback_intelligence_production_v0_2_draft(
  text, text, text, text
) FROM PUBLIC, anon, authenticated, service_role, mahleos_feedback_reader;
GRANT EXECUTE ON FUNCTION feedback_machine_production.read_feedback_intelligence_production_v0_2_draft(
  text, text, text, text
) TO mahleos_feedback_production_reader;

COMMENT ON FUNCTION feedback_machine_production.read_feedback_intelligence_production_v0_2_draft(
  text, text, text, text
) IS
  'V1.2 DE-Production Jarvis gateway. Preserves the pinned structured v0.2.1 contract while forcing every optional comment to JSON null before the dedicated reader can observe the payload.';

COMMENT ON FUNCTION feedback_machine_production.read_feedback_intelligence_production_v0_2_raw_internal(
  text, text, text, text
) IS
  'Owner-only internal upstream for the V1.2 structured-only Jarvis gateway. No machine reader receives EXECUTE.';

COMMIT;
