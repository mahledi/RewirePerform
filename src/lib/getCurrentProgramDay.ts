/**
 * Berechnet den aktuellen Programmtag (1..56) basierend auf program_start.
 *
 * Liefert null, wenn Programm noch nicht gestartet ist (kein program_start
 * oder Datum vor Start) oder wenn das Programm bereits beendet ist (> 56).
 */
import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";

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
