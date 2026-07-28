import { describe, expect, it } from "vitest";
import { buildCumulativeActivityPoints } from "@/pages/Progress";

describe("program activity progress", () => {
  it("builds a cumulative line from unique completed program days", () => {
    const points = buildCumulativeActivityPoints([1, 3, 3, 60], 3);

    expect(points.map(({ day, total }) => ({ day, total }))).toEqual([
      { day: 1, total: 1 },
      { day: 2, total: 1 },
      { day: 3, total: 2 },
    ]);
  });

  it("keeps an honest flat baseline when no day is completed", () => {
    const points = buildCumulativeActivityPoints([], 4);

    expect(points).toHaveLength(4);
    expect(points.every((point) => point.total === 0)).toBe(true);
    expect(points.every((point) => point.y === points[0].y)).toBe(true);
  });

  it("never renders beyond the 56-day program", () => {
    expect(buildCumulativeActivityPoints([56, 57], 80)).toHaveLength(56);
  });
});
