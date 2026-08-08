// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

const base = "docs/feedback-intelligence/contracts/staging-privilege-audit-v0.1";
const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

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
      await db.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;");
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
