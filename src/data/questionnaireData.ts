import {
  ONBOARDING_V2_CATEGORIES,
  ONBOARDING_V2_QUESTIONS,
  type RewireQuestion,
  type RewireQuestionCategory,
  type RewireQuestionOption,
  type QuestionType,
  type QuestionPrivacy,
  type ScoringDirection,
} from "@/content/questionnaireV2";

export type { QuestionType, QuestionPrivacy, ScoringDirection, RewireQuestionOption };

export type QuestionCategory = RewireQuestionCategory;

export interface Question extends RewireQuestion {
  question: string;
  subtext?: string;
  scaleLabels?: [string, string];
  placeholder?: string;
  depth: "surface" | "deep" | "core";
  categoryIcon: string;
}

const categoryById = new Map(ONBOARDING_V2_CATEGORIES.map((category) => [category.id, category]));

function depthForQuestion(question: RewireQuestion): Question["depth"] {
  if (question.type === "text") return "deep";
  if (question.includeInScore) return "core";
  return "surface";
}

function toCompatQuestion(question: RewireQuestion): Question {
  const category = categoryById.get(question.category);

  return {
    ...question,
    question: question.text,
    subtext: question.helper,
    scaleLabels:
      question.lowLabel || question.highLabel
        ? [question.lowLabel ?? "niedrig", question.highLabel ?? "hoch"]
        : undefined,
    placeholder: question.helper,
    depth: depthForQuestion(question),
    categoryIcon: category?.icon ?? "",
  };
}

export const categories: QuestionCategory[] = ONBOARDING_V2_CATEGORIES;

export const questions: Question[] = ONBOARDING_V2_QUESTIONS.map(toCompatQuestion);

export const deepProfileQuestionIds = ["dp-01", "dp-02", "dp-03", "dp-04", "dp-05", "dp-06"];

export function getQuestionsByCategory(categoryId: string): Question[] {
  return questions.filter((question) => question.category === categoryId);
}

export function getQuestionById(questionId: string): Question | undefined {
  return questions.find((question) => question.id === questionId);
}

export function getOptionText(questionId: string, optionId: string): string {
  const question = getQuestionById(questionId);
  return question?.options?.find((option) => option.id === optionId)?.text ?? optionId;
}

const legacySportAnswerLabels: Record<string, string> = {
  football: "Fußball",
  basketball: "Basketball",
  handball: "Handball",
  tennis: "Tennis",
  athletics: "Leichtathletik",
  other: "Anderer Sport",
};

export function getSportAnswerText(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const optionLabel = getOptionText("sport-01", trimmed).trim();
  return legacySportAnswerLabels[trimmed] ?? (optionLabel || trimmed);
}
