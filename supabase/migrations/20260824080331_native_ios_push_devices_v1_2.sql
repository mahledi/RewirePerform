-- iOS APNs delivery tokens are technical notification-routing data only.
-- They are written by the authenticated owner after the existing voluntary
-- notification onboarding and are never exposed to another app user.
CREATE TABLE public.native_push_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL DEFAULT 'ios' CHECK (platform = 'ios'),
  device_token text NOT NULL UNIQUE CHECK (char_length(device_token) BETWEEN 16 AND 512),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.native_push_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own native_push_devices"
  ON public.native_push_devices FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);
CREATE POLICY "Users insert own native_push_devices"
  ON public.native_push_devices FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id AND platform = 'ios');
CREATE POLICY "Users update own native_push_devices"
  ON public.native_push_devices FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id AND platform = 'ios');
CREATE POLICY "Users delete own native_push_devices"
  ON public.native_push_devices FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE TRIGGER trg_native_push_devices_updated_at
  BEFORE UPDATE ON public.native_push_devices
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

COMMENT ON TABLE public.native_push_devices IS
  'Voluntary iOS APNs delivery tokens; no notification content or behavioural analytics.';
