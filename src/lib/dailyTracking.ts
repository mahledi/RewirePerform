import type { Json } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { upsertTodaySnapshot } from "@/lib/programProgress";

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

const saveAtomic = async (input: DailyTrackingInput) => {
  const { data, error } = await supabase.rpc("save_daily_tracking_v2", {
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
  return { data, error };
};

export const saveDailyTracking = createDailyTrackingSaver({
  saveAtomic,
  refreshSnapshot: upsertTodaySnapshot,
});
