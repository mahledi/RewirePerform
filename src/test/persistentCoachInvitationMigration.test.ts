import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260818130641_persistent_team_coach_invitation_v1_1.sql",
  "utf8",
);

const between = (start: string, end: string) => {
  const from = migration.indexOf(start);
  const to = migration.indexOf(end, from + start.length);
  expect(from).toBeGreaterThanOrEqual(0);
  expect(to).toBeGreaterThan(from);
  return migration.slice(from, to);
};

describe("persistent Lead-Coach Co-Coach invitation migration", () => {
  it("repairs the authoritative Lead-Coach role for existing coach-created teams", () => {
    expect(migration).toContain("INSERT INTO public.team_staff_memberships(");
    expect(migration).toContain("team.created_by");
    expect(migration).toContain("public.has_role(team.created_by, 'coach'::public.app_role)");
    expect(migration).toContain("'lead_coach'");
    expect(migration).toContain("ON CONFLICT (team_id, user_id) DO UPDATE");
  });

  it("returns one private reusable link only to a Lead Coach or admin", () => {
    const getOrCreate = between(
      "CREATE OR REPLACE FUNCTION public.get_or_create_team_coach_invitation",
      "CREATE OR REPLACE FUNCTION public.renew_team_coach_invitation",
    );
    expect(getOrCreate).toContain("SET search_path = pg_catalog");
    expect(getOrCreate).toContain("app_private.is_admin(actor_id)");
    expect(getOrCreate).toContain("staff.role = 'lead_coach'");
    expect(getOrCreate).toContain("invitation.expires_at IS NULL");
    expect(getOrCreate).toContain("target_invitation.invitation_code");
    expect(getOrCreate).toContain("extensions.gen_random_bytes(10)");
    expect(getOrCreate).toContain("expires_at,\n    invited_by");
    expect(getOrCreate).toContain("NULL,\n    actor_id");
  });

  it("lets only that Lead Coach replace the link and keeps the new one reusable", () => {
    const renew = between(
      "CREATE OR REPLACE FUNCTION public.renew_team_coach_invitation",
      "-- A valid reusable link",
    );
    expect(renew).toContain("staff.role = 'lead_coach'");
    expect(renew).toContain("SET status = 'revoked'");
    expect(renew).toContain("RETURN public.get_or_create_team_coach_invitation(_team_id)");

    const accept = between(
      "CREATE OR REPLACE FUNCTION public.accept_team_coach_invitation",
      "REVOKE ALL ON FUNCTION public.get_or_create_team_coach_invitation",
    );
    expect(accept).toContain("email_confirmed_at IS NOT NULL");
    expect(accept).toContain("already_team_member");
    expect(accept).toContain("existing_athlete_account_requires_admin_review");
    expect(accept).toMatch(/target_invite\.expires_at IS NOT NULL AND\s+target_invite\.expires_at <= now\(\)/u);
    expect(accept).not.toContain("DELETE FROM app_private.team_coach_invitation_codes");
  });

  it("makes every new public RPC authenticated-only and fixed-search-path", () => {
    for (const signature of [
      "public.get_or_create_team_coach_invitation(uuid)",
      "public.renew_team_coach_invitation(uuid)",
      "public.accept_team_coach_invitation(text)",
    ]) {
      expect(migration).toContain(`REVOKE ALL ON FUNCTION ${signature}`);
      expect(migration).toContain(`GRANT EXECUTE ON FUNCTION ${signature}\n  TO authenticated;`);
    }
    expect(migration.match(/SECURITY DEFINER\nSET search_path = pg_catalog/gu)).toHaveLength(3);
  });
});
