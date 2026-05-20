ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS pre_training_minutes int NOT NULL DEFAULT 60
    CHECK (pre_training_minutes IN (30, 60)),
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'UTC';

ALTER TABLE public.training_schedule
  ADD COLUMN IF NOT EXISTS training_local_hour int
    CHECK (training_local_hour BETWEEN 0 AND 23),
  ADD COLUMN IF NOT EXISTS training_local_minute int NOT NULL DEFAULT 0
    CHECK (training_local_minute IN (0, 30)),
  ADD COLUMN IF NOT EXISTS training_timezone text NOT NULL DEFAULT 'UTC';

UPDATE public.training_schedule
SET training_local_hour = COALESCE(training_local_hour, training_hour),
    training_timezone = COALESCE(training_timezone, 'UTC');

ALTER TABLE public.notification_log
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'sent'
    CHECK (status IN ('pending', 'sent', 'opened', 'failed', 'expired_subscription')),
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS failed_at timestamptz,
  ADD COLUMN IF NOT EXISTS error_code int,
  ADD COLUMN IF NOT EXISTS target_url text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.notification_log
SET sent_at = COALESCE(sent_at, created_at),
    status = COALESCE(status, 'sent'),
    metadata = COALESCE(metadata, '{}'::jsonb);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notification_log'
      AND policyname = 'Users update own notification_log opens'
  ) THEN
    CREATE POLICY "Users update own notification_log opens"
    ON public.notification_log
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notification_log_status_date
  ON public.notification_log(status, sent_date);

CREATE INDEX IF NOT EXISTS idx_notification_log_user_type_date
  ON public.notification_log(user_id, notification_type, sent_date);
