import type { Json } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { upsertTodaySnapshot } from "@/lib/programProgress";
import type { EvidenceDomainId, TransferPulseResponse } from "@/lib/performanceEvidence";

export interface DailyTrackingComprehensionResult {
  questionId: string;
  selectedOptionId: string;
  isCorrect: boolean;
}

export interface DailyTrackingInput {
  assignmentId: string;
  userId: string;
  date: string;
  eventType: "training" | "rest" | "competition";
  dayNumber: number;
  variantUsed: string;
  programInstanceId: string;
  completedTaskTitles: string[];
  reflection: string | null;
  moodBefore: number | null;
  energyLevel: number | null;
  focusRating: number | null;
  stress: number | null;
  recovery: number | null;
  sleepQuality: number | null;
  physicalReadiness: number | null;
  motivation: number | null;
  pressure: number | null;
  teamConnection: number | null;
  comprehensionQuestions?: Json;
  comprehensionResults?: DailyTrackingComprehensionResult[];
  evidence?: {
    protocolVersion: string;
    domainId: EvidenceDomainId;
    response: TransferPulseResponse;
    responseDurationMs: number | null;
  };
}

export interface DailyTrackingSaveResult {
  payload: Json;
  snapshotUpdated: boolean;
}

interface DailyTrackingDependencies {
  saveAtomic: (input: DailyTrackingInput) => Promise<{ data: Json; error: unknown }>;
  refreshSnapshot: (userId: string) => Promise<unknown>;
}

export const createDailyTrackingSaver = (dependencies: DailyTrackingDependencies) =>
  async (input: DailyTrackingInput): Promise<DailyTrackingSaveResult> => {
    const { data, error } = await dependencies.saveAtomic(input);
    if (error) throw error;

    const snapshot = await dependencies.refreshSnapshot(input.userId);
    return { payload: data, snapshotUpdated: snapshot !== null };
  };

export const buildDailyTrackingV2RpcArgs = (input: DailyTrackingInput) => ({
    _assignment_id: input.assignmentId,
    _date: input.date,
    _event_type: input.eventType,
    _day_number: input.dayNumber,
    _variant_used: input.variantUsed,
    _program_instance_id: input.programInstanceId,
    _tasks_completed: input.completedTaskTitles as unknown as Json,
    _reflection: input.reflection,
    _mood_before: input.moodBefore,
    _energy_level: input.energyLevel,
    _focus_rating: input.focusRating,
    _stress: input.stress,
    _recovery: input.recovery,
    _sleep_quality: input.sleepQuality,
    _physical_readiness: input.physicalReadiness,
    _motivation: input.motivation,
    _pressure: input.pressure,
    _team_connection: input.teamConnection,
    _comprehension_questions: input.comprehensionQuestions ?? null,
    _comprehension_results: input.comprehensionResults
      ? input.comprehensionResults as unknown as Json
      : null,
});

export const buildDailyTrackingRpcArgs = (input: DailyTrackingInput) => ({
    ...buildDailyTrackingV2RpcArgs(input),
    _evidence_protocol_version: input.evidence?.protocolVersion ?? null,
    _evidence_domain_id: input.evidence?.domainId ?? null,
    _evidence_response: input.evidence ? String(input.evidence.response) : null,
    _evidence_response_duration_ms: input.evidence?.responseDurationMs ?? null,
});

interface CompatibleDailyTrackingDependencies {
  saveV3: (args: ReturnType<typeof buildDailyTrackingRpcArgs>) => Promise<{ data: Json; error: unknown }>;
  saveV2: (args: ReturnType<typeof buildDailyTrackingV2RpcArgs>) => Promise<{ data: Json; error: unknown }>;
}

export const isMissingDailyTrackingV3Error = (error: unknown): boolean => {
  const candidate = error as { code?: string; message?: string; details?: string; hint?: string } | null;
  const description = [candidate?.message, candidate?.details, candidate?.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return (candidate?.code === "PGRST202" || candidate?.code === "42883")
    && description.includes("save_daily_tracking_v3");
};

export const createCompatibleDailyTrackingSave = (dependencies: CompatibleDailyTrackingDependencies) =>
  async (input: DailyTrackingInput): Promise<{ data: Json; error: unknown }> => {
    const v3Result = await dependencies.saveV3(buildDailyTrackingRpcArgs(input));
    if (!v3Result.error) return v3Result;

    // Evidence must never be silently discarded. The fallback exists only for
    // ordinary check-ins during the short frontend-before-migration window.
    if (input.evidence || !isMissingDailyTrackingV3Error(v3Result.error)) return v3Result;
    return dependencies.saveV2(buildDailyTrackingV2RpcArgs(input));
  };

const saveAtomic = createCompatibleDailyTrackingSave({
  saveV3: async (args) => {
    const { data, error } = await supabase.rpc("save_daily_tracking_v3", args);
    return { data, error };
  },
  saveV2: async (args) => {
    const { data, error } = await supabase.rpc("save_daily_tracking_v2", args);
    return { data, error };
  },
});

export const saveDailyTracking = createDailyTrackingSaver({
  saveAtomic,
  refreshSnapshot: upsertTodaySnapshot,
});
