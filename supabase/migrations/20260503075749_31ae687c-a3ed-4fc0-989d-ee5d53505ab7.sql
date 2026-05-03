
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- training_schedule
CREATE TABLE public.training_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  training_hour int NOT NULL CHECK (training_hour BETWEEN 0 AND 23),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, day_of_week)
);
ALTER TABLE public.training_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own training_schedule" ON public.training_schedule FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own training_schedule" ON public.training_schedule FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own training_schedule" ON public.training_schedule FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users delete own training_schedule" ON public.training_schedule FOR DELETE TO authenticated USING (user_id = auth.uid());

-- push_subscriptions
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  morning_hour int NOT NULL DEFAULT 7 CHECK (morning_hour BETWEEN 0 AND 23),
  morning_minute int NOT NULL DEFAULT 30 CHECK (morning_minute IN (0,30)),
  evening_hour int NOT NULL DEFAULT 21 CHECK (evening_hour BETWEEN 0 AND 23),
  evening_minute int NOT NULL DEFAULT 0 CHECK (evening_minute IN (0,30)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own push_subscriptions" ON public.push_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own push_subscriptions" ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own push_subscriptions" ON public.push_subscriptions FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users delete own push_subscriptions" ON public.push_subscriptions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- notification_log
CREATE TABLE public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  notification_type text NOT NULL CHECK (notification_type IN ('morning','pre_training','evening')),
  sent_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, notification_type, sent_date)
);
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own notification_log" ON public.notification_log FOR SELECT TO authenticated USING (user_id = auth.uid());

-- updated_at trigger reuse
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_training_schedule_updated_at BEFORE UPDATE ON public.training_schedule
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_push_subscriptions_updated_at BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
