-- RewirePerform V1.4 longitudinal evidence foundation (BUILT, NOT ACTIVE).
--
-- This migration creates a privacy-separated evidence model and controlled
-- read surfaces. It does not backfill Production data and deliberately leaves
-- the protocol in draft until purpose, consent, minors, retention, deletion,
-- access-audit and Store declarations are approved in Block 9.

BEGIN;

CREATE SCHEMA IF NOT EXISTS evidence_private;
CREATE SCHEMA IF NOT EXISTS evidence_derived;

REVOKE ALL ON SCHEMA evidence_private FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SCHEMA evidence_derived FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA evidence_private, evidence_derived TO service_role;

CREATE TABLE evidence_private.subject_registry (
  subject_ref uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  rotated_at timestamptz
);

CREATE TABLE evidence_private.access_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  surface text NOT NULL CHECK (surface IN ('athlete_timeline', 'internal_workbench', 'coach_aggregate', 'evidence_report')),
  purpose text NOT NULL,
  program_run_id uuid REFERENCES public.program_runs(id) ON DELETE SET NULL,
  rows_returned integer NOT NULL DEFAULT 0 CHECK (rows_returned >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE evidence_private.authorization_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_ref uuid NOT NULL REFERENCES evidence_private.subject_registry(subject_ref) ON DELETE CASCADE,
  consent_version text NOT NULL,
  consented_at timestamptz NOT NULL,
  authorization_basis jsonb NOT NULL CHECK (jsonb_typeof(authorization_basis) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE evidence_derived.analysis_protocols (
  protocol_version text PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('draft', 'active', 'retired')),
  instrument_id text NOT NULL,
  instrument_version text NOT NULL,
  contract_checksum text NOT NULL,
  required_consent_version text NOT NULL,
  retention_policy text NOT NULL,
  minimum_group_size integer NOT NULL CHECK (minimum_group_size >= 5),
  activated_at timestamptz,
  activated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'active' OR (activated_at IS NOT NULL AND activated_by IS NOT NULL))
);

INSERT INTO evidence_derived.analysis_protocols(
  protocol_version, status, instrument_id, instrument_version, contract_checksum,
  required_consent_version, retention_policy, minimum_group_size
) VALUES (
  'longitudinal-evidence-v1.4-draft-2026-08', 'draft', 'onboarding_v2', 'v2',
  'b1e374748dba44d9a45c5fb976399179c1535ee5f5f41906282061a57d3fbb56',
  'pending-block-9-approval', 'pending-block-9-approval', 5
);

CREATE TABLE evidence_derived.measurement_contract_items (
  protocol_version text NOT NULL REFERENCES evidence_derived.analysis_protocols(protocol_version) ON DELETE RESTRICT,
  question_id text NOT NULL,
  construct_id text NOT NULL CHECK (construct_id IN (
    'error_recovery', 'pressure_regulation', 'focus_presence', 'uncertainty_learning',
    'recovery_load', 'team_connection', 'motivation_process'
  )),
  analysis_role text NOT NULL CHECK (analysis_role IN ('primary', 'exploratory')),
  privacy_scope text NOT NULL CHECK (privacy_scope IN ('private_only', 'aggregate_allowed', 'private_and_aggregate')),
  internal_pseudonymous_allowed boolean NOT NULL,
  coach_aggregate_allowed boolean NOT NULL,
  scoring_direction text NOT NULL CHECK (scoring_direction IN ('higher_is_better', 'lower_is_better', 'categorical')),
  evidence_kind text NOT NULL DEFAULT 'internal_non_validated_self_report',
  allowed_claim_classes text[] NOT NULL DEFAULT '{}',
  PRIMARY KEY (protocol_version, question_id),
  CHECK (privacy_scope <> 'private_only' OR (NOT internal_pseudonymous_allowed AND NOT coach_aggregate_allowed))
);

INSERT INTO evidence_derived.measurement_contract_items(
  protocol_version, question_id, construct_id, analysis_role, privacy_scope,
  internal_pseudonymous_allowed, coach_aggregate_allowed, scoring_direction, allowed_claim_classes
) VALUES
  ('longitudinal-evidence-v1.4-draft-2026-08','id-01','pressure_regulation','primary','private_only',false,false,'lower_is_better','{}'),
  ('longitudinal-evidence-v1.4-draft-2026-08','id-02','pressure_regulation','primary','private_only',false,false,'categorical','{}'),
  ('longitudinal-evidence-v1.4-draft-2026-08','id-04','pressure_regulation','primary','private_and_aggregate',true,true,'lower_is_better',ARRAY['self_reported_change','triangulated_change','association']),
  ('longitudinal-evidence-v1.4-draft-2026-08','id-05','pressure_regulation','primary','private_and_aggregate',true,true,'categorical',ARRAY['self_reported_change','triangulated_change','association']),
  ('longitudinal-evidence-v1.4-draft-2026-08','err-01','error_recovery','primary','aggregate_allowed',true,true,'lower_is_better',ARRAY['self_reported_change','triangulated_change','association']),
  ('longitudinal-evidence-v1.4-draft-2026-08','err-02','error_recovery','primary','aggregate_allowed',true,true,'higher_is_better',ARRAY['self_reported_change','triangulated_change','association']),
  ('longitudinal-evidence-v1.4-draft-2026-08','err-03','error_recovery','primary','private_and_aggregate',true,true,'categorical',ARRAY['self_reported_change','triangulated_change','association']),
  ('longitudinal-evidence-v1.4-draft-2026-08','err-04','error_recovery','primary','aggregate_allowed',true,true,'lower_is_better',ARRAY['self_reported_change','triangulated_change','association']),
  ('longitudinal-evidence-v1.4-draft-2026-08','err-05','error_recovery','primary','aggregate_allowed',true,true,'categorical',ARRAY['self_reported_change','triangulated_change','association']),
  ('longitudinal-evidence-v1.4-draft-2026-08','err-07','error_recovery','primary','aggregate_allowed',true,true,'lower_is_better',ARRAY['self_reported_change','triangulated_change','association']),
  ('longitudinal-evidence-v1.4-draft-2026-08','press-02','pressure_regulation','primary','aggregate_allowed',true,true,'lower_is_better',ARRAY['self_reported_change','triangulated_change','association']),
  ('longitudinal-evidence-v1.4-draft-2026-08','press-03','pressure_regulation','primary','aggregate_allowed',true,true,'higher_is_better',ARRAY['self_reported_change','triangulated_change','association']),
  ('longitudinal-evidence-v1.4-draft-2026-08','press-04','pressure_regulation','primary','aggregate_allowed',true,true,'categorical',ARRAY['self_reported_change','triangulated_change','association']),
  ('longitudinal-evidence-v1.4-draft-2026-08','press-05','pressure_regulation','primary','aggregate_allowed',true,true,'higher_is_better',ARRAY['self_reported_change','triangulated_change','association']),
  ('longitudinal-evidence-v1.4-draft-2026-08','focus-01','focus_presence','primary','aggregate_allowed',true,true,'higher_is_better',ARRAY['self_reported_change','triangulated_change','association']),
  ('longitudinal-evidence-v1.4-draft-2026-08','focus-03','focus_presence','primary','aggregate_allowed',true,true,'higher_is_better',ARRAY['self_reported_change','triangulated_change','association']),
  ('longitudinal-evidence-v1.4-draft-2026-08','focus-04','focus_presence','primary','aggregate_allowed',true,true,'higher_is_better',ARRAY['self_reported_change','triangulated_change','association']),
  ('longitudinal-evidence-v1.4-draft-2026-08','mot-01','motivation_process','exploratory','private_and_aggregate',true,true,'categorical',ARRAY['self_reported_change','triangulated_change','association']),
  ('longitudinal-evidence-v1.4-draft-2026-08','mot-02','motivation_process','exploratory','aggregate_allowed',true,true,'higher_is_better',ARRAY['self_reported_change','triangulated_change','association']),
  ('longitudinal-evidence-v1.4-draft-2026-08','mot-03','motivation_process','exploratory','aggregate_allowed',true,true,'lower_is_better',ARRAY['self_reported_change','triangulated_change','association']),
  ('longitudinal-evidence-v1.4-draft-2026-08','mot-05','motivation_process','exploratory','private_only',false,false,'higher_is_better','{}'),
  ('longitudinal-evidence-v1.4-draft-2026-08','rec-01','recovery_load','exploratory','aggregate_allowed',true,true,'categorical',ARRAY['self_reported_change','triangulated_change','association']),
  ('longitudinal-evidence-v1.4-draft-2026-08','rec-02','recovery_load','exploratory','aggregate_allowed',true,true,'higher_is_better',ARRAY['self_reported_change','triangulated_change','association']),
  ('longitudinal-evidence-v1.4-draft-2026-08','rec-03','recovery_load','exploratory','aggregate_allowed',true,true,'higher_is_better',ARRAY['self_reported_change','triangulated_change','association']),
  ('longitudinal-evidence-v1.4-draft-2026-08','rec-04','recovery_load','exploratory','aggregate_allowed',true,true,'lower_is_better',ARRAY['self_reported_change','triangulated_change','association']),
  ('longitudinal-evidence-v1.4-draft-2026-08','rec-05','recovery_load','exploratory','aggregate_allowed',true,true,'higher_is_better',ARRAY['self_reported_change','triangulated_change','association']),
  ('longitudinal-evidence-v1.4-draft-2026-08','env-01','team_connection','primary','aggregate_allowed',true,true,'higher_is_better',ARRAY['self_reported_change','triangulated_change','association']),
  ('longitudinal-evidence-v1.4-draft-2026-08','env-02','team_connection','primary','aggregate_allowed',true,true,'higher_is_better',ARRAY['self_reported_change','triangulated_change','association']),
  ('longitudinal-evidence-v1.4-draft-2026-08','env-03','pressure_regulation','primary','private_and_aggregate',true,true,'categorical',ARRAY['self_reported_change','triangulated_change','association']),
  ('longitudinal-evidence-v1.4-draft-2026-08','grow-01','uncertainty_learning','primary','aggregate_allowed',true,true,'higher_is_better',ARRAY['self_reported_change','triangulated_change','association']),
  ('longitudinal-evidence-v1.4-draft-2026-08','grow-02','uncertainty_learning','primary','aggregate_allowed',true,true,'categorical',ARRAY['self_reported_change','triangulated_change','association']),
  ('longitudinal-evidence-v1.4-draft-2026-08','grow-03','uncertainty_learning','primary','aggregate_allowed',true,true,'higher_is_better',ARRAY['self_reported_change','triangulated_change','association']),
  ('longitudinal-evidence-v1.4-draft-2026-08','grow-04','uncertainty_learning','primary','aggregate_allowed',true,true,'higher_is_better',ARRAY['self_reported_change','triangulated_change','association']),
  ('longitudinal-evidence-v1.4-draft-2026-08','grow-05','uncertainty_learning','primary','aggregate_allowed',true,true,'higher_is_better',ARRAY['self_reported_change','triangulated_change','association']),
  ('longitudinal-evidence-v1.4-draft-2026-08','dp-03','error_recovery','primary','aggregate_allowed',true,true,'lower_is_better',ARRAY['self_reported_change','triangulated_change','association']),
  ('longitudinal-evidence-v1.4-draft-2026-08','dp-06','focus_presence','primary','aggregate_allowed',true,true,'higher_is_better',ARRAY['self_reported_change','triangulated_change','association']);

CREATE TABLE evidence_derived.claims_ledger (
  claim_class text PRIMARY KEY CHECK (claim_class IN ('use','self_reported_change','triangulated_change','association','causality')),
  permitted_meaning text NOT NULL,
  required_evidence text NOT NULL,
  active boolean NOT NULL DEFAULT false,
  CHECK (claim_class <> 'causality' OR active = false)
);

INSERT INTO evidence_derived.claims_ledger VALUES
  ('use','Beschreibt ausschließlich Programmnutzung.','Berechtigte, consentierte und QA-bereinigte Aktivitätsdaten.',true),
  ('self_reported_change','Veränderung derselben Person im selben Messvertrag.','Vergleichbares Pre/Mid/Post-Paar mit Messqualität.',false),
  ('triangulated_change','Mehrere getrennte Quellen zeigen eine ähnliche Richtung.','Mindestens zwei unabhängige Quellenfamilien im gleichen Zeitraum.',false),
  ('association','Zwei beobachtete Größen hängen im Datensatz zusammen.','Vorab definierte Analyse mit Unsicherheit, Missingness und Alternativerklärungen.',false),
  ('causality','RewirePerform hat Veränderung verursacht.','Angemessenes Vergleichsdesign, unabhängige Prüfung und separate Freigabe.',false);

CREATE TABLE evidence_derived.baseline_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_response_id uuid NOT NULL UNIQUE REFERENCES public.questionnaire_responses(id) ON DELETE CASCADE,
  subject_ref uuid NOT NULL REFERENCES evidence_private.subject_registry(subject_ref) ON DELETE CASCADE,
  program_instance_id uuid NOT NULL REFERENCES public.program_instances(id) ON DELETE RESTRICT,
  program_run_id uuid REFERENCES public.program_runs(id) ON DELETE RESTRICT,
  team_id uuid REFERENCES public.teams(id) ON DELETE RESTRICT,
  instrument_id text NOT NULL,
  instrument_version text NOT NULL,
  contract_checksum text NOT NULL,
  completed_at timestamptz NOT NULL,
  authorization_receipt_id uuid NOT NULL REFERENCES evidence_private.authorization_receipts(id) ON DELETE RESTRICT,
  qa_excluded boolean NOT NULL,
  expected_item_count integer NOT NULL CHECK (expected_item_count > 0),
  scored_item_count integer NOT NULL CHECK (scored_item_count >= 0),
  completeness_rate numeric(6,5) NOT NULL CHECK (completeness_rate BETWEEN 0 AND 1),
  data_quality text NOT NULL CHECK (data_quality IN ('complete','partial','invalid')),
  response_digest text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE evidence_derived.measurement_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_version text NOT NULL REFERENCES evidence_derived.analysis_protocols(protocol_version) ON DELETE RESTRICT,
  subject_ref uuid NOT NULL REFERENCES evidence_private.subject_registry(subject_ref) ON DELETE CASCADE,
  program_instance_id uuid NOT NULL REFERENCES public.program_instances(id) ON DELETE RESTRICT,
  program_run_id uuid REFERENCES public.program_runs(id) ON DELETE RESTRICT,
  team_id uuid REFERENCES public.teams(id) ON DELETE RESTRICT,
  construct_id text NOT NULL,
  question_id text,
  instrument_id text NOT NULL,
  instrument_version text NOT NULL,
  source_family text NOT NULL CHECK (source_family IN (
    'onboarding_self_report','development_index','validated_assessment','athlete_transfer',
    'coach_observation','daily_state','completion_usage'
  )),
  timing text NOT NULL CHECK (timing IN ('pre','mid','post')),
  normalized_score numeric(6,3) NOT NULL CHECK (normalized_score BETWEEN 0 AND 100),
  measured_at timestamptz NOT NULL,
  day_number integer CHECK (day_number BETWEEN 0 AND 56),
  privacy_scope text NOT NULL,
  internal_pseudonymous_allowed boolean NOT NULL DEFAULT false,
  coach_aggregate_allowed boolean NOT NULL DEFAULT false,
  quality_flags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(protocol_version, subject_ref, program_instance_id, instrument_id, instrument_version, source_family, timing, question_id)
);

CREATE INDEX idx_evidence_v14_values_run_construct_timing
  ON evidence_derived.measurement_values(program_run_id, construct_id, timing);
CREATE INDEX idx_evidence_v14_values_subject_run
  ON evidence_derived.measurement_values(subject_ref, program_run_id, instrument_id, instrument_version);

ALTER TABLE evidence_private.subject_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_private.subject_registry FORCE ROW LEVEL SECURITY;
ALTER TABLE evidence_private.access_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_private.access_audit FORCE ROW LEVEL SECURITY;
ALTER TABLE evidence_private.authorization_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_private.authorization_receipts FORCE ROW LEVEL SECURITY;
ALTER TABLE evidence_derived.analysis_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_derived.analysis_protocols FORCE ROW LEVEL SECURITY;
ALTER TABLE evidence_derived.measurement_contract_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_derived.measurement_contract_items FORCE ROW LEVEL SECURITY;
ALTER TABLE evidence_derived.claims_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_derived.claims_ledger FORCE ROW LEVEL SECURITY;
ALTER TABLE evidence_derived.baseline_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_derived.baseline_snapshots FORCE ROW LEVEL SECURITY;
ALTER TABLE evidence_derived.measurement_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_derived.measurement_values FORCE ROW LEVEL SECURITY;

REVOKE ALL ON ALL TABLES IN SCHEMA evidence_private FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA evidence_derived FROM PUBLIC, anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA evidence_private, evidence_derived TO service_role;

CREATE OR REPLACE FUNCTION evidence_private.capture_onboarding_baseline_v1_4(_response_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, evidence_private, evidence_derived
AS $$
DECLARE
  target_response public.questionnaire_responses%ROWTYPE;
  target_profile public.profiles%ROWTYPE;
  target_instance public.program_instances%ROWTYPE;
  target_subject uuid;
  target_protocol evidence_derived.analysis_protocols%ROWTYPE;
  expected_count integer;
  scored_count integer;
  target_authorization jsonb;
  target_authorization_receipt uuid;
BEGIN
  SELECT * INTO target_protocol
  FROM evidence_derived.analysis_protocols
  WHERE protocol_version = 'longitudinal-evidence-v1.4-draft-2026-08';
  IF target_protocol.status <> 'active' THEN
    RAISE EXCEPTION 'evidence_v1_4_not_activated';
  END IF;

  SELECT * INTO target_response FROM public.questionnaire_responses WHERE id = _response_id;
  IF target_response.id IS NULL OR NOT target_response.is_complete
    OR target_response.user_id IS NULL OR target_response.program_instance_id IS NULL
    OR target_response.instrument_id <> target_protocol.instrument_id
    OR target_response.questionnaire_version <> target_protocol.instrument_version THEN
    RAISE EXCEPTION 'evidence_v1_4_ineligible_response';
  END IF;
  SELECT * INTO target_profile FROM public.profiles WHERE id = target_response.user_id;
  SELECT * INTO target_instance FROM public.program_instances WHERE id = target_response.program_instance_id AND user_id = target_response.user_id;
  IF target_instance.id IS NULL OR COALESCE(target_profile.is_test_user, false) OR COALESCE(target_instance.is_test_instance, false) THEN
    RAISE EXCEPTION 'evidence_v1_4_qa_or_instance_ineligible';
  END IF;
  IF COALESCE(target_profile.data_contribution_consent, false) IS DISTINCT FROM true
    OR target_profile.data_contribution_consent_version <> target_protocol.required_consent_version
    OR target_profile.data_contribution_consented_at IS NULL THEN
    RAISE EXCEPTION 'evidence_v1_4_consent_required';
  END IF;

  SELECT jsonb_build_object(
    'age_band', pa.age_band,
    'product_status', pa.product_status,
    'data_contribution_status', pa.data_contribution_status,
    'guardian_status', pa.guardian_status,
    'athlete_status', pa.athlete_status
  ) INTO target_authorization
  FROM minor_auth.participant_authorizations pa
  WHERE pa.user_id = target_response.user_id;
  IF target_authorization IS NULL THEN
    RAISE EXCEPTION 'evidence_v1_4_authorization_missing';
  END IF;
  IF target_authorization->>'product_status' <> 'authorized'
    OR target_authorization->>'data_contribution_status' <> 'authorized' THEN
    RAISE EXCEPTION 'evidence_v1_4_authorization_required';
  END IF;

  INSERT INTO evidence_private.subject_registry(user_id)
  VALUES (target_response.user_id)
  ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
  RETURNING subject_ref INTO target_subject;

  INSERT INTO evidence_private.authorization_receipts(
    subject_ref, consent_version, consented_at, authorization_basis
  ) VALUES (
    target_subject, target_profile.data_contribution_consent_version,
    target_profile.data_contribution_consented_at, target_authorization
  ) RETURNING id INTO target_authorization_receipt;

  SELECT count(*)::integer INTO expected_count
  FROM evidence_derived.measurement_contract_items item
  WHERE item.protocol_version = target_protocol.protocol_version
    AND item.internal_pseudonymous_allowed;
  SELECT count(*)::integer INTO scored_count
  FROM evidence_derived.measurement_contract_items item
  WHERE item.protocol_version = target_protocol.protocol_version
    AND item.internal_pseudonymous_allowed
    AND jsonb_typeof(target_response.scores->'item_scores'->item.question_id) = 'number';

  INSERT INTO evidence_derived.baseline_snapshots(
    questionnaire_response_id, subject_ref, program_instance_id, program_run_id, team_id,
    instrument_id, instrument_version, contract_checksum, completed_at,
    authorization_receipt_id, qa_excluded,
    expected_item_count, scored_item_count, completeness_rate, data_quality, response_digest
  ) VALUES (
    target_response.id, target_subject, target_instance.id, target_instance.program_run_id, target_instance.team_id,
    target_response.instrument_id, target_response.questionnaire_version, target_protocol.contract_checksum, target_response.created_at,
    target_authorization_receipt, false, expected_count, scored_count,
    CASE WHEN expected_count = 0 THEN 0 ELSE scored_count::numeric / expected_count END,
    CASE WHEN scored_count = expected_count THEN 'complete' WHEN scored_count > 0 THEN 'partial' ELSE 'invalid' END,
    encode(extensions.digest(convert_to(target_response.id::text || ':' || target_response.scores::text, 'UTF8'), 'sha256'), 'hex')
  );

  INSERT INTO evidence_derived.measurement_values(
    protocol_version, subject_ref, program_instance_id, program_run_id, team_id, construct_id,
    question_id, instrument_id, instrument_version, source_family, timing, normalized_score,
    measured_at, day_number, privacy_scope, internal_pseudonymous_allowed,
    coach_aggregate_allowed, quality_flags
  )
  SELECT
    target_protocol.protocol_version, target_subject, target_instance.id, target_instance.program_run_id,
    target_instance.team_id, item.construct_id, item.question_id, target_response.instrument_id,
    target_response.questionnaire_version, 'onboarding_self_report', target_response.timing,
    (target_response.scores->'item_scores'->>item.question_id)::numeric,
    target_response.created_at, 0, item.privacy_scope,
    item.internal_pseudonymous_allowed, item.coach_aggregate_allowed,
    CASE WHEN scored_count = expected_count THEN '{}'::text[] ELSE ARRAY['partial_instrument']::text[] END
  FROM evidence_derived.measurement_contract_items item
  WHERE item.protocol_version = target_protocol.protocol_version
    AND item.internal_pseudonymous_allowed
    AND jsonb_typeof(target_response.scores->'item_scores'->item.question_id) = 'number';

  RETURN jsonb_build_object('status','captured','subject_ref',target_subject,'scored_item_count',scored_count,'expected_item_count',expected_count);
END;
$$;

REVOKE ALL ON FUNCTION evidence_private.capture_onboarding_baseline_v1_4(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION evidence_private.capture_onboarding_baseline_v1_4(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.get_my_longitudinal_evidence_v1_4()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, evidence_private, evidence_derived
AS $$
DECLARE result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM evidence_derived.analysis_protocols WHERE protocol_version = 'longitudinal-evidence-v1.4-draft-2026-08' AND status = 'active') THEN
    RETURN jsonb_build_object('status','not_activated','protocol_version','longitudinal-evidence-v1.4-draft-2026-08','timeline','[]'::jsonb);
  END IF;
  SELECT jsonb_build_object(
    'status','active',
    'protocol_version','longitudinal-evidence-v1.4-draft-2026-08',
    'timeline', COALESCE(jsonb_agg(jsonb_build_object(
      'construct_id', value.construct_id, 'source_family', value.source_family,
      'timing', value.timing, 'normalized_score', value.normalized_score,
      'measured_at', value.measured_at, 'day_number', value.day_number
    ) ORDER BY value.measured_at) FILTER (WHERE value.id IS NOT NULL), '[]'::jsonb)
  ) INTO result
  FROM evidence_private.subject_registry registry
  LEFT JOIN evidence_derived.measurement_values value ON value.subject_ref = registry.subject_ref
  WHERE registry.user_id = auth.uid();
  RETURN COALESCE(result, jsonb_build_object('status','active','timeline','[]'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.get_coach_team_development_v1_4(_program_run_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, evidence_private, evidence_derived
AS $$
DECLARE target_team_id uuid; min_n integer; result jsonb;
BEGIN
  SELECT team_id INTO target_team_id FROM public.program_runs WHERE id = _program_run_id;
  IF target_team_id IS NULL OR NOT public.can_manage_team_program_runs(target_team_id) THEN RAISE EXCEPTION 'access_denied'; END IF;
  SELECT minimum_group_size INTO min_n FROM evidence_derived.analysis_protocols
  WHERE protocol_version = 'longitudinal-evidence-v1.4-draft-2026-08' AND status = 'active';
  IF min_n IS NULL THEN RETURN jsonb_build_object('status','not_activated','groups','[]'::jsonb); END IF;
  WITH subject_construct_timing AS (
    SELECT subject_ref, construct_id, timing, avg(normalized_score) AS score
    FROM evidence_derived.measurement_values
    WHERE program_run_id = _program_run_id AND coach_aggregate_allowed
    GROUP BY subject_ref, construct_id, timing
  ), grouped AS (
    SELECT construct_id, timing, count(*)::integer AS n, avg(score) AS mean_score
    FROM subject_construct_timing GROUP BY construct_id, timing
  )
  SELECT jsonb_build_object('status','active','minimum_group_size',min_n,'groups',COALESCE(jsonb_agg(
    jsonb_build_object('construct_id',construct_id,'timing',timing,'n',n,
      'confidence',CASE WHEN n < min_n THEN 'suppressed' WHEN n < 10 THEN 'low' ELSE 'standard' END,
      'mean_score',CASE WHEN n >= min_n THEN round(mean_score,2) ELSE NULL END)
    ORDER BY construct_id,timing), '[]'::jsonb)) INTO result FROM grouped;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_evidence_workbench_v1_4(_program_run_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public, evidence_private, evidence_derived
AS $$
DECLARE result jsonb; returned integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'access_denied'; END IF;
  IF NOT EXISTS (SELECT 1 FROM evidence_derived.analysis_protocols WHERE protocol_version = 'longitudinal-evidence-v1.4-draft-2026-08' AND status = 'active') THEN
    RETURN jsonb_build_object('status','not_activated','rows','[]'::jsonb);
  END IF;
  SELECT count(*)::integer, jsonb_build_object('status','active','rows',COALESCE(jsonb_agg(jsonb_build_object(
    'subject_ref', subject_ref, 'construct_id', construct_id, 'source_family', source_family,
    'timing', timing, 'normalized_score', normalized_score, 'measured_at', measured_at,
    'quality_flags', quality_flags
  ) ORDER BY subject_ref,construct_id,measured_at), '[]'::jsonb))
  INTO returned, result
  FROM evidence_derived.measurement_values
  WHERE program_run_id = _program_run_id AND internal_pseudonymous_allowed;
  INSERT INTO evidence_private.access_audit(actor_id,surface,purpose,program_run_id,rows_returned)
  VALUES(auth.uid(),'internal_workbench','approved_internal_evidence_review',_program_run_id,returned);
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_evidence_report_v1_4(_program_run_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public, evidence_private, evidence_derived
AS $$
DECLARE result jsonb; min_n integer; returned integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'access_denied'; END IF;
  SELECT minimum_group_size INTO min_n FROM evidence_derived.analysis_protocols
  WHERE protocol_version = 'longitudinal-evidence-v1.4-draft-2026-08' AND status = 'active';
  IF min_n IS NULL THEN RETURN jsonb_build_object('status','not_activated','constructs','[]'::jsonb); END IF;
  WITH subject_construct_timing AS (
    SELECT subject_ref, construct_id, timing, avg(normalized_score) AS score
    FROM evidence_derived.measurement_values
    WHERE program_run_id = _program_run_id AND internal_pseudonymous_allowed
    GROUP BY subject_ref,construct_id,timing
  ), paired AS (
    SELECT pre.construct_id, pre.subject_ref, post.score - pre.score AS change
    FROM subject_construct_timing pre JOIN subject_construct_timing post
      ON post.subject_ref=pre.subject_ref AND post.construct_id=pre.construct_id
    WHERE pre.timing='pre' AND post.timing='post'
  ), grouped AS (
    SELECT construct_id,count(*)::integer AS paired_n,avg(change) AS mean_change,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY change) AS median_change,
      stddev_samp(change) AS spread
    FROM paired GROUP BY construct_id
  )
  SELECT count(*)::integer, jsonb_build_object(
    'status','active','claim_class','self_reported_change','causal_claim_allowed',false,
    'constructs',COALESCE(jsonb_agg(jsonb_build_object(
      'construct_id',construct_id,'paired_n',paired_n,
      'confidence',CASE WHEN paired_n < min_n THEN 'suppressed' WHEN paired_n < 10 THEN 'low' ELSE 'standard' END,
      'mean_change',CASE WHEN paired_n >= min_n THEN round(mean_change,2) ELSE NULL END,
      'median_change',CASE WHEN paired_n >= min_n THEN round(median_change::numeric,2) ELSE NULL END,
      'spread',CASE WHEN paired_n >= min_n THEN round(spread,2) ELSE NULL END
    ) ORDER BY construct_id), '[]'::jsonb))
  INTO returned,result FROM grouped;
  INSERT INTO evidence_private.access_audit(actor_id,surface,purpose,program_run_id,rows_returned)
  VALUES(auth.uid(),'evidence_report','approved_internal_evidence_report',_program_run_id,returned);
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_longitudinal_evidence_v1_4() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_coach_team_development_v1_4(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_admin_evidence_workbench_v1_4(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_evidence_report_v1_4(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_longitudinal_evidence_v1_4() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_coach_team_development_v1_4(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_evidence_workbench_v1_4(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_evidence_report_v1_4(uuid) TO authenticated;

COMMENT ON SCHEMA evidence_private IS 'Direct identity mapping and access audit. Never exposed to browser roles.';
COMMENT ON SCHEMA evidence_derived IS 'Pseudonymized V1.4 measurements. No raw answers, free text, names or email addresses.';
COMMENT ON TABLE evidence_derived.analysis_protocols IS 'V1.4 remains draft until a later approved activation migration completes Block 9.';

COMMIT;
