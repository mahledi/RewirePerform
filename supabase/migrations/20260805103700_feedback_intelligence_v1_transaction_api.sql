-- Feedback Intelligence v1.1 transactional athlete API.
--
-- Adds fail-closed rollout gates, one-time checkpoint claiming, resumable
-- drafts, monotonic client revisions and idempotent finalization. No rollout
-- gate or campaign is activated by this migration.

BEGIN;

CREATE TABLE feedback_core.system_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  athlete_collection_enabled boolean NOT NULL DEFAULT false,
  text_collection_enabled boolean NOT NULL DEFAULT false,
  privacy_notice_ready boolean NOT NULL DEFAULT false,
  app_store_declaration_ready boolean NOT NULL DEFAULT false,
  minor_policy_ready boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO feedback_core.system_settings(singleton) VALUES (true)
ON CONFLICT (singleton) DO NOTHING;

CREATE TABLE feedback_core.checkpoint_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES feedback_core.campaigns(id) ON DELETE RESTRICT,
  program_instance_id uuid NOT NULL REFERENCES public.program_instances(id) ON DELETE CASCADE,
  state text NOT NULL CHECK (state IN ('invited', 'dismissed', 'started', 'submitted')),
  first_eligible_at timestamptz NOT NULL DEFAULT now(),
  invited_at timestamptz NOT NULL DEFAULT now(),
  dismissed_at timestamptz,
  started_at timestamptz,
  submitted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, campaign_id, program_instance_id),
  CHECK (state <> 'dismissed' OR dismissed_at IS NOT NULL),
  CHECK (state NOT IN ('started', 'submitted') OR started_at IS NOT NULL),
  CHECK (state <> 'submitted' OR submitted_at IS NOT NULL)
);

CREATE INDEX feedback_checkpoint_states_user_state_idx
  ON feedback_core.checkpoint_states(user_id, state, updated_at DESC);

ALTER TABLE feedback_core.submissions
  ADD COLUMN client_revision integer NOT NULL DEFAULT 0 CHECK (client_revision >= 0),
  ADD COLUMN last_client_mutation_id uuid,
  ADD COLUMN resume_screen text NOT NULL DEFAULT 'intro'
    CHECK (resume_screen IN ('intro', 'questions', 'closing')),
  ADD COLUMN resume_question_id text,
  ADD COLUMN passed_question_ids text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE feedback_core.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_core.checkpoint_states ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE feedback_core.system_settings
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE feedback_core.checkpoint_states
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION feedback_core.rollout_ready()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE((
    SELECT settings.athlete_collection_enabled
       AND settings.privacy_notice_ready
       AND settings.app_store_declaration_ready
       AND settings.minor_policy_ready
    FROM feedback_core.system_settings settings
    WHERE settings.singleton
  ), false)
$$;

CREATE OR REPLACE FUNCTION feedback_core.validate_structured_answer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_submission feedback_core.submissions%ROWTYPE;
  target_question feedback_core.question_definitions%ROWTYPE;
  selected_ids text[];
BEGIN
  SELECT submission.* INTO target_submission
  FROM feedback_core.submissions submission
  WHERE submission.id = NEW.submission_id
  FOR KEY SHARE;

  SELECT question.* INTO target_question
  FROM feedback_core.question_definitions question
  WHERE question.id = NEW.question_definition_id;

  IF target_submission.id IS NULL
     OR target_question.id IS NULL
     OR target_question.campaign_id <> target_submission.campaign_id THEN
    RAISE EXCEPTION 'feedback_answer_question_mismatch' USING ERRCODE = '22023';
  END IF;
  IF target_submission.status = 'submitted' THEN
    RAISE EXCEPTION 'feedback_submission_already_finalized' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(NEW.selected_option_ids) option_value
    WHERE jsonb_typeof(option_value) <> 'string'
  ) THEN
    RAISE EXCEPTION 'feedback_option_id_must_be_string' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(array_agg(value), '{}'::text[])
  INTO selected_ids
  FROM jsonb_array_elements_text(NEW.selected_option_ids) value;

  IF cardinality(selected_ids) <> (
       SELECT COUNT(DISTINCT option_id)::integer FROM unnest(selected_ids) option_id
     )
     OR NOT selected_ids <@ target_question.option_ids
     OR (target_question.question_type = 'single' AND cardinality(selected_ids) <> 1)
     OR (
       selected_ids && target_question.exclusive_option_ids
       AND cardinality(selected_ids) > 1
     ) THEN
    RAISE EXCEPTION 'feedback_option_selection_invalid' USING ERRCODE = '22023';
  END IF;

  NEW.answered_at := clock_timestamp();
  RETURN NEW;
END;
$$;

CREATE TRIGGER feedback_structured_answer_validate
BEFORE INSERT OR UPDATE ON feedback_core.structured_answers
FOR EACH ROW EXECUTE FUNCTION feedback_core.validate_structured_answer();

CREATE OR REPLACE FUNCTION feedback_raw.block_finalized_comment_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM feedback_core.submissions submission
    WHERE submission.id = NEW.submission_id AND submission.status = 'submitted'
  ) THEN
    RAISE EXCEPTION 'feedback_submission_already_finalized' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER feedback_raw_comment_block_finalized
BEFORE INSERT OR UPDATE ON feedback_raw.comments
FOR EACH ROW EXECUTE FUNCTION feedback_raw.block_finalized_comment_write();

CREATE OR REPLACE FUNCTION feedback_core.actor_context(_user_id uuid)
RETURNS TABLE(
  jurisdiction text,
  age_band text,
  product_authorization_basis text,
  product_authorized boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    policy.jurisdiction,
    participant.age_band,
    CASE
      WHEN participant.age_band = 'adult' THEN 'adult_or_not_required'
      WHEN participant.age_band = 'age_16_17' THEN 'athlete_authorized'
      WHEN participant.age_band = 'under_16' THEN 'guardian_and_athlete_authorized'
      ELSE 'unresolved'
    END,
    participant.product_status = 'authorized' AND participant.revoked_at IS NULL
  FROM minor_auth.participant_authorizations participant
  INNER JOIN minor_auth.policy_versions policy ON policy.id = participant.policy_id
  INNER JOIN feedback_core.jurisdiction_policies jurisdiction_policy
    ON jurisdiction_policy.jurisdiction = policy.jurisdiction
    AND jurisdiction_policy.structured_collection_status = 'approved'
    AND jurisdiction_policy.legal_review_reference IS NOT NULL
    AND jurisdiction_policy.approved_at IS NOT NULL
  WHERE participant.user_id = _user_id
    AND policy.status = 'active'
  ORDER BY policy.effective_from DESC
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION feedback_core.assert_rollout_and_actor(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  context_row record;
BEGIN
  IF NOT feedback_core.rollout_ready() OR NOT minor_auth.enforcement_enabled() THEN
    RAISE EXCEPTION 'feedback_collection_not_enabled' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO context_row FROM feedback_core.actor_context(_user_id);
  IF context_row.age_band IS NULL
     OR context_row.jurisdiction <> 'DE'
     OR NOT COALESCE(context_row.product_authorized, false) THEN
    RAISE EXCEPTION 'feedback_actor_policy_not_ready' USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_my_feedback_checkpoint()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := auth.uid();
  effective_today date;
  target_instance public.program_instances%ROWTYPE;
  target_campaign feedback_core.campaigns%ROWTYPE;
  existing_submission feedback_core.submissions%ROWTYPE;
  existing_state feedback_core.checkpoint_states%ROWTYPE;
  current_program_day integer;
  text_allowed boolean := false;
  context_row record;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;
  IF NOT feedback_core.rollout_ready() OR NOT minor_auth.enforcement_enabled() THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'collection_disabled');
  END IF;

  SELECT * INTO context_row FROM feedback_core.actor_context(actor_id);
  IF context_row.age_band IS NULL
     OR context_row.jurisdiction <> 'DE'
     OR NOT COALESCE(context_row.product_authorized, false) THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'actor_policy_not_ready');
  END IF;

  SELECT instance.* INTO target_instance
  FROM public.program_instances instance
  WHERE instance.user_id = actor_id AND instance.status = 'active'
  ORDER BY instance.started_at DESC, instance.created_at DESC
  LIMIT 1;
  IF target_instance.id IS NULL THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'no_active_program');
  END IF;

  effective_today := public.get_effective_today(actor_id);
  current_program_day := effective_today - target_instance.started_at + 1;

  SELECT submission.* INTO existing_submission
  FROM feedback_core.submissions submission
  WHERE submission.user_id = actor_id
    AND submission.program_instance_id = target_instance.id
    AND submission.status = 'draft'
  ORDER BY submission.started_at DESC
  LIMIT 1;

  IF existing_submission.id IS NOT NULL THEN
    SELECT campaign.* INTO target_campaign
    FROM feedback_core.campaigns campaign WHERE campaign.id = existing_submission.campaign_id;
    IF target_campaign.status <> 'active' THEN
      RETURN jsonb_build_object('eligible', false, 'reason', 'campaign_disabled');
    END IF;
  ELSE
    SELECT campaign.* INTO target_campaign
    FROM feedback_core.campaigns campaign
    WHERE campaign.checkpoint_day = current_program_day
      AND campaign.status = 'active'
      AND (campaign.available_from IS NULL OR campaign.available_from <= clock_timestamp())
      AND (campaign.available_until IS NULL OR campaign.available_until > clock_timestamp())
    LIMIT 1;
    IF target_campaign.id IS NULL THEN
      RETURN jsonb_build_object('eligible', false, 'reason', 'no_checkpoint_today');
    END IF;
  END IF;

  SELECT state_row.* INTO existing_state
  FROM feedback_core.checkpoint_states state_row
  WHERE state_row.user_id = actor_id
    AND state_row.campaign_id = target_campaign.id
    AND state_row.program_instance_id = target_instance.id;

  IF existing_submission.id IS NULL AND existing_state.id IS NOT NULL THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'already_' || existing_state.state);
  END IF;

  IF existing_submission.id IS NULL THEN
    INSERT INTO feedback_core.checkpoint_states(
      user_id, campaign_id, program_instance_id, state
    ) VALUES (actor_id, target_campaign.id, target_instance.id, 'invited');
  END IF;

  SELECT settings.text_collection_enabled INTO text_allowed
  FROM feedback_core.system_settings settings WHERE settings.singleton;
  text_allowed := text_allowed
    AND feedback_core.jurisdiction_policy_ready(context_row.jurisdiction, true);
  IF context_row.age_band = 'under_16' THEN
    text_allowed := text_allowed AND EXISTS (
      SELECT 1 FROM feedback_consent.guardian_text_authorizations guardian_scope
      WHERE guardian_scope.user_id = actor_id
        AND guardian_scope.scope = target_campaign.text_consent_scope
        AND guardian_scope.consent_version = target_campaign.text_consent_version
        AND guardian_scope.notice_hash = target_campaign.text_notice_hash
        AND guardian_scope.state = 'granted'
        AND guardian_scope.withdrawn_at IS NULL
    );
  END IF;

  RETURN jsonb_build_object(
    'eligible', true,
    'mode', CASE WHEN existing_submission.id IS NULL THEN 'invitation' ELSE 'resume' END,
    'campaign_reference', target_campaign.campaign_reference,
    'checkpoint_day', target_campaign.checkpoint_day,
    'questionnaire_version', target_campaign.questionnaire_version,
    'content_version', target_campaign.content_version,
    'questionnaire_manifest_hash', target_campaign.questionnaire_manifest_hash,
    'text_enabled', COALESCE(text_allowed, false),
    'client_submission_id', existing_submission.client_submission_id,
    'client_revision', COALESCE(existing_submission.client_revision, 0),
    'program_day', current_program_day
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.dismiss_my_feedback_checkpoint(_campaign_reference text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := auth.uid();
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;
  UPDATE feedback_core.checkpoint_states state_row
  SET state = 'dismissed', dismissed_at = clock_timestamp(), updated_at = clock_timestamp()
  FROM feedback_core.campaigns campaign
  WHERE campaign.id = state_row.campaign_id
    AND campaign.campaign_reference = _campaign_reference
    AND state_row.user_id = actor_id
    AND state_row.state = 'invited';
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.start_my_feedback_submission(
  _campaign_reference text,
  _client_submission_id uuid,
  _product_version text,
  _content_version text,
  _questionnaire_manifest_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := auth.uid();
  target_campaign feedback_core.campaigns%ROWTYPE;
  target_state feedback_core.checkpoint_states%ROWTYPE;
  target_instance public.program_instances%ROWTYPE;
  target_submission feedback_core.submissions%ROWTYPE;
  subject_ref uuid;
  context_row record;
BEGIN
  IF actor_id IS NULL OR _client_submission_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;
  PERFORM feedback_core.assert_rollout_and_actor(actor_id);
  IF _product_version !~ '^(unknown|[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}(\+[0-9]{1,10})?)$' THEN
    RAISE EXCEPTION 'feedback_product_version_invalid' USING ERRCODE = '22023';
  END IF;

  SELECT campaign.* INTO target_campaign
  FROM feedback_core.campaigns campaign
  WHERE campaign.campaign_reference = _campaign_reference
    AND campaign.status = 'active';
  IF target_campaign.id IS NULL
     OR target_campaign.content_version <> _content_version
     OR target_campaign.questionnaire_manifest_hash <> _questionnaire_manifest_hash THEN
    RAISE EXCEPTION 'feedback_campaign_contract_mismatch' USING ERRCODE = '22023';
  END IF;

  SELECT state_row.* INTO target_state
  FROM feedback_core.checkpoint_states state_row
  INNER JOIN public.program_instances instance
    ON instance.id = state_row.program_instance_id
    AND instance.user_id = actor_id
    AND instance.status = 'active'
  WHERE state_row.user_id = actor_id AND state_row.campaign_id = target_campaign.id
    AND state_row.state IN ('invited', 'started')
  ORDER BY state_row.updated_at DESC LIMIT 1
  FOR UPDATE;
  IF target_state.id IS NULL THEN
    RAISE EXCEPTION 'feedback_checkpoint_not_claimed' USING ERRCODE = '42501';
  END IF;

  SELECT instance.* INTO target_instance
  FROM public.program_instances instance
  WHERE instance.id = target_state.program_instance_id
    AND instance.user_id = actor_id AND instance.status = 'active';
  IF target_instance.id IS NULL THEN
    RAISE EXCEPTION 'feedback_program_instance_invalid' USING ERRCODE = '42501';
  END IF;

  SELECT submission.* INTO target_submission
  FROM feedback_core.submissions submission
  WHERE submission.user_id = actor_id
    AND submission.campaign_id = target_campaign.id
    AND submission.program_instance_id = target_instance.id
  FOR UPDATE;
  IF target_submission.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', target_submission.status,
      'client_submission_id', target_submission.client_submission_id,
      'feedback_reference', target_submission.feedback_reference,
      'client_revision', target_submission.client_revision,
      'idempotent', true
    );
  END IF;

  INSERT INTO feedback_core.subject_links(user_id, program_instance_id)
  VALUES (actor_id, target_instance.id)
  ON CONFLICT (user_id, program_instance_id) DO NOTHING;
  SELECT link.subject_reference INTO subject_ref
  FROM feedback_core.subject_links link
  WHERE link.user_id = actor_id
    AND link.program_instance_id = target_instance.id;
  SELECT * INTO context_row FROM feedback_core.actor_context(actor_id);

  INSERT INTO feedback_core.submissions(
    client_submission_id, campaign_id, user_id, subject_reference,
    program_instance_id, questionnaire_version, language, product_version,
    content_version, program_day, jurisdiction_at_submit, age_band_at_submit,
    product_authorization_basis
  ) VALUES (
    _client_submission_id, target_campaign.id, actor_id, subject_ref,
    target_instance.id, target_campaign.questionnaire_version, target_campaign.language,
    _product_version, target_campaign.content_version, target_campaign.checkpoint_day,
    context_row.jurisdiction, context_row.age_band, context_row.product_authorization_basis
  ) RETURNING * INTO target_submission;

  UPDATE feedback_core.checkpoint_states state_row
  SET state = 'started', started_at = COALESCE(state_row.started_at, clock_timestamp()),
      updated_at = clock_timestamp()
  WHERE state_row.id = target_state.id;

  RETURN jsonb_build_object(
    'status', 'draft', 'client_submission_id', target_submission.client_submission_id,
    'feedback_reference', target_submission.feedback_reference,
    'client_revision', 0, 'idempotent', false
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_feedback_draft(_client_submission_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := auth.uid();
  target_submission feedback_core.submissions%ROWTYPE;
  answer_payload jsonb;
  comment_payload jsonb;
  consent_state text := 'not_asked';
BEGIN
  IF actor_id IS NULL THEN RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501'; END IF;
  PERFORM feedback_core.assert_rollout_and_actor(actor_id);
  SELECT submission.* INTO target_submission FROM feedback_core.submissions submission
  WHERE submission.user_id = actor_id AND submission.client_submission_id = _client_submission_id;
  IF target_submission.id IS NULL THEN RAISE EXCEPTION 'feedback_submission_not_found' USING ERRCODE = '42501'; END IF;

  SELECT COALESCE(jsonb_object_agg(question.question_id, answer.selected_option_ids), '{}'::jsonb)
  INTO answer_payload
  FROM feedback_core.structured_answers answer
  INNER JOIN feedback_core.question_definitions question ON question.id = answer.question_definition_id
  WHERE answer.submission_id = target_submission.id;

  SELECT COALESCE(receipt.state, 'not_asked') INTO consent_state
  FROM feedback_consent.text_consent_receipts receipt WHERE receipt.submission_id = target_submission.id;
  SELECT COALESCE(jsonb_object_agg(comment.question_id, comment.raw_text), '{}'::jsonb)
  INTO comment_payload FROM feedback_raw.comments comment
  INNER JOIN feedback_consent.text_consent_receipts receipt ON receipt.id = comment.consent_receipt_id
  WHERE comment.submission_id = target_submission.id
    AND receipt.state = 'granted' AND receipt.withdrawn_at IS NULL;

  RETURN jsonb_build_object(
    'status', target_submission.status, 'client_revision', target_submission.client_revision,
    'answers', COALESCE(answer_payload, '{}'::jsonb),
    'comments', COALESCE(comment_payload, '{}'::jsonb), 'text_consent_state', consent_state,
    'resume_screen', target_submission.resume_screen,
    'resume_question_id', target_submission.resume_question_id,
    'passed_question_ids', to_jsonb(target_submission.passed_question_ids)
  );
END;
$$;

CREATE OR REPLACE FUNCTION feedback_core.persist_submission_payload(
  _actor_id uuid,
  _client_submission_id uuid,
  _client_revision integer,
  _client_mutation_id uuid,
  _answers jsonb,
  _comments jsonb,
  _text_consent_state text,
  _guardian_authorization_reference uuid,
  _resume_screen text,
  _resume_question_id text,
  _passed_question_ids text[],
  _finalize boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_submission feedback_core.submissions%ROWTYPE;
  target_campaign feedback_core.campaigns%ROWTYPE;
  target_question feedback_core.question_definitions%ROWTYPE;
  target_receipt feedback_consent.text_consent_receipts%ROWTYPE;
  answer_row record;
  comment_row record;
  selected_ids text[];
BEGIN
  SELECT submission.* INTO target_submission
  FROM feedback_core.submissions submission
  WHERE submission.user_id = _actor_id AND submission.client_submission_id = _client_submission_id
  FOR UPDATE;
  IF target_submission.id IS NULL THEN RAISE EXCEPTION 'feedback_submission_not_found' USING ERRCODE = '42501'; END IF;
  IF target_submission.status = 'submitted' THEN
    RETURN jsonb_build_object('status', 'submitted', 'feedback_reference', target_submission.feedback_reference,
      'client_revision', target_submission.client_revision, 'idempotent', true);
  END IF;
  IF _client_revision < target_submission.client_revision THEN
    RETURN jsonb_build_object('status', 'draft', 'feedback_reference', target_submission.feedback_reference,
      'client_revision', target_submission.client_revision, 'stale_ignored', true);
  END IF;
  IF _client_revision = target_submission.client_revision THEN
    IF target_submission.last_client_mutation_id = _client_mutation_id THEN
      RETURN jsonb_build_object('status', 'draft', 'feedback_reference', target_submission.feedback_reference,
        'client_revision', target_submission.client_revision, 'idempotent', true);
    END IF;
    RAISE EXCEPTION 'feedback_client_revision_conflict' USING ERRCODE = '40001';
  END IF;
  IF _client_revision < 1 OR _client_mutation_id IS NULL
     OR jsonb_typeof(_answers) <> 'object' OR jsonb_typeof(_comments) <> 'object'
     OR _text_consent_state NOT IN ('not_asked', 'declined', 'granted')
     OR _resume_screen NOT IN ('intro', 'questions', 'closing') THEN
    RAISE EXCEPTION 'feedback_payload_invalid' USING ERRCODE = '22023';
  END IF;

  SELECT campaign.* INTO target_campaign FROM feedback_core.campaigns campaign
  WHERE campaign.id = target_submission.campaign_id AND campaign.status = 'active';
  IF target_campaign.id IS NULL THEN RAISE EXCEPTION 'feedback_campaign_disabled' USING ERRCODE = '42501'; END IF;

  IF _resume_question_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM feedback_core.question_definitions question
    WHERE question.campaign_id = target_campaign.id AND question.question_id = _resume_question_id
  ) THEN RAISE EXCEPTION 'feedback_resume_question_invalid' USING ERRCODE = '22023'; END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(COALESCE(_passed_question_ids, '{}'::text[])) passed_id
    WHERE NOT EXISTS (
      SELECT 1 FROM feedback_core.question_definitions question
      WHERE question.campaign_id = target_campaign.id AND question.question_id = passed_id
    )
  ) THEN RAISE EXCEPTION 'feedback_passed_question_invalid' USING ERRCODE = '22023'; END IF;

  FOR answer_row IN SELECT key AS question_id, value AS selected FROM jsonb_each(_answers) LOOP
    SELECT question.* INTO target_question FROM feedback_core.question_definitions question
    WHERE question.campaign_id = target_campaign.id AND question.question_id = answer_row.question_id;
    IF target_question.id IS NULL OR jsonb_typeof(answer_row.selected) <> 'array'
       OR jsonb_array_length(answer_row.selected) = 0
       OR EXISTS (SELECT 1 FROM jsonb_array_elements(answer_row.selected) item WHERE jsonb_typeof(item) <> 'string') THEN
      RAISE EXCEPTION 'feedback_answer_invalid:%', answer_row.question_id USING ERRCODE = '22023';
    END IF;
    SELECT array_agg(value) INTO selected_ids FROM jsonb_array_elements_text(answer_row.selected) value;
    IF cardinality(selected_ids) <> (SELECT COUNT(DISTINCT item)::integer FROM unnest(selected_ids) item)
       OR NOT selected_ids <@ target_question.option_ids
       OR (target_question.question_type = 'single' AND cardinality(selected_ids) <> 1)
       OR (selected_ids && target_question.exclusive_option_ids AND cardinality(selected_ids) > 1) THEN
      RAISE EXCEPTION 'feedback_option_selection_invalid:%', answer_row.question_id USING ERRCODE = '22023';
    END IF;
    IF target_question.visibility_question_id IS NOT NULL
       AND NOT COALESCE((_answers -> target_question.visibility_question_id) ?| target_question.visibility_option_ids, false) THEN
      RAISE EXCEPTION 'feedback_conditional_answer_not_visible:%', answer_row.question_id USING ERRCODE = '22023';
    END IF;
  END LOOP;

  DELETE FROM feedback_core.structured_answers answer WHERE answer.submission_id = target_submission.id;
  INSERT INTO feedback_core.structured_answers(submission_id, question_definition_id, selected_option_ids)
  SELECT target_submission.id, question.id, snapshot_entry.value
  FROM jsonb_each(_answers) snapshot_entry
  INNER JOIN feedback_core.question_definitions question
    ON question.campaign_id = target_campaign.id AND question.question_id = snapshot_entry.key;

  SELECT receipt.* INTO target_receipt FROM feedback_consent.text_consent_receipts receipt
  WHERE receipt.submission_id = target_submission.id FOR UPDATE;
  IF _text_consent_state = 'granted' THEN
    IF NOT EXISTS (
      SELECT 1 FROM feedback_core.system_settings settings
      WHERE settings.singleton AND settings.text_collection_enabled
    ) THEN RAISE EXCEPTION 'feedback_text_collection_disabled' USING ERRCODE = '42501'; END IF;
    IF target_receipt.id IS NULL THEN
      INSERT INTO feedback_consent.text_consent_receipts(
        submission_id, user_id, state, scope, consent_version, notice_hash,
        guardian_authorization_reference, granted_at
      ) VALUES (
        target_submission.id, _actor_id, 'granted', target_campaign.text_consent_scope,
        target_campaign.text_consent_version, target_campaign.text_notice_hash,
        _guardian_authorization_reference, clock_timestamp()
      ) RETURNING * INTO target_receipt;
      INSERT INTO feedback_consent.audit_events(
        user_id, submission_id, consent_reference, actor_type, event_type,
        scope, consent_version, notice_hash
      ) VALUES (_actor_id, target_submission.id, target_receipt.consent_reference, 'athlete',
        'text_consent_granted', target_receipt.scope, target_receipt.consent_version, target_receipt.notice_hash);
    ELSIF target_receipt.state <> 'granted' OR target_receipt.withdrawn_at IS NOT NULL THEN
      RAISE EXCEPTION 'feedback_text_consent_new_submission_required' USING ERRCODE = '42501';
    END IF;

    FOR comment_row IN SELECT key AS question_id, value AS raw_value FROM jsonb_each(_comments) LOOP
      IF jsonb_typeof(comment_row.raw_value) <> 'string'
         OR char_length(btrim(comment_row.raw_value #>> '{}')) NOT BETWEEN 1 AND 1200
         OR (comment_row.question_id <> '__closing_comment__' AND NOT EXISTS (
           SELECT 1 FROM feedback_core.question_definitions question
           WHERE question.campaign_id = target_campaign.id
             AND question.question_id = comment_row.question_id AND question.optional_comment
         )) THEN RAISE EXCEPTION 'feedback_comment_invalid:%', comment_row.question_id USING ERRCODE = '22023'; END IF;
    END LOOP;
    DELETE FROM feedback_raw.comments comment WHERE comment.submission_id = target_submission.id;
    INSERT INTO feedback_raw.comments(submission_id, question_id, consent_receipt_id, raw_text)
    SELECT target_submission.id, comment_entry.key, target_receipt.id, comment_entry.value #>> '{}'
    FROM jsonb_each(_comments) comment_entry;
  ELSE
    IF _comments <> '{}'::jsonb THEN RAISE EXCEPTION 'feedback_text_consent_required' USING ERRCODE = '42501'; END IF;
    IF target_receipt.state = 'granted' AND target_receipt.withdrawn_at IS NULL THEN
      RAISE EXCEPTION 'feedback_text_withdrawal_required' USING ERRCODE = '42501';
    END IF;
    IF _text_consent_state = 'declined' AND target_receipt.id IS NULL THEN
      INSERT INTO feedback_consent.text_consent_receipts(
        submission_id, user_id, state, scope, consent_version, notice_hash
      ) VALUES (target_submission.id, _actor_id, 'declined', target_campaign.text_consent_scope,
        target_campaign.text_consent_version, target_campaign.text_notice_hash)
      RETURNING * INTO target_receipt;
      INSERT INTO feedback_consent.audit_events(
        user_id, submission_id, consent_reference, actor_type, event_type,
        scope, consent_version, notice_hash
      ) VALUES (_actor_id, target_submission.id, target_receipt.consent_reference, 'athlete',
        'text_consent_declined', target_receipt.scope, target_receipt.consent_version, target_receipt.notice_hash);
    END IF;
  END IF;

  UPDATE feedback_core.submissions submission SET
    client_revision = _client_revision, last_client_mutation_id = _client_mutation_id,
    resume_screen = _resume_screen, resume_question_id = _resume_question_id,
    passed_question_ids = COALESCE(_passed_question_ids, '{}'::text[]),
    status = CASE WHEN _finalize THEN 'submitted' ELSE 'draft' END,
    submitted_at = CASE WHEN _finalize THEN clock_timestamp() ELSE NULL END
  WHERE submission.id = target_submission.id
  RETURNING * INTO target_submission;

  IF _finalize THEN
    UPDATE feedback_core.checkpoint_states state_row SET
      state = 'submitted', submitted_at = target_submission.submitted_at,
      updated_at = clock_timestamp()
    WHERE state_row.user_id = _actor_id AND state_row.campaign_id = target_campaign.id
      AND state_row.program_instance_id = target_submission.program_instance_id;
  END IF;

  RETURN jsonb_build_object('status', target_submission.status,
    'feedback_reference', target_submission.feedback_reference,
    'client_revision', target_submission.client_revision, 'idempotent', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.save_my_feedback_draft(
  _client_submission_id uuid, _client_revision integer, _client_mutation_id uuid,
  _answers jsonb, _comments jsonb, _text_consent_state text,
  _guardian_authorization_reference uuid, _resume_screen text,
  _resume_question_id text, _passed_question_ids text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE actor_id uuid := auth.uid();
BEGIN
  IF actor_id IS NULL THEN RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501'; END IF;
  PERFORM feedback_core.assert_rollout_and_actor(actor_id);
  RETURN feedback_core.persist_submission_payload(actor_id, _client_submission_id,
    _client_revision, _client_mutation_id, _answers, _comments, _text_consent_state,
    _guardian_authorization_reference, _resume_screen, _resume_question_id,
    _passed_question_ids, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_my_feedback(
  _client_submission_id uuid, _client_revision integer, _client_mutation_id uuid,
  _answers jsonb, _comments jsonb, _text_consent_state text,
  _guardian_authorization_reference uuid, _resume_screen text,
  _resume_question_id text, _passed_question_ids text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE actor_id uuid := auth.uid();
BEGIN
  IF actor_id IS NULL THEN RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501'; END IF;
  PERFORM feedback_core.assert_rollout_and_actor(actor_id);
  RETURN feedback_core.persist_submission_payload(actor_id, _client_submission_id,
    _client_revision, _client_mutation_id, _answers, _comments, _text_consent_state,
    _guardian_authorization_reference, _resume_screen, _resume_question_id,
    _passed_question_ids, true);
END;
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA feedback_core
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA feedback_raw
  FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.claim_my_feedback_checkpoint() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.dismiss_my_feedback_checkpoint(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.start_my_feedback_submission(text, uuid, text, text, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_my_feedback_draft(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.save_my_feedback_draft(uuid, integer, uuid, jsonb, jsonb, text, uuid, text, text, text[]) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.submit_my_feedback(uuid, integer, uuid, jsonb, jsonb, text, uuid, text, text, text[]) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.claim_my_feedback_checkpoint() TO authenticated;
GRANT EXECUTE ON FUNCTION public.dismiss_my_feedback_checkpoint(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_my_feedback_submission(text, uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_feedback_draft(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_my_feedback_draft(uuid, integer, uuid, jsonb, jsonb, text, uuid, text, text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_my_feedback(uuid, integer, uuid, jsonb, jsonb, text, uuid, text, text, text[]) TO authenticated;

COMMENT ON TABLE feedback_core.system_settings IS
  'Fail-closed rollout gates. All values remain false until independent privacy, minor and App Store approvals.';
COMMENT ON FUNCTION public.claim_my_feedback_checkpoint() IS
  'Claims at most one exact calendar-day checkpoint invitation or returns an existing draft for resume.';
COMMENT ON FUNCTION public.save_my_feedback_draft(uuid, integer, uuid, jsonb, jsonb, text, uuid, text, text, text[]) IS
  'Monotonic, idempotent structured draft save. Raw text is accepted only with exact valid consent.';
COMMENT ON FUNCTION public.submit_my_feedback(uuid, integer, uuid, jsonb, jsonb, text, uuid, text, text, text[]) IS
  'Atomic idempotent finalization; stale retries cannot overwrite newer client revisions.';

COMMIT;
