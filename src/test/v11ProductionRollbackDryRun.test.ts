// @vitest-environment node

import { spawnSync } from "node:child_process";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";
import {
  composeDryRunSql,
  normalizeOuterTransaction,
} from "../../scripts/generate-v1-1-production-rollback-dry-run.mjs";

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
      status: "LOCAL_OPERATOR_READY_EXTERNAL_DATA_READ_NOT_APPROVED",
      normalized_apply_migrations: 24,
      history_only_migrations_skipped: 1,
      application_data_access_required: true,
      application_data_access_approved: false,
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
});
