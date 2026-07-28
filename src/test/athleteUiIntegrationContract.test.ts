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

  it("uses one responsive athlete shell instead of a phone-width tablet column", () => {
    const chrome = readSource("src/components/app/AthleteAppChrome.tsx");
    expect(chrome).toContain("max-w-4xl");
    expect(chrome).toContain("md:px-8");
    expect(chrome).not.toContain("max-w-[560px]");
    expect(chrome).toContain("visualActive");
    expect(chrome).toContain("setVisualActive(section.id)");
    expect(chrome).toContain('prefers-reduced-motion: reduce');
  });

  it("keeps the start focused and renders Plan from real calendar data", () => {
    const dashboard = readSource("src/pages/Dashboard.tsx");
    expect(dashboard).not.toContain("import FlameCard");
    expect(dashboard).not.toContain("<FlameCard");
    expect(dashboard).toContain("selectedPlanEvents = getEventsForDate(planSelectedDate)");
    expect(dashboard).toContain("upcomingPlanEvents = [...events]");
    expect(dashboard).toContain("<PlanTimelineRow");
    expect(dashboard).toContain("Monatsübersicht");
    expect(dashboard).toContain("dashboardSection === \"plan\"");
    expect(dashboard).toContain("selectedIsToday && selectedDateHasProgram && selectedPrimaryEventType");
    expect(dashboard).not.toContain("onClick={() => selectedPrimaryEventType && setShowCheckin(true)}");
  });

  it("shows athlete development as real program effort without assessment scores", () => {
    const progress = readSource("src/pages/Progress.tsx");
    expect(progress).toContain('from("user_day_completion")');
    expect(progress).toContain('from("program_progress_snapshots")');
    expect(progress).toContain("buildFlameStats");
    expect(progress).toContain("<FlameProgressGrid");
    expect(progress).toContain("getAthleteProgressCache");
    expect(progress).toContain('aria-busy="true"');
    expect(progress).toContain('<AthleteBottomNavigation active="progress" />');
    expect(progress).toContain("Aktive Tage");
    expect(progress).toContain("Dein 56‑Tage‑Weg");
    expect(progress).not.toContain("scoreDevelopmentIndex");
    expect(progress).not.toContain("deep_profile_assessments");
    expect(progress).not.toContain("Antworten im Detail");
    expect(progress).not.toContain("Interner Entwicklungsindex");
    expect(progress).not.toContain("baselineScore.subscores");
    expect(progress).not.toContain("Entwicklung wird geladen");

    const dashboard = readSource("src/pages/Dashboard.tsx");
    expect(dashboard).not.toContain("Dein Fortschritt (Deep Dive)");
  });
});
