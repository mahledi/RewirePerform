import { describe, expect, it } from "vitest";
import {
  buildTeamCalendarSeriesPlan,
  type TeamCalendarSeriesEvent,
} from "@/lib/teamCalendarSeries";

const event = (
  date: string,
  eventType: TeamCalendarSeriesEvent["event_type"],
  title: string,
): TeamCalendarSeriesEvent => ({
  date,
  event_type: eventType,
  title,
  training_local_hour: eventType === "rest" ? null : 17,
  training_local_minute: eventType === "rest" ? null : 30,
  training_timezone: eventType === "rest" ? null : "Europe/Berlin",
});

describe("team calendar eight-week series", () => {
  it("repeats only training weekdays and fills all other free days with rest", () => {
    const plan = buildTeamCalendarSeriesPlan({
      events: [
        event("2026-08-24", "training", "Mannschaftstraining"),
        event("2026-08-26", "training", "Athletik"),
        event("2026-08-29", "competition", "Testspiel"),
      ],
      patternDate: new Date(2026, 7, 27),
      today: new Date(2026, 7, 27),
    });

    expect(plan.rangeStart).toEqual(new Date(2026, 7, 27));
    expect(plan.rangeEnd).toEqual(new Date(2026, 9, 21));
    expect(plan.trainingDaysInPattern).toBe(2);
    expect(plan.competitionsPreserved).toBe(1);
    expect(plan.additions).toHaveLength(55);
    expect(plan.additions.find((item) => item.date === "2026-08-31")).toMatchObject({
      event_type: "training",
      title: "Mannschaftstraining",
      training_local_hour: 17,
      training_local_minute: 30,
    });
    expect(plan.additions.find((item) => item.date === "2026-09-02")).toMatchObject({
      event_type: "training",
      title: "Athletik",
    });
    expect(plan.additions.find((item) => item.date === "2026-08-28")).toMatchObject({
      event_type: "rest",
      title: "Ruhetag",
    });
    expect(plan.additions).not.toContainEqual(expect.objectContaining({ title: "Testspiel" }));
  });

  it("preserves every existing date instead of silently replacing it", () => {
    const plan = buildTeamCalendarSeriesPlan({
      events: [
        event("2026-08-24", "training", "Mustertraining"),
        event("2026-08-31", "competition", "Pokalspiel"),
        event("2026-09-07", "rest", "Regeneration"),
        event("2026-09-14", "training", "Individuelles Training"),
      ],
      patternDate: new Date(2026, 7, 24),
      today: new Date(2026, 7, 24),
    });

    expect(plan.existingDaysPreserved).toBe(4);
    expect(plan.competitionsPreserved).toBe(1);
    expect(plan.additions.some((item) => item.date === "2026-08-31")).toBe(false);
    expect(plan.additions.some((item) => item.date === "2026-09-07")).toBe(false);
    expect(plan.additions.some((item) => item.date === "2026-09-14")).toBe(false);
  });

  it("starts on the selected pattern week when that week is in the future", () => {
    const plan = buildTeamCalendarSeriesPlan({
      events: [event("2026-09-08", "training", "Dienstagstraining")],
      patternDate: new Date(2026, 8, 8),
      today: new Date(2026, 7, 27),
    });

    expect(plan.patternWeekStart).toEqual(new Date(2026, 8, 7));
    expect(plan.rangeStart).toEqual(new Date(2026, 8, 7));
    expect(plan.rangeEnd).toEqual(new Date(2026, 10, 1));
    expect(plan.additions.find((item) => item.date === "2026-09-15")).toMatchObject({
      event_type: "training",
      title: "Dienstagstraining",
    });
  });
});
