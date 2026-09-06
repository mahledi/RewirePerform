-- Tracking-System Hardening + App-Store-Readiness
--
-- Goals:
-- - Program activity is scoped to program_instances where possible.
-- - Coach-visible individual data stays operational only: usage/adherence, no
--   raw answers, journal text, mood values, or psychological scores.
-- - Existing rows are preserved. This migration changes constraints/indexes
--   and adds privacy-safe RPCs; it does not delete user data.

ALTER TABLE public.questionnaire_responses
  ADD COLUMN IF NOT EXISTS program_instance_id uuid REFERENCES public.program_instances(id) ON DELETE SET NULL;

WITH active_instance AS (
  SELECT DISTINCT ON (user_id) id, user_id
  FROM public.program_instances
  WHERE status = 'active'
  ORDER BY user_id, started_at DESC, created_at DESC
)
UPDATE public.questionnaire_responses qr
SET program_instance_id = ai.id
FROM active_instance ai
WHERE qr.user_id = ai.user_id
  AND qr.program_instance_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_program_instance
  ON public.questionnaire_responses(program_instance_id)
  WHERE program_instance_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_user_instance_timing
  ON public.questionnaire_responses(user_id, program_instance_id, instrument_id, timing, created_at DESC)
  WHERE user_id IS NOT NULL;

-- Prechecks: fail safely with a clear message if old data already contains
-- duplicates that would make cycle-aware uniqueness ambiguous. No rows are
-- deleted or merged by this migration.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.daily_checkins
    WHERE user_id IS NOT NULL AND program_instance_id IS NOT NULL
    GROUP BY user_id, program_instance_id, date
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'tracking_hardening_precheck_failed: duplicate daily_checkins for user_id + program_instance_id + date';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.daily_checkins
    WHERE user_id IS NOT NULL AND program_instance_id IS NULL
    GROUP BY user_id, date
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'tracking_hardening_precheck_failed: duplicate null-instance daily_checkins for user_id + date';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.daily_journals
    WHERE user_id IS NOT NULL AND program_instance_id IS NOT NULL
    GROUP BY user_id, program_instance_id, date
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'tracking_hardening_precheck_failed: duplicate daily_journals for user_id + program_instance_id + date';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.daily_journals
    WHERE user_id IS NOT NULL AND program_instance_id IS NULL
    GROUP BY user_id, date
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'tracking_hardening_precheck_failed: duplicate null-instance daily_journals for user_id + date';
  END IF;
END;
$$;

-- Check-ins/Journals: replace legacy user+date uniqueness with cycle-aware
-- uniqueness. The legacy null-instance uniqueness remains for old fallback rows.
DROP INDEX IF EXISTS public.daily_checkins_user_date_unique;

CREATE UNIQUE INDEX IF NOT EXISTS daily_checkins_user_instance_date_unique
  ON public.daily_checkins(user_id, program_instance_id, date)
  WHERE user_id IS NOT NULL AND program_instance_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS daily_checkins_user_date_null_instance_unique
  ON public.daily_checkins(user_id, date)
  WHERE user_id IS NOT NULL AND program_instance_id IS NULL;

ALTER TABLE public.daily_journals
  DROP CONSTRAINT IF EXISTS daily_journals_user_id_date_key;

DROP INDEX IF EXISTS public.daily_journals_user_date_unique;

CREATE UNIQUE INDEX IF NOT EXISTS daily_journals_user_instance_date_unique
  ON public.daily_journals(user_id, program_instance_id, date)
  WHERE user_id IS NOT NULL AND program_instance_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS daily_journals_user_date_null_instance_unique
  ON public.daily_journals(user_id, date)
  WHERE user_id IS NOT NULL AND program_instance_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_daily_checkins_program_instance_date
  ON public.daily_checkins(program_instance_id, date DESC)
  WHERE program_instance_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_daily_journals_program_instance_date
  ON public.daily_journals(program_instance_id, date DESC)
  WHERE program_instance_id IS NOT NULL;

-- Coach-safe questionnaire status: status only, latest response per athlete,
-- no raw answers/analysis/scores. Supports primary coach, co-coach, and admin.
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
  IF NOT (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = _team_id AND t.created_by = auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.team_members tm
      JOIN public.user_roles ur ON ur.user_id = tm.user_id AND ur.role = 'coach'
      WHERE tm.team_id = _team_id AND tm.user_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  WITH athletes AS (
    SELECT tm.user_id
    FROM public.team_members tm
    JOIN public.user_roles ur ON ur.user_id = tm.user_id AND ur.role = 'athlete'
    WHERE tm.team_id = _team_id
  ),
  latest_q AS (
    SELECT DISTINCT ON (qr.user_id)
      qr.user_id,
      qr.is_complete,
      qr.last_category_index,
      qr.progress_updated_at
    FROM public.questionnaire_responses qr
    JOIN athletes a ON a.user_id = qr.user_id
    WHERE qr.instrument_id = 'onboarding_v2'
       OR qr.instrument_id IS NULL
    ORDER BY qr.user_id, qr.is_complete DESC, qr.progress_updated_at DESC, qr.created_at DESC
  )
  SELECT
    a.user_id,
    p.full_name,
    COALESCE(lq.is_complete, false) AS is_complete,
    COALESCE(lq.last_category_index, 0) AS last_category_index,
    lq.progress_updated_at
  FROM athletes a
  LEFT JOIN public.profiles p ON p.id = a.user_id
  LEFT JOIN latest_q lq ON lq.user_id = a.user_id
  ORDER BY p.full_name NULLS LAST, a.user_id;
END;
$$;

-- Coach-safe individual activity status. This intentionally exposes only
-- operational adherence, never psychological raw values or private text.
CREATE OR REPLACE FUNCTION public.get_coach_team_activity_status(_team_id uuid)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  last_activity_at timestamptz,
  days_completed integer,
  days_available integer,
  completion_rate numeric,
  current_streak integer,
  checkins_last_7d integer,
  last_checkin_date date,
  journal_entries_count integer,
  inactive_risk boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = _team_id AND t.created_by = auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.team_members tm
      JOIN public.user_roles ur ON ur.user_id = tm.user_id AND ur.role = 'coach'
      WHERE tm.team_id = _team_id AND tm.user_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  WITH athletes AS (
    SELECT tm.user_id
    FROM public.team_members tm
    JOIN public.user_roles ur ON ur.user_id = tm.user_id AND ur.role = 'athlete'
    WHERE tm.team_id = _team_id
  ),
  active_instances AS (
    SELECT DISTINCT ON (pi.user_id)
      pi.user_id,
      pi.id AS program_instance_id
    FROM public.program_instances pi
    JOIN athletes a ON a.user_id = pi.user_id
    WHERE pi.team_id = _team_id
      AND pi.status = 'active'
    ORDER BY pi.user_id, pi.started_at DESC, pi.created_at DESC
  ),
  latest_snap AS (
    SELECT DISTINCT ON (pps.user_id)
      pps.user_id,
      pps.days_completed,
      pps.days_available,
      pps.completion_rate,
      pps.current_streak
    FROM public.program_progress_snapshots pps
    JOIN active_instances ai ON ai.program_instance_id = pps.program_instance_id
    ORDER BY pps.user_id, pps.date DESC
  ),
  activity AS (
    SELECT
      a.user_id,
      GREATEST(
        COALESCE((SELECT MAX(udc.completed_at) FROM public.user_day_completion udc WHERE udc.user_id = a.user_id AND ((ai.program_instance_id IS NOT NULL AND udc.program_instance_id = ai.program_instance_id) OR (ai.program_instance_id IS NULL AND udc.program_instance_id IS NULL))), '-infinity'::timestamptz),
        COALESCE((SELECT MAX(dc.created_at) FROM public.daily_checkins dc WHERE dc.user_id = a.user_id AND ((ai.program_instance_id IS NOT NULL AND dc.program_instance_id = ai.program_instance_id) OR (ai.program_instance_id IS NULL AND dc.program_instance_id IS NULL))), '-infinity'::timestamptz),
        COALESCE((SELECT MAX(cci.completed_at) FROM public.comprehension_check_instances cci WHERE cci.user_id = a.user_id AND ((ai.program_instance_id IS NOT NULL AND cci.program_instance_id = ai.program_instance_id) OR (ai.program_instance_id IS NULL AND cci.program_instance_id IS NULL))), '-infinity'::timestamptz),
        COALESCE((SELECT MAX(dj.created_at) FROM public.daily_journals dj WHERE dj.user_id = a.user_id AND ((ai.program_instance_id IS NOT NULL AND dj.program_instance_id = ai.program_instance_id) OR (ai.program_instance_id IS NULL AND dj.program_instance_id IS NULL))), '-infinity'::timestamptz)
      ) AS raw_last_activity_at,
      (SELECT COUNT(*)::int FROM public.daily_checkins dc WHERE dc.user_id = a.user_id AND ((ai.program_instance_id IS NOT NULL AND dc.program_instance_id = ai.program_instance_id) OR (ai.program_instance_id IS NULL AND dc.program_instance_id IS NULL)) AND dc.created_at >= now() - interval '7 days') AS checkins_last_7d,
      (SELECT MAX(dc.date) FROM public.daily_checkins dc WHERE dc.user_id = a.user_id AND ((ai.program_instance_id IS NOT NULL AND dc.program_instance_id = ai.program_instance_id) OR (ai.program_instance_id IS NULL AND dc.program_instance_id IS NULL))) AS last_checkin_date,
      (SELECT COUNT(*)::int FROM public.daily_journals dj WHERE dj.user_id = a.user_id AND ((ai.program_instance_id IS NOT NULL AND dj.program_instance_id = ai.program_instance_id) OR (ai.program_instance_id IS NULL AND dj.program_instance_id IS NULL))) AS journal_entries_count
    FROM athletes a
    LEFT JOIN active_instances ai ON ai.user_id = a.user_id
  )
  SELECT
    a.user_id,
    p.full_name,
    NULLIF(act.raw_last_activity_at, '-infinity'::timestamptz) AS last_activity_at,
    COALESCE(ls.days_completed, 0)::int AS days_completed,
    COALESCE(ls.days_available, 0)::int AS days_available,
    ls.completion_rate,
    COALESCE(ls.current_streak, 0)::int AS current_streak,
    COALESCE(act.checkins_last_7d, 0)::int AS checkins_last_7d,
    act.last_checkin_date,
    COALESCE(act.journal_entries_count, 0)::int AS journal_entries_count,
    (
      NULLIF(act.raw_last_activity_at, '-infinity'::timestamptz) IS NULL
      OR act.raw_last_activity_at < now() - interval '7 days'
    ) AS inactive_risk
  FROM athletes a
  LEFT JOIN public.profiles p ON p.id = a.user_id
  LEFT JOIN latest_snap ls ON ls.user_id = a.user_id
  LEFT JOIN activity act ON act.user_id = a.user_id
  ORDER BY inactive_risk DESC, act.raw_last_activity_at NULLS FIRST, p.full_name NULLS LAST, a.user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_team_questionnaire_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_team_questionnaire_status(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_coach_team_activity_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_coach_team_activity_status(uuid) TO authenticated;
