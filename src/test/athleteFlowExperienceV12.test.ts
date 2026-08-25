import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("V1.2 athlete flow experience contract", () => {
  it("uses one reduced-motion-aware scene contract across the sequential athlete flows", () => {
    const scene = readSource("src/components/app/AthleteFlowScene.tsx");
    const daily = readSource("src/components/dashboard/DailyCheckin.tsx");
    const journal = readSource("src/pages/Journal.tsx");
    const preTraining = readSource("src/pages/PreTraining.tsx");

    expect(scene).toContain("useReducedMotion");
    expect(scene).toContain("y: 14");
    expect(scene).toContain("scale: 0.992");
    expect(scene).toContain("y: -10");
    expect(scene).toContain('ease: "easeOut"');
    expect(scene).toContain("circle_at_50%_-8%");
    expect(scene).toContain("linear-gradient(90deg,#2EAD89,#62C6A8)");
    expect(scene).toContain("pressScale = 0.99");
    expect(scene).toContain("pressScale?: number");
    expect(scene).toContain("border-primary/55 bg-primary/[0.11]");
    expect(scene).toContain("athleteFlowStageSurface");
    expect(scene).toContain("circle_at_0%_46%");
    for (const source of [daily, journal, preTraining]) {
      expect(source).toContain("AthleteFlowScene");
      expect(source).toContain("AthleteFlowAmbient");
    }
    expect(daily).toContain('<AnimatePresence mode="wait" initial={false}>');
    expect(daily).toContain('key={selectedTask ? `selected-${selectedTask.id}` : `daily-step-${step}`}');
    expect(daily).toContain('testId="daily-active-scene"');
    expect(daily).toContain("title={config.label}");
    expect(daily).not.toContain('eyebrow={`Daily Flow · ${config.label}`}');
    expect(journal).toContain('<AnimatePresence mode="wait" initial={false}>');
    expect(preTraining).toContain('<AnimatePresence mode="wait" initial={false}>');
  });

  it("keeps the real Daily state machine and single-save boundary intact", () => {
    const daily = readSource("src/components/dashboard/DailyCheckin.tsx");

    expect(daily).toContain("if (step === 1) setStep(3)");
    expect(daily).not.toContain("activeTransferPulse");
    expect(daily).not.toContain("Transfer-Pulse");
    expect(daily).not.toContain("AthleteTransferPulse");
    expect(daily).not.toContain("getMyEvidenceStatus");
    expect(daily).not.toContain("evidence:");
    expect(daily).toContain("tasks.every");
    expect(daily).toContain("if (savingRef.current) return false");
    expect(daily).toContain("saveDailyTracking");
    expect(daily).toContain("writeLocalDraft");
    expect(daily).toContain("RestDayMission");
  });

  it("keeps Journal drafts, voice input and recall-before-reveal behavior", () => {
    const journal = readSource("src/pages/Journal.tsx");
    const preTraining = readSource("src/pages/PreTraining.tsx");

    expect(journal).toContain("writeLocalDraft");
    expect(journal).toContain("<VoiceInput");
    expect(journal).toContain("safeJournalStep");
    expect(journal).toContain("allQuestionsReady");
    expect(preTraining).toContain('key="recall"');
    expect(preTraining).toContain('key="reveal"');
    expect(preTraining).toContain("Erinnerung prüfen");
    expect(preTraining).toContain("disabled={Boolean(resolved.content.preTraining) && !revealed}");
  });
});
