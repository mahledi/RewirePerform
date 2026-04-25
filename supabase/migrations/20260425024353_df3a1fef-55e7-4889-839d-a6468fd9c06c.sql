
ALTER TABLE public.questionnaire_responses
  ADD COLUMN IF NOT EXISTS is_complete boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_category_index integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS progress_updated_at timestamp with time zone NOT NULL DEFAULT now();

-- Only one in-progress draft per user
CREATE UNIQUE INDEX IF NOT EXISTS questionnaire_responses_user_draft_unique
  ON public.questionnaire_responses (user_id)
  WHERE is_complete = false;

-- Allow users to delete their own drafts (e.g. start over)
DROP POLICY IF EXISTS "Users delete own questionnaire_responses" ON public.questionnaire_responses;
CREATE POLICY "Users delete own questionnaire_responses"
  ON public.questionnaire_responses
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
