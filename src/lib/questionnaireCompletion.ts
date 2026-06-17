import {
  ONBOARDING_V2_INSTRUMENT_ID,
  ONBOARDING_V2_QUESTIONS,
  type RewireQuestion,
} from "@/content/questionnaireV2";

type QuestionnaireCompletionRow = {
  is_complete?: boolean | null;
  instrument_id?: string | null;
  answers?: unknown;
  analysis?: unknown;
};

export const hasQuestionAnswerValue = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return value !== null && value !== undefined;
};

export const isOptionalOnboardingQuestion = (question: Pick<RewireQuestion, "type" | "helper">): boolean => {
  if (question.type !== "text") return false;
  return (question.helper ?? "").toLowerCase().includes("optional");
};

export const isRequiredOnboardingQuestion = (question: Pick<RewireQuestion, "type" | "helper">): boolean =>
  !isOptionalOnboardingQuestion(question);

const answerCount = (answers: unknown): number => {
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) return 0;
  return Object.values(answers as Record<string, unknown>).filter(hasQuestionAnswerValue).length;
};

const onboardingAnswerCount = (answers: unknown): number => {
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) return 0;
  const answerMap = answers as Record<string, unknown>;
  return ONBOARDING_V2_QUESTIONS.filter(
    (question) => isRequiredOnboardingQuestion(question) && hasQuestionAnswerValue(answerMap[question.id])
  ).length;
};

const requiredOnboardingQuestionCount = ONBOARDING_V2_QUESTIONS.filter(isRequiredOnboardingQuestion).length;

export const hasCompleteOnboardingAnswerSet = (answers: unknown): boolean =>
  onboardingAnswerCount(answers) >= requiredOnboardingQuestionCount;

export const hasValidCompletedOnboarding = (row: QuestionnaireCompletionRow | null | undefined): boolean => {
  if (!row?.is_complete || !row.analysis) return false;

  if (row.instrument_id === ONBOARDING_V2_INSTRUMENT_ID) {
    return hasCompleteOnboardingAnswerSet(row.answers);
  }

  // Legacy rows had no instrument id. They must still contain a substantial answer set;
  // a stray completed flag with only a few answers must never unlock the dashboard.
  if (!row.instrument_id) {
    return answerCount(row.answers) >= Math.min(40, ONBOARDING_V2_QUESTIONS.length);
  }

  return false;
};
