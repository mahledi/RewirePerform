/**
 * Daily Content Layer — Tagesinhalte (Tasks, Journal, Science Bite, Self-Talk).
 *
 * Diese Datei enthält Platzhalter-Strukturen für alle 56 Tage.
 * Finale Tagesinhalte werden später hier eingefügt — die Architektur ist stabil.
 *
 * KI darf später Micro-Adjustments NUR auf wording-Ebene innerhalb dieser Felder machen
 * (z. B. sport-/positionsspezifische Beispiele, Trigger-Anpassung).
 * Sie darf NICHT die Tageslinse / den Mechanismus / die Aufgabenstruktur ändern.
 */

import { MATRIX_DAYS } from "./matrixDays";
import type { DailyContent, DailyTask, DailyJournal } from "./matrixDayTypes";

// ─────────── Generic Placeholder Builder ───────────
// Wird verwendet, solange finale Tagesinhalte nicht eingepflegt sind.
// Strukturierte Platzhalter, KEINE inhaltlichen Halluzinationen für 56 Tage.

const placeholderTask = (
  id: string,
  title: string,
  systemFn: string,
  icon: string
): DailyTask => ({
  id,
  title,
  why: "[TODO Content] – warum diese Aufgabe an diesem Tag relevant ist.",
  detailedExplanation: "[TODO Content] – detaillierte neurokognitive Erklärung.",
  concreteAction: "[TODO Content] – konkrete Handlung für den Athleten.",
  systemFunction: systemFn,
  whenToUse: "[TODO Content]",
  microReframe: "[TODO Content] – kurzer kognitiver Reframe.",
  selfTalk: "[TODO Content]",
  reframeStep: {
    trigger: "[TODO] – Wenn heute X passiert …",
    reframe: "[TODO] – Dann erinnere dich: Y",
    anchor: "[TODO] – Heute gilt: Z",
  },
  icon,
});

const placeholderJournal = (lens: string): DailyJournal => ({
  journalTitle: `Tagesabschluss – ${lens}`,
  questions: [
    { id: "q1", question: "Wo hast du die heutige Linse heute bemerkt?", placeholder: "Konkreter Moment …" },
    { id: "q2", question: "Was war dein automatisches Muster?", placeholder: "Reaktion ohne Nachdenken …" },
    { id: "q3", question: "Was hast du anders gemacht – oder hättest du anders machen können?", placeholder: "Alternative Reaktion …" },
    { id: "q4", question: "Was nimmst du in den nächsten Tag mit?", placeholder: "Ein Satz …" },
  ],
  gratitudeInstruction: "Nenne eine konkrete Sache aus dem heutigen Tag, für die du dankbar bist – nicht abstrakt, sondern spezifisch.",
  freeReflectionPrompt: "Optional: Was sonst willst du heute festhalten?",
});

/**
 * Default-Content-Skelett für jeden der 56 Tage.
 * Editieren: Pflege hier den finalen Content pro Tag ein.
 */
export const DAILY_CONTENT: Record<number, DailyContent> = Object.fromEntries(
  MATRIX_DAYS.map((day): [number, DailyContent] => [
    day.dayNumber,
    {
      dayNumber: day.dayNumber,
      scienceBite: {
        fact: `[TODO Content – Tag ${day.dayNumber}] Wissenschaftlicher Kurz-Fakt zur Linse: "${day.lens}". Mechanismus: ${day.primaryMechanism}.`,
        source: "[TODO Quelle]",
        year: 0,
      },
      todayTrigger: `[TODO Content – Tag ${day.dayNumber}] Heutiger Trigger zur Linse "${day.lens}".`,
      coreShift: `[TODO Content – Tag ${day.dayNumber}] Kern-Shift: von altem Muster zu neuer Reaktion (${day.systemFunction}).`,
      tasks: [
        placeholderTask(`d${day.dayNumber}-t1`, "Wahrnehmungs-Task", day.systemFunction, "eye"),
        placeholderTask(`d${day.dayNumber}-t2`, "Anwendungs-Task", day.systemFunction, "target"),
        placeholderTask(`d${day.dayNumber}-t3`, "Verankerungs-Task", day.systemFunction, "brain"),
      ],
      journal: placeholderJournal(day.lens),
      gratitudePrompt: "Eine konkrete Sache aus dem heutigen Sport- oder Trainingskontext, die heute gut war.",
      selfTalkAnchors: [
        { text: `Heute geht es um: ${day.lens}.`, when: "Vor dem Training" },
        { text: `Wenn ich abdrifte, kehre ich zur Aufgabe zurück.`, when: "Während des Trainings" },
      ],
    },
  ])
);

export const getDailyContent = (dayNumber: number): DailyContent | null =>
  DAILY_CONTENT[dayNumber] ?? null;
