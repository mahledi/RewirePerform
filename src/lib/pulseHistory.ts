import { format, parseISO, startOfWeek } from "date-fns";
import { de } from "date-fns/locale";
import type { Json } from "@/integrations/supabase/types";

export const pulseMetricKeys = [
  "mood",
  "energy",
  "focus",
  "stress",
  "recovery",
  "sleep_quality",
  "physical_readiness",
  "motivation",
  "pressure",
  "team_connection",
] as const;

export type PulseMetricKey = (typeof pulseMetricKeys)[number];

export const pulseMetricLabels: Record<PulseMetricKey, string> = {
  mood: "Stimmung",
  energy: "Energie",
  focus: "Fokus",
  stress: "Stress",
  recovery: "Erholung",
  sleep_quality: "Schlaf",
  physical_readiness: "Körper",
  motivation: "Motivation",
  pressure: "Druck",
  team_connection: "Teamverbundenheit",
};

export interface PulseDay {
  date: string;
  n_users?: number;
  sufficient_data?: boolean;
  low_confidence?: boolean;
  values: Record<PulseMetricKey, number | null>;
}

export interface PulseWeek {
  key: string;
  label: string;
  start: string;
  days: PulseDay[];
}

export interface OwnCheckinRow {
  date: string;
  mood_before: number | null;
  energy_level: number | null;
  focus_rating: number | null;
  wellbeing_metrics: Json;
}

const safeNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 10
    ? value
    : null;

const metricObject = (value: Json): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export const ownCheckinToPulseDay = (row: OwnCheckinRow): PulseDay => {
  const metrics = metricObject(row.wellbeing_metrics);
  return {
    date: row.date,
    sufficient_data: true,
    values: {
      mood: safeNumber(metrics.mood) ?? safeNumber(row.mood_before),
      energy: safeNumber(metrics.energy) ?? safeNumber(row.energy_level),
      focus: safeNumber(metrics.focus) ?? safeNumber(row.focus_rating),
      stress: safeNumber(metrics.stress),
      recovery: safeNumber(metrics.recovery),
      sleep_quality: safeNumber(metrics.sleep_quality),
      physical_readiness: safeNumber(metrics.physical_readiness),
      motivation: safeNumber(metrics.motivation),
      pressure: safeNumber(metrics.pressure),
      team_connection: safeNumber(metrics.team_connection),
    },
  };
};

export const groupPulseDaysByWeek = (days: PulseDay[]): PulseWeek[] => {
  const groups = new Map<string, PulseDay[]>();
  [...days]
    .sort((a, b) => b.date.localeCompare(a.date))
    .forEach((day) => {
      const weekStart = startOfWeek(parseISO(day.date), { weekStartsOn: 1 });
      const key = format(weekStart, "yyyy-MM-dd");
      groups.set(key, [...(groups.get(key) ?? []), day]);
    });

  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([start, weekDays], index) => ({
      key: start,
      start,
      label: index === 0
        ? "Diese Woche"
        : `Woche ab ${format(parseISO(start), "dd. MMMM", { locale: de })}`,
      days: weekDays,
    }));
};

export const findPreviousMetricValue = (
  days: PulseDay[],
  currentDate: string,
  key: PulseMetricKey,
): number | null => {
  const previous = [...days]
    .filter((day) => day.date < currentDate && day.sufficient_data !== false)
    .sort((a, b) => b.date.localeCompare(a.date))
    .find((day) => typeof day.values[key] === "number");
  return previous?.values[key] ?? null;
};

export const getPulseDelta = (
  days: PulseDay[],
  current: PulseDay,
  key: PulseMetricKey,
): number | null => {
  const currentValue = current.values[key];
  const previousValue = findPreviousMetricValue(days, current.date, key);
  return typeof currentValue === "number" && typeof previousValue === "number"
    ? currentValue - previousValue
    : null;
};

export const formatPulseValue = (value: number | null) =>
  typeof value === "number" ? value.toFixed(1).replace(".", ",") : "—";

export const formatPulseDelta = (delta: number | null) => {
  if (delta === null) return "—";
  const rounded = Math.round(delta * 10) / 10;
  if (Math.abs(rounded) < 0.05) return "stabil";
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(1).replace(".", ",")}`;
};
