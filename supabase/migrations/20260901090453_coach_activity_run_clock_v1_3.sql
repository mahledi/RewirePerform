-- Coach activity must be resolved from the active team's run, not from a
-- cached athlete snapshot. Snapshots may legitimately predate a team start
-- when an existing solo/pre-start instance is preserved during team linking.
BEGIN;

CREATE INDEX IF NOT EXISTS idx_user_day_completion_instance_completed_day
  ON public.user_day_completion (
    program_instance_id,
    day_number,
    completed_at DESC
  )
  WHERE program_instance_id IS NOT NULL
    AND completion_status = 'completed';

CREATE INDEX IF NOT EXISTS idx_comprehension_instance_completed_at
  ON public.comprehension_check_instances (
    program_instance_id,
    completed_at DESC
  )
  WHERE program_instance_id IS NOT NULL
    AND status = 'completed'
    AND completed_at IS NOT NULL;

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
SET search_path = pg_catalog
AS $$
DECLARE
  effective_today date := CURRENT_DATE;
  team_is_test boolean := false;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_manage_team_program_runs(_team_id) THEN
    RAISE EXCEPTION 'access_denied' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(team.is_test_team, false)
  INTO team_is_test
  FROM public.teams team
  WHERE team.id = _team_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'team_not_found';
  END IF;

  IF team_is_test THEN
    SELECT override.simulated_date
    INTO effective_today
    FROM public.qa_time_overrides override
    WHERE override.scope = 'team'
      AND override.team_id = _team_id
    ORDER BY override.updated_at DESC
    LIMIT 1;

    effective_today := COALESCE(effective_today, CURRENT_DATE);
  END IF;

  RETURN QUERY
  WITH active_run AS (
    SELECT
      run.id,
      run.started_at,
      CASE
        WHEN run.started_at IS NULL OR effective_today < run.started_at THEN 0
        ELSE (effective_today - run.started_at) + 1
      END::integer AS raw_program_day,
      CASE
        WHEN run.started_at IS NULL OR effective_today < run.started_at THEN 0
        ELSE LEAST(56, (effective_today - run.started_at) + 1)
      END::integer AS available_days
    FROM public.program_runs run
    WHERE run.team_id = _team_id
      AND run.status = 'active'
    ORDER BY run.started_at DESC NULLS LAST, run.created_at DESC
    LIMIT 1
  ), athletes AS (
    SELECT DISTINCT member.user_id
    FROM public.team_members member
    JOIN public.user_roles role
      ON role.user_id = member.user_id
     AND role.role = 'athlete'::public.app_role
    WHERE member.team_id = _team_id
  ), active_instances AS (
    SELECT
      athlete.user_id,
      instance.id AS program_instance_id
    FROM athletes athlete
    JOIN public.program_instances instance
      ON instance.user_id = athlete.user_id
     AND instance.status = 'active'
    JOIN active_run run
      ON run.id = instance.program_run_id
  ), completion_candidates AS (
    SELECT
      instance.program_instance_id,
      completion.id,
      completion.day_number,
      CASE
        WHEN team_is_test THEN COALESCE(
          assignment.date,
          run.started_at + (completion.day_number - 1),
          completion.completed_at::date
        )
        ELSE COALESCE(
          completion.completed_at::date,
          assignment.date,
          run.started_at + (completion.day_number - 1)
        )
      END AS event_date,
      completion.completed_at
    FROM active_instances instance
    JOIN active_run run ON true
    JOIN public.user_day_completion completion
      ON completion.program_instance_id = instance.program_instance_id
     AND completion.completion_status = 'completed'
    LEFT JOIN public.user_day_assignments assignment
      ON assignment.id = completion.assignment_id
    WHERE completion.day_number BETWEEN 1 AND run.available_days
  ), valid_day_completions AS (
    SELECT DISTINCT ON (completion.program_instance_id, completion.day_number)
      completion.program_instance_id,
      completion.day_number,
      completion.event_date,
      completion.completed_at
    FROM completion_candidates completion
    JOIN active_run run ON true
    WHERE completion.event_date BETWEEN run.started_at AND effective_today
    ORDER BY
      completion.program_instance_id,
      completion.day_number,
      completion.completed_at DESC NULLS LAST,
      completion.id DESC
  ), completion_counts AS (
    SELECT
      completion.program_instance_id,
      COUNT(*)::integer AS completed_days,
      MAX(completion.completed_at) AS last_completed_at,
      MAX(completion.event_date) AS last_completed_date
    FROM valid_day_completions completion
    GROUP BY completion.program_instance_id
  ), numbered_completion_days AS (
    SELECT
      completion.program_instance_id,
      completion.day_number,
      completion.day_number
        - (ROW_NUMBER() OVER (
          PARTITION BY completion.program_instance_id
          ORDER BY completion.day_number
        ))::integer AS run_key
    FROM valid_day_completions completion
  ), streak_runs AS (
    SELECT
      completion.program_instance_id,
      completion.run_key,
      COUNT(*)::integer AS run_length,
      MAX(completion.day_number) AS run_end_day
    FROM numbered_completion_days completion
    GROUP BY completion.program_instance_id, completion.run_key
  ), latest_streak AS (
    SELECT DISTINCT ON (streak.program_instance_id)
      streak.program_instance_id,
      CASE
        WHEN run.raw_program_day - streak.run_end_day BETWEEN 0 AND 1
          THEN streak.run_length
        ELSE 0
      END::integer AS current_streak
    FROM streak_runs streak
    JOIN active_run run ON true
    ORDER BY streak.program_instance_id, streak.run_end_day DESC
  ), checkin_activity AS (
    SELECT
      instance.program_instance_id,
      MAX(checkin.created_at) AS last_checkin_at,
      MAX(checkin.date) AS last_checkin_activity_date,
      MAX(checkin.date) AS last_checkin_date,
      COUNT(DISTINCT checkin.date) FILTER (
        WHERE checkin.date >= GREATEST(run.started_at, effective_today - 6)
      )::integer AS checkins_last_7d
    FROM active_instances instance
    JOIN active_run run ON true
    JOIN public.daily_checkins checkin
      ON checkin.program_instance_id = instance.program_instance_id
     AND checkin.date BETWEEN run.started_at AND effective_today
    GROUP BY instance.program_instance_id
  ), journal_activity AS (
    SELECT
      instance.program_instance_id,
      MAX(journal.created_at) AS last_journal_at,
      MAX(journal.date) AS last_journal_date,
      COUNT(DISTINCT journal.date)::integer AS journal_entries_count
    FROM active_instances instance
    JOIN active_run run ON true
    JOIN public.daily_journals journal
      ON journal.program_instance_id = instance.program_instance_id
     AND journal.date BETWEEN run.started_at AND effective_today
    GROUP BY instance.program_instance_id
  ), comprehension_candidates AS (
    SELECT
      instance.program_instance_id,
      check_instance.completed_at,
      CASE
        WHEN team_is_test THEN COALESCE(
          assignment.date,
          run.started_at + (check_instance.day_number - 1),
          check_instance.completed_at::date
        )
        ELSE COALESCE(
          check_instance.completed_at::date,
          assignment.date,
          run.started_at + (check_instance.day_number - 1)
        )
      END AS event_date
    FROM active_instances instance
    JOIN active_run run ON true
    JOIN public.comprehension_check_instances check_instance
      ON check_instance.program_instance_id = instance.program_instance_id
     AND check_instance.status = 'completed'
     AND check_instance.day_number BETWEEN 1 AND run.available_days
    LEFT JOIN public.user_day_assignments assignment
      ON assignment.id = check_instance.assignment_id
  ), comprehension_activity AS (
    SELECT
      candidate.program_instance_id,
      MAX(candidate.completed_at) AS last_comprehension_at,
      MAX(candidate.event_date) AS last_comprehension_date
    FROM comprehension_candidates candidate
    JOIN active_run run ON true
    WHERE candidate.event_date BETWEEN run.started_at AND effective_today
    GROUP BY candidate.program_instance_id
  ), activity AS (
    SELECT
      athlete.user_id,
      instance.program_instance_id,
      NULLIF(
        GREATEST(
          COALESCE(completions.last_completed_at, '-infinity'::timestamptz),
          COALESCE(checkins.last_checkin_at, '-infinity'::timestamptz),
          COALESCE(comprehension.last_comprehension_at, '-infinity'::timestamptz),
          COALESCE(journals.last_journal_at, '-infinity'::timestamptz)
        ),
        '-infinity'::timestamptz
      ) AS last_activity_at,
      NULLIF(
        GREATEST(
          COALESCE(completions.last_completed_date, '-infinity'::date),
          COALESCE(checkins.last_checkin_activity_date, '-infinity'::date),
          COALESCE(comprehension.last_comprehension_date, '-infinity'::date),
          COALESCE(journals.last_journal_date, '-infinity'::date)
        ),
        '-infinity'::date
      ) AS last_activity_date,
      COALESCE(completions.completed_days, 0)::integer AS completed_days,
      COALESCE(streak.current_streak, 0)::integer AS current_streak,
      COALESCE(checkins.checkins_last_7d, 0)::integer AS checkins_last_7d,
      checkins.last_checkin_date,
      COALESCE(journals.journal_entries_count, 0)::integer AS journal_entries_count
    FROM athletes athlete
    LEFT JOIN active_instances instance ON instance.user_id = athlete.user_id
    LEFT JOIN completion_counts completions
      ON completions.program_instance_id = instance.program_instance_id
    LEFT JOIN latest_streak streak
      ON streak.program_instance_id = instance.program_instance_id
    LEFT JOIN checkin_activity checkins
      ON checkins.program_instance_id = instance.program_instance_id
    LEFT JOIN journal_activity journals
      ON journals.program_instance_id = instance.program_instance_id
    LEFT JOIN comprehension_activity comprehension
      ON comprehension.program_instance_id = instance.program_instance_id
  )
  SELECT
    athlete.user_id,
    profile.full_name,
    activity.last_activity_at,
    activity.completed_days,
    COALESCE(run.available_days, 0)::integer,
    (
      CASE
        WHEN COALESCE(run.available_days, 0) <= 0 THEN 0::numeric
        ELSE LEAST(
          1::numeric,
          activity.completed_days::numeric / run.available_days::numeric
        )
      END
    )::numeric(5,4),
    activity.current_streak,
    activity.checkins_last_7d,
    activity.last_checkin_date,
    activity.journal_entries_count,
    (
      activity.last_activity_date IS NULL
      OR activity.last_activity_date < effective_today - 6
    )
  FROM athletes athlete
  LEFT JOIN public.profiles profile ON profile.id = athlete.user_id
  LEFT JOIN active_run run ON true
  LEFT JOIN activity ON activity.user_id = athlete.user_id
  ORDER BY
    (
      activity.last_activity_date IS NULL
      OR activity.last_activity_date < effective_today - 6
    ) DESC,
    activity.last_activity_at NULLS FIRST,
    profile.full_name NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION public.get_coach_team_activity_status(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_coach_team_activity_status(uuid)
  TO authenticated;

COMMENT ON FUNCTION public.get_coach_team_activity_status(uuid) IS
  'Returns coach-visible run-scoped activity derived from authoritative completions and the shared run clock; cached pre-run snapshots cannot affect the result.';

COMMIT;
