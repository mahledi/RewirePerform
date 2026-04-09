-- Restore missing policies for assessments
CREATE POLICY "Users insert own assessments" ON public.assessments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users read own assessments" ON public.assessments FOR SELECT USING (auth.uid() = user_id);

-- Restore missing policies for deep_profile_assessments
CREATE POLICY "Users insert own deep_profile_assessments" ON public.deep_profile_assessments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users read own deep_profile_assessments" ON public.deep_profile_assessments FOR SELECT USING (auth.uid() = user_id);