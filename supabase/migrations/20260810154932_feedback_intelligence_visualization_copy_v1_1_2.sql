-- Aligns the four draft Feedback Intelligence questionnaires with the visible
-- Rest-Day product term "Visualisierung" and the final three-step content pin.
-- No campaign is activated and no response or consent row is changed.

BEGIN;

DO $$
BEGIN
  IF (
    SELECT count(*)
    FROM feedback_core.campaigns
    WHERE status = 'draft'
      AND content_version = 'feedback-intelligence-content-v1.1.1'
      AND (campaign_reference, questionnaire_version, questionnaire_manifest_hash) IN (
        ('feedback-day-10-v1', 'feedback-d10-v1.1.1', '0b60fed7e7ec9a36e691489deb02b819056ecad277bd307f0ddb7769dc03d1b9'),
        ('feedback-day-24-v1', 'feedback-d24-v1.1.1', '1b2ed1fadafaa77064247048bd8cb5bd4c298d0482c30ca3ce43f45539a47720'),
        ('feedback-day-39-v1', 'feedback-d39-v1.1.1', '3ec2f50796de4f491491128941aeac903135d66aa83b80e97492cda2b78cfdb9'),
        ('feedback-day-55-v1', 'feedback-d55-v1.1.1', 'ba78c6e58c4e65fe09c3182f5c830783e9d9ed10e314f78ec9c00a77dd726c6d')
      )
  ) <> 4 THEN
    RAISE EXCEPTION 'feedback_visualization_copy_v1_1_2_requires_exact_draft_predecessors';
  END IF;
END;
$$;

WITH versions(
  campaign_reference,
  questionnaire_version,
  questionnaire_manifest_hash
) AS (
  VALUES
    ('feedback-day-10-v1', 'feedback-d10-v1.1.2', '48c2bf887ec96a0cc49eb327b380f7da7d163beb08929b9b359bfa0356692f2c'),
    ('feedback-day-24-v1', 'feedback-d24-v1.1.2', '679f09ab0a4c08a0521404cbbef2d88a8f0121cb353c42f310a3f09cc20689e8'),
    ('feedback-day-39-v1', 'feedback-d39-v1.1.2', 'b566002d6f1d0c74f1eafb8554f370fa7f409f871473717079a478ad7b238b44'),
    ('feedback-day-55-v1', 'feedback-d55-v1.1.2', 'b8b1eb9e97348090e2993ee634dc0616228f6c1138b450174d132f48b1029600')
)
UPDATE feedback_core.campaigns campaign
SET questionnaire_version = versions.questionnaire_version,
    questionnaire_manifest_hash = versions.questionnaire_manifest_hash,
    content_version = 'feedback-intelligence-content-v1.1.2',
    updated_at = now()
FROM versions
WHERE campaign.campaign_reference = versions.campaign_reference;

COMMIT;
