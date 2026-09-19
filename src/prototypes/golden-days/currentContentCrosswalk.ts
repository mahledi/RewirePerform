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

export type SemanticCoverageStatus = "direkt" | "verteilt" | "gezielt-verstärkt";

export type SourceDaySemanticAudit = {
  status: SemanticCoverageStatus;
  note: string;
};

export const OLD_DAY_TARGETS: Record<number, readonly number[]> = {
  1: [1, 36], 2: [4, 39, 51], 3: [26], 4: [6, 52], 5: [2], 6: [15], 7: [28, 56],
  8: [24, 55], 9: [26], 10: [13, 25, 54], 11: [10, 34, 53], 12: [2, 5],
  13: [8, 20, 39, 54], 14: [7, 14, 50], 15: [3], 16: [12, 53], 17: [24, 55],
  18: [16, 34, 40, 53], 19: [11, 52], 20: [4, 9, 17, 38, 51], 21: [5, 21, 55],
  22: [7, 50], 23: [22, 41, 52], 24: [18], 25: [13, 25, 54], 26: [40],
  27: [23, 27, 37, 40, 53], 28: [19, 38], 29: [55], 30: [14], 31: [9, 17, 31, 39, 51],
  32: [27, 37], 33: [20, 33], 34: [35, 41, 52], 35: [21, 27, 55], 36: [29, 36],
  37: [19, 32, 38, 52], 38: [23, 27, 34, 40], 39: [50, 55], 40: [23, 37, 40, 53], 41: [31, 45, 51],
  42: [28, 42, 56], 43: [18, 29, 43], 44: [30, 44, 55], 45: [49],
  46: [20, 33, 39, 47, 54], 47: [44, 54], 48: [32, 41, 46, 52], 49: [43, 55],
  50: [50], 51: [35, 41, 52], 52: [12, 21, 53], 53: [48, 53], 54: [54],
  55: [30, 44, 55], 56: [56],
};

export const SOURCE_DAY_SEMANTIC_AUDIT: Record<number, SourceDaySemanticAudit> = {
  1: { status: "direkt", note: "Wegdriften erkennen und zur nächsten Aktion zurückkehren bleibt in W1 erhalten." },
  2: { status: "direkt", note: "Fehlergedanke und brauchbare Information werden in W3 und W5 getrennt." },
  3: { status: "direkt", note: "Die erste schnelle Einschätzung einer unsicheren Situation wird an Tag 26 geprüft." },
  4: { status: "verteilt", note: "Realität, Einfluss und das Beenden der zweiten inneren Schleife liegen in W4-Kontakten." },
  5: { status: "direkt", note: "Selbstbild und benötigte Aufgabenqualität werden mit W2 getrennt." },
  6: { status: "direkt", note: "Der eng gewordene Blick wird mit W7 um weitere reale Informationen ergänzt." },
  7: { status: "verteilt", note: "Eigene Muster und passende Werkzeugwahl werden an den Integrationstagen geordnet." },
  8: { status: "direkt", note: "Konkretes Verhalten wird an Tag 24 und 55 als wiederholbare Richtung festgehalten." },
  9: { status: "direkt", note: "Bedrohliche Erstlesart und weitere reale Informationen bleiben in W6 erhalten." },
  10: { status: "verteilt", note: "Handeln ohne innere Erlaubnis kehrt in W5 und der späteren Bestätigungsarbeit zurück." },
  11: { status: "direkt", note: "Sichere und passende Herausforderung statt pauschaler Vermeidung bleibt W6-Kern." },
  12: { status: "direkt", note: "Qualität nach Aufgabe statt Außenwirkung bleibt W2-Kern." },
  13: { status: "direkt", note: "Gedanken und Gefühle werden als innere Ereignisse statt Befehle behandelt." },
  14: { status: "direkt", note: "Ergebnis wahrnehmen und Aufmerksamkeit zur aktuellen Handlung zurückholen bleibt erhalten." },
  15: { status: "direkt", note: "Aufmerksamkeitsdrift und konkreter Rückweg werden über W1 wiederholt." },
  16: { status: "verteilt", note: "Purpose bleibt freiwillig und privat und unterstützt Aufgabe und Lernwert an Tag 12 und 53." },
  17: { status: "direkt", note: "Handlungen zeigen eine Richtung, ohne eine fertige Identität zu beweisen." },
  18: { status: "direkt", note: "Gewählte Schwierigkeit wird sicher, angemessen und lernbezogen geprüft." },
  19: { status: "direkt", note: "Unveränderbares anerkennen und verbleibenden Einfluss nutzen bleibt W4-Kern." },
  20: { status: "direkt", note: "Fehler, Urteil, Information und nächste Handlung werden mehrfach getrennt." },
  21: { status: "direkt", note: "Beitrag wird sportartenneutral als konkrete Qualität für Team- und Einzelsport erhalten." },
  22: { status: "direkt", note: "Prozessfokus bleibt als Rückkehr zur aktuellen Aufgabe und Qualität erhalten." },
  23: { status: "direkt", note: "Problem, Funktionierendes, Hilfe und Möglichkeiten werden gemeinsam wahrgenommen." },
  24: { status: "direkt", note: "Sichere und sinnvolle Handlung bleibt auch ohne ideale Stimmung möglich." },
  25: { status: "direkt", note: "Zweifel wird bemerkt, aber die geprüfte Aufgabe bestimmt die Handlung." },
  26: { status: "verteilt", note: "Der starke Gegenpart wird sportneutral zu einer nach Nutzen geprüften Herausforderung." },
  27: { status: "direkt", note: "Eine unsichere Handlung wird nach Sicherheit, Aufgabe und Lernwert gewählt." },
  28: { status: "direkt", note: "Protest gegen Unveränderbares wird von der nutzbaren Korrektur getrennt." },
  29: { status: "verteilt", note: "Persönlicher Standard wird über konkrete Qualität und wiederholbares Verhalten getragen." },
  30: { status: "direkt", note: "Ergebnis bleibt relevant, während die Aufmerksamkeit zur nächsten Handlung zurückkehrt." },
  31: { status: "direkt", note: "Fehler und persönliches Urteil werden in mehreren W3-Kontakten getrennt." },
  32: { status: "verteilt", note: "Lernen trotz Sichtbarkeit oder Bewertung wird über W2- und W6-Verbindungen erhalten." },
  33: { status: "direkt", note: "Schneller Impuls, Entscheidungspunkt und alternative Handlung bleiben W5-Vertiefung." },
  34: { status: "gezielt-verstärkt", note: "Aufgestapelte Belastung und Wiederherstellung von Überblick wurden an Tag 41 wieder explizit gemacht." },
  35: { status: "direkt", note: "Sichtbare Verantwortung wird als konkreter Beitrag und Standard weitergeführt." },
  36: { status: "gezielt-verstärkt", note: "Viele gleichzeitige Reize und eine klare Priorität wurden an Tag 36 wieder explizit gemacht." },
  37: { status: "direkt", note: "Die zweite innere Welle nach Reibung wird über Fakt, Protest und Einfluss getrennt." },
  38: { status: "verteilt", note: "Schutzverhalten wird über Aufgabenqualität, angemessenen Versuch und Vorwärtshandlung bearbeitet." },
  39: { status: "gezielt-verstärkt", note: "Gutes und schlechtes Momentum wurde an Tag 50 wieder als eigener Abrufkontext aufgenommen." },
  40: { status: "direkt", note: "Unter Ergebnisrelevanz bleiben passende Schwierigkeit, Aufgabe und Lernen gemeinsam prüfbar." },
  41: { status: "direkt", note: "Unperfekte Ausführung wird von Urteil über die eigene Person getrennt." },
  42: { status: "verteilt", note: "Was unter Belastung hält oder kippt, wird vorsichtig über Integration und Werkzeugwahl reflektiert." },
  43: { status: "direkt", note: "Die Rückkehr wird kürzer, selbstständiger und weniger dramatisch." },
  44: { status: "direkt", note: "Hohe sichtbare Qualität bleibt ohne Show und Selbstbeweis möglich." },
  45: { status: "direkt", note: "Der Blicköffner wird auch ohne besonderen positiven Anlass abgerufen." },
  46: { status: "verteilt", note: "Innere und äußere Urteile werden bemerkt, ohne automatisch die Handlung zu führen." },
  47: { status: "gezielt-verstärkt", note: "Ruhige Sicherheit ohne Show oder neuen Beweis wurde an Tag 44 und 54 wieder explizit gemacht." },
  48: { status: "direkt", note: "Akzeptanz spart Gegenspannung und führt zurück zu einer möglichen Handlung." },
  49: { status: "verteilt", note: "Präsenz wird über selbstständigen Abruf und einen konkreten zukünftigen Standard verbunden." },
  50: { status: "direkt", note: "Prozess bleibt der Arbeitsfokus trotz Ergebnis, Bewertung und Verlauf." },
  51: { status: "direkt", note: "Spannung wird von realer Gefahr getrennt und der Blick bleibt weiter." },
  52: { status: "direkt", note: "Aufgabe, Beitrag und freiwilliger Purpose ersetzen keinen persönlichen Schutztest." },
  53: { status: "direkt", note: "Schwierigkeit wird als prüfbare Information und mögliche Lernchance genutzt." },
  54: { status: "gezielt-verstärkt", note: "Handeln ohne frische äußere Bestätigung wurde an Tag 54 wieder explizit aufgenommen." },
  55: { status: "direkt", note: "Hohe Qualität wird von Show, Bildschutz und Selbstbeweis getrennt." },
  56: { status: "direkt", note: "Der Abschluss ordnet alle Werkzeuge und plant ihre konkrete weitere Nutzung." },
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
