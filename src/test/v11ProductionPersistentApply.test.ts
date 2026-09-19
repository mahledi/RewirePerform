// @vitest-environment node

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  composePersistentApplyPlan,
  composePersistentMigrationStepSql,
  splitMigrationStatements,
} from "../../scripts/generate-v1-1-production-persistent-apply.mjs";

const root = process.cwd();
const base = "docs/feedback-intelligence/contracts/production-persistent-apply-v0.1";
const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const historicalApplyCommit = "319d8912fb7b8fd90aa01a0d366356de50ca9e0d";
const historicalBytes = (path: string) => spawnSync(
  "git",
  ["show", `${historicalApplyCommit}:${path}`],
  { cwd: root, encoding: null, maxBuffer: 16 * 1024 * 1024 },
).stdout;

describe("V1.1 persistent Production apply package", () => {
  it("pins 25 ordered atomic steps while keeping every external gate closed", async () => {
    const plan = await composePersistentApplyPlan({ cwd: root });
    expect(plan).toMatchObject({
      status: "LOCAL_PREPARED_EXTERNAL_GATES_CLOSED",
      project_ref: "bqsbxesmybthwtxmowfz",
      step_count: 25,
      execution: {
        persistent_apply_approved: false,
        credential_approved: false,
        rollback_dry_run_verified: false,
        backup_and_recovery_verified: false,
        fresh_preapply_baseline_required: true,
        runtime_query_timeout_gate_verified: false,
        stop_on_first_error: true,
        retry_allowed: false,
        one_password_prompt_supported: true,
        application_values_returned: false,
        edge_deploy: false,
        runtime_activation: false,
      },
    });
    expect(plan.steps.map(({ ordinal }) => ordinal)).toEqual(
      Array.from({ length: 25 }, (_, index) => index + 1),
    );
    expect(plan.steps.filter(({ history_only }) => history_only)).toHaveLength(1);
    expect(plan.steps.find(({ history_only }) => history_only)?.file).toBe(
      "20260808074346_feedback_intelligence_synthetic_staging_read_gate_v0_1.sql",
    );
    expect(plan.steps.filter(({ action }) =>
      action === "APPLY_HOSTED_PRODUCTION_ADAPTED_BYTES"
    )).toHaveLength(4);
  });

  it("records each migration atomically and never executes the Staging gate-open SQL", () => {
    const sourcePlan = JSON.parse(readFileSync(resolve(
      root,
      "docs/feedback-intelligence/contracts/production-migration-plan-v0.1/plan.json",
    ), "utf8"));
    for (const migration of sourcePlan.migrations) {
      const source = readFileSync(resolve(root, migration.path), "utf8");
      const step = composePersistentMigrationStepSql({ migration, source });
      expect(step.sql.startsWith("RESET ALL;\nBEGIN;\n")).toBe(true);
      expect(step.sql).toContain("\nCOMMIT;\nSELECT json_build_object(");
      expect(step.sql).toContain("INSERT INTO supabase_migrations.schema_migrations");
      expect(step.sql).toContain("application_values_returned', false");
      if (migration.action === "MARK_APPLIED_WITHOUT_EXECUTION") {
        expect(step.history_only).toBe(true);
        expect(step.sql).not.toContain("machine_credential_ready = true");
        expect(step.status).toBe("PASS_V1_1_HISTORY_ONLY_MIGRATION_RECORDED");
      } else {
        expect(step.history_only).toBe(false);
        expect(step.status).toBe("PASS_V1_1_PRODUCTION_MIGRATION_APPLIED");
      }
    }
  });

  it("fails closed on source, action, adaptation, and nontransactional SQL drift", () => {
    const migration = {
      file: "20260812000000_fixture.sql",
      version: "20260812000000",
      action: "APPLY_EXACT_BYTES",
      sha256: sha256("BEGIN;\nSELECT 1;\nCOMMIT;\n"),
      production_execution_sha256: sha256("BEGIN;\nSELECT 1;\nCOMMIT;\n"),
    };
    expect(() => composePersistentMigrationStepSql({
      migration,
      source: "BEGIN;\nSELECT 2;\nCOMMIT;\n",
    })).toThrow("source SHA-256 drift");
    const concurrent = "BEGIN;\nCREATE INDEX CONCURRENTLY fixture_idx ON fixture(id);\nCOMMIT;\n";
    expect(() => composePersistentMigrationStepSql({
      migration: {
        ...migration,
        sha256: sha256(concurrent),
        production_execution_sha256: sha256(concurrent),
      },
      source: concurrent,
    })).toThrow("nontransactional SQL");
  });

  it("splits quoted and dollar-quoted SQL exactly for migration history", () => {
    expect(splitMigrationStatements(`
      -- comment ;
      CREATE FUNCTION public.fixture() RETURNS text LANGUAGE plpgsql AS $body$
      BEGIN
        RETURN 'value;still-string';
      END;
      $body$;
      INSERT INTO public.fixture_table(value) VALUES ('a; b');
    `)).toEqual([
      "-- comment ;\n      CREATE FUNCTION public.fixture() RETURNS text LANGUAGE plpgsql AS $body$\n      BEGIN\n        RETURN 'value;still-string';\n      END;\n      $body$",
      "INSERT INTO public.fixture_table(value) VALUES ('a; b')",
    ]);
  });

  it("keeps its plan and every package byte deterministic in normal CI", () => {
    const generated = spawnSync(
      process.execPath,
      ["scripts/generate-v1-1-production-persistent-apply.mjs", "--check"],
      { cwd: root, encoding: "utf8" },
    );
    expect(generated.status, generated.stderr || generated.stdout).toBe(0);
    const result = JSON.parse(generated.stdout);
    expect(result).toMatchObject({
      status: "LOCAL_PREPARED_EXTERNAL_GATES_CLOSED",
      steps: 25,
      all_external_gates_closed: true,
    });
    const manifest = JSON.parse(readFileSync(resolve(root, `${base}/producer-package-manifest.json`), "utf8"));
    const digestInput = manifest.files.map(({ path, sha256: pinned }: {
      path: string;
      sha256: string;
    }) => {
      const actual = sha256(historicalBytes(path));
      expect(actual, path).toBe(pinned);
      return `${actual}  ${path}\n`;
    }).join("");
    expect(sha256(digestInput)).toBe(manifest.package_sha256);
    expect(Object.values(manifest.activation).every((value) => value === false)).toBe(true);
  });
});
