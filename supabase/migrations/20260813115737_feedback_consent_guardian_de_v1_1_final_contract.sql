-- Registers the final review candidate for the German V1.1 feedback-comment
-- consent and Guardian notice. It also aligns the DE product minimum age with
-- the public 13+ product decision while retaining the existing under-16
-- Guardian requirement.
--
-- This migration is deliberately fail-closed:
-- - campaigns remain draft;
-- - the final Guardian policy remains draft;
-- - DE structured and raw-text policy remains legal_review_required;
-- - every collection, Privacy, App Store and Minor runtime gate remains false;
-- - AT and CH remain out_of_scope;
-- - no Jarvis/Machine/Production credential or read is created.

BEGIN;

DO $$
BEGIN
  IF (
    SELECT count(*)
    FROM feedback_core.campaigns
    WHERE campaign_reference IN (
      'feedback-day-10-v1',
      'feedback-day-24-v1',
      'feedback-day-39-v1',
      'feedback-day-55-v1'
    )
      AND status = 'draft'
      AND text_consent_scope = 'product-improvement-individual-text-ai-analysis-v1'
      AND text_consent_version = 'feedback-text-consent-v1.1.0-draft'
      AND text_notice_hash = '4f067f11e8ba0075989ba3af730cfcac3849e6e406da97227defa92ac41dfda7'
  ) <> 4 THEN
    RAISE EXCEPTION 'feedback_consent_final_contract_requires_four_exact_draft_campaigns';
  END IF;

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
    RAISE EXCEPTION 'feedback_consent_final_contract_requires_closed_runtime_gates';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM feedback_core.jurisdiction_policies policy
    WHERE policy.jurisdiction = 'DE'
      AND policy.policy_version = 'feedback-jurisdiction-minor-de-v1.0.0'
      AND policy.product_minimum_age = 15
      AND policy.product_guardian_required_below_age = 16
      AND policy.structured_collection_status = 'legal_review_required'
      AND policy.raw_text_collection_status = 'legal_review_required'
      AND policy.legal_review_reference IS NULL
      AND policy.approved_at IS NULL
  ) THEN
    RAISE EXCEPTION 'feedback_consent_final_contract_requires_exact_de_policy_baseline';
  END IF;

  IF (
    SELECT count(*)
    FROM feedback_core.jurisdiction_policies policy
    WHERE policy.jurisdiction IN ('AT', 'CH')
      AND policy.structured_collection_status = 'out_of_scope'
      AND policy.raw_text_collection_status = 'out_of_scope'
  ) <> 2 THEN
    RAISE EXCEPTION 'feedback_consent_final_contract_requires_non_de_fail_closed';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM feedback_consent.guardian_text_policy_versions policy
    WHERE policy.status = 'active'
  ) THEN
    RAISE EXCEPTION 'feedback_consent_final_contract_requires_no_active_guardian_policy';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM feedback_consent.guardian_text_policy_versions policy
    WHERE policy.policy_reference = 'guardian-feedback-text-de-v1.1.0-draft'
      AND policy.status = 'draft'
  ) THEN
    RAISE EXCEPTION 'feedback_consent_final_contract_requires_reviewed_draft_predecessor';
  END IF;
END;
$$;

ALTER TABLE feedback_core.jurisdiction_policies
  DROP CONSTRAINT jurisdiction_policies_product_minimum_age_check;

ALTER TABLE feedback_core.jurisdiction_policies
  ALTER COLUMN product_minimum_age SET DEFAULT 13,
  ADD CONSTRAINT jurisdiction_policies_product_minimum_age_check
    CHECK (product_minimum_age BETWEEN 13 AND 18);

UPDATE feedback_core.jurisdiction_policies
SET policy_version = 'feedback-jurisdiction-minor-de-v1.1.0',
    product_minimum_age = 13,
    updated_at = pg_catalog.clock_timestamp()
WHERE jurisdiction = 'DE'
  AND policy_version = 'feedback-jurisdiction-minor-de-v1.0.0'
  AND product_minimum_age = 15
  AND product_guardian_required_below_age = 16
  AND structured_collection_status = 'legal_review_required'
  AND raw_text_collection_status = 'legal_review_required'
  AND legal_review_reference IS NULL
  AND approved_at IS NULL;

UPDATE feedback_core.campaigns
SET text_consent_version = 'feedback-text-consent-v1.1.0',
    text_notice_hash = 'c308e8ad3d89b02c308a07090a4c09cb363f9cdb7d1e5d671ac295c545d95a16',
    updated_at = pg_catalog.clock_timestamp()
WHERE campaign_reference IN (
    'feedback-day-10-v1',
    'feedback-day-24-v1',
    'feedback-day-39-v1',
    'feedback-day-55-v1'
  )
  AND status = 'draft'
  AND text_consent_scope = 'product-improvement-individual-text-ai-analysis-v1'
  AND text_consent_version = 'feedback-text-consent-v1.1.0-draft'
  AND text_notice_hash = '4f067f11e8ba0075989ba3af730cfcac3849e6e406da97227defa92ac41dfda7';

INSERT INTO feedback_consent.guardian_text_policy_versions(
  jurisdiction,
  policy_reference,
  scope,
  consent_version,
  guardian_notice_hash,
  athlete_notice_hash,
  raw_text_retention_days,
  processor_mode,
  processor_reference,
  status
) VALUES (
  'DE',
  'guardian-feedback-text-de-v1.1.0',
  'product-improvement-individual-text-ai-analysis-v1',
  'feedback-text-consent-v1.1.0',
  '90b0ede2a1a7671f1631e2048a605e6331006972ee05e63d38d229857f0aeb0b',
  'c308e8ad3d89b02c308a07090a4c09cb363f9cdb7d1e5d671ac295c545d95a16',
  365,
  'no_external_processor',
  NULL,
  'draft'
)
ON CONFLICT (policy_reference) DO NOTHING;

DO $$
BEGIN
  IF (
    SELECT count(*)
    FROM feedback_core.campaigns
    WHERE campaign_reference IN (
      'feedback-day-10-v1',
      'feedback-day-24-v1',
      'feedback-day-39-v1',
      'feedback-day-55-v1'
    )
      AND status = 'draft'
      AND text_consent_scope = 'product-improvement-individual-text-ai-analysis-v1'
      AND text_consent_version = 'feedback-text-consent-v1.1.0'
      AND text_notice_hash = 'c308e8ad3d89b02c308a07090a4c09cb363f9cdb7d1e5d671ac295c545d95a16'
  ) <> 4 THEN
    RAISE EXCEPTION 'feedback_consent_final_campaign_pins_incomplete';
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
  ) THEN
    RAISE EXCEPTION 'feedback_consent_final_de_age_policy_incomplete';
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
  ) THEN
    RAISE EXCEPTION 'feedback_consent_final_guardian_policy_incomplete';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM feedback_core.system_settings settings
    WHERE settings.singleton
      AND (
        settings.athlete_collection_enabled
        OR settings.text_collection_enabled
        OR settings.privacy_notice_ready
        OR settings.app_store_declaration_ready
        OR settings.minor_policy_ready
      )
  ) THEN
    RAISE EXCEPTION 'feedback_consent_final_contract_opened_runtime_gate';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM feedback_consent.guardian_text_policy_versions policy
    WHERE policy.status = 'active'
  ) THEN
    RAISE EXCEPTION 'feedback_consent_final_contract_activated_guardian_policy';
  END IF;
END;
$$;

COMMENT ON COLUMN feedback_core.jurisdiction_policies.product_minimum_age IS
  'Product access minimum for the current jurisdiction. DE is 13+; ages 13 through 15 still require the separate under-16 Guardian and athlete authorization path.';

COMMIT;
