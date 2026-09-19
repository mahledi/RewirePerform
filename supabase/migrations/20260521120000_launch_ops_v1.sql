CREATE TABLE IF NOT EXISTS public.app_event_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  role text CHECK (role IN ('athlete', 'coach', 'admin')),
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  event_name text NOT NULL,
  status text NOT NULL DEFAULT 'success'
    CHECK (status IN ('attempted', 'success', 'failed', 'opened', 'skipped')),
  route text,
  error_code text,
  is_test boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.app_event_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own app events" ON public.app_event_log;
DROP POLICY IF EXISTS "Admins read app events" ON public.app_event_log;

CREATE POLICY "Users insert own app events"
ON public.app_event_log
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins read app events"
ON public.app_event_log
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
  )
);

CREATE INDEX IF NOT EXISTS idx_app_event_log_created_at
  ON public.app_event_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_event_log_event_status_created
  ON public.app_event_log(event_name, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_event_log_user_created
  ON public.app_event_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_event_log_is_test_created
  ON public.app_event_log(is_test, created_at DESC);

CREATE OR REPLACE FUNCTION public.get_admin_ops_status(include_test boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  WITH filtered_events AS (
    SELECT *
    FROM public.app_event_log e
    WHERE include_test OR NOT COALESCE(e.is_test, false)
  ),
  recent_failures AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'created_at', created_at,
        'event_name', event_name,
        'status', status,
        'role', role,
        'route', route,
        'error_code', error_code,
        'is_test', is_test
      )
      ORDER BY created_at DESC
    ) AS rows
    FROM (
      SELECT created_at, event_name, status, role, route, error_code, is_test
      FROM filtered_events
      WHERE status = 'failed'
      ORDER BY created_at DESC
      LIMIT 20
    ) x
  ),
  failures_by_flow AS (
    SELECT COALESCE(jsonb_object_agg(event_name, failure_count), '{}'::jsonb) AS rows
    FROM (
      SELECT event_name, COUNT(*)::int AS failure_count
      FROM filtered_events
      WHERE status = 'failed'
        AND created_at >= now() - interval '24 hours'
      GROUP BY event_name
      ORDER BY event_name
    ) x
  ),
  qa_split AS (
    SELECT jsonb_build_object(
      'production_events_24h', COUNT(*) FILTER (WHERE NOT COALESCE(is_test, false) AND created_at >= now() - interval '24 hours'),
      'qa_events_24h', COUNT(*) FILTER (WHERE COALESCE(is_test, false) AND created_at >= now() - interval '24 hours'),
      'production_failures_24h', COUNT(*) FILTER (WHERE NOT COALESCE(is_test, false) AND status = 'failed' AND created_at >= now() - interval '24 hours'),
      'qa_failures_24h', COUNT(*) FILTER (WHERE COALESCE(is_test, false) AND status = 'failed' AND created_at >= now() - interval '24 hours')
    ) AS rows
    FROM public.app_event_log
  ),
  push_status AS (
    SELECT jsonb_build_object(
      'sent_7d', COUNT(*) FILTER (WHERE nl.status = 'sent'),
      'opened_7d', COUNT(*) FILTER (WHERE nl.status = 'opened'),
      'failed_7d', COUNT(*) FILTER (WHERE nl.status = 'failed'),
      'expired_subscriptions_7d', COUNT(*) FILTER (WHERE nl.status = 'expired_subscription')
    ) AS rows
    FROM public.notification_log nl
    LEFT JOIN public.profiles p ON p.id = nl.user_id
    WHERE nl.created_at >= now() - interval '7 days'
      AND (include_test OR NOT COALESCE(p.is_test_user, false))
  ),
  teams_below_min AS (
    SELECT COUNT(*)::int AS count
    FROM (
      SELECT tm.team_id
      FROM public.team_members tm
      JOIN public.user_roles ur ON ur.user_id = tm.user_id AND ur.role = 'athlete'
      LEFT JOIN public.profiles p ON p.id = tm.user_id
      WHERE include_test OR NOT COALESCE(p.is_test_user, false)
      GROUP BY tm.team_id
      HAVING COUNT(*) < 5
    ) x
  )
  SELECT jsonb_build_object(
    'generated_at', now(),
    'include_test', include_test,
    'window_days', 1,
    'events_last_24h', (
      SELECT COUNT(*)::int FROM filtered_events WHERE created_at >= now() - interval '24 hours'
    ),
    'failed_events_24h', (
      SELECT COUNT(*)::int FROM filtered_events WHERE status = 'failed' AND created_at >= now() - interval '24 hours'
    ),
    'critical_failed_events_24h', (
      SELECT COUNT(*)::int
      FROM filtered_events
      WHERE status = 'failed'
        AND created_at >= now() - interval '24 hours'
        AND event_name IN (
          'auth_login',
          'auth_signup',
          'team_join_attempt',
          'daily_checkin_saved',
          'journal_saved',
          'assessment_saved',
          'deep_profile_saved',
          'pre_training_opened'
        )
    ),
    'flow_failures_24h', (SELECT rows FROM failures_by_flow),
    'recent_failed_events', COALESCE((SELECT rows FROM recent_failures), '[]'::jsonb),
    'push', (SELECT rows FROM push_status),
    'qa_vs_production', (SELECT rows FROM qa_split),
    'teams_below_min_n', (SELECT count FROM teams_below_min),
    'privacy_level', 'technical_events_only',
    'privacy_exclusions', jsonb_build_array(
      'email',
      'journal_text',
      'free_reflection',
      'raw_questionnaire_answers',
      'individual_psychological_scores',
      'private_player_notes'
    )
  )
  INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_ops_status(boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_ops_status(boolean) TO authenticated;
