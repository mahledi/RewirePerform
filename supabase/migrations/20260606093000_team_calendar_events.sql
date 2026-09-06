CREATE TABLE IF NOT EXISTS public.team_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  date date NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('training', 'rest', 'competition')),
  title text,
  training_local_hour smallint CHECK (training_local_hour BETWEEN 0 AND 23),
  training_local_minute smallint CHECK (training_local_minute IN (0, 30)),
  training_timezone text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, date)
);

CREATE INDEX IF NOT EXISTS idx_team_calendar_events_team_date
  ON public.team_calendar_events(team_id, date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_calendar_events TO authenticated;
GRANT ALL ON public.team_calendar_events TO service_role;

ALTER TABLE public.team_calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can read team calendar events"
  ON public.team_calendar_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.team_members tm
      WHERE tm.team_id = team_calendar_events.team_id
        AND tm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.teams t
      WHERE t.id = team_calendar_events.team_id
        AND t.created_by = auth.uid()
    )
  );

CREATE POLICY "Team coaches can insert team calendar events"
  ON public.team_calendar_events FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      EXISTS (
        SELECT 1
        FROM public.teams t
        WHERE t.id = team_calendar_events.team_id
          AND t.created_by = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.team_members tm
        JOIN public.user_roles ur
          ON ur.user_id = tm.user_id
         AND ur.role = 'coach'
        WHERE tm.team_id = team_calendar_events.team_id
          AND tm.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Team coaches can update team calendar events"
  ON public.team_calendar_events FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.teams t
      WHERE t.id = team_calendar_events.team_id
        AND t.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.team_members tm
      JOIN public.user_roles ur
        ON ur.user_id = tm.user_id
       AND ur.role = 'coach'
      WHERE tm.team_id = team_calendar_events.team_id
        AND tm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.teams t
      WHERE t.id = team_calendar_events.team_id
        AND t.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.team_members tm
      JOIN public.user_roles ur
        ON ur.user_id = tm.user_id
       AND ur.role = 'coach'
      WHERE tm.team_id = team_calendar_events.team_id
        AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team coaches can delete team calendar events"
  ON public.team_calendar_events FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.teams t
      WHERE t.id = team_calendar_events.team_id
        AND t.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.team_members tm
      JOIN public.user_roles ur
        ON ur.user_id = tm.user_id
       AND ur.role = 'coach'
      WHERE tm.team_id = team_calendar_events.team_id
        AND tm.user_id = auth.uid()
    )
  );

CREATE TRIGGER touch_team_calendar_events_updated_at
  BEFORE UPDATE ON public.team_calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
