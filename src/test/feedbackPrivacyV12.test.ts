import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const privacy = readFileSync(resolve(process.cwd(), "src/pages/Privacy.tsx"), "utf8");
const consent = readFileSync(resolve(process.cwd(), "src/content/feedbackTextConsentV12.ts"), "utf8");
const guardian = readFileSync(resolve(process.cwd(), "src/content/guardianFeedbackTextPolicyV12.ts"), "utf8");
const jarvisControllerSupplement = readFileSync(resolve(
  process.cwd(),
  "docs/V1_2_STRUCTURED_JARVIS_CONTROLLER_SUPPLEMENT_2026-08-24.md",
), "utf8");
const appStoreJarvisDelta = readFileSync(resolve(
  process.cwd(),
  "docs/APP_STORE_CONNECT_V1_2_STRUCTURED_JARVIS_DELTA_2026-08-24.md",
), "utf8");
const historicalAppStoreDraft = readFileSync(resolve(
  process.cwd(),
  "docs/feedback-intelligence/APP_STORE_PRIVACY_DRAFT.md",
), "utf8");
const controllerAssessment = readFileSync(resolve(
  process.cwd(),
  "docs/V1_2_FEEDBACK_CONTROLLER_ASSESSMENT_2026-08-21.md",
), "utf8");

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
      "nicht zum Trainieren eines KI-Modells",
      "pseudonymisierte Einzelzeilen nur vorübergehend im Arbeitsspeicher",
      "Gruppenzusammenfassungen pro Frage ab mindestens fünf unterschiedlichen Teilnehmenden",
      "weder im Ergebnis ausgegeben noch dauerhaft gespeichert",
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

  it("keeps the controller and App Store structured-only Jarvis boundary aligned", () => {
    for (const source of [jarvisControllerSupplement, appStoreJarvisDelta]) {
      expect(source).toMatch(/Namen, E-Mail-Adressen[\s\S]*direkte[n]? Nutzerkennungen/i);
      expect(source).toMatch(/mindestens fünf/i);
      expect(source).toMatch(/nicht.*Train(ing|ieren).*KI-Modell/is);
      expect(source).toMatch(/(keine automatisierte[n]? (Einzel)?entscheidung|Automatisierte Einzelentscheidung\/Profiling:\*\* Nein)/i);
      expect(source).toMatch(/Kommentare[\s\S]*(nicht an (Jarvis|das Auswertungssystem)|Jarvis erhält sie nicht)/i);
    }
    expect(jarvisControllerSupplement).toContain("Guardian- und");
    expect(appStoreJarvisDelta).toContain("Product Interaction");
    expect(appStoreJarvisDelta).toContain("Other User Content");
  });

  it("marks the earlier raw-text and no-Jarvis drafts as superseded for V1.2", () => {
    expect(historicalAppStoreDraft).toContain("Historischer Entwurf – nicht für V1.2 übernehmen");
    expect(historicalAppStoreDraft).toContain("strukturierte Datenweg ohne Freitext");
    expect(controllerAssessment).toContain("Versionierter Nachtrag");
    expect(controllerAssessment).toContain("Freitext bleibt vollständig ausgeschlossen");
  });
});
