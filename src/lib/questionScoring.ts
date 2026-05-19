import type { RewireQuestion, ScoringDirection } from "@/content/questionnaireV2";

export function normalizeScaleScore(raw: number, direction: ScoringDirection): number | null {
  if (!Number.isFinite(raw) || raw < 1 || raw > 10) return null;
  if (direction === "higher_is_better") return raw;
  if (direction === "lower_is_better") return 11 - raw;
  return null;
}

export function toScore100(normalized1to10: number): number {
  const clamped = Math.max(1, Math.min(10, normalized1to10));
  return Math.round(((clamped - 1) / 9) * 100);
}

export function scoreChoiceOption(question: RewireQuestion, optionId: string): number | null {
  const option = question.options?.find((o) => o.id === optionId);
  return typeof option?.score === "number" ? option.score : null;
}

export function scoreQuestionAnswer(
  question: RewireQuestion,
  answer: string | string[] | number | undefined
): number | null {
  if (question.type === "scale" && typeof answer === "number") {
    return normalizeScaleScore(answer, question.scoringDirection);
  }

  if (question.type === "choice" && typeof answer === "string") {
    return scoreChoiceOption(question, answer);
  }

  return null;
}
