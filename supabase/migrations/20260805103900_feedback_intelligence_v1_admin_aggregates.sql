-- Feedback Intelligence v1.1 fixed admin aggregates.
--
-- Returns only thresholded, predetermined aggregate shapes. It has no arbitrary
-- user/team filters, no individual rows, no raw text, no names, and no direct
-- identifiers. Production and fully synthetic data are separate scopes and can
-- never be mixed by this contract.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_admin_feedback_intelligence_insights(
  _data_scope text DEFAULT 'production'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := auth.uid();
  minimum_cohort constant integer := 5;
  payload jsonb;
BEGIN
  IF actor_id IS NULL
     OR NOT public.has_role(actor_id, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'admin_role_required' USING ERRCODE = '42501';
  END IF;
  IF _data_scope NOT IN ('production', 'synthetic') THEN
    RAISE EXCEPTION 'feedback_admin_data_scope_invalid' USING ERRCODE = '22023';
  END IF;

  WITH eligible_submissions AS MATERIALIZED (
    SELECT
      submission.id AS submission_id,
      submission.subject_reference,
      submission.program_day,
      campaign.campaign_reference,
      campaign.questionnaire_version
    FROM feedback_core.submissions submission
    INNER JOIN feedback_core.campaigns campaign ON campaign.id = submission.campaign_id
    INNER JOIN public.profiles profile ON profile.id = submission.user_id
    INNER JOIN public.program_instances instance ON instance.id = submission.program_instance_id
    WHERE submission.status = 'submitted'
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
  ), expanded_answers AS MATERIALIZED (
    SELECT
      eligible.submission_id,
      eligible.subject_reference,
      eligible.program_day,
      eligible.campaign_reference,
      eligible.questionnaire_version,
      question.question_id,
      question.construct_id,
      question.item_family_id,
      question.item_variant_id,
      question.scale_id,
      selected.option_id
    FROM eligible_submissions eligible
    INNER JOIN feedback_core.structured_answers answer
      ON answer.submission_id = eligible.submission_id
    INNER JOIN feedback_core.question_definitions question
      ON question.id = answer.question_definition_id
    CROSS JOIN LATERAL jsonb_array_elements_text(answer.selected_option_ids)
      AS selected(option_id)
  ), summary AS (
    SELECT
      COUNT(DISTINCT subject_reference)::integer AS participants,
      COUNT(DISTINCT submission_id)::integer AS submissions,
      COUNT(DISTINCT program_day)::integer AS checkpoints_with_data
    FROM eligible_submissions
  ), checkpoint_summary AS (
    SELECT
      program_day,
      campaign_reference,
      questionnaire_version,
      COUNT(DISTINCT subject_reference)::integer AS participants,
      COUNT(DISTINCT submission_id)::integer AS submissions
    FROM eligible_submissions
    GROUP BY program_day, campaign_reference, questionnaire_version
  ), question_summary AS (
    SELECT
      program_day,
      question_id,
      construct_id,
      item_family_id,
      item_variant_id,
      scale_id,
      COUNT(DISTINCT subject_reference)::integer AS participants,
      COUNT(*)::integer AS selections
    FROM expanded_answers
    GROUP BY program_day, question_id, construct_id, item_family_id, item_variant_id, scale_id
  ), option_summary AS (
    SELECT
      program_day,
      question_id,
      option_id,
      COUNT(DISTINCT subject_reference)::integer AS participants,
      COUNT(*)::integer AS selections
    FROM expanded_answers
    GROUP BY program_day, question_id, option_id
  ), activity_by_option AS (
    SELECT
      answer.program_day,
      answer.question_id,
      answer.construct_id,
      answer.item_family_id,
      answer.item_variant_id,
      answer.scale_id,
      answer.option_id,
      COUNT(DISTINCT answer.subject_reference)::integer AS participants,
      round(AVG(activity.program_days_completed)::numeric, 2) AS avg_program_days_completed,
      round(AVG(activity.checkins_completed)::numeric, 2) AS avg_checkins_completed,
      round(AVG(activity.journal_entries_created_count)::numeric, 2) AS avg_journal_entries_created_count,
      round(AVG(activity.tasks_completed)::numeric, 2) AS avg_tasks_completed
    FROM expanded_answers answer
    INNER JOIN feedback_core.activity_snapshots activity
      ON activity.submission_id = answer.submission_id
    GROUP BY
      answer.program_day,
      answer.question_id,
      answer.construct_id,
      answer.item_family_id,
      answer.item_variant_id,
      answer.scale_id,
      answer.option_id
    HAVING COUNT(DISTINCT answer.subject_reference) >= minimum_cohort
  )
  SELECT jsonb_build_object(
    'schema_version', 'admin-feedback-intelligence-insights-v1',
    'generated_at', clock_timestamp(),
    'data_scope', _data_scope,
    'summary', jsonb_build_object(
      'participants', summary.participants,
      'submissions', CASE WHEN summary.participants >= minimum_cohort THEN summary.submissions END,
      'checkpoints_with_data', CASE
        WHEN summary.participants >= minimum_cohort THEN summary.checkpoints_with_data
      END,
      'sufficient_data', summary.participants >= minimum_cohort
    ),
    'checkpoints', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'program_day', checkpoint.program_day,
        'campaign_reference', checkpoint.campaign_reference,
        'questionnaire_version', checkpoint.questionnaire_version,
        'participants', checkpoint.participants,
        'submissions', CASE
          WHEN checkpoint.participants >= minimum_cohort THEN checkpoint.submissions
        END,
        'sufficient_data', checkpoint.participants >= minimum_cohort
      ) ORDER BY checkpoint.program_day)
      FROM checkpoint_summary checkpoint
    ), '[]'::jsonb),
    'questions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'program_day', question.program_day,
        'question_id', question.question_id,
        'construct_id', question.construct_id,
        'item_family_id', question.item_family_id,
        'item_variant_id', question.item_variant_id,
        'scale_id', question.scale_id,
        'participants', question.participants,
        'selections', CASE
          WHEN question.participants >= minimum_cohort THEN question.selections
        END,
        'option_distribution', CASE
          WHEN question.participants >= minimum_cohort THEN COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
              'option_id', option_row.option_id,
              'participants', option_row.participants,
              'selections', option_row.selections,
              'participant_rate', round(
                option_row.participants::numeric / NULLIF(question.participants, 0),
                4
              )
            ) ORDER BY option_row.option_id)
            FROM option_summary option_row
            WHERE option_row.program_day = question.program_day
              AND option_row.question_id = question.question_id
          ), '[]'::jsonb)
          ELSE '[]'::jsonb
        END,
        'sufficient_data', question.participants >= minimum_cohort
      ) ORDER BY question.program_day, question.question_id)
      FROM question_summary question
    ), '[]'::jsonb),
    'activity_associations', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'program_day', association.program_day,
        'question_id', association.question_id,
        'construct_id', association.construct_id,
        'item_family_id', association.item_family_id,
        'item_variant_id', association.item_variant_id,
        'scale_id', association.scale_id,
        'option_id', association.option_id,
        'participants', association.participants,
        'avg_program_days_completed', association.avg_program_days_completed,
        'avg_checkins_completed', association.avg_checkins_completed,
        'avg_journal_entries_created_count', association.avg_journal_entries_created_count,
        'avg_tasks_completed', association.avg_tasks_completed,
        'interpretation', 'OBSERVATIONAL_NOT_CAUSAL'
      ) ORDER BY association.program_day, association.question_id, association.option_id)
      FROM activity_by_option association
    ), '[]'::jsonb),
    'privacy', jsonb_build_object(
      'minimum_distinct_participants', minimum_cohort,
      'fixed_aggregate_shape', true,
      'arbitrary_filters_allowed', false,
      'production_and_synthetic_mixed', false,
      'individual_rows_included', false,
      'raw_text_included', false,
      'journal_or_reflection_text_included', false,
      'coach_or_team_data_included', false,
      'names_emails_or_user_ids_included', false,
      'scores_normalized_or_inferred', false,
      'claim_boundary', 'OBSERVATIONAL_NOT_CAUSAL'
    )
  ) INTO payload
  FROM summary;

  RETURN payload;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_feedback_intelligence_insights(text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_feedback_intelligence_insights(text)
  TO authenticated;

COMMENT ON FUNCTION public.get_admin_feedback_intelligence_insights(text) IS
  'Admin-only fixed feedback aggregates. Every metric-bearing group requires n >= 5; production and fully synthetic scopes are never mixed.';

COMMIT;
