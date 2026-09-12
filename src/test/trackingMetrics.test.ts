import { describe, expect, it } from "vitest";
import {
  calculateCompletionRate,
  calculateConsentRate,
  calculateStreaks,
  canShowSensitiveAggregate,
  derivePilotReadinessStatus,
  isLowConfidenceAggregate,
} from "@/lib/trackingMetrics";

describe("tracking metrics", () => {
  it("calculates completion rate without exceeding one", () => {
    expect(calculateCompletionRate(3, 7)).toBeCloseTo(3 / 7);
    expect(calculateCompletionRate(9, 7)).toBe(1);
    expect(calculateCompletionRate(0, 0)).toBe(0);
  });

  it("deduplicates days and calculates current and longest streaks", () => {
    expect(calculateStreaks(
      ["2026-07-01", "2026-07-02", "2026-07-02", "2026-07-04", "2026-07-05"],
      new Date("2026-07-05T12:00:00Z"),
    )).toEqual({ current: 2, longest: 2 });
  });

  it("returns a zero current streak when the latest day is stale", () => {
    expect(calculateStreaks(["2026-07-01", "2026-07-02"], new Date("2026-07-10T12:00:00Z")))
      .toEqual({ current: 0, longest: 2 });
  });

  it("applies consent and privacy thresholds", () => {
    expect(calculateConsentRate(4, 5)).toBe(0.8);
    expect(calculateConsentRate(0, 0)).toBeNull();
    expect(canShowSensitiveAggregate(4)).toBe(false);
    expect(canShowSensitiveAggregate(5)).toBe(true);
    expect(isLowConfidenceAggregate(5)).toBe(true);
    expect(isLowConfidenceAggregate(10)).toBe(false);
  });

  it("derives red, yellow and green readiness deterministically", () => {
    const ready = {
      hasActiveRun: true,
      athletes: 10,
      assignedAthletes: 10,
      activeInstances: 10,
      integrityErrors: 0,
      consentedAthletes: 10,
      validatedPreComplete: 10,
      developmentPreComplete: 10,
    };
    expect(derivePilotReadinessStatus(ready)).toBe("GREEN");
    expect(derivePilotReadinessStatus({ ...ready, consentedAthletes: 9 })).toBe("YELLOW");
    expect(derivePilotReadinessStatus({ ...ready, integrityErrors: 1 })).toBe("RED");
  });
});
