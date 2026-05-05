
-- Helper: is the caller the creator of a given team?
CREATE OR REPLACE FUNCTION public.is_creator_of_team(_team_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = _team_id AND t.created_by = auth.uid()
  )
$$;

-- Helper: is the caller a member of a given team?
CREATE OR REPLACE FUNCTION public.is_member_of_team(_team_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = _team_id AND tm.user_id = auth.uid()
  )
$$;

-- Helper: is the caller a coach who has _user_id on one of their teams?
CREATE OR REPLACE FUNCTION public.is_coach_of_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'coach'::public.app_role)
     AND EXISTS (
       SELECT 1
       FROM public.team_members tm
       JOIN public.teams t ON t.id = tm.team_id
       WHERE tm.user_id = _user_id
         AND t.created_by = auth.uid()
     )
$$;

-- ====== user_roles: rebuild SELECT policies without recursion ======
DROP POLICY IF EXISTS "Coaches can read team member roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can read all user_roles" ON public.user_roles;

CREATE POLICY "Users read own role"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins read all user_roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Coaches read team member roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.is_coach_of_user(user_id));

-- ====== teams: rebuild SELECT policy without recursion ======
DROP POLICY IF EXISTS "Members and creator can view teams" ON public.teams;

CREATE POLICY "Members and creator can view teams"
  ON public.teams FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_member_of_team(id)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- ====== team_members: rebuild SELECT policies without recursion ======
DROP POLICY IF EXISTS "Coach can view own team members" ON public.team_members;
DROP POLICY IF EXISTS "Coaches can view team members" ON public.team_members;

CREATE POLICY "Coaches can view team members"
  ON public.team_members FOR SELECT TO authenticated
  USING (public.is_creator_of_team(team_id));
