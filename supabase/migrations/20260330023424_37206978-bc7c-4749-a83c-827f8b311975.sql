-- Drop all old USING(true) public policies

-- calendar_events
DROP POLICY IF EXISTS "Allow public delete calendar_events" ON public.calendar_events;
DROP POLICY IF EXISTS "Allow public insert calendar_events" ON public.calendar_events;
DROP POLICY IF EXISTS "Allow public read calendar_events" ON public.calendar_events;
DROP POLICY IF EXISTS "Allow public update calendar_events" ON public.calendar_events;

-- daily_checkins
DROP POLICY IF EXISTS "Allow public insert daily_checkins" ON public.daily_checkins;
DROP POLICY IF EXISTS "Allow public read daily_checkins" ON public.daily_checkins;
DROP POLICY IF EXISTS "Allow public update daily_checkins" ON public.daily_checkins;

-- personalized_tasks
DROP POLICY IF EXISTS "Anyone can manage personalized_tasks" ON public.personalized_tasks;

-- program_settings
DROP POLICY IF EXISTS "Anyone can manage program_settings" ON public.program_settings;

-- questionnaire_responses
DROP POLICY IF EXISTS "Anyone can insert questionnaire responses" ON public.questionnaire_responses;
DROP POLICY IF EXISTS "Anyone can read their session responses" ON public.questionnaire_responses;
DROP POLICY IF EXISTS "Anyone can update their session responses" ON public.questionnaire_responses;

-- Add partial unique constraint for authenticated check-ins (one per user per day)
CREATE UNIQUE INDEX IF NOT EXISTS daily_checkins_user_date_unique
  ON public.daily_checkins (user_id, date)
  WHERE user_id IS NOT NULL;

-- Backfill user_id on orphaned session-only data
WITH session_user_map AS (
  SELECT DISTINCT session_id, user_id
  FROM public.assessments
  WHERE user_id IS NOT NULL
)
UPDATE public.calendar_events ce
SET user_id = sm.user_id
FROM session_user_map sm
WHERE ce.session_id = sm.session_id
  AND ce.user_id IS NULL;

WITH session_user_map AS (
  SELECT DISTINCT session_id, user_id
  FROM public.assessments
  WHERE user_id IS NOT NULL
)
UPDATE public.program_settings ps
SET user_id = sm.user_id
FROM session_user_map sm
WHERE ps.session_id = sm.session_id
  AND ps.user_id IS NULL;

WITH session_user_map AS (
  SELECT DISTINCT session_id, user_id
  FROM public.assessments
  WHERE user_id IS NOT NULL
)
UPDATE public.personalized_tasks pt
SET user_id = sm.user_id
FROM session_user_map sm
WHERE pt.session_id = sm.session_id
  AND pt.user_id IS NULL;

WITH session_user_map AS (
  SELECT DISTINCT session_id, user_id
  FROM public.assessments
  WHERE user_id IS NOT NULL
)
UPDATE public.daily_checkins dc
SET user_id = sm.user_id
FROM session_user_map sm
WHERE dc.session_id = sm.session_id
  AND dc.user_id IS NULL;