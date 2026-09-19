-- Removes only the deterministic synthetic subjects created by
-- prepare-longitudinal-fixture.sql. The minimized machine-access audit receipt
-- intentionally remains append-only.

BEGIN;

WITH fixture_users AS (
  SELECT ('88080800-0000-4000-8000-' || lpad(subject_index::text, 12, '0'))::uuid AS user_id
  FROM generate_series(1, 15) AS subject_index
)
DELETE FROM auth.users target
USING fixture_users fixture
WHERE target.id = fixture.user_id;

DO $$
DECLARE
  remaining_rows integer;
BEGIN
  WITH fixture_users AS (
    SELECT ('88080800-0000-4000-8000-' || lpad(subject_index::text, 12, '0'))::uuid AS user_id
    FROM generate_series(1, 15) AS subject_index
  ), fixture_instances AS (
    SELECT ('88080810-0000-4000-8000-' || lpad(subject_index::text, 12, '0'))::uuid AS instance_id
    FROM generate_series(1, 15) AS subject_index
  )
  SELECT
    (SELECT count(*) FROM auth.users target INNER JOIN fixture_users fixture ON fixture.user_id = target.id)
    + (SELECT count(*) FROM public.profiles target INNER JOIN fixture_users fixture ON fixture.user_id = target.id)
    + (SELECT count(*) FROM public.program_instances target INNER JOIN fixture_instances fixture ON fixture.instance_id = target.id)
    + (SELECT count(*) FROM feedback_core.submissions target INNER JOIN fixture_users fixture ON fixture.user_id = target.user_id)
    + (SELECT count(*) FROM feedback_core.subject_links target INNER JOIN fixture_users fixture ON fixture.user_id = target.user_id)
    + (SELECT count(*) FROM feedback_consent.text_consent_receipts target INNER JOIN fixture_users fixture ON fixture.user_id = target.user_id)
    + (SELECT count(*) FROM feedback_consent.guardian_text_authorizations target INNER JOIN fixture_users fixture ON fixture.user_id = target.user_id)
  INTO remaining_rows;

  IF remaining_rows <> 0 THEN
    RAISE EXCEPTION 'feedback_one_shot_fixture_cleanup_incomplete:%', remaining_rows;
  END IF;
END;
$$;

COMMIT;
