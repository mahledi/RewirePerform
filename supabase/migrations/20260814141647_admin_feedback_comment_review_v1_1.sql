-- Admin-only review surface for voluntary Feedback Intelligence comments.
--
-- This is deliberately additive and does not activate collection, change the
-- athlete/Guardian consent flow, grant direct table access, or open Jarvis.
-- The RPC revalidates consent and the under-16 Guardian scope at read time,
-- returns no direct user/team/coach identifiers, and records access metadata
-- without copying raw text or pseudonymous subject references into the log.

BEGIN;

CREATE TABLE feedback_analysis.admin_comment_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_reference uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  purpose text NOT NULL
    CHECK (purpose = 'pilot_product_feedback_review'),
  data_scope text NOT NULL
    CHECK (data_scope IN ('production', 'synthetic')),
  checkpoint_day smallint
    CHECK (checkpoint_day IS NULL OR checkpoint_day IN (10, 24, 39, 55)),
  requested_page_size smallint NOT NULL
    CHECK (requested_page_size BETWEEN 1 AND 50),
  returned_count smallint NOT NULL
    CHECK (returned_count BETWEEN 0 AND 50),
  accessed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX feedback_admin_comment_access_actor_time_idx
  ON feedback_analysis.admin_comment_access_log(actor_id, accessed_at DESC);

ALTER TABLE feedback_analysis.admin_comment_access_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE feedback_analysis.admin_comment_access_log
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION feedback_analysis.reject_admin_comment_access_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'feedback_admin_comment_access_log_is_append_only'
    USING ERRCODE = '42501';
END;
$$;

CREATE TRIGGER feedback_admin_comment_access_log_append_only
BEFORE UPDATE OR DELETE ON feedback_analysis.admin_comment_access_log
FOR EACH ROW
EXECUTE FUNCTION feedback_analysis.reject_admin_comment_access_log_mutation();

CREATE OR REPLACE FUNCTION public.get_admin_feedback_comment_page(
  _purpose text,
  _data_scope text DEFAULT 'production',
  _checkpoint_day integer DEFAULT NULL,
  _before_submitted_at timestamptz DEFAULT NULL,
  _before_comment_id uuid DEFAULT NULL,
  _page_size integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := auth.uid();
  request_reference uuid := gen_random_uuid();
  payload jsonb;
  returned_count integer;
  retention_days constant integer := 365;
BEGIN
  IF actor_id IS NULL
     OR NOT public.has_role(actor_id, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'admin_role_required' USING ERRCODE = '42501';
  END IF;

  IF _purpose IS DISTINCT FROM 'pilot_product_feedback_review' THEN
    RAISE EXCEPTION 'feedback_admin_review_purpose_invalid' USING ERRCODE = '22023';
  END IF;
  IF _data_scope IS NULL OR _data_scope NOT IN ('production', 'synthetic') THEN
    RAISE EXCEPTION 'feedback_admin_data_scope_invalid' USING ERRCODE = '22023';
  END IF;
  IF _checkpoint_day IS NOT NULL AND _checkpoint_day NOT IN (10, 24, 39, 55) THEN
    RAISE EXCEPTION 'feedback_admin_checkpoint_invalid' USING ERRCODE = '22023';
  END IF;
  IF _page_size IS NULL OR _page_size < 1 OR _page_size > 50 THEN
    RAISE EXCEPTION 'feedback_admin_page_size_invalid' USING ERRCODE = '22023';
  END IF;
  IF (_before_submitted_at IS NULL) <> (_before_comment_id IS NULL) THEN
    RAISE EXCEPTION 'feedback_admin_cursor_incomplete' USING ERRCODE = '22023';
  END IF;

  WITH eligible_comments AS MATERIALIZED (
    SELECT
      comment.id AS comment_id,
      comment.submitted_at,
      submission.subject_reference,
      submission.program_day,
      submission.age_band_at_submit,
      campaign.campaign_reference,
      campaign.questionnaire_version,
      campaign.questionnaire_manifest_hash,
      campaign.content_version,
      comment.question_id,
      COALESCE(answer.selected_option_ids, '[]'::jsonb) AS selected_option_ids,
      comment.raw_text,
      activity.submission_id IS NOT NULL AS activity_snapshot_available,
      activity.program_days_available,
      activity.program_days_completed,
      activity.checkins_completed,
      activity.journal_entries_created_count,
      activity.tasks_completed,
      activity.transfer_pulse_count,
      activity.resume_delay_bucket,
      activity.continuation_status_bucket
    FROM feedback_raw.comments comment
    INNER JOIN feedback_core.submissions submission
      ON submission.id = comment.submission_id
    INNER JOIN feedback_core.campaigns campaign
      ON campaign.id = submission.campaign_id
    INNER JOIN feedback_consent.text_consent_receipts receipt
      ON receipt.id = comment.consent_receipt_id
      AND receipt.submission_id = submission.id
      AND receipt.user_id = submission.user_id
    INNER JOIN public.profiles profile
      ON profile.id = submission.user_id
    INNER JOIN public.program_instances instance
      ON instance.id = submission.program_instance_id
      AND instance.user_id = submission.user_id
    LEFT JOIN feedback_core.question_definitions question
      ON question.campaign_id = campaign.id
      AND question.question_id = comment.question_id
    LEFT JOIN feedback_core.structured_answers answer
      ON answer.submission_id = submission.id
      AND answer.question_definition_id = question.id
    LEFT JOIN feedback_core.activity_snapshots activity
      ON activity.submission_id = submission.id
    WHERE submission.status = 'submitted'
      AND submission.submitted_at IS NOT NULL
      AND submission.jurisdiction_at_submit = 'DE'
      AND submission.age_band_at_submit IN ('under_16', 'age_16_17', 'adult')
      AND submission.program_day = campaign.checkpoint_day
      AND submission.questionnaire_version = campaign.questionnaire_version
      AND submission.content_version = campaign.content_version
      AND (
        comment.question_id = '__closing_comment__'
        OR (question.id IS NOT NULL AND question.optional_comment)
      )
      AND receipt.state = 'granted'
      AND receipt.granted_at IS NOT NULL
      AND receipt.withdrawn_at IS NULL
      AND receipt.scope = campaign.text_consent_scope
      AND receipt.consent_version = campaign.text_consent_version
      AND receipt.notice_hash = campaign.text_notice_hash
      AND comment.submitted_at >= pg_catalog.clock_timestamp()
        - pg_catalog.make_interval(days => retention_days)
      AND (
        submission.age_band_at_submit <> 'under_16'
        OR (
          receipt.minor_gate_state = 'guardian_scope_granted'
          AND receipt.guardian_authorization_reference IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM feedback_consent.guardian_text_authorizations guardian
            WHERE guardian.consent_reference = receipt.guardian_authorization_reference
              AND guardian.user_id = submission.user_id
              AND guardian.scope = receipt.scope
              AND guardian.consent_version = receipt.consent_version
              AND guardian.notice_hash = receipt.notice_hash
              AND guardian.state = 'granted'
              AND guardian.granted_at IS NOT NULL
              AND guardian.withdrawn_at IS NULL
          )
        )
      )
      AND (
        (
          _data_scope = 'production'
          AND NOT COALESCE(profile.is_test_user, false)
          AND NOT COALESCE(instance.is_test_instance, false)
        )
        OR (
          _data_scope = 'synthetic'
          AND COALESCE(profile.is_test_user, false)
          AND COALESCE(instance.is_test_instance, false)
        )
      )
      AND (_checkpoint_day IS NULL OR submission.program_day = _checkpoint_day)
      AND (
        _before_submitted_at IS NULL
        OR (comment.submitted_at, comment.id) < (_before_submitted_at, _before_comment_id)
      )
  ), page_plus_one AS MATERIALIZED (
    SELECT *
    FROM eligible_comments
    ORDER BY submitted_at DESC, comment_id DESC
    LIMIT _page_size + 1
  ), visible_page AS MATERIALIZED (
    SELECT *
    FROM page_plus_one
    ORDER BY submitted_at DESC, comment_id DESC
    LIMIT _page_size
  )
  SELECT pg_catalog.jsonb_build_object(
    'schema_version', 'admin-feedback-comment-page-v1.1',
    'access_request_reference', request_reference,
    'generated_at', pg_catalog.clock_timestamp(),
    'data_scope', _data_scope,
    'checkpoint_day', _checkpoint_day,
    'returned_count', (SELECT COUNT(*)::integer FROM visible_page),
    'has_more', (SELECT COUNT(*) FROM page_plus_one) > _page_size,
    'next_cursor', CASE
      WHEN (SELECT COUNT(*) FROM page_plus_one) > _page_size THEN (
        SELECT pg_catalog.jsonb_build_object(
          'submitted_at', page.submitted_at,
          'comment_id', page.comment_id
        )
        FROM visible_page page
        ORDER BY page.submitted_at ASC, page.comment_id ASC
        LIMIT 1
      )
      ELSE NULL
    END,
    'items', COALESCE((
      SELECT pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'comment_id', page.comment_id,
          'subject_reference', page.subject_reference,
          'submitted_at', page.submitted_at,
          'program_day', page.program_day,
          'campaign_reference', page.campaign_reference,
          'questionnaire_version', page.questionnaire_version,
          'questionnaire_manifest_hash', page.questionnaire_manifest_hash,
          'content_version', page.content_version,
          'question_id', page.question_id,
          'selected_option_ids', page.selected_option_ids,
          'comment', page.raw_text,
          'authorization', pg_catalog.jsonb_build_object(
            'consent_valid_at_read', true,
            'guardian_required', page.age_band_at_submit = 'under_16',
            'retention_days', retention_days
          ),
          'activity_snapshot', CASE
            WHEN page.activity_snapshot_available THEN pg_catalog.jsonb_build_object(
              'program_days_available', page.program_days_available,
              'program_days_completed', page.program_days_completed,
              'checkins_completed', page.checkins_completed,
              'journal_entries_created_count', page.journal_entries_created_count,
              'tasks_completed', page.tasks_completed,
              'transfer_pulse_count', page.transfer_pulse_count,
              'resume_delay_bucket', page.resume_delay_bucket,
              'continuation_status_bucket', page.continuation_status_bucket
            )
            ELSE NULL
          END
        )
        ORDER BY page.submitted_at DESC, page.comment_id DESC
      )
      FROM visible_page page
    ), '[]'::jsonb),
    'privacy', pg_catalog.jsonb_build_object(
      'purpose', _purpose,
      'admin_role_required', true,
      'direct_table_access_granted', false,
      'consent_revalidated_at_read', true,
      'guardian_revalidated_for_under_16', true,
      'journal_or_reflection_text_included', false,
      'support_text_included', false,
      'names_emails_user_team_or_coach_ids_included', false,
      'jarvis_raw_text_access_included', false,
      'raw_text_logged', false
    )
  ) INTO payload;

  returned_count := COALESCE((payload ->> 'returned_count')::integer, 0);

  INSERT INTO feedback_analysis.admin_comment_access_log(
    request_reference,
    actor_id,
    purpose,
    data_scope,
    checkpoint_day,
    requested_page_size,
    returned_count
  ) VALUES (
    request_reference,
    actor_id,
    _purpose,
    _data_scope,
    _checkpoint_day,
    _page_size,
    returned_count
  );

  RETURN payload;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_feedback_comment_page(
  text, text, integer, timestamptz, uuid, integer
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_feedback_comment_page(
  text, text, integer, timestamptz, uuid, integer
) TO authenticated;

REVOKE ALL ON FUNCTION feedback_analysis.reject_admin_comment_access_log_mutation()
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON TABLE feedback_analysis.admin_comment_access_log IS
  'Append-only audit metadata for admin review of consent-valid voluntary questionnaire comments. Contains no raw text or subject reference.';
COMMENT ON FUNCTION public.get_admin_feedback_comment_page(
  text, text, integer, timestamptz, uuid, integer
) IS
  'Admin-only, purpose-bound, cursor-paginated read of consent-valid voluntary product-feedback comments. Revalidates under-16 Guardian scope and returns no direct identities or private journal/support text.';

COMMIT;
