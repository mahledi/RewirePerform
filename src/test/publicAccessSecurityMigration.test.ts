import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260723101114_harden_public_coach_access.sql",
  ),
  "utf8",
);
const teamJoinAuthorizationMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260801104717_harden_team_join_minor_authorization.sql",
  ),
  "utf8",
);

const joinFunction = migration.slice(
  migration.indexOf("CREATE OR REPLACE FUNCTION public.join_team_by_code"),
  migration.indexOf("COMMENT ON FUNCTION public.join_team_by_code"),
);

describe("public access hardening migration", () => {
  it("forces every new auth account to start as an athlete", () => {
    const roleTrigger = migration.slice(
      migration.indexOf("CREATE OR REPLACE FUNCTION public.handle_new_user_role"),
      migration.indexOf("REVOKE ALL ON FUNCTION public.handle_new_user_role"),
    );

    expect(roleTrigger).toContain("'athlete'::public.app_role");
    expect(roleTrigger).not.toContain("raw_user_meta_data");
    expect(migration).toMatch(
      /REVOKE ALL ON FUNCTION public\.handle_new_user_role\(\)[\s\S]*FROM PUBLIC, anon, authenticated/,
    );
  });

  it("makes public team joining athlete-only and never changes roles", () => {
    expect(joinFunction).toContain("t.access_code = normalized_code");
    expect(joinFunction).not.toContain("coach_access_code");
    expect(joinFunction).not.toMatch(/DELETE FROM public\.user_roles/i);
    expect(joinFunction).not.toMatch(/INSERT INTO public\.user_roles/i);
    expect(joinFunction).toContain("'athlete_account_required'");
    expect(joinFunction).toContain("'role', 'athlete'");
  });

  it("keeps team membership fail-closed until product authorization is active", () => {
    const hardenedJoin = teamJoinAuthorizationMigration.slice(
      teamJoinAuthorizationMigration.indexOf("CREATE OR REPLACE FUNCTION public.join_team_by_code"),
      teamJoinAuthorizationMigration.indexOf("REVOKE ALL ON FUNCTION public.join_team_by_code"),
    );

    expect(hardenedJoin).toContain("minor_auth.participant_authorizations pa");
    expect(hardenedJoin).toContain("minor_auth.policy_versions pv");
    expect(hardenedJoin).toContain("pa.product_status = 'authorized'");
    expect(hardenedJoin).toContain("pa.revoked_at IS NULL");
    expect(hardenedJoin).toContain("pv.status = 'active'");
    expect(hardenedJoin).toContain("FOR SHARE OF pa");
    expect(hardenedJoin).toContain("'minor_product_authorization_required'");
    expect(hardenedJoin.indexOf("minor_auth.participant_authorizations pa")).toBeLessThan(
      hardenedJoin.indexOf("INSERT INTO public.team_members"),
    );
    expect(teamJoinAuthorizationMigration).toMatch(
      /REVOKE ALL ON FUNCTION public\.join_team_by_code\(text\)[\s\S]*FROM PUBLIC, anon/,
    );
  });

  it("requires an approved coach or admin role for direct team creation", () => {
    expect(migration).toContain('CREATE POLICY "Approved coaches can create teams"');
    expect(migration).toMatch(
      /created_by = auth\.uid\(\)[\s\S]*has_role\(auth\.uid\(\), 'coach'::public\.app_role\)/,
    );
  });

  it("limits coach approval to admins and records an atomic team assignment", () => {
    const approvalFunction = migration.slice(
      migration.indexOf("CREATE OR REPLACE FUNCTION public.approve_coach_access"),
      migration.indexOf("COMMENT ON FUNCTION public.approve_coach_access"),
    );

    expect(approvalFunction).toContain("'admin'::public.app_role");
    expect(approvalFunction).toContain("target_email_not_confirmed");
    expect(approvalFunction).toContain("team_already_has_different_coach");
    expect(approvalFunction).toMatch(
      /UPDATE public\.teams t[\s\S]*SET created_by = _user_id/,
    );
    expect(approvalFunction).toContain("INSERT INTO public.team_members");
    expect(approvalFunction).toContain("INSERT INTO public.coach_access_audit");
    expect(migration).toMatch(
      /REVOKE ALL ON FUNCTION public\.approve_coach_access\(uuid, uuid, text, text\)[\s\S]*FROM PUBLIC, anon/,
    );
  });

  it("stores no email address or free-text reason in the audit table", () => {
    const auditTable = migration.slice(
      migration.indexOf("CREATE TABLE public.coach_access_audit"),
      migration.indexOf("CREATE INDEX coach_access_audit_target_user_idx"),
    );

    expect(auditTable).not.toMatch(/\bemail\b/i);
    expect(auditTable).not.toMatch(/\breason\b/i);
    expect(auditTable).not.toMatch(/\bnote\b/i);
  });
});
