BEGIN;

CREATE INDEX minor_auth_participant_policy
  ON minor_auth.participant_authorizations(policy_id);

CREATE INDEX minor_auth_challenge_policy
  ON minor_auth.guardian_challenges(policy_id);

CREATE INDEX minor_auth_guardian_access_policy
  ON minor_auth.guardian_access_tokens(policy_id);

CREATE INDEX minor_auth_audit_policy
  ON minor_auth.authorization_audit(policy_id);

COMMIT;
