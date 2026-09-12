import type { EvidenceConstructId, EvidenceSourceFamily } from "@/lib/evidenceV14/measurementContract";

export type AthleteTimelinePoint = {
  constructId: EvidenceConstructId;
  label: string;
  timing: "pre" | "mid" | "post";
  score: number;
  measuredAt: string;
};

export type InternalEvidenceRow = {
  subjectRef: string;
  constructId: EvidenceConstructId;
  sourceFamily: EvidenceSourceFamily;
  comparison: "pre_mid" | "mid_post" | "pre_post";
  change: number;
  quality: "complete" | "partial";
};

export type CoachAggregateRow = {
  constructId: EvidenceConstructId;
  label: string;
  pairedN: number;
  confidence: "suppressed" | "low" | "standard";
  meanChange: number | null;
};

export type EvidenceReportModel = {
  eligibleN: number;
  completePairsN: number;
  missingN: number;
  primaryResults: CoachAggregateRow[];
  claimClass: "self_reported_change";
  causalClaimAllowed: false;
};
