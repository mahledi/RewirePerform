import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TeamMentalState from "@/components/coach/TeamMentalState";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  from: vi.fn(),
  refreshSession: vi.fn(),
  getSession: vi.fn(),
  signOut: vi.fn(),
}));

const authState = vi.hoisted(() => ({
  session: {
    access_token: "access-token",
    user: { id: "coach-1" },
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: mocks.invoke },
    from: mocks.from,
    auth: {
      refreshSession: mocks.refreshSession,
      getSession: mocks.getSession,
      signOut: mocks.signOut,
    },
  },
}));

vi.mock("@/lib/monitoring", () => ({ captureAppError: vi.fn() }));

const noActiveProgram = {
  insufficient_data: true,
  insufficient_reason: "no_active_program_run",
  min_n: 5,
  teamSize: 0,
  energy: { current: null, trend: [] },
  mood: { current: null, trend: [] },
  focus: { current: null, trend: [] },
  participation: { rate: 0, total: 0 },
  stressWarning: false,
};

const query = (data: unknown) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
});

describe("coach team state before program start", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.invoke.mockResolvedValue({ data: noActiveProgram, error: null });
    mocks.from.mockImplementation((table: string) => {
      if (table === "teams") {
        return query({ id: "team-1", name: "U17", program_start_date: null });
      }
      if (table === "team_calendar_events") return query(null);
      throw new Error(`Unexpected table: ${table}`);
    });
  });

  it("shows a calm prestart state instead of an error or an empty-team claim", async () => {
    render(<TeamMentalState teamId="team-1" />);

    expect(await screen.findByRole("heading", { name: "Teamzustand ab Programmstart verfügbar" })).toBeInTheDocument();
    expect(screen.getByText(/Sobald das Programm läuft und ausreichend Check-ins vorliegen/)).toBeInTheDocument();
    expect(screen.queryByText("Teamzustand gerade nicht verfügbar")).not.toBeInTheDocument();
    expect(screen.queryByText("Keine Athleten im Team.")).not.toBeInTheDocument();
  });

  it("refreshes an expired function token once and keeps the prestart state", async () => {
    const unauthorized = { context: new Response(null, { status: 401 }) };
    mocks.invoke
      .mockResolvedValueOnce({ data: null, error: unauthorized })
      .mockResolvedValueOnce({ data: noActiveProgram, error: null });
    mocks.refreshSession.mockResolvedValue({
      data: {
        session: {
          access_token: "fresh-access-token",
          user: { id: "coach-1" },
        },
      },
      error: null,
    });

    render(<TeamMentalState teamId="team-1" />);

    expect(await screen.findByRole("heading", { name: "Teamzustand ab Programmstart verfügbar" })).toBeInTheDocument();
    expect(mocks.refreshSession).toHaveBeenCalledTimes(1);
    expect(mocks.invoke).toHaveBeenNthCalledWith(2, "team-mental-state", expect.objectContaining({
      headers: { Authorization: "Bearer fresh-access-token" },
    }));
    expect(screen.queryByText("Teamzustand gerade nicht verfügbar")).not.toBeInTheDocument();
  });

  it("clears only the still-current local session when renewal is impossible", async () => {
    const unauthorized = { context: new Response(null, { status: 401 }) };
    mocks.invoke.mockResolvedValue({ data: null, error: unauthorized });
    mocks.refreshSession.mockResolvedValue({ data: { session: null }, error: new Error("expired") });
    mocks.getSession.mockResolvedValue({ data: { session: authState.session }, error: null });
    mocks.signOut.mockResolvedValue({ error: null });

    render(<TeamMentalState teamId="team-1" />);

    await waitFor(() => {
      expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
    });
    expect(screen.queryByText("Teamzustand gerade nicht verfügbar")).not.toBeInTheDocument();
  });
});
