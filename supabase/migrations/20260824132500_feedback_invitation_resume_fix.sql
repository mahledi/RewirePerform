-- Keep an open feedback invitation claimable across route remounts and app
-- lifecycle changes. Only terminal/non-open checkpoint states close the gate.

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

  IF existing_submission.id IS NULL
     AND existing_state.id IS NOT NULL
     AND existing_state.state <> 'invited' THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'already_' || existing_state.state);
  END IF;

  IF existing_submission.id IS NULL AND existing_state.id IS NULL THEN
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

COMMENT ON FUNCTION public.claim_my_feedback_checkpoint() IS
  'Claims or resumes the authenticated athlete feedback checkpoint; open invitations remain claimable until dismissed, started, or completed.';
