-- Feedback Intelligence DE-Production gateway v0.1 draft.
--
-- This migration prepares, but cannot activate, a reader and RPC that are
-- wholly separate from synthetic Staging. The role is passwordless, the
-- existing machine-contract gates remain false, no secret is created, and no
-- application row is read or changed by this migration.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_roles
    WHERE rolname = 'mahleos_feedback_production_reader'
  ) THEN
    CREATE ROLE mahleos_feedback_production_reader
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

ALTER ROLE mahleos_feedback_production_reader PASSWORD NULL;
ALTER ROLE mahleos_feedback_production_reader
  WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
ALTER ROLE mahleos_feedback_production_reader SET statement_timeout = '12s';
ALTER ROLE mahleos_feedback_production_reader SET lock_timeout = '2s';
ALTER ROLE mahleos_feedback_production_reader SET idle_in_transaction_session_timeout = '5s';

DO $$
DECLARE
  membership record;
BEGIN
  FOR membership IN
    SELECT granted.rolname AS granted_role, member.rolname AS member_role
    FROM pg_catalog.pg_auth_members edge
    JOIN pg_catalog.pg_roles granted ON granted.oid = edge.roleid
    JOIN pg_catalog.pg_roles member ON member.oid = edge.member
    WHERE granted.rolname = 'mahleos_feedback_production_reader'
       OR member.rolname = 'mahleos_feedback_production_reader'
  LOOP
    EXECUTE pg_catalog.format(
      'REVOKE %I FROM %I', membership.granted_role, membership.member_role
    );
  END LOOP;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc procedure
    JOIN pg_catalog.pg_namespace namespace ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.prosecdef
      AND EXISTS (
        SELECT 1
        FROM pg_catalog.aclexplode(
          COALESCE(
            procedure.proacl,
            pg_catalog.acldefault('f', procedure.proowner)
          )
        ) privilege
        WHERE privilege.grantee = 0
          AND privilege.privilege_type = 'EXECUTE'
      )
  ) THEN
    RAISE EXCEPTION 'feedback_production_reader_unsafe_public_security_definer_path';
  END IF;
END;
$$;

CREATE SCHEMA IF NOT EXISTS feedback_machine_production;
REVOKE ALL ON SCHEMA feedback_machine_production FROM PUBLIC, anon, authenticated, service_role,
  mahleos_feedback_reader;

DO $$
BEGIN
  EXECUTE format(
    'GRANT CONNECT ON DATABASE %I TO mahleos_feedback_production_reader',
    pg_catalog.current_database()
  );
END;
$$;

REVOKE ALL ON SCHEMA public, feedback_core, feedback_consent, feedback_raw, feedback_analysis
  FROM mahleos_feedback_production_reader;
GRANT USAGE ON SCHEMA feedback_machine_production TO mahleos_feedback_production_reader;
REVOKE ALL ON ALL TABLES IN SCHEMA public, feedback_core, feedback_consent, feedback_raw, feedback_analysis
  FROM mahleos_feedback_production_reader;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public, feedback_core, feedback_consent, feedback_raw, feedback_analysis
  FROM mahleos_feedback_production_reader;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public, feedback_core, feedback_consent, feedback_raw, feedback_analysis
  FROM mahleos_feedback_production_reader;

CREATE OR REPLACE FUNCTION feedback_machine_production.read_feedback_intelligence_production_v0_2_draft(
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
  IF caller_role IS DISTINCT FROM 'mahleos_feedback_production_reader' THEN
    RETURN jsonb_build_object('_gateway_error', 'access_denied');
  END IF;

  IF _client_id <> 'mahles-jarvis-feedback-intelligence-production'
     OR _contract_version <> '0.2.1-draft'
     OR _schema_sha256 <> 'e90eb3fc2ce717ef91ae35bcfcd5bc7944d3cc941faa8f071b42e934e967023d'
     OR _data_scope <> 'production' THEN
    RETURN jsonb_build_object('_gateway_error', 'contract_drift');
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
    AND recent.recorded_at >= pg_catalog.clock_timestamp() - interval '1 hour';

  IF recent_requests >= 4 THEN
    INSERT INTO feedback_analysis.machine_gateway_access_log(
      request_id, client_id, outcome
    )
    SELECT gateway_request_id, _client_id, 'rate_limited'
    WHERE NOT EXISTS (
      SELECT 1
      FROM feedback_analysis.machine_gateway_access_log limited
      WHERE limited.client_id = _client_id
        AND limited.outcome = 'rate_limited'
        AND limited.recorded_at >= pg_catalog.clock_timestamp() - interval '1 hour'
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
      'production'
    );
  EXCEPTION WHEN OTHERS THEN
    upstream_error := SQLERRM;
    gateway_error := CASE upstream_error
      WHEN 'feedback_machine_contract_drift' THEN 'contract_drift'
      WHEN 'feedback_machine_contract_not_ready' THEN 'machine_gate_closed'
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

REVOKE ALL ON FUNCTION feedback_machine_production.read_feedback_intelligence_production_v0_2_draft(text, text, text, text)
  FROM PUBLIC, anon, authenticated, service_role, mahleos_feedback_reader;
GRANT EXECUTE ON FUNCTION feedback_machine_production.read_feedback_intelligence_production_v0_2_draft(text, text, text, text)
  TO mahleos_feedback_production_reader;

REVOKE ALL ON FUNCTION public.read_feedback_intelligence_v0_2_draft(text, text, text, text)
  FROM mahleos_feedback_production_reader;
REVOKE ALL ON FUNCTION feedback_analysis.export_feedback_intelligence_v0_2_internal(text, text, text, text)
  FROM mahleos_feedback_production_reader;

COMMENT ON ROLE mahleos_feedback_production_reader IS
  'Inactive DE-Production Feedback Intelligence reader. Repository migration provisions no password and opens no runtime or database gate.';
COMMENT ON SCHEMA feedback_machine_production IS
  'Non-exposed schema for the dedicated DE-Production Feedback Intelligence machine RPC.';
COMMENT ON FUNCTION feedback_machine_production.read_feedback_intelligence_production_v0_2_draft(text, text, text, text) IS
  'DE-Production-only v0.2.1 gateway wrapper. Requires the dedicated Production reader and all upstream contract, consent, privacy, App-Store and minor gates. Prepared but not activated.';

COMMIT;
