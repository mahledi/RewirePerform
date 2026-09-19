import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260810082841_extend_organization_inquiry_team_path_v1_1.sql",
  ),
  "utf8",
);

describe("organization inquiry single-team follow-up migration", () => {
  it("extends the already staged foundation additively", () => {
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS team_name text");
    expect(migration).toContain("rollout_scope = 'single_team' AND team_name IS NOT NULL AND team_count_band = '1'");
    expect(migration).toContain("rollout_scope <> 'single_team' AND team_name IS NULL");
    expect(migration).not.toContain("DROP TABLE");
  });

  it("pins the new exact notice version without opening table access", () => {
    expect(migration).toContain("'organization-inquiry-v1.1-2026-08-07'");
    expect(migration).toContain("'organization-inquiry-v1.1-2026-08-10'");
    expect(migration).not.toMatch(/UPDATE\s+public\.organization_access_requests\s+SET\s+privacy_version/i);
    expect(migration).not.toMatch(/GRANT\s+(SELECT|INSERT|UPDATE|DELETE).*organization_access_requests/i);
  });

  it("keeps the public write atomic and service-role only", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.submit_organization_access_request_service");
    expect(migration).toContain("NULLIF(_payload->>'team_name', '')");
    expect(migration).toContain("INSERT INTO public.organization_access_request_events");
    expect(migration).toMatch(
      /REVOKE ALL ON FUNCTION public\.submit_organization_access_request_service\(jsonb\)[\s\S]*FROM PUBLIC, anon, authenticated/,
    );
    expect(migration).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.submit_organization_access_request_service\(jsonb\)[\s\S]*TO service_role/,
    );
  });

  it("adds business-only team context to the still closed machine view", () => {
    expect(migration).toContain("r.team_name");
    expect(migration).toMatch(
      /REVOKE ALL ON app_private\.organization_inquiry_machine_read_v1[\s\S]*FROM PUBLIC, anon, authenticated, service_role/,
    );
    expect(migration).not.toMatch(/GRANT SELECT ON app_private\.organization_inquiry_machine_read_v1/i);
  });
});
