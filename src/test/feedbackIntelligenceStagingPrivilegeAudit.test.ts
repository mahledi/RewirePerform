// @vitest-environment node

import { readFileSync } from "node:fs";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { PGlite } from "@electric-sql/pglite";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

const base = "docs/feedback-intelligence/contracts/staging-privilege-audit-v0.1";
const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const validateFixture = (value: unknown) => {
  const directory = mkdtempSync(resolve(tmpdir(), "feedback-privilege-audit-"));
  const path = resolve(directory, "fixture.json");
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  try {
    return spawnSync(process.execPath, [
      "scripts/validate-feedback-staging-privilege-audit.mjs",
      path,
    ], { cwd: process.cwd(), encoding: "utf8" });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
};
const guardedAdminPath = () => ({
  subject_role: "authenticated",
  schema_name: "public",
  function_name: "get_admin_feedback_intelligence_insights",
  identity_arguments: "text",
  owner_name: "postgres",
  security_definer: true,
  function_settings: ["search_path=\"\""],
  return_type: "jsonb",
  volatility: "STABLE",
  definition_sha256: "9beef5048a25069c5fe381232dc81414ab3d62e300629a5fbf1a986e4c8d38ca",
});

describe("Feedback Intelligence Staging privilege audit", () => {
  it("is catalog-only and contains no mutation or application-row statement", () => {
    const sql = read(`${base}/audit.sql`);
    const executableSql = sql
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("--"))
      .join("\n")
      .replace(/'(?:''|[^'])*'/gu, "''");
    expect(sql).toContain("FROM pg_catalog.pg_roles");
    expect(sql).toContain("FROM pg_catalog.pg_proc");
    expect(sql).toContain("FROM pg_catalog.pg_auth_members");
    expect(sql).toContain("FROM pg_catalog.pg_class");
    expect(executableSql).not.toMatch(/\b(?:INSERT|UPDATE|DELETE|ALTER|CREATE|DROP|GRANT|REVOKE|TRUNCATE|CALL|SET\s+ROLE)\b/iu);
    expect(executableSql).not.toMatch(/FROM\s+(?:public|feedback_core|feedback_consent|feedback_raw|feedback_analysis)\./iu);
  });

  it("pins the target, exact reader and exact RPC", () => {
    const sql = read(`${base}/audit.sql`);
    expect(sql).toContain("zbeswjipayspgvcipzmx");
    expect(sql).toContain("mahleos_feedback_reader");
    expect(sql).toContain("public.read_feedback_intelligence_v0_2_draft(text,text,text,text)");
    for (const role of ["PUBLIC", "anon", "authenticated", "service_role"]) {
      expect(sql).toContain(role);
    }
  });

  it("schema-validates both deterministic phase fixtures", () => {
    const ajv = new Ajv2020({ strict: true, validateFormats: false });
    const schema = JSON.parse(read(`${base}/result.schema.json`));
    const validate = ajv.compile(schema);
    for (const fixture of ["predeploy.fixture.json", "postdeploy-pass.fixture.json"]) {
      expect(validate(JSON.parse(read(`${base}/${fixture}`))), JSON.stringify(validate.errors)).toBe(true);
    }
  });

  it("executes as a read-only predeploy query against an empty PostgreSQL catalog", async () => {
    const db = new PGlite();
    try {
      await db.exec(`
        CREATE ROLE anon;
        CREATE ROLE authenticated;
        CREATE ROLE service_role;
        CREATE SCHEMA extensions;
        CREATE FUNCTION extensions.digest(bytea, text) RETURNS bytea LANGUAGE sql IMMUTABLE
          AS 'SELECT decode(repeat(''00'', 32), ''hex'')';
      `);
      const response = await db.query(read(`${base}/audit.sql`));
      const result = response.rows[0].audit_result;
      expect(result.audit_phase).toBe("PREDEPLOY_BASELINE");
      expect(result.data_access).toEqual({
        catalog_metadata_only: true,
        application_rows_read: false,
        application_functions_called: false,
        database_mutated: false,
      });
      expect(result.evidence.reader_role).toEqual({ present: false });
      expect(result.evidence.gateway_function).toEqual({ present: false });
    } finally {
      await db.close();
    }
  });

  it("detects a neutrally named public relation inherited through PUBLIC", async () => {
    const db = new PGlite();
    try {
      await db.exec(`
        CREATE ROLE anon;
        CREATE ROLE authenticated;
        CREATE ROLE service_role;
        CREATE SCHEMA extensions;
        CREATE FUNCTION extensions.digest(bytea, text) RETURNS bytea LANGUAGE sql IMMUTABLE
          AS 'SELECT decode(repeat(''00'', 32), ''hex'')';
        CREATE ROLE mahleos_feedback_reader LOGIN NOINHERIT NOSUPERUSER NOCREATEDB
          NOCREATEROLE NOREPLICATION NOBYPASSRLS;
        CREATE FUNCTION public.read_feedback_intelligence_v0_2_draft(text, text, text, text)
          RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = ''
          AS 'SELECT ''{}''::jsonb';
        REVOKE ALL ON FUNCTION public.read_feedback_intelligence_v0_2_draft(text, text, text, text)
          FROM PUBLIC, anon, authenticated, service_role;
        GRANT EXECUTE ON FUNCTION public.read_feedback_intelligence_v0_2_draft(text, text, text, text)
          TO mahleos_feedback_reader;
        CREATE TABLE public.profiles_neutral(id integer);
        GRANT SELECT ON TABLE public.profiles_neutral TO PUBLIC;
      `);
      const response = await db.query(read(`${base}/audit.sql`));
      expect(response.rows[0].audit_result.evidence.reader_relation_privileges).toContainEqual({
        schema_name: "public",
        relation_name: "profiles_neutral",
        relkind: "r",
        privilege_type: "SELECT",
      });
    } finally {
      await db.close();
    }
  });

  it("fails closed for extra function settings", () => {
    const fixture = JSON.parse(read(`${base}/postdeploy-pass.fixture.json`));
    const path = guardedAdminPath();
    path.function_settings.push("statement_timeout=12000");
    fixture.evidence.denied_role_machine_paths.push(path);
    const result = validateFixture(fixture);
    expect(result.status).toBe(2);
    expect(result.stdout).toContain("MACHINE_EXPORT_SIDE_PATH");
  });

  it("fails closed for guarded Admin owner drift", () => {
    const fixture = JSON.parse(read(`${base}/postdeploy-pass.fixture.json`));
    const path = guardedAdminPath();
    path.owner_name = "other_owner";
    fixture.evidence.denied_role_machine_paths.push(path);
    const result = validateFixture(fixture);
    expect(result.status).toBe(2);
  });

  it("fails closed when the guarded Admin function becomes SECURITY INVOKER", () => {
    const fixture = JSON.parse(read(`${base}/postdeploy-pass.fixture.json`));
    const path = guardedAdminPath();
    path.security_definer = false;
    fixture.evidence.denied_role_machine_paths.push(path);
    const result = validateFixture(fixture);
    expect(result.status).toBe(2);
  });

  it("fails closed for guarded Admin definition drift", () => {
    const fixture = JSON.parse(read(`${base}/postdeploy-pass.fixture.json`));
    const path = guardedAdminPath();
    path.definition_sha256 = "2".repeat(64);
    fixture.evidence.denied_role_machine_paths.push(path);
    const result = validateFixture(fixture);
    expect(result.status).toBe(2);
  });

  it("fails closed for unknown nested evidence fields", () => {
    const fixture = JSON.parse(read(`${base}/postdeploy-pass.fixture.json`));
    fixture.evidence.reader_role.unexpected = true;
    const result = validateFixture(fixture);
    expect(result.status).toBe(1);
  });

  it("fails closed for a denied-role Machine/Export side path", () => {
    const fixture = JSON.parse(read(`${base}/postdeploy-pass.fixture.json`));
    fixture.evidence.denied_role_machine_paths.push({
      subject_role: "authenticated",
      schema_name: "public",
      function_name: "export_feedback_shadow",
      identity_arguments: "",
      owner_name: "postgres",
      security_definer: true,
      function_settings: ["search_path=\"\""],
      return_type: "jsonb",
      volatility: "STABLE",
      definition_sha256: "1".repeat(64),
    });
    const result = validateFixture(fixture);
    expect(result.status).toBe(2);
    expect(result.stdout).toContain("MACHINE_EXPORT_SIDE_PATH");
  });

  it("keeps every non-audit external gate explicitly closed", () => {
    const manifest = JSON.parse(read(`${base}/producer-package-manifest.json`));
    expect(manifest.package_signed).toBe(false);
    expect(manifest.scope).toMatchObject({
      catalog_metadata_only: true,
      application_rows: false,
      application_function_calls: false,
      mutations: false,
      credentials: false,
      signing: false,
      migration: false,
      edge_deployment: false,
      production: false,
    });
  });
});
