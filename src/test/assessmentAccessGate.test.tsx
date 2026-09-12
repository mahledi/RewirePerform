import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Assessment from "@/pages/Assessment";
import { allAssessments } from "@/data/validatedAssessments";

const mocks = vi.hoisted(() => ({
  getAssessmentCompletionStatus: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "athlete-1" },
    role: "athlete",
    isTestUser: false,
  }),
}));

vi.mock("@/lib/programProgress", () => ({
  getAssessmentCompletionStatus: mocks.getAssessmentCompletionStatus,
}));

vi.mock("@/lib/monitoring", () => ({ captureAppError: vi.fn() }));

const status = (preIds: string[]) => ({
  instanceId: "instance-current",
  completedAssessmentIds: { pre: preIds, mid: [], post: [] },
  preDone: preIds.length === allAssessments.length,
  midDue: false,
  postDue: false,
  midDone: false,
  postDone: false,
  programDay: 1,
});

const renderRoute = (entry: string) => render(
  <MemoryRouter initialEntries={[entry]}>
    <Routes>
      <Route path="/assessment" element={<Assessment />} />
      <Route path="/dashboard" element={<div>Dashboard erreicht</div>} />
    </Routes>
  </MemoryRouter>,
);

describe("assessment access gate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("redirects a completed start measurement instead of reopening it", async () => {
    mocks.getAssessmentCompletionStatus.mockResolvedValue(status(allAssessments.map((test) => test.id)));
    renderRoute("/assessment?mode=pre");
    expect(await screen.findByText("Dashboard erreicht")).toBeInTheDocument();
  });

  it("resumes a partial start measurement at the first missing instrument", async () => {
    mocks.getAssessmentCompletionStatus.mockResolvedValue(status([allAssessments[0].id]));
    renderRoute("/assessment?mode=pre");

    expect(await screen.findByRole("heading", { name: allAssessments[1].titleShort })).toBeInTheDocument();
    expect(screen.getByText("Messung 2/3")).toBeInTheDocument();
  });

  it("redirects the legacy measurement entry when no measurement is due", async () => {
    mocks.getAssessmentCompletionStatus.mockResolvedValue(status(allAssessments.map((test) => test.id)));
    renderRoute("/assessment");

    await waitFor(() => expect(screen.getByText("Dashboard erreicht")).toBeInTheDocument());
  });

  it("routes the legacy measurement entry into the next incomplete start instrument", async () => {
    mocks.getAssessmentCompletionStatus.mockResolvedValue(status([allAssessments[0].id]));
    renderRoute("/assessment");

    expect(await screen.findByRole("heading", { name: allAssessments[1].titleShort })).toBeInTheDocument();
    expect(screen.getByText("Messung 2/3")).toBeInTheDocument();
  });
});
