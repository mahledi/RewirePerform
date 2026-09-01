import {
  ONBOARDING_V2_INSTRUMENT_ID,
  ONBOARDING_V2_QUESTIONS,
  ONBOARDING_V2_VERSION,
  type QuestionPrivacy,
  type ScoringDirection,
} from "@/content/questionnaireV2";

export const EVIDENCE_V14_PROTOCOL_VERSION = "longitudinal-evidence-v1.4-draft-2026-08";
export const EVIDENCE_V14_CONTRACT_CHECKSUM = "b1e374748dba44d9a45c5fb976399179c1535ee5f5f41906282061a57d3fbb56";
export const EVIDENCE_V14_MIN_GROUP_SIZE = 5;
export const EVIDENCE_V14_CONSENT_VERSION = "pending-block-9-approval";
export const EVIDENCE_V14_RETENTION_POLICY = "pending-block-9-approval";

export type EvidenceConstructId =
  | "error_recovery"
  | "pressure_regulation"
  | "focus_presence"
  | "uncertainty_learning"
  | "recovery_load"
  | "team_connection"
  | "motivation_process";

export type AnalysisRole = "primary" | "exploratory";
export type ClaimClass =
  | "use"
  | "self_reported_change"
  | "triangulated_change"
  | "association"
  | "causality";

export type EvidenceSourceFamily =
  | "onboarding_self_report"
  | "development_index"
  | "validated_assessment"
  | "athlete_transfer"
  | "coach_observation"
  | "daily_state"
  | "completion_usage";

type ConstructDefinition = {
  id: EvidenceConstructId;
  label: string;
  analysisRole: AnalysisRole;
  meaningfulChangePoints: number | null;
  sourceFamilies: EvidenceSourceFamily[];
};

export const EVIDENCE_V14_CONSTRUCTS: Record<EvidenceConstructId, ConstructDefinition> = {
  error_recovery: {
    id: "error_recovery",
    label: "Fehler und Rückkehr",
    analysisRole: "primary",
    meaningfulChangePoints: null,
    sourceFamilies: ["onboarding_self_report", "development_index", "athlete_transfer", "coach_observation"],
  },
  pressure_regulation: {
    id: "pressure_regulation",
    label: "Druck und Regulation",
    analysisRole: "primary",
    meaningfulChangePoints: null,
    sourceFamilies: ["onboarding_self_report", "development_index", "validated_assessment", "athlete_transfer", "coach_observation"],
  },
  focus_presence: {
    id: "focus_presence",
    label: "Prozessfokus und Präsenz",
    analysisRole: "primary",
    meaningfulChangePoints: null,
    sourceFamilies: ["onboarding_self_report", "development_index", "validated_assessment", "athlete_transfer", "coach_observation"],
  },
  uncertainty_learning: {
    id: "uncertainty_learning",
    label: "Handeln unter Unsicherheit",
    analysisRole: "primary",
    meaningfulChangePoints: null,
    sourceFamilies: ["onboarding_self_report", "development_index", "athlete_transfer", "coach_observation"],
  },
  recovery_load: {
    id: "recovery_load",
    label: "Erholung und Belastung",
    analysisRole: "exploratory",
    meaningfulChangePoints: null,
    sourceFamilies: ["onboarding_self_report", "development_index", "daily_state"],
  },
  team_connection: {
    id: "team_connection",
    label: "Teamverbundenheit",
    analysisRole: "primary",
    meaningfulChangePoints: null,
    sourceFamilies: ["onboarding_self_report", "development_index", "daily_state"],
  },
  motivation_process: {
    id: "motivation_process",
    label: "Motivation und Prozessorientierung",
    analysisRole: "exploratory",
    meaningfulChangePoints: null,
    sourceFamilies: ["onboarding_self_report", "development_index", "completion_usage"],
  },
};

const QUESTION_CONSTRUCT: Record<string, EvidenceConstructId> = {
  "id-01": "pressure_regulation", "id-02": "pressure_regulation", "id-04": "pressure_regulation", "id-05": "pressure_regulation",
  "err-01": "error_recovery", "err-02": "error_recovery", "err-03": "error_recovery", "err-04": "error_recovery", "err-05": "error_recovery", "err-07": "error_recovery", "dp-03": "error_recovery",
  "press-02": "pressure_regulation", "press-03": "pressure_regulation", "press-04": "pressure_regulation", "press-05": "pressure_regulation", "env-03": "pressure_regulation",
  "focus-01": "focus_presence", "focus-03": "focus_presence", "focus-04": "focus_presence", "dp-06": "focus_presence",
  "grow-01": "uncertainty_learning", "grow-02": "uncertainty_learning", "grow-03": "uncertainty_learning", "grow-04": "uncertainty_learning", "grow-05": "uncertainty_learning",
  "rec-01": "recovery_load", "rec-02": "recovery_load", "rec-03": "recovery_load", "rec-04": "recovery_load", "rec-05": "recovery_load",
  "env-01": "team_connection", "env-02": "team_connection",
  "mot-01": "motivation_process", "mot-02": "motivation_process", "mot-03": "motivation_process", "mot-05": "motivation_process",
};

export type MeasurementContractItem = {
  questionId: string;
  dimension: string;
  constructId: EvidenceConstructId;
  analysisRole: AnalysisRole;
  instrumentId: typeof ONBOARDING_V2_INSTRUMENT_ID;
  instrumentVersion: typeof ONBOARDING_V2_VERSION;
  timing: readonly ["pre", "mid", "post"];
  scoringDirection: Exclude<ScoringDirection, "not_scored">;
  privacy: QuestionPrivacy;
  evidenceKind: "internal_non_validated_self_report";
  athletePrivateAllowed: true;
  internalPseudonymousAllowed: boolean;
  coachAggregateAllowed: boolean;
  requiredConsentVersion: typeof EVIDENCE_V14_CONSENT_VERSION;
  retentionPolicy: typeof EVIDENCE_V14_RETENTION_POLICY;
  allowedClaimClasses: ClaimClass[];
};

export const EVIDENCE_V14_MEASUREMENT_ITEMS: MeasurementContractItem[] = ONBOARDING_V2_QUESTIONS
  .filter((question) => question.retestEligible && question.includeInScore)
  .map((question) => {
    const constructId = QUESTION_CONSTRUCT[question.id];
    if (!constructId || !question.dimension || question.scoringDirection === "not_scored") {
      throw new Error(`Missing V1.4 measurement contract for ${question.id}`);
    }
    const aggregateAllowed = question.privacy === "aggregate_allowed" || question.privacy === "private_and_aggregate";
    return {
      questionId: question.id,
      dimension: question.dimension,
      constructId,
      analysisRole: EVIDENCE_V14_CONSTRUCTS[constructId].analysisRole,
      instrumentId: ONBOARDING_V2_INSTRUMENT_ID,
      instrumentVersion: ONBOARDING_V2_VERSION,
      timing: ["pre", "mid", "post"],
      scoringDirection: question.scoringDirection,
      privacy: question.privacy,
      evidenceKind: "internal_non_validated_self_report",
      athletePrivateAllowed: true,
      internalPseudonymousAllowed: aggregateAllowed,
      coachAggregateAllowed: aggregateAllowed,
      requiredConsentVersion: EVIDENCE_V14_CONSENT_VERSION,
      retentionPolicy: EVIDENCE_V14_RETENTION_POLICY,
      allowedClaimClasses: aggregateAllowed ? ["self_reported_change", "triangulated_change", "association"] : [],
    };
  });

export const EVIDENCE_V14_PRIVATE_ONLY_QUESTION_IDS = EVIDENCE_V14_MEASUREMENT_ITEMS
  .filter((item) => item.privacy === "private_only")
  .map((item) => item.questionId);

export const COMPLETION_USAGE_BOUNDARY =
  "Completion beschreibt Nutzung und Umsetzung. Sie ist weder ein mentaler Qualitätswert noch ein Wirksamkeitsnachweis.";
