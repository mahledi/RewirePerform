import { describe, expect, it } from "vitest";
import { getRecentMissedDayReviewWindow } from "@/lib/missedDayReviewWindow";

describe("missed-day review window", () => {
  it("does not backfill older days after the three recent reviews were acknowledged and the dashboard remounts", () => {
    const fixedWindow = getRecentMissedDayReviewWindow(10);
    expect(fixedWindow).toEqual([9, 8, 7]);

    const acknowledgedDays = new Set(fixedWindow);
    const reviewsAfterSettingsReturn = getRecentMissedDayReviewWindow(10)
      .filter((dayNumber) => !acknowledgedDays.has(dayNumber));

    expect(reviewsAfterSettingsReturn).toEqual([]);
    expect(getRecentMissedDayReviewWindow(2)).toEqual([1]);
  });

  it("lets completed or acknowledged days disappear without replacing them from outside the window", () => {
    const completedDays = new Set([9]);
    const acknowledgedDays = new Set([8]);

    const visibleReviews = getRecentMissedDayReviewWindow(10)
      .filter((dayNumber) => !completedDays.has(dayNumber))
      .filter((dayNumber) => !acknowledgedDays.has(dayNumber));

    expect(visibleReviews).toEqual([7]);
    expect(visibleReviews).not.toContain(6);
  });
});
