-- Athlete-visible feedback text consent history and self-service withdrawal.
-- This does not activate collection. It exposes only the signed-in athlete's
-- own minimized receipt metadata; raw text is never returned.

BEGIN;

CREATE OR REPLACE FUNCTION public.list_my_feedback_text_consents()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := auth.uid();
  result jsonb;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required'
      USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'consent_reference', receipt.consent_reference,
        'campaign_reference', campaign.campaign_reference,
        'checkpoint_day', campaign.checkpoint_day,
        'state', receipt.state,
        'scope', receipt.scope,
        'consent_version', receipt.consent_version,
        'granted_at', receipt.granted_at,
        'withdrawn_at', receipt.withdrawn_at
      )
      ORDER BY receipt.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO result
  FROM feedback_consent.text_consent_receipts receipt
  INNER JOIN feedback_core.submissions submission
    ON submission.id = receipt.submission_id
   AND submission.user_id = actor_id
  INNER JOIN feedback_core.campaigns campaign
    ON campaign.id = submission.campaign_id
  WHERE receipt.user_id = actor_id
    AND receipt.state IN ('granted', 'withdrawn');

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.list_my_feedback_text_consents()
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_my_feedback_text_consents()
  TO authenticated;

COMMENT ON FUNCTION public.list_my_feedback_text_consents() IS
  'Returns only the signed-in athlete own minimized feedback text consent receipt metadata; never returns raw text.';

COMMIT;
