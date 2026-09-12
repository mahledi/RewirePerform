-- Feedback Intelligence v1.1 immutable activity snapshot.
--
-- Captures only cumulative counts and coarse status buckets at final feedback
-- submission. It never selects journal/reflection text, coach data, team data,
-- text length or content-derived quality signals. No rollout gate is activated.

BEGIN;

CREATE TABLE feedback_core.activity_snapshots (
  submission_id uuid PRIMARY KEY
    REFERENCES feedback_core.submissions(id) ON DELETE CASCADE,
  observation_start_program_day smallint NOT NULL DEFAULT 1
    CHECK (observation_start_program_day = 1),
  observation_end_program_day smallint NOT NULL
    CHECK (observation_end_program_day IN (10, 24, 39, 55)),
  program_days_available smallint NOT NULL
    CHECK (program_days_available BETWEEN 0 AND 56),
  program_days_completed smallint NOT NULL
    CHECK (program_days_completed BETWEEN 0 AND program_days_available),
  checkins_completed smallint NOT NULL
    CHECK (checkins_completed BETWEEN 0 AND 56),
  journal_entries_created_count smallint NOT NULL
    CHECK (journal_entries_created_count BETWEEN 0 AND 56),
  tasks_completed smallint NOT NULL
    CHECK (tasks_completed BETWEEN 0 AND 1000),
  transfer_pulse_count smallint
    CHECK (transfer_pulse_count BETWEEN 0 AND 1000),
  resume_delay_bucket text NOT NULL
    CHECK (resume_delay_bucket IN (
      'NO_RESUME_NEEDED',
      'SAME_DAY',
      'DAYS_1_3',
      'DAYS_4_7',
      'DAYS_8_PLUS',
      'NOT_AVAILABLE'
    )),
  continuation_status_bucket text NOT NULL
    CHECK (continuation_status_bucket IN (
      'ACTIVE_OR_COMPLETED',
      'PAUSED_1_3_DAYS',
      'PAUSED_4_7_DAYS',
      'PAUSED_8_PLUS_DAYS',
      'NOT_AVAILABLE'
    )),
  source_contract_version text NOT NULL DEFAULT 'feedback-activity-counts-v1.0.0'
    CHECK (source_contract_version = 'feedback-activity-counts-v1.0.0'),
  captured_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE feedback_core.activity_snapshots ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE feedback_core.activity_snapshots
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION feedback_core.capture_activity_snapshot_on_submit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_instance public.program_instances%ROWTYPE;
  effective_today date;
  cutoff_date date;
  available_count integer := 0;
  completed_count integer := 0;
  checkin_count integer := 0;
  journal_count integer := 0;
  task_count integer := 0;
  activity_dates date[] := '{}'::date[];
  latest_activity_date date;
  prior_activity_date date;
  resume_gap integer;
  continuation_gap integer;
  resume_bucket text := 'NOT_AVAILABLE';
  continuation_bucket text := 'NOT_AVAILABLE';
BEGIN
  IF OLD.status <> 'draft' OR NEW.status <> 'submitted' THEN
    RETURN NEW;
  END IF;

  SELECT instance.* INTO target_instance
  FROM public.program_instances instance
  WHERE instance.id = NEW.program_instance_id
    AND instance.user_id = NEW.user_id;
  IF target_instance.id IS NULL THEN
    RAISE EXCEPTION 'feedback_activity_program_instance_invalid' USING ERRCODE = '42501';
  END IF;

  effective_today := public.get_effective_today(NEW.user_id);
  cutoff_date := LEAST(
    effective_today,
    target_instance.started_at + (NEW.program_day - 1)
  );
  available_count := LEAST(
    NEW.program_day,
    GREATEST(0, cutoff_date - target_instance.started_at + 1)
  );

  WITH latest_completed_days AS (
    SELECT DISTINCT ON (completion.day_number)
      completion.day_number,
      completion.task_completion
    FROM public.user_day_completion completion
    WHERE completion.user_id = NEW.user_id
      AND completion.program_instance_id = NEW.program_instance_id
      AND completion.completion_status = 'completed'
      AND completion.day_number BETWEEN 1 AND NEW.program_day
    ORDER BY completion.day_number,
      completion.completed_at DESC NULLS LAST,
      completion.id DESC
  )
  SELECT
    COUNT(*)::integer,
    COALESCE(SUM(
      CASE
        WHEN jsonb_typeof(day_row.task_completion) = 'array'
          THEN jsonb_array_length(day_row.task_completion)
        ELSE 0
      END
    ), 0)::integer
  INTO completed_count, task_count
  FROM latest_completed_days day_row;

  SELECT COUNT(DISTINCT checkin.date)::integer
  INTO checkin_count
  FROM public.daily_checkins checkin
  WHERE checkin.user_id = NEW.user_id
    AND checkin.program_instance_id = NEW.program_instance_id
    AND checkin.date BETWEEN target_instance.started_at AND cutoff_date;

  SELECT COUNT(DISTINCT journal.date)::integer
  INTO journal_count
  FROM public.daily_journals journal
  WHERE journal.user_id = NEW.user_id
    AND journal.program_instance_id = NEW.program_instance_id
    AND journal.date BETWEEN target_instance.started_at AND cutoff_date;

  SELECT COALESCE(array_agg(activity.activity_date ORDER BY activity.activity_date), '{}'::date[])
  INTO activity_dates
  FROM (
    SELECT DISTINCT COALESCE(
      assignment.date,
      completion.completed_at::date,
      target_instance.started_at + (completion.day_number - 1)
    ) AS activity_date
    FROM public.user_day_completion completion
    LEFT JOIN public.user_day_assignments assignment
      ON assignment.id = completion.assignment_id
    WHERE completion.user_id = NEW.user_id
      AND completion.program_instance_id = NEW.program_instance_id
      AND completion.completion_status = 'completed'
      AND completion.day_number BETWEEN 1 AND NEW.program_day
    UNION
    SELECT DISTINCT checkin.date
    FROM public.daily_checkins checkin
    WHERE checkin.user_id = NEW.user_id
      AND checkin.program_instance_id = NEW.program_instance_id
    UNION
    SELECT DISTINCT journal.date
    FROM public.daily_journals journal
    WHERE journal.user_id = NEW.user_id
      AND journal.program_instance_id = NEW.program_instance_id
  ) activity
  WHERE activity.activity_date BETWEEN target_instance.started_at AND cutoff_date;

  IF cardinality(activity_dates) > 0 THEN
    latest_activity_date := activity_dates[cardinality(activity_dates)];
    continuation_gap := cutoff_date - latest_activity_date;
    continuation_bucket := CASE
      WHEN completed_count >= available_count OR continuation_gap = 0
        THEN 'ACTIVE_OR_COMPLETED'
      WHEN continuation_gap BETWEEN 1 AND 3 THEN 'PAUSED_1_3_DAYS'
      WHEN continuation_gap BETWEEN 4 AND 7 THEN 'PAUSED_4_7_DAYS'
      ELSE 'PAUSED_8_PLUS_DAYS'
    END;
  END IF;

  IF cardinality(activity_dates) >= 2 THEN
    prior_activity_date := activity_dates[cardinality(activity_dates) - 1];
    resume_gap := GREATEST(0, latest_activity_date - prior_activity_date - 1);
    resume_bucket := CASE
      WHEN resume_gap = 0 THEN 'NO_RESUME_NEEDED'
      WHEN resume_gap BETWEEN 1 AND 3 THEN 'DAYS_1_3'
      WHEN resume_gap BETWEEN 4 AND 7 THEN 'DAYS_4_7'
      ELSE 'DAYS_8_PLUS'
    END;
  END IF;

  INSERT INTO feedback_core.activity_snapshots(
    submission_id,
    observation_end_program_day,
    program_days_available,
    program_days_completed,
    checkins_completed,
    journal_entries_created_count,
    tasks_completed,
    transfer_pulse_count,
    resume_delay_bucket,
    continuation_status_bucket
  ) VALUES (
    NEW.id,
    NEW.program_day,
    available_count,
    LEAST(completed_count, available_count),
    LEAST(checkin_count, 56),
    LEAST(journal_count, 56),
    LEAST(task_count, 1000),
    NULL,
    resume_bucket,
    continuation_bucket
  )
  ON CONFLICT (submission_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER feedback_capture_activity_snapshot_on_submit
AFTER UPDATE OF status ON feedback_core.submissions
FOR EACH ROW
WHEN (OLD.status = 'draft' AND NEW.status = 'submitted')
EXECUTE FUNCTION feedback_core.capture_activity_snapshot_on_submit();

REVOKE ALL ON FUNCTION feedback_core.capture_activity_snapshot_on_submit()
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON TABLE feedback_core.activity_snapshots IS
  'Immutable cumulative count/status snapshot captured at a submitted feedback checkpoint. No journal, reflection, support, coach or team content.';
COMMENT ON COLUMN feedback_core.activity_snapshots.resume_delay_bucket IS
  'Gap before the most recent return to core program activity. SAME_DAY is reserved for future event-level instrumentation and is not emitted by v1.0.0.';
COMMENT ON COLUMN feedback_core.activity_snapshots.continuation_status_bucket IS
  'Days between the checkpoint cutoff and the most recent core program activity; descriptive only and never causal.';
COMMENT ON COLUMN feedback_core.activity_snapshots.transfer_pulse_count IS
  'Intentionally NULL until a separate producer source and privacy review explicitly approve this signal.';

COMMIT;
