import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260807092005_coach_enterprise_onboarding_v1_1.sql",
  ),
  "utf8",
);

const functionBlock = (name: string, nextMarker: string) => migration.slice(
  migration.indexOf(`CREATE OR REPLACE FUNCTION ${name}`),
  migration.indexOf(nextMarker, migration.indexOf(`CREATE OR REPLACE FUNCTION ${name}`)),
);

describe("coach and enterprise onboarding V1.1 migration", () => {
  it("keeps every business table behind RLS and removes direct public grants", () => {
    for (const table of [
      "organization_access_requests",
      "organization_access_request_events",
      "organizations",
      "organization_memberships",
      "team_staff_memberships",
      "organization_invitations",
    ]) {
      expect(migration).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
      expect(migration).toMatch(
        new RegExp(`REVOKE ALL ON TABLE public\\.${table} FROM PUBLIC, anon, authenticated`),
      );
    }
  });

  it("pins public organization requests to the approved DE privacy scope", () => {
    const requestTable = migration.slice(
      migration.indexOf("CREATE TABLE public.organization_access_requests"),
      migration.indexOf("CREATE UNIQUE INDEX organization_access_requests_work_email_open_idx"),
    );
    const organizationTable = migration.slice(
      migration.indexOf("CREATE TABLE public.organizations"),
      migration.indexOf("CREATE TABLE public.organization_memberships"),
    );

    expect(requestTable).toContain("CHECK (country_code = 'DE')");
    expect(requestTable).toContain(
      "privacy_version = 'organization-inquiry-v1.1-2026-08-07'",
    );
    expect(organizationTable).toContain("CHECK (country_code = 'DE')");
  });

  it("never grants staff direct access to athlete raw data", () => {
    expect(migration).not.toContain('CREATE POLICY "Team staff read athlete assessments"');
    expect(migration).not.toContain('CREATE POLICY "Team staff read athlete checkins"');
    expect(migration).not.toContain('CREATE POLICY "Team staff read athlete profiles"');
    expect(migration).toContain("Coaches consume purpose-limited aggregate RPCs only");
  });

  it("lets athletes see only their own membership while staff see their assigned roster", () => {
    const policy = migration.slice(
      migration.indexOf('CREATE POLICY "Team staff can view team members"'),
      migration.indexOf("CREATE OR REPLACE FUNCTION public.is_coach_of_user"),
    );
    expect(policy).toContain("user_id = (select auth.uid())");
    expect(policy).toContain("app_private.has_team_staff_access");
    expect(policy).not.toContain("public.is_member_of_team(team_id)");
    expect(migration).toContain(
      'DROP POLICY IF EXISTS "Coaches can remove members" ON public.team_members',
    );
    expect(migration).toContain(
      'DROP POLICY IF EXISTS "Approved team creator can join own team" ON public.team_members',
    );
    expect(migration).toContain('CREATE POLICY "Lead coach removes team members"');
  });

  it("backfills every legacy coach creator before replacing existing coach access", () => {
    const backfillStart = migration.indexOf(
      "INSERT INTO public.team_staff_memberships(\n  team_id, user_id, role, status, created_by",
    );
    const oldPolicyDrop = migration.indexOf(
      'DROP POLICY IF EXISTS "Coaches can view team members"',
    );
    const coachFunctionReplacement = migration.indexOf(
      "CREATE OR REPLACE FUNCTION public.is_coach_of_user",
    );
    const backfill = migration.slice(backfillStart, oldPolicyDrop);

    expect(backfillStart).toBeGreaterThan(-1);
    expect(backfillStart).toBeLessThan(oldPolicyDrop);
    expect(backfillStart).toBeLessThan(coachFunctionReplacement);
    expect(backfill).toContain("FROM public.teams team");
    expect(backfill).toContain("team.created_by IS NOT NULL");
    expect(backfill).toContain(
      "public.has_role(team.created_by, 'coach'::public.app_role)",
    );
    expect(backfill).toContain("role = 'lead_coach'");
    expect(backfill).toContain("status = 'active'");
  });

  it("closes direct team self-service and requires an approved organization owner or admin", () => {
    expect(migration).toContain('DROP POLICY IF EXISTS "Approved coaches can create teams"');
    const createTeam = functionBlock(
      "public.create_organization_team",
      "REVOKE ALL ON FUNCTION public.create_organization_team",
    );
    expect(createTeam).toContain("om.role IN ('owner', 'admin')");
    expect(createTeam).toContain("o.status = 'active'");
    expect(createTeam).toContain("'lead_coach'");
    expect(createTeam).toContain("INSERT INTO public.team_members");
    expect(migration).toMatch(
      /REVOKE ALL ON FUNCTION public\.create_organization_team\(uuid, text, text\)[\s\S]*FROM PUBLIC, anon/,
    );
  });

  it("reserves team administration and co-coach invitations for lead coaches", () => {
    const helper = functionBlock(
      "app_private.can_administer_team",
      "REVOKE ALL ON FUNCTION app_private.is_admin",
    );
    expect(helper).toContain("tsm.role = 'lead_coach'");
    expect(helper).not.toContain("t.created_by = _user_id");
    expect(migration).toContain(
      'DROP POLICY IF EXISTS "Approved coaches and admins can update teams" ON public.teams',
    );
    expect(migration).toContain('CREATE POLICY "Lead coach updates assigned team"');
    const invitation = functionBlock(
      "public.create_team_staff_invitation",
      "REVOKE ALL ON FUNCTION public.create_team_staff_invitation",
    );
    expect(invitation).toContain("tsm.role = 'lead_coach'");
    expect(invitation).not.toContain("target_team.created_by = actor_id");
    expect(invitation).toContain("now() + interval '7 days'");
    expect(invitation).toContain("extensions.digest(raw_token, 'sha256')");
  });

  it("accepts invitations only for the confirmed email and never converts active athletes", () => {
    const accept = functionBlock(
      "public.accept_organization_invitation",
      "REVOKE ALL ON FUNCTION public.accept_organization_invitation",
    );
    expect(accept).toContain("u.email_confirmed_at IS NOT NULL");
    expect(accept).toContain("lower(target_invite.email) <> actor_email");
    expect(accept).toContain("admin_account_invitation_requires_review");
    for (const source of [
      "team_members",
      "questionnaire_responses",
      "program_instances",
      "daily_checkins",
      "daily_journals",
      "assessments",
      "deep_profile_assessments",
      "user_day_completion",
      "minor_auth.participant_authorizations",
    ]) {
      expect(accept).toContain(source);
    }
    expect(accept).toContain("NOT public.has_role(actor_id, 'coach'::public.app_role)");
    expect(accept).toContain("existing_athlete_account_requires_admin_review");
  });

  it("creates the request and immutable submit event atomically through service role only", () => {
    const submission = functionBlock(
      "public.submit_organization_access_request_service",
      "REVOKE ALL ON FUNCTION public.submit_organization_access_request_service",
    );
    expect(submission).toContain("INSERT INTO public.organization_access_requests");
    expect(submission).toContain("INSERT INTO public.organization_access_request_events");
    expect(migration).toMatch(
      /REVOKE ALL ON FUNCTION public\.submit_organization_access_request_service\(jsonb\)[\s\S]*FROM PUBLIC, anon, authenticated/,
    );
    expect(migration).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.submit_organization_access_request_service\(jsonb\)[\s\S]*TO service_role/,
    );
  });

  it("keeps the machine-readable business view private and activation closed", () => {
    expect(migration).toContain("app_private.organization_inquiry_machine_read_v1");
    expect(migration).toMatch(
      /REVOKE ALL ON app_private\.organization_inquiry_machine_read_v1[\s\S]*FROM PUBLIC, anon, authenticated, service_role/,
    );
    expect(migration).not.toMatch(/GRANT SELECT ON app_private\.organization_inquiry_machine_read_v1/i);
  });

  it("selects a sole owner's successor deterministically inside account deletion", () => {
    const successor = functionBlock(
      "app_private.assign_organization_successor_on_user_delete",
      "REVOKE ALL ON FUNCTION app_private.assign_organization_successor_on_user_delete",
    );

    expect(successor).toContain("FOR UPDATE OF o, deleting_membership");
    expect(successor).toContain("membership.role IN ('admin', 'coach')");
    expect(successor).toContain("staff.role IN ('lead_coach', 'co_coach')");
    expect(successor).toContain("platform_admin.role = 'admin'::public.app_role");
    expect(successor).toContain("candidate.joined_at NULLS LAST");
    expect(successor).toContain("candidate.user_id");
    expect(successor).toContain("ON CONFLICT (organization_id, user_id) DO UPDATE");
    expect(successor).toContain("SET role = 'owner', status = 'active'");
    expect(successor).toContain("organization_owner_successor_unavailable");
    expect(migration).toContain("BEFORE DELETE ON auth.users");
    expect(migration).toMatch(
      /REVOKE ALL ON FUNCTION app_private\.assign_organization_successor_on_user_delete\(\)[\s\S]*FROM PUBLIC, anon, authenticated, service_role/,
    );
  });
});
