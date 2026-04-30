
ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS admin_note text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

DROP POLICY IF EXISTS "Admins can read all feedback" ON public.feedback;
CREATE POLICY "Admins can read all feedback" ON public.feedback
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can update feedback moderation" ON public.feedback;
CREATE POLICY "Admins can update feedback moderation" ON public.feedback
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can read all team_members" ON public.team_members;
CREATE POLICY "Admins can read all team_members" ON public.team_members
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can read all program_instances" ON public.program_instances;
CREATE POLICY "Admins can read all program_instances" ON public.program_instances
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can read all user_roles" ON public.user_roles;
CREATE POLICY "Admins can read all user_roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.get_admin_overview_stats()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result json;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;
  SELECT json_build_object(
    'total_users',          (SELECT COUNT(*) FROM public.profiles),
    'total_athletes',       (SELECT COUNT(*) FROM public.user_roles WHERE role = 'athlete'),
    'total_coaches',        (SELECT COUNT(*) FROM public.user_roles WHERE role = 'coach'),
    'total_admins',         (SELECT COUNT(*) FROM public.user_roles WHERE role = 'admin'),
    'total_teams',          (SELECT COUNT(*) FROM public.teams),
    'active_teams',         (SELECT COUNT(DISTINCT team_id) FROM public.team_members),
    'total_completed_days', (SELECT COUNT(*) FROM public.user_day_completion WHERE completion_status = 'completed'),
    'total_checkins',       (SELECT COUNT(*) FROM public.daily_checkins),
    'total_assessments',    (SELECT COUNT(*) FROM public.assessments),
    'total_comprehension',  (SELECT COUNT(*) FROM public.comprehension_check_instances WHERE status = 'completed'),
    'avg_adherence', (
      SELECT ROUND(AVG(completion_rate)::numeric, 4)
      FROM (
        SELECT DISTINCT ON (user_id) user_id, completion_rate
        FROM public.program_progress_snapshots
        ORDER BY user_id, date DESC
      ) latest
    ),
    'avg_comprehension_score', (
      SELECT ROUND(AVG(
        CASE WHEN total_count > 0 THEN correct_count::numeric / total_count ELSE NULL END
      )::numeric, 4)
      FROM public.comprehension_check_instances WHERE status = 'completed'
    )
  ) INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_teams_summary()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result json;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;
  WITH team_data AS (
    SELECT
      t.id, t.name, t.sport, t.created_by, t.program_start_date,
      p.full_name AS coach_name,
      (SELECT COUNT(*) FROM public.team_members tm WHERE tm.team_id = t.id) AS member_count,
      (SELECT COUNT(DISTINCT tm.user_id) FROM public.team_members tm
         JOIN public.user_roles ur ON ur.user_id = tm.user_id AND ur.role = 'athlete'
        WHERE tm.team_id = t.id) AS athlete_count,
      (SELECT COUNT(DISTINCT a.user_id) FROM public.assessments a
         JOIN public.team_members tm ON tm.user_id = a.user_id
        WHERE tm.team_id = t.id AND a.timing = 'pre') AS pre_n,
      (SELECT COUNT(DISTINCT a.user_id) FROM public.assessments a
         JOIN public.team_members tm ON tm.user_id = a.user_id
        WHERE tm.team_id = t.id AND a.timing = 'mid') AS mid_n,
      (SELECT COUNT(DISTINCT a.user_id) FROM public.assessments a
         JOIN public.team_members tm ON tm.user_id = a.user_id
        WHERE tm.team_id = t.id AND a.timing = 'post') AS post_n,
      (SELECT ROUND(AVG(s.completion_rate)::numeric, 4) FROM (
         SELECT DISTINCT ON (pps.user_id) pps.user_id, pps.completion_rate
         FROM public.program_progress_snapshots pps
         JOIN public.team_members tm ON tm.user_id = pps.user_id
         WHERE tm.team_id = t.id
         ORDER BY pps.user_id, pps.date DESC) s) AS avg_completion,
      (SELECT ROUND(AVG(s.days_completed)::numeric, 2) FROM (
         SELECT DISTINCT ON (pps.user_id) pps.user_id, pps.days_completed
         FROM public.program_progress_snapshots pps
         JOIN public.team_members tm ON tm.user_id = pps.user_id
         WHERE tm.team_id = t.id
         ORDER BY pps.user_id, pps.date DESC) s) AS avg_days_completed
    FROM public.teams t
    LEFT JOIN public.profiles p ON p.id = t.created_by
  )
  SELECT COALESCE(json_agg(json_build_object(
    'id', id, 'name', name, 'sport', sport, 'coach_name', coach_name,
    'created_by', created_by, 'program_start_date', program_start_date,
    'member_count', member_count, 'athlete_count', athlete_count,
    'pre_n', pre_n, 'mid_n', mid_n, 'post_n', post_n,
    'avg_completion', avg_completion, 'avg_days_completed', avg_days_completed,
    'evidence_status',
      CASE
        WHEN post_n >= 5 AND pre_n >= 5 THEN 'full_pre_post'
        WHEN mid_n >= 5 THEN 'mid_available'
        WHEN pre_n >= 5 THEN 'pre_only'
        WHEN pre_n > 0  THEN 'pre_partial'
        ELSE 'not_enough_data'
      END
  ) ORDER BY name), '[]'::json) INTO result FROM team_data;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_system_health()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result json;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;
  SELECT json_build_object(
    'users_missing_profile', (
      SELECT COUNT(*) FROM public.user_roles ur
      WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = ur.user_id)),
    'users_missing_role', (
      SELECT COUNT(*) FROM public.profiles p
      WHERE NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id)),
    'athletes_without_program_instance', (
      SELECT COUNT(*) FROM public.user_roles ur
      WHERE ur.role = 'athlete'
        AND NOT EXISTS (SELECT 1 FROM public.program_instances pi
          WHERE pi.user_id = ur.user_id AND pi.status = 'active')),
    'teams_below_min_n', (
      SELECT COUNT(*) FROM (
        SELECT t.id FROM public.teams t
        LEFT JOIN public.team_members tm ON tm.team_id = t.id
        GROUP BY t.id HAVING COUNT(tm.user_id) < 5) sub),
    'assessments_missing_instance', (
      SELECT COUNT(*) FROM public.assessments WHERE program_instance_id IS NULL),
    'completions_missing_instance', (
      SELECT COUNT(*) FROM public.user_day_completion WHERE program_instance_id IS NULL),
    'checkins_missing_instance', (
      SELECT COUNT(*) FROM public.daily_checkins WHERE program_instance_id IS NULL),
    'teams_without_evidence', (
      SELECT COUNT(*) FROM (
        SELECT t.id FROM public.teams t
        LEFT JOIN public.team_members tm ON tm.team_id = t.id
        LEFT JOIN public.assessments a ON a.user_id = tm.user_id AND a.timing = 'post'
        GROUP BY t.id HAVING COUNT(DISTINCT a.user_id) < 5) sub)
  ) INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_feedback_status(
  feedback_id uuid, new_status text, new_note text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;
  UPDATE public.feedback
  SET status = COALESCE(new_status, status),
      admin_note = COALESCE(new_note, admin_note),
      reviewed_at = CASE WHEN new_status IN ('reviewed','resolved') THEN now() ELSE reviewed_at END
  WHERE id = feedback_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_overview_stats() FROM anon, public;
REVOKE ALL ON FUNCTION public.get_admin_teams_summary() FROM anon, public;
REVOKE ALL ON FUNCTION public.get_admin_system_health() FROM anon, public;
REVOKE ALL ON FUNCTION public.update_feedback_status(uuid, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_admin_overview_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_teams_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_system_health() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_feedback_status(uuid, text, text) TO authenticated;
