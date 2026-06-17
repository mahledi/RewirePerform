import { describe, expect, it } from "vitest";
import {
  ONBOARDING_V2_INSTRUMENT_ID,
  ONBOARDING_V2_QUESTIONS,
  type RewireQuestion,
} from "@/content/questionnaireV2";
import {
  hasCompleteOnboardingAnswerSet,
  hasValidCompletedOnboarding,
  isRequiredOnboardingQuestion,
} from "@/lib/questionnaireCompletion";

type AnswerValue = string | string[] | number;

const answerFor = (question: RewireQuestion): AnswerValue => {
  if (question.type === "scale") return 6;
  if (question.type === "choice") return question.options?.[0]?.id ?? "a";
  if (question.type === "multi") return [question.options?.[0]?.id ?? "a"];
  return "Konkrete Testantwort.";
};

const buildRequiredAnswers = (): Record<string, AnswerValue> =>
  Object.fromEntries(
    ONBOARDING_V2_QUESTIONS.filter(isRequiredOnboardingQuestion).map((question) => [
      question.id,
      answerFor(question),
    ])
  );

describe("questionnaire completion", () => {
  it("allows the onboarding questionnaire to complete when optional text answers are empty", () => {
    const answers = buildRequiredAnswers();

    expect(answers["press-06"]).toBeUndefined();
    expect(hasCompleteOnboardingAnswerSet(answers)).toBe(true);
    expect(
      hasValidCompletedOnboarding({
        is_complete: true,
        instrument_id: ONBOARDING_V2_INSTRUMENT_ID,
        answers,
        analysis: { summary: "ok" },
      })
    ).toBe(true);
  });

  it("does not complete when a required onboarding answer is missing", () => {
    const answers = buildRequiredAnswers();
    delete answers["sport-01"];

    expect(hasCompleteOnboardingAnswerSet(answers)).toBe(false);
  });
});
