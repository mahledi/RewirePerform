-- Close the database half of the one-read synthetic Staging gate.
--
-- The temporary consumer and credential readiness flags are reset as well.
-- A later test must provision a fresh credential and receive a fresh explicit
-- gate. Production gates are reaffirmed as false.

BEGIN;

DO $$
BEGIN
  UPDATE feedback_core.machine_contract_settings
  SET consumer_pin_ready = false,
      synthetic_export_enabled = false,
      machine_credential_ready = false,
      production_export_enabled = false,
      privacy_notice_ready = false,
      app_store_declaration_ready = false,
      minor_policy_ready = false,
      updated_at = pg_catalog.clock_timestamp()
  WHERE contract_version = '0.2.0-draft'
    AND schema_version = 'rewire-feedback-intelligence-export-v0.2-draft'
    AND contract_status = 'PRODUCER_CONFIRMED_DRAFT_NOT_ACTIVATED'
    AND schema_sha256 = 'fb1ef751bc4701a497f224bb421220e08b3387eba5c2eaec9e91e2cbf474b4e9';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'feedback_machine_synthetic_gate_close_contract_drift'
      USING ERRCODE = '55000';
  END IF;
END;
$$;

COMMIT;
