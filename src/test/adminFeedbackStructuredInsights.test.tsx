import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AdminFeedbackStructuredInsights from "@/components/admin/AdminFeedbackStructuredInsights";

const sufficient = {
  generatedAt: "2026-08-24T10:00:00.000Z",
  dataScope: "synthetic" as const,
  participants: 6,
  submissions: 6,
  checkpointsWithData: 1,
  sufficientData: true,
  minimumDistinctParticipants: 5,
  questions: [{
    programDay: 10 as const,
    questionId: "d10_content_clarity",
    questionPrompt: "Wie verständlich sind die täglichen Inhalte bisher für dich?",
    participants: 6,
    selections: 6,
    sufficientData: true,
    optionDistribution: [{
      optionId: "1",
      optionLabel: "Sehr verständlich",
      participants: 4,
      selections: 4,
      participantRate: 0.6667,
    }],
  }],
};

describe("admin structured feedback insights", () => {
  it("renders only aggregate checkbox results and their privacy boundary", async () => {
    render(<AdminFeedbackStructuredInsights dataScope="synthetic" insightLoader={vi.fn().mockResolvedValue(sufficient)} />);

    expect(await screen.findByText("Sehr verständlich")).toBeInTheDocument();
    expect(screen.getByText("67 %")).toBeInTheDocument();
    expect(screen.getByText(/Namen, E-Mails, Nutzerkennungen, Journale und Freitexte sind ausgeschlossen/i)).toBeInTheDocument();
  });

  it("suppresses distributions below five distinct participants", async () => {
    render(<AdminFeedbackStructuredInsights
      dataScope="synthetic"
      insightLoader={vi.fn().mockResolvedValue({ ...sufficient, participants: 2, submissions: null, checkpointsWithData: null, sufficientData: false, questions: [] })}
    />);

    expect(await screen.findByText(/Noch nicht genügend Rückmeldungen/i)).toBeInTheDocument();
    expect(screen.getByText(/Aktuell 2 von mindestens 5/i)).toBeInTheDocument();
    expect(screen.queryByText("Sehr verständlich")).not.toBeInTheDocument();
  });

  it("fails closed when the aggregate RPC cannot be validated", async () => {
    render(<AdminFeedbackStructuredInsights dataScope="production" insightLoader={vi.fn().mockRejectedValue(new Error("denied"))} />);
    expect(await screen.findByText(/Strukturierte Antworten konnten nicht sicher geladen werden/i)).toBeInTheDocument();
  });
});
