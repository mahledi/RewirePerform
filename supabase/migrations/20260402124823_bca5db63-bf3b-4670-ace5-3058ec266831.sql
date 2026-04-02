
CREATE TABLE public.deep_profile_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  timing TEXT NOT NULL CHECK (timing IN ('baseline', 'retest')),
  answers JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.deep_profile_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deep profiles"
  ON public.deep_profile_assessments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own deep profiles"
  ON public.deep_profile_assessments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anon can view by session"
  ON public.deep_profile_assessments FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert"
  ON public.deep_profile_assessments FOR INSERT
  TO anon
  WITH CHECK (true);
