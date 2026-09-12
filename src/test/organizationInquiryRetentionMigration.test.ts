import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260810091629_organization_inquiry_retention_v1_1.sql",
  ),
  "utf8",
);

describe("organization inquiry retention migration", () => {
  it("purges only declined or withdrawn requests after the twelve-month maximum", () => {
    expect(migration).toContain("status IN ('declined', 'withdrawn')");
    expect(migration).toContain("updated_at < now() - interval '365 days'");
    expect(migration).not.toMatch(/status\s+IN\s*\([^)]*approved/i);
    expect(migration).not.toMatch(/status\s*=\s*'activated'/i);
    expect(migration).toContain("organization-inquiry-retention-daily");
  });

  it("keeps automatic cleanup private and scheduled inside Postgres", () => {
    expect(migration).toContain("app_private.cleanup_expired_organization_access_requests");
    expect(migration).toMatch(
      /REVOKE ALL ON FUNCTION app_private\.cleanup_expired_organization_access_requests\(\)[\s\S]*FROM PUBLIC, anon, authenticated, service_role/,
    );
    expect(migration).toContain("SELECT cron.schedule(");
  });

  it("requires an admin and exact destructive confirmation for immediate fake/spam deletion", () => {
    expect(migration).toContain("NOT app_private.is_admin(actor_id)");
    expect(migration).toContain("_confirmation <> 'DELETE_FAKE_OR_SPAM'");
    expect(migration).toContain("active_or_approved_request_cannot_be_purged");
    expect(migration).toMatch(
      /REVOKE ALL ON FUNCTION public\.delete_organization_access_request_spam\(uuid, text\)[\s\S]*FROM PUBLIC, anon, service_role/,
    );
    expect(migration).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.delete_organization_access_request_spam\(uuid, text\)[\s\S]*TO authenticated/,
    );
  });

  it("deletes the request row so dependent request events cascade", () => {
    expect(migration).toContain("DELETE FROM public.organization_access_requests");
    expect(migration).not.toContain("DELETE FROM public.organizations");
    expect(migration).not.toContain("DELETE FROM public.teams");
  });
});
