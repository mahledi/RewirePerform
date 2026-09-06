import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminFeedbackIntelligenceComments from "@/components/admin/AdminFeedbackIntelligenceComments";

const mocks = vi.hoisted(() => ({ getPage: vi.fn() }));

vi.mock("@/lib/adminFeedbackComments", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/adminFeedbackComments")>();
  return { ...original, getAdminFeedbackCommentPage: mocks.getPage };
});

const feedbackItem = {
  commentId: "10000000-0000-4000-8000-000000000010",
  subjectReference: "20000000-0000-4000-8000-000000000010",
  submittedAt: "2026-08-14T10:00:00.000Z",
  programDay: 10 as const,
  campaignReference: "feedback-day-10-v1",
  questionnaireVersion: "feedback-d10-v1.1.2",
  contentVersion: "feedback-intelligence-content-v1.1.2",
  questionId: "d10_content_clarity",
  questionPrompt: "Wie verständlich sind die täglichen Inhalte bisher für dich?",
  selectedOptionIds: ["2"],
  selectedOptionLabels: ["Eher verständlich"],
  comment: "Die Sprache ist klar. Nach dem Training ist die Textmenge manchmal zu hoch.",
  guardianRequired: true,
  activitySnapshot: {
    programDaysAvailable: 10,
    programDaysCompleted: 9,
    checkinsCompleted: 8,
    journalEntriesCreatedCount: 4,
    tasksCompleted: 7,
    transferPulseCount: 2,
    resumeDelayBucket: "DAYS_1_3",
    continuationStatusBucket: "ACTIVE_OR_COMPLETED",
  },
};

const response = {
  accessRequestReference: "30000000-0000-4000-8000-000000000010",
  generatedAt: "2026-08-14T10:05:00.000Z",
  dataScope: "production" as const,
  checkpointDay: null,
  returnedCount: 1,
  hasMore: false,
  nextCursor: null,
  items: [feedbackItem],
};

describe("admin Feedback Intelligence comments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPage.mockResolvedValue(response);
  });

  it("shows consented product feedback beside structured and count-only context", async () => {
    render(<AdminFeedbackIntelligenceComments />);

    expect(await screen.findByRole("heading", { name: "Feedback Intelligence" })).toBeInTheDocument();
    expect(screen.getByText(feedbackItem.comment)).toBeInTheDocument();
    expect(screen.getByText("Eher verständlich")).toBeInTheDocument();
    expect(screen.getByText("Guardian bestätigt")).toBeInTheDocument();
    expect(screen.getAllByText(/Nicht an Jarvis übergeben|Jarvis-Text|keine Texte an Jarvis/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText("Aktivitätskontext"));
    expect(screen.getByText("4 Einträge")).toBeInTheDocument();
    expect(screen.getByText(/Journaltexte und private Reflexionen sind technisch ausgeschlossen/i)).toBeInTheDocument();
  });

  it("reloads through the same bounded RPC when a checkpoint is selected", async () => {
    render(<AdminFeedbackIntelligenceComments />);
    await screen.findByText(feedbackItem.comment);

    fireEvent.click(screen.getByRole("button", { name: "Tag 24" }));
    await waitFor(() => expect(mocks.getPage).toHaveBeenLastCalledWith({
      dataScope: "production",
      checkpointDay: 24,
      cursor: null,
      pageSize: 20,
    }));
  });

  it("fails closed without rendering stale comments", async () => {
    mocks.getPage.mockRejectedValue(new Error("admin_role_required"));
    render(<AdminFeedbackIntelligenceComments />);

    expect(await screen.findByText("Kommentare konnten nicht sicher geladen werden.")).toBeInTheDocument();
    expect(screen.queryByText(feedbackItem.comment)).not.toBeInTheDocument();
  });
});
