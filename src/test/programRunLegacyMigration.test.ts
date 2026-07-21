import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260721142328_preserve_legacy_team_instances_on_run_assignment.sql",
  ),
  "utf8",
);

describe("legacy team program-run assignment", () => {
  it("links a matching unassigned active cycle without replacing its instance", () => {
    const legacyBranch = migration.indexOf("existing_instance.program_run_id IS NULL");
    const inPlaceLink = migration.indexOf("SET program_run_id = target_run.id", legacyBranch);
    const abandonBranch = migration.indexOf("SET status = 'abandoned'", legacyBranch);

    expect(legacyBranch).toBeGreaterThan(0);
    expect(migration).toContain("existing_instance.team_id = target_run.team_id");
    expect(migration).toContain("existing_instance.started_at = target_run.started_at");
    expect(inPlaceLink).toBeGreaterThan(legacyBranch);
    expect(abandonBranch).toBeGreaterThan(inPlaceLink);
    expect(migration).toContain("'migrated_legacy_instances', migrated_count");
  });

  it("keeps manager authorization and closes the function to public callers", () => {
    expect(migration).toContain("public.can_manage_team_program_runs(target_run.team_id)");
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.assign_team_members_to_program_run(uuid) FROM PUBLIC, anon;",
    );
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.assign_team_members_to_program_run(uuid) TO authenticated;",
    );
  });
});
