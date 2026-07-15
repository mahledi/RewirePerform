BEGIN;

-- Cover the nullable and non-leading foreign-key columns used by the
-- performance evidence layer. These indexes keep parent updates/deletes and
-- run/team filtering predictable as pilot data grows.
CREATE INDEX IF NOT EXISTS idx_athlete_transfer_observations_assignment
  ON public.athlete_transfer_observations(assignment_id);

CREATE INDEX IF NOT EXISTS idx_athlete_transfer_observations_protocol
  ON public.athlete_transfer_observations(protocol_version);

CREATE INDEX IF NOT EXISTS idx_athlete_transfer_observations_team
  ON public.athlete_transfer_observations(team_id)
  WHERE team_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_coach_evidence_reviews_protocol
  ON public.coach_evidence_reviews(protocol_version);

CREATE INDEX IF NOT EXISTS idx_coach_evidence_reviews_target_instance
  ON public.coach_evidence_reviews(target_program_instance_id)
  WHERE target_program_instance_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_coach_evidence_reviews_team
  ON public.coach_evidence_reviews(team_id);

CREATE INDEX IF NOT EXISTS idx_evidence_eligibility_audit_actor
  ON public.evidence_eligibility_audit(actor_id)
  WHERE actor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_evidence_participation_verified_by
  ON public.evidence_participation_eligibility(verified_by)
  WHERE verified_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_evidence_participation_revoked_by
  ON public.evidence_participation_eligibility(revoked_by)
  WHERE revoked_by IS NOT NULL;

COMMIT;
