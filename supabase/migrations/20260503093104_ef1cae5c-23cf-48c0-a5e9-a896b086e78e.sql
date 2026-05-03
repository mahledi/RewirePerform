ALTER TABLE public.daily_checkins
ADD COLUMN IF NOT EXISTS wellbeing_metrics jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_daily_checkins_user_date ON public.daily_checkins(user_id, date);