import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import QaEvidenceParityPanel from "@/components/admin/QaEvidenceParityPanel";
import { TRANSFER_PULSE_SCHEDULE } from "@/lib/performanceEvidence";
import type { QaEvidenceParityReport } from "@/lib/qaEvidenceParity";

const { loadQaEvidenceParity } = vi.hoisted(() => ({ loadQaEvidenceParity: vi.fn() }));

vi.mock("@/lib/qaEvidenceParity", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/qaEvidenceParity")>();
  return { ...actual, loadQaEvidenceParity };
});

const report = (): QaEvidenceParityReport => ({
  schemaVersion: "qa_evidence_parity_v1",
  generatedAt: "2026-07-17T09:00:00.000Z",
  protocolVersion: "56d-transfer-v2-2026-07",
  state: "IN_PROGRESS",
  stateLabel: "QA-Durchlauf noch nicht vollständig",
  scope: {
    teamId: "team-1",
    teamName: "QA Team",
    programRunId: "run-1",
    programRunName: "QA Run",
    simulatedDate: "2026-07-20",
    simulatedDayNumber: 4,
    testOnly: true,
  },
  setup: {
    athletes: 5,
    activeInstances: 5,
    expectedQaAthletes: 5,
    allParticipantsTestFlagged: true,
  },
  coverage: {
    scheduledDays: 16,
    reachedDays: 1,
    passedDays: 0,
    expectedObservations: 0,
    collectedObservations: 0,
    missingObservations: 0,
    notObservedResponses: 0,
    completedCoachWeeks: 0,
    reachedCoachWeeks: 0,
  },
  days: TRANSFER_PULSE_SCHEDULE.map((pulse) => ({
    dayNumber: pulse.dayNumber,
    domainId: pulse.domainId,
    reached: pulse.dayNumber === 4,
    athleteCount: 5,
    assignedAthletes: 0,
    expectedObservations: 0,
    restSkips: 0,
    completedAthletes: 0,
    collectedObservations: 0,
    notObserved: 0,
    missingObservations: 0,
    completionWithoutEvidence: 0,
    evidenceWithoutCompletion: 0,
    status: pulse.dayNumber === 4 ? "not_started" : "not_reached",
  })),
  coachWeeks: Array.from({ length: 8 }, (_, index) => ({
    weekNumber: index + 1,
    reached: false,
    completed: false,
  })),
  checks: {
    participantsWithoutBothTestFlags: 0,
    observationsWithoutTestFlag: 0,
    coachReviewsWithoutTestFlag: 0,
    scheduleMismatches: 0,
    observationsVisibleInProduction: 0,
    participantsVisibleInProduction: 0,
    completionWithoutEvidence: 0,
    evidenceWithoutCompletion: 0,
  },
  privacy: {
    responseValuesExposed: false,
    athleteIdentifiersExposed: false,
    privateTextExposed: false,
    productionExportIncludesQa: false,
  },
});

describe("QA evidence parity UI", () => {
  beforeEach(() => {
    loadQaEvidenceParity.mockReset();
    loadQaEvidenceParity.mockResolvedValue(report());
  });

  it("renders every real evidence day and the production-isolation checks", async () => {
    render(<QaEvidenceParityPanel programRunId="run-1" />);

    expect(await screen.findByRole("heading", { name: "Evidence-Paritätsgate" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Zu Tag \d+ springen/ })).toHaveLength(16);
    expect(screen.getByText("QA aus Production ausgeschlossen")).toBeInTheDocument();
    expect(screen.getByText("Keine Athletennamen, Scores oder Freitexte")).toBeInTheDocument();
  });

  it("jumps directly to a scheduled day and refreshes the report", async () => {
    const onJumpToDay = vi.fn().mockResolvedValue(undefined);
    render(<QaEvidenceParityPanel programRunId="run-1" onJumpToDay={onJumpToDay} />);

    const dayFour = await screen.findByRole("button", { name: "Zu Tag 4 springen: Noch nicht getestet" });
    fireEvent.click(dayFour);

    await waitFor(() => expect(onJumpToDay).toHaveBeenCalledWith(4));
    await waitFor(() => expect(loadQaEvidenceParity).toHaveBeenCalledTimes(2));
  });
});
