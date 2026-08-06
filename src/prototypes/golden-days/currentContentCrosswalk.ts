import { DAILY_CONTENT } from "@/content/dailyContent";
import { PLAYER_DAYS } from "@/content/playerDays";

export type CrosswalkDecision = "behalten" | "verbinden" | "optional" | "neu formulieren" | "echte Redundanz";

export type SourceContentKind =
  | "lens"
  | "primary-mechanism"
  | "today-trigger"
  | "core-shift"
  | "science-bite"
  | "task"
  | "journal-question"
  | "gratitude"
  | "free-reflection"
  | "self-talk"
  | "context-variant"
  | "comprehension";

export type CurrentContentCrosswalkItem = {
  id: string;
  sourceDay: number;
  kind: SourceContentKind;
  sourceLabel: string;
  targetDays: readonly number[];
  decision: CrosswalkDecision;
  rationale: string;
};

export const OLD_DAY_TARGETS: Record<number, readonly number[]> = {
  1: [1, 36], 2: [4, 39, 51], 3: [26], 4: [6, 52], 5: [2], 6: [15], 7: [28, 56],
  8: [24, 55], 9: [26], 10: [13, 25, 54], 11: [10, 34, 53], 12: [2, 5],
  13: [8, 20, 39, 54], 14: [7, 14, 50], 15: [3], 16: [12, 53], 17: [24, 55],
  18: [16, 34, 40, 53], 19: [11, 52], 20: [4, 9, 17, 38, 51], 21: [5, 21, 55],
  22: [7, 50], 23: [22, 41, 52], 24: [18], 25: [13, 25, 54], 26: [40],
  27: [23, 27, 37, 40, 53], 28: [19, 38], 29: [55], 30: [14], 31: [9, 17, 31, 39, 51],
  32: [27, 37], 33: [20, 33], 34: [35, 41, 52], 35: [21, 27, 55], 36: [29, 36],
  37: [19, 32, 38, 52], 38: [34], 39: [55], 40: [23, 37, 40, 53], 41: [31, 45, 51],
  42: [28, 42, 56], 43: [18, 29, 43], 44: [30, 44, 55], 45: [49],
  46: [20, 33, 39, 47, 54], 47: [47, 54], 48: [32, 41, 46, 52], 49: [43],
  50: [50], 51: [35, 41, 52], 52: [12, 21, 53], 53: [48, 53], 54: [54],
  55: [30, 44, 55], 56: [56],
};

const entry = (
  sourceDay: number,
  kind: SourceContentKind,
  sourceId: string,
  sourceLabel: string,
  decision: CrosswalkDecision,
  rationale: string,
): CurrentContentCrosswalkItem => ({
  id: `old-d${sourceDay}-${kind}-${sourceId}`,
  sourceDay,
  kind,
  sourceLabel,
  targetDays: OLD_DAY_TARGETS[sourceDay],
  decision,
  rationale,
});

export const CURRENT_CONTENT_CROSSWALK: CurrentContentCrosswalkItem[] = PLAYER_DAYS.flatMap((day) => {
  const content = DAILY_CONTENT[day.day_id];
  const core = [
    entry(day.day_id, "lens", "lens", day.lens, "neu formulieren", "Der Kern bleibt, wird aber als eine klare Tagesbewegung statt als zusätzliche Linse formuliert."),
    entry(day.day_id, "primary-mechanism", "mechanism", day.primary_mechanism, "verbinden", "Der Mechanismus bleibt fachliche Quelle des zugeordneten Werkzeugs und wird nicht als eigener Anker gezeigt."),
    entry(day.day_id, "today-trigger", "trigger", day.today_trigger, "neu formulieren", "Der Trigger wird sportneutral und ohne behauptetes heutiges Ereignis in Mission oder Reflexion überführt."),
    entry(day.day_id, "core-shift", "shift", day.core_shift, "verbinden", "Die beabsichtigte Bewegung bleibt im zugeordneten Werkzeug- und Wiederholungszyklus erhalten."),
    entry(day.day_id, "science-bite", "science", day.science_bite, "neu formulieren", "Der fachliche Kern bleibt; Dopplung, Länge und Scheinpräzision werden reduziert."),
  ];

  const tasks = day.tasks.map((task) => entry(
    day.day_id,
    "task",
    task.id,
    task.title,
    "verbinden",
    "Die Aufgabe wird als notwendiger Schritt derselben Tagesmission oder als späterer Abruf verbunden; sie bleibt kein paralleler Pflichtblock.",
  ));

  const journal = day.journal.questions.map((question) => entry(
    day.day_id,
    "journal-question",
    question.id,
    question.question,
    "verbinden",
    "Die Frage bleibt Szenen- und Diagnosequelle; sichtbar werden je Tag höchstens drei auf die Lernstufe zugeschnittene Fragen.",
  ));

  const gratitude = [entry(
    day.day_id,
    "gratitude",
    "gratitude",
    day.journal.gratitude_instruction,
    "verbinden",
    "Die Einzelanweisung geht in einen gemeinsamen Dankbarkeitsblock ein und wird kein zweiter Tagesanker.",
  )];

  const freeReflection = day.journal.free_reflection_prompt
    ? [entry(
      day.day_id,
      "free-reflection",
      "free",
      day.journal.free_reflection_prompt,
      "optional",
      "Der freie Zusatz bleibt Quellenmaterial, ist aber keine weitere Pflichtfrage neben der gezielten Ankerreflexion.",
    )]
    : [];

  const selfTalk = day.self_talk_anchors.map((anchor, index) => entry(
    day.day_id,
    "self-talk",
    String(index + 1),
    anchor.text,
    "verbinden",
    "Die Formulierung wird dem stabilen Cue des Werkzeugs zugeordnet oder als doppelte Ankerformulierung nicht sichtbar wiederholt.",
  ));

  const contextVariants = (["training", "rest", "match"] as const).map((context) => entry(
    day.day_id,
    "context-variant",
    context,
    day.variants[context],
    "neu formulieren",
    "Der Kontext verändert nur die ehrliche Ausführungsform; Werkzeug, Cue und Programmtag bleiben deterministisch.",
  ));

  const comprehension = (content.comprehensionPool ?? []).map((question) => entry(
    day.day_id,
    "comprehension",
    question.id,
    question.stem,
    "verbinden",
    "Die geprüfte Fehlvorstellung bleibt Diagnosequelle; sichtbar wird genau eine kurze Unterscheidung pro Tag.",
  ));

  return [...core, ...tasks, ...journal, ...gratitude, ...freeReflection, ...selfTalk, ...contextVariants, ...comprehension];
});
