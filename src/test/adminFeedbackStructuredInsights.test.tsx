import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AdminFeedbackStructuredInsights from "@/components/admin/AdminFeedbackStructuredInsights";
import { buildAdminFeedbackCheckpointSummaries, type AdminFeedbackInsights } from "@/lib/adminFeedbackInsights";

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
    const onSourceStateChange = vi.fn();
    render(<AdminFeedbackStructuredInsights dataScope="synthetic" insightLoader={vi.fn().mockResolvedValue(sufficient)} onSourceStateChange={onSourceStateChange} />);

    expect(await screen.findByText("Sehr verständlich")).toBeInTheDocument();
    expect(screen.getByText("67 %")).toBeInTheDocument();
    expect(screen.getByText("Bericht ab Tag 11")).toBeInTheDocument();
    expect(screen.getByText(/Am häufigsten: Sehr verständlich · 67 % \(4 Athleten\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Namen, E-Mails, Nutzerkennungen, Journale und Freitexte sind ausgeschlossen/i)).toBeInTheDocument();
    expect(onSourceStateChange).toHaveBeenCalledWith("CURRENT");
  });

  it("maps every feedback checkpoint to its next-day Jarvis report without including suppressed questions", () => {
    const baseQuestion = sufficient.questions[0];
    const questions = ([10, 24, 39, 55] as const).flatMap((programDay) => [
      { ...baseQuestion, programDay, questionId: `q-${programDay}`, questionPrompt: `Frage ${programDay}` },
      { ...baseQuestion, programDay, questionId: `suppressed-${programDay}`, questionPrompt: "gesperrt", participants: 4, sufficientData: false },
    ]);
    const summaries = buildAdminFeedbackCheckpointSummaries({
      ...sufficient,
      checkpointsWithData: 4,
      questions,
    } as AdminFeedbackInsights);

    expect(summaries.map(({ programDay, reportDay }) => [programDay, reportDay])).toEqual([
      [10, 11],
      [24, 25],
      [39, 40],
      [55, 56],
    ]);
    expect(summaries.every(({ questionsEvaluated }) => questionsEvaluated === 1)).toBe(true);
    expect(summaries.flatMap(({ highlights }) => highlights).some(({ questionPrompt }) => questionPrompt === "gesperrt")).toBe(false);
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
    const onSourceStateChange = vi.fn();
    render(<AdminFeedbackStructuredInsights dataScope="production" insightLoader={vi.fn().mockRejectedValue(new Error("denied"))} onSourceStateChange={onSourceStateChange} />);
    expect(await screen.findByText(/Strukturierte Antworten konnten nicht sicher geladen werden/i)).toBeInTheDocument();
    expect(onSourceStateChange).toHaveBeenCalledWith("FAILED");
  });
});
