-- Adds the exact Guardian notice that binds to the V1.1 athlete notice.
-- The policy remains draft and no collection or processor is activated.

BEGIN;

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
  'guardian-feedback-text-de-v1.1.0-draft',
  'product-improvement-individual-text-ai-analysis-v1',
  'feedback-text-consent-v1.1.0-draft',
  '4b7c6f6cbf3d932c2e244d6a281f0d45056706eeb6108cb2ac2303dbe0f19c4f',
  '4f067f11e8ba0075989ba3af730cfcac3849e6e406da97227defa92ac41dfda7',
  365,
  'no_external_processor',
  NULL,
  'draft'
)
ON CONFLICT (policy_reference) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM feedback_consent.guardian_text_policy_versions
    WHERE jurisdiction = 'DE'
      AND policy_reference = 'guardian-feedback-text-de-v1.1.0-draft'
      AND scope = 'product-improvement-individual-text-ai-analysis-v1'
      AND consent_version = 'feedback-text-consent-v1.1.0-draft'
      AND guardian_notice_hash = '4b7c6f6cbf3d932c2e244d6a281f0d45056706eeb6108cb2ac2303dbe0f19c4f'
      AND athlete_notice_hash = '4f067f11e8ba0075989ba3af730cfcac3849e6e406da97227defa92ac41dfda7'
      AND raw_text_retention_days = 365
      AND processor_mode = 'no_external_processor'
      AND processor_reference IS NULL
      AND status = 'draft'
  ) THEN
    RAISE EXCEPTION 'guardian_feedback_text_notice_v1_1_missing';
  END IF;
END;
$$;

COMMIT;
