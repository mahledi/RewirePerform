
-- 1. Fix team_members RLS infinite recursion: drop self-referencing SELECT policy, replace with direct auth.uid() check
DROP POLICY IF EXISTS "Members can view team members" ON public.team_members;
CREATE POLICY "Members can view own team memberships"
  ON public.team_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Coaches can view team members"
  ON public.team_members FOR SELECT TO authenticated
  USING (
    team_id IN (
      SELECT id FROM public.teams WHERE created_by = auth.uid()
    )
  );

-- 2. Fix daily_checkins focus_rating constraint to allow 0
ALTER TABLE public.daily_checkins DROP CONSTRAINT IF EXISTS daily_checkins_focus_rating_check;
ALTER TABLE public.daily_checkins ADD CONSTRAINT daily_checkins_focus_rating_check CHECK (focus_rating >= 0 AND focus_rating <= 10);

-- 3. Backfill user_id in calendar_events, program_settings, personalized_tasks, daily_checkins from questionnaire_responses
UPDATE public.calendar_events ce
SET user_id = qr.user_id
FROM public.questionnaire_responses qr
WHERE ce.session_id = qr.session_id AND qr.user_id IS NOT NULL AND ce.user_id IS NULL;

UPDATE public.program_settings ps
SET user_id = qr.user_id
FROM public.questionnaire_responses qr
WHERE ps.session_id = qr.session_id AND qr.user_id IS NOT NULL AND ps.user_id IS NULL;

UPDATE public.personalized_tasks pt
SET user_id = qr.user_id
FROM public.questionnaire_responses qr
WHERE pt.session_id = qr.session_id AND qr.user_id IS NOT NULL AND pt.user_id IS NULL;

UPDATE public.daily_checkins dc
SET user_id = qr.user_id
FROM public.questionnaire_responses qr
WHERE dc.session_id = qr.session_id AND qr.user_id IS NOT NULL AND dc.user_id IS NULL;
