import { StrictMode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  userId: "gate-user-1",
  enabled: false,
  claim: vi.fn(),
  dismiss: vi.fn(),
  begin: vi.fn(),
  save: vi.fn(),
  submit: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: mocks.userId },
    role: "athlete",
    roleVerified: true,
  }),
}));

vi.mock("@/lib/feedbackIntelligenceApi", () => ({
  isFeedbackIntelligenceClientEnabled: () => mocks.enabled,
  claimMyFeedbackCheckpoint: mocks.claim,
  dismissMyFeedbackCheckpoint: mocks.dismiss,
}));

vi.mock("@/lib/feedbackIntelligencePersistence", () => ({
  beginFeedbackPersistence: mocks.begin,
}));

import FeedbackCheckpointGate from "@/components/feedback-intelligence/FeedbackCheckpointGate";

const claim = {
  eligible: true,
  mode: "invitation",
  campaignReference: "feedback-day-10-v1",
  checkpointDay: 10,
  textEnabled: false,
};

const persistence = {
  clientSubmissionId: "20000000-0000-4000-8000-000000009901",
  draft: {
    status: "draft",
    clientRevision: 0,
    answers: {},
    comments: {},
    textConsentState: "not_asked",
    resumeScreen: "intro",
    resumeQuestionId: null,
    passedQuestionIds: [],
  },
  textEnabled: false,
  session: { save: mocks.save, submit: mocks.submit },
};

const renderGate = (strict = false) => render(
  <MemoryRouter initialEntries={["/dashboard"]}>
    {strict ? <StrictMode><FeedbackCheckpointGate /></StrictMode> : <FeedbackCheckpointGate />}
  </MemoryRouter>,
);

describe("feedback checkpoint live gate", () => {
  afterEach(() => {
    mocks.enabled = false;
    mocks.userId = `gate-user-${Math.random()}`;
    mocks.claim.mockReset();
    mocks.dismiss.mockReset();
    mocks.begin.mockReset();
    mocks.save.mockReset();
    mocks.submit.mockReset();
  });

  it("never claims a checkpoint while the client kill switch is closed", () => {
    renderGate();
    expect(mocks.claim).not.toHaveBeenCalled();
    expect(screen.queryByTestId("feedback-checkpoint-gate")).not.toBeInTheDocument();
  });

  it("deduplicates the mutating claim under React StrictMode", async () => {
    mocks.enabled = true;
    mocks.claim.mockResolvedValue(claim);
    renderGate(true);

    expect(await screen.findByTestId("feedback-checkpoint-gate")).toBeInTheDocument();
    expect(mocks.claim).toHaveBeenCalledTimes(1);
  });

  it("rechecks eligibility after a dashboard remount in the same app process", async () => {
    mocks.enabled = true;
    mocks.claim
      .mockResolvedValueOnce({ eligible: false })
      .mockResolvedValueOnce(claim);

    const firstRender = renderGate();
    await waitFor(() => expect(mocks.claim).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId("feedback-checkpoint-gate")).not.toBeInTheDocument();
    firstRender.unmount();

    renderGate();
    expect(await screen.findByTestId("feedback-checkpoint-gate")).toBeInTheDocument();
    expect(mocks.claim).toHaveBeenCalledTimes(2);
  });

  it("starts the exact persistence session before entering the questionnaire", async () => {
    mocks.enabled = true;
    mocks.claim.mockResolvedValue(claim);
    mocks.begin.mockResolvedValue(persistence);
    renderGate();

    fireEvent.click(await screen.findByRole("button", { name: /Feedback starten/ }));
    await waitFor(() => expect(mocks.begin).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Deine Sicht zählt.")).toBeInTheDocument();
  });

  it("dismisses without starting or blocking the dashboard", async () => {
    mocks.enabled = true;
    mocks.claim.mockResolvedValue(claim);
    mocks.dismiss.mockResolvedValue(undefined);
    renderGate();

    fireEvent.click(await screen.findByRole("button", { name: "Jetzt nicht" }));
    await waitFor(() => expect(mocks.dismiss).toHaveBeenCalledWith("feedback-day-10-v1"));
    expect(screen.queryByTestId("feedback-checkpoint-gate")).not.toBeInTheDocument();
    expect(mocks.begin).not.toHaveBeenCalled();
  });

  it("hydrates an existing draft directly at its saved question", async () => {
    mocks.enabled = true;
    mocks.claim.mockResolvedValue({
      ...claim,
      mode: "resume",
      clientSubmissionId: persistence.clientSubmissionId,
    });
    mocks.begin.mockResolvedValue({
      ...persistence,
      draft: {
        ...persistence.draft,
        clientRevision: 3,
        answers: { d10_content_clarity: ["1"] },
        resumeScreen: "questions",
        resumeQuestionId: "d10_content_clarity",
      },
    });
    renderGate();

    const selected = await screen.findByRole("radio", { name: "Sehr verständlich" });
    expect(selected).toHaveAttribute("aria-checked", "true");
    expect(screen.queryByRole("button", { name: /Feedback starten/ })).not.toBeInTheDocument();
  });
});
