
-- Security definer function: get_team_stats
-- Only the team creator (coach) can call this
CREATE OR REPLACE FUNCTION public.get_team_stats(team_id_param uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  team_owner uuid;
BEGIN
  -- Verify the caller is the team creator
  SELECT created_by INTO team_owner FROM public.teams WHERE id = team_id_param;
  
  IF team_owner IS NULL OR team_owner != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: only the team creator can view stats';
  END IF;

  SELECT json_build_object(
    'member_count', (
      SELECT COUNT(*) FROM public.team_members WHERE team_id = team_id_param
    ),
    'checkins_last_week', (
      SELECT COUNT(*) FROM public.daily_checkins dc
      JOIN public.team_members tm ON dc.user_id = tm.user_id
      WHERE tm.team_id = team_id_param
        AND dc.date >= (CURRENT_DATE - INTERVAL '7 days')::text
    ),
    'assessments_completed', (
      SELECT COUNT(*) FROM public.assessments a
      JOIN public.team_members tm ON a.user_id = tm.user_id
      WHERE tm.team_id = team_id_param
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- RLS for team_members: coaches can see members of teams they created
DROP POLICY IF EXISTS "Coach can view own team members" ON public.team_members;
CREATE POLICY "Coach can view own team members"
ON public.team_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = team_members.team_id
      AND t.created_by = auth.uid()
  )
  OR user_id = auth.uid()
);

-- Ensure team_members has RLS enabled
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Allow athletes to insert themselves into teams
DROP POLICY IF EXISTS "Users can join teams" ON public.team_members;
CREATE POLICY "Users can join teams"
ON public.team_members
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());
