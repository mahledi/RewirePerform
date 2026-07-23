import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadDashboardInitialStatus,
  resolveDashboardProgramStart,
} from "@/lib/dashboardInitialStatus";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getOrCreateActiveInstance: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}));

vi.mock("@/lib/programInstance", () => ({
  getOrCreateActiveInstance: mocks.getOrCreateActiveInstance,
}));

type QueryResult = { data: unknown; error: null };

let activeQueries = 0;
let maxConcurrentQueries = 0;

const query = (result: QueryResult) => {
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "order", "limit", "retry", "abortSignal"]) {
    chain[method] = vi.fn(() => chain);
  }
  chain.then = (
    resolve: (value: QueryResult) => unknown,
    reject?: (reason: unknown) => unknown,
  ) => {
    activeQueries += 1;
    maxConcurrentQueries = Math.max(maxConcurrentQueries, activeQueries);
    return Promise.resolve(result).then(
      (value) => {
        activeQueries -= 1;
        return resolve(value);
      },
      (error: unknown) => {
        activeQueries -= 1;
        return reject?.(error);
      },
    );
  };
  return chain;
};

describe("dashboard initial status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    activeQueries = 0;
    maxConcurrentQueries = 0;
    mocks.getOrCreateActiveInstance.mockResolvedValue({
      id: "instance-1",
      started_at: "2026-06-25",
    });

    const responses: Record<string, QueryResult> = {
      assessments: {
        data: [
          ...["csai2r", "smtq", "flow_short"].map((assessment_type) => ({ assessment_type, timing: "pre" })),
          ...["csai2r", "smtq", "flow_short"].map((assessment_type) => ({ assessment_type, timing: "mid" })),
        ],
        error: null,
      },
      deep_profile_assessments: { data: [{ timing: "baseline" }], error: null },
      daily_checkins: { data: [{ id: "checkin-1" }], error: null },
      daily_journals: { data: [{ id: "journal-1" }], error: null },
      user_day_completion: {
        data: [
          { day_number: 1, completed_at: "2026-06-25T10:00:00Z", completion_status: "completed" },
          { day_number: 2, completed_at: "2026-06-26T10:00:00Z", completion_status: "completed" },
        ],
        error: null,
      },
      program_progress_snapshots: {
        data: [{
          current_streak: 2,
          longest_streak: 2,
          days_available: 28,
          days_completed: 2,
          program_day: 28,
        }],
        error: null,
      },
    };

    mocks.from.mockImplementation((table: string) => query(responses[table]));
  });

  it("returns one cohort-scoped first-frame snapshot instead of staggered widget states", async () => {
    const result = await loadDashboardInitialStatus(
      "athlete-1",
      new Date("2026-07-22T12:00:00"),
      null,
    );

    expect(result).toMatchObject({
      preTestsDone: true,
      midTestsDone: true,
      postTestsDone: false,
      midTestDue: false,
      postTestDue: false,
      todayCheckinDone: true,
      todayJournalDone: true,
      baselineDone: true,
      retestDone: false,
      instanceId: "instance-1",
    });
    expect(result.flameStats).toMatchObject({
      currentStreak: 2,
      longestStreak: 2,
      totalCompletedDays: 2,
      daysAvailable: 28,
      programDay: 28,
    });
    expect(mocks.getOrCreateActiveInstance).toHaveBeenCalledTimes(1);
    expect(mocks.from).toHaveBeenCalledTimes(6);
    expect(maxConcurrentQueries).toBeLessThanOrEqual(2);
  });

  it("keeps the team start as the effective date for dashboard test prompts", () => {
    expect(resolveDashboardProgramStart("2026-07-01", "2026-06-01"))
      .toBe("2026-07-01");
    expect(resolveDashboardProgramStart(null, "2026-06-01"))
      .toBe("2026-06-01");
  });
});
