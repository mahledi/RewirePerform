CREATE POLICY "Team creator can join own team"
  ON public.team_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND team_id IN (SELECT id FROM public.teams WHERE created_by = auth.uid())
  );