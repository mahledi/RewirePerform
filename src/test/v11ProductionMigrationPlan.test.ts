// @vitest-environment node

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const base = "docs/feedback-intelligence/contracts/production-migration-plan-v0.1";
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const historicalPlanCommit = "319d8912fb7b8fd90aa01a0d366356de50ca9e0d";
const historicalBytes = (path: string) => spawnSync(
  "git",
  ["show", `${historicalPlanCommit}:${path}`],
  { cwd: root, encoding: null, maxBuffer: 16 * 1024 * 1024 },
).stdout;

describe("V1.1 Production migration plan", () => {
  it("pins the complete ordered delta and never executes the Staging gate-open migration", () => {
    const plan = JSON.parse(read(`${base}/plan.json`));
    expect(plan.project_ref).toBe("bqsbxesmybthwtxmowfz");
    expect(plan.observed_remote_state.latest_applied_migration).toBe("20260801104717");
    expect(plan.migration_count).toBe(25);
    expect(plan.apply_count).toBe(24);
    expect(plan.exact_apply_count).toBe(20);
    expect(plan.hosted_adapted_apply_count).toBe(4);
    expect(plan.history_only_count).toBe(1);
    expect(plan.execution_contract).toMatchObject({
      bulk_db_push_allowed: false,
      transactional_rollback_dry_run_complete: false,
      application_data_access_required_for_full_rollback_dry_run: true,
      application_data_access_approved: true,
      application_data_access_approval_scope: [
        "public.teams.id",
        "public.teams.created_by",
        "public.user_roles.user_id",
        "public.user_roles.role",
      ],
      persistent_production_apply_approved: false,
      persistent_execution_strategy: "ordered_stop_on_first_error_one_migration_per_step",
      persistent_execution_bytes_pinned: true,
      historical_source_migrations_immutable: true,
      staging_gate_open_sql_execution_forbidden: true,
      credentials_allowed: false,
      data_reads_allowed: false,
      edge_deploy_allowed: false,
      runtime_gates_must_remain_closed: true,
    });

    const skipped = plan.migrations.filter(({ action }: { action: string }) =>
      action === "MARK_APPLIED_WITHOUT_EXECUTION"
    );
    expect(skipped).toHaveLength(1);
    expect(skipped[0].file).toBe(
      "20260808074346_feedback_intelligence_synthetic_staging_read_gate_v0_1.sql",
    );
    expect(read(skipped[0].path)).toContain("machine_credential_ready = true");
    expect(plan.migrations[plan.migrations.indexOf(skipped[0]) + 1].file).toBe(
      "20260808074742_feedback_intelligence_synthetic_staging_read_gate_close_v0_1.sql",
    );

    const adapted = plan.migrations.filter(({ action }: { action: string }) =>
      action === "APPLY_HOSTED_PRODUCTION_ADAPTED_BYTES"
    );
    expect(adapted.map(({ file }: { file: string }) => file)).toEqual([
      "20260807090000_feedback_intelligence_machine_gateway_v0_1.sql",
      "20260808093000_feedback_intelligence_machine_gateway_privilege_remediation.sql",
      "20260810122749_feedback_intelligence_transfer_pulse_count_v0_2_1.sql",
      "20260811071836_feedback_intelligence_production_gateway_v0_1.sql",
    ]);
    for (const migration of adapted) {
      expect(migration.production_adapted_sha256).toMatch(/^[a-f0-9]{64}$/u);
      expect(migration.production_adaptation_contract).toContain("historical source");
    }
    for (const migration of plan.migrations) {
      if (migration.action === "MARK_APPLIED_WITHOUT_EXECUTION") {
        expect(migration.production_execution_sha256).toBeNull();
      } else {
        expect(migration.production_execution_sha256).toMatch(/^[a-f0-9]{64}$/u);
        if (migration.action === "APPLY_EXACT_BYTES") {
          expect(migration.production_execution_sha256).toBe(migration.sha256);
        } else {
          expect(migration.production_execution_sha256).toBe(migration.production_adapted_sha256);
        }
      }
    }

    const dataTouching = plan.migrations.filter(({ application_data_impact }: {
      application_data_impact: string;
    }) => application_data_impact.startsWith("Reads existing"));
    expect(dataTouching).toHaveLength(1);
    expect(dataTouching[0].file).toBe("20260807092005_coach_enterprise_onboarding_v1_1.sql");
  });

  it("keeps the generated plan and every migration byte-pinned in normal CI", () => {
    const generator = spawnSync(
      process.execPath,
      ["scripts/generate-v1-1-production-migration-plan.mjs", "--check"],
      { cwd: root, encoding: "utf8" },
    );
    expect(generator.status, generator.stderr || generator.stdout).toBe(0);

    const manifest = JSON.parse(read(`${base}/producer-package-manifest.json`));
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

    const workflow = read(".github/workflows/ci.yml");
    const isolatedInstall = "npm ci --ignore-scripts --prefix tools/production-rollback-dry-run";
    expect(workflow).toContain(isolatedInstall);
    expect(workflow.indexOf(isolatedInstall)).toBeLessThan(workflow.indexOf("npm run ci"));

    const currentMigrations = readFileSync(resolve(root, "supabase/migrations/20260813125221_feedback_intelligence_v1_1_activation_contract.sql"), "utf8");
    expect(currentMigrations).toContain("activate_feedback_v1_1");
    const historicalPlan = JSON.parse(read(`${base}/plan.json`));
    expect(historicalPlan.migrations.some(({ version }: { version: string }) => version === "20260813125221")).toBe(false);
  });
});
