ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS program_start_date date,
  ADD COLUMN IF NOT EXISTS program_activated_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS program_activated_at timestamp with time zone;