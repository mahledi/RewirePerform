-- Allow coaches to read roles of their team members (needed for TeamOverview to filter athletes)
CREATE POLICY "Coaches can read team member roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      has_role(auth.uid(), 'coach'::app_role)
      AND user_id IN (
        SELECT tm.user_id FROM team_members tm
        WHERE tm.team_id IN (
          SELECT t.id FROM teams t WHERE t.created_by = auth.uid()
        )
      )
    )
  );

-- Drop the old restrictive policy first
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;