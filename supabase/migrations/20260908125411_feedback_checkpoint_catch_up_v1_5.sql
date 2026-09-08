-- Feedback checkpoint catch-up for V1.5.
--
-- Athletes can claim the oldest still-open checkpoint after its scheduled
-- program day. "Remind me later" pauses that invitation for 20 hours; an
-- explicit skip remains terminal for that one checkpoint. The questionnaire
-- and immutable activity snapshot keep the scheduled checkpoint day so a late
-- response is not silently re-labelled as an on-time measurement.

BEGIN;

ALTER TABLE feedback_core.checkpoint_states
  ADD COLUMN remind_after timestamptz;

COMMENT ON COLUMN feedback_core.checkpoint_states.remind_after IS
  'Earliest time an invited checkpoint may be shown again after the athlete chose remind me later.';

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

  -- A started questionnaire always wins, even after its scheduled day.
  SELECT submission.* INTO existing_submission
  FROM feedback_core.submissions submission
  WHERE submission.user_id = actor_id
    AND submission.program_instance_id = target_instance.id
    AND submission.status = 'draft'
  ORDER BY submission.started_at DESC
  LIMIT 1;

  IF existing_submission.id IS NOT NULL THEN
    SELECT campaign.* INTO target_campaign
    FROM feedback_core.campaigns campaign
    WHERE campaign.id = existing_submission.campaign_id;
    IF target_campaign.status <> 'active' THEN
      RETURN jsonb_build_object('eligible', false, 'reason', 'campaign_disabled');
    END IF;
  ELSE
    -- Claim the oldest due checkpoint that was neither submitted nor
    -- explicitly skipped. An invited-but-deferred checkpoint stays first in
    -- line so later checkpoints cannot overtake it.
    SELECT campaign.* INTO target_campaign
    FROM feedback_core.campaigns campaign
    WHERE campaign.checkpoint_day <= current_program_day
      AND campaign.status = 'active'
      AND (campaign.available_from IS NULL OR campaign.available_from <= clock_timestamp())
      AND (campaign.available_until IS NULL OR campaign.available_until > clock_timestamp())
      AND NOT EXISTS (
        SELECT 1
        FROM feedback_core.checkpoint_states terminal_state
        WHERE terminal_state.user_id = actor_id
          AND terminal_state.program_instance_id = target_instance.id
          AND terminal_state.campaign_id = campaign.id
          AND terminal_state.state IN ('dismissed', 'started', 'submitted')
      )
    ORDER BY campaign.checkpoint_day ASC, campaign.created_at ASC, campaign.id ASC
    LIMIT 1;
    IF target_campaign.id IS NULL THEN
      RETURN jsonb_build_object('eligible', false, 'reason', 'no_checkpoint_available');
    END IF;
  END IF;

  SELECT state_row.* INTO existing_state
  FROM feedback_core.checkpoint_states state_row
  WHERE state_row.user_id = actor_id
    AND state_row.campaign_id = target_campaign.id
    AND state_row.program_instance_id = target_instance.id;

  IF existing_submission.id IS NULL AND existing_state.id IS NULL THEN
    INSERT INTO feedback_core.checkpoint_states(
      user_id, campaign_id, program_instance_id, state
    ) VALUES (actor_id, target_campaign.id, target_instance.id, 'invited')
    ON CONFLICT (user_id, campaign_id, program_instance_id) DO NOTHING;

    -- Re-read after the idempotent insert so a concurrent claim, defer, start,
    -- submit, or skip can never be overwritten or ignored.
    SELECT state_row.* INTO existing_state
    FROM feedback_core.checkpoint_states state_row
    WHERE state_row.user_id = actor_id
      AND state_row.campaign_id = target_campaign.id
      AND state_row.program_instance_id = target_instance.id;
  END IF;

  IF existing_submission.id IS NULL
     AND existing_state.id IS NOT NULL
     AND existing_state.state <> 'invited' THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'already_' || existing_state.state);
  END IF;

  IF existing_submission.id IS NULL
     AND existing_state.id IS NOT NULL
     AND existing_state.remind_after IS NOT NULL
     AND existing_state.remind_after > clock_timestamp() THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'checkpoint_deferred',
      'remind_after', existing_state.remind_after
    );
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
    'program_day', current_program_day,
    'is_overdue', current_program_day > target_campaign.checkpoint_day,
    'days_overdue', GREATEST(0, current_program_day - target_campaign.checkpoint_day)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.defer_my_feedback_checkpoint(_campaign_reference text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := auth.uid();
  deferred_until timestamptz;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  UPDATE feedback_core.checkpoint_states state_row
  SET remind_after = clock_timestamp() + interval '20 hours',
      updated_at = clock_timestamp()
  FROM feedback_core.campaigns campaign
  WHERE campaign.id = state_row.campaign_id
    AND campaign.campaign_reference = _campaign_reference
    AND state_row.user_id = actor_id
    AND state_row.state = 'invited'
  RETURNING state_row.remind_after INTO deferred_until;

  IF deferred_until IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'checkpoint_not_open');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'state', 'invited',
    'remind_after', deferred_until
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_my_feedback_checkpoint()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.defer_my_feedback_checkpoint(text)
  FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.claim_my_feedback_checkpoint() TO authenticated;
GRANT EXECUTE ON FUNCTION public.defer_my_feedback_checkpoint(text) TO authenticated;

COMMENT ON FUNCTION public.claim_my_feedback_checkpoint() IS
  'Claims or resumes the oldest due athlete feedback checkpoint; started drafts persist, reminder deferrals pause re-prompting, and explicit skips remain terminal.';
COMMENT ON FUNCTION public.defer_my_feedback_checkpoint(text) IS
  'Defers one open feedback invitation for 20 hours without treating the athlete choice as a permanent skip.';

COMMIT;
