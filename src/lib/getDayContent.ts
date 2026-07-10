/**
 * Daily Content Resolver.
 *
 * Baut den renderbaren Tag aus:
 *   1) Matrix-Skelett (matrixDays.ts)        — fix, niemals KI-veränderbar
 *   2) Daily Content (dailyContent.ts)        — strukturierter Content
 *   3) Optional: Micro-Adjustment Layer         — Sport-/Positionsbeispiele etc.
 *   4) Deterministische Kalender-Kontextschicht — Training / Ruhetag / Wettkampf
 *
 * Der Kalendertyp verändert weder Matrix noch Mechanismus. Er passt nur Bezug,
 * Zeitform und Anwendung von Aufgaben, Check-in und Journal an den realen Tag an.
 */
import { format } from "date-fns";
import { getMatrixDay } from "@/content/matrixDays";
import { getDailyContent } from "@/content/dailyContent";
import { adaptDayToContext } from "@/lib/dayContext";
import type {
  ResolvedDay,
  DailyContent,
  CalendarEventType,
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
/**
 * Sport-neutrale Micro-Adjustment-Schicht.
 *
 * Bewusst KEIN sportartspezifischer Override mehr: der Basis-Content ist
 * sport-/positionsneutral formuliert und gilt für jede Athlet:in (Einzel-
 * wie Teamsport). Individualisierung übernimmt der Athlet selbst.
 *
 * Diese Funktion ist daher heute eine Identitäts-Funktion und bleibt nur
 * als Erweiterungspunkt erhalten (z. B. künftige rein deterministische,
 * sportneutrale Anreicherungen).
 */
const applyMicroAdjustments = (
  content: DailyContent,
  _adjust?: MicroAdjustmentInput
): DailyContent => content;

export const resolveDay = (
  dayNumber: number,
  date: Date,
  calendarEventType: CalendarEventType,
  adjust?: MicroAdjustmentInput
): ResolvedDay | null => {
  const matrix = getMatrixDay(dayNumber);
  const baseContent = getDailyContent(dayNumber);
  if (!matrix || !baseContent) return null;
  const adjustedContent = applyMicroAdjustments(baseContent, adjust);
  const { content, context } = adaptDayToContext(adjustedContent, matrix, calendarEventType);
  return {
    matrix,
    content,
    calendarEventType,
    context,
    date: format(date, "yyyy-MM-dd"),
  };
};
