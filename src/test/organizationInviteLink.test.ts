import { describe, expect, it } from "vitest";
import {
  organizationInviteRoute,
  parseOrganizationInviteUrl,
} from "@/lib/organizationInvite";

describe("personal coach invitation link", () => {
  const token = "a".repeat(64);

  it("accepts only the exact production route with one 64-character hex token", () => {
    expect(parseOrganizationInviteUrl(`https://rewireperform.com/organization/invite?token=${token}`)).toEqual({
      kind: "invite",
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
});
