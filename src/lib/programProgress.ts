/**
 * Program Progress / Adherence Service
 *
 * Idempotent berechneter täglicher Snapshot pro Spieler:
 *   - days_available, days_completed, completion_rate
 *   - current_streak, longest_streak
 *   - comprehension_average
 *   - tasks/checkins/journals counts
 *
 * Wird beim Dashboard-Load aufgerufen. Pro (user, date) existiert nur ein
 * Eintrag dank UNIQUE-Constraint — wir nutzen upsert.
 */
import { format, differenceInCalendarDays, parseISO, startOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { getEffectiveProgramStart, getCurrentProgramDay } from "@/lib/getCurrentProgramDay";
import { getOrCreateActiveInstance } from "@/lib/programInstance";

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

function computeStreaks(completedDates: string[]): { current: number; longest: number } {
  if (completedDates.length === 0) return { current: 0, longest: 0 };
  const sorted = [...new Set(completedDates)].sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = differenceInCalendarDays(parseISO(sorted[i]), parseISO(sorted[i - 1]));
    if (diff === 1) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }
  // current streak: counted from latest backwards
  const today = startOfDay(new Date());
  const latest = parseISO(sorted[sorted.length - 1]);
  let current = 0;
  if (differenceInCalendarDays(today, latest) <= 1) {
    current = 1;
    for (let i = sorted.length - 1; i > 0; i--) {
      const d = differenceInCalendarDays(parseISO(sorted[i]), parseISO(sorted[i - 1]));
      if (d === 1) current += 1;
      else break;
    }
  }
  return { current, longest };
}

/**
 * Schreibt (oder aktualisiert) den heutigen Snapshot für den User.
 * Idempotent — kann mehrfach pro Tag aufgerufen werden.
 */
export async function upsertTodaySnapshot(userId: string): Promise<ProgressSnapshot | null> {
  const today = new Date();
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

  // Cohort-scoped reads
  const baseFilter = (q: any) =>
    instanceId ? q.eq("program_instance_id", instanceId) : q.eq("user_id", userId);

  const [completionsRes, checkinsRes, journalsRes, comprehensionRes] = await Promise.all([
    baseFilter(
      supabase
        .from("user_day_completion")
        .select("day_number, completion_status, completed_at, task_completion, program_instance_id")
        .eq("user_id", userId)
    ),
    baseFilter(
      supabase.from("daily_checkins").select("date, program_instance_id").eq("user_id", userId)
    ),
    baseFilter(
      supabase.from("daily_journals").select("date, program_instance_id").eq("user_id", userId)
    ),
    baseFilter(
      supabase
        .from("comprehension_check_instances")
        .select("correct_count, total_count, status, program_instance_id")
        .eq("user_id", userId)
        .eq("status", "completed")
    ),
  ]);

  const completionsAll = (completionsRes.data ?? []).filter(
    (c: any) => c.completion_status === "completed"
  );
  // unique completed days
  const uniqueDays = new Set(completionsAll.map((c: any) => c.day_number));
  const daysCompleted = uniqueDays.size;

  const tasksCompletedCount = completionsAll.reduce(
    (sum: number, c: any) => sum + (Array.isArray(c.task_completion) ? c.task_completion.length : 0),
    0
  );
  const completedDates = completionsAll
    .map((c: any) => c.completed_at)
    .filter(Boolean)
    .map((d: string) => d.slice(0, 10));
  const { current: currentStreak, longest: longestStreak } = computeStreaks(completedDates);

  const checkinsCount = checkinsRes.data?.length ?? 0;
  const journalsCount = journalsRes.data?.length ?? 0;

  const comprehensions = comprehensionRes.data ?? [];
  let comprehensionAvg: number | null = null;
  const rates = comprehensions
    .filter((c: any) => c.total_count > 0)
    .map((c: any) => c.correct_count / c.total_count);
  if (rates.length > 0) {
    comprehensionAvg = rates.reduce((a: number, b: number) => a + b, 0) / rates.length;
  }

  const completionRate = daysAvailable > 0 ? Math.min(1, daysCompleted / daysAvailable) : 0;

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

  // Cohort-scoped upsert. If there is no instance yet, fall back to legacy unique.
  const { error } = await supabase
    .from("program_progress_snapshots")
    .upsert(snapshot, {
      onConflict: instanceId ? "user_id,program_instance_id,date" : "user_id,date",
    });

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
  const effective = await getEffectiveProgramStart(userId);
  const info = getCurrentProgramDay(effective.startDate, new Date());
  const programDay = info?.dayNumber ?? null;

  const { data } = await supabase
    .from("assessments")
    .select("assessment_type, timing")
    .eq("user_id", userId)
    .in("timing", ["mid", "post"]);

  const midTypes = new Set((data ?? []).filter((a) => a.timing === "mid").map((a) => a.assessment_type));
  const postTypes = new Set((data ?? []).filter((a) => a.timing === "post").map((a) => a.assessment_type));

  const midDone = REQUIRED_TYPES.every((t) => midTypes.has(t));
  const postDone = REQUIRED_TYPES.every((t) => postTypes.has(t));

  // Mid-Banner: Tag 28..55, noch nicht gemacht
  // Post-Banner: Tag 56+, noch nicht gemacht
  const midDue = !!programDay && programDay >= 28 && programDay < 56 && !midDone;
  const postDue = !!programDay && programDay >= 56 && !postDone;

  return { midDue, postDue, midDone, postDone, programDay };
}
