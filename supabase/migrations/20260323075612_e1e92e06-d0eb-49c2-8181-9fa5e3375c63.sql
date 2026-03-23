
-- 1. Role enum
CREATE TYPE public.app_role AS ENUM ('athlete', 'coach');

-- 2. Teams table
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sport text,
  access_code text UNIQUE NOT NULL DEFAULT upper(substring(gen_random_uuid()::text from 1 for 6)),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- 3. User roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- 4. Team members table
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at timestamptz DEFAULT now(),
  UNIQUE (team_id, user_id)
);

-- 5. Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 6. Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- 7. Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- 8. RLS: user_roles
CREATE POLICY "Users can read own role" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own role" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 9. RLS: teams
CREATE POLICY "Authenticated users can create teams" ON public.teams
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Anyone authenticated can view teams" ON public.teams
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Team creator can update" ON public.teams
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

-- 10. RLS: team_members
CREATE POLICY "Members can view team members" ON public.team_members
  FOR SELECT TO authenticated
  USING (
    team_id IN (SELECT team_id FROM public.team_members tm WHERE tm.user_id = auth.uid())
  );

CREATE POLICY "Users can join teams" ON public.team_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Coaches can remove members" ON public.team_members
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'coach')
    AND team_id IN (SELECT id FROM public.teams WHERE created_by = auth.uid())
  );

-- 11. Coaches can view their athletes' assessments
CREATE POLICY "Coaches can view team assessments" ON public.assessments
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      public.has_role(auth.uid(), 'coach')
      AND user_id IN (
        SELECT tm.user_id FROM public.team_members tm
        WHERE tm.team_id IN (SELECT id FROM public.teams WHERE created_by = auth.uid())
      )
    )
  );

-- 12. Coaches can view their athletes' checkins
CREATE POLICY "Coaches can view team checkins" ON public.daily_checkins
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      public.has_role(auth.uid(), 'coach')
      AND user_id IN (
        SELECT tm.user_id FROM public.team_members tm
        WHERE tm.team_id IN (SELECT id FROM public.teams WHERE created_by = auth.uid())
      )
    )
  );

-- 13. Coaches can view their athletes' profiles
CREATE POLICY "Coaches can view team profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR (
      public.has_role(auth.uid(), 'coach')
      AND id IN (
        SELECT tm.user_id FROM public.team_members tm
        WHERE tm.team_id IN (SELECT id FROM public.teams WHERE created_by = auth.uid())
      )
    )
  );
