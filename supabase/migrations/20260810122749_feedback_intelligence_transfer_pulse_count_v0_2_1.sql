-- Feedback Intelligence v0.2.1 transfer-pulse count contract.
--
-- Adds only the count of completed athlete transfer observations captured for
-- the same user/program instance from day 1 through the feedback checkpoint.
-- not_observed is a completed response row and therefore counts. Score, domain,
-- event type, response duration, text and direct identifiers are never selected
-- into the activity snapshot or machine payload. All activation gates are reset
-- closed and the preceding v0.2.0 assurance cannot authorize this contract.

BEGIN;

ALTER TABLE feedback_core.machine_contract_settings
  DROP CONSTRAINT IF EXISTS machine_contract_settings_contract_version_check;
ALTER TABLE feedback_core.machine_contract_settings
  DROP CONSTRAINT IF EXISTS machine_contract_settings_schema_version_check;

UPDATE feedback_core.machine_contract_settings
SET contract_version = '0.2.1-draft',
    schema_version = 'rewire-feedback-intelligence-export-v0.2.1-draft',
    contract_status = 'PRODUCER_CONFIRMED_DRAFT_NOT_ACTIVATED',
    schema_sha256 = 'e90eb3fc2ce717ef91ae35bcfcd5bc7944d3cc941faa8f071b42e934e967023d',
    consumer_pin_ready = false,
    synthetic_export_enabled = false,
    production_export_enabled = false,
    machine_credential_ready = false,
    privacy_notice_ready = false,
    app_store_declaration_ready = false,
    minor_policy_ready = false,
    producer_package_sha256 = NULL,
    updated_at = clock_timestamp()
WHERE contract_version = '0.2.0-draft';

ALTER TABLE feedback_core.machine_contract_settings
  ADD CONSTRAINT machine_contract_settings_contract_version_check
  CHECK (contract_version = '0.2.1-draft');
ALTER TABLE feedback_core.machine_contract_settings
  ADD CONSTRAINT machine_contract_settings_schema_version_check
  CHECK (schema_version = 'rewire-feedback-intelligence-export-v0.2.1-draft');

ALTER TABLE feedback_core.activity_snapshots
  DROP CONSTRAINT IF EXISTS activity_snapshots_source_contract_version_check;
ALTER TABLE feedback_core.activity_snapshots
  ADD CONSTRAINT activity_snapshots_source_contract_version_check
  CHECK (source_contract_version IN (
    'feedback-activity-counts-v1.0.0',
    'feedback-activity-counts-v1.1.0'
  ));

ALTER TABLE feedback_core.activity_snapshots
  DROP CONSTRAINT IF EXISTS activity_snapshots_transfer_pulse_count_check;
ALTER TABLE feedback_core.activity_snapshots
  ADD CONSTRAINT activity_snapshots_transfer_pulse_count_check
  CHECK (
    transfer_pulse_count IS NULL
    OR (
      transfer_pulse_count >= 0
      AND transfer_pulse_count <= CASE observation_end_program_day
        WHEN 10 THEN 2
        WHEN 24 THEN 6
        WHEN 39 THEN 11
        WHEN 55 THEN 15
      END
    )
  );

UPDATE feedback_core.activity_snapshots snapshot
SET transfer_pulse_count = (
      SELECT COUNT(*)::smallint
      FROM public.athlete_transfer_observations observation
      INNER JOIN feedback_core.submissions source_submission
        ON source_submission.id = snapshot.submission_id
      WHERE observation.user_id = source_submission.user_id
        AND observation.program_instance_id = source_submission.program_instance_id
        AND observation.day_number BETWEEN 1 AND snapshot.observation_end_program_day
    ),
    source_contract_version = 'feedback-activity-counts-v1.1.0';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM feedback_core.activity_snapshots snapshot
    WHERE snapshot.transfer_pulse_count IS NULL
       OR snapshot.transfer_pulse_count > CASE snapshot.observation_end_program_day
         WHEN 10 THEN 2
         WHEN 24 THEN 6
         WHEN 39 THEN 11
         WHEN 55 THEN 15
       END
  ) THEN
    RAISE EXCEPTION 'feedback_activity_transfer_count_invalid';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION feedback_core.capture_transfer_pulse_count_on_submit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  completed_transfer_count integer := 0;
  checkpoint_maximum integer := 0;
BEGIN
  IF OLD.status <> 'draft' OR NEW.status <> 'submitted' THEN
    RETURN NEW;
  END IF;

  checkpoint_maximum := CASE NEW.program_day
    WHEN 10 THEN 2
    WHEN 24 THEN 6
    WHEN 39 THEN 11
    WHEN 55 THEN 15
    ELSE NULL
  END;

  IF checkpoint_maximum IS NULL THEN
    RAISE EXCEPTION 'feedback_activity_checkpoint_invalid' USING ERRCODE = '22023';
  END IF;

  SELECT COUNT(*)::integer
  INTO completed_transfer_count
  FROM public.athlete_transfer_observations observation
  WHERE observation.user_id = NEW.user_id
    AND observation.program_instance_id = NEW.program_instance_id
    AND observation.day_number BETWEEN 1 AND NEW.program_day;

  IF completed_transfer_count > checkpoint_maximum THEN
    RAISE EXCEPTION 'feedback_activity_transfer_count_invalid' USING ERRCODE = '22023';
  END IF;

  UPDATE feedback_core.activity_snapshots snapshot
  SET transfer_pulse_count = completed_transfer_count,
      source_contract_version = 'feedback-activity-counts-v1.1.0'
  WHERE snapshot.submission_id = NEW.id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'feedback_activity_snapshot_missing' USING ERRCODE = '55000';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS feedback_capture_transfer_pulse_count_on_submit
  ON feedback_core.submissions;
CREATE TRIGGER feedback_capture_transfer_pulse_count_on_submit
AFTER UPDATE OF status ON feedback_core.submissions
FOR EACH ROW
WHEN (OLD.status = 'draft' AND NEW.status = 'submitted')
EXECUTE FUNCTION feedback_core.capture_transfer_pulse_count_on_submit();

REVOKE ALL ON FUNCTION feedback_core.capture_transfer_pulse_count_on_submit()
  FROM PUBLIC, anon, authenticated, service_role, mahleos_feedback_reader;

COMMENT ON FUNCTION feedback_core.capture_transfer_pulse_count_on_submit() IS
  'Counts completed athlete_transfer_observations for the same user/program instance through the feedback checkpoint. not_observed counts; scores and text are never selected.';
COMMENT ON COLUMN feedback_core.activity_snapshots.transfer_pulse_count IS
  'Count-only completed transfer observations through the checkpoint. Includes not_observed; excludes score, domain, event type, duration and text.';

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
  IF _contract_version <> '0.2.1-draft'
     OR _schema_sha256 <> 'e90eb3fc2ce717ef91ae35bcfcd5bc7944d3cc941faa8f071b42e934e967023d' THEN
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
        activity.transfer_pulse_count IS NULL
        OR activity.source_contract_version <> 'feedback-activity-counts-v1.1.0'
        OR activity.transfer_pulse_count > CASE activity.observation_end_program_day
          WHEN 10 THEN 2
          WHEN 24 THEN 6
          WHEN 39 THEN 11
          WHEN 55 THEN 15
        END
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
  'Pinned v0.2.1 draft export with count-only transfer pulse activity. Declined text consent exports no receipt reference or grant timestamps; withdrawn grants retain auditable withdrawal metadata.';



CREATE OR REPLACE FUNCTION public.read_feedback_intelligence_v0_2_draft(
  _client_id text,
  _contract_version text,
  _schema_sha256 text,
  _data_scope text DEFAULT 'synthetic'
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
  request_id_text text := pg_catalog.current_setting(
    'request.mahleos_feedback_request_id', true
  );
  nonce text := pg_catalog.current_setting('request.mahleos_feedback_nonce', true);
  issued_at_text text := pg_catalog.current_setting(
    'request.mahleos_feedback_issued_at', true
  );
  gateway_request_id uuid;
  gateway_issued_at timestamptz;
  gateway_nonce_sha256 text;
  recent_requests integer := 0;
  payload jsonb;
  upstream_error text;
  gateway_error text;
  gateway_outcome text;
BEGIN
  IF caller_role IS DISTINCT FROM 'mahleos_feedback_reader' THEN
    RETURN jsonb_build_object('_gateway_error', 'access_denied');
  END IF;

  IF _client_id <> 'mahles-jarvis-feedback-intelligence'
     OR _contract_version <> '0.2.1-draft'
     OR _schema_sha256 <> 'e90eb3fc2ce717ef91ae35bcfcd5bc7944d3cc941faa8f071b42e934e967023d'
     OR _data_scope <> 'synthetic' THEN
    RETURN jsonb_build_object(
      '_gateway_error',
      CASE WHEN _data_scope = 'production'
        THEN 'production_scope_blocked'
        ELSE 'contract_drift'
      END
    );
  END IF;

  IF request_id_text IS NULL
     OR request_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
     OR nonce IS NULL
     OR nonce !~ '^[a-f0-9]{64}$'
     OR issued_at_text IS NULL THEN
    RETURN jsonb_build_object('_gateway_error', 'invalid_replay_headers');
  END IF;

  gateway_request_id := request_id_text::uuid;
  BEGIN
    gateway_issued_at := issued_at_text::timestamptz;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('_gateway_error', 'invalid_replay_headers');
  END;

  gateway_nonce_sha256 := encode(
    extensions.digest(convert_to(nonce, 'UTF8'), 'sha256'),
    'hex'
  );

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('feedback-gateway:' || _client_id, 0)
  );

  SELECT COUNT(*)::integer
  INTO recent_requests
  FROM feedback_analysis.machine_gateway_access_log recent
  WHERE recent.client_id = _client_id
    AND recent.outcome <> 'rate_limited'
    AND recent.recorded_at >= pg_catalog.clock_timestamp() - interval '1 minute';

  IF recent_requests >= 12 THEN
    INSERT INTO feedback_analysis.machine_gateway_access_log(
      request_id, client_id, outcome
    )
    SELECT gateway_request_id, _client_id, 'rate_limited'
    WHERE NOT EXISTS (
      SELECT 1
      FROM feedback_analysis.machine_gateway_access_log limited
      WHERE limited.client_id = _client_id
        AND limited.outcome = 'rate_limited'
        AND limited.recorded_at >= pg_catalog.clock_timestamp() - interval '1 minute'
    )
    ON CONFLICT (request_id, outcome) DO NOTHING;
    RETURN jsonb_build_object('_gateway_error', 'rate_limited');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM feedback_analysis.machine_gateway_nonces existing
    WHERE existing.request_id = gateway_request_id
       OR existing.nonce_sha256 = gateway_nonce_sha256
  ) THEN
    INSERT INTO feedback_analysis.machine_gateway_access_log(
      request_id, client_id, outcome
    ) VALUES (gateway_request_id, _client_id, 'replay_blocked')
    ON CONFLICT (request_id, outcome) DO NOTHING;
    RETURN jsonb_build_object('_gateway_error', 'replay_detected');
  END IF;

  INSERT INTO feedback_analysis.machine_gateway_nonces(
    request_id, nonce_sha256, client_id, issued_at
  ) VALUES (gateway_request_id, gateway_nonce_sha256, _client_id, gateway_issued_at);

  IF gateway_issued_at < pg_catalog.clock_timestamp() - interval '5 minutes'
     OR gateway_issued_at > pg_catalog.clock_timestamp() + interval '1 minute' THEN
    INSERT INTO feedback_analysis.machine_gateway_access_log(
      request_id, client_id, outcome
    ) VALUES (gateway_request_id, _client_id, 'stale_request');
    RETURN jsonb_build_object('_gateway_error', 'stale_request');
  END IF;

  BEGIN
    payload := feedback_analysis.export_feedback_intelligence_v0_2_internal(
      _client_id,
      _contract_version,
      _schema_sha256,
      _data_scope
    );
  EXCEPTION WHEN OTHERS THEN
    upstream_error := SQLERRM;
    gateway_error := CASE upstream_error
      WHEN 'feedback_machine_contract_drift' THEN 'contract_drift'
      WHEN 'feedback_machine_contract_not_ready' THEN 'machine_gate_closed'
      WHEN 'feedback_machine_synthetic_export_disabled' THEN 'machine_gate_closed'
      WHEN 'feedback_machine_production_export_disabled' THEN 'production_scope_blocked'
      ELSE 'upstream_unavailable'
    END;
    gateway_outcome := CASE gateway_error
      WHEN 'contract_drift' THEN 'contract_drift'
      WHEN 'machine_gate_closed' THEN 'machine_gate_closed'
      WHEN 'production_scope_blocked' THEN 'production_scope_blocked'
      ELSE 'upstream_unavailable'
    END;
    INSERT INTO feedback_analysis.machine_gateway_access_log(
      request_id, client_id, outcome
    ) VALUES (gateway_request_id, _client_id, gateway_outcome);
    RETURN jsonb_build_object('_gateway_error', gateway_error);
  END;

  INSERT INTO feedback_analysis.machine_gateway_access_log(
    request_id, client_id, outcome
  ) VALUES (gateway_request_id, _client_id, 'success');
  RETURN payload;
END;
$$;

REVOKE ALL ON FUNCTION public.read_feedback_intelligence_v0_2_draft(text, text, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.read_feedback_intelligence_v0_2_draft(text, text, text, text)
  TO mahleos_feedback_reader;

COMMENT ON ROLE mahleos_feedback_reader IS
  'Inactive Feedback Intelligence synthetic-Staging reader. No password is provisioned by repository migrations.';
COMMENT ON FUNCTION public.read_feedback_intelligence_v0_2_draft(text, text, text, text) IS
  'Synthetic-DE-only v0.2.1 gateway wrapper. Requires dedicated reader role plus request-id, nonce and issued-at session guards; Production is blocked.';

COMMIT;
