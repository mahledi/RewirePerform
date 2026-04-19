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

  // ─────────── TAG 2 — Der Fehler ist nicht das Problem ───────────
  2: [
    {
      id: "d2-q1",
      target: "lens",
      stem: "Worum geht es heute im Kern?",
      options: [
        { id: "a", text: "Fehler vermeiden, wo es nur geht" },
        { id: "b", text: "Den ersten inneren Satz nach einem Fehler bemerken" },
        { id: "c", text: "Sich nach Fehlern härter pushen" },
        { id: "d", text: "Fehler dem Trainer erklären können" },
      ],
      correctOptionId: "b",
      explanation: "Linse heute: Nicht der Fehler ist das Problem, sondern was du dir innerlich danach sagst.",
    },
    {
      id: "d2-q2",
      target: "action",
      stem: "Was ist die zentrale Praxis heute?",
      options: [
        { id: "a", text: "Innere Sätze nach Fehlern erkennen" },
        { id: "b", text: "Fehler statistisch zählen" },
        { id: "c", text: "Atmung nach Fehlern regulieren" },
        { id: "d", text: "Fehler sofort wiedergutmachen" },
      ],
      correctOptionId: "a",
      explanation: "Praxisfokus: den ersten automatischen Satz nach einem Fehler sichtbar machen.",
    },
    {
      id: "d2-q3",
      target: "mistake",
      stem: "Was wäre heute ein Missverständnis der Aufgabe?",
      options: [
        { id: "a", text: "Den inneren Satz nach einem Fehler ruhig benennen" },
        { id: "b", text: "Sich für den inneren Satz selbst verurteilen" },
        { id: "c", text: "Den Fehler stehen lassen und weitermachen" },
        { id: "d", text: "Bemerken, dass ein Satz aufgetaucht ist" },
      ],
      correctOptionId: "b",
      explanation: "Es geht nicht um neue Selbstkritik. Bemerken reicht.",
    },
    {
      id: "d2-q4",
      target: "behavior",
      stem: "Du machst im Training einen klaren Fehler. Was ist heute die richtige Reaktion?",
      options: [
        { id: "a", text: "Innerlich sagen: 'Typisch, ich kann das nicht'" },
        { id: "b", text: "Bemerken, welcher Satz auftaucht, und zur nächsten Aktion gehen" },
        { id: "c", text: "Den Fehler sofort vergessen wollen" },
        { id: "d", text: "Den Fehler analysieren, bis du ihn verstehst" },
      ],
      correctOptionId: "b",
      explanation: "Heute: inneren Satz sehen, Fehler als Ereignis lassen, nächste Aktion.",
    },
    {
      id: "d2-q5",
      target: "lens",
      stem: "Warum ist der innere Satz nach dem Fehler wichtiger als der Fehler selbst?",
      options: [
        { id: "a", text: "Weil er die nächste Aktion mitsteuert" },
        { id: "b", text: "Weil er den Fehler ungeschehen macht" },
        { id: "c", text: "Weil Trainer nur darauf achten" },
        { id: "d", text: "Weil er Punkte zurückbringt" },
      ],
      correctOptionId: "a",
      explanation: "Der Fehler ist vorbei. Was du dir danach sagst, formt deine nächsten Sekunden.",
    },
  ],

  // ─────────── TAG 3 — Was du bewertest, steuert dich ───────────
  3: [
    {
      id: "d3-q1",
      target: "lens",
      stem: "Worum geht es heute im Kern?",
      options: [
        { id: "a", text: "Situationen objektiv beschreiben" },
        { id: "b", text: "Erkennen, wie die Bewertung einer Situation deinen Zustand steuert" },
        { id: "c", text: "Belastende Situationen vermeiden" },
        { id: "d", text: "Anderen die Lage erklären können" },
      ],
      correctOptionId: "b",
      explanation: "Linse: Nicht die Situation selbst macht den Zustand — sondern deine Bewertung davon.",
    },
    {
      id: "d3-q2",
      target: "action",
      stem: "Was ist heute die zentrale Praxis?",
      options: [
        { id: "a", text: "Bedeutung erkennen, die du einer belastenden Situation gibst" },
        { id: "b", text: "Belastende Situationen meiden" },
        { id: "c", text: "Belastung sofort herunteratmen" },
        { id: "d", text: "Bewertung an andere abgeben" },
      ],
      correctOptionId: "a",
      explanation: "Erkennen, welche Bedeutung du der Situation gibst — das ist heute der Hebel.",
    },
    {
      id: "d3-q3",
      target: "mistake",
      stem: "Was wäre heute ein Missverständnis der Aufgabe?",
      options: [
        { id: "a", text: "Die eigene Bewertung neutral benennen" },
        { id: "b", text: "Sich einreden, dass alles harmlos ist" },
        { id: "c", text: "Bemerken, wie Bewertung Anspannung erzeugt" },
        { id: "d", text: "Eine zweite mögliche Lesart prüfen" },
      ],
      correctOptionId: "b",
      explanation: "Es geht nicht um positives Umlügen. Es geht um echtes Erkennen der inneren Lesart.",
    },
    {
      id: "d3-q4",
      target: "behavior",
      stem: "Eine wichtige Übung steht an und du fühlst Druck. Was tust du heute zuerst?",
      options: [
        { id: "a", text: "Den Druck wegdrücken" },
        { id: "b", text: "Bemerken, was du dir über die Situation sagst" },
        { id: "c", text: "Mehr Anstrengung aufbringen" },
        { id: "d", text: "Dich ablenken, bis es losgeht" },
      ],
      correctOptionId: "b",
      explanation: "Erst die Bewertung sehen, dann handeln. Druck ist oft Folge der Lesart.",
    },
  ],

  // ─────────── TAG 4 — Kontrolle beginnt mit Loslassen ───────────
  4: [
    {
      id: "d4-q1",
      target: "lens",
      stem: "Worum geht es heute im Kern?",
      options: [
        { id: "a", text: "Möglichst viel kontrollieren" },
        { id: "b", text: "Energieverluste an Unsteuerbares erkennen" },
        { id: "c", text: "Andere besser steuern" },
        { id: "d", text: "Sich selbst stärker disziplinieren" },
      ],
      correctOptionId: "b",
      explanation: "Linse: Echte Kontrolle entsteht, wenn du aufhörst, Energie ins Unsteuerbare zu stecken.",
    },
    {
      id: "d4-q2",
      target: "action",
      stem: "Was ist heute die zentrale Praxis?",
      options: [
        { id: "a", text: "Bemerken, wo du Energie an Dinge verlierst, die du nicht steuern kannst" },
        { id: "b", text: "Mehr Aufgaben übernehmen" },
        { id: "c", text: "Verantwortung abgeben" },
        { id: "d", text: "Pläne perfektionieren" },
      ],
      correctOptionId: "a",
      explanation: "Wahrnehmen, wohin Energie verloren geht. Das ist heute der einzige Schritt.",
    },
    {
      id: "d4-q3",
      target: "mistake",
      stem: "Was wäre heute ein Missverständnis der Aufgabe?",
      options: [
        { id: "a", text: "Loslassen mit Aufgeben verwechseln" },
        { id: "b", text: "Energie zurückziehen vom Unsteuerbaren" },
        { id: "c", text: "Sich auf das eigene Verhalten konzentrieren" },
        { id: "d", text: "Unsteuerbares ruhig benennen" },
      ],
      correctOptionId: "a",
      explanation: "Loslassen ≠ Aufgeben. Es heißt, Energie nur dort zu investieren, wo sie etwas bewirkt.",
    },
    {
      id: "d4-q4",
      target: "behavior",
      stem: "Der Schiri trifft eine schlechte Entscheidung gegen dich. Was ist heute die saubere Reaktion?",
      options: [
        { id: "a", text: "Lange darüber diskutieren" },
        { id: "b", text: "Innerlich loslassen und beim nächsten Ball voll da sein" },
        { id: "c", text: "Dich gekränkt zurückziehen" },
        { id: "d", text: "Den Schiri provozieren" },
      ],
      correctOptionId: "b",
      explanation: "Die Entscheidung ist nicht steuerbar. Deine nächste Aktion schon.",
    },
  ],

  // ─────────── TAG 5 — Ego erkennen ───────────
  5: [
    {
      id: "d5-q1",
      target: "lens",
      stem: "Worum geht es heute im Kern?",
      options: [
        { id: "a", text: "Selbstvertrauen aufbauen" },
        { id: "b", text: "Selbstbezogenheit im Training erkennen" },
        { id: "c", text: "Mehr Selbstdarstellung zeigen" },
        { id: "d", text: "Andere beeindrucken" },
      ],
      correctOptionId: "b",
      explanation: "Linse: Ego sichtbar machen — wo dreht sich Verhalten heimlich um dein Bild?",
    },
    {
      id: "d5-q2",
      target: "action",
      stem: "Was ist heute die zentrale Praxis?",
      options: [
        { id: "a", text: "Momente bemerken, in denen es dir um dein Bild geht statt um die Aufgabe" },
        { id: "b", text: "Möglichst bescheiden auftreten" },
        { id: "c", text: "Lob ablehnen" },
        { id: "d", text: "Sich klein machen" },
      ],
      correctOptionId: "a",
      explanation: "Ego erkennen heißt: bemerken, wann das eigene Bild den Fokus übernimmt.",
    },
    {
      id: "d5-q3",
      target: "mistake",
      stem: "Was wäre heute ein Missverständnis der Aufgabe?",
      options: [
        { id: "a", text: "Sich für jedes Ego-Signal verurteilen" },
        { id: "b", text: "Ego-Momente neutral wahrnehmen" },
        { id: "c", text: "Bemerken, wann du auf Wirkung spielst" },
        { id: "d", text: "Aufgabe statt Bild priorisieren" },
      ],
      correctOptionId: "a",
      explanation: "Ego ist normal. Heute reicht: sehen — nicht bekämpfen, nicht verurteilen.",
    },
    {
      id: "d5-q4",
      target: "behavior",
      stem: "Du spürst, dass du eine Aktion gewählt hast, um gut auszusehen, statt der Aufgabe zu dienen. Was tust du?",
      options: [
        { id: "a", text: "Es leugnen" },
        { id: "b", text: "Innerlich notieren und bei der nächsten Aktion auf die Aufgabe orientieren" },
        { id: "c", text: "Dich stark abwerten" },
        { id: "d", text: "So weitermachen, weil es funktioniert" },
      ],
      correctOptionId: "b",
      explanation: "Bemerken + Orientierung zurück zur Aufgabe. Mehr ist heute nicht das Ziel.",
    },
  ],

  // ─────────── TAG 6 — Dankbarkeit erweitert Wahrnehmung ───────────
  6: [
    {
      id: "d6-q1",
      target: "lens",
      stem: "Worum geht es heute im Kern?",
      options: [
        { id: "a", text: "Sich besser fühlen" },
        { id: "b", text: "Aufmerksamkeit von Mangel auf Vorhandenes erweitern" },
        { id: "c", text: "Mehr loben" },
        { id: "d", text: "Optimistischer denken" },
      ],
      correctOptionId: "b",
      explanation: "Linse: Dankbarkeit verändert, was du überhaupt wahrnimmst — nicht nur die Stimmung.",
    },
    {
      id: "d6-q2",
      target: "action",
      stem: "Was ist heute die zentrale Praxis?",
      options: [
        { id: "a", text: "Konkretes Vorhandenes wahrnehmen, nicht abstrakte Sprüche" },
        { id: "b", text: "Sich einreden, dass alles gut ist" },
        { id: "c", text: "Beschwerden vermeiden" },
        { id: "d", text: "Andere mit Lob überschütten" },
      ],
      correctOptionId: "a",
      explanation: "Konkret und spezifisch. Sonst bleibt es leere Floskel ohne Wirkung auf Wahrnehmung.",
    },
    {
      id: "d6-q3",
      target: "mistake",
      stem: "Was wäre heute ein Missverständnis der Aufgabe?",
      options: [
        { id: "a", text: "Dankbarkeit als Pflicht-Liste abarbeiten" },
        { id: "b", text: "Spezifisches benennen, das heute da war" },
        { id: "c", text: "Wahrnehmung weiten" },
        { id: "d", text: "Konkrete Momente erinnern" },
      ],
      correctOptionId: "a",
      explanation: "Pflicht-Modus zerstört die Wirkung. Es geht um echtes Sehen, nicht um Aufgabenerfüllung.",
    },
    {
      id: "d6-q4",
      target: "behavior",
      stem: "Das Training war hart und frustrierend. Wie wendest du heute die Linse an?",
      options: [
        { id: "a", text: "Du redest dir ein, dass alles super war" },
        { id: "b", text: "Du benennst eine konkrete Sache, die trotzdem da war (Mitspieler, Moment, Bedingung)" },
        { id: "c", text: "Du verdrängst die Frustration" },
        { id: "d", text: "Du zählst alle Probleme auf" },
      ],
      correctOptionId: "b",
      explanation: "Wahrnehmung weiten heißt nicht, das Schwere wegmachen — sondern das Vorhandene danebenstellen.",
    },
  ],

  // ─────────── TAG 7 — Die Woche in dir lesen (Integration) ───────────
  7: [
    {
      id: "d7-q1",
      target: "lens",
      stem: "Worum geht es am Wocheninte­grationstag?",
      options: [
        { id: "a", text: "Die Woche bewerten und benoten" },
        { id: "b", text: "Muster der Woche in dir erkennen" },
        { id: "c", text: "Möglichst viele Aufgaben nachholen" },
        { id: "d", text: "Neue Ziele für die nächste Woche setzen" },
      ],
      correctOptionId: "b",
      explanation: "Tag 7 dient der Konsolidierung — Muster sichtbar machen, nicht bewerten oder neu planen.",
    },
    {
      id: "d7-q2",
      target: "action",
      stem: "Was ist heute die zentrale Praxis?",
      options: [
        { id: "a", text: "Auf wiederkehrende innere Reaktionen der Woche schauen" },
        { id: "b", text: "Ergebnisse der Woche zählen" },
        { id: "c", text: "Andere um Feedback bitten" },
        { id: "d", text: "Sich für die Woche belohnen" },
      ],
      correctOptionId: "a",
      explanation: "Wiederkehrende innere Reaktionen erkennen — das ist die Konsolidierungsarbeit.",
    },
    {
      id: "d7-q3",
      target: "mistake",
      stem: "Was wäre heute ein Missverständnis?",
      options: [
        { id: "a", text: "Die Woche nutzen, um sich abzuwerten" },
        { id: "b", text: "Muster ruhig benennen" },
        { id: "c", text: "Erkennen ohne Urteil" },
        { id: "d", text: "Eine Linse für die nächste Woche mitnehmen" },
      ],
      correctOptionId: "a",
      explanation: "Integration ist kein Selbstgericht. Sehen reicht.",
    },
    {
      id: "d7-q4",
      target: "behavior",
      stem: "Wie sieht ein erfolgreicher Tag 7 aus?",
      options: [
        { id: "a", text: "Du hast alle Tage perfekt umgesetzt" },
        { id: "b", text: "Du erkennst 1–2 wiederkehrende Muster und nimmst sie ruhig in die nächste Woche mit" },
        { id: "c", text: "Du planst die nächste Woche durch" },
        { id: "d", text: "Du setzt dir härtere Ziele" },
      ],
      correctOptionId: "b",
      explanation: "Erfolg an Tag 7 = klare Sicht auf eigene Muster, nicht Perfektion.",
    },
  ],

  // ─────────── TAG 8 — Wer willst du im Training sein? ───────────
  8: [
    {
      id: "d8-q1",
      target: "lens",
      stem: "Worum geht es heute im Kern?",
      options: [
        { id: "a", text: "Einen Spielertyp imitieren" },
        { id: "b", text: "Die gewünschte Version von dir vor dem Training klar definieren" },
        { id: "c", text: "Möglichst diszipliniert sein" },
        { id: "d", text: "Vorbilder im Sport finden" },
      ],
      correctOptionId: "b",
      explanation: "Linse: Identität wird über bewusst gewählte Verhaltensbeschreibung kodiert — nicht über Imitation.",
    },
    {
      id: "d8-q2",
      target: "action",
      stem: "Was ist heute die zentrale Praxis?",
      options: [
        { id: "a", text: "Vor dem Training kurz benennen, wie du heute auftreten willst" },
        { id: "b", text: "Sich Druck machen, der Beste zu sein" },
        { id: "c", text: "Sich mit Mitspielern vergleichen" },
        { id: "d", text: "Möglichst viel reden im Training" },
      ],
      correctOptionId: "a",
      explanation: "Vor dem Training: 1 Satz, wer du heute sein willst. Danach: Verhalten daran ausrichten.",
    },
    {
      id: "d8-q3",
      target: "mistake",
      stem: "Was wäre heute ein Missverständnis?",
      options: [
        { id: "a", text: "Die gewünschte Version als Leistungsziel formulieren" },
        { id: "b", text: "Sie als Verhaltensbeschreibung formulieren" },
        { id: "c", text: "Sich an ihr im Training orientieren" },
        { id: "d", text: "Sie kurz und konkret halten" },
      ],
      correctOptionId: "a",
      explanation: "Heute geht es um Verhalten, nicht um Leistung. 'Voll präsent' statt 'bester Spieler'.",
    },
    {
      id: "d8-q4",
      target: "behavior",
      stem: "Du gehst ins Training. Wie wendest du heute die Linse an?",
      options: [
        { id: "a", text: "Du legst innerlich fest, wie du dich heute verhalten willst (z. B. mutig, präsent, klar)" },
        { id: "b", text: "Du wartest, wie du dich fühlst" },
        { id: "c", text: "Du schaust, was die anderen machen" },
        { id: "d", text: "Du orientierst dich am Trainer" },
      ],
      correctOptionId: "a",
      explanation: "Identität wird vor dem Training gesetzt, nicht nach Stimmung entschieden.",
    },
  ],

  // ─────────── TAG 9 — Angst ist oft Bewertung ───────────
  9: [
    {
      id: "d9-q1",
      target: "lens",
      stem: "Worum geht es heute im Kern?",
      options: [
        { id: "a", text: "Angst vermeiden" },
        { id: "b", text: "Druck als innere Lesart der Situation erkennen" },
        { id: "c", text: "Mutiger werden als gestern" },
        { id: "d", text: "Über Angst nicht sprechen" },
      ],
      correctOptionId: "b",
      explanation: "Linse: Was du Angst nennst, ist oft eine Bewertung der Situation als bedrohlich.",
    },
    {
      id: "d9-q2",
      target: "action",
      stem: "Was ist heute die zentrale Praxis?",
      options: [
        { id: "a", text: "Bemerken, welche Bedeutung du Druck-Situationen gibst" },
        { id: "b", text: "Druck-Situationen meiden" },
        { id: "c", text: "Sich härter pushen" },
        { id: "d", text: "Atmung trainieren" },
      ],
      correctOptionId: "a",
      explanation: "Heute: Angst als Bewertung sichtbar machen, nicht bekämpfen.",
    },
    {
      id: "d9-q3",
      target: "mistake",
      stem: "Was wäre heute ein Missverständnis?",
      options: [
        { id: "a", text: "Angst als Schwäche verurteilen" },
        { id: "b", text: "Die Bewertung dahinter sehen" },
        { id: "c", text: "Angst als Information lesen" },
        { id: "d", text: "Bemerken, dass die Lage gedeutet wird" },
      ],
      correctOptionId: "a",
      explanation: "Angst ist Information, kein Charakterfehler. Sehen, nicht abwerten.",
    },
    {
      id: "d9-q4",
      target: "behavior",
      stem: "Vor einem entscheidenden Moment wird dir eng. Was tust du heute zuerst?",
      options: [
        { id: "a", text: "Du verdrängst das Gefühl" },
        { id: "b", text: "Du fragst dich: Was sage ich mir gerade über diese Situation?" },
        { id: "c", text: "Du redest dich mit Selbstvertrauen voll" },
        { id: "d", text: "Du suchst Ablenkung" },
      ],
      correctOptionId: "b",
      explanation: "Erst die Bewertung sichtbar machen. Sie ist meist die Quelle der Enge.",
    },
  ],

  // ─────────── TAG 10 — Confidence ist keine Stimmung ───────────
  10: [
    {
      id: "d10-q1",
      target: "lens",
      stem: "Worum geht es heute im Kern?",
      options: [
        { id: "a", text: "Sich vor dem Training in gute Stimmung versetzen" },
        { id: "b", text: "Confidence als handlungsgebunden statt gefühlsgebunden verstehen" },
        { id: "c", text: "Mehr Erfolge sammeln" },
        { id: "d", text: "Sich öfter loben" },
      ],
      correctOptionId: "b",
      explanation: "Linse: Confidence ist kein Gefühl, das du abwarten musst — sondern an Verhalten gekoppelt.",
    },
    {
      id: "d10-q2",
      target: "action",
      stem: "Was ist heute die zentrale Praxis?",
      options: [
        { id: "a", text: "Handeln, auch wenn das Confidence-Gefühl noch nicht da ist" },
        { id: "b", text: "Auf die richtige Stimmung warten" },
        { id: "c", text: "Erfolge zählen" },
        { id: "d", text: "Sich Mut zureden, bis es klappt" },
      ],
      correctOptionId: "a",
      explanation: "Verhalten kommt zuerst. Confidence folgt der Handlung, nicht umgekehrt.",
    },
    {
      id: "d10-q3",
      target: "mistake",
      stem: "Was wäre heute ein Missverständnis?",
      options: [
        { id: "a", text: "Glauben, du brauchst erst das Gefühl, bevor du handeln darfst" },
        { id: "b", text: "Handeln, ohne dich vorher gut zu fühlen" },
        { id: "c", text: "Confidence aus dem eigenen Verhalten ableiten" },
        { id: "d", text: "Sehen, dass Stimmung schwankt" },
      ],
      correctOptionId: "a",
      explanation: "Auf das Gefühl warten ist die Falle. Heute: handeln zuerst.",
    },
    {
      id: "d10-q4",
      target: "behavior",
      stem: "Du fühlst dich vor dem Training unsicher. Was ist heute die richtige Reaktion?",
      options: [
        { id: "a", text: "Du gehst trotzdem in die Aktion und richtest dich am Verhalten aus, nicht am Gefühl" },
        { id: "b", text: "Du wartest, bis das Gefühl besser wird" },
        { id: "c", text: "Du machst weniger" },
        { id: "d", text: "Du erklärst allen, dass du unsicher bist" },
      ],
      correctOptionId: "a",
      explanation: "Verhalten zuerst. Stimmung folgt der Handlung, nicht andersherum.",
    },
  ],
  11: [
    {
      id: "d11-q1", target: "lens",
      stem: "Warum ist Unsicherheit heute notwendig, nicht hinderlich?",
      options: [
        { id: "a", text: "Weil Lernen einen Vorhersagefehler braucht – ohne Unsicherheit keine neue Information" },
        { id: "b", text: "Weil Unsicherheit zeigt, dass man mental schwach ist" },
        { id: "c", text: "Weil sie Selbstvertrauen kurzfristig erhöht" },
        { id: "d", text: "Weil sie Wettkämpfe spannender macht" },
      ],
      correctOptionId: "a",
      explanation: "Prediction Error ist die Grundlage von Lernen. Ohne Unsicherheit gibt es keine neue Information für das Gehirn.",
    },
    {
      id: "d11-q2", target: "action",
      stem: "Was tust du heute konkret im Training?",
      options: [
        { id: "a", text: "Du wählst bewusst eine Übung oder Variante, in der du nicht sicher bist" },
        { id: "b", text: "Du wiederholst, was du am besten kannst, um Selbstvertrauen aufzubauen" },
        { id: "c", text: "Du beobachtest andere und vergleichst dich" },
        { id: "d", text: "Du fragst den Coach, was du machen sollst" },
      ],
      correctOptionId: "a",
      explanation: "Growth-Linie eröffnen heißt: aktiv etwas Neues oder Unsicheres wählen, nicht im Sicheren bleiben.",
    },
    {
      id: "d11-q3", target: "mistake",
      stem: "Was wäre heute der typische Fehler?",
      options: [
        { id: "a", text: "Unsicherheit als Zeichen werten, dass du etwas nicht kannst, und ausweichen" },
        { id: "b", text: "Eine neue Übung versuchen und scheitern" },
        { id: "c", text: "Den Coach um Feedback bitten" },
        { id: "d", text: "Langsam an eine neue Bewegung herangehen" },
      ],
      correctOptionId: "a",
      explanation: "Der Fehler ist die Vermeidung, nicht das Scheitern. Unsicherheit ist Lernsignal, nicht Stoppsignal.",
    },
  ],
  12: [
    {
      id: "d12-q1", target: "lens",
      stem: "Was unterscheidet Exzellenz von Selbstdarstellung?",
      options: [
        { id: "a", text: "Exzellenz richtet die Aufmerksamkeit auf die Qualität, Selbstdarstellung auf die Wirkung" },
        { id: "b", text: "Exzellenz ist immer sichtbar, Selbstdarstellung nicht" },
        { id: "c", text: "Exzellenz braucht Publikum, Selbstdarstellung nicht" },
        { id: "d", text: "Es ist im Grunde dasselbe" },
      ],
      correctOptionId: "a",
      explanation: "Inner Excellence = Aufmerksamkeit auf das Was und Wie. Ego = Aufmerksamkeit auf das Wie es ankommt.",
    },
    {
      id: "d12-q2", target: "behavior",
      stem: "Wie zeigt sich Qualität-vor-Wirkung in deinem Verhalten heute?",
      options: [
        { id: "a", text: "Du machst die unauffällige, saubere Aktion statt der spektakulären" },
        { id: "b", text: "Du suchst die Aktion mit dem höchsten Highlight-Potenzial" },
        { id: "c", text: "Du machst nur, was sicher gelingt" },
        { id: "d", text: "Du erklärst dem Team, was du vorhast" },
      ],
      correctOptionId: "a",
      explanation: "Qualität über Wirkung heißt: die richtige Aktion machen, auch wenn niemand sie bemerkt.",
    },
    {
      id: "d12-q3", target: "mistake",
      stem: "Woran erkennst du, dass du wieder im Ego-Modus bist?",
      options: [
        { id: "a", text: "Du fragst dich währenddessen, wie du gerade aussiehst" },
        { id: "b", text: "Du konzentrierst dich vollständig auf die Aufgabe" },
        { id: "c", text: "Du machst einen Fehler" },
        { id: "d", text: "Du sprichst mit dem Coach" },
      ],
      correctOptionId: "a",
      explanation: "Selbstbeobachtung im Vollzug = Wirkung-Modus. Aufgabenfokus = Qualitäts-Modus.",
    },
  ],
  13: [
    {
      id: "d13-q1", target: "lens",
      stem: "Was bedeutet 'Gedanken sind Ereignisse, keine Befehle'?",
      options: [
        { id: "a", text: "Ein Gedanke ist nur ein mentales Ereignis – du musst ihm nicht automatisch folgen" },
        { id: "b", text: "Gedanken sind unwichtig und sollten ignoriert werden" },
        { id: "c", text: "Gedanken bestimmen immer dein Verhalten" },
        { id: "d", text: "Negative Gedanken muss man unterdrücken" },
      ],
      correctOptionId: "a",
      explanation: "Defusion: Du erkennst den Gedanken als Gedanken, nicht als Wahrheit oder Anweisung.",
    },
    {
      id: "d13-q2", target: "action",
      stem: "Was machst du konkret, wenn ein störender Gedanke auftaucht?",
      options: [
        { id: "a", text: "Du benennst ihn innerlich („Ich habe gerade den Gedanken, dass …") und handelst weiter" },
        { id: "b", text: "Du versuchst sofort, ihn loszuwerden" },
        { id: "c", text: "Du diskutierst innerlich gegen ihn an" },
        { id: "d", text: "Du brichst die Aktion ab und sammelst dich" },
      ],
      correctOptionId: "a",
      explanation: "Metacognitive Labeling: Den Gedanken benennen schafft Abstand. Aktion läuft weiter.",
    },
    {
      id: "d13-q3", target: "mistake",
      stem: "Was wäre die typische Defusion-Falle?",
      options: [
        { id: "a", text: "Den Gedanken bekämpfen oder wegdrücken zu wollen" },
        { id: "b", text: "Den Gedanken benennen" },
        { id: "c", text: "Weiter spielen, obwohl der Gedanke da ist" },
        { id: "d", text: "Den Coach um Rat fragen" },
      ],
      correctOptionId: "a",
      explanation: "Wegdrücken verstärkt den Gedanken. Benennen entkoppelt ihn von der Handlung.",
    },
  ],
  14: [
    {
      id: "d14-q1", target: "lens",
      stem: "Warum raubt Ergebnisdenken die Gegenwart?",
      options: [
        { id: "a", text: "Weil deine Aufmerksamkeit in der Zukunft ist und nicht bei der aktuellen Aktion" },
        { id: "b", text: "Weil Ergebnisse unwichtig sind" },
        { id: "c", text: "Weil man sich nicht freuen darf" },
        { id: "d", text: "Weil Ergebnisse immer enttäuschen" },
      ],
      correctOptionId: "a",
      explanation: "Outcome Detachment: Wer im Ergebnis ist, ist nicht in der Aktion. Präsenz erfordert Prozessfokus.",
    },
    {
      id: "d14-q2", target: "action",
      stem: "Was machst du heute vor und nach jeder Aktion?",
      options: [
        { id: "a", text: "Du benennst kurz den Prozess (was tue ich?), nicht das Ergebnis (was kommt raus?)" },
        { id: "b", text: "Du visualisierst nur den Sieg" },
        { id: "c", text: "Du analysierst sofort, ob es geklappt hat" },
        { id: "d", text: "Du atmest tief und denkst an nichts" },
      ],
      correctOptionId: "a",
      explanation: "Process-Linie eröffnen: Vor/nach Aktionen den Prozess priorisieren – das schützt Aufmerksamkeit.",
    },
    {
      id: "d14-q3", target: "mistake",
      stem: "Wann verlässt du heute typischerweise den Prozess-Modus?",
      options: [
        { id: "a", text: "Sobald ein Ergebnis kippt und du sofort an die Tabelle/Statistik denkst" },
        { id: "b", text: "Wenn du dich auf die nächste Aktion vorbereitest" },
        { id: "c", text: "Wenn du atmest" },
        { id: "d", text: "Wenn du dem Mitspieler zuhörst" },
      ],
      correctOptionId: "a",
      explanation: "Der Wechsel ins Ergebnisdenken passiert genau im Druckmoment. Genau dort den Prozess zurückholen.",
    },
  ],
  15: [
    {
      id: "d15-q1", target: "lens",
      stem: "Was bedeutet 'Präsenz aktiv zurückholen'?",
      options: [
        { id: "a", text: "Präsenz ist kein Zustand, der bleibt – du musst sie bewusst durch einen Trigger neu starten" },
        { id: "b", text: "Präsenz hat man oder hat man nicht" },
        { id: "c", text: "Präsenz entsteht von selbst, wenn man entspannt ist" },
        { id: "d", text: "Präsenz heißt, an nichts zu denken" },
      ],
      correctOptionId: "a",
      explanation: "Re-engagement: Präsenz wird verloren und aktiv wiederhergestellt – durch einen klaren Reset-Trigger.",
    },
    {
      id: "d15-q2", target: "action",
      stem: "Was ist heute dein Reset-Trigger im Training?",
      options: [
        { id: "a", text: "Eine kurze, immer gleiche körperliche Geste oder ein Wort, das Aufmerksamkeit zurück auf die Aufgabe holt" },
        { id: "b", text: "Eine längere Atemübung zwischen den Aktionen" },
        { id: "c", text: "Ein Blick zur Uhr" },
        { id: "d", text: "Ein Gespräch mit dem Coach" },
      ],
      correctOptionId: "a",
      explanation: "Trigger müssen kurz, eindeutig und im Spielfluss anwendbar sein. Sonst funktionieren sie nicht unter Druck.",
    },
    {
      id: "d15-q3", target: "mistake",
      stem: "Wann scheitert ein Reset-Trigger typischerweise?",
      options: [
        { id: "a", text: "Wenn er zu komplex ist oder zu lange dauert für den Spielmoment" },
        { id: "b", text: "Wenn er einfach ist" },
        { id: "c", text: "Wenn man ihn mehrmals nutzt" },
        { id: "d", text: "Wenn er körperlich ist" },
      ],
      correctOptionId: "a",
      explanation: "Im echten Druck überlebt nur, was extrem einfach ist. Komplexe Routinen reißen ab.",
    },
  ],
  16: [
    {
      id: "d16-q1", target: "lens",
      stem: "Warum motiviert ein größerer Grund nachhaltiger?",
      options: [
        { id: "a", text: "Weil sinnbezogene Motivation stabiler ist als angst- oder ego-getriebene" },
        { id: "b", text: "Weil man dann härter trainiert" },
        { id: "c", text: "Weil Mitspieler einen mehr mögen" },
        { id: "d", text: "Weil Coaches es so wollen" },
      ],
      correctOptionId: "a",
      explanation: "Meaning-based Motivation überlebt Rückschläge. Angst/Ego brechen unter Druck zusammen.",
    },
    {
      id: "d16-q2", target: "action",
      stem: "Was setzt du heute konkret vor dem Training?",
      options: [
        { id: "a", text: "Einen kurzen, expliziten Grund, der über dich selbst hinausgeht (Team, Rolle, Sinn)" },
        { id: "b", text: "Ein persönliches Leistungsziel in Zahlen" },
        { id: "c", text: "Eine Liste deiner Schwächen" },
        { id: "d", text: "Einen Vergleich mit einem Mitspieler" },
      ],
      correctOptionId: "a",
      explanation: "Convert: Du lenkst die Motivation aktiv weg von Angst/Ego hin zu Sinn/Beitrag.",
    },
    {
      id: "d16-q3", target: "mistake",
      stem: "Was ist ein Schein-'größerer Grund', der trotzdem Ego ist?",
      options: [
        { id: "a", text: "„Ich will, dass das Team sieht, wie wichtig ich bin"" },
        { id: "b", text: "„Ich will heute meinem Nebenmann den Rücken freihalten"" },
        { id: "c", text: "„Ich will als Team die Defensivarbeit verbessern"" },
        { id: "d", text: "„Ich will meinem jüngeren Bruder zeigen, wie man verliert"" },
      ],
      correctOptionId: "a",
      explanation: "Sobald der Grund deine Wirkung in den Mittelpunkt stellt, ist er Ego, nicht Sinn.",
    },
  ],
  17: [
    {
      id: "d17-q1", target: "lens",
      stem: "Wie entsteht laut heutigem Tag ein neues Selbstbild?",
      options: [
        { id: "a", text: "Durch wiederholtes Verhalten, das als Beweis ins Selbstbild eingeschrieben wird" },
        { id: "b", text: "Durch positives Denken über sich selbst" },
        { id: "c", text: "Durch Lob von außen" },
        { id: "d", text: "Durch Erfolge im Wettkampf" },
      ],
      correctOptionId: "a",
      explanation: "Identity Encoding Through Repetition: Verhalten formt Identität, nicht Gedanken oder Lob.",
    },
    {
      id: "d17-q2", target: "action",
      stem: "Was sammelst du heute aktiv?",
      options: [
        { id: "a", text: "Konkrete Verhaltensbeweise – kleine Aktionen, die zur Person passen, die du wirst" },
        { id: "b", text: "Komplimente von Mitspielern" },
        { id: "c", text: "Statistiken aus dem Training" },
        { id: "d", text: "Verbesserungsvorschläge des Coaches" },
      ],
      correctOptionId: "a",
      explanation: "Beweise = beobachtbare eigene Handlungen. Sie sind die Bausteine der neuen Identität.",
    },
    {
      id: "d17-q3", target: "mistake",
      stem: "Was zerstört diesen Identitätsaufbau?",
      options: [
        { id: "a", text: "Einen einzelnen schlechten Moment als 'so bin ich eben' zu deuten" },
        { id: "b", text: "Eine kleine erfolgreiche Aktion zu notieren" },
        { id: "c", text: "Nach einem Fehler weiterzumachen" },
        { id: "d", text: "Das Verhalten am nächsten Tag zu wiederholen" },
      ],
      correctOptionId: "a",
      explanation: "Ein Moment ist ein Datenpunkt, kein Identitätsbeleg. Der Beweis liegt im wiederholten Verhalten.",
    },
  ],
  18: [
    {
      id: "d18-q1", target: "lens",
      stem: "Was bedeutet 'Wachstum beginnt dort, wo du unsicher wirst'?",
      options: [
        { id: "a", text: "Spürbare Unsicherheit ist das Signal, dass du an der Lernkante bist" },
        { id: "b", text: "Unsicherheit zeigt, dass man pausieren sollte" },
        { id: "c", text: "Unsicherheit ist immer Angst" },
        { id: "d", text: "Wachstum geschieht in der Komfortzone" },
      ],
      correctOptionId: "a",
      explanation: "Prediction Error Reinforcement: Unsicherheit markiert den Bereich, wo das Gehirn neu kodiert.",
    },
    {
      id: "d18-q2", target: "behavior",
      stem: "Wie sieht 'sichtbare Unsicherheit bewusst wählen' im Training aus?",
      options: [
        { id: "a", text: "Du übernimmst eine Aktion, bei der du vor anderen scheitern könntest" },
        { id: "b", text: "Du übst allein, wo dich niemand sieht" },
        { id: "c", text: "Du machst nur Übungen, die du sicher beherrschst" },
        { id: "d", text: "Du sagst niemandem, was du übst" },
      ],
      correctOptionId: "a",
      explanation: "Sichtbar heißt: vor Mitspielern/Coach. Genau dort entsteht der Wachstumsdruck.",
    },
    {
      id: "d18-q3", target: "mistake",
      stem: "Wo kippt das in Selbstüberforderung?",
      options: [
        { id: "a", text: "Wenn du etwas wählst, das technisch noch komplett außer Reichweite ist" },
        { id: "b", text: "Wenn du eine Stufe über deinem aktuellen Niveau wählst" },
        { id: "c", text: "Wenn du mehrere Versuche brauchst" },
        { id: "d", text: "Wenn du dabei einen Fehler machst" },
      ],
      correctOptionId: "a",
      explanation: "Lernkante = leicht über aktuellem Niveau. Komplette Überforderung erzeugt Frust, kein Lernen.",
    },
  ],
  19: [
    {
      id: "d19-q1", target: "lens",
      stem: "Warum ist 'nicht kontrollierbar' nicht gleich 'bedrohlich'?",
      options: [
        { id: "a", text: "Bedrohung entsteht durch die Bewertung, nicht durch das Ereignis selbst" },
        { id: "b", text: "Weil unkontrollierbare Dinge selten sind" },
        { id: "c", text: "Weil man immer alles kontrollieren kann" },
        { id: "d", text: "Weil Bedrohung nur körperlich ist" },
      ],
      correctOptionId: "a",
      explanation: "Acceptance-based Regulation: Die emotionale Aufladung passiert in der Bewertung, nicht im Außen.",
    },
    {
      id: "d19-q2", target: "action",
      stem: "Was tust du heute, wenn etwas außerhalb deiner Kontrolle passiert (Wetter, Schiri, Gegner)?",
      options: [
        { id: "a", text: "Du benennst es als 'außerhalb', ohne es emotional aufzuladen, und gehst zur nächsten Aktion" },
        { id: "b", text: "Du beschwerst dich kurz, dann spielst du weiter" },
        { id: "c", text: "Du analysierst, warum es ungerecht war" },
        { id: "d", text: "Du forderst eine Korrektur" },
      ],
      correctOptionId: "a",
      explanation: "Benennen + nicht aufladen + nächste Aktion. Das ist Kontrollverzicht in Verhalten übersetzt.",
    },
    {
      id: "d19-q3", target: "mistake",
      stem: "Woran erkennst du, dass du es doch wieder emotional auflädst?",
      options: [
        { id: "a", text: "Du trägst die Szene mental in die nächste Aktion oder den Rest des Trainings mit" },
        { id: "b", text: "Du atmest einmal tief durch" },
        { id: "c", text: "Du gehst zurück auf deine Position" },
        { id: "d", text: "Du sprichst kurz mit einem Mitspieler" },
      ],
      correctOptionId: "a",
      explanation: "Mit-Tragen = Aufladung. Akzeptanz heißt: Ereignis bleibt im Moment, nicht im nächsten Spielzug.",
    },
  ],
  20: [
    {
      id: "d20-q1", target: "lens",
      stem: "Was bedeutet 'Fehler ohne Selbstangriff'?",
      options: [
        { id: "a", text: "Den Fehler analysieren als Verhalten, ohne ihn zu einer Aussage über dich als Person zu machen" },
        { id: "b", text: "Den Fehler ignorieren und weitermachen" },
        { id: "c", text: "Sich kurz selbst beschimpfen, dann weitermachen" },
        { id: "d", text: "Die Schuld auf andere oder Umstände verschieben" },
      ],
      correctOptionId: "a",
      explanation: "Defusion under Feedback: Fehler ist Datenpunkt zum Verhalten, nicht zur Identität.",
    },
    {
      id: "d20-q2", target: "action",
      stem: "Was machst du heute konkret nach einem Fehler?",
      options: [
        { id: "a", text: "Du dokumentierst kurz, was passiert ist und was du beim nächsten Mal anders machst – sachlich" },
        { id: "b", text: "Du spielst die Szene innerlich mehrfach durch und ärgerst dich" },
        { id: "c", text: "Du fragst sofort den Coach, ob es schlimm war" },
        { id: "d", text: "Du wechselst das Thema, um nicht daran zu denken" },
      ],
      correctOptionId: "a",
      explanation: "Dokumentieren ohne Identitätsangriff: Verhalten + Korrektur. Keine Geschichte über dich als Person.",
    },
    {
      id: "d20-q3", target: "mistake",
      stem: "Was ist hier die typische Selbstangriff-Form?",
      options: [
        { id: "a", text: "Innerlich Sätze wie „Ich bin einfach zu schlecht dafür" zu denken" },
        { id: "b", text: "Den Fehler benennen" },
        { id: "c", text: "Nach dem Fehler weiterzuspielen" },
        { id: "d", text: "Sich nach dem Training Notizen zu machen" },
      ],
      correctOptionId: "a",
      explanation: "Generalisierung vom Verhalten zur Identität ist der Kernangriff. Das ist die Defusion-Aufgabe heute.",
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
