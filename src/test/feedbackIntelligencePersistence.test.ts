import { describe, expect, it, vi } from "vitest";

import {
  FEEDBACK_INTELLIGENCE_CONTENT_VERSION,
  getFeedbackCheckpoint,
} from "@/content/feedbackIntelligenceV1";
import { FeedbackIntelligenceApiError } from "@/lib/feedbackIntelligenceApi";
import {
  assertFeedbackCheckpointContract,
  beginFeedbackPersistence,
  type FeedbackEditableSnapshot,
  type FeedbackPersistenceDependencies,
} from "@/lib/feedbackIntelligencePersistence";

const checkpoint = getFeedbackCheckpoint(24);
const validClaim = {
  eligible: true,
  mode: "invitation" as const,
  campaignReference: checkpoint.campaignReference,
  checkpointDay: checkpoint.checkpointDay,
  questionnaireVersion: checkpoint.questionnaireVersion,
  contentVersion: FEEDBACK_INTELLIGENCE_CONTENT_VERSION,
  questionnaireManifestHash: checkpoint.questionnaireManifestHash,
  textEnabled: true,
  clientSubmissionId: null,
  clientRevision: 0,
  programDay: checkpoint.checkpointDay,
};

const snapshot = (answer = "2"): FeedbackEditableSnapshot => ({
  answers: { d24_content_clarity: [answer] },
  comments: {},
  textConsentState: "declined",
  resumeScreen: "questions",
  resumeQuestionId: "d24_task_clarity",
  passedQuestionIds: ["d24_content_clarity"],
});

const dependencies = (): FeedbackPersistenceDependencies => {
  let id = 0;
  return {
    createId: () => `00000000-0000-4000-8000-${String(++id).padStart(12, "0")}`,
    start: vi.fn().mockResolvedValue({
      status: "draft",
      feedbackReference: "50000000-0000-4000-8000-000000000001",
      clientRevision: 0,
    }),
    getDraft: vi.fn(),
    save: vi.fn().mockImplementation(async (payload) => ({
      status: "draft",
      feedbackReference: "50000000-0000-4000-8000-000000000001",
      clientRevision: payload.clientRevision,
    })),
    submit: vi.fn().mockImplementation(async (payload) => ({
      status: "submitted",
      feedbackReference: "50000000-0000-4000-8000-000000000001",
      clientRevision: payload.clientRevision,
    })),
  };
};

describe("feedback intelligence persistence", () => {
  it("fails closed when any claimed campaign contract field drifts", () => {
    expect(() => assertFeedbackCheckpointContract({
      ...validClaim,
      questionnaireManifestHash: "f".repeat(64),
    })).toThrow(new FeedbackIntelligenceApiError("feedback_checkpoint_contract_mismatch"));
  });

  it("starts an exact versioned submission without fetching a draft", async () => {
    const api = dependencies();
    const state = await beginFeedbackPersistence(validClaim, "1.1.0+5", api);

    expect(state.clientSubmissionId).toBe("00000000-0000-4000-8000-000000000001");
    expect(api.start).toHaveBeenCalledWith({
      campaignReference: checkpoint.campaignReference,
      clientSubmissionId: state.clientSubmissionId,
      productVersion: "1.1.0+5",
      contentVersion: FEEDBACK_INTELLIGENCE_CONTENT_VERSION,
      questionnaireManifestHash: checkpoint.questionnaireManifestHash,
    });
    expect(api.getDraft).not.toHaveBeenCalled();
  });

  it("retries a lost response with the exact same revision and mutation id", async () => {
    const api = dependencies();
    const save = vi.mocked(api.save);
    save
      .mockRejectedValueOnce(new Error("response_lost"))
      .mockImplementationOnce(async (payload) => ({
        status: "draft",
        feedbackReference: "50000000-0000-4000-8000-000000000001",
        clientRevision: payload.clientRevision,
        idempotent: true,
      }));
    const state = await beginFeedbackPersistence(validClaim, "unknown", api);

    await expect(state.session.save(snapshot())).rejects.toThrow("response_lost");
    await expect(state.session.save(snapshot())).resolves.toMatchObject({
      clientRevision: 1,
      idempotent: true,
    });

    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1][0].clientRevision).toBe(save.mock.calls[0][0].clientRevision);
    expect(save.mock.calls[1][0].clientMutationId).toBe(save.mock.calls[0][0].clientMutationId);
  });

  it("flushes a lost mutation before assigning the next revision to newer input", async () => {
    const api = dependencies();
    const save = vi.mocked(api.save);
    save.mockRejectedValueOnce(new Error("response_lost"));
    const state = await beginFeedbackPersistence(validClaim, "unknown", api);

    await expect(state.session.save(snapshot("2"))).rejects.toThrow("response_lost");
    await state.session.save(snapshot("3"));

    expect(save).toHaveBeenCalledTimes(3);
    expect(save.mock.calls.map(([payload]) => payload.clientRevision)).toEqual([1, 1, 2]);
    expect(save.mock.calls[1][0].clientMutationId).toBe(save.mock.calls[0][0].clientMutationId);
    expect(save.mock.calls[2][0].clientMutationId).not.toBe(save.mock.calls[1][0].clientMutationId);
    expect(save.mock.calls[2][0].answers).toEqual({ d24_content_clarity: ["3"] });
  });

  it("never sends comments without enabled and granted text consent", async () => {
    const api = dependencies();
    const state = await beginFeedbackPersistence({ ...validClaim, textEnabled: false }, "unknown", api);

    await expect(state.session.save({
      ...snapshot(),
      comments: { d24_content_clarity: "Bitte kürzer." },
    })).rejects.toThrow(new FeedbackIntelligenceApiError("feedback_text_consent_required"));
    await expect(state.session.save({
      ...snapshot(),
      textConsentState: "granted",
      comments: { d24_content_clarity: "Bitte kürzer." },
    })).rejects.toThrow(new FeedbackIntelligenceApiError("feedback_text_not_enabled"));
    expect(api.save).not.toHaveBeenCalled();
  });

  it("finalizes through a distinct monotonic mutation", async () => {
    const api = dependencies();
    const state = await beginFeedbackPersistence(validClaim, "unknown", api);

    await state.session.save(snapshot());
    await expect(state.session.submit(snapshot())).resolves.toMatchObject({
      status: "submitted",
      clientRevision: 2,
    });
    expect(api.submit).toHaveBeenCalledWith(expect.objectContaining({
      clientRevision: 2,
      clientSubmissionId: state.clientSubmissionId,
    }));
  });
});
