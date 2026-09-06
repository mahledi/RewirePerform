// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type TemplateManifest = {
  sender_email: string;
  templates: Record<string, { dashboard_template: string; subject: string; enabled: boolean }>;
};

const templateRoot = resolve(process.cwd(), "supabase/templates/auth");
const manifest = JSON.parse(readFileSync(resolve(templateRoot, "manifest.json"), "utf8")) as TemplateManifest;

describe("Supabase auth email templates", () => {
  it("uses the verified transactional sender", () => {
    expect(manifest.sender_email).toBe("no-reply@auth.rewireperform.com");
  });

  for (const [filename, config] of Object.entries(manifest.templates)) {
    it(`${filename} is self-contained, German and privacy-safe`, () => {
      const html = readFileSync(resolve(templateRoot, filename), "utf8");
      expect(config.subject.length).toBeGreaterThan(10);
      expect(html).toContain('<html lang="de">');
      expect(html).toContain("RewirePerform");
      expect(html).toContain("{{ .SiteURL }}/support");
      expect(html.match(/<img\b/gi)).toHaveLength(1);
      expect(html).toContain('src="{{ .SiteURL }}/brand/rewireperform-email-dark-256.png"');
      expect(html).toContain('alt="" width="44" height="44"');
      expect(html).not.toMatch(/https?:\/\/(?!\{\{ \.SiteURL \}\})/i);
      expect(html).not.toMatch(/tracking|pixel|utm_/i);
      expect(html.length).toBeLessThan(20_000);
    });
  }

  it("keeps action links and fallback codes in the two interactive templates", () => {
    for (const filename of ["confirmation.html", "recovery.html"]) {
      const html = readFileSync(resolve(templateRoot, filename), "utf8");
      expect(html).toContain('href="{{ .SiteURL }}/auth/confirm?confirmation_url={{ .ConfirmationURL }}"');
      expect(html).toContain("{{ .Token }}");
      expect(html).not.toContain('href="{{ .ConfirmationURL }}"');
    }
  });

  it("keeps the password-change notification free of reusable action tokens", () => {
    const html = readFileSync(resolve(templateRoot, "password_changed_notification.html"), "utf8");
    expect(html).not.toContain("{{ .ConfirmationURL }}");
    expect(html).not.toContain("{{ .Token }}");
  });

  it("contains exactly the three approved launch templates", () => {
    expect(Object.keys(manifest.templates).sort()).toEqual([
      "confirmation.html",
      "password_changed_notification.html",
      "recovery.html",
    ]);
    expect(readdirSync(templateRoot).sort()).toEqual([
      "confirmation.html",
      "manifest.json",
      "password_changed_notification.html",
      "recovery.html",
    ]);
  });
});
