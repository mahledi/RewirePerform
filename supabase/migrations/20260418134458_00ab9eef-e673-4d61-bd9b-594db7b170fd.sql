-- user_day_assignments: which canonical day was assigned per user/date
CREATE TABLE public.user_day_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  assigned_day_number INTEGER NOT NULL,
  context_type TEXT NOT NULL DEFAULT 'training',
  assignment_reason JSONB NOT NULL DEFAULT '{}'::jsonb,
  adaptation_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

ALTER TABLE public.user_day_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own assignments"
  ON public.user_day_assignments FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users insert own assignments"
  ON public.user_day_assignments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own assignments"
  ON public.user_day_assignments FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users delete own assignments"
  ON public.user_day_assignments FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_user_day_assignments_user_date
  ON public.user_day_assignments (user_id, date DESC);

CREATE TRIGGER trg_user_day_assignments_updated_at
  BEFORE UPDATE ON public.user_day_assignments
  FOR EACH ROW EXECUTE FUNCTION public.touch_daily_journals_updated_at();

-- user_day_completion: open / complete tracking
CREATE TABLE public.user_day_completion (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES public.user_day_assignments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  day_number INTEGER NOT NULL,
  opened_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completion_status TEXT NOT NULL DEFAULT 'in_progress',
  task_completion JSONB NOT NULL DEFAULT '[]'::jsonb,
  variant_used TEXT,
  time_spent_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assignment_id)
);

ALTER TABLE public.user_day_completion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own completion"
  ON public.user_day_completion FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users insert own completion"
  ON public.user_day_completion FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own completion"
  ON public.user_day_completion FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users delete own completion"
  ON public.user_day_completion FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_user_day_completion_user
  ON public.user_day_completion (user_id, day_number);

CREATE TRIGGER trg_user_day_completion_updated_at
  BEFORE UPDATE ON public.user_day_completion
  FOR EACH ROW EXECUTE FUNCTION public.touch_daily_journals_updated_at();

-- comprehension_check_instances: 3-5 MC questions per day with answers
CREATE TABLE public.comprehension_check_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES public.user_day_assignments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  day_number INTEGER NOT NULL,
  generated_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  results JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_count INTEGER,
  total_count INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE (assignment_id)
);

ALTER TABLE public.comprehension_check_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own checks"
  ON public.comprehension_check_instances FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users insert own checks"
  ON public.comprehension_check_instances FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own checks"
  ON public.comprehension_check_instances FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users delete own checks"
  ON public.comprehension_check_instances FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_comprehension_user_day
  ON public.comprehension_check_instances (user_id, day_number);