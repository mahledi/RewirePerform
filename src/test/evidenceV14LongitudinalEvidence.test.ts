import { describe, expect, it } from "vitest";
import {
  pairComparableMeasurements,
  summarizeCohort,
  triangulateConstruct,
  type MeasurementPoint,
} from "@/lib/evidenceV14/longitudinalEvidence";

const point = (overrides: Partial<MeasurementPoint> = {}): MeasurementPoint => ({
  subjectRef: "subject-a",
  programRunId: "run-a",
  instrumentId: "onboarding_v2",
  instrumentVersion: "v2",
  constructId: "error_recovery",
  sourceFamily: "onboarding_self_report",
  timing: "pre",
  normalizedScore: 40,
  measuredAt: "2026-09-01T08:00:00.000Z",
  eligible: true,
  ...overrides,
});

describe("V1.4 longitudinal evidence analysis", () => {
  it("pairs only the same subject, run, instrument, version, construct and source", () => {
    const pairs = pairComparableMeasurements([
      point(),
      point({ timing: "post", normalizedScore: 55, measuredAt: "2026-10-26T08:00:00.000Z" }),
      point({ subjectRef: "subject-b", timing: "post", normalizedScore: 80 }),
      point({ instrumentVersion: "v3", timing: "post", normalizedScore: 90 }),
      point({ eligible: false, timing: "mid", normalizedScore: 99 }),
    ]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]).toMatchObject({ comparison: "pre_post", absoluteChange: 15, meaningfulDirection: "neutral" });
  });

  it("creates all three intended comparisons when all timings exist", () => {
    const pairs = pairComparableMeasurements([
      point(),
      point({ timing: "mid", normalizedScore: 46, measuredAt: "2026-09-28T08:00:00.000Z" }),
      point({ timing: "post", normalizedScore: 50, measuredAt: "2026-10-26T08:00:00.000Z" }),
    ]);
    expect(pairs.map((pair) => pair.comparison)).toEqual(["pre_mid", "mid_post", "pre_post"]);
    expect(pairs.find((pair) => pair.comparison === "pre_mid")?.meaningfulDirection).toBe("neutral");
  });

  it("keeps sources separate during triangulation", () => {
    const pairs = pairComparableMeasurements([
      point(),
      point({ timing: "post", normalizedScore: 52 }),
      point({ sourceFamily: "coach_observation", instrumentId: "coach_v1", normalizedScore: 50 }),
      point({ sourceFamily: "coach_observation", instrumentId: "coach_v1", timing: "post", normalizedScore: 60 }),
    ]);
    const result = triangulateConstruct(pairs, "error_recovery", "pre_post");
    expect(result.sourceResults).toHaveLength(2);
    expect(result.conclusion).toBe("insufficient");
    expect(result.caveat).toContain("weder Objektivität noch Kausalität");
  });

  it("suppresses cohorts below five and marks five to nine low confidence", () => {
    const createPairs = (count: number) => pairComparableMeasurements(Array.from({ length: count }, (_, index) => [
      point({ subjectRef: `subject-${index}` }),
      point({ subjectRef: `subject-${index}`, timing: "post", normalizedScore: 50 + index }),
    ]).flat()).filter((pair) => pair.comparison === "pre_post");
    expect(summarizeCohort(createPairs(4), 7)).toMatchObject({ suppressed: true, completePairsN: 4, missingN: 3 });
    const visible = summarizeCohort(createPairs(6), 8);
    expect(visible).toMatchObject({ suppressed: false, confidence: "low", completePairsN: 6, missingN: 2 });
    expect(visible.confidenceInterval95).not.toBeNull();
  });
});
