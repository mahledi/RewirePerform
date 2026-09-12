import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const privacy = readFileSync(resolve(process.cwd(), "src/pages/Privacy.tsx"), "utf8");
const inventory = readFileSync(
  resolve(process.cwd(), "docs/CURRENT_DATA_PROCESSING_INVENTORY_2026-09-08.md"),
  "utf8",
);

describe("actual data processing transparency", () => {
  it("names all ten daily check-in dimensions", () => {
    for (const label of [
      "Stimmung",
      "Energie",
      "mentale Klarheit beziehungsweise Fokus",
      "Stress beziehungsweise innere Spannung",
      "Erholung",
      "Schlafqualität",
      "körperliche Bereitschaft",
      "Bereitschaft beziehungsweise Motivation",
      "Leistungsdruck",
      "Verbindung zum sportlichen Umfeld",
    ]) {
      expect(privacy).toContain(label);
    }
  });

  it("keeps coach observations outside current evidence and AI processing", () => {
    expect(privacy).toContain(
      "Sie gehören derzeit nicht zur Pilot-Auswertung und werden nicht an Jarvis oder in externe Auswertungs-Exporte übermittelt.",
    );
    expect(privacy).toContain("strukturierte Team- oder Einzelbeobachtungen von Trainern");
    expect(privacy).toContain("Structured team or individual coach observations");
    expect(inventory).toContain("Derzeit aus Pilot-, Jarvis- und externen Auswertungen ausgeschlossen; V4 erforderlich");
  });

  it("separates direct support feedback from Feedback Intelligence", () => {
    expect(privacy).toContain("Direkte Support- und Feedbacknachrichten:");
    expect(privacy).toContain("nicht mit Feedback Intelligence vermischt und nicht an Jarvis übermittelt");
    expect(inventory).toContain("Nicht mit Feedback Intelligence mischen; kein Jarvis-Zugriff");
  });

  it("states the currently inactive expansion paths", () => {
    for (const boundary of [
      "keine vollständige longitudinale Verbindung aller Quellen",
      "keine Push-Empfang-zu-Check-in-Verhaltensanalyse",
      "keine externen Match-, Veo-, Wearable- oder Fitnessdaten",
      "keine Journal-, Reflexions- oder sonstige private Freitextanalyse",
    ]) {
      expect(inventory).toContain(boundary);
    }
  });
});
