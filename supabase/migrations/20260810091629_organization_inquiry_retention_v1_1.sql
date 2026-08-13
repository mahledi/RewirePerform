BEGIN;

-- Personal data from requests that never become a partnership is not kept
-- indefinitely. Active/approved requests are intentionally outside this
-- cleanup because their business relationship is managed separately.
CREATE OR REPLACE FUNCTION app_private.cleanup_expired_organization_access_requests()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  deleted_count integer;
BEGIN
  WITH deleted AS (
    DELETE FROM public.organization_access_requests request
    WHERE request.status IN ('declined', 'withdrawn')
      AND request.updated_at < now() - interval '365 days'
    RETURNING request.id
  )
  SELECT count(*)::integer INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION app_private.cleanup_expired_organization_access_requests()
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION app_private.cleanup_expired_organization_access_requests() IS
  'Daily retention cleanup: permanently deletes declined or withdrawn organization inquiries after at most 365 days. Related request events cascade. Approved and active partnerships are excluded.';

-- Fake/spam requests may be removed immediately, but only by an authenticated
-- platform admin after an exact destructive-action confirmation. No public or
-- service-role execution path is opened.
CREATE OR REPLACE FUNCTION public.delete_organization_access_request_spam(
  _request_id uuid,
  _confirmation text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  actor_id uuid := auth.uid();
  target_reference text;
  target_status text;
BEGIN
  IF actor_id IS NULL OR NOT app_private.is_admin(actor_id) THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;
  IF _confirmation <> 'DELETE_FAKE_OR_SPAM' THEN
    RAISE EXCEPTION 'exact_confirmation_required' USING ERRCODE = '22023';
  END IF;

  SELECT request.reference_code, request.status
  INTO target_reference, target_status
  FROM public.organization_access_requests request
  WHERE request.id = _request_id
  FOR UPDATE;

  IF target_reference IS NULL THEN
    RAISE EXCEPTION 'request_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF target_status NOT IN (
    'submitted', 'needs_information', 'review_ready', 'call_requested',
    'declined', 'withdrawn'
  ) THEN
    RAISE EXCEPTION 'active_or_approved_request_cannot_be_purged'
      USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.organization_access_requests
  WHERE id = _request_id;

  RETURN jsonb_build_object(
    'success', true,
    'request_id', _request_id,
    'reference_code', target_reference,
    'reason', 'fake_or_spam'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_organization_access_request_spam(uuid, text)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.delete_organization_access_request_spam(uuid, text)
  TO authenticated;

COMMENT ON FUNCTION public.delete_organization_access_request_spam(uuid, text) IS
  'Admin-only immediate and permanent deletion for confirmed fake or spam inquiries. Cannot delete approved or active partnership requests.';

SELECT cron.schedule(
  'organization-inquiry-retention-daily',
  '17 4 * * *',
  'SELECT app_private.cleanup_expired_organization_access_requests();'
);

COMMIT;
