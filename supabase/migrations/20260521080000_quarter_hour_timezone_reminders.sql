ALTER TABLE public.push_subscriptions
  DROP CONSTRAINT IF EXISTS push_subscriptions_morning_minute_check,
  DROP CONSTRAINT IF EXISTS push_subscriptions_evening_minute_check;

ALTER TABLE public.push_subscriptions
  ADD CONSTRAINT push_subscriptions_morning_minute_check
    CHECK (morning_minute IN (0, 15, 30, 45)),
  ADD CONSTRAINT push_subscriptions_evening_minute_check
    CHECK (evening_minute IN (0, 15, 30, 45));

ALTER TABLE public.training_schedule
  DROP CONSTRAINT IF EXISTS training_schedule_training_local_minute_check;

ALTER TABLE public.training_schedule
  ADD CONSTRAINT training_schedule_training_local_minute_check
    CHECK (training_local_minute IN (0, 15, 30, 45));
