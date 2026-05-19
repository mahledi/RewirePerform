-- Question System 2.0: versioned, deterministic, privacy-aware questionnaire storage.
-- Existing rows are preserved; nullable metadata lets legacy data remain readable.

ALTER TABLE public.questionnaire_responses
  ADD COLUMN IF NOT EXISTS instrument_id text,
  ADD COLUMN IF NOT EXISTS questionnaire_version text,
  ADD COLUMN IF NOT EXISTS timing text NOT NULL DEFAULT 'pre',
  ADD COLUMN IF NOT EXISTS scores jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.questionnaire_responses
SET
  instrument_id = COALESCE(instrument_id, 'legacy_onboarding'),
  questionnaire_version = COALESCE(questionnaire_version, 'legacy'),
  timing = COALESCE(timing, 'pre'),
  scores = COALESCE(scores, '{}'::jsonb);

CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_user_instrument_created
  ON public.questionnaire_responses(user_id, instrument_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_user_instrument_draft
  ON public.questionnaire_responses(user_id, instrument_id)
  WHERE is_complete = false;

ALTER TABLE public.deep_profile_assessments
  ADD COLUMN IF NOT EXISTS instrument_id text,
  ADD COLUMN IF NOT EXISTS questionnaire_version text,
  ADD COLUMN IF NOT EXISTS scores jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.deep_profile_assessments
SET
  instrument_id = COALESCE(instrument_id, 'legacy_deep_profile'),
  questionnaire_version = COALESCE(questionnaire_version, 'legacy'),
  scores = COALESCE(scores, '{}'::jsonb);

ALTER TABLE public.deep_profile_assessments
  DROP CONSTRAINT IF EXISTS deep_profile_assessments_timing_check;

ALTER TABLE public.deep_profile_assessments
  ADD CONSTRAINT deep_profile_assessments_timing_check
  CHECK (timing IN ('baseline', 'retest', 'pre', 'mid', 'post'));

CREATE INDEX IF NOT EXISTS idx_deep_profile_user_instrument_timing_created
  ON public.deep_profile_assessments(user_id, instrument_id, timing, created_at DESC);
