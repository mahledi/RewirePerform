import type {
  GoldenDayContext,
  GoldenDayDraft,
  GoldenDayQuestion,
} from "@/prototypes/golden-days/goldenDayDrafts";
import { getRestDayVisualization } from "@/prototypes/golden-days/restDayVisualizations";

export type ContextDayJournal = {
  title: string;
  intro: string;
  questions: GoldenDayQuestion[];
  gratitudePrompt: string;
  gratitudeMinWords: number;
};

const adaptCompetitionCopy = (copy: string): string => copy
  .replace(/\bheutigen\b/giu, "diesen")
  .replace(/\bheutiger\b/giu, "dieser")
  .replace(/\bheutigem\b/giu, "diesem")
  .replace(/\bheutiges\b/giu, "dieses")
  .replace(/\bheutige\b/giu, "diese")
  .replace(/\bheute\b/giu, "im Wettkampf");

const competitionIntro = (draft: GoldenDayDraft): string => {
  if (draft.toolId === "SYSTEM") {
    return "Denk an deinen Wettkampf und an das ganze Programm. Wähle nur das, was du wirklich weiter nutzen willst.";
  }
  if (draft.stage === "Integration" || draft.stage === "Abschluss") {
    return "Geh einen klaren Moment aus deinem Wettkampf durch und verbinde ihn mit der heutigen Reaktion.";
  }
  return "Geh einen klaren Moment aus deinem Wettkampf durch. Bleib bei dem, was wirklich passiert ist.";
};

export const getContextDayJournal = (
  draft: GoldenDayDraft,
  context: GoldenDayContext,
): ContextDayJournal => {
  if (context === "rest") {
    const restJournal = getRestDayVisualization(draft).journal;
    return {
      ...restJournal,
      questions: restJournal.questions,
      gratitudePrompt: draft.journal.gratitudePrompt,
      gratitudeMinWords: draft.journal.gratitudeMinWords,
    };
  }

  if (context === "competition") {
    return {
      title: adaptCompetitionCopy(draft.journal.title),
      intro: competitionIntro(draft),
      questions: draft.journal.questions.filter(Boolean).map((question, index) => ({
        ...question,
        id: `d${draft.day}-competition-j${index + 1}`,
        prompt: adaptCompetitionCopy(question.prompt),
      })),
      gratitudePrompt: draft.journal.gratitudePrompt,
      gratitudeMinWords: draft.journal.gratitudeMinWords,
    };
  }

  return {
    title: draft.journal.title,
    intro: draft.journal.intro,
    questions: draft.journal.questions.filter(Boolean),
    gratitudePrompt: draft.journal.gratitudePrompt,
    gratitudeMinWords: draft.journal.gratitudeMinWords,
  };
};
