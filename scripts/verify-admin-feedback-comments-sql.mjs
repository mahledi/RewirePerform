import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const migration = readFileSync(
  resolve("supabase/migrations/20260814141647_admin_feedback_comment_review_v1_1.sql"),
  "utf8",
);

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const expectFailure = async (task, expectedMessage) => {
  try {
    await task();
  } catch (error) {
    assert(
      String(error).toLowerCase().includes(expectedMessage.toLowerCase()),
      `Expected ${expectedMessage}, received ${String(error)}`,
    );
    return;
  }
  throw new Error(`Expected failure containing ${expectedMessage}`);
};

const ids = {
  admin: "00000000-0000-4000-8000-000000000001",
  athlete: "00000000-0000-4000-8000-000000000002",
  instance: "10000000-0000-4000-8000-000000000002",
  campaign: "20000000-0000-4000-8000-000000000010",
  question: "30000000-0000-4000-8000-000000000010",
  submission: "40000000-0000-4000-8000-000000000010",
  receipt: "50000000-0000-4000-8000-000000000010",
  guardian: "60000000-0000-4000-8000-000000000010",
  answer: "70000000-0000-4000-8000-000000000010",
  comment: "80000000-0000-4000-8000-000000000010",
};

try {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    CREATE ROLE mahleos_feedback_reader;
    CREATE SCHEMA auth;
    CREATE SCHEMA feedback_core;
    CREATE SCHEMA feedback_consent;
    CREATE SCHEMA feedback_raw;
    CREATE SCHEMA feedback_analysis;

    CREATE TYPE public.app_role AS ENUM ('athlete', 'coach', 'admin');
    CREATE FUNCTION auth.uid()
    RETURNS uuid
    LANGUAGE sql
    STABLE
    SET search_path = ''
    AS $$
      SELECT NULLIF(pg_catalog.current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
    RETURNS boolean
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = ''
    AS $$
      SELECT _user_id = auth.uid()
        AND pg_catalog.current_setting('request.jwt.claim.role', true) = _role::text
    $$;

    CREATE TABLE public.profiles(
      id uuid PRIMARY KEY,
      is_test_user boolean NOT NULL DEFAULT false
    );
    CREATE TABLE public.program_instances(
      id uuid PRIMARY KEY,
      user_id uuid NOT NULL,
      status text NOT NULL DEFAULT 'active',
      is_test_instance boolean NOT NULL DEFAULT false
    );
    CREATE TABLE feedback_core.campaigns(
      id uuid PRIMARY KEY,
      campaign_reference text NOT NULL,
      questionnaire_version text NOT NULL,
      questionnaire_manifest_hash text NOT NULL,
      content_version text NOT NULL,
      checkpoint_day integer NOT NULL,
      text_consent_scope text NOT NULL,
      text_consent_version text NOT NULL,
      text_notice_hash text NOT NULL
    );
    CREATE TABLE feedback_core.submissions(
      id uuid PRIMARY KEY,
      user_id uuid NOT NULL,
      program_instance_id uuid NOT NULL,
      campaign_id uuid NOT NULL,
      subject_reference uuid NOT NULL,
      status text NOT NULL,
      submitted_at timestamptz,
      jurisdiction_at_submit text NOT NULL,
      age_band_at_submit text NOT NULL,
      program_day integer NOT NULL,
      questionnaire_version text NOT NULL,
      content_version text NOT NULL
    );
    CREATE TABLE feedback_core.question_definitions(
      id uuid PRIMARY KEY,
      campaign_id uuid NOT NULL,
      question_id text NOT NULL,
      optional_comment boolean NOT NULL
    );
    CREATE TABLE feedback_core.structured_answers(
      id uuid PRIMARY KEY,
      submission_id uuid NOT NULL,
      question_definition_id uuid NOT NULL,
      selected_option_ids jsonb NOT NULL
    );
    CREATE TABLE feedback_core.activity_snapshots(
      submission_id uuid PRIMARY KEY,
      program_days_available integer NOT NULL,
      program_days_completed integer NOT NULL,
      checkins_completed integer NOT NULL,
      journal_entries_created_count integer NOT NULL,
      tasks_completed integer NOT NULL,
      transfer_pulse_count integer,
      resume_delay_bucket text NOT NULL,
      continuation_status_bucket text NOT NULL
    );
    CREATE TABLE feedback_consent.text_consent_receipts(
      id uuid PRIMARY KEY,
      submission_id uuid NOT NULL,
      user_id uuid NOT NULL,
      state text NOT NULL,
      granted_at timestamptz,
      withdrawn_at timestamptz,
      scope text NOT NULL,
      consent_version text NOT NULL,
      notice_hash text NOT NULL,
      minor_gate_state text NOT NULL,
      guardian_authorization_reference uuid
    );
    CREATE TABLE feedback_consent.guardian_text_authorizations(
      consent_reference uuid PRIMARY KEY,
      user_id uuid NOT NULL,
      scope text NOT NULL,
      consent_version text NOT NULL,
      notice_hash text NOT NULL,
      state text NOT NULL,
      granted_at timestamptz,
      withdrawn_at timestamptz
    );
    CREATE TABLE feedback_raw.comments(
      id uuid PRIMARY KEY,
      submission_id uuid NOT NULL,
      consent_receipt_id uuid NOT NULL,
      question_id text NOT NULL,
      raw_text text NOT NULL,
      submitted_at timestamptz NOT NULL
    );
  `);

  await db.exec(migration);

  const privileges = await db.query(`
    SELECT
      has_function_privilege(
        'authenticated',
        'public.get_admin_feedback_comment_page(text,text,integer,timestamptz,uuid,integer)',
        'EXECUTE'
      ) AS authenticated_execute,
      has_function_privilege(
        'anon',
        'public.get_admin_feedback_comment_page(text,text,integer,timestamptz,uuid,integer)',
        'EXECUTE'
      ) AS anon_execute,
      has_function_privilege(
        'service_role',
        'public.get_admin_feedback_comment_page(text,text,integer,timestamptz,uuid,integer)',
        'EXECUTE'
      ) AS service_execute,
      has_function_privilege(
        'mahleos_feedback_reader',
        'public.get_admin_feedback_comment_page(text,text,integer,timestamptz,uuid,integer)',
        'EXECUTE'
      ) AS reader_execute,
      has_table_privilege(
        'authenticated',
        'feedback_analysis.admin_comment_access_log',
        'SELECT'
      ) AS authenticated_log_select
  `);
  assert(privileges.rows[0].authenticated_execute === true, "authenticated must reach the guarded RPC");
  assert(privileges.rows[0].anon_execute === false, "anon must not execute the admin RPC");
  assert(privileges.rows[0].service_execute === false, "service_role must not execute the admin RPC");
  assert(privileges.rows[0].reader_execute === false, "Jarvis reader must not execute the admin RPC");
  assert(privileges.rows[0].authenticated_log_select === false, "authenticated must not read the audit table");

  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [ids.admin]);
  await db.query("SELECT set_config('request.jwt.claim.role', 'athlete', false)");
  await db.exec("SET ROLE authenticated");
  await expectFailure(
    () => db.query(`SELECT public.get_admin_feedback_comment_page(
      'pilot_product_feedback_review', 'production', NULL, NULL, NULL, 20
    )`),
    "admin_role_required",
  );
  await db.exec("RESET ROLE");

  await db.exec(`
    INSERT INTO public.profiles(id) VALUES ('${ids.athlete}');
    INSERT INTO public.program_instances(id, user_id) VALUES ('${ids.instance}', '${ids.athlete}');
    INSERT INTO feedback_core.campaigns VALUES (
      '${ids.campaign}', 'feedback-day-10-v1', 'feedback-d10-v1.1.2',
      'manifest-d10-v1-1-2', 'feedback-intelligence-content-v1.1.2', 10,
      'product-improvement-individual-text-ai-analysis-v1',
      'feedback-text-consent-v1.1.0-draft', 'notice-hash-v1'
    );
    INSERT INTO feedback_core.submissions VALUES (
      '${ids.submission}', '${ids.athlete}', '${ids.instance}', '${ids.campaign}',
      '90000000-0000-4000-8000-000000000010', 'submitted', now(), 'DE',
      'under_16', 10, 'feedback-d10-v1.1.2', 'feedback-intelligence-content-v1.1.2'
    );
    INSERT INTO feedback_core.question_definitions VALUES (
      '${ids.question}', '${ids.campaign}', 'd10_content_clarity', true
    );
    INSERT INTO feedback_core.structured_answers VALUES (
      '${ids.answer}', '${ids.submission}', '${ids.question}', '["2"]'
    );
    INSERT INTO feedback_consent.guardian_text_authorizations VALUES (
      '${ids.guardian}', '${ids.athlete}',
      'product-improvement-individual-text-ai-analysis-v1',
      'feedback-text-consent-v1.1.0-draft', 'notice-hash-v1',
      'granted', now(), NULL
    );
    INSERT INTO feedback_consent.text_consent_receipts VALUES (
      '${ids.receipt}', '${ids.submission}', '${ids.athlete}', 'granted', now(), NULL,
      'product-improvement-individual-text-ai-analysis-v1',
      'feedback-text-consent-v1.1.0-draft', 'notice-hash-v1',
      'guardian_scope_granted', '${ids.guardian}'
    );
    INSERT INTO feedback_raw.comments VALUES (
      '${ids.comment}', '${ids.submission}', '${ids.receipt}', 'd10_content_clarity',
      'Die Sprache ist klar. Nach dem Training ist die Textmenge manchmal zu hoch.', now()
    );
    INSERT INTO feedback_core.activity_snapshots VALUES (
      '${ids.submission}', 10, 9, 8, 4, 7, 2, 'DAYS_1_3', 'ACTIVE_OR_COMPLETED'
    );
  `);

  await db.query("SELECT set_config('request.jwt.claim.role', 'admin', false)");
  await db.exec("SET ROLE authenticated");
  await expectFailure(
    () => db.query(`SELECT public.get_admin_feedback_comment_page(
      'general_admin_browsing', 'production', NULL, NULL, NULL, 20
    )`),
    "feedback_admin_review_purpose_invalid",
  );
  await expectFailure(
    () => db.query(`SELECT public.get_admin_feedback_comment_page(
      'pilot_product_feedback_review', 'production', NULL, now(), NULL, 20
    )`),
    "feedback_admin_cursor_incomplete",
  );
  const grantedPage = await db.query(`SELECT public.get_admin_feedback_comment_page(
    'pilot_product_feedback_review', 'production', 10, NULL, NULL, 20
  ) AS result`);
  const item = grantedPage.rows[0].result.items[0];
  assert(grantedPage.rows[0].result.items.length === 1, "valid under-16 feedback must be visible");
  assert(item.comment.includes("Textmenge"), "voluntary questionnaire comment must be returned");
  assert(item.authorization.guardian_required === true, "under-16 Guardian state must be explicit");
  assert(item.activity_snapshot.journal_entries_created_count === 4, "journal count may be returned");
  assert(item.user_id === undefined && item.team_id === undefined, "direct identities must be absent");
  assert(grantedPage.rows[0].result.privacy.journal_or_reflection_text_included === false, "journal text must be excluded");
  assert(grantedPage.rows[0].result.privacy.jarvis_raw_text_access_included === false, "Admin RPC must not open Jarvis");
  await expectFailure(
    () => db.query("SELECT * FROM feedback_analysis.admin_comment_access_log"),
    "permission denied",
  );
  await db.exec("RESET ROLE");

  const audit = await db.query(`
    SELECT purpose, returned_count FROM feedback_analysis.admin_comment_access_log
  `);
  assert(audit.rows.length === 1 && audit.rows[0].returned_count === 1, "metadata-only read audit is required");
  const auditColumns = await db.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'feedback_analysis' AND table_name = 'admin_comment_access_log'
  `);
  const auditColumnNames = new Set(auditColumns.rows.map(({ column_name }) => column_name));
  assert(!auditColumnNames.has("raw_text") && !auditColumnNames.has("subject_reference"), "audit must not store text or subject");
  await expectFailure(
    () => db.exec("DELETE FROM feedback_analysis.admin_comment_access_log"),
    "feedback_admin_comment_access_log_is_append_only",
  );

  await db.exec(`
    UPDATE feedback_consent.guardian_text_authorizations
    SET state = 'withdrawn', withdrawn_at = now()
    WHERE consent_reference = '${ids.guardian}'
  `);
  await db.exec("SET ROLE authenticated");
  const withdrawnPage = await db.query(`SELECT public.get_admin_feedback_comment_page(
    'pilot_product_feedback_review', 'production', 10, NULL, NULL, 20
  ) AS result`);
  assert(withdrawnPage.rows[0].result.items.length === 0, "Guardian withdrawal must hide raw text at read time");
  await db.exec("RESET ROLE");

  console.log("Admin Feedback Intelligence comment SQL checks passed.");
} finally {
  await db.close();
}
