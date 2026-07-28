import { describe, expect, it } from "vitest";
import { buildSevenDayAdherencePoints } from "@/pages/Progress";
import { countActiveApplications } from "@/lib/flameStats";

describe("program activity progress", () => {
  it("builds an honest adherence history from unique completed program days", () => {
    const points = buildSevenDayAdherencePoints([1, 3, 3, 60], 3);

    expect(points.map(({ day, rate }) => ({ day, rate }))).toEqual([
      { day: 1, rate: 1 },
      { day: 2, rate: 0.5 },
      { day: 3, rate: 2 / 3 },
    ]);
  });

  it("keeps an honest flat baseline when no day is completed", () => {
    const points = buildSevenDayAdherencePoints([], 4);

    expect(points).toHaveLength(4);
    expect(points.every((point) => point.rate === 0)).toBe(true);
    expect(points.every((point) => point.y === points[0].y)).toBe(true);
  });

  it("shows at most the latest seven days and never exceeds the program", () => {
    const points = buildSevenDayAdherencePoints([50, 56, 57], 80);
    expect(points).toHaveLength(7);
    expect(points[0].day).toBe(50);
    expect(points[6].day).toBe(56);
  });

  it("counts real completed applications once per program day", () => {
    expect(countActiveApplications([
      { day_number: 1, completed_at: null, completion_status: "completed", task_completion: ["A", "B"] },
      { day_number: 1, completed_at: null, completion_status: "completed", task_completion: ["A"] },
      { day_number: 2, completed_at: null, completion_status: "completed", task_completion: ["C"] },
      { day_number: 3, completed_at: null, completion_status: "started", task_completion: ["D", "E"] },
    ])).toBe(3);
  });
});
