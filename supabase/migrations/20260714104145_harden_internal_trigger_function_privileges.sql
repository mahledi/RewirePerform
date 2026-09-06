-- Trigger functions are internal implementation details, not public RPCs.

BEGIN;

REVOKE ALL ON FUNCTION public.touch_program_runs_updated_at()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.archive_program_runs_with_team()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_program_instance_run()
  FROM PUBLIC, anon, authenticated;

COMMIT;
