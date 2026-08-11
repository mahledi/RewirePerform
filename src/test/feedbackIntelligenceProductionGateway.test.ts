// @vitest-environment node

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const base = "docs/feedback-intelligence/contracts/production-machine-gateway-v0.1";
const migrationPath =
  "supabase/migrations/20260811071836_feedback_intelligence_production_gateway_v0_1.sql";
const edgePath =
  "supabase/functions/mahleos-feedback-intelligence-production-read/index.ts";
const databasePath =
  "supabase/functions/_shared/feedbackIntelligenceProductionDatabase.ts";
const authPath =
  "supabase/functions/_shared/feedbackIntelligenceProductionMachineAuth.ts";

describe("Feedback Intelligence DE-Production gateway", () => {
  it("accepts only the exact Production request contract", () => {
    const ajv = new Ajv2020({ strict: true, validateFormats: false });
    const validate = ajv.compile(JSON.parse(read(`${base}/request.schema.json`)));
    const request = {
      client_id: "mahles-jarvis-feedback-intelligence-production",
      contract_version: "0.2.1-draft",
      schema_sha256: "e90eb3fc2ce717ef91ae35bcfcd5bc7944d3cc941faa8f071b42e934e967023d",
      data_scope: "production",
    };

    expect(validate(request), JSON.stringify(validate.errors)).toBe(true);
    expect(validate({ ...request, data_scope: "synthetic" })).toBe(false);
    expect(validate({ ...request, client_id: "mahles-jarvis-feedback-intelligence" })).toBe(false);
    expect(validate({ ...request, extra: true })).toBe(false);
  });

  it("uses a separate endpoint, project, reader and secret namespace", () => {
    const edge = read(edgePath);
    const database = read(databasePath);
    const auth = read(authPath);
    const config = read("supabase/config.toml");

    expect(config).toContain(
      "[functions.mahleos-feedback-intelligence-production-read]\nverify_jwt = false",
    );
    expect(edge).toContain('"https://bqsbxesmybthwtxmowfz.supabase.co"');
    expect(edge).toContain('"mahles-jarvis-feedback-intelligence-production"');
    expect(edge).toContain('body.data_scope !== "production"');
    expect(edge).toContain(
      "feedback_machine_production.read_feedback_intelligence_production_v0_2_draft(",
    );
    expect(database).toContain('"bqsbxesmybthwtxmowfz"');
    expect(database).toContain('"mahleos_feedback_production_reader"');
    expect(database).toContain('"MAHLEOS_FEEDBACK_PRODUCTION_READER_DATABASE_URL"');
    expect(auth).toContain('"MAHLEOS_FEEDBACK_PRODUCTION_MACHINE_KEY"');
    expect(auth).toContain('"MAHLEOS_FEEDBACK_PRODUCTION_MACHINE_KEY_PREVIOUS"');

    for (const source of [edge, database, auth]) {
      expect(source).not.toContain("zbeswjipayspgvcipzmx");
      expect(source).not.toContain("MAHLEOS_FEEDBACK_READER_DATABASE_URL");
      expect(source).not.toMatch(/MAHLEOS_FEEDBACK_INTELLIGENCE_MACHINE_KEY(?:_PREVIOUS)?/u);
    }
  });

  it("requires two explicit runtime gates and remains browser-inaccessible", () => {
    const edge = read(edgePath);

    expect(edge).toContain('"MAHLEOS_FEEDBACK_PRODUCTION_MACHINE_GATE"');
    expect(edge).toContain('"PRODUCTION_MANUAL_READ_APPROVED"');
    expect(edge).toContain('"MAHLEOS_FEEDBACK_PRODUCTION_REAL_DATA_GATE"');
    expect(edge).toContain('?.trim() === "true"');
    expect(edge).toContain('request.method !== "POST"');
    expect(edge).toContain('contentType !== "application/json"');
    expect(edge).toContain("readBoundedRequestText(request, 1024)");
    expect(edge).toContain("8 * 1024 * 1024");
    expect(edge).not.toContain("Access-Control-Allow-Origin");
    expect(edge).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(edge).not.toContain("SUPABASE_SECRET_KEYS");
  });

  it("prepares only a passwordless least-privilege role and never opens a gate", () => {
    const migration = read(migrationPath);

    expect(migration).toContain("CREATE ROLE mahleos_feedback_production_reader");
    expect(migration).toContain("PASSWORD NULL");
    expect(migration).toContain("NOINHERIT");
    expect(migration).toContain("NOBYPASSRLS");
    expect(migration).toContain("pg_catalog.pg_auth_members");
    expect(migration).toContain(
      "feedback_production_reader_unsafe_public_security_definer_path",
    );
    expect(migration).toContain("CREATE SCHEMA IF NOT EXISTS feedback_machine_production");
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION feedback_machine_production.read_feedback_intelligence_production_v0_2_draft(text, text, text, text)",
    );
    expect(migration).toContain(
      "REVOKE ALL ON ALL TABLES IN SCHEMA public, feedback_core, feedback_consent, feedback_raw, feedback_analysis",
    );
    expect(migration).toContain("_data_scope <> 'production'");
    expect(migration).toContain("'production'\n    );");
    expect(migration).not.toMatch(/PASSWORD\s+'[^']+'/u);
    expect(migration).not.toMatch(/(?:consumer_pin_ready|production_export_enabled|machine_credential_ready|privacy_notice_ready|app_store_declaration_ready|minor_policy_ready)\s*=\s*true/u);
    expect(migration).not.toMatch(/MAHLEOS_FEEDBACK_PRODUCTION_[A-Z_]+\s*=/u);
    expect(migration).not.toMatch(/\b(?:INSERT|UPDATE|DELETE)\s+(?:INTO\s+|FROM\s+)?feedback_core\.(?:submissions|structured_answers|activity_snapshots)/iu);
  });

  it("inherits the current DE, consent, Guardian, minimization and n>=5 upstream gates", () => {
    const upstream = read(
      "supabase/migrations/20260810122749_feedback_intelligence_transfer_pulse_count_v0_2_1.sql",
    );

    expect(upstream).toContain("submission.jurisdiction_at_submit = 'DE'");
    expect(upstream).toContain("subject_count >= 5");
    expect(upstream).toContain("settings.privacy_notice_ready");
    expect(upstream).toContain("settings.app_store_declaration_ready");
    expect(upstream).toContain("settings.minor_policy_ready");
    expect(upstream).toContain("submission.age_band_at_submit <> 'under_16'");
    expect(upstream).toContain("feedback_consent.guardian_text_authorizations");
    expect(upstream).toContain("'direct_identifiers_exported', false");
    expect(upstream).toContain("'names_emails_teams_coaches_exported', false");
    expect(upstream).toContain("'journal_reflection_support_text_exported', false");
    expect(upstream).toContain("'raw_text_requires_consent', true");
  });

  it("executes the migration in an empty catalog and fails closed with all DB gates shut", async () => {
    const db = new PGlite();
    try {
      await db.exec(`
        CREATE ROLE anon;
        CREATE ROLE authenticated;
        CREATE ROLE service_role;
        CREATE ROLE inherited_power SUPERUSER;
        CREATE ROLE mahleos_feedback_reader LOGIN NOINHERIT NOSUPERUSER NOCREATEDB
          NOCREATEROLE NOREPLICATION NOBYPASSRLS;
        CREATE ROLE mahleos_feedback_production_reader LOGIN SUPERUSER CREATEDB CREATEROLE
          INHERIT REPLICATION BYPASSRLS PASSWORD 'unexpected';
        GRANT inherited_power TO mahleos_feedback_production_reader;
        GRANT mahleos_feedback_production_reader TO postgres;
        CREATE SCHEMA extensions;
        CREATE SCHEMA feedback_core;
        CREATE SCHEMA feedback_consent;
        CREATE SCHEMA feedback_raw;
        CREATE SCHEMA feedback_analysis;
        CREATE FUNCTION extensions.digest(bytea, text) RETURNS bytea LANGUAGE sql IMMUTABLE
          AS 'SELECT decode(repeat(''00'', 32), ''hex'')';
        CREATE TABLE feedback_core.submissions(id uuid PRIMARY KEY);
        CREATE TABLE feedback_raw.comments(id uuid PRIMARY KEY);
        CREATE TABLE feedback_analysis.machine_gateway_nonces(
          request_id uuid PRIMARY KEY,
          nonce_sha256 text NOT NULL UNIQUE,
          client_id text NOT NULL,
          issued_at timestamptz NOT NULL,
          accepted_at timestamptz NOT NULL DEFAULT clock_timestamp()
        );
        CREATE TABLE feedback_analysis.machine_gateway_access_log(
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          request_id uuid NOT NULL,
          client_id text NOT NULL,
          outcome text NOT NULL,
          recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
          UNIQUE(request_id, outcome)
        );
        CREATE FUNCTION feedback_analysis.export_feedback_intelligence_v0_2_internal(text, text, text, text)
          RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
        BEGIN
          RAISE EXCEPTION 'feedback_machine_production_export_disabled';
        END;
        $$;
        CREATE FUNCTION public.read_feedback_intelligence_v0_2_draft(text, text, text, text)
          RETURNS jsonb LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = ''
          AS 'SELECT ''{}''::jsonb';
        REVOKE ALL ON FUNCTION feedback_analysis.export_feedback_intelligence_v0_2_internal(text, text, text, text)
          FROM PUBLIC, anon, authenticated, service_role, mahleos_feedback_reader;
        REVOKE ALL ON FUNCTION public.read_feedback_intelligence_v0_2_draft(text, text, text, text)
          FROM PUBLIC, anon, authenticated, service_role;
        GRANT EXECUTE ON FUNCTION public.read_feedback_intelligence_v0_2_draft(text, text, text, text)
          TO mahleos_feedback_reader;
      `);
      await db.exec(read(migrationPath));

      const privilege = await db.query<{
        password_null: boolean;
        hardened: boolean;
        production_rpc: boolean;
        synthetic_rpc: boolean;
        raw_select: boolean;
        structured_select: boolean;
        internal_export: boolean;
        membership_count: number;
        public_schema_usage: boolean;
      }>(`
        SELECT
          role.rolpassword IS NULL AS password_null,
          NOT role.rolsuper AND NOT role.rolcreatedb AND NOT role.rolcreaterole
            AND NOT role.rolinherit AND NOT role.rolreplication AND NOT role.rolbypassrls
            AS hardened,
          has_function_privilege(
            'mahleos_feedback_production_reader',
            'feedback_machine_production.read_feedback_intelligence_production_v0_2_draft(text,text,text,text)',
            'EXECUTE'
          ) AS production_rpc,
          has_function_privilege(
            'mahleos_feedback_production_reader',
            'public.read_feedback_intelligence_v0_2_draft(text,text,text,text)',
            'EXECUTE'
          ) AS synthetic_rpc,
          has_table_privilege(
            'mahleos_feedback_production_reader', 'feedback_raw.comments', 'SELECT'
          ) AS raw_select,
          has_table_privilege(
            'mahleos_feedback_production_reader', 'feedback_core.submissions', 'SELECT'
          ) AS structured_select,
          has_function_privilege(
            'mahleos_feedback_production_reader',
            'feedback_analysis.export_feedback_intelligence_v0_2_internal(text,text,text,text)',
            'EXECUTE'
          ) AS internal_export,
          (
            SELECT COUNT(*)::integer
            FROM pg_auth_members membership
            WHERE membership.member = role.oid OR membership.roleid = role.oid
          ) AS membership_count,
          has_schema_privilege(
            'mahleos_feedback_production_reader', 'public', 'USAGE'
          ) AS public_schema_usage
        FROM pg_authid role
        WHERE role.rolname = 'mahleos_feedback_production_reader'
      `);
      expect(privilege.rows[0]).toEqual({
        password_null: true,
        hardened: true,
        production_rpc: true,
        synthetic_rpc: false,
        raw_select: false,
        structured_select: false,
        internal_export: false,
        membership_count: 0,
        public_schema_usage: true,
      });

      await db.exec("SET ROLE mahleos_feedback_production_reader");
      await db.query(`
        SELECT
          set_config('request.mahleos_feedback_request_id', '70000000-0000-4000-8000-000000000101', false),
          set_config('request.mahleos_feedback_nonce', $1, false),
          set_config('request.mahleos_feedback_issued_at', $2, false)
      `, ["1".repeat(64), new Date().toISOString()]);
      const closed = await db.query<{ result: Record<string, unknown> }>(`
        SELECT feedback_machine_production.read_feedback_intelligence_production_v0_2_draft(
          'mahles-jarvis-feedback-intelligence-production',
          '0.2.1-draft',
          'e90eb3fc2ce717ef91ae35bcfcd5bc7944d3cc941faa8f071b42e934e967023d',
          'production'
        ) AS result
      `);
      expect(closed.rows[0].result).toEqual({ _gateway_error: "production_scope_blocked" });
      await db.exec("RESET ROLE");

      for (const deniedRole of ["anon", "authenticated", "service_role", "mahleos_feedback_reader"]) {
        await db.exec(`SET ROLE ${deniedRole}`);
        await expect(db.query(`
          SELECT feedback_machine_production.read_feedback_intelligence_production_v0_2_draft(
            'mahles-jarvis-feedback-intelligence-production',
            '0.2.1-draft',
            'e90eb3fc2ce717ef91ae35bcfcd5bc7944d3cc941faa8f071b42e934e967023d',
            'production'
          )
        `)).rejects.toThrow(/permission denied/iu);
        await db.exec("RESET ROLE");
      }
    } finally {
      await db.close();
    }
  });

  it("rejects an inherited PUBLIC-executable SECURITY DEFINER path", async () => {
    const db = new PGlite();
    try {
      await db.exec(`
        CREATE ROLE anon;
        CREATE ROLE authenticated;
        CREATE ROLE service_role;
        CREATE ROLE mahleos_feedback_reader LOGIN NOINHERIT NOSUPERUSER NOCREATEDB
          NOCREATEROLE NOREPLICATION NOBYPASSRLS;
        CREATE SCHEMA feedback_core;
        CREATE SCHEMA feedback_consent;
        CREATE SCHEMA feedback_raw;
        CREATE SCHEMA feedback_analysis;
        CREATE FUNCTION public.unrelated_privileged_function()
          RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = ''
          AS 'SELECT true';
      `);

      const inheritedCallable = await db.query<{ callable: boolean }>(`
        SELECT has_function_privilege(
          'mahleos_feedback_reader',
          'public.unrelated_privileged_function()',
          'EXECUTE'
        ) AS callable
      `);
      expect(inheritedCallable.rows[0]?.callable).toBe(true);

      await expect(db.exec(read(migrationPath))).rejects.toThrow(
        /feedback_production_reader_unsafe_public_security_definer_path/iu,
      );
    } finally {
      await db.close();
    }
  });

  it("keeps the package byte-pinned with every activation gate false", () => {
    const generator = spawnSync(
      process.execPath,
      ["scripts/generate-feedback-production-gateway-package.mjs", "--check"],
      { cwd: process.cwd(), encoding: "utf8" },
    );
    expect(generator.status, generator.stderr || generator.stdout).toBe(0);

    const manifestSource = read(`${base}/producer-package-manifest.json`);
    const manifest = JSON.parse(manifestSource);
    const digestInput = manifest.files.map(({ path, sha256: pinned }: {
      path: string;
      sha256: string;
    }) => {
      const actual = sha256(readFileSync(resolve(process.cwd(), path)));
      expect(actual, path).toBe(pinned);
      return `${actual}  ${path}\n`;
    }).join("");

    expect(sha256(digestInput)).toBe(manifest.package_sha256);
    expect(Object.values(manifest.activation).every((value) => value === false)).toBe(true);
    expect(manifest.upstream_pins).toMatchObject({
      endpoint: "/functions/v1/mahleos-feedback-intelligence-production-read",
      role: "mahleos_feedback_production_reader",
      export_contract_version: "0.2.1-draft",
      semantics_contract_version: "0.3.3-draft",
      question_count: 55,
    });
    expect(manifest.files.some(({ path }: { path: string }) =>
      path === "scripts/generate-feedback-production-gateway-package.mjs"
    )).toBe(true);
  });
});
