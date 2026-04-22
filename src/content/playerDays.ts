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
        explanation: "Viele Spieler werden nach einem Fehler stiller, kleiner, vorsichtiger und weniger präsent. Heute trainierst du, dass der erste innere Satz nicht automatisch dein ganzes Verhalten bestimmen muss.",
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
        explanation: "Viele Spieler bleiben an Dingen hängen, die längst passiert sind oder gerade nicht in ihrer Hand liegen. Heute geht es nicht darum, das sofort wegzumachen. Es geht zuerst darum, sauber zu unterscheiden, was wirklich dein Feld ist — und was nicht.",
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
];
