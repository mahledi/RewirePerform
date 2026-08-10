import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "supabase/functions/submit-organization-access-request/index.ts"),
  "utf8",
);
const clientSource = readFileSync(
  resolve(process.cwd(), "src/pages/OrganizationAccess.tsx"),
  "utf8",
);

describe("organization inquiry edge boundary", () => {
  it("is disabled until explicitly configured and accepts only known origins", () => {
    expect(source).toContain('ORGANIZATION_INQUIRY_PUBLIC_ENABLED") !== "true"');
    expect(source).toContain('"capacitor://localhost"');
    expect(source).toContain('"https://rewireperform.com"');
    expect(source).toContain('error: "origin_not_allowed"');
  });

  it("bounds and allowlists the request before any database write", () => {
    expect(source).toContain("readBoundedRequestText(request, MAXIMUM_BODY_BYTES)");
    expect(source).toContain("Object.keys(parsed).some((key) => !ALLOWED_KEYS.has(key))");
    expect(source.indexOf("readBoundedRequestText")).toBeLessThan(
      source.indexOf('admin.rpc("submit_organization_access_request_service"'),
    );
  });

  it("fails closed behind Turnstile and a honeypot", () => {
    expect(source).toContain("verifyTurnstile(turnstileToken, remoteIp, expectedTurnstileHostname)");
    expect(source).toContain("result.hostname === expectedHostname");
    expect(source).toContain("result.action === TURNSTILE_ACTION");
    expect(source).toContain('origin === "capacitor://localhost"');
    expect(clientSource).toContain('action: "organization_access_request"');
    expect(source).toContain("parsed.website_field");
    expect(source).toContain('error: "verification_failed"');
    expect(source).toContain('throw new Error("service_not_configured")');
  });

  it("pins the public request to the approved DE scope and privacy notice", () => {
    expect(source).toContain('const ORGANIZATION_INQUIRY_PRIVACY_VERSION = "organization-inquiry-v1.1-2026-08-10"');
    expect(source).toContain('row.country_code !== "DE"');
    expect(source).toContain("row.privacy_version !== ORGANIZATION_INQUIRY_PRIVACY_VERSION");
  });

  it("requires a real team label only for the short single-team path", () => {
    expect(source).toContain('"organization_name", "organization_type", "team_name"');
    expect(source).toContain('team_name: nullableText(parsed, "team_name", 160)');
    expect(source).toContain('row.rollout_scope === "single_team" && (!row.team_name || row.team_count_band !== "1")');
    expect(source).toContain('row.rollout_scope !== "single_team" && row.team_name !== null');
    expect(clientSource).toContain('team_name: inquiryPath === "single_team" ? form.teamName.trim() : null');
  });

  it("normalizes websites and rejects active credentials or non-web protocols", () => {
    expect(source).toContain("const url = new URL(websiteInput)");
    expect(source).toContain('url.protocol !== "https:" && url.protocol !== "http:"');
    expect(source).toContain("url.username || url.password");
    expect(source).toContain('url.hash = ""');
    expect(source).toContain("website = url.toString()");
  });

  it("uses the service-only atomic RPC and returns no internal row identifier", () => {
    expect(source).toContain('admin.rpc("submit_organization_access_request_service"');
    expect(source).not.toContain('.from("organization_access_requests").insert');
    expect(source).not.toContain('.from("organization_access_request_events").insert');
    expect(source).toContain("reference_code: result.reference_code");
    expect(source).not.toMatch(/jsonResponse\(201,[\s\S]{0,120}\bid\s*:/);
  });
});
