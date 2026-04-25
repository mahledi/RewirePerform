-- Coaches dürfen den Fragebogen-Status (nicht den Inhalt — nur Existenz/is_complete) ihrer Team-Mitglieder sehen.
CREATE POLICY "Coaches can view team questionnaire status"
ON public.questionnaire_responses
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'coach'::app_role)
  AND user_id IN (
    SELECT tm.user_id
    FROM public.team_members tm
    WHERE tm.team_id IN (
      SELECT t.id FROM public.teams t WHERE t.created_by = auth.uid()
    )
  )
);
