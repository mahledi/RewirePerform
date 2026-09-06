-- A confirmed team program start is immutable. This protects the program-day
-- and assessment-instance boundary even when an older client bypasses its UI.
BEGIN;

CREATE OR REPLACE FUNCTION public.prevent_activated_team_program_start_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.program_activated_at IS NOT NULL
     AND NEW.program_start_date IS DISTINCT FROM OLD.program_start_date THEN
    RAISE EXCEPTION USING
      ERRCODE = 'check_violation',
      MESSAGE = 'program_start_locked',
      DETAIL = 'A confirmed team program start cannot be changed.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_activated_team_program_start_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS prevent_activated_team_program_start_change ON public.teams;
CREATE TRIGGER prevent_activated_team_program_start_change
BEFORE UPDATE OF program_start_date ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.prevent_activated_team_program_start_change();

COMMIT;
