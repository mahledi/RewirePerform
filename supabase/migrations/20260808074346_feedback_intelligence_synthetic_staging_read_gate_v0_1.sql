-- Open only the database half of the one-read synthetic Staging gate.
--
-- This migration is intentionally insufficient on its own: the Edge runtime
-- still requires its separate Staging URL pin, machine credential and exact
-- SYNTHETIC_STAGING_APPROVED runtime gate. Production remains fail-closed.

BEGIN;

DO $$
BEGIN
  UPDATE feedback_core.machine_contract_settings
  SET consumer_pin_ready = true,
      synthetic_export_enabled = true,
      machine_credential_ready = true,
      production_export_enabled = false,
      privacy_notice_ready = false,
      app_store_declaration_ready = false,
      minor_policy_ready = false,
      updated_at = pg_catalog.clock_timestamp()
  WHERE contract_version = '0.2.0-draft'
    AND schema_version = 'rewire-feedback-intelligence-export-v0.2-draft'
    AND contract_status = 'PRODUCER_CONFIRMED_DRAFT_NOT_ACTIVATED'
    AND schema_sha256 = 'fb1ef751bc4701a497f224bb421220e08b3387eba5c2eaec9e91e2cbf474b4e9'
    AND production_export_enabled = false
    AND privacy_notice_ready = false
    AND app_store_declaration_ready = false
    AND minor_policy_ready = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'feedback_machine_synthetic_gate_contract_drift'
      USING ERRCODE = '55000';
  END IF;
END;
$$;

COMMIT;
