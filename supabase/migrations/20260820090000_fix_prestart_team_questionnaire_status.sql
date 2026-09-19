-- Count a completed onboarding questionnaire while a team is still waiting
-- for its first official program run. Once a run is active, remain strictly
-- scoped to that run. The RPC continues to expose status only.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_team_questionnaire_status(_team_id uuid)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  is_complete boolean,
  last_category_index integer,
  progress_updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_manage_team_program_runs(_team_id) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  RETURN QUERY
  WITH active_run AS (
    SELECT pr.id
    FROM public.program_runs pr
    WHERE pr.team_id = _team_id AND pr.status = 'active'
    ORDER BY pr.started_at DESC, pr.created_at DESC
    LIMIT 1
  ), athletes AS (
    SELECT DISTINCT tm.user_id
    FROM public.team_members tm
    JOIN public.user_roles ur ON ur.user_id = tm.user_id AND ur.role = 'athlete'
    WHERE tm.team_id = _team_id
  ), instances AS (
    SELECT pi.id, pi.user_id
    FROM public.program_instances pi
    JOIN athletes a ON a.user_id = pi.user_id
    WHERE pi.team_id = _team_id
      AND pi.status = 'active'
      AND (
        pi.program_run_id = (SELECT ar.id FROM active_run ar)
        OR (
          pi.program_run_id IS NULL
          AND NOT EXISTS (SELECT 1 FROM active_run)
        )
      )
  ), latest_q AS (
    SELECT DISTINCT ON (qr.user_id)
      qr.user_id, qr.is_complete, qr.last_category_index, qr.progress_updated_at
    FROM public.questionnaire_responses qr
    JOIN instances i ON i.id = qr.program_instance_id AND i.user_id = qr.user_id
    WHERE qr.instrument_id = 'onboarding_v2' OR qr.instrument_id IS NULL
    ORDER BY qr.user_id, qr.is_complete DESC, qr.progress_updated_at DESC, qr.created_at DESC
  )
  SELECT
    a.user_id,
    p.full_name,
    COALESCE(lq.is_complete, false),
    COALESCE(lq.last_category_index, 0),
    lq.progress_updated_at
  FROM athletes a
  LEFT JOIN public.profiles p ON p.id = a.user_id
  LEFT JOIN latest_q lq ON lq.user_id = a.user_id
  ORDER BY p.full_name NULLS LAST, a.user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_team_questionnaire_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_team_questionnaire_status(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_team_questionnaire_status(uuid) IS
  'Returns coach-safe onboarding completion status for the active run, or for the active unassigned team instance before the first run; never returns answers or scores.';

COMMIT;
