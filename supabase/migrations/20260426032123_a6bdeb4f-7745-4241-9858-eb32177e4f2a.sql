-- Remove coach read access to individual journal contents
DROP POLICY IF EXISTS "Coaches can view team daily_journals" ON public.daily_journals;