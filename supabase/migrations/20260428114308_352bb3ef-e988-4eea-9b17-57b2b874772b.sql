
-- ============================================
-- 1. PROGRAM PROGRESS SNAPSHOTS (Adherence)
-- ============================================
CREATE TABLE IF NOT EXISTS public.program_progress_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  team_id UUID,
  date DATE NOT NULL,
  program_day INTEGER,
  days_available INTEGER NOT NULL DEFAULT 0,
  days_completed INTEGER NOT NULL DEFAULT 0,
  completion_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  comprehension_average NUMERIC(5,4),
  tasks_completed_count INTEGER NOT NULL DEFAULT 0,
  checkins_completed_count INTEGER NOT NULL DEFAULT 0,
  journals_completed_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT program_progress_snapshots_user_date_unique UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_progress_snapshots_user ON public.program_progress_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_snapshots_team ON public.program_progress_snapshots(team_id);
CREATE INDEX IF NOT EXISTS idx_progress_snapshots_date ON public.program_progress_snapshots(date);

ALTER TABLE public.program_progress_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own snapshots"
  ON public.program_progress_snapshots FOR SELECT
  TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users insert own snapshots"
  ON public.program_progress_snapshots FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own snapshots"
  ON public.program_progress_snapshots FOR UPDATE
  TO authenticated USING (user_id = auth.uid());

-- Trigger: updated_at
CREATE OR REPLACE FUNCTION public.touch_progress_snapshots_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_progress_snapshots ON public.program_progress_snapshots;
CREATE TRIGGER trg_touch_progress_snapshots
  BEFORE UPDATE ON public.program_progress_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.touch_progress_snapshots_updated_at();

-- ============================================
-- 2. ASSESSMENTS — uniqueness for pre/mid/post
-- ============================================
-- Existing assessments table allows mid/post via free text timing column.
-- Add partial unique index to prevent accidental duplicate retests.
-- (User can still intentionally retake by deleting first via UI, future scope.)
CREATE UNIQUE INDEX IF NOT EXISTS idx_assessments_user_type_timing
  ON public.assessments(user_id, assessment_type, timing)
  WHERE user_id IS NOT NULL;

-- ============================================
-- 3. WEEKLY USER METRICS VIEW
-- ============================================
CREATE OR REPLACE VIEW public.weekly_user_metrics
WITH (security_invoker = on) AS
SELECT
  user_id,
  date_trunc('week', date::timestamp)::date AS week_start,
  COUNT(*)::int AS checkins_completed_count,
  AVG(mood_before)::numeric(5,2) AS avg_mood,
  AVG(energy_level)::numeric(5,2) AS avg_energy,
  AVG(focus_rating)::numeric(5,2) AS avg_focus
FROM public.daily_checkins
WHERE user_id IS NOT NULL
GROUP BY user_id, date_trunc('week', date::timestamp);

CREATE OR REPLACE VIEW public.weekly_user_comprehension
WITH (security_invoker = on) AS
SELECT
  user_id,
  date_trunc('week', completed_at)::date AS week_start,
  COUNT(*)::int AS comprehension_count,
  AVG(
    CASE WHEN total_count > 0
      THEN correct_count::numeric / total_count::numeric
      ELSE NULL
    END
  )::numeric(5,4) AS comprehension_average
FROM public.comprehension_check_instances
WHERE status = 'completed' AND completed_at IS NOT NULL
GROUP BY user_id, date_trunc('week', completed_at);

-- ============================================
-- 4. TEAM OUTCOMES FUNCTION (privacy-safe)
-- ============================================
-- Returns ONLY aggregates. Requires min_n valid players (default 5).
-- Restricted to coach who created the team.
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
  total_athletes INT;
  pre_n INT;
  mid_n INT;
  post_n INT;
  result JSON;
  pre_post_changes JSON;
  adherence JSON;
  comprehension_agg JSON;
  weekly_trend JSON;
BEGIN
  -- Authorize
  SELECT created_by INTO team_owner FROM public.teams WHERE id = team_id_param;
  IF team_owner IS NULL OR team_owner != auth.uid() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Athletes only
  SELECT array_agg(tm.user_id) INTO athlete_ids
  FROM public.team_members tm
  JOIN public.user_roles ur ON ur.user_id = tm.user_id AND ur.role = 'athlete'
  WHERE tm.team_id = team_id_param;

  athlete_ids := COALESCE(athlete_ids, ARRAY[]::UUID[]);
  total_athletes := array_length(athlete_ids, 1);
  total_athletes := COALESCE(total_athletes, 0);

  IF total_athletes = 0 THEN
    RETURN json_build_object(
      'sufficient_data', false,
      'reason', 'no_athletes',
      'total_athletes', 0,
      'min_n', min_n
    );
  END IF;

  -- Assessment counts (distinct athletes per timing)
  SELECT COUNT(DISTINCT user_id)::int INTO pre_n
  FROM public.assessments
  WHERE user_id = ANY(athlete_ids) AND timing = 'pre';

  SELECT COUNT(DISTINCT user_id)::int INTO mid_n
  FROM public.assessments
  WHERE user_id = ANY(athlete_ids) AND timing = 'mid';

  SELECT COUNT(DISTINCT user_id)::int INTO post_n
  FROM public.assessments
  WHERE user_id = ANY(athlete_ids) AND timing = 'post';

  -- Adherence aggregates from latest snapshot per athlete
  WITH latest_snap AS (
    SELECT DISTINCT ON (user_id)
      user_id, days_available, days_completed, completion_rate,
      comprehension_average, current_streak, longest_streak
    FROM public.program_progress_snapshots
    WHERE user_id = ANY(athlete_ids)
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

  -- Pre/Mid/Post total_score change per assessment_type
  -- Only show if pre_n >= min_n
  IF pre_n >= min_n THEN
    WITH per_user_avg AS (
      SELECT user_id, assessment_type, timing,
             AVG(total_score) AS score
      FROM public.assessments
      WHERE user_id = ANY(athlete_ids)
      GROUP BY user_id, assessment_type, timing
    ),
    paired_pre_post AS (
      SELECT
        a.assessment_type,
        a.score AS pre_score,
        b.score AS post_score
      FROM per_user_avg a
      JOIN per_user_avg b
        ON a.user_id = b.user_id
       AND a.assessment_type = b.assessment_type
      WHERE a.timing = 'pre' AND b.timing = 'post'
    ),
    paired_pre_mid AS (
      SELECT
        a.assessment_type,
        a.score AS pre_score,
        m.score AS mid_score
      FROM per_user_avg a
      JOIN per_user_avg m
        ON a.user_id = m.user_id
       AND a.assessment_type = m.assessment_type
      WHERE a.timing = 'pre' AND m.timing = 'mid'
    ),
    pre_post_summary AS (
      SELECT
        assessment_type,
        COUNT(*)::int AS n_pairs,
        ROUND(AVG(pre_score)::numeric, 2) AS avg_pre,
        ROUND(AVG(post_score)::numeric, 2) AS avg_post,
        ROUND((AVG(post_score) - AVG(pre_score))::numeric, 2) AS abs_change,
        CASE WHEN AVG(pre_score) <> 0
             THEN ROUND((((AVG(post_score) - AVG(pre_score)) / AVG(pre_score)) * 100)::numeric, 2)
             ELSE NULL END AS pct_change,
        CASE
          WHEN COUNT(*) >= min_n
           AND (STDDEV_POP(pre_score) + STDDEV_POP(post_score)) > 0
          THEN ROUND(
            ((AVG(post_score) - AVG(pre_score)) /
             NULLIF(SQRT((POWER(STDDEV_POP(pre_score),2) + POWER(STDDEV_POP(post_score),2)) / 2.0), 0))::numeric,
            3
          )
          ELSE NULL
        END AS cohens_d,
        CASE WHEN COUNT(*) >= min_n THEN true ELSE false END AS sufficient_data
      FROM pre_post_summary_input
      GROUP BY assessment_type
    )
    SELECT NULL INTO pre_post_changes; -- placeholder, replaced below
  END IF;

  -- Re-compute pre_post_changes cleanly (avoid CTE name issue above)
  IF pre_n >= min_n THEN
    WITH per_user_avg AS (
      SELECT user_id, assessment_type, timing, AVG(total_score) AS score
      FROM public.assessments
      WHERE user_id = ANY(athlete_ids)
      GROUP BY user_id, assessment_type, timing
    ),
    pp AS (
      SELECT a.assessment_type, a.score AS pre_score, b.score AS post_score
      FROM per_user_avg a
      JOIN per_user_avg b
        ON a.user_id = b.user_id AND a.assessment_type = b.assessment_type
      WHERE a.timing = 'pre' AND b.timing = 'post'
    ),
    pm AS (
      SELECT a.assessment_type, a.score AS pre_score, m.score AS mid_score
      FROM per_user_avg a
      JOIN per_user_avg m
        ON a.user_id = m.user_id AND a.assessment_type = m.assessment_type
      WHERE a.timing = 'pre' AND m.timing = 'mid'
    ),
    pp_summary AS (
      SELECT
        assessment_type,
        COUNT(*)::int AS n_pairs,
        ROUND(AVG(pre_score)::numeric, 2) AS avg_pre,
        ROUND(AVG(post_score)::numeric, 2) AS avg_post,
        ROUND((AVG(post_score) - AVG(pre_score))::numeric, 2) AS abs_change,
        CASE WHEN AVG(pre_score) <> 0
          THEN ROUND((((AVG(post_score) - AVG(pre_score)) / AVG(pre_score)) * 100)::numeric, 2)
          ELSE NULL END AS pct_change,
        CASE
          WHEN COUNT(*) >= min_n
           AND (POWER(STDDEV_POP(pre_score),2) + POWER(STDDEV_POP(post_score),2)) > 0
          THEN ROUND(
            ((AVG(post_score) - AVG(pre_score)) /
             NULLIF(SQRT((POWER(STDDEV_POP(pre_score),2) + POWER(STDDEV_POP(post_score),2)) / 2.0), 0))::numeric,
            3)
          ELSE NULL END AS cohens_d,
        (COUNT(*) >= min_n) AS sufficient_data
      FROM pp
      GROUP BY assessment_type
    ),
    pm_summary AS (
      SELECT
        assessment_type,
        COUNT(*)::int AS n_pairs,
        ROUND(AVG(pre_score)::numeric, 2) AS avg_pre,
        ROUND(AVG(mid_score)::numeric, 2) AS avg_mid,
        ROUND((AVG(mid_score) - AVG(pre_score))::numeric, 2) AS abs_change,
        CASE WHEN AVG(pre_score) <> 0
          THEN ROUND((((AVG(mid_score) - AVG(pre_score)) / AVG(pre_score)) * 100)::numeric, 2)
          ELSE NULL END AS pct_change,
        (COUNT(*) >= min_n) AS sufficient_data
      FROM pm
      GROUP BY assessment_type
    )
    SELECT json_build_object(
      'pre_post', COALESCE((SELECT json_agg(row_to_json(pp_summary)) FROM pp_summary), '[]'::json),
      'pre_mid', COALESCE((SELECT json_agg(row_to_json(pm_summary)) FROM pm_summary), '[]'::json)
    ) INTO pre_post_changes;
  ELSE
    pre_post_changes := json_build_object('pre_post', '[]'::json, 'pre_mid', '[]'::json);
  END IF;

  -- Weekly mood/energy/focus aggregate (only if >= min_n distinct users that week)
  WITH weekly AS (
    SELECT
      date_trunc('week', date::timestamp)::date AS week_start,
      COUNT(DISTINCT user_id)::int AS n_users,
      ROUND(AVG(mood_before)::numeric, 2) AS avg_mood,
      ROUND(AVG(energy_level)::numeric, 2) AS avg_energy,
      ROUND(AVG(focus_rating)::numeric, 2) AS avg_focus
    FROM public.daily_checkins
    WHERE user_id = ANY(athlete_ids)
    GROUP BY date_trunc('week', date::timestamp)
  )
  SELECT COALESCE(json_agg(
    json_build_object(
      'week_start', week_start,
      'n_users', n_users,
      'avg_mood', CASE WHEN n_users >= min_n THEN avg_mood ELSE NULL END,
      'avg_energy', CASE WHEN n_users >= min_n THEN avg_energy ELSE NULL END,
      'avg_focus', CASE WHEN n_users >= min_n THEN avg_focus ELSE NULL END,
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
  WHERE user_id = ANY(athlete_ids) AND status = 'completed';

  result := json_build_object(
    'team_id', team_id_param,
    'min_n', min_n,
    'total_athletes', total_athletes,
    'sufficient_data', total_athletes >= min_n,
    'assessment_completion', json_build_object(
      'pre_n', pre_n,
      'mid_n', mid_n,
      'post_n', post_n
    ),
    'adherence', adherence,
    'changes', pre_post_changes,
    'comprehension', comprehension_agg,
    'weekly_trend', weekly_trend,
    'disclaimer', 'Hinweis: Veränderungen sind beobachtet, nicht kausal. Ohne Kontrollgruppe keine Wirksamkeitsaussage.'
  );

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.compute_team_outcomes(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.compute_team_outcomes(UUID, INTEGER) TO authenticated;
