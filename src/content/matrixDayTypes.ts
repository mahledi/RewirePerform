/**
 * Matrix Day Types — Strukturelles Skelett des 56-Tage-Programms.
 *
 * Diese Typen definieren die strukturelle Rolle eines Tages.
 * Inhalte (Tasks, Journal, Science Bite) leben in src/content/dailyContent.ts.
 *
 * KI darf später nur Micro-Adjustments auf Content-Ebene machen,
 * niemals diese Skelett-Felder verändern.
 */

export type Phase = 1 | 2 | 3 | 4;

export type SystemFunction =
  | "Seed"
  | "Return"
  | "Deepen"
  | "Convert"
  | "Stress-Test"
  | "Transfer"
  | "Integrate";

export type KnowledgeLevel = "K1" | "K2" | "K3" | "K4";

export type RecurrenceType =
  | "Grundöffnung"
  | "Wochenintegration"
  | "frühe Rückkopplung"
  | "erste Vertiefung"
  | "erste Umcodierung"
  | "erste Belastung"
  | "Belastungsanwendung"
  | "Druckanwendung"
  | "soziale Reibung"
  | "soziale Übertragung"
  | "Belastungsvertiefung"
  | "fortgeschrittene Umcodierung"
  | "Leistungsübertragung"
  | "Leistungsanwendung"
  | "erste Leistungsübertragung"
  | "Druckintegration"
  | "Verkörperung"
  | "Identitätsintegration"
  | "Gesamtkonsolidierung";

export type CalendarEventType = "training" | "rest" | "competition";

/**
 * Strukturelle Definition eines Tages.
 * Wird NICHT von der KI verändert.
 */
export interface MatrixDay {
  dayNumber: number; // 1..56
  phase: Phase;
  week: number; // 1..8
  lens: string;
  primaryMechanism: string;
  secondaryAxes: string[];
  practiceFocus: string;
  knowledgeLevel: KnowledgeLevel;
  dayRole: string;
  systemFunction: SystemFunction;
  recurrenceType: RecurrenceType;
}

// ─────────── Content Layer ───────────

export interface SelfTalkAnchor {
  /** Kurzer, funktionaler Anker, kein Motivationsspruch */
  text: string;
  /** Wann anwenden, optional */
  when?: string;
}

export interface ReframeStep {
  /** "Wenn heute X passiert..." */
  trigger: string;
  /** "Dann erinnere dich: Y" */
  reframe: string;
  /** "Heute gilt: Z" */
  anchor: string;
}

export interface VisualizationCue {
  scene: string;
  durationSec: number;
}

export interface SportAdaptationHint {
  sport: string;
  position?: string;
  example: string;
}

export interface DailyTask {
  id: string;
  title: string;
  /** Warum diese Aufgabe an diesem Tag relevant ist */
  why: string;
  /** Detaillierte Erklärung des Mechanismus */
  detailedExplanation: string;
  /** Konkrete Handlung */
  concreteAction: string;
  /** Funktion im Tagessystem */
  systemFunction: string;
  /** Wann anwenden */
  whenToUse: string;
  /** Kurzer kognitiver Reframe für die Tasksituation */
  microReframe: string;
  /** Kurzer Self-Talk-Anker für die Aufgabe */
  selfTalk: string;
  /** Optional: nur wenn der Tag Visualisierung explizit vorsieht */
  visualizationCue?: VisualizationCue;
  /** Optional: sportartspezifische Beispiele */
  sportSpecificExamples?: SportAdaptationHint[];
  /** Reframing-Step-Through für Task-Detail-UI */
  reframeStep?: ReframeStep;
  /** Lucide-Icon-Name für UI */
  icon?: string;
  /** Wann der Task aktiv wird — kontextueller Auslöser (Player-Format) */
  trigger?: string;
}

export interface JournalQuestion {
  id: string;
  question: string;
  placeholder?: string;
}

export interface DailyJournal {
  journalTitle: string;
  questions: JournalQuestion[];
  gratitudeInstruction: string;
  freeReflectionPrompt?: string;
}

/**
 * Multiple-Choice-Verständnisfrage zum Tag.
 * Pool von 5-8 pro Tag, App wählt 3-5 zufällig aus.
 */
export interface ComprehensionOption {
  id: string; // "a" | "b" | "c" | "d"
  text: string;
}

export interface ComprehensionQuestion {
  id: string;
  /** Was die Frage prüft: lens | action | mistake | behavior */
  target: "lens" | "action" | "mistake" | "behavior";
  stem: string;
  options: ComprehensionOption[];
  correctOptionId: string;
  /** Kurzes Feedback nach Antwort */
  explanation: string;
}

export interface DailyContent {
  dayNumber: number;
  /** Verständlicher Athleten-Titel; die feste Matrix bleibt davon unberührt. */
  title?: string;
  /** Athletennahe Formulierung der Tageslinse. */
  lens?: string;
  scienceBite: {
    fact: string;
    source?: string;
    year?: number;
  };
  todayTrigger: string;
  coreShift: string;
  /** Genau 3 Tasks pro Tag */
  tasks: [DailyTask, DailyTask, DailyTask];
  journal: DailyJournal;
  gratitudePrompt: string;
  selfTalkAnchors: SelfTalkAnchor[];
  visualizationCue?: VisualizationCue;
  sportAdaptationHints?: SportAdaptationHint[];
  /** Pool von 5-8 MC-Fragen, beim Check werden 3-5 zufällig gezogen */
  comprehensionPool?: ComprehensionQuestion[];
  /** Kontextvarianten (Training / Rest / Match) — Kurzversionen pro Tag */
  variants?: {
    training: string;
    rest: string;
    match: string;
  };
}

export interface ResolvedDayContext {
  /** Sichtbarer Name der Kalenderart. */
  label: string;
  /** Tages- und mechanismusspezifische Anwendung im aktuellen Kalenderkontext. */
  focus: string;
  checkin: {
    pulseTitle: string;
    pulseDescription: string;
    reflectionTitle: string;
    reflectionDescription: string;
    journalReminder: string;
    taskIntro: string;
    completionMessage: string;
  };
  journal: {
    intro: string;
  };
}

/**
 * Resolved Day = Skelett + Content + (optional) Micro-Adjustment
 * Wird zur Laufzeit vom Resolver gebaut.
 */
export interface ResolvedDay {
  matrix: MatrixDay;
  content: DailyContent;
  calendarEventType: CalendarEventType;
  context: ResolvedDayContext;
  /** Datum dieses Programmtags im realen Kalender */
  date: string; // yyyy-MM-dd
}
