
-- Create table for storing questionnaire responses
CREATE TABLE public.questionnaire_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  analysis JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.questionnaire_responses ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (no auth yet)
CREATE POLICY "Anyone can insert questionnaire responses"
  ON public.questionnaire_responses
  FOR INSERT
  WITH CHECK (true);

-- Allow reading own session responses
CREATE POLICY "Anyone can read their session responses"
  ON public.questionnaire_responses
  FOR SELECT
  USING (true);

-- Allow updating own session responses
CREATE POLICY "Anyone can update their session responses"
  ON public.questionnaire_responses
  FOR UPDATE
  USING (true);
