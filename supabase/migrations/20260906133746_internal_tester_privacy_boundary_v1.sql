-- Permanent internal-tester boundary for real-team product testing.
--
-- Internal testers may exercise the complete athlete flow, including inside a
-- real team. Their operational records remain available to themselves and to
-- administrators, but they must never enter coach-facing individual views,
-- reminders, official counts, Jarvis aggregates, or Evidence outputs.

BEGIN;

CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS app_private.internal_test_classification_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text NOT NULL CHECK (subject_type IN ('user', 'team')),
  subject_id uuid NOT NULL,
  classification text NOT NULL CHECK (classification = 'internal_test'),
  reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 3 AND 500),
  classified_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  classified_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_private.internal_test_classification_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.internal_test_classification_audit FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE app_private.internal_test_classification_audit
  FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA app_private TO service_role;
GRANT SELECT, INSERT ON TABLE app_private.internal_test_classification_audit
  TO service_role;

CREATE INDEX IF NOT EXISTS idx_internal_test_classification_subject
  ON app_private.internal_test_classification_audit(subject_type, subject_id, classified_at DESC);

CREATE OR REPLACE FUNCTION app_private.can_staff_view_team_member_v1(
  _team_id uuid,
  _target_user_id uuid,
  _actor_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT
    _actor_id IS NOT NULL
    AND _actor_id = auth.uid()
    AND NOT COALESCE((
      SELECT profile.is_test_user
      FROM public.profiles profile
      WHERE profile.id = _target_user_id
    ), false)
    AND EXISTS (
      SELECT 1
      FROM public.team_staff_memberships staff
      WHERE staff.team_id = _team_id
        AND staff.user_id = _actor_id
        AND staff.status = 'active'
    );
$$;

CREATE OR REPLACE FUNCTION app_private.can_staff_view_user_v1(
  _target_user_id uuid,
  _actor_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT
    _actor_id IS NOT NULL
    AND _actor_id = auth.uid()
    AND NOT COALESCE((
      SELECT profile.is_test_user
      FROM public.profiles profile
      WHERE profile.id = _target_user_id
    ), false)
    AND EXISTS (
      SELECT 1
      FROM public.team_members member
      JOIN public.team_staff_memberships staff
        ON staff.team_id = member.team_id
       AND staff.user_id = _actor_id
       AND staff.status = 'active'
      WHERE member.user_id = _target_user_id
    );
$$;

REVOKE ALL ON FUNCTION app_private.can_staff_view_team_member_v1(uuid, uuid, uuid)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION app_private.can_staff_view_user_v1(uuid, uuid)
  FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA app_private TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.can_staff_view_team_member_v1(uuid, uuid, uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.can_staff_view_user_v1(uuid, uuid)
  TO authenticated;

-- Preserve self-service and admin visibility, while removing internal testers
-- from every staff-facing row path. Existing broad policies are replaced
-- explicitly because PostgreSQL OR-combines permissive policies.
DROP POLICY IF EXISTS "Team staff can view team members" ON public.team_members;
CREATE POLICY "Team staff can view team members"
  ON public.team_members FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid())
    OR app_private.can_staff_view_team_member_v1(
      team_id,
      user_id,
      (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Coaches can view team profiles" ON public.profiles;
CREATE POLICY "Coaches can view team profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    id = (select auth.uid())
    OR app_private.can_staff_view_user_v1(id, (select auth.uid()))
  );

DROP POLICY IF EXISTS "Coaches read team member roles" ON public.user_roles;
CREATE POLICY "Coaches read team member roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (app_private.can_staff_view_user_v1(user_id, (select auth.uid())));

-- A test identity remains a test identity even if a legacy join or activation
-- function attempts to create an ordinary instance in a real team.
CREATE OR REPLACE FUNCTION app_private.enforce_internal_test_program_instance_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  NEW.is_test_instance :=
    COALESCE(NEW.is_test_instance, false)
    OR (TG_OP = 'UPDATE' AND COALESCE(OLD.is_test_instance, false))
    OR COALESCE((
      SELECT profile.is_test_user
      FROM public.profiles profile
      WHERE profile.id = NEW.user_id
    ), false)
    OR COALESCE((
      SELECT team.is_test_team
      FROM public.teams team
      WHERE team.id = NEW.team_id
    ), false);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION app_private.enforce_internal_test_program_instance_v1()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_enforce_internal_test_program_instance_v1
  ON public.program_instances;
CREATE TRIGGER trg_enforce_internal_test_program_instance_v1
  BEFORE INSERT OR UPDATE OF user_id, team_id, is_test_instance
  ON public.program_instances
  FOR EACH ROW EXECUTE FUNCTION app_private.enforce_internal_test_program_instance_v1();

CREATE OR REPLACE FUNCTION app_private.preserve_internal_test_profile_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF COALESCE(OLD.is_test_user, false) THEN
    NEW.is_test_user := true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION app_private.preserve_internal_test_team_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF COALESCE(OLD.is_test_team, false) THEN
    NEW.is_test_team := true;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION app_private.preserve_internal_test_profile_v1()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION app_private.preserve_internal_test_team_v1()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_preserve_internal_test_profile_v1 ON public.profiles;
CREATE TRIGGER trg_preserve_internal_test_profile_v1
  BEFORE UPDATE OF is_test_user ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION app_private.preserve_internal_test_profile_v1();

DROP TRIGGER IF EXISTS trg_preserve_internal_test_team_v1 ON public.teams;
CREATE TRIGGER trg_preserve_internal_test_team_v1
  BEFORE UPDATE OF is_test_team ON public.teams
  FOR EACH ROW EXECUTE FUNCTION app_private.preserve_internal_test_team_v1();

CREATE OR REPLACE FUNCTION app_private.classify_internal_tester_v1(
  _user_id uuid,
  _classified_by uuid,
  _reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  changed_profiles integer := 0;
  changed_instances integer := 0;
BEGIN
  IF _user_id IS NULL OR _classified_by IS NULL OR length(btrim(COALESCE(_reason, ''))) < 3 THEN
    RAISE EXCEPTION 'invalid_internal_test_classification';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles role
    WHERE role.user_id = _classified_by
      AND role.role::text = 'admin'
  ) THEN
    RAISE EXCEPTION 'admin_role_required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles profile
  SET is_test_user = true
  WHERE profile.id = _user_id
    AND NOT COALESCE(profile.is_test_user, false);
  GET DIAGNOSTICS changed_profiles = ROW_COUNT;

  IF NOT EXISTS (SELECT 1 FROM public.profiles profile WHERE profile.id = _user_id) THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  UPDATE public.program_instances instance
  SET is_test_instance = true
  WHERE instance.user_id = _user_id
    AND NOT COALESCE(instance.is_test_instance, false);
  GET DIAGNOSTICS changed_instances = ROW_COUNT;

  INSERT INTO app_private.internal_test_classification_audit (
    subject_type,
    subject_id,
    classification,
    reason,
    classified_by
  ) VALUES (
    'user',
    _user_id,
    'internal_test',
    btrim(_reason),
    _classified_by
  );

  RETURN pg_catalog.jsonb_build_object(
    'classification', 'internal_test',
    'profile_changed', changed_profiles = 1,
    'instances_changed', changed_instances
  );
END;
$$;

REVOKE ALL ON FUNCTION app_private.classify_internal_tester_v1(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION app_private.classify_internal_tester_v1(uuid, uuid, text)
  TO service_role;

CREATE OR REPLACE FUNCTION app_private.classify_internal_test_team_v1(
  _team_id uuid,
  _classified_by uuid,
  _reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  changed_teams integer := 0;
  changed_instances integer := 0;
BEGIN
  IF _team_id IS NULL OR _classified_by IS NULL OR length(btrim(COALESCE(_reason, ''))) < 3 THEN
    RAISE EXCEPTION 'invalid_internal_test_team_classification';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles role
    WHERE role.user_id = _classified_by
      AND role.role::text = 'admin'
  ) THEN
    RAISE EXCEPTION 'admin_role_required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.teams team
  SET is_test_team = true
  WHERE team.id = _team_id
    AND NOT COALESCE(team.is_test_team, false);
  GET DIAGNOSTICS changed_teams = ROW_COUNT;

  IF NOT EXISTS (SELECT 1 FROM public.teams team WHERE team.id = _team_id) THEN
    RAISE EXCEPTION 'team_not_found';
  END IF;

  UPDATE public.program_instances instance
  SET is_test_instance = true
  WHERE instance.team_id = _team_id
    AND NOT COALESCE(instance.is_test_instance, false);
  GET DIAGNOSTICS changed_instances = ROW_COUNT;

  INSERT INTO app_private.internal_test_classification_audit (
    subject_type, subject_id, classification, reason, classified_by
  ) VALUES (
    'team', _team_id, 'internal_test', btrim(_reason), _classified_by
  );

  RETURN pg_catalog.jsonb_build_object(
    'classification', 'internal_test',
    'team_changed', changed_teams = 1,
    'instances_changed', changed_instances
  );
END;
$$;

REVOKE ALL ON FUNCTION app_private.classify_internal_test_team_v1(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION app_private.classify_internal_test_team_v1(uuid, uuid, text)
  TO service_role;

COMMENT ON TABLE app_private.internal_test_classification_audit IS
  'Private append-only audit of internal test classification. Direct identifiers never enter Jarvis, CEO, Evidence, or coach outputs.';
COMMENT ON FUNCTION app_private.classify_internal_tester_v1(uuid, uuid, text) IS
  'Service-role-only durable classification. Marks the profile and every existing program instance as test data.';
COMMENT ON FUNCTION app_private.classify_internal_test_team_v1(uuid, uuid, text) IS
  'Service-role-only durable classification. Marks the team and every existing program instance as test data.';


COMMIT;

