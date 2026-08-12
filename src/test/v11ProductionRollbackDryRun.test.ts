// @vitest-environment node

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";
import {
  composeDryRunSql,
  normalizeOuterTransaction,
} from "../../scripts/generate-v1-1-production-rollback-dry-run.mjs";
import {
  expectedRemoteMigrationVersions,
  directWorkerArgs,
  assertDirectToolInstalled,
  parseRemoteMigrationVersions,
  resolveDirectTarget,
  runProductionRollbackDryRun,
  sanitizedDirectChildEnv,
  sanitizeCliFailure,
  validateDryRunResult,
  validatePostRollbackResult,
} from "../../scripts/run-v1-1-production-rollback-dry-run.mjs";

const root = process.cwd();

describe("V1.1 Production rollback dry-run operator", () => {
  it("removes only the expected outer wrapper and preserves an actual outer rollback", async () => {
    const source = `-- fixture\nBEGIN;\nCREATE TABLE rollback_probe(value integer);\nDO $$\nBEGIN\n  INSERT INTO rollback_probe VALUES (1);\nEND;\n$$;\nCOMMIT;\n`;
    const normalized = normalizeOuterTransaction(source, "fixture.sql");
    expect(normalized).not.toMatch(/^BEGIN;$/mu);
    expect(normalized).not.toMatch(/^COMMIT;$/mu);
    expect(normalized).toContain("DO $$\nBEGIN\n");

    const db = new PGlite();
    await db.exec(`BEGIN;\n${normalized}\nROLLBACK;`);
    const result = await db.query<{ persisted: boolean }>(
      "SELECT to_regclass('public.rollback_probe') IS NOT NULL AS persisted",
    );
    expect(result.rows[0].persisted).toBe(false);
    await db.close();
  });

  it("fails closed on ambiguous or non-terminal wrappers", () => {
    expect(() => normalizeOuterTransaction(
      "BEGIN;\nBEGIN;\nSELECT 1;\nCOMMIT;\n",
      "ambiguous.sql",
    )).toThrow("exactly one standalone");
    expect(() => normalizeOuterTransaction(
      "BEGIN;\nSELECT 1;\nCOMMIT;\nSELECT 2;\n",
      "non-terminal.sql",
    )).toThrow("final material line");
  });

  it("pins all apply migrations into one rollback transaction and excludes the gate-open migration", async () => {
    const { sql, summary } = await composeDryRunSql({ cwd: root });
    expect(summary).toMatchObject({
      status: "LOCAL_OPERATOR_READY_BOUNDED_DATA_READ_APPROVED",
      normalized_apply_migrations: 24,
      history_only_migrations_skipped: 1,
      application_data_access_required: true,
      application_data_access_approved: true,
      persistent_production_apply_authorized: false,
    });
    expect(sql.match(/BEGIN_NORMALIZED_MIGRATION/g)).toHaveLength(24);
    expect(sql.match(/END_NORMALIZED_MIGRATION/g)).toHaveLength(24);
    expect(sql.match(/^BEGIN;$/gmu)).toHaveLength(1);
    expect(sql.match(/^COMMIT;$/gmu)).toBeNull();
    expect(sql.match(/^ROLLBACK;$/gmu)).toHaveLength(1);
    expect(sql).not.toContain("20260808074346_feedback_intelligence_synthetic_staging_read_gate_v0_1.sql");
    expect(sql).not.toContain("machine_credential_ready = true");
    expect(sql).toContain("PASS_V1_1_TARGET_STATE_BEFORE_ROLLBACK");
    expect(sql).toContain("ROLLBACK;");
    expect(sql).toContain("PASS_V1_1_POST_ROLLBACK_METADATA_AUDIT");

    const generated = spawnSync(
      process.execPath,
      ["scripts/generate-v1-1-production-rollback-dry-run.mjs", "--check"],
      { cwd: root, encoding: "utf8" },
    );
    expect(generated.status, generated.stderr || generated.stdout).toBe(0);
    expect(JSON.parse(generated.stdout)).toMatchObject(summary);
  });

  it("accepts only the two fixed dry-run statuses and one fixed fresh audit status", () => {
    const target = {
      application_values_returned: false,
      persistent_mutation_authorized: false,
      status: "PASS_V1_1_TARGET_STATE_BEFORE_ROLLBACK",
    };
    const rollback = {
      application_values_returned: false,
      persistent_mutation_detected: false,
      status: "PASS_V1_1_POST_ROLLBACK_METADATA_AUDIT",
    };
    expect(validateDryRunResult(JSON.stringify([{
        v1_1_dry_run_target_status: target,
        v1_1_dry_run_rollback_status: rollback,
    }]))).toEqual({ target: expect.objectContaining(target), rollback: expect.objectContaining(rollback) });
    expect(validatePostRollbackResult(JSON.stringify([
      { v1_1_dry_run_rollback_status: rollback },
    ]))).toEqual(expect.objectContaining(rollback));
    expect(() => validateDryRunResult(JSON.stringify([{
        v1_1_dry_run_target_status: target,
        v1_1_dry_run_rollback_status: rollback,
        leaked_application_value: "forbidden",
    }]))).toThrow("unexpected result keys");
  });

  it("classifies CLI failures without retaining arbitrary stderr, SQL, or application values", () => {
    const secretValue = "athlete@example.test journal-private-value";
    const diagnostic = sanitizeCliFailure({
      status: 1,
      signal: null,
      stdout: "",
      stderr: JSON.stringify({
        code: "LegacyDbQueryUnexpectedStatusError",
        message: `unexpected status 413: ${secretValue}`,
      }),
    }, { requestBytes: 288_845 });
    expect(diagnostic).toMatchObject({
      failure_class: "MANAGEMENT_API_HTTP_ERROR",
      exit_status: 1,
      http_status: 413,
      sqlstate: null,
      dry_run_guard: null,
      request_bytes: 288_845,
      raw_output_persisted: false,
      output_digest_persisted: false,
      cli_output_forwarded_by_runner: false,
    });
    expect(JSON.stringify(diagnostic)).not.toContain(secretValue);
    expect(JSON.stringify(diagnostic)).not.toContain("athlete@example.test");

    expect(sanitizeCliFailure({
      status: 1,
      stdout: "",
      stderr: "unexpected status 400: SQLSTATE 42501 v1_1_dry_run_public_security_definer_drift:99",
    })).toMatchObject({
      failure_class: "DRY_RUN_GUARD_REJECTED",
      http_status: 400,
      sqlstate: "42501",
      dry_run_guard: "v1_1_dry_run_public_security_definer_drift",
    });

    expect(sanitizeCliFailure({
      status: 1,
      stdout: "",
      stderr: JSON.stringify({
        failure_class: "POSTGRES_QUERY_ERROR",
        sqlstate: "42501",
        raw_error_persisted: false,
      }),
    })).toMatchObject({ sqlstate: "42501" });
  });

  it("always performs one fresh direct-session audit and never retries", async () => {
    const linkedWorkdir = mkdtempSync(resolve(tmpdir(), "rewire-v11-linked-test-"));
    mkdirSync(resolve(linkedWorkdir, "supabase/.temp"), { recursive: true });
    writeFileSync(resolve(linkedWorkdir, "supabase/.temp/project-ref"), "bqsbxesmybthwtxmowfz\n");
    writeFileSync(
      resolve(linkedWorkdir, "supabase/.temp/pooler-url"),
      "postgresql://postgres.bqsbxesmybthwtxmowfz@aws-1-eu-central-1.pooler.supabase.com:5432/postgres\n",
    );
    const versions = expectedRemoteMigrationVersions(root);
    const calls: string[][] = [];
    const directCalls: Array<Record<string, unknown>> = [];
    const rollback = {
      application_values_returned: false,
      persistent_mutation_detected: false,
      status: "PASS_V1_1_POST_ROLLBACK_METADATA_AUDIT",
    };
    const runCli = (args: string[]) => {
      calls.push(args);
      return {
        status: 0,
        stdout: JSON.stringify({
          migrations: [
            ...versions.map((remote) => ({ local: "", remote, time: "2026-08-11 00:00:00" })),
            { local: "20260812000000", remote: null, time: null },
          ],
          message: "Migrations listed",
        }),
      };
    };
    const runDirectSession = (input: Record<string, unknown>) => {
      directCalls.push(input);
      if (directCalls.length === 1) {
        return {
          status: 0,
          stdout: JSON.stringify([{
            v1_1_dry_run_target_status: {
              application_values_returned: false,
              persistent_mutation_authorized: false,
              status: "PASS_V1_1_TARGET_STATE_BEFORE_ROLLBACK",
            },
            v1_1_dry_run_rollback_status: rollback,
          }]),
        };
      }
      return { status: 0, stdout: JSON.stringify([{ v1_1_dry_run_rollback_status: rollback }]) };
    };
    try {
      const result = await runProductionRollbackDryRun({
        cwd: root,
        linkedWorkdir,
        runCli,
        runDirectSession,
        directSessionCredentialApproved: true,
        directSessionPassword: "temporary-test-password",
      });
      expect(result).toMatchObject({
        status: "PASS_V1_1_PRODUCTION_ROLLBACK_DRY_RUN",
        dry_run_request_count: 1,
        postrollback_audit_request_count: 1,
        retry_count: 0,
        persistent_mutation_detected: false,
      });
      expect(calls).toHaveLength(1);
      expect(calls[0]).toEqual([
        "migration", "list", "--linked", "--output-format", "json",
      ]);
      expect(directCalls).toHaveLength(2);
      expect(directCalls[0]).toMatchObject({
        target: {
          host: "aws-1-eu-central-1.pooler.supabase.com",
          port: "5432",
          user: "postgres.bqsbxesmybthwtxmowfz",
          database: "postgres",
        },
        password: "temporary-test-password",
        cwd: linkedWorkdir,
      });
      expect(directCalls[0].sqlPath).not.toBe(directCalls[1].sqlPath);

      calls.length = 0;
      directCalls.length = 0;
      const failingRunDirectSession = (input: Record<string, unknown>) => {
        directCalls.push(input);
        if (directCalls.length === 1) {
          return {
            status: 1,
            stdout: "",
            stderr: JSON.stringify({ sqlstate: "57014", raw_error_persisted: false }),
          };
        }
        return { status: 0, stdout: JSON.stringify([{ v1_1_dry_run_rollback_status: rollback }]) };
      };
      await expect(runProductionRollbackDryRun({
        cwd: root,
        linkedWorkdir,
        runCli,
        runDirectSession: failingRunDirectSession,
        directSessionCredentialApproved: true,
        directSessionPassword: "temporary-test-password",
      })).rejects.toThrow(
        /rollback dry-run query failed: .*"raw_output_persisted":false,"output_digest_persisted":false,"cli_output_forwarded_by_runner":false/u,
      );
      expect(calls).toHaveLength(1);
      expect(directCalls).toHaveLength(2);
    } finally {
      rmSync(linkedWorkdir, { recursive: true, force: true });
    }
  });

  it("pins the passwordless target and removes ambient PostgreSQL configuration", () => {
    const linkedWorkdir = mkdtempSync(resolve(tmpdir(), "rewire-v11-target-test-"));
    mkdirSync(resolve(linkedWorkdir, "supabase/.temp"), { recursive: true });
    writeFileSync(
      resolve(linkedWorkdir, "supabase/.temp/pooler-url"),
      "postgresql://postgres.bqsbxesmybthwtxmowfz@aws-1-eu-central-1.pooler.supabase.com:5432/postgres\n",
    );
    try {
      expect(resolveDirectTarget(linkedWorkdir)).toEqual({
        host: "aws-1-eu-central-1.pooler.supabase.com",
        port: "5432",
        user: "postgres.bqsbxesmybthwtxmowfz",
        database: "postgres",
      });
      writeFileSync(
        resolve(linkedWorkdir, "supabase/.temp/pooler-url"),
        "postgresql://postgres.bqsbxesmybthwtxmowfz:leak@evil.example:5432/postgres\n",
      );
      expect(() => resolveDirectTarget(linkedWorkdir)).toThrow("target drift");
    } finally {
      rmSync(linkedWorkdir, { recursive: true, force: true });
    }

    expect(sanitizedDirectChildEnv({
      PATH: "/bin",
      HOME: "/tmp/home",
      PGHOST: "evil.example",
      pgservice: "unexpected",
      PGSSLMODE: "disable",
      SUPABASE_DB_PASSWORD: "secret",
      NODE_EXTRA_CA_CERTS: "/tmp/evil-ca.pem",
      SSL_CERT_FILE: "/tmp/evil-ca.pem",
      SSL_CERT_DIR: "/tmp/evil-certs",
      NODE_OPTIONS: "--import=/tmp/steal-password.mjs",
      NODE_DEBUG: "tls,net",
      NODE_TLS_REJECT_UNAUTHORIZED: "0",
      SSLKEYLOGFILE: "/tmp/tls-keys.log",
      OPENSSL_CONF: "/tmp/evil-openssl.cnf",
      HTTPS_PROXY: "http://evil.example",
    })).toEqual({ LANG: "C", LC_ALL: "C", TZ: "UTC" });

    expect(assertDirectToolInstalled()).toBe("8.23.0");
    const missingTool = mkdtempSync(resolve(tmpdir(), "rewire-v11-missing-tool-"));
    try {
      expect(() => assertDirectToolInstalled(missingTool)).toThrow("installation missing or invalid");
    } finally {
      rmSync(missingTool, { recursive: true, force: true });
    }

    const workerArgs = directWorkerArgs({
      host: "aws-1-eu-central-1.pooler.supabase.com",
      port: "5432",
      user: "postgres.bqsbxesmybthwtxmowfz",
      database: "postgres",
    }, "/tmp/query.sql");
    expect(workerArgs).toContain("/tmp/query.sql");
    expect(workerArgs).not.toContain("temporary-test-password");
    expect(workerArgs.join(" ")).not.toContain("password");
  });

  it("treats a killed direct child as a failed attempt and audits in a fresh process", async () => {
    const linkedWorkdir = mkdtempSync(resolve(tmpdir(), "rewire-v11-timeout-test-"));
    mkdirSync(resolve(linkedWorkdir, "supabase/.temp"), { recursive: true });
    writeFileSync(resolve(linkedWorkdir, "supabase/.temp/project-ref"), "bqsbxesmybthwtxmowfz\n");
    writeFileSync(
      resolve(linkedWorkdir, "supabase/.temp/pooler-url"),
      "postgresql://postgres.bqsbxesmybthwtxmowfz@aws-1-eu-central-1.pooler.supabase.com:5432/postgres\n",
    );
    const versions = expectedRemoteMigrationVersions(root);
    const rollback = {
      application_values_returned: false,
      persistent_mutation_detected: false,
      status: "PASS_V1_1_POST_ROLLBACK_METADATA_AUDIT",
    };
    let directCalls = 0;
    try {
      await expect(runProductionRollbackDryRun({
        cwd: root,
        linkedWorkdir,
        directSessionCredentialApproved: true,
        directSessionPassword: "temporary-test-password",
        runCli: () => ({
          status: 0,
          stdout: JSON.stringify({
            migrations: versions.map((remote) => ({
              local: "", remote, time: "2026-08-11 00:00:00",
            })),
            message: "Migrations listed",
          }),
        }),
        runDirectSession: () => {
          directCalls += 1;
          if (directCalls === 1) {
            return {
              status: null,
              signal: "SIGKILL",
              error: { code: "ETIMEDOUT" },
              stdout: "",
              stderr: "",
            };
          }
          return {
            status: 0,
            stdout: JSON.stringify([{ v1_1_dry_run_rollback_status: rollback }]),
          };
        },
      })).rejects.toThrow(/CLI_PROCESS_ERROR/u);
      expect(directCalls).toBe(2);
    } finally {
      rmSync(linkedWorkdir, { recursive: true, force: true });
    }
  });

  it("rejects malformed, duplicate, or unordered remote migration inventories", () => {
    const make = (migrations: unknown[]) => JSON.stringify({
      migrations,
      message: "Migrations listed",
    });
    const entry = (remote: unknown) => ({ local: "", remote, time: "2026-08-11 00:00:00" });
    expect(parseRemoteMigrationVersions(make([
      entry("20260101000000"),
      { local: "20260102000000", remote: null, time: null },
    ]))).toEqual(["20260101000000"]);
    expect(() => parseRemoteMigrationVersions(make([
      entry("20260101000000"), entry("20260101000000"),
    ]))).toThrow("duplicate remote version");
    expect(() => parseRemoteMigrationVersions(make([
      entry("20260102000000"), entry("20260101000000"),
    ]))).toThrow("not ordered");
    expect(() => parseRemoteMigrationVersions(make([entry(20260101000000)])))
      .toThrow("invalid entry types");
  });
});
