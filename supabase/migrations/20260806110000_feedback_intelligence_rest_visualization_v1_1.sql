-- Adds the eight progressively staged rest-day visualization questions.
-- This migration updates draft registry metadata only. It does not activate a campaign.

BEGIN;

DO $$
BEGIN
  IF (
    SELECT count(*)
    FROM feedback_core.campaigns
    WHERE campaign_reference IN (
      'feedback-day-10-v1',
      'feedback-day-24-v1',
      'feedback-day-39-v1',
      'feedback-day-55-v1'
    )
      AND status = 'draft'
  ) <> 4 THEN
    RAISE EXCEPTION 'feedback_visualization_v1_1_requires_four_draft_campaigns';
  END IF;
END;
$$;

-- Move current positions into an unused range before assigning the v1.1 order.
UPDATE feedback_core.question_definitions definition
SET position = definition.position + 16
FROM feedback_core.campaigns campaign
WHERE campaign.id = definition.campaign_id
  AND campaign.campaign_reference IN (
    'feedback-day-10-v1',
    'feedback-day-24-v1',
    'feedback-day-39-v1',
    'feedback-day-55-v1'
  );

WITH positions(campaign_reference, question_id, position) AS (
  VALUES
    ('feedback-day-10-v1', 'd10_content_clarity', 1),
    ('feedback-day-10-v1', 'd10_task_clarity', 2),
    ('feedback-day-10-v1', 'd10_text_load', 3),
    ('feedback-day-10-v1', 'd10_daily_duration', 4),
    ('feedback-day-10-v1', 'd10_flow_clarity', 5),
    ('feedback-day-10-v1', 'd10_trial_ease', 6),
    ('feedback-day-10-v1', 'd10_daily_fit', 9),
    ('feedback-day-10-v1', 'd10_program_affinity', 10),
    ('feedback-day-10-v1', 'd10_improvement_priority', 11),
    ('feedback-day-24-v1', 'd24_content_clarity', 1),
    ('feedback-day-24-v1', 'd24_task_clarity', 2),
    ('feedback-day-24-v1', 'd24_text_load', 3),
    ('feedback-day-24-v1', 'd24_daily_fit', 4),
    ('feedback-day-24-v1', 'd24_program_affinity', 5),
    ('feedback-day-24-v1', 'd24_training_transfer', 8),
    ('feedback-day-24-v1', 'd24_self_learning', 9),
    ('feedback-day-24-v1', 'd24_helpful_components', 10),
    ('feedback-day-24-v1', 'd24_change_magnitude', 11),
    ('feedback-day-24-v1', 'd24_change_valence', 12),
    ('feedback-day-24-v1', 'd24_low_energy_fit', 13),
    ('feedback-day-24-v1', 'd24_improvement_priority', 14),
    ('feedback-day-39-v1', 'd39_content_clarity', 1),
    ('feedback-day-39-v1', 'd39_daily_fit', 2),
    ('feedback-day-39-v1', 'd39_program_affinity', 3),
    ('feedback-day-39-v1', 'd39_training_transfer', 6),
    ('feedback-day-39-v1', 'd39_retrieval_access', 7),
    ('feedback-day-39-v1', 'd39_automaticity_stage', 8),
    ('feedback-day-39-v1', 'd39_self_learning', 9),
    ('feedback-day-39-v1', 'd39_change_magnitude', 10),
    ('feedback-day-39-v1', 'd39_change_valence', 11),
    ('feedback-day-39-v1', 'd39_application_context', 12),
    ('feedback-day-39-v1', 'd39_standard_return', 13),
    ('feedback-day-39-v1', 'd39_main_barrier', 14),
    ('feedback-day-55-v1', 'd55_free_recall_level', 1),
    ('feedback-day-55-v1', 'd55_retention_gap', 2),
    ('feedback-day-55-v1', 'd55_retrieval_access', 3),
    ('feedback-day-55-v1', 'd55_automaticity_stage', 6),
    ('feedback-day-55-v1', 'd55_training_transfer', 7),
    ('feedback-day-55-v1', 'd55_application_context', 8),
    ('feedback-day-55-v1', 'd55_self_learning', 9),
    ('feedback-day-55-v1', 'd55_change_magnitude', 10),
    ('feedback-day-55-v1', 'd55_change_valence', 11),
    ('feedback-day-55-v1', 'd55_overall_helpfulness', 12),
    ('feedback-day-55-v1', 'd55_helpful_components', 13),
    ('feedback-day-55-v1', 'd55_overall_fit', 14),
    ('feedback-day-55-v1', 'd55_keep_priority', 15),
    ('feedback-day-55-v1', 'd55_change_priority', 16)
)
UPDATE feedback_core.question_definitions definition
SET position = positions.position
FROM positions
INNER JOIN feedback_core.campaigns campaign
  ON campaign.campaign_reference = positions.campaign_reference
WHERE definition.campaign_id = campaign.id
  AND definition.question_id = positions.question_id;

WITH definitions(
  campaign_reference, position, question_id, construct_id, item_family_id,
  item_variant_id, scale_id, question_type
) AS (
  VALUES
    ('feedback-day-10-v1', 7, 'd10_rest_visualization_guidance_clarity', 'rest_visualization_guidance_clarity', 'rest_visualization_guidance_clarity_v1', 'rest_visualization_guidance_clarity_d10_v1', 'subjective_experience_5_not_used_v1', 'single'),
    ('feedback-day-10-v1', 8, 'd10_rest_visualization_practical_access', 'rest_visualization_practical_access', 'rest_visualization_practical_access_v1', 'rest_visualization_practical_access_d10_v1', 'subjective_experience_5_not_used_v1', 'single'),
    ('feedback-day-24-v1', 6, 'd24_rest_visualization_guidance_clarity', 'rest_visualization_guidance_clarity', 'rest_visualization_guidance_clarity_v1', 'rest_visualization_guidance_clarity_d24_v1', 'subjective_experience_5_not_used_v1', 'single'),
    ('feedback-day-24-v1', 7, 'd24_rest_visualization_practical_access', 'rest_visualization_practical_access', 'rest_visualization_practical_access_v1', 'rest_visualization_practical_access_d24_v1', 'subjective_experience_5_not_used_v1', 'single'),
    ('feedback-day-39-v1', 4, 'd39_rest_visualization_self_direction', 'rest_visualization_self_direction', 'rest_visualization_self_direction_v1', 'rest_visualization_self_direction_d39_v1', 'subjective_experience_5_not_used_v1', 'single'),
    ('feedback-day-39-v1', 5, 'd39_rest_visualization_practical_access', 'rest_visualization_practical_access', 'rest_visualization_practical_access_v1', 'rest_visualization_practical_access_d39_v1', 'subjective_experience_5_not_used_v1', 'single'),
    ('feedback-day-55-v1', 4, 'd55_rest_visualization_integration', 'rest_visualization_integration', 'rest_visualization_integration_v1', 'rest_visualization_integration_d55_v1', 'subjective_experience_5_not_used_v1', 'single'),
    ('feedback-day-55-v1', 5, 'd55_rest_visualization_continuation_intent', 'rest_visualization_continuation_intent', 'rest_visualization_continuation_intent_v1', 'rest_visualization_continuation_intent_d55_v1', 'subjective_experience_5_not_used_v1', 'single')
)
INSERT INTO feedback_core.question_definitions(
  campaign_id, position, question_id, construct_id, item_family_id,
  item_variant_id, scale_id, question_type, option_ids,
  exclusive_option_ids, visibility_question_id, visibility_option_ids
)
SELECT
  campaign.id,
  definition.position,
  definition.question_id,
  definition.construct_id,
  definition.item_family_id,
  definition.item_variant_id,
  definition.scale_id,
  definition.question_type,
  ARRAY['1','2','3','4','5','not_used']::text[],
  ARRAY[]::text[],
  NULL,
  ARRAY[]::text[]
FROM definitions definition
INNER JOIN feedback_core.campaigns campaign
  ON campaign.campaign_reference = definition.campaign_reference;

WITH versions(
  campaign_reference, questionnaire_version, questionnaire_manifest_hash
) AS (
  VALUES
    ('feedback-day-10-v1', 'feedback-d10-v1.1.0', 'e19d61dc9600f1fd1c1667d1e9ca2a4e4c2c0dc252f4e18ca5efebce132c4a57'),
    ('feedback-day-24-v1', 'feedback-d24-v1.1.0', 'ebf3f51f8537afed79464099df1f21d857f07930c2f0cdbcb613c74d754102bd'),
    ('feedback-day-39-v1', 'feedback-d39-v1.1.0', 'd6ea814b7277245084fa3b4a56bba7c9bbac9d4660b0d0a219a8582d48f04894'),
    ('feedback-day-55-v1', 'feedback-d55-v1.1.0', '52ba09ebceff87c8fbff943be03ff9e406a3ed6fa68234a261cf829951cb9ef0')
)
UPDATE feedback_core.campaigns campaign
SET questionnaire_version = versions.questionnaire_version,
    questionnaire_manifest_hash = versions.questionnaire_manifest_hash,
    content_version = 'feedback-intelligence-content-v1.1.0',
    updated_at = now()
FROM versions
WHERE campaign.campaign_reference = versions.campaign_reference;

COMMIT;
