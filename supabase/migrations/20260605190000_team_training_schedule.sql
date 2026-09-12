CREATE TABLE IF NOT EXISTS public.team_training_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  training_local_hour int NOT NULL CHECK (training_local_hour BETWEEN 0 AND 23),
  training_local_minute int NOT NULL DEFAULT 0 CHECK (training_local_minute IN (0, 30)),
  training_timezone text NOT NULL DEFAULT 'UTC',
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, day_of_week)
);

ALTER TABLE public.team_training_schedule ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'team_training_schedule'
      AND policyname = 'Team members read team training schedule'
  ) THEN
    CREATE POLICY "Team members read team training schedule"
    ON public.team_training_schedule
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.team_members tm
        WHERE tm.team_id = team_training_schedule.team_id
          AND tm.user_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'team_training_schedule'
      AND policyname = 'Coaches manage team training schedule'
  ) THEN
    CREATE POLICY "Coaches manage team training schedule"
    ON public.team_training_schedule
    FOR ALL TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.teams t
        WHERE t.id = team_training_schedule.team_id
          AND t.created_by = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.team_members tm
        JOIN public.user_roles ur ON ur.user_id = tm.user_id
        WHERE tm.team_id = team_training_schedule.team_id
          AND tm.user_id = auth.uid()
          AND ur.role = 'coach'
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.teams t
        WHERE t.id = team_training_schedule.team_id
          AND t.created_by = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.team_members tm
        JOIN public.user_roles ur ON ur.user_id = tm.user_id
        WHERE tm.team_id = team_training_schedule.team_id
          AND tm.user_id = auth.uid()
          AND ur.role = 'coach'
      )
    );
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_team_training_schedule_updated_at ON public.team_training_schedule;
CREATE TRIGGER trg_team_training_schedule_updated_at
  BEFORE UPDATE ON public.team_training_schedule
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_team_training_schedule_team_day
  ON public.team_training_schedule(team_id, day_of_week);
