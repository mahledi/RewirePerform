import type { CalendarEventType } from "@/content/matrixDayTypes";
import { resolveDay } from "@/lib/getDayContent";

export const getJournalQuestionEventType = (questionId: string): CalendarEventType => {
  if (questionId.includes("-rest-")) return "rest";
  if (questionId.includes("-competition-")) return "competition";
  return "training";
};

export const getHistoricalJournalQuestion = ({
  dayNumber,
  date,
  questionId,
}: {
  dayNumber: number | null;
  date: string;
  questionId: string;
}): string => {
  if (!dayNumber) return "Deine Journalfrage";

  const resolved = resolveDay(
    dayNumber,
    new Date(`${date}T12:00:00`),
    getJournalQuestionEventType(questionId),
  );

  return resolved?.content.journal.questions.find((question) => question.id === questionId)?.question
    ?? "Deine Journalfrage";
};

export const getJournalCompletionLabel = ({
  saving,
  hasSaveError,
  allQuestionsReady,
  gratitudeWords,
  gratitudeMinWords,
}: {
  saving: boolean;
  hasSaveError: boolean;
  allQuestionsReady: boolean;
  gratitudeWords: number;
  gratitudeMinWords: number;
}): string => {
  if (saving) return "Speichert …";
  if (hasSaveError) return "Erneut speichern";
  if (!allQuestionsReady) return "Fragen vervollständigen";
  if (gratitudeWords < gratitudeMinWords) {
    return `${gratitudeWords} von ${gratitudeMinWords} Wörtern`;
  }
  return "Tag abschließen";
};
