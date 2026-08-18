import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260818103000_coach_invite_existing_member_guard_v1_1.sql",
  "utf8",
);

describe("Co-Coach invitation existing-member guard", () => {
  it("fails closed before it can alter an existing team membership", () => {
    const guard = migration.slice(
      migration.indexOf("IF actor_id = target_invite.invited_by"),
      migration.indexOf("-- A brand-new invited signup"),
    );

    expect(guard).toContain("actor_id = target_invite.invited_by");
    expect(guard).toContain("public.team_staff_memberships");
    expect(guard).toContain("public.team_members");
    expect(guard).toContain("RAISE EXCEPTION 'already_team_member'");
    expect(migration.indexOf("RAISE EXCEPTION 'already_team_member'")).toBeLessThan(
      migration.indexOf("DELETE FROM public.user_roles"),
    );
  });

  it("keeps the RPC authenticated-only and fixed-search-path", () => {
    expect(migration).toContain("SECURITY DEFINER\nSET search_path = pg_catalog");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.accept_team_coach_invitation(text)");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.accept_team_coach_invitation(text)\n  TO authenticated;");
  });
});
