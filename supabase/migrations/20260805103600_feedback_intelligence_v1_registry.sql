-- Exact server-side registry for the four Feedback Intelligence v1 checkpoints.
-- All campaigns remain draft. Registry presence does not activate collection.

BEGIN;

INSERT INTO feedback_core.campaigns(
  campaign_reference, checkpoint_day, phase, questionnaire_version,
  content_version, questionnaire_manifest_hash, text_consent_scope,
  text_consent_version, text_notice_hash, status
)
VALUES
  ('feedback-day-10-v1', 10, 1, 'feedback-d10-v1.0.0', 'feedback-intelligence-content-v1.0.0', '0ead46fa79c388e7baaf31bacc28a727959281d52e50b24538eb3959f3ccb389', 'product-improvement-individual-text-ai-analysis-v1', 'feedback-text-consent-v1.0.0-draft', '7da3fee62d13672430e7c288274994f3d284ad8dfd1b73a92ecc0c8d15962af4', 'draft'),
  ('feedback-day-24-v1', 24, 2, 'feedback-d24-v1.0.0', 'feedback-intelligence-content-v1.0.0', 'baf3036f27f0feef9d4c9857a9f91cf583dafb4882c70baea689b876c03b2bcd', 'product-improvement-individual-text-ai-analysis-v1', 'feedback-text-consent-v1.0.0-draft', '7da3fee62d13672430e7c288274994f3d284ad8dfd1b73a92ecc0c8d15962af4', 'draft'),
  ('feedback-day-39-v1', 39, 3, 'feedback-d39-v1.0.0', 'feedback-intelligence-content-v1.0.0', '6741a49bb1354d3e3336307e0c357fa3c30b0c669db6826996326da3eb4702ae', 'product-improvement-individual-text-ai-analysis-v1', 'feedback-text-consent-v1.0.0-draft', '7da3fee62d13672430e7c288274994f3d284ad8dfd1b73a92ecc0c8d15962af4', 'draft'),
  ('feedback-day-55-v1', 55, 4, 'feedback-d55-v1.0.0', 'feedback-intelligence-content-v1.0.0', 'eeed99714915cb081d15b1b138c39056a2ee334a82915e45b3941a70734fa71b', 'product-improvement-individual-text-ai-analysis-v1', 'feedback-text-consent-v1.0.0-draft', '7da3fee62d13672430e7c288274994f3d284ad8dfd1b73a92ecc0c8d15962af4', 'draft');

WITH definitions(
  campaign_reference, position, question_id, construct_id, item_family_id,
  item_variant_id, scale_id, question_type, option_ids,
  exclusive_option_ids, visibility_question_id, visibility_option_ids
) AS (
  VALUES
  ('feedback-day-10-v1', 1, 'd10_content_clarity', 'content_clarity', 'content_clarity_v1', 'content_clarity_d10_v1', 'content_clarity_5_v1', 'single', ARRAY['1','2','3','4','5']::text[], ARRAY[]::text[], NULL, ARRAY[]::text[]),
  ('feedback-day-10-v1', 2, 'd10_task_clarity', 'task_clarity', 'task_clarity_v1', 'task_clarity_d10_v1', 'task_actionability_5_v1', 'single', ARRAY['1','2','3','4','5']::text[], ARRAY[]::text[], NULL, ARRAY[]::text[]),
  ('feedback-day-10-v1', 3, 'd10_text_load', 'text_load', 'text_load_v1', 'text_load_d10_v1', 'amount_bipolar_5_v1', 'single', ARRAY['1','2','3','4','5']::text[], ARRAY[]::text[], NULL, ARRAY[]::text[]),
  ('feedback-day-10-v1', 4, 'd10_daily_duration', 'daily_duration', 'daily_duration_v1', 'daily_duration_d10_v1', 'duration_bipolar_5_v1', 'single', ARRAY['1','2','3','4','5']::text[], ARRAY[]::text[], NULL, ARRAY[]::text[]),
  ('feedback-day-10-v1', 5, 'd10_flow_clarity', 'flow_clarity', 'flow_clarity_v1', 'flow_clarity_d10_v1', 'ease_5_v1', 'single', ARRAY['1','2','3','4','5']::text[], ARRAY[]::text[], NULL, ARRAY[]::text[]),
  ('feedback-day-10-v1', 6, 'd10_trial_ease', 'trial_ease', 'trial_ease_v1', 'trial_ease_d10_v1', 'ease_5_not_tried_v1', 'single', ARRAY['1','2','3','4','5','not_tried']::text[], ARRAY[]::text[], NULL, ARRAY[]::text[]),
  ('feedback-day-10-v1', 7, 'd10_daily_fit', 'daily_fit', 'daily_fit_v1', 'daily_fit_d10_v1', 'fit_5_v1', 'single', ARRAY['1','2','3','4','5']::text[], ARRAY[]::text[], NULL, ARRAY[]::text[]),
  ('feedback-day-10-v1', 8, 'd10_program_affinity', 'program_affinity', 'program_affinity_v1', 'program_affinity_d10_v1', 'affinity_5_v1', 'single', ARRAY['1','2','3','4','5']::text[], ARRAY[]::text[], NULL, ARRAY[]::text[]),
  ('feedback-day-10-v1', 9, 'd10_improvement_priority', 'improvement_priority', 'improvement_priority_d10_v1', 'improvement_priority_d10_v1', 'improvement_area_d10_v1', 'single', ARRAY['1','2','3','4','5','6','7','8']::text[], ARRAY[]::text[], NULL, ARRAY[]::text[]),
  ('feedback-day-24-v1', 1, 'd24_content_clarity', 'content_clarity', 'content_clarity_v1', 'content_clarity_d24_v1', 'content_clarity_5_v1', 'single', ARRAY['1','2','3','4','5']::text[], ARRAY[]::text[], NULL, ARRAY[]::text[]),
  ('feedback-day-24-v1', 2, 'd24_task_clarity', 'task_clarity', 'task_clarity_v1', 'task_clarity_d24_v1', 'task_actionability_5_v1', 'single', ARRAY['1','2','3','4','5']::text[], ARRAY[]::text[], NULL, ARRAY[]::text[]),
  ('feedback-day-24-v1', 3, 'd24_text_load', 'text_load', 'text_load_v1', 'text_load_d24_v1', 'amount_bipolar_5_v1', 'single', ARRAY['1','2','3','4','5']::text[], ARRAY[]::text[], NULL, ARRAY[]::text[]),
  ('feedback-day-24-v1', 4, 'd24_daily_fit', 'daily_fit', 'daily_fit_v1', 'daily_fit_d24_v1', 'fit_5_v1', 'single', ARRAY['1','2','3','4','5']::text[], ARRAY[]::text[], NULL, ARRAY[]::text[]),
  ('feedback-day-24-v1', 5, 'd24_program_affinity', 'program_affinity', 'program_affinity_v1', 'program_affinity_d24_v1', 'affinity_5_v1', 'single', ARRAY['1','2','3','4','5']::text[], ARRAY[]::text[], NULL, ARRAY[]::text[]),
  ('feedback-day-24-v1', 6, 'd24_training_transfer', 'training_transfer', 'training_transfer_v1', 'training_transfer_d24_v1', 'training_transfer_frequency_5_v1', 'single', ARRAY['1','2','3','4','5','no_opportunity']::text[], ARRAY[]::text[], NULL, ARRAY[]::text[]),
  ('feedback-day-24-v1', 7, 'd24_self_learning', 'self_learning', 'self_learning_v1', 'self_learning_d24_v1', 'magnitude_5_v1', 'single', ARRAY['1','2','3','4','5']::text[], ARRAY[]::text[], NULL, ARRAY[]::text[]),
  ('feedback-day-24-v1', 8, 'd24_helpful_components', 'helpful_components', 'helpful_components_d24_v1', 'helpful_components_d24_v1', 'components_d24_multi_v1', 'multi', ARRAY['1','2','3','4','5','6','7']::text[], ARRAY['6']::text[], NULL, ARRAY[]::text[]),
  ('feedback-day-24-v1', 9, 'd24_change_magnitude', 'perceived_change_magnitude', 'perceived_change_magnitude_v1', 'change_magnitude_d24_v1', 'perceived_change_magnitude_5_v1', 'single', ARRAY['1','2','3','4','5']::text[], ARRAY[]::text[], NULL, ARRAY[]::text[]),
  ('feedback-day-24-v1', 10, 'd24_change_valence', 'perceived_change_valence', 'perceived_change_valence_v1', 'change_valence_d24_v1', 'change_valence_6_v1', 'single', ARRAY['strongly_helpful','rather_helpful','neutral','rather_disruptive','strongly_disruptive','depends']::text[], ARRAY[]::text[], 'd24_change_magnitude', ARRAY['2','3','4','5']::text[]),
  ('feedback-day-24-v1', 11, 'd24_low_energy_fit', 'low_energy_fit', 'low_energy_fit_v1', 'low_energy_fit_d24_v1', 'fit_5_not_experienced_v1', 'single', ARRAY['1','2','3','4','5','not_experienced']::text[], ARRAY[]::text[], NULL, ARRAY[]::text[]),
  ('feedback-day-24-v1', 12, 'd24_improvement_priority', 'improvement_priority', 'improvement_priority_d24_v1', 'improvement_priority_d24_v1', 'improvement_area_d24_v1', 'single', ARRAY['1','2','3','4','5','6','7']::text[], ARRAY[]::text[], NULL, ARRAY[]::text[]),
  ('feedback-day-39-v1', 1, 'd39_content_clarity', 'content_clarity', 'content_clarity_v1', 'content_clarity_d39_v1', 'content_clarity_5_v1', 'single', ARRAY['1','2','3','4','5']::text[], ARRAY[]::text[], NULL, ARRAY[]::text[]),
  ('feedback-day-39-v1', 2, 'd39_daily_fit', 'daily_fit', 'daily_fit_v1', 'daily_fit_d39_v1', 'fit_5_v1', 'single', ARRAY['1','2','3','4','5']::text[], ARRAY[]::text[], NULL, ARRAY[]::text[]),
  ('feedback-day-39-v1', 3, 'd39_program_affinity', 'program_affinity', 'program_affinity_v1', 'program_affinity_d39_v1', 'affinity_5_v1', 'single', ARRAY['1','2','3','4','5']::text[], ARRAY[]::text[], NULL, ARRAY[]::text[]),
  ('feedback-day-39-v1', 4, 'd39_training_transfer', 'training_transfer', 'training_transfer_v1', 'training_transfer_d39_v1', 'training_transfer_frequency_5_v1', 'single', ARRAY['1','2','3','4','5','no_opportunity']::text[], ARRAY[]::text[], NULL, ARRAY[]::text[]),
  ('feedback-day-39-v1', 5, 'd39_retrieval_access', 'retrieval_access', 'retrieval_access_v1', 'retrieval_access_d39_v1', 'ease_5_v1', 'single', ARRAY['1','2','3','4','5']::text[], ARRAY[]::text[], NULL, ARRAY[]::text[]),
  ('feedback-day-39-v1', 6, 'd39_automaticity_stage', 'automaticity_stage', 'automaticity_stage_v1', 'automaticity_stage_d39_v1', 'automaticity_stage_5_v1', 'single', ARRAY['1','2','3','4','5']::text[], ARRAY[]::text[], NULL, ARRAY[]::text[]),
  ('feedback-day-39-v1', 7, 'd39_self_learning', 'self_learning', 'self_learning_v1', 'self_learning_d39_v1', 'magnitude_5_v1', 'single', ARRAY['1','2','3','4','5']::text[], ARRAY[]::text[], NULL, ARRAY[]::text[]),
  ('feedback-day-39-v1', 8, 'd39_change_magnitude', 'perceived_change_magnitude', 'perceived_change_magnitude_v1', 'change_magnitude_d39_v1', 'perceived_change_magnitude_5_v1', 'single', ARRAY['1','2','3','4','5']::text[], ARRAY[]::text[], NULL, ARRAY[]::text[]),
  ('feedback-day-39-v1', 9, 'd39_change_valence', 'perceived_change_valence', 'perceived_change_valence_v1', 'change_valence_d39_v1', 'change_valence_6_v1', 'single', ARRAY['strongly_helpful','rather_helpful','neutral','rather_disruptive','strongly_disruptive','depends']::text[], ARRAY[]::text[], 'd39_change_magnitude', ARRAY['2','3','4','5']::text[]),
  ('feedback-day-39-v1', 10, 'd39_application_context', 'application_context', 'application_context_v1', 'application_context_d39_v1', 'application_context_multi_v1', 'multi', ARRAY['1','2','3','4','5']::text[], ARRAY['5']::text[], NULL, ARRAY[]::text[]),
  ('feedback-day-39-v1', 11, 'd39_standard_return', 'standard_return', 'standard_return_v1', 'standard_return_d39_v1', 'frequency_5_no_opportunity_v1', 'single', ARRAY['1','2','3','4','5','no_opportunity']::text[], ARRAY[]::text[], NULL, ARRAY[]::text[]),
  ('feedback-day-39-v1', 12, 'd39_main_barrier', 'main_barrier', 'main_barrier_v1', 'main_barrier_d39_v1', 'barrier_d39_v1', 'single', ARRAY['1','2','3','4','5','6','7','8','9']::text[], ARRAY[]::text[], NULL, ARRAY[]::text[]),
  ('feedback-day-55-v1', 1, 'd55_free_recall_level', 'free_recall', 'free_recall_v1', 'free_recall_d55_v1', 'free_recall_stage_5_v1', 'single', ARRAY['1','2','3','4','5']::text[], ARRAY[]::text[], NULL, ARRAY[]::text[]),
  ('feedback-day-55-v1', 2, 'd55_retention_gap', 'retention_gap', 'retention_gap_v1', 'retention_gap_d55_v1', 'retention_gap_frequency_5_v1', 'single', ARRAY['1','2','3','4','5']::text[], ARRAY[]::text[], NULL, ARRAY[]::text[]),
  ('feedback-day-55-v1', 3, 'd55_retrieval_access', 'retrieval_access', 'retrieval_access_v1', 'retrieval_access_d55_v1', 'ease_5_v1', 'single', ARRAY['1','2','3','4','5']::text[], ARRAY[]::text[], NULL, ARRAY[]::text[]),
  ('feedback-day-55-v1', 4, 'd55_automaticity_stage', 'automaticity_stage', 'automaticity_stage_v1', 'automaticity_stage_d55_v1', 'automaticity_stage_5_v1', 'single', ARRAY['1','2','3','4','5']::text[], ARRAY[]::text[], NULL, ARRAY[]::text[]),
  ('feedback-day-55-v1', 5, 'd55_training_transfer', 'training_transfer', 'training_transfer_v1', 'training_transfer_d55_v1', 'training_transfer_frequency_5_v1', 'single', ARRAY['1','2','3','4','5']::text[], ARRAY[]::text[], NULL, ARRAY[]::text[]),
  ('feedback-day-55-v1', 6, 'd55_application_context', 'application_context', 'application_context_v1', 'application_context_d55_v1', 'application_context_multi_v1', 'multi', ARRAY['1','2','3','4','5']::text[], ARRAY['5']::text[], NULL, ARRAY[]::text[]),
  ('feedback-day-55-v1', 7, 'd55_self_learning', 'self_learning', 'self_learning_v1', 'self_learning_d55_v1', 'magnitude_5_v1', 'single', ARRAY['1','2','3','4','5']::text[], ARRAY[]::text[], NULL, ARRAY[]::text[]),
  ('feedback-day-55-v1', 8, 'd55_change_magnitude', 'perceived_change_magnitude', 'perceived_change_magnitude_v1', 'change_magnitude_d55_v1', 'perceived_change_magnitude_5_v1', 'single', ARRAY['1','2','3','4','5']::text[], ARRAY[]::text[], NULL, ARRAY[]::text[]),
  ('feedback-day-55-v1', 9, 'd55_change_valence', 'perceived_change_valence', 'perceived_change_valence_v1', 'change_valence_d55_v1', 'change_valence_6_v1', 'single', ARRAY['strongly_helpful','rather_helpful','neutral','rather_disruptive','strongly_disruptive','depends']::text[], ARRAY[]::text[], 'd55_change_magnitude', ARRAY['2','3','4','5']::text[]),
  ('feedback-day-55-v1', 10, 'd55_overall_helpfulness', 'overall_helpfulness', 'overall_helpfulness_v1', 'overall_helpfulness_d55_v1', 'helpfulness_5_v1', 'single', ARRAY['1','2','3','4','5']::text[], ARRAY[]::text[], NULL, ARRAY[]::text[]),
  ('feedback-day-55-v1', 11, 'd55_helpful_components', 'helpful_components', 'helpful_components_d55_v1', 'helpful_components_d55_v1', 'components_d55_multi_v1', 'multi', ARRAY['1','2','3','4','5','6','7','8']::text[], ARRAY['7']::text[], NULL, ARRAY[]::text[]),
  ('feedback-day-55-v1', 12, 'd55_overall_fit', 'daily_fit', 'daily_fit_v1', 'daily_fit_d55_v1', 'fit_5_v1', 'single', ARRAY['1','2','3','4','5']::text[], ARRAY[]::text[], NULL, ARRAY[]::text[]),
  ('feedback-day-55-v1', 13, 'd55_keep_priority', 'keep_priority', 'keep_priority_v1', 'keep_priority_d55_v1', 'keep_area_d55_multi_v1', 'multi', ARRAY['1','2','3','4','5','6','7','8']::text[], ARRAY[]::text[], NULL, ARRAY[]::text[]),
  ('feedback-day-55-v1', 14, 'd55_change_priority', 'improvement_priority', 'improvement_priority_d55_v1', 'improvement_priority_d55_v1', 'improvement_area_d55_v1', 'single', ARRAY['1','2','3','4','5','6','7','8','9']::text[], ARRAY[]::text[], NULL, ARRAY[]::text[])
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
  definition.option_ids,
  definition.exclusive_option_ids,
  definition.visibility_question_id,
  definition.visibility_option_ids
FROM definitions definition
INNER JOIN feedback_core.campaigns campaign
  ON campaign.campaign_reference = definition.campaign_reference;

COMMIT;
