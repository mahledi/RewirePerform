import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260814100115_coach_invite_code_and_observation_access_v1_1.sql",
  "utf8",
);

const between = (start: string, end: string) => {
  const from = migration.indexOf(start);
  const to = migration.indexOf(end, from + start.length);
  expect(from).toBeGreaterThanOrEqual(0);
  expect(to).toBeGreaterThan(from);
  return migration.slice(from, to);
};

describe("V1.1 Co-Coach invite and observation migration", () => {
  it("stores only private one-time code digests and enforces retention", () => {
    expect(migration).toContain("CREATE TABLE app_private.team_coach_invitation_codes");
    expect(migration).toContain("extensions.gen_random_bytes(10)");
    expect(migration).toContain("extensions.digest(lower(raw_code), 'sha256')");
    expect(migration).toContain("ALTER TABLE app_private.team_coach_invitation_codes ENABLE ROW LEVEL SECURITY");
    expect(migration).toMatch(/REVOKE ALL ON TABLE app_private\.team_coach_invitation_codes\s+FROM PUBLIC, anon, authenticated, service_role;/u);
    expect(migration).toContain("DELETE FROM app_private.team_coach_invitation_codes");
    expect(migration).toContain("team-coach-invitation-retention-daily");
  });

  it("limits creation to lead coaches or admins and acceptance to confirmed accounts", () => {
    const create = between(
      "CREATE OR REPLACE FUNCTION public.create_team_coach_invitation",
      "CREATE OR REPLACE FUNCTION public.accept_team_coach_invitation",
    );
    expect(create).toContain("app_private.is_admin(actor_id)");
    expect(create).toContain("tsm.role = 'lead_coach'");
    expect(create).toContain("tsm.status = 'active'");
    expect(create).toContain("now() + interval '7 days'");

    const accept = between(
      "CREATE OR REPLACE FUNCTION public.accept_team_coach_invitation",
      "CREATE OR REPLACE FUNCTION public.get_coach_evidence_review_context",
    );
    expect(accept).toContain("u.email_confirmed_at IS NOT NULL");
    expect(accept).toContain("existing_athlete_account_requires_admin_review");
    expect(accept).toContain("'coach'::public.app_role");
    expect(accept).toContain("public.organization_memberships");
    expect(accept).toContain("public.team_staff_memberships");
    expect(accept).toContain("public.team_members");
    expect(accept).not.toContain("invitation_email_mismatch");
  });

  it("keeps individual coach observations separate from athlete Evidence consent", () => {
    const context = between(
      "CREATE OR REPLACE FUNCTION public.get_coach_evidence_review_context",
      "CREATE OR REPLACE FUNCTION public.save_coach_evidence_review",
    );
    expect(context).toContain("'observation_available', true");
    expect(context).toContain("'individual_observation_uses_athlete_private_content', false");
    expect(context).toContain("'external_export_includes_individual_reviews', false");

    const save = between(
      "CREATE OR REPLACE FUNCTION public.save_coach_evidence_review",
      "COMMENT ON TABLE app_private.team_coach_invitation_codes",
    );
    const individualBranch = save.slice(save.indexOf("ELSE\n    SELECT * INTO target_instance"));
    expect(individualBranch).toContain("active_team_athlete_instance_required");
    expect(individualBranch).not.toContain("target_athlete_not_evidence_eligible");
    expect(individualBranch).not.toContain("evidence_participation_eligibility");
    expect(save).toContain("all_team_athletes_must_be_evidence_eligible");
    expect(save).toContain("'uses_athlete_private_content', false");
    expect(save).toContain("'external_export_included', false");
  });

  it("keeps every public RPC fixed-search-path and authenticated-only", () => {
    for (const signature of [
      "public.create_team_coach_invitation(uuid)",
      "public.accept_team_coach_invitation(text)",
      "public.get_coach_evidence_review_context(uuid, text)",
      "public.save_coach_evidence_review(\n  text, uuid, uuid, text, integer, text, jsonb, integer\n)",
    ]) {
      expect(migration).toContain(`REVOKE ALL ON FUNCTION ${signature}`);
    }
    expect(migration.match(/SECURITY DEFINER\nSET search_path = pg_catalog/gu)?.length).toBeGreaterThanOrEqual(5);
  });
});
