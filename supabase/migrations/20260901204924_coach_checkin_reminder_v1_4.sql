-- V1.4 coach check-in status and one-a-day friendly reminder contract.
--
-- Coaches receive operational completion information only. No check-in values,
-- journal text, reflection text, questionnaire answers, or psychological scores
-- are returned or copied into the reminder audit.
BEGIN;

ALTER TABLE public.program_runs
  ADD COLUMN IF NOT EXISTS timezone text;

UPDATE public.program_runs run
SET timezone = COALESCE(
  NULLIF(run.metadata ->> 'timezone', ''),
  (
    SELECT event.training_timezone
    FROM public.team_calendar_events event
    WHERE event.team_id = run.team_id
      AND event.training_timezone IS NOT NULL
      AND btrim(event.training_timezone) <> ''
    ORDER BY event.date DESC, event.updated_at DESC
    LIMIT 1
  ),
  (
    SELECT schedule.training_timezone
    FROM public.team_training_schedule schedule
    WHERE schedule.team_id = run.team_id
      AND schedule.training_timezone IS NOT NULL
      AND btrim(schedule.training_timezone) <> ''
    ORDER BY schedule.updated_at DESC
    LIMIT 1
  ),
  'Europe/Berlin'
)
WHERE run.timezone IS NULL OR btrim(run.timezone) = '';

ALTER TABLE public.program_runs
  ALTER COLUMN timezone SET DEFAULT 'Europe/Berlin',
  ALTER COLUMN timezone SET NOT NULL;

ALTER TABLE public.program_runs
  DROP CONSTRAINT IF EXISTS program_runs_timezone_format_check;
ALTER TABLE public.program_runs
  ADD CONSTRAINT program_runs_timezone_format_check
  CHECK (
    timezone = 'UTC'
    OR timezone ~ '^[A-Za-z_]+(?:/[A-Za-z0-9_+.-]+)+$'
  );

ALTER TABLE public.native_push_devices
  DROP CONSTRAINT IF EXISTS native_push_devices_platform_check;
ALTER TABLE public.native_push_devices
  ADD CONSTRAINT native_push_devices_platform_check
  CHECK (platform IN ('ios', 'android'));

DROP POLICY IF EXISTS "Users insert own native_push_devices" ON public.native_push_devices;
CREATE POLICY "Users insert own native_push_devices"
  ON public.native_push_devices FOR INSERT TO authenticated
  WITH CHECK (
    (select auth.uid()) = user_id
    AND platform IN ('ios', 'android')
  );

DROP POLICY IF EXISTS "Users update own native_push_devices" ON public.native_push_devices;
CREATE POLICY "Users update own native_push_devices"
  ON public.native_push_devices FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK (
    (select auth.uid()) = user_id
    AND platform IN ('ios', 'android')
  );

ALTER TABLE public.notification_log
  DROP CONSTRAINT IF EXISTS notification_log_notification_type_check;
ALTER TABLE public.notification_log
  ADD CONSTRAINT notification_log_notification_type_check
  CHECK (notification_type IN ('morning', 'pre_training', 'evening', 'coach_checkin_reminder'));

ALTER TABLE public.notification_log
  DROP CONSTRAINT IF EXISTS notification_log_status_check;
ALTER TABLE public.notification_log
  ADD CONSTRAINT notification_log_status_check
  CHECK (status IN (
    'pending',
    'sent',
    'opened',
    'failed',
    'expired_subscription',
    'skipped_completed',
    'skipped_no_channel'
  ));

CREATE TABLE IF NOT EXISTS app_private.coach_checkin_reminder_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  program_run_id uuid NOT NULL REFERENCES public.program_runs(id) ON DELETE CASCADE,
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  program_date date NOT NULL,
  timezone text NOT NULL,
  copy_version text NOT NULL DEFAULT 'coach-checkin-reminder-v1',
  is_test boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'partial', 'failed')),
  eligible_count integer NOT NULL DEFAULT 0 CHECK (eligible_count >= 0),
  accepted_users integer NOT NULL DEFAULT 0 CHECK (accepted_users >= 0),
  failed_users integer NOT NULL DEFAULT 0 CHECK (failed_users >= 0),
  skipped_completed integer NOT NULL DEFAULT 0 CHECK (skipped_completed >= 0),
  skipped_no_channel integer NOT NULL DEFAULT 0 CHECK (skipped_no_channel >= 0),
  endpoint_attempts integer NOT NULL DEFAULT 0 CHECK (endpoint_attempts >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (team_id, program_date)
);

REVOKE ALL ON TABLE app_private.coach_checkin_reminder_campaigns
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE app_private.coach_checkin_reminder_campaigns
  TO service_role;

CREATE INDEX IF NOT EXISTS idx_daily_checkins_instance_date
  ON public.daily_checkins(program_instance_id, date)
  WHERE program_instance_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_coach_team_checkin_status_v1_4(_team_id uuid)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  program_instance_id uuid,
  program_local_date date,
  today_checkin_completed boolean,
  today_checkin_at timestamptz,
  rolling_7_completed integer,
  rolling_7_available integer,
  rolling_7_rate numeric,
  already_reminded_today boolean,
  supported_push_channels text[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  active_run_id uuid;
  run_start date;
  run_timezone text := 'Europe/Berlin';
  effective_today date;
  team_is_test boolean := false;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_manage_team_program_runs(_team_id) THEN
    RAISE EXCEPTION 'access_denied' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(team.is_test_team, false)
  INTO team_is_test
  FROM public.teams team
  WHERE team.id = _team_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'team_not_found';
  END IF;

  SELECT run.id, run.started_at, run.timezone
  INTO active_run_id, run_start, run_timezone
  FROM public.program_runs run
  WHERE run.team_id = _team_id
    AND run.status = 'active'
  ORDER BY run.started_at DESC NULLS LAST, run.created_at DESC
  LIMIT 1;

  IF team_is_test THEN
    SELECT override.simulated_date
    INTO effective_today
    FROM public.qa_time_overrides override
    WHERE override.scope = 'team'
      AND override.team_id = _team_id
    ORDER BY override.updated_at DESC
    LIMIT 1;
  END IF;

  effective_today := COALESCE(
    effective_today,
    (pg_catalog.timezone(COALESCE(run_timezone, 'Europe/Berlin'), pg_catalog.now()))::date
  );

  RETURN QUERY
  WITH athletes AS (
    SELECT DISTINCT member.user_id
    FROM public.team_members member
    JOIN public.user_roles role
      ON role.user_id = member.user_id
     AND role.role = 'athlete'::public.app_role
    WHERE member.team_id = _team_id
  ), athlete_instances AS (
    SELECT
      athlete.user_id,
      instance.id AS program_instance_id
    FROM athletes athlete
    LEFT JOIN public.program_instances instance
      ON instance.user_id = athlete.user_id
     AND instance.status = 'active'
     AND instance.program_run_id = active_run_id
  ), checkin_counts AS (
    SELECT
      instance.user_id,
      MAX(checkin.created_at) FILTER (
        WHERE checkin.date = effective_today
      ) AS today_checkin_at,
      COUNT(DISTINCT checkin.date) FILTER (
        WHERE checkin.date BETWEEN GREATEST(run_start, effective_today - 6) AND effective_today
      )::integer AS rolling_7_completed
    FROM athlete_instances instance
    JOIN public.daily_checkins checkin
      ON checkin.program_instance_id = instance.program_instance_id
    WHERE active_run_id IS NOT NULL
      AND run_start IS NOT NULL
      AND checkin.date BETWEEN run_start AND effective_today
    GROUP BY instance.user_id
  )
  SELECT
    athlete.user_id,
    profile.full_name,
    instance.program_instance_id,
    effective_today,
    (checkins.today_checkin_at IS NOT NULL),
    checkins.today_checkin_at,
    COALESCE(checkins.rolling_7_completed, 0)::integer,
    CASE
      WHEN active_run_id IS NULL OR run_start IS NULL OR effective_today < run_start THEN 0
      ELSE LEAST(7, LEAST(56, (effective_today - run_start) + 1))::integer
    END,
    CASE
      WHEN active_run_id IS NULL OR run_start IS NULL OR effective_today < run_start THEN 0::numeric
      ELSE (
        COALESCE(checkins.rolling_7_completed, 0)::numeric
        / LEAST(7, LEAST(56, (effective_today - run_start) + 1))::numeric
      )::numeric(5,4)
    END,
    EXISTS (
      SELECT 1
      FROM public.notification_log log
      WHERE log.user_id = athlete.user_id
        AND log.notification_type = 'coach_checkin_reminder'
        AND log.sent_date = effective_today
    ),
    ARRAY_REMOVE(ARRAY[
      CASE WHEN EXISTS (
        SELECT 1 FROM public.native_push_devices device
        WHERE device.user_id = athlete.user_id AND device.platform = 'ios'
      ) THEN 'apns' END,
      CASE WHEN EXISTS (
        SELECT 1 FROM public.native_push_devices device
        WHERE device.user_id = athlete.user_id AND device.platform = 'android'
      ) THEN 'fcm' END,
      CASE WHEN EXISTS (
        SELECT 1 FROM public.push_subscriptions subscription
        WHERE subscription.user_id = athlete.user_id
      ) THEN 'web' END
    ], NULL)::text[]
  FROM athletes athlete
  LEFT JOIN public.profiles profile ON profile.id = athlete.user_id
  LEFT JOIN athlete_instances instance ON instance.user_id = athlete.user_id
  LEFT JOIN checkin_counts checkins ON checkins.user_id = athlete.user_id
  ORDER BY
    (checkins.today_checkin_at IS NULL) DESC,
    profile.full_name NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION public.get_coach_team_checkin_status_v1_4(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_coach_team_checkin_status_v1_4(uuid)
  TO authenticated;

COMMENT ON FUNCTION public.get_coach_team_checkin_status_v1_4(uuid) IS
  'Returns coach-visible check-in completion only: today, the shared run-scoped seven-day window, reminder state, and channel availability. No check-in values or private content.';

CREATE OR REPLACE FUNCTION public.claim_coach_checkin_reminder_v1_4(
  _team_id uuid,
  _requested_by uuid
)
RETURNS TABLE (
  campaign_id uuid,
  notification_log_id uuid,
  user_id uuid,
  program_instance_id uuid,
  program_local_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  active_run_id uuid;
  run_start date;
  run_timezone text;
  effective_today date;
  local_time time;
  team_is_test boolean := false;
  next_campaign_id uuid;
  claimed_eligible_count integer := 0;
BEGIN
  IF _requested_by IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.teams team
    WHERE team.id = _team_id
      AND (
        team.created_by = _requested_by
        OR EXISTS (
          SELECT 1
          FROM public.team_members member
          JOIN public.user_roles role
            ON role.user_id = member.user_id
           AND role.role::text IN ('coach', 'admin')
          WHERE member.team_id = team.id
            AND member.user_id = _requested_by
        )
        OR EXISTS (
          SELECT 1 FROM public.user_roles role
          WHERE role.user_id = _requested_by
            AND role.role::text = 'admin'
        )
      )
  ) THEN
    RAISE EXCEPTION 'access_denied' USING ERRCODE = '42501';
  END IF;

  SELECT run.id, run.started_at, run.timezone, COALESCE(team.is_test_team, false)
  INTO active_run_id, run_start, run_timezone, team_is_test
  FROM public.program_runs run
  JOIN public.teams team ON team.id = run.team_id
  WHERE run.team_id = _team_id
    AND run.status = 'active'
  ORDER BY run.started_at DESC NULLS LAST, run.created_at DESC
  LIMIT 1;

  IF active_run_id IS NULL OR run_start IS NULL THEN
    RAISE EXCEPTION 'program_not_started';
  END IF;

  IF team_is_test THEN
    SELECT override.simulated_date
    INTO effective_today
    FROM public.qa_time_overrides override
    WHERE override.scope = 'team'
      AND override.team_id = _team_id
    ORDER BY override.updated_at DESC
    LIMIT 1;
  END IF;

  effective_today := COALESCE(
    effective_today,
    (pg_catalog.timezone(run_timezone, pg_catalog.now()))::date
  );
  local_time := (pg_catalog.timezone(run_timezone, pg_catalog.now()))::time;

  IF effective_today < run_start THEN
    RAISE EXCEPTION 'program_not_started';
  END IF;

  IF NOT team_is_test AND (local_time < time '08:00' OR local_time > time '21:30') THEN
    RAISE EXCEPTION 'outside_reminder_window';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM app_private.coach_checkin_reminder_campaigns campaign
    WHERE campaign.team_id = _team_id
      AND campaign.program_date = effective_today
  ) THEN
    RAISE EXCEPTION 'reminder_already_requested';
  END IF;

  SELECT COUNT(DISTINCT member.user_id)::integer
  INTO claimed_eligible_count
  FROM public.team_members member
  JOIN public.user_roles role
    ON role.user_id = member.user_id
   AND role.role = 'athlete'::public.app_role
  JOIN public.program_instances instance
    ON instance.user_id = member.user_id
   AND instance.status = 'active'
   AND instance.program_run_id = active_run_id
  WHERE member.team_id = _team_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.daily_checkins checkin
      WHERE checkin.program_instance_id = instance.id
        AND checkin.date = effective_today
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.notification_log log
      WHERE log.user_id = member.user_id
        AND log.notification_type = 'coach_checkin_reminder'
        AND log.sent_date = effective_today
    );

  IF claimed_eligible_count = 0 THEN
    RAISE EXCEPTION 'no_open_checkins';
  END IF;

  INSERT INTO app_private.coach_checkin_reminder_campaigns (
    team_id,
    program_run_id,
    requested_by,
    program_date,
    timezone,
    is_test
  ) VALUES (
    _team_id,
    active_run_id,
    _requested_by,
    effective_today,
    run_timezone,
    team_is_test
  )
  ON CONFLICT (team_id, program_date) DO NOTHING
  RETURNING id INTO next_campaign_id;

  IF next_campaign_id IS NULL THEN
    RAISE EXCEPTION 'reminder_already_requested';
  END IF;

  RETURN QUERY
  WITH eligible AS (
    SELECT DISTINCT
      member.user_id,
      instance.id AS program_instance_id
    FROM public.team_members member
    JOIN public.user_roles role
      ON role.user_id = member.user_id
     AND role.role = 'athlete'::public.app_role
    JOIN public.program_instances instance
      ON instance.user_id = member.user_id
     AND instance.status = 'active'
     AND instance.program_run_id = active_run_id
    WHERE member.team_id = _team_id
      AND NOT EXISTS (
        SELECT 1
        FROM public.daily_checkins checkin
        WHERE checkin.program_instance_id = instance.id
          AND checkin.date = effective_today
      )
  ), inserted_logs AS (
    INSERT INTO public.notification_log (
      user_id,
      notification_type,
      sent_date,
      status,
      scheduled_for,
      target_url,
      metadata
    )
    SELECT
      eligible.user_id,
      'coach_checkin_reminder',
      effective_today,
      'pending',
      pg_catalog.now(),
      '/dashboard?focus=checkin',
      pg_catalog.jsonb_build_object(
        'source', 'coach_bulk',
        'campaign_id', next_campaign_id,
        'copy_version', 'coach-checkin-reminder-v1'
      )
    FROM eligible
    ON CONFLICT ON CONSTRAINT notification_log_user_id_notification_type_sent_date_key DO NOTHING
    RETURNING notification_log.id, notification_log.user_id
  ), claimed AS (
    SELECT
      next_campaign_id AS campaign_id,
      log.id AS notification_log_id,
      log.user_id,
      eligible.program_instance_id,
      effective_today AS program_local_date
    FROM inserted_logs log
    JOIN eligible ON eligible.user_id = log.user_id
  ), update_campaign AS (
    UPDATE app_private.coach_checkin_reminder_campaigns campaign
    SET eligible_count = claimed_eligible_count
    WHERE campaign.id = next_campaign_id
    RETURNING campaign.id
  )
  SELECT
    claimed.campaign_id,
    claimed.notification_log_id,
    claimed.user_id,
    claimed.program_instance_id,
    claimed.program_local_date
  FROM claimed, update_campaign;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_coach_checkin_reminder_v1_4(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_coach_checkin_reminder_v1_4(uuid, uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.finalize_coach_checkin_reminder_v1_4(
  _campaign_id uuid,
  _accepted_users integer,
  _failed_users integer,
  _skipped_completed integer,
  _skipped_no_channel integer,
  _endpoint_attempts integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF _accepted_users IS NULL
    OR _failed_users IS NULL
    OR _skipped_completed IS NULL
    OR _skipped_no_channel IS NULL
    OR _endpoint_attempts IS NULL
    OR LEAST(
      _accepted_users,
      _failed_users,
      _skipped_completed,
      _skipped_no_channel,
      _endpoint_attempts
    ) < 0 THEN
    RAISE EXCEPTION 'invalid_counts';
  END IF;

  UPDATE app_private.coach_checkin_reminder_campaigns campaign
  SET accepted_users = _accepted_users,
      failed_users = _failed_users,
      skipped_completed = _skipped_completed,
      skipped_no_channel = _skipped_no_channel,
      endpoint_attempts = _endpoint_attempts,
      status = CASE
        WHEN _failed_users = 0 THEN 'completed'
        WHEN _accepted_users > 0 THEN 'partial'
        ELSE 'failed'
      END,
      completed_at = pg_catalog.now()
  WHERE campaign.id = _campaign_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'campaign_not_found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_coach_checkin_reminder_v1_4(
  uuid, integer, integer, integer, integer, integer
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_coach_checkin_reminder_v1_4(
  uuid, integer, integer, integer, integer, integer
) TO service_role;

COMMENT ON TABLE app_private.coach_checkin_reminder_campaigns IS
  'Operational audit for one-a-day coach-triggered check-in reminders. Contains no check-in answers or private athlete content.';

CREATE OR REPLACE FUNCTION app_private.cleanup_coach_checkin_reminder_campaigns_v1_4()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  DELETE FROM app_private.coach_checkin_reminder_campaigns campaign
  WHERE campaign.created_at < pg_catalog.now() - interval '90 days';
$$;

REVOKE ALL ON FUNCTION app_private.cleanup_coach_checkin_reminder_campaigns_v1_4()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION app_private.cleanup_coach_checkin_reminder_campaigns_v1_4()
  TO service_role;

SELECT cron.schedule(
  'coach-checkin-reminder-retention-daily',
  '41 3 * * *',
  'SELECT app_private.cleanup_coach_checkin_reminder_campaigns_v1_4();'
);

COMMIT;
