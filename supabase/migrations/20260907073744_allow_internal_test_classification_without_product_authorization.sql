-- Permit one privacy-protective maintenance transition without weakening the
-- minor product authorization gate: an existing program instance may only be
-- promoted from ordinary to internal-test state when every other column stays
-- identical. Inserts, demotions, and all product-data changes remain guarded.

BEGIN;

CREATE OR REPLACE FUNCTION minor_auth.enforce_product_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  target_user_id uuid;
  only_internal_test_promotion boolean := false;
BEGIN
  target_user_id := NULLIF(to_jsonb(NEW) ->> TG_ARGV[0], '')::uuid;
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'minor_authorization_user_required';
  END IF;

  IF TG_OP = 'UPDATE'
     AND TG_TABLE_SCHEMA = 'public'
     AND TG_TABLE_NAME = 'program_instances' THEN
    only_internal_test_promotion :=
      NOT COALESCE((to_jsonb(OLD) ->> 'is_test_instance')::boolean, false)
      AND COALESCE((to_jsonb(NEW) ->> 'is_test_instance')::boolean, false)
      AND (to_jsonb(NEW) - 'is_test_instance')
        IS NOT DISTINCT FROM (to_jsonb(OLD) - 'is_test_instance');
  END IF;

  IF only_internal_test_promotion THEN
    RETURN NEW;
  END IF;

  IF NOT minor_auth.is_product_authorized(target_user_id) THEN
    RAISE EXCEPTION 'minor_product_authorization_required';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION minor_auth.enforce_product_write()
  FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION minor_auth.enforce_product_write() IS
  'Fail-closed minor product-write guard. The sole authorization-independent update is a false-to-true internal-test marker promotion with every other program-instance column unchanged.';

COMMIT;
