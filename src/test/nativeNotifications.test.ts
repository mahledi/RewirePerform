import { describe, expect, it } from "vitest";
import { buildNativeReminderNotifications } from "@/lib/nativeNotifications";
import { buildNativeTrainingMoments } from "@/lib/nativeReminderPlan";

const basePreferences = {
  enabled: true,
  morningHour: 7,
  morningMinute: 30,
  eveningHour: 21,
  eveningMinute: 0,
  preTrainingMinutes: 60,
};

describe("native reminder scheduling", () => {
  it("builds recurring check-in and journal reminders with safe routes", () => {
    const notifications = buildNativeReminderNotifications({
      ...basePreferences,
      userId: "athlete-1",
      includeDaily: true,
      trainingMoments: [],
      now: new Date(2026, 6, 13, 6, 0),
    });

    expect(notifications).toHaveLength(2);
    expect(notifications[0].schedule?.on).toEqual({ hour: 7, minute: 30 });
    expect(notifications[0].extra).toMatchObject({
      userId: "athlete-1",
      route: "/dashboard",
      kind: "morning",
    });
    expect(notifications[1].schedule?.on).toEqual({ hour: 21, minute: 0 });
    expect(notifications[1].extra).toMatchObject({
      route: "/journal",
      kind: "evening",
    });
  });

  it("schedules pre-training locally and handles a previous-day reminder", () => {
    const notifications = buildNativeReminderNotifications({
      ...basePreferences,
      userId: "athlete-1",
      includeDaily: false,
      trainingMoments: [
        { date: "2026-07-14", hour: 18, minute: 30, contextType: "training" },
        { date: "2026-07-15", hour: 0, minute: 30, contextType: "competition" },
      ],
      now: new Date(2026, 6, 13, 6, 0),
    });

    expect(notifications).toHaveLength(2);
    const firstAt = notifications[0].schedule?.at;
    expect(firstAt).toBeInstanceOf(Date);
    expect(firstAt?.getFullYear()).toBe(2026);
    expect(firstAt?.getMonth()).toBe(6);
    expect(firstAt?.getDate()).toBe(14);
    expect(firstAt?.getHours()).toBe(17);
    expect(firstAt?.getMinutes()).toBe(30);

    const competitionAt = notifications[1].schedule?.at;
    expect(competitionAt?.getDate()).toBe(14);
    expect(competitionAt?.getHours()).toBe(23);
    expect(competitionAt?.getMinutes()).toBe(30);
    expect(notifications[1].title).toContain("Wettkampf");
    expect(notifications[1].extra).toMatchObject({
      route: "/pre-training",
      scheduledDate: "2026-07-15",
    });
  });

  it("deduplicates dates and ignores reminders that are already past", () => {
    const notifications = buildNativeReminderNotifications({
      ...basePreferences,
      userId: "athlete-1",
      includeDaily: false,
      trainingMoments: [
        { date: "2026-07-13", hour: 7, minute: 0 },
        { date: "2026-07-14", hour: 10, minute: 0 },
        { date: "2026-07-14", hour: 9, minute: 0 },
      ],
      now: new Date(2026, 6, 13, 8, 0),
    });

    expect(notifications).toHaveLength(1);
    expect(notifications[0].extra).toMatchObject({ scheduledDate: "2026-07-14" });
    expect(notifications[0].schedule?.at?.getHours()).toBe(8);
  });
});

describe("native training plan", () => {
  it("suppresses rest days and lets a timed competition override the weekly plan", () => {
    const moments = buildNativeTrainingMoments({
      dates: ["2026-07-13", "2026-07-14", "2026-07-15"],
      weeklySchedule: [
        { dayOfWeek: 1, hour: 17, minute: 0 },
        { dayOfWeek: 2, hour: 17, minute: 0 },
        { dayOfWeek: 3, hour: 17, minute: 0 },
      ],
      calendarOverrides: [
        { date: "2026-07-13", eventType: "rest" },
        {
          date: "2026-07-14",
          eventType: "competition",
          hour: 19,
          minute: 30,
        },
      ],
    });

    expect(moments).toEqual([
      {
        date: "2026-07-14",
        hour: 19,
        minute: 30,
        contextType: "competition",
      },
      {
        date: "2026-07-15",
        hour: 17,
        minute: 0,
        contextType: "training",
      },
    ]);
  });

  it("uses the weekly time for an untimed competition override", () => {
    const moments = buildNativeTrainingMoments({
      dates: ["2026-07-13"],
      weeklySchedule: [{ dayOfWeek: 1, hour: 18, minute: 30 }],
      calendarOverrides: [
        { date: "2026-07-13", eventType: "competition" },
      ],
    });

    expect(moments).toEqual([
      {
        date: "2026-07-13",
        hour: 18,
        minute: 30,
        contextType: "competition",
      },
    ]);
  });
});
