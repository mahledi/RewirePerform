-- Installs the emergency V1.1 Feedback Intelligence re-close contract.
-- Applying this migration changes no runtime state. The owner-only function
-- closes collection first, pauses campaigns and DE policy, then retires the
-- active Guardian policy. Existing structured records are preserved; no raw
-- or application values are returned.

BEGIN;

CREATE OR REPLACE FUNCTION feedback_core.reclose_feedback_v1_1(
  _legal_review_reference text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  closed_at timestamptz := pg_catalog.clock_timestamp();
BEGIN
  IF _legal_review_reference IS NULL
     OR _legal_review_reference !~ '^legal-review-de-feedback-v1\.1:[A-Za-z0-9][A-Za-z0-9._/-]{15,159}$'
     OR lower(_legal_review_reference) ~ '(draft|pending|unreviewed|synthetic|test|fixture)' THEN
    RAISE EXCEPTION 'feedback_v1_1_qualified_legal_review_reference_required'
      USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM feedback_core.jurisdiction_policies policy
    WHERE policy.jurisdiction = 'DE'
      AND policy.structured_collection_status = 'approved'
      AND policy.raw_text_collection_status = 'approved'
      AND policy.legal_review_reference = _legal_review_reference
      AND policy.approved_at IS NOT NULL
  ) OR (SELECT count(*) FROM feedback_core.campaigns WHERE status = 'active') <> 4
     OR (SELECT count(*) FROM feedback_core.campaigns
         WHERE campaign_reference IN (
           'feedback-day-10-v1', 'feedback-day-24-v1',
           'feedback-day-39-v1', 'feedback-day-55-v1'
         ) AND status = 'active') <> 4
     OR (SELECT count(*) FROM feedback_consent.guardian_text_policy_versions WHERE status = 'active') <> 1
     OR NOT EXISTS (
       SELECT 1 FROM feedback_consent.guardian_text_policy_versions
       WHERE policy_reference = 'guardian-feedback-text-de-v1.1.0' AND status = 'active'
     ) THEN
    RAISE EXCEPTION 'feedback_v1_1_reclose_active_contract_drift' USING ERRCODE = '55000';
  END IF;

  UPDATE feedback_core.system_settings
  SET athlete_collection_enabled = false,
      text_collection_enabled = false,
      privacy_notice_ready = false,
      app_store_declaration_ready = false,
      minor_policy_ready = false,
      updated_at = closed_at
  WHERE singleton;

  UPDATE feedback_core.campaigns
  SET status = 'paused', available_until = closed_at, updated_at = closed_at
  WHERE status = 'active'
    AND campaign_reference IN (
      'feedback-day-10-v1', 'feedback-day-24-v1',
      'feedback-day-39-v1', 'feedback-day-55-v1'
    );

  UPDATE feedback_core.jurisdiction_policies
  SET structured_collection_status = 'paused',
      raw_text_collection_status = 'paused',
      updated_at = closed_at
  WHERE jurisdiction = 'DE'
    AND legal_review_reference = _legal_review_reference;

  UPDATE feedback_consent.guardian_text_policy_versions
  SET status = 'retired', retired_at = closed_at, updated_at = closed_at
  WHERE status = 'active'
    AND policy_reference = 'guardian-feedback-text-de-v1.1.0';

  IF feedback_core.rollout_ready()
     OR feedback_core.jurisdiction_policy_ready('DE', false)
     OR EXISTS (SELECT 1 FROM feedback_core.campaigns WHERE status = 'active')
     OR EXISTS (SELECT 1 FROM feedback_consent.guardian_text_policy_versions WHERE status = 'active') THEN
    RAISE EXCEPTION 'feedback_v1_1_reclose_postcondition_failed' USING ERRCODE = '55000';
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'status', 'RECLOSED_V1_1_DE',
    'runtime_gates_closed', true,
    'campaigns_active', 0,
    'guardian_policy_active', false
  );
END;
$$;

REVOKE ALL ON FUNCTION feedback_core.reclose_feedback_v1_1(text)
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION feedback_core.reclose_feedback_v1_1(text) IS
  'Owner-only atomic V1.1 DE emergency re-close. It disables runtime gates before pausing collection contracts and never returns application values.';

COMMIT;
