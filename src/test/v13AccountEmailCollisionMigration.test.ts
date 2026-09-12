import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260828102434_v1_3_account_email_collision_guards.sql"),
  "utf8",
);

describe("V1.3 account email collision migration", () => {
  it("keeps all identity decisions behind an authenticated admin gate", () => {
    expect(migration).toContain("prepare_organization_access_invitation_v1_3");
    expect(migration).toContain("app_private.is_admin(actor_id)");
    expect(migration).toContain("coach_email_is_active_athlete");
    expect(migration).toContain("'athlete'::public.app_role");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.prepare_organization_access_invitation_v1_3");
    expect(migration).toContain("FROM PUBLIC, anon");
  });

  it("updates the bound Coach email and approval in one transaction with an audit event", () => {
    expect(migration.startsWith("BEGIN;\n")).toBe(true);
    expect(migration.trimEnd().endsWith("COMMIT;")).toBe(true);
    expect(migration).toContain("'login_email_changed'");
    expect(migration).toContain("previous_email");
    expect(migration).toContain("public.approve_organization_access_request(");
  });

  it("exposes only a masked hint for possession of a valid invitation token", () => {
    expect(migration).toContain("get_organization_invitation_email_hint");
    expect(migration).toContain("invitation.token_digest = encode(extensions.digest(_token, 'sha256'), 'hex')");
    expect(migration).toContain("AND invitation.status = 'pending'");
    expect(migration).toContain("repeat('*'");
    expect(migration).not.toContain("GRANT SELECT ON TABLE auth.users");
  });

  it("can atomically replace one open invitation without reusing its delivery identity", () => {
    expect(migration).toContain("reissue_organization_access_invitation_v1_3");
    expect(migration).toContain("SET status = 'revoked'");
    expect(migration).toContain("'invitation_reissued'");
    expect(migration).toContain("replacement_invitation_id");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.reissue_organization_access_invitation_v1_3");
  });
});
