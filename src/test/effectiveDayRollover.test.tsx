import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { useState } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  millisecondsUntilNextProgramMidnight,
  useEffectiveDayRollover,
} from "@/hooks/useEffectiveDayRollover";

const mocks = vi.hoisted(() => ({
  getEffectiveTodayDate: vi.fn(),
}));

vi.mock("@/lib/qaTime", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/qaTime")>();
  return {
    ...actual,
    getEffectiveTodayDate: mocks.getEffectiveTodayDate,
  };
});

const DashboardRolloverHarness = ({ suspended = false }: { suspended?: boolean }) => {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 8, 1));
  const [draft, setDraft] = useState("unverändert");
  const [refreshCount, setRefreshCount] = useState(0);

  useEffectiveDayRollover({
    userId: "athlete-1",
    currentDate,
    enabled: true,
    suspended,
    onRefresh: async (resolvedDate) => {
      setCurrentDate(resolvedDate);
      setRefreshCount((count) => count + 1);
    },
  });

  return (
    <div>
      <output aria-label="program date">
        {`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`}
      </output>
      <output aria-label="refresh count">{refreshCount}</output>
      <input aria-label="daily draft" value={draft} onChange={(event) => setDraft(event.target.value)} />
    </div>
  );
};

describe("mounted dashboard effective-day rollover", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("computes 23/25-hour Berlin days across DST instead of assuming 24 hours", () => {
    expect(millisecondsUntilNextProgramMidnight(new Date("2026-03-28T23:00:00Z")))
      .toBe(23 * 60 * 60 * 1000);
    expect(millisecondsUntilNextProgramMidnight(new Date("2026-10-24T22:00:00Z")))
      .toBe(25 * 60 * 60 * 1000);
  });

  it("rolls a continuously foregrounded dashboard at midnight and reschedules", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-01T21:59:59Z"));
    mocks.getEffectiveTodayDate
      .mockResolvedValueOnce(new Date(2026, 8, 2))
      .mockResolvedValueOnce(new Date(2026, 8, 3));
    render(<DashboardRolloverHarness />);

    await act(async () => vi.advanceTimersByTimeAsync(1_000));
    expect(screen.getByLabelText("program date")).toHaveTextContent("2026-09-02");
    expect(screen.getByLabelText("refresh count")).toHaveTextContent("1");

    await act(async () => vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000));
    expect(screen.getByLabelText("program date")).toHaveTextContent("2026-09-03");
    expect(screen.getByLabelText("refresh count")).toHaveTextContent("2");
    expect(mocks.getEffectiveTodayDate).toHaveBeenCalledTimes(2);
  });

  it("deduplicates a midnight timer and focus so the status write runs once", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-01T21:59:59Z"));
    let resolveDate!: (date: Date) => void;
    mocks.getEffectiveTodayDate.mockReturnValue(new Promise<Date>((resolveDatePromise) => {
      resolveDate = resolveDatePromise;
    }));
    render(<DashboardRolloverHarness />);

    await act(async () => vi.advanceTimersByTimeAsync(1_000));
    fireEvent.focus(window);
    expect(mocks.getEffectiveTodayDate).toHaveBeenCalledTimes(1);

    await act(async () => resolveDate(new Date(2026, 8, 2)));
    expect(screen.getByLabelText("refresh count")).toHaveTextContent("1");
  });

  it("resolves and applies the next program date on focus without a route reload", async () => {
    mocks.getEffectiveTodayDate.mockResolvedValue(new Date(2026, 8, 2));
    render(<DashboardRolloverHarness />);

    fireEvent.focus(window);

    await waitFor(() => expect(screen.getByLabelText("program date")).toHaveTextContent("2026-09-02"));
    expect(screen.getByLabelText("refresh count")).toHaveTextContent("1");
    expect(mocks.getEffectiveTodayDate).toHaveBeenCalledTimes(1);
  });

  it("deduplicates simultaneous focus and visibility refreshes", async () => {
    let resolveDate!: (date: Date) => void;
    mocks.getEffectiveTodayDate.mockReturnValue(new Promise<Date>((resolveDatePromise) => {
      resolveDate = resolveDatePromise;
    }));
    render(<DashboardRolloverHarness />);

    fireEvent.focus(window);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(mocks.getEffectiveTodayDate).toHaveBeenCalledTimes(1);

    await act(async () => resolveDate(new Date(2026, 8, 2)));
    await waitFor(() => expect(screen.getByLabelText("refresh count")).toHaveTextContent("1"));
  });

  it("defers rollover while a daily draft is open and preserves its input", async () => {
    mocks.getEffectiveTodayDate.mockResolvedValue(new Date(2026, 8, 2));
    const view = render(<DashboardRolloverHarness suspended />);
    fireEvent.change(screen.getByLabelText("daily draft"), { target: { value: "mein Entwurf" } });

    fireEvent.focus(window);
    expect(mocks.getEffectiveTodayDate).not.toHaveBeenCalled();
    expect(screen.getByLabelText("program date")).toHaveTextContent("2026-09-01");

    view.rerender(<DashboardRolloverHarness suspended={false} />);
    await waitFor(() => expect(screen.getByLabelText("program date")).toHaveTextContent("2026-09-02"));
    expect(screen.getByLabelText("daily draft")).toHaveValue("mein Entwurf");
  });

  it("wires the real Dashboard to a complete background status refresh", () => {
    const dashboard = readFileSync(resolve(process.cwd(), "src/pages/Dashboard.tsx"), "utf8");
    expect(dashboard).toContain("useEffectiveDayRollover({");
    expect(dashboard).toContain("loadDashboardInitialStatus(");
    expect(dashboard).toContain("setEffectiveToday(resolvedDate)");
    expect(dashboard).toContain("setTodayCheckinDone(status.todayCheckinDone)");
    expect(dashboard).toContain("setTodayJournalDone(status.todayJournalDone)");
    expect(dashboard).toContain("suspended: showCheckin");
    expect(dashboard).not.toContain('window.addEventListener("focus", handleFocus)');
  });
});
