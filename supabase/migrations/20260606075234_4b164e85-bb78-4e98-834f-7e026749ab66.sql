
-- 1) questionnaire_responses.program_instance_id
ALTER TABLE public.questionnaire_responses
  ADD COLUMN IF NOT EXISTS program_instance_id uuid REFERENCES public.program_instances(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_program_instance
  ON public.questionnaire_responses(program_instance_id);

-- 2) team_training_schedule table
CREATE TABLE IF NOT EXISTS public.team_training_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  training_local_hour smallint NOT NULL CHECK (training_local_hour BETWEEN 0 AND 23),
  training_local_minute smallint NOT NULL DEFAULT 0 CHECK (training_local_minute BETWEEN 0 AND 59),
  training_timezone text NOT NULL DEFAULT 'UTC',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, day_of_week)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_training_schedule TO authenticated;
GRANT ALL ON public.team_training_schedule TO service_role;

ALTER TABLE public.team_training_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read team training schedule"
  ON public.team_training_schedule FOR SELECT
  TO authenticated
  USING (public.is_member_of_team(team_id) OR public.is_creator_of_team(team_id));

CREATE POLICY "Team creator can insert training schedule"
  ON public.team_training_schedule FOR INSERT
  TO authenticated
  WITH CHECK (public.is_creator_of_team(team_id));

CREATE POLICY "Team creator can update training schedule"
  ON public.team_training_schedule FOR UPDATE
  TO authenticated
  USING (public.is_creator_of_team(team_id))
  WITH CHECK (public.is_creator_of_team(team_id));

CREATE POLICY "Team creator can delete training schedule"
  ON public.team_training_schedule FOR DELETE
  TO authenticated
  USING (public.is_creator_of_team(team_id));

CREATE TRIGGER touch_team_training_schedule_updated_at
  BEFORE UPDATE ON public.team_training_schedule
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3) get_coach_team_activity_status RPC
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
  last_checkin_date text,
  journal_entries_count integer,
  inactive_risk boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_creator_of_team(_team_id) THEN
    RAISE EXCEPTION 'Access denied: not team coach';
  END IF;

  RETURN QUERY
  WITH athletes AS (
    SELECT tm.user_id
    FROM public.team_members tm
    JOIN public.user_roles ur ON ur.user_id = tm.user_id AND ur.role = 'athlete'
    WHERE tm.team_id = _team_id
  ),
  latest_snap AS (
    SELECT DISTINCT ON (pps.user_id)
      pps.user_id, pps.days_completed, pps.days_available,
      pps.completion_rate, pps.current_streak, pps.updated_at
    FROM public.program_progress_snapshots pps
    WHERE pps.user_id IN (SELECT a.user_id FROM athletes a)
    ORDER BY pps.user_id, pps.date DESC
  ),
  checkin_stats AS (
    SELECT dc.user_id,
           COUNT(*) FILTER (WHERE dc.date::date >= (CURRENT_DATE - INTERVAL '7 days'))::int AS checkins_last_7d,
           MAX(dc.date)::text AS last_checkin_date,
           MAX(dc.created_at) AS last_checkin_at
    FROM public.daily_checkins dc
    WHERE dc.user_id IN (SELECT a.user_id FROM athletes a)
    GROUP BY dc.user_id
  ),
  journal_stats AS (
    SELECT dj.user_id, COUNT(*)::int AS journal_entries_count, MAX(dj.created_at) AS last_journal_at
    FROM public.daily_journals dj
    WHERE dj.user_id IN (SELECT a.user_id FROM athletes a)
    GROUP BY dj.user_id
  )
  SELECT
    a.user_id,
    p.full_name,
    GREATEST(COALESCE(cs.last_checkin_at, 'epoch'::timestamptz),
             COALESCE(js.last_journal_at, 'epoch'::timestamptz),
             COALESCE(ls.updated_at, 'epoch'::timestamptz)) AS last_activity_at,
    ls.days_completed,
    ls.days_available,
    ls.completion_rate,
    ls.current_streak,
    COALESCE(cs.checkins_last_7d, 0) AS checkins_last_7d,
    cs.last_checkin_date,
    COALESCE(js.journal_entries_count, 0) AS journal_entries_count,
    (COALESCE(cs.checkins_last_7d, 0) = 0) AS inactive_risk
  FROM athletes a
  LEFT JOIN public.profiles p ON p.id = a.user_id
  LEFT JOIN latest_snap ls ON ls.user_id = a.user_id
  LEFT JOIN checkin_stats cs ON cs.user_id = a.user_id
  LEFT JOIN journal_stats js ON js.user_id = a.user_id
  ORDER BY p.full_name NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION public.get_coach_team_activity_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_coach_team_activity_status(uuid) TO authenticated;
