-- Installs the explicit V1.1 Feedback Intelligence activation contract.
-- Applying this migration does not activate collection. Only the database
-- owner may later call feedback_core.activate_feedback_v1_1 with a qualified,
-- externally approved legal-review reference. The call is atomic and rejects
-- any drift from the exact closed V1.1 baseline.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM feedback_core.system_settings settings
    WHERE settings.singleton
      AND NOT settings.athlete_collection_enabled
      AND NOT settings.text_collection_enabled
      AND NOT settings.privacy_notice_ready
      AND NOT settings.app_store_declaration_ready
      AND NOT settings.minor_policy_ready
  ) THEN
    RAISE EXCEPTION 'feedback_v1_1_activation_requires_closed_runtime_gates';
  END IF;

  IF (
    SELECT count(*)
    FROM feedback_core.campaigns campaign
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
      AND campaign.text_consent_scope = 'product-improvement-individual-text-ai-analysis-v1'
      AND campaign.text_consent_version = 'feedback-text-consent-v1.1.0'
      AND campaign.text_notice_hash = 'c308e8ad3d89b02c308a07090a4c09cb363f9cdb7d1e5d671ac295c545d95a16'
  ) <> 4 OR EXISTS (
    SELECT 1 FROM feedback_core.campaigns WHERE status <> 'draft'
  ) THEN
    RAISE EXCEPTION 'feedback_v1_1_activation_requires_four_exact_draft_campaigns';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM feedback_core.jurisdiction_policies policy
    WHERE policy.jurisdiction = 'DE'
      AND policy.policy_version = 'feedback-jurisdiction-minor-de-v1.1.0'
      AND policy.product_minimum_age = 13
      AND policy.product_guardian_required_below_age = 16
      AND policy.structured_collection_status = 'legal_review_required'
      AND policy.raw_text_collection_status = 'legal_review_required'
      AND policy.legal_review_reference IS NULL
      AND policy.approved_at IS NULL
  ) OR (
    SELECT count(*) FROM feedback_core.jurisdiction_policies policy
    WHERE policy.jurisdiction IN ('AT', 'CH')
      AND policy.structured_collection_status = 'out_of_scope'
      AND policy.raw_text_collection_status = 'out_of_scope'
  ) <> 2 THEN
    RAISE EXCEPTION 'feedback_v1_1_activation_requires_exact_de_only_policy_baseline';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM feedback_consent.guardian_text_policy_versions policy
    WHERE policy.jurisdiction = 'DE'
      AND policy.policy_reference = 'guardian-feedback-text-de-v1.1.0'
      AND policy.scope = 'product-improvement-individual-text-ai-analysis-v1'
      AND policy.consent_version = 'feedback-text-consent-v1.1.0'
      AND policy.guardian_notice_hash = '90b0ede2a1a7671f1631e2048a605e6331006972ee05e63d38d229857f0aeb0b'
      AND policy.athlete_notice_hash = 'c308e8ad3d89b02c308a07090a4c09cb363f9cdb7d1e5d671ac295c545d95a16'
      AND policy.raw_text_retention_days = 365
      AND policy.processor_mode = 'no_external_processor'
      AND policy.processor_reference IS NULL
      AND policy.status = 'draft'
      AND policy.effective_from IS NULL
      AND policy.retired_at IS NULL
  ) OR EXISTS (
    SELECT 1 FROM feedback_consent.guardian_text_policy_versions WHERE status = 'active'
  ) THEN
    RAISE EXCEPTION 'feedback_v1_1_activation_requires_exact_guardian_policy_baseline';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION feedback_core.activate_feedback_v1_1(
  _legal_review_reference text
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
  IF _legal_review_reference IS NULL
     OR _legal_review_reference !~ '^legal-review-de-feedback-v1\.1:[A-Za-z0-9][A-Za-z0-9._/-]{15,159}$'
     OR lower(_legal_review_reference) ~ '(draft|pending|unreviewed|synthetic|test|fixture)' THEN
    RAISE EXCEPTION 'feedback_v1_1_qualified_legal_review_reference_required'
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
    RAISE EXCEPTION 'feedback_v1_1_activation_runtime_baseline_drift' USING ERRCODE = '55000';
  END IF;

  IF (
    SELECT count(*) FROM feedback_core.campaigns campaign
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
      AND campaign.text_consent_version = 'feedback-text-consent-v1.1.0'
      AND campaign.text_notice_hash = 'c308e8ad3d89b02c308a07090a4c09cb363f9cdb7d1e5d671ac295c545d95a16'
  ) <> 4 OR EXISTS (
    SELECT 1 FROM feedback_core.campaigns WHERE status <> 'draft'
  ) THEN
    RAISE EXCEPTION 'feedback_v1_1_activation_campaign_drift' USING ERRCODE = '55000';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM feedback_core.jurisdiction_policies policy
    WHERE policy.jurisdiction = 'DE'
      AND policy.policy_version = 'feedback-jurisdiction-minor-de-v1.1.0'
      AND policy.structured_collection_status = 'legal_review_required'
      AND policy.raw_text_collection_status = 'legal_review_required'
      AND policy.legal_review_reference IS NULL
      AND policy.approved_at IS NULL
  ) OR (
    SELECT count(*) FROM feedback_core.jurisdiction_policies policy
    WHERE policy.jurisdiction IN ('AT', 'CH')
      AND policy.structured_collection_status = 'out_of_scope'
      AND policy.raw_text_collection_status = 'out_of_scope'
  ) <> 2 THEN
    RAISE EXCEPTION 'feedback_v1_1_activation_jurisdiction_drift' USING ERRCODE = '55000';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM feedback_consent.guardian_text_policy_versions policy
    WHERE policy.jurisdiction = 'DE'
      AND policy.policy_reference = 'guardian-feedback-text-de-v1.1.0'
      AND policy.scope = 'product-improvement-individual-text-ai-analysis-v1'
      AND policy.consent_version = 'feedback-text-consent-v1.1.0'
      AND policy.guardian_notice_hash = '90b0ede2a1a7671f1631e2048a605e6331006972ee05e63d38d229857f0aeb0b'
      AND policy.athlete_notice_hash = 'c308e8ad3d89b02c308a07090a4c09cb363f9cdb7d1e5d671ac295c545d95a16'
      AND policy.raw_text_retention_days = 365
      AND policy.processor_mode = 'no_external_processor'
      AND policy.processor_reference IS NULL
      AND policy.status = 'draft'
      AND policy.effective_from IS NULL
      AND policy.retired_at IS NULL
  ) OR EXISTS (
    SELECT 1 FROM feedback_consent.guardian_text_policy_versions WHERE status = 'active'
  ) THEN
    RAISE EXCEPTION 'feedback_v1_1_activation_guardian_policy_drift' USING ERRCODE = '55000';
  END IF;

  UPDATE feedback_core.jurisdiction_policies
  SET structured_collection_status = 'approved',
      raw_text_collection_status = 'approved',
      legal_review_reference = _legal_review_reference,
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
  WHERE policy_reference = 'guardian-feedback-text-de-v1.1.0';

  UPDATE feedback_core.system_settings
  SET athlete_collection_enabled = true,
      text_collection_enabled = true,
      privacy_notice_ready = true,
      app_store_declaration_ready = true,
      minor_policy_ready = true,
      updated_at = activated_at
  WHERE singleton;

  IF (SELECT count(*) FROM feedback_core.campaigns WHERE status = 'active') <> 4
     OR (SELECT count(*) FROM feedback_core.campaigns
         WHERE campaign_reference IN (
           'feedback-day-10-v1', 'feedback-day-24-v1',
           'feedback-day-39-v1', 'feedback-day-55-v1'
         ) AND status = 'active') <> 4
     OR (SELECT count(*) FROM feedback_consent.guardian_text_policy_versions WHERE status = 'active') <> 1
     OR NOT EXISTS (
       SELECT 1 FROM feedback_consent.guardian_text_policy_versions
       WHERE policy_reference = 'guardian-feedback-text-de-v1.1.0' AND status = 'active'
     )
     OR NOT feedback_core.jurisdiction_policy_ready('DE', true)
     OR NOT feedback_core.rollout_ready() THEN
    RAISE EXCEPTION 'feedback_v1_1_activation_postcondition_failed' USING ERRCODE = '55000';
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'status', 'ACTIVE_V1_1_DE',
    'campaigns_active', 4,
    'guardian_policy_active', true
  );
END;
$$;

REVOKE ALL ON FUNCTION feedback_core.activate_feedback_v1_1(text)
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION feedback_core.activate_feedback_v1_1(text) IS
  'Owner-only atomic V1.1 DE activation. The required reference format is only a technical pin and never proves legal approval by itself. Installation alone keeps all gates closed; separate human approval, a qualified legal-review reference and the exact closed baseline are mandatory.';

COMMIT;
