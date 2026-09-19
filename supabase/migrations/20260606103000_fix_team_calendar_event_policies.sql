CREATE OR REPLACE FUNCTION public.can_manage_team_calendar(_team_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.is_creator_of_team(_team_id)
    OR (
      public.has_role(auth.uid(), 'coach'::public.app_role)
      AND public.is_member_of_team(_team_id)
    )
$$;

DROP POLICY IF EXISTS "Team coaches can insert team calendar events" ON public.team_calendar_events;
DROP POLICY IF EXISTS "Team coaches can update team calendar events" ON public.team_calendar_events;
DROP POLICY IF EXISTS "Team coaches can delete team calendar events" ON public.team_calendar_events;

CREATE POLICY "Team coaches can insert team calendar events"
  ON public.team_calendar_events FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.can_manage_team_calendar(team_id)
  );

CREATE POLICY "Team coaches can update team calendar events"
  ON public.team_calendar_events FOR UPDATE
  TO authenticated
  USING (public.can_manage_team_calendar(team_id))
  WITH CHECK (public.can_manage_team_calendar(team_id));

CREATE POLICY "Team coaches can delete team calendar events"
  ON public.team_calendar_events FOR DELETE
  TO authenticated
  USING (public.can_manage_team_calendar(team_id));

GRANT EXECUTE ON FUNCTION public.can_manage_team_calendar(uuid) TO authenticated;
