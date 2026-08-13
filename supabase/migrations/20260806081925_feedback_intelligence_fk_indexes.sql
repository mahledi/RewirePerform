-- Cover the remaining Feedback Intelligence foreign-key access paths reported
-- by the Supabase performance advisor. This migration is additive only and
-- does not alter collection, consent, policy, campaign or machine gates.

BEGIN;

CREATE INDEX feedback_consent_audit_submission_idx
  ON feedback_consent.audit_events(submission_id)
  WHERE submission_id IS NOT NULL;

CREATE INDEX feedback_checkpoint_campaign_idx
  ON feedback_core.checkpoint_states(campaign_id);

CREATE INDEX feedback_checkpoint_program_instance_idx
  ON feedback_core.checkpoint_states(program_instance_id);

CREATE INDEX feedback_subject_links_program_instance_idx
  ON feedback_core.subject_links(program_instance_id);

COMMIT;
