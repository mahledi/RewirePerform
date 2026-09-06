import { describe, expect, it } from "vitest";
import { getDailyContent } from "@/content/dailyContent";
import { resolveDay } from "@/lib/getDayContent";
import { pulseQuestionsByContext } from "@/lib/dayContext";
import type { CalendarEventType } from "@/content/matrixDayTypes";

const contexts: CalendarEventType[] = ["training", "rest", "competition"];
const testDate = new Date("2026-07-10T12:00:00");

describe("day context resolution", () => {
  it("resolves every program day in all three calendar contexts", () => {
    for (let dayNumber = 1; dayNumber <= 56; dayNumber += 1) {
      for (const contextType of contexts) {
        const resolved = resolveDay(dayNumber, testDate, contextType);

        expect(resolved, `day ${dayNumber} / ${contextType}`).not.toBeNull();
        expect(resolved?.calendarEventType).toBe(contextType);
        expect(resolved?.content.title).toBeTruthy();
        expect(resolved?.content.lens).toBeTruthy();
        expect(resolved?.content.tasks).toHaveLength(1);
        expect(resolved?.content.journal.questions.length).toBeGreaterThanOrEqual(2);
        expect(resolved?.context.focus.trim()).not.toBe("");
      }
    }
  });

  it("keeps the fixed mechanism and authored content intact across contexts", () => {
    for (let dayNumber = 1; dayNumber <= 56; dayNumber += 1) {
      const base = getDailyContent(dayNumber);
      const training = resolveDay(dayNumber, testDate, "training");
      const rest = resolveDay(dayNumber, testDate, "rest");
      const competition = resolveDay(dayNumber, testDate, "competition");

      expect(base).not.toBeNull();
      expect(training?.matrix).toEqual(rest?.matrix);
      expect(rest?.matrix).toEqual(competition?.matrix);
      expect(training?.content.scienceBite).toEqual(base?.scienceBite);
      expect(rest?.content.scienceBite).toEqual(base?.scienceBite);
      expect(competition?.content.scienceBite).toEqual(base?.scienceBite);
      expect(training?.content.tasks.map((task) => task.id)).toEqual(base?.tasks.map((task) => task.id));
      expect(rest?.content.tasks.map((task) => task.title)).toEqual(base?.tasks.map((task) => task.title));
      expect(competition?.content.tasks.map((task) => task.systemFunction)).toEqual(
        base?.tasks.map((task) => task.systemFunction),
      );
      expect(training?.content.selfTalkAnchors).toEqual(rest?.content.selfTalkAnchors);
      expect(rest?.content.selfTalkAnchors).toEqual(competition?.content.selfTalkAnchors);
      expect(rest?.content.journal.questions.map((question) => question.id)).not.toEqual(
        base?.journal.questions.map((question) => question.id),
      );
    }
  });

  it("uses the authored day variant for each calendar context", () => {
    for (let dayNumber = 1; dayNumber <= 56; dayNumber += 1) {
      const base = getDailyContent(dayNumber);
      expect(resolveDay(dayNumber, testDate, "training")?.context.focus).toBe(base?.variants?.training);
      expect(resolveDay(dayNumber, testDate, "rest")?.context.focus).toBe(base?.variants?.rest);
      expect(resolveDay(dayNumber, testDate, "competition")?.context.focus).toBe(base?.variants?.match);
    }
  });

  it("does not invent a same-day sports action on rest days", () => {
    for (let dayNumber = 1; dayNumber <= 56; dayNumber += 1) {
      const rest = resolveDay(dayNumber, testDate, "rest");
      expect(rest?.context.label).toBe("Ruhetag");
      expect(rest?.context.checkin.taskIntro).toContain("kurze Visualisierung");
      expect(rest?.context.checkin.taskIntro).toContain("RewirePerform-Satz");
      expect(rest?.context.checkin.taskIntro).not.toContain("eigene Sportszene");
      expect(rest?.context.journal.intro).toContain("Visualisierung");
      expect(
        rest?.content.journal.questions.every((question) => !/\bheute\b/i.test(question.question)),
      ).toBe(true);
    }
  });

  it("keeps training reflective and competition instructions short", () => {
    for (let dayNumber = 1; dayNumber <= 56; dayNumber += 1) {
      const training = resolveDay(dayNumber, testDate, "training");
      const competition = resolveDay(dayNumber, testDate, "competition");

      expect(training?.context.label).toBe("Trainingstag");
      expect(training?.content.journal.questions.length).toBeGreaterThanOrEqual(2);
      expect(competition?.context.label).toBe("Wettkampftag");
      expect(competition?.context.checkin.taskIntro).toContain("eine Mission und einen Satz");
      expect(competition?.content.journal.questions.every((question) =>
        question.id.includes("competition"))).toBe(true);
    }
  });

  it("adapts every check-in pulse question without changing its metric keys", () => {
    const metricKeys = Object.keys(pulseQuestionsByContext.training);
    expect(Object.keys(pulseQuestionsByContext.rest)).toEqual(metricKeys);
    expect(Object.keys(pulseQuestionsByContext.competition)).toEqual(metricKeys);
    expect(metricKeys).toHaveLength(10);

    expect(pulseQuestionsByContext.training.energy).toContain("Training");
    expect(pulseQuestionsByContext.rest.pressure).toContain("Ruhetag");
    expect(pulseQuestionsByContext.competition.focus).toContain("Wettkampf");
    expect(pulseQuestionsByContext.training.connection).toContain("sportlichen Umfeld");
    expect(pulseQuestionsByContext.rest.connection).toContain("sportlichen Umfeld");
    expect(pulseQuestionsByContext.competition.connection).toContain("sportlichen Umfeld");
  });

  it("never mutates the canonical daily content", () => {
    const before = structuredClone(getDailyContent(1));
    resolveDay(1, testDate, "rest");
    resolveDay(1, testDate, "competition");
    expect(getDailyContent(1)).toEqual(before);
  });

  it("keeps the visible day summary clear and sport-neutral", () => {
    const abstractSummaryTerms =
      /Zustandsweite|Defizitmodus|Defizitdominanz|Ego-Zusatz|Selbstprojekt|Grundverfügbarkeit|integrierte Gesamtform/i;
    const singleSportTerms = /Fußball|Fussball|Torwart|Innenverteidiger|Stürmer|Abseits|Elfmeter/i;

    for (let dayNumber = 1; dayNumber <= 56; dayNumber += 1) {
      const content = getDailyContent(dayNumber);
      const summary = [content?.title, content?.lens, content?.coreShift].filter(Boolean).join(" ");
      const contextualSummary = [
        summary,
        content?.variants?.training,
        content?.variants?.rest,
        content?.variants?.match,
      ].filter(Boolean).join(" ");

      expect(content?.title?.length).toBeLessThanOrEqual(70);
      expect(content?.coreShift.length).toBeLessThanOrEqual(180);
      expect(summary).not.toMatch(abstractSummaryTerms);
      expect(contextualSummary).not.toMatch(singleSportTerms);
    }
  });
});
