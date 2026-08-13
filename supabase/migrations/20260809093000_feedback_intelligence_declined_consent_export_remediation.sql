-- Align declined text-consent export semantics with the byte-pinned consumer.
-- A declined receipt remains stored server-side for auditability, but its
-- pseudonymous receipt reference is not required by the analytics consumer.
-- Structured answers remain exportable; comments remain null.
BEGIN;

CREATE OR REPLACE FUNCTION feedback_analysis.export_feedback_intelligence_v0_2_internal(
  _client_id text,
  _contract_version text,
  _schema_sha256 text,
  _data_scope text DEFAULT 'synthetic'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  settings feedback_core.machine_contract_settings%ROWTYPE;
  subject_count integer := 0;
  item_count integer := 0;
  payload jsonb;
  request_id uuid := gen_random_uuid();
BEGIN
  IF _client_id !~ '^[a-z0-9][a-z0-9_.:-]{2,95}$' THEN
    RAISE EXCEPTION 'feedback_machine_client_invalid' USING ERRCODE = '22023';
  END IF;
  IF _contract_version <> '0.2.0-draft'
     OR _schema_sha256 <> 'fb1ef751bc4701a497f224bb421220e08b3387eba5c2eaec9e91e2cbf474b4e9' THEN
    RAISE EXCEPTION 'feedback_machine_contract_drift' USING ERRCODE = '22023';
  END IF;
  IF _data_scope NOT IN ('synthetic', 'production') THEN
    RAISE EXCEPTION 'feedback_machine_data_scope_invalid' USING ERRCODE = '22023';
  END IF;

  SELECT contract.* INTO settings
  FROM feedback_core.machine_contract_settings contract
  WHERE contract.contract_version = _contract_version
  FOR SHARE;
  IF settings.contract_version IS NULL
     OR settings.schema_sha256 <> _schema_sha256
     OR NOT settings.consumer_pin_ready THEN
    RAISE EXCEPTION 'feedback_machine_contract_not_ready' USING ERRCODE = '42501';
  END IF;
  IF _data_scope = 'synthetic' AND NOT settings.synthetic_export_enabled THEN
    RAISE EXCEPTION 'feedback_machine_synthetic_export_disabled' USING ERRCODE = '42501';
  END IF;
  IF _data_scope = 'production' AND NOT (
    settings.production_export_enabled
    AND settings.machine_credential_ready
    AND settings.privacy_notice_ready
    AND settings.app_store_declaration_ready
    AND settings.minor_policy_ready
    AND settings.producer_package_sha256 IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'feedback_machine_production_export_disabled' USING ERRCODE = '42501';
  END IF;

  WITH source_submissions AS MATERIALIZED (
    SELECT submission.*
    FROM feedback_core.submissions submission
    INNER JOIN public.profiles profile ON profile.id = submission.user_id
    INNER JOIN public.program_instances instance ON instance.id = submission.program_instance_id
    WHERE submission.status = 'submitted'
      AND submission.jurisdiction_at_submit = 'DE'
      AND (
        (
          _data_scope = 'synthetic'
          AND COALESCE(profile.is_test_user, false)
          AND COALESCE(instance.is_test_instance, false)
        )
        OR (
          _data_scope = 'production'
          AND NOT COALESCE(profile.is_test_user, false)
          AND NOT COALESCE(instance.is_test_instance, false)
        )
      )
  )
  SELECT COUNT(DISTINCT source.subject_reference)::integer
  INTO subject_count
  FROM source_submissions source;

  WITH source_submissions AS MATERIALIZED (
    SELECT submission.id
    FROM feedback_core.submissions submission
    INNER JOIN public.profiles profile ON profile.id = submission.user_id
    INNER JOIN public.program_instances instance ON instance.id = submission.program_instance_id
    WHERE submission.status = 'submitted'
      AND submission.jurisdiction_at_submit = 'DE'
      AND (
        (_data_scope = 'synthetic' AND profile.is_test_user AND instance.is_test_instance)
        OR (_data_scope = 'production' AND NOT profile.is_test_user AND NOT instance.is_test_instance)
      )
  )
  SELECT COUNT(*)::integer INTO item_count
  FROM source_submissions source
  INNER JOIN feedback_core.structured_answers answer ON answer.submission_id = source.id
  CROSS JOIN LATERAL jsonb_array_elements_text(answer.selected_option_ids) selected(option_id);

  IF item_count > 5000 THEN
    RAISE EXCEPTION 'feedback_machine_package_limit_exceeded' USING ERRCODE = '54000';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM feedback_core.activity_snapshots activity
    INNER JOIN feedback_core.submissions submission ON submission.id = activity.submission_id
    INNER JOIN public.profiles profile ON profile.id = submission.user_id
    INNER JOIN public.program_instances instance ON instance.id = submission.program_instance_id
    WHERE (
      (_data_scope = 'synthetic' AND profile.is_test_user AND instance.is_test_instance)
      OR (_data_scope = 'production' AND NOT profile.is_test_user AND NOT instance.is_test_instance)
    )
      AND submission.jurisdiction_at_submit = 'DE'
      AND (
        activity.transfer_pulse_count IS NOT NULL
        OR activity.resume_delay_bucket = 'SAME_DAY'
      )
  ) THEN
    RAISE EXCEPTION 'feedback_machine_activity_contract_drift' USING ERRCODE = '22023';
  END IF;

  WITH source_rows AS MATERIALIZED (
    SELECT
      submission.feedback_reference,
      submission.subject_reference,
      submission.questionnaire_version,
      submission.language,
      submission.product_version,
      submission.content_version,
      submission.program_day,
      submission.age_band_at_submit,
      campaign.campaign_reference,
      campaign.text_consent_scope,
      campaign.text_consent_version,
      campaign.text_notice_hash,
      question.question_id,
      question.construct_id,
      question.item_family_id,
      question.item_variant_id,
      question.scale_id,
      selected.option_id,
      selected.position,
      receipt.consent_reference,
      receipt.state AS receipt_state,
      receipt.granted_at,
      receipt.withdrawn_at,
      receipt.guardian_authorization_reference,
      (
        receipt.state = 'granted'
        AND receipt.granted_at IS NOT NULL
        AND receipt.withdrawn_at IS NULL
        AND (
          submission.age_band_at_submit <> 'under_16'
          OR EXISTS (
            SELECT 1
            FROM feedback_consent.guardian_text_authorizations guardian
            WHERE guardian.consent_reference = receipt.guardian_authorization_reference
              AND guardian.user_id = submission.user_id
              AND guardian.scope = receipt.scope
              AND guardian.consent_version = receipt.consent_version
              AND guardian.notice_hash = receipt.notice_hash
              AND guardian.state = 'granted'
              AND guardian.withdrawn_at IS NULL
          )
        )
      ) AS consent_valid,
      comment.raw_text,
      activity.*
    FROM feedback_core.submissions submission
    INNER JOIN public.profiles profile ON profile.id = submission.user_id
    INNER JOIN public.program_instances instance ON instance.id = submission.program_instance_id
    INNER JOIN feedback_core.campaigns campaign ON campaign.id = submission.campaign_id
    INNER JOIN feedback_core.structured_answers answer ON answer.submission_id = submission.id
    INNER JOIN feedback_core.question_definitions question ON question.id = answer.question_definition_id
    INNER JOIN feedback_core.activity_snapshots activity ON activity.submission_id = submission.id
    CROSS JOIN LATERAL jsonb_array_elements_text(answer.selected_option_ids)
      WITH ORDINALITY AS selected(option_id, position)
    LEFT JOIN feedback_consent.text_consent_receipts receipt ON receipt.submission_id = submission.id
    LEFT JOIN feedback_raw.comments comment
      ON comment.submission_id = submission.id
      AND comment.question_id = question.question_id
    WHERE submission.status = 'submitted'
      AND submission.jurisdiction_at_submit = 'DE'
      AND subject_count >= 5
      AND (
        (
          _data_scope = 'synthetic'
          AND COALESCE(profile.is_test_user, false)
          AND COALESCE(instance.is_test_instance, false)
        )
        OR (
          _data_scope = 'production'
          AND NOT COALESCE(profile.is_test_user, false)
          AND NOT COALESCE(instance.is_test_instance, false)
        )
      )
  ), export_items AS (
    SELECT jsonb_build_object(
      'feedback_reference', feedback_core.export_reference_hash('feedback', row.feedback_reference::text),
      'campaign_reference', feedback_core.export_reference_hash('campaign', row.campaign_reference),
      'subject_reference', feedback_core.export_reference_hash('subject', row.subject_reference::text),
      'questionnaire_version', row.questionnaire_version,
      'language', row.language,
      'product_version', feedback_core.export_safe_product_version(row.product_version),
      'content_version', row.content_version,
      'program_day', row.program_day,
      'question_id', row.question_id,
      'construct_id', row.construct_id,
      'item_family_id', row.item_family_id,
      'item_variant_id', row.item_variant_id,
      'scale_id', row.scale_id,
      'structured_answer', row.option_id,
      'comment', CASE
        WHEN row.consent_valid AND row.position = 1 THEN row.raw_text
        ELSE NULL
      END,
      'consent', jsonb_build_object(
        'state', CASE WHEN row.consent_valid THEN 'GRANTED' ELSE 'NOT_GRANTED' END,
        'scope', row.text_consent_scope,
        'consent_version', row.text_consent_version,
        'notice_hash', row.text_notice_hash,
        'consent_reference', CASE
          WHEN row.receipt_state IN ('granted', 'withdrawn')
            AND row.consent_reference IS NOT NULL
            THEN feedback_core.export_reference_hash('consent', row.consent_reference::text)
          ELSE NULL
        END,
        'granted_at', CASE
          WHEN row.receipt_state IN ('granted', 'withdrawn') THEN row.granted_at
          ELSE NULL
        END,
        'withdrawn_at', row.withdrawn_at,
        'valid_at_export', row.consent_valid
      ),
      'activity_snapshot', jsonb_build_object(
        'observation_window', jsonb_build_object(
          'start_program_day', row.observation_start_program_day,
          'end_program_day', row.observation_end_program_day,
          'bucket', CASE row.observation_end_program_day
            WHEN 10 THEN 'DAY_01_10'
            WHEN 24 THEN 'DAY_01_24'
            WHEN 39 THEN 'DAY_01_39'
            WHEN 55 THEN 'DAY_01_55'
          END
        ),
        'program_days_available', row.program_days_available,
        'program_days_completed', row.program_days_completed,
        'checkins_completed', row.checkins_completed,
        'journal_entries_created_count', row.journal_entries_created_count,
        'tasks_completed', row.tasks_completed,
        'transfer_pulse_count', row.transfer_pulse_count,
        'resume_delay_bucket', row.resume_delay_bucket,
        'continuation_status_bucket', row.continuation_status_bucket
      )
    ) AS item,
    row.program_day,
    row.feedback_reference,
    row.question_id,
    row.position
    FROM source_rows row
  )
  SELECT jsonb_build_object(
    'schema_version', settings.schema_version,
    'contract_status', settings.contract_status,
    'generated_at', clock_timestamp(),
    'items', COALESCE((
      SELECT jsonb_agg(item ORDER BY program_day, feedback_reference, question_id, position)
      FROM export_items
    ), '[]'::jsonb),
    'privacy', jsonb_build_object(
      'subject_reference_is_pseudonymous', true,
      'subject_reference_scope', 'FEEDBACK_ACTIVITY_PACKAGE_ONLY',
      'direct_identifiers_exported', false,
      'names_emails_teams_coaches_exported', false,
      'journal_reflection_support_text_exported', false,
      'journal_length_or_quality_exported', false,
      'raw_text_requires_consent', true,
      'raw_text_is_untrusted_data', true,
      'raw_text_persisted_by_consumer', false,
      'observational_not_causal', true,
      'minimum_cohort_size', 5,
      'small_cohorts_suppressed', true,
      'coach_access', false
    )
  ) INTO payload;

  INSERT INTO feedback_analysis.machine_access_log(
    request_id,
    client_id,
    contract_version,
    outcome,
    returned_count,
    response_checksum
  ) VALUES (
    request_id,
    _client_id,
    _contract_version,
    'success',
    jsonb_array_length(payload -> 'items'),
    feedback_core.export_reference_hash('response', payload::text)
  );

  RETURN payload;
END;
$$;


REVOKE ALL ON FUNCTION feedback_analysis.export_feedback_intelligence_v0_2_internal(text, text, text, text)
  FROM PUBLIC, anon, authenticated, service_role, mahleos_feedback_reader;

COMMENT ON FUNCTION feedback_analysis.export_feedback_intelligence_v0_2_internal(text, text, text, text) IS
  'Pinned v0.2 draft export. Declined text consent exports no receipt reference or grant timestamps; withdrawn grants retain auditable withdrawal metadata.';

COMMIT;
