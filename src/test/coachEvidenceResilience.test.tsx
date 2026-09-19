import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CoachEvidenceReviewPanel from "@/components/coach/CoachEvidenceReviewPanel";
import TeamEvidence from "@/components/coach/TeamEvidence";
import type { CoachEvidenceReviewContext } from "@/lib/evidenceTracking";
import { createPostgrestResultError } from "@/lib/recoverableRemoteLoad";

const mocks = vi.hoisted(() => ({
  captureAppError: vi.fn(),
  getContext: vi.fn(),
  rpc: vi.fn(),
  saveReview: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: mocks.rpc },
}));

vi.mock("@/lib/monitoring", () => ({ captureAppError: mocks.captureAppError }));

vi.mock("@/lib/evidenceTracking", async () => {
  const actual = await vi.importActual<typeof import("@/lib/evidenceTracking")>("@/lib/evidenceTracking");
  return {
    ...actual,
    getCoachEvidenceReviewContext: mocks.getContext,
    saveCoachEvidenceReview: mocks.saveReview,
  };
});

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/components/evidence/CoachWeeklyReview", async () => {
  const React = await vi.importActual<typeof import("react")>("react");
  const MockCoachWeeklyReview = ({
    onSubmit,
  }: {
    onSubmit: (submission: {
      context: "training";
      values: {
        attention_return: 1;
        error_recovery: 1;
        pressure_regulation: 1;
        process_execution: 1;
        action_under_uncertainty: 1;
      };
      durationMs: number;
    }) => Promise<void>;
  }) => {
    const [draft, setDraft] = React.useState("");
    return (
      <div>
        <label htmlFor="review-draft">Offene Eingabe</label>
        <input id="review-draft" value={draft} onChange={(event) => setDraft(event.target.value)} />
        <button
          type="button"
          onClick={() => void onSubmit({
            context: "training",
            values: {
              attention_return: 1,
              error_recovery: 1,
              pressure_regulation: 1,
              process_execution: 1,
              action_under_uncertainty: 1,
            },
            durationMs: 100,
          })}
        >
          Beobachtung speichern
        </button>
      </div>
    );
  };
  return {
    default: MockCoachWeeklyReview,
  };
});

const emptyOutcome = {
  team_id: "team-1",
  min_n: 5,
  total_athletes: 0,
  sufficient_data: false,
  cohort_breakdown: {
    never_started: 0,
    only_pre: 0,
    pre_and_mid_no_post: 0,
    completed_pre_post: 0,
  },
  assessment_completion: { pre_n: 0, mid_n: 0, post_n: 0 },
  adherence: null,
  changes: { pre_post: [], pre_mid: [] },
  comprehension: { avg_correct_rate: null, total_completed: 0, distinct_users: 0 },
  weekly_trend: [],
  disclaimer: "Nur aggregierte Daten.",
};

const reviewContext = (teamEligible: boolean): CoachEvidenceReviewContext => ({
  enabled: true,
  reason: "active",
  protocolVersion: "v1",
  run: { id: "run-1", name: "U17 · 56-Tage-Programm", startedAt: "2026-09-01", status: "active" },
  weekNumber: 1,
  teamEligible,
  athleteCount: 1,
  eligibleAthleteCount: teamEligible ? 1 : 0,
  athletes: [{
    programInstanceId: "instance-1",
    userId: "athlete-1",
    fullName: "Alpha Beispiel",
    observationAvailable: true,
    eligible: teamEligible,
    eligibilityReason: teamEligible ? "eligible" : "consent_missing",
    review: null,
  }],
  teamReview: null,
});

const rpcFailure = (
  status: number,
  statusText: string,
  message: string,
  code = "PGRST001",
) => ({
  data: null,
  error: { code, details: "", hint: "", message },
  status,
  statusText,
});
const rpcSuccess = () => ({ data: emptyOutcome, error: null, status: 200, statusText: "OK" });

describe("Coach Entwicklung load resilience", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.saveReview.mockResolvedValue({ ok: true });
  });

  afterEach(cleanup);

  it("retries one real PostgREST 503 result silently and renders the successful result", async () => {
    mocks.rpc
      .mockResolvedValueOnce(rpcFailure(503, "Service Unavailable", "Service unavailable", "PGRST002"))
      .mockResolvedValueOnce(rpcSuccess());

    render(<TeamEvidence teamId="team-1" />);

    expect(await screen.findByRole("heading", { name: "Noch keine Entwicklungsdaten verfügbar" })).toBeInTheDocument();
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
    expect(screen.queryByText("Entwicklungsdaten gerade nicht verfügbar")).not.toBeInTheDocument();
    expect(mocks.captureAppError).not.toHaveBeenCalled();
  });

  it("stops after one transient retry, keeps the error, and offers a bounded manual retry", async () => {
    const unavailable = rpcFailure(503, "Service Unavailable", "Service unavailable", "PGRST002");
    mocks.rpc.mockResolvedValue(unavailable);

    render(<TeamEvidence teamId="team-1" />);

    expect(await screen.findByText("Entwicklungsdaten gerade nicht verfügbar")).toBeInTheDocument();
    expect(mocks.rpc).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole("button", { name: "Erneut laden" }));

    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledTimes(4));
    expect(await screen.findByText("Entwicklungsdaten gerade nicht verfügbar")).toBeInTheDocument();
  });

  it("does not silently or automatically retry a real 4xx permission failure", async () => {
    mocks.rpc.mockResolvedValue(rpcFailure(403, "Forbidden", "RLS denied", "42501"));

    render(<TeamEvidence teamId="team-1" />);

    expect(await screen.findByText("Entwicklungsdaten gerade nicht verfügbar")).toBeInTheDocument();
    expect(mocks.rpc).toHaveBeenCalledTimes(1);

    fireEvent.focus(window);
    window.dispatchEvent(new Event("online"));
    await Promise.resolve();
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });

  it("reloads once when the Entwicklung tab is revisited after a transient failure", async () => {
    mocks.rpc.mockResolvedValue(rpcFailure(502, "Bad Gateway", "Bad gateway", "PGRST000"));
    const view = render(<TeamEvidence teamId="team-1" active />);

    expect(await screen.findByText("Entwicklungsdaten gerade nicht verfügbar")).toBeInTheDocument();
    expect(mocks.rpc).toHaveBeenCalledTimes(2);

    view.rerender(<TeamEvidence teamId="team-1" active={false} />);
    mocks.rpc.mockResolvedValue(rpcSuccess());
    view.rerender(<TeamEvidence teamId="team-1" active />);

    expect(await screen.findByRole("heading", { name: "Noch keine Entwicklungsdaten verfügbar" })).toBeInTheDocument();
    expect(mocks.rpc).toHaveBeenCalledTimes(3);
  });

  it("deduplicates simultaneous focus and online recovery signals", async () => {
    const unavailable = rpcFailure(503, "Service Unavailable", "Service unavailable", "PGRST002");
    mocks.rpc.mockResolvedValue(unavailable);
    render(<TeamEvidence teamId="team-1" active />);

    expect(await screen.findByText("Entwicklungsdaten gerade nicht verfügbar")).toBeInTheDocument();
    expect(mocks.rpc).toHaveBeenCalledTimes(2);

    let resolveRecovery: ((value: ReturnType<typeof rpcSuccess>) => void) | undefined;
    mocks.rpc.mockImplementation(() => new Promise((resolve) => {
      resolveRecovery = resolve;
    }));

    fireEvent.focus(window);
    window.dispatchEvent(new Event("online"));
    expect(mocks.rpc).toHaveBeenCalledTimes(3);

    resolveRecovery?.(rpcSuccess());
    expect(await screen.findByRole("heading", { name: "Noch keine Entwicklungsdaten verfügbar" })).toBeInTheDocument();
    expect(mocks.rpc).toHaveBeenCalledTimes(3);
  });

  it("does not start the retry after unmount cleanup", async () => {
    let resolveRequest: ((value: ReturnType<typeof rpcFailure>) => void) | undefined;
    mocks.rpc.mockImplementationOnce(() => new Promise((resolve) => {
      resolveRequest = resolve;
    }));
    const view = render(<TeamEvidence teamId="team-1" active />);

    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    view.unmount();

    await act(async () => {
      resolveRequest?.(rpcFailure(503, "Service Unavailable", "Service unavailable", "PGRST002"));
    });
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });

  it("does not retry a stale request after the selected team changes", async () => {
    let resolveOldRequest: ((value: ReturnType<typeof rpcFailure>) => void) | undefined;
    mocks.rpc
      .mockImplementationOnce(() => new Promise((resolve) => {
        resolveOldRequest = resolve;
      }))
      .mockResolvedValueOnce(rpcSuccess());
    const view = render(<TeamEvidence teamId="team-1" active />);

    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    view.rerender(<TeamEvidence teamId="team-2" active />);

    expect(await screen.findByRole("heading", { name: "Noch keine Entwicklungsdaten verfügbar" })).toBeInTheDocument();
    expect(mocks.rpc).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolveOldRequest?.(rpcFailure(503, "Service Unavailable", "Service unavailable", "PGRST002"));
    });
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
  });

  it("does not refresh a successful state on focus and removes recovery listeners on unmount", async () => {
    mocks.rpc.mockResolvedValue(rpcSuccess());
    const view = render(<TeamEvidence teamId="team-1" active />);

    expect(await screen.findByRole("heading", { name: "Noch keine Entwicklungsdaten verfügbar" })).toBeInTheDocument();
    expect(mocks.rpc).toHaveBeenCalledTimes(1);

    fireEvent.focus(window);
    window.dispatchEvent(new Event("online"));
    await Promise.resolve();
    expect(mocks.rpc).toHaveBeenCalledTimes(1);

    view.unmount();
    fireEvent.focus(window);
    window.dispatchEvent(new Event("online"));
    await Promise.resolve();
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });

  it("keeps Team locked and Einzel active when teamEligible is false", async () => {
    mocks.getContext.mockResolvedValue(reviewContext(false));

    render(<CoachEvidenceReviewPanel teamId="team-1" />);

    expect(await screen.findByText("Alpha Beispiel")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Team" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "Einzel" })).toBeEnabled();
    expect(screen.getByRole("radio", { name: "Einzel" })).toHaveAttribute("data-state", "on");
  });

  it("keeps an open form mounted when a background refresh fails and later recovers", async () => {
    const context = reviewContext(true);
    const unavailable = createPostgrestResultError(
      rpcFailure(503, "Service Unavailable", "Service unavailable", "PGRST002"),
    );
    mocks.getContext
      .mockResolvedValueOnce(context)
      .mockRejectedValueOnce(unavailable)
      .mockRejectedValueOnce(unavailable);

    render(<CoachEvidenceReviewPanel teamId="team-1" active />);

    const input = await screen.findByLabelText("Offene Eingabe");
    fireEvent.change(input, { target: { value: "Diese Eingabe bleibt erhalten" } });
    fireEvent.click(screen.getByRole("button", { name: "Beobachtung speichern" }));

    expect(await screen.findByText(/Die letzte Aktualisierung ist fehlgeschlagen/)).toBeInTheDocument();
    expect(screen.getByLabelText("Offene Eingabe")).toHaveValue("Diese Eingabe bleibt erhalten");

    mocks.getContext.mockResolvedValue(context);
    fireEvent.focus(window);

    await waitFor(() => {
      expect(screen.queryByText(/Die letzte Aktualisierung ist fehlgeschlagen/)).not.toBeInTheDocument();
    });
    expect(screen.getByLabelText("Offene Eingabe")).toHaveValue("Diese Eingabe bleibt erhalten");
    expect(mocks.saveReview).toHaveBeenCalledTimes(1);
  });
});
