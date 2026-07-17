import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cancel: vi.fn(),
  checkPermissions: vi.fn(),
  getPending: vi.fn(),
  isNativePlatform: vi.fn(),
  requestPermissions: vi.fn(),
  schedule: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: mocks.isNativePlatform },
}));

vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: {
    addListener: vi.fn(),
    cancel: mocks.cancel,
    checkPermissions: mocks.checkPermissions,
    getPending: mocks.getPending,
    requestPermissions: mocks.requestPermissions,
    schedule: mocks.schedule,
  },
}));

import {
  getNativeReminderPreferences,
  requestNativeNotificationPermission,
  scheduleNativeReminders,
} from "@/lib/nativeNotifications";

const reminderInput = {
  enabled: true,
  morningHour: 7,
  morningMinute: 30,
  eveningHour: 21,
  eveningMinute: 0,
  preTrainingMinutes: 60,
  userId: "athlete-1",
  includeDaily: true,
  trainingMoments: [],
  now: new Date(2026, 6, 17, 12, 0),
};

describe("native notification permission boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mocks.isNativePlatform.mockReturnValue(true);
    mocks.getPending.mockResolvedValue({ notifications: [] });
    mocks.schedule.mockResolvedValue(undefined);
    mocks.cancel.mockResolvedValue(undefined);
  });

  it("does not request notification access outside the native app", async () => {
    mocks.isNativePlatform.mockReturnValue(false);

    await expect(requestNativeNotificationPermission()).resolves.toBe(false);
    expect(mocks.checkPermissions).not.toHaveBeenCalled();
    expect(mocks.requestPermissions).not.toHaveBeenCalled();
  });

  it("returns false when iOS keeps notification access denied", async () => {
    mocks.checkPermissions.mockResolvedValue({ display: "prompt" });
    mocks.requestPermissions.mockResolvedValue({ display: "denied" });

    await expect(requestNativeNotificationPermission()).resolves.toBe(false);
    expect(mocks.requestPermissions).toHaveBeenCalledOnce();
  });

  it("stops before scheduling or persisting when permission is denied", async () => {
    mocks.checkPermissions.mockResolvedValue({ display: "denied" });

    await expect(scheduleNativeReminders(reminderInput)).rejects.toThrow(
      "Benachrichtigungen sind in den iOS-Einstellungen nicht erlaubt",
    );
    expect(mocks.getPending).not.toHaveBeenCalled();
    expect(mocks.schedule).not.toHaveBeenCalled();
    expect(getNativeReminderPreferences("athlete-1")).toBeNull();
  });

  it("does not show the permission prompt again after access was granted", async () => {
    mocks.checkPermissions.mockResolvedValue({ display: "granted" });

    await expect(requestNativeNotificationPermission()).resolves.toBe(true);
    expect(mocks.requestPermissions).not.toHaveBeenCalled();
  });
});
