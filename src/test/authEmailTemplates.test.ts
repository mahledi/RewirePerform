// @vitest-environment node
import { readFileSync } from "node:fs";
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
      expect(html).not.toMatch(/<img\b/i);
      expect(html).not.toMatch(/https?:\/\/(?!\{\{ \.SiteURL \}\})/i);
      expect(html).not.toMatch(/tracking|pixel|utm_/i);
      expect(html.length).toBeLessThan(20_000);
    });
  }

  it("keeps action links and fallback codes in every interactive template", () => {
    for (const filename of ["confirmation.html", "recovery.html", "invite.html", "magic_link.html", "email_change.html"]) {
      const html = readFileSync(resolve(templateRoot, filename), "utf8");
      expect(html).toContain("{{ .ConfirmationURL }}");
      expect(html).toContain("{{ .Token }}");
    }
  });

  it("keeps security notifications free of reusable action tokens", () => {
    for (const filename of ["password_changed_notification.html", "email_changed_notification.html"]) {
      const html = readFileSync(resolve(templateRoot, filename), "utf8");
      expect(html).not.toContain("{{ .ConfirmationURL }}");
      expect(html).not.toContain("{{ .Token }}");
    }
  });
});
