import { render, screen, waitFor } from "@testing-library/react";
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
      if (name === "get_coach_team_activity_status") {
        return Promise.resolve({
          data: Array.from({ length: 6 }, (_, index) => ({
            user_id: `athlete-${index + 1}`,
            full_name: `Athlet ${index + 1}`,
            last_activity_at: null,
            days_completed: 0,
            days_available: 0,
            completion_rate: null,
            current_streak: 0,
            checkins_last_7d: 0,
            last_checkin_date: null,
            journal_entries_count: 0,
            inactive_risk: false,
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
});
