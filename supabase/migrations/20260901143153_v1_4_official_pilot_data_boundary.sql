-- RewirePerform V1.4 official pilot data boundary (BUILT, NOT ACTIVE).
--
-- A program run has two different evidence windows:
--   1. onboarding/baseline can legitimately precede program day one;
--   2. in-program observations must start at the official activity boundary.
-- Operational records (accounts, memberships, consent) are never classified or
-- deleted by this migration. Derived progress snapshots are never raw evidence.

BEGIN;

CREATE TABLE evidence_private.program_run_data_windows (
  program_run_id uuid PRIMARY KEY REFERENCES public.program_runs(id) ON DELETE CASCADE,
  pilot_timezone text NOT NULL DEFAULT 'Europe/Berlin',
  baseline_started_at timestamptz NOT NULL,
  activity_started_at timestamptz NOT NULL,
  eligibility_protocol_version text NOT NULL DEFAULT '56d-transfer-v2-2026-07',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','retired')),
  decision_basis text NOT NULL,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (baseline_started_at <= activity_started_at),
  CHECK (
    (status = 'approved' AND approved_by IS NOT NULL AND approved_at IS NOT NULL)
    OR (status <> 'approved')
  )
);

CREATE TABLE evidence_private.source_boundary_contracts (
  source_key text PRIMARY KEY,
  boundary_class text NOT NULL CHECK (boundary_class IN ('baseline','activity','derived_never_source')),
  canonical_time_field text NOT NULL,
  permits_late_sync boolean NOT NULL DEFAULT false,
  notes text NOT NULL
);

INSERT INTO evidence_private.source_boundary_contracts(
  source_key, boundary_class, canonical_time_field, permits_late_sync, notes
) VALUES
  ('onboarding_self_report','baseline','questionnaire_responses.created_at',false,
    'Only complete onboarding_v2/v2 responses linked to the same non-QA program instance.'),
  ('onboarding_followup_self_report','activity','questionnaire_responses.created_at',false,
    'Mid and post self-reports must never use the earlier baseline window.'),
  ('development_index','activity','versioned development measurement timestamp',false,
    'Blocked by source mapping until its instrument and subscale contract is approved.'),
  ('validated_assessment','activity','assessments.created_at',false,
    'Pre, mid and post measurements count only inside the official in-program window.'),
  ('comprehension_learning','activity','comprehension_check_instances.completed_at',true,
    'Understanding checks use completion time and the canonical program day.'),
  ('athlete_transfer','activity','athlete_transfer_observations.collected_at',true,
    'Structured, consented transfer observations only; never free text.'),
  ('coach_observation','activity','coach_evidence_reviews.created_at',false,
    'Structured released observations only; private coach text remains excluded.'),
  ('daily_state','activity','daily_checkins.date',true,
    'The canonical local program date controls late sync; created_at must still follow activation.'),
  ('completion_usage','activity','user_day_completion.completed_at',true,
    'Completion proves use only, never mental quality or effectiveness.'),
  ('daily_journal_completion','activity','daily_journals.date',true,
    'Only completion presence can be used; journal answers and free reflection are excluded.'),
  ('program_progress_snapshot','derived_never_source','program_progress_snapshots.date',false,
    'Snapshots are rebuilt outputs and can never be ingested as raw evidence.');

ALTER TABLE evidence_private.program_run_data_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_private.program_run_data_windows FORCE ROW LEVEL SECURITY;
ALTER TABLE evidence_private.source_boundary_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_private.source_boundary_contracts FORCE ROW LEVEL SECURITY;

REVOKE ALL ON evidence_private.program_run_data_windows FROM PUBLIC, anon, authenticated;
REVOKE ALL ON evidence_private.source_boundary_contracts FROM PUBLIC, anon, authenticated;
GRANT ALL ON evidence_private.program_run_data_windows TO service_role;
GRANT SELECT ON evidence_private.source_boundary_contracts TO service_role;

ALTER TABLE evidence_derived.measurement_values
  DROP CONSTRAINT IF EXISTS measurement_values_source_family_check;
ALTER TABLE evidence_derived.measurement_values
  ADD CONSTRAINT measurement_values_source_family_check CHECK (source_family IN (
    'onboarding_self_report','development_index','validated_assessment','comprehension_learning',
    'athlete_transfer','coach_observation','daily_state','completion_usage'
  ));

ALTER TABLE evidence_derived.source_activation_contracts
  DROP CONSTRAINT IF EXISTS source_activation_contracts_source_family_check;
ALTER TABLE evidence_derived.source_activation_contracts
  ADD CONSTRAINT source_activation_contracts_source_family_check CHECK (source_family IN (
    'onboarding_self_report','development_index','validated_assessment','comprehension_learning',
    'athlete_transfer','coach_observation','daily_state','completion_usage'
  ));

INSERT INTO evidence_derived.source_activation_contracts(
  protocol_version, source_family, activation_status, permitted_claim_classes, mapping_contract
) VALUES (
  'longitudinal-evidence-v1.4-draft-2026-08',
  'comprehension_learning',
  'mapping_required',
  '{}',
  'Question-level correctness and understanding rates remain descriptive until the item/day/version contract is approved.'
) ON CONFLICT (protocol_version, source_family) DO NOTHING;

CREATE OR REPLACE FUNCTION evidence_private.get_source_boundary_decision_v1_4(
  _program_run_id uuid,
  _source_key text,
  _observed_at timestamptz,
  _source_local_date date DEFAULT NULL,
  _day_number integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, evidence_private
AS $$
DECLARE
  target_window evidence_private.program_run_data_windows%ROWTYPE;
  target_contract evidence_private.source_boundary_contracts%ROWTYPE;
  target_run public.program_runs%ROWTYPE;
  effective_date date;
BEGIN
  SELECT * INTO target_window
  FROM evidence_private.program_run_data_windows
  WHERE program_run_id = _program_run_id;
  SELECT * INTO target_contract
  FROM evidence_private.source_boundary_contracts
  WHERE source_key = _source_key;
  SELECT * INTO target_run
  FROM public.program_runs
  WHERE id = _program_run_id;

  IF target_run.id IS NULL THEN
    RETURN jsonb_build_object('official',false,'reason','unknown_program_run');
  END IF;
  IF target_contract.source_key IS NULL THEN
    RETURN jsonb_build_object('official',false,'reason','unknown_source');
  END IF;
  IF target_contract.boundary_class = 'derived_never_source' THEN
    RETURN jsonb_build_object('official',false,'reason','derived_output_not_source');
  END IF;
  IF target_window.program_run_id IS NULL OR target_window.status <> 'approved' THEN
    RETURN jsonb_build_object('official',false,'reason','pilot_window_not_approved');
  END IF;
  IF _observed_at IS NULL THEN
    RETURN jsonb_build_object('official',false,'reason','canonical_time_missing');
  END IF;

  IF target_contract.boundary_class = 'baseline' THEN
    IF _observed_at < target_window.baseline_started_at THEN
      RETURN jsonb_build_object('official',false,'reason','before_baseline_window');
    END IF;
    RETURN jsonb_build_object('official',true,'reason','official_baseline');
  END IF;

  effective_date := COALESCE(
    _source_local_date,
    timezone(target_window.pilot_timezone, _observed_at)::date
  );
  IF _observed_at < target_window.activity_started_at THEN
    RETURN jsonb_build_object('official',false,'reason','before_activity_window');
  END IF;
  IF target_run.started_at IS NOT NULL AND effective_date < target_run.started_at THEN
    RETURN jsonb_build_object('official',false,'reason','before_program_start_date');
  END IF;
  IF _day_number IS NOT NULL AND _day_number NOT BETWEEN 1 AND 56 THEN
    RETURN jsonb_build_object('official',false,'reason','invalid_program_day');
  END IF;

  RETURN jsonb_build_object(
    'official',true,
    'reason','official_activity',
    'effective_date',effective_date,
    'late_sync_permitted',target_contract.permits_late_sync
  );
END;
$$;

CREATE OR REPLACE FUNCTION evidence_private.guard_v1_4_baseline_boundary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, evidence_private, evidence_derived
AS $$
DECLARE decision jsonb;
  response_timing text;
BEGIN
  SELECT timing INTO response_timing
  FROM public.questionnaire_responses
  WHERE id = NEW.questionnaire_response_id;
  IF response_timing IS DISTINCT FROM 'pre' THEN
    RAISE EXCEPTION 'evidence_v1_4_baseline_requires_pre_timing';
  END IF;
  decision := evidence_private.get_source_boundary_decision_v1_4(
    NEW.program_run_id,
    'onboarding_self_report',
    NEW.completed_at,
    NULL,
    0
  );
  IF COALESCE((decision->>'official')::boolean, false) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'evidence_v1_4_outside_official_pilot_boundary:%', decision->>'reason';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_v1_4_baseline_boundary
BEFORE INSERT OR UPDATE OF program_run_id, completed_at
ON evidence_derived.baseline_snapshots
FOR EACH ROW EXECUTE FUNCTION evidence_private.guard_v1_4_baseline_boundary();

CREATE OR REPLACE FUNCTION evidence_private.guard_v1_4_measurement_boundary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, evidence_private, evidence_derived
AS $$
DECLARE decision jsonb;
BEGIN
  decision := evidence_private.get_source_boundary_decision_v1_4(
    NEW.program_run_id,
    CASE
      WHEN NEW.source_family = 'onboarding_self_report' AND NEW.timing <> 'pre'
        THEN 'onboarding_followup_self_report'
      ELSE NEW.source_family
    END,
    NEW.measured_at,
    NULL,
    NEW.day_number
  );
  IF COALESCE((decision->>'official')::boolean, false) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'evidence_v1_4_outside_official_pilot_boundary:%', decision->>'reason';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_v1_4_measurement_boundary
BEFORE INSERT OR UPDATE OF program_run_id, source_family, measured_at, day_number
ON evidence_derived.measurement_values
FOR EACH ROW EXECUTE FUNCTION evidence_private.guard_v1_4_measurement_boundary();

CREATE OR REPLACE FUNCTION evidence_private.reconcile_program_run_boundary_v1_4(
  _program_run_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, evidence_private
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.program_runs WHERE id = _program_run_id) THEN
    RAISE EXCEPTION 'unknown_program_run';
  END IF;

  WITH raw AS (
    SELECT 'onboarding_self_report'::text source_key, q.created_at observed_at, NULL::date source_date,
      NULL::integer day_number, q.is_complete row_complete,
      public.evidence_eligibility_reason(pi.id, COALESCE(boundary_window.eligibility_protocol_version,'56d-transfer-v2-2026-07')) eligibility_reason,
      COALESCE(p.is_test_user,false) OR COALESCE(pi.is_test_instance,false) OR COALESCE(t.is_test_team,false) qa_excluded
    FROM public.questionnaire_responses q
    JOIN public.program_instances pi ON pi.id=q.program_instance_id
    JOIN public.profiles p ON p.id=q.user_id
    JOIN public.teams t ON t.id=pi.team_id
    LEFT JOIN evidence_private.program_run_data_windows boundary_window ON boundary_window.program_run_id=pi.program_run_id
    WHERE pi.program_run_id=_program_run_id AND q.instrument_id='onboarding_v2' AND q.questionnaire_version='v2'
    UNION ALL
    SELECT 'validated_assessment', a.created_at, NULL, NULL, true,
      public.evidence_eligibility_reason(pi.id, COALESCE(boundary_window.eligibility_protocol_version,'56d-transfer-v2-2026-07')),
      COALESCE(p.is_test_user,false) OR COALESCE(pi.is_test_instance,false) OR COALESCE(t.is_test_team,false)
    FROM public.assessments a
    JOIN public.program_instances pi ON pi.id=a.program_instance_id
    JOIN public.profiles p ON p.id=a.user_id
    JOIN public.teams t ON t.id=pi.team_id
    LEFT JOIN evidence_private.program_run_data_windows boundary_window ON boundary_window.program_run_id=pi.program_run_id
    WHERE pi.program_run_id=_program_run_id
    UNION ALL
    SELECT 'comprehension_learning', c.completed_at, NULL, c.day_number, c.status='completed',
      public.evidence_eligibility_reason(pi.id, COALESCE(boundary_window.eligibility_protocol_version,'56d-transfer-v2-2026-07')),
      COALESCE(p.is_test_user,false) OR COALESCE(pi.is_test_instance,false) OR COALESCE(t.is_test_team,false)
    FROM public.comprehension_check_instances c
    JOIN public.program_instances pi ON pi.id=c.program_instance_id
    JOIN public.profiles p ON p.id=c.user_id
    JOIN public.teams t ON t.id=pi.team_id
    LEFT JOIN evidence_private.program_run_data_windows boundary_window ON boundary_window.program_run_id=pi.program_run_id
    WHERE pi.program_run_id=_program_run_id
    UNION ALL
    SELECT 'daily_state', d.created_at, d.date, NULL, true,
      public.evidence_eligibility_reason(pi.id, COALESCE(boundary_window.eligibility_protocol_version,'56d-transfer-v2-2026-07')),
      COALESCE(p.is_test_user,false) OR COALESCE(pi.is_test_instance,false) OR COALESCE(t.is_test_team,false)
    FROM public.daily_checkins d
    JOIN public.program_instances pi ON pi.id=d.program_instance_id
    JOIN public.profiles p ON p.id=d.user_id
    JOIN public.teams t ON t.id=pi.team_id
    LEFT JOIN evidence_private.program_run_data_windows boundary_window ON boundary_window.program_run_id=pi.program_run_id
    WHERE pi.program_run_id=_program_run_id
    UNION ALL
    SELECT 'daily_journal_completion', j.created_at, j.date, j.day_number, true,
      public.evidence_eligibility_reason(pi.id, COALESCE(boundary_window.eligibility_protocol_version,'56d-transfer-v2-2026-07')),
      COALESCE(p.is_test_user,false) OR COALESCE(pi.is_test_instance,false) OR COALESCE(t.is_test_team,false)
    FROM public.daily_journals j
    JOIN public.program_instances pi ON pi.id=j.program_instance_id
    JOIN public.profiles p ON p.id=j.user_id
    JOIN public.teams t ON t.id=pi.team_id
    LEFT JOIN evidence_private.program_run_data_windows boundary_window ON boundary_window.program_run_id=pi.program_run_id
    WHERE pi.program_run_id=_program_run_id
    UNION ALL
    SELECT 'completion_usage', u.completed_at, NULL, u.day_number, u.completion_status='completed',
      public.evidence_eligibility_reason(pi.id, COALESCE(boundary_window.eligibility_protocol_version,'56d-transfer-v2-2026-07')),
      COALESCE(p.is_test_user,false) OR COALESCE(pi.is_test_instance,false) OR COALESCE(t.is_test_team,false)
    FROM public.user_day_completion u
    JOIN public.program_instances pi ON pi.id=u.program_instance_id
    JOIN public.profiles p ON p.id=u.user_id
    JOIN public.teams t ON t.id=pi.team_id
    LEFT JOIN evidence_private.program_run_data_windows boundary_window ON boundary_window.program_run_id=pi.program_run_id
    WHERE pi.program_run_id=_program_run_id
    UNION ALL
    SELECT 'athlete_transfer', a.collected_at, NULL, a.day_number, NOT a.is_test,
      public.evidence_eligibility_reason(pi.id, COALESCE(boundary_window.eligibility_protocol_version,'56d-transfer-v2-2026-07')),
      a.is_test OR COALESCE(p.is_test_user,false) OR COALESCE(pi.is_test_instance,false) OR COALESCE(t.is_test_team,false)
    FROM public.athlete_transfer_observations a
    JOIN public.program_instances pi ON pi.id=a.program_instance_id
    JOIN public.profiles p ON p.id=a.user_id
    JOIN public.teams t ON t.id=pi.team_id
    LEFT JOIN evidence_private.program_run_data_windows boundary_window ON boundary_window.program_run_id=pi.program_run_id
    WHERE pi.program_run_id=_program_run_id
    UNION ALL
    SELECT 'program_progress_snapshot', s.created_at, s.date, s.program_day, true,
      public.evidence_eligibility_reason(pi.id, COALESCE(boundary_window.eligibility_protocol_version,'56d-transfer-v2-2026-07')),
      COALESCE(p.is_test_user,false) OR COALESCE(pi.is_test_instance,false) OR COALESCE(t.is_test_team,false)
    FROM public.program_progress_snapshots s
    JOIN public.program_instances pi ON pi.id=s.program_instance_id
    JOIN public.profiles p ON p.id=s.user_id
    JOIN public.teams t ON t.id=pi.team_id
    LEFT JOIN evidence_private.program_run_data_windows boundary_window ON boundary_window.program_run_id=pi.program_run_id
    WHERE pi.program_run_id=_program_run_id
  ), decisions AS (
    SELECT source_key, row_complete, eligibility_reason, qa_excluded,
      evidence_private.get_source_boundary_decision_v1_4(
        _program_run_id, source_key, observed_at, source_date, day_number
      ) decision
    FROM raw
  ), grouped AS (
    SELECT source_key,
      count(*)::integer total_rows,
      count(*) FILTER (
        WHERE row_complete AND NOT qa_excluded
          AND eligibility_reason IN ('eligible','eligible_minor')
          AND COALESCE((decision->>'official')::boolean,false)
      )::integer official_rows,
      count(*) FILTER (WHERE NOT row_complete)::integer incomplete_rows,
      count(*) FILTER (WHERE qa_excluded)::integer qa_rows,
      count(*) FILTER (
        WHERE eligibility_reason NOT IN ('eligible','eligible_minor')
      )::integer authorization_excluded_rows,
      count(*) FILTER (
        WHERE row_complete AND NOT qa_excluded
          AND eligibility_reason IN ('eligible','eligible_minor')
          AND NOT COALESCE((decision->>'official')::boolean,false)
      )::integer boundary_excluded_rows,
      jsonb_object_agg(COALESCE(decision->>'reason','unknown'), 1) FILTER (WHERE decision IS NOT NULL) reason_presence
    FROM decisions
    GROUP BY source_key
  )
  SELECT jsonb_build_object(
    'program_run_id',_program_run_id,
    'contains_identifiers',false,
    'sources',COALESCE(jsonb_agg(jsonb_build_object(
      'source_key',source_key,
      'total_rows',total_rows,
      'official_rows',official_rows,
      'incomplete_rows',incomplete_rows,
      'qa_rows',qa_rows,
      'authorization_excluded_rows',authorization_excluded_rows,
      'boundary_excluded_rows',boundary_excluded_rows,
      'reason_presence',COALESCE(reason_presence,'{}'::jsonb)
    ) ORDER BY source_key),'[]'::jsonb)
  ) INTO result
  FROM grouped;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION evidence_private.get_source_boundary_decision_v1_4(uuid,text,timestamptz,date,integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION evidence_private.guard_v1_4_measurement_boundary()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION evidence_private.guard_v1_4_baseline_boundary()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION evidence_private.reconcile_program_run_boundary_v1_4(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION evidence_private.get_source_boundary_decision_v1_4(uuid,text,timestamptz,date,integer)
  TO service_role;
GRANT EXECUTE ON FUNCTION evidence_private.reconcile_program_run_boundary_v1_4(uuid)
  TO service_role;

COMMENT ON TABLE evidence_private.program_run_data_windows IS
  'Per-run, human-approved separation of legitimate onboarding baseline from official in-program pilot activity.';
COMMENT ON FUNCTION evidence_private.reconcile_program_run_boundary_v1_4(uuid) IS
  'Service-only count reconciliation. Returns no user IDs, names, emails, answers, scores, journals or free text.';

COMMIT;
