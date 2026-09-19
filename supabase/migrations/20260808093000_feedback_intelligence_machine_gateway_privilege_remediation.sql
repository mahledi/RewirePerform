-- Postdeploy privilege-audit remediation for the Feedback Intelligence reader.
-- Removes the role-creator membership edge and historical PUBLIC EXECUTE on
-- trigger-only functions. No application rows or runtime gates are changed.

BEGIN;

REVOKE mahleos_feedback_reader FROM postgres;

REVOKE ALL ON FUNCTION public.touch_daily_journals_updated_at()
  FROM PUBLIC, mahleos_feedback_reader;
REVOKE ALL ON FUNCTION public.touch_program_instances_updated_at()
  FROM PUBLIC, mahleos_feedback_reader;
REVOKE ALL ON FUNCTION public.touch_progress_snapshots_updated_at()
  FROM PUBLIC, mahleos_feedback_reader;
REVOKE ALL ON FUNCTION public.touch_updated_at()
  FROM PUBLIC, mahleos_feedback_reader;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

COMMIT;
