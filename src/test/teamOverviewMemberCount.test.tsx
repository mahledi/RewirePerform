import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TeamOverview from "@/components/coach/TeamOverview";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  invoke: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mocks.from,
    functions: { invoke: mocks.invoke },
    rpc: mocks.rpc,
  },
}));

vi.mock("@/lib/monitoring", () => ({ captureAppError: vi.fn() }));

const queryResult = (value: unknown) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockResolvedValue(value),
  in: vi.fn().mockResolvedValue(value),
});

const abortableResult = <T,>(value: T) => {
  const promise = Promise.resolve(value) as Promise<T> & {
    abortSignal: (signal: AbortSignal) => Promise<T>;
  };
  promise.abortSignal = vi.fn(() => promise);
  return promise;
};

describe("coach team member count", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const athleteIds = Array.from({ length: 6 }, (_, index) => `athlete-${index + 1}`);
    mocks.from.mockImplementation((table: string) => {
      if (table === "team_members") {
        return queryResult({
          data: athleteIds.map((user_id) => ({ user_id })),
          error: null,
        });
      }
      if (table === "user_roles") {
        return queryResult({
          data: athleteIds.map((user_id) => ({ user_id, role: "athlete" })),
          error: null,
        });
      }
      throw new Error(`Unexpected table: ${table}`);
    });
    mocks.invoke.mockResolvedValue({
      data: {
        teamSize: 5,
        min_n: 5,
        participation: { total: 5 },
      },
      error: null,
    });
    mocks.rpc.mockImplementation((name: string) => {
      if (name === "compute_team_outcomes") {
        return Promise.resolve({
          data: { assessment_completion: { pre_n: 5, mid_n: 0, post_n: 0 } },
          error: null,
        });
      }
      if (name === "get_coach_team_checkin_status_v1_4") {
        return abortableResult({
          data: Array.from({ length: 6 }, (_, index) => ({
            user_id: `athlete-${index + 1}`,
            full_name: `Athlet ${index + 1}`,
            program_instance_id: `instance-${index + 1}`,
            program_local_date: "2026-08-30",
            today_checkin_completed: index < 2,
            today_checkin_at: index < 2 ? "2026-08-30T08:00:00Z" : null,
            rolling_7_completed: index < 2 ? 1 : 0,
            rolling_7_available: 1,
            rolling_7_rate: index < 2 ? 1 : 0,
            already_reminded_today: false,
            supported_push_channels: index < 5 ? ["apns"] : [],
          })),
          error: null,
        });
      }
      if (name === "get_team_questionnaire_status") {
        return Promise.resolve({
          data: athleteIds.map((user_id, index) => ({
            user_id,
            is_complete: index < 5,
          })),
          error: null,
        });
      }
      throw new Error(`Unexpected RPC: ${name}`);
    });
  });

  it("keeps all athlete members visible when an aggregate only contains five", async () => {
    render(<TeamOverview teamId="team-1" />);

    await waitFor(() => {
      expect(screen.getByText("Sportler im Team").previousElementSibling).toHaveTextContent("6");
    });
    expect(await screen.findByText("Athlet 6")).toBeInTheDocument();
  });

  it("makes an unstarted program prominent and routes through the provided real start action", async () => {
    const onPrepareProgramStart = vi.fn();
    render(
      <TeamOverview
        teamId="team-1"
        teamName="U17"
        programStartDate={null}
        onPrepareProgramStart={onPrepareProgramStart}
      />,
    );

    expect(await screen.findByRole("heading", { name: "Programm noch nicht gestartet." })).toBeInTheDocument();
    const action = screen.getByRole("button", { name: /Programmstart vorbereiten/ });
    expect(action).toHaveTextContent("Der erste Programmtag beginnt nach dem Start am Folgetag.");
    fireEvent.click(action);
    expect(onPrepareProgramStart).toHaveBeenCalledTimes(1);
  });

  it("keeps the real day and progress view for an already started team", async () => {
    render(
      <TeamOverview
        teamId="team-1"
        teamName="U17"
        programStartDate="2026-08-01"
      />,
    );

    expect(await screen.findByRole("heading", { name: "U17" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Programmfortschritt .* von 56 Tagen/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Programmstart vorbereiten/ })).not.toBeInTheDocument();
    expect(screen.getByText("2/6")).toBeInTheDocument();
    expect(screen.getByText("Check-ins heute")).toBeInTheDocument();
    expect(screen.getByText("7-Tage-Rhythmus")).toBeInTheDocument();
    expect(screen.getAllByText("Heute offen")).toHaveLength(4);
    expect(screen.queryByText("inaktiv")).not.toBeInTheDocument();
    expect(screen.queryByText(/Streak/)).not.toBeInTheDocument();
  });

  it("shows the approved fixed reminder copy and channel coverage before sending", async () => {
    mocks.invoke.mockResolvedValueOnce({
      data: { openToday: 4, reachable: 3, withoutChannel: 1, alreadyReminded: 0 },
      error: null,
    });
    render(
      <TeamOverview teamId="team-1" teamName="U17" programStartDate="2026-08-01" />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Offene Check-ins erinnern" }));

    expect(await screen.findByRole("heading", { name: "Offene Check-ins erinnern?" })).toBeInTheDocument();
    expect(screen.getByText(/Nimm dir bitte sobald wie möglich kurz Zeit dafür/)).toBeInTheDocument();
    expect(screen.getByText(/3 Athleten sind aktuell/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Freundlich erinnern" })).toBeEnabled();
  });

  it("keeps the current dashboard visible while a focus refresh is still pending", async () => {
    render(<TeamOverview teamId="team-1" teamName="U17" programStartDate="2026-08-01" />);
    expect(await screen.findByText("2/6")).toBeInTheDocument();

    let resolveRefresh: ((value: { data: unknown[]; error: null }) => void) | undefined;
    const pending = new Promise<{ data: unknown[]; error: null }>((resolve) => {
      resolveRefresh = resolve;
    }) as Promise<{ data: unknown[]; error: null }> & {
      abortSignal: (signal: AbortSignal) => Promise<{ data: unknown[]; error: null }>;
    };
    pending.abortSignal = vi.fn(() => pending);
    const originalRpc = mocks.rpc.getMockImplementation();
    mocks.rpc.mockImplementation((name: string, args: unknown) => {
      if (name === "get_coach_team_checkin_status_v1_4") return pending;
      if (!originalRpc) throw new Error(`Unexpected RPC: ${name}`);
      return originalRpc(name, args);
    });

    fireEvent.focus(window);
    expect(screen.getByText("2/6")).toBeInTheDocument();
    expect(screen.getByText("Athlet 6")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Teilnahmestatus im Hintergrund aktualisieren" })).toBeDisabled();
    expect(screen.getByText(/Stand \d{2}:\d{2}/)).toBeInTheDocument();

    resolveRefresh?.({
      data: Array.from({ length: 6 }, (_, index) => ({
        user_id: `athlete-${index + 1}`,
        full_name: `Athlet ${index + 1}`,
        program_instance_id: `instance-${index + 1}`,
        program_local_date: "2026-09-01",
        today_checkin_completed: index < 3,
        today_checkin_at: index < 3 ? "2026-09-01T08:00:00Z" : null,
        rolling_7_completed: index < 3 ? 1 : 0,
        rolling_7_available: 1,
        rolling_7_rate: index < 3 ? 1 : 0,
        already_reminded_today: false,
        supported_push_channels: ["apns"],
      })),
      error: null,
    });
    expect(await screen.findByText("3/6")).toBeInTheDocument();
  });
});
