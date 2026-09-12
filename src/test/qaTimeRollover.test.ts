import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearQaTimeCache,
  formatProgramCalendarDateISO,
  getEffectiveTodayISO,
} from "@/lib/qaTime";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: mocks.rpc },
}));

const rpcQuery = (result: { data: string | null; error: null | { message: string } }) => {
  const query: Record<string, unknown> = {};
  query.retry = vi.fn(() => query);
  query.abortSignal = vi.fn(() => query);
  query.then = (
    resolve: (value: typeof result) => unknown,
    reject?: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(resolve, reject);
  return query;
};

describe("effective program calendar date", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    clearQaTimeCache();
  });

  afterEach(() => {
    clearQaTimeCache();
    vi.useRealTimers();
  });

  it("uses the Europe/Berlin calendar boundary in winter and summer", () => {
    expect(formatProgramCalendarDateISO(new Date("2026-01-01T22:59:59Z")))
      .toBe("2026-01-01");
    expect(formatProgramCalendarDateISO(new Date("2026-01-01T23:00:00Z")))
      .toBe("2026-01-02");

    expect(formatProgramCalendarDateISO(new Date("2026-07-01T21:59:59Z")))
      .toBe("2026-07-01");
    expect(formatProgramCalendarDateISO(new Date("2026-07-01T22:00:00Z")))
      .toBe("2026-07-02");
  });

  it("does not reuse a 60-second cache entry across Berlin midnight", async () => {
    vi.setSystemTime(new Date("2026-09-01T21:59:59Z"));
    mocks.rpc
      .mockImplementationOnce(() => rpcQuery({ data: "2026-09-01", error: null }))
      .mockImplementationOnce(() => rpcQuery({ data: "2026-09-02", error: null }));

    await expect(getEffectiveTodayISO("athlete-1")).resolves.toBe("2026-09-01");

    vi.setSystemTime(new Date("2026-09-01T22:00:01Z"));
    await expect(getEffectiveTodayISO("athlete-1")).resolves.toBe("2026-09-02");
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
  });

  it("uses the Berlin calendar fallback when the RPC is unavailable", async () => {
    vi.setSystemTime(new Date("2026-09-01T22:15:00Z"));
    mocks.rpc.mockImplementationOnce(() => rpcQuery({
      data: null,
      error: { message: "offline" },
    }));

    await expect(getEffectiveTodayISO("athlete-1")).resolves.toBe("2026-09-02");
  });
});
