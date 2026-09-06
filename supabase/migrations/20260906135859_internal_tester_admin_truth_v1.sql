-- Internal tester boundary: official Admin and Jarvis truth.
BEGIN;

CREATE OR REPLACE FUNCTION public.get_admin_teams_summary(include_test boolean DEFAULT false)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  result json;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  WITH team_data AS (
    SELECT
      team.id,
      team.name,
      team.sport,
      team.created_by,
      team.program_start_date,
      team.is_test_team,
      team.is_archived,
      coach.full_name AS coach_name,
      (
        SELECT COUNT(*)
        FROM public.team_members member
        JOIN public.profiles profile ON profile.id = member.user_id
        WHERE member.team_id = team.id
          AND (include_test OR NOT COALESCE(profile.is_test_user, false))
      ) AS member_count,
      (
        SELECT COUNT(DISTINCT member.user_id)
        FROM public.team_members member
        JOIN public.user_roles role
          ON role.user_id = member.user_id
         AND role.role = 'athlete'::public.app_role
        JOIN public.profiles profile ON profile.id = member.user_id
        WHERE member.team_id = team.id
          AND (include_test OR NOT COALESCE(profile.is_test_user, false))
      ) AS athlete_count,
      (
        SELECT COUNT(DISTINCT assessment.user_id)
        FROM public.assessments assessment
        JOIN public.team_members member ON member.user_id = assessment.user_id
        JOIN public.profiles profile ON profile.id = member.user_id
        WHERE member.team_id = team.id
          AND assessment.timing = 'pre'
          AND (include_test OR NOT COALESCE(profile.is_test_user, false))
      ) AS pre_n,
      (
        SELECT COUNT(DISTINCT assessment.user_id)
        FROM public.assessments assessment
        JOIN public.team_members member ON member.user_id = assessment.user_id
        JOIN public.profiles profile ON profile.id = member.user_id
        WHERE member.team_id = team.id
          AND assessment.timing = 'mid'
          AND (include_test OR NOT COALESCE(profile.is_test_user, false))
      ) AS mid_n,
      (
        SELECT COUNT(DISTINCT assessment.user_id)
        FROM public.assessments assessment
        JOIN public.team_members member ON member.user_id = assessment.user_id
        JOIN public.profiles profile ON profile.id = member.user_id
        WHERE member.team_id = team.id
          AND assessment.timing = 'post'
          AND (include_test OR NOT COALESCE(profile.is_test_user, false))
      ) AS post_n,
      (
        SELECT ROUND(AVG(snapshot.completion_rate)::numeric, 4)
        FROM (
          SELECT DISTINCT ON (progress.user_id)
            progress.user_id,
            progress.completion_rate
          FROM public.program_progress_snapshots progress
          JOIN public.team_members member ON member.user_id = progress.user_id
          JOIN public.profiles profile ON profile.id = member.user_id
          WHERE member.team_id = team.id
            AND (include_test OR NOT COALESCE(profile.is_test_user, false))
          ORDER BY progress.user_id, progress.date DESC
        ) snapshot
      ) AS avg_completion,
      (
        SELECT ROUND(AVG(snapshot.days_completed)::numeric, 2)
        FROM (
          SELECT DISTINCT ON (progress.user_id)
            progress.user_id,
            progress.days_completed
          FROM public.program_progress_snapshots progress
          JOIN public.team_members member ON member.user_id = progress.user_id
          JOIN public.profiles profile ON profile.id = member.user_id
          WHERE member.team_id = team.id
            AND (include_test OR NOT COALESCE(profile.is_test_user, false))
          ORDER BY progress.user_id, progress.date DESC
        ) snapshot
      ) AS avg_days_completed
    FROM public.teams team
    LEFT JOIN public.profiles coach ON coach.id = team.created_by
    WHERE include_test OR NOT COALESCE(team.is_test_team, false)
  )
  SELECT COALESCE(
    pg_catalog.json_agg(
      pg_catalog.json_build_object(
        'id', id,
        'name', name,
        'sport', sport,
        'coach_name', coach_name,
        'created_by', created_by,
        'program_start_date', program_start_date,
        'is_test_team', is_test_team,
        'is_archived', is_archived,
        'member_count', member_count,
        'athlete_count', athlete_count,
        'pre_n', pre_n,
        'mid_n', mid_n,
        'post_n', post_n,
        'avg_completion', avg_completion,
        'avg_days_completed', avg_days_completed,
        'evidence_status', CASE
          WHEN post_n >= 5 AND pre_n >= 5 THEN 'full_pre_post'
          WHEN mid_n >= 5 THEN 'mid_available'
          WHEN pre_n >= 5 THEN 'pre_only'
          WHEN pre_n > 0 THEN 'pre_partial'
          ELSE 'not_enough_data'
        END
      ) ORDER BY name
    ),
    '[]'::json
  ) INTO result
  FROM team_data;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_teams_summary(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_teams_summary(boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_system_health()
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  result json;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  SELECT pg_catalog.json_build_object(
    'users_missing_profile', (
      SELECT COUNT(*)
      FROM public.user_roles role
      WHERE NOT EXISTS (SELECT 1 FROM public.profiles profile WHERE profile.id = role.user_id)
    ),
    'users_missing_role', (
      SELECT COUNT(*)
      FROM public.profiles profile
      WHERE NOT COALESCE(profile.is_test_user, false)
        AND NOT EXISTS (SELECT 1 FROM public.user_roles role WHERE role.user_id = profile.id)
    ),
    'athletes_without_program_instance', (
      SELECT COUNT(*)
      FROM public.user_roles role
      JOIN public.profiles profile ON profile.id = role.user_id
      WHERE role.role = 'athlete'::public.app_role
        AND NOT COALESCE(profile.is_test_user, false)
        AND NOT EXISTS (
          SELECT 1 FROM public.program_instances instance
          WHERE instance.user_id = role.user_id
            AND instance.status = 'active'
            AND NOT COALESCE(instance.is_test_instance, false)
        )
    ),
    'teams_below_min_n', (
      SELECT COUNT(*)
      FROM (
        SELECT team.id
        FROM public.teams team
        LEFT JOIN public.team_members member ON member.team_id = team.id
        LEFT JOIN public.profiles profile
          ON profile.id = member.user_id
         AND NOT COALESCE(profile.is_test_user, false)
        WHERE NOT COALESCE(team.is_test_team, false)
        GROUP BY team.id
        HAVING COUNT(profile.id) < 5
      ) item
    ),
    'assessments_missing_instance', (
      SELECT COUNT(*)
      FROM public.assessments assessment
      JOIN public.profiles profile ON profile.id = assessment.user_id
      WHERE assessment.program_instance_id IS NULL
        AND NOT COALESCE(profile.is_test_user, false)
    ),
    'completions_missing_instance', (
      SELECT COUNT(*)
      FROM public.user_day_completion completion
      JOIN public.profiles profile ON profile.id = completion.user_id
      WHERE completion.program_instance_id IS NULL
        AND NOT COALESCE(profile.is_test_user, false)
    ),
    'checkins_missing_instance', (
      SELECT COUNT(*)
      FROM public.daily_checkins checkin
      JOIN public.profiles profile ON profile.id = checkin.user_id
      WHERE checkin.program_instance_id IS NULL
        AND NOT COALESCE(profile.is_test_user, false)
    ),
    'teams_without_evidence', (
      SELECT COUNT(*)
      FROM (
        SELECT team.id
        FROM public.teams team
        LEFT JOIN public.team_members member ON member.team_id = team.id
        LEFT JOIN public.profiles profile
          ON profile.id = member.user_id
         AND NOT COALESCE(profile.is_test_user, false)
        LEFT JOIN public.assessments assessment
          ON assessment.user_id = profile.id
         AND assessment.timing = 'post'
        WHERE NOT COALESCE(team.is_test_team, false)
        GROUP BY team.id
        HAVING COUNT(DISTINCT assessment.user_id) < 5
      ) item
    )
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_system_health() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_system_health() TO authenticated;


COMMIT;

