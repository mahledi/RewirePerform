
-- ============================================
-- 1. PROGRAM INSTANCES
-- ============================================
CREATE TABLE IF NOT EXISTS public.program_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  team_id UUID,
  cycle_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'completed' | 'abandoned'
  started_at DATE NOT NULL DEFAULT CURRENT_DATE,
  ended_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_program_instances_user ON public.program_instances(user_id);
CREATE INDEX IF NOT EXISTS idx_program_instances_team ON public.program_instances(team_id);
CREATE INDEX IF NOT EXISTS idx_program_instances_user_status ON public.program_instances(user_id, status);
-- Only one active instance per user (a player can be active in only one cohort at a time)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_program_instances_active_per_user
  ON public.program_instances(user_id) WHERE status = 'active';

ALTER TABLE public.program_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own instances"
  ON public.program_instances FOR SELECT
  TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users insert own instances"
  ON public.program_instances FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own instances"
  ON public.program_instances FOR UPDATE
  TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.touch_program_instances_updated_at()
RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_touch_program_instances ON public.program_instances;
CREATE TRIGGER trg_touch_program_instances
  BEFORE UPDATE ON public.program_instances
  FOR EACH ROW EXECUTE FUNCTION public.touch_program_instances_updated_at();

-- ============================================
-- 2. ADD program_instance_id COLUMNS
-- ============================================
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS program_instance_id UUID;
ALTER TABLE public.program_progress_snapshots ADD COLUMN IF NOT EXISTS program_instance_id UUID;
ALTER TABLE public.user_day_completion ADD COLUMN IF NOT EXISTS program_instance_id UUID;
ALTER TABLE public.comprehension_check_instances ADD COLUMN IF NOT EXISTS program_instance_id UUID;
ALTER TABLE public.daily_checkins ADD COLUMN IF NOT EXISTS program_instance_id UUID;
ALTER TABLE public.daily_journals ADD COLUMN IF NOT EXISTS program_instance_id UUID;

-- ============================================
-- 3. BACKFILL — one cycle per user, attach all rows
-- ============================================
DO $$
DECLARE
  u_record RECORD;
  new_instance_id UUID;
  inferred_team UUID;
  inferred_start DATE;
BEGIN
  FOR u_record IN
    SELECT DISTINCT user_id FROM (
      SELECT user_id FROM public.assessments WHERE user_id IS NOT NULL
      UNION SELECT user_id FROM public.program_progress_snapshots WHERE user_id IS NOT NULL
      UNION SELECT user_id FROM public.user_day_completion WHERE user_id IS NOT NULL
      UNION SELECT user_id FROM public.comprehension_check_instances WHERE user_id IS NOT NULL
      UNION SELECT user_id FROM public.daily_checkins WHERE user_id IS NOT NULL
      UNION SELECT user_id FROM public.daily_journals WHERE user_id IS NOT NULL
    ) s
  LOOP
    -- Skip if already has an instance
    IF EXISTS (SELECT 1 FROM public.program_instances WHERE user_id = u_record.user_id) THEN
      CONTINUE;
    END IF;

    -- Pick first team membership if any
    SELECT tm.team_id INTO inferred_team
    FROM public.team_members tm WHERE tm.user_id = u_record.user_id
    ORDER BY tm.joined_at ASC LIMIT 1;

    -- Pick program_start from program_settings, else earliest activity
    SELECT ps.program_start INTO inferred_start
    FROM public.program_settings ps WHERE ps.user_id = u_record.user_id
    ORDER BY ps.created_at ASC LIMIT 1;

    IF inferred_start IS NULL THEN
      inferred_start := CURRENT_DATE;
    END IF;

    INSERT INTO public.program_instances(user_id, team_id, cycle_number, status, started_at)
    VALUES (u_record.user_id, inferred_team, 1, 'active', inferred_start)
    RETURNING id INTO new_instance_id;

    UPDATE public.assessments SET program_instance_id = new_instance_id
      WHERE user_id = u_record.user_id AND program_instance_id IS NULL;
    UPDATE public.program_progress_snapshots SET program_instance_id = new_instance_id
      WHERE user_id = u_record.user_id AND program_instance_id IS NULL;
    UPDATE public.user_day_completion SET program_instance_id = new_instance_id
      WHERE user_id = u_record.user_id AND program_instance_id IS NULL;
    UPDATE public.comprehension_check_instances SET program_instance_id = new_instance_id
      WHERE user_id = u_record.user_id AND program_instance_id IS NULL;
    UPDATE public.daily_checkins SET program_instance_id = new_instance_id
      WHERE user_id = u_record.user_id AND program_instance_id IS NULL;
    UPDATE public.daily_journals SET program_instance_id = new_instance_id
      WHERE user_id = u_record.user_id AND program_instance_id IS NULL;
  END LOOP;
END $$;

-- ============================================
-- 4. NEW COHORT-SCOPED UNIQUES
-- ============================================
DROP INDEX IF EXISTS public.idx_assessments_user_type_timing;
CREATE UNIQUE INDEX IF NOT EXISTS idx_assessments_instance_type_timing
  ON public.assessments(user_id, program_instance_id, assessment_type, timing)
  WHERE user_id IS NOT NULL AND program_instance_id IS NOT NULL;

ALTER TABLE public.program_progress_snapshots
  DROP CONSTRAINT IF EXISTS program_progress_snapshots_user_date_unique;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_snapshots_user_instance_date
  ON public.program_progress_snapshots(user_id, program_instance_id, date)
  WHERE program_instance_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assessments_instance ON public.assessments(program_instance_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_instance ON public.program_progress_snapshots(program_instance_id);

-- ============================================
-- 5. PRIVACY HARDENING — strict aggregate-only for coaches
-- ============================================
DROP POLICY IF EXISTS "Coaches can view team checkins" ON public.daily_checkins;
DROP POLICY IF EXISTS "Coaches can view team assessments" ON public.assessments;

-- ============================================
-- 6. REWRITE compute_team_outcomes
-- ============================================
DROP FUNCTION IF EXISTS public.compute_team_outcomes(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.compute_team_outcomes(
  team_id_param UUID,
  min_n INTEGER DEFAULT 5
)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  team_owner UUID;
  athlete_ids UUID[];
  instance_ids UUID[];
  total_athletes INT;
  pre_n INT; mid_n INT; post_n INT;
  only_pre INT; pre_and_mid_no_post INT; completed_pre_post INT; never_started INT;
  adherence JSON;
  comprehension_agg JSON;
  weekly_trend JSON;
  subscale_changes JSON;
  result JSON;
BEGIN
  -- Authorize: only team creator
  SELECT created_by INTO team_owner FROM public.teams WHERE id = team_id_param;
  IF team_owner IS NULL OR team_owner != auth.uid() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Athletes in this team (role=athlete)
  SELECT array_agg(tm.user_id) INTO athlete_ids
  FROM public.team_members tm
  JOIN public.user_roles ur ON ur.user_id = tm.user_id AND ur.role = 'athlete'
  WHERE tm.team_id = team_id_param;
  athlete_ids := COALESCE(athlete_ids, ARRAY[]::UUID[]);
  total_athletes := COALESCE(array_length(athlete_ids, 1), 0);

  IF total_athletes = 0 THEN
    RETURN json_build_object(
      'sufficient_data', false, 'reason', 'no_athletes',
      'total_athletes', 0, 'min_n', min_n
    );
  END IF;

  -- Program instances tied to this team for these athletes
  SELECT array_agg(id) INTO instance_ids
  FROM public.program_instances
  WHERE user_id = ANY(athlete_ids) AND team_id = team_id_param;
  instance_ids := COALESCE(instance_ids, ARRAY[]::UUID[]);

  -- Assessment counts (distinct athletes)
  SELECT COUNT(DISTINCT user_id)::int INTO pre_n
  FROM public.assessments
  WHERE program_instance_id = ANY(instance_ids) AND timing = 'pre';

  SELECT COUNT(DISTINCT user_id)::int INTO mid_n
  FROM public.assessments
  WHERE program_instance_id = ANY(instance_ids) AND timing = 'mid';

  SELECT COUNT(DISTINCT user_id)::int INTO post_n
  FROM public.assessments
  WHERE program_instance_id = ANY(instance_ids) AND timing = 'post';

  -- Cohort breakdown
  WITH per_user AS (
    SELECT
      u AS user_id,
      EXISTS (SELECT 1 FROM public.assessments a WHERE a.user_id = u AND a.program_instance_id = ANY(instance_ids) AND a.timing = 'pre') AS has_pre,
      EXISTS (SELECT 1 FROM public.assessments a WHERE a.user_id = u AND a.program_instance_id = ANY(instance_ids) AND a.timing = 'mid') AS has_mid,
      EXISTS (SELECT 1 FROM public.assessments a WHERE a.user_id = u AND a.program_instance_id = ANY(instance_ids) AND a.timing = 'post') AS has_post
    FROM unnest(athlete_ids) AS u
  )
  SELECT
    COUNT(*) FILTER (WHERE NOT has_pre AND NOT has_mid AND NOT has_post)::int,
    COUNT(*) FILTER (WHERE has_pre AND NOT has_mid AND NOT has_post)::int,
    COUNT(*) FILTER (WHERE has_pre AND has_mid AND NOT has_post)::int,
    COUNT(*) FILTER (WHERE has_pre AND has_post)::int
  INTO never_started, only_pre, pre_and_mid_no_post, completed_pre_post
  FROM per_user;

  -- Adherence: latest snapshot per athlete within these instances
  WITH latest_snap AS (
    SELECT DISTINCT ON (user_id)
      user_id, days_available, days_completed, completion_rate,
      comprehension_average, current_streak, longest_streak
    FROM public.program_progress_snapshots
    WHERE program_instance_id = ANY(instance_ids)
    ORDER BY user_id, date DESC
  )
  SELECT json_build_object(
    'players_with_progress', COUNT(*)::int,
    'avg_completion_rate', ROUND(AVG(completion_rate)::numeric, 4),
    'avg_days_completed', ROUND(AVG(days_completed)::numeric, 2),
    'avg_days_available', ROUND(AVG(days_available)::numeric, 2),
    'avg_streak', ROUND(AVG(current_streak)::numeric, 2),
    'avg_comprehension', ROUND(AVG(comprehension_average)::numeric, 4)
  ) INTO adherence
  FROM latest_snap;

  -- Weekly mood/energy/focus trend (only buckets with >= min_n)
  WITH weekly AS (
    SELECT
      date_trunc('week', date::timestamp)::date AS week_start,
      COUNT(DISTINCT user_id)::int AS n_users,
      ROUND(AVG(mood_before)::numeric, 2) AS avg_mood,
      ROUND(AVG(energy_level)::numeric, 2) AS avg_energy,
      ROUND(AVG(focus_rating)::numeric, 2) AS avg_focus
    FROM public.daily_checkins
    WHERE program_instance_id = ANY(instance_ids)
    GROUP BY date_trunc('week', date::timestamp)
  )
  SELECT COALESCE(json_agg(
    json_build_object(
      'week_start', week_start, 'n_users', n_users,
      'avg_mood',   CASE WHEN n_users >= min_n THEN avg_mood   ELSE NULL END,
      'avg_energy', CASE WHEN n_users >= min_n THEN avg_energy ELSE NULL END,
      'avg_focus',  CASE WHEN n_users >= min_n THEN avg_focus  ELSE NULL END,
      'sufficient_data', n_users >= min_n
    ) ORDER BY week_start
  ), '[]'::json) INTO weekly_trend
  FROM weekly;

  -- Comprehension aggregate
  SELECT json_build_object(
    'avg_correct_rate',
      ROUND(AVG(CASE WHEN total_count > 0 THEN correct_count::numeric / total_count ELSE NULL END)::numeric, 4),
    'total_completed', COUNT(*)::int,
    'distinct_users', COUNT(DISTINCT user_id)::int
  ) INTO comprehension_agg
  FROM public.comprehension_check_instances
  WHERE program_instance_id = ANY(instance_ids) AND status = 'completed';

  -- Subscale-level paired changes (Pre→Post and Pre→Mid)
  -- Unpivot scores jsonb into (user_id, instance_id, assessment_type, subscale, timing, score)
  WITH unpivoted AS (
    SELECT
      a.user_id,
      a.program_instance_id,
      a.assessment_type,
      a.timing,
      kv.key   AS subscale,
      (kv.value)::numeric AS score
    FROM public.assessments a
    CROSS JOIN LATERAL jsonb_each_text(a.scores) AS kv(key, value)
    WHERE a.program_instance_id = ANY(instance_ids)
      AND a.scores IS NOT NULL
      AND kv.value ~ '^-?[0-9]+(\.[0-9]+)?$'
  ),
  per_user_avg AS (
    SELECT user_id, assessment_type, subscale, timing, AVG(score) AS score
    FROM unpivoted
    GROUP BY user_id, assessment_type, subscale, timing
  ),
  pp_pairs AS (
    SELECT a.assessment_type, a.subscale, a.user_id,
           a.score AS pre_score, b.score AS post_score,
           (b.score - a.score) AS diff
    FROM per_user_avg a
    JOIN per_user_avg b
      ON a.user_id = b.user_id
     AND a.assessment_type = b.assessment_type
     AND a.subscale = b.subscale
    WHERE a.timing = 'pre' AND b.timing = 'post'
  ),
  pm_pairs AS (
    SELECT a.assessment_type, a.subscale, a.user_id,
           a.score AS pre_score, m.score AS mid_score,
           (m.score - a.score) AS diff
    FROM per_user_avg a
    JOIN per_user_avg m
      ON a.user_id = m.user_id
     AND a.assessment_type = m.assessment_type
     AND a.subscale = m.subscale
    WHERE a.timing = 'pre' AND m.timing = 'mid'
  ),
  pp_summary AS (
    SELECT
      assessment_type, subscale,
      COUNT(*)::int AS n_pairs,
      ROUND(AVG(pre_score)::numeric, 2)  AS avg_pre,
      ROUND(AVG(post_score)::numeric, 2) AS avg_post,
      ROUND((AVG(post_score) - AVG(pre_score))::numeric, 2) AS abs_change,
      CASE WHEN ABS(AVG(pre_score)) > 0.5
        THEN ROUND((((AVG(post_score) - AVG(pre_score)) / NULLIF(AVG(pre_score),0)) * 100)::numeric, 1)
        ELSE NULL END AS pct_change,
      CASE
        WHEN COUNT(*) >= min_n AND STDDEV_SAMP(diff) > 0
        THEN ROUND((AVG(diff) / NULLIF(STDDEV_SAMP(diff),0))::numeric, 3)
        ELSE NULL END AS cohens_d_z,
      (COUNT(*) >= min_n) AS sufficient_data,
      (COUNT(*) < 10)     AS low_confidence
    FROM pp_pairs
    GROUP BY assessment_type, subscale
  ),
  pm_summary AS (
    SELECT
      assessment_type, subscale,
      COUNT(*)::int AS n_pairs,
      ROUND(AVG(pre_score)::numeric, 2) AS avg_pre,
      ROUND(AVG(mid_score)::numeric, 2) AS avg_mid,
      ROUND((AVG(mid_score) - AVG(pre_score))::numeric, 2) AS abs_change,
      CASE WHEN ABS(AVG(pre_score)) > 0.5
        THEN ROUND((((AVG(mid_score) - AVG(pre_score)) / NULLIF(AVG(pre_score),0)) * 100)::numeric, 1)
        ELSE NULL END AS pct_change,
      (COUNT(*) >= min_n) AS sufficient_data,
      (COUNT(*) < 10)     AS low_confidence
    FROM pm_pairs
    GROUP BY assessment_type, subscale
  )
  SELECT json_build_object(
    'pre_post', COALESCE((SELECT json_agg(row_to_json(pp_summary) ORDER BY assessment_type, subscale) FROM pp_summary), '[]'::json),
    'pre_mid',  COALESCE((SELECT json_agg(row_to_json(pm_summary) ORDER BY assessment_type, subscale) FROM pm_summary), '[]'::json)
  ) INTO subscale_changes;

  result := json_build_object(
    'team_id', team_id_param,
    'min_n', min_n,
    'total_athletes', total_athletes,
    'sufficient_data', total_athletes >= min_n,
    'cohort_breakdown', json_build_object(
      'never_started', never_started,
      'only_pre', only_pre,
      'pre_and_mid_no_post', pre_and_mid_no_post,
      'completed_pre_post', completed_pre_post
    ),
    'assessment_completion', json_build_object(
      'pre_n', pre_n, 'mid_n', mid_n, 'post_n', post_n
    ),
    'adherence', adherence,
    'changes', subscale_changes,
    'comprehension', comprehension_agg,
    'weekly_trend', weekly_trend,
    'disclaimer', 'Hinweis: Veränderungen sind beobachtet, nicht kausal. Ohne Kontrollgruppe keine Wirksamkeitsaussage.'
  );

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.compute_team_outcomes(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.compute_team_outcomes(UUID, INTEGER) TO authenticated;
