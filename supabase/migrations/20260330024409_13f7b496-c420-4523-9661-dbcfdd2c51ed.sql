
-- Step 1: Clean up duplicate calendar_events (keep oldest per user_id + date + event_type)
DELETE FROM public.calendar_events
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, date, event_type) id
  FROM public.calendar_events
  WHERE user_id IS NOT NULL
  ORDER BY user_id, date, event_type, created_at ASC
)
AND user_id IS NOT NULL
AND EXISTS (
  SELECT 1 FROM public.calendar_events ce2
  WHERE ce2.user_id = calendar_events.user_id
    AND ce2.date = calendar_events.date
    AND ce2.event_type = calendar_events.event_type
    AND ce2.id != calendar_events.id
);

-- Step 2: Clean up duplicate program_settings (keep oldest per user_id)
DELETE FROM public.program_settings
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id
  FROM public.program_settings
  WHERE user_id IS NOT NULL
  ORDER BY user_id, created_at ASC
)
AND user_id IS NOT NULL
AND EXISTS (
  SELECT 1 FROM public.program_settings ps2
  WHERE ps2.user_id = program_settings.user_id
    AND ps2.id != program_settings.id
);

-- Step 3: Clean up duplicate personalized_tasks (keep newest per user_id + date)
DELETE FROM public.personalized_tasks
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, date) id
  FROM public.personalized_tasks
  WHERE user_id IS NOT NULL
  ORDER BY user_id, date, generated_at DESC
)
AND user_id IS NOT NULL
AND EXISTS (
  SELECT 1 FROM public.personalized_tasks pt2
  WHERE pt2.user_id = personalized_tasks.user_id
    AND pt2.date = personalized_tasks.date
    AND pt2.id != personalized_tasks.id
);

-- Step 4: Add partial unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS personalized_tasks_user_date_unique
  ON public.personalized_tasks (user_id, date)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS program_settings_user_unique
  ON public.program_settings (user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS calendar_events_user_date_type_unique
  ON public.calendar_events (user_id, date, event_type)
  WHERE user_id IS NOT NULL;

-- Step 5: Create new RLS policies for these tables (authenticated users access own data)
-- calendar_events
CREATE POLICY "Users read own calendar_events" ON public.calendar_events
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own calendar_events" ON public.calendar_events
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own calendar_events" ON public.calendar_events
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users delete own calendar_events" ON public.calendar_events
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Anon access by session_id
CREATE POLICY "Anon read calendar_events by session" ON public.calendar_events
  FOR SELECT TO anon USING (user_id IS NULL);
CREATE POLICY "Anon insert calendar_events" ON public.calendar_events
  FOR INSERT TO anon WITH CHECK (user_id IS NULL);

-- daily_checkins
CREATE POLICY "Users read own daily_checkins" ON public.daily_checkins
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own daily_checkins" ON public.daily_checkins
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own daily_checkins" ON public.daily_checkins
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Anon read daily_checkins by session" ON public.daily_checkins
  FOR SELECT TO anon USING (user_id IS NULL);
CREATE POLICY "Anon insert daily_checkins" ON public.daily_checkins
  FOR INSERT TO anon WITH CHECK (user_id IS NULL);

-- personalized_tasks
CREATE POLICY "Users read own personalized_tasks" ON public.personalized_tasks
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own personalized_tasks" ON public.personalized_tasks
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own personalized_tasks" ON public.personalized_tasks
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Anon read personalized_tasks by session" ON public.personalized_tasks
  FOR SELECT TO anon USING (user_id IS NULL);
CREATE POLICY "Anon insert personalized_tasks" ON public.personalized_tasks
  FOR INSERT TO anon WITH CHECK (user_id IS NULL);

-- program_settings
CREATE POLICY "Users read own program_settings" ON public.program_settings
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own program_settings" ON public.program_settings
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own program_settings" ON public.program_settings
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Anon read program_settings by session" ON public.program_settings
  FOR SELECT TO anon USING (user_id IS NULL);
CREATE POLICY "Anon insert program_settings" ON public.program_settings
  FOR INSERT TO anon WITH CHECK (user_id IS NULL);

-- questionnaire_responses
CREATE POLICY "Users read own questionnaire_responses" ON public.questionnaire_responses
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own questionnaire_responses" ON public.questionnaire_responses
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own questionnaire_responses" ON public.questionnaire_responses
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Anon read questionnaire_responses by session" ON public.questionnaire_responses
  FOR SELECT TO anon USING (user_id IS NULL);
CREATE POLICY "Anon insert questionnaire_responses" ON public.questionnaire_responses
  FOR INSERT TO anon WITH CHECK (user_id IS NULL);
