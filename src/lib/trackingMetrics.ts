import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";

export interface StreakResult {
  current: number;
  longest: number;
}

export const calculateCompletionRate = (completedDays: number, availableDays: number): number => {
  if (!Number.isFinite(completedDays) || !Number.isFinite(availableDays) || availableDays <= 0) return 0;
  return Math.min(1, Math.max(0, completedDays) / availableDays);
};

export const calculateConsentRate = (consented: number, total: number): number | null => {
  if (!Number.isFinite(consented) || !Number.isFinite(total) || total <= 0) return null;
  return Math.min(1, Math.max(0, consented) / total);
};

export const canShowSensitiveAggregate = (distinctUsers: number, minimum = 5): boolean =>
  distinctUsers >= Math.max(5, minimum);

export const isLowConfidenceAggregate = (distinctUsers: number): boolean =>
  distinctUsers >= 5 && distinctUsers < 10;

export const calculateStreaks = (
  completedDates: string[],
  referenceDate: Date = new Date(),
): StreakResult => {
  const sorted = [...new Set(completedDates)].sort();
  if (sorted.length === 0) return { current: 0, longest: 0 };

  let longest = 1;
  let run = 1;
  for (let index = 1; index < sorted.length; index += 1) {
    const difference = differenceInCalendarDays(parseISO(sorted[index]), parseISO(sorted[index - 1]));
    run = difference === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  const latest = parseISO(sorted[sorted.length - 1]);
  if (differenceInCalendarDays(startOfDay(referenceDate), latest) > 1) {
    return { current: 0, longest };
  }

  let current = 1;
  for (let index = sorted.length - 1; index > 0; index -= 1) {
    const difference = differenceInCalendarDays(parseISO(sorted[index]), parseISO(sorted[index - 1]));
    if (difference !== 1) break;
    current += 1;
  }

  return { current, longest };
};

export type PilotReadinessStatus = "GREEN" | "YELLOW" | "RED";

export interface PilotReadinessInput {
  hasActiveRun: boolean;
  athletes: number;
  assignedAthletes: number;
  activeInstances: number;
  integrityErrors: number;
  consentedAthletes: number;
  validatedPreComplete: number;
  developmentPreComplete: number;
}

export const derivePilotReadinessStatus = (input: PilotReadinessInput): PilotReadinessStatus => {
  if (
    !input.hasActiveRun
    || input.athletes === 0
    || input.assignedAthletes !== input.athletes
    || input.activeInstances !== input.athletes
    || input.integrityErrors > 0
  ) return "RED";

  if (
    input.athletes < 5
    || input.consentedAthletes < input.athletes
    || input.validatedPreComplete < input.athletes
    || input.developmentPreComplete < input.athletes
  ) return "YELLOW";

  return "GREEN";
};
