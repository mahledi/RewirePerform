-- Remove old "ALL" anonymous session policies (superseded by specific user-based policies)
DROP POLICY IF EXISTS "Allow anonymous session responses" ON public.questionnaire_responses;
DROP POLICY IF EXISTS "Allow anonymous session events" ON public.calendar_events;
DROP POLICY IF EXISTS "Allow anonymous session checkins" ON public.daily_checkins;
DROP POLICY IF EXISTS "Allow anonymous session tasks" ON public.personalized_tasks;
DROP POLICY IF EXISTS "Allow anonymous session settings" ON public.program_settings;
DROP POLICY IF EXISTS "Allow anonymous session assessments" ON public.assessments;

-- Remove old "ALL" user manage policies (superseded by specific INSERT/SELECT/UPDATE/DELETE)
DROP POLICY IF EXISTS "Users can manage own events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can manage own checkins" ON public.daily_checkins;
DROP POLICY IF EXISTS "Users can manage own tasks" ON public.personalized_tasks;
DROP POLICY IF EXISTS "Users can manage own settings" ON public.program_settings;

-- Remove duplicate anonymous INSERT policies (users must be logged in now)
DROP POLICY IF EXISTS "Anon insert calendar_events" ON public.calendar_events;
DROP POLICY IF EXISTS "Anon insert daily_checkins" ON public.daily_checkins;
DROP POLICY IF EXISTS "Anon insert personalized_tasks" ON public.personalized_tasks;
DROP POLICY IF EXISTS "Anon insert program_settings" ON public.program_settings;
DROP POLICY IF EXISTS "Anon insert questionnaire_responses" ON public.questionnaire_responses;
DROP POLICY IF EXISTS "Anon can insert" ON public.deep_profile_assessments;

-- Remove duplicate anonymous SELECT policies
DROP POLICY IF EXISTS "Anon read calendar_events by session" ON public.calendar_events;
DROP POLICY IF EXISTS "Anon read daily_checkins by session" ON public.daily_checkins;
DROP POLICY IF EXISTS "Anon read personalized_tasks by session" ON public.personalized_tasks;
DROP POLICY IF EXISTS "Anon read program_settings by session" ON public.program_settings;
DROP POLICY IF EXISTS "Anon read questionnaire_responses by session" ON public.questionnaire_responses;
DROP POLICY IF EXISTS "Anon can view by session" ON public.deep_profile_assessments;

-- Remove duplicate user INSERT policies (keep the newer named ones)
DROP POLICY IF EXISTS "Users can insert own responses" ON public.questionnaire_responses;
DROP POLICY IF EXISTS "Users can insert own assessments" ON public.assessments;

-- Remove duplicate user SELECT policies (keep the newer named ones)  
DROP POLICY IF EXISTS "Users can view own responses" ON public.questionnaire_responses;
DROP POLICY IF EXISTS "Users can view own assessments" ON public.assessments;
DROP POLICY IF EXISTS "Users can view own deep profiles" ON public.deep_profile_assessments;
DROP POLICY IF EXISTS "Users can insert own deep profiles" ON public.deep_profile_assessments;

-- Add DELETE policies for tables that need cleanup (personalized_tasks already used by Dashboard)
DROP POLICY IF EXISTS "Users delete own personalized_tasks" ON public.personalized_tasks;
CREATE POLICY "Users delete own personalized_tasks" ON public.personalized_tasks FOR DELETE USING (auth.uid() = user_id);