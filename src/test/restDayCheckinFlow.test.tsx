// Rest-day completion integration: no live accounts or network writes.
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DailyCheckin from "@/components/dashboard/DailyCheckin";

const mocks = vi.hoisted(() => ({
  user: { id: "synthetic-athlete", user_metadata: { full_name: "Test" } },
  save: vi.fn(async () => ({ payload: {}, snapshotUpdated: true })),
  schedule: vi.fn(async () => undefined),
  writeDraft: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: mocks.user, role: "athlete", isTestUser: true }) }));
vi.mock("react-router-dom", () => ({ useNavigate: () => vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) } }));
vi.mock("@/lib/programInstance", () => ({ getOrCreateActiveInstance: async () => ({ id: "synthetic-instance" }) }));
vi.mock("@/lib/dayAssignment", async () => {
  const { resolveDay } = await import("@/lib/getDayContent");
  return {
    ensureAssignment: async () => ({ assignment: { id: "synthetic-assignment" }, resolved: resolveDay(7, new Date("2026-09-07T12:00:00"), "rest") }),
    drawComprehensionQuestions: () => [],
    upsertCompletion: vi.fn(async () => ({ error: null })),
  };
});
vi.mock("@/lib/dailyTracking", () => ({ saveDailyTracking: mocks.save }));
vi.mock("@/lib/monitoring", () => ({ captureAppError: vi.fn(), trackAppEvent: vi.fn(async () => undefined) }));
vi.mock("@/lib/localDrafts", () => ({ readLocalDraft: () => null, writeLocalDraft: mocks.writeDraft, clearLocalDraft: vi.fn() }));
vi.mock("@/lib/nativeNotifications", () => ({ cancelRestVisualizationReminder: vi.fn(async () => undefined), isNativeNotificationsAvailable: () => true, scheduleRestVisualizationReminder: mocks.schedule }));
vi.mock("@/lib/visualizationChime", () => ({ primeVisualizationAudio: async () => true, startVisualizationAudioSession: async () => true, stopVisualizationAudioSession: vi.fn(), playVisualizationChime: async () => true, VISUALIZATION_CHIME_STYLES: [] }));
vi.mock("@/lib/screenWakeLock", () => ({ requestScreenWakeLock: async () => null, releaseScreenWakeLock: async () => undefined }));
vi.mock("framer-motion", () => {
  const cache = new Map();
  return { useReducedMotion: () => true, AnimatePresence: ({ children }: any) => children, motion: new Proxy({}, { get: (_, tag: string) => {
    if (!cache.has(tag)) cache.set(tag, React.forwardRef(({ children, initial, animate, exit, transition, variants, whileTap, whileHover, layout, ...props }: any, ref) => React.createElement(tag, { ...props, ref }, children)));
    return cache.get(tag);
  } }) };
});

const click = async (element: HTMLElement) => { await act(async () => { fireEvent.click(element); }); };
const openMission = async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-07T12:00:00"));
  Object.defineProperty(window, "scrollTo", { value: vi.fn(), configurable: true });
  Object.defineProperty(HTMLElement.prototype, "scrollTo", { value: vi.fn(), configurable: true });
  const close = vi.fn();
  await act(async () => { render(<DailyCheckin eventType="rest" date={new Date("2026-09-07T12:00:00")} onClose={close} />); });
  await click(screen.getByTestId("daily-science-ack"));
  for (const key of ["mood", "energy", "focus", "stress", "recovery", "sleep", "physical", "motivation", "pressure", "team"]) await click(screen.getByTestId(`pulse-${key}-5`));
  await click(screen.getByTestId("daily-next-step-1"));
  return close;
};

afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); });

describe("shortened day-7 rest UI with synthetic persistence", () => {
  it("saves no server check-in for the pulse alone or a deferred visualization", async () => {
    const close = await openMission();
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.writeDraft).toHaveBeenCalled();
    await click(screen.getByRole("button", { name: "Später erinnern" }));
    await click(screen.getByRole("button", { name: "Erinnerung setzen" }));
    await click(screen.getByRole("button", { name: "Für jetzt schließen" }));
    expect(close).toHaveBeenCalledOnce();
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("runs every visualization phase and calls the day-7 rest save exactly once", async () => {
    const close = await openMission();
    await click(screen.getByRole("button", { name: "Jetzt starten" }));
    await click(screen.getByRole("button", { name: "Visualisierung starten" }));
    for (let phase = 0; phase < 3; phase++) {
      await click(screen.getByRole("button", { name: "Timer starten" }));
      await act(async () => { await vi.advanceTimersByTimeAsync([35_000, 35_000, 50_000][phase]); });
      await click(screen.getByRole("button", { name: phase === 2 ? "Visualisierung abschließen" : "Nächster Schritt" }));
    }
    expect(mocks.save).toHaveBeenCalledOnce();
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ dayNumber: 7, eventType: "rest", date: "2026-09-07", programInstanceId: "synthetic-instance", moodBefore: 5 }));
    expect(close).toHaveBeenCalledOnce();
  });
});
