import { describe, expect, it } from "vitest";
import { getContextDayJournal } from "@/prototypes/golden-days/contextDayJournals";
import { PROGRAM_DAY_DRAFTS } from "@/prototypes/golden-days/programDayDrafts";

describe("deterministic training, rest and competition journals", () => {
  it("keeps every day tied to its fixed content while adapting the honest context", () => {
    for (const draft of PROGRAM_DAY_DRAFTS) {
      const training = getContextDayJournal(draft, "training");
      const rest = getContextDayJournal(draft, "rest");
      const competition = getContextDayJournal(draft, "competition");

      expect(training.questions).toHaveLength(draft.journal.questions.filter(Boolean).length);
      expect(rest.questions).toHaveLength(2);
      expect(competition.questions).toHaveLength(draft.journal.questions.filter(Boolean).length);
      expect(competition.intro).toMatch(/Wettkampf/u);
      expect(competition.title).not.toMatch(/\bheute|heutig/u);
      expect(new Set([...training.questions, ...rest.questions, ...competition.questions].map((question) => question.id)).size)
        .toBe(training.questions.length + rest.questions.length + competition.questions.length);
      expect(rest.gratitudePrompt).toBe(training.gratitudePrompt);
      expect(competition.gratitudePrompt).toBe(training.gratitudePrompt);
    }
  });

  it("never asks a rest-day athlete to claim a real same-day application", () => {
    for (const draft of PROGRAM_DAY_DRAFTS) {
      const rest = getContextDayJournal(draft, "rest");
      expect(rest.intro).toContain("musst keine echte Anwendung behaupten");
      expect(JSON.stringify(rest.questions)).not.toMatch(/wann hast du (?:es|das) heute angewendet/iu);
    }
  });

  it("makes current-day wording explicit for the competition reflection", () => {
    for (const draft of PROGRAM_DAY_DRAFTS) {
      const competition = getContextDayJournal(draft, "competition");
      expect(JSON.stringify(competition.questions)).not.toMatch(/\bheute\b/iu);
      expect(JSON.stringify(competition.questions)).not.toMatch(/\bheutig/iu);
      expect(competition.questions.every((question) => question.prompt.trim().length > 0)).toBe(true);
    }
  });
});
