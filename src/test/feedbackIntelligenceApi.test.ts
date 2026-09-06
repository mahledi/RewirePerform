import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: mocks.rpc },
}));

import {
  FeedbackIntelligenceApiError,
  claimMyFeedbackCheckpoint,
  listMyFeedbackTextConsents,
  saveMyFeedbackDraft,
  withdrawMyFeedbackText,
} from "@/lib/feedbackIntelligenceApi";

describe("feedback intelligence athlete API adapter", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_FEEDBACK_INTELLIGENCE_V1_ENABLED", "false");
    vi.stubEnv("VITE_FEEDBACK_TEXT_V1_ENABLED", "false");
  });

  afterEach(() => {
    mocks.rpc.mockReset();
    vi.unstubAllEnvs();
  });

  it("does not call Supabase while the client gate is disabled", async () => {
    const result = await claimMyFeedbackCheckpoint();

    expect(result).toEqual({ eligible: false, reason: "client_disabled" });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("maps the server checkpoint contract without exposing private identifiers", async () => {
    vi.stubEnv("VITE_FEEDBACK_INTELLIGENCE_V1_ENABLED", "true");
    mocks.rpc.mockResolvedValue({
      error: null,
      data: {
        eligible: true,
        mode: "invitation",
        campaign_reference: "feedback-day-24-v1",
        checkpoint_day: 24,
        questionnaire_version: "feedback-d24-v1.0.0",
        content_version: "feedback-intelligence-content-v1.0.0",
        questionnaire_manifest_hash: "a".repeat(64),
        text_enabled: false,
        client_submission_id: null,
        client_revision: 0,
        program_day: 24,
      },
    });

    await expect(claimMyFeedbackCheckpoint()).resolves.toMatchObject({
      eligible: true,
      mode: "invitation",
      checkpointDay: 24,
      textEnabled: false,
      clientSubmissionId: null,
    });
    expect(mocks.rpc).toHaveBeenCalledWith("claim_my_feedback_checkpoint", undefined);
  });

  it("keeps text closed unless both client and server gates are enabled", async () => {
    vi.stubEnv("VITE_FEEDBACK_INTELLIGENCE_V1_ENABLED", "true");
    mocks.rpc.mockResolvedValue({
      error: null,
      data: {
        eligible: true,
        checkpoint_day: 10,
        text_enabled: true,
      },
    });

    await expect(claimMyFeedbackCheckpoint()).resolves.toMatchObject({ textEnabled: false });

    vi.stubEnv("VITE_FEEDBACK_TEXT_V1_ENABLED", "true");
    await expect(claimMyFeedbackCheckpoint()).resolves.toMatchObject({ textEnabled: true });
  });

  it("forwards only the versioned draft payload to the save RPC", async () => {
    mocks.rpc.mockResolvedValue({
      error: null,
      data: {
        status: "draft",
        feedback_reference: "50000000-0000-4000-8000-000000001103",
        client_revision: 3,
        idempotent: false,
      },
    });

    const result = await saveMyFeedbackDraft({
      clientSubmissionId: "20000000-0000-4000-8000-000000001103",
      clientRevision: 3,
      clientMutationId: "30000000-0000-4000-8000-000000001103",
      answers: { d24_content_clarity: ["2"] },
      comments: {},
      textConsentState: "declined",
      resumeScreen: "questions",
      resumeQuestionId: "d24_task_clarity",
      passedQuestionIds: ["d24_content_clarity"],
    });

    expect(result.clientRevision).toBe(3);
    expect(mocks.rpc).toHaveBeenCalledWith("save_my_feedback_draft", expect.objectContaining({
      _client_revision: 3,
      _answers: { d24_content_clarity: ["2"] },
      _comments: {},
      _text_consent_state: "declined",
    }));
  });

  it("fails closed on malformed server responses", async () => {
    vi.stubEnv("VITE_FEEDBACK_INTELLIGENCE_V1_ENABLED", "true");
    mocks.rpc.mockResolvedValue({ error: null, data: { eligible: "yes" } });

    await expect(claimMyFeedbackCheckpoint()).rejects.toEqual(
      new FeedbackIntelligenceApiError("feedback_claim_invalid_response"),
    );
  });

  it("maps only minimized athlete consent receipt metadata", async () => {
    mocks.rpc.mockResolvedValue({
      error: null,
      data: [{
        consent_reference: "70000000-0000-4000-8000-000000001103",
        campaign_reference: "feedback-day-24-v1",
        checkpoint_day: 24,
        state: "granted",
        scope: "product-improvement-individual-text-ai-analysis-v1",
        consent_version: "feedback-text-consent-v1.1.0-draft",
        granted_at: "2026-08-05T10:00:00.000Z",
        withdrawn_at: null,
      }],
    });

    await expect(listMyFeedbackTextConsents()).resolves.toEqual([{
      consentReference: "70000000-0000-4000-8000-000000001103",
      campaignReference: "feedback-day-24-v1",
      checkpointDay: 24,
      state: "granted",
      scope: "product-improvement-individual-text-ai-analysis-v1",
      consentVersion: "feedback-text-consent-v1.1.0-draft",
      grantedAt: "2026-08-05T10:00:00.000Z",
      withdrawnAt: null,
    }]);
    expect(mocks.rpc).toHaveBeenCalledWith("list_my_feedback_text_consents", undefined);
  });

  it("withdraws one exact consent receipt and fails closed on an invalid acknowledgement", async () => {
    mocks.rpc.mockResolvedValueOnce({
      error: null,
      data: { ok: true, state: "withdrawn", already_withdrawn: false },
    });
    await expect(withdrawMyFeedbackText("70000000-0000-4000-8000-000000001103"))
      .resolves.toBeUndefined();
    expect(mocks.rpc).toHaveBeenCalledWith("withdraw_my_feedback_text", {
      _consent_reference: "70000000-0000-4000-8000-000000001103",
    });

    mocks.rpc.mockResolvedValueOnce({ error: null, data: { ok: true, state: "granted" } });
    await expect(withdrawMyFeedbackText("70000000-0000-4000-8000-000000001103"))
      .rejects.toEqual(new FeedbackIntelligenceApiError("feedback_consent_withdraw_invalid_response"));
  });
});
