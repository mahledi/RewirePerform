import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260820090000_fix_prestart_team_questionnaire_status.sql",
  ),
  "utf8",
);

describe("team questionnaire readiness migration", () => {
  it("counts the active unassigned team instance only before an active run exists", () => {
    expect(migration).toContain("pi.team_id = _team_id");
    expect(migration).toContain("pi.status = 'active'");
    expect(migration).toContain("pi.program_run_id = (SELECT ar.id FROM active_run ar)");
    expect(migration).toContain("pi.program_run_id IS NULL");
    expect(migration).toContain("NOT EXISTS (SELECT 1 FROM active_run)");
  });

  it("keeps the Coach result status-only and access-controlled", () => {
    expect(migration).toContain("public.can_manage_team_program_runs(_team_id)");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.get_team_questionnaire_status(uuid) FROM PUBLIC, anon");
    expect(migration).not.toMatch(/SELECT[\s\S]{0,120}\banswers\b/i);
    expect(migration).not.toMatch(/SELECT[\s\S]{0,120}\bscores\b/i);
    expect(migration).not.toMatch(/SELECT[\s\S]{0,120}\banalysis\b/i);
  });
});
