import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DashboardBootstrapError,
  loadDashboardBootstrapStages,
  runDashboardBootstrap,
} from "@/lib/dashboardBootstrap";

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
};

describe("dashboard bootstrap recovery", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
  });

  it("retries one transient WebView transport failure and returns the second result", async () => {
    const load = vi.fn()
      .mockRejectedValueOnce(new TypeError("Load failed"))
      .mockResolvedValueOnce("dashboard-ready");

    const result = runDashboardBootstrap(load);
    await act(async () => vi.advanceTimersByTimeAsync(500));

    await expect(result).resolves.toBe("dashboard-ready");
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("aborts a timed-out first request wave before starting the retry", async () => {
    const first = deferred<string>();
    const signals: AbortSignal[] = [];
    const load = vi.fn((signal: AbortSignal) => {
      signals.push(signal);
      return signals.length === 1 ? first.promise : Promise.resolve("second-attempt");
    });

    const result = runDashboardBootstrap(load);
    await act(async () => vi.advanceTimersByTimeAsync(4_500));
    await expect(result).resolves.toBe("second-attempt");
    expect(signals).toHaveLength(2);
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);

    await act(async () => first.resolve("late-first-attempt"));
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("does not retry authorization or permission failures", async () => {
    const load = vi.fn().mockRejectedValue({ status: 403, message: "Forbidden" });

    const result = runDashboardBootstrap(load);
    const rejected = result.catch((error: unknown) => error);
    const error = await rejected;
    expect(error).toBeInstanceOf(DashboardBootstrapError);
    expect(error).toMatchObject({ code: "forbidden" });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("stops after exactly one retry when the transport remains unavailable", async () => {
    const load = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    const result = runDashboardBootstrap(load);
    const rejected = result.catch((error: unknown) => error);
    await act(async () => vi.advanceTimersByTimeAsync(500));
    const error = await rejected;
    expect(error).toBeInstanceOf(DashboardBootstrapError);
    expect(error).toMatchObject({ code: "fetch_error" });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("finishes setup before starting the larger status request group", async () => {
    const setup = deferred<string>();
    const loadStatus = vi.fn().mockResolvedValue("status-ready");
    const signal = new AbortController().signal;

    const result = loadDashboardBootstrapStages({
      loadAnalysis: vi.fn().mockResolvedValue("analysis-ready"),
      loadReferenceDate: vi.fn().mockResolvedValue("2026-07-23"),
      loadSetup: vi.fn().mockReturnValue(setup.promise),
      loadStatus,
    }, signal);

    await act(async () => Promise.resolve());
    expect(loadStatus).not.toHaveBeenCalled();

    await act(async () => setup.resolve("setup-ready"));
    await expect(result).resolves.toEqual([
      "analysis-ready",
      "2026-07-23",
      "setup-ready",
      "status-ready",
    ]);
    expect(loadStatus).toHaveBeenCalledTimes(1);
  });
});
