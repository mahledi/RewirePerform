import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("V1 athlete UI integration contract", () => {
  it("keeps protected athlete routes behind their existing authorization gates", () => {
    const app = readSource("src/App.tsx");
    for (const route of ["/dashboard", "/progress", "/journal", "/journal/history", "/pre-training"]) {
      const routeIndex = app.indexOf(`path="${route}"`);
      expect(routeIndex, `${route} route exists`).toBeGreaterThan(-1);
      const routeBlock = app.slice(routeIndex, routeIndex + 220);
      expect(routeBlock).toContain("<ProtectedRoute>");
      expect(routeBlock).toContain("<MinorAuthorizationGate>");
    }
  });

  it("keeps the complete DailyCheckin data, draft and comprehension flow", () => {
    const dailyCheckin = readSource("src/components/dashboard/DailyCheckin.tsx");
    for (const pulseId of [
      "mood",
      "energy",
      "focus",
      "stress",
      "recovery",
      "sleep",
      "physical",
      "motivation",
      "pressure",
      "team",
    ]) {
      expect(dailyCheckin).toContain(`id: "${pulseId}"`);
    }
    expect(dailyCheckin).toContain("saveDailyTracking");
    expect(dailyCheckin).toContain("readLocalDraft");
    expect(dailyCheckin).toContain("writeLocalDraft");
    expect(dailyCheckin).toContain("<ComprehensionCheck");
    expect(dailyCheckin).toContain("tasks.every");
  });

  it("keeps real Journal persistence, voice and private history", () => {
    const journal = readSource("src/pages/Journal.tsx");
    const history = readSource("src/pages/JournalHistory.tsx");
    expect(journal).toContain('from("daily_journals")');
    expect(journal).toContain("<VoiceInput");
    expect(journal).toContain("writeLocalDraft");
    expect(history).toContain('from("daily_journals")');
    expect(history).toContain("Coaches sehen keine Inhalte");
  });

  it("does not ship the synthetic UI preview as a production route", () => {
    const app = readSource("src/App.tsx");
    expect(app).not.toContain("UiExperiencePreview");
    expect(app).not.toContain("/internal/ui-preview");
  });
});
