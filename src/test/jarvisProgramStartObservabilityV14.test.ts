import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260901103644_jarvis_program_start_observability_v1_4.sql",
  ),
  "utf8",
);

describe("Jarvis program-start observability v1.4", () => {
  it("detects the complete state contradiction instead of one known UI symptom", () => {
    expect(migration).toContain("activated_teams_without_active_run");
    expect(migration).toContain("activated_teams_with_multiple_active_runs");
    expect(migration).toContain("active_runs_with_assignment_set_mismatch");
    expect(migration).toContain("has_no_expected_athletes");
    expect(migration).toContain("has_missing_expected_assignment");
    expect(migration).toContain("has_unexpected_assignment");
    expect(migration).toContain("NOT EXISTS (");
    expect(migration).not.toContain("expected.expected_count <> assigned.assigned_count");
  });

  it("excludes test teams, users, and instances before reconciliation", () => {
    expect(migration).toContain("NOT COALESCE(team.is_test_team, false)");
    expect(migration).toContain("NOT COALESCE(profile.is_test_user, false)");
    expect(migration).toContain("NOT COALESCE(instance.is_test_instance, false)");
  });

  it("reports only successful reconciled activations and keeps unknown telemetry null", () => {
    expect(migration).toContain("successful_team_activations_24h");
    expect(migration).toContain("NOT check_result.has_missing_expected_assignment");
    expect(migration).toContain("'attempts_24h', NULL");
    expect(migration).toContain("'failures_24h', NULL");
    expect(migration).toContain("'state_reconciliation', 'COMPLETE'");
  });

  it("forces RED for either missing runs or assignment-set mismatches", () => {
    expect(migration).toMatch(
      /activated_teams_without_active_run > 0\s+OR projected\.activated_teams_with_multiple_active_runs > 0\s+OR projected\.active_runs_with_assignment_set_mismatch > 0/u,
    );
    expect(migration).toContain("to_jsonb('RED'::text)");
  });

  it("keeps the helper private and output identifier-free", () => {
    expect(migration).toContain("SECURITY DEFINER");
    expect(migration).toContain("SET search_path = pg_catalog");
    expect(migration).toContain("FROM PUBLIC, anon, authenticated, service_role");
    expect(migration).not.toMatch(/jsonb_build_object\([\s\S]*?'(?:user|team|run|program)_id'/u);
    expect(migration).not.toContain("profile.email");
    expect(migration).not.toContain("profile.full_name");
    expect(migration).not.toContain("subject_reference");
    expect(migration).not.toContain("free_text");
  });

  it("versions the strict generated contract with the new fields", () => {
    const schema = JSON.parse(readFileSync(
      resolve(process.cwd(), "docs/mahleos-handoff/contracts/v1/schemas/system-health.schema.json"),
      "utf8",
    ));
    const golden = JSON.parse(readFileSync(
      resolve(process.cwd(), "docs/mahleos-handoff/contracts/v1/golden/system-health.success.json"),
      "utf8",
    ));

    expect(schema.properties.schema_version.const).toBe("mahleos-system-health-v1.5");
    expect(schema.properties.program_integrity.required).toContain(
      "active_runs_with_assignment_set_mismatch",
    );
    expect(schema.properties.critical_journey_coverage.required).toContain("program_start");
    expect(golden.data.critical_journey_coverage.program_start.failures_24h).toBeNull();
    expect(golden.data.critical_journey_coverage.program_start.state_reconciliation).toBe("COMPLETE");
  });
});
