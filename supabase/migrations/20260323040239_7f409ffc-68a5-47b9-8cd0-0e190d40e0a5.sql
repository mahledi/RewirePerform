
CREATE TABLE public.program_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  competition_date date,
  competition_name text,
  program_start date NOT NULL DEFAULT CURRENT_DATE,
  program_weeks integer NOT NULL DEFAULT 4,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id)
);

ALTER TABLE public.program_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can manage program_settings"
  ON public.program_settings FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE TABLE public.personalized_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  date date NOT NULL,
  event_type text NOT NULL,
  tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, date)
);

ALTER TABLE public.personalized_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can manage personalized_tasks"
  ON public.personalized_tasks FOR ALL
  USING (true)
  WITH CHECK (true);
