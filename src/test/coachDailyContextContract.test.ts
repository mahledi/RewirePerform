import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const toolkit = readFileSync(resolve(process.cwd(), "src/components/coach/CoachToolkit.tsx"), "utf8");
const mentalState = readFileSync(resolve(process.cwd(), "src/components/coach/TeamMentalState.tsx"), "utf8");

describe("coach daily context contract", () => {
  it("uses the team calendar context in both coach daily views", () => {
    for (const source of [toolkit, mentalState]) {
      expect(source).toContain('.from("team_calendar_events")');
      expect(source).toContain('setTodayContext((data?.event_type as CalendarEventType | undefined) ?? "training")');
      expect(source).toContain("resolveDay(dayInfo.dayNumber, new Date(), todayContext)");
    }
  });

  it("makes the current day type visible in the coach toolkit", () => {
    expect(toolkit).toContain("{resolved.context.label} · Linie:");
  });
});
