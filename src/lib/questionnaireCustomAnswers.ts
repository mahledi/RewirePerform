import type { RewireQuestion } from "@/content/questionnaireV2";

export const CUSTOM_ANSWER_PREFIX = "__private_custom_answer__:";
export const CUSTOM_ANSWER_OPTION_ID = "__custom_answer__";
export const CUSTOM_ANSWER_MAX_LENGTH = 280;

export const supportsPrivateCustomAnswer = (
  question: Pick<RewireQuestion, "id" | "type">,
): boolean => question.id !== "sport-03"
  && (question.type === "choice" || question.type === "multi");

export const customAnswerKey = (questionId: string): string =>
  `${CUSTOM_ANSWER_PREFIX}${questionId}`;

export const normalizeCustomAnswer = (value: string): string =>
  value.replace(/\r\n?/gu, "\n").slice(0, CUSTOM_ANSWER_MAX_LENGTH);

type QuestionnaireAnswer = string | string[] | number;

export const applyPrivateCustomAnswer = (
  answers: Record<string, QuestionnaireAnswer>,
  questionId: string,
  value: string,
): Record<string, QuestionnaireAnswer> => {
  const key = customAnswerKey(questionId);
  const normalized = normalizeCustomAnswer(value);
  if (normalized.trim().length > 0) {
    return {
      ...answers,
      [questionId]: answers[questionId] ?? CUSTOM_ANSWER_OPTION_ID,
      [key]: normalized,
    };
  }

  const next = { ...answers };
  delete next[key];
  if (next[questionId] === CUSTOM_ANSWER_OPTION_ID) delete next[questionId];
  return next;
};

export const countCanonicalQuestionnaireAnswers = (
  answers: Record<string, unknown>,
  questionIds: ReadonlySet<string>,
): number => Object.entries(answers).filter(
  ([key, value]) => questionIds.has(key)
    && (Array.isArray(value) ? value.length > 0 : String(value ?? "").trim().length > 0),
).length;
