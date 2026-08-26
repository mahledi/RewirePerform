import { afterEach, describe, expect, it, vi } from "vitest";
import { reminderTimesForStorage, type ReminderTimes } from "@/hooks/usePushSubscription";

const LOCAL_TIMES: ReminderTimes = {
  morningHour: 9,
  morningMinute: 30,
  eveningHour: 21,
  eveningMinute: 0,
  preTrainingMinutes: 60,
};

describe("web push reminder time storage", () => {
  afterEach(() => vi.useRealTimers());

  it("converts a Berlin local time to UTC exactly once at the push boundary", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-26T12:00:00+02:00"));

    expect(reminderTimesForStorage(LOCAL_TIMES, "web")).toEqual({
      morningHour: 7,
      morningMinute: 30,
      eveningHour: 19,
      eveningMinute: 0,
      preTrainingMinutes: 60,
    });
  });

  it("keeps native local reminder times unchanged", () => {
    expect(reminderTimesForStorage(LOCAL_TIMES, "native")).toEqual(LOCAL_TIMES);
  });
});
