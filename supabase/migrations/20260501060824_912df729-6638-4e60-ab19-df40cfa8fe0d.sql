-- 1. user_roles: drop self-insert, add admin-managed
DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;

CREATE POLICY "Admins can insert user_roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update user_roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete user_roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2. teams: restrict SELECT to members/creator/admin
DROP POLICY IF EXISTS "Anyone authenticated can view teams" ON public.teams;

CREATE POLICY "Members and creator can view teams"
  ON public.teams FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- 3. Recreate public-role policies as authenticated-only
-- assessments
DROP POLICY IF EXISTS "Users insert own assessments" ON public.assessments;
DROP POLICY IF EXISTS "Users read own assessments" ON public.assessments;
CREATE POLICY "Users insert own assessments"
  ON public.assessments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users read own assessments"
  ON public.assessments FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- deep_profile_assessments
DROP POLICY IF EXISTS "Users insert own deep_profile_assessments" ON public.deep_profile_assessments;
DROP POLICY IF EXISTS "Users read own deep_profile_assessments" ON public.deep_profile_assessments;
CREATE POLICY "Users insert own deep_profile_assessments"
  ON public.deep_profile_assessments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users read own deep_profile_assessments"
  ON public.deep_profile_assessments FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- feedback
DROP POLICY IF EXISTS "Users insert own feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users read own feedback" ON public.feedback;
CREATE POLICY "Users insert own feedback"
  ON public.feedback FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users read own feedback"
  ON public.feedback FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- personalized_tasks DELETE
DROP POLICY IF EXISTS "Users delete own personalized_tasks" ON public.personalized_tasks;
CREATE POLICY "Users delete own personalized_tasks"
  ON public.personalized_tasks FOR DELETE TO authenticated
  USING (auth.uid() = user_id);