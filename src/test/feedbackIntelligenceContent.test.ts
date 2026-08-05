import { describe, expect, it } from "vitest";

import {
  FEEDBACK_CHECKPOINTS,
  FEEDBACK_INTELLIGENCE_INVARIANTS,
  feedbackTextConsentCopy,
  getFeedbackCheckpoint,
  isFeedbackQuestionVisible,
} from "@/content/feedbackIntelligenceV1";

describe("feedback intelligence content contract", () => {
  it("defines the four deterministic checkpoints in program order", () => {
    expect(FEEDBACK_INTELLIGENCE_INVARIANTS.checkpointDays).toEqual([10, 24, 39, 55]);
    expect(Object.values(FEEDBACK_CHECKPOINTS).map(({ checkpointDay }) => checkpointDay)).toEqual([
      10, 24, 39, 55,
    ]);
  });

  it("keeps question and item identifiers unique while preserving comparable families", () => {
    const questions = Object.values(FEEDBACK_CHECKPOINTS).flatMap(({ questions }) => questions);
    const questionIds = questions.map(({ id }) => id);
    const variantIds = questions.map(({ itemVariantId }) => itemVariantId);

    expect(new Set(questionIds).size).toBe(questionIds.length);
    expect(new Set(variantIds).size).toBe(variantIds.length);

    const repeatedContentClarity = questions.filter(
      ({ itemFamilyId }) => itemFamilyId === "content_clarity_v1",
    );
    expect(repeatedContentClarity.map(({ id }) => id)).toEqual([
      "d10_content_clarity",
      "d24_content_clarity",
      "d39_content_clarity",
    ]);

    const repeatedTrainingTransfer = questions.filter(
      ({ itemFamilyId }) => itemFamilyId === "training_transfer_v1",
    );
    expect(repeatedTrainingTransfer.map(({ id }) => id)).toEqual([
      "d24_training_transfer",
      "d39_training_transfer",
      "d55_training_transfer",
    ]);
  });

  it("offers the same optional comment affordance for every question", () => {
    const questions = Object.values(FEEDBACK_CHECKPOINTS).flatMap(({ questions }) => questions);
    expect(questions.every(({ optionalComment }) => optionalComment)).toBe(true);
  });

  it("does not smuggle derived scores into the versioned questionnaire content", () => {
    const options = Object.values(FEEDBACK_CHECKPOINTS)
      .flatMap(({ questions }) => questions)
      .flatMap(({ options }) => options);

    expect(options.every((option) => !("normalizedValue" in option))).toBe(true);
  });

  it("keeps conditional follow-up references inside their own questionnaire", () => {
    for (const checkpoint of Object.values(FEEDBACK_CHECKPOINTS)) {
      const questionsById = new Map(checkpoint.questions.map((question) => [question.id, question]));

      for (const question of checkpoint.questions) {
        if (!question.visibleWhen) continue;
        const source = questionsById.get(question.visibleWhen.questionId);
        expect(source).toBeDefined();
        const sourceOptionIds = new Set(source?.options.map(({ id }) => id));
        expect(
          question.visibleWhen.selectedOptionIds.every((optionId) => sourceOptionIds.has(optionId)),
        ).toBe(true);
      }
    }
  });

  it("shows change valence only after a reported change", () => {
    const valenceQuestion = getFeedbackCheckpoint(24).questions.find(
      ({ id }) => id === "d24_change_valence",
    );
    expect(valenceQuestion).toBeDefined();
    expect(isFeedbackQuestionVisible(valenceQuestion!, {})).toBe(false);
    expect(isFeedbackQuestionVisible(valenceQuestion!, { d24_change_magnitude: ["1"] })).toBe(false);
    expect(isFeedbackQuestionVisible(valenceQuestion!, { d24_change_magnitude: ["3"] })).toBe(true);
  });

  it("protects the day 55 free-recall prompt from content priming", () => {
    const checkpoint = getFeedbackCheckpoint(55);
    expect(checkpoint.questions[0].id).toBe("d55_free_recall_level");
    expect(checkpoint.contentContext.revealAfterQuestionId).toBe("d55_free_recall_level");
    expect(checkpoint.intro.join(" ")).toContain("nicht noch einmal");
  });

  it("keeps privacy and evidence boundaries explicit", () => {
    expect(FEEDBACK_INTELLIGENCE_INVARIANTS).toMatchObject({
      identityPersonalization: false,
      deterministicCheckpointContext: true,
      structuredAnswerWithoutTextConsent: true,
      optionalCommentRequiresSeparateConsent: true,
      coachAccess: false,
      journalTextIncluded: false,
      journalUsageCountsAllowed: true,
      individualCoachObservationsIncluded: false,
      automaticAthleteDecisions: false,
      causalClaimsAllowed: false,
    });
  });

  it("presents text consent as an equal, voluntary choice", () => {
    expect(feedbackTextConsentCopy.acceptLabel).toBe("Zustimmen und schreiben");
    expect(feedbackTextConsentCopy.declineLabel).toBe("Ohne Freitext fortfahren");
    expect(feedbackTextConsentCopy.body.join(" ")).toContain("freiwillig");
    expect(feedbackTextConsentCopy.body.join(" ")).toContain("jederzeit widerrufen");
    expect(feedbackTextConsentCopy.body.join(" ")).toContain("nicht meinem Coach gezeigt");
  });
});
