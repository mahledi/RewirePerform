import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "supabase/functions/send-organization-access-invitation/index.ts"),
  "utf8",
);
const privacy = readFileSync(resolve(process.cwd(), "src/pages/Privacy.tsx"), "utf8");

describe("organization invitation delivery contract", () => {
  it("accepts delivery only from an authenticated founder admin", () => {
    expect(source).toContain("admin.auth.getUser(token)");
    expect(source).toContain('.eq("role", "admin")');
    expect(source).toContain('return response(403, { error: "admin_required" }');
  });

  it("sends only a pending invitation to its bound email address", () => {
    expect(source).toContain('.eq("token_digest", await digest(invitationToken))');
    expect(source).toContain('invitation.status !== "pending"');
    expect(source).toContain("invitation.expires_at <= new Date().toISOString()");
    expect(source).toContain("invitation_email_mismatch");
  });

  it("uses a dedicated transactional sender and an idempotent provider request", () => {
    expect(source).toContain('"ORGANIZATION_INVITATION_EMAIL_FROM"');
    expect(source).toContain('"RESEND_API_KEY"');
    expect(source).toContain('"Idempotency-Key"');
    expect(source).toContain("organization-invitation-${invitation.id}");
  });

  it("keeps the current Coach-email disclosure separate from historical feedback consent", () => {
    expect(privacy).toContain("nach persönlicher Freigabe versendete Coach-Zugänge");
    expect(privacy).toContain("einmaligen persönlichen Zugangslinks");
    expect(privacy).toContain("an diese E-Mail-Adresse gebunden, einmalig und sieben Tage gültig");
    expect(privacy).toContain("Öffnungs- und Link-Tracking werden für diesen Versand nicht genutzt");
    expect(source).not.toContain("jarvis");

    const result = spawnSync(
      process.execPath,
      ["scripts/generate-coach-invitation-privacy-delta-v1-1.mjs", "--check"],
      { cwd: process.cwd(), encoding: "utf8" },
    );
    expect(result.status, result.stderr || result.stdout).toBe(0);
  });
});
