/**
 * Flame / Consistency Stats — pure deterministic helper.
 *
 * Reuses existing completion data (user_day_completion + program_progress_snapshots).
 * No DB writes, no AI, no new tables.
 */
import { differenceInCalendarDays, parseISO, startOfDay, format } from "date-fns";

export type FlameLevel =
  | "ember"
  | "spark"
  | "flame"
  | "momentum"
  | "commitment"
  | "identity";

export type FlameState =
  | "new_start"
  | "active"
  | "saved_today"
  | "at_risk"
  | "recovered"
  | "broken";

export interface FlameStats {
  currentStreak: number;
  longestStreak: number;
  totalCompletedDays: number;
  daysAvailable: number;
  completionRate: number; // 0..1
  programDay: number | null;
  completedToday: boolean;
  lastCompletedDate: string | null; // yyyy-MM-dd
  missedDaysCount: number;
  flameLevel: FlameLevel;
  levelLabel: string;
  flameState: FlameState;
  message: string;
  completedDayNumbers: number[];
}

export interface FlameCompletionRow {
  day_number: number;
  completed_at: string | null;
  completion_status: string;
}

export interface FlameSnapshot {
  current_streak: number;
  longest_streak: number;
  days_available: number;
  days_completed: number;
  program_day: number | null;
}

const LEVEL_LABEL: Record<FlameLevel, string> = {
  ember: "Startbereit",
  spark: "Funke",
  flame: "Flamme",
  momentum: "Momentum",
  commitment: "Commitment",
  identity: "Identität",
};

function levelFromStreak(streak: number): FlameLevel {
  if (streak >= 28) return "identity";
  if (streak >= 14) return "commitment";
  if (streak >= 7) return "momentum";
  if (streak >= 3) return "flame";
  if (streak >= 1) return "spark";
  return "ember";
}

function computeStreaksFromDates(dates: string[], today: Date): { current: number; longest: number } {
  if (dates.length === 0) return { current: 0, longest: 0 };
  const sorted = [...new Set(dates)].sort();
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
  const todayD = startOfDay(today);
  const latest = parseISO(sorted[sorted.length - 1]);
  let current = 0;
  if (differenceInCalendarDays(todayD, latest) <= 1) {
    current = 1;
    for (let i = sorted.length - 1; i > 0; i--) {
      const d = differenceInCalendarDays(parseISO(sorted[i]), parseISO(sorted[i - 1]));
      if (d === 1) current += 1;
      else break;
    }
  }
  return { current, longest };
}

export function buildFlameStats(input: {
  completions: FlameCompletionRow[];
  snapshot?: FlameSnapshot | null;
  today?: Date;
}): FlameStats {
  const today = input.today ?? new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  const completed = input.completions.filter(
    (c) => c.completion_status === "completed"
  );

  const completedDates = completed
    .map((c) => c.completed_at)
    .filter((d): d is string => !!d)
    .map((d) => d.slice(0, 10));

  const uniqueDayNumbers = Array.from(
    new Set(completed.map((c) => c.day_number))
  ).sort((a, b) => a - b);

  const totalCompletedDays = uniqueDayNumbers.length;

  // Prefer snapshot values (cohort-scoped, server-truthed). Fallback to local recompute.
  const local = computeStreaksFromDates(completedDates, today);
  const currentStreak = input.snapshot?.current_streak ?? local.current;
  const longestStreak = Math.max(
    input.snapshot?.longest_streak ?? 0,
    local.longest
  );

  const daysAvailable = input.snapshot?.days_available ?? 0;
  const programDay = input.snapshot?.program_day ?? null;
  const completionRate =
    daysAvailable > 0 ? Math.min(1, totalCompletedDays / daysAvailable) : 0;

  const completedToday = completedDates.includes(todayStr);
  const lastCompletedDate =
    completedDates.length > 0
      ? [...completedDates].sort().slice(-1)[0]
      : null;
  const missedDaysCount = Math.max(0, daysAvailable - totalCompletedDays);

  const flameLevel = levelFromStreak(currentStreak);
  const levelLabel = LEVEL_LABEL[flameLevel];

  let flameState: FlameState;
  if (totalCompletedDays === 0) {
    flameState = "new_start";
  } else if (completedToday) {
    // Recovered: completed today but had a gap before today
    if (lastCompletedDate && currentStreak === 1 && totalCompletedDays > 1) {
      flameState = "recovered";
    } else {
      flameState = "saved_today";
    }
  } else if (lastCompletedDate) {
    const gap = differenceInCalendarDays(
      startOfDay(today),
      parseISO(lastCompletedDate)
    );
    if (gap <= 1) flameState = "active"; // completed yesterday or today missing
    else if (gap === 2) flameState = "at_risk";
    else flameState = "broken";
  } else {
    flameState = "new_start";
  }

  const message = buildMessage(flameState, currentStreak);

  return {
    currentStreak,
    longestStreak,
    totalCompletedDays,
    daysAvailable,
    completionRate,
    programDay,
    completedToday,
    lastCompletedDate,
    missedDaysCount,
    flameLevel,
    levelLabel,
    flameState,
    message,
    completedDayNumbers: uniqueDayNumbers,
  };
}

function buildMessage(state: FlameState, streak: number): string {
  if (streak >= 28) return "Du beweist nichts. Du wirst jemand, der wiederkommt.";
  switch (state) {
    case "new_start":
      return "Startbereit. Eine saubere Wiederholung beginnt das System.";
    case "active":
      return "Du hältst deine Wiederholung am Leben.";
    case "saved_today":
      return "Flamme gesichert. Heute zählt.";
    case "at_risk":
      return "Heute ist noch offen. Eine saubere Wiederholung reicht.";
    case "recovered":
      return "Stark: Rückkehr ist Teil des Systems.";
    case "broken":
      return "Streaks sind Signale, keine Urteile. Starte die nächste Serie.";
  }
}

export function levelDescription(level: FlameLevel): string {
  switch (level) {
    case "ember":
      return "Eine saubere Wiederholung startet alles.";
    case "spark":
      return "Der Funke ist da. Die nächste Einheit hält ihn am Leben.";
    case "flame":
      return "Wiederholung wird sichtbar.";
    case "momentum":
      return "Momentum aufgebaut. Bleib bei der nächsten sauberen Einheit.";
    case "commitment":
      return "Commitment sichtbar. Konstanz wird Routine.";
    case "identity":
      return "Konstanz ist nicht mehr nur ein Ziel — sie wird Teil deines Selbstbilds.";
  }
}
