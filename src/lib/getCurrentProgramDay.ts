/**
 * Berechnet den aktuellen Programmtag (1..56) basierend auf program_start.
 *
 * Liefert null, wenn Programm noch nicht gestartet ist (kein program_start
 * oder Datum vor Start) oder wenn das Programm bereits beendet ist (> 56).
 */
import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export interface ProgramDayInfo {
  dayNumber: number; // 1..56
  isWithinProgram: boolean;
  isFinished: boolean;
}

export const getCurrentProgramDay = (
  programStart: string | null | undefined,
  referenceDate: Date = new Date()
): ProgramDayInfo | null => {
  if (!programStart) return null;
  let startDate: Date;
  try {
    startDate = startOfDay(parseISO(programStart));
  } catch {
    return null;
  }
  const today = startOfDay(referenceDate);
  const diff = differenceInCalendarDays(today, startDate);
  if (diff < 0) return null;
  const dayNumber = diff + 1;
  if (dayNumber > 56) {
    return { dayNumber: 56, isWithinProgram: false, isFinished: true };
  }
  return { dayNumber, isWithinProgram: true, isFinished: false };
};

/**
 * Liefert das maßgebliche Programm-Startdatum für einen Athleten.
 *
 * Priorität:
 *   1. Wenn der User in mind. einem Team ist, das einen vom Coach gesetzten
 *      program_start_date hat → frühestes dieser Daten.
 *   2. Sonst: der individuelle program_settings.program_start (Solo-Flow).
 *
 * Liefert auch zurück, ob der Start vom Coach gesteuert wird – damit die UI
 * passende Hinweise zeigen kann ("Dein Coach hat das Programm noch nicht
 * gestartet" vs. eigener Setup-Flow).
 */
export interface EffectiveProgramStart {
  startDate: string | null; // ISO yyyy-MM-dd
  source: "team" | "self" | null;
  hasTeam: boolean;
}

export const getEffectiveProgramStart = async (
  userId: string
): Promise<EffectiveProgramStart> => {
  // 1) Team-Mitgliedschaften laden
  const { data: memberships } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", userId);

  const teamIds = (memberships ?? []).map((membership) => membership.team_id);
  let teamStart: string | null = null;

  if (teamIds.length > 0) {
    const { data: activeRuns } = await supabase
      .from("program_runs")
      .select("started_at")
      .in("team_id", teamIds)
      .eq("status", "active")
      .not("started_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(1);

    const activeRunStart = activeRuns?.[0]?.started_at ?? null;
    if (activeRunStart) {
      return { startDate: activeRunStart, source: "team", hasTeam: true };
    }

    const { data: teams } = await supabase
      .from("teams")
      .select("program_start_date")
      .in("id", teamIds);

    const dates = (teams ?? [])
      .map((team) => team.program_start_date)
      .filter((d): d is string => !!d)
      .sort();
    teamStart = dates[0] ?? null;

    if (teamStart) {
      return { startDate: teamStart, source: "team", hasTeam: true };
    }
  }

  // 2) Solo-Flow Fallback
  const { data: settings } = await supabase
    .from("program_settings")
    .select("program_start")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    startDate: settings?.program_start ?? null,
    source: settings?.program_start ? "self" : null,
    hasTeam: teamIds.length > 0,
  };
};
