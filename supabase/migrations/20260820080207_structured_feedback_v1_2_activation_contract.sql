-- Installs, but does not execute, the owner-only V1.2 Feedback Intelligence
-- activation and emergency re-close contracts. Structured checkpoints and the
-- separately consented text path open only after the explicit owner call.

BEGIN;

-- Register the current admin-only V1.2 consent contract while preserving every
-- historical V1.1 receipt and policy row. Runtime collection remains closed.
DO $$
BEGIN
  IF (
    SELECT pg_catalog.count(*) FROM feedback_core.campaigns campaign
    WHERE campaign.campaign_reference IN (
      'feedback-day-10-v1', 'feedback-day-24-v1',
      'feedback-day-39-v1', 'feedback-day-55-v1'
    )
      AND campaign.status = 'draft'
      AND campaign.text_consent_scope = 'product-improvement-individual-text-ai-analysis-v1'
      AND campaign.text_consent_version = 'feedback-text-consent-v1.1.0'
      AND campaign.text_notice_hash = 'c308e8ad3d89b02c308a07090a4c09cb363f9cdb7d1e5d671ac295c545d95a16'
  ) <> 4 THEN
    RAISE EXCEPTION 'feedback_v1_2_registration_baseline_drift' USING ERRCODE = '55000';
  END IF;

  UPDATE feedback_core.campaigns
  SET text_consent_scope = 'product-improvement-internal-admin-review-v1',
      text_consent_version = 'feedback-text-consent-v1.2.0',
      text_notice_hash = 'b5f1ef6bb515ad4eebfc4282d31149fd7a69f3e667ec62fb1788ee6419a145fe',
      updated_at = pg_catalog.clock_timestamp()
  WHERE campaign_reference IN (
    'feedback-day-10-v1', 'feedback-day-24-v1',
    'feedback-day-39-v1', 'feedback-day-55-v1'
  );

  INSERT INTO feedback_consent.guardian_text_policy_versions (
    jurisdiction, policy_reference, scope, consent_version,
    guardian_notice_hash, athlete_notice_hash, raw_text_retention_days,
    processor_mode, processor_reference, status
  ) VALUES (
    'DE', 'guardian-feedback-text-de-v1.2.0',
    'product-improvement-internal-admin-review-v1', 'feedback-text-consent-v1.2.0',
    'f24a97f28ddda04507812b7db46e629885e1796c8810ea85901d9c2b06fa9846',
    'b5f1ef6bb515ad4eebfc4282d31149fd7a69f3e667ec62fb1788ee6419a145fe',
    365, 'no_external_processor', NULL, 'draft'
  );
END;
$$;

CREATE OR REPLACE FUNCTION feedback_core.activate_feedback_v1_2(
  _controller_assessment_reference text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  activated_at timestamptz := pg_catalog.clock_timestamp();
BEGIN
  IF _controller_assessment_reference IS NULL
     OR _controller_assessment_reference !~ '^controller-assessment-de-feedback-v1\.2:[A-Za-z0-9][A-Za-z0-9._/-]{15,159}$'
     OR pg_catalog.lower(_controller_assessment_reference) ~ '(draft|pending|unreviewed|synthetic|test|fixture)' THEN
    RAISE EXCEPTION 'feedback_v1_2_final_controller_assessment_required'
      USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM feedback_core.system_settings settings
    WHERE settings.singleton
      AND NOT settings.athlete_collection_enabled
      AND NOT settings.text_collection_enabled
      AND NOT settings.privacy_notice_ready
      AND NOT settings.app_store_declaration_ready
      AND NOT settings.minor_policy_ready
  ) THEN
    RAISE EXCEPTION 'feedback_v1_2_activation_runtime_baseline_drift' USING ERRCODE = '55000';
  END IF;

  IF (
    SELECT pg_catalog.count(*) FROM feedback_core.campaigns campaign
    WHERE campaign.campaign_reference IN (
      'feedback-day-10-v1', 'feedback-day-24-v1',
      'feedback-day-39-v1', 'feedback-day-55-v1'
    )
      AND campaign.status = 'draft'
      AND campaign.content_version = 'feedback-intelligence-content-v1.1.2'
      AND (campaign.campaign_reference, campaign.questionnaire_version, campaign.questionnaire_manifest_hash) IN (
        ('feedback-day-10-v1', 'feedback-d10-v1.1.2', '48c2bf887ec96a0cc49eb327b380f7da7d163beb08929b9b359bfa0356692f2c'),
        ('feedback-day-24-v1', 'feedback-d24-v1.1.2', '679f09ab0a4c08a0521404cbbef2d88a8f0121cb353c42f310a3f09cc20689e8'),
        ('feedback-day-39-v1', 'feedback-d39-v1.1.2', 'b566002d6f1d0c74f1eafb8554f370fa7f409f871473717079a478ad7b238b44'),
        ('feedback-day-55-v1', 'feedback-d55-v1.1.2', 'b8b1eb9e97348090e2993ee634dc0616228f6c1138b450174d132f48b1029600')
      )
      AND campaign.text_consent_scope = 'product-improvement-internal-admin-review-v1'
      AND campaign.text_consent_version = 'feedback-text-consent-v1.2.0'
      AND campaign.text_notice_hash = 'b5f1ef6bb515ad4eebfc4282d31149fd7a69f3e667ec62fb1788ee6419a145fe'
  ) <> 4 OR EXISTS (SELECT 1 FROM feedback_core.campaigns WHERE status <> 'draft') THEN
    RAISE EXCEPTION 'feedback_v1_2_activation_campaign_drift' USING ERRCODE = '55000';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM feedback_core.jurisdiction_policies policy
    WHERE policy.jurisdiction = 'DE'
      AND policy.policy_version = 'feedback-jurisdiction-minor-de-v1.1.0'
      AND policy.product_minimum_age = 13
      AND policy.product_guardian_required_below_age = 16
      AND policy.structured_collection_status = 'legal_review_required'
      AND policy.raw_text_collection_status = 'legal_review_required'
      AND policy.legal_review_reference IS NULL
      AND policy.approved_at IS NULL
  ) OR (
    SELECT pg_catalog.count(*) FROM feedback_core.jurisdiction_policies policy
    WHERE policy.jurisdiction IN ('AT', 'CH')
      AND policy.structured_collection_status = 'out_of_scope'
      AND policy.raw_text_collection_status = 'out_of_scope'
  ) <> 2 THEN
    RAISE EXCEPTION 'feedback_v1_2_activation_policy_drift' USING ERRCODE = '55000';
  END IF;

  IF NOT minor_auth.enforcement_enabled() THEN
    RAISE EXCEPTION 'feedback_v1_2_minor_enforcement_required' USING ERRCODE = '55000';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM feedback_consent.guardian_text_policy_versions policy
    WHERE policy.jurisdiction = 'DE'
      AND policy.policy_reference = 'guardian-feedback-text-de-v1.2.0'
      AND policy.scope = 'product-improvement-internal-admin-review-v1'
      AND policy.consent_version = 'feedback-text-consent-v1.2.0'
      AND policy.guardian_notice_hash = 'f24a97f28ddda04507812b7db46e629885e1796c8810ea85901d9c2b06fa9846'
      AND policy.athlete_notice_hash = 'b5f1ef6bb515ad4eebfc4282d31149fd7a69f3e667ec62fb1788ee6419a145fe'
      AND policy.raw_text_retention_days = 365
      AND policy.processor_mode = 'no_external_processor'
      AND policy.processor_reference IS NULL
      AND policy.status = 'draft'
      AND policy.effective_from IS NULL
      AND policy.retired_at IS NULL
  ) OR EXISTS (
    SELECT 1 FROM feedback_consent.guardian_text_policy_versions WHERE status = 'active'
  ) THEN
    RAISE EXCEPTION 'feedback_v1_2_activation_guardian_policy_drift' USING ERRCODE = '55000';
  END IF;

  UPDATE feedback_core.jurisdiction_policies
  SET structured_collection_status = 'approved',
      raw_text_collection_status = 'approved',
      legal_review_reference = _controller_assessment_reference,
      approved_at = activated_at,
      updated_at = activated_at
  WHERE jurisdiction = 'DE';

  UPDATE feedback_core.campaigns
  SET status = 'active', available_from = activated_at, updated_at = activated_at
  WHERE campaign_reference IN (
    'feedback-day-10-v1', 'feedback-day-24-v1',
    'feedback-day-39-v1', 'feedback-day-55-v1'
  );

  UPDATE feedback_consent.guardian_text_policy_versions
  SET status = 'active', effective_from = activated_at, updated_at = activated_at
  WHERE policy_reference = 'guardian-feedback-text-de-v1.2.0';

  UPDATE feedback_core.system_settings
  SET athlete_collection_enabled = true,
      text_collection_enabled = true,
      privacy_notice_ready = true,
      app_store_declaration_ready = true,
      minor_policy_ready = true,
      updated_at = activated_at
  WHERE singleton;

  IF NOT feedback_core.rollout_ready()
     OR NOT feedback_core.jurisdiction_policy_ready('DE', true)
     OR (SELECT pg_catalog.count(*) FROM feedback_core.campaigns WHERE status = 'active') <> 4
     OR (SELECT pg_catalog.count(*) FROM feedback_consent.guardian_text_policy_versions WHERE status = 'active') <> 1
     OR NOT EXISTS (
       SELECT 1 FROM feedback_consent.guardian_text_policy_versions
       WHERE policy_reference = 'guardian-feedback-text-de-v1.2.0' AND status = 'active'
     ) THEN
    RAISE EXCEPTION 'feedback_v1_2_activation_postcondition_failed' USING ERRCODE = '55000';
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'status', 'ACTIVE_V1_2_DE',
    'campaigns_active', 4,
    'text_collection_enabled', true,
    'guardian_text_policy_active', true
  );
END;
$$;

CREATE OR REPLACE FUNCTION feedback_core.reclose_feedback_v1_2(
  _controller_assessment_reference text
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
  IF _controller_assessment_reference IS NULL
     OR _controller_assessment_reference !~ '^controller-assessment-de-feedback-v1\.2:[A-Za-z0-9][A-Za-z0-9._/-]{15,159}$'
     OR pg_catalog.lower(_controller_assessment_reference) ~ '(draft|pending|unreviewed|synthetic|test|fixture)' THEN
    RAISE EXCEPTION 'feedback_v1_2_final_controller_assessment_required'
      USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM feedback_core.jurisdiction_policies policy
    WHERE policy.jurisdiction = 'DE'
      AND policy.structured_collection_status = 'approved'
      AND policy.raw_text_collection_status = 'approved'
      AND policy.legal_review_reference = _controller_assessment_reference
      AND policy.approved_at IS NOT NULL
  ) OR (SELECT pg_catalog.count(*) FROM feedback_core.campaigns WHERE status = 'active') <> 4
     OR (SELECT pg_catalog.count(*) FROM feedback_consent.guardian_text_policy_versions WHERE status = 'active') <> 1
     OR NOT EXISTS (
       SELECT 1 FROM feedback_consent.guardian_text_policy_versions
       WHERE policy_reference = 'guardian-feedback-text-de-v1.2.0' AND status = 'active'
     ) THEN
    RAISE EXCEPTION 'feedback_v1_2_reclose_contract_drift' USING ERRCODE = '55000';
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
    AND legal_review_reference = _controller_assessment_reference;

  UPDATE feedback_consent.guardian_text_policy_versions
  SET status = 'retired', retired_at = closed_at, updated_at = closed_at
  WHERE status = 'active'
    AND policy_reference = 'guardian-feedback-text-de-v1.2.0';

  IF feedback_core.rollout_ready()
     OR feedback_core.jurisdiction_policy_ready('DE', false)
     OR feedback_core.jurisdiction_policy_ready('DE', true)
     OR EXISTS (SELECT 1 FROM feedback_core.campaigns WHERE status = 'active')
     OR EXISTS (SELECT 1 FROM feedback_consent.guardian_text_policy_versions WHERE status = 'active') THEN
    RAISE EXCEPTION 'feedback_v1_2_reclose_postcondition_failed' USING ERRCODE = '55000';
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'status', 'RECLOSED_V1_2_DE',
    'runtime_gates_closed', true,
    'campaigns_active', 0,
    'guardian_text_policy_active', false
  );
END;
$$;

REVOKE ALL ON FUNCTION feedback_core.activate_feedback_v1_2(text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION feedback_core.reclose_feedback_v1_2(text)
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION feedback_core.activate_feedback_v1_2(text) IS
  'Owner-only atomic DE V1.2 Feedback Intelligence activation. Installation changes no runtime state. The controller-assessment reference is an audit pin, not proof of legal compliance; text still requires the separate athlete and, below 16, guardian decisions.';
COMMENT ON FUNCTION feedback_core.reclose_feedback_v1_2(text) IS
  'Owner-only emergency re-close for V1.2 Feedback Intelligence; closes collection before pausing contracts, preserves existing structured records and returns no application values.';

COMMIT;
