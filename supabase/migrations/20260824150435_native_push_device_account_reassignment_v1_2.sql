-- An APNs token belongs to the current app installation, not permanently to
-- the first account used on that device. Testers and shared devices can sign
-- out and sign in with another account. Transfer that exact token only when
-- the inserting row is owner-bound to the current authenticated user.
CREATE OR REPLACE FUNCTION app_private.reassign_native_push_device_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, app_private
AS $$
BEGIN
  IF auth.uid() IS NULL OR NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'native push device owner mismatch'
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.native_push_devices
  WHERE device_token = NEW.device_token
    AND user_id IS DISTINCT FROM NEW.user_id;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION app_private.reassign_native_push_device_before_insert()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_native_push_device_reassign_before_insert
  ON public.native_push_devices;

CREATE TRIGGER trg_native_push_device_reassign_before_insert
  BEFORE INSERT ON public.native_push_devices
  FOR EACH ROW
  EXECUTE FUNCTION app_private.reassign_native_push_device_before_insert();
