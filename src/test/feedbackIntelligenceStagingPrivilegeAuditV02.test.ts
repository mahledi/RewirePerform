// @vitest-environment node

import { readFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { PGlite } from "@electric-sql/pglite";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

const base = "docs/feedback-intelligence/contracts/staging-privilege-audit-v0.2";
const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const validateFixture = (value: unknown) => {
  const directory = mkdtempSync(resolve(tmpdir(), "feedback-privilege-audit-v02-"));
  const path = resolve(directory, "fixture.json");
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  try {
    return spawnSync(process.execPath, [
      "scripts/validate-feedback-staging-privilege-audit-v0-2.mjs",
      path,
    ], { cwd: process.cwd(), encoding: "utf8" });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
};

describe("Feedback Intelligence Staging privilege audit v0.2", () => {
  it("remains catalog-only and explicitly audits both executed data-path functions", () => {
    const sql = read(`${base}/audit.sql`);
    const executableSql = sql
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("--"))
      .join("\n")
      .replace(/'(?:''|[^'])*'/gu, "''");
    expect(sql).toContain("public.read_feedback_intelligence_v0_2_draft(text,text,text,text)");
    expect(sql).toContain("feedback_analysis.export_feedback_intelligence_v0_2_internal(text,text,text,text)");
    expect(sql).toContain("pg_catalog.pg_get_functiondef");
    expect(sql).toContain("'sha256'");
    expect(executableSql).not.toMatch(/\b(?:INSERT|UPDATE|DELETE|ALTER|CREATE|DROP|GRANT|REVOKE|TRUNCATE|CALL|SET\s+ROLE)\b/iu);
    expect(executableSql).not.toMatch(/FROM\s+(?:public|feedback_core|feedback_consent|feedback_raw|feedback_analysis)\./iu);
  });

  it("schema-validates both v0.2 phase fixtures and accepts the pinned postdeploy fixture", () => {
    const ajv = new Ajv2020({ strict: true, validateFormats: false });
    const schema = JSON.parse(read(`${base}/result.schema.json`));
    const validate = ajv.compile(schema);
    for (const fixture of ["predeploy.fixture.json", "postdeploy-pass.fixture.json"]) {
      expect(validate(JSON.parse(read(`${base}/${fixture}`))), JSON.stringify(validate.errors)).toBe(true);
    }
    const result = validateFixture(JSON.parse(read(`${base}/postdeploy-pass.fixture.json`)));
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("PASS_POSTDEPLOY_ASSURANCE");
  });

  it("emits separate full-definition evidence for both functions", async () => {
    const db = new PGlite();
    try {
      await db.exec(`
        CREATE ROLE anon;
        CREATE ROLE authenticated;
        CREATE ROLE service_role;
        CREATE ROLE mahleos_feedback_reader LOGIN NOINHERIT NOSUPERUSER NOCREATEDB
          NOCREATEROLE NOREPLICATION NOBYPASSRLS;
        CREATE SCHEMA extensions;
        CREATE SCHEMA feedback_core;
        CREATE SCHEMA feedback_consent;
        CREATE SCHEMA feedback_raw;
        CREATE SCHEMA feedback_analysis;
        CREATE FUNCTION extensions.digest(bytea, text) RETURNS bytea LANGUAGE sql IMMUTABLE
          AS 'SELECT decode(repeat(''00'', 32), ''hex'')';
        CREATE FUNCTION feedback_analysis.export_feedback_intelligence_v0_2_internal(text, text, text, text)
          RETURNS jsonb LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = ''
          AS 'SELECT ''{}''::jsonb';
        CREATE FUNCTION public.read_feedback_intelligence_v0_2_draft(text, text, text, text)
          RETURNS jsonb LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = ''
          AS 'SELECT ''{}''::jsonb';
        REVOKE ALL ON FUNCTION feedback_analysis.export_feedback_intelligence_v0_2_internal(text, text, text, text)
          FROM PUBLIC, anon, authenticated, service_role, mahleos_feedback_reader;
        REVOKE ALL ON FUNCTION public.read_feedback_intelligence_v0_2_draft(text, text, text, text)
          FROM PUBLIC, anon, authenticated, service_role;
        GRANT EXECUTE ON FUNCTION public.read_feedback_intelligence_v0_2_draft(text, text, text, text)
          TO mahleos_feedback_reader;
        GRANT USAGE ON SCHEMA public TO mahleos_feedback_reader;
      `);
      const response = await db.query<{ audit_result: any }>(read(`${base}/audit.sql`));
      const evidence = response.rows[0].audit_result.evidence;
      for (const fn of [evidence.gateway_function, evidence.internal_export_function]) {
        expect(fn).toMatchObject({
          present: true,
          security_definer: true,
          function_settings: ['search_path=""'],
          return_type: "jsonb",
          volatility: "VOLATILE",
        });
        expect(fn.definition_sha256).toMatch(/^[a-f0-9]{64}$/u);
      }
    } finally {
      await db.close();
    }
  });

  it.each([
    ["gateway_function", "definition_sha256", "2".repeat(64)],
    ["gateway_function", "owner_name", "other_owner"],
    ["gateway_function", "security_definer", false],
    ["gateway_function", "function_settings", ['search_path=""', "statement_timeout=1"]],
    ["gateway_function", "return_type", "text"],
    ["gateway_function", "volatility", "STABLE"],
    ["internal_export_function", "definition_sha256", "3".repeat(64)],
    ["internal_export_function", "owner_name", "other_owner"],
    ["internal_export_function", "security_definer", false],
    ["internal_export_function", "function_settings", ['search_path="public"']],
    ["internal_export_function", "return_type", "text"],
    ["internal_export_function", "volatility", "STABLE"],
  ])("fails closed for %s %s drift", (functionKey, field, value) => {
    const fixture = JSON.parse(read(`${base}/postdeploy-pass.fixture.json`));
    fixture.evidence[functionKey][field] = value;
    const result = validateFixture(fixture);
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toMatch(
      /(?:GATEWAY_FUNCTION_DRIFT|INTERNAL_EXPORT_FUNCTION_DRIFT|must be equal to constant|must NOT have more than 1 items)/u,
    );
  });

  it("fails closed when the function inventory and dedicated pins disagree", () => {
    const fixture = JSON.parse(read(`${base}/postdeploy-pass.fixture.json`));
    fixture.evidence.machine_export_functions[0].definition_sha256 = "4".repeat(64);
    const result = validateFixture(fixture);
    expect(result.status).toBe(2);
    expect(result.stdout).toContain("DATA_PATH_FUNCTION_INVENTORY_DRIFT");
  });

  it("keeps the remediation release pair pending and invalidates the historical gate", () => {
    const pair = JSON.parse(read(
      "docs/feedback-intelligence/contracts/staging-release-pair-v0.2/release-pair.json",
    ));
    expect(pair).toMatchObject({
      release_status: "UNSIGNED_AWAITING_CURRENT_CONSUMER_ACCEPTANCE",
      producer: {
        source_commit: "970f581fb855ecff432283f099de6b85a95fc564",
        gateway_package_sha256: "15c85f345592c7df3b0c700134ff5ab2c6b7b86b3ea64e4a7088168a488dbbbb",
      },
      consumer: {
        current_source_commit: "ec197d6bcfb32e02596024f61d0fa2e0011fb871",
        acceptance_status: "PENDING_CURRENT_PACKAGE_REVIEW",
        acceptance_commit: null,
      },
      invalidated_historical_gate: {
        producer_commit: "077a35f82fe7fd7972621a9c2ea1cc481ff991e0",
        consumer_commit: "266eac3d362ede7ceafd2c25b6109d3c2d8c8bc0",
        can_authorize_current_gate: false,
      },
      next_gate: {
        consumer_review_required: true,
        migration_and_edge_staging: false,
        credentials: false,
        synthetic_network_read: false,
        production: false,
        real_data: false,
        writes: false,
      },
    });
  });
});
