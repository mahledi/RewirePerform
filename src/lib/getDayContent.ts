/**
 * Daily Content Resolver.
 *
 * Baut den renderbaren Tag aus:
 *   1) Matrix-Skelett (matrixDays.ts)        — fix, niemals KI-veränderbar
 *   2) Daily Content (dailyContent.ts)        — strukturierter Content
 *   3) Optional: Micro-Adjustment Layer       — Sport-/Positionsbeispiele etc.
 *
 * Kalendertyp (training/rest/competition) kommt zusätzlich aus calendar_events
 * und wird hier nur durchgereicht — nicht in die Tageslogik gemischt.
 */
import { format } from "date-fns";
import { getMatrixDay } from "@/content/matrixDays";
import { getDailyContent } from "@/content/dailyContent";
import type {
  ResolvedDay,
  DailyContent,
  CalendarEventType,
  SportAdaptationHint,
} from "@/content/matrixDayTypes";

export interface MicroAdjustmentInput {
  sport?: string | null;
  position?: string | null;
  level?: string | null;
}

/**
 * Sehr leichte, deterministische Micro-Adjustment-Schicht.
 * KEIN AI-Call. Hängt nur passende Sport-Beispiele an die Tasks an, falls vorhanden.
 * Tagesmechanismus / Aufgabenstruktur bleibt unangetastet.
 */
const applyMicroAdjustments = (
  content: DailyContent,
  adjust?: MicroAdjustmentInput
): DailyContent => {
  if (!adjust?.sport) return content;
  const hint: SportAdaptationHint = {
    sport: adjust.sport,
    position: adjust.position ?? undefined,
    example: `Übertrag auf ${adjust.sport}${adjust.position ? ` (${adjust.position})` : ""}: passe diese Aufgabe an einen typischen Moment deiner Sportart an.`,
  };
  return {
    ...content,
    tasks: content.tasks.map((t) => ({
      ...t,
      sportSpecificExamples: [...(t.sportSpecificExamples ?? []), hint],
    })) as DailyContent["tasks"],
  };
};

export const resolveDay = (
  dayNumber: number,
  date: Date,
  calendarEventType: CalendarEventType,
  adjust?: MicroAdjustmentInput
): ResolvedDay | null => {
  const matrix = getMatrixDay(dayNumber);
  const baseContent = getDailyContent(dayNumber);
  if (!matrix || !baseContent) return null;
  const content = applyMicroAdjustments(baseContent, adjust);
  return {
    matrix,
    content,
    calendarEventType,
    date: format(date, "yyyy-MM-dd"),
  };
};
