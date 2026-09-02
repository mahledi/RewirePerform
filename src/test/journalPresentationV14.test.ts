import { describe, expect, it } from "vitest";
import { resolveDay } from "@/lib/getDayContent";
import {
  getHistoricalJournalQuestion,
  getJournalCompletionLabel,
  getJournalQuestionEventType,
} from "@/lib/journalPresentation";
import type { CalendarEventType } from "@/content/matrixDayTypes";

describe("V1.4 journal presentation", () => {
  it("shows the visible gratitude word progress in the disabled completion button", () => {
    expect(getJournalCompletionLabel({
      saving: false,
      hasSaveError: false,
      allQuestionsReady: true,
      gratitudeWords: 7,
      gratitudeMinWords: 8,
    })).toBe("7 von 8 Wörtern");

    expect(getJournalCompletionLabel({
      saving: false,
      hasSaveError: false,
      allQuestionsReady: true,
      gratitudeWords: 8,
      gratitudeMinWords: 8,
    })).toBe("Tag abschließen");
  });

  it("keeps saving, retry and incomplete-question states explicit", () => {
    expect(getJournalCompletionLabel({
      saving: true,
      hasSaveError: false,
      allQuestionsReady: true,
      gratitudeWords: 8,
      gratitudeMinWords: 8,
    })).toBe("Speichert …");
    expect(getJournalCompletionLabel({
      saving: false,
      hasSaveError: true,
      allQuestionsReady: true,
      gratitudeWords: 8,
      gratitudeMinWords: 8,
    })).toBe("Erneut speichern");
    expect(getJournalCompletionLabel({
      saving: false,
      hasSaveError: false,
      allQuestionsReady: false,
      gratitudeWords: 8,
      gratitudeMinWords: 8,
    })).toBe("Fragen vervollständigen");
  });

  it.each<CalendarEventType>(["training", "rest", "competition"])(
    "restores the canonical %s question for a historical answer",
    (eventType) => {
      const date = "2026-09-02";
      const resolved = resolveDay(1, new Date(`${date}T12:00:00`), eventType);
      const question = resolved?.content.journal.questions[0];
      expect(question).toBeDefined();
      expect(getHistoricalJournalQuestion({
        dayNumber: 1,
        date,
        questionId: question!.id,
      })).toBe(question!.question);
    },
  );

  it("falls back safely for malformed legacy rows and unknown event types", () => {
    expect(getJournalQuestionEventType("d1-rest-j1")).toBe("rest");
    expect(getJournalQuestionEventType("d1-competition-j1")).toBe("competition");
    expect(getJournalQuestionEventType("d1-j1")).toBe("training");
    expect(getHistoricalJournalQuestion({
      dayNumber: null,
      date: "2026-09-02",
      questionId: "legacy-question",
    })).toBe("Deine Journalfrage");
  });
});
