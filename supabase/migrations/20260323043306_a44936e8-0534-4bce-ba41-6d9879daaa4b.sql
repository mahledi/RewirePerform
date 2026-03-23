
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  sport TEXT,
  team TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add user_id to existing tables for authenticated access
ALTER TABLE public.questionnaire_responses ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.daily_checkins ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.personalized_tasks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.program_settings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- RLS for questionnaire_responses
DROP POLICY IF EXISTS "Allow anonymous inserts" ON public.questionnaire_responses;
DROP POLICY IF EXISTS "Allow anonymous reads" ON public.questionnaire_responses;
CREATE POLICY "Users can view own responses" ON public.questionnaire_responses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own responses" ON public.questionnaire_responses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own responses" ON public.questionnaire_responses FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Allow anonymous session responses" ON public.questionnaire_responses FOR ALL USING (user_id IS NULL);

-- RLS for calendar_events
DROP POLICY IF EXISTS "Allow anonymous inserts" ON public.calendar_events;
DROP POLICY IF EXISTS "Allow anonymous reads" ON public.calendar_events;
DROP POLICY IF EXISTS "Allow anonymous deletes" ON public.calendar_events;
CREATE POLICY "Users can manage own events" ON public.calendar_events FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Allow anonymous session events" ON public.calendar_events FOR ALL USING (user_id IS NULL);

-- RLS for daily_checkins
DROP POLICY IF EXISTS "Allow anonymous upserts" ON public.daily_checkins;
DROP POLICY IF EXISTS "Allow anonymous reads" ON public.daily_checkins;
CREATE POLICY "Users can manage own checkins" ON public.daily_checkins FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Allow anonymous session checkins" ON public.daily_checkins FOR ALL USING (user_id IS NULL);

-- RLS for personalized_tasks
DROP POLICY IF EXISTS "Allow anonymous inserts" ON public.personalized_tasks;
DROP POLICY IF EXISTS "Allow anonymous reads" ON public.personalized_tasks;
CREATE POLICY "Users can manage own tasks" ON public.personalized_tasks FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Allow anonymous session tasks" ON public.personalized_tasks FOR ALL USING (user_id IS NULL);

-- RLS for program_settings
DROP POLICY IF EXISTS "Allow anonymous upserts" ON public.program_settings;
DROP POLICY IF EXISTS "Allow anonymous reads" ON public.program_settings;
CREATE POLICY "Users can manage own settings" ON public.program_settings FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Allow anonymous session settings" ON public.program_settings FOR ALL USING (user_id IS NULL);

-- Validated assessments table for Pre/Post scientific tests
CREATE TABLE public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  assessment_type TEXT NOT NULL, -- 'csai2', 'smtq', 'flow_short'
  timing TEXT NOT NULL, -- 'pre', 'post'
  answers JSONB NOT NULL DEFAULT '{}',
  scores JSONB, -- calculated sub-scale scores
  total_score NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assessments" ON public.assessments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own assessments" ON public.assessments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow anonymous session assessments" ON public.assessments FOR ALL USING (user_id IS NULL);
