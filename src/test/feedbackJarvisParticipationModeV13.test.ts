// @vitest-environment node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const migration = read("supabase/migrations/20260826151831_feedback_jarvis_participation_mode_v1_3.sql");
const schemaSource = read("docs/feedback-intelligence/contracts/v1.3.0-participation-mode-draft/structured-export.schema.json");
const schemaSha = createHash("sha256").update(schemaSource).digest("hex");
const edge = read("supabase/functions/mahleos-feedback-structured-production-read-v1-3/index.ts");

describe("V1.3 feedback participation mode contract", () => {
  it("pins a new immutable schema and Edge endpoint", () => {
    expect(schemaSha).toBe("e666b8c48f5de2ab32154d7b4b347e9d3eefeaa49fed22f448a5f0e98202b516");
    expect(edge).toContain(`const SCHEMA_SHA256 = "${schemaSha}"`);
    expect(edge).toContain("read_feedback_intelligence_production_structured_v1_3");
    expect(edge).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    const schema = JSON.parse(schemaSource);
    const validate = new Ajv2020({ strict: true, validateFormats: false }).compile(schema);
    expect(validate({
      schema_version: "rewire-feedback-intelligence-structured-export-v1.3.0-draft",
      contract_version: "1.3.0-participation-mode-draft",
      contract_status: "LOCAL_ACCEPTED_AWAITING_PRODUCTION_PRIVILEGE_GATE",
      generated_at: "2026-08-26T15:00:00Z",
      items: [],
      privacy: {
        raw_text_in_contract: false,
        text_consent_payload_in_contract: false,
        direct_identifiers_exported: false,
        journal_reflection_support_text_exported: false,
        team_identifier_exported: false,
        participation_mode_server_derived: true,
        subject_reference_handling: "IN_MEMORY_ONLY_NEVER_OUTPUT_OR_PERSIST",
        minimum_group_size_per_question_and_mode: 5,
        small_groups_suppressed: true,
        model_training: false,
        automated_individual_decisions: false,
        observational_not_causal: true,
      },
    }), JSON.stringify(validate.errors)).toBe(true);
  });

  it("derives mode server-side, suppresses per mode and exposes no team identifier", async () => {
    const db = new PGlite();
    try {
      await db.exec(`
        CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
        CREATE ROLE mahleos_feedback_reader;
        CREATE ROLE mahleos_feedback_production_reader LOGIN NOINHERIT;
        CREATE SCHEMA feedback_core; CREATE SCHEMA feedback_machine_production;
        CREATE TABLE public.profiles(id uuid PRIMARY KEY, is_test_user boolean NOT NULL DEFAULT false);
        CREATE TABLE public.program_instances(
          id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES public.profiles(id),
          team_id uuid, program_run_id uuid, is_test_instance boolean NOT NULL DEFAULT false,
          status text NOT NULL DEFAULT 'active'
        );
        CREATE TABLE feedback_core.submissions(
          id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES public.profiles(id),
          program_instance_id uuid NOT NULL REFERENCES public.program_instances(id),
          status text NOT NULL, jurisdiction_at_submit text NOT NULL, subject_reference uuid NOT NULL
        );
        CREATE FUNCTION feedback_core.export_reference_hash(text, text)
          RETURNS text LANGUAGE sql IMMUTABLE SECURITY DEFINER SET search_path = ''
          AS 'SELECT pg_catalog.md5($2) || pg_catalog.md5($2)';
        CREATE FUNCTION public.evidence_eligibility_reason(uuid, text)
          RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
            SELECT CASE WHEN instance.status = 'active' THEN 'eligible' ELSE 'program_inactive' END
            FROM public.program_instances instance WHERE instance.id = $1
          $$;
        REVOKE EXECUTE ON FUNCTION public.evidence_eligibility_reason(uuid, text) FROM PUBLIC;
        CREATE FUNCTION feedback_machine_production.read_feedback_intelligence_production_v0_2_raw_internal(text,text,text,text)
          RETURNS jsonb LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
            SELECT pg_catalog.jsonb_build_object(
              'schema_version', 'rewire-feedback-intelligence-export-v0.2.1-draft',
              'items', pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
                'subject_reference', feedback_core.export_reference_hash('subject', submission.subject_reference::text),
                'questionnaire_version', 'feedback-intelligence-v1.2', 'language', 'de-DE',
                'product_version', '1.2.0', 'content_version', 'program-v1.2', 'program_day', 10,
                'question_id', 'd10_content_clarity', 'construct_id', 'content_clarity',
                'item_family_id', 'content_clarity_v1', 'item_variant_id', 'content_clarity_d10_v1',
                'scale_id', 'content_clarity_5_v1', 'structured_answer', '1', 'comment', 'blocked',
                'activity_snapshot', pg_catalog.jsonb_build_object(
                  'observation_window', pg_catalog.jsonb_build_object('start_program_day',1,'end_program_day',10,'bucket','DAY_01_10'),
                  'program_days_available',10,'program_days_completed',8,'checkins_completed',8,
                  'journal_entries_created_count',2,'tasks_completed',7,'transfer_pulse_count',2,
                  'resume_delay_bucket','NO_RESUME_NEEDED','continuation_status_bucket','ACTIVE_OR_COMPLETED'
                )
              ) ORDER BY submission.subject_reference)
            ) FROM feedback_core.submissions submission
          $$;
        REVOKE EXECUTE ON FUNCTION feedback_machine_production.read_feedback_intelligence_production_v0_2_raw_internal(text,text,text,text) FROM PUBLIC;
        CREATE FUNCTION feedback_machine_production.read_feedback_intelligence_production_structured_v1_2(text,text,text,text)
          RETURNS jsonb LANGUAGE sql AS 'SELECT ''{}''::jsonb';
        GRANT EXECUTE ON FUNCTION feedback_machine_production.read_feedback_intelligence_production_structured_v1_2(text,text,text,text) TO mahleos_feedback_production_reader;
        GRANT USAGE ON SCHEMA feedback_machine_production TO mahleos_feedback_production_reader;
      `);
      for (let index = 1; index <= 9; index += 1) {
        const suffix = index.toString().padStart(12, "0");
        const isTeam = index > 5;
        await db.exec(`
          INSERT INTO public.profiles(id) VALUES ('00000000-0000-4000-8000-${suffix}');
          INSERT INTO public.program_instances(id,user_id,team_id,program_run_id)
          VALUES ('10000000-0000-4000-8000-${suffix}','00000000-0000-4000-8000-${suffix}',
            ${isTeam ? "'40000000-0000-4000-8000-000000000001'" : "NULL"},
            ${isTeam ? "'50000000-0000-4000-8000-000000000001'" : "NULL"});
          INSERT INTO feedback_core.submissions(id,user_id,program_instance_id,status,jurisdiction_at_submit,subject_reference)
          VALUES ('20000000-0000-4000-8000-${suffix}','00000000-0000-4000-8000-${suffix}',
            '10000000-0000-4000-8000-${suffix}','submitted','DE','30000000-0000-4000-8000-${suffix}');
        `);
      }
      await db.exec(migration);
      await db.exec("SET ROLE mahleos_feedback_production_reader");
      const result = await db.query<{ payload: { items: Record<string, unknown>[] } }>(`
        SELECT feedback_machine_production.read_feedback_intelligence_production_structured_v1_3(
          'mahles-jarvis-feedback-intelligence-production','1.3.0-participation-mode-draft',
          '${schemaSha}','production'
        ) AS payload
      `);
      expect(result.rows[0]?.payload.items).toHaveLength(5);
      expect(result.rows[0]?.payload.items.every((item) => item.participation_mode === "solo")).toBe(true);
      expect(result.rows[0]?.payload.items[0]).not.toHaveProperty("team_id");
      expect(result.rows[0]?.payload.items[0]).not.toHaveProperty("comment");
      await db.exec("RESET ROLE");
      const privileges = await db.query<{ v12: boolean; v13: boolean }>(`
        SELECT
          pg_catalog.has_function_privilege('mahleos_feedback_production_reader','feedback_machine_production.read_feedback_intelligence_production_structured_v1_2(text,text,text,text)','EXECUTE') AS v12,
          pg_catalog.has_function_privilege('mahleos_feedback_production_reader','feedback_machine_production.read_feedback_intelligence_production_structured_v1_3(text,text,text,text)','EXECUTE') AS v13
      `);
      expect(privileges.rows[0]).toEqual({ v12: false, v13: true });
    } finally {
      await db.close();
    }
  });

  it("does not activate a credential, runtime gate or data read", () => {
    expect(migration).toContain("feedback_reader_net_execute_not_closed");
    expect(migration).toContain("feedback_reader_public_execute_not_closed");
    expect(migration).toContain("reader_feedback_function_count <> 1");
    expect(migration).not.toContain("PASSWORD");
    expect(migration).not.toContain("PRODUCTION_MANUAL_READ_APPROVED");
    expect(migration).not.toMatch(/\b(?:INSERT|UPDATE|DELETE)\s+(?:INTO\s+|FROM\s+)?feedback_core\./iu);
  });
});
