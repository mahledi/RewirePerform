import type { Json } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { createPostgrestResultError } from "@/lib/recoverableRemoteLoad";
import {
  EVIDENCE_PROTOCOL_VERSION,
  isTransferPulseResponse,
  type CoachObservationContext,
  type EvidenceDomainId,
  type SportEventType,
  type TransferPulseResponse,
} from "@/lib/performanceEvidence";

export interface MyEvidenceStatus {
  eligible: boolean;
  reason: string;
  protocolVersion: string;
  domainId: EvidenceDomainId | null;
  existingResponse: TransferPulseResponse | null;
  locked: boolean;
}

interface RawEvidenceStatus {
  eligible?: unknown;
  reason?: unknown;
  protocol_version?: unknown;
  domain_id?: unknown;
  existing_response?: unknown;
  locked?: unknown;
}

const isEvidenceDomainId = (value: unknown): value is EvidenceDomainId =>
  value === "attention_return"
  || value === "error_recovery"
  || value === "pressure_regulation"
  || value === "process_execution"
  || value === "action_under_uncertainty";

const parseTransferPulseResponse = (value: unknown): TransferPulseResponse | null => {
  if (value === "not_observed") return value;
  const numberValue = typeof value === "string" ? Number(value) : value;
  return isTransferPulseResponse(numberValue) ? numberValue : null;
};

export const getMyEvidenceStatus = async ({
  programInstanceId,
  dayNumber,
  eventType,
}: {
  programInstanceId: string;
  dayNumber: number;
  eventType: SportEventType;
}): Promise<MyEvidenceStatus> => {
  const { data, error } = await supabase.rpc("get_my_evidence_status", {
    _program_instance_id: programInstanceId,
    _protocol_version: EVIDENCE_PROTOCOL_VERSION,
    _day_number: dayNumber,
    _event_type: eventType,
  });
  if (error) throw error;

  const raw = (data ?? {}) as RawEvidenceStatus;
  return {
    eligible: raw.eligible === true,
    reason: typeof raw.reason === "string" ? raw.reason : "unavailable",
    protocolVersion: typeof raw.protocol_version === "string"
      ? raw.protocol_version
      : EVIDENCE_PROTOCOL_VERSION,
    domainId: isEvidenceDomainId(raw.domain_id) ? raw.domain_id : null,
    existingResponse: parseTransferPulseResponse(raw.existing_response),
    locked: raw.locked === true,
  };
};

export interface CoachEvidenceReviewValues {
  attention_return: TransferPulseResponse;
  error_recovery: TransferPulseResponse;
  pressure_regulation: TransferPulseResponse;
  process_execution: TransferPulseResponse;
  action_under_uncertainty: TransferPulseResponse;
}

export interface CoachEvidenceReviewRecord {
  context: CoachObservationContext;
  values: Partial<Record<EvidenceDomainId, TransferPulseResponse>>;
}

export interface CoachEvidenceAthlete {
  programInstanceId: string;
  userId: string;
  fullName: string;
  observationAvailable: boolean;
  eligible: boolean;
  eligibilityReason: string;
  review: CoachEvidenceReviewRecord | null;
}

export interface CoachEvidenceReviewContext {
  enabled: boolean;
  reason: string;
  protocolVersion: string;
  run: { id: string; name: string; startedAt: string; status: string } | null;
  weekNumber: number | null;
  teamEligible: boolean;
  athleteCount: number;
  eligibleAthleteCount: number;
  athletes: CoachEvidenceAthlete[];
  teamReview: CoachEvidenceReviewRecord | null;
}

interface RawCoachReviewRecord {
  context?: unknown;
  values?: Record<string, unknown>;
}

const parseCoachReview = (value: unknown): CoachEvidenceReviewRecord | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as RawCoachReviewRecord;
  if (raw.context !== "training" && raw.context !== "competition" && raw.context !== "mixed") return null;

  const values: Partial<Record<EvidenceDomainId, TransferPulseResponse>> = {};
  Object.entries(raw.values ?? {}).forEach(([domainId, response]) => {
    if (!isEvidenceDomainId(domainId)) return;
    const parsed = parseTransferPulseResponse(response);
    if (parsed !== null) values[domainId] = parsed;
  });
  return { context: raw.context, values };
};

export const getCoachEvidenceReviewContext = async (
  teamId: string,
): Promise<CoachEvidenceReviewContext> => {
  const result = await supabase.rpc("get_coach_evidence_review_context", {
    _team_id: teamId,
    _protocol_version: EVIDENCE_PROTOCOL_VERSION,
  });
  if (result.error) throw createPostgrestResultError(result);

  const raw = (result.data ?? {}) as Record<string, unknown>;
  const rawRun = raw.run && typeof raw.run === "object" && !Array.isArray(raw.run)
    ? raw.run as Record<string, unknown>
    : null;
  const rawAthletes = Array.isArray(raw.athletes) ? raw.athletes : [];

  return {
    enabled: raw.enabled === true,
    reason: typeof raw.reason === "string" ? raw.reason : "unavailable",
    protocolVersion: typeof raw.protocol_version === "string"
      ? raw.protocol_version
      : EVIDENCE_PROTOCOL_VERSION,
    run: rawRun && typeof rawRun.id === "string"
      ? {
          id: rawRun.id,
          name: typeof rawRun.name === "string" ? rawRun.name : "Programmlauf",
          startedAt: typeof rawRun.started_at === "string" ? rawRun.started_at : "",
          status: typeof rawRun.status === "string" ? rawRun.status : "active",
        }
      : null,
    weekNumber: typeof raw.week_number === "number" ? raw.week_number : null,
    teamEligible: raw.team_eligible === true,
    athleteCount: typeof raw.athlete_count === "number" ? raw.athlete_count : 0,
    eligibleAthleteCount: typeof raw.eligible_athlete_count === "number" ? raw.eligible_athlete_count : 0,
    athletes: rawAthletes.flatMap((value) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return [];
      const athlete = value as Record<string, unknown>;
      if (typeof athlete.program_instance_id !== "string" || typeof athlete.user_id !== "string") return [];
      return [{
        programInstanceId: athlete.program_instance_id,
        userId: athlete.user_id,
        fullName: typeof athlete.full_name === "string" ? athlete.full_name : "Athlet",
        observationAvailable: athlete.observation_available === true,
        eligible: athlete.eligible === true,
        eligibilityReason: typeof athlete.eligibility_reason === "string"
          ? athlete.eligibility_reason
          : "unavailable",
        review: parseCoachReview(athlete.review),
      }];
    }),
    teamReview: parseCoachReview(raw.team_review),
  };
};

export const saveCoachEvidenceReview = async ({
  scope,
  teamId,
  programInstanceId,
  weekNumber,
  context,
  values,
  completionDurationMs,
}: {
  scope: "team" | "athlete";
  teamId: string;
  programInstanceId: string | null;
  weekNumber: number;
  context: CoachObservationContext;
  values: CoachEvidenceReviewValues;
  completionDurationMs: number;
}): Promise<Json> => {
  const { data, error } = await supabase.rpc("save_coach_evidence_review", {
    _scope: scope,
    _team_id: teamId,
    _program_instance_id: programInstanceId,
    _protocol_version: EVIDENCE_PROTOCOL_VERSION,
    _week_number: weekNumber,
    _context: context,
    _observations: values as unknown as Json,
    _completion_duration_ms: completionDurationMs,
  });
  if (error) throw error;
  return data;
};
