// @vitest-environment node

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { expectedRemoteMigrationVersions } from "../../scripts/run-v1-1-production-rollback-dry-run.mjs";
import {
  assertPersistentPackageBytes,
  persistentWorkerArgs,
  runProductionPersistentApply,
} from "../../scripts/run-v1-1-production-persistent-apply.mjs";

const root = process.cwd();
const rollbackStatus = {
  status: "PASS_V1_1_PERSISTENT_TARGET_METADATA_AUDIT",
  application_values_returned: false,
  runtime_activation_authorized: false,
};

describe("V1.1 guarded persistent Production runner", () => {
  it("requires all four independent external gates before any session", async () => {
    let calls = 0;
    const runDirectSession = () => { calls += 1; return { status: 0, stdout: "[]" }; };
    await expect(runProductionPersistentApply({ cwd: root, runDirectSession }))
      .rejects.toThrow("persistent Production apply approval required");
    await expect(runProductionPersistentApply({
      cwd: root, runDirectSession, persistentApplyApproved: true,
    })).rejects.toThrow("Production credential approval required");
    await expect(runProductionPersistentApply({
      cwd: root, runDirectSession, persistentApplyApproved: true,
      directSessionCredentialApproved: true, directSessionPassword: "test-password",
      directSessionCaPath: "config/certs/supabase-prod-root-2021.crt",
    })).rejects.toThrow("green Production rollback dry-run proof required");
    await expect(runProductionPersistentApply({
      cwd: root, runDirectSession, persistentApplyApproved: true,
      directSessionCredentialApproved: true, rollbackDryRunVerified: true,
      directSessionPassword: "test-password",
      directSessionCaPath: "config/certs/supabase-prod-root-2021.crt",
    })).rejects.toThrow("current Production backup and recovery proof required");
    expect(calls).toBe(0);
  });

  it("runs 25 ordered steps once, verifies final history, and audits in a fresh session", async () => {
    const floor = expectedRemoteMigrationVersions(root);
    const calls: Array<Record<string, unknown>> = [];
    let applied: string[] = [];
    const runDirectSession = (input: Record<string, unknown>) => {
      calls.push(input);
      const sqlPath = String(input.sqlPath);
      if (sqlPath.endsWith("history.sql")) {
        return { status: 0, stdout: JSON.stringify(
          [...floor, ...applied].map((remote) => ({ remote })),
        ) };
      }
      if (sqlPath.endsWith("target-audit.sql")) {
        return { status: 0, stdout: JSON.stringify([{
          v1_1_persistent_target_status: rollbackStatus,
        }]) };
      }
      const ordinal = Number(sqlPath.match(/step-(\d+)\.sql$/u)?.[1]);
      const plan = JSON.parse(readFileSync(
        `${root}/docs/feedback-intelligence/contracts/production-persistent-apply-v0.1/plan.json`,
        "utf8",
      ));
      const step = plan.steps[ordinal - 1];
      applied = [...applied, step.version];
      return { status: 0, stdout: JSON.stringify([{
        v1_1_persistent_step_status: {
          status: step.expected_status,
          version: step.version,
          application_values_returned: false,
        },
      }]) };
    };
    const result = await runProductionPersistentApply({
      cwd: root,
      runDirectSession,
      persistentApplyApproved: true,
      directSessionCredentialApproved: true,
      rollbackDryRunVerified: true,
      backupAndRecoveryVerified: true,
      directSessionPassword: "temporary-test-password",
      directSessionCaPath: "config/certs/supabase-prod-root-2021.crt",
    });
    expect(result).toMatchObject({
      status: "PASS_V1_1_PRODUCTION_MIGRATIONS_APPLIED_RUNTIME_CLOSED",
      source_package_sha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
      completed_migrations: 25,
      final_remote_migration_count: floor.length + 25,
      final_remote_versions_sha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
      target_audit_status: "PASS_V1_1_PERSISTENT_TARGET_METADATA_AUDIT",
      retry_count: 0,
      credential_persisted_by_operator: false,
      runtime_activation_authorized: false,
    });
    expect(calls).toHaveLength(28);
    expect(calls.filter(({ sqlPath }) => /step-\d+\.sql$/u.test(String(sqlPath)))).toHaveLength(25);
    expect(String(calls.at(-1)?.sqlPath)).toMatch(/target-audit\.sql$/u);
  });

  it("stops at the first failed migration and never retries", async () => {
    const floor = expectedRemoteMigrationVersions(root);
    let calls = 0;
    const runDirectSession = (input: Record<string, unknown>) => {
      calls += 1;
      if (calls === 1) {
        return { status: 0, stdout: JSON.stringify(floor.map((remote) => ({ remote }))) };
      }
      if (calls === 2) {
        return { status: 1, stderr: JSON.stringify({ sqlstate: "42501" }), stdout: "" };
      }
      if (calls === 3) {
        return { status: 0, stdout: JSON.stringify(floor.map((remote) => ({ remote }))) };
      }
      throw new Error("unexpected migration retry");
    };
    await expect(runProductionPersistentApply({
      cwd: root,
      runDirectSession,
      persistentApplyApproved: true,
      directSessionCredentialApproved: true,
      rollbackDryRunVerified: true,
      backupAndRecoveryVerified: true,
      directSessionPassword: "temporary-test-password",
      directSessionCaPath: "config/certs/supabase-prod-root-2021.crt",
    })).rejects.toThrow(/FAILED_STEP_NOT_RECORDED/u);
    expect(calls).toBe(3);
  });

  it("detects a committed step after a response failure without retrying it", async () => {
    const floor = expectedRemoteMigrationVersions(root);
    const plan = JSON.parse(readFileSync(
      `${root}/docs/feedback-intelligence/contracts/production-persistent-apply-v0.1/plan.json`,
      "utf8",
    ));
    let calls = 0;
    const runDirectSession = () => {
      calls += 1;
      if (calls === 1) {
        return { status: 0, stdout: JSON.stringify(floor.map((remote) => ({ remote }))) };
      }
      if (calls === 2) return { status: 1, stderr: "{}", stdout: "" };
      if (calls === 3) {
        return { status: 0, stdout: JSON.stringify(
          [...floor, plan.steps[0].version].map((remote) => ({ remote })),
        ) };
      }
      throw new Error("unexpected migration retry");
    };
    await expect(runProductionPersistentApply({
      cwd: root,
      runDirectSession,
      persistentApplyApproved: true,
      directSessionCredentialApproved: true,
      rollbackDryRunVerified: true,
      backupAndRecoveryVerified: true,
      directSessionPassword: "temporary-test-password",
      directSessionCaPath: "config/certs/supabase-prod-root-2021.crt",
    })).rejects.toThrow(/FAILED_STEP_RECORDED_BEFORE_RESPONSE_FAILURE/u);
    expect(calls).toBe(3);
  });

  it("uses only the pinned direct worker and persistent operation marker", () => {
    const args = persistentWorkerArgs({
      host: "aws-1-eu-central-1.pooler.supabase.com",
      port: "5432",
      user: "postgres.bqsbxesmybthwtxmowfz",
      database: "postgres",
    }, "/tmp/step.sql", "/tmp/ca.crt");
    expect(args).toContain("persistent-apply");
    expect(args).not.toContain("password");
  });

  it("recomputes every package byte before a Production session is possible", () => {
    const manifest = JSON.parse(readFileSync(
      `${root}/docs/feedback-intelligence/contracts/production-persistent-apply-v0.1/producer-package-manifest.json`,
      "utf8",
    ));
    expect(() => assertPersistentPackageBytes({ cwd: root, manifest })).not.toThrow();
    const drifted = structuredClone(manifest);
    drifted.files[0].sha256 = "0".repeat(64);
    expect(() => assertPersistentPackageBytes({ cwd: root, manifest: drifted }))
      .toThrow(/package byte drift/u);
  });
});
