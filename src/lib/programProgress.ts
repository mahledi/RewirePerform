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
import { format, differenceInCalendarDays, parseISO, startOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { getEffectiveProgramStart, getCurrentProgramDay } from "@/lib/getCurrentProgramDay";
import { getOrCreateActiveInstance } from "@/lib/programInstance";
import { calculateCompletionRate, calculateStreaks } from "@/lib/trackingMetrics";
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
  const today = await getEffectiveTodayDate(userId);
  const todayStr = format(today, "yyyy-MM-dd");

  // Resolve current cohort instance first
  const instance = await getOrCreateActiveInstance(userId);
  const instanceId = instance?.id ?? null;

  // days_available is now derived from instance.started_at, capped at 56
  const startDate = instance?.started_at ?? (await getEffectiveProgramStart(userId)).startDate;
  const info = getCurrentProgramDay(startDate, today);
  const programDay = info?.dayNumber ?? null;

  let daysAvailable = 0;
  if (startDate) {
    const diff = differenceInCalendarDays(startOfDay(today), startOfDay(parseISO(startDate)));
    daysAvailable = Math.max(0, Math.min(56, diff + 1));
  }

  const teamId = instance?.team_id ?? null;

  let completionsQuery = supabase
    .from("user_day_completion")
    .select("day_number, completion_status, completed_at, task_completion, program_instance_id, user_day_assignments(date)")
    .eq("user_id", userId);
  let checkinsQuery = supabase
    .from("daily_checkins")
    .select("date, program_instance_id")
    .eq("user_id", userId);
  let journalsQuery = supabase
    .from("daily_journals")
    .select("date, program_instance_id")
    .eq("user_id", userId);
  let comprehensionQuery = supabase
    .from("comprehension_check_instances")
    .select("correct_count, total_count, status, program_instance_id")
    .eq("user_id", userId)
    .eq("status", "completed");

  if (instanceId) {
    completionsQuery = completionsQuery.eq("program_instance_id", instanceId);
    checkinsQuery = checkinsQuery.eq("program_instance_id", instanceId);
    journalsQuery = journalsQuery.eq("program_instance_id", instanceId);
    comprehensionQuery = comprehensionQuery.eq("program_instance_id", instanceId);
  } else {
    completionsQuery = completionsQuery.is("program_instance_id", null);
    checkinsQuery = checkinsQuery.is("program_instance_id", null);
    journalsQuery = journalsQuery.is("program_instance_id", null);
    comprehensionQuery = comprehensionQuery.is("program_instance_id", null);
  }

  const [completionsRes, checkinsRes, journalsRes, comprehensionRes] = await Promise.all([
    completionsQuery,
    checkinsQuery,
    journalsQuery,
    comprehensionQuery,
  ]);

  const trackingError = completionsRes.error ?? checkinsRes.error ?? journalsRes.error ?? comprehensionRes.error;
  if (trackingError) {
    console.error("upsertTodaySnapshot tracking read error:", trackingError);
    return null;
  }

  const completionsAll = (completionsRes.data ?? []).filter(
    (completion) => completion.completion_status === "completed"
  );
  // unique completed days
  const uniqueDays = new Set(completionsAll.map((completion) => completion.day_number));
  const daysCompleted = uniqueDays.size;

  const tasksCompletedCount = completionsAll.reduce(
    (sum, completion) => sum + (Array.isArray(completion.task_completion) ? completion.task_completion.length : 0),
    0
  );
  const completedDates = completionsAll
    .map((completion) => completion.user_day_assignments?.date ?? completion.completed_at?.slice(0, 10) ?? null)
    .filter((date): date is string => Boolean(date))
    .map((date) => date.slice(0, 10));
  const { current: currentStreak, longest: longestStreak } = calculateStreaks(completedDates, today);

  const checkinsCount = checkinsRes.data?.length ?? 0;
  const journalsCount = journalsRes.data?.length ?? 0;

  const comprehensions = comprehensionRes.data ?? [];
  let comprehensionAvg: number | null = null;
  const rates = comprehensions
    .filter((check) => typeof check.total_count === "number" && check.total_count > 0 && typeof check.correct_count === "number")
    .map((check) => (check.correct_count as number) / (check.total_count as number));
  if (rates.length > 0) {
    comprehensionAvg = rates.reduce((a: number, b: number) => a + b, 0) / rates.length;
  }

  const completionRate = calculateCompletionRate(daysCompleted, daysAvailable);

  const snapshot: ProgressSnapshot = {
    user_id: userId,
    team_id: teamId,
    program_instance_id: instanceId,
    date: todayStr,
    program_day: programDay,
    days_available: daysAvailable,
    days_completed: daysCompleted,
    completion_rate: Number(completionRate.toFixed(4)),
    current_streak: currentStreak,
    longest_streak: longestStreak,
    comprehension_average:
      comprehensionAvg !== null ? Number(comprehensionAvg.toFixed(4)) : null,
    tasks_completed_count: tasksCompletedCount,
    checkins_completed_count: checkinsCount,
    journals_completed_count: journalsCount,
  };

  let existingQuery = supabase
    .from("program_progress_snapshots")
    .select("id")
    .eq("user_id", userId)
    .eq("date", todayStr);

  existingQuery = instanceId
    ? existingQuery.eq("program_instance_id", instanceId)
    : existingQuery.is("program_instance_id", null);

  const { data: existing, error: lookupError } = await existingQuery.maybeSingle();

  if (lookupError) {
    console.error("upsertTodaySnapshot lookup error:", lookupError);
    return null;
  }

  const { error } = existing?.id
    ? await supabase
        .from("program_progress_snapshots")
        .update(snapshot)
        .eq("id", existing.id)
    : await supabase
        .from("program_progress_snapshots")
        .insert(snapshot);

  if (error) {
    console.error("upsertTodaySnapshot error:", error);
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
