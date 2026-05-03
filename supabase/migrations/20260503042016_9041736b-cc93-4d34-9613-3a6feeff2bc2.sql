CREATE TABLE public.coach_journals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL,
  team_id UUID NOT NULL,
  week_number INTEGER NOT NULL,
  gratitude TEXT,
  reflection_1 TEXT,
  reflection_2 TEXT,
  reflection_3 TEXT,
  action_commitment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (coach_id, team_id, week_number)
);

ALTER TABLE public.coach_journals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach reads own coach_journals"
ON public.coach_journals FOR SELECT
TO authenticated
USING (coach_id = auth.uid());

CREATE POLICY "Coach inserts own coach_journals"
ON public.coach_journals FOR INSERT
TO authenticated
WITH CHECK (coach_id = auth.uid() AND public.has_role(auth.uid(), 'coach'::public.app_role));

CREATE POLICY "Coach updates own coach_journals"
ON public.coach_journals FOR UPDATE
TO authenticated
USING (coach_id = auth.uid());

CREATE POLICY "Coach deletes own coach_journals"
ON public.coach_journals FOR DELETE
TO authenticated
USING (coach_id = auth.uid());

CREATE TRIGGER touch_coach_journals_updated_at
BEFORE UPDATE ON public.coach_journals
FOR EACH ROW EXECUTE FUNCTION public.touch_daily_journals_updated_at();

CREATE INDEX idx_coach_journals_coach_team ON public.coach_journals(coach_id, team_id);