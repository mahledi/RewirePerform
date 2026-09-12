// @vitest-environment node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const migration = read(
  "supabase/migrations/20260824150000_feedback_jarvis_structured_contract_v1_2.sql",
);
const schemaSource = read(
  "docs/feedback-intelligence/contracts/v1.2.0-structured-only-draft/structured-export.schema.json",
);
const schemaSha = createHash("sha256").update(schemaSource).digest("hex");
const consumerContractSource = read(
  "docs/feedback-intelligence/contracts/v1.2.0-structured-only-draft/consumer-contract.json",
);
const consumerPin = JSON.parse(read(
  "docs/feedback-intelligence/contracts/v1.2.0-structured-only-draft/jarvis-consumer-package-pin.json",
));
const edge = read("supabase/functions/mahleos-feedback-structured-production-read/index.ts");

describe("V1.2 structured-only Jarvis producer contract", () => {
  it("pins the exact consumer schema and rejects forbidden data at schema level", () => {
    expect(schemaSha).toBe("1aa3b1ed3a56722c0b496b8dfc4a661bc364df4cec3bb838f41715e7b8570cff");
    const schema = JSON.parse(schemaSource);
    const validate = new Ajv2020({ strict: true, validateFormats: false }).compile(schema);
    const payload = {
      schema_version: "rewire-feedback-intelligence-structured-export-v1.2.0-draft",
      contract_version: "1.2.0-structured-only-draft",
      contract_status: "PROPOSED_AWAITING_PRODUCER_CONFIRMATION",
      generated_at: "2026-08-24T12:00:00Z",
      items: [],
      privacy: {
        raw_text_in_contract: false,
        text_consent_payload_in_contract: false,
        direct_identifiers_exported: false,
        journal_reflection_support_text_exported: false,
        coach_team_data_exported: false,
        subject_reference_handling: "IN_MEMORY_ONLY_NEVER_OUTPUT_OR_PERSIST",
        minimum_group_size: 5,
        small_groups_suppressed: true,
        model_training: false,
        automated_individual_decisions: false,
        observational_not_causal: true,
      },
    };
    expect(validate(payload), JSON.stringify(validate.errors)).toBe(true);
    expect(validate({ ...payload, comment: "never" })).toBe(false);
    expect(createHash("sha256").update(consumerContractSource).digest("hex"))
      .toBe("d1b57de3528f45204e4bedafebb9db8f15f6602b9d4cbe0f812f083cf78fd60e");
    expect(consumerPin).toMatchObject({
      jarvis_commit: "ef1b7ce40d09894ccb0fb8fa8d3b03784f6f9979",
      schema_sha256: schemaSha,
      consumer_manifest_sha256: "788d9bb1c6d66473abad9f8be1ad53e2e1535da6f8ad45c67d16d2745418f541",
      consumer_package_sha256: "3c5925eb341a9f827ff93ec4fc3c0c0bb71519ecf8dcc0076ef4636b988a5543",
    });
  });

  it("re-checks current authorization and suppresses every output group below five", () => {
    expect(migration).toContain("public.evidence_eligibility_reason(");
    expect(migration).toContain("'56d-transfer-v2-2026-07'");
    expect(migration).toContain("IN ('eligible', 'eligible_minor')");
    expect(migration).toContain("COUNT(DISTINCT value ->> 'subject_reference') >= 5");
    expect(migration).toContain("NOT COALESCE(profile.is_test_user, false)");
    expect(migration).toContain("submission.jurisdiction_at_submit = 'DE'");
  });

  it("reconstructs only allow-listed structured fields before granting reader access", () => {
    for (const field of [
      "subject_reference", "questionnaire_version", "language", "product_version",
      "content_version", "program_day", "question_id", "construct_id",
      "item_family_id", "item_variant_id", "scale_id", "structured_answer",
      "activity_snapshot",
    ]) {
      expect(migration).toContain(`'${field}', source.value -> '${field}'`);
    }
    expect(migration).toContain("structured_boundary_failed");
    expect(migration).toContain("'comment', 'consent', 'feedback_reference', 'campaign_reference'");
    expect(migration).toMatch(/REVOKE ALL[\s\S]*read_feedback_intelligence_production_v0_2_draft[\s\S]*mahleos_feedback_production_reader/u);
    expect(migration).toMatch(/GRANT EXECUTE[\s\S]*read_feedback_intelligence_production_structured_v1_2[\s\S]*mahleos_feedback_production_reader/u);
  });

  it("does not activate credentials, runtime gates or real-data reads", () => {
    expect(migration).not.toContain("ALTER ROLE mahleos_feedback_production_reader PASSWORD");
    expect(migration).not.toContain("production_export_enabled = true");
    expect(migration).not.toContain("machine_credential_ready = true");
    expect(migration).not.toMatch(/\b(?:INSERT|UPDATE|DELETE)\s+(?:INTO\s+|FROM\s+)?feedback_core\.(?:submissions|structured_answers|activity_snapshots)/iu);
  });

  it("uses a separate fail-closed Edge endpoint and the exact structured RPC", () => {
    expect(read("supabase/config.toml")).toContain(
      "[functions.mahleos-feedback-structured-production-read]\nverify_jwt = false",
    );
    expect(edge).toContain('const CONTRACT_VERSION = "1.2.0-structured-only-draft"');
    expect(edge).toContain(`const SCHEMA_SHA256 = "${schemaSha}"`);
    expect(edge).toContain(
      "feedback_machine_production.read_feedback_intelligence_production_structured_v1_2(",
    );
    expect(edge).toContain('payload.contract_status !== "PROPOSED_AWAITING_PRODUCER_CONFIRMATION"');
    expect(edge).toContain('Deno.env.get("MAHLEOS_FEEDBACK_PRODUCTION_REAL_DATA_GATE")');
    expect(edge).not.toContain("Access-Control-Allow-Origin");
    expect(edge).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("executes end-to-end and suppresses a group as soon as eligibility drops below five", async () => {
    const db = new PGlite();
    try {
      await db.exec(`
        CREATE ROLE anon;
        CREATE ROLE authenticated;
        CREATE ROLE service_role;
        CREATE ROLE mahleos_feedback_reader;
        CREATE ROLE mahleos_feedback_production_reader LOGIN NOINHERIT;
        CREATE SCHEMA feedback_core;
        CREATE SCHEMA feedback_machine_production;
        CREATE TABLE public.profiles(id uuid PRIMARY KEY, is_test_user boolean NOT NULL DEFAULT false);
        CREATE TABLE public.program_instances(
          id uuid PRIMARY KEY,
          user_id uuid NOT NULL REFERENCES public.profiles(id),
          is_test_instance boolean NOT NULL DEFAULT false,
          status text NOT NULL DEFAULT 'active'
        );
        CREATE TABLE feedback_core.submissions(
          id uuid PRIMARY KEY,
          user_id uuid NOT NULL REFERENCES public.profiles(id),
          program_instance_id uuid NOT NULL REFERENCES public.program_instances(id),
          status text NOT NULL,
          jurisdiction_at_submit text NOT NULL,
          subject_reference uuid NOT NULL
        );
        CREATE FUNCTION feedback_core.export_reference_hash(text, text)
          RETURNS text LANGUAGE sql IMMUTABLE SECURITY DEFINER SET search_path = ''
          AS 'SELECT pg_catalog.md5($2) || pg_catalog.md5($2)';
        CREATE FUNCTION public.evidence_eligibility_reason(uuid, text)
          RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
            SELECT CASE WHEN instance.status = 'active' THEN 'eligible' ELSE 'program_inactive' END
            FROM public.program_instances instance WHERE instance.id = $1
          $$;
        CREATE FUNCTION feedback_machine_production.read_feedback_intelligence_production_v0_2_raw_internal(text, text, text, text)
          RETURNS jsonb LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
            SELECT pg_catalog.jsonb_build_object(
              'schema_version', 'rewire-feedback-intelligence-export-v0.2.1-draft',
              'items', pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
                'feedback_reference', 'forbidden',
                'campaign_reference', 'forbidden',
                'subject_reference', feedback_core.export_reference_hash('subject', submission.subject_reference::text),
                'questionnaire_version', 'feedback-intelligence-v1.2',
                'language', 'de-DE',
                'product_version', '1.2.0',
                'content_version', 'program-v1.2',
                'program_day', 10,
                'question_id', 'd10_content_clarity',
                'construct_id', 'content_clarity',
                'item_family_id', 'content_clarity_v1',
                'item_variant_id', 'content_clarity_d10_v1',
                'scale_id', 'content_clarity_5_v1',
                'structured_answer', '1',
                'comment', 'must-not-cross',
                'consent', pg_catalog.jsonb_build_object('state', 'GRANTED'),
                'activity_snapshot', pg_catalog.jsonb_build_object(
                  'observation_window', pg_catalog.jsonb_build_object('start_program_day', 1, 'end_program_day', 10, 'bucket', 'DAY_01_10'),
                  'program_days_available', 10,
                  'program_days_completed', 8,
                  'checkins_completed', 8,
                  'journal_entries_created_count', 2,
                  'tasks_completed', 7,
                  'transfer_pulse_count', 2,
                  'resume_delay_bucket', 'NO_RESUME_NEEDED',
                  'continuation_status_bucket', 'ACTIVE_OR_COMPLETED'
                )
              ) ORDER BY submission.subject_reference)
            )
            FROM feedback_core.submissions submission
          $$;
        CREATE FUNCTION feedback_machine_production.read_feedback_intelligence_production_v0_2_draft(text, text, text, text)
          RETURNS jsonb LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = ''
          AS 'SELECT ''{}''::jsonb';
        GRANT USAGE ON SCHEMA feedback_machine_production TO mahleos_feedback_production_reader;
      `);

      for (let index = 1; index <= 5; index += 1) {
        const suffix = index.toString().padStart(12, "0");
        await db.exec(`
          INSERT INTO public.profiles(id) VALUES ('00000000-0000-4000-8000-${suffix}');
          INSERT INTO public.program_instances(id, user_id)
          VALUES ('10000000-0000-4000-8000-${suffix}', '00000000-0000-4000-8000-${suffix}');
          INSERT INTO feedback_core.submissions(
            id, user_id, program_instance_id, status, jurisdiction_at_submit, subject_reference
          ) VALUES (
            '20000000-0000-4000-8000-${suffix}',
            '00000000-0000-4000-8000-${suffix}',
            '10000000-0000-4000-8000-${suffix}',
            'submitted', 'DE', '30000000-0000-4000-8000-${suffix}'
          );
        `);
      }

      await db.exec(migration);
      await db.exec("SET ROLE mahleos_feedback_production_reader");
      const allowed = await db.query<{ payload: { items: Record<string, unknown>[] } }>(`
        SELECT feedback_machine_production.read_feedback_intelligence_production_structured_v1_2(
          'mahles-jarvis-feedback-intelligence-production',
          '1.2.0-structured-only-draft',
          '1aa3b1ed3a56722c0b496b8dfc4a661bc364df4cec3bb838f41715e7b8570cff',
          'production'
        ) AS payload
      `);
      expect(allowed.rows[0]?.payload.items).toHaveLength(5);
      expect(allowed.rows[0]?.payload.items[0]).not.toHaveProperty("comment");
      expect(allowed.rows[0]?.payload.items[0]).not.toHaveProperty("consent");
      expect(allowed.rows[0]?.payload.items[0]).not.toHaveProperty("feedback_reference");

      await db.exec("RESET ROLE");
      await db.exec(`
        UPDATE public.program_instances
        SET status = 'deleted'
        WHERE id = '10000000-0000-4000-8000-000000000005'
      `);
      await db.exec("SET ROLE mahleos_feedback_production_reader");
      const suppressed = await db.query<{ payload: { items: unknown[] } }>(`
        SELECT feedback_machine_production.read_feedback_intelligence_production_structured_v1_2(
          'mahles-jarvis-feedback-intelligence-production',
          '1.2.0-structured-only-draft',
          '1aa3b1ed3a56722c0b496b8dfc4a661bc364df4cec3bb838f41715e7b8570cff',
          'production'
        ) AS payload
      `);
      expect(suppressed.rows[0]?.payload.items).toEqual([]);
    } finally {
      await db.close();
    }
  });
});
