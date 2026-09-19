-- V1.2 structured-only Jarvis producer contract.
--
-- This adapter reuses the owner-only reviewed v0.2.1 producer internally, but
-- exposes a new narrow contract to the dedicated machine reader. Before any
-- row can leave Postgres it re-checks current evidence authorization (including
-- Guardian/athlete authorization for minors), suppresses every output group
-- with fewer than five distinct subjects, and reconstructs the payload from an
-- allow-list. Raw text, consent receipts and operational identifiers therefore
-- never cross the reader boundary.
--
-- Applying this migration does not create a credential, enable a runtime gate
-- or read application data.

BEGIN;

CREATE OR REPLACE FUNCTION feedback_machine_production.read_feedback_intelligence_production_structured_v1_2(
  _client_id text,
  _contract_version text,
  _schema_sha256 text,
  _data_scope text DEFAULT 'production'
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_role text := COALESCE(
    NULLIF(pg_catalog.current_setting('role', true), 'none'),
    session_user
  );
  upstream jsonb;
  structured_items jsonb;
BEGIN
  IF caller_role IS DISTINCT FROM 'mahleos_feedback_production_reader' THEN
    RETURN pg_catalog.jsonb_build_object('_gateway_error', 'access_denied');
  END IF;
  IF _client_id IS DISTINCT FROM 'mahles-jarvis-feedback-intelligence-production'
     OR _contract_version IS DISTINCT FROM '1.2.0-structured-only-draft'
     OR _schema_sha256 IS DISTINCT FROM '1aa3b1ed3a56722c0b496b8dfc4a661bc364df4cec3bb838f41715e7b8570cff'
     OR _data_scope IS DISTINCT FROM 'production' THEN
    RETURN pg_catalog.jsonb_build_object('_gateway_error', 'contract_drift');
  END IF;

  upstream := feedback_machine_production.read_feedback_intelligence_production_v0_2_raw_internal(
    _client_id,
    '0.2.1-draft',
    'e90eb3fc2ce717ef91ae35bcfcd5bc7944d3cc941faa8f071b42e934e967023d',
    'production'
  );

  IF upstream ? '_gateway_error' THEN
    RETURN upstream;
  END IF;
  IF upstream ->> 'schema_version' IS DISTINCT FROM 'rewire-feedback-intelligence-export-v0.2.1-draft'
     OR pg_catalog.jsonb_typeof(upstream -> 'items') IS DISTINCT FROM 'array' THEN
    RETURN pg_catalog.jsonb_build_object('_gateway_error', 'contract_drift');
  END IF;

  WITH eligible_subjects AS MATERIALIZED (
    SELECT DISTINCT
      feedback_core.export_reference_hash('subject', submission.subject_reference::text)
        AS subject_reference
    FROM feedback_core.submissions submission
    INNER JOIN public.profiles profile ON profile.id = submission.user_id
    INNER JOIN public.program_instances instance ON instance.id = submission.program_instance_id
    WHERE submission.status = 'submitted'
      AND submission.jurisdiction_at_submit = 'DE'
      AND NOT COALESCE(profile.is_test_user, false)
      AND NOT COALESCE(instance.is_test_instance, false)
      AND public.evidence_eligibility_reason(
        instance.id,
        '56d-transfer-v2-2026-07'
      ) IN ('eligible', 'eligible_minor')
  ), source_items AS MATERIALIZED (
    SELECT item.value, item.ordinality
    FROM pg_catalog.jsonb_array_elements(upstream -> 'items')
      WITH ORDINALITY AS item(value, ordinality)
    INNER JOIN eligible_subjects eligible
      ON eligible.subject_reference = item.value ->> 'subject_reference'
  ), allowed_groups AS MATERIALIZED (
    SELECT
      value ->> 'questionnaire_version' AS questionnaire_version,
      value ->> 'language' AS language,
      value ->> 'product_version' AS product_version,
      value ->> 'content_version' AS content_version,
      value ->> 'program_day' AS program_day,
      value ->> 'question_id' AS question_id,
      value ->> 'construct_id' AS construct_id,
      value ->> 'item_family_id' AS item_family_id,
      value ->> 'item_variant_id' AS item_variant_id,
      value ->> 'scale_id' AS scale_id
    FROM source_items
    GROUP BY
      value ->> 'questionnaire_version',
      value ->> 'language',
      value ->> 'product_version',
      value ->> 'content_version',
      value ->> 'program_day',
      value ->> 'question_id',
      value ->> 'construct_id',
      value ->> 'item_family_id',
      value ->> 'item_variant_id',
      value ->> 'scale_id'
    HAVING COUNT(DISTINCT value ->> 'subject_reference') >= 5
  ), export_items AS (
    SELECT
      pg_catalog.jsonb_build_object(
        'subject_reference', source.value -> 'subject_reference',
        'questionnaire_version', source.value -> 'questionnaire_version',
        'language', source.value -> 'language',
        'product_version', source.value -> 'product_version',
        'content_version', source.value -> 'content_version',
        'program_day', source.value -> 'program_day',
        'question_id', source.value -> 'question_id',
        'construct_id', source.value -> 'construct_id',
        'item_family_id', source.value -> 'item_family_id',
        'item_variant_id', source.value -> 'item_variant_id',
        'scale_id', source.value -> 'scale_id',
        'structured_answer', source.value -> 'structured_answer',
        'activity_snapshot', source.value -> 'activity_snapshot'
      ) AS item,
      source.ordinality
    FROM source_items source
    INNER JOIN allowed_groups allowed
      ON allowed.questionnaire_version = source.value ->> 'questionnaire_version'
      AND allowed.language = source.value ->> 'language'
      AND allowed.product_version = source.value ->> 'product_version'
      AND allowed.content_version = source.value ->> 'content_version'
      AND allowed.program_day = source.value ->> 'program_day'
      AND allowed.question_id = source.value ->> 'question_id'
      AND allowed.construct_id = source.value ->> 'construct_id'
      AND allowed.item_family_id = source.value ->> 'item_family_id'
      AND allowed.item_variant_id = source.value ->> 'item_variant_id'
      AND allowed.scale_id = source.value ->> 'scale_id'
  )
  SELECT COALESCE(
    pg_catalog.jsonb_agg(item ORDER BY ordinality),
    '[]'::jsonb
  )
  INTO structured_items
  FROM export_items;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_array_elements(structured_items) item
    WHERE item ?| ARRAY[
      'comment', 'consent', 'feedback_reference', 'campaign_reference',
      'user_id', 'program_instance_id', 'team_id', 'coach_id', 'name',
      'email', 'journal_text', 'reflection_text', 'support_text'
    ]
  ) THEN
    RETURN pg_catalog.jsonb_build_object('_gateway_error', 'structured_boundary_failed');
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'schema_version', 'rewire-feedback-intelligence-structured-export-v1.2.0-draft',
    'contract_version', '1.2.0-structured-only-draft',
    'contract_status', 'PROPOSED_AWAITING_PRODUCER_CONFIRMATION',
    'generated_at', pg_catalog.clock_timestamp(),
    'items', structured_items,
    'privacy', pg_catalog.jsonb_build_object(
      'raw_text_in_contract', false,
      'text_consent_payload_in_contract', false,
      'direct_identifiers_exported', false,
      'journal_reflection_support_text_exported', false,
      'coach_team_data_exported', false,
      'subject_reference_handling', 'IN_MEMORY_ONLY_NEVER_OUTPUT_OR_PERSIST',
      'minimum_group_size', 5,
      'small_groups_suppressed', true,
      'model_training', false,
      'automated_individual_decisions', false,
      'observational_not_causal', true
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION feedback_machine_production.read_feedback_intelligence_production_v0_2_draft(
  text, text, text, text
) FROM PUBLIC, anon, authenticated, service_role, mahleos_feedback_reader,
  mahleos_feedback_production_reader;
REVOKE ALL ON FUNCTION feedback_machine_production.read_feedback_intelligence_production_structured_v1_2(
  text, text, text, text
) FROM PUBLIC, anon, authenticated, service_role, mahleos_feedback_reader;
GRANT EXECUTE ON FUNCTION feedback_machine_production.read_feedback_intelligence_production_structured_v1_2(
  text, text, text, text
) TO mahleos_feedback_production_reader;

COMMENT ON FUNCTION feedback_machine_production.read_feedback_intelligence_production_structured_v1_2(
  text, text, text, text
) IS
  'V1.2 structured-only Jarvis producer. Re-checks current evidence authorization, suppresses output groups below five distinct subjects and reconstructs an allow-listed payload without raw text or consent receipts.';

COMMIT;
