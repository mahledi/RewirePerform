-- Tabelle für strukturierte Daily Journal Einträge (eigene Tabelle, getrennt von daily_checkins)
CREATE TABLE public.daily_journals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  day_number INTEGER,
  journal_title TEXT,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  gratitude TEXT,
  free_reflection TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

ALTER TABLE public.daily_journals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own daily_journals"
  ON public.daily_journals FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own daily_journals"
  ON public.daily_journals FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own daily_journals"
  ON public.daily_journals FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users delete own daily_journals"
  ON public.daily_journals FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Coaches dürfen Aggregates ihres Teams lesen (Konsistenz mit anderen Tabellen)
CREATE POLICY "Coaches can view team daily_journals"
  ON public.daily_journals FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      has_role(auth.uid(), 'coach'::app_role)
      AND user_id IN (
        SELECT tm.user_id FROM team_members tm
        WHERE tm.team_id IN (SELECT id FROM teams WHERE created_by = auth.uid())
      )
    )
  );

-- updated_at trigger function (reuse pattern)
CREATE OR REPLACE FUNCTION public.touch_daily_journals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_daily_journals_updated_at
BEFORE UPDATE ON public.daily_journals
FOR EACH ROW EXECUTE FUNCTION public.touch_daily_journals_updated_at();

CREATE INDEX idx_daily_journals_user_date ON public.daily_journals(user_id, date DESC);