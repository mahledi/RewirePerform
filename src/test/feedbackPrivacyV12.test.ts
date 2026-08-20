import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const privacy = readFileSync(resolve(process.cwd(), "src/pages/Privacy.tsx"), "utf8");
const consent = readFileSync(resolve(process.cwd(), "src/content/feedbackTextConsentV12.ts"), "utf8");
const guardian = readFileSync(resolve(process.cwd(), "src/content/guardianFeedbackTextPolicyV12.ts"), "utf8");

describe("V1.2 Feedback Intelligence privacy contract", () => {
  it("keeps V1.1 closed while disclosing the separately gated V1.2 path", () => {
    expect(privacy).toContain("isFeedbackIntelligenceClientEnabled() && isFeedbackTextClientEnabled()");
    expect(privacy).toContain("Feedback Intelligence ist nicht Teil dieser V1.1-Auslieferung");
    expect(privacy).toContain("Feedback Intelligence ist freiwillig und klar getrennt");
    expect(privacy).toContain("Tag 10, 24, 39 und 55");
  });

  it("names every material V1.2 text boundary", () => {
    for (const text of [
      "zusätzlichen ausdrücklichen Einwilligung",
      "jederzeit ohne Nachteil widerrufbar",
      "höchstens 365 Tage",
      "Kein externer KI-Anbieter",
      "Journale, private Reflexionen, Supporttexte sowie Team- und Coach-IDs bleiben ausgeschlossen",
      "Dein Coach sieht keine Einzelantworten",
    ]) {
      expect(privacy).toContain(text);
    }
  });

  it("keeps the athlete and guardian consent documents aligned", () => {
    expect(consent).toContain("product-improvement-internal-admin-review-v1");
    expect(consent).toContain("feedback-text-consent-v1.2.0");
    for (const source of [consent, guardian]) {
      expect(source).toMatch(/externe KI-Anbieter erhalten/i);
      expect(source).toMatch(/nur lesenden Admin-Ansicht/i);
    }
    expect(guardian).toContain("FEEDBACK_TEXT_CONSENT_SCOPE_V12");
    expect(guardian).toContain("FEEDBACK_TEXT_CONSENT_VERSION_V12");
    expect(guardian).toContain("RETENTION_DAYS_V12 = 365");
    expect(guardian).toContain("Die Entscheidung ist freiwillig");
  });
});
