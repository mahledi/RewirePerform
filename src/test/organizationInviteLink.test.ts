import { describe, expect, it } from "vitest";
import {
  buildCoachInviteUrl,
  coachInviteRoute,
  formatCoachInviteCode,
  organizationInviteRoute,
  parseOrganizationInviteUrl,
} from "@/lib/organizationInvite";

describe("personal coach invitation link", () => {
  const token = "a".repeat(64);

  it("accepts only the exact production route with one 64-character hex token", () => {
    expect(parseOrganizationInviteUrl(`https://rewireperform.com/organization/invite?token=${token}`)).toEqual({
      kind: "invite",
      inviteType: "legacy_token",
      token,
      route: `/organization/invite?token=${token}`,
    });
    expect(organizationInviteRoute(token.toUpperCase())).toBe(`/organization/invite?token=${token}`);
  });

  it.each([
    `http://rewireperform.com/organization/invite?token=${token}`,
    `https://www.rewireperform.com/organization/invite?token=${token}`,
    `https://rewireperform.com/organization/invite?token=${"a".repeat(63)}`,
    `https://rewireperform.com/organization/invite?token=${token}&redirect=https://evil.example`,
    `https://rewireperform.com/organization/invite?token=${token}#secret`,
  ])("fails closed for malformed or broadened links: %s", (url) => {
    expect(parseOrganizationInviteUrl(url).kind).not.toBe("invite");
  });

  it("builds and parses one canonical shareable Co-Coach code link", () => {
    const code = "A1B2C3D4E5F60718293A";
    expect(formatCoachInviteCode(`A1B2-C3D4 E5F6-0718-293A`)).toBe("A1B2-C3D4-E5F6-0718-293A");
    expect(coachInviteRoute(code)).toBe(`/organization/invite?coach=${code}`);
    expect(buildCoachInviteUrl(code)).toBe(`https://rewireperform.com/organization/invite?coach=${code}`);
    expect(parseOrganizationInviteUrl(`https://rewireperform.com/organization/invite?coach=${code}`)).toEqual({
      kind: "invite",
      inviteType: "coach_code",
      coachCode: code,
      route: `/organization/invite?coach=${code}`,
    });
  });

  it.each([
    "https://rewireperform.com/organization/invite?coach=A1B2C3D4E5F60718293",
    "https://rewireperform.com/organization/invite?coach=A1B2C3D4E5F60718293G",
    "https://rewireperform.com/organization/invite?coach=A1B2C3D4E5F60718293A&next=/coach",
  ])("fails closed for malformed Co-Coach links: %s", (url) => {
    expect(parseOrganizationInviteUrl(url).kind).not.toBe("invite");
  });
});
