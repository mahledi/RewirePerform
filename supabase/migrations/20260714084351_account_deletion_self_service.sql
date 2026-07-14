-- Account deletion self-service
--
-- Personal source rows are removed with the Auth user. Existing consent-based,
-- aggregate-only study snapshots are intentionally retained because they do
-- not contain a user identifier or raw individual content.

BEGIN;

CREATE TABLE public.account_deletion_requests (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  transfer_plan jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(transfer_plan) = 'object'),
  requested_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.account_deletion_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.account_deletion_requests TO service_role;

CREATE OR REPLACE FUNCTION public.cleanup_deleted_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  deletion_request public.account_deletion_requests%ROWTYPE;
  owned_team record;
  successor_id uuid;
  successor_text text;
BEGIN
  SELECT *
  INTO deletion_request
  FROM public.account_deletion_requests
  WHERE user_id = OLD.id
  FOR UPDATE;

  FOR owned_team IN
    SELECT id
    FROM public.teams
    WHERE created_by = OLD.id
    FOR UPDATE
  LOOP
    IF deletion_request.user_id IS NULL
       OR deletion_request.requested_at < now() - interval '15 minutes' THEN
      RAISE EXCEPTION 'account_deletion_requires_team_transfer';
    END IF;

    successor_text := deletion_request.transfer_plan ->> owned_team.id::text;
    IF successor_text IS NULL
       OR successor_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RAISE EXCEPTION 'account_deletion_requires_team_transfer';
    END IF;
    successor_id := successor_text::uuid;

    IF successor_id = OLD.id THEN
      RAISE EXCEPTION 'account_deletion_invalid_team_successor';
    END IF;

    PERFORM 1
    FROM public.team_members tm
    JOIN public.user_roles ur
      ON ur.user_id = tm.user_id
     AND ur.role = 'coach'::public.app_role
    WHERE tm.team_id = owned_team.id
      AND tm.user_id = successor_id
    FOR KEY SHARE OF tm, ur;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'account_deletion_invalid_team_successor';
    END IF;

    UPDATE public.teams
    SET created_by = successor_id
    WHERE id = owned_team.id;
  END LOOP;

  -- Remove or neutralize references that are not configured to cascade from
  -- auth.users. Team-level content and anonymous aggregate snapshots remain.
  UPDATE public.teams
  SET program_activated_by = NULL
  WHERE program_activated_by = OLD.id;

  UPDATE public.program_runs
  SET created_by = NULL
  WHERE created_by = OLD.id;

  UPDATE public.study_cohorts
  SET created_by = NULL
  WHERE created_by = OLD.id;

  UPDATE public.study_aggregate_snapshots
  SET generated_by = NULL
  WHERE generated_by = OLD.id;

  UPDATE public.study_export_manifests
  SET generated_by = NULL
  WHERE generated_by = OLD.id;

  UPDATE public.study_evidence_snapshots
  SET generated_by = NULL
  WHERE generated_by = OLD.id;

  UPDATE public.team_calendar_events
  SET created_by = NULL
  WHERE created_by = OLD.id;

  UPDATE public.team_training_schedule
  SET created_by = NULL
  WHERE created_by = OLD.id;

  DELETE FROM public.qa_time_overrides
  WHERE user_id = OLD.id OR created_by = OLD.id;

  -- Delete instance-bound personal source data before program_instances;
  -- current foreign keys intentionally use ON DELETE RESTRICT. Legacy rows
  -- can still be linked only through session_id, so both identifiers apply.
  DELETE FROM public.daily_checkins
  WHERE user_id = OLD.id OR session_id = OLD.id::text;
  DELETE FROM public.daily_journals WHERE user_id = OLD.id;
  DELETE FROM public.user_day_completion WHERE user_id = OLD.id;
  DELETE FROM public.comprehension_check_instances WHERE user_id = OLD.id;
  DELETE FROM public.assessments
  WHERE user_id = OLD.id OR session_id = OLD.id::text;
  DELETE FROM public.deep_profile_assessments
  WHERE user_id = OLD.id OR session_id = OLD.id::text;
  DELETE FROM public.program_progress_snapshots WHERE user_id = OLD.id;
  DELETE FROM public.questionnaire_responses
  WHERE user_id = OLD.id OR session_id = OLD.id::text;
  DELETE FROM public.user_day_assignments WHERE user_id = OLD.id;

  DELETE FROM public.study_participants WHERE user_id = OLD.id;
  DELETE FROM public.app_event_log WHERE user_id = OLD.id;
  DELETE FROM public.coach_journals WHERE coach_id = OLD.id;
  DELETE FROM public.notification_log WHERE user_id = OLD.id;
  DELETE FROM public.push_subscriptions WHERE user_id = OLD.id;
  DELETE FROM public.training_schedule WHERE user_id = OLD.id;
  DELETE FROM public.feedback WHERE user_id = OLD.id;
  DELETE FROM public.personalized_tasks
  WHERE user_id = OLD.id OR session_id = OLD.id::text;
  DELETE FROM public.program_settings
  WHERE user_id = OLD.id OR session_id = OLD.id::text;
  DELETE FROM public.calendar_events
  WHERE user_id = OLD.id OR session_id = OLD.id::text;
  DELETE FROM public.program_instances WHERE user_id = OLD.id;

  -- These rows also cascade from auth.users. Explicit deletion keeps the
  -- cleanup contract clear and makes trigger behavior independent of order.
  DELETE FROM public.team_members WHERE user_id = OLD.id;
  DELETE FROM public.user_roles WHERE user_id = OLD.id;

  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_deleted_account() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_delete_rewireperform ON auth.users;
CREATE TRIGGER on_auth_user_delete_rewireperform
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_deleted_account();

COMMIT;
