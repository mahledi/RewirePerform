-- Feedback Intelligence v1.1 database-enforced privacy boundaries.
--
-- Raw feedback text is accepted only with an exact, currently valid consent
-- receipt. Under-16 text remains fail-closed until a guardian has granted the
-- same scope/version/notice. No guardian text authorization is seeded here.

BEGIN;

ALTER TABLE feedback_consent.text_consent_receipts
  ADD CONSTRAINT feedback_text_consent_guardian_reference_fkey
  FOREIGN KEY (guardian_authorization_reference)
  REFERENCES feedback_consent.guardian_text_authorizations(consent_reference)
  ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION feedback_core.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := pg_catalog.clock_timestamp();
  RETURN NEW;
END;
$$;

CREATE TRIGGER feedback_campaigns_touch_updated_at
BEFORE UPDATE ON feedback_core.campaigns
FOR EACH ROW EXECUTE FUNCTION feedback_core.touch_updated_at();

CREATE TRIGGER feedback_submissions_touch_updated_at
BEFORE UPDATE ON feedback_core.submissions
FOR EACH ROW EXECUTE FUNCTION feedback_core.touch_updated_at();

CREATE OR REPLACE FUNCTION feedback_core.protect_submitted_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.status = 'submitted' AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'feedback_submission_already_finalized'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER feedback_submissions_protect_finalized
BEFORE UPDATE ON feedback_core.submissions
FOR EACH ROW EXECUTE FUNCTION feedback_core.protect_submitted_submission();

CREATE OR REPLACE FUNCTION feedback_consent.validate_guardian_text_authorization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.user_id <> OLD.user_id
       OR NEW.scope <> OLD.scope
       OR NEW.consent_version <> OLD.consent_version
       OR NEW.notice_hash <> OLD.notice_hash
       OR NEW.policy_reference <> OLD.policy_reference
       OR NEW.consent_reference <> OLD.consent_reference THEN
      RAISE EXCEPTION 'guardian_text_authorization_identity_immutable'
        USING ERRCODE = '42501';
    END IF;
    IF OLD.state = 'withdrawn' THEN
      RAISE EXCEPTION 'guardian_text_authorization_already_withdrawn'
        USING ERRCODE = '42501';
    END IF;
    IF OLD.state = 'declined' AND NEW.state <> 'declined' THEN
      RAISE EXCEPTION 'guardian_text_authorization_new_receipt_required'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF NEW.state = 'granted' THEN
    NEW.granted_at := COALESCE(NEW.granted_at, pg_catalog.clock_timestamp());
    NEW.withdrawn_at := NULL;
  ELSIF NEW.state = 'declined' THEN
    NEW.granted_at := NULL;
    NEW.withdrawn_at := NULL;
  ELSIF NEW.state = 'withdrawn' THEN
    NEW.withdrawn_at := COALESCE(NEW.withdrawn_at, pg_catalog.clock_timestamp());
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER feedback_guardian_text_authorization_validate
BEFORE INSERT OR UPDATE ON feedback_consent.guardian_text_authorizations
FOR EACH ROW EXECUTE FUNCTION feedback_consent.validate_guardian_text_authorization();

CREATE OR REPLACE FUNCTION feedback_consent.cleanup_withdrawn_guardian_text()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.state = 'granted' AND NEW.state = 'withdrawn' THEN
    UPDATE feedback_consent.text_consent_receipts receipt
    SET state = 'withdrawn',
        withdrawn_at = COALESCE(NEW.withdrawn_at, pg_catalog.clock_timestamp())
    WHERE receipt.guardian_authorization_reference = NEW.consent_reference
      AND receipt.state = 'granted';

    INSERT INTO feedback_consent.audit_events(
      user_id, consent_reference, actor_type, event_type,
      scope, consent_version, notice_hash
    ) VALUES (
      NEW.user_id, NEW.consent_reference, 'guardian',
      'guardian_text_scope_withdrawn', NEW.scope, NEW.consent_version, NEW.notice_hash
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER feedback_guardian_text_authorization_cleanup_withdrawal
AFTER UPDATE ON feedback_consent.guardian_text_authorizations
FOR EACH ROW EXECUTE FUNCTION feedback_consent.cleanup_withdrawn_guardian_text();

CREATE OR REPLACE FUNCTION feedback_consent.validate_text_consent_receipt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_submission feedback_core.submissions%ROWTYPE;
  target_campaign feedback_core.campaigns%ROWTYPE;
  guardian_authorization feedback_consent.guardian_text_authorizations%ROWTYPE;
BEGIN
  SELECT submission.*
  INTO target_submission
  FROM feedback_core.submissions submission
  WHERE submission.id = NEW.submission_id
  FOR KEY SHARE;

  IF target_submission.id IS NULL OR target_submission.user_id <> NEW.user_id THEN
    RAISE EXCEPTION 'feedback_consent_submission_mismatch'
      USING ERRCODE = '42501';
  END IF;

  SELECT campaign.*
  INTO target_campaign
  FROM feedback_core.campaigns campaign
  WHERE campaign.id = target_submission.campaign_id;

  IF NEW.scope <> target_campaign.text_consent_scope
     OR NEW.consent_version <> target_campaign.text_consent_version
     OR NEW.notice_hash <> target_campaign.text_notice_hash THEN
    RAISE EXCEPTION 'feedback_consent_contract_mismatch'
      USING ERRCODE = '22023';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.submission_id <> OLD.submission_id
       OR NEW.user_id <> OLD.user_id
       OR NEW.scope <> OLD.scope
       OR NEW.consent_version <> OLD.consent_version
       OR NEW.notice_hash <> OLD.notice_hash
       OR NEW.consent_reference <> OLD.consent_reference THEN
      RAISE EXCEPTION 'feedback_consent_identity_immutable'
        USING ERRCODE = '42501';
    END IF;
    IF OLD.state = 'withdrawn' THEN
      RAISE EXCEPTION 'feedback_consent_already_withdrawn'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF NEW.state = 'granted' THEN
    IF target_submission.age_band_at_submit = 'unknown' THEN
      RAISE EXCEPTION 'feedback_minor_status_unresolved'
        USING ERRCODE = '42501';
    END IF;

    IF target_submission.age_band_at_submit = 'under_16' THEN
      SELECT guardian.*
      INTO guardian_authorization
      FROM feedback_consent.guardian_text_authorizations guardian
      WHERE guardian.consent_reference = NEW.guardian_authorization_reference
        AND guardian.user_id = NEW.user_id
        AND guardian.scope = NEW.scope
        AND guardian.consent_version = NEW.consent_version
        AND guardian.notice_hash = NEW.notice_hash
        AND guardian.state = 'granted'
        AND guardian.granted_at IS NOT NULL
        AND guardian.withdrawn_at IS NULL
      FOR KEY SHARE;

      IF guardian_authorization.id IS NULL THEN
        RAISE EXCEPTION 'guardian_feedback_text_scope_required'
          USING ERRCODE = '42501';
      END IF;
      NEW.minor_gate_state := 'guardian_scope_granted';
    ELSE
      NEW.guardian_authorization_reference := NULL;
      NEW.minor_gate_state := 'not_required';
    END IF;

    NEW.granted_at := COALESCE(NEW.granted_at, pg_catalog.clock_timestamp());
    NEW.withdrawn_at := NULL;
  ELSIF NEW.state = 'declined' THEN
    NEW.granted_at := NULL;
    NEW.withdrawn_at := NULL;
    NEW.guardian_authorization_reference := NULL;
    NEW.minor_gate_state := CASE
      WHEN target_submission.age_band_at_submit = 'unknown' THEN 'minor_status_unresolved'
      WHEN target_submission.age_band_at_submit = 'under_16' THEN 'guardian_scope_missing'
      ELSE 'not_required'
    END;
  ELSIF NEW.state = 'withdrawn' THEN
    NEW.withdrawn_at := COALESCE(NEW.withdrawn_at, pg_catalog.clock_timestamp());
  END IF;

  NEW.updated_at := pg_catalog.clock_timestamp();
  RETURN NEW;
END;
$$;

CREATE TRIGGER feedback_text_consent_receipt_validate
BEFORE INSERT OR UPDATE ON feedback_consent.text_consent_receipts
FOR EACH ROW EXECUTE FUNCTION feedback_consent.validate_text_consent_receipt();

CREATE OR REPLACE FUNCTION feedback_raw.validate_comment_consent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_submission feedback_core.submissions%ROWTYPE;
  target_campaign feedback_core.campaigns%ROWTYPE;
  target_receipt feedback_consent.text_consent_receipts%ROWTYPE;
  guardian_is_current boolean := false;
BEGIN
  SELECT submission.*
  INTO target_submission
  FROM feedback_core.submissions submission
  WHERE submission.id = NEW.submission_id
  FOR KEY SHARE;

  SELECT receipt.*
  INTO target_receipt
  FROM feedback_consent.text_consent_receipts receipt
  WHERE receipt.id = NEW.consent_receipt_id
  FOR KEY SHARE;

  IF target_submission.id IS NULL
     OR target_receipt.id IS NULL
     OR target_receipt.submission_id <> target_submission.id
     OR target_receipt.user_id <> target_submission.user_id
     OR target_receipt.state <> 'granted'
     OR target_receipt.granted_at IS NULL
     OR target_receipt.withdrawn_at IS NOT NULL THEN
    RAISE EXCEPTION 'feedback_text_consent_required'
      USING ERRCODE = '42501';
  END IF;

  SELECT campaign.*
  INTO target_campaign
  FROM feedback_core.campaigns campaign
  WHERE campaign.id = target_submission.campaign_id;

  IF target_receipt.scope <> target_campaign.text_consent_scope
     OR target_receipt.consent_version <> target_campaign.text_consent_version
     OR target_receipt.notice_hash <> target_campaign.text_notice_hash THEN
    RAISE EXCEPTION 'feedback_text_consent_contract_mismatch'
      USING ERRCODE = '42501';
  END IF;

  IF target_submission.age_band_at_submit = 'under_16' THEN
    SELECT EXISTS (
      SELECT 1
      FROM feedback_consent.guardian_text_authorizations guardian
      WHERE guardian.consent_reference = target_receipt.guardian_authorization_reference
        AND guardian.user_id = target_submission.user_id
        AND guardian.scope = target_receipt.scope
        AND guardian.consent_version = target_receipt.consent_version
        AND guardian.notice_hash = target_receipt.notice_hash
        AND guardian.state = 'granted'
        AND guardian.granted_at IS NOT NULL
        AND guardian.withdrawn_at IS NULL
    ) INTO guardian_is_current;

    IF NOT guardian_is_current THEN
      RAISE EXCEPTION 'guardian_feedback_text_scope_required'
        USING ERRCODE = '42501';
    END IF;
  ELSIF target_submission.age_band_at_submit = 'unknown' THEN
    RAISE EXCEPTION 'feedback_minor_status_unresolved'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.question_id <> '__closing_comment__'
     AND NOT EXISTS (
       SELECT 1
       FROM feedback_core.question_definitions question
       WHERE question.campaign_id = target_campaign.id
         AND question.question_id = NEW.question_id
         AND question.optional_comment
     ) THEN
    RAISE EXCEPTION 'feedback_comment_question_invalid'
      USING ERRCODE = '22023';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.submission_id <> OLD.submission_id
       OR NEW.question_id <> OLD.question_id
       OR NEW.consent_receipt_id <> OLD.consent_receipt_id THEN
      RAISE EXCEPTION 'feedback_comment_identity_immutable'
        USING ERRCODE = '42501';
    END IF;
    IF target_submission.status = 'submitted' THEN
      RAISE EXCEPTION 'feedback_submission_already_finalized'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  NEW.raw_text := pg_catalog.btrim(NEW.raw_text);
  NEW.submitted_at := pg_catalog.clock_timestamp();
  NEW.updated_at := pg_catalog.clock_timestamp();
  IF TG_OP = 'INSERT' THEN
    NEW.id := gen_random_uuid();
    NEW.created_at := NEW.submitted_at;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER feedback_raw_comment_validate
BEFORE INSERT OR UPDATE ON feedback_raw.comments
FOR EACH ROW EXECUTE FUNCTION feedback_raw.validate_comment_consent();

CREATE OR REPLACE FUNCTION feedback_consent.cleanup_withdrawn_text()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  raw_count integer := 0;
  artifact_count integer := 0;
BEGIN
  IF OLD.state = 'granted' AND NEW.state = 'withdrawn' THEN
    SELECT COUNT(*)::integer
    INTO artifact_count
    FROM feedback_analysis.comment_artifacts artifact
    INNER JOIN feedback_raw.comments comment ON comment.id = artifact.comment_id
    WHERE comment.consent_receipt_id = NEW.id;

    SELECT COUNT(*)::integer
    INTO raw_count
    FROM feedback_raw.comments comment
    WHERE comment.consent_receipt_id = NEW.id;

    DELETE FROM feedback_raw.comments comment
    WHERE comment.consent_receipt_id = NEW.id;

    IF raw_count > 0 THEN
      INSERT INTO feedback_consent.audit_events(
        user_id, submission_id, consent_reference, actor_type, event_type,
        scope, consent_version, notice_hash
      ) VALUES (
        NEW.user_id, NEW.submission_id, NEW.consent_reference, 'athlete',
        'raw_text_deleted', NEW.scope, NEW.consent_version, NEW.notice_hash
      );
    END IF;

    IF artifact_count > 0 THEN
      INSERT INTO feedback_consent.audit_events(
        user_id, submission_id, consent_reference, actor_type, event_type,
        scope, consent_version, notice_hash
      ) VALUES (
        NEW.user_id, NEW.submission_id, NEW.consent_reference, 'athlete',
        'attributable_artifacts_deleted', NEW.scope, NEW.consent_version, NEW.notice_hash
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER feedback_text_consent_cleanup_withdrawal
AFTER UPDATE ON feedback_consent.text_consent_receipts
FOR EACH ROW EXECUTE FUNCTION feedback_consent.cleanup_withdrawn_text();

CREATE OR REPLACE FUNCTION feedback_consent.reject_append_only_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'feedback_consent_audit_is_append_only'
    USING ERRCODE = '42501';
END;
$$;

CREATE TRIGGER feedback_consent_audit_append_only
BEFORE UPDATE ON feedback_consent.audit_events
FOR EACH ROW EXECUTE FUNCTION feedback_consent.reject_append_only_mutation();

CREATE OR REPLACE FUNCTION feedback_analysis.reject_access_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'feedback_machine_access_log_is_append_only'
    USING ERRCODE = '42501';
END;
$$;

CREATE TRIGGER feedback_machine_access_log_append_only
BEFORE UPDATE OR DELETE ON feedback_analysis.machine_access_log
FOR EACH ROW EXECUTE FUNCTION feedback_analysis.reject_access_log_mutation();

CREATE OR REPLACE FUNCTION public.withdraw_my_feedback_text(
  _consent_reference uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := auth.uid();
  target_receipt feedback_consent.text_consent_receipts%ROWTYPE;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required'
      USING ERRCODE = '42501';
  END IF;

  SELECT receipt.*
  INTO target_receipt
  FROM feedback_consent.text_consent_receipts receipt
  WHERE receipt.consent_reference = _consent_reference
    AND receipt.user_id = actor_id
  FOR UPDATE;

  IF target_receipt.id IS NULL THEN
    RAISE EXCEPTION 'feedback_consent_not_found'
      USING ERRCODE = '42501';
  END IF;

  IF target_receipt.state = 'withdrawn' THEN
    RETURN pg_catalog.jsonb_build_object(
      'ok', true,
      'state', 'withdrawn',
      'already_withdrawn', true
    );
  END IF;

  IF target_receipt.state <> 'granted' THEN
    RAISE EXCEPTION 'feedback_consent_not_granted'
      USING ERRCODE = '22023';
  END IF;

  UPDATE feedback_consent.text_consent_receipts receipt
  SET state = 'withdrawn',
      withdrawn_at = pg_catalog.clock_timestamp()
  WHERE receipt.id = target_receipt.id;

  INSERT INTO feedback_consent.audit_events(
    user_id, submission_id, consent_reference, actor_type, event_type,
    scope, consent_version, notice_hash
  ) VALUES (
    target_receipt.user_id,
    target_receipt.submission_id,
    target_receipt.consent_reference,
    'athlete',
    'text_consent_withdrawn',
    target_receipt.scope,
    target_receipt.consent_version,
    target_receipt.notice_hash
  );

  RETURN pg_catalog.jsonb_build_object(
    'ok', true,
    'state', 'withdrawn',
    'already_withdrawn', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.withdraw_my_feedback_text(uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.withdraw_my_feedback_text(uuid)
  TO authenticated;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA feedback_core
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA feedback_consent
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA feedback_raw
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA feedback_analysis
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION public.withdraw_my_feedback_text(uuid) IS
  'Athlete self-service withdrawal. Deletes raw feedback text and attributable analysis artifacts, while structured answers remain.';

COMMIT;
