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

// ─────────── Comprehension Pools (per day overrides) ───────────
// Pflege hier 5-8 Fragen pro Tag ein. App zieht beim Check 3-5 zufällig.
// Demo: Tag 1.
const COMPREHENSION_POOLS: Record<number, NonNullable<DailyContent["comprehensionPool"]>> = {
  1: [
    {
      id: "d1-q1",
      target: "lens",
      stem: "Worum geht es heute im Kern?",
      options: [
        { id: "a", text: "Möglichst viele Aufgaben perfekt erledigen" },
        { id: "b", text: "Bemerken, wann ich gedanklich abdrifte" },
        { id: "c", text: "Mich besser motivieren als gestern" },
        { id: "d", text: "Mit dem Gegner mental konkurrieren" },
      ],
      correctOptionId: "b",
      explanation: "Heute ist die Linse: Präsenz statt Autopilot. Es geht ums Bemerken — nicht um Leistung.",
    },
    {
      id: "d1-q2",
      target: "action",
      stem: "Was ist die zentrale Praxis heute?",
      options: [
        { id: "a", text: "Wegdriften des Fokus erkennen" },
        { id: "b", text: "Ergebnisse analysieren" },
        { id: "c", text: "Selbstgespräche optimieren" },
        { id: "d", text: "Atmung kontrollieren" },
      ],
      correctOptionId: "a",
      explanation: "Praxisfokus heute: Wegdriften bemerken. Mehr ist heute nicht das Ziel.",
    },
    {
      id: "d1-q3",
      target: "mistake",
      stem: "Was wäre heute ein Missverständnis der Aufgabe?",
      options: [
        { id: "a", text: "Mich schämen, wenn ich abdrifte" },
        { id: "b", text: "Neutral bemerken, dass ich abgedriftet bin" },
        { id: "c", text: "Den Moment des Abdriftens beobachten" },
        { id: "d", text: "Ohne Bewertung zurückkehren" },
      ],
      correctOptionId: "a",
      explanation: "Bewertung ist nicht Teil der Aufgabe heute. Bemerken reicht.",
    },
    {
      id: "d1-q4",
      target: "behavior",
      stem: "Was machst du, wenn du im Training merkst, dass du abgedriftet bist?",
      options: [
        { id: "a", text: "Ich ärgere mich kurz und versuche, mich zu konzentrieren" },
        { id: "b", text: "Ich bemerke es ruhig und kehre zur Aufgabe zurück" },
        { id: "c", text: "Ich analysiere, warum ich abgedriftet bin" },
        { id: "d", text: "Ich pushe mich härter" },
      ],
      correctOptionId: "b",
      explanation: "Bemerken + ruhige Rückkehr. Kein Selbstangriff, keine Analyse-Schleife.",
    },
    {
      id: "d1-q5",
      target: "lens",
      stem: "Warum ist Bemerken ein eigenständiges Training?",
      options: [
        { id: "a", text: "Weil es Konzentration ersetzt" },
        { id: "b", text: "Weil es die Voraussetzung für jede bewusste Reaktion ist" },
        { id: "c", text: "Weil es schneller müde macht" },
        { id: "d", text: "Weil es Gegner verwirrt" },
      ],
      correctOptionId: "b",
      explanation: "Ohne Bemerken keine Wahl. Bemerken ist die Basis aller späteren Schritte im Programm.",
    },
    {
      id: "d1-q6",
      target: "behavior",
      stem: "Wie sieht heute ein erfolgreicher Tag aus?",
      options: [
        { id: "a", text: "Ich bin nie abgedriftet" },
        { id: "b", text: "Ich habe mehrere Male bemerkt, dass ich abgedriftet war" },
        { id: "c", text: "Ich habe maximale Leistung erbracht" },
        { id: "d", text: "Ich habe alle Aufgaben in Rekordzeit erledigt" },
      ],
      correctOptionId: "b",
      explanation: "Erfolg heute = mehr Bemerken. Nicht weniger Abdriften.",
    },
  ],
};

// Inject pools into DAILY_CONTENT after build.
for (const [dayStr, pool] of Object.entries(COMPREHENSION_POOLS)) {
  const n = Number(dayStr);
  if (DAILY_CONTENT[n]) DAILY_CONTENT[n].comprehensionPool = pool;
}

export const getDailyContent = (dayNumber: number): DailyContent | null =>
  DAILY_CONTENT[dayNumber] ?? null;

/**
 * Wählt 3-5 Fragen aus dem Pool (random, deterministisch via seed möglich).
 * Fallback: leeres Array, wenn kein Pool gepflegt ist.
 */
export const drawComprehensionQuestions = (
  dayNumber: number,
  count = 3
): NonNullable<DailyContent["comprehensionPool"]> => {
  const pool = DAILY_CONTENT[dayNumber]?.comprehensionPool ?? [];
  if (pool.length === 0) return [];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
};
