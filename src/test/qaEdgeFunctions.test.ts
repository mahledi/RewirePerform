import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readFunction = (name: string) => readFileSync(
  resolve(process.cwd(), "supabase/functions", name, "index.ts"),
  "utf8",
);

describe("QA edge-function safety contracts", () => {
  it("rejects dates outside the 56-day program and checks every time override write", () => {
    const source = readFunction("qa-set-time");
    expect(source).toContain("simulated_day_number < 1");
    expect(source).toContain("simulated_day_number > 56");
    expect(source).toContain("simDay < 1 || simDay > 56");
    expect(source).toContain('parsed.toISOString().slice(0, 10) === value');
    expect(source).toContain("simDay !== derivedDay");
    expect(source).toContain("simulated_date and simulated_day_number do not match");
    expect(source).toContain("qa_time_override_lookup_failed");
    expect(source).toContain("qa_time_override_update_failed");
    expect(source).toContain("qa_time_override_insert_failed");
    expect(source).toContain("Not a test team");
  });

  it("fails and cleans up when QA cohort creation stops midway", () => {
    const source = readFunction("qa-create-cohort");
    expect(source).toContain("profileError");
    expect(source).toContain('.update({ is_test_user: true })');
    expect(source).not.toContain('.upsert({ id: uid, full_name: a.full_name');
    expect(source).toContain("roleError");
    expect(source).toContain('admin.rpc("minor_service_action"');
    expect(source).toContain('_action: "set_age"');
    expect(source).toContain('_payload: { age_band: "adult" }');
    expect(source).toContain("authorizationError");
    expect(source).toContain("memberError");
    expect(source).toContain("instanceError");
    expect(source).toContain("overrideError");
    expect(source).toContain('from("program_instances").delete().eq("team_id", createdTeamId)');
    expect(source).toContain('from("program_runs").delete().eq("team_id", createdTeamId)');
    expect(source).toContain("admin.auth.admin.deleteUser(userId)");
  });

  it("pins the Supabase client version in both privileged QA functions", () => {
    for (const name of ["qa-create-cohort", "qa-set-time"]) {
      expect(readFunction(name)).toContain('npm:@supabase/supabase-js@2.99.3');
    }
  });
});
