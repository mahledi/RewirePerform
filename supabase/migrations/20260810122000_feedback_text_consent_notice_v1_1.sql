-- Registers the shorter, benefit-led V1.1 feedback-comment notices while
-- preserving explicit choice, withdrawal and the existing fail-closed gates.
--
-- This migration updates draft metadata only. It does not activate feedback
-- collection, guardian authorization, Jarvis, a processor or Production.

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
      AND text_consent_version = 'feedback-text-consent-v1.0.0-draft'
      AND text_notice_hash = '7da3fee62d13672430e7c288274994f3d284ad8dfd1b73a92ecc0c8d15962af4'
  ) <> 4 THEN
    RAISE EXCEPTION 'feedback_text_consent_v1_1_requires_four_exact_draft_campaigns';
  END IF;
END;
$$;

UPDATE feedback_core.campaigns
SET text_consent_version = 'feedback-text-consent-v1.1.0-draft',
    text_notice_hash = '4f067f11e8ba0075989ba3af730cfcac3849e6e406da97227defa92ac41dfda7',
    updated_at = pg_catalog.clock_timestamp()
WHERE campaign_reference IN (
    'feedback-day-10-v1',
    'feedback-day-24-v1',
    'feedback-day-39-v1',
    'feedback-day-55-v1'
  )
  AND status = 'draft'
  AND text_consent_scope = 'product-improvement-individual-text-ai-analysis-v1'
  AND text_consent_version = 'feedback-text-consent-v1.0.0-draft'
  AND text_notice_hash = '7da3fee62d13672430e7c288274994f3d284ad8dfd1b73a92ecc0c8d15962af4';

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
    RAISE EXCEPTION 'feedback_text_consent_v1_1_draft_update_incomplete';
  END IF;

END;
$$;

COMMIT;
