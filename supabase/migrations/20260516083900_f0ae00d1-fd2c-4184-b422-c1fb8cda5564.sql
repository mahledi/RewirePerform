
-- Test data flags
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_test_user boolean NOT NULL DEFAULT false;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS is_test_team boolean NOT NULL DEFAULT false;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;
ALTER TABLE public.program_instances ADD COLUMN IF NOT EXISTS is_test_instance boolean NOT NULL DEFAULT false;

-- QA time overrides
CREATE TABLE IF NOT EXISTS public.qa_time_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('team','user')),
  team_id uuid,
  user_id uuid,
  simulated_date date NOT NULL,
  simulated_day_number integer,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS qa_time_overrides_team_uniq ON public.qa_time_overrides(team_id) WHERE scope = 'team';
CREATE UNIQUE INDEX IF NOT EXISTS qa_time_overrides_user_uniq ON public.qa_time_overrides(user_id) WHERE scope = 'user';

ALTER TABLE public.qa_time_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage qa_time_overrides select" ON public.qa_time_overrides;
DROP POLICY IF EXISTS "Admins manage qa_time_overrides insert" ON public.qa_time_overrides;
DROP POLICY IF EXISTS "Admins manage qa_time_overrides update" ON public.qa_time_overrides;
DROP POLICY IF EXISTS "Admins manage qa_time_overrides delete" ON public.qa_time_overrides;

CREATE POLICY "Admins manage qa_time_overrides select" ON public.qa_time_overrides
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage qa_time_overrides insert" ON public.qa_time_overrides
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage qa_time_overrides update" ON public.qa_time_overrides
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage qa_time_overrides delete" ON public.qa_time_overrides
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER qa_time_overrides_touch
  BEFORE UPDATE ON public.qa_time_overrides
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Resolve simulated today for the current user (or real today)
CREATE OR REPLACE FUNCTION public.get_effective_today(_user_id uuid)
RETURNS date
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_test boolean;
  v_sim date;
BEGIN
  IF _user_id IS NULL THEN
    RETURN CURRENT_DATE;
  END IF;
  SELECT COALESCE(is_test_user, false) INTO v_is_test FROM public.profiles WHERE id = _user_id;
  IF NOT COALESCE(v_is_test, false) THEN
    RETURN CURRENT_DATE;
  END IF;
  -- User-scoped override wins
  SELECT simulated_date INTO v_sim
    FROM public.qa_time_overrides
   WHERE scope = 'user' AND user_id = _user_id
   LIMIT 1;
  IF v_sim IS NOT NULL THEN RETURN v_sim; END IF;
  -- Team-scoped override
  SELECT qto.simulated_date INTO v_sim
    FROM public.qa_time_overrides qto
    JOIN public.team_members tm ON tm.team_id = qto.team_id
   WHERE qto.scope = 'team' AND tm.user_id = _user_id
   ORDER BY qto.updated_at DESC
   LIMIT 1;
  RETURN COALESCE(v_sim, CURRENT_DATE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_effective_today(uuid) TO authenticated;

-- Archive a QA cohort: wipe test data, mark team archived
CREATE OR REPLACE FUNCTION public.archive_qa_cohort(_team_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_ids uuid[];
  v_is_test boolean;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;
  SELECT is_test_team INTO v_is_test FROM public.teams WHERE id = _team_id;
  IF NOT COALESCE(v_is_test, false) THEN
    RAISE EXCEPTION 'Refusing to archive non-test team';
  END IF;

  SELECT array_agg(tm.user_id) INTO v_user_ids
  FROM public.team_members tm
  JOIN public.profiles p ON p.id = tm.user_id AND p.is_test_user = true
  WHERE tm.team_id = _team_id;
  v_user_ids := COALESCE(v_user_ids, ARRAY[]::uuid[]);

  IF array_length(v_user_ids, 1) > 0 THEN
    DELETE FROM public.daily_checkins WHERE user_id = ANY(v_user_ids);
    DELETE FROM public.daily_journals WHERE user_id = ANY(v_user_ids);
    DELETE FROM public.user_day_completion WHERE user_id = ANY(v_user_ids);
    DELETE FROM public.user_day_assignments WHERE user_id = ANY(v_user_ids);
    DELETE FROM public.comprehension_check_instances WHERE user_id = ANY(v_user_ids);
    DELETE FROM public.program_progress_snapshots WHERE user_id = ANY(v_user_ids);
    DELETE FROM public.assessments WHERE user_id = ANY(v_user_ids);
    DELETE FROM public.deep_profile_assessments WHERE user_id = ANY(v_user_ids);
    DELETE FROM public.questionnaire_responses WHERE user_id = ANY(v_user_ids);
    DELETE FROM public.personalized_tasks WHERE user_id = ANY(v_user_ids);
    DELETE FROM public.program_settings WHERE user_id = ANY(v_user_ids);
    DELETE FROM public.calendar_events WHERE user_id = ANY(v_user_ids);
    DELETE FROM public.training_schedule WHERE user_id = ANY(v_user_ids);
    DELETE FROM public.program_instances WHERE user_id = ANY(v_user_ids);
  END IF;

  DELETE FROM public.qa_time_overrides WHERE team_id = _team_id;
  DELETE FROM public.team_members WHERE team_id = _team_id;
  UPDATE public.teams SET is_archived = true, name = name || ' [archived ' || to_char(now(), 'YYYY-MM-DD HH24:MI') || ']' WHERE id = _team_id;

  RETURN json_build_object('success', true, 'archived_team_id', _team_id, 'wiped_users', COALESCE(array_length(v_user_ids,1), 0));
END;
$$;

GRANT EXECUTE ON FUNCTION public.archive_qa_cohort(uuid) TO authenticated;

-- Exclude test data from real admin metrics by default
CREATE OR REPLACE FUNCTION public.get_admin_overview_stats(include_test boolean DEFAULT false)
RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result json;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM public.profiles p WHERE include_test OR NOT p.is_test_user),
    'total_athletes', (SELECT COUNT(*) FROM public.user_roles ur JOIN public.profiles p ON p.id = ur.user_id WHERE ur.role = 'athlete' AND (include_test OR NOT p.is_test_user)),
    'total_coaches', (SELECT COUNT(*) FROM public.user_roles ur JOIN public.profiles p ON p.id = ur.user_id WHERE ur.role = 'coach' AND (include_test OR NOT p.is_test_user)),
    'total_admins', (SELECT COUNT(*) FROM public.user_roles ur WHERE ur.role = 'admin'),
    'total_teams', (SELECT COUNT(*) FROM public.teams t WHERE include_test OR NOT t.is_test_team),
    'active_teams', (SELECT COUNT(DISTINCT tm.team_id) FROM public.team_members tm JOIN public.teams t ON t.id = tm.team_id WHERE include_test OR NOT t.is_test_team),
    'total_completed_days', (SELECT COUNT(*) FROM public.user_day_completion udc LEFT JOIN public.profiles p ON p.id = udc.user_id WHERE udc.completion_status = 'completed' AND (include_test OR NOT COALESCE(p.is_test_user,false))),
    'total_checkins', (SELECT COUNT(*) FROM public.daily_checkins dc LEFT JOIN public.profiles p ON p.id = dc.user_id WHERE include_test OR NOT COALESCE(p.is_test_user,false)),
    'total_assessments', (SELECT COUNT(*) FROM public.assessments a LEFT JOIN public.profiles p ON p.id = a.user_id WHERE include_test OR NOT COALESCE(p.is_test_user,false)),
    'total_comprehension', (SELECT COUNT(*) FROM public.comprehension_check_instances c LEFT JOIN public.profiles p ON p.id = c.user_id WHERE c.status = 'completed' AND (include_test OR NOT COALESCE(p.is_test_user,false))),
    'avg_adherence', (
      SELECT ROUND(AVG(completion_rate)::numeric, 4)
      FROM (
        SELECT DISTINCT ON (pps.user_id) pps.user_id, pps.completion_rate
        FROM public.program_progress_snapshots pps
        LEFT JOIN public.profiles p ON p.id = pps.user_id
        WHERE include_test OR NOT COALESCE(p.is_test_user,false)
        ORDER BY pps.user_id, pps.date DESC
      ) latest
    ),
    'avg_comprehension_score', (
      SELECT ROUND(AVG(CASE WHEN total_count > 0 THEN correct_count::numeric / total_count ELSE NULL END)::numeric, 4)
      FROM public.comprehension_check_instances c
      LEFT JOIN public.profiles p ON p.id = c.user_id
      WHERE c.status = 'completed' AND (include_test OR NOT COALESCE(p.is_test_user,false))
    )
  ) INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_teams_summary(include_test boolean DEFAULT false)
RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result json;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;
  WITH team_data AS (
    SELECT
      t.id, t.name, t.sport, t.created_by, t.program_start_date, t.is_test_team, t.is_archived,
      p.full_name AS coach_name,
      (SELECT COUNT(*) FROM public.team_members tm WHERE tm.team_id = t.id) AS member_count,
      (SELECT COUNT(DISTINCT tm.user_id) FROM public.team_members tm
         JOIN public.user_roles ur ON ur.user_id = tm.user_id AND ur.role = 'athlete'
        WHERE tm.team_id = t.id) AS athlete_count,
      (SELECT COUNT(DISTINCT a.user_id) FROM public.assessments a JOIN public.team_members tm ON tm.user_id = a.user_id WHERE tm.team_id = t.id AND a.timing = 'pre') AS pre_n,
      (SELECT COUNT(DISTINCT a.user_id) FROM public.assessments a JOIN public.team_members tm ON tm.user_id = a.user_id WHERE tm.team_id = t.id AND a.timing = 'mid') AS mid_n,
      (SELECT COUNT(DISTINCT a.user_id) FROM public.assessments a JOIN public.team_members tm ON tm.user_id = a.user_id WHERE tm.team_id = t.id AND a.timing = 'post') AS post_n,
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
    WHERE include_test OR NOT t.is_test_team
  )
  SELECT COALESCE(json_agg(json_build_object(
    'id', id, 'name', name, 'sport', sport, 'coach_name', coach_name,
    'created_by', created_by, 'program_start_date', program_start_date,
    'is_test_team', is_test_team, 'is_archived', is_archived,
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
