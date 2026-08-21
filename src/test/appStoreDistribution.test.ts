import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  APP_STORE_APP_ID,
  APP_STORE_PRODUCT_URL,
  APP_STORE_SMART_BANNER_CONTENT,
} from "@/lib/appStore";

describe("public App Store distribution", () => {
  it("pins the released product and Apple's Smart App Banner metadata", () => {
    const index = readFileSync("index.html", "utf8");

    expect(APP_STORE_APP_ID).toBe("6795463263");
    expect(APP_STORE_PRODUCT_URL).toBe(
      "https://apps.apple.com/de/app/rewireperform/id6795463263",
    );
    expect(APP_STORE_SMART_BANNER_CONTENT).toBe(
      "app-id=6795463263, app-argument=https://rewireperform.com/",
    );
    expect(index).toContain(
      `<meta name="apple-itunes-app" content="${APP_STORE_SMART_BANNER_CONTENT}" />`,
    );
  });

  it("uses the same product link in the website banner and invite fallback", () => {
    const banner = readFileSync("src/components/AppStoreBanner.tsx", "utf8");
    const invite = readFileSync("src/pages/TeamInvite.tsx", "utf8");

    expect(banner).toContain("APP_STORE_PRODUCT_URL");
    expect(invite).toContain("APP_STORE_PRODUCT_URL");
    expect(banner).toContain("Capacitor.isNativePlatform()");
  });

  it("serves distinct branded previews for athlete and coach invitations", () => {
    const athletePreview = readFileSync("public/team-invite-preview.html", "utf8");
    const coachPreview = readFileSync("public/coach-invite-preview.html", "utf8");

    expect(athletePreview).toContain("Deine RewirePerform Team-Einladung");
    expect(athletePreview).toContain("Öffne RewirePerform und verbinde dich direkt mit deinem Team.");
    expect(coachPreview).toContain("Deine persönliche RewirePerform Co-Coach-Einladung");
    expect(coachPreview).toContain("Coach-Einführung");

    expect(athletePreview).toContain("https://rewireperform.com/og-team-invite.png?v=3");
    expect(coachPreview).toContain("https://rewireperform.com/og-coach-invite.png?v=3");
    for (const preview of [athletePreview, coachPreview]) {
      expect(preview).toContain('content="noindex, nofollow"');
      expect(preview).toContain('property="og:image:width" content="1200"');
      expect(preview).toContain('property="og:image:height" content="630"');
    }
  });

  it("rewrites invitation crawlers without changing normal user routes", () => {
    const vercel = JSON.parse(readFileSync("vercel.json", "utf8")) as {
      rewrites: Array<{
        source: string;
        destination: string;
        has?: Array<{ key: string; value: string }>;
      }>;
    };

    expect(vercel.rewrites.slice(0, 2)).toEqual([
      expect.objectContaining({
        source: "/join",
        destination: "/team-invite-preview.html",
        has: [
          expect.objectContaining({
            key: "user-agent",
            value: expect.stringContaining("WhatsApp"),
          }),
        ],
      }),
      expect.objectContaining({
        source: "/organization/invite",
        destination: "/coach-invite-preview.html",
        has: [
          expect.objectContaining({
            key: "user-agent",
            value: expect.stringContaining("WhatsApp"),
          }),
        ],
      }),
    ]);

    const fallback = vercel.rewrites.at(-1);
    expect(fallback?.destination).toBe("/index.html");
    expect(fallback?.source).toContain("og-invite.png");
    expect(fallback?.source).toContain("og-team-invite.png");
    expect(fallback?.source).toContain("og-coach-invite.png");
    expect(fallback?.source).toContain("team-invite-preview.html");
    expect(fallback?.source).toContain("coach-invite-preview.html");
  });
});
