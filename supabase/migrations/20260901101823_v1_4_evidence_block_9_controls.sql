-- RewirePerform V1.4 evidence Block 9 controls (BUILT, NOT ACTIVE).
--
-- The existing voluntary data-contribution consent is a candidate legal basis
-- only for the same narrow pilot purpose. This migration does not approve that
-- compatibility decision, activate the protocol, or backfill real data.

BEGIN;

CREATE TABLE evidence_private.processing_scope_contracts (
  protocol_version text PRIMARY KEY REFERENCES evidence_derived.analysis_protocols(protocol_version) ON DELETE CASCADE,
  purpose_code text NOT NULL UNIQUE,
  purpose_summary text NOT NULL,
  candidate_consent_version text NOT NULL,
  compatibility_assessment text NOT NULL CHECK (compatibility_assessment IN (
    'pending', 'conditionally_compatible', 'new_consent_required', 'approved'
  )),
  included_data_classes text[] NOT NULL,
  excluded_data_classes text[] NOT NULL,
  allowed_outputs text[] NOT NULL,
  prohibited_outputs text[] NOT NULL,
  maximum_retention_days integer NOT NULL CHECK (maximum_retention_days BETWEEN 1 AND 365),
  access_audit_retention_days integer NOT NULL CHECK (access_audit_retention_days BETWEEN 30 AND 365),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO evidence_private.processing_scope_contracts (
  protocol_version, purpose_code, purpose_summary, candidate_consent_version,
  compatibility_assessment, included_data_classes, excluded_data_classes,
  allowed_outputs, prohibited_outputs, maximum_retention_days,
  access_audit_retention_days
) VALUES (
  'longitudinal-evidence-v1.4-draft-2026-08',
  'internal_pilot_longitudinal_evidence_v1',
  'Freiwillige interne Beschreibung von Nutzung und Veränderung im selben Programmlauf; kein Diagnose-, Überwachungs- oder Kausalzweck.',
  'data_contribution_v3_2026_07',
  'conditionally_compatible',
  ARRAY[
    'structured_questionnaire_scores', 'structured_assessment_scores',
    'structured_checkin_values', 'structured_transfer_values',
    'released_structured_coach_observations', 'completion_usage'
  ],
  ARRAY[
    'journal_content', 'free_text', 'names', 'email_addresses',
    'private_coach_notes', 'diagnostic_data', 'unreleased_observations'
  ],
  ARRAY[
    'athlete_private_timeline', 'thresholded_coach_team_aggregate',
    'pseudonymous_internal_pilot_analysis', 'non_identifying_pilot_report'
  ],
  ARRAY[
    'individual_coach_psychological_profile', 'automated_decision',
    'causal_effectiveness_claim', 'external_research_reuse',
    'cross_organization_identity_profile', 'free_text_analysis'
  ],
  365,
  365
);

CREATE TABLE evidence_private.governance_gates (
  protocol_version text NOT NULL REFERENCES evidence_derived.analysis_protocols(protocol_version) ON DELETE CASCADE,
  gate_key text NOT NULL CHECK (gate_key IN (
    'purpose_and_legal_basis', 'consent_compatibility', 'minor_guardian_contract',
    'withdrawal_and_erasure', 'retention', 'source_mapping_contract',
    'access_and_export_review', 'dpia_screening', 'privacy_transparency',
    'app_store_disclosure', 'google_play_disclosure', 'backfill_reconciliation'
  )),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  evidence_reference text NOT NULL,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  approval_expires_at timestamptz,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (protocol_version, gate_key),
  CHECK (status <> 'approved' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)),
  CHECK (approval_expires_at IS NULL OR approved_at IS NULL OR approval_expires_at > approved_at)
);

INSERT INTO evidence_private.governance_gates(protocol_version, gate_key, evidence_reference)
SELECT 'longitudinal-evidence-v1.4-draft-2026-08', gate_key, evidence_reference
FROM (VALUES
  ('purpose_and_legal_basis', 'docs/evidence-v1.4/BLOCK_9_PRIVACY_COMPATIBILITY.md'),
  ('consent_compatibility', 'docs/evidence-v1.4/BLOCK_9_PRIVACY_COMPATIBILITY.md'),
  ('minor_guardian_contract', 'docs/evidence-v1.4/BLOCK_9_PRIVACY_COMPATIBILITY.md'),
  ('withdrawal_and_erasure', 'docs/evidence-v1.4/RETENTION_WITHDRAWAL_AND_ACCESS.md'),
  ('retention', 'docs/evidence-v1.4/RETENTION_WITHDRAWAL_AND_ACCESS.md'),
  ('source_mapping_contract', 'docs/evidence-v1.4/SOURCE_CONNECTION_MATRIX.md'),
  ('access_and_export_review', 'docs/evidence-v1.4/RETENTION_WITHDRAWAL_AND_ACCESS.md'),
  ('dpia_screening', 'docs/evidence-v1.4/BLOCK_9_PRIVACY_COMPATIBILITY.md'),
  ('privacy_transparency', 'src/pages/Privacy.tsx'),
  ('app_store_disclosure', 'docs/evidence-v1.4/BLOCK_9_PRIVACY_COMPATIBILITY.md'),
  ('google_play_disclosure', 'docs/evidence-v1.4/BLOCK_9_PRIVACY_COMPATIBILITY.md'),
  ('backfill_reconciliation', 'docs/evidence-v1.4/RETENTION_WITHDRAWAL_AND_ACCESS.md')
) AS gates(gate_key, evidence_reference);

CREATE TABLE evidence_derived.source_activation_contracts (
  protocol_version text NOT NULL REFERENCES evidence_derived.analysis_protocols(protocol_version) ON DELETE CASCADE,
  source_family text NOT NULL CHECK (source_family IN (
    'onboarding_self_report','development_index','validated_assessment','athlete_transfer',
    'coach_observation','daily_state','completion_usage'
  )),
  activation_status text NOT NULL CHECK (activation_status IN (
    'contract_ready', 'mapping_required', 'use_only', 'blocked'
  )),
  permitted_claim_classes text[] NOT NULL DEFAULT '{}',
  mapping_contract text NOT NULL,
  PRIMARY KEY (protocol_version, source_family),
  CHECK (NOT ('causality' = ANY(permitted_claim_classes)))
);

INSERT INTO evidence_derived.source_activation_contracts VALUES
  ('longitudinal-evidence-v1.4-draft-2026-08','onboarding_self_report','contract_ready',ARRAY['self_reported_change'],'36-item questionnaire contract; same-person and same-run pairing only'),
  ('longitudinal-evidence-v1.4-draft-2026-08','development_index','mapping_required','{}','instrument/version/subscale mapping must be approved before capture'),
  ('longitudinal-evidence-v1.4-draft-2026-08','validated_assessment','mapping_required','{}','validated instrument semantics remain separate until an approved crosswalk exists'),
  ('longitudinal-evidence-v1.4-draft-2026-08','athlete_transfer','mapping_required','{}','structured transfer items require an explicit construct and timing crosswalk'),
  ('longitudinal-evidence-v1.4-draft-2026-08','coach_observation','mapping_required','{}','only released structured observations; no private coach notes'),
  ('longitudinal-evidence-v1.4-draft-2026-08','daily_state','mapping_required','{}','mood, energy and focus remain descriptive until an approved mapping exists'),
  ('longitudinal-evidence-v1.4-draft-2026-08','completion_usage','use_only',ARRAY['use'],'completion describes use, never mental quality or effect');

CREATE TABLE evidence_private.lifecycle_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN ('withdrawal_erasure','account_erasure','retention_dry_run','retention_erasure')),
  reason_code text NOT NULL,
  measurement_rows integer NOT NULL DEFAULT 0 CHECK (measurement_rows >= 0),
  baseline_rows integer NOT NULL DEFAULT 0 CHECK (baseline_rows >= 0),
  authorization_rows integer NOT NULL DEFAULT 0 CHECK (authorization_rows >= 0),
  subject_rows integer NOT NULL DEFAULT 0 CHECK (subject_rows >= 0),
  access_rows integer NOT NULL DEFAULT 0 CHECK (access_rows >= 0),
  executed boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE evidence_private.processing_scope_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_private.processing_scope_contracts FORCE ROW LEVEL SECURITY;
ALTER TABLE evidence_private.governance_gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_private.governance_gates FORCE ROW LEVEL SECURITY;
ALTER TABLE evidence_derived.source_activation_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_derived.source_activation_contracts FORCE ROW LEVEL SECURITY;
ALTER TABLE evidence_private.lifecycle_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_private.lifecycle_audit FORCE ROW LEVEL SECURITY;

REVOKE ALL ON evidence_private.processing_scope_contracts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON evidence_private.governance_gates FROM PUBLIC, anon, authenticated;
REVOKE ALL ON evidence_derived.source_activation_contracts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON evidence_private.lifecycle_audit FROM PUBLIC, anon, authenticated;
GRANT ALL ON evidence_private.processing_scope_contracts TO service_role;
GRANT ALL ON evidence_private.governance_gates TO service_role;
GRANT ALL ON evidence_derived.source_activation_contracts TO service_role;
GRANT ALL ON evidence_private.lifecycle_audit TO service_role;

CREATE OR REPLACE FUNCTION evidence_private.assert_protocol_activation_ready_v1_4()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, evidence_private, evidence_derived
AS $$
DECLARE pending_count integer; source_pending integer; target_scope evidence_private.processing_scope_contracts%ROWTYPE;
BEGIN
  IF NEW.status = 'active' AND OLD.status IS DISTINCT FROM 'active' THEN
    SELECT * INTO target_scope FROM evidence_private.processing_scope_contracts
    WHERE protocol_version = NEW.protocol_version;
    SELECT count(*)::integer INTO pending_count
    FROM evidence_private.governance_gates
    WHERE protocol_version = NEW.protocol_version
      AND (status <> 'approved' OR approval_expires_at IS NOT NULL AND approval_expires_at <= now());
    SELECT count(*)::integer INTO source_pending
    FROM evidence_derived.source_activation_contracts
    WHERE protocol_version = NEW.protocol_version
      AND activation_status IN ('mapping_required','blocked');
    IF target_scope.protocol_version IS NULL
      OR target_scope.compatibility_assessment <> 'approved'
      OR NEW.required_consent_version <> target_scope.candidate_consent_version
      OR NEW.retention_policy <> 'earliest_of_withdrawal_account_deletion_purpose_end_or_365_days'
      OR pending_count <> 0
      OR source_pending <> 0 THEN
      RAISE EXCEPTION 'evidence_v1_4_block_9_incomplete';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_evidence_v1_4_activation
BEFORE UPDATE OF status ON evidence_derived.analysis_protocols
FOR EACH ROW EXECUTE FUNCTION evidence_private.assert_protocol_activation_ready_v1_4();

CREATE OR REPLACE FUNCTION evidence_private.get_activation_readiness_v1_4()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, evidence_private, evidence_derived
AS $$
  SELECT jsonb_build_object(
    'protocol_version', protocol.protocol_version,
    'protocol_status', protocol.status,
    'compatibility_assessment', scope.compatibility_assessment,
    'candidate_consent_version', scope.candidate_consent_version,
    'approved_gates', count(*) FILTER (WHERE gate.status = 'approved'),
    'required_gates', count(*),
    'pending_gate_keys', COALESCE(jsonb_agg(gate.gate_key ORDER BY gate.gate_key)
      FILTER (WHERE gate.status <> 'approved'), '[]'::jsonb),
    'unmapped_source_families', COALESCE((
      SELECT jsonb_agg(source.source_family ORDER BY source.source_family)
      FROM evidence_derived.source_activation_contracts source
      WHERE source.protocol_version = protocol.protocol_version
        AND source.activation_status IN ('mapping_required','blocked')
    ), '[]'::jsonb),
    'ready', scope.compatibility_assessment = 'approved'
      AND bool_and(gate.status = 'approved')
      AND NOT EXISTS (
        SELECT 1 FROM evidence_derived.source_activation_contracts source
        WHERE source.protocol_version = protocol.protocol_version
          AND source.activation_status IN ('mapping_required','blocked')
      )
  )
  FROM evidence_derived.analysis_protocols protocol
  JOIN evidence_private.processing_scope_contracts scope USING (protocol_version)
  JOIN evidence_private.governance_gates gate USING (protocol_version)
  WHERE protocol.protocol_version = 'longitudinal-evidence-v1.4-draft-2026-08'
  GROUP BY protocol.protocol_version, protocol.status, scope.compatibility_assessment,
    scope.candidate_consent_version;
$$;

CREATE OR REPLACE FUNCTION evidence_private.erase_subject_evidence_v1_4(
  _user_id uuid,
  _reason_code text DEFAULT 'withdrawal'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, evidence_private, evidence_derived
AS $$
DECLARE target_subject uuid; measurement_count integer := 0; baseline_count integer := 0;
  authorization_count integer := 0; subject_count integer := 0;
BEGIN
  SELECT subject_ref INTO target_subject FROM evidence_private.subject_registry WHERE user_id = _user_id;
  IF target_subject IS NULL THEN
    RETURN jsonb_build_object('status','nothing_to_erase');
  END IF;
  DELETE FROM evidence_derived.measurement_values WHERE subject_ref = target_subject;
  GET DIAGNOSTICS measurement_count = ROW_COUNT;
  DELETE FROM evidence_derived.baseline_snapshots WHERE subject_ref = target_subject;
  GET DIAGNOSTICS baseline_count = ROW_COUNT;
  DELETE FROM evidence_private.authorization_receipts WHERE subject_ref = target_subject;
  GET DIAGNOSTICS authorization_count = ROW_COUNT;
  DELETE FROM evidence_private.subject_registry WHERE subject_ref = target_subject;
  GET DIAGNOSTICS subject_count = ROW_COUNT;
  INSERT INTO evidence_private.lifecycle_audit(
    event_type, reason_code, measurement_rows, baseline_rows,
    authorization_rows, subject_rows, executed
  ) VALUES (
    CASE WHEN _reason_code = 'account_deletion' THEN 'account_erasure' ELSE 'withdrawal_erasure' END,
    _reason_code, measurement_count, baseline_count, authorization_count, subject_count, true
  );
  RETURN jsonb_build_object(
    'status','erased','measurement_rows',measurement_count,'baseline_rows',baseline_count,
    'authorization_rows',authorization_count,'subject_rows',subject_count
  );
END;
$$;

CREATE OR REPLACE FUNCTION evidence_private.on_profile_contribution_withdrawal_v1_4()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, evidence_private
AS $$
BEGIN
  IF OLD.data_contribution_consent IS TRUE AND NEW.data_contribution_consent IS DISTINCT FROM TRUE THEN
    PERFORM evidence_private.erase_subject_evidence_v1_4(NEW.id, 'consent_withdrawal');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER erase_evidence_v1_4_on_contribution_withdrawal
AFTER UPDATE OF data_contribution_consent ON public.profiles
FOR EACH ROW EXECUTE FUNCTION evidence_private.on_profile_contribution_withdrawal_v1_4();

CREATE OR REPLACE FUNCTION evidence_private.purge_expired_evidence_v1_4(_execute boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, evidence_private, evidence_derived
AS $$
DECLARE cutoff timestamptz := now() - interval '365 days'; measurement_count integer; baseline_count integer;
  authorization_count integer := 0; subject_count integer := 0; access_count integer := 0;
BEGIN
  SELECT count(*)::integer INTO measurement_count FROM evidence_derived.measurement_values WHERE created_at < cutoff;
  SELECT count(*)::integer INTO baseline_count FROM evidence_derived.baseline_snapshots WHERE created_at < cutoff;
  SELECT count(*)::integer INTO access_count FROM evidence_private.access_audit WHERE created_at < cutoff;
  IF _execute THEN
    DELETE FROM evidence_derived.measurement_values WHERE created_at < cutoff;
    DELETE FROM evidence_derived.baseline_snapshots WHERE created_at < cutoff;
    DELETE FROM evidence_private.authorization_receipts receipt
    WHERE receipt.created_at < cutoff
      AND NOT EXISTS (SELECT 1 FROM evidence_derived.baseline_snapshots snapshot WHERE snapshot.authorization_receipt_id = receipt.id);
    GET DIAGNOSTICS authorization_count = ROW_COUNT;
    DELETE FROM evidence_private.subject_registry registry
    WHERE NOT EXISTS (SELECT 1 FROM evidence_derived.measurement_values value WHERE value.subject_ref = registry.subject_ref)
      AND NOT EXISTS (SELECT 1 FROM evidence_derived.baseline_snapshots snapshot WHERE snapshot.subject_ref = registry.subject_ref)
      AND NOT EXISTS (SELECT 1 FROM evidence_private.authorization_receipts receipt WHERE receipt.subject_ref = registry.subject_ref);
    GET DIAGNOSTICS subject_count = ROW_COUNT;
    DELETE FROM evidence_private.access_audit WHERE created_at < cutoff;
    GET DIAGNOSTICS access_count = ROW_COUNT;
  END IF;
  INSERT INTO evidence_private.lifecycle_audit(
    event_type, reason_code, measurement_rows, baseline_rows,
    authorization_rows, subject_rows, access_rows, executed
  ) VALUES (
    CASE WHEN _execute THEN 'retention_erasure' ELSE 'retention_dry_run' END,
    'maximum_365_days', measurement_count, baseline_count,
    authorization_count, subject_count, access_count, _execute
  );
  RETURN jsonb_build_object(
    'status',CASE WHEN _execute THEN 'erased' ELSE 'dry_run' END,
    'cutoff',cutoff,'measurement_rows',measurement_count,'baseline_rows',baseline_count,
    'authorization_rows',authorization_count,'subject_rows',subject_count,'access_rows',access_count
  );
END;
$$;

REVOKE ALL ON FUNCTION evidence_private.assert_protocol_activation_ready_v1_4() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION evidence_private.get_activation_readiness_v1_4() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION evidence_private.erase_subject_evidence_v1_4(uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION evidence_private.on_profile_contribution_withdrawal_v1_4() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION evidence_private.purge_expired_evidence_v1_4(boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION evidence_private.get_activation_readiness_v1_4() TO service_role;
GRANT EXECUTE ON FUNCTION evidence_private.erase_subject_evidence_v1_4(uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION evidence_private.purge_expired_evidence_v1_4(boolean) TO service_role;

COMMENT ON TABLE evidence_private.processing_scope_contracts IS
  'Machine-readable purpose and privacy boundary. Conditional compatibility is not legal approval.';
COMMENT ON TABLE evidence_private.governance_gates IS
  'Every Block 9 gate must be approved before protocol activation; browser roles have no access.';
COMMENT ON TABLE evidence_derived.source_activation_contracts IS
  'Prevents arbitrary cross-source scoring. Mapping-required sources remain disconnected.';
COMMENT ON FUNCTION evidence_private.erase_subject_evidence_v1_4(uuid,text) IS
  'Erases V1.4 pseudonymous evidence on consent withdrawal or account deletion; no raw consent proof tables are modified.';

COMMIT;
