-- RewirePerform V1.4 narrow-core privacy alignment (BUILT, NOT ACTIVE).
--
-- Records the internal V3 compatibility decision for the narrow core only.
-- This does not provide external legal approval, approve governance gates,
-- activate the protocol, create a pilot window, or backfill real data.

BEGIN;

ALTER TABLE evidence_private.processing_scope_contracts
  DROP CONSTRAINT processing_scope_contracts_compatibility_assessment_check;

ALTER TABLE evidence_private.processing_scope_contracts
  ADD CONSTRAINT processing_scope_contracts_compatibility_assessment_check
  CHECK (compatibility_assessment IN (
    'pending', 'conditionally_compatible', 'approved_core_scope',
    'new_consent_required', 'approved'
  ));

UPDATE evidence_private.processing_scope_contracts
SET compatibility_assessment = 'approved_core_scope',
    included_data_classes = ARRAY[
      'structured_questionnaire_scores', 'structured_assessment_scores',
      'structured_checkin_values', 'structured_transfer_values',
      'completion_usage', 'progress_values', 'comprehension_values'
    ],
    excluded_data_classes = ARRAY[
      'journal_content', 'free_text', 'names', 'email_addresses',
      'private_coach_notes', 'released_structured_coach_observations',
      'diagnostic_data', 'unreleased_observations',
      'push_behavior_analysis', 'external_match_data'
    ],
    updated_at = now()
WHERE protocol_version = 'longitudinal-evidence-v1.4-draft-2026-08';

UPDATE evidence_derived.source_activation_contracts
SET activation_status = 'blocked',
    permitted_claim_classes = '{}',
    mapping_contract = 'new V4 transparency and consent decision required before any Evidence use'
WHERE protocol_version = 'longitudinal-evidence-v1.4-draft-2026-08'
  AND source_family = 'coach_observation';

COMMIT;
