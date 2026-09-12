import {
  EVIDENCE_V14_CONSTRUCTS,
  EVIDENCE_V14_MIN_GROUP_SIZE,
  type EvidenceConstructId,
  type EvidenceSourceFamily,
} from "./measurementContract";

export type EvidenceTiming = "pre" | "mid" | "post";

export type MeasurementPoint = {
  subjectRef: string;
  programRunId: string;
  instrumentId: string;
  instrumentVersion: string;
  constructId: EvidenceConstructId;
  sourceFamily: EvidenceSourceFamily;
  timing: EvidenceTiming;
  normalizedScore: number;
  measuredAt: string;
  dayNumber?: number | null;
  eligible: boolean;
  qualityFlags?: string[];
};

export type MeasurementPair = {
  key: string;
  subjectRef: string;
  programRunId: string;
  instrumentId: string;
  instrumentVersion: string;
  constructId: EvidenceConstructId;
  sourceFamily: EvidenceSourceFamily;
  comparison: "pre_mid" | "mid_post" | "pre_post";
  from: MeasurementPoint;
  to: MeasurementPoint;
  absoluteChange: number;
  direction: "higher" | "lower" | "unchanged";
  meaningfulDirection: "improved" | "declined" | "neutral";
  qualityFlags: string[];
};

const timingOrder: EvidenceTiming[] = ["pre", "mid", "post"];

const comparableKey = (point: MeasurementPoint) => [
  point.subjectRef,
  point.programRunId,
  point.instrumentId,
  point.instrumentVersion,
  point.constructId,
  point.sourceFamily,
].join("::");

const classifyChange = (constructId: EvidenceConstructId, change: number) => {
  const threshold = EVIDENCE_V14_CONSTRUCTS[constructId].meaningfulChangePoints;
  if (threshold === null) return "neutral" as const;
  if (change >= threshold) return "improved" as const;
  if (change <= -threshold) return "declined" as const;
  return "neutral" as const;
};

export const pairComparableMeasurements = (points: MeasurementPoint[]): MeasurementPair[] => {
  const eligiblePoints = points.filter((point) =>
    point.eligible
    && Number.isFinite(point.normalizedScore)
    && point.normalizedScore >= 0
    && point.normalizedScore <= 100
  );
  const groups = new Map<string, MeasurementPoint[]>();
  eligiblePoints.forEach((point) => {
    const key = comparableKey(point);
    groups.set(key, [...(groups.get(key) ?? []), point]);
  });

  const pairs: MeasurementPair[] = [];
  groups.forEach((group, key) => {
    const latestByTiming = new Map<EvidenceTiming, MeasurementPoint>();
    [...group]
      .sort((a, b) => a.measuredAt.localeCompare(b.measuredAt))
      .forEach((point) => latestByTiming.set(point.timing, point));

    ([
      ["pre", "mid", "pre_mid"],
      ["mid", "post", "mid_post"],
      ["pre", "post", "pre_post"],
    ] as const).forEach(([fromTiming, toTiming, comparison]) => {
      const from = latestByTiming.get(fromTiming);
      const to = latestByTiming.get(toTiming);
      if (!from || !to) return;
      const absoluteChange = to.normalizedScore - from.normalizedScore;
      pairs.push({
        key: `${key}::${comparison}`,
        subjectRef: from.subjectRef,
        programRunId: from.programRunId,
        instrumentId: from.instrumentId,
        instrumentVersion: from.instrumentVersion,
        constructId: from.constructId,
        sourceFamily: from.sourceFamily,
        comparison,
        from,
        to,
        absoluteChange,
        direction: absoluteChange > 0 ? "higher" : absoluteChange < 0 ? "lower" : "unchanged",
        meaningfulDirection: classifyChange(from.constructId, absoluteChange),
        qualityFlags: [...new Set([...(from.qualityFlags ?? []), ...(to.qualityFlags ?? [])])],
      });
    });
  });
  return pairs;
};

export type TriangulationResult = {
  constructId: EvidenceConstructId;
  comparison: MeasurementPair["comparison"];
  sourceResults: Array<{
    sourceFamily: EvidenceSourceFamily;
    pairCount: number;
    meanChange: number;
    direction: "improved" | "declined" | "neutral";
  }>;
  conclusion: "aligned_improvement" | "aligned_decline" | "mixed" | "insufficient";
  caveat: string;
};

export const triangulateConstruct = (
  pairs: MeasurementPair[],
  constructId: EvidenceConstructId,
  comparison: MeasurementPair["comparison"],
): TriangulationResult => {
  const relevant = pairs.filter((pair) => pair.constructId === constructId && pair.comparison === comparison);
  const bySource = new Map<EvidenceSourceFamily, MeasurementPair[]>();
  relevant.forEach((pair) => bySource.set(pair.sourceFamily, [...(bySource.get(pair.sourceFamily) ?? []), pair]));
  const sourceResults = [...bySource.entries()].map(([sourceFamily, sourcePairs]) => {
    const meanChange = sourcePairs.reduce((sum, pair) => sum + pair.absoluteChange, 0) / sourcePairs.length;
    return {
      sourceFamily,
      pairCount: sourcePairs.length,
      meanChange,
      direction: classifyChange(constructId, meanChange),
    };
  });
  const directional = sourceResults.filter((source) => source.direction !== "neutral");
  const conclusion = sourceResults.length < 2 || directional.length < 2
    ? "insufficient"
    : directional.every((source) => source.direction === "improved")
      ? "aligned_improvement"
      : directional.every((source) => source.direction === "declined")
        ? "aligned_decline"
        : "mixed";

  return {
    constructId,
    comparison,
    sourceResults,
    conclusion,
    caveat: "Triangulation verbindet Richtungen mehrerer Quellen, beweist aber weder Objektivität noch Kausalität.",
  };
};

const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
};
const sampleStandardDeviation = (values: number[]) => {
  if (values.length < 2) return 0;
  const average = mean(values);
  return Math.sqrt(values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1));
};

export type CohortSummary = {
  suppressed: boolean;
  confidence: "suppressed" | "low" | "standard";
  eligibleN: number;
  completePairsN: number;
  missingN: number;
  dropoutRate: number;
  meanChange: number | null;
  medianChange: number | null;
  standardDeviation: number | null;
  confidenceInterval95: [number, number] | null;
  changeDistribution: { improved: number; neutral: number; declined: number } | null;
};

export const summarizeCohort = (pairs: MeasurementPair[], eligibleN: number): CohortSummary => {
  const uniquePairs = new Map(pairs.map((pair) => [pair.subjectRef, pair]));
  const complete = [...uniquePairs.values()];
  const completePairsN = complete.length;
  const safeEligibleN = Math.max(eligibleN, completePairsN);
  const missingN = safeEligibleN - completePairsN;
  const base = {
    eligibleN: safeEligibleN,
    completePairsN,
    missingN,
    dropoutRate: safeEligibleN === 0 ? 0 : missingN / safeEligibleN,
  };
  if (completePairsN < EVIDENCE_V14_MIN_GROUP_SIZE) {
    return {
      ...base,
      suppressed: true,
      confidence: "suppressed",
      meanChange: null,
      medianChange: null,
      standardDeviation: null,
      confidenceInterval95: null,
      changeDistribution: null,
    };
  }
  const changes = complete.map((pair) => pair.absoluteChange);
  const average = mean(changes);
  const standardDeviation = sampleStandardDeviation(changes);
  const margin = 1.96 * standardDeviation / Math.sqrt(changes.length);
  return {
    ...base,
    suppressed: false,
    confidence: completePairsN < 10 ? "low" : "standard",
    meanChange: average,
    medianChange: median(changes),
    standardDeviation,
    confidenceInterval95: [average - margin, average + margin],
    changeDistribution: {
      improved: complete.filter((pair) => pair.meaningfulDirection === "improved").length,
      neutral: complete.filter((pair) => pair.meaningfulDirection === "neutral").length,
      declined: complete.filter((pair) => pair.meaningfulDirection === "declined").length,
    },
  };
};
