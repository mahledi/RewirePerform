import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearCachedProgramModeInfo,
  getCachedProgramModeInfo,
  getProgramModeInfo,
} from "@/lib/programMode";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}));

type QueryResult = {
  data: unknown;
  error: { message: string } | null;
};

const query = (result: QueryResult) => {
  const chain: Record<string, unknown> = {};
  for (const method of [
    "select",
    "eq",
    "in",
    "not",
    "order",
    "limit",
    "retry",
    "abortSignal",
  ]) {
    chain[method] = vi.fn(() => chain);
  }
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  chain.then = (
    resolve: (value: QueryResult) => unknown,
    reject?: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(resolve, reject);
  return chain;
};

describe("program mode resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCachedProgramModeInfo();
  });

  it("keeps an active run's team and start date paired", async () => {
    const responses: Record<string, QueryResult> = {
      team_members: {
        data: [
          { team_id: "newest-membership", joined_at: "2026-07-01" },
          { team_id: "active-run-team", joined_at: "2026-06-01" },
        ],
        error: null,
      },
      program_runs: {
        data: [{ team_id: "active-run-team", started_at: "2026-07-15" }],
        error: null,
      },
      teams: {
        data: [
          { id: "newest-membership", program_start_date: "2026-07-01" },
          { id: "active-run-team", program_start_date: "2026-06-01" },
        ],
        error: null,
      },
    };
    mocks.from.mockImplementation((table: string) => query(responses[table]));

    await expect(getProgramModeInfo("athlete-1")).resolves.toMatchObject({
      mode: "team",
      teamId: "active-run-team",
      teamStartDate: "2026-07-15",
      soloStartDate: null,
      effectiveStartDate: "2026-07-15",
    });
    expect(getCachedProgramModeInfo("athlete-1")).toMatchObject({
      mode: "team",
      teamId: "active-run-team",
      teamStartDate: "2026-07-15",
    });
  });

  it("keeps the legacy team's id paired with the earliest legacy start", async () => {
    const responses: Record<string, QueryResult> = {
      team_members: {
        data: [
          { team_id: "later-team", joined_at: "2026-07-01" },
          { team_id: "earlier-team", joined_at: "2026-06-01" },
        ],
        error: null,
      },
      program_runs: { data: [], error: null },
      teams: {
        data: [
          { id: "later-team", program_start_date: "2026-07-10" },
          { id: "earlier-team", program_start_date: "2026-06-20" },
        ],
        error: null,
      },
    };
    mocks.from.mockImplementation((table: string) => query(responses[table]));

    await expect(getProgramModeInfo("athlete-1")).resolves.toMatchObject({
      mode: "team",
      teamId: "earlier-team",
      teamStartDate: "2026-06-20",
      effectiveStartDate: "2026-06-20",
    });
  });

  it("resolves solo mode without issuing team queries", async () => {
    const responses: Record<string, QueryResult> = {
      team_members: { data: [], error: null },
      program_settings: {
        data: { program_start: "2026-07-05" },
        error: null,
      },
    };
    mocks.from.mockImplementation((table: string) => query(responses[table]));

    await expect(getProgramModeInfo("athlete-1")).resolves.toEqual({
      mode: "solo",
      teamStartDate: null,
      soloStartDate: "2026-07-05",
      effectiveStartDate: "2026-07-05",
      setupRequired: false,
      setupReason: null,
    });
    expect(mocks.from.mock.calls.map(([table]) => table)).toEqual([
      "team_members",
      "program_settings",
    ]);
  });

  it("surfaces query failures so the dashboard recovery can retry", async () => {
    mocks.from.mockReturnValue(query({
      data: null,
      error: { message: "network unavailable" },
    }));

    await expect(getProgramModeInfo("athlete-1")).rejects.toMatchObject({
      message: "network unavailable",
    });
  });
});
