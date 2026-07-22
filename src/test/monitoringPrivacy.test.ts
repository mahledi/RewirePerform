import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mocks.from,
  },
}));

import { captureAppError, sanitizeMonitoringMetadata, trackAppEvent } from "@/lib/monitoring";

describe("monitoring privacy boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockReturnValue({ insert: mocks.insert });
    mocks.insert.mockResolvedValue({ data: null, error: null });
  });

  it("keeps only allow-listed technical metadata", () => {
    const sanitized = sanitizeMonitoringMetadata({
      stage: "atomic_tracking",
      day_number: 12,
      journal_text: "private reflection",
      source: "team-mental-state",
      unsafe_source: "contains private text",
    } as never);

    expect(sanitized).toEqual({
      stage: "atomic_tracking",
      day_number: 12,
      source: "team-mental-state",
    });
  });

  it("stores only a normalized error code and allow-listed context", async () => {
    const original = Object.assign(new Error("private athlete answer"), {
      code: "PGRST116",
      details: "sensitive detail",
    });

    await captureAppError({
      eventName: "app_runtime_error",
      error: original,
      route: "/journal?draft=private",
      metadata: {
        source: "error_boundary",
        stage: "runtime",
        unsafe_source: "private athlete answer",
      } as never,
    });

    expect(mocks.from).toHaveBeenCalledWith("app_event_log");
    expect(mocks.insert).toHaveBeenCalledWith({
      event_name: "app_runtime_error",
      status: "failed",
      role: null,
      team_id: null,
      route: "/journal",
      error_code: "PGRST116",
      is_test: false,
      metadata: {
        source: "error_boundary",
        stage: "runtime",
      },
    });

    const serializedPayload = JSON.stringify(mocks.insert.mock.calls[0][0]);
    expect(serializedPayload).not.toContain("private athlete answer");
    expect(serializedPayload).not.toContain("sensitive detail");
    expect(serializedPayload).not.toContain("draft=private");
  });

  it("records a successful check-in without private athlete content", async () => {
    await trackAppEvent({
      eventName: "daily_checkin_saved",
      status: "success",
      role: "athlete",
      route: "/dashboard?draft=private",
      isTest: false,
      metadata: {
        day_number: 4,
        event_type: "training",
        stage: "atomic_tracking",
      },
    });

    expect(mocks.insert).toHaveBeenCalledWith({
      event_name: "daily_checkin_saved",
      status: "success",
      role: "athlete",
      team_id: null,
      route: "/dashboard",
      error_code: null,
      is_test: false,
      metadata: {
        day_number: 4,
        event_type: "training",
        stage: "atomic_tracking",
      },
    });
    expect(JSON.stringify(mocks.insert.mock.calls[0][0])).not.toContain("draft=private");
  });

  it("does not break the user flow or expose provider error details", async () => {
    mocks.insert.mockResolvedValue({
      data: null,
      error: { code: "42501", message: "private database detail" },
    });
    const consoleWarning = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(
      captureAppError({
        eventName: "app_runtime_error",
        error: new Error("private runtime detail"),
      }),
    ).resolves.toBeUndefined();

    expect(consoleWarning).toHaveBeenCalledWith("[ops] app_event_log insert failed (42501)");
    expect(JSON.stringify(consoleWarning.mock.calls)).not.toContain("private database detail");
    consoleWarning.mockRestore();
  });

  it("drops non-token strings even for an allow-listed key", () => {
    expect(
      sanitizeMonitoringMetadata({
        source: "private text with spaces",
        event_type: "training",
      }),
    ).toEqual({ event_type: "training" });
  });
});
