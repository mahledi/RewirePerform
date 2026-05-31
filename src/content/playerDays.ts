/**
 * Player-Format Tagesinhalte (Maximum-Qualität).
 *
 * Snake_case Autor-Format. Wird über `mapPlayerDayToDailyContent` ins
 * camelCase `DailyContent`-Schema übersetzt und in dailyContent.ts injiziert.
 *
 * Felder folgen dem mit dem User abgestimmten Tag-10-Niveau:
 *   - lens, today_trigger, core_shift, science_bite
 *   - 3 Tasks (trigger, when_to_use, action, why, explanation,
 *     self_talk, micro_reframe, reframe_step, system_function, icon)
 *   - journal (4 Fragen + gratitude_instruction + free_reflection_prompt)
 *   - self_talk_anchors (mit when), variants (training/rest/match)
 */

import type { DailyContent, DailyTask } from "./matrixDayTypes";

export interface PlayerTask {
  id: string;
  title: string;
  trigger: string;
  when_to_use: string;
  action: string;
  why: string;
  explanation: string;
  self_talk: string;
  micro_reframe: string;
  reframe_step: { trigger: string; reframe: string; anchor: string };
  system_function: string;
  icon: string;
}

export interface PlayerJournal {
  title: string;
  questions: { id: string; question: string; placeholder?: string }[];
  gratitude_instruction: string;
  free_reflection_prompt?: string;
}

export interface PlayerDay {
  day_id: number;
  title: string;
  phase: string;
  week: number;
  line: string;
  lens: string;
  primary_mechanism: string;
  today_trigger: string;
  core_shift: string;
  science_bite: string;
  tasks: PlayerTask[];
  journal: PlayerJournal;
  gratitude_prompt: string;
  self_talk_anchors: { text: string; when: string }[];
  variants: { training: string; rest: string; match: string };
}

const mapTask = (t: PlayerTask): DailyTask => ({
  id: t.id,
  title: t.title,
  why: t.why,
  detailedExplanation: t.explanation,
  concreteAction: t.action,
  systemFunction: t.system_function,
  whenToUse: t.when_to_use,
  microReframe: t.micro_reframe,
  selfTalk: t.self_talk,
  reframeStep: t.reframe_step,
  icon: t.icon,
  trigger: t.trigger,
});

export const mapPlayerDayToDailyContent = (d: PlayerDay): DailyContent => ({
  dayNumber: d.day_id,
  scienceBite: { fact: d.science_bite },
  todayTrigger: d.today_trigger,
  coreShift: d.core_shift,
  tasks: [mapTask(d.tasks[0]), mapTask(d.tasks[1]), mapTask(d.tasks[2])],
  journal: {
    journalTitle: d.journal.title,
    questions: d.journal.questions,
    gratitudeInstruction: d.journal.gratitude_instruction,
    freeReflectionPrompt: d.journal.free_reflection_prompt,
  },
  gratitudePrompt: d.gratitude_prompt,
  selfTalkAnchors: d.self_talk_anchors,
  variants: d.variants,
});

// ─────────── DAYS 1–5 (Player Format, Maximum-Qualität) ───────────

export const PLAYER_DAYS: PlayerDay[] = [
  {
    day_id: 1,
    title: "Präsenz statt Autopilot",
    phase: "Phase I — Sichtbar werden",
    week: 1,
    line: "Presence",
    lens: "Ich beginne heute zu merken, wie oft mein Körper da ist, aber mein Kopf nicht.",
    primary_mechanism: "Attentional Control",
    today_trigger:
      "Sobald du merkst, dass dein Kopf bei Fehlern, Bewertung, Zukunft oder innerem Lärm hängt statt bei der aktuellen Aktion, ist der Tag aktiv.",
    core_shift:
      "Heute verschiebst du dich von blindem Wegdriften zu erster bewusster Rückkehr in die aktuelle Aufgabe.",
    science_bite:
      "Präsenz ist keine Stimmung — sie ist Verfügbarkeit. Sobald dein Fokus nicht mehr bei dem liegt, was gerade wirklich vor dir ist, stehen deinem Gehirn weniger saubere Informationen für die nächste Entscheidung und Ausführung zur Verfügung. Der erste Schritt ist deshalb nicht perfekte Konzentration, sondern überhaupt zu merken, wann du nicht mehr ganz da bist.",
    tasks: [
      {
        id: "d1-t1",
        title: "Erwisch den Drift",
        trigger: "Wenn du merkst, dass dein Kopf weggeht — bei Frust, Unsicherheit, Ablenkung, Bewertung oder innerer Spannung",
        when_to_use: "Mitten im Training, in Übergängen, nach Fehlern, bei Leerlauf, bei Stress oder sobald du merkst, dass du nur noch halb da bist",
        action: "Markiere den Moment innerlich mit einem kurzen, klaren Wort: 'Weg.'",
        why: "Bevor du Fokus steuern kannst, musst du den Moment erkennen, in dem du ihn verlierst.",
        explanation: "Heute geht es nicht darum, perfekt konzentriert zu sein. Heute geht es darum, den Moment klar zu erwischen, in dem dein Körper noch in der Situation ist, dein Kopf aber schon woanders. Genau dort beginnt der Bruch mit Autopilot.",
        self_talk: "Weg.",
        micro_reframe: "Der Drift ist heute kein Scheitern, sondern dein Einstiegspunkt in den Tag.",
        reframe_step: {
          trigger: "Ich merke, dass ich nicht mehr ganz da bin.",
          reframe: "Gut — jetzt sehe ich den Drift zum ersten Mal bewusst.",
          anchor: "Weg.",
        },
        system_function: "Awareness-Trigger",
        icon: "eye",
      },
      {
        id: "d1-t2",
        title: "Zurück an die Aufgabe",
        trigger: "Direkt nachdem du bemerkt hast, dass du innerlich weg bist",
        when_to_use: "Sofort nach 'Weg', bevor dein Kopf wieder in alte Gedankenschleifen springt",
        action: "Richte deinen Fokus auf genau eine konkrete Sache: Ball, Gegenspieler, Position, Kommunikation oder nächste Bewegung.",
        why: "Präsenz wird erst praktisch, wenn du nach dem Drift wieder an der realen Aufgabe andockst.",
        explanation: "Es geht nicht darum, dich zusammenzureißen oder sofort einen perfekten mentalen Zustand zu erzeugen. Es geht nur darum, deine Aufmerksamkeit wieder an das zu binden, was gerade wirklich zählt.",
        self_talk: "Hier. Diese Aktion.",
        micro_reframe: "Du musst nicht alles zurückholen — nur deine nächste echte Aufgabe.",
        reframe_step: {
          trigger: "Ich habe den Drift erkannt.",
          reframe: "Ich brauche keinen perfekten Zustand, nur einen klaren Arbeitsort.",
          anchor: "Hier. Diese Aktion.",
        },
        system_function: "Return-to-Task",
        icon: "target",
      },
      {
        id: "d1-t3",
        title: "Folge nicht blind dem ersten Impuls",
        trigger: "Wenn dein erster Impuls wäre, dich zurückzunehmen, stiller zu werden, nicht mehr zu fordern oder innerlich rauszugehen",
        when_to_use: "Nach Fehlern, bei Unsicherheit, bei Frust oder wenn du dich kleiner machen willst",
        action: "Tu bewusst die funktional bessere Version: drinbleiben, anbieten, klar kommunizieren, wieder in die Aktion gehen.",
        why: "Tag 1 darf nicht nur Beobachtung bleiben. Er soll die erste kleine Musterunterbrechung auslösen.",
        explanation: "Fast jeder Mensch folgt ständig seinem ersten inneren Impuls. Heute trainierst du, dass zwischen Impuls und Handlung ein kleiner Raum entstehen kann. Nicht riesig — aber echt.",
        self_talk: "Bleib drin.",
        micro_reframe: "Heute trainierst du nicht Perfektion, sondern den ersten echten Handlungsspielraum.",
        reframe_step: {
          trigger: "Ich will mich gerade zurückziehen oder vermeiden.",
          reframe: "Genau hier entscheide ich heute zum ersten Mal bewusst anders.",
          anchor: "Bleib drin.",
        },
        system_function: "Behavior Interrupt",
        icon: "flame",
      },
    ],
    journal: {
      title: "Wo war ich heute wirklich da — und wo nicht?",
      questions: [
        { id: "d1-j1", question: "In welchem Moment habe ich heute am klarsten gemerkt, dass mein Kopf weg war?", placeholder: "Beschreibe die Szene konkret." },
        { id: "d1-j2", question: "Wodurch wurde mein Fokus heute am häufigsten weggezogen?", placeholder: "Fehler, Bewertung, Zukunft, Frust, Ablenkung ..." },
        { id: "d1-j3", question: "Konnte ich mindestens einmal bewusst zu meiner nächsten Aufgabe zurückkehren?", placeholder: "Wie sah diese Rückkehr aus?" },
        { id: "d1-j4", question: "In welchem Moment habe ich heute meinem ersten Impuls nicht einfach blind gefolgt?", placeholder: "Welche Gegenbewegung hast du gesetzt?" },
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist — mindestens 1 angenehme, 1 schwierige und 1 erkenntnisreiche Sache.",
      free_reflection_prompt: "Was zeigt mir dieser Tag über mein aktuelles Muster von Präsenz und Autopilot?",
    },
    gratitude_prompt: "Wofür bin ich heute dankbar — auch in einem schwierigen Moment?",
    self_talk_anchors: [
      { text: "Weg.", when: "Wenn du den Drift bemerkst" },
      { text: "Hier. Diese Aktion.", when: "Wenn du zurück an die Aufgabe gehst" },
      { text: "Bleib drin.", when: "Wenn du dich rausnehmen willst" },
    ],
    variants: {
      training: "Nutze jede Trainingssituation, in der du innerlich wegkippst, als Einstieg in den Tag.",
      rest: "Übertrage den Tag auf Handy, Gespräche, Vergleich, Grübeln und Unruhe im Alltag.",
      match: "Kurzversion: Drift erkennen → zurück zur Aktion → dem ersten Impuls nicht blind folgen.",
    },
  },
  {
    day_id: 2,
    title: "Der Fehler ist nicht das Problem",
    phase: "Phase I — Sichtbar werden",
    week: 1,
    line: "Learning vs Judgement",
    lens: "Was mich nach einem Fehler oft wirklich aus der Bahn bringt, ist nicht nur der Fehler, sondern die innere Bedeutung, die mein Kopf ihm sofort gibt.",
    primary_mechanism: "Metacognitive Defusion",
    today_trigger: "Sobald dir etwas misslingt und sofort ein innerer Satz auftaucht, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von blindem Glauben an den ersten inneren Satz zu erster Distanz und weniger automatischer Enge nach Fehlern.",
    science_bite: "Ein Fehler trifft dich nicht nur von außen. In Sekunden erzeugt dein Gehirn eine erste Bedeutung: Was sagt das über mich? Ist das bedrohlich, peinlich oder einfach Information? Genau dieser innere Satz beeinflusst, wie eng oder weit dein Fokus danach wird und wie du in die nächste Aktion gehst.",
    tasks: [
      {
        id: "d2-t1",
        title: "Fang den ersten Satz",
        trigger: "Wenn dir ein Fehler, Missmoment oder unangenehmer Kontakt passiert",
        when_to_use: "Direkt in den ersten Sekunden nach dem Fehler, bevor du viel analysierst",
        action: "Frag dich kurz: 'Was war gerade mein erster Satz?'",
        why: "Du sollst sichtbar machen, dass dein inneres System Fehler nicht einfach erlebt — es kommentiert sie sofort.",
        explanation: "Das kann sein: 'Das war schlecht', 'Heute läuft gar nichts', 'Jetzt bin ich raus', 'Was denken die anderen?' oder etwas Ähnliches. Wichtig ist nicht, wie hart oder leise der Satz ist — wichtig ist, dass du ihn erwischst.",
        self_talk: "Was war mein erster Satz?",
        micro_reframe: "Heute ist nicht der Fehler selbst der Hauptpunkt, sondern der Satz, der direkt danach auftaucht.",
        reframe_step: {
          trigger: "Etwas geht schief.",
          reframe: "Bevor ich komplett reagiere, sehe ich zuerst, was mein Kopf gerade daraus macht.",
          anchor: "Was war mein erster Satz?",
        },
        system_function: "Awareness-Trigger",
        icon: "eye",
      },
      {
        id: "d2-t2",
        title: "Gedanke, nicht Tatsache",
        trigger: "Nachdem du deinen ersten inneren Satz bemerkt hast",
        when_to_use: "Sofort nach dem Satz, solange er sich noch sehr echt anfühlt",
        action: "Sag einmal ruhig und klar: 'Das ist gerade ein Gedanke.'",
        why: "Die erste Distanz entsteht, wenn der Satz nicht sofort wie Wahrheit behandelt wird.",
        explanation: "Du musst den Gedanken nicht wegmachen. Du musst ihn auch nicht positiv ersetzen. Es reicht, wenn du die erste Trennung öffnest: Da ist ein Satz — und ich muss ihm nicht sofort komplett glauben.",
        self_talk: "Das ist gerade ein Gedanke.",
        micro_reframe: "Ich muss diesen Satz nicht sofort als Wahrheit behandeln.",
        reframe_step: {
          trigger: "Ein harter innerer Satz taucht auf.",
          reframe: "Da ist ein Gedanke. Mehr noch nicht.",
          anchor: "Das ist gerade ein Gedanke.",
        },
        system_function: "Defusion-Step",
        icon: "brain",
      },
      {
        id: "d2-t3",
        title: "Werde nicht enger",
        trigger: "Wenn du nach dem Fehler körperlich, mental oder im Verhalten kleiner wirst",
        when_to_use: "In der direkt nächsten Szene nach dem Fehler",
        action: "Setze eine bewusste Gegenbewegung: aufrichten, anbieten, kommunizieren oder wieder in die Aktion gehen.",
        why: "Fehler werden oft problematisch, weil sie nicht nur Gedanken, sondern auch sofort engeres Verhalten auslösen.",
        explanation: "Viele Athleten werden nach einem Fehler stiller, kleiner, vorsichtiger und weniger präsent. Heute trainierst du, dass der erste innere Satz nicht automatisch dein ganzes Verhalten bestimmen muss.",
        self_talk: "Nicht enger.",
        micro_reframe: "Der Fehler muss nicht sofort meinen Körper und mein Verhalten codieren.",
        reframe_step: {
          trigger: "Ich merke, dass ich kleiner werde.",
          reframe: "Jetzt setze ich eine klare Gegenbewegung.",
          anchor: "Nicht enger.",
        },
        system_function: "Behavior Protection",
        icon: "shield",
      },
    ],
    journal: {
      title: "Was macht mein Kopf aus Fehlern?",
      questions: [
        { id: "d2-j1", question: "Welcher erste innere Satz ist heute nach Fehlern oder unangenehmen Momenten am häufigsten aufgetaucht?", placeholder: "Schreib den Satz möglichst wörtlich auf." },
        { id: "d2-j2", question: "In welchem Moment hat sich ein Gedanke heute besonders wie eine Wahrheit angefühlt?", placeholder: "Beschreibe die Situation." },
        { id: "d2-j3", question: "Konnte ich mindestens einmal klar merken: Das ist gerade ein Gedanke?", placeholder: "Was hat sich dadurch verändert?" },
        { id: "d2-j4", question: "Wann bin ich nach einem Fehler enger geworden — im Körper, im Fokus oder im Verhalten?", placeholder: "Was war dein Muster?" },
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist — auch etwas aus einem schwierigen Moment.",
      free_reflection_prompt: "Was zeigt mir dieser Tag über meine automatische Fehlerverarbeitung?",
    },
    gratitude_prompt: "Wofür kann ich heute dankbar sein, obwohl etwas schiefging?",
    self_talk_anchors: [
      { text: "Was war mein erster Satz?", when: "Direkt nach einem Fehler" },
      { text: "Das ist gerade ein Gedanke.", when: "Wenn der Satz sehr echt wirkt" },
      { text: "Nicht enger.", when: "Wenn du kleiner wirst" },
    ],
    variants: {
      training: "Nutze jeden Fehler oder Missmoment als Einstieg in den Tag.",
      rest: "Übertrage den Tag auf Selbstkritik, peinliche Momente, Frust und Vergleich im Alltag.",
      match: "Kurzversion: ersten Satz fangen → als Gedanken erkennen → nicht enger werden.",
    },
  },
  {
    day_id: 3,
    title: "Was du bewertest, steuert dich",
    phase: "Phase I — Sichtbar werden",
    week: 1,
    line: "Fear vs Love",
    lens: "Zwischen Situation und Zustand liegt meine Lesart.",
    primary_mechanism: "Threat-to-Challenge Reappraisal",
    today_trigger: "Sobald dich eine Situation innerlich verändert, enger macht, stresst oder verunsichert, wird der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von automatischer Bedeutungsgebung zu erster Bewertungsflexibilität.",
    science_bite: "Dein Zustand entsteht nicht nur durch die Situation. Dein Gehirn bewertet in Sekunden, was sie bedeutet: Gefahr, Test, Kontrollverlust, Angriff oder Trainingsreiz. Genau diese Lesart beeinflusst, wie eng oder weit, ruhig oder hektisch du danach wirst.",
    tasks: [
      {
        id: "d3-t1",
        title: "Finde die Bedeutung",
        trigger: "Wenn dich etwas stresst, nervt, frustriert, enger macht oder unsicher werden lässt",
        when_to_use: "Bei Fehlern, Kritik, starker Konkurrenz, verlorenen Aktionen, unangenehmen Übungen oder innerem Kippen",
        action: "Frag dich kurz: 'Was bedeutet das gerade für mich?'",
        why: "Du sollst sichtbar machen, welche verborgene Bedeutung dein System der Situation gerade gibt.",
        explanation: "Oft reagierst du nicht nur auf das Ereignis, sondern auf die Lesart dahinter: 'Das ist peinlich', 'Ich verliere Kontrolle', 'Das ist gegen mich', 'Das zeigt, dass ich nicht gut genug bin'. Heute willst du genau diese Bedeutung greifen.",
        self_talk: "Was bedeutet das gerade für mich?",
        micro_reframe: "Nicht nur die Situation zählt — auch die Bedeutung, die mein System ihr gibt.",
        reframe_step: {
          trigger: "Mein Zustand kippt.",
          reframe: "Zwischen Situation und Zustand liegt gerade eine Lesart.",
          anchor: "Was bedeutet das gerade für mich?",
        },
        system_function: "Meaning Awareness",
        icon: "eye",
      },
      {
        id: "d3-t2",
        title: "Öffne eine zweite Lesart",
        trigger: "Nachdem dir die erste automatische Bedeutung klar geworden ist",
        when_to_use: "Direkt nach dem Erkennen der ersten Lesart",
        action: "Ergänze innerlich: 'Es könnte auch ...' und formuliere eine zweite, funktionalere Lesart.",
        why: "Du sollst erleben, dass deine erste Bewertung nicht alternativlos ist.",
        explanation: "Es geht nicht um Schönreden. Es geht darum, neben die erste Bedrohungslese eine zweite brauchbare Lesart zu stellen: Test statt Angriff, Trainingsreiz statt Beweis gegen dich, ehrliche Reibung statt Gefahr.",
        self_talk: "Es könnte auch ...",
        micro_reframe: "Die erste Lesart ist oft automatisch, aber nicht die einzige.",
        reframe_step: {
          trigger: "Ich sehe gerade nur Gefahr, Angriff oder Defizit.",
          reframe: "Jetzt öffne ich bewusst eine zweite, funktionalere Lesart.",
          anchor: "Es könnte auch ...",
        },
        system_function: "Reappraisal Opening",
        icon: "sparkles",
      },
      {
        id: "d3-t3",
        title: "Handle nach der besseren Lesart",
        trigger: "Sobald du eine zweite Lesart geöffnet hast",
        when_to_use: "In der direkt nächsten Handlung oder Szene danach",
        action: "Setze eine klare funktionale Handlung, die zu der besseren Lesart passt.",
        why: "Reappraisal bleibt Theorie, wenn es nicht sichtbar dein Verhalten verändert.",
        explanation: "Wenn du dieselbe Situation anders liest, soll sich das direkt zeigen: präsent bleiben, wieder anbieten, klar kommunizieren, in der Szene bleiben, offen statt enger handeln.",
        self_talk: "Handle nach der besseren Lesart.",
        micro_reframe: "Eine bessere Lesart zählt erst, wenn sie die nächste Handlung verändert.",
        reframe_step: {
          trigger: "Ich habe eine zweite Lesart geöffnet.",
          reframe: "Jetzt zeige ich sie sofort in meiner nächsten Szene.",
          anchor: "Handle nach der besseren Lesart.",
        },
        system_function: "Behavior Translation",
        icon: "target",
      },
    ],
    journal: {
      title: "Wie lese ich schwierige Situationen?",
      questions: [
        { id: "d3-j1", question: "Welche Situation hat mich heute innerlich am stärksten verändert?", placeholder: "Beschreibe die Szene." },
        { id: "d3-j2", question: "Welche erste Bedeutung hat mein Kopf ihr gegeben?", placeholder: "Was hat die Situation für dich innerlich bedeutet?" },
        { id: "d3-j3", question: "Konnte ich mindestens einmal eine zweite Lesart öffnen?", placeholder: "Welche alternative Lesart war funktionaler?" },
        { id: "d3-j4", question: "Wie hat sich mein Verhalten verändert, als ich die Situation anders gelesen habe?", placeholder: "Beschreibe die nächste Handlung." },
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist — inklusive etwas aus einem schwierigen Moment.",
      free_reflection_prompt: "Was zeigt mir dieser Tag über mein aktuelles Bewertungssystem?",
    },
    gratitude_prompt: "Welche schwierige Situation hat mir heute gezeigt, dass meine Lesart nicht fest sein muss?",
    self_talk_anchors: [
      { text: "Was bedeutet das gerade für mich?", when: "Wenn dein Zustand kippt" },
      { text: "Es könnte auch ...", when: "Wenn du nur eine automatische Lesart siehst" },
      { text: "Handle nach der besseren Lesart.", when: "In der nächsten Szene" },
    ],
    variants: {
      training: "Auf Fehler, Kritik, Gegner, Rolle, Übungen und Stressmomente anwenden.",
      rest: "Übertrage den Tag auf Vergleich, Planänderungen, Frust, soziale Situationen und Zukunftsgrübeln.",
      match: "Kurzversion: Bedeutung sehen → zweite Lesart öffnen → danach handeln.",
    },
  },
  {
    day_id: 4,
    title: "Kontrolle beginnt mit Loslassen",
    phase: "Phase I — Sichtbar werden",
    week: 1,
    line: "Control vs Non-Control",
    lens: "Ich werde stärker, wenn ich erkenne, was gerade nicht bei mir liegt — und meine Energie zurückhole.",
    primary_mechanism: "Acceptance-based Cognitive Load Reduction",
    today_trigger: "Sobald dich etwas innerlich bindet, Energie zieht oder deinen Fokus frisst, obwohl du es gerade nicht beeinflussen kannst, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von Energiebindung an Unsteuerbares zu Rückführung auf das, was wirklich bei dir liegt.",
    science_bite: "Ein großer Teil mentaler Erschöpfung entsteht nicht nur durch das, was passiert. Er entsteht dadurch, dass dein Gehirn weiter Energie an Dinge bindet, die du im Moment nicht beeinflussen kannst. Wenn dein Kopf an etwas festhängt, das gerade nicht veränderbar ist, bleibt weniger Aufmerksamkeit für die nächste saubere Handlung. Loslassen ist deshalb hier kein Rückzug, sondern die Rückgewinnung von mentaler Kapazität.",
    tasks: [
      {
        id: "d4-t1",
        title: "Benenn das Unsteuerbare",
        trigger: "Wenn dich etwas innerlich bindet, aufregt oder Energie zieht",
        when_to_use: "Nach Fehlern, bei Entscheidungen anderer, bei Gegenspielern, bei Bewertung, bei Frust über Rolle oder Ergebnisfantasie",
        action: "Frag dich klar: 'Liegt das gerade wirklich in meiner Kontrolle?' Wenn nein, markiere innerlich: 'Nicht in meiner Kontrolle.'",
        why: "Du kannst Energie erst zurückholen, wenn du erkennst, woran du sie gerade verlierst.",
        explanation: "Viele Athleten bleiben an Dingen hängen, die längst passiert sind oder gerade nicht in ihrer Hand liegen. Heute geht es nicht darum, das sofort wegzumachen. Es geht zuerst darum, sauber zu unterscheiden, was wirklich dein Feld ist — und was nicht.",
        self_talk: "Nicht in meiner Kontrolle.",
        micro_reframe: "Nicht alles, woran mein Kopf hängt, verdient gerade weiter meine Energie.",
        reframe_step: {
          trigger: "Ich merke, dass etwas an mir zieht.",
          reframe: "Bevor ich weiter Energie verliere, prüfe ich erst: Liegt das überhaupt bei mir?",
          anchor: "Nicht in meiner Kontrolle.",
        },
        system_function: "Awareness-Trigger",
        icon: "eye",
      },
      {
        id: "d4-t2",
        title: "Hol die Energie zurück",
        trigger: "Direkt nachdem du etwas als nicht steuerbar erkannt hast",
        when_to_use: "Sofort nach Aufgabe 1, bevor dein Kopf wieder zum gleichen Punkt zurückspringt",
        action: "Richte deinen Fokus bewusst auf eine Sache, die wirklich bei dir liegt: Haltung, Kommunikation, Einsatz, nächste Aktion, Präsenz, Position oder Entscheidung.",
        why: "Loslassen wird erst praktisch, wenn du die frei werdende Energie wieder sinnvoll bindest.",
        explanation: "Viele Menschen versuchen, etwas loszulassen, ohne ihrer Aufmerksamkeit danach eine neue Richtung zu geben. Dann bleibt das System leer oder springt direkt zurück. Heute trainierst du, Energie bewusst an das Steuerbare zurückzubinden.",
        self_talk: "Das liegt bei mir.",
        micro_reframe: "Ich verliere keine Kontrolle — ich hole sie an die richtige Stelle zurück.",
        reframe_step: {
          trigger: "Ich habe erkannt, dass etwas nicht bei mir liegt.",
          reframe: "Jetzt richte ich meine Energie wieder an dem aus, was ich wirklich beeinflussen kann.",
          anchor: "Das liegt bei mir.",
        },
        system_function: "Return-to-Control",
        icon: "target",
      },
      {
        id: "d4-t3",
        title: "Füttere es nicht weiter",
        trigger: "Wenn dein Kopf wieder zu dem gleichen unsteuerbaren Thema zurück will",
        when_to_use: "Beim zweiten Kreislauf aus Ärger, innerem Argumentieren, Schuld, Rechtfertigung oder Grübeln",
        action: "Sag innerlich: 'Schon erkannt. Nicht weiter.' und geh bewusst zurück in Bewegung, Kommunikation, Präsenz oder die nächste konkrete Aufgabe.",
        why: "Oft verlierst du nicht am ersten Ärger, sondern an der zweiten Aufladung.",
        explanation: "Das eigentliche Problem ist häufig nicht nur der erste Impuls, sondern dass du das Unsteuerbare innerlich weiterfütterst. Heute trainierst du, diesen zweiten Kreislauf früher zu stoppen — nicht durch Härte, sondern durch Nicht-Weitermachen.",
        self_talk: "Schon erkannt. Nicht weiter.",
        micro_reframe: "Der zweite Kreislauf kostet oft mehr Energie als die Situation selbst.",
        reframe_step: {
          trigger: "Mein Kopf will wieder dahin zurück.",
          reframe: "Ich habe es schon gesehen. Jetzt bekommt es keine neue Energie.",
          anchor: "Schon erkannt. Nicht weiter.",
        },
        system_function: "Spiral Interrupt",
        icon: "shield",
      },
    ],
    journal: {
      title: "Woran verliere ich Energie, obwohl es nicht bei mir liegt?",
      questions: [
        { id: "d4-j1", question: "Welche Situation hat heute am meisten Energie von mir gezogen?", placeholder: "Beschreibe die Szene konkret." },
        { id: "d4-j2", question: "Lag sie wirklich in meiner Kontrolle?", placeholder: "Woran hast du das erkannt?" },
        { id: "d4-j3", question: "Worauf habe ich meine Energie danach bewusst zurückgeführt?", placeholder: "Was lag wirklich bei dir?" },
        { id: "d4-j4", question: "Wo habe ich ein unsteuerbares Thema weitergefüttert — und wo konnte ich damit aufhören?", placeholder: "Was war der Unterschied?" },
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist — mindestens 1 leichte, 1 schwierige und 1 präzise Sache, die dir etwas gezeigt hat.",
      free_reflection_prompt: "Was zeigt mir dieser Tag über meine Kontrollillusion und meinen Energiehaushalt?",
    },
    gratitude_prompt: "Welche schwierige Situation hat mir heute gezeigt, dass Loslassen nicht Schwäche, sondern Präzision sein kann?",
    self_talk_anchors: [
      { text: "Nicht in meiner Kontrolle.", when: "Wenn dich etwas bindet, obwohl es nicht bei dir liegt" },
      { text: "Das liegt bei mir.", when: "Wenn du Energie zurück an das Steuerbare bindest" },
      { text: "Schon erkannt. Nicht weiter.", when: "Wenn der zweite Kreislauf starten will" },
    ],
    variants: {
      training: "Nutze vergangene Fehler, Entscheidungen anderer, Gegner, Rolle und Ergebnisgedanken als Material.",
      rest: "Übertrage den Tag auf Grübeln, Vergleich, Zukunftsdenken, Frust und innere Unruhe.",
      match: "Kurzversion: Unsteuerbares benennen → Energie zurückholen → nicht weiter füttern.",
    },
  },
  {
    day_id: 5,
    title: "Ego erkennen",
    phase: "Phase I — Sichtbar werden",
    week: 1,
    line: "Ego vs Inner Excellence",
    lens: "Ich merke, wann es mir gerade mehr um mein Bild als um die Situation, die Aufgabe oder echte Qualität geht.",
    primary_mechanism: "Self-referential Processing Awareness",
    today_trigger: "Sobald du merkst, dass dein Fokus auf Wirkung, Bewertung, Beweis oder dein Bild kippt, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von Selbstbezug auf Qualität — und von Beweis auf Dienst an der Sache.",
    science_bite: "Ego ist im Training oft kein Lautsein, sondern Selbstbindung. Es zeigt sich im ständigen Denken an das eigene Bild, in der Angst, schwach auszusehen, im Bedürfnis, sich zu beweisen oder in übermäßiger Selbstkritik. Sobald dein Fokus stärker an deinem Bild hängt als an der Aufgabe selbst, wird dein System enger. Exzellenz ist etwas anderes: Sie richtet Aufmerksamkeit auf Qualität, Präzision, Beitrag und sauberes Handeln.",
    tasks: [
      {
        id: "d5-t1",
        title: "Erkenne den Bild-Moment",
        trigger: "Wenn dein Fokus plötzlich stark auf Wirkung, Bewertung oder Beweis geht",
        when_to_use: "Bei Fehlern, Vergleich, Unsicherheit, Coolness, Beweisdrang, Rückzug oder wenn du beeindrucken willst",
        action: "Sag innerlich einmal: 'Gerade geht es um mich, nicht um die Aufgabe.'",
        why: "Solange du den Selbstbezug nicht klar erkennst, bleibt 'Ego' nur ein Schlagwort.",
        explanation: "Heute geht es nicht darum, dich dafür zu verurteilen. Es geht darum, den Moment zu erkennen, in dem Leistung innerlich selbstbezogen wird: Wie wirke ich? Wie sehe ich aus? Was sagt das über mich? Genau dieser Shift soll heute sichtbar werden.",
        self_talk: "Gerade geht es um mich, nicht um die Aufgabe.",
        micro_reframe: "Ego ist oft nicht Lautsein, sondern die Rückbindung der Situation auf mein Bild.",
        reframe_step: {
          trigger: "Ich hänge stark an Wirkung oder Bewertung.",
          reframe: "Ich sehe gerade den Bild-Fokus und muss ihm nicht blind folgen.",
          anchor: "Gerade geht es um mich, nicht um die Aufgabe.",
        },
        system_function: "Self-Reference Awareness",
        icon: "eye",
      },
      {
        id: "d5-t2",
        title: "Zurück zur Qualität",
        trigger: "Direkt nachdem du den Bild-Moment erkannt hast",
        when_to_use: "Sobald du wieder an die eigentliche Aufgabe andocken willst",
        action: "Frag dich kurz: 'Was wäre hier gerade die saubere Sache?' und richte deinen Fokus darauf.",
        why: "Der erste Schritt von Ego zu Exzellenz ist die Rückverschiebung von Wirkung auf Qualität.",
        explanation: "Nicht mehr fragen: Wie wirke ich? Was denken die anderen? Sondern: Was ist die Aufgabe? Was ist die saubere Aktion? Was verlangt Qualität in diesem Moment? Genau diese Rückrichtung baut Inner Excellence.",
        self_talk: "Was ist hier die saubere Sache?",
        micro_reframe: "Nicht mein Bild ist hier mein Arbeitsort, sondern Qualität.",
        reframe_step: {
          trigger: "Ich habe den Bild-Moment erkannt.",
          reframe: "Jetzt richte ich mich wieder an der Sache statt an Wirkung aus.",
          anchor: "Was ist hier die saubere Sache?",
        },
        system_function: "Quality Redirect",
        icon: "target",
      },
      {
        id: "d5-t3",
        title: "Wähle Dienst statt Beweis",
        trigger: "Wenn du zwischen bildschonender und dienlicher Handlung wählen kannst",
        when_to_use: "In Situationen, in denen du cool wirken, Recht behalten, dich schützen oder glänzen willst",
        action: "Wähle bewusst die Sache statt den Beweis: klar kommunizieren, helfen, korrigieren lassen, mutig und präzise handeln.",
        why: "Ego wird praktisch schwächer, wenn Handlung nicht mehr primär deinem Bild dient.",
        explanation: "Heute trainierst du zum ersten Mal bewusst die Verschiebung von Beweis zu Dienst. Nicht: Wie sehe ich aus? Sondern: Was dient Team, Aufgabe, Qualität oder Wahrheit des Moments?",
        self_talk: "Diene ich meinem Bild — oder der Sache?",
        micro_reframe: "Exzellenz dient der Situation. Ego dient oft dem Bild.",
        reframe_step: {
          trigger: "Ich spüre Beweisdrang oder Bildschutz.",
          reframe: "Jetzt wähle ich bewusst die dienlichere Handlung.",
          anchor: "Diene ich meinem Bild — oder der Sache?",
        },
        system_function: "Service Over Image",
        icon: "heart",
      },
    ],
    journal: {
      title: "Wann ging es heute um mein Bild — und wann um echte Qualität?",
      questions: [
        { id: "d5-j1", question: "In welchen Momenten ging es mir heute stärker um mein Bild als um die eigentliche Aufgabe?", placeholder: "Beschreibe die Situation." },
        { id: "d5-j2", question: "Wodurch wurde dieser Bild-Fokus ausgelöst?", placeholder: "Fehler, Vergleich, Unsicherheit, Bewertung ..." },
        { id: "d5-j3", question: "Konnte ich heute mindestens einmal von Wirkung zurück auf Qualität schalten?", placeholder: "Was hat dir dabei geholfen?" },
        { id: "d5-j4", question: "Wann habe ich heute eher der Sache gedient als meinem Beweisdrang?", placeholder: "Welche Handlung war dafür ein gutes Beispiel?" },
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist — auch etwas, das dir den Unterschied zwischen Wirkung und Qualität gezeigt hat.",
      free_reflection_prompt: "Was zeigt mir dieser Tag über mein aktuelles Verhältnis von Bild, Beweis und echter Exzellenz?",
    },
    gratitude_prompt: "Welche Situation hat mir heute etwas Wichtiges über den Unterschied zwischen Bild und Qualität gezeigt?",
    self_talk_anchors: [
      { text: "Gerade geht es um mich, nicht um die Aufgabe.", when: "Wenn dein Fokus auf Bild oder Wirkung kippt" },
      { text: "Was ist hier die saubere Sache?", when: "Wenn du zurück zu Qualität willst" },
      { text: "Diene ich meinem Bild — oder der Sache?", when: "Wenn Beweisdrang auftaucht" },
    ],
    variants: {
      training: "Nutze Beweisdrang, Wirkung, Selbstkritik, Unsicherheit und Vergleich im Training als Material.",
      rest: "Übertrage den Tag auf Gespräche, Social Media, Vergleich und stillen Selbstfokus im Alltag.",
      match: "Kurzversion: Bild-Moment erkennen → Qualität wählen → der Sache dienen.",
    },
  },
  {
    day_id: 6,
    title: "Dankbarkeit erweitert Wahrnehmung",
    phase: "Phase I — Sichtbar werden",
    week: 1,
    line: "Gratitude vs Anxiety",
    lens: "Wenn mein System eng ist, sehe ich weniger. Wenn es weiter wird, sehe ich wieder mehr als nur Mangel, Fehler, Gefahr und Druck.",
    primary_mechanism: "Affective State Shaping",
    today_trigger: "Sobald dein Blick eng wird und fast nur noch Fehler, Mangel, Gefahr oder Druck sieht, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von Mangel- und Bedrohungsfixierung zu mehr Wahrnehmungsweite und Zugang zu dem, was trotzdem schon da ist.",
    science_bite: "Dankbarkeit ist heute kein nettes Gefühl und kein Schönreden. Sie ist eine aktive Korrektur von Bedrohungsfixierung und Mangelblick. Wenn dein System eng wird, sieht es fast nur noch das, was fehlt oder schiefläuft. Wenn es weiter wird, bekommt es wieder Zugang zu Ressourcen, Möglichkeiten, Tragendem und innerer Weite.",
    tasks: [
      {
        id: "d6-t1",
        title: "Erkenne den Mangelblick",
        trigger: "Wenn dein Blick fast nur noch auf Fehler, Defizit, Gefahr oder Druck geht",
        when_to_use: "Bei Frust, Vergleich, Unsicherheit, nach Fehlern, in engen oder druckvollen Momenten",
        action: "Markiere innerlich den Zustand: 'Mangelblick.'",
        why: "Du musst zuerst sehen, wann dein Wahrnehmungsfeld enger geworden ist.",
        explanation: "Heute geht es nicht darum, Probleme zu leugnen. Es geht darum zu merken, wann dein System fast nur noch auf das Falsche, Fehlende oder Bedrohliche starrt und dadurch an Weite verliert.",
        self_talk: "Mangelblick.",
        micro_reframe: "Mein System sieht gerade nicht alles — es sieht gerade vor allem das Schwierige.",
        reframe_step: {
          trigger: "Ich sehe fast nur noch das Problem.",
          reframe: "Bevor ich weiter reagiere, erkenne ich zuerst die Enge meines Blicks.",
          anchor: "Mangelblick.",
        },
        system_function: "Awareness-Trigger",
        icon: "eye",
      },
      {
        id: "d6-t2",
        title: "Hol das Tragende mit ins Bild",
        trigger: "Direkt nachdem du den engen Blick erkannt hast",
        when_to_use: "Wenn du merkst, dass dein System fast nur noch Defizit registriert",
        action: "Benenne bewusst 2–3 Dinge, die trotzdem schon da, tragend, möglich oder wertvoll sind.",
        why: "Der Tag soll dein Wahrnehmungsfeld wieder erweitern, nicht das Problem wegzaubern.",
        explanation: "Das kann etwas Kleines oder Großes sein: ein guter Kontakt, ein Trainingspartner, eine Fähigkeit, eine Chance, eine Aufgabe, ein Lernmoment, ein Körperteil, das funktioniert, eine Beziehung, ein Raum, eine Möglichkeit. Wichtig ist: mehr sehen als nur Mangel.",
        self_talk: "Es ist mehr da.",
        micro_reframe: "Weite heißt nicht, das Schwierige zu leugnen — sondern mehr als nur das Schwierige zu sehen.",
        reframe_step: {
          trigger: "Ich bin im Mangelblick.",
          reframe: "Jetzt erweitere ich bewusst mein Wahrnehmungsfeld.",
          anchor: "Es ist mehr da.",
        },
        system_function: "State Expansion",
        icon: "sparkles",
      },
      {
        id: "d6-t3",
        title: "Handle aus Weite",
        trigger: "Nachdem du deinen Blick wieder etwas geöffnet hast",
        when_to_use: "In der direkt nächsten Handlung oder Szene",
        action: "Setze die nächste Aktion aus mehr Weite statt aus Mangel- oder Bedrohungsfokus.",
        why: "Weite soll nicht nur gedacht, sondern in Verhalten übersetzt werden.",
        explanation: "Wenn dein System weiter wird, verändert sich oft direkt deine Handlung: weniger hektisch, weniger klein, weniger schützend — dafür klarer, tragfähiger, präsenter. Genau diese Übersetzung trainierst du heute.",
        self_talk: "Aus Weite.",
        micro_reframe: "Mein nächster Schritt muss nicht aus Defizit kommen.",
        reframe_step: {
          trigger: "Ich habe wieder mehr gesehen als nur das Problem.",
          reframe: "Jetzt handle ich aus diesem weiteren Zustand.",
          anchor: "Aus Weite.",
        },
        system_function: "Behavior From Breadth",
        icon: "target",
      },
    ],
    journal: {
      title: "Wo war mein Blick heute eng — und wo weiter?",
      questions: [
        { id: "d6-j1", question: "Wann war mein Blick heute am stärksten auf Mangel, Fehler oder Druck gerichtet?", placeholder: "Beschreibe die Situation." },
        { id: "d6-j2", question: "Welche 2–3 Dinge habe ich bewusst wieder mit ins Bild geholt?", placeholder: "Was war trotzdem schon da, tragend oder möglich?" },
        { id: "d6-j3", question: "Hat sich mein Zustand dadurch verändert?", placeholder: "Wenn ja: wie genau?" },
        { id: "d6-j4", question: "Wie hat sich meine nächste Handlung verändert, als mein Blick weiter wurde?", placeholder: "Beschreibe den Unterschied." },
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist — auch etwas aus einem schwierigen Moment.",
      free_reflection_prompt: "Was zeigt mir dieser Tag über meinen Mangelblick und meine Fähigkeit, Wahrnehmung wieder zu öffnen?",
    },
    gratitude_prompt: "Was war heute trotz Schwierigkeit schon da, tragend oder wertvoll?",
    self_talk_anchors: [
      { text: "Mangelblick.", when: "Wenn dein System fast nur noch Defizit sieht" },
      { text: "Es ist mehr da.", when: "Wenn du dein Wahrnehmungsfeld wieder öffnest" },
      { text: "Aus Weite.", when: "In der nächsten Handlung" },
    ],
    variants: {
      training: "Nutze Fehler, Frust, Unsicherheit, Vergleich und Druckmomente als Hauptmaterial.",
      rest: "Übertrage den Tag auf Grübeln, Vergleich, Alltagsspannung und innere Enge.",
      match: "Kurzversion: Mangelblick erkennen → Tragendes mit ins Bild holen → aus Weite weiterhandeln.",
    },
  },
  {
    day_id: 7,
    title: "Veränderung beginnt, wenn aus einzelnen Momenten ein Muster wird",
    phase: "Phase I — Sichtbar werden",
    week: 1,
    line: "Integration",
    lens: "Meine Reaktionen folgen Mustern — und ich kann sie erkennen.",
    primary_mechanism: "Pattern Recognition",
    today_trigger: "Sobald du genug Material aus den letzten Tagen hast, nicht nur einzelne Momente, sondern Wiederholungen zu sehen, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von isolierten Einzelerlebnissen zu einem ersten inneren Modell deines Systems.",
    science_bite: "Die meisten Menschen erleben ihre inneren Reaktionen isoliert: heute unkonzentriert, gestern genervt, morgen vielleicht wieder besser. Dadurch wirken mentale Zustände zufällig, obwohl sie oft nach wiederkehrenden Mustern ablaufen. Sobald du Muster siehst, wird Veränderung präziser — denn dann arbeitest du nicht mehr gegen 'schlechte Tage', sondern an einem System.",
    tasks: [
      {
        id: "d7-t1",
        title: "Finde das Muster",
        trigger: "Wenn du auf die letzten Tage zurückschaust und merkst, dass sich bestimmte Reaktionen wiederholt haben",
        when_to_use: "Am Ende der Woche, nach dem Training oder in einem ruhigen Reflexionsmoment",
        action: "Benenne für dich: 'Mein häufigstes Muster dieser Woche war ...'",
        why: "Tag 7 soll die Woche von Einzelerlebnissen zu wiederkehrenden Mustern verdichten.",
        explanation: "Schau nicht auf jede einzelne Szene. Schau darauf, was sich wiederholt hat: Wo war dein Kopf oft weg? Welche Situationen haben dich enger gemacht? Welche Gedanken, Bewertungen oder Bildmuster tauchten häufiger auf?",
        self_talk: "Mein häufigstes Muster war ...",
        micro_reframe: "Veränderung wird präziser, wenn aus Momenten ein Muster wird.",
        reframe_step: {
          trigger: "Ich denke noch in einzelnen Situationen.",
          reframe: "Heute suche ich nicht Einzelfehler, sondern Wiederholungen.",
          anchor: "Mein häufigstes Muster war ...",
        },
        system_function: "Pattern Identification",
        icon: "eye",
      },
      {
        id: "d7-t2",
        title: "Finde den Auslöser",
        trigger: "Nachdem du dein Hauptmuster erkannt hast",
        when_to_use: "Direkt im Anschluss an Aufgabe 1",
        action: "Frag dich: 'Wann taucht dieses Muster besonders zuverlässig auf?'",
        why: "Ein Muster wird erst handhabbar, wenn sein Auslöser sichtbar wird.",
        explanation: "Nicht allgemein bleiben. Finde die Situationen dahinter: nach Fehlern, bei Bewertung, bei Unsicherheit, unter Müdigkeit, im Vergleich, in Drucksituationen oder bei innerer Spannung.",
        self_talk: "Wo zeigt es sich?",
        micro_reframe: "Ein Muster wird veränderbar, wenn ich seinen Startpunkt kenne.",
        reframe_step: {
          trigger: "Ich kenne mein Muster, aber es fühlt sich noch diffus an.",
          reframe: "Jetzt suche ich die Situation, in der es am zuverlässigsten startet.",
          anchor: "Wo zeigt es sich?",
        },
        system_function: "Trigger Mapping",
        icon: "target",
      },
      {
        id: "d7-t3",
        title: "Wähle deinen Hebel",
        trigger: "Wenn Muster und Auslöser klarer geworden sind",
        when_to_use: "Am Ende der Wochenreflexion",
        action: "Lege genau einen Hebel fest, auf den du nächste Woche bewusst achten willst.",
        why: "Tag 7 soll nicht nur Verständnis bringen, sondern eine klare Richtung für die nächste Woche setzen.",
        explanation: "Nicht alles gleichzeitig. Wähle eine Stelle, die du in Woche 2 bewusster greifen willst: Drift, Gedanken, Bildfokus, Mangelblick, Energiebindung oder etwas anderes, das besonders oft wiederkam.",
        self_talk: "Das ist mein Hebel.",
        micro_reframe: "Ich muss nicht alles lösen. Ich brauche den nächsten klaren Zugriffspunkt.",
        reframe_step: {
          trigger: "Ich sehe jetzt mehrere Dinge auf einmal.",
          reframe: "Ich wähle bewusst nur einen Hebel für die nächste Woche.",
          anchor: "Das ist mein Hebel.",
        },
        system_function: "Forward Link",
        icon: "flame",
      },
    ],
    journal: {
      title: "Welches Muster lief diese Woche wirklich?",
      questions: [
        { id: "d7-j1", question: "Welches Muster war diese Woche am stärksten?", placeholder: "Benenn zuerst nur eins." },
        { id: "d7-j2", question: "Wann ist es besonders deutlich aufgetaucht?", placeholder: "Welche Situationen oder Auslöser?" },
        { id: "d7-j3", question: "Was hat dieses Muster in mir oder in meinem Verhalten besonders deutlich gemacht?", placeholder: "Was war der rote Faden?" },
        { id: "d7-j4", question: "Was wird mein Hebel für die nächste Woche?", placeholder: "Worauf will ich gezielt achten?" },
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist — auch etwas, das dir deine Muster klarer gezeigt hat.",
      free_reflection_prompt: "Was verstehe ich jetzt klarer über mein inneres System als noch zu Beginn der Woche?",
    },
    gratitude_prompt: "Welche schwierige Situation dieser Woche hat mir am meisten über mein System gezeigt?",
    self_talk_anchors: [
      { text: "Mein häufigstes Muster war ...", when: "Wenn du Woche 1 verdichtest" },
      { text: "Wo zeigt es sich?", when: "Wenn du den Auslöser suchst" },
      { text: "Das ist mein Hebel.", when: "Wenn du Woche 2 vorbereitest" },
    ],
    variants: {
      training: "Weniger Fokus auf einzelne Szenen, mehr auf das, was sich durch die Woche gezogen hat.",
      rest: "Ideal für einen ruhigen Integrationsmoment außerhalb des Trainings.",
      match: "Kurzversion: stärkstes Muster benennen → Trigger finden → Hebel für nächste Woche setzen.",
    },
  },
  {
    day_id: 8,
    title: "Identität entsteht nicht nur im Kopf — sie entsteht durch Verhalten",
    phase: "Phase I — Sichtbar werden",
    week: 2,
    line: "Identity vs Performance",
    lens: "Ich kann Verhalten bewusst wählen, bevor mein Gefühl perfekt ist — und genau dadurch mein Selbstbild mitformen.",
    primary_mechanism: "Identity-based Action Selection",
    today_trigger: "Sobald du nicht nur sehen willst, wie du gerade bist, sondern bewusst entscheiden willst, wie du heute in Situationen sein und handeln willst, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von passiv abgeleiteter Identität zu erster bewusst trainierter Version von dir.",
    science_bite: "Viele Menschen glauben, sie müssten sich zuerst selbstbewusst, ruhig, fokussiert oder stark fühlen, bevor sie so handeln können. In der Realität läuft Veränderung oft anders herum. Dein Gehirn lernt nicht nur aus Gedanken über dich selbst, sondern auch aus wiederholtem Verhalten. Jede Handlung ist ein Signal: So reagiere ich. So trete ich auf. So gehe ich mit Druck, Fehlern oder Unsicherheit um.",
    tasks: [
      {
        id: "d8-t1",
        title: "Definiere deine Version",
        trigger: "Vor dem Training oder vor einem wichtigen Abschnitt des Tages",
        when_to_use: "Am Anfang des Tages, vor Training, vor Match oder vor relevanten Situationen",
        action: "Formuliere für dich: 'Heute trainiere ich die Version von mir, die ...'",
        why: "Identitätscodierung braucht Klarheit. Zu ungenaue Begriffe wie 'besser' oder 'stärker' reichen nicht.",
        explanation: "Definiere nicht, was du erreichen willst, sondern wie du heute sein willst — konkret im Verhalten: ruhig nach Fehlern, präsent im Moment, klar in der Kommunikation, mutig in Entscheidungen, präzise statt bildgetrieben.",
        self_talk: "Heute trainiere ich die Version von mir, die ...",
        micro_reframe: "Ich definiere keine perfekte Zukunftsversion, sondern eine heute trainierbare Version.",
        reframe_step: {
          trigger: "Der Tag oder das Training startet.",
          reframe: "Heute entscheide ich bewusst, welche Version von mir in Situationen auftauchen soll.",
          anchor: "Heute trainiere ich die Version ...",
        },
        system_function: "Identity Set",
        icon: "target",
      },
      {
        id: "d8-t2",
        title: "Beweise sie klein",
        trigger: "Sobald die erste echte Trainings- oder Leistungssituation kommt",
        when_to_use: "In der ersten passenden Szene des Tages",
        action: "Setze eine kleine konkrete Handlung, die zu deiner gewählten Version passt.",
        why: "Identität wird nicht durch große Gedanken stabil, sondern durch kleine wiederholte Beweise.",
        explanation: "Nicht auf den perfekten Moment warten. Zeig die Richtung klein: anbieten, sprechen, drinbleiben, sauber handeln, mutiger reagieren, präsenter bleiben.",
        self_talk: "Zeig es klein.",
        micro_reframe: "Große Identitätsveränderung beginnt oft mit kleinen sichtbaren Beweisen.",
        reframe_step: {
          trigger: "Die erste echte Szene ist da.",
          reframe: "Ich brauche kein großes Zeichen — nur den ersten kleinen Beweis.",
          anchor: "Zeig es klein.",
        },
        system_function: "Behavior Evidence",
        icon: "sparkles",
      },
      {
        id: "d8-t3",
        title: "Komm zurück zur Richtung",
        trigger: "Wenn du in alte automatische Muster zurückfällst",
        when_to_use: "Nach Fehlern, Unsicherheit, Rückzug, Passivität oder altem Autopilot",
        action: "Erinnere deine gewählte Version und richte die nächste Handlung wieder daran aus.",
        why: "Identität entsteht nicht durch Perfektion, sondern durch wiederholte Rückkehr zu derselben Richtung.",
        explanation: "Du musst heute nicht durchgehend 'die neue Version' sein. Aber du sollst merken, dass du die Richtung bewusst wieder aufnehmen kannst.",
        self_talk: "Zurück zu meiner Richtung.",
        micro_reframe: "Nicht Perfektion entscheidet — sondern wie oft ich zurück zur gewählten Version komme.",
        reframe_step: {
          trigger: "Ich merke, dass ich wieder im alten Muster bin.",
          reframe: "Die Richtung ist nicht weg. Ich nehme sie wieder auf.",
          anchor: "Zurück zu meiner Richtung.",
        },
        system_function: "Identity Return",
        icon: "sunrise",
      },
    ],
    journal: {
      title: "Welche Version von mir habe ich heute trainiert?",
      questions: [
        { id: "d8-j1", question: "Welche Version von mir wollte ich heute im Training oder in wichtigen Situationen sein?", placeholder: "Beschreibe sie in einem Satz." },
        { id: "d8-j2", question: "Wodurch wurde diese Version heute sichtbar?", placeholder: "Welche kleine Handlung war ein echter Beweis?" },
        { id: "d8-j3", question: "Wann bin ich in ein altes Muster zurückgefallen?", placeholder: "Was hat das ausgelöst?" },
        { id: "d8-j4", question: "Wann ist es mir gelungen, wieder zu meiner gewählten Richtung zurückzukehren?", placeholder: "Wie sah diese Rückkehr konkret aus?" },
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist — auch etwas, das dir deine Richtung klarer gezeigt hat.",
      free_reflection_prompt: "Was sagt mir dieser Tag darüber, wer ich nicht nur gerade bin, sondern zunehmend werde?",
    },
    gratitude_prompt: "Welche kleine Handlung heute war ein wichtiger Beweis für die Version von mir, die ich werden will?",
    self_talk_anchors: [
      { text: "Heute trainiere ich die Version von mir, die ...", when: "Vor dem Start" },
      { text: "Zeig es klein.", when: "Beim ersten Beweis" },
      { text: "Zurück zu meiner Richtung.", when: "Wenn alte Muster wieder auftauchen" },
    ],
    variants: {
      training: "Vor dem Training eine klare Version wählen und sie im Verhalten beweisen.",
      rest: "Auf Alltag übertragen: Wie willst du heute auftreten, reagieren und handeln?",
      match: "Kurzversion: Version wählen → 1–2 klare Beweise setzen → zur Richtung zurückkommen.",
    },
  },
  {
    day_id: 9,
    title: "Angst ist oft Bewertung",
    phase: "Phase I — Sichtbar werden",
    week: 2,
    line: "Fear vs Love",
    lens: "Ein Teil dessen, was ich als Angst oder Druck erlebe, entsteht daraus, wie mein System die Situation liest.",
    primary_mechanism: "Threat Appraisal Awareness",
    today_trigger: "Sobald Druck, Anspannung oder Angst auftauchen und du merkst, dass die Situation innerlich größer oder bedrohlicher wird, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von 'Druck ist einfach da' zu 'Druck wird auch durch meine Lesart gebaut'.",
    science_bite: "Druck ist nicht nur ein Gefühl, das einfach über dich kommt. Ein Teil davon entsteht daraus, wie dein System die Situation liest: als Gefahr, als Test, als Bedrohung für dein Bild oder als etwas, wovor du dich schützen musst. Genau diese Lesart beeinflusst Fokus, Körper und nächste Handlung.",
    tasks: [
      {
        id: "d9-t1",
        title: "Erkenne die Gefahren-Lesart",
        trigger: "Wenn du vor oder in einer Situation Druck, Angst, Enge oder Übererregung spürst",
        when_to_use: "Vor wichtigen Aktionen, vor Beobachtung, bei Fehlerangst, bei starken Gegnern, bei Leistungsdruck",
        action: "Frag dich kurz: 'Was liest mein System hier gerade als Gefahr?'",
        why: "Du sollst Angst nicht nur fühlen, sondern die Lesart dahinter sichtbar machen.",
        explanation: "Viele Druckmomente wirken so, als wären sie objektiv einfach bedrohlich. Heute trainierst du, die erste innere Gefahr-Lesart zu greifen: Wovor genau glaubt dein System sich gerade schützen zu müssen?",
        self_talk: "Was ist hier gerade die Gefahr?",
        micro_reframe: "Nicht nur die Situation macht Druck — auch die Bedeutung, die mein System ihr gibt.",
        reframe_step: {
          trigger: "Ich spüre Druck oder Angst.",
          reframe: "Bevor ich einfach reagiere, sehe ich zuerst, was mein System hier gerade als Gefahr liest.",
          anchor: "Was ist hier gerade die Gefahr?",
        },
        system_function: "Threat Awareness",
        icon: "eye",
      },
      {
        id: "d9-t2",
        title: "Benenn den Schutzmodus",
        trigger: "Nachdem dir klar geworden ist, was an der Situation gerade bedrohlich wirkt",
        when_to_use: "Sobald du merkst, dass dein System innerlich etwas absichern, schützen oder vermeiden will",
        action: "Sag dir einmal ehrlich, was du gerade schützen willst: Bild, Ergebnis, Kontrolle, Zugehörigkeit oder Status.",
        why: "Hinter Druck steckt oft nicht nur Angst, sondern eine konkrete Schutzlogik.",
        explanation: "Wenn dir klar wird, was dein System hier schützen will, wird die Reaktion weniger diffus und du bekommst mehr Zugriff auf den Moment.",
        self_talk: "Was will ich gerade schützen?",
        micro_reframe: "Hinter meiner Enge steckt oft ein Schutzversuch meines Systems.",
        reframe_step: {
          trigger: "Mir wird die Gefahr-Lesart klar.",
          reframe: "Jetzt sehe ich genauer, was mein System hier absichern will.",
          anchor: "Was will ich gerade schützen?",
        },
        system_function: "Protection Mapping",
        icon: "shield",
      },
      {
        id: "d9-t3",
        title: "Öffne die funktionalere Lesart",
        trigger: "Wenn du Gefahr-Lesart und Schutzmodus erkannt hast",
        when_to_use: "In der direkt nächsten Szene oder kurz vor der nächsten relevanten Handlung",
        action: "Erlaube dir bewusst eine zweite Lesart: Test, Reibung, ehrliche Herausforderung oder Wachstumsreiz — und handle aus dieser Richtung.",
        why: "Tag 9 soll nicht beim Erkennen enden, sondern die erste Verschiebung von Bedrohung zu Funktion öffnen.",
        explanation: "Du musst Angst nicht sofort wegmachen. Es reicht, wenn du neben die Bedrohungslese eine funktionalere Alternative stellst. Genau dort beginnt die erste offene, weniger schutzgetriebene Reaktion.",
        self_talk: "Das könnte auch ein Test sein.",
        micro_reframe: "Die Situation muss nicht nur Gefahr sein — sie kann auch eine ehrliche Herausforderung sein.",
        reframe_step: {
          trigger: "Ich sehe Gefahr und Schutzlogik.",
          reframe: "Ich öffne bewusst eine zweite Lesart, die mehr Handlung erlaubt.",
          anchor: "Das könnte auch ein Test sein.",
        },
        system_function: "Reappraisal Shift",
        icon: "sparkles",
      },
    ],
    journal: {
      title: "Wie hat mein System Druck heute gelesen?",
      questions: [
        { id: "d9-j1", question: "Welche Situation hat heute am meisten Druck, Angst oder Enge erzeugt?", placeholder: "Beschreibe die Szene konkret." },
        { id: "d9-j2", question: "Was genau hat mein System daran als Gefahr gelesen?", placeholder: "Was war innerlich bedrohlich?" },
        { id: "d9-j3", question: "Was wollte ich in diesem Moment schützen?", placeholder: "Bild, Ergebnis, Kontrolle, Zugehörigkeit, Status ..." },
        { id: "d9-j4", question: "Welche funktionalere zweite Lesart war heute möglich — oder hätte möglich sein können?", placeholder: "Wie hättest du die Situation auch lesen können?" },
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist — auch etwas aus einem Druckmoment.",
      free_reflection_prompt: "Was zeigt mir dieser Tag darüber, wie mein System Angst, Druck und Schutz organisiert?",
    },
    gratitude_prompt: "Welche Drucksituation hat mir heute etwas Wichtiges über mein System gezeigt?",
    self_talk_anchors: [
      { text: "Was ist hier gerade die Gefahr?", when: "Wenn Druck oder Enge aufkommt" },
      { text: "Was will ich gerade schützen?", when: "Wenn du die Schutzlogik klarer sehen willst" },
      { text: "Das könnte auch ein Test sein.", when: "Wenn du eine funktionalere Lesart öffnen willst" },
    ],
    variants: {
      training: "Nutze Fehlerangst, Beobachtung, starke Gegner, Leistungsdruck und Bewertung als Hauptmaterial.",
      rest: "Übertrage den Tag auf Gespräche, Erwartungen, soziale Unsicherheit, Vergleich und Zukunftsdruck.",
      match: "Kurzversion: Gefahr-Lesart sehen → Schutzmodus benennen → zweite Lesart öffnen.",
    },
  },
  {
    day_id: 10,
    title: "Confidence ist keine Stimmung",
    phase: "Phase I — Sichtbar werden",
    week: 2,
    line: "Confidence vs Self-Doubt",
    lens: "Ich kann funktional handeln, auch wenn mein Gefühl noch nicht perfekt ist.",
    primary_mechanism: "Self-efficacy Framing",
    today_trigger: "Sobald du merkst, dass du erst sicherer, lockerer oder 'besser drauf' sein willst, bevor du handelst, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von gefühlsabhängiger Confidence zu handlungsgebundener Confidence.",
    science_bite: "Confidence ist nicht perfekte innere Sicherheit. Sie wird oft stabiler, wenn dein System erlebt: Ich kann auch mit Zweifel, Unsicherheit oder ohne perfektes Gefühl funktional handeln. Genau daraus entsteht echte Handlungszuversicht.",
    tasks: [
      {
        id: "d10-t1",
        title: "Erkenne das Warten auf Gefühl",
        trigger: "Wenn du innerlich erst sicherer, ruhiger, klarer oder 'mehr drin' sein willst, bevor du handelst",
        when_to_use: "Vor wichtigen Aktionen, bei Unsicherheit, nach Fehlern, vor Gesprächen oder wenn du auf 'das richtige Gefühl' wartest",
        action: "Sag dir einmal klar: 'Ich warte gerade auf Gefühl.'",
        why: "Viele Athleten verwechseln Confidence mit guter Energie oder perfektem inneren Zustand.",
        explanation: "Heute sollst du sichtbar machen, wie oft du Handlung an Stimmung koppelst. Genau dieses Warten macht Confidence instabil, weil sie dann nur dann da ist, wenn du dich gerade gut fühlst.",
        self_talk: "Ich warte gerade auf Gefühl.",
        micro_reframe: "Confidence hängt nicht nur daran, wie ich mich fühle, sondern auch daran, wie ich handle.",
        reframe_step: {
          trigger: "Ich merke, dass ich erst anders drauf sein will.",
          reframe: "Heute erkenne ich zuerst die Abhängigkeit vom Gefühl.",
          anchor: "Ich warte gerade auf Gefühl.",
        },
        system_function: "State Dependence Awareness",
        icon: "eye",
      },
      {
        id: "d10-t2",
        title: "Handle vor voller Sicherheit",
        trigger: "Nachdem du bemerkt hast, dass du auf das richtige Gefühl wartest",
        when_to_use: "In der direkt nächsten kleinen, klaren und funktionalen Handlung",
        action: "Setze trotzdem eine saubere Handlung: anbieten, sprechen, fordern, in der Szene bleiben oder Präsenz zeigen.",
        why: "Confidence soll heute an Handlung gebunden werden, nicht nur an Gefühl.",
        explanation: "Es geht nicht um Blindheit oder Hype. Es geht um einen funktionalen Schritt trotz Unsicherheit. Genau so lernt dein System: Ich kann handeln, auch wenn ich mich noch nicht perfekt fühle.",
        self_talk: "Trotzdem handeln.",
        micro_reframe: "Ich brauche kein perfektes Gefühl, um eine saubere Handlung zu setzen.",
        reframe_step: {
          trigger: "Ich habe das Warten auf Gefühl erkannt.",
          reframe: "Jetzt setze ich einen kleinen realen Beweis durch Handlung.",
          anchor: "Trotzdem handeln.",
        },
        system_function: "Action Before Mood",
        icon: "flame",
      },
      {
        id: "d10-t3",
        title: "Speichere die Evidenz",
        trigger: "Direkt nachdem du trotz Unsicherheit gehandelt hast",
        when_to_use: "Nach einer kleinen sauberen Handlung, besonders wenn du sie sonst übersehen würdest",
        action: "Markiere innerlich: 'Das zählt.'",
        why: "Dein System soll Handlung als echten Confidence-Beweis lesen lernen.",
        explanation: "Viele Athleten sehen nur perfekte Szenen oder gutes Gefühl als Confidence-Beweis. Heute speicherst du etwas anderes: Ich habe trotz Unsicherheit gehandelt. Genau das ist bereits reale Handlungszuversicht.",
        self_talk: "Das zählt.",
        micro_reframe: "Confidence wächst oft nicht nur vor Handlung, sondern durch sie.",
        reframe_step: {
          trigger: "Ich habe trotz Unsicherheit gehandelt.",
          reframe: "Diese Handlung ist nicht klein oder wertlos — sie ist echte Evidenz.",
          anchor: "Das zählt.",
        },
        system_function: "Evidence Encoding",
        icon: "sparkles",
      },
    ],
    journal: {
      title: "Wo habe ich heute auf Gefühl gewartet — und wo trotzdem gehandelt?",
      questions: [
        { id: "d10-j1", question: "In welchem Moment habe ich heute besonders gemerkt, dass ich erst sicherer oder 'besser drauf' sein wollte?", placeholder: "Beschreibe die Situation konkret." },
        { id: "d10-j2", question: "Welche kleine funktionale Handlung habe ich trotzdem gesetzt?", placeholder: "Was war dein konkreter Schritt?" },
        { id: "d10-j3", question: "Wie hat sich diese Handlung auf meinen Zustand oder meine nächste Szene ausgewirkt?", placeholder: "Was hat sich verändert?" },
        { id: "d10-j4", question: "Was zeigt mir das darüber, wie Confidence bei mir wirklich entsteht?", placeholder: "Formuliere es so klar wie möglich." },
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist — auch etwas aus einem Moment, in dem du dich nicht perfekt gefühlt hast.",
      free_reflection_prompt: "Was zeigt mir dieser Tag darüber, wie stark ich Confidence bisher an Gefühl statt an Handlung gebunden habe?",
    },
    gratitude_prompt: "Welche kleine Handlung heute war ein echter Confidence-Beweis?",
    self_talk_anchors: [
      { text: "Ich warte gerade auf Gefühl.", when: "Wenn du auf die richtige Stimmung wartest" },
      { text: "Trotzdem handeln.", when: "In der nächsten kleinen funktionalen Handlung" },
      { text: "Das zählt.", when: "Wenn du die Handlung bewusst als Evidenz speicherst" },
    ],
    variants: {
      training: "Achte besonders auf Momente, in denen du erst lockerer, sicherer oder 'mehr drin' sein willst, bevor du handelst.",
      rest: "Übertrage den Tag auf Gespräche, Entscheidungen, Arbeit, Auftreten und Alltagshandlungen.",
      match: "Kurzversion: Warten auf Gefühl erkennen → trotzdem handeln → Handlung als Beweis speichern.",
    },
  },
  {
    day_id: 11,
    title: "Lernen braucht Unsicherheit",
    phase: "Phase I — Sichtbar werden",
    week: 2,
    line: "Growth vs Winning",
    lens: "Wenn ich nur dort bleibe, wo mein System sich schon sicher fühlt, lerne ich oft weniger, als ich denke.",
    primary_mechanism: "Prediction Error / Exploration",
    today_trigger: "Sobald du merkst, dass du lieber das tust, was schon klappt, statt das, was dich wirklich wachsen lässt, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von Sicherheitsschleifen zu bewusst gewähltem Lernraum.",
    science_bite: "Dein Gehirn lernt besonders stark dort, wo etwas nicht ganz so läuft, wie es schon erwartet wurde. Wenn du nur in sicheren Schleifen bleibst, stabilisierst du oft eher Bekanntes, statt wirklich etwas Neues zu entwickeln. Unsicherheit ist deshalb heute nicht das Problem, sondern oft der Preis echter Entwicklung.",
    tasks: [
      {
        id: "d11-t1",
        title: "Erkenne die Sicherheitsschleife",
        trigger: "Wenn du dazu neigst, nur das zu tun, was sich sicher, kompetent oder ordentlich anfühlt",
        when_to_use: "Bei Übungen, in technischen Situationen, in Duellen, in Lernphasen oder wenn du lieber auf Bekanntes zurückgreifst",
        action: "Frag dich kurz: 'Bleibe ich gerade im Sicheren — oder im Lernraum?'",
        why: "Echte Entwicklung wird oft nicht nur durch Fehlervermeidung blockiert, sondern durch zu viel Sicherheitssuche.",
        explanation: "Viele Athleten sehen nur offensichtliche Vermeidung. Schwieriger zu erkennen ist die stille Lernbremse: nur saubere Lösungen wählen, nur Bekanntes spielen, nur dort aktiv werden, wo man ordentlich wirkt. Heute machst du diese Schleife sichtbar.",
        self_talk: "Sicher oder Lernraum?",
        micro_reframe: "Nicht alles, was sich gut anfühlt, bringt mich gerade wirklich weiter.",
        reframe_step: {
          trigger: "Ich greife automatisch zur sicheren Variante.",
          reframe: "Bevor ich sie wähle, prüfe ich: Ist das gerade wirklich Entwicklung?",
          anchor: "Sicher oder Lernraum?",
        },
        system_function: "Exploration Awareness",
        icon: "eye",
      },
      {
        id: "d11-t2",
        title: "Wähle einen echten Lernreiz",
        trigger: "Nachdem du bemerkt hast, dass du in der Sicherheitsschleife bist",
        when_to_use: "In einer Situation, in der du bewusst etwas Anspruchsvolleres, Offeneres oder Unsichereres wählen kannst",
        action: "Wähle heute mindestens einmal bewusst die Variante, die dich fordert statt nur bestätigt.",
        why: "Tag 11 soll nicht nur Unsicherheit erkennen, sondern einen ersten aktiven Schritt in echten Lernraum auslösen.",
        explanation: "Das heißt nicht Chaos oder blinder Mut. Es heißt: Nimm den Lernreiz, nicht nur die saubere Selbstbestätigung. Such den Kontakt, fordere mehr Verantwortung, bleib in einer schwierigen technischen Situation, geh nicht nur in die sichere Wiederholung.",
        self_talk: "Geh in den Lernraum.",
        micro_reframe: "Unsicherheit ist heute kein Beweis gegen mich, sondern oft die Tür zu Entwicklung.",
        reframe_step: {
          trigger: "Ich habe die Sicherheitsschleife erkannt.",
          reframe: "Jetzt wähle ich bewusst eine Version, die mich wirklich fordert.",
          anchor: "Geh in den Lernraum.",
        },
        system_function: "Exploration Choice",
        icon: "flame",
      },
      {
        id: "d11-t3",
        title: "Schütze nicht dein Bild, schütze den Lernprozess",
        trigger: "Wenn Unsicherheit direkt Beweisdrang, Rückzug oder Bildschutz auslöst",
        when_to_use: "Vor allem dann, wenn du dich in der herausfordernden Situation plötzlich kleiner, vorsichtiger oder defensiver machen willst",
        action: "Bleib in der Situation offen genug, dass Lernen weiter möglich bleibt.",
        why: "Der eigentliche Bruch ist nicht nur, in Unsicherheit hineinzugehen, sondern dort nicht sofort wieder in Schutzlogik zu kippen.",
        explanation: "Viele Athleten gehen kurz in den Lernraum und springen beim ersten unangenehmen Signal direkt zurück in Bildschutz. Heute ist der entscheidende Schritt, die Offenheit kurz zu halten, statt sie sofort wieder zu schließen.",
        self_talk: "Offen bleiben.",
        micro_reframe: "Nicht mein Bild muss heute geschützt werden, sondern mein Lernraum.",
        reframe_step: {
          trigger: "Unsicherheit löst sofort Schutz aus.",
          reframe: "Ich muss mich hier nicht sofort absichern. Ich bleibe kurz offen genug, um wirklich zu lernen.",
          anchor: "Offen bleiben.",
        },
        system_function: "Learning Protection",
        icon: "sparkles",
      },
    ],
    journal: {
      title: "Wo habe ich heute Sicherheit gesucht — und wo Lernraum gewählt?",
      questions: [
        { id: "d11-j1", question: "In welchen Momenten wollte ich heute lieber im Sicheren bleiben, statt wirklich zu lernen?", placeholder: "Beschreibe die Situation möglichst konkret." },
        { id: "d11-j2", question: "Wo habe ich heute bewusst einen echten Lernreiz gewählt?", placeholder: "Was war daran unsicher, offen oder fordernd?" },
        { id: "d11-j3", question: "Wann wollte mein System in Unsicherheit sofort wieder Schutz oder Bestätigung suchen?", placeholder: "Wie hat sich das gezeigt?" },
        { id: "d11-j4", question: "Was zeigt mir das darüber, wie stark ich Lernen noch an Sicherheit knüpfe?", placeholder: "Formuliere es so klar wie möglich." },
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist — auch etwas, das unangenehm war und dir echten Lernraum gezeigt hat.",
      free_reflection_prompt: "Was zeigt mir dieser Tag darüber, wie ich bisher Sicherheit mit Entwicklung verwechselt habe?",
    },
    gratitude_prompt: "Welche unangenehme Situation heute war vielleicht genau der Lernraum, den ich gebraucht habe?",
    self_talk_anchors: [
      { text: "Sicher oder Lernraum?", when: "Wenn du zur bequemen Variante greifen willst" },
      { text: "Geh in den Lernraum.", when: "Wenn du bewusst die forderndere Option wählst" },
      { text: "Offen bleiben.", when: "Wenn Unsicherheit sofort Schutz auslöst" },
    ],
    variants: {
      training: "Nutze technische Situationen, Duelle, neue Muster und fordernde Übungsformen als Material.",
      rest: "Übertrage den Tag auf unangenehme Aufgaben, schwierige Gespräche, Lernen, Disziplin und Entscheidungen im Alltag.",
      match: "Kurzversion: Sicherheitsschleife erkennen → echten Lernraum wählen → nicht sofort in Schutz kippen.",
    },
  },
  {
    day_id: 12,
    title: "Exzellenz ist nicht Wirkung",
    phase: "Phase I — Sichtbar werden",
    week: 2,
    line: "Ego vs Inner Excellence",
    lens: "Ich kann Qualität wählen, ohne dass mein Fokus ständig auf Wirkung, Bild oder Performance nach außen rutscht.",
    primary_mechanism: "Image-to-Quality Reorientation",
    today_trigger: "Sobald du merkst, dass du eher gut wirken, beeindrucken oder dein Bild schützen willst, als sauber zu handeln, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von Wirkung zu Qualität — und von Selbstinszenierung zu echter Exzellenz.",
    science_bite: "Wirkung und Qualität sind nicht dasselbe. Viele Athleten handeln so, dass sie stark, cool, sicher oder besonders wirken. Exzellenz funktioniert anders: Sie richtet Aufmerksamkeit auf die Aufgabe, die Präzision, den Beitrag und die saubere Ausführung. Sobald dein Fokus stärker an Wirkung hängt als an echter Qualität, wird Leistung oft enger, künstlicher oder defensiver.",
    tasks: [
      {
        id: "d12-t1",
        title: "Erkenne den Wirkungsfokus",
        trigger: "Wenn du stark daran hängst, wie du rüberkommst, wie du aussiehst oder wie andere dich wahrnehmen",
        when_to_use: "Bei Beobachtung, Vergleich, Fehlern, Lob, Unsicherheit, Social Pressure oder Beweisdrang",
        action: "Frag dich kurz: 'Geht es mir hier gerade um Wirkung — oder um Qualität?'",
        why: "Tag 12 muss zuerst sichtbar machen, wann Aufmerksamkeit von der Aufgabe auf Außenwirkung kippt.",
        explanation: "Wirkungsfokus kann laut oder still sein: beeindrucken wollen, cool wirken, keine Schwäche zeigen, zu stark an Lob oder Kritik hängen, eine Rolle spielen statt ehrlich zu handeln. Heute machst du diesen Fokus sichtbar.",
        self_talk: "Wirkung oder Qualität?",
        micro_reframe: "Gut wirken und gut handeln sind nicht automatisch dasselbe.",
        reframe_step: {
          trigger: "Ich hänge stark daran, wie ich wirke.",
          reframe: "Bevor ich reagiere, kläre ich zuerst: Suche ich gerade Wirkung oder echte Qualität?",
          anchor: "Wirkung oder Qualität?",
        },
        system_function: "Image Awareness",
        icon: "eye",
      },
      {
        id: "d12-t2",
        title: "Frage nach der sauberen Sache",
        trigger: "Nachdem du den Wirkungsfokus erkannt hast",
        when_to_use: "Sobald du wieder zur Aufgabe und echten Exzellenz zurückfinden willst",
        action: "Frag dich: 'Was ist hier die saubere Sache?' und richte dich daran aus.",
        why: "Der Wechsel von Wirkung zu Exzellenz braucht einen klaren neuen Aufmerksamkeitsort.",
        explanation: "Nicht: Wie sehe ich aus? Nicht: Was denken die anderen? Sondern: Was ist technisch, menschlich, sportlich oder situativ die saubere Handlung? Genau dieser Fokus trennt Exzellenz von Selbstdarstellung.",
        self_talk: "Was ist hier die saubere Sache?",
        micro_reframe: "Exzellenz richtet sich an der Wahrheit des Moments aus, nicht an Wirkung.",
        reframe_step: {
          trigger: "Ich habe den Wirkungsfokus erkannt.",
          reframe: "Jetzt gehe ich weg von Außenwirkung und zurück zu echter Qualität.",
          anchor: "Was ist hier die saubere Sache?",
        },
        system_function: "Quality Redirect",
        icon: "target",
      },
      {
        id: "d12-t3",
        title: "Wähle ehrliche Qualität",
        trigger: "Wenn du zwischen performativer und echter Handlung wählen kannst",
        when_to_use: "In Situationen, in denen du beeindrucken, dich schützen oder 'gut aussehen' könntest",
        action: "Wähle bewusst die ehrlichere, dienlichere und qualitativ sauberere Handlung.",
        why: "Exzellenz wird erst real, wenn sie Verhalten übernimmt und nicht nur eine schöne Idee bleibt.",
        explanation: "Das kann heißen: Hilfe annehmen, klarer kommunizieren, eine Korrektur annehmen, auf Aufgabe statt Show gehen, weniger performen und mehr sauber arbeiten. Tag 12 will echte Qualität sichtbarer machen als Wirkung.",
        self_talk: "Qualität vor Wirkung.",
        micro_reframe: "Was langfristig trägt, ist nicht gute Wirkung, sondern echte Qualität.",
        reframe_step: {
          trigger: "Ich könnte jetzt performen oder sauber handeln.",
          reframe: "Heute wähle ich nicht die schönere Show, sondern die ehrlichere Qualität.",
          anchor: "Qualität vor Wirkung.",
        },
        system_function: "Embodied Excellence",
        icon: "heart",
      },
    ],
    journal: {
      title: "Wann ging es heute um Wirkung — und wann um echte Qualität?",
      questions: [
        { id: "d12-j1", question: "In welchen Momenten ging es mir heute stärker um Wirkung als um echte Qualität?", placeholder: "Beschreibe die Situation konkret." },
        { id: "d12-j2", question: "Wodurch wurde dieser Wirkungsfokus ausgelöst?", placeholder: "Bewertung, Unsicherheit, Vergleich, Lob, Fehler ..." },
        { id: "d12-j3", question: "Konnte ich heute mindestens einmal zurück zur sauberen Sache schalten?", placeholder: "Wie sah diese Rückkehr aus?" },
        { id: "d12-j4", question: "Wann habe ich heute eher ehrliche Qualität gewählt als gute Wirkung?", placeholder: "Welche Handlung war dafür ein gutes Beispiel?" },
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist — auch etwas, das dir den Unterschied zwischen Wirkung und Qualität klarer gemacht hat.",
      free_reflection_prompt: "Was zeigt mir dieser Tag über mein aktuelles Verhältnis von Wirkung, Bild und Exzellenz?",
    },
    gratitude_prompt: "Welche Situation heute hat mir geholfen, Wirkung und echte Qualität besser zu unterscheiden?",
    self_talk_anchors: [
      { text: "Wirkung oder Qualität?", when: "Wenn dein Fokus auf Außenwirkung kippt" },
      { text: "Was ist hier die saubere Sache?", when: "Wenn du zurück zur Aufgabe willst" },
      { text: "Qualität vor Wirkung.", when: "Wenn du die Handlung bewusst wählen musst" },
    ],
    variants: {
      training: "Nutze Beobachtung, Vergleich, Lob, Fehler, Unsicherheit und Beweisdrang als Hauptmaterial.",
      rest: "Übertrage den Tag auf Social Media, Gespräche, Vergleich, Selbstbildpflege und performatives Verhalten im Alltag.",
      match: "Kurzversion: Wirkung oder Aufgabe? → Was ist die saubere Sache? → Qualität vor Wirkung.",
    },
  },
  {
    day_id: 13,
    title: "Gedanken sind Ereignisse, keine Befehle",
    phase: "Phase I — Sichtbar werden",
    week: 2,
    line: "Learning vs Judgement",
    lens: "Nicht jeder innere Kommentar verdient sofort Gehorsam.",
    primary_mechanism: "Metacognitive Defusion",
    today_trigger: "Sobald dein Kopf laut wird und Gedanken so klingen, als müssten sie sofort geglaubt oder befolgt werden, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von Gedanke = Regisseur zu Gedanke = inneres Ereignis, das nicht automatisch mein Verhalten bestimmen muss.",
    science_bite: "Innere Sprache wirkt oft wie Wahrheit oder Befehl: 'Lass das', 'Du bist raus', 'Heute läuft gar nichts', 'Mach bloß keinen Fehler'. Genau deshalb steuern Gedanken Verhalten so stark. Der erste Schritt ist nicht, alle Gedanken zu stoppen, sondern zu merken: Da ist ein Kommentar — aber ich muss ihm nicht automatisch folgen.",
    tasks: [
      {
        id: "d13-t1",
        title: "Hör den Kommentar",
        trigger: "Wenn innerlich ein harter, warnender, bewertender oder drängender Gedanke auftaucht",
        when_to_use: "Bei Fehlern, Druck, Selbstkritik, Vergleich, Unsicherheit, Grübeln oder innerer Unruhe",
        action: "Greif den Gedanken in einer kurzen inneren Formulierung: 'Mein Kopf sagt gerade ...'",
        why: "Du sollst die innere Sprache nicht nur erleben, sondern als Kommentar hörbar machen.",
        explanation: "Gedanken wirken oft so schnell und direkt, dass sie wie Realität erscheinen. Heute verlangsamst du den Prozess minimal und machst den Kommentar als Kommentar sichtbar.",
        self_talk: "Mein Kopf sagt gerade ...",
        micro_reframe: "Was in mir auftaucht, ist nicht automatisch ein Befehl.",
        reframe_step: {
          trigger: "Ein lauter oder harter Gedanke taucht auf.",
          reframe: "Bevor ich ihm glaube, mache ich ihn erst einmal als Kommentar sichtbar.",
          anchor: "Mein Kopf sagt gerade ...",
        },
        system_function: "Thought Awareness",
        icon: "brain",
      },
      {
        id: "d13-t2",
        title: "Gedanke oder Befehl?",
        trigger: "Nachdem du den Kommentar gehört hast",
        when_to_use: "Direkt nach Aufgabe 1, solange der Gedanke noch Zugkraft hat",
        action: "Frag dich kurz: 'Ist das gerade ein Gedanke — oder behandle ich ihn schon wie einen Befehl?'",
        why: "Tag 13 soll die Befehlskraft innerer Sprache brechen, nicht nur Gedanken benennen.",
        explanation: "Viele Gedanken wirken nicht nur wie Information, sondern wie Handlungsanweisung. Genau diese automatische Gehorsamsreaktion soll heute sichtbar werden.",
        self_talk: "Gedanke oder Befehl?",
        micro_reframe: "Nicht jeder innere Satz verdient sofort Gehorsam.",
        reframe_step: {
          trigger: "Der Gedanke zieht direkt mein Verhalten mit.",
          reframe: "Jetzt prüfe ich: Rede ich hier mit einem Befehl — oder mit einem Ereignis?",
          anchor: "Gedanke oder Befehl?",
        },
        system_function: "Defusion Check",
        icon: "shield",
      },
      {
        id: "d13-t3",
        title: "Zurück an die Aufgabe",
        trigger: "Wenn du merkst, dass ein Gedanke Verhalten, Fokus oder Körper übernehmen will",
        when_to_use: "In der direkt nächsten Aktion oder Szene",
        action: "Binde dein Verhalten bewusst zurück an die Aufgabe statt an den Kommentar.",
        why: "Tag 13 soll Gedankenarbeit direkt mit Verhalten verknüpfen.",
        explanation: "Es reicht nicht, nur zu erkennen, dass ein Gedanke da ist. Heute trainierst du, Verhalten nicht automatisch von innerer Sprache dirigieren zu lassen, sondern wieder an die Aufgabe zu koppeln.",
        self_talk: "Zurück an die Aufgabe.",
        micro_reframe: "Mein Kommentar muss nicht mein Regisseur sein.",
        reframe_step: {
          trigger: "Ich merke, dass der Gedanke mich zieht.",
          reframe: "Jetzt führe ich mein Verhalten zurück an die reale Aufgabe.",
          anchor: "Zurück an die Aufgabe.",
        },
        system_function: "Behavior Rebinding",
        icon: "target",
      },
    ],
    journal: {
      title: "Welche Gedanken wollten heute mein Regisseur sein?",
      questions: [
        { id: "d13-j1", question: "Welche inneren Kommentare waren heute am lautesten oder am häufigsten?", placeholder: "Schreib sie möglichst konkret auf." },
        { id: "d13-j2", question: "Wann hat sich ein Gedanke heute eher wie ein Befehl als wie ein inneres Ereignis angefühlt?", placeholder: "Beschreibe die Situation." },
        { id: "d13-j3", question: "Konnte ich heute mindestens einmal merken: Das ist ein Gedanke, kein Regisseur?", placeholder: "Was hat das verändert?" },
        { id: "d13-j4", question: "Wann habe ich mein Verhalten trotz innerem Kommentar zurück an die Aufgabe gebunden?", placeholder: "Wie sah das konkret aus?" },
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist — mindestens 1 leichte, 1 schwierige und 1 Sache, die dir gezeigt hat, dass Gedanken nicht automatisch dein Verhalten führen müssen.",
      free_reflection_prompt: "Was zeigt mir dieser Tag über meine innere Sprache und ihre Befehlskraft?",
    },
    gratitude_prompt: "Welche Situation heute hat mir gezeigt, dass ein Gedanke nicht automatisch mein Regisseur sein muss?",
    self_talk_anchors: [
      { text: "Mein Kopf sagt gerade ...", when: "Wenn der innere Kommentar laut wird" },
      { text: "Gedanke oder Befehl?", when: "Wenn du Zugkraft im Gedanken spürst" },
      { text: "Zurück an die Aufgabe.", when: "Wenn du Verhalten wieder anbinden willst" },
    ],
    variants: {
      training: "Nutze Fehler, Druck, Selbstkritik, Vergleich und innere Warnsätze als Hauptmaterial.",
      rest: "Übertrage den Tag auf Vergleich, Grübeln, Prokrastination, Social Media, Gespräche und Entscheidungen im Alltag.",
      match: "Kurzversion: Kommentar hören → Gedanke oder Befehl? → zurück an die Aufgabe.",
    },
  },
  {
    day_id: 14,
    title: "Ergebnisdenken raubt Gegenwart",
    phase: "Phase I — Sichtbar werden",
    week: 2,
    line: "Process vs Result",
    lens: "Sobald mein Fokus zu stark am Ausgang hängt, verliere ich oft Gegenwart und Prozessqualität.",
    primary_mechanism: "Outcome Attentional Capture",
    today_trigger: "Sobald dein Kopf auf Ausgang, Bewertung, Endresultat oder spätere Konsequenzen springt, statt bei der aktuellen Aufgabe zu bleiben, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von Ergebnisbindung zu Prozesspunkt und Gegenwart.",
    science_bite: "Ergebnisdenken wirkt oft wie Fokus, ist aber häufig Aufmerksamkeitsraub. Sobald dein Kopf stärker beim Ausgang als bei der aktuellen Aufgabe lebt, steht dir weniger Präsenz für Wahrnehmung, Entscheidung und Ausführung zur Verfügung. Der Prozess ist deshalb nicht eine nette Idee, sondern dein eigentlicher Arbeitsort.",
    tasks: [
      {
        id: "d14-t1",
        title: "Erkenne den Ausgangs-Zug",
        trigger: "Wenn dein Kopf stark zum Ergebnis, zu Bewertung oder zu späteren Konsequenzen zieht",
        when_to_use: "Vor wichtigen Szenen, nach Fehlern, unter Beobachtung, in Druckphasen oder wenn es 'zählen' soll",
        action: "Frag dich kurz: 'Bin ich gerade beim Ausgang — oder bei der Aktion?'",
        why: "Du sollst Ergebnisbindung zuerst als Aufmerksamkeitsproblem erkennen.",
        explanation: "Viele Athleten denken, sie müssten ans Ergebnis denken, um ernst zu sein. In Wahrheit zieht sie genau das oft aus der Gegenwart. Heute machst du diesen Ausgangs-Zug sichtbar.",
        self_talk: "Ausgang oder Aktion?",
        micro_reframe: "Ergebnisdenken fühlt sich wichtig an, zieht mich aber oft aus meiner eigentlichen Arbeit.",
        reframe_step: {
          trigger: "Mein Kopf springt zum Ausgang.",
          reframe: "Bevor ich weiter in Richtung Ergebnis kippe, prüfe ich meinen aktuellen Aufmerksamkeitsort.",
          anchor: "Ausgang oder Aktion?",
        },
        system_function: "Outcome Awareness",
        icon: "eye",
      },
      {
        id: "d14-t2",
        title: "Finde deinen Prozesspunkt",
        trigger: "Nachdem du Ergebnisbindung erkannt hast",
        when_to_use: "Direkt danach, bevor du weiter in Bewertung oder Zukunft gehst",
        action: "Bestimme eine konkrete Sache, die jetzt wirklich deine Aufgabe ist.",
        why: "Der Prozess wird nur dann handhabbar, wenn er konkret statt diffus ist.",
        explanation: "Nicht 'mehr fokussiert sein'. Nicht 'im Moment bleiben'. Sondern etwas Klareres: erster Kontakt, Laufweg, Körperspannung, Kommunikation, Timing, Haltung, Attacke auf die Aktion, nächste technische Aufgabe.",
        self_talk: "Mein Prozesspunkt ist ...",
        micro_reframe: "Ich brauche nicht den ganzen Ausgang. Ich brauche meinen nächsten Arbeitsort.",
        reframe_step: {
          trigger: "Ich habe den Ausgangs-Zug erkannt.",
          reframe: "Jetzt gebe ich meiner Aufmerksamkeit wieder einen konkreten Prozesspunkt.",
          anchor: "Mein Prozesspunkt ist ...",
        },
        system_function: "Process Redirect",
        icon: "target",
      },
      {
        id: "d14-t3",
        title: "Bewerte später, handle jetzt",
        trigger: "Wenn dein Kopf die Szene schon bewerten, absichern oder gegen spätere Folgen kontrollieren will",
        when_to_use: "In der direkt nächsten Aktion oder Szene",
        action: "Schieb Bewertung bewusst nach hinten und geh jetzt voll an deinen Prozesspunkt.",
        why: "Der Tag soll nicht nur Erkenntnis bringen, sondern dein Verhalten wieder in Gegenwart und Aufgabe verankern.",
        explanation: "Bewerten kannst du später. Heute ist entscheidend: Bin ich gerade an meiner Aufgabe oder schon im Ergebnisfilm? Du trainierst, Handlung und Präsenz wieder vor Bewertung zu setzen.",
        self_talk: "Bewertung später.",
        micro_reframe: "Nicht jede Szene muss sofort beurteilt werden. Erst arbeiten, dann auswerten.",
        reframe_step: {
          trigger: "Ich will die Szene schon absichern oder bewerten.",
          reframe: "Jetzt arbeite ich erst. Bewertung kann warten.",
          anchor: "Bewertung später.",
        },
        system_function: "Process Protection",
        icon: "shield",
      },
    ],
    journal: {
      title: "Wo hat mich Ergebnisdenken heute aus der Aufgabe gezogen?",
      questions: [
        { id: "d14-j1", question: "In welchen Momenten war mein Kopf heute stärker beim Ausgang als bei der aktuellen Aktion?", placeholder: "Beschreibe die Situation." },
        { id: "d14-j2", question: "Was war in dieser Situation mein konkreter Prozesspunkt?", placeholder: "Woran konntest du wirklich arbeiten?" },
        { id: "d14-j3", question: "Konnte ich mindestens einmal Bewertung nach hinten schieben und wieder an die Aufgabe gehen?", placeholder: "Wie sah das konkret aus?" },
        { id: "d14-j4", question: "Was zeigt mir das darüber, wie stark Ergebnisbindung noch meine Gegenwart raubt?", placeholder: "Formuliere den Kern möglichst klar." },
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist — auch etwas aus einem Moment, in dem dein Kopf laut beim Ausgang war.",
      free_reflection_prompt: "Was zeigt mir dieser Tag über meinen Aufmerksamkeitsort unter Bedeutung, Bewertung oder Druck?",
    },
    gratitude_prompt: "Welche Situation heute hat mir gezeigt, dass Prozess nicht Theorie, sondern mein Arbeitsort ist?",
    self_talk_anchors: [
      { text: "Ausgang oder Aktion?", when: "Wenn dein Kopf zum Ergebnis zieht" },
      { text: "Mein Prozesspunkt ist ...", when: "Wenn du den Arbeitsort konkret machen willst" },
      { text: "Bewertung später.", when: "Wenn du dich wieder an Gegenwart binden willst" },
    ],
    variants: {
      training: "Nutze Druckphasen, Fehler, Beobachtung, Vergleich und bedeutungsvolle Szenen als Material.",
      rest: "Übertrage den Tag auf Zukunftsdenken, Erwartungen, Leistungsgrübeln und Alltagssituationen mit Ergebnisbindung.",
      match: "Kurzversion: Ausgang oder Aktion? → Prozesspunkt finden → Bewertung später.",
    },
  },
  {
    day_id: 15,
    title: "Präsenz kann aktiv zurückgeholt werden",
    phase: "Phase II — Umcodieren",
    week: 3,
    line: "Presence",
    lens: "Präsenz ist nicht nur etwas, das ich verliere oder habe — ich kann sie aktiv wiederherstellen.",
    primary_mechanism: "Attentional Reset",
    today_trigger: "Sobald du merkst, dass dein Kopf weg ist oder Ergebnis, Gedanken, Fehler oder Spannung dich aus der Gegenwart ziehen, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von Präsenz als Beobachtung zu Präsenz als steuerbarer Rückkehrbewegung.",
    science_bite: "In Woche 1 ging es darum, Drift überhaupt zu erkennen. Ab heute beginnt etwas Neues: Rückkehr wird trainierbar. Dein System muss nicht darauf warten, dass Präsenz einfach wiederkommt. Es kann lernen, einen klaren Rückkehrimpuls zu setzen und Aufmerksamkeit aktiv an die Aufgabe zurückzubinden.",
    tasks: [
      {
        id: "d15-t1",
        title: "Erkenne den Verlust schneller",
        trigger: "Wenn du merkst, dass dein Fokus weggeht oder Ergebnis, Gedanken, Fehler oder Spannung dich ziehen",
        when_to_use: "In echten Leistungssituationen, nach Fehlern, in Druckmomenten oder wenn dein Kopf plötzlich nicht mehr bei der Szene ist",
        action: "Markiere den Verlust früher und klarer: 'Nicht da.'",
        why: "Phase II beginnt nicht mit Perfektion, sondern mit schnellerer und präziserer Rückkehrvorbereitung.",
        explanation: "Der Unterschied zu Tag 1 ist heute: Du sollst den Verlust nicht nur irgendwann bemerken, sondern früher und direkter. Je früher du ihn erkennst, desto kleiner wird der Abstand zur Rückkehr.",
        self_talk: "Nicht da.",
        micro_reframe: "Der Verlust ist nicht das Ende der Präsenz, sondern der Startpunkt der Rückkehr.",
        reframe_step: {
          trigger: "Ich merke, dass mein Kopf weg ist.",
          reframe: "Gut — jetzt setze ich die Rückkehr bewusst ein, statt nur den Verlust zu registrieren.",
          anchor: "Nicht da.",
        },
        system_function: "Faster Awareness",
        icon: "eye",
      },
      {
        id: "d15-t2",
        title: "Setze das Rückkehrsignal",
        trigger: "Direkt nachdem du den Verlust erkannt hast",
        when_to_use: "Sofort nach Aufgabe 1, bevor dein Kopf wieder in Bewertung, Ausgang oder Kommentar kippt",
        action: "Setze bewusst dein Rückkehrsignal und richte deinen Fokus sofort an einen klaren Aufmerksamkeitsanker.",
        why: "Präsenz soll ab heute nicht nur bemerkt, sondern aktiv zurückgeholt werden.",
        explanation: "Das Rückkehrsignal ist kein Motivationsspruch, sondern ein praktischer Umschaltmoment. Es sagt deinem System: Zurück. Hier. Diese Sache. Der Anker muss konkret sein: Ball, Kontakt, Gegner, Position, Atmung, Kommunikation, Prozesspunkt.",
        self_talk: "Zurück. Hier.",
        micro_reframe: "Ich muss nicht warten, bis ich wieder präsent bin. Ich kann Präsenz bewusst einleiten.",
        reframe_step: {
          trigger: "Ich habe den Verlust erkannt.",
          reframe: "Jetzt setze ich nicht nur Einsicht, sondern aktive Rückkehr.",
          anchor: "Zurück. Hier.",
        },
        system_function: "Active Reset",
        icon: "sunrise",
      },
      {
        id: "d15-t3",
        title: "Verankere die Rückkehr in Handlung",
        trigger: "Nachdem du deinen Aufmerksamkeitsanker wieder gesetzt hast",
        when_to_use: "In der direkt nächsten Aktion",
        action: "Zeige die Rückkehr sofort in einer klaren, sauberen Handlung.",
        why: "Präsenz wird nur dann stabiler, wenn Rückkehr nicht nur innerlich, sondern auch verhaltensbezogen gespeichert wird.",
        explanation: "Nicht nur wieder 'fokussiert fühlen' wollen. Sondern in der nächsten Szene sichtbar machen: klarer Kontakt, wieder anbieten, sauberer Laufweg, klare Kommunikation, aktivere Präsenz.",
        self_talk: "Zeig die Rückkehr.",
        micro_reframe: "Die Rückkehr ist erst vollständig, wenn sie in meiner Handlung sichtbar wird.",
        reframe_step: {
          trigger: "Ich habe den Anker wieder gesetzt.",
          reframe: "Jetzt speichere ich die Rückkehr durch eine sichtbare saubere Handlung.",
          anchor: "Zeig die Rückkehr.",
        },
        system_function: "Embodied Return",
        icon: "target",
      },
    ],
    journal: {
      title: "Wie habe ich Präsenz heute aktiv zurückgeholt?",
      questions: [
        { id: "d15-j1", question: "In welchen Momenten habe ich heute schneller gemerkt, dass ich nicht mehr ganz da war?", placeholder: "Beschreibe die Situation." },
        { id: "d15-j2", question: "Welches Rückkehrsignal oder welcher Aufmerksamkeitsanker hat heute am besten funktioniert?", placeholder: "Was hat dich konkret zurückgebracht?" },
        { id: "d15-j3", question: "Konnte ich die Rückkehr heute mindestens einmal direkt in Handlung sichtbar machen?", placeholder: "Wie sah diese Handlung aus?" },
        { id: "d15-j4", question: "Was zeigt mir das darüber, wie steuerbar Präsenz für mich bereits werden kann?", placeholder: "Formuliere die Einsicht möglichst klar." },
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist — auch etwas aus einem Moment, in dem du Präsenz bewusst zurückgeholt hast.",
      free_reflection_prompt: "Was zeigt mir dieser Tag über den Unterschied zwischen Präsenz bemerken und Präsenz aktiv wiederherstellen?",
    },
    gratitude_prompt: "Welcher Moment heute hat mir gezeigt, dass Präsenz nicht nur verloren gehen, sondern auch bewusst zurückkommen kann?",
    self_talk_anchors: [
      { text: "Nicht da.", when: "Wenn du den Verlust schneller erkennst" },
      { text: "Zurück. Hier.", when: "Wenn du das Rückkehrsignal setzt" },
      { text: "Zeig die Rückkehr.", when: "In der direkt nächsten Handlung" },
    ],
    variants: {
      training: "Nutze Fehler, Ergebnisdenken, Druck, innere Kommentare und Spannungsmomente als Material für aktive Rückkehr.",
      rest: "Übertrage den Tag auf Handy, Gespräche, Grübeln, Unruhe und Alltagssituationen, in denen dein Kopf weggeht.",
      match: "Kurzversion: Verlust früher merken → Rückkehrsignal setzen → Rückkehr in Handlung zeigen.",
    },
  },
  // ─────────── DAYS 16–20 (Phase II — Umcodieren, Maximum-Qualität) ───────────
  {
    day_id: 16,
    title: "Handle für etwas Größeres",
    phase: "Phase II — Umcodieren",
    week: 3,
    line: "Fear vs Love / Purpose",
    lens: "Ich kann aus einem größeren Grund handeln statt nur aus Schutz, Beweis oder Angst.",
    primary_mechanism: "Meaning-Based Motivation Shift",
    today_trigger: "Sobald du merkst, dass du gerade vor allem aus Schutz, Beweis, Angst oder Bildsicherung handelst, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von Selbstschutz zu größerem Grund — und von enger Motivation zu dienlicher Motivation.",
    science_bite: "Motivation ist nicht nur Energie, sondern auch Richtung. Viele Handlungen wirken stark, werden aber innerlich von Schutz gesteuert: nicht versagen, nicht schwach aussehen, nicht verlieren, nicht negativ auffallen. Heute trainierst du einen anderen Motor: Handlung aus einem größeren Grund. Nicht weil das schöner klingt, sondern weil dein System unter Bedeutung oft weiter, klarer und stabiler handelt.",
    tasks: [
      {
        id: "d16-t1",
        title: "Erkenne den Schutzmotor",
        trigger: "Wenn du merkst, dass du stark von Angst, Beweisdrang, Bewertung oder Bildschutz gesteuert bist",
        when_to_use: "Vor wichtigen Szenen, bei Beobachtung, nach Fehlern, bei Unsicherheit oder wenn du dich absichern willst",
        action: "Frag dich kurz: 'Handle ich gerade aus Schutz — oder aus etwas Größerem?'",
        why: "Du kannst deine Motivationsrichtung erst ändern, wenn du den alten Motor klar erkennst.",
        explanation: "Schutz kann sehr unterschiedlich aussehen: vorsichtiger werden, Recht behalten wollen, sich klein machen, nichts riskieren, auf Wirkung spielen, Kontrolle erzwingen oder einfach nur Schaden vermeiden wollen. Heute machst du diesen Motor sichtbar.",
        self_talk: "Schutz oder größerer Grund?",
        micro_reframe: "Nicht jede starke Spannung ist echter Antrieb — oft ist sie nur Schutzlogik.",
        reframe_step: {
          trigger: "Ich spüre starken inneren Druck oder Beweisdrang.",
          reframe: "Bevor ich handle, prüfe ich, aus welchem Motor ich gerade gehe.",
          anchor: "Schutz oder größerer Grund?"
        },
        system_function: "Motivation Awareness",
        icon: "Search"
      },
      {
        id: "d16-t2",
        title: "Finde deinen größeren Grund",
        trigger: "Nachdem du bemerkt hast, dass dein System gerade eher aus Schutz handelt",
        when_to_use: "Direkt vor einer Handlung, in der du Motivation neu ausrichten willst",
        action: "Frag dich: 'Wofür spiele ich hier gerade wirklich?' und formuliere einen größeren Grund.",
        why: "Meaning wird nur dann wirksam, wenn es konkret und situativ spürbar wird.",
        explanation: "Ein größerer Grund kann sein: Beitrag, Team, Wahrheit, Wachstum, saubere Ausführung, Verantwortung, Demut, Dienst an der Sache. Nicht abstrakt. Nicht romantisch. Sondern als echter neuer Bezugspunkt in der Situation.",
        self_talk: "Wofür spiele ich gerade wirklich?",
        micro_reframe: "Wenn mein Grund größer wird, muss mein Verhalten nicht mehr nur Schutz sein.",
        reframe_step: {
          trigger: "Ich habe den Schutzmotor erkannt.",
          reframe: "Jetzt richte ich mein Handeln bewusst an etwas Größerem aus.",
          anchor: "Wofür spiele ich gerade wirklich?"
        },
        system_function: "Meaning Activation",
        icon: "Compass"
      },
      {
        id: "d16-t3",
        title: "Handle aus Dienst statt aus Beweis",
        trigger: "Wenn du deinen größeren Grund klarer vor dir hast",
        when_to_use: "In der direkt nächsten relevanten Handlung",
        action: "Setze eine Handlung, die der Sache dient — nicht nur deinem Schutz oder Beweis.",
        why: "Der Tag soll Meaning nicht nur denken, sondern direkt im Verhalten verkörpern.",
        explanation: "Das kann heißen: klar kommunizieren, Verantwortung übernehmen, wieder anbieten, mutig aber sauber handeln, ehrlich bleiben, helfen, präsent bleiben. Wichtig ist: nicht für Bild, sondern für Beitrag.",
        self_talk: "Aus Dienst handeln.",
        micro_reframe: "Mein Verhalten darf heute der Sache dienen, nicht nur meinem Schutz.",
        reframe_step: {
          trigger: "Ich kenne meinen größeren Grund.",
          reframe: "Jetzt übersetze ich ihn in eine sichtbare Handlung.",
          anchor: "Aus Dienst handeln."
        },
        system_function: "Meaning Translation",
        icon: "Handshake"
      }
    ],
    journal: {
      title: "Wofür habe ich heute wirklich gehandelt?",
      questions: [
        { id: "d16-j1", question: "In welchen Momenten war mein Handeln heute eher von Schutz, Beweis oder Angst gesteuert?", placeholder: "Beschreibe die Situation konkret." },
        { id: "d16-j2", question: "Welcher größere Grund war in dieser Situation möglich?", placeholder: "Team, Beitrag, Wahrheit, Wachstum, Verantwortung ..." },
        { id: "d16-j3", question: "Konnte ich heute mindestens einmal spürbar aus diesem größeren Grund handeln?", placeholder: "Wie sah das konkret aus?" },
        { id: "d16-j4", question: "Was zeigt mir das darüber, wofür ich unter Druck oder Bedeutung bisher wirklich spiele?", placeholder: "Formuliere den Kern möglichst klar." }
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist — auch etwas aus einem Moment, in dem du deinen Grund neu ausgerichtet hast.",
      free_reflection_prompt: "Was zeigt mir dieser Tag darüber, wie sehr Schutz oder Beitrag bisher mein Verhalten bestimmen?"
    },
    gratitude_prompt: "Welche Handlung heute hat mir gezeigt, dass ich aus etwas Größerem als Schutz handeln kann?",
    self_talk_anchors: [
      { text: "Schutz oder größerer Grund?", when: "Wenn du innerlich eng oder beweisgetrieben wirst" },
      { text: "Wofür spiele ich gerade wirklich?", when: "Wenn du deinen Motor neu ausrichtest" },
      { text: "Aus Dienst handeln.", when: "In der direkt nächsten Handlung" }
    ],
    variants: {
      training: "Nutze Beobachtung, Fehler, Beweisdrang, Unsicherheit und Verantwortungssituationen als Material.",
      rest: "Übertrage den Tag auf Gespräche, Entscheidungen, Disziplin, Arbeit und Situationen, in denen du dich schützen oder absichern willst.",
      match: "Kurzversion: Schutzmotor erkennen → größeren Grund finden → aus Dienst handeln."
    }
  },
  {
    day_id: 17,
    title: "Beweise formen Selbstbild",
    phase: "Phase II — Umcodieren",
    week: 3,
    line: "Identity vs Performance",
    lens: "Was ich wiederholt tue, wird für mein System zu einem Beweis darüber, wer ich bin.",
    primary_mechanism: "Identity Encoding Through Repeated Evidence",
    today_trigger: "Sobald du merkst, dass dein altes Selbstbild still im Hintergrund mitläuft und deine Handlung begrenzt, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von altem Selbstbild zu bewusst gesammelten Beweisen für eine neue Version von dir.",
    science_bite: "Selbstbild entsteht nicht nur durch Gedanken über dich, sondern auch durch gespeicherte Verhaltensbeweise. Wenn dein System wiederholt erlebt: Ich werde nach Fehlern klein, ich ziehe mich unter Druck zurück, ich übernehme keine Verantwortung, dann wird genau das zu einem stillen inneren Bild von dir. Heute arbeitest du an der Gegenrichtung: kleine Beweise bewusst setzen und als Identitätsmaterial ernst nehmen.",
    tasks: [
      {
        id: "d17-t1",
        title: "Erkenne das alte Bild",
        trigger: "Wenn du innerlich schon zu wissen glaubst, wie du in einer Situation 'eben bist'",
        when_to_use: "Vor Drucksituationen, bei Unsicherheit, nach Fehlern, bei Verantwortung, wenn alte Sätze auftauchen",
        action: "Frag dich: 'Welches alte Bild von mir läuft hier gerade mit?'",
        why: "Du kannst neue Beweise nur bewusst setzen, wenn dir klar wird, gegen welches alte Selbstbild du gerade arbeitest.",
        explanation: "Das alte Bild klingt oft still und vertraut: 'Ich bin halt nicht so stabil', 'Ich ziehe mich da eher zurück', 'Ich bin nicht der Typ für Verantwortung'. Heute machst du diese stillen Identitätssätze sichtbar.",
        self_talk: "Welches alte Bild läuft hier mit?",
        micro_reframe: "Nicht nur die Situation ist da — auch mein altes inneres Bild von mir läuft mit.",
        reframe_step: {
          trigger: "Ich merke, dass ich mich innerlich schon eingeordnet habe.",
          reframe: "Bevor ich handle, mache ich das alte Bild sichtbar.",
          anchor: "Welches alte Bild läuft hier mit?"
        },
        system_function: "Identity Awareness",
        icon: "Mirror"
      },
      {
        id: "d17-t2",
        title: "Setze einen neuen Beweis",
        trigger: "Nachdem dir klarer geworden ist, welches alte Bild gerade mitläuft",
        when_to_use: "In der direkt nächsten passenden Handlung",
        action: "Wähle bewusst eine kleine Handlung, die der alten Version widerspricht und die neue Richtung belegt.",
        why: "Identität ändert sich nicht durch Wunsch, sondern durch wiederholte verhaltensbezogene Evidenz.",
        explanation: "Nicht riesig. Nicht künstlich heroisch. Sondern konkret: wieder anbieten, offen bleiben, Verantwortung nehmen, nach Fehlern präsent bleiben, klar sprechen, nicht kleiner werden, im Prozess bleiben.",
        self_talk: "Setz den Beweis.",
        micro_reframe: "Ich brauche heute keinen großen Beweis — nur einen echten.",
        reframe_step: {
          trigger: "Das alte Bild ist sichtbar.",
          reframe: "Jetzt setze ich bewusst eine kleine Handlung, die ihm widerspricht.",
          anchor: "Setz den Beweis."
        },
        system_function: "Evidence Creation",
        icon: "PlusCircle"
      },
      {
        id: "d17-t3",
        title: "Speichere die Handlung als Beweis",
        trigger: "Direkt nachdem du die neue Handlung gesetzt hast",
        when_to_use: "Sofort nach der konkreten Verhaltensaktion",
        action: "Markiere innerlich bewusst: 'Das zählt als Beweis.'",
        why: "Viele neue Handlungen verpuffen, weil sie innerlich nicht als Identitäts-Evidenz gespeichert werden.",
        explanation: "Alte Beweise werden oft automatisch erinnert. Neue Beweise werden häufig übersehen, weil sie unspektakulär wirken. Heute lernst du, kleine echte Handlungen ernst zu nehmen.",
        self_talk: "Das zählt als Beweis.",
        micro_reframe: "Selbstbild verschiebt sich nicht nur durch Einsicht, sondern durch gespeicherte Handlung.",
        reframe_step: {
          trigger: "Ich habe die neue Handlung gesetzt.",
          reframe: "Jetzt mache ich sie bewusst zu Identitätsmaterial.",
          anchor: "Das zählt als Beweis."
        },
        system_function: "Evidence Encoding",
        icon: "BadgeCheck"
      }
    ],
    journal: {
      title: "Welche Beweise habe ich heute für mein Selbstbild gesammelt?",
      questions: [
        { id: "d17-j1", question: "Welches alte Bild von mir lief heute in einer Situation besonders stark mit?", placeholder: "Beschreibe den Satz oder das Gefühl dahinter." },
        { id: "d17-j2", question: "Welche kleine Handlung habe ich gesetzt, die diesem alten Bild widersprochen hat?", placeholder: "Was war dein konkreter Beweis?" },
        { id: "d17-j3", question: "Habe ich diese Handlung innerlich wirklich als Beweis ernst genommen?", placeholder: "Wenn nicht: warum nicht?" },
        { id: "d17-j4", question: "Was zeigt mir das darüber, welches Selbstbild ich gerade beginne neu zu bauen?", placeholder: "Formuliere die neue Richtung möglichst klar." }
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist — auch etwas aus einer kleinen Handlung, die größer war als sie zuerst wirkte.",
      free_reflection_prompt: "Was zeigt mir dieser Tag darüber, welche Beweise ich bisher gesammelt habe — und welche ich ab heute bewusst setze?"
    },
    gratitude_prompt: "Welche kleine Handlung heute war vielleicht ein größerer Beweis für mein Selbstbild, als sie zuerst aussah?",
    self_talk_anchors: [
      { text: "Welches alte Bild läuft hier mit?", when: "Wenn du dich innerlich schon eingeordnet hast" },
      { text: "Setz den Beweis.", when: "Wenn du die neue Handlung wählst" },
      { text: "Das zählt als Beweis.", when: "Direkt nach der Handlung" }
    ],
    variants: {
      training: "Nutze Druck, Fehler, Unsicherheit, Verantwortung und Rollenmomente als Material.",
      rest: "Übertrage den Tag auf Gespräche, Disziplin, Auftreten, Entscheidungen und Alltagssituationen, in denen ein altes Bild von dir mitläuft.",
      match: "Kurzversion: altes Bild sehen → kleinen Gegenbeweis setzen → Handlung bewusst speichern."
    }
  },
  {
    day_id: 18,
    title: "Echtes Wachstum wird oft zuerst unsicher",
    phase: "Phase II — Umcodieren",
    week: 3,
    line: "Growth vs Winning",
    lens: "Unsicherheit ist nicht automatisch Bedrohung — sie kann ein bewusster Entwicklungsreiz sein.",
    primary_mechanism: "Growth Through Chosen Friction",
    today_trigger: "Sobald du merkst, dass dein System lieber im Vertrauten bleiben will, statt in einen relevanten Entwicklungsreiz hineinzugehen, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von Sicherheitsfixierung zu bewusst betretenem Wachstumsraum.",
    science_bite: "Wachstum fühlt sich oft nicht zuerst gut, sauber oder sicher an. Es beginnt häufig dort, wo dein bisheriges System kurz keine Routine hat: neue Verantwortung, sichtbarer werden, ungewohnte Reaktion, ehrlicheres Verhalten, mutigerer Schritt. Genau deshalb wirkt echter Lernraum oft unsicher. Heute trainierst du, diese Unsicherheit nicht automatisch als Rückschritt oder Gefahr zu lesen, sondern als möglichen Entwicklungsreiz.",
    tasks: [
      {
        id: "d18-t1",
        title: "Finde die echte Wachstumsstelle",
        trigger: "Wenn du merkst, dass etwas relevant wäre, dein System aber lieber im Sicheren bleiben will",
        when_to_use: "Bei Verantwortung, in neuen Rollen, bei sichtbaren Situationen, in Reaktion auf Fehler, in Kommunikation oder Mutmomenten",
        action: "Frag dich: 'Wo ist heute meine echte Wachstumsstelle?'",
        why: "Growth wird nur dann real, wenn du den relevanten Entwicklungsreiz findest statt nur allgemein 'mutig' sein zu wollen.",
        explanation: "Nicht Chaos suchen. Nicht irgendetwas Schwieriges machen. Sondern die Stelle finden, an der dein altes System gerade lieber sicher bleiben würde — obwohl dort echter Lernraum wäre.",
        self_talk: "Wo ist heute meine echte Wachstumsstelle?",
        micro_reframe: "Wachstum beginnt oft genau dort, wo mein altes System lieber sicher bleiben will.",
        reframe_step: {
          trigger: "Ich spüre Zug ins Vertraute.",
          reframe: "Bevor ich im Sicheren bleibe, suche ich die relevante Wachstumsstelle.",
          anchor: "Wo ist heute meine echte Wachstumsstelle?"
        },
        system_function: "Growth Targeting",
        icon: "Search"
      },
      {
        id: "d18-t2",
        title: "Betritt den Reiz bewusst",
        trigger: "Nachdem du die Wachstumsstelle gefunden hast",
        when_to_use: "In der direkt nächsten passenden Situation",
        action: "Geh bewusst in diesen Reiz hinein, statt ihn automatisch zu umgehen.",
        why: "Tag 18 soll Unsicherheit nicht nur neu lesen, sondern in Handlung übersetzen.",
        explanation: "Das kann heißen: Verantwortung nehmen, sichtbar werden, nach Fehlern nicht kleiner werden, klar kommunizieren, nicht in Routine fliehen, in einer schwierigen Situation präsent bleiben. Nicht heroisch — aber bewusst.",
        self_talk: "Geh hinein.",
        micro_reframe: "Unsicherheit ist hier gerade nicht automatisch Rückschritt, sondern möglicher Entwicklungsreiz.",
        reframe_step: {
          trigger: "Ich kenne die Wachstumsstelle.",
          reframe: "Jetzt betrete ich sie bewusst, statt sie nur zu verstehen.",
          anchor: "Geh hinein."
        },
        system_function: "Growth Entry",
        icon: "StepForward"
      },
      {
        id: "d18-t3",
        title: "Schließe die Unsicherheit nicht sofort",
        trigger: "Wenn dein System den Reiz sofort mit Schutz, Urteil oder Rückzug wieder schließen will",
        when_to_use: "Direkt im oder nach dem Wachstumsmoment",
        action: "Bleib kurz offen genug, dass Lernen weiter möglich bleibt.",
        why: "Der eigentliche Bruch passiert nicht nur beim Hineingehen, sondern beim Nicht-sofort-Zuschließen.",
        explanation: "Viele Athleten betreten kurz den Reiz und ziehen sich beim ersten unangenehmen Signal sofort wieder zusammen. Heute trainierst du, die Unsicherheit nicht sofort mit Schutz, Rettung oder Urteil zu verschließen.",
        self_talk: "Offen lassen.",
        micro_reframe: "Ich muss die Unsicherheit nicht sofort schließen, nur weil sie sich spürbar anfühlt.",
        reframe_step: {
          trigger: "Der Reiz wird unangenehm und mein System will sofort zu.",
          reframe: "Ich halte den Lernraum einen Moment länger offen.",
          anchor: "Offen lassen."
        },
        system_function: "Learning Space Protection",
        icon: "Unlock"
      }
    ],
    journal: {
      title: "Wo habe ich heute echtes Wachstum nicht vermieden?",
      questions: [
        { id: "d18-j1", question: "Welche Wachstumsstelle habe ich heute bewusst gewählt?", placeholder: "Beschreibe die konkrete Stelle." },
        { id: "d18-j2", question: "Was daran hat mein System unsicher oder schutzorientiert werden lassen wollen?", placeholder: "Wie hat sich das gezeigt?" },
        { id: "d18-j3", question: "Konnte ich heute sichtbar in diesen Reiz hineingehen?", placeholder: "Wie sah das konkret aus?" },
        { id: "d18-j4", question: "Wo wollte mein Kopf die Unsicherheit sofort wieder schließen, retten oder bewerten?", placeholder: "Beschreibe den Moment." }
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist — mindestens 1 sichere, 1 unsichere und 1 erkenntnisreiche Sache.",
      free_reflection_prompt: "Was zeigt mir dieser Tag darüber, wie mein System aktuell auf Wachstum und Unsicherheit reagiert?"
    },
    gratitude_prompt: "Welche unsichere Situation heute war vielleicht genau der Entwicklungsreiz, den ich gebraucht habe?",
    self_talk_anchors: [
      { text: "Wo ist heute meine echte Wachstumsstelle?", when: "Wenn du im Vertrauten bleiben willst" },
      { text: "Geh hinein.", when: "Wenn du den Reiz bewusst betrittst" },
      { text: "Offen lassen.", when: "Wenn dein System die Unsicherheit sofort schließen will" }
    ],
    variants: {
      training: "Nutze Verantwortung, neue Rollen, sichtbare Situationen, Kommunikation, Präsenz und Mutmomente als Material.",
      rest: "Übertrage den Tag auf unangenehme Gespräche, Disziplinmomente, Verantwortungsübernahme, Sichtbarkeit und das Verlassen vertrauter Routinen.",
      match: "Kurzversion: Wachstumsstelle finden → bewusst betreten → nicht sofort wieder schließen."
    }
  },
  {
    day_id: 19,
    title: "Nicht kontrollierbar heißt nicht bedrohlich",
    phase: "Phase II — Umcodieren",
    week: 3,
    line: "Control vs Non-Control",
    lens: "Nicht alles, was ich nicht kontrollieren kann, muss innerlich größer oder bedrohlicher gemacht werden.",
    primary_mechanism: "Threat Decoupling From Non-Control",
    today_trigger: "Sobald etwas unkontrollierbar ist und dein System es innerlich sofort als größer, gefährlicher oder belastender macht, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von Nicht-Kontrolle = Bedrohung zu Nicht-Kontrolle = Realität, die nicht unnötig aufgeladen werden muss.",
    science_bite: "Etwas nicht kontrollieren zu können ist nicht automatisch dasselbe wie Bedrohung. Viele Systeme koppeln diese beiden Dinge aber sofort: unkontrollierbar = schlecht, gefährlich, unfair, belastend, gegen mich. Genau dadurch wird Nicht-Kontrolle größer als nötig. Heute trennst du beides: Realität anerkennen, ohne sie innerlich unnötig aufzublasen.",
    tasks: [
      {
        id: "d19-t1",
        title: "Erkenne die Aufladung",
        trigger: "Wenn etwas gerade nicht in deiner Kontrolle liegt und dein System es sofort größer, schwerer oder bedrohlicher macht",
        when_to_use: "Bei äußeren Umständen, Entscheidungen anderer, Spielverlauf, Fehlern anderer, Rolle, Timing, Unfairness oder Unsicherheit",
        action: "Frag dich: 'Ist das gerade nur nicht kontrollierbar — oder mache ich es schon zu Bedrohung?'",
        why: "Du musst zuerst sehen, dass Nicht-Kontrolle und Bedrohung oft automatisch zusammengeschoben werden.",
        explanation: "Das Problem ist heute nicht nur die Realität selbst. Das Problem ist die innere Aufladung: 'Das darf nicht sein', 'So kann ich nicht arbeiten', 'Das ist jetzt gefährlich für alles'. Genau diese Vergrößerung soll sichtbar werden.",
        self_talk: "Nicht kontrollierbar — oder schon Bedrohung?",
        micro_reframe: "Nicht alles, was ich nicht steuern kann, muss innerlich sofort größer werden.",
        reframe_step: {
          trigger: "Etwas liegt gerade nicht bei mir.",
          reframe: "Bevor ich es innerlich auflade, prüfe ich, was ich gerade zusätzlich daraus mache.",
          anchor: "Nicht kontrollierbar — oder schon Bedrohung?"
        },
        system_function: "Threat Awareness",
        icon: "AlertTriangle"
      },
      {
        id: "d19-t2",
        title: "Benenn nur die Realität",
        trigger: "Nachdem du die innere Aufladung erkannt hast",
        when_to_use: "Direkt in der Situation, bevor du weiter in Ärger, Widerstand oder Bedrohung kippst",
        action: "Formuliere für dich nur nüchtern, was gerade real ist — ohne Zusatzaufladung.",
        why: "Der Tag will den Unterschied zwischen Realität und Bedrohungszuschreibung trainieren.",
        explanation: "Zum Beispiel nicht: 'Das ist katastrophal.' Sondern: 'Der Wertungsinstanz entscheidet gerade anders.' Nicht: 'Ich bin ausgeliefert.' Sondern: 'Das liegt gerade nicht in meiner Hand.' Du musst die Realität nicht schönreden — nur nicht unnötig aufblasen.",
        self_talk: "Das ist die Realität.",
        micro_reframe: "Klar sehen ist stärker als innerlich aufblasen.",
        reframe_step: {
          trigger: "Ich habe die Aufladung bemerkt.",
          reframe: "Jetzt benenne ich nur die Realität — nicht die ganze Geschichte darum herum.",
          anchor: "Das ist die Realität."
        },
        system_function: "Reality Naming",
        icon: "Scan"
      },
      {
        id: "d19-t3",
        title: "Geh ohne Zusatzbedrohung weiter",
        trigger: "Nachdem du die Realität klar benannt hast",
        when_to_use: "In der direkt nächsten Handlung oder Entscheidung",
        action: "Binde dich wieder an das Steuerbare, ohne die Situation innerlich weiter aufzublasen.",
        why: "Nicht-Kontrolle wird praktisch entkoppelt, wenn du trotz Realität ohne Zusatzbedrohung weiterarbeiten kannst.",
        explanation: "Heute geht es nicht darum, alles locker zu nehmen. Es geht darum, die Situation nicht größer zu machen, als sie schon ist, und trotzdem funktional weiterzuhandeln.",
        self_talk: "Keine Zusatzbedrohung.",
        micro_reframe: "Die Realität ist schon da. Ich muss sie nicht noch innerlich vergrößern.",
        reframe_step: {
          trigger: "Ich habe Realität und Aufladung getrennt.",
          reframe: "Jetzt gehe ich ohne zusätzliche innere Bedrohungsaufladung weiter.",
          anchor: "Keine Zusatzbedrohung."
        },
        system_function: "Decoupled Continuation",
        icon: "ArrowRightCircle"
      }
    ],
    journal: {
      title: "Wo habe ich heute Nicht-Kontrolle unnötig bedrohlich gemacht?",
      questions: [
        { id: "d19-j1", question: "Welche Situation war heute nicht in meiner Kontrolle?", placeholder: "Beschreibe sie konkret." },
        { id: "d19-j2", question: "Wie hat mein System sie innerlich größer oder bedrohlicher gemacht, als sie schon war?", placeholder: "Welche Zusatzaufladung war da?" },
        { id: "d19-j3", question: "Konnte ich heute Realität und Bedrohungsaufladung unterscheiden?", placeholder: "Wie sah das konkret aus?" },
        { id: "d19-j4", question: "Wie habe ich mich danach wieder an das Steuerbare gebunden, ohne weiter innerlich aufzublasen?", placeholder: "Was war dein nächster funktionaler Schritt?" }
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist — auch etwas aus einer Situation, die nicht in deiner Kontrolle lag.",
      free_reflection_prompt: "Was zeigt mir dieser Tag darüber, wie schnell mein System Nicht-Kontrolle in Bedrohung verwandelt?"
    },
    gratitude_prompt: "Welche unkontrollierbare Situation heute hätte ich innerlich größer machen können — und was hat mir geholfen, es nicht zu tun?",
    self_talk_anchors: [
      { text: "Nicht kontrollierbar — oder schon Bedrohung?", when: "Wenn etwas nicht bei dir liegt" },
      { text: "Das ist die Realität.", when: "Wenn du nur klar benennen willst, was ist" },
      { text: "Keine Zusatzbedrohung.", when: "Wenn du funktional weitergehen willst" }
    ],
    variants: {
      training: "Nutze äußere Umstände, Entscheidungen anderer, Spielverlauf, Unfairness und Timing als Material.",
      rest: "Übertrage den Tag auf Planänderungen, Menschen, äußere Umstände, Wartezeiten, Frust und Unverfügbares im Alltag.",
      match: "Kurzversion: Aufladung erkennen → Realität benennen → ohne Zusatzbedrohung weiterarbeiten."
    }
  },
  {
    day_id: 20,
    title: "Ein Fehler muss kein Angriff auf mich werden",
    phase: "Phase II — Umcodieren",
    week: 3,
    line: "Learning vs Judgement",
    lens: "Ein Fehler kann Information bleiben, statt sofort zu Urteil, Abwertung und Selbstangriff zu werden.",
    primary_mechanism: "Error Processing Without Self-Attack",
    today_trigger: "Sobald ein Fehler passiert und dein System sofort beginnt, mehr daraus zu machen als nur Information, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von Fehler = Angriff auf mich zu Fehler = Information für die nächste Handlung.",
    science_bite: "Ein Fehler liefert zuerst Information: etwas war unpräzise, zu spät, falsch gelesen oder unsauber umgesetzt. Viele Systeme hören dort aber nicht auf. Sie machen sofort mehr daraus: Urteil, Scham, Abwertung, Zweifel, Selbstangriff. Genau das macht den Fehler oft größer als nötig, weil du dann nicht nur mit der Situation kämpfst, sondern zusätzlich mit dir selbst.",
    tasks: [
      {
        id: "d20-t1",
        title: "Trenn Fehler von Urteil",
        trigger: "Wenn dir etwas misslingt und dein Kopf sofort eine härtere Geschichte daraus macht",
        when_to_use: "Direkt nach Fehlern, Unsicherheiten, technischen Missmomenten oder falsch gelesenen Situationen",
        action: "Frag dich einmal: 'Was ist hier der Fehler — und was ist schon Urteil?'",
        why: "Bevor Selbstangriff gestoppt werden kann, muss sichtbar werden, dass Fehler und Urteil nicht dasselbe sind.",
        explanation: "Es macht einen Unterschied, ob du siehst: 'Der Pass war zu ungenau' oder ob dein System sofort macht: 'Ich bin heute schlecht.' Heute trennst du Information von dem, was dein Kopf zusätzlich daraus baut.",
        self_talk: "Fehler, nicht Urteil.",
        micro_reframe: "Nicht alles, was mein Kopf nach dem Fehler hinzufügt, gehört wirklich zum Fehler selbst.",
        reframe_step: {
          trigger: "Ein Fehler passiert und mein Kopf wird sofort hart.",
          reframe: "Bevor ich mich angreife, trenne ich erst Information von Urteil.",
          anchor: "Fehler, nicht Urteil."
        },
        system_function: "Judgement Separation",
        icon: "Scissors"
      },
      {
        id: "d20-t2",
        title: "Benenn nur die Information",
        trigger: "Nachdem du Fehler und Urteil etwas klarer getrennt hast",
        when_to_use: "Direkt danach, bevor dein System weiter in Zweifel oder Abwertung kippt",
        action: "Formuliere nur die nützliche Information, die für die nächste Handlung relevant ist.",
        why: "Der Tag soll nicht nur Selbstangriff stoppen, sondern saubere Fehlerverarbeitung trainieren.",
        explanation: "Nicht: 'Ich kann das nicht.' Sondern: 'Zu spät reagiert.' Nicht: 'Heute bin ich raus.' Sondern: 'Kontakt war unsauber.' Du hältst nur das fest, was für die nächste Szene brauchbar ist.",
        self_talk: "Nur die Information.",
        micro_reframe: "Ein Fehler wird kleiner und brauchbarer, wenn ich nur behalte, was für die nächste Handlung nützlich ist.",
        reframe_step: {
          trigger: "Ich habe Urteil und Fehler etwas getrennt.",
          reframe: "Jetzt behalte ich nur das, was ich für die nächste Handlung wirklich brauche.",
          anchor: "Nur die Information."
        },
        system_function: "Informational Processing",
        icon: "Filter"
      },
      {
        id: "d20-t3",
        title: "Geh ohne Selbstangriff weiter",
        trigger: "Wenn dein System nach dem Fehler weiter in Abwertung, Scham oder Zweifel gehen will",
        when_to_use: "In der direkt nächsten Szene oder Handlung nach dem Fehler",
        action: "Setze die nächste saubere Handlung, ohne dich innerlich zusätzlich anzugreifen.",
        why: "Tag 20 soll Fehlerverarbeitung nicht nur mental, sondern sichtbar im Verhalten verändern.",
        explanation: "Es geht nicht darum, Fehler gutzufinden. Es geht darum, nicht zusätzlich gegen dich selbst zu spielen. Präsenz, Kommunikation, nächste Aktion, Haltung, saubere Rückkehr — ohne den Fehler als Angriff auf dich weiterzutragen.",
        self_talk: "Weiter ohne Angriff.",
        micro_reframe: "Ich kann den Fehler klar sehen, ohne ihn gegen mich zu verwenden.",
        reframe_step: {
          trigger: "Der Fehler ist passiert und mein System will weiter auf mich losgehen.",
          reframe: "Ich nehme die Information mit, aber ich gehe ohne zusätzlichen Selbstangriff weiter.",
          anchor: "Weiter ohne Angriff."
        },
        system_function: "Clean Continuation",
        icon: "ArrowRightCircle"
      }
    ],
    journal: {
      title: "Wo habe ich heute Fehler klarer gesehen, ohne mich direkt anzugreifen?",
      questions: [
        { id: "d20-j1", question: "In welcher Situation habe ich heute Fehler und Urteil am klarsten voneinander unterscheiden können?", placeholder: "Beschreibe die Szene." },
        { id: "d20-j2", question: "Was war der eigentliche Fehler — und was war schon Urteil oder Selbstangriff?", placeholder: "Schreibe beides möglichst getrennt auf." },
        { id: "d20-j3", question: "Welche nützliche Information konnte ich aus dem Fehler behalten?", placeholder: "Was war für die nächste Handlung relevant?" },
        { id: "d20-j4", question: "Wie hat es sich auf meine nächste Szene ausgewirkt, nicht zusätzlich gegen mich zu gehen?", placeholder: "Was war spürbar anders?" }
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist — auch etwas aus einer Fehler-Situation, in der du klarer und fairer mit dir geblieben bist.",
      free_reflection_prompt: "Was zeigt mir dieser Tag darüber, wie oft Fehler bei mir zu Urteil statt zu Information werden?"
    },
    gratitude_prompt: "Welche Fehler-Situation heute hat mir gezeigt, dass ich klar sehen kann, ohne mich sofort anzugreifen?",
    self_talk_anchors: [
      { text: "Fehler, nicht Urteil.", when: "Direkt nach einem Fehler" },
      { text: "Nur die Information.", when: "Wenn du das Nützliche extrahierst" },
      { text: "Weiter ohne Angriff.", when: "In der nächsten Handlung" }
    ],
    variants: {
      training: "Nutze technische Fehler, falsche Entscheidungen, Timing-Fehler und Missmomente als Hauptmaterial.",
      rest: "Übertrage den Tag auf Missgeschicke, peinliche Situationen, Selbstkritik, Arbeitsfehler und Alltagspannen.",
      match: "Kurzversion: Fehler von Urteil trennen → nur Information behalten → ohne Selbstangriff weiter."
    }
  },
  {
    day_id: 21,
    title: "Team vor Selbstbild",
    phase: "Phase II — Umcodieren",
    week: 4,
    line: "Ego vs Inner Excellence",
    lens: "Ich kann Aufmerksamkeit aus Bildschutz lösen und auf das richten, was die Situation oder das Team wirklich braucht.",
    primary_mechanism: "Prosocial Attention Shift",
    today_trigger: "Sobald du merkst, dass du gerade eher dein Bild schützt als der Situation oder dem Team zu dienen, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von bildschützendem Handeln zu dienlichem Handeln.",
    science_bite: "Unter Druck, Bewertung oder Unsicherheit wird Aufmerksamkeit oft stark selbstbezogen: Wie wirke ich? Was sagt das über mich? Wie komme ich rüber? Genau dieser Bildschutz macht Verhalten oft enger, künstlicher oder defensiver. Heute trainierst du die Gegenrichtung: Aufmerksamkeit weg vom Bild, hin zu dem, was die Situation, das Team oder die Aufgabe wirklich braucht.",
    tasks: [
      {
        id: "d21-t1",
        title: "Erkenne den Bildschutz",
        trigger: "Wenn du merkst, dass es dir gerade stark um Wirkung, Status, Verteidigung oder Selbstschutz geht",
        when_to_use: "Bei Fehlern, Kritik, Vergleich, Verantwortung, Beobachtung oder sozialen Druckmomenten",
        action: "Frag dich kurz: 'Schütze ich gerade mein Bild — oder diene ich der Situation?'",
        why: "Du kannst Teamorientierung erst praktisch wählen, wenn der Bildschutz sichtbar wird.",
        explanation: "Tag 21 ist nicht moralisch. Es geht nicht darum, nett zu sein. Es geht darum zu erkennen, wann dein Verhalten stärker vom eigenen Bild als von echter Aufgabe oder Beitrag gesteuert ist.",
        self_talk: "Bild oder Beitrag?",
        micro_reframe: "Nicht jede Spannung ist Teamverantwortung — oft ist sie Bildschutz.",
        reframe_step: {
          trigger: "Ich merke starken Selbstfokus oder Beweisdrang.",
          reframe: "Bevor ich handle, kläre ich: Geht es mir gerade mehr um mein Bild oder um die Sache?",
          anchor: "Bild oder Beitrag?"
        },
        system_function: "Image Protection Awareness",
        icon: "UserRound"
      },
      {
        id: "d21-t2",
        title: "Frag nach dem, was gebraucht wird",
        trigger: "Nachdem du Bildschutz erkannt hast",
        when_to_use: "Direkt im Anschluss, bevor du in alte Schutzreaktionen gehst",
        action: "Frag dich: 'Was braucht die Situation oder das Team gerade wirklich von mir?'",
        why: "Der Wechsel von Selbstbild zu Beitrag braucht einen klaren neuen Aufmerksamkeitsort.",
        explanation: "Vielleicht braucht es Präsenz. Vielleicht Kommunikation. Vielleicht Hilfe. Vielleicht Mut. Vielleicht Ruhe. Vielleicht eine saubere kleine Handlung. Heute trainierst du, nicht primär vom Ich aus zu denken.",
        self_talk: "Was wird hier gebraucht?",
        micro_reframe: "Wenn ich auf Beitrag statt Bild gehe, wird Verhalten oft freier und klarer.",
        reframe_step: {
          trigger: "Ich habe Bildschutz erkannt.",
          reframe: "Jetzt richte ich meine Aufmerksamkeit auf das, was wirklich gebraucht wird.",
          anchor: "Was wird hier gebraucht?"
        },
        system_function: "Contribution Redirect",
        icon: "Handshake"
      },
      {
        id: "d21-t3",
        title: "Handle dienlich statt bildschützend",
        trigger: "Wenn du zwischen dienlicher und bildschützender Handlung wählen kannst",
        when_to_use: "In der direkt nächsten relevanten Szene",
        action: "Setze bewusst die Handlung, die der Situation oder dem Team dient — auch wenn sie weniger gut für dein Bild wäre.",
        why: "Tag 21 wird erst real, wenn Team-/Situationsfokus Verhalten übernimmt.",
        explanation: "Das kann heißen: klar sprechen, Hilfe geben, Verantwortung übernehmen, eine Korrektur annehmen, präsent bleiben, dich nicht kleiner machen, ehrlich statt cool sein. Nicht fürs Bild. Für die Sache.",
        self_talk: "Dienlich handeln.",
        micro_reframe: "Beitrag macht oft freier als Bildschutz.",
        reframe_step: {
          trigger: "Ich könnte jetzt mein Bild schützen oder der Sache dienen.",
          reframe: "Heute wähle ich bewusst die dienlichere Handlung.",
          anchor: "Dienlich handeln."
        },
        system_function: "Service Action",
        icon: "ArrowRightCircle"
      }
    ],
    journal: {
      title: "Wann ging es heute um mein Bild — und wann um das, was gebraucht wurde?",
      questions: [
        { id: "d21-j1", question: "In welchen Momenten habe ich heute eher mein Bild geschützt als der Situation oder dem Team gedient?", placeholder: "Beschreibe die Szene konkret." },
        { id: "d21-j2", question: "Was wurde in dieser Situation wirklich gebraucht?", placeholder: "Präsenz, Hilfe, Mut, Klarheit, Kommunikation ..." },
        { id: "d21-j3", question: "Konnte ich heute mindestens einmal sichtbar dienlicher statt bildschützend handeln?", placeholder: "Wie sah das konkret aus?" },
        { id: "d21-j4", question: "Was zeigt mir das darüber, wie oft mein Verhalten noch an Bildschutz statt an Beitrag hängt?", placeholder: "Formuliere den Kern möglichst klar." }
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist — mindestens 1 Sache, die dir selbst geholfen hat, 1 Sache, bei der jemand anders wichtig war, und 1 Sache, die dir gezeigt hat, dass Beitrag oft freier macht als Bildschutz.",
      free_reflection_prompt: "Was zeigt mir dieser Tag über mein Verhältnis von Bildschutz, Beitrag und echter Exzellenz?"
    },
    gratitude_prompt: "Welche Situation heute hat mir gezeigt, dass dienliches Handeln oft freier macht als Selbstschutz?",
    self_talk_anchors: [
      { text: "Bild oder Beitrag?", when: "Wenn Selbstfokus oder Bildschutz hochgeht" },
      { text: "Was wird hier gebraucht?", when: "Wenn du Aufmerksamkeit auf Beitrag richten willst" },
      { text: "Dienlich handeln.", when: "In der direkt nächsten Handlung" }
    ],
    variants: {
      training: "Nutze Vergleich, Beobachtung, Verantwortung, Unsicherheit und Fehler als Hauptmaterial.",
      rest: "Übertrage den Tag auf Gespräche, Familie, Freunde, Arbeit und Alltagssituationen, in denen du eher auf Wirkung als auf Beitrag gehst.",
      match: "Kurzversion: Bildschutz erkennen → was wird gebraucht? → dienlich handeln."
    }
  },
  {
    day_id: 22,
    title: "Prozess als Heimat",
    phase: "Phase II — Umcodieren",
    week: 4,
    line: "Process vs Result",
    lens: "Wenn alles enger, lauter oder wichtiger wird, brauche ich einen verlässlichen Ort zum Arbeiten. Dieser Ort ist mein Prozess.",
    primary_mechanism: "Process Anchoring",
    today_trigger: "Sobald Druck, Drift, Bildschutz oder Ergebnisgedanken dich aus der Aufgabe ziehen, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von diffusem Reagieren zu einem klaren, verlässlichen Prozessanker als Arbeitsort.",
    science_bite: "Es reicht nicht, Ergebnisbindung nur zu erkennen. Dein System braucht einen stabilen Ort, an den es immer wieder zurück kann. Genau das ist heute der Prozess: kein großes Konzept, sondern ein konkreter, steuerbarer und verhaltensnaher Aufmerksamkeitsanker. Wenn alles lauter wird, brauchst du nicht mehr Gefühl oder mehr Härte — du brauchst einen klaren Ort zum Arbeiten. ",
    tasks: [
      {
        id: "d22-t1",
        title: "Lege deinen Prozessanker fest",
        trigger: "Vor dem Training, vor einer Einheit oder vor einer Phase, die Bedeutung bekommen könnte",
        when_to_use: "Zu Beginn des Tages, vor Übungseinheiten, vor Wettkampfsimulation, vor Wettkampfphasen oder vor Belastungsblöcken",
        action: "Bestimme genau einen klaren Prozessanker, auf den du heute immer wieder zurückkommst.",
        why: "Ein Prozessanker macht Prozessdenken konkret und handhabbar.",
        explanation: "Nicht fünf Ziele gleichzeitig. Nicht diffuse Konzentration. Sondern ein klarer Aufmerksamkeitsort: erster Kontakt, klare Kommunikation, aktiver Laufweg, saubere Körperhaltung, Timing, Prozesspunkt, Präsenz in der ersten Aktion.",
        self_talk: "Hier arbeite ich.",
        micro_reframe: "Prozess ist heute nicht Theorie, sondern mein klarer Arbeitsort.",
        reframe_step: {
          trigger: "Der Tag oder Block startet.",
          reframe: "Bevor es lauter wird, lege ich fest, wohin ich immer wieder zurückkann.",
          anchor: "Hier arbeite ich."
        },
        system_function: "Anchor Definition",
        icon: "Target"
      },
      {
        id: "d22-t2",
        title: "Kehre an den Arbeitsort zurück",
        trigger: "Wenn Drift, Ergebnisdenken, Bildschutz oder Druck hochgehen",
        when_to_use: "Mitten in der Einheit, nach Fehlern, bei Lautstärke, bei innerem Kippen",
        action: "Bring deine Aufmerksamkeit sofort zurück an deinen definierten Prozessanker.",
        why: "Der Prozessanker ist nur dann wertvoll, wenn er in echten Belastungsmomenten nutzbar bleibt.",
        explanation: "Heute trainierst du nicht nur, dass Prozess wichtig ist, sondern dass dein System einen Ort hat, an den es unter Last wirklich zurückkehren kann.",
        self_talk: "Zurück an den Arbeitsort.",
        micro_reframe: "Wenn alles wichtiger wird, brauche ich nicht mehr Denken — ich brauche meinen Arbeitsort.",
        reframe_step: {
          trigger: "Ich werde enger, lauter oder ziehe weg.",
          reframe: "Jetzt gehe ich nicht in Verlauf oder Ergebnis, sondern zurück an meinen klaren Prozesspunkt.",
          anchor: "Zurück an den Arbeitsort."
        },
        system_function: "Anchor Return",
        icon: "LocateFixed"
      },
      {
        id: "d22-t3",
        title: "Arbeite von dort aus weiter",
        trigger: "Nachdem du an den Prozessanker zurückgekehrt bist",
        when_to_use: "In der direkt nächsten Handlung",
        action: "Zeige den Anker sofort in einer klaren, sauberen Handlung.",
        why: "Prozess wird erst stabil, wenn der Anker nicht nur gedacht, sondern im Verhalten sichtbar wird.",
        explanation: "Es reicht nicht, innerlich zu sagen, was dein Prozess ist. Heute soll dieser Arbeitsort in deiner nächsten Szene sichtbar werden: klarer Kontakt, saubere Kommunikation, Präsenz, Struktur, Rhythmus, Haltung.",
        self_talk: "Arbeite von hier.",
        micro_reframe: "Der Prozessanker ist erst real, wenn ich von dort aus handle.",
        reframe_step: {
          trigger: "Ich bin am Anker zurück.",
          reframe: "Jetzt arbeite ich von dort aus sichtbar weiter.",
          anchor: "Arbeite von hier."
        },
        system_function: "Anchor Embodiment",
        icon: "ArrowRightCircle"
      }
    ],
    journal: {
      title: "Wo war heute mein Arbeitsort — und wann habe ich ihn verloren?",
      questions: [
        { id: "d22-j1", question: "Was war heute mein klarer Prozessanker?", placeholder: "Benenne ihn so konkret wie möglich." },
        { id: "d22-j2", question: "In welchen Momenten hat mein System diesen Arbeitsort besonders leicht verloren?", placeholder: "Druck, Fehler, Drift, Bildschutz, Ergebnisgedanken ..." },
        { id: "d22-j3", question: "Konnte ich heute mindestens einmal bewusst an meinen Arbeitsort zurückkehren?", placeholder: "Wie sah diese Rückkehr aus?" },
        { id: "d22-j4", question: "Was zeigt mir das darüber, wie verlässlich Prozess für mich schon als Heimat werden kann?", placeholder: "Formuliere den Kern möglichst klar." }
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist — auch etwas aus einem Moment, in dem dein Prozessanker dich zurückgebracht hat.",
      free_reflection_prompt: "Was zeigt mir dieser Tag über meinen Arbeitsort unter Last, Bedeutung und Drift?"
    },
    gratitude_prompt: "Welcher Moment heute hat mir gezeigt, dass ich einen Ort habe, an den ich immer wieder zurück kann?",
    self_talk_anchors: [
      { text: "Hier arbeite ich.", when: "Wenn du deinen Prozessanker festlegst" },
      { text: "Zurück an den Arbeitsort.", when: "Wenn Drift oder Druck dich rausziehen" },
      { text: "Arbeite von hier.", when: "In der direkt nächsten Handlung" }
    ],
    variants: {
      training: "Nutze Übungseinheiten, Belastungsblöcke, Fehlerphasen, Wettkampfsimulation und Beobachtung als Material.",
      rest: "Übertrage den Tag auf Arbeit, Studium, Gespräche, Fokusblöcke und Alltagssituationen mit Drift und innerem Lärm.",
      match: "Kurzversion: Anker festlegen → zurück an den Arbeitsort → von dort handeln."
    }
  },
  {
    day_id: 23,
    title: "Zustandsweite statt Defizitmodus",
    phase: "Phase II — Umcodieren",
    week: 4,
    line: "Gratitude vs Anxiety",
    lens: "Ein enger Zustand nimmt mir nicht nur Leichtigkeit, sondern auch Handlungsraum. Ich kann Weite wiederherstellen.",
    primary_mechanism: "State Broadening",
    today_trigger: "Sobald dein System fast nur noch auf Problem, Fehler, Mangel, Unsicherheit oder Druck schaut, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von Defizitdominanz zu Zustandsweite und Handlung aus mehr innerem Raum.",
    science_bite: "Ein enger Zustand nimmt dir oft mehr als nur gute Laune — er nimmt dir Handlungsraum. Wenn dein System unter Druck, Frust oder Defizitfokus steht, schaut es oft fast nur noch auf Problem, Fehler, Mangel oder Unsicherheit. Das kostet Überblick, Präzision, Entscheidungsfreiheit und Zugang zu dem, was trotzdem noch tragend oder nutzbar ist. Dankbarkeit ist hier deshalb nicht bloß ein nettes Gefühl, sondern eine Form von Zustandsöffnung.",
    tasks: [
      {
        id: "d23-t1",
        title: "Erkenne die Defizitdominanz",
        trigger: "Wenn dein System fast nur noch am Problem klebt",
        when_to_use: "Bei Fehlern, Frust, Müdigkeit, Vergleich, Unsicherheit, engem Druck oder dem Gefühl, dass etwas fehlt",
        action: "Markiere den Zustand einmal innerlich mit: 'Defizitmodus.'",
        why: "Bevor du deinen Zustand öffnen kannst, musst du merken, wann dein System gerade fast nur noch Mangel, Fehler oder Druck sieht.",
        explanation: "Die Frage des Tages ist nicht: 'Was ist gerade falsch?' Sondern: 'Ist mein System gerade so eng geworden, dass es fast nur noch das Falsche sieht?' Genau diesen Unterschied machst du heute sichtbar.",
        self_talk: "Defizitmodus.",
        micro_reframe: "Nicht nur das Problem ist da — mein System ist gerade auch enger geworden.",
        reframe_step: {
          trigger: "Ich klebe innerlich fast nur noch am Falschen.",
          reframe: "Bevor ich weiter reagiere, markiere ich erst die Enge meines Zustands.",
          anchor: "Defizitmodus."
        },
        system_function: "State Awareness",
        icon: "Eye"
      },
      {
        id: "d23-t2",
        title: "Hol Weite ins System",
        trigger: "Direkt nachdem du den Defizitmodus erkannt hast",
        when_to_use: "Wenn du merkst, dass du fast nur noch Mangel oder Problem siehst",
        action: "Benenne bewusst 2–3 Dinge, die trotzdem tragend, nutzbar oder vorhanden sind.",
        why: "Der Tag will dein System nicht vom Problem wegreden, sondern wieder öffnen.",
        explanation: "Du tust nicht so, als gäbe es kein Problem. Du sorgst nur dafür, dass dein System nicht so eng wird, dass es fast nur noch das Problem sehen kann. Genau das schafft wieder Raum für Handlung.",
        self_talk: "Es ist mehr da.",
        micro_reframe: "Weite heißt heute nicht Schönreden, sondern mehr sehen als nur Mangel.",
        reframe_step: {
          trigger: "Ich habe Defizitdominanz erkannt.",
          reframe: "Jetzt hole ich bewusst wieder Tragendes und Nutzbares mit ins Bild.",
          anchor: "Es ist mehr da."
        },
        system_function: "State Opening",
        icon: "Expand"
      },
      {
        id: "d23-t3",
        title: "Handle aus Weite",
        trigger: "Nachdem dein Zustand wieder etwas offener geworden ist",
        when_to_use: "In der direkt nächsten Szene oder Handlung",
        action: "Setze die nächste Handlung aus mehr Weite statt aus engem Defizitfokus.",
        why: "Zustandsöffnung soll sich nicht nur besser anfühlen, sondern Verhalten wieder freier und präziser machen.",
        explanation: "Wenn dein System weiter wird, werden oft auch Wahrnehmung, Entscheidung und Ausführung sauberer. Genau diese Übersetzung trainierst du heute.",
        self_talk: "Aus Weite handeln.",
        micro_reframe: "Mein Zustand darf wieder größer werden als nur das Problem.",
        reframe_step: {
          trigger: "Ich habe wieder mehr im Blick.",
          reframe: "Jetzt gehe ich mit mehr Handlungsraum in die nächste Szene.",
          anchor: "Aus Weite handeln."
        },
        system_function: "Broadened Action",
        icon: "ArrowRightCircle"
      }
    ],
    journal: {
      title: "Wo war mein System heute eng — und wo wieder weiter?",
      questions: [
        { id: "d23-j1", question: "In welchen Momenten war mein System heute besonders stark im Defizitmodus?", placeholder: "Beschreibe die Situation konkret." },
        { id: "d23-j2", question: "Was habe ich bewusst wieder mit ins Bild geholt?", placeholder: "Welche 2–3 Dinge waren trotzdem tragend oder nutzbar?" },
        { id: "d23-j3", question: "Hat sich mein Zustand dadurch verändert?", placeholder: "Wenn ja: wie?" },
        { id: "d23-j4", question: "Wie hat sich meine nächste Handlung verändert, als wieder mehr Weite da war?", placeholder: "Beschreibe die Szene." }
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist — auch etwas aus einem engen oder schwierigen Moment.",
      free_reflection_prompt: "Was zeigt mir dieser Tag darüber, wie stark Defizitdominanz mein Handeln verengt — und wie Weite wieder zurückkommen kann?"
    },
    gratitude_prompt: "Welche Situation heute hat mir gezeigt, dass mein Zustand mehr sehen kann als nur das Problem?",
    self_talk_anchors: [
      { text: "Defizitmodus.", when: "Wenn dein System fast nur noch Mangel sieht" },
      { text: "Es ist mehr da.", when: "Wenn du Weite wiederherstellst" },
      { text: "Aus Weite handeln.", when: "In der direkt nächsten Szene" }
    ],
    variants: {
      training: "Nutze Fehler, Frust, Müdigkeit, Vergleich, Unsicherheit und enge Druckmomente als Material.",
      rest: "Übertrage den Tag auf Grübeln, Alltagsspannung, Vergleich, Mangelblick und innere Enge.",
      match: "Kurzversion: Defizitmodus erkennen → Weite öffnen → aus Weite weiterhandeln."
    }
  },
  {
    day_id: 24,
    title: "Arbeite auch ohne Zugkraft",
    phase: "Phase II — Umcodieren",
    week: 4,
    line: "Confidence vs State Independence",
    lens: "Mein Verhalten darf nicht sofort einbrechen, nur weil mein innerer Zustand heute wenig Zug hat.",
    primary_mechanism: "State-Independent Work Capacity",
    today_trigger: "Sobald du merkst, dass dein System gerade wenig Zug, Lust oder innere Bereitschaft hat und automatisch schlechter arbeiten will, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von zustandsabhängiger Arbeit zu kleiner, sauberer Arbeitsfähigkeit trotz Trägheit.",
    science_bite: "Ein reifes System arbeitet nicht nur, wenn es Lust hat. Viele Menschen verwechseln Bereitschaft mit Fähigkeit. Wenn Energie, Lust oder innerer Zug fehlen, sinken oft sofort Fokus, Präzision und Arbeitsqualität. Das ist verständlich, aber problematisch. Stabilität entsteht anders: Niedrige Motivation ist ein Zustand — kein Urteil darüber, was jetzt noch möglich ist. Heute trainierst du deshalb nicht, dich besser zu fühlen, sondern trotz geringer innerer Zugkraft arbeitsfähig zu bleiben. ",
    tasks: [
      {
        id: "d24-t1",
        title: "Erkenne die innere Trägheit",
        trigger: "Wenn innerlich Sätze auftauchen wie 'Ich habe gerade keine Lust', 'Es fühlt sich schwer an' oder 'Ich will eher raus als rein'",
        when_to_use: "An trägen Trainingstagen, bei innerem Widerstand, im Alltag bei Disziplinmomenten oder vor unangenehmen Aufgaben",
        action: "Markiere den Zustand einmal präzise: 'Trägheit ist da.'",
        why: "Bevor Verhalten vom Zustand entkoppelt werden kann, musst du merken, wann dein System gerade auf 'heute nicht' schaltet.",
        explanation: "Das ist kein Charakterfehler und kein Grund zur Dramatik. Es ist einfach ein Zustand, den viele Systeme sofort mit schlechterer Arbeit verknüpfen. Heute erkennst du ihn früh, statt ihm blind zu folgen.",
        self_talk: "Trägheit ist da.",
        micro_reframe: "Ein niedriger Zustand ist nicht automatisch ein Urteil über meine Fähigkeit zu arbeiten.",
        reframe_step: {
          trigger: "Ich merke geringen Zug oder inneren Widerstand.",
          reframe: "Bevor ich nachgebe oder dramatisiere, benenne ich nur den Zustand.",
          anchor: "Trägheit ist da."
        },
        system_function: "State Awareness",
        icon: "Eye"
      },
      {
        id: "d24-t2",
        title: "Nicht verhandeln — an den Anker",
        trigger: "Direkt nachdem du die Trägheit erkannt hast",
        when_to_use: "Sofort danach, bevor du auf bessere Stimmung, Motivation oder innere Freigabe wartest",
        action: "Geh direkt an deinen heutigen Prozessanker zurück. Ohne Diskussion.",
        why: "Hier liegt die eigentliche Umcodierung: Anker zuerst, nicht Stimmung zuerst.",
        explanation: "Viele Systeme bleiben genau hier hängen: noch kurz warten, erst Motivation finden, erst besser reinkommen. Heute trainierst du das Gegenteil: nicht verhandeln, sondern zurück an eine kleine, konkrete Arbeitsstruktur.",
        self_talk: "An den Anker.",
        micro_reframe: "Ich muss mich nicht erst besser fühlen, um an meinen Arbeitsort zurückzugehen.",
        reframe_step: {
          trigger: "Ich habe Trägheit erkannt.",
          reframe: "Jetzt gehe ich nicht in Verhandlung, sondern direkt zurück an meinen Arbeitsort.",
          anchor: "An den Anker."
        },
        system_function: "State Decoupling",
        icon: "LocateFixed"
      },
      {
        id: "d24-t3",
        title: "Arbeite klein, nicht dramatisch",
        trigger: "Wenn dein Kopf an trägen Tagen alles zu groß macht oder sofort perfekten Zustand will",
        when_to_use: "Nach der Rückkehr an den Prozessanker",
        action: "Reduziere deinen Fokus immer wieder auf eine klare, saubere nächste Handlung.",
        why: "An trägen Tagen ist der häufigste Fehler, zu groß zu denken und dann innerlich zusammenzufallen.",
        explanation: "Heute geht es nicht darum, plötzlich maximal zu performen. Es geht darum, klein, klar und sauber weiterzuarbeiten: der nächste Kontakt, die nächste Kommunikation, der nächste Laufweg, die nächste technisch saubere Wiederholung.",
        self_talk: "Nur die nächste saubere Sache.",
        micro_reframe: "Stabilität entsteht heute nicht durch großen Push, sondern durch kleine saubere Fortsetzung.",
        reframe_step: {
          trigger: "Ich denke zu groß oder falle innerlich zusammen.",
          reframe: "Ich reduziere wieder auf die nächste saubere Sache.",
          anchor: "Nur die nächste saubere Sache."
        },
        system_function: "Small Work Continuation",
        icon: "ArrowRightCircle"
      }
    ],
    journal: {
      title: "Wie habe ich gearbeitet, als mein System nicht ziehen wollte?",
      questions: [
        { id: "d24-j1", question: "In welchem Moment war meine innere Trägheit heute am stärksten?", placeholder: "Beschreibe die Situation." },
        { id: "d24-j2", question: "Woran habe ich gemerkt, dass mein Zustand meine Arbeitsqualität runterziehen wollte?", placeholder: "Wie zeigte sich das konkret?" },
        { id: "d24-j3", question: "Konnte ich heute trotzdem direkt an meinen Prozessanker zurückgehen?", placeholder: "Wie sah das aus?" },
        { id: "d24-j4", question: "Wann ist es mir gelungen, klein, aber sauber weiterzuarbeiten?", placeholder: "Beschreibe die Szene." }
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist — mindestens 1 Sache, die schwer war, 1 Sache, die du trotzdem sauber gemacht hast, und 1 Sache, die dir gezeigt hat, dass Stabilität wichtiger ist als perfekter Zustand.",
      free_reflection_prompt: "Was zeigt mir dieser Tag darüber, wie stark mein Verhalten noch an Lust, Energie oder innerer Zugkraft hängt?"
    },
    gratitude_prompt: "Welche schwere Situation heute hat mir gezeigt, dass ich auch ohne perfekten Zustand sauber arbeiten kann?",
    self_talk_anchors: [
      { text: "Trägheit ist da.", when: "Wenn wenig Zug oder Lust da ist" },
      { text: "An den Anker.", when: "Wenn du nicht verhandeln willst" },
      { text: "Nur die nächste saubere Sache.", when: "Wenn du klein und stabil weiterarbeiten willst" }
    ],
    variants: {
      training: "Nutze träge Tage, innere Widerstände, Müdigkeit und 'heute nicht'-Momente als Material.",
      rest: "Übertrage den Tag auf Studium, Arbeit, Routinen, Gespräche und Dinge, die du beginnen musst, obwohl es innerlich nicht zieht.",
      match: "Kurzversion: Trägheit erkennen → an den Anker → nur die nächste saubere Sache."
    }
  },
  {
    day_id: 25,
    title: "Handle auch ohne innere Freigabe",
    phase: "Phase II — Umcodieren",
    week: 4,
    line: "Confidence vs Self-Doubt",
    lens: "Zweifel darf auftauchen — aber ich brauche seine Zustimmung nicht, um eine klare Handlung zu setzen.",
    primary_mechanism: "Action Without Inner Permission",
    today_trigger: "Sobald Zweifel auftaucht und dein System in Prüfung, Warten oder kleineres Handeln kippt, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von Zweifel als Erlaubnisinstanz zu Handlung trotz Zweifel.",
    science_bite: "Zweifel ist oft nicht das Problem — das Warten auf Sicherheit ist das Problem. Viele Systeme behandeln Zweifel wie eine innere Freigabeinstanz: erst sicherer fühlen, erst nochmal prüfen, erst innere Zustimmung bekommen. Genau dadurch wird Handlung kleiner, später oder gar nicht gesetzt. Heute trainierst du eine härtere und reifere Form von Confidence: Zweifel darf da sein, ohne dass er das letzte Wort über die Handlung bekommt. ",
    tasks: [
      {
        id: "d25-t1",
        title: "Erkenne die Bremsschleife",
        trigger: "Wenn Zweifel auftaucht und dein Kopf sofort prüfen, warten, absichern oder verzögern will",
        when_to_use: "Vor wichtigen Handlungen, unter Beobachtung, bei Verantwortung, nach Fehlern oder wenn innere Unsicherheit hochgeht",
        action: "Frag dich einmal klar: 'Ist hier gerade Zweifel da — oder warte ich schon auf Freigabe?'",
        why: "Tag 25 muss zuerst sichtbar machen, dass nicht nur Zweifel bremst, sondern das Warten auf Sicherheit.",
        explanation: "Oft fühlt sich diese Schleife logisch an: nur kurz prüfen, noch etwas sicherer werden, noch kurz warten. Funktional ist sie aber oft eine Bremsschleife, die Handlung kleiner, später oder gar nicht gesetzt werden lässt.",
        self_talk: "Zweifel oder Freigabe-Warten?",
        micro_reframe: "Das Problem ist oft nicht der Zweifel selbst, sondern dass ich ihn wie eine Erlaubnisinstanz behandle.",
        reframe_step: {
          trigger: "Zweifel taucht auf und mein Kopf will prüfen oder warten.",
          reframe: "Bevor ich weiter bremse, unterscheide ich Zweifel von Freigabe-Warten.",
          anchor: "Zweifel oder Freigabe-Warten?"
        },
        system_function: "Brake Awareness",
        icon: "PauseCircle"
      },
      {
        id: "d25-t2",
        title: "Stopp die innere Prüfung",
        trigger: "Nachdem du erkannt hast, dass dein System auf innere Freigabe wartet",
        when_to_use: "Direkt danach, bevor die Schleife länger wird",
        action: "Beende die zusätzliche Prüfung und wähle eine klare, kleine, funktionale Handlung.",
        why: "Die eigentliche Umcodierung von Tag 25 ist nicht Zweifel wegzumachen, sondern die Bremsschleife zu stoppen.",
        explanation: "Du brauchst heute nicht völlige Ruhe, keine perfekte Sicherheit und keine maximale Souveränität. Du brauchst nur die Bereitschaft, die zusätzliche Prüfung nicht weiterzufüttern und trotzdem klar zu handeln.",
        self_talk: "Nicht weiter prüfen.",
        micro_reframe: "Zweifel darf da sein. Er muss nicht verschwinden, damit ich handeln kann.",
        reframe_step: {
          trigger: "Ich merke, dass ich auf innere Freigabe warte.",
          reframe: "Jetzt stoppe ich die zusätzliche Prüfung und gehe in eine klare Handlung.",
          anchor: "Nicht weiter prüfen."
        },
        system_function: "Brake Stop",
        icon: "Ban"
      },
      {
        id: "d25-t3",
        title: "Setze die klare Handlung trotzdem",
        trigger: "Nachdem du die Bremsschleife gestoppt hast",
        when_to_use: "In der direkt nächsten relevanten Szene",
        action: "Setze eine klare, saubere Handlung, auch wenn Zweifel noch spürbar da ist.",
        why: "Confidence wird hier verhaltenswirksam: nicht trotz Zweifel perfekt sein, sondern trotz Zweifel klar handeln.",
        explanation: "Das kann heißen: Verantwortung nehmen, sprechen, fordern, im Prozess bleiben, in der Szene bleiben, eine Entscheidung setzen, präsent handeln. Nicht warten, bis du dich vollständig freigegeben fühlst.",
        self_talk: "Trotz Zweifel klar.",
        micro_reframe: "Ich brauche nicht die Zustimmung meines Zweifels, um eine saubere Handlung zu setzen.",
        reframe_step: {
          trigger: "Die Prüfung ist gestoppt, aber Zweifel ist noch da.",
          reframe: "Jetzt handle ich klar, ohne auf völlige innere Freigabe zu warten.",
          anchor: "Trotz Zweifel klar."
        },
        system_function: "Confidence Action",
        icon: "PlayCircle"
      }
    ],
    journal: {
      title: "Wo habe ich heute auf innere Freigabe gewartet — und wo trotzdem gehandelt?",
      questions: [
        { id: "d25-j1", question: "In welchen Momenten war heute Zweifel da — und mein System wollte sofort prüfen, warten oder absichern?", placeholder: "Beschreibe die Situation konkret." },
        { id: "d25-j2", question: "Woran habe ich gemerkt, dass Zweifel schon zur Bremsschleife geworden ist?", placeholder: "Wie zeigte sich das?" },
        { id: "d25-j3", question: "Konnte ich heute die zusätzliche Prüfung stoppen und trotzdem klar handeln?", placeholder: "Wie sah das konkret aus?" },
        { id: "d25-j4", question: "Was zeigt mir das darüber, wie sehr ich bisher auf innere Freigabe durch Sicherheit gewartet habe?", placeholder: "Formuliere den Kern möglichst klar." }
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist — auch etwas aus einem Moment, in dem du trotz Zweifel gehandelt hast.",
      free_reflection_prompt: "Was zeigt mir dieser Tag darüber, wie Confidence und Zweifel bei mir bisher zusammenarbeiten?"
    },
    gratitude_prompt: "Welche Handlung heute war ein echter Confidence-Schritt, obwohl Zweifel noch da war?",
    self_talk_anchors: [
      { text: "Zweifel oder Freigabe-Warten?", when: "Wenn dein Kopf in Prüfung kippt" },
      { text: "Nicht weiter prüfen.", when: "Wenn du die Bremsschleife stoppst" },
      { text: "Trotz Zweifel klar.", when: "Wenn du die Handlung setzt" }
    ],
    variants: {
      training: "Nutze Verantwortung, Druckmomente, Fehlerfolgen, Beobachtung und Unsicherheit als Hauptmaterial.",
      rest: "Übertrage den Tag auf Entscheidungen, Arbeit, Gespräche, Disziplinmomente und alles, bei dem du auf 'innere Freigabe' wartest.",
      match: "Kurzversion: Bremsschleife erkennen → Prüfung stoppen → trotz Zweifel klar handeln."
    }
  },
  {
    day_id: 26,
    title: "Der Gegner ist kein Urteil über mich",
    phase: "Phase II — Umcodieren",
    week: 4,
    line: "Fear vs Love / Ego vs Inner Excellence",
    lens: "Ein starkes Gegenüber ist kein Urteil über mich, sondern ein Reiz, an dem meine Qualität ehrlich geprüft wird.",
    primary_mechanism: "Opponent Reappraisal",
    today_trigger: "Sobald du merkst, dass dein System einen Gegner oder ein starkes Gegenüber innerlich größer macht und dich selbst kleiner werden lässt, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von Gegner als Selbstbildbedrohung zu Gegner als ehrlicher Prüfung deiner Qualität.",
    science_bite: "Der Gegner wird oft nicht nur sportlich schwierig, sondern psychologisch problematisch, wenn er dein Selbstbild triggert: Wie wirke ich gegen ihn? Bin ich genug? Was sagt das über mich? Genau dort kippt Gegnerschaft von Prüfung zu Urteil. Heute trainierst du die Gegenrichtung: Der Gegner bleibt stark, aber er wird nicht zu einem inneren Urteil über dich.",
    tasks: [
      {
        id: "d26-t1",
        title: "Erkenne die Überhöhung",
        trigger: "Wenn ein Gegner, Konkurrent oder starkes Gegenüber dich innerlich kleiner, vorsichtiger oder hektischer macht",
        when_to_use: "Bei starken Gegenspielern, Konkurrenzmomenten, Statusmomenten, Vergleich oder sichtbarer Athletik/Aura des Gegenübers",
        action: "Frag dich kurz: 'Mache ich ihn gerade größer als die Aufgabe?'",
        why: "Du musst zuerst merken, wann der Gegner nicht nur sportlich relevant, sondern psychologisch überhöht wird.",
        explanation: "Das Problem ist nicht nur seine Qualität. Das Problem beginnt dort, wo dein System aus dem Gegenüber eine Selbstbildprüfung macht: Ich darf hier nicht exposed werden, ich muss überleben, ich darf mich nicht blamieren.",
        self_talk: "Überhöhe ich ihn gerade?",
        micro_reframe: "Ein starker Gegner ist real — aber er muss nicht innerlich übergroß werden.",
        reframe_step: {
          trigger: "Der Gegner wirkt innerlich zu groß.",
          reframe: "Bevor ich reagiere, prüfe ich, ob ich gerade seine Stärke mit einem Urteil über mich vermische.",
          anchor: "Überhöhe ich ihn gerade?"
        },
        system_function: "Threat Awareness",
        icon: "Eye"
      },
      {
        id: "d26-t2",
        title: "Lies ihn als Prüfung, nicht als Urteil",
        trigger: "Nachdem du die Überhöhung erkannt hast",
        when_to_use: "Direkt im Gegnermoment oder kurz davor",
        action: "Sag dir einmal klar: 'Prüfung, nicht Urteil.'",
        why: "Tag 26 wird erst stark, wenn der Gegner innerlich neu gelesen wird.",
        explanation: "Nicht: Er ist nicht stark. Nicht: Ich habe keine Angst. Sondern: Das ist eine echte Prüfung. Dafür trainiere ich. Hier wird Qualität ehrlich sichtbar. Der Gegner bleibt real, aber er wird nicht zu einer Aussage über deinen Wert.",
        self_talk: "Prüfung, nicht Urteil.",
        micro_reframe: "Ein Urteil macht klein. Eine Prüfung fordert Qualität.",
        reframe_step: {
          trigger: "Ich habe die Überhöhung erkannt.",
          reframe: "Jetzt lese ich das Gegenüber als Prüfstein statt als Bedrohung meines Bildes.",
          anchor: "Prüfung, nicht Urteil."
        },
        system_function: "Meaning Shift",
        icon: "RefreshCw"
      },
      {
        id: "d26-t3",
        title: "Geh sauber in den Kontakt",
        trigger: "Wenn der reale Kontakt mit dem Gegner da ist",
        when_to_use: "Im Duell, in direktem Konkurrenzkontakt, im ersten echten Gegnermoment danach",
        action: "Frag dich: 'Was ist hier meine saubere Kontakt-Handlung?' und tue genau diese.",
        why: "Die neue Lesart muss direkt Verhalten verändern, sonst bleibt Tag 26 kognitiv.",
        explanation: "Nicht ausweichen. Nicht imponieren. Nicht überkompensieren. Sondern präsent bleiben, bei deiner Aufgabe bleiben, die Szene spielen, deinen Raum halten, klar kommunizieren und nicht in Schutzlogik kippen.",
        self_talk: "Sauber in den Kontakt.",
        micro_reframe: "Ich spiele nicht seine Aura und nicht mein Bild — ich spiele die Szene.",
        reframe_step: {
          trigger: "Der Gegnermoment ist da.",
          reframe: "Jetzt zählt nicht sein Status, sondern meine saubere Kontakt-Handlung.",
          anchor: "Sauber in den Kontakt."
        },
        system_function: "Embodied Contact",
        icon: "ArrowRightCircle"
      }
    ],
    journal: {
      title: "Wie habe ich den Gegner heute gelesen?",
      questions: [
        { id: "d26-j1", question: "In welchem Moment habe ich heute einen Gegner oder ein starkes Gegenüber innerlich überhöht?", placeholder: "Beschreibe die Szene konkret." },
        { id: "d26-j2", question: "Woran habe ich gemerkt, dass mein System daraus eher ein Urteil über mich gemacht hat?", placeholder: "Was lief innerlich ab?" },
        { id: "d26-j3", question: "Konnte ich das Gegenüber mindestens einmal als Prüfung statt als Urteil lesen?", placeholder: "Wie hat sich das verändert?" },
        { id: "d26-j4", question: "Wie sah meine saubere Kontakt-Handlung in diesem Moment aus?", placeholder: "Beschreibe die konkrete Handlung." }
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist — auch etwas aus einem Konkurrenz- oder Gegnermoment.",
      free_reflection_prompt: "Was zeigt mir dieser Tag darüber, wie stark mein Selbstbild noch auf starke Gegenüber reagiert?"
    },
    gratitude_prompt: "Welcher Gegnermoment heute hat mir gezeigt, dass Prüfung etwas anderes ist als Urteil?",
    self_talk_anchors: [
      { text: "Überhöhe ich ihn gerade?", when: "Wenn das Gegenüber innerlich zu groß wird" },
      { text: "Prüfung, nicht Urteil.", when: "Wenn du die Lesart korrigierst" },
      { text: "Sauber in den Kontakt.", when: "Im direkten Gegnermoment" }
    ],
    variants: {
      training: "Nutze direkte Duelle, Konkurrenz, Vergleich und starke Gegenüber als Hauptmaterial.",
      rest: "Übertrage den Tag auf Konkurrenz, dominante Persönlichkeiten, Vergleich und Statusmomente im Alltag.",
      match: "Kurzversion: Überhöhung erkennen → Prüfung statt Urteil → sauber in den Kontakt."
    }
  },
  {
    day_id: 27,
    title: "Mögliches Scheitern darf die richtige Handlung nicht blockieren",
    phase: "Phase II — Umcodieren",
    week: 4,
    line: "Growth vs Winning / Learning vs Judgement",
    lens: "Wenn eine dienliche, entwicklungsrelevante Handlung sichtbar scheitern könnte, ist das kein automatischer Grund, sie zu vermeiden.",
    primary_mechanism: "Failure-Risk Decoupling",
    today_trigger: "Sobald du merkst, dass dein System lieber die bildschonende statt die entwicklungsrelevante Handlung wählen will, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von Schutz vor möglichem Misslingen zu offener, dienlicher Handlung trotz sichtbarem Risiko.",
    science_bite: "Viele Systeme schützen sich nicht vor sinnlosem Risiko, sondern vor sichtbarem Misslingen. Genau dort wird Entwicklung oft begrenzt: nicht weil die Handlung falsch wäre, sondern weil ihr mögliches Scheitern sozial, emotional oder identitär aufgeladen ist. Heute trainierst du nicht, zu scheitern. Du trainierst, das Risiko sichtbaren Scheiterns nicht automatisch über die richtige Handlung zu stellen.",
    tasks: [
      {
        id: "d27-t1",
        title: "Erkenne die bildschützende Wahl",
        trigger: "Wenn du zwischen einer sicheren und einer offeneren, entwicklungsrelevanten Handlung stehst",
        when_to_use: "Bei Verantwortung, Mutmomenten, sichtbaren Entscheidungen, neuen Lösungen, ehrlicher Kommunikation oder echter Initiative",
        action: "Markiere innerlich: 'Das ist die bildschützende Wahl.'",
        why: "Bevor du bewusst ein Scheiterrisiko tragen kannst, musst du sehen, wo dein System gerade lieber sein Bild als deine Entwicklung schützt.",
        explanation: "Weg A wirkt sauberer, kontrollierter, weniger sichtbar, weniger peinlich. Weg B ist offener, echter, entwicklungsrelevanter und hat reale Chance, nicht sofort zu klappen. Genau dort liegt Tag 27.",
        self_talk: "Das ist die bildschützende Wahl.",
        micro_reframe: "Nicht alles, was sicher aussieht, dient heute wirklich meiner Entwicklung.",
        reframe_step: {
          trigger: "Ich spüre zwei Wege: sicherer oder offener.",
          reframe: "Bevor ich automatisch Sicherheit wähle, mache ich die bildschützende Wahl sichtbar.",
          anchor: "Das ist die bildschützende Wahl."
        },
        system_function: "Protection Awareness",
        icon: "Eye"
      },
      {
        id: "d27-t2",
        title: "Wähle die dienliche offene Handlung",
        trigger: "Nachdem dir die bildschützende Wahl klar geworden ist",
        when_to_use: "Direkt vor der relevanten Handlung",
        action: "Frag dich: 'Welche Handlung dient mehr, auch wenn sie scheitern könnte?' und wähle genau diese.",
        why: "Hier liegt die Umcodierung: nicht nur erkennen, sondern anders wählen.",
        explanation: "Heute geht es nicht um blindes Risiko, Show oder Chaos. Es geht um die Handlung, die der Situation und deiner Entwicklung dient — auch wenn sie sichtbar scheitern könnte.",
        self_talk: "Offen handeln.",
        micro_reframe: "Entwicklung braucht heute nicht perfekte Sicherheit, sondern die richtige offene Handlung.",
        reframe_step: {
          trigger: "Ich kenne die bildschützende und die dienliche Option.",
          reframe: "Jetzt wähle ich nicht, was mein Bild schützt, sondern was mehr dient.",
          anchor: "Offen handeln."
        },
        system_function: "Open Choice",
        icon: "StepForward"
      },
      {
        id: "d27-t3",
        title: "Trag das mögliche Misslingen sauber",
        trigger: "Wenn du die offene Handlung gewählt hast und sofort Angst, Schutz oder Nachbewertung auftaucht",
        when_to_use: "Direkt während oder nach der offenen Handlung",
        action: "Bleib bei der Handlung, ohne ihr mögliches Misslingen sofort zum Urteil über dich zu machen.",
        why: "Tag 27 wird erst vollständig, wenn sichtbares Risiko nicht sofort wieder ins Selbstbild kippt.",
        explanation: "Du musst nicht cool oder angstfrei sein. Du sollst nur die richtige Handlung setzen und ihr mögliches Misslingen nicht sofort identitär aufblasen.",
        self_talk: "Nicht schützen. Dienen.",
        micro_reframe: "Mögliches Misslingen macht die Handlung nicht falsch, wenn sie dienlich und entwicklungsrelevant ist.",
        reframe_step: {
          trigger: "Die offene Handlung fühlt sich riskant oder exponiert an.",
          reframe: "Jetzt halte ich sie nicht nur aus — ich trage sie sauber, ohne sie sofort gegen mich zu verwenden.",
          anchor: "Nicht schützen. Dienen."
        },
        system_function: "Failure-Risk Tolerance",
        icon: "Unlock"
      }
    ],
    journal: {
      title: "Wo habe ich heute offene Handlung über Bildschutz gestellt?",
      questions: [
        { id: "d27-j1", question: "In welcher Situation wollte mein System heute lieber die sichere, bildschonende Handlung wählen?", placeholder: "Beschreibe die Situation konkret." },
        { id: "d27-j2", question: "Welche offenere, dienlichere Handlung war dort möglich?", placeholder: "Was wäre die entwicklungsrelevante Handlung gewesen?" },
        { id: "d27-j3", question: "Konnte ich diese offene Handlung heute mindestens einmal wirklich wählen?", placeholder: "Wie sah das aus?" },
        { id: "d27-j4", question: "Wie hat mein System auf das mögliche sichtbare Misslingen reagiert?", placeholder: "Was war innerlich spürbar?" }
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist — auch etwas aus einem Moment, in dem offenes Handeln riskant wirkte.",
      free_reflection_prompt: "Was zeigt mir dieser Tag darüber, wie stark ich Entwicklung noch an Bildschutz und Misslingensvermeidung knüpfe?"
    },
    gratitude_prompt: "Welche offene Handlung heute war vielleicht wichtiger als ihr möglicher Ausgang?",
    self_talk_anchors: [
      { text: "Das ist die bildschützende Wahl.", when: "Wenn Sicherheit zu attraktiv wirkt" },
      { text: "Offen handeln.", when: "Wenn du die dienliche Option wählst" },
      { text: "Nicht schützen. Dienen.", when: "Wenn das Risiko sichtbar wird" }
    ],
    variants: {
      training: "Nutze Verantwortung, sichtbare Entscheidungen, Initiative, Kommunikation und Mutmomente als Material.",
      rest: "Übertrage den Tag auf Gespräche, Entscheidungen, Sichtbarkeit, ehrliche Schritte und alles, was du lieber aus Bildschutz vermeiden würdest.",
      match: "Kurzversion: bildschützende Wahl erkennen → dienliche offene Handlung wählen → mögliches Misslingen sauber tragen."
    }
  },
  {
    day_id: 28,
    title: "Unfairness darf nicht mein inneres Zentrum übernehmen",
    phase: "Phase II — Umcodieren",
    week: 4,
    line: "Control vs Non-Control / Process Stability",
    lens: "Auch wenn etwas unfair oder gegen mich läuft, bleibt meine Funktion größer als mein Protest dagegen.",
    primary_mechanism: "Protest Regulation Under Non-Control",
    today_trigger: "Sobald etwas klar gegen dich läuft und dein System innerlich in Protest, Frust oder Opfermodus gehen will, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von Unfairness als Hauptgeschichte zu Funktion trotz Unfairness.",
    science_bite: "Wettkämpfe kippen oft nicht nur an Fehlern, sondern daran, dass äußere Unfairness innerlich zu groß wird. Wertungsinstanz-Entscheidungen, Bedingungen, Rollen, Timing, Verhalten anderer oder Pechmomente können real sein. Das Problem entsteht oft dann, wenn dein inneres System daraus die Hauptgeschichte macht. Dann wird deine Funktion kleiner als dein Protest. Heute trainierst du nicht, Unfairness gutzufinden — sondern deine Funktion größer zu halten als den inneren Kampf dagegen. ",
    tasks: [
      {
        id: "d28-t1",
        title: "Erkenne den Protestmodus",
        trigger: "Wenn etwas unfair, gegen dich oder störend läuft und dein System sofort innerlich dagegen kämpft",
        when_to_use: "Bei Calls, Rollen, Fehlern anderer, Bedingungen, Pechmomenten, Spielverlauf oder ungerechter Dynamik",
        action: "Frag dich kurz: 'Bin ich gerade noch in Funktion — oder schon im Protestmodus?'",
        why: "Bevor du Unfairness regulieren kannst, musst du merken, wann dein System nicht nur Schwieriges registriert, sondern innerlich in Protest kippt.",
        explanation: "Die entscheidende Frage ist heute nicht nur: War das unfair? Sondern: Hat das Ereignis gerade die Mitte meines Systems übernommen?",
        self_talk: "Protestmodus?",
        micro_reframe: "Das Ereignis ist real — aber es muss nicht mein ganzes inneres Zentrum werden.",
        reframe_step: {
          trigger: "Etwas läuft klar gegen mich.",
          reframe: "Bevor ich komplett einsteige, prüfe ich, ob ich schon im Protestmodus bin.",
          anchor: "Protestmodus?"
        },
        system_function: "Protest Awareness",
        icon: "AlertTriangle"
      },
      {
        id: "d28-t2",
        title: "Hol die Funktion nach vorne",
        trigger: "Nachdem du den Protestmodus erkannt hast",
        when_to_use: "Direkt danach, bevor Frustschleife oder Opfermodus weiterläuft",
        action: "Frag dich: 'Was liegt trotz allem noch bei mir?' und hole genau das nach vorne.",
        why: "Die Umcodierung gelingt nur, wenn das, was noch bei dir liegt, größer bleibt als der Kampf gegen das, was nicht bei dir liegt.",
        explanation: "Nicht alles ist verloren, nur weil etwas unfair ist. Deine Funktion kann trotzdem noch an Haltung, Kommunikation, Präsenz, Prozess, nächster Aktion oder Kontakt hängen. Genau das muss heute wieder nach vorne.",
        self_talk: "Was liegt noch bei mir?",
        micro_reframe: "Auch unter Unfairness bleibt oft noch genug bei mir, um funktional zu bleiben.",
        reframe_step: {
          trigger: "Ich habe den Protestmodus erkannt.",
          reframe: "Jetzt hole ich das Steuerbare wieder vor das Unverfügbare.",
          anchor: "Was liegt noch bei mir?"
        },
        system_function: "Function Recovery",
        icon: "LocateFixed"
      },
      {
        id: "d28-t3",
        title: "Wettkämpfe die nächste funktionale Sache",
        trigger: "Wenn du das Steuerbare wieder etwas klarer vor dir hast",
        when_to_use: "In der direkt nächsten Szene",
        action: "Setze nur die nächste funktionale Handlung, statt weiter gegen das Ereignis zu kämpfen.",
        why: "Tag 28 wird erst real, wenn Funktion praktisch größer bleibt als Protest.",
        explanation: "Nicht die ganze Situation retten. Nicht Gerechtigkeit herstellen. Nicht innerlich alles lösen. Nur die nächste funktionale Sache spielen: Präsenz, Kommunikation, Kontakt, Prozess, Haltung, Entscheidung.",
        self_talk: "Funktion vor Protest.",
        micro_reframe: "Ich verliere mehr an die Frustschleife als an das Ereignis selbst, wenn ich meine Funktion aufgebe.",
        reframe_step: {
          trigger: "Ich sehe wieder, was bei mir liegt.",
          reframe: "Jetzt spiele ich die nächste funktionale Sache statt weiter innerlich zu kämpfen.",
          anchor: "Funktion vor Protest."
        },
        system_function: "Functional Continuation",
        icon: "ArrowRightCircle"
      }
    ],
    journal: {
      title: "Wo wurde Unfairness heute größer als meine Funktion — und wo nicht?",
      questions: [
        { id: "d28-j1", question: "Welche Situation ist heute klar gegen mich oder unfair gelaufen?", placeholder: "Beschreibe die Situation konkret." },
        { id: "d28-j2", question: "Woran habe ich gemerkt, dass mein System in Protestmodus oder Frustschleife kippt?", placeholder: "Was war innerlich spürbar?" },
        { id: "d28-j3", question: "Was lag trotz allem noch bei mir?", placeholder: "Was war noch steuerbar?" },
        { id: "d28-j4", question: "Welche nächste funktionale Handlung habe ich dann gespielt?", placeholder: "Beschreibe die konkrete Szene." }
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist — auch etwas aus einer unfairen oder gegen dich laufenden Situation.",
      free_reflection_prompt: "Was zeigt mir dieser Tag darüber, wie schnell äußeres Chaos mein inneres Zentrum übernimmt?"
    },
    gratitude_prompt: "Welche gegen mich laufende Situation heute hat mir gezeigt, dass Funktion größer bleiben kann als Protest?",
    self_talk_anchors: [
      { text: "Protestmodus?", when: "Wenn etwas unfair oder gegen dich läuft" },
      { text: "Was liegt noch bei mir?", when: "Wenn du Funktion zurückholen willst" },
      { text: "Funktion vor Protest.", when: "In der nächsten funktionalen Handlung" }
    ],
    variants: {
      training: "Nutze Rollen, Fehler anderer, Bedingungen, Unterbrechungen und ungerechte Dynamiken als Material.",
      rest: "Übertrage den Tag auf Unfairness, Verzögerung, äußere Umstände, andere Menschen und Situationen, in denen du schnell ins innere Kämpfen kippst.",
      match: "Kurzversion: Protestmodus erkennen → Steuerbares nach vorne holen → Funktion vor Protest."
    }
  },
  {
    day_id: 29,
    title: "Wenn es zählt, bleibe ich meine Version",
    phase: "Phase III — Transfer und Druck",
    week: 5,
    line: "Identity vs Pressure",
    lens: "Wenn es zählt, darf ich nicht in eine kleinere Version von mir kippen.",
    primary_mechanism: "Identity Stability Under Pressure",
    today_trigger: "Sobald eine Situation Bedeutung bekommt und dein System kleiner, enger oder weniger wie deine gewählte Version werden will, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von Relevanz = kleinere Version zu Relevanz = gleiche Identitätsrichtung unter Last.",
    science_bite: "Druck verändert oft nicht nur Fokus, sondern Version. Viele Systeme werden in bedeutenden Momenten kleiner: vorsichtiger, stiller, weniger klar, weniger offen, weniger mutig. Nicht weil Fähigkeit plötzlich weg ist, sondern weil Relevanz die Identitätslinie verzieht. Heute trainierst du, dass Bedeutung nicht automatisch deine Version schrumpfen muss. ",
    tasks: [
      {
        id: "d29-t1",
        title: "Erkenne die kleinere Version",
        trigger: "Wenn eine Situation plötzlich zählt und du merkst, dass dein Verhalten enger, kleiner oder vorsichtiger wird",
        when_to_use: "Bei Druckszenen, Beobachtung, Relevanz, Verantwortung, Matchnähe oder sichtbaren Situationen",
        action: "Frag dich kurz: 'Werde ich hier gerade zu einer kleineren Version von mir?'",
        why: "Du kannst Relevanz nur anders tragen, wenn du merkst, wie sie deine Version verzerren will.",
        explanation: "Die kleinere Version ist oft nicht dramatisch. Sie ist einfach weniger du: weniger präsent, weniger mutig, weniger offen, weniger klar, weniger aktiv. Genau diese Schrumpfung soll heute sichtbar werden.",
        self_talk: "Kleinere Version?",
        micro_reframe: "Druck will mich oft nicht nur stressen, sondern schrumpfen.",
        reframe_step: {
          trigger: "Die Situation bekommt Bedeutung und ich werde enger.",
          reframe: "Bevor ich mich verliere, prüfe ich, ob ich gerade in eine kleinere Version kippe.",
          anchor: "Kleinere Version?"
        },
        system_function: "Identity Threat Awareness",
        icon: "Search"
      },
      {
        id: "d29-t2",
        title: "Erinnere deine Richtung",
        trigger: "Nachdem dir klar geworden ist, dass du kleiner wirst",
        when_to_use: "Direkt danach, bevor die Szene dich weiter schrumpft",
        action: "Frag dich: 'Welche Version von mir will ich hier trotzdem sein?'",
        why: "Relevanz muss an Richtung gebunden werden, nicht an alte Schutzmuster.",
        explanation: "Nicht perfekt. Nicht heldenhaft. Nur wieder dieselbe Richtung: präsent, klar, mutig, sauber, offen, dienlich, prozessorientiert. Tag 29 will, dass deine Version auch unter Bedeutung wieder auftaucht.",
        self_talk: "Welche Version bin ich hier?",
        micro_reframe: "Wenn es zählt, brauche ich nicht eine neue Maske — ich brauche Rückkehr zu meiner Richtung.",
        reframe_step: {
          trigger: "Ich sehe die kleinere Version.",
          reframe: "Jetzt erinnere ich nicht den Ausgang, sondern meine Richtung.",
          anchor: "Welche Version bin ich hier?"
        },
        system_function: "Identity Recall",
        icon: "Compass"
      },
      {
        id: "d29-t3",
        title: "Zeig die Version in einer Handlung",
        trigger: "Wenn dir die gewünschte Version wieder klarer ist",
        when_to_use: "In der direkt nächsten Handlung",
        action: "Setze eine konkrete Handlung, die zeigt, dass du nicht in die kleinere Version gekippt bist.",
        why: "Tag 29 wird erst real, wenn Identität unter Druck im Verhalten sichtbar bleibt.",
        explanation: "Das kann sein: wieder anbieten, klar sprechen, offen bleiben, den Kontakt nehmen, präsent im Prozess bleiben, nicht kleiner werden, Verantwortung nicht abgeben. Nicht die ganze Identität retten — nur die nächste echte Handlung setzen.",
        self_talk: "Zeig die Version.",
        micro_reframe: "Ich halte meine Richtung nicht durch Gefühl, sondern durch Handlung.",
        reframe_step: {
          trigger: "Meine Richtung ist wieder klarer.",
          reframe: "Jetzt zeige ich sie in der nächsten sichtbaren Handlung.",
          anchor: "Zeig die Version."
        },
        system_function: "Embodied Identity",
        icon: "ArrowRightCircle"
      }
    ],
    journal: {
      title: "Wo wollte Relevanz mich heute kleiner machen?",
      questions: [
        { id: "d29-j1", question: "In welcher Situation wurde heute besonders spürbar, dass es zählt?", placeholder: "Beschreibe die Szene konkret." },
        { id: "d29-j2", question: "Woran habe ich gemerkt, dass ich in eine kleinere Version kippen wollte?", placeholder: "Wie zeigte sich das?" },
        { id: "d29-j3", question: "Welche Version von mir wollte ich in dieser Situation trotzdem sein?", placeholder: "Formuliere sie so klar wie möglich." },
        { id: "d29-j4", question: "Welche Handlung hat gezeigt, dass ich diese Richtung nicht ganz verloren habe?", placeholder: "Beschreibe die konkrete Handlung." }
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist — auch etwas aus einem Moment, in dem Bedeutung hoch war.",
      free_reflection_prompt: "Was zeigt mir dieser Tag darüber, wie stark Relevanz mein Verhalten und meine Version bisher verkleinert?"
    },
    gratitude_prompt: "Welche Drucksituation heute hat mir gezeigt, dass ich meine Richtung auch unter Bedeutung halten kann?",
    self_talk_anchors: [
      { text: "Kleinere Version?", when: "Wenn du unter Relevanz enger wirst" },
      { text: "Welche Version bin ich hier?", when: "Wenn du deine Richtung erinnern willst" },
      { text: "Zeig die Version.", when: "In der nächsten Handlung" }
    ],
    variants: {
      training: "Nutze sichtbare, bedeutende, druckvolle oder evaluierte Situationen als Material.",
      rest: "Übertrage den Tag auf Gespräche, Entscheidungen, Verantwortung, Auftritte und Momente, in denen du dich kleiner machst, sobald etwas zählt.",
      match: "Kurzversion: kleinere Version erkennen → Richtung erinnern → Version in Handlung zeigen."
    }
  },
  {
    day_id: 30,
    title: "Wenn der Ausgang groß wird, bleibt mein Arbeitsort im Prozess",
    phase: "Phase III — Transfer und Druck",
    week: 5,
    line: "Process vs Result",
    lens: "Wenn der Ausgang psychologisch groß wird, muss ich nicht alles retten — ich brauche meinen Arbeitsort.",
    primary_mechanism: "Process Stability Under Outcome Pressure",
    today_trigger: "Sobald der Ausgang, die Bedeutung oder die Konsequenz einer Situation deinen Kopf psychologisch zieht, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von Ausgangs-Zug zu Prozessanker und nächster Prozesshandlung.",
    science_bite: "Ergebnisdruck zerstört oft nicht nur Fokus, sondern macht Handlung zu groß. Dann will dein System alles retten, alles entscheiden, alles kontrollieren. Genau dadurch verliert es den eigentlichen Arbeitsort. Heute trainierst du deshalb nicht, den Ausgang wegzureden, sondern deinen Prozessanker wieder nach vorne zu holen und nur die nächste saubere Prozesshandlung zu spielen. ",
    tasks: [
      {
        id: "d30-t1",
        title: "Erkenne den Ausgangs-Zug",
        trigger: "Wenn eine Situation plötzlich sehr viel bedeutet und dein Kopf stärker beim Ausgang als bei der Aktion lebt",
        when_to_use: "Bei Relevanz, Druck, Bewertung, entscheidenden Szenen, sichtbaren Konsequenzen oder innerem Kontrollwunsch",
        action: "Frag dich kurz: 'Bin ich gerade beim Ausgang — oder bei der Aktion?'",
        why: "Tag 30 beginnt damit, Ergebnisdruck als Aufmerksamkeitsproblem sichtbar zu machen.",
        explanation: "Sobald dein System den Ausgang psychologisch groß macht, will es oft sichern, erzwingen oder kontrollieren. Genau dieser Zug muss heute zuerst sichtbar werden.",
        self_talk: "Ausgang oder Aktion?",
        micro_reframe: "Wenn der Ausgang groß wird, verliere ich oft nicht Fähigkeit, sondern meinen Arbeitsort.",
        reframe_step: {
          trigger: "Die Szene wird innerlich groß und bedeutungsvoll.",
          reframe: "Bevor ich retten oder sichern will, prüfe ich zuerst meinen Aufmerksamkeitsort.",
          anchor: "Ausgang oder Aktion?"
        },
        system_function: "Outcome Pressure Awareness",
        icon: "Goal"
      },
      {
        id: "d30-t2",
        title: "Hol deinen Prozessanker zurück",
        trigger: "Nachdem du den Ausgangs-Zug erkannt hast",
        when_to_use: "Direkt danach, bevor dein Kopf weiter in Kontrolle, Sicherung oder Erzwingen geht",
        action: "Bring bewusst deinen Prozessanker wieder nach vorne.",
        why: "Ergebnisdruck wird praktisch nur dann regulierbar, wenn du wieder einen klaren Arbeitsort hast.",
        explanation: "Nicht alles lösen. Nicht die ganze Szene gewinnen. Nicht das komplette Ergebnis tragen. Nur deinen Prozessanker wieder nach vorne holen: Kontakt, Kommunikation, Haltung, Laufweg, Timing, Präsenz, technischer Fokus oder deine nächste klare Aufgabe.",
        self_talk: "Zurück an meinen Arbeitsort.",
        micro_reframe: "Wenn der Ausgang zieht, brauche ich nicht mehr Druck — ich brauche meinen Anker.",
        reframe_step: {
          trigger: "Ich habe den Ausgangs-Zug erkannt.",
          reframe: "Jetzt bringe ich meinen Prozesspunkt wieder vor den Ausgang.",
          anchor: "Zurück an meinen Arbeitsort."
        },
        system_function: "Anchor Recovery",
        icon: "LocateFixed"
      },
      {
        id: "d30-t3",
        title: "Wettkämpfe nur die nächste Prozesshandlung",
        trigger: "Wenn dein Prozessanker wieder vorne ist",
        when_to_use: "In der direkt nächsten relevanten Szene",
        action: "Frag dich: 'Was ist jetzt nur meine nächste Prozesshandlung?' und tue genau diese.",
        why: "Ergebnisdruck macht Handlung oft zu groß. Tag 30 macht sie wieder spielbar.",
        explanation: "Nicht die nächste große, nicht die endgültige, nicht die perfekte — nur die nächste, die wirklich bei dir liegt. Genau das schützt Leistung unter Ergebnisdruck am stärksten.",
        self_talk: "Nur die nächste.",
        micro_reframe: "Ich muss nicht den ganzen Ausgang lösen. Ich muss nur meine nächste Prozesshandlung spielen.",
        reframe_step: {
          trigger: "Mein Anker ist wieder vorne.",
          reframe: "Jetzt mache ich die Handlung wieder klein genug, damit sie wirklich spielbar wird.",
          anchor: "Nur die nächste."
        },
        system_function: "Process Playability",
        icon: "ArrowRightCircle"
      }
    ],
    journal: {
      title: "Wo war mein Arbeitsort, als der Ausgang groß wurde?",
      questions: [
        { id: "d30-j1", question: "In welchem Moment war der Ausgang heute am größten in meinem Kopf?", placeholder: "Beschreibe die Situation konkret." },
        { id: "d30-j2", question: "Woran habe ich gemerkt, dass mein System sichern, erzwingen oder kontrollieren wollte?", placeholder: "Wie zeigte sich das innerlich oder im Verhalten?" },
        { id: "d30-j3", question: "Welchen Prozessanker habe ich bewusst wieder nach vorne geholt?", placeholder: "Was war dein Arbeitsort?" },
        { id: "d30-j4", question: "Welche nächste Prozesshandlung habe ich dann gespielt?", placeholder: "Beschreibe die konkrete Handlung." }
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist — mindestens 1 Sache, die heute viel Bedeutung hatte, 1 Sache, bei der der Ausgang an dir gezogen hat, und 1 Sache, die dir gezeigt hat, dass Prozess unter Druck ein echter Halt sein kann.",
      free_reflection_prompt: "Was zeigt mir dieser Tag darüber, wie stabil mein Arbeitsort schon unter Ergebnisdruck ist?"
    },
    gratitude_prompt: "Welche bedeutungsvolle Situation heute hat mir gezeigt, dass Prozess unter Druck ein echter Halt sein kann?",
    self_talk_anchors: [
      { text: "Ausgang oder Aktion?", when: "Wenn der Ausgang psychologisch zieht" },
      { text: "Zurück an meinen Arbeitsort.", when: "Wenn du deinen Prozessanker zurückholst" },
      { text: "Nur die nächste.", when: "Wenn du die Handlung wieder spielbar machst" }
    ],
    variants: {
      training: "Nutze druckvolle, bewertete oder bedeutungsvolle Szenen als Material.",
      rest: "Übertrage den Tag auf Zukunftsdenken, Konsequenzen, Leistungsgrübeln und Alltagssituationen, in denen der Ausgang zu groß wird.",
      match: "Kurzversion: Ausgangs-Zug erkennen → Prozessanker zurückholen → nur die nächste Prozesshandlung."
    }
  },
  {
    day_id: 31,
    title: "Nach Fehler nicht ins Ich kippen",
    phase: "Phase III — Transfer und Druck",
    week: 5,
    line: "Learning vs Judgement / Identity Stability",
    lens: "Ein Fehler unter Druck darf Information bleiben, statt sofort auf mein Selbst überzuspringen.",
    primary_mechanism: "Error-to-Self Decoupling",
    today_trigger: "Sobald dir in einer relevanten oder druckvollen Situation etwas misslingt und dein System es sofort auf dich selbst bezieht, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von Fehler = Ich zu Fehler = Information plus funktionale Rückkehr.",
    science_bite: "Unter Druck wird ein Fehler oft nicht nur als misslungene Handlung erlebt. Er springt schnell auf das Selbst: Was sagt das über mich? Bin ich raus? Jetzt sehen es alle. Genau dadurch wird aus einer Handlungspanne ein Identitätsangriff. Heute trainierst du, Fehler klar zu sehen, ohne dass er sofort dein Selbstbild übernimmt. ",
    tasks: [
      {
        id: "d31-t1",
        title: "Erkenne den Ich-Sprung",
        trigger: "Wenn dir unter Druck etwas misslingt und sofort Sätze auftauchen, die mehr über dich als über die Handlung sagen",
        when_to_use: "Nach Fehlpass, technischer Unsicherheit, falscher Entscheidung, verpasster Chance oder sichtbarem Fehler in relevanter Szene",
        action: "Frag dich kurz: 'Bleibt der Fehler gerade bei der Handlung — oder springt er schon auf mich?'",
        why: "Du musst zuerst sichtbar machen, wann der Fehler nicht mehr nur Fehler bleibt, sondern identitär aufgeladen wird.",
        explanation: "Genau dieser Sprung ist der Kern von Tag 31. Nicht nur: etwas lief schief. Sondern: mein System macht sofort mehr daraus — über mich, meinen Wert, meine Stabilität oder meine Zugehörigkeit.",
        self_talk: "Handlung oder Ich?",
        micro_reframe: "Der Fehler ist real. Der Ich-Angriff ist die zweite Schicht.",
        reframe_step: {
          trigger: "Etwas misslingt und mein System wird sofort persönlich.",
          reframe: "Bevor ich komplett hineinkippe, prüfe ich, ob der Fehler gerade von der Handlung auf mein Selbst springt.",
          anchor: "Handlung oder Ich?"
        },
        system_function: "Identity Attack Awareness",
        icon: "Eye"
      },
      {
        id: "d31-t2",
        title: "Halte ihn bei der Handlung",
        trigger: "Nachdem du den Ich-Sprung erkannt hast",
        when_to_use: "Direkt im Moment nach dem Fehler, bevor sich Enge, Rückzug oder Hektik weiter aufbauen",
        action: "Formuliere für dich nur die Handlungsinformation: Was genau war unsauber, zu spät, falsch gelesen oder schlecht ausgeführt?",
        why: "Tag 31 wird erst wirksam, wenn du den Fehler wieder an die Ebene bindest, auf die er wirklich gehört.",
        explanation: "Nicht 'ich bin schlecht'. Sondern: zu spät, unklar, unsauber, falscher Winkel, schlechter Kontakt, falsches Timing. Du hältst den Fehler dort, wo er bearbeitbar bleibt.",
        self_talk: "Nur die Handlung.",
        micro_reframe: "Wenn ich beim Konkreten bleibe, wird der Fehler wieder arbeitsfähig.",
        reframe_step: {
          trigger: "Ich habe den Ich-Sprung erkannt.",
          reframe: "Jetzt führe ich den Fehler zurück an die Handlungsebene.",
          anchor: "Nur die Handlung."
        },
        system_function: "Error Localization",
        icon: "Target"
      },
      {
        id: "d31-t3",
        title: "Geh funktional zurück",
        trigger: "Wenn die Handlungsinformation wieder klarer ist",
        when_to_use: "In der direkt nächsten Szene nach dem Fehler",
        action: "Setze eine funktionale Rückkehrhandlung, ohne den Fehler weiter als Ich-Urteil mitzuschleppen.",
        why: "Der Tag soll Fehler unter Druck nicht nur entschärfen, sondern die Rückkehr sauber organisieren.",
        explanation: "Nicht perfekt kompensieren. Nicht retten. Nicht innerlich Buße tun. Sondern präsent zurückgehen: anbieten, kommunizieren, Position halten, Prozesspunkt spielen, in der Szene bleiben.",
        self_talk: "Zurück in Funktion.",
        micro_reframe: "Mein nächster Schritt muss nicht mein Selbst retten, sondern nur meine Funktion wieder aufnehmen.",
        reframe_step: {
          trigger: "Die Information ist klarer und der Ich-Angriff schwächer.",
          reframe: "Jetzt gehe ich nicht in Selbstschutz, sondern zurück in funktionales Handeln.",
          anchor: "Zurück in Funktion."
        },
        system_function: "Functional Return",
        icon: "ArrowRightCircle"
      }
    ],
    journal: {
      title: "Wann ist ein Fehler heute auf mein Ich gesprungen — und wann nicht?",
      questions: [
        { id: "d31-j1", question: "In welcher druckvollen Szene ist heute ein Fehler am stärksten auf mein Selbst übergesprungen?", placeholder: "Beschreibe die Situation konkret." },
        { id: "d31-j2", question: "Woran habe ich gemerkt, dass mein System mehr daraus macht als nur Handlungsinformation?", placeholder: "Welche inneren Sätze oder Reaktionen waren da?" },
        { id: "d31-j3", question: "Konnte ich den Fehler mindestens einmal wieder an der Handlungsebene festmachen?", placeholder: "Was war dann die konkrete Information?" },
        { id: "d31-j4", question: "Wie sah meine funktionale Rückkehr aus, ohne dass ich weiter ins Ich gekippt bin?", placeholder: "Beschreibe die nächste Szene." }
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist — auch etwas aus einer Fehler-Situation unter Druck.",
      free_reflection_prompt: "Was zeigt mir dieser Tag darüber, wie schnell mein System Fehler noch in Selbstbezug übersetzt?"
    },
    gratitude_prompt: "Welche Fehler-Situation heute hat mir gezeigt, dass ich mich nicht automatisch mit dem Misslingen identifizieren muss?",
    self_talk_anchors: [
      { text: "Handlung oder Ich?", when: "Direkt nach einem Fehler unter Druck" },
      { text: "Nur die Handlung.", when: "Wenn du die Information zurückholst" },
      { text: "Zurück in Funktion.", when: "In der nächsten Rückkehrhandlung" }
    ],
    variants: {
      training: "Nutze sichtbare Fehler in relevanten Szenen, kleinen Wettbewerben, Wettkampfsimulation oder Bewertungsmomenten als Material.",
      rest: "Übertrage den Tag auf peinliche Momente, Fehler in Gesprächen, Arbeits-/Studiumsfehler und Alltagssituationen, in denen Misslingen schnell persönlich wird.",
      match: "Kurzversion: Ich-Sprung erkennen → Fehler an Handlung halten → funktional zurück."
    }
  },
  {
    day_id: 32,
    title: "Unter Bewertung bleibe ich im Lernsystem",
    phase: "Phase III — Transfer und Druck",
    week: 5,
    line: "Learning vs Judgement / Social Pressure",
    lens: "Fremde Bewertung muss mich nicht aus Lernen in Schutz oder Urteil kippen.",
    primary_mechanism: "Learning Stability Under Evaluation",
    today_trigger: "Sobald du merkst, dass Beobachtung, Bewertung oder soziale Sichtbarkeit dein System enger, künstlicher oder defensiver macht, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von Bewertung = Schutzmodus zu Bewertung = Lernkontext, in dem ich funktional bleiben kann.",
    science_bite: "Unter fremder Bewertung wird Lernen oft instabil. Das System schaltet von offenem Arbeiten auf Bildschutz, Korrekturvermeidung, künstliche Sicherheit oder inneres Urteil. Genau dadurch wird die soziale Situation größer als die eigentliche Aufgabe. Heute trainierst du, unter Bewertung im Lernsystem zu bleiben, statt in Schutz und Selbstbezug zu kippen. ",
    tasks: [
      {
        id: "d32-t1",
        title: "Erkenne den Bewertungszug",
        trigger: "Wenn Beobachtung, Vergleich, Korrektur oder Sichtbarkeit dein Verhalten enger macht",
        when_to_use: "Bei Coach-Feedback, Publikum, Mitspielern, Bewertungsszenen, Konkurrenz oder sichtbaren Fehlern",
        action: "Frag dich kurz: 'Bin ich noch im Lernen — oder schon im Bildschutz?'",
        why: "Du musst zuerst sichtbar machen, wann soziale Bewertung deine innere Arbeitsweise kippt.",
        explanation: "Das Problem ist nicht nur, dass andere da sind. Das Problem beginnt dort, wo ihre Sicht innerlich größer wird als deine Aufgabe und dein Lernen.",
        self_talk: "Lernen oder Bildschutz?",
        micro_reframe: "Bewertung wird dann gefährlich, wenn sie mein inneres System vom Lernen abzieht.",
        reframe_step: {
          trigger: "Ich werde unter Blicken oder Bewertung enger.",
          reframe: "Bevor ich reagiere, prüfe ich, ob ich noch im Lernsystem bin.",
          anchor: "Lernen oder Bildschutz?"
        },
        system_function: "Social Pressure Awareness",
        icon: "Eye"
      },
      {
        id: "d32-t2",
        title: "Hol die Aufgabe zurück",
        trigger: "Nachdem du Bildschutz unter Bewertung erkannt hast",
        when_to_use: "Direkt in der sozialen oder bewerteten Situation",
        action: "Frag dich: 'Was ist hier meine echte Lernaufgabe?' und richte dich daran aus.",
        why: "Unter Bewertung braucht dein System einen klaren Lernort, sonst zieht es automatisch Richtung Wirkung und Schutz.",
        explanation: "Vielleicht ist es Technik. Vielleicht Kontakt. Vielleicht Präsenz. Vielleicht Korrekturannahme. Vielleicht eine mutige Wiederholung. Die Bewertung bleibt da, aber die Aufgabe wird wieder größer.",
        self_talk: "Was ist hier meine Lernaufgabe?",
        micro_reframe: "Bewertung darf da sein, ohne dass sie mein Lernen ersetzt.",
        reframe_step: {
          trigger: "Ich habe Bildschutz erkannt.",
          reframe: "Jetzt mache ich meine Lernaufgabe wieder größer als die soziale Spannung.",
          anchor: "Was ist hier meine Lernaufgabe?"
        },
        system_function: "Learning Redirect",
        icon: "Target"
      },
      {
        id: "d32-t3",
        title: "Bleib offen statt künstlich",
        trigger: "Wenn du unter Bewertung lieber kontrollierter, glatter oder unsichtbarer werden willst",
        when_to_use: "In der direkt nächsten Wiederholung oder Szene",
        action: "Setze eine offene, ehrliche, lernfähige Handlung statt eine künstlich abgesicherte.",
        why: "Tag 32 wird erst real, wenn Lernen unter Bewertung sichtbar offen bleibt.",
        explanation: "Das kann heißen: Korrektur wirklich annehmen, offen wiederholen, nicht safe gehen, nicht spielen, als wäre alles schon stabil, sondern weiter sauber arbeiten. Nicht für Wirkung. Für Lernen.",
        self_talk: "Offen bleiben.",
        micro_reframe: "Unter Bewertung wird mein System reifer, wenn es offen statt künstlich sauber bleibt.",
        reframe_step: {
          trigger: "Ich will mich unter Bewertung glätten oder absichern.",
          reframe: "Jetzt bleibe ich im Lernsystem und halte Offenheit höher als Wirkungsschutz.",
          anchor: "Offen bleiben."
        },
        system_function: "Learning Openness",
        icon: "Unlock"
      }
    ],
    journal: {
      title: "Wie habe ich unter Bewertung im Lernsystem geblieben — oder nicht?",
      questions: [
        { id: "d32-j1", question: "In welcher Situation hat Bewertung oder Sichtbarkeit mein Verhalten heute am stärksten verändert?", placeholder: "Beschreibe die Szene konkret." },
        { id: "d32-j2", question: "Woran habe ich gemerkt, dass mein System eher in Bildschutz als in Lernen gehen wollte?", placeholder: "Was war innerlich oder im Verhalten spürbar?" },
        { id: "d32-j3", question: "Was war in dieser Situation meine eigentliche Lernaufgabe?", placeholder: "Formuliere sie klar." },
        { id: "d32-j4", question: "Konnte ich heute unter Bewertung mindestens einmal offen statt künstlich handeln?", placeholder: "Wie sah das konkret aus?" }
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist — auch etwas aus einer Situation, in der du beobachtet oder bewertet wurdest.",
      free_reflection_prompt: "Was zeigt mir dieser Tag darüber, wie stark soziale Bewertung mein Lernen noch verzieht?"
    },
    gratitude_prompt: "Welche Bewertungssituation heute hat mir gezeigt, dass Offenheit stärker sein kann als Bildschutz?",
    self_talk_anchors: [
      { text: "Lernen oder Bildschutz?", when: "Wenn soziale Sichtbarkeit hochgeht" },
      { text: "Was ist hier meine Lernaufgabe?", when: "Wenn du die Aufgabe zurückholen willst" },
      { text: "Offen bleiben.", when: "Wenn du nicht künstlich werden willst" }
    ],
    variants: {
      training: "Nutze Coach-Feedback, Trainingspartner, Konkurrenz, Wettkampfsimulation, Korrekturen und sichtbare Fehler als Material.",
      rest: "Übertrage den Tag auf Gespräche, Arbeits-/Uni-Kontexte, soziale Situationen, Kritik und alles, bei dem du unter Blicken enger wirst.",
      match: "Kurzversion: Bewertungszug erkennen → Lernaufgabe zurückholen → offen statt künstlich."
    }
  },
  {
    day_id: 33,
    title: "Ein alter Reflex darf auftauchen — aber er muss mich nicht mehr steuern",
    phase: "Phase III — Transfer und Druck",
    week: 5,
    line: "Habit Break / Control vs Confidence",
    lens: "Ein alter Leistungsreflex ist noch nicht mein Verhalten. Ich kann ihn stoppen und ersetzen.",
    primary_mechanism: "Response Inhibition + Replacement",
    today_trigger: "Sobald ein alter automatischer Reflex unter Last auftaucht und dein Verhalten sofort in die alte Schleife ziehen will, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von Reflex = Ausführung zu Reflex = unterbrechen und bewusst ersetzen.",
    science_bite: "Viele Muster bleiben nicht bestehen, weil du sie nicht verstehst, sondern weil sie unter Last reflexhaft schneller werden als deine bewusste Steuerung. Genau deshalb reicht Einsicht irgendwann nicht mehr. Tag 33 trainiert etwas Konkreteres: Ein alter Reflex taucht auf, die erste Ausführung wird gestoppt, und eine vorbereitete Alternative wird eingesetzt. Das ist kein Denken über Veränderung, sondern echter Schleifenbruch. ",
    tasks: [
      {
        id: "d33-t1",
        title: "Wähle einen alten Reflex",
        trigger: "Vor dem Training oder vor einer relevanten Phase, in der du weißt, dass ein bestimmter alter Reflex oft kommt",
        when_to_use: "Vor Wettkampfsimulation, Druckphasen, Fehlerketten, Bewertungsszenen oder alltäglichen Schleifen",
        action: "Lege genau einen Reflex fest, den du heute unterbrechen willst.",
        why: "Tag 33 wird nur stark, wenn er nicht allgemein bleibt, sondern genau einen konkreten Reflex bearbeitet.",
        explanation: "Zum Beispiel: hektisch werden, kleiner werden, safe gehen, meckern, rausgehen, still werden, Handyflucht, Rückzug, Prokrastination, Selbstkritik. Nicht alles gleichzeitig. Ein Reflex.",
        self_talk: "Heute stoppe ich diesen Reflex.",
        micro_reframe: "Veränderung wird heute nicht allgemein, sondern konkret und verhaltensnah.",
        reframe_step: {
          trigger: "Der Tag startet.",
          reframe: "Bevor Last kommt, lege ich genau einen alten Reflex fest, den ich heute nicht automatisch leben werde.",
          anchor: "Heute stoppe ich diesen Reflex."
        },
        system_function: "Reflex Targeting",
        icon: "Target"
      },
      {
        id: "d33-t2",
        title: "Stoppe die erste Ausführung",
        trigger: "Sobald der alte Reflex auftaucht und dein Körper oder Verhalten schon in ihn hineinwill",
        when_to_use: "Im ersten Moment der Schleife, bevor sie voll läuft",
        action: "Unterbrich die erste Ausführung bewusst mit einem klaren Stoppsignal.",
        why: "Der eigentliche Hebel liegt nicht erst später in der Schleife, sondern so früh wie möglich.",
        explanation: "Tag 33 ist behavior-first. Nicht diskutieren, nicht moralisch bewerten, nicht hoffen, dass der Reflex weggeht. Früh stoppen: Körper, Stimme, Blick, Handlungstendenz, Bewegung.",
        self_talk: "Stopp.",
        micro_reframe: "Der Reflex darf auftauchen. Aber er ist noch nicht mein Verhalten.",
        reframe_step: {
          trigger: "Ich merke die alte Schleife in mir anlaufen.",
          reframe: "Bevor sie übernimmt, setze ich eine klare Unterbrechung.",
          anchor: "Stopp."
        },
        system_function: "Response Inhibition",
        icon: "Ban"
      },
      {
        id: "d33-t3",
        title: "Setze die Ersatzhandlung",
        trigger: "Direkt nach dem Stoppsignal",
        when_to_use: "In derselben Szene, unmittelbar nach der Unterbrechung",
        action: "Setze die vorher festgelegte Alternative bewusst an die Stelle des alten Reflexes.",
        why: "Unterbrechung allein reicht selten. Das System braucht eine neue, konkrete Verhaltensspur.",
        explanation: "Wenn der alte Reflex klein machen will, wird die Ersatzhandlung offen bleiben. Wenn er safe machen will, wird sie die saubere mutige Handlung. Wenn er meckern will, wird sie klare Kommunikation. Nicht improvisieren. Ersetzen.",
        self_talk: "Ersatz jetzt.",
        micro_reframe: "Rewiring wird heute praktisch, wenn ich nicht nur stoppe, sondern ersetze.",
        reframe_step: {
          trigger: "Der Reflex ist gestoppt.",
          reframe: "Jetzt setze ich nicht Leere, sondern eine klare Alternative.",
          anchor: "Ersatz jetzt."
        },
        system_function: "Replacement Behavior",
        icon: "RefreshCw"
      }
    ],
    journal: {
      title: "Welchen alten Reflex habe ich heute gestoppt — und wodurch ersetzt?",
      questions: [
        { id: "d33-j1", question: "Welchen alten Reflex habe ich mir heute vorgenommen?", placeholder: "Benenne ihn so konkret wie möglich." },
        { id: "d33-j2", question: "In welcher Szene ist er heute am deutlichsten aufgetaucht?", placeholder: "Beschreibe die Situation." },
        { id: "d33-j3", question: "Konnte ich die erste Ausführung stoppen?", placeholder: "Wenn ja: wie? Wenn nein: wann war ich zu spät?" },
        { id: "d33-j4", question: "Welche Ersatzhandlung habe ich gesetzt — oder hätte ich setzen müssen?", placeholder: "Beschreibe die Alternative." }
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist — auch etwas aus einer Situation, in der ein alter Reflex sichtbar wurde.",
      free_reflection_prompt: "Was zeigt mir dieser Tag darüber, wie viel Handlungshoheit ich unter Last schon zurückholen kann?"
    },
    gratitude_prompt: "Welcher Moment heute hat mir gezeigt, dass ein alter Reflex nicht automatisch mein Verhalten bleiben muss?",
    self_talk_anchors: [
      { text: "Heute stoppe ich diesen Reflex.", when: "Bevor Last kommt" },
      { text: "Stopp.", when: "Im ersten Reflexmoment" },
      { text: "Ersatz jetzt.", when: "Direkt nach der Unterbrechung" }
    ],
    variants: {
      training: "Ideal: einen häufigen Leistungsreflex wählen, erste Ausführung stoppen, Ersatzhandlung einsetzen.",
      rest: "Sehr gut übertragbar auf Prokrastination, Reizbarkeit, Rückzug, Selbstkritik, Handyflucht und Vermeidung unangenehmer Gespräche.",
      match: "Kurzversion: Wettkampfreflex wählen → erste Ausführung stoppen → klare Ersatzhandlung."
    }
  },
  {
    day_id: 34,
    title: "Auch unter Belastungsstau kann ich meinem System wieder Tragfähigkeit geben",
    phase: "Phase III — Transfer und Druck",
    week: 5,
    line: "Gratitude vs Anxiety / Recovery Under Load",
    lens: "Wenn Belastung sich stapelt, muss mein System nicht immer enger werden. Ich kann ihm gezielt wieder etwas Tragfähigkeit zurückgeben.",
    primary_mechanism: "Recovery Restoration Under Accumulated Load",
    today_trigger: "Sobald du merkst, dass Belastung sich aufstapelt und dein System immer enger, härter oder defizitdominanter wird, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von Belastungsstau = weitere Verengung zu Belastungsstau = bewusste Recovery-Rückgabe.",
    science_bite: "Nicht jede Belastung ist ein einzelner harter Moment. Oft entsteht Instabilität dadurch, dass Reibung sich stapelt: Fehler, Bewertung, Druck, Müdigkeit, soziale Spannung, mehrere kleine Stressoren. Dann wird das System oft zunehmend enger, härter, reizbarer und defizitdominanter. Tag 34 trainiert deshalb nicht Motivation, sondern Recovery-Funktion: deinem System wieder etwas Tragfähigkeit zurückgeben, bevor es noch weiter verdichtet. ",
    tasks: [
      {
        id: "d34-t1",
        title: "Erkenne den Belastungsstau",
        trigger: "Wenn du merkst, dass nicht nur ein einzelner Reiz da ist, sondern sich mehrere Dinge innerlich aufeinander stapeln",
        when_to_use: "Bei Fehlerketten, Müdigkeit, gereizten Phasen, mehreren kleinen Störungen, sozialem Druck oder innerem Überhang",
        action: "Markiere klar: 'Belastungsstau.'",
        why: "Du musst zuerst unterscheiden, ob du gerade auf ein Ereignis reagierst oder ob dein ganzes System schon unter kumulierter Last läuft.",
        explanation: "Genau das ist heute der Punkt: Nicht nur 'es ist gerade schwierig', sondern 'es stapelt sich'. Diese Einsicht schützt davor, zusätzliche Härte mit Stärke zu verwechseln.",
        self_talk: "Belastungsstau.",
        micro_reframe: "Mein System ist gerade nicht nur gereizt — es ist schon unter aufgestauter Last.",
        reframe_step: {
          trigger: "Ich merke, dass vieles gleichzeitig oder nacheinander in mir hängen bleibt.",
          reframe: "Bevor ich noch enger werde, erkenne ich den Stau als Zustand.",
          anchor: "Belastungsstau."
        },
        system_function: "Load Awareness",
        icon: "Eye"
      },
      {
        id: "d34-t2",
        title: "Gib dem System wieder etwas Tragfähigkeit",
        trigger: "Nachdem du den Belastungsstau erkannt hast",
        when_to_use: "Direkt danach, bevor dein System weiter verhärtet",
        action: "Hol bewusst 2–3 Dinge nach vorne, die Tragfähigkeit, Weite oder Stabilität zurückgeben.",
        why: "Recovery unter Last braucht konkrete Rückgabe, nicht nur die Hoffnung, dass es schon wieder weggeht.",
        explanation: "Das kann Atem, Tempo, Perspektive, Dankbarkeit, etwas Tragendes, etwas Reales, etwas Verlässliches oder etwas bereits Vorhandenes sein. Es geht nicht darum, Last zu leugnen, sondern Tragfähigkeit wieder minimal zu erhöhen.",
        self_talk: "Gib Stabilität zurück.",
        micro_reframe: "Recovery heißt heute nicht Flucht, sondern meinem System wieder etwas Tragen zu ermöglichen.",
        reframe_step: {
          trigger: "Ich habe den Belastungsstau erkannt.",
          reframe: "Jetzt hole ich bewusst wieder etwas Tragfähigkeit in mein System.",
          anchor: "Gib Stabilität zurück."
        },
        system_function: "Recovery Activation",
        icon: "HeartPulse"
      },
      {
        id: "d34-t3",
        title: "Handle wieder aus etwas mehr Weite",
        trigger: "Wenn dein System etwas tragfähiger geworden ist",
        when_to_use: "In der direkt nächsten relevanten Handlung",
        action: "Setze die nächste Szene nicht aus weiterem inneren Stau, sondern aus etwas mehr Weite und Tragfähigkeit.",
        why: "Recovery muss in Verhalten übersetzt werden, sonst bleibt sie nur ein innerer Gedanke.",
        explanation: "Nicht alles lösen. Nicht sofort perfekt stabil sein. Nur die nächste Handlung aus etwas weniger innerer Verdichtung spielen.",
        self_talk: "Aus Tragfähigkeit weiter.",
        micro_reframe: "Auch unter Last kann mein nächster Schritt aus mehr Weite als nur aus Stau kommen.",
        reframe_step: {
          trigger: "Mein System hat minimal wieder Raum.",
          reframe: "Jetzt setze ich die nächste Handlung aus mehr Tragfähigkeit statt aus weiterer Enge.",
          anchor: "Aus Tragfähigkeit weiter."
        },
        system_function: "Recovered Action",
        icon: "ArrowRightCircle"
      }
    ],
    journal: {
      title: "Wo war heute Belastungsstau — und wie habe ich meinem System wieder Tragfähigkeit gegeben?",
      questions: [
        { id: "d34-j1", question: "Woran habe ich heute am klarsten gemerkt, dass Belastung sich gestapelt hat?", placeholder: "Beschreibe die Situation oder Abfolge." },
        { id: "d34-j2", question: "Was hat mein System dadurch enger, härter oder defizitdominanter gemacht?", placeholder: "Wie war der Zustand?" },
        { id: "d34-j3", question: "Welche 2–3 Dinge haben meinem System wieder etwas Tragfähigkeit gegeben?", placeholder: "Was hat wirklich geholfen?" },
        { id: "d34-j4", question: "Wie hat sich meine nächste Handlung verändert, als wieder etwas mehr Raum da war?", placeholder: "Beschreibe die Szene." }
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist — auch etwas aus einer Phase, in der sich Belastung gestapelt hat.",
      free_reflection_prompt: "Was zeigt mir dieser Tag darüber, wie ich auf laufende Belastung reagiere — und wie Recovery für mich unter echter Last aussehen kann?"
    },
    gratitude_prompt: "Welche kleine Sache heute hat meinem System wieder mehr Tragfähigkeit gegeben, obwohl die Belastung noch da war?",
    self_talk_anchors: [
      { text: "Belastungsstau.", when: "Wenn du merkst, dass sich Last stapelt" },
      { text: "Gib Stabilität zurück.", when: "Wenn du Recovery bewusst aktivierst" },
      { text: "Aus Tragfähigkeit weiter.", when: "In der nächsten Handlung" }
    ],
    variants: {
      training: "Nutze Fehlerketten, Müdigkeit, soziale Spannung, mehrere kleine Friktionen und innere Reizbarkeit als Material.",
      rest: "Übertrage den Tag auf To-dos, Familien-/Sozialdynamik, Alltagsspannung, mentale Überladung und sich stapelnde Kleinstressoren.",
      match: "Kurzversion: Belastungsstau erkennen → Tragfähigkeit zurückgeben → aus mehr Weite weiter."
    }
  },
  {
    day_id: 35,
    title: "Ich kann Verantwortung sichtbar übernehmen",
    phase: "Phase III — Transfer und Druck",
    week: 5,
    line: "Confidence / Leadership / Identity",
    lens: "Verantwortung unter sozialem Risiko ist kein Sonderfall — sie ist trainierbares Verhalten.",
    primary_mechanism: "Visible Responsibility Under Social Risk",
    today_trigger: "Sobald eine Situation nach Initiative, Ordnung, Kommunikation oder sichtbarer Präsenz ruft und dein System lieber auf Rückzug oder Abwarten gehen will, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von stiller Selbstverwaltung zu sichtbarer Verantwortung für die Situation.",
    science_bite: "Viele Athleten können sich innerlich gut sortieren, bleiben aber äußerlich passiv, sobald Verantwortung sichtbar wird. Der Grund ist oft nicht fehlendes Wissen, sondern soziales Risiko: sich zeigen, hörbar werden, etwas tragen, Initiative setzen, falsch liegen können. Heute trainierst du deshalb nicht nur Stabilität in dir, sondern Verantwortung nach außen. Genau das macht Führung trainierbar. ",
    tasks: [
      {
        id: "d35-t1",
        title: "Erkenne die Warteschleife",
        trigger: "Wenn du merkst, dass eigentlich etwas von dir gebraucht wäre, dein System aber lieber wartet, hofft oder sich zurückhält",
        when_to_use: "Bei Unordnung, fehlender Kommunikation, Unsicherheit im Team, offenen Situationen oder sichtbarem Bedarf nach Initiative",
        action: "Frag dich kurz: 'Warte ich gerade — obwohl etwas von mir gebraucht wäre?'",
        why: "Tag 35 beginnt damit, die stille Passivität sichtbar zu machen, die sich oft als Vernunft tarnt.",
        explanation: "Nicht jede Ruhe ist Stärke. Manchmal ist sie nur sozial vorsichtige Unsichtbarkeit. Heute geht es darum, die Warteschleife zu erkennen, bevor sie wieder dein Standard wird.",
        self_talk: "Warte ich gerade?",
        micro_reframe: "Manchmal braucht eine Situation nicht mehr Analyse, sondern sichtbare Verantwortung.",
        reframe_step: {
          trigger: "Ich merke Bedarf, halte mich aber zurück.",
          reframe: "Bevor ich weiter warte, prüfe ich, ob ich gerade nur sozial vorsichtig werde.",
          anchor: "Warte ich gerade?"
        },
        system_function: "Passivity Awareness",
        icon: "Eye"
      },
      {
        id: "d35-t2",
        title: "Definiere die Verantwortung",
        trigger: "Nachdem du die Warteschleife erkannt hast",
        when_to_use: "Direkt im Moment, bevor du Initiative setzt",
        action: "Frag dich: 'Was ist hier gerade meine sichtbarste sinnvolle Verantwortung?'",
        why: "Verantwortung wird trainierbar, wenn sie konkret und verhaltensnah formuliert wird.",
        explanation: "Nicht groß denken. Vielleicht ist es nur eine klare Ansage, ein Fokuspunkt, eine Ordnungshandlung, Präsenz für andere, Initiative im Kontakt oder eine stabilisierende Kommunikation. Tag 35 braucht keine Heldenrolle, sondern sichtbare Verantwortungsnahme.",
        self_talk: "Was trage ich hier?",
        micro_reframe: "Verantwortung ist heute nicht Größe, sondern sichtbare Dienlichkeit.",
        reframe_step: {
          trigger: "Ich habe die Warteschleife erkannt.",
          reframe: "Jetzt mache ich konkret, was hier sichtbar von mir getragen werden kann.",
          anchor: "Was trage ich hier?"
        },
        system_function: "Responsibility Clarification",
        icon: "Compass"
      },
      {
        id: "d35-t3",
        title: "Setze sie sichtbar",
        trigger: "Wenn dir klar ist, was du tragen willst",
        when_to_use: "In der direkt nächsten Szene",
        action: "Setze die Verantwortung hörbar, sichtbar oder spürbar — nicht nur innerlich.",
        why: "Tag 35 wird erst real, wenn Verantwortung nach außen geht und nicht nur ein inneres Vorhaben bleibt.",
        explanation: "Sprich. Ordne. Biete dich an. Setze einen Fokus. Trag eine Situation. Sei sichtbar stabilisierend. Nicht, um stark zu wirken, sondern weil die Situation gerade Führung braucht.",
        self_talk: "Sichtbar tragen.",
        micro_reframe: "Verantwortung unter sozialem Risiko ist kein Persönlichkeitsmerkmal, sondern trainierbare Handlung.",
        reframe_step: {
          trigger: "Ich kenne meine Verantwortung.",
          reframe: "Jetzt bleibt sie nicht in mir — ich setze sie sichtbar in die Situation.",
          anchor: "Sichtbar tragen."
        },
        system_function: "Visible Leadership Action",
        icon: "Megaphone"
      }
    ],
    journal: {
      title: "Wo habe ich heute Verantwortung sichtbar übernommen — oder vermieden?",
      questions: [
        { id: "d35-j1", question: "In welcher Situation war heute sichtbar etwas von mir gebraucht?", placeholder: "Beschreibe die Szene konkret." },
        { id: "d35-j2", question: "Woran habe ich gemerkt, dass mein System lieber warten oder unsichtbar bleiben wollte?", placeholder: "Was war innerlich spürbar?" },
        { id: "d35-j3", question: "Was war dort meine sinnvollste sichtbare Verantwortung?", placeholder: "Formuliere sie klar." },
        { id: "d35-j4", question: "Konnte ich sie heute hörbar, sichtbar oder spürbar setzen?", placeholder: "Wie sah das konkret aus?" }
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist — auch etwas aus einem Moment, in dem Verantwortung sozial riskant war.",
      free_reflection_prompt: "Was zeigt mir dieser Tag darüber, wie stark ich Verantwortung bisher von innerer Sicherheit oder sozialer Freigabe abhängig gemacht habe?"
    },
    gratitude_prompt: "Welche Situation heute hat mir gezeigt, dass sichtbare Verantwortung trainierbar ist?",
    self_talk_anchors: [
      { text: "Warte ich gerade?", when: "Wenn du dich zurückhältst" },
      { text: "Was trage ich hier?", when: "Wenn du Verantwortung konkret machst" },
      { text: "Sichtbar tragen.", when: "Wenn du sie nach außen setzt" }
    ],
    variants: {
      training: "Ideal: Kommunikation, Ordnung, Initiative, Stabilität für andere, Fokus setzen, dich sichtbar anbieten.",
      rest: "Sehr gut übertragbar auf Gespräche initiieren, Verantwortung organisieren, etwas klären und nicht warten, bis andere handeln.",
      match: "Kurzversion: Warteschleife erkennen → Verantwortung definieren → sichtbar tragen."
    }
  },
  {
    day_id: 36,
    title: "Auch im Chaos kann ich einen Kern halten",
    phase: "Phase III — Transfer und Druck",
    week: 6,
    line: "Presence under Chaos",
    lens: "Wenn viele Dinge gleichzeitig an mir ziehen, brauche ich nicht alles zu lösen — ich brauche meinen Kern.",
    primary_mechanism: "Attentional Core Recovery",
    today_trigger: "Sobald viele Reize gleichzeitig an dir ziehen und dein System auf alles zugleich springen will, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von Streuung zu Kern — und von Reizdichte zu Priorität.",
    science_bite: "Chaos zerstört Aufmerksamkeit oft nicht, weil es groß ist, sondern weil dein System seine Priorität verliert. Wenn viele Dinge gleichzeitig passieren, reagiert es schnell mit Streuung: dies auch, das auch, nichts verpassen, alles gleichzeitig kontrollieren. Genau dadurch wird Aufmerksamkeit schwach. Präsenz im Chaos bedeutet heute nicht Ruhe, sondern einen funktionalen Kern trotz Reizdichte zu halten. ",
    tasks: [
      {
        id: "d36-t1",
        title: "Erkenne die Streuung",
        trigger: "Wenn viel gleichzeitig passiert und dein Kopf überall gleichzeitig sein will",
        when_to_use: "Bei Wettkampfsimulation, lauten Phasen, Fehlerketten, hektischen Drillformen, mehreren Reizen, To-dos, Nachrichten oder mentalem Lärm",
        action: "Markiere innerlich einmal klar: 'Streuung.'",
        why: "Bevor du Aufmerksamkeit bündeln kannst, musst du merken, wann dein System gerade auf alles gleichzeitig springt.",
        explanation: "Tag 36 fragt nicht, ob Chaos da ist. Es fragt, ob dein System im Chaos seine Priorität verliert. Genau diese Streuung machst du heute sichtbar.",
        self_talk: "Streuung.",
        micro_reframe: "Nicht das Chaos selbst zerstört meinen Fokus — sondern dass mein System seinen Kern verliert.",
        reframe_step: {
          trigger: "Alles zieht gleichzeitig an mir.",
          reframe: "Bevor ich weiter alles gleichzeitig lösen will, erkenne ich die Streuung als Zustand.",
          anchor: "Streuung."
        },
        system_function: "Chaos Awareness",
        icon: "Eye"
      },
      {
        id: "d36-t2",
        title: "Hol den Kern zurück",
        trigger: "Direkt nachdem du die Streuung erkannt hast",
        when_to_use: "Sofort, bevor dein System weiter in Reizsprünge kippt",
        action: "Frag dich: 'Was ist gerade mein Kern?' und wähle genau einen funktionalen Fokuspunkt.",
        why: "Chaos wird erst handhabbar, wenn dein System wieder einen klaren Arbeitskern hat.",
        explanation: "Nicht fünf Dinge. Nicht alles retten. Ein Kern: der Ball, dein Gegenspieler, der erste Kontakt, deine Kommunikation, deine Haltung, dein Prozessanker, die nächste Aktion.",
        self_talk: "Was ist mein Kern?",
        micro_reframe: "Ich brauche heute nicht Ordnung überall — ich brauche Priorität an einem Punkt.",
        reframe_step: {
          trigger: "Ich habe die Streuung erkannt.",
          reframe: "Jetzt hole ich nicht alles zurück, sondern nur den einen Kern, aus dem ich arbeiten kann.",
          anchor: "Was ist mein Kern?"
        },
        system_function: "Core Recovery",
        icon: "LocateFixed"
      },
      {
        id: "d36-t3",
        title: "Handle aus dem Kern",
        trigger: "Wenn dein Kern wieder etwas klarer ist",
        when_to_use: "In der direkt nächsten Handlung",
        action: "Setze die nächste saubere Handlung nur aus diesem Kern heraus.",
        why: "Tag 36 wird erst praktisch, wenn Bündelung sofort in Handlung übersetzt wird.",
        explanation: "Nicht alles gleichzeitig lösen. Nicht das Chaos bekämpfen. Nur die nächste saubere Handlung aus deinem Kern spielen.",
        self_talk: "Nur aus dem Kern.",
        micro_reframe: "Präsenz im Chaos heißt heute nicht Ruhe, sondern Priorität plus Handlung.",
        reframe_step: {
          trigger: "Mein Kern ist wieder da.",
          reframe: "Jetzt spiele ich nicht das ganze Chaos, sondern nur die nächste saubere Handlung aus dem Kern.",
          anchor: "Nur aus dem Kern."
        },
        system_function: "Core-Based Action",
        icon: "ArrowRightCircle"
      }
    ],
    journal: {
      title: "Wo ist mein System heute breit geworden — und wo hatte ich wieder einen Kern?",
      questions: [
        { id: "d36-j1", question: "In welchem Moment war heute die Reizdichte oder das Chaos am höchsten?", placeholder: "Beschreibe die Situation konkret." },
        { id: "d36-j2", question: "Woran habe ich gemerkt, dass meine Aufmerksamkeit in Streuung gekippt ist?", placeholder: "Was war innerlich oder äußerlich spürbar?" },
        { id: "d36-j3", question: "Welchen Kern habe ich bewusst zurückgeholt?", placeholder: "Was war dein funktionaler Fokuspunkt?" },
        { id: "d36-j4", question: "Wie gut ist es mir gelungen, aus diesem Kern die nächste saubere Handlung zu setzen?", placeholder: "Beschreibe die Szene." }
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist — mindestens 1 Sache, die chaotisch war, 1 Sache, die dir wieder Kern gegeben hat, und 1 Sache, die dir gezeigt hat, dass Präsenz im Chaos Priorität bedeutet.",
      free_reflection_prompt: "Was zeigt mir dieser Tag darüber, wie stabil mein Kern schon unter Reizdichte ist?"
    },
    gratitude_prompt: "Welche chaotische Situation heute hat mir gezeigt, dass ich nicht alles lösen muss, um arbeitsfähig zu bleiben?",
    self_talk_anchors: [
      { text: "Streuung.", when: "Wenn alles gleichzeitig zieht" },
      { text: "Was ist mein Kern?", when: "Wenn du Priorität zurückholen willst" },
      { text: "Nur aus dem Kern.", when: "In der nächsten sauberen Handlung" }
    ],
    variants: {
      training: "Ideal bei Wettkampfsimulation, lauten Phasen, schnellen Wechseln, Fehlerketten und mehreren Reizen gleichzeitig.",
      rest: "Übertragbar auf To-dos, Nachrichten, Handy, Gespräche, Geräusche und mentalen Lärm.",
      match: "Kurzversion: Streuung erkennen → Kern zurückholen → nur aus dem Kern spielen."
    }
  },
  {
    day_id: 37,
    title: "Unfaire Reibung darf ich nicht weiter füttern",
    phase: "Phase III — Transfer und Druck",
    week: 6,
    line: "Control vs Non-Control / Emotional Regulation",
    lens: "Ein nerviger oder unfairer Trigger muss nicht zu einer zweiten inneren Welle werden.",
    primary_mechanism: "Emotional Non-Feeding",
    today_trigger: "Sobald ein unfairer, nerviger oder störender Moment eine zweite innere Welle in dir aufbauen will, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von Reibung plus Zusatzaufladung zu Reibung ohne Weiterfüttern.",
    science_bite: "Unfaire Reibung wird oft nicht nur durch das Ereignis groß, sondern durch die zweite Welle danach: nochmal drüber nachdenken, innerlich diskutieren, weiter aufladen, in der Story bleiben. Genau diese zweite Welle macht Frustketten lang und leistungsrelevant. Tag 37 trainiert nicht, nichts zu fühlen — sondern Reibung nicht weiter zu füttern. ",
    tasks: [
      {
        id: "d37-t1",
        title: "Erkenne die zweite Welle",
        trigger: "Wenn ein nerviger oder unfairer Moment passiert und dein System nicht nur reagiert, sondern weiter auflädt",
        when_to_use: "Bei nervigen Calls, Mitspielerfehlern, Störungen, Unfairness, nerviger Dynamik, Planänderungen oder Alltagstriggern",
        action: "Frag dich kurz: 'Ist das gerade noch das Ereignis — oder schon meine zweite Welle?'",
        why: "Du musst zuerst erkennen, wann Reibung nicht nur da ist, sondern innerlich weiter verstärkt wird.",
        explanation: "Die zweite Welle ist oft subtil: gedanklich weiterhängen, innerlich weiter argumentieren, den Trigger größer machen, ihn mit Story aufladen. Genau das machst du heute sichtbar.",
        self_talk: "Zweite Welle?",
        micro_reframe: "Der Trigger ist real. Die zweite Welle ist das, was mein System zusätzlich daraus macht.",
        reframe_step: {
          trigger: "Etwas nervt oder läuft unfair.",
          reframe: "Bevor ich weiter in der Story bleibe, prüfe ich, ob mein System schon eine zweite Welle baut.",
          anchor: "Zweite Welle?"
        },
        system_function: "Emotional Amplification Awareness",
        icon: "Eye"
      },
      {
        id: "d37-t2",
        title: "Hör auf, ihn weiter zu füttern",
        trigger: "Nachdem du die zweite Welle erkannt hast",
        when_to_use: "Direkt danach, bevor der Trigger weiter an Größe gewinnt",
        action: "Sag dir einmal klar: 'Nicht weiter füttern.'",
        why: "Der eigentliche Hebel liegt nicht im Ausdiskutieren, sondern im frühen Nicht-Weiterladen.",
        explanation: "Nicht unterdrücken. Nicht wegdrücken. Nur nicht weiter Energie hineinstecken. Kein weiteres inneres Diskutieren, kein zusätzliches Aufblasen, kein weiteres Story-Bauen.",
        self_talk: "Nicht weiter füttern.",
        micro_reframe: "Gelassenheit heißt heute nicht Gleichgültigkeit, sondern weniger Nachladung.",
        reframe_step: {
          trigger: "Ich habe die zweite Welle erkannt.",
          reframe: "Jetzt stoppe ich nicht das Gefühl, sondern das Weiterfüttern.",
          anchor: "Nicht weiter füttern."
        },
        system_function: "Feeding Stop",
        icon: "Ban"
      },
      {
        id: "d37-t3",
        title: "Werde wieder funktional flach",
        trigger: "Wenn du aufgehört hast weiter zu füttern",
        when_to_use: "In der direkt nächsten Handlung",
        action: "Frag dich: 'Wie sieht meine nächste funktionale Version aus?' und setze genau diese.",
        why: "Tag 37 koppelt Gelassenheit direkt an Verhalten statt an Theorie.",
        explanation: "Funktional flach heißt nicht gleichgültig. Es heißt: weniger aufgeladen, weniger in der Story, wieder mehr bei Aufgabe, Körper, Prozessanker, Kommunikation und nächster Szene.",
        self_talk: "Funktional flach.",
        micro_reframe: "Die Reibung muss nicht mehr mein ganzes System bestimmen.",
        reframe_step: {
          trigger: "Die zweite Welle läuft nicht weiter.",
          reframe: "Jetzt werde ich nicht stumpf, sondern wieder funktional und klar.",
          anchor: "Funktional flach."
        },
        system_function: "Functional Flattening",
        icon: "ArrowRightCircle"
      }
    ],
    journal: {
      title: "Wann habe ich heute Reibung weitergefüttert — und wann nicht mehr?",
      questions: [
        { id: "d37-j1", question: "Welcher nervige, unfaire oder störende Moment hat heute die stärkste Reibung in mir ausgelöst?", placeholder: "Beschreibe die Situation konkret." },
        { id: "d37-j2", question: "Woran habe ich gemerkt, dass mein System eine zweite Welle aufgebaut hat?", placeholder: "Was war innerlich spürbar?" },
        { id: "d37-j3", question: "Konnte ich heute mindestens einmal klar aufhören, den Trigger weiter zu füttern?", placeholder: "Wie sah das aus?" },
        { id: "d37-j4", question: "Wie habe ich meine nächste funktionale Version wiedergefunden?", placeholder: "Beschreibe die nächste Szene." }
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist — mindestens 1 Sache, die gestört hat, 1 Sache, die dich wieder tragfähiger gemacht hat, und 1 Sache, die dir gezeigt hat, dass Gelassenheit weniger Nachfüttern bedeutet.",
      free_reflection_prompt: "Was zeigt mir dieser Tag darüber, wie sehr mein System Frust noch verlängert, statt ihn abflachen zu lassen?"
    },
    gratitude_prompt: "Welche Störung heute hat mir gezeigt, dass ich nicht alles weiterfüttern muss, was mich triggert?",
    self_talk_anchors: [
      { text: "Zweite Welle?", when: "Wenn Reibung innerlich größer wird" },
      { text: "Nicht weiter füttern.", when: "Wenn du die Nachladung stoppst" },
      { text: "Funktional flach.", when: "In der nächsten funktionalen Handlung" }
    ],
    variants: {
      training: "Ideal bei nervigen Calls, Mitspielerfehlern, störender Dynamik und Reibung, die sonst hängen bleibt.",
      rest: "Sehr gut übertragbar auf kleine Ungerechtigkeiten, Wartezeiten, nervige Menschen, Planänderungen und Alltag, der nicht nach deinem Kopf läuft.",
      match: "Kurzversion: zweite Welle erkennen → nicht weiter füttern → funktional flach werden."
    }
  },
  {
    day_id: 38,
    title: "Angriff statt Schutz",
    phase: "Phase III — Transfer und Druck",
    week: 6,
    line: "Fear vs Love / Growth vs Winning",
    lens: "Wenn mein System sich schützen will, kann ich bewusst wieder eine vorwärtsgerichtete, dienliche Handlung wählen.",
    primary_mechanism: "Challenge Orientation",
    today_trigger: "Sobald unter Druck, Reibung, Bewertung oder Gegnerkontakt dein System in Schutzlogik hängenbleibt, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von Schutzorientierung zu Vorwärtsbewegung.",
    science_bite: "Schutzorientierung zeigt sich oft nicht dramatisch, sondern funktional zu klein: safe gehen, warten, sich verstecken, nur noch reagieren, nur noch keinen Schaden machen wollen. Tag 38 trainiert nicht Aggression, sondern Handlungsrichtung: nicht 'Wie vermeide ich Schaden?', sondern 'Wie gehe ich hier aktiv und sauber rein?'. Genau das ist Challenge Orientation. ",
    tasks: [
      {
        id: "d38-t1",
        title: "Erkenne die Schutzlogik",
        trigger: "Wenn eine Situation eng wird und dein System kleiner, sicherer, defensiver oder versteckter handeln will",
        when_to_use: "Bei starkem Gegner, nach Fehlern, unter Bewertung, bei Reibung, in Druckmomenten oder wenn du Raum nicht mehr aktiv nimmst",
        action: "Frag dich kurz: 'Schütze ich mich gerade — oder spiele ich die Aufgabe?'",
        why: "Du musst Schutz als Hauptlogik der Handlung sichtbar machen, bevor du sie verschieben kannst.",
        explanation: "Das Problem ist heute nicht nur Angst. Das Problem ist, wenn Schutz zum Steuerzentrum deiner Handlung wird.",
        self_talk: "Schutz oder Aufgabe?",
        micro_reframe: "Auch wenn Schutzimpulse da sind, muss Schutz nicht meine Hauptrichtung bleiben.",
        reframe_step: {
          trigger: "Ich werde kleiner, sicherer oder reaktiver.",
          reframe: "Bevor ich dort hängenbleibe, prüfe ich meine aktuelle Handlungsrichtung.",
          anchor: "Schutz oder Aufgabe?"
        },
        system_function: "Protection Awareness",
        icon: "Eye"
      },
      {
        id: "d38-t2",
        title: "Hol die Vorwärtsrichtung zurück",
        trigger: "Nachdem du Schutzlogik erkannt hast",
        when_to_use: "Direkt vor der nächsten relevanten Handlung",
        action: "Frag dich: 'Wie gehe ich hier aktiv und sauber rein?'",
        why: "Tag 38 verschiebt nicht Gefühl, sondern Richtung.",
        explanation: "Nicht überrennen. Nicht riskant um jeden Preis. Sondern wieder offen in Kontakt mit der Situation gehen: Initiative, Kontakt, Raum nehmen, klare Vorwärtsbewegung.",
        self_talk: "Aktiv und sauber rein.",
        micro_reframe: "Stabilisierung reicht heute nicht — mein System darf wieder nach vorne handeln.",
        reframe_step: {
          trigger: "Ich habe Schutzlogik erkannt.",
          reframe: "Jetzt ändere ich nicht alles, sondern nur die Richtung: wieder nach vorne.",
          anchor: "Aktiv und sauber rein."
        },
        system_function: "Direction Shift",
        icon: "StepForward"
      },
      {
        id: "d38-t3",
        title: "Setze die Vorwärtshandlung",
        trigger: "Wenn die Richtung klarer geworden ist",
        when_to_use: "In der direkt nächsten Szene",
        action: "Setze eine sichtbare, dienliche Vorwärtshandlung statt in Schutz hängen zu bleiben.",
        why: "Tag 38 wird erst real, wenn Vorwärtsbewegung im Verhalten auftaucht.",
        explanation: "Das kann heißen: Raum nehmen, Kontakt suchen, wieder anbieten, mutiger kommunizieren, in die Situation hineingehen, nicht warten, nicht safe verschwinden.",
        self_talk: "Nach vorne.",
        micro_reframe: "Auch unter Druck kann meine nächste Handlung wieder Richtung Aufgabe statt Richtung Schutz gehen.",
        reframe_step: {
          trigger: "Meine Vorwärtsrichtung ist wieder da.",
          reframe: "Jetzt zeige ich sie in einer sichtbaren, sauberen Handlung.",
          anchor: "Nach vorne."
        },
        system_function: "Forward Action",
        icon: "ArrowRightCircle"
      }
    ],
    journal: {
      title: "Wo hat Schutz heute meine Handlung bestimmt — und wo nicht mehr?",
      questions: [
        { id: "d38-j1", question: "In welcher Situation war meine Schutzlogik heute am stärksten?", placeholder: "Beschreibe die Szene konkret." },
        { id: "d38-j2", question: "Woran habe ich gemerkt, dass mein Verhalten eher defensiv als dienlich wurde?", placeholder: "Was war innerlich oder äußerlich spürbar?" },
        { id: "d38-j3", question: "Wie habe ich die Vorwärtsrichtung wieder zurückgeholt?", placeholder: "Was war dein innerer Shift?" },
        { id: "d38-j4", question: "Welche Vorwärtshandlung habe ich dann konkret gesetzt?", placeholder: "Beschreibe die Handlung." }
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist — auch etwas aus einem Moment, in dem dein System wieder nach vorne gegangen ist.",
      free_reflection_prompt: "Was zeigt mir dieser Tag darüber, wie stark Schutz noch meine Handlungsrichtung bestimmt?"
    },
    gratitude_prompt: "Welche Szene heute hat mir gezeigt, dass Stabilität erst dann komplett wird, wenn ich wieder nach vorne handle?",
    self_talk_anchors: [
      { text: "Schutz oder Aufgabe?", when: "Wenn du defensiv wirst" },
      { text: "Aktiv und sauber rein.", when: "Wenn du die Richtung zurückholst" },
      { text: "Nach vorne.", when: "In der sichtbaren Vorwärtshandlung" }
    ],
    variants: {
      training: "Ideal bei Gegnerdruck, Reibung, Bewertung, Fehlern und Situationen, in denen du Raum nicht mehr aktiv nimmst.",
      rest: "Übertragbar auf Gespräche, Konflikte, unangenehme Aufgaben, soziale Spannung und Alltagssituationen, in denen du lieber ausweichst oder klein wirst.",
      match: "Kurzversion: Schutzlogik erkennen → Vorwärtsrichtung zurückholen → nach vorne handeln."
    }
  },
  {
    day_id: 39,
    title: "Mein Standard darf größer bleiben als das aktuelle Momentum",
    phase: "Phase III — Transfer und Druck",
    week: 6,
    line: "Process vs Result / State Stability",
    lens: "Der Verlauf darf Stimmung machen, aber nicht mein ganzes System steuern.",
    primary_mechanism: "Momentum Decoupling",
    today_trigger: "Sobald eine Serie, ein Lauf, mehrere gute oder schlechte Aktionen oder Teamenergie stark an deinem Zustand ziehen, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von Momentum-Zug zu Standard-Rückkehr.",
    science_bite: "Verlaufsmomentum wird psychologisch dann gefährlich, wenn dein System daraus sofort eine größere Geschichte macht: jetzt läuft's, jetzt kippt's, jetzt ist alles gegen mich, jetzt muss ich retten. Genau dadurch wird Zustand abhängig vom letzten Verlauf statt vom eigenen Standard. Tag 39 trainiert deshalb keine Emotionslosigkeit, sondern ruhige Konstanz gegenüber Momentum. ",
    tasks: [
      {
        id: "d39-t1",
        title: "Erkenne den Momentum-Zug",
        trigger: "Wenn mehrere gelungene oder misslungene Aktionen, Runs oder Teamenergie stark an deinem Zustand ziehen",
        when_to_use: "In Wettkampfsimulation, Serien, Läufen, Hoch-/Tiefphasen, Teamdynamik oder wenn ein Tag stark gut oder schlecht kippt",
        action: "Frag dich kurz: 'Zieht mich gerade der Verlauf — oder spiele ich noch meinen Standard?'",
        why: "Du musst zuerst sichtbar machen, wann der Verlauf mehr Macht bekommt als dein eigener Standard.",
        explanation: "Momentum ist nicht nur Spielverlauf. Es ist der Zug, aus dem Verlauf sofort eine Geschichte über alles zu machen.",
        self_talk: "Verlauf oder Standard?",
        micro_reframe: "Der Verlauf ist real, aber er muss nicht mein inneres Zentrum werden.",
        reframe_step: {
          trigger: "Eine Serie oder Dynamik zieht an meinem Zustand.",
          reframe: "Bevor ich mitsurfe oder dagegenkämpfe, prüfe ich: Wer führt gerade — der Verlauf oder mein Standard?",
          anchor: "Verlauf oder Standard?"
        },
        system_function: "Momentum Awareness",
        icon: "Eye"
      },
      {
        id: "d39-t2",
        title: "Hol den Standard zurück",
        trigger: "Nachdem du den Momentum-Zug erkannt hast",
        when_to_use: "Direkt danach, bevor du weiter im Verlauf surfst oder gegen ihn kämpfst",
        action: "Frag dich: 'Was ist jetzt mein Standard?' und hole genau diesen zurück.",
        why: "Standard ist der Gegenpol zu verlaufsabhängiger Identität und verlaufsabhängigem Zustand.",
        explanation: "Dein Standard ist nicht der perfekte Zustand. Dein Standard ist deine verlässliche Art zu arbeiten: Prozessanker, Haltung, Kommunikation, Präsenz, Kontakt, nächste saubere Szene.",
        self_talk: "Hol den Standard zurück.",
        micro_reframe: "Mein Standard darf größer bleiben als das, was gerade kurz läuft.",
        reframe_step: {
          trigger: "Ich habe den Momentum-Zug erkannt.",
          reframe: "Jetzt mache ich nicht den Verlauf größer, sondern meinen Standard wieder klarer.",
          anchor: "Hol den Standard zurück."
        },
        system_function: "Standard Recovery",
        icon: "LocateFixed"
      },
      {
        id: "d39-t3",
        title: "Wettkampf die nächste Szene neutral sauber",
        trigger: "Wenn dein Standard wieder etwas klarer ist",
        when_to_use: "In der direkt nächsten Handlung",
        action: "Wettkämpfe die nächste Szene neutral sauber — nicht auf dem Verlauf surfend und nicht gegen ihn kämpfend.",
        why: "Tag 39 wird erst real, wenn Standard die nächste Szene wieder übernimmt.",
        explanation: "Nicht extra hart, nicht extra locker, nicht aus der Story des Laufs. Einfach neutral sauber. Genau das macht Stabilität unter Momentum praktisch.",
        self_talk: "Neutral sauber.",
        micro_reframe: "Stabilität ist heute nicht Gleichgültigkeit, sondern Konstanz gegenüber dem Verlauf.",
        reframe_step: {
          trigger: "Mein Standard ist wieder vorne.",
          reframe: "Jetzt spiele ich die nächste Szene nicht aus Momentum, sondern neutral sauber.",
          anchor: "Neutral sauber."
        },
        system_function: "Neutral Continuation",
        icon: "ArrowRightCircle"
      }
    ],
    journal: {
      title: "Wann hat mich der Verlauf heute gezogen — und wann nicht mehr?",
      questions: [
        { id: "d39-j1", question: "In welchem Moment hat der Verlauf heute am stärksten an meinem Zustand gezogen?", placeholder: "Beschreibe die Situation konkret." },
        { id: "d39-j2", question: "Woran habe ich gemerkt, dass mein System daraus eine größere Geschichte machen wollte?", placeholder: "Was war innerlich spürbar?" },
        { id: "d39-j3", question: "Welchen Standard habe ich bewusst zurückgeholt?", placeholder: "Was war dein Standard in dieser Situation?" },
        { id: "d39-j4", question: "Wie gut ist es mir gelungen, die nächste Szene neutral sauber zu spielen?", placeholder: "Beschreibe die Handlung." }
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist — mindestens 1 Sache, die gut lief, 1 Sache, die gegen dich lief, und 1 Sache, die dir gezeigt hat, dass Stabilität Konstanz gegenüber dem Verlauf bedeutet.",
      free_reflection_prompt: "Was zeigt mir dieser Tag darüber, wie abhängig mein System noch vom Momentum des Verlaufs ist?"
    },
    gratitude_prompt: "Welche Dynamik heute hat mir gezeigt, dass mein Standard größer bleiben kann als das aktuelle Momentum?",
    self_talk_anchors: [
      { text: "Verlauf oder Standard?", when: "Wenn Momentum an dir zieht" },
      { text: "Hol den Standard zurück.", when: "Wenn du Rückkehr einleitest" },
      { text: "Neutral sauber.", when: "In der nächsten Szene" }
    ],
    variants: {
      training: "Ideal bei Wettkampfsimulation, Serien, Runs, mehreren gelungenen oder misslungenen Aktionen und Teamenergie, die hoch oder runter zieht.",
      rest: "Übertragbar auf Tage, die gut oder schlecht laufen und deinen ganzen Zustand färben wollen.",
      match: "Kurzversion: Momentum-Zug erkennen → Standard zurückholen → nächste Szene neutral sauber spielen."
    }
  },
  {
    day_id: 40,
    title: "Auch wenn das Ergebnis groß wird, darf Wachstum offen bleiben",
    phase: "Phase III — Transfer und Druck",
    week: 6,
    line: "Growth vs Winning under Pressure",
    lens: "Wenn das Ergebnis psychologisch groß wird, darf mein System nicht komplett in Schadensvermeidung kippen.",
    primary_mechanism: "Growth Preservation Under Outcome Relevance",
    today_trigger: "Sobald Ergebnisrelevanz groß wird und dein System nur noch absichern, retten oder Schaden vermeiden will, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von Ergebnisdruck = Lernschrumpfung zu Ergebnisdruck = offenes Wachstum trotz Relevanz.",
    science_bite: "Wenn Ergebnisdruck groß wird, schrumpft Lernen oft zuerst. Das System wird enger, will weniger offen ausprobieren, weniger ehrlich reagieren, weniger Entwicklung zulassen — Hauptsache kein Schaden. Genau das ist der subtile Leistungsbruch von Tag 40. Heute trainierst du nicht, Ergebnisbedeutung wegzureden, sondern Wachstum unter Ergebnisrelevanz offen zu halten. ",
    tasks: [
      {
        id: "d40-t1",
        title: "Erkenne die Lernschrumpfung",
        trigger: "Wenn das Ergebnis groß wird und du merkst, dass dein System plötzlich enger, vorsichtiger oder nur noch schadenvermeidend arbeitet",
        when_to_use: "Bei Punkten, Bewertung, Konsequenzen, sichtbaren Ergebnissen, Matchrelevanz oder Situationen, die 'zählen'",
        action: "Frag dich kurz: 'Wird hier gerade nur noch Schaden vermieden — oder bleibt Wachstum noch offen?'",
        why: "Du musst zuerst sichtbar machen, dass Ergebnisdruck nicht nur Spannung erzeugt, sondern oft Lernen und Offenheit verkleinert.",
        explanation: "Tag 40 greift nicht den Ausgang an, sondern die Lernschrumpfung darunter. Genau dort kippt Entwicklung oft zuerst.",
        self_talk: "Wachstum noch offen?",
        micro_reframe: "Wenn Ergebnis groß wird, wird mein System oft zuerst klein im Lernen.",
        reframe_step: {
          trigger: "Die Szene zählt und mein System will nur noch sichern.",
          reframe: "Bevor ich komplett in Schadensvermeidung kippe, prüfe ich, ob Wachstum noch offen ist.",
          anchor: "Wachstum noch offen?"
        },
        system_function: "Growth Constriction Awareness",
        icon: "Eye"
      },
      {
        id: "d40-t2",
        title: "Hol die Wachstumslogik rein",
        trigger: "Nachdem du die Lernschrumpfung erkannt hast",
        when_to_use: "Direkt in der relevanten Situation, bevor du weiter enger wirst",
        action: "Frag dich: 'Wie sieht hier die saubere, offene, entwicklungsfähige Handlung aus?'",
        why: "Der Tag wird erst stark, wenn Entwicklung auch unter Ergebnisdruck wieder eine reale Option wird.",
        explanation: "Nicht alles offenlassen, nicht blind riskieren. Sondern prüfen: Was wäre hier die saubere Handlung, die nicht nur Schaden vermeidet, sondern weiter echte Qualität und Entwicklung trägt?",
        self_talk: "Sauber und offen.",
        micro_reframe: "Ergebnisdruck muss meine Handlungsqualität nicht auf bloße Schadensvermeidung schrumpfen lassen.",
        reframe_step: {
          trigger: "Ich habe Lernschrumpfung erkannt.",
          reframe: "Jetzt hole ich wieder eine saubere offene Handlung als echte Option ins System.",
          anchor: "Sauber und offen."
        },
        system_function: "Growth Reopening",
        icon: "Unlock"
      },
      {
        id: "d40-t3",
        title: "Handle wachstumsfähig trotz Druck",
        trigger: "Wenn die offene saubere Handlung wieder sichtbarer ist",
        when_to_use: "In der direkt nächsten relevanten Szene",
        action: "Setze die Handlung, die Qualität und Entwicklung offen hält, statt nur auf Schadensvermeidung zu gehen.",
        why: "Tag 40 endet nicht bei Mindset, sondern bei Verhalten unter Ergebnisrelevanz.",
        explanation: "Das kann heißen: weiter ehrlich spielen, nicht künstlich safe werden, im Prozess bleiben, wieder Kontakt nehmen, die Aufgabe nicht kleiner machen, trotz Bedeutung offen und sauber handeln.",
        self_talk: "Trotz Druck offen.",
        micro_reframe: "Wenn das Ergebnis groß wird, zeigt sich Reife darin, dass Wachstum nicht sofort verschlossen wird.",
        reframe_step: {
          trigger: "Die Szene zählt und ich kenne die offene saubere Handlung.",
          reframe: "Jetzt setze ich nicht nur eine sichere, sondern eine wachstumsfähige Handlung.",
          anchor: "Trotz Druck offen."
        },
        system_function: "Growth-Preserving Action",
        icon: "ArrowRightCircle"
      }
    ],
    journal: {
      title: "Wo ist mein Lernen heute unter Ergebnisdruck geschrumpft — und wo nicht?",
      questions: [
        { id: "d40-j1", question: "In welcher Situation war das Ergebnis heute psychologisch besonders groß?", placeholder: "Beschreibe die Szene konkret." },
        { id: "d40-j2", question: "Woran habe ich gemerkt, dass mein System nur noch Schaden vermeiden wollte?", placeholder: "Was wurde enger?" },
        { id: "d40-j3", question: "Welche offene, saubere, entwicklungsfähige Handlung war dort trotzdem möglich?", placeholder: "Formuliere sie klar." },
        { id: "d40-j4", question: "Konnte ich sie heute mindestens einmal trotz Ergebnisdruck setzen?", placeholder: "Wie sah das konkret aus?" }
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist — auch etwas aus einer Situation, in der Ergebnisdruck groß war.",
      free_reflection_prompt: "Was zeigt mir dieser Tag darüber, wie schnell mein System unter Ergebnisrelevanz Lernen und Offenheit schrumpfen lässt?"
    },
    gratitude_prompt: "Welche druckvolle Situation heute hat mir gezeigt, dass Wachstum auch dann offen bleiben kann, wenn das Ergebnis groß wird?",
    self_talk_anchors: [
      { text: "Wachstum noch offen?", when: "Wenn das Ergebnis psychologisch groß wird" },
      { text: "Sauber und offen.", when: "Wenn du die Wachstumslogik zurückholst" },
      { text: "Trotz Druck offen.", when: "In der nächsten relevanten Handlung" }
    ],
    variants: {
      training: "Nutze bewertete, relevante, sichtbare oder wettkampfähnliche Situationen als Material.",
      rest: "Übertragbar auf Entscheidungen, Gespräche, Leistungen und Situationen, in denen Konsequenzen groß wirken und dein System nur noch Schaden vermeiden will.",
      match: "Kurzversion: Lernschrumpfung erkennen → saubere offene Handlung zurückholen → trotz Druck offen handeln."
    }
  },
  {
    day_id: 41,
    title: "Auch wenn meine Ausführung unperfekt ist, muss mein Selbstkern nicht mitkippen",
    phase: "Phase III — Transfer und Druck",
    week: 6,
    line: "Identity vs Performance",
    lens: "Unperfektion in meiner Leistung ist nicht automatisch ein Urteil über mich.",
    primary_mechanism: "Identity Stability Under Imperfection",
    today_trigger: "Sobald du merkst, dass eine unperfekte Phase, mehrere schwächere Momente oder sichtbare Fehler dein Selbstbild mitschieben wollen, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von Imperfektion = etwas stimmt mit mir nicht zu Imperfektion = Momentinformation bei stabilem Selbstkern.",
    science_bite: "Eine unperfekte Phase ist psychologisch oft schwerer als ein einzelner Fehler. Warum? Weil dein System daraus schnell mehr macht als nur eine unsaubere Ausführung. Es liest daraus etwas über dich: über dein Niveau, deine Stabilität, deinen Wert oder deine Zugehörigkeit. Genau dort wird Leistung persönlich. Tag 41 greift nicht die Unperfektion an, sondern die falsche Schlussfolgerung darunter. Deine Ausführung darf heute unvollständig sein, ohne dass dein Selbstkern mitkippen muss.",
    tasks: [
      {
        id: "d41-t1",
        title: "Erkenne die Globalisierung",
        trigger: "Wenn mehrere unsaubere Momente oder eine schwächere Phase innerlich sofort 'mehr als nur Leistung' werden",
        when_to_use: "Bei unsauberen Blöcken, sichtbaren Fehlern, schwächerer Einheit, unklarem Spielgefühl oder wenn du dich gerade nicht auf deinem Niveau fühlst",
        action: "Frag dich kurz: 'Lese ich gerade einen Moment — oder schon mich selbst?'",
        why: "Tag 41 beginnt dort, wo Imperfektion nicht mehr nur Situation bleibt, sondern Identitätsmaterial wird.",
        explanation: "Viele Systeme globalisieren schnell: nicht 'die Phase ist gerade unsauber', sondern 'ich bin heute nicht gut', 'ich verliere mich gerade', 'so bin ich wohl'. Genau diese Globalisierung soll heute sichtbar werden.",
        self_talk: "Moment oder ich?",
        micro_reframe: "Eine unperfekte Phase ist noch kein Beweis gegen meinen Kern.",
        reframe_step: {
          trigger: "Mehrere Dinge laufen gerade nicht sauber.",
          reframe: "Bevor ich mich selbst mitschiebe, prüfe ich, ob ich gerade Leistung globalisiere.",
          anchor: "Moment oder ich?"
        },
        system_function: "Identity Collapse Awareness",
        icon: "Eye"
      },
      {
        id: "d41-t2",
        title: "Hol den Selbstkern zurück",
        trigger: "Nachdem du die Globalisierung erkannt hast",
        when_to_use: "Direkt in der unperfekten Phase, bevor dein Verhalten weiter aus Makel reagiert",
        action: "Sag dir klar: 'Unperfekt ist gerade die Ausführung — nicht mein Kern.'",
        why: "Tag 41 wirkt nur, wenn du Identität wieder vom aktuellen Leistungsbild trennst.",
        explanation: "Das ist kein positives Zureden. Es ist eine präzise Trennung: Die aktuelle Ausführung kann schwach, unsauber oder brüchig sein. Aber dein Selbstkern muss deshalb nicht mitkippen.",
        self_talk: "Kern bleibt.",
        micro_reframe: "Ich darf gerade unvollständig sein, ohne mich innerlich zu verlieren.",
        reframe_step: {
          trigger: "Ich merke, dass mein Selbstbild mitkippen will.",
          reframe: "Jetzt führe ich Identität und Ausführung bewusst wieder auseinander.",
          anchor: "Kern bleibt."
        },
        system_function: "Identity Re-Stabilization",
        icon: "Compass"
      },
      {
        id: "d41-t3",
        title: "Reagiere nicht aus dem Makel",
        trigger: "Wenn dein System aus Unsicherheit, Scham, kleinerem Selbstgefühl oder Makelreaktion handeln will",
        when_to_use: "In der direkt nächsten Szene nach einer schwächeren Phase",
        action: "Setze die nächste saubere Handlung nicht aus Makelgefühl, sondern aus deinem Kern.",
        why: "Tag 41 wird erst praktisch, wenn Imperfektion nicht mehr automatisch deine Verhaltensrichtung bestimmt.",
        explanation: "Nicht retten. Nicht kompensieren. Nicht überziehen. Nicht kleiner werden. Sondern die nächste saubere, ruhige, funktionale Handlung setzen, ohne aus dem Gefühl 'mit mir stimmt gerade etwas nicht' zu reagieren.",
        self_talk: "Nicht aus dem Makel.",
        micro_reframe: "Meine nächste Handlung muss nicht mein Selbst reparieren, sondern nur sauber bleiben.",
        reframe_step: {
          trigger: "Ich will gerade aus kleinerem Selbstgefühl reagieren.",
          reframe: "Jetzt gehe ich nicht aus Makel, sondern aus Kern in die nächste Szene.",
          anchor: "Nicht aus dem Makel."
        },
        system_function: "Behavior from Identity Core",
        icon: "ArrowRightCircle"
      }
    ],
    journal: {
      title: "Wann wurde Imperfektion heute zu viel über mich — und wann nicht?",
      questions: [
        { id: "d41-j1", question: "In welcher unperfekten Phase wollte mein System heute am stärksten mehr daraus machen als nur einen Moment?", placeholder: "Beschreibe die Szene oder Phase konkret." },
        { id: "d41-j2", question: "Woran habe ich gemerkt, dass mein Selbstbild mitkippen wollte?", placeholder: "Welche inneren Sätze oder Reaktionen waren da?" },
        { id: "d41-j3", question: "Konnte ich heute meinen Selbstkern mindestens einmal bewusst zurückholen?", placeholder: "Wie sah das aus?" },
        { id: "d41-j4", question: "Wie hat sich meine nächste Handlung verändert, als ich nicht aus dem Makel reagiert habe?", placeholder: "Beschreibe die konkrete Szene." }
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist. Mindestens 1 Sache, die heute unperfekt war, 1 Sache, die trotzdem an dir stabil geblieben ist, und 1 Sache, die dir gezeigt hat, dass Identität größer sein kann als aktuelle Ausführung.",
      free_reflection_prompt: "Was zeigt mir dieser Tag darüber, wie stark mein System Imperfektion noch mit Identität verwechselt?"
    },
    gratitude_prompt: "Welche unperfekte Situation heute hat mir gezeigt, dass mein Kern größer bleiben kann als meine aktuelle Ausführung?",
    self_talk_anchors: [
      { text: "Moment oder ich?", when: "Wenn Unperfektion innerlich groß wird" },
      { text: "Kern bleibt.", when: "Wenn du Identität stabilisierst" },
      { text: "Nicht aus dem Makel.", when: "In der nächsten Handlung" }
    ],
    variants: {
      training: "Ideal bei unsauberen Blöcken, schwächerer Einheit, sichtbaren Fehlern und Phasen, in denen du dich nicht auf deinem Niveau fühlst.",
      rest: "Sehr gut übertragbar auf ineffizienten Tag, schlechtes Gespräch, mangelnde Disziplin, unklaren Kopf oder unperfekten Alltag.",
      match: "Maximal relevant bei Fehler oder schwacher Phase: Globalisierung erkennen, Selbstkern zurückholen, nicht aus dem Makel reagieren."
    }
  },
  {
    day_id: 42,
    title: "Unter Last ehrlich sehen, was schon trägt",
    phase: "Phase III — Transfer und Druck",
    week: 6,
    line: "Consolidation Check",
    lens: "Druck zeigt nicht meinen Wert — Druck zeigt, was schon konsolidiert ist und was noch zuerst kippt.",
    primary_mechanism: "Consolidation Check Under Load",
    today_trigger: "Sobald echte Last da ist — oder du bewusst einen kleinen Last-Check setzt — ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von Druck als Urteil zu Druck als ehrlichem Sichtbarmacher.",
    science_bite: "Unter Last zeigt sich weniger, was du theoretisch weißt — sondern was dein System schon zuverlässig tragen kann. In ruhigen Momenten fühlen sich viele Linien klar an: Präsenz, Prozess, Vertrauen, Lernen, Identität. Unter Druck wird sichtbar, was davon schon trägt, was noch sofort kippt, was du noch bewusst halten musst und was schon fast automatisch da ist. Genau deshalb ist Druck heute nicht dein Richter, sondern dein Sichtbarmacher.",
    tasks: [
      {
        id: "d42-t1",
        title: "Setz oder erkenne einen Lastblock",
        trigger: "Wenn natürliche Last da ist — oder wenn du bewusst einen kleinen Belastungsblock setzen kannst",
        when_to_use: "Bei Wettkampfsimulation, Match, hartem Trainingsblock, sichtbarer Bewertung, mehreren Druckfaktoren gleichzeitig, chaotischer fordernder Phase oder einem fokussierten Belastungsblock im Alltag",
        action: "Geh bewusst in einen Lastblock, der echt genug ist, dass dein System real reagieren muss.",
        why: "Bevor du etwas über Konsolidierung lesen kannst, brauchst du eine reale Belastungssituation.",
        explanation: "Der Tag darf nicht vom Zufall abhängen. Wenn keine natürliche Last kommt, erzeugst du einen ehrlichen kleinen Check: drei relevante Wiederholungen, eine sichtbare Serie, ein Fokusblock mit Druck, ein unangenehmes Gespräch, mehrere Anforderungen nacheinander. Nicht künstlich maximal hart. Nur echt genug.",
        self_talk: "Jetzt wird sichtbar.",
        micro_reframe: "Heute geht es nicht darum, gut auszusehen — sondern ehrlich zu sehen, was unter Last schon trägt.",
        reframe_step: {
          trigger: "Es gibt natürliche Last oder ich kann sie bewusst setzen.",
          reframe: "Ich nutze diese Last nicht für Urteil, sondern als reale Prüfgrundlage.",
          anchor: "Jetzt wird sichtbar."
        },
        system_function: "Load Initiation",
        icon: "Flame"
      },
      {
        id: "d42-t2",
        title: "Lies ehrlich, was hält und was kippt",
        trigger: "Wenn du im oder nach dem Lastblock merkst, wie dein System reagiert",
        when_to_use: "Direkt im Belastungsblock oder direkt danach",
        action: "Frag dich: 'Was bleibt erreichbar? Was kippt zuerst?'",
        why: "Die Mitte von Tag 42 ist nicht Testen um des Testens willen, sondern ehrliche Systemdiagnostik unter Last.",
        explanation: "Nicht urteilen. Nicht dramatisieren. Nicht retten. Nur lesen: Bleiben Präsenz, Prozess, Offenheit, Identität, Kommunikation, Wachstum? Oder zerfallen sie schnell? Das ist heute nützliche Information.",
        self_talk: "Was hält? Was kippt?",
        micro_reframe: "Druck ist heute kein Urteil, sondern ein ehrlicher Sichtbarmacher.",
        reframe_step: {
          trigger: "Ich bin unter Last oder komme gerade daraus.",
          reframe: "Jetzt lese ich nicht mein Ego, sondern mein System.",
          anchor: "Was hält? Was kippt?"
        },
        system_function: "Honest Reading",
        icon: "Scan"
      },
      {
        id: "d42-t3",
        title: "Trag einen Kern bewusst nochmal",
        trigger: "Wenn dir klarer geworden ist, was unter Last schon trägt",
        when_to_use: "In der nächsten relevanten Sequenz nach dem Lesen",
        action: "Frag dich: 'Welchen Kern kann ich unter Last bewusst nochmal tragen?' und geh genau damit in die nächste Sequenz.",
        why: "Tag 42 soll nicht nur Defizite sichtbar machen, sondern Stabilität bewusst bestätigen.",
        explanation: "Es geht darum, das Tragende nicht nur zu bemerken, sondern aktiv zu bestätigen. Dadurch wird der Tag nicht defizitlastig, sondern stärkt den Übergang in Verkörperung.",
        self_talk: "Das bleibt.",
        micro_reframe: "Ich lese heute nicht nur, was fehlt, sondern bestätige bewusst, was schon trägt.",
        reframe_step: {
          trigger: "Ich habe unter Last etwas Tragendes erkannt.",
          reframe: "Jetzt trage ich diesen Kern bewusst nochmal und bestätige seine Stabilität.",
          anchor: "Das bleibt."
        },
        system_function: "Core Confirmation",
        icon: "BadgeCheck"
      }
    ],
    journal: {
      title: "Was bleibt in mir, wenn Druck steigt?",
      questions: [
        { id: "d42-j1", question: "Welcher Lastblock war heute am ehrlichsten für mein System — natürlich oder bewusst erzeugt?", placeholder: "Beschreibe die Situation oder Sequenz konkret." },
        { id: "d42-j2", question: "Was hat unter dieser Last spürbar gehalten?", placeholder: "Welche Linien oder Qualitäten blieben erreichbar?" },
        { id: "d42-j3", question: "Was ist zuerst gekippt oder brüchig geworden?", placeholder: "Was zerfällt noch zu schnell?" },
        { id: "d42-j4", question: "Welchen Kern habe ich bewusst ein zweites Mal getragen?", placeholder: "Beschreibe die konkrete Bestätigung." }
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist. Mindestens 1 Sache, die heute Last erzeugt hat, 1 Sache, die überraschend stabil geblieben ist, und 1 Sache, die dir gezeigt hat, dass Druck nicht nur testet, sondern sichtbar macht, was schon wirklich da ist.",
      free_reflection_prompt: "Was zeigt mir dieser Tag darüber, was in mir schon konsolidiert ist — und was noch schneller Unterstützung braucht?"
    },
    gratitude_prompt: "Welche Last heute hat mir ehrlich gezeigt, was in mir schon trägt?",
    self_talk_anchors: [
      { text: "Jetzt wird sichtbar.", when: "Wenn du in den Lastblock gehst" },
      { text: "Was hält? Was kippt?", when: "Wenn du ehrlich liest" },
      { text: "Das bleibt.", when: "Wenn du einen Kern bewusst bestätigst" }
    ],
    variants: {
      training: "Ideal bei Wettkampfsimulation, Match, hartem Trainingsblock, sichtbarer Bewertung oder mehreren Druckfaktoren gleichzeitig.",
      rest: "Sehr gut übertragbar auf fokussierten Arbeitsblock, unangenehmes Gespräch, mehrere Anforderungen nacheinander oder sichtbare Aufgabe mit Druck.",
      match: "Kurzversion: Last nutzen → ehrlich lesen → einen Kern bewusst nochmal tragen."
    }
  },
  {
    day_id: 43,
    title: "Präsenz wird Standard",
    phase: "Phase IV — Verkörperung und Identität",
    week: 7,
    line: "Presence",
    lens: "Präsenz soll nicht nur Technik sein — sie soll anfangen, mein normalerer Zustand zu werden.",
    primary_mechanism: "Reduced Friction Return",
    today_trigger: "Sobald kurze Drifts, kleine Reizmomente oder innere Züge auftauchen, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von Präsenz lernen zu Präsenz normalisieren.",
    science_bite: "Früher ging es darum, Autopilot zu erkennen, Aufmerksamkeit bewusst zurückzuholen, den Prozess als Arbeitsort zu definieren oder Fokus im Chaos zu bündeln. Tag 43 ist anders: Jetzt soll Rückkehr weniger Reibung brauchen. Nicht jeder Drift wird noch zu einem Event. Nicht jede Rückkehr wird noch zu einer Technik. Präsenz beginnt Standard zu werden, wenn dein System kürzer weg ist, schneller zurückkommt und dafür weniger inneres Theater braucht.",
    tasks: [
      {
        id: "d43-t1",
        title: "Mach den Drift kleiner",
        trigger: "Wenn du kurz wegziehst, kurz kommentierst oder kurz in etwas hängen willst",
        when_to_use: "Bei Übergängen, kurzen Drifts, kleinen Reizmomenten, nächster Wiederholung, nächster Szene oder Alltags-Mikroablenkung",
        action: "Nimm den Drift kurz wahr, ohne ihn groß zu machen.",
        why: "Tag 43 beginnt damit, Drift nicht mehr unnötig zu dramatisieren.",
        explanation: "Du musst heute nicht mehr jeden kleinen Fokusverlust wie ein Problem behandeln. Kurz merken, nicht aufblasen, nicht analysieren, nicht daraus eine Geschichte machen.",
        self_talk: "Kurz weg.",
        micro_reframe: "Präsenz wird standardnäher, wenn kleine Drifts kleiner bleiben.",
        reframe_step: {
          trigger: "Mein Kopf zieht kurz weg.",
          reframe: "Ich mache daraus kein großes Thema. Ich erkenne es nur kurz.",
          anchor: "Kurz weg."
        },
        system_function: "Micro-Drift Reduction",
        icon: "Eye"
      },
      {
        id: "d43-t2",
        title: "Geh direkt zurück",
        trigger: "Direkt nachdem du den kurzen Drift bemerkt hast",
        when_to_use: "Sofort, ohne große innere Rückkehr-Inszenierung",
        action: "Bring dich direkt an die nächste Aufgabe zurück.",
        why: "Der Unterschied zu früheren Präsenz-Tagen ist hier die Kürze der Rückkehr.",
        explanation: "Nicht neu aufbauen. Nicht erst sammeln. Nicht Motivationssatz. Direkt zurück: nächste Wiederholung, nächste Szene, nächste Bewegung, nächste Kommunikation.",
        self_talk: "Direkt zurück.",
        micro_reframe: "Je weniger Umweg ich brauche, desto mehr wird Präsenz Standard statt Technik.",
        reframe_step: {
          trigger: "Ich habe den Drift bemerkt.",
          reframe: "Jetzt gehe ich nicht in Rückkehr-Theorie, sondern direkt an die Aufgabe zurück.",
          anchor: "Direkt zurück."
        },
        system_function: "Fast Return",
        icon: "RotateCcw"
      },
      {
        id: "d43-t3",
        title: "Lass die nächste Szene normal sein",
        trigger: "Wenn du wieder zurück bist",
        when_to_use: "In der direkt nächsten Szene",
        action: "Wettkämpfe die nächste Szene normal, nicht als Wiedergutmachung.",
        why: "Präsenz wird erst Standard, wenn Rückkehr nicht ständig Sonderstatus bekommt.",
        explanation: "Nicht extra fokussiert wirken. Nicht kompensieren. Nicht 'jetzt muss es wieder stimmen'. Einfach normal da sein und die Szene spielen.",
        self_talk: "Einfach da.",
        micro_reframe: "Verfügbarkeit wird Standard, wenn Rückkehr nicht ständig dramatisiert oder repariert wird.",
        reframe_step: {
          trigger: "Ich bin wieder bei der Aufgabe.",
          reframe: "Jetzt mache ich aus der Rückkehr keinen Sondermoment, sondern spiele einfach normal weiter.",
          anchor: "Einfach da."
        },
        system_function: "Normalized Presence",
        icon: "ArrowRightCircle"
      }
    ],
    journal: {
      title: "Wo war Rückkehr heute schon kürzer und normaler?",
      questions: [
        { id: "d43-j1", question: "In welchen Momenten bin ich heute kurz von der Aufgabe weggekippt?", placeholder: "Beschreibe die Situationen." },
        { id: "d43-j2", question: "Woran habe ich gemerkt, dass ich den Drift kleiner gemacht habe als früher?", placeholder: "Was war anders?" },
        { id: "d43-j3", question: "Wie schnell bin ich heute zurück in die Aufgabe gegangen?", placeholder: "Beschreibe die Rückkehr." },
        { id: "d43-j4", question: "Wo habe ich heute eine nächste Szene einfach normal gespielt, statt Rückkehr groß zu machen?", placeholder: "Welche Szene war dafür ein gutes Beispiel?" }
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist. Mindestens 1 Sache, bei der du kurz weg warst, 1 Sache, bei der du direkt zurückgegangen bist, und 1 Sache, die dir gezeigt hat, dass Präsenz nicht nur Technik, sondern Standard werden kann.",
      free_reflection_prompt: "Was zeigt mir dieser Tag darüber, ob Präsenz für mich langsam normaler statt künstlicher wird?"
    },
    gratitude_prompt: "Welche kleine Drift-Situation heute hat mir gezeigt, dass Rückkehr nicht mehr so viel Reibung braucht wie früher?",
    self_talk_anchors: [
      { text: "Kurz weg.", when: "Wenn du den Mikro-Drift bemerkst" },
      { text: "Direkt zurück.", when: "Wenn du ohne Umweg gehst" },
      { text: "Einfach da.", when: "Wenn du die nächste Szene normal spielst" }
    ],
    variants: {
      training: "Ideal bei Übergängen, kurzen Drifts, kleinen Reizmomenten, nächster Wiederholung und nächster Szene.",
      rest: "Sehr gut übertragbar auf Handyzug, Aufgabenwechsel, Gespräch, kurzen inneren Drift und Alltag ohne große Dramatik.",
      match: "Hier enger: nicht jede Szene analysieren, nicht an Vergangenem hängen, direkt zurück zur nächsten Aufgabe."
    }
  },
  {
    day_id: 44,
    title: "Demut in Stärke",
    phase: "Phase IV — Verkörperung und Identität",
    week: 7,
    line: "Ego vs Inner Excellence",
    lens: "Stärke kann klar und sichtbar sein, ohne wieder selbstbezogen zu werden.",
    primary_mechanism: "Strength Without Self-Return",
    today_trigger: "Sobald du in einer guten Phase, in Einfluss, in Lob oder in sichtbarer Stärke bist und dein System das wieder auf dein Selbst zurückbiegen will, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von Stärke als Selbstbeweis zu Stärke als stille, saubere, dienliche Qualität.",
    science_bite: "Früher war Ego oft sichtbar als Bildschutz, Beeindruckenwollen oder Wirkung statt Qualität. In Phase IV kommt Ego subtiler zurück: als stille Selbstwichtigkeit, als Wunsch, dass Stärke gesehen wird, als unnötige Dominanz, als Bedürfnis, Einfluss zu markieren, oder als Rückführung von Qualität auf das eigene Ich. Tag 44 trainiert deshalb keine schwächere Stärke, sondern eine reifere: klar, sichtbar, wirksam — aber nicht selbstdrehend.",
    tasks: [
      {
        id: "d44-t1",
        title: "Erkenne, wann Stärke auf dich zurückgebogen wird",
        trigger: "Wenn du Einfluss, Lob, gute Phase oder sichtbare Qualität hast und merkst, dass dein System daraus mehr Selbst macht",
        when_to_use: "Bei Lob, guter Phase, Führungsmoment, sichtbarer Qualität, klarer Verantwortung oder Momenten von Einfluss",
        action: "Frag dich kurz: 'Dient diese Stärke gerade noch der Sache — oder biegt sie sich schon auf mich zurück?'",
        why: "Tag 44 beginnt dort, wo Stärke wieder selbstbezogen wird, obwohl sie eigentlich sauber sein könnte.",
        explanation: "Es geht nicht darum, Stärke klein zu machen. Es geht darum, den Moment zu erkennen, in dem Qualität nicht mehr nur getragen, sondern wieder auf das eigene Ich zurückgebogen wird.",
        self_talk: "Sache oder ich?",
        micro_reframe: "Stärke verliert Reife, wenn sie wieder mehr um mich als um die Sache kreist.",
        reframe_step: {
          trigger: "Ich merke Einfluss, Stärke oder gute Phase.",
          reframe: "Bevor ich mich darin innerlich zu sehr drehe, prüfe ich ihre Richtung.",
          anchor: "Sache oder ich?"
        },
        system_function: "Self-Return Awareness",
        icon: "Eye"
      },
      {
        id: "d44-t2",
        title: "Richte Stärke wieder auf Dienst aus",
        trigger: "Nachdem du die Rückbiegung erkannt hast",
        when_to_use: "Direkt im starken Moment",
        action: "Frag dich: 'Wofür dient diese Stärke gerade?' und richte sie bewusst auf Aufgabe, Qualität oder Beitrag aus.",
        why: "Demut in Stärke heißt nicht weniger Stärke, sondern klarere Richtung von Stärke.",
        explanation: "Nicht klein machen. Nicht bescheiden spielen. Nicht dich dämpfen. Sondern deine Stärke wieder an Aufgabe, Verantwortung, Qualität, Team oder Wahrheit der Situation binden.",
        self_talk: "Wofür dient das?",
        micro_reframe: "Reife Stärke richtet sich an der Sache aus, nicht am Selbstbeweis.",
        reframe_step: {
          trigger: "Ich habe gemerkt, dass Stärke zurück auf mich kippt.",
          reframe: "Jetzt gebe ich ihr wieder eine klare Richtung nach außen: Dienst statt Selbstbezug.",
          anchor: "Wofür dient das?"
        },
        system_function: "Strength Reorientation",
        icon: "Compass"
      },
      {
        id: "d44-t3",
        title: "Setz stille Qualität",
        trigger: "Wenn du in einem sichtbaren starken Moment handelst",
        when_to_use: "In mindestens einem klaren Einflussmoment heute",
        action: "Setze Stärke klar, ruhig, sichtbar und sauber — ohne sie unnötig aufzublasen.",
        why: "Tag 44 wird erst real, wenn Stärke wirksam bleibt, ohne wieder Show oder Selbstdrehung zu brauchen.",
        explanation: "Stille Qualität ist keine Unsichtbarkeit. Es ist echte Stärke ohne Extra-Kommentar, unnötige Dominanz, Selbstinszenierung oder inneres 'schaut her'.",
        self_talk: "Sauber stark.",
        micro_reframe: "Ich kann deutlich sein, ohne dass Stärke wieder zum Selbstprojekt wird.",
        reframe_step: {
          trigger: "Ein starker oder einflussreicher Moment ist da.",
          reframe: "Jetzt setze ich Qualität klar und sichtbar, aber ohne sie aufzublasen.",
          anchor: "Sauber stark."
        },
        system_function: "Embodied Humble Strength",
        icon: "BadgeCheck"
      }
    ],
    journal: {
      title: "Wo war meine Stärke heute sauber — und wo wollte sie wieder auf mich zurück?",
      questions: [
        { id: "d44-j1", question: "In welchem Moment war ich heute am stärksten, klarsten oder einflussreichsten?", placeholder: "Beschreibe die Szene konkret." },
        { id: "d44-j2", question: "Woran habe ich gemerkt, dass mein System diese Stärke wieder auf mich zurückbiegen wollte?", placeholder: "Was war innerlich spürbar?" },
        { id: "d44-j3", question: "Wie habe ich meine Stärke wieder auf Aufgabe, Qualität oder Dienst ausgerichtet?", placeholder: "Was war dein innerer Shift?" },
        { id: "d44-j4", question: "Wo ist es mir gelungen, stille Qualität statt Show zu setzen?", placeholder: "Beschreibe die Handlung." }
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist. Mindestens 1 Sache, in der heute Stärke da war, 1 Sache, in der Ego sie fast auf dich gezogen hätte, und 1 Sache, die dir gezeigt hat, dass Demut nicht Schwäche, sondern Richtung von Stärke ist.",
      free_reflection_prompt: "Was zeigt mir das darüber, wie reif mein System inzwischen mit eigener Stärke umgeht?"
    },
    gratitude_prompt: "Welche starke Szene heute hat mir gezeigt, dass Einfluss nicht automatisch Selbstbeweis werden muss?",
    self_talk_anchors: [
      { text: "Sache oder ich?", when: "Wenn Stärke wieder auf dich zurück will" },
      { text: "Wofür dient das?", when: "Wenn du Stärke neu ausrichtest" },
      { text: "Sauber stark.", when: "Wenn du stille Qualität setzt" }
    ],
    variants: {
      training: "Ideal bei Lob, guter Phase, Führungsmoment, sichtbarer Qualität, klarer Verantwortung und Momenten von Einfluss.",
      rest: "Sehr gut übertragbar auf Recht haben, kompetenter sein, führen können, etwas besser wissen oder Einfluss in Gespräch und Alltag haben.",
      match: "Sehr stark bei guter Szene, Momentum, sichtbarem Einfluss, Verantwortung: nicht showen, nicht aufblasen, sauber bleiben."
    }
  },
  {
    day_id: 45,
    title: "Dankbarkeit ohne Anlass",
    phase: "Phase IV — Verkörperung und Identität",
    week: 7,
    line: "Gratitude vs Anxiety",
    lens: "Mein System muss nicht auf etwas Gutes warten, um weit, tragfähig und offen zu werden.",
    primary_mechanism: "Baseline Gratitude Availability",
    today_trigger: "Sobald du merkst, dass dein System für Weite, Offenheit oder Tragfähigkeit erst einen äußeren Anlass will, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von Weite als Reaktion zu Weite als beginnender Grundverfügbarkeit.",
    science_bite: "Bisher war Gratitude oft Antwort: auf Schwierigkeit, auf Belastung oder auf etwas Positives. Tag 45 ist reifer. Jetzt geht es um die Frage: Muss mein System auf etwas Gutes warten, um weit, tragfähig und offen zu werden? Oder kann es diese Qualität auch ohne besonderen Auslöser beginnen zu tragen? Wenn Weite nur auf Anlass kommt, bleibt dein Zustand zu abhängig von Output, Entlastung oder positiven Ereignissen. Heute trainierst du deshalb Weite ohne äußere Erlaubnis.",
    tasks: [
      {
        id: "d45-t1",
        title: "Erkenne die Anlass-Abhängigkeit",
        trigger: "Wenn dein System innerlich so funktioniert, als dürfte es nur bei guten Umständen offen oder weit werden",
        when_to_use: "In neutralen Phasen, normalen Momenten, Pausen, auf dem Weg, beim Wasserholen, vor einer Wiederholung, im Alltag oder wenn nichts Besonderes passiert",
        action: "Frag dich kurz: 'Warte ich gerade auf einen Anlass für Weite?'",
        why: "Tag 45 beginnt dort, wo Offenheit noch zu stark an äußere Erlaubnis gekoppelt ist.",
        explanation: "Es geht heute nicht nur um Enge. Es geht um die stille Abhängigkeit darunter: Erst wenn etwas Schönes passiert, erst wenn es leichter wird, erst wenn ich mich besser fühle, darf Weite kommen. Genau das wird heute sichtbar.",
        self_talk: "Brauche ich gerade einen Anlass?",
        micro_reframe: "Weite muss nicht erst von außen freigeschaltet werden.",
        reframe_step: {
          trigger: "Ich merke, dass mein System auf etwas Gutes, Leichtes oder Besonderes wartet.",
          reframe: "Bevor ich weiter auf äußere Erlaubnis warte, mache ich diese Abhängigkeit sichtbar.",
          anchor: "Brauche ich gerade einen Anlass?"
        },
        system_function: "State Dependency Awareness",
        icon: "Eye"
      },
      {
        id: "d45-t2",
        title: "Öffne Weite ohne Grund",
        trigger: "Nachdem du Anlass-Abhängigkeit erkannt hast",
        when_to_use: "Direkt danach, auch in ganz normalen oder neutralen Momenten",
        action: "Hol bewusst 2–3 Dinge in dein System, die schon da, tragfähig, echt oder wertvoll sind — ohne dass erst etwas Besonderes passiert sein muss.",
        why: "Tag 45 verschiebt Gratitude aus der Reaktionslogik in Richtung Grundverfügbarkeit.",
        explanation: "Nicht schönreden. Nicht künstlich positiv werden. Sondern üben, dass dein System Offenheit nicht erst verdient oder geschenkt bekommen muss. Weite kann heute auch im Normalen beginnen.",
        self_talk: "Weite jetzt.",
        micro_reframe: "Offenheit ist nicht nur eine Antwort auf Positives — sie kann auch ein bewusster Startpunkt sein.",
        reframe_step: {
          trigger: "Ich habe Anlass-Abhängigkeit erkannt.",
          reframe: "Jetzt öffne ich Weite nicht als Reaktion, sondern als bewusste Grundbewegung.",
          anchor: "Weite jetzt."
        },
        system_function: "Baseline Opening",
        icon: "Expand"
      },
      {
        id: "d45-t3",
        title: "Handle aus dieser Grundweite",
        trigger: "Wenn dein System etwas offener und tragfähiger geworden ist",
        when_to_use: "In der direkt nächsten Handlung oder Begegnung",
        action: "Setze die nächste Handlung aus dieser Grundweite, nicht erst nach weiterem 'guten Grund'.",
        why: "Tag 45 wird erst real, wenn Weite nicht nur innerlich gespürt, sondern im Verhalten getragen wird.",
        explanation: "Nicht heroisch. Nicht groß. Einfach spürbar weniger eng, weniger mangelgetrieben, weniger auf äußere Erlaubnis wartend. Mehr Tragfähigkeit, Offenheit und stille Verfügbarkeit.",
        self_talk: "Aus Grundweite.",
        micro_reframe: "Mein System darf heute weiter sein, auch wenn nichts Besonderes passiert ist.",
        reframe_step: {
          trigger: "Ich habe Weite ohne Anlass geöffnet.",
          reframe: "Jetzt trage ich diese Qualität auch in meiner nächsten Handlung weiter.",
          anchor: "Aus Grundweite."
        },
        system_function: "Embodied Baseline Openness",
        icon: "ArrowRightCircle"
      }
    ],
    journal: {
      title: "Wo brauchte ich heute noch einen Anlass für Weite — und wo nicht mehr?",
      questions: [
        { id: "d45-j1", question: "In welchen Momenten war mein System heute noch stark auf äußere Erlaubnis für Offenheit oder Dankbarkeit angewiesen?", placeholder: "Beschreibe die Situation konkret." },
        { id: "d45-j2", question: "Was habe ich bewusst mit hineingeholt, obwohl nichts Besonderes passiert war?", placeholder: "Welche Dinge waren trotzdem schon da?" },
        { id: "d45-j3", question: "Wie hat sich mein Zustand verändert, als ich Weite nicht erst an einen Anlass geknüpft habe?", placeholder: "Was war spürbar anders?" },
        { id: "d45-j4", question: "Wie sah meine nächste Handlung aus, als Weite nicht nur Reaktion, sondern Grundbewegung wurde?", placeholder: "Beschreibe die Handlung." }
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist. Mindestens 1 Sache ohne besonderen Anlass, 1 Sache aus einem ganz normalen Moment und 1 Sache, die dir gezeigt hat, dass Weite nicht erst von außen erlaubt werden muss.",
      free_reflection_prompt: "Was zeigt mir dieser Tag darüber, wie sehr mein System Offenheit und Tragfähigkeit noch an äußere Bedingungen knüpft?"
    },
    gratitude_prompt: "Welche ganz normale Situation heute hat mir gezeigt, dass Weite auch ohne besonderen Anlass möglich ist?",
    self_talk_anchors: [
      { text: "Brauche ich gerade einen Anlass?", when: "Wenn dein System auf äußere Freigabe wartet" },
      { text: "Weite jetzt.", when: "Wenn du Grundweite bewusst öffnest" },
      { text: "Aus Grundweite.", when: "Wenn du die nächste Handlung trägst" }
    ],
    variants: {
      training: "Ideal bei guten Szenen, leichten Phasen, schönen Momenten, Unterstützung oder Ruhe — aber nicht nur deshalb. Auch in neutralen Momenten trainierbar.",
      rest: "Perfekt in ganz normalen Momenten: auf dem Weg, in Pause, im neutralen Tagesmoment, bei etwas Unspektakulärem. Genau dort trainierst du Weite ohne besonderen Anlass.",
      match: "Nutze gute Szene oder Ruhe, aber vor allem: warte nicht auf Anlass. Öffne Weite auch mitten im normalen Verlauf."
    }
  },
  {
    day_id: 46,
    title: "Urteil verliert Macht",
    phase: "Phase IV — Verkörperung und Identität",
    week: 7,
    line: "Learning vs Judgement",
    lens: "Urteil darf auftauchen, ohne sich tief in Zustand, Verhalten und Selbstbild einzugraben.",
    primary_mechanism: "Reduced Fusion with Judgement",
    today_trigger: "Sobald ein inneres oder äußeres Urteil auftaucht und dein System es zu tief einsickern lassen will, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von Urteil mit hoher Autorität zu Urteil mit weniger Eindringtiefe und weniger Steuerkraft.",
    science_bite: "Das Problem ist nicht nur, dass Urteil auftaucht. Das Problem beginnt dort, wo es zu tief eindringt: Stimmung kippt, Präsenz sinkt, Aufgabe wird kleiner, Selbstzweifel werden größer und Verhalten folgt Urteil statt Standard. Heute trainierst du deshalb nicht, Urteil wegzumachen, sondern seine Macht zu reduzieren.",
    tasks: [
      {
        id: "d46-t1",
        title: "Erkenne das Eindringen",
        trigger: "Wenn ein Urteil auftaucht und du merkst, dass es mehr als nur ein Kommentar wird",
        when_to_use: "Bei Vergleich, Blicken, Kommentaren, Fehlern, Korrektur, eigenem harten Gedanken oder sozialer Bewertung",
        action: "Frag dich kurz: 'Taucht da gerade ein Urteil auf — oder dringt es schon in mich ein?'",
        why: "Bevor Urteil weniger Macht bekommt, musst du merken, wann es von Oberfläche zu Steuerkraft wird.",
        explanation: "Nicht jedes Urteil ist gleich problematisch. Problematisch wird es dann, wenn es nicht nur auftaucht, sondern Stimmung, Verhalten und Selbstbild mitschiebt.",
        self_talk: "Wie tief geht das gerade?",
        micro_reframe: "Urteil taucht oft schnell auf. Entscheidend ist, ob ich es tief eindringen lasse.",
        reframe_step: {
          trigger: "Ein Urteil oder kritischer Satz taucht auf.",
          reframe: "Bevor ich hineinkippe, prüfe ich seine aktuelle Eindringtiefe.",
          anchor: "Wie tief geht das gerade?"
        },
        system_function: "Judgement Depth Awareness",
        icon: "Eye"
      },
      {
        id: "d46-t2",
        title: "Halte Urteil oberflächlicher",
        trigger: "Nachdem du gemerkt hast, dass Urteil gerade tief werden will",
        when_to_use: "Direkt im Urteils-Moment",
        action: "Sag dir einmal ruhig: 'Da ist Urteil.' und lass es auf Kommentar-Ebene statt auf Identitäts-Ebene.",
        why: "Tag 46 wird stark, wenn Urteil nicht mehr sofort bis ins Selbst durchregiert.",
        explanation: "Es geht nicht darum, Urteil wegzudiskutieren. Es geht darum, es weniger tief werden zu lassen: nicht komplett glauben, nicht verkörpern, nicht als Wahrheit über dich behandeln.",
        self_talk: "Da ist Urteil.",
        micro_reframe: "Urteil muss nicht sofort tief werden, nur weil es auftaucht.",
        reframe_step: {
          trigger: "Ich spüre, dass Urteil tiefer einsickert.",
          reframe: "Jetzt halte ich es wieder näher an der Oberfläche.",
          anchor: "Da ist Urteil."
        },
        system_function: "Judgement Defusion",
        icon: "Shield"
      },
      {
        id: "d46-t3",
        title: "Bleib bei Standard und Aufgabe",
        trigger: "Wenn Urteil da ist, aber du wieder Handlungshoheit brauchst",
        when_to_use: "In der direkt nächsten Szene",
        action: "Binde dein Verhalten bewusst wieder an Standard und Aufgabe statt an das Urteil.",
        why: "Urteil verliert Macht erst dann wirklich, wenn Verhalten nicht mehr automatisch ihm folgt.",
        explanation: "Nicht gegen das Urteil kämpfen. Nicht extra beweisen. Nicht kompensieren. Nur wieder an Standard, Prozess, Haltung, Präsenz und nächste Aufgabe binden.",
        self_talk: "Standard vor Urteil.",
        micro_reframe: "Mein Verhalten muss nicht dem Urteil folgen, nur weil es da ist.",
        reframe_step: {
          trigger: "Urteil ist da, aber ich will wieder sauber handeln.",
          reframe: "Jetzt gehe ich nicht in Urteil, sondern zurück zu Standard und Aufgabe.",
          anchor: "Standard vor Urteil."
        },
        system_function: "Behavioral De-coupling",
        icon: "ArrowRightCircle"
      }
    ],
    journal: {
      title: "Wann hatte Urteil heute weniger Macht?",
      questions: [
        { id: "d46-j1", question: "Welches Urteil hat heute am stärksten versucht, tief in Zustand oder Selbstbild einzudringen?", placeholder: "Beschreibe die Situation konkret." },
        { id: "d46-j2", question: "Woran habe ich gemerkt, dass es mehr als nur ein Kommentar werden wollte?", placeholder: "Was war innerlich oder im Verhalten spürbar?" },
        { id: "d46-j3", question: "Konnte ich Urteil heute mindestens einmal oberflächlicher halten?", placeholder: "Wie sah das aus?" },
        { id: "d46-j4", question: "Wie hat sich meine nächste Handlung verändert, als Urteil weniger Macht bekam?", placeholder: "Beschreibe die Szene." }
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist — auch etwas aus einem Moment, in dem Urteil da war, aber weniger regiert hat.",
      free_reflection_prompt: "Was zeigt mir dieser Tag darüber, wie sehr Urteil mein System noch steuert — und wo seine Macht schon kleiner wird?"
    },
    gratitude_prompt: "Welche Urteilssituation heute hat mir gezeigt, dass Kritik nicht automatisch tief in mich eindringen muss?",
    self_talk_anchors: [
      { text: "Wie tief geht das gerade?", when: "Wenn Urteil auftaucht" },
      { text: "Da ist Urteil.", when: "Wenn du es oberflächlicher halten willst" },
      { text: "Standard vor Urteil.", when: "In der nächsten Handlung" }
    ],
    variants: {
      training: "Nutze Blicke, Kommentare, Fehler, Korrekturen, Vergleich und inneres Urteil als Hauptmaterial.",
      rest: "Übertragbar auf Gespräche, Social Media, Arbeit ohne Rückmeldung, Selbstkritik und normale Alltagsbewertung.",
      match: "Kurzversion: Eindringtiefe merken → Urteil oberflächlicher halten → Standard vor Urteil."
    }
  },
  {
    day_id: 47,
    title: "Sicherheit wird ruhiger",
    phase: "Phase IV — Verkörperung und Identität",
    week: 7,
    line: "Confidence vs Self-Doubt",
    lens: "Ich kann sicher sein, ohne mich dafür aufzuladen oder beweisen zu müssen.",
    primary_mechanism: "Calmer Confidence Availability",
    today_trigger: "Sobald eine sichtbare, relevante oder druckvolle Szene auftaucht, in der dein System sonst Sicherheit performen würde, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von Sicherheit mit Zusatz zu ruhiger, weniger beweisabhängiger Verfügbarkeit.",
    science_bite: "Sicherheit wird oft unnötig laut: geladen, leicht nervös, etwas überdreht, beweisend, nicht ganz stabil. Das Problem ist nicht Stärke. Das Problem ist, dass Sicherheit zu abhängig von Aktivierung und Beweis bleibt. Heute trainierst du deshalb keine neue Stärke, sondern ruhigere Sicherheit.",
    tasks: [
      {
        id: "d47-t1",
        title: "Erkenne den Zusatz",
        trigger: "Wenn du in einer sichtbaren oder relevanten Szene merkst, dass dein System Sicherheit extra herstellen oder performen will",
        when_to_use: "Bei Führungsmoment, Konkurrenz, relevanter Aktion, guter Phase, Druckmoment oder sozial sichtbarer Verantwortung",
        action: "Frag dich kurz: 'Ist hier gerade Sicherheit da — oder viel Zusatz um Sicherheit herum?'",
        why: "Du musst zuerst sichtbar machen, wann Confidence unnötig aufgeladen statt ruhig getragen wird.",
        explanation: "Zusatz heißt: mehr Hype, mehr Beweis, mehr Lautstärke, mehr innere Aktivierung als nötig. Genau das soll heute auffallen.",
        self_talk: "Sicherheit oder Zusatz?",
        micro_reframe: "Mehr Energie ist nicht automatisch mehr echte Sicherheit.",
        reframe_step: {
          trigger: "Eine starke oder relevante Szene ist da.",
          reframe: "Bevor ich Sicherheit spiele, prüfe ich, ob ich gerade viel Zusatz baue.",
          anchor: "Sicherheit oder Zusatz?"
        },
        system_function: "Added Activation Awareness",
        icon: "Eye"
      },
      {
        id: "d47-t2",
        title: "Nimm den Zusatz raus",
        trigger: "Nachdem du gemerkt hast, dass du Sicherheit gerade auflädst",
        when_to_use: "Direkt im Moment, bevor die Szene weiterläuft",
        action: "Lass bewusst etwas Hype, Beweiszug oder innere Überladung weg.",
        why: "Tag 47 codiert Sicherheit nicht lauter, sondern ruhiger.",
        explanation: "Nicht kleiner werden. Nicht schwächer werden. Nur weniger Zusatz: weniger inneres Aufputschen, weniger Wirkungsmachen, weniger beweisendes Verhalten.",
        self_talk: "Weniger Zusatz.",
        micro_reframe: "Ruhige Sicherheit ist oft stabiler als aufgeladene Sicherheit.",
        reframe_step: {
          trigger: "Ich habe viel Zusatz erkannt.",
          reframe: "Jetzt muss ich nichts größer machen. Ich lasse bewusst etwas weg.",
          anchor: "Weniger Zusatz."
        },
        system_function: "Confidence Quieting",
        icon: "Wind"
      },
      {
        id: "d47-t3",
        title: "Setz ruhige Qualität",
        trigger: "Wenn weniger Zusatz da ist und die Handlung wieder klarer wird",
        when_to_use: "In der direkt nächsten relevanten Handlung",
        action: "Setze die Qualität klar, ruhig und ohne Extra-Beweis.",
        why: "Der Tag wird erst real, wenn Sicherheit sichtbar bleibt, aber leiser getragen wird.",
        explanation: "Nicht klein. Nicht weich. Nicht abwartend. Einfach klar, ruhig, verfügbar und nicht beweisend.",
        self_talk: "Ruhig klar.",
        micro_reframe: "Ich kann Qualität setzen, ohne sie mit Hype oder Beweis zu überladen.",
        reframe_step: {
          trigger: "Zusatz ist reduziert und Handlung ist wieder da.",
          reframe: "Jetzt setze ich Qualität ohne unnötige Aufladung.",
          anchor: "Ruhig klar."
        },
        system_function: "Quiet Embodied Confidence",
        icon: "BadgeCheck"
      }
    ],
    journal: {
      title: "Wo wurde Sicherheit heute ruhiger?",
      questions: [
        { id: "d47-j1", question: "In welcher sichtbaren oder relevanten Szene wollte mein System heute Sicherheit aufladen oder performen?", placeholder: "Beschreibe die Situation." },
        { id: "d47-j2", question: "Woran habe ich den Zusatz erkannt?", placeholder: "Hype, Beweiszug, Aktivierung, Lautheit ..." },
        { id: "d47-j3", question: "Konnte ich heute bewusst etwas Zusatz rausnehmen?", placeholder: "Wie sah das konkret aus?" },
        { id: "d47-j4", question: "Wie hat sich meine nächste Handlung verändert, als Sicherheit ruhiger wurde?", placeholder: "Beschreibe die Szene." }
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist — auch etwas aus einer Szene, in der du Qualität gesetzt hast, ohne dich aufzublasen.",
      free_reflection_prompt: "Was zeigt mir dieser Tag darüber, wie sehr meine Sicherheit bisher noch Zusatz, Hype oder Beweis gebraucht hat?"
    },
    gratitude_prompt: "Welche Szene heute hat mir gezeigt, dass ruhige Sicherheit oft stärker ist als aufgeladene?",
    self_talk_anchors: [
      { text: "Sicherheit oder Zusatz?", when: "Wenn die Szene relevant wird" },
      { text: "Weniger Zusatz.", when: "Wenn du die Aufladung reduzierst" },
      { text: "Ruhig klar.", when: "In der sichtbaren Qualitäts-Handlung" }
    ],
    variants: {
      training: "Ideal bei Konkurrenz, sichtbaren Aktionen, guter Phase, Druckmoment oder Führungsmoment.",
      rest: "Übertragbar auf Gespräche, Arbeit ohne Rückmeldung, neutrale Tage und Situationen, in denen du sonst Sicherheit performen würdest.",
      match: "Kurzversion: Zusatz erkennen → Zusatz rausnehmen → ruhige Qualität setzen."
    }
  },
  {
    day_id: 48,
    title: "Akzeptanz wird stark",
    phase: "Phase IV — Verkörperung und Identität",
    week: 7,
    line: "Control vs Non-Control",
    lens: "Wenn etwas nicht bei mir liegt, muss ich keine zusätzliche Gegenspannung bauen. Ich kann Kraft sparen und aus dem Verfügbaren stark weiterhandeln.",
    primary_mechanism: "Embodied Acceptance Strength",
    today_trigger: "Sobald etwas offen, unfair, unvollkommen oder nicht kontrollierbar bleibt und dein System dagegen weiterkämpfen will, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von Nicht-Kontrolle mit Gegenkraft zu Nicht-Kontrolle mit ruhiger Stärke und Kraftökonomie.",
    science_bite: "Viele Menschen erleben Akzeptanz wie ein Nachgeben. Das ist oft nur deshalb so, weil sie Akzeptanz mit Passivität verwechseln. In Wahrheit verliert ein System oft am meisten Kraft nicht an das Problem selbst, sondern an die zusätzliche Gegenspannung: inneres Dagegensein, ständiges 'es müsste anders sein', versteckter Kampf gegen die Realität. Heute trainierst du deshalb nicht, alles okay zu finden. Du trainierst, keine unnötige Kraft mehr an das zu verlieren, was gerade nicht in deiner Hand liegt. Das ist keine Schwäche. Das ist Effizienz in ihrer reifen Form.",
    tasks: [
      {
        id: "d48-t1",
        title: "Erkenne die Gegenspannung",
        trigger: "Wenn etwas nicht nach Plan läuft und du merkst, dass dein System innerlich dagegenhält",
        when_to_use: "Bei Unfairness, offenen Situationen, Planbruch, Dingen bei anderen, Unvollkommenheit oder nicht mehr korrigierbaren Momenten",
        action: "Frag dich kurz: 'Ist hier nur ein Problem — oder baue ich gerade zusätzlich Gegenspannung dagegen auf?'",
        why: "Bevor Akzeptanz als Stärke wirken kann, musst du merken, wann dein System gerade unnötige Gegenkraft aufbaut.",
        explanation: "Achte auf Momente, in denen etwas nicht steuerbar, nicht ideal, nicht fair, nicht rückgängig oder nicht nach deinem Plan ist. Genau dort wird sichtbar, ob nur Realität da ist — oder ob dein System zusätzlich verhärtet.",
        self_talk: "Schon Gegenspannung?",
        micro_reframe: "Nicht-Kontrolle allein macht mich nicht klein — oft macht es erst meine Gegenkraft dazu.",
        reframe_step: {
          trigger: "Etwas bleibt offen, unfair oder nicht bei mir.",
          reframe: "Bevor ich weiter dagegenhalte, prüfe ich, wie viel Zusatzspannung ich schon gebaut habe.",
          anchor: "Schon Gegenspannung?"
        },
        system_function: "Resistance Awareness",
        icon: "Eye"
      },
      {
        id: "d48-t2",
        title: "Nimm Kraft aus dem Widerstand",
        trigger: "Nachdem du Gegenspannung erkannt hast",
        when_to_use: "Direkt danach, bevor du weiter verkrampfst",
        action: "Lass bewusst einen Teil der Gegenkraft raus, ohne die Situation schönzureden.",
        why: "Tag 48 codiert Akzeptanz nicht als Passivität, sondern als Kraftökonomie.",
        explanation: "Du gibst nicht auf. Du wirst nicht weich. Du verschwendest nur weniger Kraft an etwas, das gerade nicht verfügbar ist. Genau das macht dich stärker und flüssiger.",
        self_talk: "Weniger Gegenkraft.",
        micro_reframe: "Stärke ist heute nicht mehr Kampf gegen das Unverfügbare, sondern Verfügbarkeit im Verfügbaren.",
        reframe_step: {
          trigger: "Ich habe Gegenspannung erkannt.",
          reframe: "Jetzt nehme ich bewusst Kraft aus dem Widerstand, ohne die Realität zu leugnen.",
          anchor: "Weniger Gegenkraft."
        },
        system_function: "Strength Economy",
        icon: "Shield"
      },
      {
        id: "d48-t3",
        title: "Handle stark aus dem Verfügbaren",
        trigger: "Wenn weniger Gegenkraft da ist und du wieder arbeitsfähiger wirst",
        when_to_use: "In der direkt nächsten relevanten Szene",
        action: "Frag dich: 'Was ist hier aus dem Verfügbaren stark möglich?' und setze genau das.",
        why: "Akzeptanz wird erst stark, wenn sie nicht in Leere endet, sondern in handlungsfähiger Ruhe.",
        explanation: "Nicht alles lösen. Nicht das Unfaire drehen. Nicht offene Schleifen schließen. Sondern Kraft sparen und aus dem, was da ist, stark und präsent weiterhandeln.",
        self_talk: "Stark aus dem Verfügbaren.",
        micro_reframe: "Wenn ich weniger an Nicht-Kontrolle verliere, habe ich mehr Stärke für das, was wirklich bei mir liegt.",
        reframe_step: {
          trigger: "Widerstand hat etwas weniger Kraft.",
          reframe: "Jetzt richte ich meine Stärke auf das, was wirklich da und verfügbar ist.",
          anchor: "Stark aus dem Verfügbaren."
        },
        system_function: "Embodied Availability",
        icon: "ArrowRightCircle"
      }
    ],
    journal: {
      title: "Wo habe ich heute Kraft an Nicht-Kontrolle verloren — und wo nicht mehr?",
      questions: [
        { id: "d48-j1", question: "Welche offene, unfaire oder nicht kontrollierbare Situation hat heute am meisten Gegenspannung in mir ausgelöst?", placeholder: "Beschreibe die Situation." },
        { id: "d48-j2", question: "Woran habe ich gemerkt, dass mein System zusätzliche Gegenkraft gebaut hat?", placeholder: "Was war im Körper, Fokus oder Verhalten spürbar?" },
        { id: "d48-j3", question: "Konnte ich heute bewusst Kraft aus dem Widerstand nehmen?", placeholder: "Wie sah das aus?" },
        { id: "d48-j4", question: "Was war aus dem Verfügbaren stark möglich, als weniger Gegenkraft da war?", placeholder: "Beschreibe die nächste Handlung." }
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist — auch etwas aus einer Situation, die nicht nach deinem Plan lief.",
      free_reflection_prompt: "Was zeigt mir dieser Tag darüber, wie stark mein System noch Kraft an Nicht-Kontrolle verliert — und wo Akzeptanz schon verkörperter wird?"
    },
    gratitude_prompt: "Welche unkontrollierbare Situation heute hat mir gezeigt, dass Akzeptanz auch eine Form von Stärke sein kann?",
    self_talk_anchors: [
      { text: "Schon Gegenspannung?", when: "Wenn Nicht-Kontrolle da ist" },
      { text: "Weniger Gegenkraft.", when: "Wenn du Widerstand reduzierst" },
      { text: "Stark aus dem Verfügbaren.", when: "In der nächsten starken Handlung" }
    ],
    variants: {
      training: "Ideal bei Unfairness, offenen Situationen, Planbruch, Dingen bei anderen und unperfekt bleibenden Sequenzen.",
      rest: "Sehr gut übertragbar auf offene Schleifen, Wartezeiten, nicht korrigierbare Dinge, Menschen, Bedingungen und Alltag, der anders läuft als geplant.",
      match: "Kurzversion: Gegenspannung erkennen → Gegenkraft rausnehmen → stark aus dem Verfügbaren handeln."
    }
  },
  {
    day_id: 49,
    title: "Präsenz ist Teil von mir",
    phase: "Phase IV — Verkörperung und Identität",
    week: 7,
    line: "Presence / Identity",
    lens: "Präsenz ist nicht nur etwas, das ich anwende — sie wird mehr und mehr Teil meiner Art zu sein.",
    primary_mechanism: "Identity-coupled Presence",
    today_trigger: "Sobald dein Kopf kurz zieht, springt oder weg will, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von Rückkehr als Methode zu Präsenz als identitätsnäherer Grundverfügbarkeit.",
    science_bite: "Tag 49 ist klar von Tag 1, 15, 22, 36 und 43 getrennt: früher ging es darum, Präsenz zu bemerken, zurückzuholen, im Chaos zu bündeln oder als Standard kürzer werden zu lassen. Jetzt wird Präsenz identitätsnäher. Das bedeutet nicht, dass kein Drift mehr auftaucht. Es bedeutet, dass dein System immer weniger wie ein Fremdkörper zu seiner Aufgabe zurückkehrt — und immer mehr so, als wäre Verfügbarkeit Teil deiner Art zu sein.",
    tasks: [
      {
        id: "d49-t1",
        title: "Erkenne den Zug ohne Drama",
        trigger: "Wenn dein Kopf kurz in Bewertung, Zukunft, Verlauf oder inneres Material zieht",
        when_to_use: "Im Training, im Alltag, im Gespräch, in Mikro-Drifts oder kurzen mentalen Zügen",
        action: "Nimm den Zug kurz wahr, ohne daraus ein Problem zu machen.",
        why: "Präsenz als Teil von dir beginnt dort, wo Drift weniger Ereignischarakter bekommt.",
        explanation: "Du musst heute nicht mehr jedes Wegkippen wie einen Fokusbruch behandeln. Kurz merken, nicht aufblasen, nicht extra erschrecken.",
        self_talk: "Kurz gezogen.",
        micro_reframe: "Drift verliert an Drama, wenn Präsenz weniger Technik und mehr Grundverfügbarkeit wird.",
        reframe_step: {
          trigger: "Mein Kopf zieht kurz weg.",
          reframe: "Ich mache daraus kein großes Thema. Ich erkenne nur kurz den Zug.",
          anchor: "Kurz gezogen."
        },
        system_function: "Low-Drama Awareness",
        icon: "Eye"
      },
      {
        id: "d49-t2",
        title: "Gehe zurück wie zu dir selbst",
        trigger: "Direkt nachdem du den Zug erkannt hast",
        when_to_use: "Sofort, ohne große Reset-Inszenierung",
        action: "Geh direkt zurück an Aufgabe, Prozess oder Szene, so als würdest du an einen vertrauten Ort zurückgehen.",
        why: "Der Unterschied von Tag 49 ist nicht nur schnellere Rückkehr, sondern vertrautere Rückkehr.",
        explanation: "Nicht mehr wie: 'Ich muss mich wieder herstellen.' Sondern eher wie: 'Da bin ich wieder.' Präsenz wird weniger Reparatur und mehr Wiederanbindung an etwas, das dir innerlich bekannt ist.",
        self_talk: "Wieder hier.",
        micro_reframe: "Präsenz darf sich heute vertrauter und identitätsnäher anfühlen als früher.",
        reframe_step: {
          trigger: "Ich habe den Zug erkannt.",
          reframe: "Jetzt gehe ich nicht in Technik, sondern zurück an einen vertrauten inneren Ort.",
          anchor: "Wieder hier."
        },
        system_function: "Identity-Coupled Return",
        icon: "RotateCcw"
      },
      {
        id: "d49-t3",
        title: "Handle aus Verfügbarkeit",
        trigger: "Wenn du wieder mehr bei dir und bei der Aufgabe bist",
        when_to_use: "In der direkt nächsten Handlung",
        action: "Setze die nächste Handlung aus stiller Verfügbarkeit statt aus extra mentalem Aufwand.",
        why: "Tag 49 wird erst real, wenn Präsenz nicht nur zurückkommt, sondern selbstverständlichere Handlung trägt.",
        explanation: "Nicht künstlich fokussiert. Nicht extra angespannt. Nicht motivierend überhöht. Einfach verfügbar, ruhig, bei der Aufgabe und handlungsbereit.",
        self_talk: "Aus Verfügbarkeit.",
        micro_reframe: "Ich muss mich nicht dauernd neu produzieren, wenn Verfügbarkeit schon mehr Teil von mir geworden ist.",
        reframe_step: {
          trigger: "Ich bin wieder mehr da.",
          reframe: "Jetzt handle ich nicht mit großem Extra, sondern aus stiller Verfügbarkeit.",
          anchor: "Aus Verfügbarkeit."
        },
        system_function: "Embodied Availability",
        icon: "ArrowRightCircle"
      }
    ],
    journal: {
      title: "Wann hat sich Präsenz heute schon mehr wie Teil von mir angefühlt?",
      questions: [
        { id: "d49-j1", question: "In welchen Situationen hat mein Kopf heute kurz gezogen oder weggesprungen?", placeholder: "Beschreibe die Situationen." },
        { id: "d49-j2", question: "Woran habe ich gemerkt, dass ich daraus weniger Drama gemacht habe als früher?", placeholder: "Was war anders?" },
        { id: "d49-j3", question: "Wie hat sich die Rückkehr heute angefühlt, wenn sie vertrauter oder natürlicher war?", placeholder: "Beschreibe die Qualität der Rückkehr." },
        { id: "d49-j4", question: "Wo habe ich heute aus stiller Verfügbarkeit statt aus extra mentalem Aufwand gehandelt?", placeholder: "Welche Szene war dafür ein gutes Beispiel?" }
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist. Mindestens 1 Sache, bei der du heute kurz weg warst, 1 Sache, bei der du schneller zurück warst als früher, und 1 Sache, die dir heute gezeigt hat, dass Wiederholung langsam Identität formen kann.",
      free_reflection_prompt: "Was zeigt mir das darüber, ob Präsenz für mich langsam Teil meiner Art zu sein wird?"
    },
    gratitude_prompt: "Welche kurze Drift-Situation heute hat mir gezeigt, dass Rückkehr natürlicher geworden ist?",
    self_talk_anchors: [
      { text: "Kurz gezogen.", when: "Wenn dein Kopf weg will" },
      { text: "Wieder hier.", when: "Wenn du zurückgehst" },
      { text: "Aus Verfügbarkeit.", when: "In der nächsten Handlung" }
    ],
    variants: {
      training: "Ideal in Übergängen, Drifts, relevanten Szenen, kurzen Druckmomenten und Rückkehr in Prozess und Aufgabe.",
      rest: "Sehr stark bei Arbeit, Handyimpulsen, Gesprächen, Szenenwechseln und normalen Alltagsdrifts.",
      match: "Kurzversion: kurze Rückkehrmomente bewusst lesen → Präsenz nicht als Ausnahme sehen → nächste Szene aus dem neuen Muster spielen."
    }
  },
  {
    day_id: 50,
    title: "Prozess wird Heimat",
    phase: "Phase IV — Verkörperung und Identität",
    week: 8,
    line: "Process vs Result",
    lens: "Außen darf wahrgenommen werden — aber mein innerer Wohnort bleibt im Prozess.",
    primary_mechanism: "Process-as-Home Integration",
    today_trigger: "Sobald reale Züge nach außen auftreten — Ergebnisdruck, Fehler, Lob, Bewertung, Momentum, Chaos, Gegner, Unfairness oder Vergleich — ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von Prozess als Werkzeug zu Prozess als innerem Ort, zu dem du immer wieder zurückwohnst.",
    science_bite: "Tag 50 nimmt die Prozesslinie in ihre reifste Form: Prozess nicht mehr nur als Technik oder Anker nutzen, sondern als inneren Grundort verkörpern, der unter allem bestehen bleibt. Du nimmst außen wahr, aber du wohnst nicht dort. Dein innerer Ort bleibt in Aufgabe, Standard, Handlungsqualität und dem, was wirklich bei dir liegt.",
    tasks: [
      {
        id: "d50-t1",
        title: "Erkenne, wo du gerade wohnst",
        trigger: "Wenn äußere Züge stark werden und dein System nach außen zieht",
        when_to_use: "Vor Wiederholungen, vor relevanten Szenen, nach guter oder schlechter Aktion, bei Übergängen und immer dann, wenn Außen groß wird",
        action: "Frag dich kurz: 'Wo wohne ich gerade — außen oder im Prozess?'",
        why: "Tag 50 braucht zuerst Ortsbewusstsein: nicht nur, was ich denke, sondern wo mein innerer Wohnort gerade ist.",
        explanation: "Außen wahrnehmen ist nicht falsch. Problematisch wird es dann, wenn dein System dort wohnen bleibt: im Ergebnis, im Fehler, im Lob, im Urteil, im Vergleich, im Gegner, in der Dynamik.",
        self_talk: "Wo wohne ich gerade?",
        micro_reframe: "Ich darf Außen sehen, ohne dort innerlich wohnen zu bleiben.",
        reframe_step: {
          trigger: "Außen zieht stark an mir.",
          reframe: "Bevor ich weiter mitgehe, prüfe ich meinen aktuellen inneren Ort.",
          anchor: "Wo wohne ich gerade?"
        },
        system_function: "Inner Location Awareness",
        icon: "Eye"
      },
      {
        id: "d50-t2",
        title: "Zieh zurück in deinen Wohnort",
        trigger: "Nachdem du gemerkt hast, dass dein innerer Ort nach außen gezogen ist",
        when_to_use: "Direkt danach, ohne viel Diskussion",
        action: "Bring dich bewusst zurück in Prozess, Aufgabe, Standard und das, was wirklich bei dir liegt.",
        why: "Der Kern von Tag 50 ist nicht nur Rückkehr, sondern Rückkehr in einen tieferen inneren Wohnort.",
        explanation: "Nicht im Außen wohnen. Nicht im Urteil wohnen. Nicht im Gegner wohnen. Nicht im Momentum wohnen. Nur wahrnehmen — und zurück in Aufgabe, Standard, Prozesspunkt, nächste saubere Handlung.",
        self_talk: "Zurück nach Hause.",
        micro_reframe: "Prozess ist heute nicht nur mein Werkzeug, sondern mein innerer Ort.",
        reframe_step: {
          trigger: "Ich habe gemerkt, dass ich außen wohne.",
          reframe: "Jetzt ziehe ich meinen inneren Ort bewusst zurück in Prozess und Standard.",
          anchor: "Zurück nach Hause."
        },
        system_function: "Process Home Return",
        icon: "Home"
      },
      {
        id: "d50-t3",
        title: "Lebe die nächste Szene von dort",
        trigger: "Wenn du wieder mehr im Prozess wohnst",
        when_to_use: "In der direkt nächsten relevanten Handlung",
        action: "Wettkämpfe die nächste Szene so, dass sichtbar wird: Mein Ort ist im Prozess, nicht im Außen.",
        why: "Tag 50 wird erst real, wenn Prozess nicht nur gedacht, sondern als Grundort gelebt wird.",
        explanation: "Nicht als Technik, nicht als Notfallmaßnahme, sondern als Basis: Aufgabe spielen, Handlung sauber halten, Standard tragen, Außen wahrnehmen, aber dort nicht leben.",
        self_talk: "Von hier leben.",
        micro_reframe: "Wenn mein innerer Ort im Prozess bleibt, wird Außen weniger regierend.",
        reframe_step: {
          trigger: "Ich bin wieder mehr im Prozess.",
          reframe: "Jetzt trage ich diesen Wohnort auch in die nächste Szene.",
          anchor: "Von hier leben."
        },
        system_function: "Embodied Process Living",
        icon: "ArrowRightCircle"
      }
    ],
    journal: {
      title: "Wo habe ich heute gewohnt — und wohin bin ich zurückgegangen?",
      questions: [
        { id: "d50-j1", question: "Welche äußeren Züge waren heute am stärksten?", placeholder: "Ergebnis, Fehler, Lob, Bewertung, Momentum, Gegner, Vergleich ..." },
        { id: "d50-j2", question: "Woran habe ich gemerkt, dass mein System dort innerlich wohnen geblieben ist?", placeholder: "Was war spürbar?" },
        { id: "d50-j3", question: "Wie habe ich mich bewusst zurück in Prozess, Standard und Aufgabe geholt?", placeholder: "Beschreibe den Shift." },
        { id: "d50-j4", question: "Welche Szene heute hat mir am klarsten gezeigt, dass Prozess mehr und mehr mein innerer Wohnort wird?", placeholder: "Beschreibe die Szene." }
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist. Mindestens 1 Sache, die stark nach außen gezogen hat, 1 Sache, die dich wieder in deinen Wohnort gebracht hat, und 1 Sache, die dir gezeigt hat, dass Prozess mehr als ein Werkzeug sein kann.",
      free_reflection_prompt: "Was zeigt mir dieser Tag darüber, wo mein System unter echten Zügen noch wohnt — und wie oft Prozess schon wie Heimat wirkt?"
    },
    gratitude_prompt: "Welche starke äußere Situation heute hat mir gezeigt, dass ich Außen wahrnehmen kann, ohne dort wohnen zu bleiben?",
    self_talk_anchors: [
      { text: "Wo wohne ich gerade?", when: "Wenn Außen stark zieht" },
      { text: "Zurück nach Hause.", when: "Wenn du in Prozess zurückgehst" },
      { text: "Von hier leben.", when: "Wenn du die nächste Szene aus Prozess trägst" }
    ],
    variants: {
      training: "Ideal bei Ergebnisdruck, Fehlern, Lob, Bewertung, Momentum, Chaos, Gegner, Unfairness und Vergleich.",
      rest: "Sehr stark bei Arbeit, Gespräch, Handyimpuls, Planänderung, Ergebnisorientierung und kleinen Reizmomenten im Alltag.",
      match: "Kurzversion: Wohnort prüfen → in Prozess zurück → nächste Szene von dort leben."
    }
  },
  {
    day_id: 51,
    title: "Spannung ist nicht automatisch Bedrohung",
    phase: "Phase IV — Verkörperung und Identität",
    week: 8,
    line: "Fear vs Love / Gratitude vs Anxiety / Control vs Non-Control",
    lens: "Spannung darf da sein, ohne dass mein ganzes System sofort enger, bedrohungsfixierter und schutzorientierter werden muss.",
    primary_mechanism: "Threat Decoupling Under Tension",
    today_trigger: "Sobald reale Spannung da ist — Warten, Relevanz, offener Ausgang, Verantwortung, Beobachtung, Unsicherheit oder eine körperlich spürbare innere Aufladung — ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von Spannung = automatische Bedrohung zu Spannung = spürbar, aber nicht regierend.",
    science_bite: "Spannung ist nicht das Problem. Das Problem beginnt dort, wo dein System Spannung fast automatisch als Gefahr liest. Dann wird Wahrnehmung enger, Schutz größer, Mangel sichtbarer und Handlung kleiner. Reife heißt heute nicht, spannungsfrei zu werden. Reife heißt, dass Spannung nicht mehr automatisch dein ganzes System in Bedrohungsmodus zieht.",
    tasks: [
      {
        id: "d51-t1",
        title: "Erkenne den Bedrohungszug",
        trigger: "Wenn du merkst, dass Spannung in dir sofort Enge, Schutz oder Problemfokus auslöst",
        when_to_use: "Vor einer wichtigen Szene, beim Warten, in unklarer Lage, bei Verantwortung, bei Beobachtung, in offener Situation oder wenn der Körper bereits Spannung trägt",
        action: "Frag dich kurz: 'Ist hier gerade nur Spannung da — oder macht mein System schon Bedrohung daraus?'",
        why: "Du musst zuerst unterscheiden, ob du gerade etwas spürst oder ob dein System daraus schon eine gefährliche Geschichte baut.",
        explanation: "Viele Menschen merken nur die Spannung und halten sie direkt für das Problem. Heute geht es darum, eine Ebene tiefer zu sehen: Wann wird aus Spannung schon Bedrohungslese? Wann wird das System enger als nötig?",
        self_talk: "Spannung oder schon Bedrohung?",
        micro_reframe: "Spannung ist real. Bedrohungsenge ist schon die nächste Übersetzung.",
        reframe_step: {
          trigger: "Ich spüre Spannung im Körper oder im Kopf.",
          reframe: "Bevor ich automatisch kleiner werde, prüfe ich, ob mein System schon auf Gefahr schaltet.",
          anchor: "Spannung oder schon Bedrohung?"
        },
        system_function: "Threat Interpretation Awareness",
        icon: "Eye"
      },
      {
        id: "d51-t2",
        title: "Halte Weite mit im System",
        trigger: "Nachdem du gemerkt hast, dass Spannung gerade zu Bedrohungsenge werden will",
        when_to_use: "Direkt in derselben Situation, bevor dein Wahrnehmungsfeld noch kleiner wird",
        action: "Frag dich: 'Was ist trotz Spannung noch da?' und halte 2–3 reale stabile Dinge bewusst mit im Bild.",
        why: "Der Tag wird nicht dadurch stark, dass du Spannung wegmachst, sondern dass du verhinderst, dass sie dein ganzes Wahrnehmungsfeld übernimmt.",
        explanation: "Vielleicht ist dein Körper noch tragfähig. Vielleicht ist deine Aufgabe klar. Vielleicht ist deine Technik erreichbar. Vielleicht ist Unterstützung da. Vielleicht ist der Moment nicht gegen dich, sondern einfach offen. Du trainierst, dass Spannung nicht alleiniger Herrscher über deine Wahrnehmung wird.",
        self_talk: "Weite bleibt mit drin.",
        micro_reframe: "Spannung darf da sein, ohne mein ganzes Feld zu besetzen.",
        reframe_step: {
          trigger: "Ich habe den Bedrohungszug erkannt.",
          reframe: "Jetzt gebe ich Spannung nicht das ganze Feld. Ich halte bewusst auch Stabilität und Möglichkeit mit im System.",
          anchor: "Weite bleibt mit drin."
        },
        system_function: "Breadth Preservation",
        icon: "Expand"
      },
      {
        id: "d51-t3",
        title: "Handle ohne Engzug",
        trigger: "Wenn Spannung noch da ist, aber dein System nicht mehr komplett in Bedrohungsmodus steckt",
        when_to_use: "In der direkt nächsten Handlung oder Szene",
        action: "Setze die nächste Handlung nicht aus Enge und Schutz, sondern aus Prozess, Weite und Verfügbarkeit.",
        why: "Tag 51 wird erst real, wenn Spannung nicht mehr automatisch eine kleine, hektische oder defensive Handlung erzeugt.",
        explanation: "Du musst nicht ruhig sein. Du musst nicht locker sein. Du musst nur verhindern, dass Spannung dein Verhalten automatisch verengt. Die nächste Szene soll zeigen: Spannung ist da, aber sie regiert mich nicht komplett.",
        self_talk: "Nicht aus Engzug.",
        micro_reframe: "Reife heißt heute nicht spannungsfrei, sondern weniger bedrohungsgesteuert.",
        reframe_step: {
          trigger: "Spannung ist noch da, aber ich bin nicht mehr komplett in Engzug.",
          reframe: "Jetzt handle ich nicht aus Schutzkleinheit, sondern aus mehr Prozess und Verfügbarkeit.",
          anchor: "Nicht aus Engzug."
        },
        system_function: "Tension-Tolerant Action",
        icon: "ArrowRightCircle"
      }
    ],
    journal: {
      title: "Wo wurde Spannung heute zu Bedrohung — und wo nicht mehr?",
      questions: [
        { id: "d51-j1", question: "In welcher Situation war heute echte Spannung da?", placeholder: "Beschreibe die Szene konkret." },
        { id: "d51-j2", question: "Woran habe ich gemerkt, dass mein System daraus Bedrohungsenge gemacht hat?", placeholder: "Was wurde enger, kleiner oder schutzorientierter?" },
        { id: "d51-j3", question: "Was konnte ich trotz Spannung bewusst mit im Bild halten?", placeholder: "Welche realen stabilen Dinge waren noch da?" },
        { id: "d51-j4", question: "Wie hat sich meine nächste Handlung verändert, als Spannung nicht alles übernehmen durfte?", placeholder: "Beschreibe die Handlung." }
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist. Mindestens 1 Sache aus einem Spannungsmoment, 1 Sache, die trotzdem stabil da war, und 1 Sache, die dir gezeigt hat, dass Spannung nicht automatisch Bedrohung sein muss.",
      free_reflection_prompt: "Was zeigt mir dieser Tag darüber, wie schnell mein System Spannung noch in Bedrohungsenge übersetzt?"
    },
    gratitude_prompt: "Welche Spannung heute hat mir gezeigt, dass Enge nicht automatisch folgen muss?",
    self_talk_anchors: [
      { text: "Spannung oder schon Bedrohung?", when: "Wenn Spannung anzieht" },
      { text: "Weite bleibt mit drin.", when: "Wenn du Bedrohungsmonopol aufbrichst" },
      { text: "Nicht aus Engzug.", when: "In der nächsten Handlung" }
    ],
    variants: {
      training: "Ideal bei relevanter Szene, offenem Ausgang, Warten, Verantwortung, Beobachtung und körperlich spürbarer Spannung.",
      rest: "Sehr stark bei Gesprächen, Nachrichten, Entscheidungen, Warten, Unsicherheit und allem, was innerlich spürbar auflädt.",
      match: "Maximal relevant: Spannung ist da, aber sie darf nicht automatisch Bedrohungsmodus und kleine Handlung erzeugen."
    }
  },
  {
    day_id: 52,
    title: "Leistung aus Beitrag statt aus Schutz",
    phase: "Phase IV — Verkörperung und Identität",
    week: 8,
    line: "Fear vs Love / Purpose",
    lens: "Mein Leistungsmotor muss nicht primär aus Schutz, Beweis oder Angst laufen.",
    primary_mechanism: "Contribution-Oriented Performance State",
    today_trigger: "Sobald du in eine relevante Handlung gehst und merkst, dass dein innerer Motor stärker aus Schutz als aus Beitrag organisiert ist, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von Schutzmotor zu Beitragsmotor.",
    science_bite: "Leistung sieht oft stark aus, ist innerlich aber trotzdem schutzorganisiert: nicht scheitern, nicht schlecht aussehen, nicht exponiert werden, nicht Kontrolle verlieren. Genau dann wird sie enger, härter, selbstbezogener und weniger frei. Tag 52 verändert deshalb nicht nur deine Handlung, sondern den Motor darunter. Die Frage ist heute nicht nur: Was tue ich? Sondern: Woraus tue ich es?",
    tasks: [
      {
        id: "d52-t1",
        title: "Erkenne den Schutzmotor",
        trigger: "Wenn du in einer relevanten Handlung innerlich merkst, dass du eher Schaden vermeiden, dich absichern oder dich beweisen willst",
        when_to_use: "Bei Verantwortungsszene, Führungsmoment, offener Aktion, Drucksituation, sichtbarer Aufgabe oder Szene mit Bedeutung für andere",
        action: "Frag dich kurz: 'Treibt mich hier gerade Schutz — oder Beitrag?'",
        why: "Bevor Leistung aus einer reiferen Quelle organisiert werden kann, musst du merken, wann dein Motor noch auf Selbstschutz läuft.",
        explanation: "Schutzmotor ist oft nicht laut. Er zeigt sich in Härte, Absicherung, unnötiger Wichtigkeit, Beweisdrang, Defensivität oder künstlicher Kontrolle. Du machst heute sichtbar, was die Leistung innerlich antreibt.",
        self_talk: "Schutz oder Beitrag?",
        micro_reframe: "Nicht jede starke Aktivierung ist dienliche Leistung — oft ist sie noch Schutzmotor.",
        reframe_step: {
          trigger: "Eine relevante Handlung steht an und mein System spannt sich stark an.",
          reframe: "Bevor ich einfach loslaufe, prüfe ich, woraus meine Leistung gerade organisiert wird.",
          anchor: "Schutz oder Beitrag?"
        },
        system_function: "Performance Motor Awareness",
        icon: "Eye"
      },
      {
        id: "d52-t2",
        title: "Hol den Beitragsmotor rein",
        trigger: "Nachdem du den Schutzmotor erkannt hast",
        when_to_use: "Direkt vor der nächsten relevanten Handlung",
        action: "Frag dich: 'Was dient hier Aufgabe, Team oder größerer Ausrichtung wirklich?'",
        why: "Die Umcodierung des Tages liegt nicht in weniger Energie, sondern in anderer Energie-Richtung.",
        explanation: "Beitrag ist heute nicht weich. Er ist präzise. Er fragt nicht: Wie sichere ich mich? Sondern: Was hilft hier wirklich? Was trägt? Was ist die saubere verantwortliche Handlung? Genau dort wird Leistung freier.",
        self_talk: "Was dient hier wirklich?",
        micro_reframe: "Wenn Leistung aus Beitrag statt Schutz kommt, wird sie oft freier und sauberer.",
        reframe_step: {
          trigger: "Ich habe Schutzmotor erkannt.",
          reframe: "Jetzt richte ich meine Leistung neu: weg von Selbstschutz, hin zu Aufgabe und Beitrag.",
          anchor: "Was dient hier wirklich?"
        },
        system_function: "Contribution Activation",
        icon: "Compass"
      },
      {
        id: "d52-t3",
        title: "Setze die dienliche Handlung",
        trigger: "Wenn der Beitragsmotor klarer geworden ist",
        when_to_use: "In der direkt nächsten relevanten Szene",
        action: "Setze eine sichtbare Handlung, die mehr dient als schützt.",
        why: "Tag 52 wirkt erst, wenn der neue Motor direkt in Verhalten sichtbar wird.",
        explanation: "Das kann sein: klare Kommunikation, offenes Anbieten, Verantwortung übernehmen, stabilisierende Handlung, mutige aber dienliche Entscheidung. Nicht fürs Bild. Nicht zur Rettung. Für den Beitrag.",
        self_talk: "Dienlich leisten.",
        micro_reframe: "Meine Leistung wird reifer, wenn sie weniger Selbstschutz und mehr Beitrag trägt.",
        reframe_step: {
          trigger: "Der Beitragsmotor ist klarer.",
          reframe: "Jetzt setze ich keine Schutzhandlung, sondern eine dienliche Leistungshandlung.",
          anchor: "Dienlich leisten."
        },
        system_function: "Contribution-Based Action",
        icon: "ArrowRightCircle"
      }
    ],
    journal: {
      title: "Woraus war meine Leistung heute organisiert?",
      questions: [
        { id: "d52-j1", question: "In welcher relevanten Situation war mein Schutzmotor heute am stärksten?", placeholder: "Beschreibe die Szene konkret." },
        { id: "d52-j2", question: "Woran habe ich gemerkt, dass mein System eher aus Schutz als aus Beitrag geleistet hat?", placeholder: "Was war innerlich oder im Verhalten spürbar?" },
        { id: "d52-j3", question: "Was war in dieser Situation die dienlichere, beitragsorientierte Handlung?", placeholder: "Formuliere sie klar." },
        { id: "d52-j4", question: "Konnte ich sie heute sichtbar setzen?", placeholder: "Wie sah die Handlung konkret aus?" }
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist. Mindestens 1 Sache, in der Schutz stark war, 1 Sache, in der Beitrag sichtbar wurde, und 1 Sache, die dir gezeigt hat, dass Leistung nicht primär aus Angst organisiert werden muss.",
      free_reflection_prompt: "Was zeigt mir dieser Tag darüber, woraus mein Leistungsmotor unter Bedeutung noch zu oft gebaut ist?"
    },
    gratitude_prompt: "Welche Szene heute hat mir gezeigt, dass Leistung aus Beitrag freier sein kann als Leistung aus Schutz?",
    self_talk_anchors: [
      { text: "Schutz oder Beitrag?", when: "Wenn relevante Leistung ansteht" },
      { text: "Was dient hier wirklich?", when: "Wenn du den Motor neu richtest" },
      { text: "Dienlich leisten.", when: "In der sichtbaren Handlung" }
    ],
    variants: {
      training: "Ideal bei Verantwortungsszene, Führungsmoment, offener Aktion, Drucksituation oder sichtbarer Aufgabe.",
      rest: "Sehr stark bei Gesprächen, Entscheidungen, Arbeit, Verantwortung übernehmen und jemandem Stabilität geben.",
      match: "Maximal relevant: nicht aus Schutz performen, sondern aus Aufgabe, Beitrag und größerer Ausrichtung."
    }
  },
  {
    day_id: 53,
    title: "Schwierigkeit wird Wachstumsraum",
    phase: "Phase IV — Verkörperung und Identität",
    week: 8,
    line: "Growth vs Winning",
    lens: "Schwierigkeit muss nicht automatisch Problemrahmen bleiben.",
    primary_mechanism: "Growth Appraisal Default",
    today_trigger: "Sobald etwas nicht glatt läuft, unangenehm ist, länger dauert, fordert, Reibung hat oder Unsicherheit erzeugt, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von Schwierigkeit = Problem zu Schwierigkeit = Entwicklungsraum.",
    science_bite: "Viele Systeme lesen Reibung noch automatisch als Problem: etwas läuft nicht glatt, es zieht, es nervt, es bremst, es sollte nicht sein. Genau dort bleibt Wachstum oft zu künstlich und Problemfokus zu automatisch. Tag 53 macht Growth natürlicher: Nicht Schwierigkeit wegmachen. Nicht Problem romantisieren. Sondern Schwierigkeit real als Ort lesen, an dem Entwicklung stattfindet.",
    tasks: [
      {
        id: "d53-t1",
        title: "Erkenne den Problemzug",
        trigger: "Wenn Schwierigkeit sofort als Problemrahmen gelesen wird",
        when_to_use: "Bei Reibung, zähem Lernen, unangenehmer Aufgabe, technischer Schwierigkeit, Unsicherheit, längerer Entwicklung oder allem, was nicht glatt läuft",
        action: "Markiere innerlich einmal klar: 'Problemzug.'",
        why: "Bevor Wachstum Default werden kann, musst du merken, wann dein System Schwierigkeit noch automatisch als Problem liest.",
        explanation: "Achte auf Genervtheit, enge Interpretation, sofortige Defizitlese, 'warum ist das so?', 'das bremst', 'das sollte nicht sein'. Genau das ist der Problemzug.",
        self_talk: "Problemzug.",
        micro_reframe: "Schwierigkeit ist da — aber Problemzentrierung ist schon die erste alte Lesart.",
        reframe_step: {
          trigger: "Etwas läuft nicht glatt oder fordert mich.",
          reframe: "Bevor ich Schwierigkeit automatisch zum Problem mache, markiere ich den Problemzug.",
          anchor: "Problemzug."
        },
        system_function: "Deficit Framing Awareness",
        icon: "Eye"
      },
      {
        id: "d53-t2",
        title: "Hol die Entwicklungslese rein",
        trigger: "Nachdem du den Problemzug erkannt hast",
        when_to_use: "Direkt in derselben Schwierigkeit",
        action: "Frag dich: 'Was trainiert diese Schwierigkeit gerade in mir?' oder 'Welcher Entwicklungsraum liegt genau hier?'",
        why: "Hier liegt die Umcodierung des Tages.",
        explanation: "Nicht romantisieren. Nicht alles gut finden. Nicht Schwierigkeit wegreden. Nur die Entwicklungsdimension real mit hineinholen. Genau dadurch wird die nächste Handlung weniger defensiv.",
        self_talk: "Das trainiert etwas.",
        micro_reframe: "Bedeutung verschiebt Verhalten — wenn Schwierigkeit Entwicklungsraum wird, wird Handlung offener.",
        reframe_step: {
          trigger: "Ich habe den Problemzug erkannt.",
          reframe: "Jetzt lese ich Schwierigkeit nicht nur als Störung, sondern nehme ihre Entwicklungsdimension real mit hinein.",
          anchor: "Das trainiert etwas."
        },
        system_function: "Growth Appraisal Activation",
        icon: "Compass"
      },
      {
        id: "d53-t3",
        title: "Handle wie jemand, der daraus wächst",
        trigger: "Wenn die Entwicklungslese wieder mit im System ist",
        when_to_use: "In der direkt nächsten Handlung",
        action: "Frag dich: 'Wie sieht meine nächste Handlung aus, wenn ich das hier als Wachstumsraum lese?' und setze genau diese.",
        why: "Tag 53 wirkt nur, wenn die neue Lesart wieder in Verhalten geht.",
        explanation: "Das heißt heute: offener, lernbereiter, weniger defensiv, weniger problemfixiert, weniger bildschützend. Nicht heroisch. Nicht künstlich mutig. Nur entwicklungsorientiert.",
        self_talk: "Daran wachsen.",
        micro_reframe: "Wenn Wachstum die Lesart wird, muss die nächste Handlung nicht mehr aus Problemdenken kommen.",
        reframe_step: {
          trigger: "Ich habe Entwicklungsraum wieder mit im Bild.",
          reframe: "Jetzt handle ich nicht problemzentriert, sondern entwicklungsorientiert weiter.",
          anchor: "Daran wachsen."
        },
        system_function: "Growth-Default Action",
        icon: "ArrowRightCircle"
      }
    ],
    journal: {
      title: "Wo war Schwierigkeit heute noch Problem — und wo schon Wachstumsraum?",
      questions: [
        { id: "d53-j1", question: "In welcher Schwierigkeit war mein Problemzug heute am stärksten?", placeholder: "Beschreibe die Situation konkret." },
        { id: "d53-j2", question: "Woran habe ich gemerkt, dass mein System sie zuerst als Problemrahmen gelesen hat?", placeholder: "Was war innerlich spürbar?" },
        { id: "d53-j3", question: "Welche Entwicklungsdimension konnte ich real mit hineinholen?", placeholder: "Was trainiert oder zeigt diese Schwierigkeit?" },
        { id: "d53-j4", question: "Wie hat sich meine nächste Handlung verändert, als ich Schwierigkeit als Wachstumsraum gelesen habe?", placeholder: "Beschreibe die Handlung." }
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist. Mindestens 1 Sache, die heute unangenehm war, 1 Sache, die dadurch sichtbar oder trainiert wurde, und 1 Sache, die dir gezeigt hat, dass Schwierigkeit nicht automatisch Problem bleiben muss.",
      free_reflection_prompt: "Was zeigt mir dieser Tag darüber, wie natürlich Wachstum für mein System unter Schwierigkeit schon wird?"
    },
    gratitude_prompt: "Welche Schwierigkeit heute hat mir gezeigt, dass Entwicklung real mit im Bild sein kann?",
    self_talk_anchors: [
      { text: "Problemzug.", when: "Wenn Schwierigkeit automatisch zum Problem wird" },
      { text: "Das trainiert etwas.", when: "Wenn du die Entwicklungslese reinholst" },
      { text: "Daran wachsen.", when: "In der nächsten entwicklungsorientierten Handlung" }
    ],
    variants: {
      training: "Ideal bei Reibung, technischem Lernen, zähen Phasen, unangenehmer Schwierigkeit und längerer Entwicklung.",
      rest: "Sehr stark bei Arbeit, Gespräch, unangenehmer Aufgabe, Alltag mit Reibung oder allem, was länger dauert als gewünscht.",
      match: "Wenn Schwierigkeit kommt: nicht sofort als Problem lesen, sondern als realen Entwicklungsraum mitführen."
    }
  },
  {
    day_id: 54,
    title: "Sicherheit ohne frischen Beweis",
    phase: "Phase IV — Verkörperung und Identität",
    week: 8,
    line: "Confidence vs Self-Doubt",
    lens: "Sicherheit bleibt verfügbar, auch wenn gerade kein neues äußeres Signal sie bestätigt.",
    primary_mechanism: "Confidence from Internalized Substance",
    today_trigger: "Sobald dein System nach frischer Bestätigung, gutem Gefühl oder neuem Signal sucht, bevor es sauber weiterhandelt, ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von Beweisabhängigkeit zu verinnerlichter Substanz.",
    science_bite: "Confidence wird unreif, wenn sie ständig neu gefüttert werden muss: durch eine gute Szene, ein gutes Gefühl, Rückmeldung, Erfolg, sichtbare Kontrolle oder frischen Beweis. Heute trainierst du die reifere Form: Sicherheit bleibt verfügbar, auch wenn gerade nichts Neues sie bestätigt. Nicht blind. Nicht überheblich. Sondern ruhig aus etwas, das schon in dir aufgebaut wurde.",
    tasks: [
      {
        id: "d54-t1",
        title: "Erkenne den Bestätigungszug",
        trigger: "Wenn dein System Sicherheit aus einem neuen äußeren Signal ziehen will",
        when_to_use: "In neutralen Phasen, bei fehlendem Feedback, nach keiner klaren Bestätigung, bei offener Szene oder wenn du innerlich auf 'ein gutes Zeichen' wartest",
        action: "Frag dich kurz: 'Warte ich gerade auf frische Bestätigung?'",
        why: "Bevor Confidence verinnerlichter werden kann, musst du die Abhängigkeit von neuem Signal sichtbar machen.",
        explanation: "Der Bestätigungszug ist oft leise: noch kurz abwarten, noch ein gutes Gefühl brauchen, noch eine gelungene Szene, noch ein kleines äußeres Okay. Genau das markierst du heute.",
        self_talk: "Bestätigungszug?",
        micro_reframe: "Das Problem ist nicht fehlende Bestätigung — das Problem ist, wenn mein System sie ständig neu verlangt.",
        reframe_step: {
          trigger: "Ich merke, dass ich auf äußeres oder inneres Signal warte.",
          reframe: "Bevor ich weiter in Signal-Suche bleibe, mache ich die Abhängigkeit sichtbar.",
          anchor: "Bestätigungszug?"
        },
        system_function: "Proof Dependence Awareness",
        icon: "Eye"
      },
      {
        id: "d54-t2",
        title: "Hol die innere Basis zurück",
        trigger: "Nachdem du den Bestätigungszug erkannt hast",
        when_to_use: "Direkt danach, bevor du weiter auf Signal wartest",
        action: "Erinnere bewusst, was in dir schon gilt, auch ohne neues äußeres Zeichen.",
        why: "Hier wird Confidence innerlicher statt signalabhängiger.",
        explanation: "Es geht nicht um Mantra oder künstlichen Selbstglauben. Es geht darum, wieder auf das zurückzugehen, was schon da ist: Standard, Aufbau, Training, getragene Linien, verinnerlichte Substanz.",
        self_talk: "Innere Basis.",
        micro_reframe: "Sicherheit wird reifer, wenn sie nicht jedes Mal neu bewiesen werden muss.",
        reframe_step: {
          trigger: "Ich habe den Bestätigungszug erkannt.",
          reframe: "Jetzt hole ich nicht neues Signal, sondern meine vorhandene Basis zurück.",
          anchor: "Innere Basis."
        },
        system_function: "Internal Confidence Recall",
        icon: "Compass"
      },
      {
        id: "d54-t3",
        title: "Handle aus Substanz",
        trigger: "Wenn deine innere Basis wieder klarer ist",
        when_to_use: "In der direkt nächsten Handlung",
        action: "Frag dich: 'Wie sieht meine nächste Handlung aus, wenn ich keinen frischen Beweis brauche?' und setze genau diese.",
        why: "Tag 54 wird erst real, wenn verinnerlichte Confidence verhaltenswirksam wird.",
        explanation: "Nicht blind. Nicht überheblich. Nicht gelöst von Realität. Sondern ruhig, standardtreu und aus vorhandener Substanz.",
        self_talk: "Aus Substanz.",
        micro_reframe: "Ich brauche keinen frischen Beweis, um die nächste saubere Handlung zu setzen.",
        reframe_step: {
          trigger: "Meine innere Basis ist wieder vorne.",
          reframe: "Jetzt handle ich nicht aus Signal-Suche, sondern aus vorhandener Substanz.",
          anchor: "Aus Substanz."
        },
        system_function: "Internalized Confidence Action",
        icon: "ArrowRightCircle"
      }
    ],
    journal: {
      title: "Wo wollte mein System heute frische Bestätigung — und wo brauchte ich sie nicht mehr?",
      questions: [
        { id: "d54-j1", question: "In welchem Moment war mein Bestätigungszug heute am stärksten?", placeholder: "Beschreibe die Situation konkret." },
        { id: "d54-j2", question: "Woran habe ich gemerkt, dass mein System Sicherheit aus einem neuen äußeren Signal ziehen wollte?", placeholder: "Was war innerlich spürbar?" },
        { id: "d54-j3", question: "Welche innere Basis habe ich bewusst zurückgeholt?", placeholder: "Was galt in dir schon, auch ohne neues Signal?" },
        { id: "d54-j4", question: "Wie hat sich meine nächste Handlung verändert, als ich keinen frischen Beweis mehr verlangt habe?", placeholder: "Beschreibe die Handlung." }
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist. Mindestens 1 Sache, bei der heute keine klare Bestätigung kam, 1 Sache, die in dir trotzdem schon gegolten hat, und 1 Sache, die dir gezeigt hat, dass Sicherheit ruhiger wird, wenn sie nicht dauernd neu bewiesen werden muss.",
      free_reflection_prompt: "Was zeigt mir das darüber, wie sehr meine Confidence schon aus verinnerlichter Substanz statt aus frischer Rückversicherung lebt?"
    },
    gratitude_prompt: "Welche Szene heute hat mir gezeigt, dass Sicherheit auch ohne neues Signal verfügbar bleiben kann?",
    self_talk_anchors: [
      { text: "Bestätigungszug?", when: "Wenn du auf neues Signal wartest" },
      { text: "Innere Basis.", when: "Wenn du Confidence zurück nach innen holst" },
      { text: "Aus Substanz.", when: "In der nächsten sauberen Handlung" }
    ],
    variants: {
      training: "Ideal bei neutralen Phasen, fehlendem Feedback, keiner klaren Bestätigung oder offener Szene.",
      rest: "Sehr stark bei Arbeit ohne Rückmeldung, Gespräch ohne Echo, Aufgabe ohne sofortiges Resultat und neutralem Tag ohne externe Bestätigung.",
      match: "Maximal relevant: nicht nach der letzten Szene leben, nicht auf frischen Beweis warten, aus verinnerlichter Substanz weiterhandeln."
    }
  },
  {
    day_id: 55,
    title: "Höchste Qualität ohne Selbstprojekt",
    phase: "Phase IV — Verkörperung und Identität",
    week: 8,
    line: "Ego vs Inner Excellence",
    lens: "Ich kann höchste Qualität anstreben, ohne dass Anspruch und Leistung wieder zu einem Projekt über mich werden.",
    primary_mechanism: "Excellence Without Ego Add-On",
    today_trigger: "Sobald reale Momente auftauchen, in denen Qualität zählt — wichtige Wiederholung, technische Ausführung, sichtbare Szene, Verantwortungsmoment, führende Rolle oder etwas, das du wirklich gut machen willst — ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von hoher Qualität mit Ego-Zusatz zu hoher Qualität als reine, dienliche Exzellenz.",
    science_bite: "Das Problem ist nicht hoher Anspruch. Das Problem ist: Ego klebt sich an Qualität und macht sie wieder zu einem Selbstprojekt. Dann wird Leistung enger, selbstbezogener, härter, weniger frei, weniger dienlich und weniger wirklich exzellent. Tag 55 greift genau das an. Nicht weniger Qualität. Reinere Qualität.",
    tasks: [
      {
        id: "d55-t1",
        title: "Erkenne den Beweiszug in hoher Qualität",
        trigger: "Wenn du etwas wirklich gut machen willst und merkst, dass Anspruch sich mit Selbstbeweis mischt",
        when_to_use: "Bei wichtiger Wiederholung, technischer Ausführung, sichtbarer Szene, Verantwortung, Führung, relevanter Aufgabe oder anspruchsvoller Alltagsleistung",
        action: "Frag dich kurz: 'Will ich hier gerade nur Qualität — oder auch ein Projekt über mich daraus machen?'",
        why: "Bevor Exzellenz von Ego gereinigt werden kann, musst du merken, wann hoher Anspruch wieder auf Selbstbild kippt.",
        explanation: "Nicht jeder hohe Anspruch ist rein. Manchmal hängt still mit drin: ich will zeigen, ich will beweisen, ich will mich darin sehen, ich will, dass das etwas über mich sagt. Genau diesen Zusatz machst du heute sichtbar.",
        self_talk: "Qualität oder Selbstprojekt?",
        micro_reframe: "Hoher Anspruch ist nicht das Problem — die Rückbiegung auf mein Selbst ist das Problem.",
        reframe_step: {
          trigger: "Ich will etwas wirklich gut machen.",
          reframe: "Bevor ich mich darin verliere, prüfe ich, ob sich Qualität gerade mit Selbstprojekt vermischt.",
          anchor: "Qualität oder Selbstprojekt?"
        },
        system_function: "Ego Add-On Awareness",
        icon: "Eye"
      },
      {
        id: "d55-t2",
        title: "Reinige den Anspruch",
        trigger: "Nachdem du den Ego-Zusatz erkannt hast",
        when_to_use: "Direkt vor der relevanten Qualitäts-Handlung",
        action: "Frag dich: 'Wie sieht höchste Qualität hier aus, wenn sie wirklich der Aufgabe dient?'",
        why: "Tag 55 ist die reifste Form der Ego-Linie: nicht weniger Qualität, sondern gereinigte Qualität.",
        explanation: "Du nimmst den Anspruch nicht raus. Du reinigst nur den Zusatz. Qualität bleibt hoch. Aber sie wird sauberer, freier, weniger selbstbesessen und mehr an Aufgabe, Präzision und Dienst gebunden.",
        self_talk: "Reine Qualität.",
        micro_reframe: "Die höchste Form des Systems ist nicht weniger Qualität, sondern reinere Qualität.",
        reframe_step: {
          trigger: "Ich habe gemerkt, dass hoher Anspruch wieder auf mich kippt.",
          reframe: "Jetzt richte ich höchste Qualität zurück auf Aufgabe und saubere Exzellenz.",
          anchor: "Reine Qualität."
        },
        system_function: "Excellence Purification",
        icon: "Compass"
      },
      {
        id: "d55-t3",
        title: "Setze volle Qualität ohne Showzug",
        trigger: "Wenn der gereinigte Anspruch wieder klarer ist",
        when_to_use: "In der direkt nächsten relevanten Handlung",
        action: "Setze höchste verfügbare Qualität — ohne Showzug, ohne Beweisdrang, ohne fürs Bild zu spielen.",
        why: "Tag 55 wirkt erst dann vollständig, wenn Anspruch hoch bleibt und Ego-Zusatz im Verhalten kleiner wird.",
        explanation: "Das ist die reifste Form dieser Linie: volle Qualität, volle Präzision, voller Ernst — aber nicht fürs Bild, nicht für Show, nicht für Selbstaufwertung. Exzellenz direkt an Aufgabe gebunden.",
        self_talk: "Volle Qualität, kein Zusatz.",
        micro_reframe: "Ich kann höchste Qualität setzen, ohne daraus ein Beweisprojekt über mich zu machen.",
        reframe_step: {
          trigger: "Meine Qualitäts-Handlung ist klar.",
          reframe: "Jetzt setze ich sie voll — aber ohne Extra-Show, ohne Ego-Zusatz, ohne Selbstprojekt.",
          anchor: "Volle Qualität, kein Zusatz."
        },
        system_function: "Pure Excellence Action",
        icon: "ArrowRightCircle"
      }
    ],
    journal: {
      title: "Wo wollte Qualität heute wieder zum Selbstprojekt werden — und wo nicht?",
      questions: [
        { id: "d55-j1", question: "In welcher Qualitäts-Szene war mein Anspruch heute am höchsten?", placeholder: "Beschreibe die Situation konkret." },
        { id: "d55-j2", question: "Woran habe ich gemerkt, dass sich Anspruch oder Leistung wieder an mein Selbstbild kleben wollten?", placeholder: "Was war innerlich spürbar?" },
        { id: "d55-j3", question: "Wie habe ich hohe Qualität wieder auf Aufgabe statt auf Selbstprojekt ausgerichtet?", placeholder: "Was war dein innerer Shift?" },
        { id: "d55-j4", question: "Wo ist es mir gelungen, volle Qualität ohne Showzug, Beweisdrang oder Bildspiel zu setzen?", placeholder: "Beschreibe die Handlung." }
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist. Mindestens 1 Sache, in der heute Qualität wirklich gezählt hat, 1 Sache, in der der Beweiszug kleiner wurde, und 1 Sache, die dir gezeigt hat, dass Exzellenz reiner werden kann, ohne niedriger zu werden.",
      free_reflection_prompt: "Was zeigt mir dieser Tag darüber, wie viel Ego-Zusatz noch an meiner Qualität klebt — und wie rein Exzellenz schon werden kann?"
    },
    gratitude_prompt: "Welche Qualitäts-Szene heute hat mir gezeigt, dass höchste Qualität nicht automatisch Selbstprojekt werden muss?",
    self_talk_anchors: [
      { text: "Qualität oder Selbstprojekt?", when: "Wenn hoher Anspruch auftaucht" },
      { text: "Reine Qualität.", when: "Wenn du den Anspruch reinigst" },
      { text: "Volle Qualität, kein Zusatz.", when: "In der sichtbaren Exzellenz-Handlung" }
    ],
    variants: {
      training: "Ideal bei wichtiger Wiederholung, technischer Ausführung, sichtbarer Szene, Verantwortungsmoment oder führender Rolle.",
      rest: "Sehr stark bei Arbeit mit Sorgfalt, präziser Entscheidung, Gespräch mit echter Präsenz oder etwas ordentlich und ernsthaft tun, ohne es fürs Bild zu tun.",
      match: "Hier maximal relevant: Qualität hoch halten, kein Showzug, kein Beweisdrang, nicht fürs Bild spielen, Exzellenz direkt an Aufgabe binden."
    }
  },
  {
    day_id: 56,
    title: "Ich bin nicht hier, um zu beweisen — ich bin hier, um zu werden",
    phase: "Phase IV — Verkörperung und Identität",
    week: 8,
    line: "Integrated System Identity",
    lens: "Heute geht es nicht mehr darum, welche einzelne Linie ich trainiere, sondern aus welchem Gesamtsystem ich handle.",
    primary_mechanism: "Integrated Identity-Based Action",
    today_trigger: "Sobald heute Druck, Fehler, Bewertung, gute Phase, schlechte Phase, Unsicherheit, Chaos, Verantwortung, Frust oder sichtbare Leistung auftauchen — oder du bewusst einen kleinen Integrationsblock setzt — ist der Tag aktiv.",
    core_shift: "Heute verschiebst du dich von triggerabhängigen Teilversionen zu einer integrierten Gesamtform.",
    science_bite: "Reife zeigt sich nicht daran, dass ein System viele gute Werkzeuge kennt, sondern daran, dass es unter unterschiedlichen Triggern aus demselben inneren Kern handeln kann. Ein unreiferes System bringt je nach Trigger oft eine andere Version hervor: unter Druck enger, nach Fehlern härter, unter Bewertung kleiner, bei Erfolg egohafter, unter Unsicherheit zweifelnder, ohne Bestätigung unsicherer. Ein reiferes System wird kohärenter. Das heißt nicht perfekt, emotionslos oder immer gleich. Es heißt: Unterschiedliche Situationen zerteilen dich weniger in unterschiedliche Versionen. Heute trainierst du deshalb keine neue Fähigkeit. Du trainierst, dass dein System als Ganzes zusammenhält.",
    tasks: [
      {
        id: "d56-t1",
        title: "Erkenne den alten Modus",
        trigger: "Wenn ein realer Trigger auftaucht oder du bewusst einen kleinen relevanten Integrationsblock setzt",
        when_to_use: "Bei Druck, Fehlernähe, Verantwortung, Reibung, sichtbarer Szene, Gespräch, Arbeit, Entscheidung oder Alltag mit Zug nach außen",
        action: "Frag dich kurz: 'In welchen alten Teilmodus will mich diese Situation gerade ziehen?'",
        why: "Tag 56 beginnt nicht mit Technik, sondern mit Gesamtbewusstsein: Was wäre hier mein altes Fragment?",
        explanation: "Nicht mehr nur: Bin ich präsent? Bin ich sicher? Bin ich prozessorientiert? Sondern: Welche alte Teilversion will hier auftauchen — Schutz, Beweis, Rettung, Ego, Zweifel, Enge, Reizbarkeit, Bildfokus, Rückzug? Du machst sichtbar, was dich früher je nach Trigger aufgespalten hat.",
        self_talk: "Welcher alte Modus zieht gerade?",
        micro_reframe: "Heute ist nicht die Frage, welcher Trigger da ist — sondern ob er mich wieder in einen alten Teilmodus zerlegt.",
        reframe_step: {
          trigger: "Eine relevante oder reibende Situation ist da.",
          reframe: "Bevor ich reagiere, lese ich erst, in welche alte Teilversion mich dieser Trigger ziehen will.",
          anchor: "Welcher alte Modus zieht gerade?"
        },
        system_function: "Integrated Trigger Awareness",
        icon: "Eye"
      },
      {
        id: "d56-t2",
        title: "Hol den Kern zurück",
        trigger: "Nachdem du den alten Teilmodus erkannt hast",
        when_to_use: "Direkt danach, bevor du triggerweise statt integrationsweise handelst",
        action: "Frag dich: 'Was ist hier mein integrierter Kern?' und richte dich daran aus.",
        why: "Tag 56 lebt davon, dass du nicht einzelne Tools sammelst, sondern einen gemeinsamen inneren Kern zurückholst.",
        explanation: "Dein integrierter Kern ist nicht ein Satz und nicht ein Mood. Er ist die verdichtete Form aus allem, was die 56 Tage aufgebaut haben: Prozess statt Außen, Beitrag statt Schutz, Wachstum statt Vermeidung, Qualität ohne Ego, Stabilität ohne frischen Beweis, Präsenz ohne Drama. Heute geht es darum, daraus wieder zu handeln — als Einheit.",
        self_talk: "Kern zurück.",
        micro_reframe: "Ich muss heute nicht toolsammeln. Ich muss meinen Kern zurückholen.",
        reframe_step: {
          trigger: "Der alte Modus ist sichtbar geworden.",
          reframe: "Jetzt gehe ich nicht linienweise, sondern aus dem verdichteten Kern zurück in die Situation.",
          anchor: "Kern zurück."
        },
        system_function: "Integrated Core Recovery",
        icon: "Compass"
      },
      {
        id: "d56-t3",
        title: "Setze die ganze Handlung",
        trigger: "Wenn dein Kern wieder klarer vorne ist",
        when_to_use: "In der direkt nächsten relevanten Szene",
        action: "Setze eine ganze Handlung: nicht schützen, nicht beweisen, nicht retten, nicht egoisieren — sondern als Gesamtform handeln.",
        why: "Der Abschluss wird erst real, wenn nicht nur der Kern gedacht, sondern in einer ganzen Handlung sichtbar wird.",
        explanation: "Heute geht es nicht um kleine Tool-Anwendung, sondern um Form. Wieder anbieten. Klar kommunizieren. Die Aktion fordern. In der Szene bleiben statt auszuweichen. Aktiv präsent bleiben statt innerlich rauszugehen. Qualität hoch halten, ohne Showzug. Verantwortung tragen, ohne Selbstinszenierung. Genau dort wird sichtbar, dass das System nicht mehr aus Einzelteilen besteht.",
        self_talk: "Ganz handeln.",
        micro_reframe: "Heute beweise ich nichts. Ich werde sichtbar in der Form, die ich aufgebaut habe.",
        reframe_step: {
          trigger: "Mein Kern ist wieder da.",
          reframe: "Jetzt setze ich nicht eine Technik, sondern eine ganze, integrierte Handlung.",
          anchor: "Ganz handeln."
        },
        system_function: "Integrated Action Expression",
        icon: "ArrowRightCircle"
      }
    ],
    journal: {
      title: "Aus welchem Gesamtsystem habe ich heute gelebt?",
      questions: [
        { id: "d56-j1", question: "Welche reale Situation oder welcher bewusst gesetzte Integrationsblock hat heute mein System am ehrlichsten geprüft?", placeholder: "Beschreibe die Szene oder Sequenz konkret." },
        { id: "d56-j2", question: "Welcher alte Teilmodus wollte dort zuerst auftauchen?", placeholder: "Schutz, Beweis, Rettung, Ego, Zweifel, Enge, Rückzug ..." },
        { id: "d56-j3", question: "Wie habe ich meinen integrierten Kern zurückgeholt?", placeholder: "Was hat mir geholfen, wieder aus dem Gesamtsystem zu handeln?" },
        { id: "d56-j4", question: "Welche ganze Handlung hat heute gezeigt, dass mein System nicht mehr nur aus einzelnen Tools besteht?", placeholder: "Beschreibe die konkrete Handlung." },
        { id: "d56-j5", question: "Was zeigt mir dieser Tag darüber, wer ich werde, wenn das System als Einheit trägt?", placeholder: "Formuliere es klar und ohne Pathos." }
      ],
      gratitude_instruction: "Schreibe 5 Dinge auf, für die du heute dankbar bist. Mindestens: 1 Sache, die heute wirklich etwas in dir gefordert hat, 1 Sache, bei der ein alter Modus fast übernommen hätte, und 1 Sache, die dir heute gezeigt hat, dass dein System nicht mehr nur aus einzelnen Tools besteht, sondern langsam eine Form bekommt.",
      free_reflection_prompt: "Was ist heute nicht nur trainiert worden — sondern als Form in mir sichtbar geworden?"
    },
    gratitude_prompt: "Welche Situation heute hat mir gezeigt, dass ich nicht mehr nur mit einzelnen Tools reagiere, sondern aus einer Form handle?",
    self_talk_anchors: [
      { text: "Welcher alte Modus zieht gerade?", when: "Wenn ein relevanter Trigger auftaucht" },
      { text: "Kern zurück.", when: "Wenn du integrationsweise statt triggerweise handeln willst" },
      { text: "Ganz handeln.", when: "In der nächsten sichtbaren Gesamt-Handlung" }
    ],
    variants: {
      training: "Ideal: ein relevanter Block, eine sichtbare Szene, ein Mix aus Druck, Fehlernähe, Verantwortung oder Reibung — genau dort nicht toolsammeln, sondern ganz handeln.",
      rest: "Sehr stark in Gespräch, Arbeit, Entscheidung, Reibung, Unsicherheit und Alltag mit Zug nach außen. Hier wird klar: Das System ist nicht nur für Sport gebaut. Es ist eine Form des Handelns.",
      match: "Hier maximal stark: alten Modus erkennen, Kern zurückholen, ganze Handlung setzen. Nicht schützen. Nicht beweisen. Nicht retten. Nicht egoisieren. Sondern werden."
    }
  }


];
