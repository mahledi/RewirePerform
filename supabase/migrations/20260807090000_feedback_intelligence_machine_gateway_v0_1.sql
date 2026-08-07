-- Feedback Intelligence synthetic Staging machine gateway v0.1 draft.
--
-- This migration prepares, but does not activate, the dedicated database role
-- and the persistent replay/rate-limit guard. The role has no password, all
-- machine/collection/production gates remain false, and Production scope is
-- rejected unconditionally by the public wrapper.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'mahleos_feedback_reader') THEN
    CREATE ROLE mahleos_feedback_reader
      LOGIN
      PASSWORD NULL
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOINHERIT
      NOREPLICATION
      NOBYPASSRLS;
  END IF;
END;
$$;

ALTER ROLE mahleos_feedback_reader SET statement_timeout = '12s';
ALTER ROLE mahleos_feedback_reader SET lock_timeout = '2s';
ALTER ROLE mahleos_feedback_reader SET idle_in_transaction_session_timeout = '5s';

DO $$
BEGIN
  EXECUTE format(
    'GRANT CONNECT ON DATABASE %I TO mahleos_feedback_reader',
    pg_catalog.current_database()
  );
END;
$$;

GRANT USAGE ON SCHEMA public TO mahleos_feedback_reader;
REVOKE ALL ON SCHEMA feedback_core, feedback_consent, feedback_raw, feedback_analysis
  FROM mahleos_feedback_reader;
REVOKE ALL ON ALL TABLES IN SCHEMA public, feedback_core, feedback_consent, feedback_raw, feedback_analysis
  FROM mahleos_feedback_reader;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public, feedback_core, feedback_consent, feedback_raw, feedback_analysis
  FROM mahleos_feedback_reader;

CREATE TABLE feedback_analysis.machine_gateway_nonces (
  request_id uuid PRIMARY KEY,
  nonce_sha256 text NOT NULL UNIQUE CHECK (nonce_sha256 ~ '^[a-f0-9]{64}$'),
  client_id text NOT NULL CHECK (client_id ~ '^[a-z0-9][a-z0-9_.:-]{2,95}$'),
  issued_at timestamptz NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX feedback_machine_gateway_client_accepted_idx
  ON feedback_analysis.machine_gateway_nonces(client_id, accepted_at DESC);

CREATE TABLE feedback_analysis.machine_gateway_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  client_id text NOT NULL CHECK (client_id ~ '^[a-z0-9][a-z0-9_.:-]{2,95}$'),
  outcome text NOT NULL CHECK (outcome IN (
    'success',
    'invalid_request',
    'stale_request',
    'replay_blocked',
    'rate_limited',
    'contract_drift',
    'machine_gate_closed',
    'production_scope_blocked',
    'upstream_unavailable'
  )),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (request_id, outcome)
);

CREATE INDEX feedback_machine_gateway_access_client_recorded_idx
  ON feedback_analysis.machine_gateway_access_log(client_id, recorded_at DESC);

ALTER TABLE feedback_analysis.machine_gateway_nonces ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_analysis.machine_gateway_access_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE feedback_analysis.machine_gateway_nonces,
  feedback_analysis.machine_gateway_access_log
  FROM PUBLIC, anon, authenticated, service_role, mahleos_feedback_reader;

CREATE TRIGGER feedback_machine_gateway_nonces_append_only
BEFORE UPDATE OR DELETE ON feedback_analysis.machine_gateway_nonces
FOR EACH ROW EXECUTE FUNCTION feedback_analysis.reject_access_log_mutation();

CREATE TRIGGER feedback_machine_gateway_access_log_append_only
BEFORE UPDATE OR DELETE ON feedback_analysis.machine_gateway_access_log
FOR EACH ROW EXECUTE FUNCTION feedback_analysis.reject_access_log_mutation();

-- The original export implementation remains byte-shape-compatible and is
-- moved behind the guarded public wrapper. It remains unreachable to runtime
-- roles, including the new reader role.
ALTER FUNCTION public.read_feedback_intelligence_v0_2_draft(text, text, text, text)
  SET SCHEMA feedback_analysis;
ALTER FUNCTION feedback_analysis.read_feedback_intelligence_v0_2_draft(text, text, text, text)
  RENAME TO export_feedback_intelligence_v0_2_internal;

REVOKE ALL ON FUNCTION feedback_analysis.export_feedback_intelligence_v0_2_internal(text, text, text, text)
  FROM PUBLIC, anon, authenticated, service_role, mahleos_feedback_reader;

-- The original bound of 100 predated the 55-question package. The export is
-- already capped at 5,000 items, so the minimized audit count must accept the
-- same bounded range or a valid full package would fail after construction.
ALTER TABLE feedback_analysis.machine_access_log
  DROP CONSTRAINT IF EXISTS machine_access_log_returned_count_check;
ALTER TABLE feedback_analysis.machine_access_log
  ADD CONSTRAINT machine_access_log_returned_count_check
  CHECK (returned_count BETWEEN 0 AND 5000);

CREATE OR REPLACE FUNCTION public.read_feedback_intelligence_v0_2_draft(
  _client_id text,
  _contract_version text,
  _schema_sha256 text,
  _data_scope text DEFAULT 'synthetic'
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
  request_id_text text := pg_catalog.current_setting(
    'request.mahleos_feedback_request_id', true
  );
  nonce text := pg_catalog.current_setting('request.mahleos_feedback_nonce', true);
  issued_at_text text := pg_catalog.current_setting(
    'request.mahleos_feedback_issued_at', true
  );
  gateway_request_id uuid;
  gateway_issued_at timestamptz;
  gateway_nonce_sha256 text;
  recent_requests integer := 0;
  payload jsonb;
  upstream_error text;
  gateway_error text;
  gateway_outcome text;
BEGIN
  IF caller_role IS DISTINCT FROM 'mahleos_feedback_reader' THEN
    RETURN jsonb_build_object('_gateway_error', 'access_denied');
  END IF;

  IF _client_id <> 'mahles-jarvis-feedback-intelligence'
     OR _contract_version <> '0.2.0-draft'
     OR _schema_sha256 <> 'fb1ef751bc4701a497f224bb421220e08b3387eba5c2eaec9e91e2cbf474b4e9'
     OR _data_scope <> 'synthetic' THEN
    RETURN jsonb_build_object(
      '_gateway_error',
      CASE WHEN _data_scope = 'production'
        THEN 'production_scope_blocked'
        ELSE 'contract_drift'
      END
    );
  END IF;

  IF request_id_text IS NULL
     OR request_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
     OR nonce IS NULL
     OR nonce !~ '^[a-f0-9]{64}$'
     OR issued_at_text IS NULL THEN
    RETURN jsonb_build_object('_gateway_error', 'invalid_replay_headers');
  END IF;

  gateway_request_id := request_id_text::uuid;
  BEGIN
    gateway_issued_at := issued_at_text::timestamptz;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('_gateway_error', 'invalid_replay_headers');
  END;

  gateway_nonce_sha256 := encode(
    extensions.digest(convert_to(nonce, 'UTF8'), 'sha256'),
    'hex'
  );

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('feedback-gateway:' || _client_id, 0)
  );

  SELECT COUNT(*)::integer
  INTO recent_requests
  FROM feedback_analysis.machine_gateway_access_log recent
  WHERE recent.client_id = _client_id
    AND recent.outcome <> 'rate_limited'
    AND recent.recorded_at >= pg_catalog.clock_timestamp() - interval '1 minute';

  IF recent_requests >= 12 THEN
    INSERT INTO feedback_analysis.machine_gateway_access_log(
      request_id, client_id, outcome
    )
    SELECT gateway_request_id, _client_id, 'rate_limited'
    WHERE NOT EXISTS (
      SELECT 1
      FROM feedback_analysis.machine_gateway_access_log limited
      WHERE limited.client_id = _client_id
        AND limited.outcome = 'rate_limited'
        AND limited.recorded_at >= pg_catalog.clock_timestamp() - interval '1 minute'
    )
    ON CONFLICT (request_id, outcome) DO NOTHING;
    RETURN jsonb_build_object('_gateway_error', 'rate_limited');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM feedback_analysis.machine_gateway_nonces existing
    WHERE existing.request_id = gateway_request_id
       OR existing.nonce_sha256 = gateway_nonce_sha256
  ) THEN
    INSERT INTO feedback_analysis.machine_gateway_access_log(
      request_id, client_id, outcome
    ) VALUES (gateway_request_id, _client_id, 'replay_blocked')
    ON CONFLICT (request_id, outcome) DO NOTHING;
    RETURN jsonb_build_object('_gateway_error', 'replay_detected');
  END IF;

  INSERT INTO feedback_analysis.machine_gateway_nonces(
    request_id, nonce_sha256, client_id, issued_at
  ) VALUES (gateway_request_id, gateway_nonce_sha256, _client_id, gateway_issued_at);

  IF gateway_issued_at < pg_catalog.clock_timestamp() - interval '5 minutes'
     OR gateway_issued_at > pg_catalog.clock_timestamp() + interval '1 minute' THEN
    INSERT INTO feedback_analysis.machine_gateway_access_log(
      request_id, client_id, outcome
    ) VALUES (gateway_request_id, _client_id, 'stale_request');
    RETURN jsonb_build_object('_gateway_error', 'stale_request');
  END IF;

  BEGIN
    payload := feedback_analysis.export_feedback_intelligence_v0_2_internal(
      _client_id,
      _contract_version,
      _schema_sha256,
      _data_scope
    );
  EXCEPTION WHEN OTHERS THEN
    upstream_error := SQLERRM;
    gateway_error := CASE upstream_error
      WHEN 'feedback_machine_contract_drift' THEN 'contract_drift'
      WHEN 'feedback_machine_contract_not_ready' THEN 'machine_gate_closed'
      WHEN 'feedback_machine_synthetic_export_disabled' THEN 'machine_gate_closed'
      WHEN 'feedback_machine_production_export_disabled' THEN 'production_scope_blocked'
      ELSE 'upstream_unavailable'
    END;
    gateway_outcome := CASE gateway_error
      WHEN 'contract_drift' THEN 'contract_drift'
      WHEN 'machine_gate_closed' THEN 'machine_gate_closed'
      WHEN 'production_scope_blocked' THEN 'production_scope_blocked'
      ELSE 'upstream_unavailable'
    END;
    INSERT INTO feedback_analysis.machine_gateway_access_log(
      request_id, client_id, outcome
    ) VALUES (gateway_request_id, _client_id, gateway_outcome);
    RETURN jsonb_build_object('_gateway_error', gateway_error);
  END;

  INSERT INTO feedback_analysis.machine_gateway_access_log(
    request_id, client_id, outcome
  ) VALUES (gateway_request_id, _client_id, 'success');
  RETURN payload;
END;
$$;

REVOKE ALL ON FUNCTION public.read_feedback_intelligence_v0_2_draft(text, text, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.read_feedback_intelligence_v0_2_draft(text, text, text, text)
  TO mahleos_feedback_reader;

COMMENT ON ROLE mahleos_feedback_reader IS
  'Inactive Feedback Intelligence synthetic-Staging reader. No password is provisioned by repository migrations.';
COMMENT ON FUNCTION public.read_feedback_intelligence_v0_2_draft(text, text, text, text) IS
  'Synthetic-DE-only v0.2 gateway wrapper. Requires dedicated reader role plus request-id, nonce and issued-at session guards; Production is blocked.';
COMMENT ON TABLE feedback_analysis.machine_gateway_nonces IS
  'Hashed replay reservations only. Contains no machine key, response, athlete identifier or feedback text.';
COMMENT ON TABLE feedback_analysis.machine_gateway_access_log IS
  'Append-only minimized gateway outcomes. Contains no response body, athlete identifier or feedback text.';

COMMIT;
