/**
 * Program Progress / Adherence Service
 *
 * Idempotent berechneter täglicher Snapshot pro Athlet:in:
 *   - days_available, days_completed, completion_rate
 *   - current_streak, longest_streak
 *   - comprehension_average
 *   - tasks/checkins/journals counts
 *
 * Wird beim Dashboard-Load aufgerufen. Pro (user, date) bzw. pro
 * (user, program_instance_id, date) soll nur ein Eintrag existieren.
 */
import { supabase } from "@/integrations/supabase/client";
import { getEffectiveProgramStart, getCurrentProgramDay } from "@/lib/getCurrentProgramDay";
import { getOrCreateActiveInstance } from "@/lib/programInstance";
import { getEffectiveTodayDate } from "@/lib/qaTime";

export interface ProgressSnapshot {
  user_id: string;
  team_id: string | null;
  program_instance_id: string | null;
  date: string;
  program_day: number | null;
  days_available: number;
  days_completed: number;
  completion_rate: number;
  current_streak: number;
  longest_streak: number;
  comprehension_average: number | null;
  tasks_completed_count: number;
  checkins_completed_count: number;
  journals_completed_count: number;
}

/**
 * Schreibt (oder aktualisiert) den heutigen Snapshot für den User.
 * Idempotent — kann mehrfach pro Tag aufgerufen werden.
 */
export async function upsertTodaySnapshot(userId: string): Promise<ProgressSnapshot | null> {
  const instance = await getOrCreateActiveInstance(userId);
  if (!instance?.id) {
    console.error("upsertTodaySnapshot error: active program instance required");
    return null;
  }

  const { data, error } = await supabase.rpc("refresh_my_program_progress_snapshot", {
    _program_instance_id: instance.id,
  });

  if (error || !data || typeof data !== "object" || Array.isArray(data)) {
    console.error("upsertTodaySnapshot RPC error:", error ?? "invalid snapshot response");
    return null;
  }

  const snapshot = data as unknown as ProgressSnapshot;
  if (snapshot.user_id !== userId || snapshot.program_instance_id !== instance.id) {
    console.error("upsertTodaySnapshot RPC error: snapshot scope mismatch");
    return null;
  }

  return snapshot;
}

/**
 * Bestimmt, ob ein Re-Test fällig ist.
 * Mid an Tag 28, Post an Tag 56 (oder später). Sobald der Test gespeichert ist,
 * kein Banner mehr — Eindeutigkeits-Index in DB verhindert Doppel-Speicherung.
 */
export interface RetestStatus {
  midDue: boolean;
  postDue: boolean;
  midDone: boolean;
  postDone: boolean;
  programDay: number | null;
}

const REQUIRED_TYPES = ["csai2r", "smtq", "flow_short"];

export async function getRetestStatus(userId: string): Promise<RetestStatus> {
  const instance = await getOrCreateActiveInstance(userId);
  const startDate = instance?.started_at ?? (await getEffectiveProgramStart(userId)).startDate;
  const effectiveToday = await getEffectiveTodayDate(userId);
  const info = getCurrentProgramDay(startDate, effectiveToday);
  const programDay = info?.dayNumber ?? null;

  // Cohort-scoped: only assessments from current instance count
  let q = supabase
    .from("assessments")
    .select("assessment_type, timing, program_instance_id")
    .eq("user_id", userId)
    .in("timing", ["mid", "post"]);
  if (instance?.id) q = q.eq("program_instance_id", instance.id);
  const { data } = await q;

  const midTypes = new Set((data ?? []).filter((a) => a.timing === "mid").map((a) => a.assessment_type));
  const postTypes = new Set((data ?? []).filter((a) => a.timing === "post").map((a) => a.assessment_type));

  const midDone = REQUIRED_TYPES.every((t) => midTypes.has(t));
  const postDone = REQUIRED_TYPES.every((t) => postTypes.has(t));

  const midDue = !!programDay && programDay >= 28 && programDay < 56 && !midDone;
  const postDue = !!programDay && programDay >= 56 && !postDone;

  return { midDue, postDue, midDone, postDone, programDay };
}
