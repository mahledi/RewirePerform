import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("native universal links contract", () => {
  it("binds auth confirmations and validated athlete or coach invitations to the signed iOS app", () => {
    const association = JSON.parse(
      read("public/.well-known/apple-app-site-association"),
    ) as {
      applinks: {
        details: Array<{
          appIDs: string[];
          components: Array<Record<string, unknown>>;
        }>;
      };
    };
    const detail = association.applinks.details[0];

    expect(detail.appIDs).toEqual(["F7A976G38N.com.rewireperform.app"]);
    expect(detail.components).toEqual([
      {
        "/": "/auth",
        "?": { flow: "signup" },
        comment: "RewirePerform signup confirmation only",
      },
      {
        "/": "/auth/reset-password",
        "?": { flow: "recovery" },
        comment: "RewirePerform password recovery confirmation",
      },
      {
        "/": "/join",
        "?": { team: "??????" },
        comment: "RewirePerform athlete team invitation",
      },
      {
        "/": "/organization/invite",
        "?": { token: "?".repeat(64) },
        comment: "RewirePerform legacy email-bound coach invitation",
      },
      {
        "/": "/organization/invite",
        "?": { coach: "?".repeat(20) },
        comment: "RewirePerform shareable Co-Coach invitation",
      },
    ]);
  });

  it("keeps the website file directly reachable and the iOS entitlement aligned", () => {
    const hosting = read("vercel.json");
    const entitlements = read("ios/App/App/App.entitlements");
    const project = read("ios/App/App.xcodeproj/project.pbxproj");

    expect(hosting).toContain("/.well-known/apple-app-site-association");
    expect(hosting).toContain('"Content-Type"');
    expect(hosting).toContain('"application/json"');
    expect(entitlements).toContain("<string>applinks:rewireperform.com</string>");
    expect(project).toContain("CODE_SIGN_ENTITLEMENTS = App/App.entitlements;");
    expect(project).toContain("com.apple.AssociatedDomains");
  });
});
