BEGIN;

-- Additive follow-up to the already staged organization inquiry foundation.
-- This file is versioned only. It must not be applied to Production without
-- Mahle's separate release approval and the documented public-intake gates.

ALTER TABLE public.organization_access_requests
  ADD COLUMN IF NOT EXISTS team_name text;

ALTER TABLE public.organization_access_requests
  DROP CONSTRAINT IF EXISTS organization_access_requests_team_name_check;
ALTER TABLE public.organization_access_requests
  ADD CONSTRAINT organization_access_requests_team_name_check
  CHECK (team_name IS NULL OR char_length(team_name) BETWEEN 2 AND 160);

ALTER TABLE public.organization_access_requests
  DROP CONSTRAINT IF EXISTS organization_access_requests_team_path_check;
ALTER TABLE public.organization_access_requests
  ADD CONSTRAINT organization_access_requests_team_path_check
  CHECK (
    (rollout_scope = 'single_team' AND team_name IS NOT NULL AND team_count_band = '1')
    OR (rollout_scope <> 'single_team' AND team_name IS NULL)
  );

ALTER TABLE public.organization_access_requests
  DROP CONSTRAINT IF EXISTS organization_access_requests_privacy_version_check;
ALTER TABLE public.organization_access_requests
  ADD CONSTRAINT organization_access_requests_privacy_version_check
  CHECK (privacy_version IN (
    'organization-inquiry-v1.1-2026-08-07',
    'organization-inquiry-v1.1-2026-08-10'
  ));

CREATE OR REPLACE FUNCTION public.submit_organization_access_request_service(_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  inserted_request public.organization_access_requests;
BEGIN
  IF _payload IS NULL OR jsonb_typeof(_payload) <> 'object' THEN
    RAISE EXCEPTION 'invalid_request_payload' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.organization_access_requests(
    contact_name, work_email, phone, job_title, preferred_contact,
    organization_name, organization_type, team_name, country_code, website, sports,
    athlete_age_groups, performance_levels, team_count_band,
    athlete_count_band, coach_count_band, rollout_scope, desired_start,
    goals, support_needs, context_note, source, locale, privacy_version,
    public_research_notice_acknowledged
  ) VALUES (
    _payload->>'contact_name', _payload->>'work_email', NULLIF(_payload->>'phone', ''),
    _payload->>'job_title', _payload->>'preferred_contact',
    _payload->>'organization_name', _payload->>'organization_type',
    NULLIF(_payload->>'team_name', ''), _payload->>'country_code',
    NULLIF(_payload->>'website', ''),
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(_payload->'sports', '[]'::jsonb))),
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(_payload->'athlete_age_groups', '[]'::jsonb))),
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(_payload->'performance_levels', '[]'::jsonb))),
    _payload->>'team_count_band', _payload->>'athlete_count_band',
    _payload->>'coach_count_band', _payload->>'rollout_scope',
    _payload->>'desired_start',
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(_payload->'goals', '[]'::jsonb))),
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(_payload->'support_needs', '[]'::jsonb))),
    NULLIF(_payload->>'context_note', ''), _payload->>'source',
    _payload->>'locale', _payload->>'privacy_version',
    COALESCE((_payload->>'public_research_notice_acknowledged')::boolean, false)
  ) RETURNING * INTO inserted_request;

  INSERT INTO public.organization_access_request_events(
    request_id, event_type, metadata
  ) VALUES (
    inserted_request.id, 'submitted',
    jsonb_build_object('source', inserted_request.source)
  );

  RETURN jsonb_build_object(
    'id', inserted_request.id,
    'reference_code', inserted_request.reference_code
  );
END;
$$;
REVOKE ALL ON FUNCTION public.submit_organization_access_request_service(jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_organization_access_request_service(jsonb)
  TO service_role;

CREATE OR REPLACE VIEW app_private.organization_inquiry_machine_read_v1
WITH (security_invoker = true)
AS
SELECT
  r.id,
  r.reference_code,
  r.status,
  r.contact_name,
  r.work_email,
  r.job_title,
  r.organization_name,
  r.organization_type,
  r.country_code,
  r.website,
  r.sports,
  r.athlete_age_groups,
  r.performance_levels,
  r.team_count_band,
  r.athlete_count_band,
  r.coach_count_band,
  r.rollout_scope,
  r.desired_start,
  r.goals,
  r.support_needs,
  r.submitted_at,
  r.updated_at,
  r.team_name
FROM public.organization_access_requests r;

REVOKE ALL ON app_private.organization_inquiry_machine_read_v1
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON VIEW app_private.organization_inquiry_machine_read_v1 IS
  'Fail-closed Jarvis draft contract. Includes business-only team context; no grant, network consumer, credentials or Production activation.';

COMMIT;
