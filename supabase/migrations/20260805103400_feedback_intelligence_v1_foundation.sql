-- Feedback Intelligence v1.1 private data foundation.
--
-- This is deliberately separate from public.feedback, which remains the
-- support/bug-report channel. All campaigns start as draft. This migration
-- does not activate athlete UX, AI processing, Jarvis access, a scheduler,
-- a secret, an Edge Function, or any Production data flow.

BEGIN;

CREATE SCHEMA IF NOT EXISTS feedback_core;
CREATE SCHEMA IF NOT EXISTS feedback_consent;
CREATE SCHEMA IF NOT EXISTS feedback_raw;
CREATE SCHEMA IF NOT EXISTS feedback_analysis;

REVOKE ALL ON SCHEMA feedback_core
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON SCHEMA feedback_consent
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON SCHEMA feedback_raw
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON SCHEMA feedback_analysis
  FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE feedback_core.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_reference text NOT NULL UNIQUE
    CHECK (campaign_reference ~ '^feedback-day-(10|24|39|55)-v[0-9]+$'),
  checkpoint_day smallint NOT NULL UNIQUE
    CHECK (checkpoint_day IN (10, 24, 39, 55)),
  phase smallint NOT NULL CHECK (phase BETWEEN 1 AND 4),
  questionnaire_version text NOT NULL UNIQUE
    CHECK (questionnaire_version ~ '^feedback-d(10|24|39|55)-v[0-9]+\.[0-9]+\.[0-9]+$'),
  content_version text NOT NULL
    CHECK (content_version ~ '^feedback-intelligence-content-v[0-9]+\.[0-9]+\.[0-9]+$'),
  language text NOT NULL DEFAULT 'de' CHECK (language = 'de'),
  questionnaire_manifest_schema_version text NOT NULL DEFAULT 'feedback-questionnaire-manifest-v1'
    CHECK (questionnaire_manifest_schema_version = 'feedback-questionnaire-manifest-v1'),
  questionnaire_manifest_hash text NOT NULL
    CHECK (questionnaire_manifest_hash ~ '^[a-f0-9]{64}$'),
  text_consent_scope text NOT NULL
    CHECK (text_consent_scope ~ '^[a-z0-9][a-z0-9_-]{7,95}$'),
  text_consent_version text NOT NULL
    CHECK (text_consent_version ~ '^[A-Za-z0-9_.:-]{8,96}$'),
  text_notice_hash text NOT NULL
    CHECK (text_notice_hash ~ '^[a-f0-9]{64}$'),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'approved', 'active', 'paused', 'retired')),
  available_from timestamptz,
  available_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (available_until IS NULL OR available_from IS NULL OR available_until > available_from),
  CHECK (status <> 'active' OR available_from IS NOT NULL)
);

CREATE TABLE feedback_core.question_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES feedback_core.campaigns(id) ON DELETE CASCADE,
  position smallint NOT NULL CHECK (position BETWEEN 1 AND 30),
  question_id text NOT NULL CHECK (question_id ~ '^d(10|24|39|55)_[a-z0-9_]{3,80}$'),
  construct_id text NOT NULL CHECK (construct_id ~ '^[a-z0-9_]{3,80}$'),
  item_family_id text NOT NULL CHECK (item_family_id ~ '^[a-z0-9_]{3,80}_v[0-9]+$'),
  item_variant_id text NOT NULL CHECK (item_variant_id ~ '^[a-z0-9_]{3,90}_v[0-9]+$'),
  scale_id text NOT NULL CHECK (scale_id ~ '^[a-z0-9_]{3,90}_v[0-9]+$'),
  question_type text NOT NULL CHECK (question_type IN ('single', 'multi')),
  option_ids text[] NOT NULL CHECK (cardinality(option_ids) BETWEEN 2 AND 12),
  exclusive_option_ids text[] NOT NULL DEFAULT '{}'::text[],
  optional_comment boolean NOT NULL DEFAULT true CHECK (optional_comment),
  visibility_question_id text,
  visibility_option_ids text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, position),
  UNIQUE (campaign_id, question_id),
  UNIQUE (item_variant_id),
  CHECK (exclusive_option_ids <@ option_ids),
  CHECK (
    (visibility_question_id IS NULL AND cardinality(visibility_option_ids) = 0)
    OR (visibility_question_id IS NOT NULL AND cardinality(visibility_option_ids) > 0)
  )
);

CREATE INDEX feedback_question_definitions_family_idx
  ON feedback_core.question_definitions(item_family_id, campaign_id);

CREATE TABLE feedback_core.subject_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_instance_id uuid NOT NULL REFERENCES public.program_instances(id) ON DELETE CASCADE,
  subject_reference uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, program_instance_id)
);

CREATE INDEX feedback_subject_links_user_idx
  ON feedback_core.subject_links(user_id, created_at DESC);

CREATE TABLE feedback_core.submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_reference uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  client_submission_id uuid NOT NULL,
  campaign_id uuid NOT NULL REFERENCES feedback_core.campaigns(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_reference uuid NOT NULL REFERENCES feedback_core.subject_links(subject_reference) ON DELETE CASCADE,
  program_instance_id uuid NOT NULL REFERENCES public.program_instances(id) ON DELETE CASCADE,
  questionnaire_version text NOT NULL,
  language text NOT NULL CHECK (language = 'de'),
  product_version text NOT NULL
    CHECK (product_version ~ '^(unknown|[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}(\+[0-9]{1,10})?)$'),
  content_version text NOT NULL,
  program_day smallint NOT NULL CHECK (program_day IN (10, 24, 39, 55)),
  jurisdiction_at_submit text NOT NULL DEFAULT 'unknown'
    CHECK (jurisdiction_at_submit IN ('DE', 'AT', 'CH', 'unknown')),
  age_band_at_submit text NOT NULL DEFAULT 'unknown'
    CHECK (age_band_at_submit IN ('under_16', 'age_16_17', 'adult', 'unknown')),
  product_authorization_basis text NOT NULL DEFAULT 'unresolved'
    CHECK (product_authorization_basis IN (
      'adult_or_not_required',
      'guardian_and_athlete_authorized',
      'athlete_authorized',
      'unresolved'
    )),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted')),
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_submission_id),
  UNIQUE (user_id, campaign_id, program_instance_id),
  CHECK ((status = 'submitted') = (submitted_at IS NOT NULL))
);

CREATE INDEX feedback_submissions_user_created_idx
  ON feedback_core.submissions(user_id, created_at DESC);
CREATE INDEX feedback_submissions_campaign_submitted_idx
  ON feedback_core.submissions(campaign_id, submitted_at DESC)
  WHERE status = 'submitted';
CREATE INDEX feedback_submissions_subject_submitted_idx
  ON feedback_core.submissions(subject_reference, submitted_at DESC)
  WHERE status = 'submitted';
CREATE INDEX feedback_submissions_program_instance_idx
  ON feedback_core.submissions(program_instance_id, program_day);

CREATE TABLE feedback_core.structured_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES feedback_core.submissions(id) ON DELETE CASCADE,
  question_definition_id uuid NOT NULL REFERENCES feedback_core.question_definitions(id) ON DELETE RESTRICT,
  selected_option_ids jsonb NOT NULL,
  answered_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (submission_id, question_definition_id),
  CHECK (jsonb_typeof(selected_option_ids) = 'array'),
  CHECK (jsonb_array_length(selected_option_ids) BETWEEN 1 AND 12)
);

CREATE INDEX feedback_structured_question_idx
  ON feedback_core.structured_answers(question_definition_id, answered_at DESC);

CREATE TABLE feedback_consent.guardian_text_authorizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_reference uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope text NOT NULL CHECK (scope ~ '^[a-z0-9][a-z0-9_-]{7,95}$'),
  consent_version text NOT NULL CHECK (consent_version ~ '^[A-Za-z0-9_.:-]{8,96}$'),
  notice_hash text NOT NULL CHECK (notice_hash ~ '^[a-f0-9]{64}$'),
  state text NOT NULL CHECK (state IN ('granted', 'declined', 'withdrawn')),
  granted_at timestamptz,
  withdrawn_at timestamptz,
  policy_reference text NOT NULL CHECK (policy_reference ~ '^[A-Za-z0-9_.:-]{8,128}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((state = 'granted') = (granted_at IS NOT NULL AND withdrawn_at IS NULL)),
  CHECK (state <> 'withdrawn' OR withdrawn_at IS NOT NULL)
);

CREATE UNIQUE INDEX feedback_guardian_active_scope_idx
  ON feedback_consent.guardian_text_authorizations(user_id, scope)
  WHERE state = 'granted' AND withdrawn_at IS NULL;

CREATE TABLE feedback_consent.text_consent_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_reference uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL UNIQUE REFERENCES feedback_core.submissions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state text NOT NULL CHECK (state IN ('granted', 'declined', 'withdrawn')),
  scope text NOT NULL CHECK (scope ~ '^[a-z0-9][a-z0-9_-]{7,95}$'),
  consent_version text NOT NULL CHECK (consent_version ~ '^[A-Za-z0-9_.:-]{8,96}$'),
  notice_hash text NOT NULL CHECK (notice_hash ~ '^[a-f0-9]{64}$'),
  granted_at timestamptz,
  withdrawn_at timestamptz,
  guardian_authorization_reference uuid,
  minor_gate_state text NOT NULL DEFAULT 'not_required'
    CHECK (minor_gate_state IN (
      'not_required',
      'guardian_scope_granted',
      'guardian_scope_missing',
      'minor_status_unresolved'
    )),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((state = 'granted') = (granted_at IS NOT NULL AND withdrawn_at IS NULL)),
  CHECK (state <> 'withdrawn' OR withdrawn_at IS NOT NULL),
  CHECK (
    minor_gate_state <> 'guardian_scope_granted'
    OR guardian_authorization_reference IS NOT NULL
  )
);

CREATE INDEX feedback_text_consent_user_created_idx
  ON feedback_consent.text_consent_receipts(user_id, created_at DESC);

CREATE TABLE feedback_consent.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submission_id uuid REFERENCES feedback_core.submissions(id) ON DELETE CASCADE,
  consent_reference uuid,
  actor_type text NOT NULL CHECK (actor_type IN ('athlete', 'guardian', 'system', 'support')),
  event_type text NOT NULL CHECK (event_type IN (
    'text_consent_granted',
    'text_consent_declined',
    'text_consent_withdrawn',
    'guardian_text_scope_granted',
    'guardian_text_scope_declined',
    'guardian_text_scope_withdrawn',
    'raw_text_deleted',
    'attributable_artifacts_deleted'
  )),
  scope text NOT NULL CHECK (scope ~ '^[a-z0-9][a-z0-9_-]{7,95}$'),
  consent_version text NOT NULL CHECK (consent_version ~ '^[A-Za-z0-9_.:-]{8,96}$'),
  notice_hash text NOT NULL CHECK (notice_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX feedback_consent_audit_user_created_idx
  ON feedback_consent.audit_events(user_id, created_at DESC);

CREATE TABLE feedback_raw.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES feedback_core.submissions(id) ON DELETE CASCADE,
  question_id text NOT NULL
    CHECK (question_id = '__closing_comment__' OR question_id ~ '^d(10|24|39|55)_[a-z0-9_]{3,80}$'),
  consent_receipt_id uuid NOT NULL REFERENCES feedback_consent.text_consent_receipts(id) ON DELETE CASCADE,
  raw_text text NOT NULL CHECK (char_length(btrim(raw_text)) BETWEEN 1 AND 1200),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (submission_id, question_id)
);

CREATE INDEX feedback_raw_consent_receipt_idx
  ON feedback_raw.comments(consent_receipt_id);

CREATE TABLE feedback_analysis.comment_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES feedback_raw.comments(id) ON DELETE CASCADE,
  artifact_kind text NOT NULL CHECK (artifact_kind IN (
    'identifier_redaction',
    'sensitive_content_quarantine',
    'product_theme',
    'product_friction',
    'product_suggestion'
  )),
  artifact_version text NOT NULL CHECK (artifact_version ~ '^[A-Za-z0-9_.:-]{3,96}$'),
  processor_contract_version text NOT NULL
    CHECK (processor_contract_version ~ '^[A-Za-z0-9_.:-]{3,96}$'),
  artifact_payload jsonb NOT NULL CHECK (jsonb_typeof(artifact_payload) = 'object'),
  model_use_allowed boolean NOT NULL DEFAULT false,
  invalidated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, artifact_kind, artifact_version)
);

CREATE INDEX feedback_analysis_comment_idx
  ON feedback_analysis.comment_artifacts(comment_id, created_at DESC);

CREATE TABLE feedback_analysis.machine_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE,
  client_id text NOT NULL CHECK (client_id ~ '^[a-z0-9_.:-]{3,96}$'),
  contract_version text NOT NULL CHECK (contract_version ~ '^[A-Za-z0-9_.:-]{3,96}$'),
  outcome text NOT NULL CHECK (outcome IN (
    'success',
    'invalid_request',
    'rate_limited',
    'contract_drift',
    'consent_blocked',
    'minor_gate_blocked'
  )),
  returned_count integer NOT NULL DEFAULT 0 CHECK (returned_count BETWEEN 0 AND 100),
  response_checksum text CHECK (response_checksum IS NULL OR response_checksum ~ '^[a-f0-9]{64}$'),
  requested_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX feedback_machine_access_client_requested_idx
  ON feedback_analysis.machine_access_log(client_id, requested_at DESC);

ALTER TABLE feedback_core.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_core.question_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_core.subject_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_core.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_core.structured_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_consent.guardian_text_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_consent.text_consent_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_consent.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_raw.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_analysis.comment_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_analysis.machine_access_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON ALL TABLES IN SCHEMA feedback_core
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL TABLES IN SCHEMA feedback_consent
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL TABLES IN SCHEMA feedback_raw
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL TABLES IN SCHEMA feedback_analysis
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA feedback_core
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA feedback_consent
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA feedback_raw
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA feedback_analysis
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON SCHEMA feedback_core IS
  'Private structured Feedback Intelligence storage. No journal or reflection text.';
COMMENT ON SCHEMA feedback_consent IS
  'Private text-consent and guardian-scope receipts, separated from structured answers and raw text.';
COMMENT ON SCHEMA feedback_raw IS
  'Private voluntary questionnaire comments only. UNTRUSTED_USER_TEXT; never instructions.';
COMMENT ON SCHEMA feedback_analysis IS
  'Private feedback-analysis artifacts and machine access audit. No second raw-text corpus.';
COMMENT ON TABLE feedback_core.campaigns IS
  'Versioned checkpoint registry. Seed rows remain draft until independent privacy, minor, App Store and rollout gates are approved.';
COMMENT ON TABLE feedback_core.question_definitions IS
  'Server-authoritative item family, variant, scale and allowed option registry. Raw prompts and labels remain in the versioned app content contract.';
COMMENT ON TABLE feedback_core.subject_links IS
  'Private per-program-instance pseudonymous linkage for feedback and allowed usage counts. A new program instance rotates the reference. user_id, program_instance_id and subject_reference must never be exported together.';
COMMENT ON TABLE feedback_raw.comments IS
  'Voluntary questionnaire comments collected only through consent-valid RPCs. Content is UNTRUSTED_USER_TEXT.';
COMMENT ON TABLE feedback_analysis.comment_artifacts IS
  'Attributable derivatives cascade with their source comment. Raw text must not be copied into artifact_payload.';

COMMIT;
