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
  parseRemoteMigrationVersions,
  runProductionRollbackDryRun,
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
    expect(validateDryRunResult(JSON.stringify({
      rows: [{
        v1_1_dry_run_target_status: target,
        v1_1_dry_run_rollback_status: rollback,
      }],
    }))).toEqual({ target: expect.objectContaining(target), rollback: expect.objectContaining(rollback) });
    expect(validatePostRollbackResult(JSON.stringify({
      rows: [{ v1_1_dry_run_rollback_status: rollback }],
    }))).toEqual(expect.objectContaining(rollback));
    expect(() => validateDryRunResult(JSON.stringify({
      rows: [{
        v1_1_dry_run_target_status: target,
        v1_1_dry_run_rollback_status: rollback,
        leaked_application_value: "forbidden",
      }],
    }))).toThrow("unexpected result keys");
  });

  it("always performs one fresh postrollback audit and never retries", async () => {
    const linkedWorkdir = mkdtempSync(resolve(tmpdir(), "rewire-v11-linked-test-"));
    mkdirSync(resolve(linkedWorkdir, "supabase/.temp"), { recursive: true });
    writeFileSync(resolve(linkedWorkdir, "supabase/.temp/project-ref"), "bqsbxesmybthwtxmowfz\n");
    const versions = expectedRemoteMigrationVersions(root);
    const calls: string[][] = [];
    const rollback = {
      application_values_returned: false,
      persistent_mutation_detected: false,
      status: "PASS_V1_1_POST_ROLLBACK_METADATA_AUDIT",
    };
    const runCli = (args: string[]) => {
      calls.push(args);
      if (args[0] === "migration") {
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
      }
      if (calls.filter(([command]) => command === "db").length === 1) {
        return {
          status: 0,
          stdout: JSON.stringify({ rows: [{
            v1_1_dry_run_target_status: {
              application_values_returned: false,
              persistent_mutation_authorized: false,
              status: "PASS_V1_1_TARGET_STATE_BEFORE_ROLLBACK",
            },
            v1_1_dry_run_rollback_status: rollback,
          }] }),
        };
      }
      return { status: 0, stdout: JSON.stringify({ rows: [{ v1_1_dry_run_rollback_status: rollback }] }) };
    };
    try {
      const result = await runProductionRollbackDryRun({ cwd: root, linkedWorkdir, runCli });
      expect(result).toMatchObject({
        status: "PASS_V1_1_PRODUCTION_ROLLBACK_DRY_RUN",
        dry_run_request_count: 1,
        postrollback_audit_request_count: 1,
        retry_count: 0,
        persistent_mutation_detected: false,
      });
      expect(calls).toHaveLength(3);
      expect(calls[0]).toEqual([
        "migration", "list", "--linked", "--output-format", "json",
      ]);

      calls.length = 0;
      let databaseCalls = 0;
      const failingRunCli = (args: string[]) => {
        calls.push(args);
        if (args[0] === "migration") {
          return {
            status: 0,
            stdout: JSON.stringify({
              migrations: versions.map((remote) => ({
                local: "", remote, time: "2026-08-11 00:00:00",
              })),
              message: "Migrations listed",
            }),
          };
        }
        databaseCalls += 1;
        if (databaseCalls === 1) return { status: 1, stdout: "" };
        return { status: 0, stdout: JSON.stringify({ rows: [{ v1_1_dry_run_rollback_status: rollback }] }) };
      };
      await expect(runProductionRollbackDryRun({
        cwd: root,
        linkedWorkdir,
        runCli: failingRunCli,
      })).rejects.toThrow("rollback dry-run query failed");
      expect(calls).toHaveLength(3);
      expect(databaseCalls).toBe(2);
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
