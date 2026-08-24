import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PROGRAM_V11_DRAFTS, getProgramDayDraft } from "@/content/programV11";
import { resolveDay } from "@/lib/getDayContent";

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const visibleStrings = (value: unknown): string[] => {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(visibleStrings);
  if (value && typeof value === "object") return Object.values(value).flatMap(visibleStrings);
  return [];
};

describe("V1.1 production content contract", () => {
  it("uses the same 56-day source for preview and production resolution", () => {
    expect(PROGRAM_V11_DRAFTS).toHaveLength(56);
    for (let day = 1; day <= 56; day += 1) {
      const draft = getProgramDayDraft(day);
      expect(draft).not.toBeNull();
      for (const context of ["training", "rest", "competition"] as const) {
        const resolvedDay = resolveDay(day, new Date("2026-08-06T12:00:00"), context);
        expect(resolvedDay?.content.title).toBe(draft?.title);
        expect(resolvedDay?.content.selfTalkAnchors[0]?.text).toBe(draft?.cue);
        expect(resolvedDay?.content.tasks).toHaveLength(1);
        expect(resolvedDay?.content.comprehensionPool).toHaveLength(1);
      }
    }

    const preview = readSource("src/pages/ProgramContentPreview.tsx");
    const resolver = readSource("src/lib/getDayContent.ts");
    expect(preview).toContain("PROGRAM_V11_DRAFTS");
    expect(resolver).toContain("getProgramV11ResolvedContent");
  });

  it("keeps the approved everyday-language contract in every production context", () => {
    const blockedEditorialTerms = /Werkzeug|\bCue(?:s)?\b|inner\w* Kampf|Aufgabenwert|Lernnutzen|Aufgabenqualität|Wertbeweis|Gedankenfreiheit|Blicköffner|Streuung/iu;
    const brokenReactionGrammar = /\b(?:ein|einen|einem|eines|das|dieses|jedes|welches|kein|keinen|keinem) (?:passendes?|bekanntes?)? ?Reaktion\b/iu;

    for (let day = 1; day <= 56; day += 1) {
      for (const context of ["training", "rest", "competition"] as const) {
        const resolvedDay = resolveDay(day, new Date("2026-08-24T12:00:00"), context);
        const athleteCopy = visibleStrings({
          content: resolvedDay?.content,
          context: resolvedDay?.context,
        }).join(" ");

        expect(athleteCopy, `Tag ${day}/${context} contains editorial jargon`).not.toMatch(blockedEditorialTerms);
        expect(athleteCopy, `Tag ${day}/${context} contains broken reaction grammar`).not.toMatch(brokenReactionGrammar);
      }
    }
  });

  it("keeps the ten-question pulse and removes score-driven content personalization", () => {
    const checkin = readSource("src/components/dashboard/DailyCheckin.tsx");
    for (const pulseId of [
      "mood", "energy", "focus", "stress", "recovery", "sleep", "physical", "motivation", "pressure", "team",
    ]) {
      expect(checkin).toContain(`id: "${pulseId}"`);
    }
    expect(checkin).toContain("RestDayMission");
    expect(checkin).not.toContain("TodayForYou");
    expect(checkin).not.toContain("questionnaire_responses");
    expect(checkin).not.toContain("buildMicroAdjustmentContext");
  });

  it("keeps Journal drafts, persistence and voice while showing one step at a time", () => {
    const journal = readSource("src/pages/Journal.tsx");
    expect(journal).toContain('from("daily_journals")');
    expect(journal).toContain("writeLocalDraft");
    expect(journal).toContain("VoiceInput");
    expect(journal).toContain("safeJournalStep");
    expect(journal).toContain("gratitudeMinWords");
    expect(journal).toContain("allQuestionsReady");
    expect(journal).toContain("freeReflection");
    expect(journal).not.toContain("GRATITUDE_COUNT");
  });

  it("uses active recall before revealing the fixed sentence in Pre-Training", () => {
    const preTraining = readSource("src/pages/PreTraining.tsx");
    expect(preTraining).toContain("recallPrompt");
    expect(preTraining).toContain("Erinnerung prüfen");
    expect(preTraining).toContain("resolved.content.preTraining.reveal");
    expect(preTraining).toContain("disabled={Boolean(resolved.content.preTraining) && !revealed}");
    expect(preTraining).not.toContain("resolved.content.tasks.map");
  });

  it("opens a rest reminder in the visualization and closes directly without a comprehension check", () => {
    const router = readSource("src/components/notifications/NativeNotificationRouter.tsx");
    const dashboard = readSource("src/pages/Dashboard.tsx");
    const checkin = readSource("src/components/dashboard/DailyCheckin.tsx");

    expect(router).toContain("createRestVisualizationNavigationState");
    expect(dashboard).toContain('setCheckinInitialFocus("rest-visualization")');
    expect(dashboard).toContain("initialFocus={checkinInitialFocus}");
    expect(checkin).toContain('initialFocus === "rest-visualization" ? 3 : 0');
    expect(checkin).toContain("handleRestVisualizationComplete");
    expect(checkin).toContain("saveCheckin(undefined, completedTaskIds)");
    expect(checkin).toContain('{ step: 3, title: "Visualisierung" }');
    expect(checkin).toContain("const flowStageCount = flowStages.length");
    expect(checkin).not.toContain('if (initialFocus === "rest-visualization") setStep(4)');
    expect(checkin).not.toContain('if (initialFocus === "rest-visualization") onClose()');
    expect(checkin).not.toContain('navigate("/journal")');
  });
});
