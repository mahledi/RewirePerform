import {
  GOLDEN_DAY_DRAFTS,
  type GoldenDayContext,
  type GoldenDayDraft,
  type GoldenDayQuestion,
  type GoldenDayStage,
} from "./goldenDayDrafts";

type ToolId = GoldenDayDraft["toolId"];

type QuestionInput = {
  prompt: string;
  placeholder: string;
};

type ProgramDayInput = {
  day: number;
  toolId: ToolId;
  stage: GoldenDayStage;
  title: string;
  purpose: string;
  science: [title: string, first: string, second: string];
  mission: {
    title: string;
    trigger: string;
    steps: [string, string, string?];
    why: string;
  };
  check: {
    prompt: string;
    correct: string;
    wrong: [string, string];
    feedback: string;
  };
  recall: {
    prompt: string;
    application: string;
    label?: "Pre-Training" | "Pre-Wettkampf";
  };
  journal: {
    title: string;
    intro: string;
    questions: [QuestionInput, QuestionInput, QuestionInput?];
  };
  optionalDepth?: GoldenDayDraft["optionalDepth"];
  integrationTools?: GoldenDayDraft["integrationTools"];
  measurementBoundary?: GoldenDayDraft["measurementBoundary"];
};

const TOOL_META: Record<ToolId, { tool: string; cue: string }> = {
  W1: { tool: "Zurück zur Aufgabe", cue: "Nächste Aktion." },
  W2: { tool: "Die Aufgabe zählt", cue: "Was braucht die Aufgabe?" },
  W3: { tool: "Fehler nutzen", cue: "Passiert. Lernen. Weiter." },
  W4: { tool: "Mit dem arbeiten, was ist", cue: "Was kann ich jetzt beeinflussen?" },
  W5: { tool: "Nicht automatisch folgen", cue: "Gedanken und Gefühle sind keine Befehle." },
  W6: { tool: "Unsicherheit prüfen", cue: "Prüfen. Dann ausprobieren." },
  W7: { tool: "Blick öffnen", cue: "Was ist außerdem da?" },
  SYSTEM: { tool: "Dein Werkzeugkasten", cue: "Erkennen. Wählen. Anwenden." },
};

const REST_PREVIEW_DAYS = new Set([2, 11, 15, 22, 32, 41, 49]);
const COMPETITION_PREVIEW_DAYS = new Set([10, 23, 34, 40, 51, 53]);

const previewContextForDay = (day: number): GoldenDayContext => {
  if (REST_PREVIEW_DAYS.has(day)) return "rest";
  if (COMPETITION_PREVIEW_DAYS.has(day)) return "competition";
  return "training";
};

const gratitudePrompt =
  "Welche mehreren Dinge waren heute gut, hilfreich oder tragend? Schreib mindestens einen konkreten Satz. Du musst nichts schönreden.";

const buildOptions = (input: ProgramDayInput) => {
  const correctIndex = input.day % 3;
  const labels = [...input.check.wrong];
  labels.splice(correctIndex, 0, input.check.correct);
  const ids = ["a", "b", "c"];
  return {
    options: labels.map((label, index) => ({ id: ids[index], label })),
    correctOptionId: ids[correctIndex],
  };
};

const buildQuestions = (day: number, questions: ProgramDayInput["journal"]["questions"]) =>
  questions.filter(Boolean).map((question, index) => ({
    id: `d${day}-j${index + 1}`,
    prompt: question.prompt,
    placeholder: question.placeholder,
  })) as [GoldenDayQuestion, GoldenDayQuestion, GoldenDayQuestion?];

const buildProgramDay = (input: ProgramDayInput): GoldenDayDraft => {
  const meta = TOOL_META[input.toolId];
  const check = buildOptions(input);
  return {
    day: input.day,
    toolId: input.toolId,
    tool: meta.tool,
    stage: input.stage,
    context: previewContextForDay(input.day),
    title: input.title,
    cue: meta.cue,
    purpose: input.purpose,
    scienceBite: {
      title: input.science[0],
      paragraphs: [input.science[1], input.science[2]],
    },
    mission: input.mission,
    comprehension: {
      prompt: input.check.prompt,
      options: check.options,
      correctOptionId: check.correctOptionId,
      feedback: input.check.feedback,
    },
    preTraining: {
      label: input.recall.label ?? (previewContextForDay(input.day) === "competition" ? "Pre-Wettkampf" : "Pre-Training"),
      recallPrompt: input.recall.prompt,
      reveal: meta.cue,
      application: input.recall.application,
    },
    journal: {
      title: input.journal.title,
      intro: input.journal.intro,
      questions: buildQuestions(input.day, input.journal.questions),
      gratitudePrompt,
      gratitudeMinWords: 8,
    },
    optionalDepth: input.optionalDepth,
    integrationTools: input.integrationTools,
    measurementBoundary: input.measurementBoundary,
  };
};

const ADDITIONAL_DAY_INPUTS: ProgramDayInput[] = [
  {
    day: 3,
    toolId: "W1",
    stage: "Rückkehr",
    title: "Hol deine Aufmerksamkeit zurück",
    purpose: "Du erinnerst den ersten Anker selbst und nutzt ihn früher als an Tag 1.",
    science: [
      "Wiedererkennen ist nicht dasselbe wie selbst erinnern.",
      "Wenn dir die Lösung sofort gezeigt wird, wirkt sie vertraut. Das heißt noch nicht, dass sie dir in einer echten Situation von allein einfällt.",
      "Heute holst du den Anker zuerst selbst aus dem Gedächtnis und verbindest ihn wieder mit einer konkreten nächsten Aktion.",
    ],
    mission: {
      title: "Erinnern, merken, zurückkommen",
      trigger: "Sobald du bemerkst, dass deine Aufmerksamkeit nicht mehr bei der aktuellen Aufgabe ist.",
      steps: [
        "Erinnere deinen Anker, bevor du ihn nachliest.",
        "Benenne deine nächste konkrete Aktion.",
        "Richte Blick und Handlung auf genau diese Aktion.",
      ],
      why: "Der Rückweg wird brauchbar, wenn du ihn ohne lange Erklärung selbst findest.",
    },
    check: {
      prompt: "Was macht diesen Tag zu einer echten Rückkehr?",
      correct: "Ich erinnere den bekannten Anker zuerst selbst und wende ihn erneut an.",
      wrong: ["Ich lerne einen neuen Fokus-Satz.", "Ich lese Tag 1 einfach noch einmal."],
      feedback: "Genau. Derselbe Anker wird aktiv abgerufen und in einer neuen Szene genutzt.",
    },
    recall: {
      prompt: "Welcher kurze Satz bringt dich wieder zur aktuellen Aufgabe?",
      application: "Sag den Cue nur dann, wenn du ihn brauchst, und verbinde ihn sofort mit einer Handlung.",
    },
    journal: {
      title: "Wie schnell kam ich heute zurück?",
      intro: "Geh eine Szene durch, in der deine Aufmerksamkeit kurz weg war.",
      questions: [
        { prompt: "Woran hast du heute gemerkt, dass dein Kopf weg war?", placeholder: "Ein Gedanke, dein Blick oder dein Verhalten." },
        { prompt: "Was war in diesem Moment deine nächste konkrete Aktion?", placeholder: "Beschreibe nur die nächste Handlung." },
        { prompt: "Kam der Anker von selbst oder erst nach längerem Nachdenken?", placeholder: "Beides ist eine ehrliche Lerninformation." },
      ],
    },
  },
  {
    day: 5,
    toolId: "W2",
    stage: "Rückkehr",
    title: "Wähle die Qualität der Aufgabe",
    purpose: "Du erinnerst die Aufgabenfrage und übersetzt sie in eine konkrete Qualität.",
    science: [
      "Eine Aufgabe wird klarer, wenn du ihre wichtigste Qualität benennst.",
      "Nur zu denken, dass die Aufgabe zählt, reicht oft nicht. Du brauchst eine Richtung: zum Beispiel Ruhe, Tempo, Geduld, Mut oder klare Kommunikation.",
      "Eine gewählte Qualität bündelt deine Aufmerksamkeit und macht die nächste Handlung einfacher.",
    ],
    mission: {
      title: "Eine Qualität, eine Handlung",
      trigger: "Wenn du merkst, dass du dich beobachtest oder nicht weißt, wie du die Aufgabe angehen sollst.",
      steps: [
        "Frag: Was braucht die Aufgabe?",
        "Wähle genau eine wichtige Qualität.",
        "Zeig diese Qualität in deiner nächsten passenden Handlung.",
      ],
      why: "Die Frage wird erst nützlich, wenn aus ihr eine sichtbare Handlung entsteht.",
    },
    check: {
      prompt: "Du willst unbedingt souverän wirken. Was hilft dir heute?",
      correct: "Eine Qualität wählen, die die Aufgabe wirklich braucht.",
      wrong: ["Mich noch genauer beobachten.", "So lange warten, bis ich mich souverän fühle."],
      feedback: "Richtig. Die Aufgabe gibt die Richtung, nicht dein gewünschter Eindruck.",
    },
    recall: {
      prompt: "Welche Frage hilft dir, von deinem Eindruck zurück zur Aufgabe zu wechseln?",
      application: "Wähle nach der Frage eine Qualität und mach sie in der nächsten Handlung sichtbar.",
    },
    journal: {
      title: "Welche Qualität brauchte die Aufgabe?",
      intro: "Nimm eine konkrete Szene und bleib bei einer Qualität.",
      questions: [
        { prompt: "In welcher Szene warst du mehr mit dir als mit der Aufgabe beschäftigt?", placeholder: "Beschreibe den Moment kurz." },
        { prompt: "Welche eine Qualität hätte die Aufgabe gebraucht?", placeholder: "Zum Beispiel Ruhe, Klarheit oder Tempo." },
        { prompt: "Wie hätte oder hat diese Qualität deine Handlung verändert?", placeholder: "Beschreibe eine sichtbare Handlung." },
      ],
    },
  },
  {
    day: 7,
    toolId: "W1",
    stage: "Vertiefung",
    title: "Erkenne, was deine Aufmerksamkeit bindet",
    purpose: "Du unterscheidest zwischen Wegdriften und der Qualität, die deine Aufgabe danach braucht.",
    science: [
      "Zurückkommen und gut handeln sind zwei verschiedene Schritte.",
      "Der erste Anker bringt deine Aufmerksamkeit zur Situation zurück. Erst danach kannst du klar erkennen, welche Qualität die Aufgabe braucht.",
      "Heute führt weiterhin die nächste Aktion. Die Aufgabenfrage hilft nur im Hintergrund, wenn die Handlung noch unklar ist.",
    ],
    mission: {
      title: "Erst zurück, dann Qualität klären",
      trigger: "Wenn Ergebnis, Außenwirkung oder ein innerer Kommentar deine Aufmerksamkeit festhält.",
      steps: [
        "Merk, wodurch deine Aufmerksamkeit gebunden ist.",
        "Komm zur nächsten Aktion zurück.",
        "Falls nötig: Klär eine Qualität für diese Aktion.",
      ],
      why: "Die Werkzeuge bleiben getrennt: Erst bestimmst du, wo deine Aufmerksamkeit ist; danach, wie du handeln willst.",
    },
    check: {
      prompt: "Du bist wieder bei der Situation, weißt aber noch nicht, wie du handeln willst. Was kommt danach?",
      correct: "Ich kläre, welche Qualität die Aufgabe braucht.",
      wrong: ["Ich suche einen neuen Hauptanker.", "Ich gehe wieder zum Ergebnis zurück."],
      feedback: "Genau. ‚Nächste Aktion‘ führt zurück. Die Aufgabenfrage klärt bei Bedarf die Qualität.",
    },
    recall: {
      prompt: "Welcher Anker führt heute, wenn deine Aufmerksamkeit am Ergebnis hängt?",
      application: "Komm zuerst zurück. Nutze die Aufgabenfrage nur, wenn die Qualität noch unklar ist.",
    },
    journal: {
      title: "Was hielt meine Aufmerksamkeit fest?",
      intro: "Geh eine Szene langsam vom Drift bis zur nächsten Handlung durch.",
      questions: [
        { prompt: "Wodurch wurde deine Aufmerksamkeit gebunden?", placeholder: "Ergebnis, Außenwirkung, Gedanke oder etwas anderes." },
        { prompt: "Was war deine nächste Aktion, als du zurückkamst?", placeholder: "Beschreibe die konkrete Handlung." },
        { prompt: "War zusätzlich eine bestimmte Qualität nötig?", placeholder: "Wenn ja: welche? Wenn nein: schreib das ehrlich." },
      ],
    },
  },
  {
    day: 9,
    toolId: "W3",
    stage: "Rückkehr",
    title: "Hol eine Information aus dem Fehler",
    purpose: "Du erinnerst die Fehlerkette und begrenzt die Korrektur auf eine brauchbare Information.",
    science: [
      "Mehr Analyse hilft nicht immer sofort mehr.",
      "Nach einem Fehler kann dein Kopf viele Ursachen gleichzeitig suchen. Mitten in der nächsten Aktion bindet das Aufmerksamkeit und macht die Korrektur schwerer.",
      "Eine brauchbare Information reicht zunächst. Eine größere Analyse kann später folgen.",
    ],
    mission: {
      title: "Eine Information reicht jetzt",
      trigger: "Direkt nach einem Fehler oder einem misslungenen Versuch.",
      steps: [
        "Erinnere deine kurze Fehlerkette.",
        "Wähle genau eine brauchbare Information.",
        "Nutze sie in der nächsten passenden Handlung.",
      ],
      why: "Du hältst die Korrektur klein genug, um wieder handeln zu können.",
    },
    check: {
      prompt: "Wann gehört eine größere Fehleranalyse hin?",
      correct: "Später, wenn sie meine nächste Aktion nicht mehr blockiert.",
      wrong: ["Immer sofort mitten in die nächste Aktion.", "Nie, weil Fehler keine Bedeutung haben."],
      feedback: "Richtig. In der Situation reicht eine Information; ausführlicher prüfen kannst du später.",
    },
    recall: {
      prompt: "Wie lautet deine kurze Linie direkt nach einem Fehler?",
      application: "Eine Information, eine Korrektur, dann wieder vollständig in die nächste Handlung.",
    },
    journal: {
      title: "Welche Information war wirklich brauchbar?",
      intro: "Wähle eine konkrete Fehlerszene, nicht deinen ganzen Tag.",
      questions: [
        { prompt: "Was ist in der Szene tatsächlich passiert?", placeholder: "Beschreibe den Fehler ohne Urteil." },
        { prompt: "Welche eine Information konntest du daraus nutzen?", placeholder: "Zum Beispiel früher schauen oder klarer entscheiden." },
        { prompt: "Was war danach deine nächste Handlung?", placeholder: "Was hast du umgesetzt oder willst du umsetzen?" },
      ],
    },
  },
  {
    day: 11,
    toolId: "W4",
    stage: "Rückkehr",
    title: "Lass den zusätzlichen Kampf los",
    purpose: "Du unterscheidest das reale Problem von dem inneren Kampf dagegen.",
    science: [
      "Ein Problem und dein Widerstand dagegen sind nicht dasselbe.",
      "Etwas kann unfair, enttäuschend oder unangenehm sein. Zusätzlich kann dein Kopf immer wieder fordern, dass es anders sein müsste.",
      "Dieser zweite Kampf verändert die Realität nicht. Er nimmt dir nur Aufmerksamkeit für das, was noch möglich ist.",
    ],
    mission: {
      title: "Problem sehen, Zusatzkampf stoppen",
      trigger: "Wenn du dich wiederholt über etwas ärgerst, das du gerade nicht ändern kannst.",
      steps: [
        "Benenne nüchtern das reale Problem.",
        "Merk, welchen zusätzlichen Kampf dein Kopf daraus macht.",
        "Richte dich auf deinen verbleibenden Einfluss aus.",
      ],
      why: "Du redest nichts schön. Du hörst nur auf, Kraft an denselben unveränderbaren Punkt zu verlieren.",
    },
    check: {
      prompt: "Was bedeutet Akzeptieren heute?",
      correct: "Die Realität sehen und mit meinem verbleibenden Einfluss weiterarbeiten.",
      wrong: ["Alles gut finden.", "Nichts mehr tun und aufgeben."],
      feedback: "Genau. Akzeptieren ist kein Gutheißen und keine Passivität.",
    },
    recall: {
      prompt: "Welche Frage bringt dich vom unveränderbaren Problem zu deinem Spielraum?",
      application: "Benenne eine Sache, die weiterhin bei dir liegt, und handle dort weiter.",
    },
    journal: {
      title: "Wo entstand zusätzlicher Kampf?",
      intro: "Nutze eine heutige Alltagsszene oder eine frühere Sportszene.",
      questions: [
        { prompt: "Was war das reale, unveränderbare Problem?", placeholder: "Beschreibe nur den Fakt." },
        { prompt: "Wie hat dein Kopf zusätzlich dagegen gekämpft?", placeholder: "Welche Forderung oder Schleife kam dazu?" },
        { prompt: "Was blieb trotzdem in deinem Einfluss?", placeholder: "Nenne eine mögliche Handlung." },
      ],
    },
  },
  {
    day: 12,
    toolId: "W2",
    stage: "Vertiefung",
    title: "Handle aus Qualität, nicht aus Beweisdruck",
    purpose: "Du trennst hohe Qualität von dem Versuch, anderen oder dir selbst etwas zu beweisen.",
    science: [
      "Hoher Anspruch und Beweisdruck können gleich aussehen.",
      "Beide können zu viel Einsatz führen. Beweisdruck bindet deine Aufmerksamkeit aber zusätzlich an die Frage, was die Handlung über dich zeigt.",
      "Aufgabenqualität ist klarer: Du handelst so, weil genau diese Qualität jetzt gebraucht wird.",
    ],
    mission: {
      title: "Den Grund hinter der Qualität prüfen",
      trigger: "Wenn du besonders stark, perfekt oder beeindruckend handeln willst.",
      steps: [
        "Frag: Will ich gerade Qualität oder einen Beweis?",
        "Klär, was die Aufgabe wirklich braucht.",
        "Handle aus dieser Qualität, nicht für dein Bild.",
      ],
      why: "Du senkst nicht deinen Anspruch. Du machst ihn unabhängiger von Außenwirkung.",
    },
    check: {
      prompt: "Was unterscheidet Qualität von Beweisdruck?",
      correct: "Qualität richtet sich nach der Aufgabe; Beweisdruck nach meinem Bild.",
      wrong: ["Qualität ist immer entspannt.", "Beweisdruck bedeutet automatisch wenig Einsatz."],
      feedback: "Richtig. Entscheidend ist nicht die Intensität, sondern worauf deine Aufmerksamkeit gerichtet ist.",
    },
    recall: {
      prompt: "Welche Frage ordnet deine Handlung, wenn du etwas beweisen willst?",
      application: "Behalte den Anspruch. Lass die Aufgabe bestimmen, wie er heute aussieht.",
    },
    journal: {
      title: "Qualität oder Beweis?",
      intro: "Prüfe eine Szene ohne dich dafür zu bewerten.",
      questions: [
        { prompt: "Wann wolltest du heute besonders etwas zeigen oder beweisen?", placeholder: "Beschreibe die konkrete Szene." },
        { prompt: "Was hätte die Aufgabe unabhängig davon gebraucht?", placeholder: "Nenne eine Qualität." },
        { prompt: "Wie unterscheidet sich die passende Handlung vom Beweisversuch?", placeholder: "Beschreibe den sichtbaren Unterschied." },
      ],
    },
    optionalDepth: {
      title: "Wenn du deinen privaten Grund prüfen willst",
      prompt: "Gibt es einen persönlichen Grund für deine Arbeit, der größer ist als dein Bild? Du musst ihn niemandem zeigen.",
    },
  },
  {
    day: 13,
    toolId: "W5",
    stage: "Rückkehr",
    title: "Erkenne den ersten inneren Impuls",
    purpose: "Du bemerkst früher, zu welcher Handlung ein Gedanke oder Gefühl dich drängt.",
    science: [
      "Gedanken beeinflussen Verhalten oft über einen schnellen Impuls.",
      "Ein Satz wie ‚Lass es‘, ‚Geh kein Risiko ein‘ oder ‚Jetzt musst du es beweisen‘ zieht deine Handlung in eine Richtung.",
      "Wenn du diesen Zug bemerkst, entsteht ein Moment, in dem du bewusst entscheiden kannst.",
    ],
    mission: {
      title: "Gedanke, Impuls, Entscheidung",
      trigger: "Wenn ein Gedanke oder Gefühl dich sofort zu Vermeidung, Rückzug oder Überreaktion drängt.",
      steps: [
        "Benenne kurz den Gedanken oder das Gefühl.",
        "Merk, zu welcher Handlung es dich drängt.",
        "Entscheide, was besser zur Aufgabe passt.",
      ],
      why: "Du musst den Gedanken nicht entfernen. Du trainierst, dass er nicht automatisch über dein Verhalten entscheidet.",
    },
    check: {
      prompt: "Was ist heute der entscheidende Moment?",
      correct: "Der Moment zwischen innerem Impuls und meiner Handlung.",
      wrong: ["Der Moment, in dem jeder unangenehme Gedanke verschwindet.", "Der Moment, in dem ich den Gedanken positiv ersetze."],
      feedback: "Genau. Der Gedanke darf da sein; die Handlung bleibt deine Entscheidung.",
    },
    recall: {
      prompt: "Welcher Cue erinnert dich daran, nicht automatisch zu folgen?",
      application: "Benenne kurz, was auftaucht, und entscheide dann nach der Aufgabe.",
    },
    journal: {
      title: "Wozu wollte mich der Impuls bringen?",
      intro: "Geh eine Szene vom ersten inneren Satz bis zur Handlung durch.",
      questions: [
        { prompt: "Welcher Gedanke oder welches Gefühl tauchte zuerst auf?", placeholder: "Schreib es so auf, wie es kam." },
        { prompt: "Zu welcher Handlung hat es dich gedrängt?", placeholder: "Rückzug, Vermeidung, Hektik oder etwas anderes." },
        { prompt: "Welche Handlung passte besser zur Aufgabe?", placeholder: "Was hast du gewählt oder willst du wählen?" },
      ],
    },
  },
  {
    day: 14,
    toolId: "W1",
    stage: "Vertiefung",
    title: "Lass das Ergebnis stehen und arbeite weiter",
    purpose: "Du interessierst dich weiter für das Ergebnis und richtest deine Aufmerksamkeit trotzdem auf die nächste Aktion.",
    science: [
      "Ein Ziel braucht Ergebnisinteresse, eine Handlung braucht Gegenwart.",
      "Du darfst gewinnen, Fortschritt sehen oder ein bestimmtes Resultat erreichen wollen. Während der nächsten Aktion kann dein Kopf aber nicht gleichzeitig vollständig beim Ergebnis und bei der Ausführung sein.",
      "Heute trennst du dein Ziel von dem, worauf du dich in der aktuellen Aktion konzentrierst.",
    ],
    mission: {
      title: "Ziel behalten, zur Arbeit zurückkehren",
      trigger: "Wenn du während einer Handlung schon beim Ausgang, Stand oder möglichen Ergebnis bist.",
      steps: [
        "Merk: Mein Kopf ist beim Ergebnis.",
        "Lass das Ziel stehen, ohne weiter darüber nachzudenken.",
        "Komm zur nächsten ausführbaren Aktion zurück.",
      ],
      why: "Du gibst dein Ziel nicht auf. Du legst deine Aufmerksamkeit dorthin, wo du es gerade beeinflussen kannst.",
    },
    check: {
      prompt: "Bedeutet Prozessfokus, dass dir das Ergebnis egal sein muss?",
      correct: "Nein. Das Ziel bleibt, aber meine Aufmerksamkeit liegt bei der nächsten Aktion.",
      wrong: ["Ja. Ziele sind grundsätzlich schlecht.", "Nein. Deshalb sollte ich ständig an das Ergebnis denken."],
      feedback: "Richtig. Das Ergebnis gibt Richtung; arbeiten kannst du an der aktuellen Handlung.",
    },
    recall: {
      prompt: "Welcher kurze Anker bringt dich vom Ergebnis zurück zur Ausführung?",
      application: "Nutze ihn, sobald dein Kopf weiter voraus ist als deine aktuelle Handlung.",
    },
    journal: {
      title: "Wann war mein Kopf schon beim Ergebnis?",
      intro: "Wähle eine Szene, in der Ziel und aktuelle Aufgabe miteinander konkurrierten.",
      questions: [
        { prompt: "Bei welchem Ergebnis war dein Kopf?", placeholder: "Stand, Sieg, Bewertung oder ein anderes Resultat." },
        { prompt: "Welche Information oder Handlung hast du dadurch weniger klar gesehen?", placeholder: "Was lag direkt vor dir?" },
        { prompt: "Wie sah die Rückkehr zur nächsten Aktion aus?", placeholder: "Was hast du konkret getan?" },
      ],
    },
  },
  {
    day: 16,
    toolId: "W6",
    stage: "Rückkehr",
    title: "Prüfe die Unsicherheit, bevor du wartest",
    purpose: "Du unterscheidest eine geeignete Herausforderung von einer Situation, die wirklich unsicher oder unpassend ist.",
    science: [
      "Sicherheit ist wichtig. Vollständige Gewissheit ist selten möglich.",
      "Dein Kopf kann auch bei einer sinnvollen, vorbereiteten Handlung weiter nach einem Gefühl von Sicherheit suchen. Dann wird Warten leicht zur Gewohnheit.",
      "Heute prüfst du kurz die reale Situation und entscheidest danach – statt auf ein perfektes Gefühl zu warten.",
    ],
    mission: {
      title: "Kurz prüfen, dann entscheiden",
      trigger: "Wenn eine passende Handlung unsicher wirkt und du am liebsten weiter warten würdest.",
      steps: [
        "Prüfe: Ist die Handlung sicher, erlaubt und passend vorbereitet?",
        "Wenn ja, wähle einen angemessenen Versuch.",
        "Führe ihn aus, ohne vorher vollständige Sicherheit zu verlangen.",
      ],
      why: "Du gehst kein blindes Risiko ein. Du verhinderst nur, dass Unsicherheit jede sinnvolle Handlung stoppt.",
    },
    check: {
      prompt: "Wann sollst du eine unsichere Handlung heute ausprobieren?",
      correct: "Wenn sie nach kurzer Prüfung sicher, erlaubt und passend ist.",
      wrong: ["Immer, sobald sie Angst macht.", "Nur wenn jede Unsicherheit verschwunden ist."],
      feedback: "Genau. Erst real prüfen, dann einen passenden Versuch wählen.",
    },
    recall: {
      prompt: "Welche zwei Teile hat dein Cue für Unsicherheit?",
      application: "Mach den Check kurz. Wenn die Handlung passt, entscheide und geh hinein.",
    },
    journal: {
      title: "War Warten heute wirklich nötig?",
      intro: "Prüfe eine Szene, ohne Mut oder Vorsicht zu bewerten.",
      questions: [
        { prompt: "Welche passende Handlung hat sich unsicher angefühlt?", placeholder: "Beschreibe den konkreten Versuch." },
        { prompt: "Was ergab dein realer Sicherheits- und Passendheitscheck?", placeholder: "Sicher, erlaubt, vorbereitet – oder nicht?" },
        { prompt: "Welche Entscheidung hast du danach getroffen?", placeholder: "Ausprobiert, angepasst oder bewusst gelassen." },
      ],
    },
  },
  {
    day: 17,
    toolId: "W3",
    stage: "Vertiefung",
    title: "Korrigiere klein und arbeite weiter",
    purpose: "Du erkennst, welche Korrektur sofort hilft und welche Analyse bis später warten kann.",
    science: [
      "Eine gute Korrektur muss im Moment nicht vollständig sein.",
      "Unter Zeitdruck ist die beste Information oft klein und ausführbar: früher schauen, Abstand ändern, klarer sprechen oder ruhiger entscheiden.",
      "Zu viele Erklärungen konkurrieren mit der nächsten Handlung. Tiefe Analyse bleibt wertvoll – nur zu einem besseren Zeitpunkt.",
    ],
    mission: {
      title: "Jetzt klein korrigieren",
      trigger: "Nach einem Fehler, bei dem du sofort viele Dinge verändern willst.",
      steps: [
        "Wähle die eine Korrektur mit dem größten direkten Nutzen.",
        "Setze sie in der nächsten passenden Handlung um.",
        "Merke dir offene Fragen für eine spätere Analyse.",
      ],
      why: "Du bleibst lernfähig, ohne die nächste Aktion mit Analyse zu überladen.",
    },
    check: {
      prompt: "Du erkennst drei mögliche Korrekturen. Was tust du mitten in der Einheit?",
      correct: "Ich wähle eine ausführbare Korrektur und prüfe den Rest später.",
      wrong: ["Ich ändere sofort alle drei Dinge.", "Ich ignoriere den Fehler vollständig."],
      feedback: "Richtig. Eine klare Korrektur hält Lernen und Handeln gleichzeitig möglich.",
    },
    recall: {
      prompt: "Was kommt nach ‚Passiert‘, bevor du weiterhandelst?",
      application: "Nimm eine Information mit. Alles Weitere darf bis zur Analyse warten.",
    },
    journal: {
      title: "Welche kleine Korrektur half?",
      intro: "Geh eine Fehlerszene und ihre Korrektur noch einmal durch.",
      questions: [
        { prompt: "Welche möglichen Korrekturen kamen dir in den Kopf?", placeholder: "Liste nur die wichtigsten kurz auf." },
        { prompt: "Welche eine Korrektur war sofort ausführbar?", placeholder: "Formuliere sie als Handlung." },
        { prompt: "Was gehört bewusst in eine spätere Analyse?", placeholder: "Welche offene Frage bleibt?" },
      ],
    },
  },
  {
    day: 18,
    toolId: "W1",
    stage: "Vertiefung",
    title: "Komm zurück, auch wenn du dich nicht ideal fühlst",
    purpose: "Du machst die nächste Aktion nicht von perfekter Motivation oder Stimmung abhängig.",
    science: [
      "Aufmerksamkeit braucht nicht immer die passende Stimmung.",
      "Müdigkeit, Frust oder fehlender Antrieb können real sein. Du musst sie weder wegreden noch automatisch danach handeln.",
      "Wenn eine Handlung weiterhin sicher und sinnvoll ist, kannst du deine Aufmerksamkeit trotzdem auf den nächsten kleinen Schritt richten.",
    ],
    mission: {
      title: "Zustand sehen, nächste Aktion finden",
      trigger: "Wenn du dich nicht bereit, motiviert oder vollständig präsent fühlst.",
      steps: [
        "Nimm deinen Zustand ehrlich wahr.",
        "Prüfe, was heute sicher und sinnvoll möglich ist.",
        "Richte dich auf die nächste passende Aktion aus.",
      ],
      why: "Du übergehst deinen Zustand nicht. Du lässt ihn nur nicht automatisch jede mögliche Handlung bestimmen.",
    },
    check: {
      prompt: "Was bedeutet der heutige Anker bei Müdigkeit?",
      correct: "Den Zustand ernst nehmen und eine sichere, passende nächste Aktion wählen.",
      wrong: ["Jede Müdigkeit ignorieren.", "Mich zwingen, immer dieselbe Leistung zu bringen."],
      feedback: "Genau. Ehrlich prüfen und dann mit dem arbeiten, was sinnvoll möglich ist.",
    },
    recall: {
      prompt: "Welcher kurze Satz bringt dich vom inneren Zustand zur nächsten passenden Handlung?",
      application: "Die nächste Aktion darf heute kleiner sein. Sie muss nur klar und passend sein.",
    },
    journal: {
      title: "Was war trotz meines Zustands möglich?",
      intro: "Bewerte deinen Zustand nicht. Prüfe nur, wie du damit gearbeitet hast.",
      questions: [
        { prompt: "Welcher Zustand war heute deutlich da?", placeholder: "Zum Beispiel Müdigkeit, Frust oder fehlender Antrieb." },
        { prompt: "Was war unter diesen Bedingungen sicher und sinnvoll möglich?", placeholder: "Nenne eine passende Handlung oder Anpassung." },
        { prompt: "Konntest du deine Aufmerksamkeit darauf richten?", placeholder: "Was hat funktioniert oder nicht funktioniert?" },
      ],
    },
  },
  {
    day: 19,
    toolId: "W4",
    stage: "Vertiefung",
    title: "Verstärke den Ärger nicht immer weiter",
    purpose: "Du erkennst, wann dein Kopf einen ersten Ärger durch dieselben Gedanken immer weiter verstärkt.",
    science: [
      "Der erste Ärger ist oft schnell da. Später kann dein Kopf ihn weiter verstärken.",
      "Dein Kopf spielt denselben Moment erneut ab, ergänzt neue Urteile und hält die körperliche Spannung aktiv.",
      "Du musst die erste Reaktion nicht verhindern. Du kannst aber erkennen, wann du etwas Unveränderbares weiterfütterst.",
    ],
    mission: {
      title: "Das erneute Verstärken merken",
      trigger: "Wenn du einen unveränderbaren Moment zum zweiten oder dritten Mal innerlich durchspielst.",
      steps: [
        "Merk: Ich verstärke denselben Moment gerade erneut.",
        "Frag, was jetzt noch in deinem Einfluss liegt.",
        "Gib dieser Handlung deine nächste Aufmerksamkeit.",
      ],
      why: "Du verbietest dir keinen Ärger. Du entscheidest nur, wie lange er deine Aufmerksamkeit bindet.",
    },
    check: {
      prompt: "Was ist mit dem erneuten Verstärken gemeint?",
      correct: "Ich halte einen unveränderbaren Moment durch weitere Gedanken und Urteile aktiv.",
      wrong: ["Ich ärgere mich ein einziges Mal.", "Ich spreche ein lösbares Problem sachlich an."],
      feedback: "Richtig. Nicht die erste Reaktion, sondern das wiederholte Weiterfüttern ist heute der Punkt.",
    },
    recall: {
      prompt: "Welche Frage holt deine Energie aus der nächsten Gedankenschleife zurück?",
      application: "Erkenne die Wiederholung und gehe zu einer Sache, die du jetzt beeinflussen kannst.",
    },
    journal: {
      title: "Wann habe ich weitergefüttert?",
      intro: "Unterscheide die erste Reaktion von dem, was später dazukam.",
      questions: [
        { prompt: "Was war der unveränderbare Ausgangsmoment?", placeholder: "Beschreibe den Fakt." },
        { prompt: "Welche Gedanken oder Urteile haben den Ärger später weiter verstärkt?", placeholder: "Was kam beim zweiten Durchspielen dazu?" },
        { prompt: "Wohin konntest du deine Aufmerksamkeit stattdessen lenken?", placeholder: "Nenne deinen realen Einfluss." },
      ],
    },
  },
  {
    day: 20,
    toolId: "W5",
    stage: "Vertiefung",
    title: "Mach die automatische Kette sichtbar",
    purpose: "Du trennst, was passiert, was in dir auftaucht, den ersten Impuls und deine Handlung.",
    science: [
      "Eine schnelle Reaktion besteht aus mehreren kleinen Schritten.",
      "Etwas passiert. Ein Gedanke oder Gefühl taucht auf. Daraus entsteht ein Impuls, und kurz danach handelst du.",
      "Wenn du diese Schritte erkennst, findest du den kurzen Moment, in dem du anders entscheiden kannst.",
    ],
    mission: {
      title: "Die schnelle Reaktion auseinandernehmen",
      trigger: "Nach einer Reaktion, die sich schnell und automatisch angefühlt hat.",
      steps: [
        "Benenne, was passiert ist und was zuerst in dir auftauchte.",
        "Erkenne, zu welcher Handlung dich der Impuls gedrängt hat.",
        "Formuliere eine Handlung, die besser zur Aufgabe passt.",
      ],
      why: "So erkennst du früher, wo deine eigene Entscheidung beginnt.",
    },
    check: {
      prompt: "Ein Impuls drängt dich sofort zum Aufgeben. Was trainierst du heute?",
      correct: "Den Impuls erkennen und danach meine Handlung bewusst wählen.",
      wrong: ["Den Impuls sofort wegdrücken.", "Erst am Abend lange darüber nachdenken."],
      feedback: "Genau. Der Impuls darf da sein, aber er entscheidet nicht automatisch deine Handlung.",
    },
    recall: {
      prompt: "Was sind die wichtigsten Teile zwischen Situation und Handlung?",
      application: "Achte heute besonders auf den Impuls direkt vor deiner Handlung.",
    },
    journal: {
      title: "Was passierte Schritt für Schritt?",
      intro: "Geh eine Szene langsam durch, ohne sie zu bewerten.",
      questions: [
        { prompt: "Was passierte und welcher Gedanke oder welches Gefühl kam zuerst?", placeholder: "Situation plus erste innere Reaktion." },
        { prompt: "Zu welcher Handlung hat dich der Impuls gedrängt?", placeholder: "Was wolltest du sofort tun?" },
        { prompt: "Wo lag eine andere mögliche Entscheidung?", placeholder: "Welche Handlung hätte besser gepasst?" },
      ],
    },
  },
  {
    day: 21,
    toolId: "W2",
    stage: "Vertiefung",
    title: "Richte dich auf deinen Beitrag aus",
    purpose: "Du löst die Handlung von deinem Bild und fragst, was du zur Aufgabe beitragen kannst.",
    science: [
      "Beitrag funktioniert im Team- und im Einzelsport.",
      "Im Team kann er Kommunikation, Unterstützung oder eine klare Rolle bedeuten. Im Einzelsport ist es dein Beitrag zur eigenen Aufgabe: Vorbereitung, Disziplin oder saubere Ausführung.",
      "Die Frage nach dem Beitrag richtet Aufmerksamkeit weg vom Selbstbild und hin zu etwas Konkretem.",
    ],
    mission: {
      title: "Einen konkreten Beitrag wählen",
      trigger: "Wenn du dich stark mit deiner Wirkung, Bewertung oder Position beschäftigst.",
      steps: [
        "Frag: Was braucht die Aufgabe gerade von mir?",
        "Wähle einen konkreten Beitrag.",
        "Mach ihn in deiner nächsten Handlung sichtbar.",
      ],
      why: "Beitrag gibt deiner Qualität eine Richtung, ohne eine Teamrolle oder persönliche Motivation zu erfinden.",
    },
    check: {
      prompt: "Was bedeutet Beitrag für einen Einzelsportler?",
      correct: "Was er durch Vorbereitung und Handlung zur eigenen Aufgabe beiträgt.",
      wrong: ["Das Werkzeug gilt nur für Mannschaften.", "Dass er sich für andere aufopfern muss."],
      feedback: "Richtig. Beitrag heißt: Was bringst du jetzt konkret in die Aufgabe ein?",
    },
    recall: {
      prompt: "Welche Frage bringt dich von deinem Bild zu deinem konkreten Beitrag?",
      application: "Wähle danach einen Beitrag, den man in deiner nächsten Handlung erkennen kann.",
    },
    journal: {
      title: "Was war heute mein Beitrag?",
      intro: "Nenne eine konkrete Handlung statt einer allgemeinen Eigenschaft.",
      questions: [
        { prompt: "Wann warst du heute stark mit deinem eigenen Bild beschäftigt?", placeholder: "Beschreibe eine Szene." },
        { prompt: "Welchen Beitrag brauchte die Aufgabe in diesem Moment?", placeholder: "Kommunikation, Präzision, Vorbereitung oder etwas anderes." },
        { prompt: "Wie hast du diesen Beitrag sichtbar gemacht?", placeholder: "Oder: Was wäre die passende Handlung gewesen?" },
      ],
    },
  },
  {
    day: 22,
    toolId: "W7",
    stage: "Rückkehr",
    title: "Nimm das vollständige Bild wieder auf",
    purpose: "Du erinnerst den Blicköffner und siehst Problem, Funktionierendes und Möglichkeiten gleichzeitig.",
    science: [
      "Ein enger Blick ist nicht automatisch falsch – nur unvollständig.",
      "Unter Belastung kann ein Problem fast deine gesamte Aufmerksamkeit einnehmen. Andere reale Informationen verschwinden dadurch aus deinem Arbeitsbild.",
      "Den Blick zu öffnen heißt nicht, positiv zu denken. Es heißt, mehr von der tatsächlichen Situation wahrzunehmen.",
    ],
    mission: {
      title: "Drei Teile ins Bild holen",
      trigger: "Wenn ein Problem oder Mangel fast die ganze Situation für dich bestimmt.",
      steps: [
        "Benenne das reale Problem.",
        "Frag: Was funktioniert, trägt oder ist außerdem möglich?",
        "Wähle aus dem vollständigeren Bild deine nächste Handlung.",
      ],
      why: "Du ersetzt das Problem nicht. Du gibst deiner Entscheidung mehr reale Informationen.",
    },
    check: {
      prompt: "Was ist heute ausdrücklich nicht das Ziel?",
      correct: "Das Problem durch positives Denken wegzureden.",
      wrong: ["Weitere reale Informationen wahrzunehmen.", "Möglichkeiten und Unterstützung mit ins Bild zu nehmen."],
      feedback: "Genau. Der Blick wird vollständiger, nicht künstlich positiv.",
    },
    recall: {
      prompt: "Welche Frage öffnet deinen Blick, wenn ein Problem alles andere verdeckt?",
      application: "Nenne mindestens eine weitere reale Information und handle dann aus dem ganzen Bild.",
    },
    journal: {
      title: "Was war außerdem Teil der Situation?",
      intro: "Nutze eine heutige Alltagsszene oder eine konkrete frühere Sportszene.",
      questions: [
        { prompt: "Welches Problem hat deinen Blick eng gemacht?", placeholder: "Benenne es ohne es kleinzureden." },
        { prompt: "Was war außerdem real vorhanden?", placeholder: "Funktionierendes, Unterstützung oder eine Möglichkeit." },
        { prompt: "Welche Handlung wurde durch das vollständigere Bild sichtbar?", placeholder: "Was konntest oder könntest du tun?" },
      ],
    },
  },
  {
    day: 23,
    toolId: "W6",
    stage: "Vertiefung",
    title: "Trenne Lernversuch und Selbstwert",
    purpose: "Du prüfst eine unsichere Handlung nach ihrem Nutzen, nicht danach, was ein Scheitern über dich bedeuten könnte.",
    science: [
      "Ein Versuch kann misslingen, ohne deinen Wert zu bewerten.",
      "Wenn Handlung und Selbstbild eng verbunden sind, wirkt sichtbare Unsicherheit schnell wie eine persönliche Prüfung.",
      "Heute bewertest du den Versuch nach Sicherheit, Aufgabenwert und Lernnutzen – nicht als Beweis für oder gegen dich.",
    ],
    mission: {
      title: "Den Versuch sachlich prüfen",
      trigger: "Wenn eine sinnvolle Handlung vor allem wegen möglicher Außenwirkung riskant erscheint.",
      steps: [
        "Prüfe Sicherheit, Aufgabenwert und möglichen Lernnutzen.",
        "Trenne das Ergebnis des Versuchs von deinem Wert.",
        "Wähle einen angemessenen Versuch oder eine passende Anpassung.",
      ],
      why: "Du entscheidest über eine Handlung – nicht über deine Person.",
    },
    check: {
      prompt: "Woran misst du heute, ob ein Versuch sinnvoll ist?",
      correct: "An Sicherheit, Aufgabenwert und Lernnutzen.",
      wrong: ["Daran, ob er mich stark aussehen lässt.", "Daran, ob ein Fehler vollständig ausgeschlossen ist."],
      feedback: "Richtig. Ein sinnvoller Versuch bleibt eine Handlung, kein Persönlichkeitstest.",
    },
    recall: {
      prompt: "Welche zwei Schritte helfen dir bei einer unsicheren, aber passenden Handlung?",
      application: "Prüfe sachlich. Wenn der Versuch passt, führe ihn angemessen aus.",
    },
    journal: {
      title: "Was machte den Versuch persönlich?",
      intro: "Prüfe eine unsichere Handlung anhand klarer Kriterien.",
      questions: [
        { prompt: "Welche Handlung fühlte sich wie eine persönliche Prüfung an?", placeholder: "Beschreibe den konkreten Versuch." },
        { prompt: "Wie sahen Sicherheit, Aufgabenwert und Lernnutzen tatsächlich aus?", placeholder: "Prüfe die drei Punkte nüchtern." },
        { prompt: "Welche angemessene Entscheidung folgte daraus?", placeholder: "Versuchen, anpassen oder bewusst lassen." },
      ],
    },
  },
  {
    day: 24,
    toolId: "W2",
    stage: "Integration",
    title: "Halte eine gute Handlung fest",
    purpose: "Du hältst fest, was du konkret getan hast und welche Qualität du wiederholen willst.",
    science: [
      "Konkrete Handlungen zeigen dir, was du bereits umgesetzt hast.",
      "Du bist zum Beispiel zurückgekommen, hast klar kommuniziert oder trotz Zweifel sauber gearbeitet.",
      "Eine Szene entscheidet nicht, wer du bist. Sie zeigt dir aber eine Qualität, die du erneut nutzen kannst.",
    ],
    mission: {
      title: "Eine Handlung genau ansehen",
      trigger: "Nach einer Situation, in der du bewusst nach Aufgabenqualität gehandelt hast.",
      steps: [
        "Benenne die konkrete Handlung ohne Übertreibung.",
        "Ordne zu, welche Qualität du gezeigt hast.",
        "Formuliere, wie du diese Qualität erneut zeigen kannst.",
      ],
      why: "Du erkennst, welches Verhalten du wiederholen willst, ohne dich nach einer Szene fest zu bewerten.",
    },
    check: {
      prompt: "Du hast trotz Zweifel sauber gehandelt. Was nimmst du daraus mit?",
      correct: "Welche Qualität ich gezeigt habe und erneut nutzen kann.",
      wrong: ["Dass ich mich dauerhaft verändert habe.", "Gar nichts, weil nur das Ergebnis zählt."],
      feedback: "Genau. Die Handlung zeigt eine wiederholbare Qualität, aber sie bewertet nicht deine ganze Person.",
    },
    recall: {
      prompt: "Welche Frage richtet dich heute wieder auf die Qualität deiner Handlung aus?",
      application: "Nach der Einheit hältst du eine konkrete gute Handlung und ihre wichtigste Qualität fest.",
    },
    journal: {
      title: "Welche Qualität will ich wiederholen?",
      intro: "Bleib bei dem, was du tatsächlich getan hast.",
      questions: [
        { prompt: "Welche konkrete Handlung willst du heute festhalten?", placeholder: "Was hast du tatsächlich getan?" },
        { prompt: "Welche Qualität wurde darin sichtbar?", placeholder: "Zum Beispiel Klarheit, Mut, Geduld oder Disziplin." },
        { prompt: "Wie kannst du diese Qualität erneut zeigen?", placeholder: "Nenne eine nächste passende Handlung." },
      ],
    },
  },
  {
    day: 25,
    toolId: "W5",
    stage: "Vertiefung",
    title: "Warte nicht auf innere Erlaubnis",
    purpose: "Du erkennst Zweifel oder fehlende Bereitschaft, ohne sie zur Voraussetzung deiner Handlung zu machen.",
    science: [
      "Der Kopf gibt nicht immer ein klares Startsignal.",
      "Zweifel, Unlust oder Unsicherheit können auch dann vorhanden sein, wenn eine Handlung sinnvoll und möglich ist.",
      "Wenn du immer auf innere Zustimmung wartest, entscheidet dein momentaner Zustand. Heute prüfst du die Aufgabe und entscheidest selbst.",
    ],
    mission: {
      title: "Zweifel bemerken, Aufgabe prüfen, entscheiden",
      trigger: "Wenn dein Kopf sagt, dass du noch nicht bereit bist oder es lieber lassen solltest.",
      steps: [
        "Benenne den Zweifel oder die fehlende Bereitschaft.",
        "Prüfe, was die Aufgabe jetzt tatsächlich braucht.",
        "Wähle deine Handlung, ohne auf ein anderes Gefühl zu warten.",
      ],
      why: "Du handelst nicht gegen dich. Du gibst einem wechselnden inneren Zustand nur nicht automatisch das letzte Wort.",
    },
    check: {
      prompt: "Wann darfst du trotz Zweifel handeln?",
      correct: "Wenn die Handlung nach ehrlicher Prüfung sicher, sinnvoll und passend ist.",
      wrong: ["Immer, egal wie es mir körperlich geht.", "Erst wenn der Zweifel vollständig weg ist."],
      feedback: "Richtig. Der Zweifel ist Information, aber nicht automatisch die Entscheidung.",
    },
    recall: {
      prompt: "Welcher Cue erinnert dich daran, dass dein innerer Satz nicht entscheiden muss?",
      application: "Benenne den Zweifel kurz und richte deine Entscheidung danach an der Aufgabe aus.",
    },
    journal: {
      title: "Wo wartete ich auf ein anderes Gefühl?",
      intro: "Prüfe eine Szene, in der dein Zustand und die Aufgabe unterschiedliche Richtungen vorgaben.",
      questions: [
        { prompt: "Welcher Zweifel oder welches Gefühl wollte deine Handlung stoppen?", placeholder: "Schreib es möglichst direkt auf." },
        { prompt: "Was brauchte die Aufgabe nach ehrlicher Prüfung?", placeholder: "Welche Handlung war sicher und passend?" },
        { prompt: "Wie hast du entschieden?", placeholder: "Was hast du getan oder bewusst gelassen?" },
      ],
    },
  },
  {
    day: 26,
    toolId: "W6",
    stage: "Vertiefung",
    title: "Prüfe deine erste Einschätzung",
    purpose: "Du prüfst, ob eine unsichere Situation wirklich gefährlich ist oder nur zuerst so wirkt.",
    science: [
      "Deine erste Einschätzung ist schnell, aber nicht immer vollständig.",
      "Eine unsichere Situation kann sich sofort gefährlich oder peinlich anfühlen. Reale Gefahr nimmst du immer ernst.",
      "Wenn keine reale Gefahr besteht, prüfst du Aufgabe, Vorbereitung und einen sicheren nächsten Versuch.",
    ],
    mission: {
      title: "Den ersten Eindruck prüfen",
      trigger: "Wenn eine unsichere Situation sofort gefährlich oder wie ein Test deiner Person wirkt.",
      steps: [
        "Benenne, wie die Situation zuerst auf dich wirkt.",
        "Prüfe reale Gefahr, Vorbereitung und Aufgabe.",
        "Wähle danach einen sicheren und passenden nächsten Schritt.",
      ],
      why: "Du ignorierst dein Gefühl nicht. Du prüfst nur, ob es schon die ganze Situation zeigt.",
    },
    check: {
      prompt: "Eine Handlung fühlt sich sofort gefährlich an. Was tust du zuerst?",
      correct: "Ich prüfe reale Gefahr, Vorbereitung und Aufgabe.",
      wrong: ["Ich erkläre das Gefühl automatisch für falsch.", "Ich handle sofort nach dem ersten Gefühl."],
      feedback: "Genau. Prüfen heißt: ernst nehmen, genauer hinsehen und dann passend entscheiden.",
    },
    recall: {
      prompt: "Welcher Cue erinnert dich daran, eine unsichere Situation erst zu prüfen?",
      application: "Prüfe Sicherheit und Aufgabe. Dann entscheide über den nächsten angemessenen Versuch.",
    },
    journal: {
      title: "Wie wirkte die Situation zuerst?",
      intro: "Geh eine unsichere Szene sachlich durch.",
      questions: [
        { prompt: "Wie hat die Situation zuerst auf dich gewirkt?", placeholder: "Gefährlich, peinlich, zu groß oder etwas anderes." },
        { prompt: "Was zeigten Gefahr, Vorbereitung und Aufgabe tatsächlich?", placeholder: "Prüfe die drei Punkte einzeln." },
        { prompt: "Welche Entscheidung wurde nach der Prüfung passend?", placeholder: "Versuchen, anpassen oder lassen." },
      ],
    },
  },
  {
    day: 27,
    toolId: "W2",
    stage: "Vertiefung",
    title: "Wähle Qualität bei unsicherem Ausgang",
    purpose: "Du richtest dich bei unklarem Ergebnis auf die passende Qualität statt auf den Schutz deines Bildes.",
    science: [
      "Ein unsicheres Ergebnis macht die Aufgabe nicht automatisch unklar.",
      "Du kannst nicht garantieren, dass eine Handlung gelingt. Du kannst aber entscheiden, ob sie klar, mutig, geduldig oder präzise ausgeführt wird.",
      "Qualität gibt dir eine steuerbare Richtung, auch wenn der Ausgang offen bleibt.",
    ],
    mission: {
      title: "Offenen Ausgang, klare Qualität",
      trigger: "Wenn du nicht weißt, ob eine passende Handlung gelingen wird.",
      steps: [
        "Akzeptiere, dass der Ausgang offen ist.",
        "Frag, welche Qualität die Aufgabe braucht.",
        "Führe die Handlung mit genau dieser Qualität aus.",
      ],
      why: "Du versuchst nicht, das Ergebnis zu kontrollieren. Du übernimmst Verantwortung für die Ausführung.",
    },
    check: {
      prompt: "Was bleibt bei offenem Ergebnis in deiner Hand?",
      correct: "Die Qualität, mit der ich die passende Handlung ausführe.",
      wrong: ["Dass die Handlung garantiert gelingt.", "Wie andere den Versuch bewerten."],
      feedback: "Richtig. Der Ausgang bleibt offen; wie du die Handlung ausführst, bleibt wählbar.",
    },
    recall: {
      prompt: "Welche Frage gibt deiner Handlung bei unsicherem Ausgang eine klare Richtung?",
      application: "Wähle eine Qualität. Prüfe mit dem Unsicherheitswerkzeug nur, ob der Versuch passend ist.",
    },
    journal: {
      title: "Welche Qualität blieb wählbar?",
      intro: "Nimm eine Szene mit offenem Ausgang.",
      questions: [
        { prompt: "Welche passende Handlung hatte ein unsicheres Ergebnis?", placeholder: "Beschreibe den Versuch." },
        { prompt: "Welche Qualität konntest du trotzdem wählen?", placeholder: "Zum Beispiel Klarheit, Geduld oder Mut." },
        { prompt: "Wie sah diese Qualität in der Ausführung aus?", placeholder: "Beschreibe eine beobachtbare Handlung." },
      ],
    },
  },
  {
    day: 29,
    toolId: "W1",
    stage: "Vertiefung",
    title: "Erkenne den Drift früher",
    purpose: "Du findest das erste kleine Signal, bevor deine Aufmerksamkeit vollständig weg ist.",
    science: [
      "Aufmerksamkeit verschwindet selten in einem einzigen Moment.",
      "Oft gibt es frühe Signale: Dein Blick bleibt hängen, ein Gedanke wiederholt sich, du hörst weniger oder reagierst nur noch halb.",
      "Wenn du dieses erste Signal erkennst, wird der Weg zur nächsten Aktion kürzer.",
    ],
    mission: {
      title: "Das erste Signal finden",
      trigger: "Wenn du bemerkst, dass du schon eine Weile nicht mehr vollständig bei der Aufgabe bist.",
      steps: [
        "Frag rückblickend: Was war mein erstes Drift-Signal?",
        "Achte in der nächsten ähnlichen Szene genau darauf.",
        "Nutze dann sofort deinen bekannten Anker.",
      ],
      why: "Du trainierst nicht mehr nur die Rückkehr, sondern einen früheren Startpunkt dafür.",
    },
    check: {
      prompt: "Warum suchst du heute das erste Drift-Signal?",
      correct: "Damit ich früher zur nächsten Aktion zurückkommen kann.",
      wrong: ["Damit ich nie wieder abschweife.", "Damit ich jeden Gedanken analysiere."],
      feedback: "Genau. Das frühe Signal verkürzt den bekannten Rückweg.",
    },
    recall: {
      prompt: "Welcher Cue folgt sofort auf dein erstes Drift-Signal?",
      application: "Achte auf Blick, Gedanken oder Verhalten und komm beim ersten Signal zurück.",
    },
    journal: {
      title: "Was war mein erstes Signal?",
      intro: "Geh eine Szene rückwärts vom deutlichen Drift bis zum ersten Hinweis durch.",
      questions: [
        { prompt: "Wann war deine Aufmerksamkeit deutlich weg?", placeholder: "Beschreibe eine konkrete Szene." },
        { prompt: "Welches frühere Signal kannst du darin erkennen?", placeholder: "Blick, Gedanke, Körper oder Verhalten." },
        { prompt: "Wo wäre die frühere nächste Aktion gewesen?", placeholder: "Was hättest du direkt tun können?" },
      ],
    },
  },
  {
    day: 30,
    toolId: "W2",
    stage: "Vertiefung",
    title: "Prüfe, warum du so handeln willst",
    purpose: "Du erkennst, ob deine Handlung der Aufgabe hilft oder hauptsächlich gut aussehen soll.",
    science: [
      "Dieselbe Handlung kann aus unterschiedlichen Gründen entstehen.",
      "Du kannst laut kommunizieren, weil die Aufgabe Klarheit braucht, weil du beitragen willst oder weil du stark wirken möchtest.",
      "Von außen sieht das ähnlich aus. Entscheidend ist, ob deine Aufmerksamkeit bei der Aufgabe oder bei deinem Bild liegt.",
    ],
    mission: {
      title: "Aufgabe oder Eindruck?",
      trigger: "Wenn du eine intensive oder besonders sichtbare Handlung planst.",
      steps: [
        "Frag, welche Qualität die Aufgabe braucht.",
        "Prüfe, welchen Beitrag die Handlung leistet.",
        "Lass unnötigen Beweisdruck aus der Ausführung heraus.",
      ],
      why: "Du behältst Qualität und Intensität, ohne deine Aufmerksamkeit zusätzlich an dein Bild zu binden.",
    },
    check: {
      prompt: "Du willst laut führen. Woran prüfst du, ob das heute passt?",
      correct: "Ob die Aufgabe diese Klarheit wirklich braucht.",
      wrong: ["Nein. Sichtbare Handlungen sind immer Ego.", "Ja. Der Grund hinter der Handlung ist immer egal."],
      feedback: "Richtig. Sichtbarkeit ist nicht das Problem. Die Aufgabe entscheidet, ob die Handlung passt.",
    },
    recall: {
      prompt: "Welche Frage klärt zuerst die Qualität deiner Handlung?",
      application: "Ergänze danach: Welchen konkreten Beitrag leistet diese Handlung?",
    },
    journal: {
      title: "Wem diente meine Handlung?",
      intro: "Prüfe eine sichtbare oder intensive Handlung ohne moralisches Urteil.",
      questions: [
        { prompt: "Welche Handlung war heute besonders sichtbar oder intensiv?", placeholder: "Beschreibe den Moment." },
        { prompt: "Welche Qualität und welchen Beitrag brauchte die Aufgabe?", placeholder: "Trenne beides kurz." },
        { prompt: "Wo kam zusätzlich Beweisdruck hinein?", placeholder: "Wenn keiner da war, schreib das ehrlich." },
      ],
    },
  },
  {
    day: 31,
    toolId: "W3",
    stage: "Vertiefung",
    title: "Verstehe deinen Ablauf nach dem Fehler",
    purpose: "Du erkennst, wie aus einem Fehler ein Urteil, ein engerer Blick und eine Folgehandlung entstehen.",
    science: [
      "Der Fehler ist oft nur der Anfang des Ablaufs.",
      "Danach kann ein Urteil auftauchen, dein Blick enger werden und deine nächste Handlung vorsichtiger, hektischer oder unklarer ausfallen.",
      "Wenn du diese Schritte erkennst, kannst du Information und Urteil früher trennen.",
    ],
    mission: {
      title: "Fehlerablauf rekonstruieren",
      trigger: "Nach einer Fehlerszene, die mehrere weitere Handlungen beeinflusst hat.",
      steps: [
        "Trenne Fehler, erstes Urteil und folgende Verengung.",
        "Finde die brauchbare Information im Fehler.",
        "Formuliere die nächste klare Handlung ohne das Urteil.",
      ],
      why: "Du siehst genauer, an welcher Stelle der Fehler aufhört und dein zusätzlicher innerer Ablauf beginnt.",
    },
    check: {
      prompt: "Was gehört nicht automatisch zur Information eines Fehlers?",
      correct: "Das Urteil, was der Fehler über mich bedeutet.",
      wrong: ["Was technisch oder taktisch nicht funktioniert hat.", "Welche Korrektur für die nächste Handlung nützlich ist."],
      feedback: "Genau. Information hilft bei der Korrektur; das persönliche Urteil ist ein zusätzlicher Schritt.",
    },
    recall: {
      prompt: "Welcher Cue hält den Fehlerablauf heute kurz?",
      application: "Trenne Information und Urteil, bevor du die nächste Handlung wählst.",
    },
    journal: {
      title: "Was passierte nach dem Fehler?",
      intro: "Rekonstruiere eine Szene Schritt für Schritt.",
      questions: [
        { prompt: "Was war der konkrete Fehler und welches Urteil kam direkt danach?", placeholder: "Fakt und innerer Satz getrennt." },
        { prompt: "Wie hat sich dein Blick oder Verhalten danach verengt?", placeholder: "Was wurde vorsichtiger, hektischer oder unklarer?" },
        { prompt: "Welche Information und nächste Handlung wären ohne das Urteil übrig?", placeholder: "Eine Information, eine Handlung." },
      ],
    },
  },
  {
    day: 32,
    toolId: "W4",
    stage: "Vertiefung",
    title: "Trenne Fakt, inneren Kampf und nächsten Schritt",
    purpose: "Du benennst drei Teile einer belastenden Situation, ohne sie miteinander zu vermischen.",
    science: [
      "Belastende Situationen werden klarer, wenn du ihre Teile trennst.",
      "Der Fakt beschreibt, was passiert ist. Der innere Kampf zeigt, wie dein Kopf weiter dagegen arbeitet. Danach bleibt die Frage, was du noch beeinflussen kannst.",
      "Diese Trennung reduziert keine Emotion. Sie macht deine nächste Entscheidung klarer.",
    ],
    mission: {
      title: "Drei Teile klar benennen",
      trigger: "Wenn Frust und mögliche nächste Schritte in deinem Kopf durcheinandergehen.",
      steps: [
        "Benenne den Fakt ohne Zusatz.",
        "Benenne deinen zusätzlichen inneren Kampf.",
        "Benenne und nutze, was du noch tun kannst.",
      ],
      why: "Du erkennst, was real feststeht und wo Handeln weiterhin möglich ist.",
    },
    check: {
      prompt: "Welche Aussage beschreibt den Fakt statt den inneren Kampf?",
      correct: "Die Entscheidung ist gefallen und kann jetzt nicht geändert werden.",
      wrong: ["Das dürfte niemals so sein.", "Solange ich mich ärgere, muss sich etwas ändern."],
      feedback: "Richtig. Der Fakt beschreibt die Lage; der innere Kampf fordert weiter eine andere Realität.",
    },
    recall: {
      prompt: "Welche Frage führt nach Fakt und innerem Kampf zum nächsten Schritt?",
      application: "Nutze sie für genau eine Handlung, die weiterhin in deinem Einfluss liegt.",
    },
    journal: {
      title: "Fakt, innerer Kampf, nächster Schritt",
      intro: "Nutze eine konkrete Situation und trenne die drei Teile.",
      questions: [
        { prompt: "Was war der reine Fakt?", placeholder: "Ein Satz ohne Bewertung." },
        { prompt: "Wie sah dein zusätzlicher innerer Kampf aus?", placeholder: "Welche Forderung oder Schleife kam dazu?" },
        { prompt: "Was konntest du trotzdem noch tun?", placeholder: "Nenne eine konkrete Handlung." },
      ],
    },
  },
  {
    day: 34,
    toolId: "W6",
    stage: "Vertiefung",
    title: "Finde eine passende Herausforderung",
    purpose: "Du unterscheidest reale Gefahr, eine zu große Aufgabe und einen sicheren nächsten Versuch.",
    science: [
      "Nicht jede schwierige Handlung ist automatisch gutes Training.",
      "Eine Herausforderung kann zu groß, schlecht vorbereitet oder real gefährlich sein. Sie kann aber auch nur ungewohnt und trotzdem sicher sein.",
      "Heute suchst du nicht maximale Härte, sondern die passende Größe für einen sinnvollen nächsten Versuch.",
    ],
    mission: {
      title: "Die Herausforderung passend machen",
      trigger: "Wenn eine neue oder schwierige Handlung entweder zu groß oder zu leicht vermeidbar wirkt.",
      steps: [
        "Prüfe reale Sicherheit und Vorbereitung.",
        "Passe Größe, Tempo oder Schwierigkeit des Versuchs an.",
        "Führe den passenden nächsten Versuch aus oder lass ihn begründet.",
      ],
      why: "Du suchst weder blindes Risiko noch die leichteste Lösung. Du suchst einen sinnvollen nächsten Versuch.",
    },
    check: {
      prompt: "Was ist heute die beste Herausforderung?",
      correct: "Eine sichere, vorbereitete und angemessen schwierige Handlung.",
      wrong: ["Immer die härteste mögliche Handlung.", "Nur etwas, das sich vollständig sicher anfühlt."],
      feedback: "Genau. Die Schwierigkeit wird passend gemacht, nicht maximal.",
    },
    recall: {
      prompt: "Welcher Cue erinnert dich an Prüfung und passenden Versuch?",
      application: "Verkleinere oder verändere die Handlung, wenn der ursprüngliche Versuch nicht passend ist.",
    },
    journal: {
      title: "War die Herausforderung passend?",
      intro: "Bewerte nicht deinen Mut, sondern die Qualität der Wahl.",
      questions: [
        { prompt: "Welche Herausforderung hast du geprüft?", placeholder: "Beschreibe die konkrete Handlung." },
        { prompt: "Was sprach für Sicherheit, Vorbereitung und passende Schwierigkeit?", placeholder: "Prüfe die drei Punkte." },
        { prompt: "Wie hast du den Versuch angepasst oder entschieden?", placeholder: "Größe, Tempo, Schwierigkeit oder bewusst gelassen." },
      ],
    },
  },
  {
    day: 35,
    toolId: "W7",
    stage: "Vertiefung",
    title: "Geh deinen engen Blick noch einmal durch",
    purpose: "Du erkennst rückblickend, welche realen Informationen in einer belastenden Szene verschwunden sind.",
    science: [
      "Tunnelblick zeigt dir nicht, dass du unvernünftig bist.",
      "Er zeigt, welche Informationen dein Kopf in einer belastenden Situation zuerst gesehen hat. Andere Fakten waren oft weiterhin da, aber in deiner Entscheidung kaum noch präsent.",
      "Rückblickend kannst du lernen, welche Informationen du beim nächsten Mal früher wieder aufnehmen willst.",
    ],
    mission: {
      title: "Den Blick im Rückblick vervollständigen",
      trigger: "Denk an eine Szene, in der ein Problem fast die gesamte Situation bestimmt hat.",
      steps: [
        "Benenne, was dein Blick fast vollständig aufgenommen hat.",
        "Finde zwei reale Informationen, die damals fehlten.",
        "Formuliere, was dadurch als Handlung sichtbar wird.",
      ],
      why: "Du bereitest einen früheren Blickwechsel vor, ohne eine heutige Situation zu erfinden.",
    },
    check: {
      prompt: "Was lernst du aus einer früheren Tunnelblick-Szene?",
      correct: "Welche realen Informationen ich beim nächsten Mal früher wieder aufnehmen will.",
      wrong: ["Dass das Problem eigentlich nicht real war.", "Dass ich künftig nur positive Dinge sehen soll."],
      feedback: "Richtig. Die Situation wird vollständiger, nicht schöner gemacht.",
    },
    recall: {
      prompt: "Welche Frage holt fehlende reale Informationen wieder ins Bild?",
      application: "Nutze sie heute, wenn ein Problem deine Wahrnehmung fast vollständig besetzt.",
    },
    journal: {
      title: "Was fehlte damals im Bild?",
      intro: "Geh eine selbst gewählte Szene noch einmal durch.",
      questions: [
        { prompt: "Was hat deinen Blick damals fast vollständig eingenommen?", placeholder: "Problem, Fehler, Druck oder Mangel." },
        { prompt: "Welche zwei realen Informationen waren trotzdem vorhanden?", placeholder: "Funktionierendes, Hilfe, Möglichkeit oder Kontext." },
        { prompt: "Welche andere Handlung wird mit diesen Informationen möglich?", placeholder: "Formuliere einen konkreten nächsten Schritt." },
      ],
    },
  },
  {
    day: 36,
    toolId: "W1",
    stage: "Vertiefung",
    title: "Komm im Chaos zur nächsten Aktion zurück",
    purpose: "Du erkennst, wenn viele Reize oder ein innerer Kommentar deine Aufmerksamkeit auseinanderziehen.",
    science: [
      "Viele Reize gleichzeitig machen deine nächste Aufgabe schnell unklar.",
      "Geräusche, Bewegungen, Fehler oder ein innerer Kommentar können in verschiedene Richtungen ziehen. Du musst nicht alles gleichzeitig lösen.",
      "Merk die Streuung und wähle eine nächste konkrete Aktion. Damit bekommt deine Aufmerksamkeit wieder eine Richtung.",
    ],
    mission: {
      title: "Streuung merken, eine Aktion wählen",
      trigger: "Wenn viele Reize oder ein innerer Kommentar gleichzeitig deine Aufmerksamkeit binden.",
      steps: [
        "Merk: Meine Aufmerksamkeit ist gerade überall.",
        "Versuche nicht, alles gleichzeitig zu lösen.",
        "Komm zu deiner nächsten konkreten Aktion zurück.",
      ],
      why: "Eine klare nächste Aktion gibt deiner Aufmerksamkeit auch mitten im Chaos wieder eine Richtung.",
    },
    check: {
      prompt: "Mehrere Reize ziehen gleichzeitig an dir. Was tust du jetzt?",
      correct: "Ich wähle eine nächste konkrete Aktion und richte mich darauf aus.",
      wrong: ["Ich versuche, alles gleichzeitig zu lösen.", "Ich warte, bis das Chaos vollständig vorbei ist."],
      feedback: "Genau. Du brauchst nicht sofort Ruhe, sondern eine klare nächste Aktion.",
    },
    recall: {
      prompt: "Welcher eine Cue bleibt sichtbar, nachdem du den Kommentar erkannt hast?",
      application: "Diskutiere nicht lange mit dem Gedanken. Richte Wahrnehmung und Handlung wieder nach vorn.",
    },
    journal: {
      title: "Was zog meine Aufmerksamkeit auseinander?",
      intro: "Geh eine unruhige Szene bis zu deiner nächsten klaren Aktion durch.",
      questions: [
        { prompt: "Welche Reize oder Gedanken haben gleichzeitig an dir gezogen?", placeholder: "Nenne die wichtigsten zwei oder drei." },
        { prompt: "Woran hast du die Streuung deiner Aufmerksamkeit gemerkt?", placeholder: "Blick, Gedanke oder Verhalten." },
        { prompt: "Was war deine nächste Aktion nach der Rückkehr?", placeholder: "Beschreibe die konkrete Handlung." },
      ],
    },
  },
  {
    day: 37,
    toolId: "W2",
    stage: "Vertiefung",
    title: "Lass die Aufgabe unter Unsicherheit führen",
    purpose: "Du bestimmst zuerst die nötige Qualität und prüfst danach, wie weit ein unsicherer Versuch gehen soll.",
    science: [
      "Aufgabenqualität und Unsicherheitsprüfung beantworten verschiedene Fragen.",
      "Die Aufgabenfrage klärt, welche Qualität gebraucht wird. Die Unsicherheitsprüfung klärt danach, ob und in welcher Größe der Versuch sicher und passend ist.",
      "Heute führt die Qualität. Der Check im Hintergrund bestimmt nur die angemessene Ausführung.",
    ],
    mission: {
      title: "Qualität führen lassen, Versuch anpassen",
      trigger: "Wenn eine nötige Handlung klar ist, ihre Ausführung aber unsicher wirkt.",
      steps: [
        "Bestimme die Qualität, die die Aufgabe braucht.",
        "Prüfe Sicherheit und passende Größe des Versuchs.",
        "Führe die Qualität in dieser Form aus.",
      ],
      why: "Die Werkzeuge ergänzen sich, ohne zu zwei Aufgaben zu werden.",
    },
    check: {
      prompt: "Die Handlung ist nötig, aber ihre Ausführung unsicher. Was klärst du zuerst?",
      correct: "Welche Qualität die Aufgabe braucht.",
      wrong: ["Ob ich mich bereits sicher fühle.", "Was ein möglicher Fehler über mich sagt."],
      feedback: "Richtig. Die Qualität führt; der Unsicherheitscheck passt nur den Versuch an.",
    },
    recall: {
      prompt: "Welche Frage bestimmt heute zuerst deine Qualität?",
      application: "Prüfe danach kurz, in welcher sicheren Form du diese Qualität zeigen kannst.",
    },
    journal: {
      title: "Welche Qualität führte den Versuch?",
      intro: "Trenne die benötigte Qualität von der Größe des Versuchs.",
      questions: [
        { prompt: "Welche Qualität brauchte die Aufgabe?", placeholder: "Zum Beispiel Klarheit, Mut oder Geduld." },
        { prompt: "Was machte die Ausführung unsicher?", placeholder: "Welche konkrete Unsicherheit war da?" },
        { prompt: "Wie hast du den Versuch passend gemacht?", placeholder: "Beschreibe die sichere Ausführung." },
      ],
    },
  },
  {
    day: 38,
    toolId: "W3",
    stage: "Vertiefung",
    title: "Trenne Korrektur und Protest",
    purpose: "Du holst eine Fehlerinformation heraus, ohne weiter gegen den unveränderbaren Teil der Szene zu kämpfen.",
    science: [
      "Nach einem Fehler können Korrektur und Protest gleichzeitig auftauchen.",
      "Die Korrektur betrifft das, was du beim nächsten Mal verändern kannst. Der Protest hängt an dem, was bereits passiert ist oder außerhalb deines Einflusses lag.",
      "Wenn du beides trennst, bleibt die Information nutzbar und der alte Moment muss nicht weitergeführt werden.",
    ],
    mission: {
      title: "Information behalten, Protest loslassen",
      trigger: "Nach einem Fehler, bei dem du zugleich über Bedingungen, Entscheidungen oder den vergangenen Moment kämpfst.",
      steps: [
        "Hol eine brauchbare Information aus deinem Anteil.",
        "Trenne den unveränderbaren Teil der Szene ab.",
        "Nutze die Information in der nächsten passenden Handlung.",
      ],
      why: "Der Fehleranker führt. Die Einflussfrage hilft nur, den unveränderbaren Rest nicht mitzunehmen.",
    },
    check: {
      prompt: "Was nimmst du aus der Fehlerszene mit?",
      correct: "Eine brauchbare Information aus meinem beeinflussbaren Anteil.",
      wrong: ["Den gesamten Protest gegen den vergangenen Moment.", "Die Verantwortung für alles, was passiert ist."],
      feedback: "Genau. Nutze deinen Anteil und lass Unveränderbares dort, wo es ist.",
    },
    recall: {
      prompt: "Welcher Cue führt deine nächste Reaktion nach dem Fehler?",
      application: "Eine Information bleibt. Der unveränderbare Rest bekommt keine weitere Aufgabe.",
    },
    journal: {
      title: "Was war Korrektur, was war Protest?",
      intro: "Teile eine Fehlerszene in beeinflussbar und nicht mehr beeinflussbar.",
      questions: [
        { prompt: "Welche Information aus deinem Anteil war brauchbar?", placeholder: "Was kannst du künftig verändern?" },
        { prompt: "Wogegen hast du zusätzlich protestiert?", placeholder: "Was war bereits vorbei oder nicht bei dir?" },
        { prompt: "Welche nächste Handlung folgt aus der Information?", placeholder: "Formuliere eine konkrete Korrektur." },
      ],
    },
  },
  {
    day: 39,
    toolId: "W5",
    stage: "Vertiefung",
    title: "Lass den ersten Satz nicht die Korrektur bestimmen",
    purpose: "Du erkennst den ersten Gedanken nach einem Fehler und wählst danach die brauchbare Information.",
    science: [
      "Der erste Gedanke nach einem Fehler ist oft ein Urteil, keine Korrektur.",
      "Sätze wie ‚Ich kann das nicht‘ oder ‚Jetzt ist alles weg‘ ziehen deine Aufmerksamkeit auf Bedeutung und Ausgang.",
      "Wenn du den Satz als Gedanken erkennst, kannst du danach sachlicher prüfen, welche Information der Fehler wirklich enthält.",
    ],
    mission: {
      title: "Gedanke erkennen, Information wählen",
      trigger: "Wenn nach einem Fehler sofort ein harter oder endgültiger innerer Satz auftaucht.",
      steps: [
        "Benenne den ersten Satz als Gedanken.",
        "Frag, welche Information im Fehler tatsächlich steckt.",
        "Wähle danach deine nächste Handlung.",
      ],
      why: "Heute führt der Umgang mit dem Gedanken. Das Fehlerwerkzeug liefert danach die sachliche Korrektur.",
    },
    check: {
      prompt: "Was ist der Unterschied zwischen Urteil und Fehlerinformation?",
      correct: "Das Urteil bewertet mich oder den Ausgang; die Information zeigt eine mögliche Korrektur.",
      wrong: ["Es gibt keinen Unterschied.", "Die Information ist immer positiv formuliert."],
      feedback: "Richtig. Urteil macht Bedeutung; Information hilft bei der Handlung.",
    },
    recall: {
      prompt: "Welcher Cue erinnert dich daran, dem ersten Satz nicht automatisch zu folgen?",
      application: "Erkenne den Satz. Danach holst du genau eine sachliche Information aus dem Fehler.",
    },
    journal: {
      title: "Was war Gedanke, was war Information?",
      intro: "Geh eine Fehlerszene in dieser Reihenfolge durch.",
      questions: [
        { prompt: "Welcher erste Satz tauchte nach dem Fehler auf?", placeholder: "Schreib ihn direkt auf." },
        { prompt: "Welche sachliche Information enthielt der Fehler?", placeholder: "Was war wirklich korrigierbar?" },
        { prompt: "Welche Handlung folgte aus der Information statt aus dem Urteil?", placeholder: "Was hast du getan oder willst du tun?" },
      ],
    },
  },
  {
    day: 40,
    toolId: "W6",
    stage: "Vertiefung",
    title: "Wähle die Herausforderung nach ihrem Nutzen",
    purpose: "Du prüfst eine schwierige Handlung nach Aufgaben- und Lernwert statt nach Show oder Beweis.",
    science: [
      "Eine schwierige Handlung ist nicht automatisch wertvoll.",
      "Sie kann der Aufgabe dienen, einen sinnvollen Lernreiz bieten oder nur spektakulär wirken. Ebenso kann eine einfache Handlung genau die richtige Qualität haben.",
      "Heute wählst du Schwierigkeit nicht als Mutbeweis, sondern nach ihrem konkreten Nutzen.",
    ],
    mission: {
      title: "Nutzen vor Show prüfen",
      trigger: "Wenn du zwischen einer sicheren Standardhandlung und einer schwierigeren Möglichkeit entscheidest.",
      steps: [
        "Prüfe, was die Aufgabe braucht.",
        "Prüfe Sicherheit und Lernwert der schwierigeren Möglichkeit.",
        "Wähle die Handlung mit dem besseren Gesamtwert.",
      ],
      why: "Du musst weder Risiko suchen noch Schwierigkeit meiden. Die Aufgabe entscheidet mit.",
    },
    check: {
      prompt: "Wann ist die schwierigere Handlung die bessere Wahl?",
      correct: "Wenn sie sicher ist und der Aufgabe oder dem Lernen mehr dient.",
      wrong: ["Immer, weil Schwierigkeit automatisch Wachstum bedeutet.", "Wenn sie mich besonders mutig aussehen lässt."],
      feedback: "Genau. Schwierigkeit bekommt ihren Wert durch Aufgabe, Sicherheit und Lernen.",
    },
    recall: {
      prompt: "Welcher Cue verhindert, dass du Schwierigkeit blind suchst oder meidest?",
      application: "Prüfe Nutzen und Sicherheit, dann wähle ohne Show- oder Schutzreflex.",
    },
    journal: {
      title: "Welchen Wert hatte die Herausforderung?",
      intro: "Prüfe eine Wahl zwischen unterschiedlich schwierigen Handlungen.",
      questions: [
        { prompt: "Zwischen welchen Handlungen hast du entschieden?", placeholder: "Beschreibe beide Möglichkeiten kurz." },
        { prompt: "Welche diente Aufgabe, Sicherheit und Lernen besser?", placeholder: "Begründe anhand der drei Punkte." },
        { prompt: "Welche Rolle spielten Show oder Schutz?", placeholder: "Wenn keine: schreib das ehrlich." },
      ],
    },
  },
  {
    day: 41,
    toolId: "W7",
    stage: "Vertiefung",
    title: "Wenn Belastung sich stapelt, öffne den Blick",
    purpose: "Du merkst aufgestapelte Belastung, nimmst wieder mehr von der Situation wahr und findest eine mögliche Handlung.",
    science: [
      "Mehrere kleine Belastungen können deinen Blick immer enger machen.",
      "Fehler, Müdigkeit oder Spannung stapeln sich. Dann siehst du oft fast nur noch das, was zusätzlich nicht funktioniert.",
      "Du redest nichts schön. Du nimmst wieder Funktionierendes, Hilfe und Möglichkeiten wahr und nutzt davon einen Punkt.",
    ],
    mission: {
      title: "Belastung merken, Bild öffnen, handeln",
      trigger: "Wenn mehrere Belastungen deinen Blick zunehmend eng und deine Handlung unklar machen.",
      steps: [
        "Merk, was sich gerade aufgestapelt hat.",
        "Nimm das Problem und weitere reale Informationen gemeinsam wahr.",
        "Wähle daraus eine kleine Handlung in deinem Einfluss.",
      ],
      why: "Ein vollständigerer Blick gibt dir wieder mehr Möglichkeiten für die nächste Handlung.",
    },
    check: {
      prompt: "Mehrere Belastungen stapeln sich und du siehst nur noch Probleme. Was hilft?",
      correct: "Weitere reale Informationen aufnehmen und daraus eine mögliche Handlung wählen.",
      wrong: ["Die Probleme positiv umdeuten.", "Warten, bis jede Belastung verschwunden ist."],
      feedback: "Richtig. Du redest nichts schön, sondern machst dein Bild wieder vollständiger.",
    },
    recall: {
      prompt: "Welcher Cue führt, bevor du deinen Einfluss prüfst?",
      application: "Öffne zuerst den Blick. Nutze danach die Einflussfrage für genau eine Handlung.",
    },
    journal: {
      title: "Was gab mir wieder mehr Überblick?",
      intro: "Geh eine Szene durch, in der mehrere Belastungen zusammenkamen.",
      questions: [
        { prompt: "Welche Belastungen hatten sich aufgestapelt?", placeholder: "Nenne die wichtigsten Punkte." },
        { prompt: "Was war trotz allem noch funktionierend, hilfreich oder möglich?", placeholder: "Nenne zwei reale Informationen." },
        { prompt: "Welche kleine Handlung lag danach in deinem Einfluss?", placeholder: "Beschreibe den nächsten Schritt." },
      ],
    },
  },
  {
    day: 42,
    toolId: "W4",
    stage: "Integration",
    title: "Finde die Stelle, an der du festhängst",
    purpose: "Du erkennst, wo du festhängst, und wählst genau ein bekanntes Werkzeug für die nächste Handlung.",
    science: [
      "Nach einer Situation kannst du an unterschiedlichen Stellen festhängen.",
      "Vielleicht ist deine Aufmerksamkeit weg, du kämpfst gegen das Geschehene oder ein Gedanke übernimmt. Du brauchst nicht alle Werkzeuge gleichzeitig.",
      "Erkenne zuerst die Stelle. Wähle dann genau ein Werkzeug und die passende nächste Handlung.",
    ],
    mission: {
      title: "Festhängen erkennen, ein Werkzeug wählen",
      trigger: "Denk an eine konkrete Szene, in der mehrere innere Reaktionen nacheinander auftraten.",
      steps: [
        "Finde die Stelle, an der du festhingst.",
        "Ordne genau ein passendes Werkzeug zu.",
        "Formuliere die daraus folgende Handlung.",
      ],
      why: "Du musst nicht alles gleichzeitig bearbeiten. Du wählst den Schritt, der jetzt wirklich weiterhilft.",
    },
    check: {
      prompt: "Die Entscheidung ist gefallen, aber du kämpfst innerlich weiter dagegen. Was hilft jetzt?",
      correct: "Ich frage, was ich jetzt beeinflussen kann, und handle dort weiter.",
      wrong: ["Ich löse alle sieben Werkzeuge gleichzeitig.", "Ich spiele die Entscheidung weiter im Kopf durch."],
      feedback: "Genau. Erkenne, wo du festhängst, und nutze dort ein passendes Werkzeug.",
    },
    recall: {
      prompt: "Welche Frage führt heute deine Werkzeugauswahl?",
      application: "Frag zuerst, was du jetzt beeinflussen kannst. Ordne dann ein passendes Werkzeug zu.",
    },
    journal: {
      title: "Wo hing ich fest?",
      intro: "Geh eine Szene als kurzen Ablauf durch und wähle nur ein Werkzeug.",
      questions: [
        { prompt: "An welcher Stelle bist du festgehangen?", placeholder: "Aufmerksamkeit, Urteil, Widerstand, enger Blick oder Unsicherheit." },
        { prompt: "Welches eine Werkzeug passte dort am besten?", placeholder: "Nenne Cue und kurze Begründung." },
        { prompt: "Welche Handlung folgt aus dieser Wahl?", placeholder: "Formuliere den nächsten konkreten Schritt." },
      ],
    },
    integrationTools: [
      { id: "W1", cue: "Nächste Aktion.", use: "Wenn deine Aufmerksamkeit weg ist." },
      { id: "W2", cue: "Was braucht die Aufgabe?", use: "Wenn die benötigte Qualität unklar ist." },
      { id: "W3", cue: "Passiert. Lernen. Weiter.", use: "Wenn du einen Fehler nutzen willst." },
      { id: "W4", cue: "Was kann ich jetzt beeinflussen?", use: "Wenn du an Unveränderbarem festhängst." },
      { id: "W5", cue: "Gedanken und Gefühle sind keine Befehle.", use: "Wenn ein innerer Impuls deine Handlung übernehmen will." },
      { id: "W6", cue: "Prüfen. Dann ausprobieren.", use: "Wenn eine passende Handlung unsicher wirkt." },
      { id: "W7", cue: "Was ist außerdem da?", use: "Wenn dein Blick enger ist als die Situation." },
    ],
  },
  {
    day: 43,
    toolId: "W1",
    stage: "Rückkehr",
    title: "Ruf den Anker ohne Erklärung ab",
    purpose: "Du erkennst kleines Wegdriften und holst den bekannten Cue mit möglichst wenig Hilfe zurück.",
    science: [
      "Ein Werkzeug wird nützlich, wenn es vor der Erklärung verfügbar ist.",
      "Du brauchst nicht jedes Mal die ganze Erklärung. Entscheidend ist, ob du das Wegdriften erkennst, den Cue erinnerst und eine nächste Aktion findest.",
      "Heute wird deshalb weniger erklärt und mehr selbst abgerufen.",
    ],
    mission: {
      title: "Wegdriften, Cue, Aktion",
      trigger: "Beim ersten kleinen Zeichen, dass deine Aufmerksamkeit nicht mehr vollständig bei der Aufgabe ist.",
      steps: [
        "Erkenne das erste Zeichen des Wegdriftens.",
        "Ruf deinen Cue selbst ab.",
        "Benenne und beginne die nächste Aktion.",
      ],
      why: "Weniger Erklärung hält den Weg zwischen Erkennen und Handeln kurz.",
    },
    check: {
      prompt: "Du merkst ein kleines Wegdriften. Was tust du heute?",
      correct: "Ich erinnere meinen Cue selbst und beginne die nächste Aktion.",
      wrong: ["Ich kann den Science Bite Wort für Wort wiederholen.", "Ich schweife nie mehr ab."],
      feedback: "Genau. Entscheidend ist, dass du den bekannten Rückweg selbst findest und nutzt.",
    },
    recall: {
      prompt: "Schreib deinen Fokusanker aus dem Gedächtnis auf.",
      application: "Prüfe danach nur kurz und nutze ihn beim ersten Zeichen des Wegdriftens.",
    },
    journal: {
      title: "Wie selbstständig war meine Rückkehr?",
      intro: "Bewerte nicht deine Person, sondern den heutigen Zugriff auf das Werkzeug.",
      questions: [
        { prompt: "Welches erste Zeichen des Wegdriftens hast du erkannt?", placeholder: "Blick, Gedanke, Körper oder Verhalten." },
        { prompt: "Wie leicht kam der Cue zurück?", placeholder: "Sofort, mit Nachdenken oder erst nach dem Anzeigen." },
        { prompt: "Welche nächste Aktion hast du daraus gemacht?", placeholder: "Beschreibe die Handlung." },
      ],
    },
  },
  {
    day: 44,
    toolId: "W2",
    stage: "Rückkehr",
    title: "Zeig Qualität ohne Selbstbeweis",
    purpose: "Du hältst die Qualität hoch und handelst ruhig, ohne daraus einen Test deiner Person zu machen.",
    science: [
      "Hohe Qualität braucht keine ständige Aussage über dich.",
      "Du kannst präzise, mutig oder diszipliniert handeln, weil die Aufgabe es braucht. Sobald jede Handlung zugleich deinen Wert beweisen soll, entsteht zusätzlicher Druck.",
      "Heute bleibt der Anspruch hoch. Du brauchst dafür keine Show, keine extra Härte und keinen neuen Beweis.",
    ],
    mission: {
      title: "Anspruch an die Aufgabe binden",
      trigger: "Wenn eine wichtige Handlung zugleich wie ein Test deiner Person wirkt.",
      steps: [
        "Erinnere die Aufgabenfrage.",
        "Wähle die nötige Qualität.",
        "Führe sie ruhig und klar aus, ohne daraus einen Wertbeweis zu machen.",
      ],
      why: "Du schützt nicht dein Bild und senkst nicht deinen Anspruch. Du trennst beides.",
    },
    check: {
      prompt: "Was soll heute hoch bleiben?",
      correct: "Die Qualität meiner Handlung – ohne dass sie meinen Wert beweisen muss.",
      wrong: ["Der Druck, mich durch jede Handlung zu definieren.", "Meine ständige Selbstbeobachtung."],
      feedback: "Richtig. Hoher Anspruch bleibt, persönlicher Beweisdruck wird nicht gebraucht.",
    },
    recall: {
      prompt: "Welche bekannte Frage richtet hohen Anspruch wieder auf die Aufgabe?",
      application: "Wähle eine Qualität und lass sie in der Handlung sichtbar werden.",
    },
    journal: {
      title: "Wo wurde Qualität zum Selbsttest?",
      intro: "Prüfe eine wichtige Handlung und trenne Anspruch von persönlicher Bewertung.",
      questions: [
        { prompt: "Welche Handlung fühlte sich heute wie ein Test deiner Person an?", placeholder: "Beschreibe die Szene." },
        { prompt: "Welche Qualität brauchte die Aufgabe unabhängig davon?", placeholder: "Nenne eine Qualität." },
        { prompt: "Wie sah die Handlung ohne zusätzlichen Selbstbeweis aus?", placeholder: "Beschreibe den Unterschied." },
      ],
    },
  },
  {
    day: 45,
    toolId: "W3",
    stage: "Rückkehr",
    title: "Trenne Fehler und Urteil über dich",
    purpose: "Du rufst die Fehlerkette ab und lässt eine misslungene Handlung nicht zur Aussage über dich werden.",
    science: [
      "Eine Handlung kann misslingen, ohne deine Person zusammenzufassen.",
      "Du kennst diese Trennung bereits. Jetzt stellst du sie in einer konkreten Szene selbst her: Fehler beschreiben, Information wählen, weiterhandeln.",
      "Der Zugriff zählt mehr als eine perfekte Erklärung.",
    ],
    mission: {
      title: "Fakt, Information, nächste Handlung",
      trigger: "Nach einem Fehler, der sich sofort persönlich anfühlt.",
      steps: [
        "Beschreibe den Fehler als Fakt.",
        "Wähle eine brauchbare Information statt eines Urteils über dich.",
        "Setze die nächste passende Handlung.",
      ],
      why: "Du nutzt den Fehler vollständig, ohne mehr aus ihm zu machen, als er zeigt.",
    },
    check: {
      prompt: "Welche Aussage ist eine Fehlerinformation statt eines Urteils über dich?",
      correct: "Ich habe zu spät entschieden und will beim nächsten Mal früher schauen.",
      wrong: ["Ich bin einfach nicht gut genug.", "Solche Fehler zeigen, wer ich wirklich bin."],
      feedback: "Genau. Die Information beschreibt Handlung und Korrektur, nicht deine ganze Person.",
    },
    recall: {
      prompt: "Schreib deinen Fehleranker aus dem Gedächtnis auf.",
      application: "Nutze ihn kurz und gehe direkt zu einer sachlichen Korrektur.",
    },
    journal: {
      title: "Habe ich Information und Urteil getrennt?",
      intro: "Geh eine Fehlerszene ohne lange Theorie durch.",
      questions: [
        { prompt: "Was war der Fehler als reiner Fakt?", placeholder: "Beschreibe die Handlung." },
        { prompt: "Welches persönliche Urteil wollte dein Kopf daraus machen?", placeholder: "Schreib den inneren Satz auf." },
        { prompt: "Welche Information und nächste Handlung blieben übrig?", placeholder: "Eine Information, eine Handlung." },
      ],
    },
  },
  {
    day: 46,
    toolId: "W4",
    stage: "Rückkehr",
    title: "Hol deine Energie zu dem zurück, was du tun kannst",
    purpose: "Du erkennst den inneren Kampf gegen die Realität und nutzt selbstständig, was du noch beeinflussen kannst.",
    science: [
      "Akzeptanz wird praktisch, wenn Aufmerksamkeit wieder verfügbar wird.",
      "Du musst nichts gut finden. Entscheidend ist, ob dein Kopf weiter Kraft an eine unveränderbare Realität bindet oder eine mögliche Handlung aufnimmt.",
      "Heute rufst du diese Bewegung mit möglichst wenig Hilfe ab.",
    ],
    mission: {
      title: "Inneren Kampf merken, Einfluss nutzen",
      trigger: "Wenn du erneut gegen etwas innerlich ankämpfst, das bereits feststeht.",
      steps: [
        "Erkenne den wiederholten inneren Kampf.",
        "Ruf deine Einflussfrage ab.",
        "Handle an einem verfügbaren Punkt weiter.",
      ],
      why: "Du misst Erfolg nicht daran, ob der Ärger weg ist, sondern ob Handlung wieder möglich wird.",
    },
    check: {
      prompt: "Woran erkennst du heute hilfreiche Akzeptanz?",
      correct: "Ich sehe die Realität und kann meine Energie wieder auf eine mögliche Handlung richten.",
      wrong: ["Ich fühle gar keinen Ärger mehr.", "Ich finde die Situation plötzlich gut."],
      feedback: "Richtig. Das Gefühl darf bleiben; Aufmerksamkeit und Handlung werden wieder verfügbar.",
    },
    recall: {
      prompt: "Welche Frage holt dich zu dem zurück, was du noch tun kannst?",
      application: "Wähle danach genau einen Punkt, an dem du wirklich handeln kannst.",
    },
    journal: {
      title: "Wo wurde Handlung wieder möglich?",
      intro: "Prüfe eine Situation, die du nicht gut finden musstest.",
      questions: [
        { prompt: "Gegen welche feststehende Realität hast du weiter angekämpft?", placeholder: "Benenne den Fakt." },
        { prompt: "Was konntest du trotzdem noch tun?", placeholder: "Nenne eine mögliche Handlung." },
        { prompt: "Welche Handlung wurde dadurch wieder möglich?", placeholder: "Was hast du getan oder willst du tun?" },
      ],
    },
  },
  {
    day: 47,
    toolId: "W5",
    stage: "Rückkehr",
    title: "Lass einen lauten Satz da sein, ohne ihm zu folgen",
    purpose: "Du rufst das Gedankenwerkzeug selbst ab, ohne den Gedanken zu bekämpfen oder zu ersetzen.",
    science: [
      "Ein Gedanke kann laut sein und trotzdem nur ein Gedanke bleiben.",
      "Wenn du ihn bekämpfst, bekommt er oft noch mehr Aufmerksamkeit. Wenn du ihm automatisch folgst, bestimmt er deine Handlung.",
      "Heute übst du die Mitte: bemerken, nicht diskutieren, bewusst handeln.",
    ],
    mission: {
      title: "Bemerken, stehen lassen, entscheiden",
      trigger: "Wenn ein innerer Satz wiederholt, hart oder besonders überzeugend auftaucht.",
      steps: [
        "Benenne den Satz als Gedanken.",
        "Lass ihn da, ohne ihn zu widerlegen oder zu befolgen.",
        "Wähle deine Handlung nach der Aufgabe.",
      ],
      why: "Stabilität bedeutet nicht Gedankenfreiheit. Sie bedeutet mehr Wahl in der Handlung.",
    },
    check: {
      prompt: "Was tust du mit einem lauten inneren Satz?",
      correct: "Ich bemerke ihn, diskutiere nicht lange und entscheide meine Handlung bewusst.",
      wrong: ["Ich muss ihn sofort positiv ersetzen.", "Ich folge ihm, weil er sich überzeugend anfühlt."],
      feedback: "Genau. Lautstärke ist kein Befehl und keine automatische Wahrheit.",
    },
    recall: {
      prompt: "Schreib den bekannten Cue für Gedanken und Gefühle auf.",
      application: "Nutze ihn kurz. Danach entscheidet die Aufgabe über deine Handlung.",
    },
    journal: {
      title: "Wie viel Macht bekam der Satz?",
      intro: "Geh eine Szene mit einem lauten inneren Satz durch.",
      questions: [
        { prompt: "Welcher Satz war heute besonders laut oder überzeugend?", placeholder: "Schreib ihn direkt auf." },
        { prompt: "Wolltest du ihn bekämpfen oder ihm folgen?", placeholder: "Welche automatische Reaktion war da?" },
        { prompt: "Welche Handlung hast du bewusst gewählt?", placeholder: "Was passte besser zur Aufgabe?" },
      ],
    },
  },
  {
    day: 48,
    toolId: "W6",
    stage: "Rückkehr",
    title: "Nutze Schwierigkeit als Information",
    purpose: "Du prüfst, ob dir Vorbereitung fehlt, der Versuch zu groß ist oder der nächste Schritt gut passt.",
    science: [
      "Schwierigkeit ist weder automatisch Gefahr noch automatisch Wachstum.",
      "Sie kann zeigen, dass Vorbereitung fehlt, der Versuch zu groß ist oder gerade eine passende Lernchance entsteht.",
      "Das Werkzeug hilft dir, diese Information zu prüfen und einen passenden nächsten Schritt zu wählen.",
    ],
    mission: {
      title: "Schwierigkeit lesen und Versuch wählen",
      trigger: "Wenn eine Handlung schwerer läuft als erwartet.",
      steps: [
        "Prüfe, was die Schwierigkeit konkret zeigt.",
        "Passe Vorbereitung oder Größe des Versuchs an.",
        "Wähle den nächsten sicheren und sinnvollen Schritt.",
      ],
      why: "Du bewertest Schwierigkeit nicht pauschal. Du nutzt sie als Information für deine Entscheidung.",
    },
    check: {
      prompt: "Eine Handlung ist deutlich schwerer als erwartet. Was tust du?",
      correct: "Ich prüfe Vorbereitung und Größe und passe den nächsten Versuch an.",
      wrong: ["Immer Gefahr.", "Immer automatisch Wachstum."],
      feedback: "Richtig. Schwierigkeit wird geprüft, nicht pauschal umgedeutet.",
    },
    recall: {
      prompt: "Welcher Cue hilft dir, Schwierigkeit erst zu prüfen?",
      application: "Nutze die Information, um den nächsten Versuch passend zu wählen.",
    },
    journal: {
      title: "Was zeigte mir die Schwierigkeit?",
      intro: "Prüfe eine schwierige Handlung anhand der Situation.",
      questions: [
        { prompt: "Was war heute schwieriger als erwartet?", placeholder: "Beschreibe die konkrete Handlung." },
        { prompt: "Was zeigte die Schwierigkeit über Vorbereitung oder Größe?", placeholder: "Welche Information war brauchbar?" },
        { prompt: "Wie sah der passende nächste Schritt aus?", placeholder: "Anpassen, vorbereiten, versuchen oder lassen." },
      ],
    },
  },
  {
    day: 49,
    toolId: "W7",
    stage: "Rückkehr",
    title: "Öffne deinen Blick ohne besonderen Anlass",
    purpose: "Du nutzt das Werkzeug auch bei einem normalen Tag, bevor ein Problem deinen Blick vollständig verengt.",
    science: [
      "Du kannst ein Werkzeug auch außerhalb eines Notfalls bewusst abrufen.",
      "Auch an einem normalen Tag filtert Aufmerksamkeit: Manche Dinge fallen auf, andere verschwinden im Hintergrund.",
      "Heute öffnest du den Blick ohne erzwungene Positivität und erkennst, was außerdem real vorhanden ist.",
    ],
    mission: {
      title: "Normales Bild vervollständigen",
      trigger: "Wähle einen gewöhnlichen Moment ohne großes Problem.",
      steps: [
        "Benenne, worauf dein Blick zuerst gerichtet war.",
        "Ruf die Blicköffner-Frage selbst ab.",
        "Nimm zwei weitere reale Informationen wahr.",
      ],
      why: "Du trainierst breitere Wahrnehmung, ohne erst auf starke Belastung zu warten.",
    },
    check: {
      prompt: "Warum übst du den Blicköffner an einem normalen Tag?",
      correct: "Damit das Werkzeug nicht nur mit Krisen oder Problemen verbunden ist.",
      wrong: ["Damit ich ständig positive Dinge aufzähle.", "Weil normale Situationen keine Probleme enthalten dürfen."],
      feedback: "Genau. Breitere Wahrnehmung darf auch ohne starken negativen Anlass entstehen.",
    },
    recall: {
      prompt: "Welche Frage vervollständigt dein Bild auch ohne großes Problem?",
      application: "Nutze sie einmal bewusst in einem gewöhnlichen Moment.",
    },
    journal: {
      title: "Was war an einem normalen Moment außerdem da?",
      intro: "Du musst nichts Besonderes oder Positives finden.",
      questions: [
        { prompt: "Welchen gewöhnlichen Moment hast du gewählt?", placeholder: "Beschreibe die Situation kurz." },
        { prompt: "Worauf war deine Aufmerksamkeit zuerst gerichtet?", placeholder: "Was stand im Vordergrund?" },
        { prompt: "Welche zwei weiteren realen Dinge hast du wahrgenommen?", placeholder: "Menschen, Möglichkeiten, Körper, Umgebung oder Funktionierendes." },
      ],
    },
  },
  {
    day: 50,
    toolId: "W1",
    stage: "Integration",
    title: "Lass den Verlauf nicht deine nächste Handlung bestimmen",
    purpose: "Du bemerkst, wenn gute oder schlechte letzte Aktionen dich mitziehen, und kehrst zu deiner nächsten Aufgabe zurück.",
    science: [
      "Eine gute oder schlechte Serie kann deinen Kopf schnell mitziehen.",
      "Dann willst du vielleicht retten, beweisen, vorsichtiger werden oder auf dem letzten Erfolg weiterreiten.",
      "Nimm den Verlauf wahr und komm zur nächsten Aktion zurück. Dort klärst du nur noch, welche Qualität sie braucht.",
    ],
    mission: {
      title: "Verlauf merken, zurückkommen, Qualität wählen",
      trigger: "Wenn mehrere gute oder schlechte Aktionen deine nächste Handlung beeinflussen wollen.",
      steps: [
        "Merk, wie der bisherige Verlauf an dir zieht.",
        "Komm mit deinem Cue zur nächsten Aktion zurück.",
        "Bestimme eine Qualität für diese Aktion und führe sie aus.",
      ],
      why: "Der Verlauf darf etwas mit dir machen. Deine nächste Handlung bekommt ihre Richtung trotzdem aus der aktuellen Aufgabe.",
    },
    check: {
      prompt: "Nach zwei Fehlern willst du nur noch sicher spielen. Was tust du?",
      correct: "Ich komme zur nächsten Aktion zurück und kläre ihre nötige Qualität.",
      wrong: ["Ich lasse die letzten Fehler meine Ausführung bestimmen.", "Ich versuche, beide Fehler sofort wiedergutzumachen."],
      feedback: "Richtig. Erst zum aktuellen Moment zurückkommen, dann die eine passende Qualität wählen.",
    },
    recall: {
      prompt: "Welcher Cue bleibt heute sichtbar, wenn Aufmerksamkeit und Qualität verbunden werden?",
      application: "Komm zurück und bestimme nur für diese Aktion die wichtigste Qualität.",
    },
    journal: {
      title: "Wie stark hat mich der Verlauf mitgezogen?",
      intro: "Geh eine Serie guter oder schlechter Aktionen bis zu deiner nächsten Handlung durch.",
      questions: [
        { prompt: "Wie hat der bisherige Verlauf an deiner nächsten Handlung gezogen?", placeholder: "Retten, beweisen, vorsichtiger werden oder etwas anderes." },
        { prompt: "Was war deine nächste Aktion und welche Qualität brauchte sie?", placeholder: "Handlung plus eine Qualität." },
        { prompt: "Wie sah die Ausführung nach der Rückkehr aus?", placeholder: "Was hast du konkret getan?" },
      ],
    },
  },
  {
    day: 52,
    toolId: "W4",
    stage: "Integration",
    title: "Sieh die Realität vollständig und nutze, was du tun kannst",
    purpose: "Du verbindest Akzeptanz und breiteren Blick zu einer klaren Handlung.",
    science: [
      "Akzeptanz ohne Überblick kann zu eng bleiben.",
      "Du kannst einen unveränderbaren Fakt anerkennen und trotzdem andere reale Informationen übersehen. Der Blicköffner ergänzt Funktionierendes, Hilfe und Möglichkeiten.",
      "Heute führt die Einflussfrage: vollständiger sehen, dann dort handeln, wo du wirklich etwas tun kannst.",
    ],
    mission: {
      title: "Fakt, ganzes Bild, Einfluss",
      trigger: "Wenn ein unveränderbarer Teil der Situation fast deine gesamte Wahrnehmung bestimmt.",
      steps: [
        "Benenne den unveränderbaren Fakt.",
        "Nimm weitere reale Informationen in das Bild auf.",
        "Nutze daraus genau einen Punkt in deinem Einfluss.",
      ],
      why: "Du redest die Realität nicht schön und bleibst trotzdem handlungsfähig.",
    },
    check: {
      prompt: "Was kommt nach dem Anerkennen des Fakts?",
      correct: "Das Bild vervollständigen und einen Punkt nutzen, den ich beeinflussen kann.",
      wrong: ["Den Fakt positiv umdeuten.", "Mich nur noch auf den unveränderbaren Teil konzentrieren."],
      feedback: "Genau. Realität anerkennen, vollständig sehen, gezielt handeln.",
    },
    recall: {
      prompt: "Welche Frage führt heute deine Handlung im vollständigen Bild?",
      application: "Öffne bei Bedarf kurz den Blick. Wähle danach einen beeinflussbaren Punkt.",
    },
    journal: {
      title: "Was blieb im ganzen Bild beeinflussbar?",
      intro: "Geh eine belastende Situation in drei klaren Schritten durch.",
      questions: [
        { prompt: "Welcher Fakt stand fest?", placeholder: "Ein nüchterner Satz." },
        { prompt: "Welche weiteren realen Informationen gehörten zur Situation?", placeholder: "Funktionierendes, Hilfe, Möglichkeit oder Kontext." },
        { prompt: "Welchen Punkt konntest du beeinflussen?", placeholder: "Nenne deine konkrete Handlung." },
      ],
    },
  },
  {
    day: 53,
    toolId: "W6",
    stage: "Integration",
    title: "Wähle eine Herausforderung, die wirklich passt",
    purpose: "Du prüfst Sicherheit, Nutzen für die Aufgabe, Lernchance und optional deinen eigenen privaten Grund.",
    science: [
      "Eine schwierige Handlung lohnt sich nicht allein, weil sie schwierig ist.",
      "Sie muss sicher und angemessen sein, der Aufgabe helfen und dir eine echte Lernchance geben.",
      "Ein eigener persönlicher Grund darf zusätzlich helfen. Du musst aber keinen großen Sinn erfinden.",
    ],
    mission: {
      title: "Drei Fragen vor dem Versuch",
      trigger: "Wenn du eine schwierige Handlung bewusst wählen oder ablehnen musst.",
      steps: [
        "Prüfe Sicherheit und passende Größe.",
        "Prüfe Aufgaben- und Lernwert.",
        "Entscheide – optional gestützt durch deinen eigenen privaten Grund.",
      ],
      why: "Du wählst Schwierigkeit weder für Show noch aus einem erfundenen persönlichen Grund.",
    },
    check: {
      prompt: "Die Handlung ist sicher und sinnvoll, aber dir fehlt ein großer persönlicher Grund. Was gilt?",
      correct: "Ich darf sie trotzdem wählen; ein persönlicher Grund ist freiwillig.",
      wrong: ["Jeder Athlet muss denselben größeren Grund haben.", "Er ersetzt Sicherheit und Aufgabenwert."],
      feedback: "Richtig. Der Grund bleibt persönlich; die sachlichen Kriterien bleiben Pflicht.",
    },
    recall: {
      prompt: "Welcher Cue führt die Prüfung einer schwierigen Handlung?",
      application: "Prüfe Sicherheit, Aufgabe und Lernen. Dein privater Grund darf unterstützen.",
    },
    journal: {
      title: "Warum war diese Herausforderung sinnvoll?",
      intro: "Prüfe eine konkrete schwierige Handlung, ohne einen großen Grund erfinden zu müssen.",
      questions: [
        { prompt: "Welche Herausforderung hast du gewählt oder abgelehnt?", placeholder: "Beschreibe die konkrete Handlung." },
        { prompt: "Wie passten Sicherheit, Aufgabe und Lernwert zusammen?", placeholder: "Prüfe die drei Punkte." },
        { prompt: "Gab es einen persönlichen Grund, der zusätzliche Richtung gab?", placeholder: "Optional und privat – ‚nein‘ ist vollständig okay." },
      ],
    },
  },
  {
    day: 54,
    toolId: "W5",
    stage: "Integration",
    title: "Warte nicht auf neue Bestätigung",
    purpose: "Du bemerkst den Wunsch nach Lob, Erfolg oder einem guten Gefühl und handelst trotzdem nach der Aufgabe.",
    science: [
      "Sicherheit muss nicht nach jeder Szene neu bestätigt werden.",
      "Dein Kopf kann trotzdem sagen: Erst noch ein Erfolg, Lob oder ein gutes Gefühl – dann kann ich sicher handeln.",
      "Dieser Satz ist kein Befehl. Prüfe die Aufgabe und handle ruhig mit dem, was du bereits kannst.",
    ],
    mission: {
      title: "Bestätigung wünschen, selbst entscheiden, handeln",
      trigger: "Wenn du vor der nächsten Handlung erst neue Bestätigung oder ein anderes Gefühl haben willst.",
      steps: [
        "Benenne, worauf dein Kopf gerade wartet.",
        "Erinnere dich: Dieser Wunsch entscheidet nicht für dich.",
        "Wähle die nächste passende Aktion und führe sie ruhig aus.",
      ],
      why: "Du musst dich nicht künstlich stark fühlen. Du wartest nur nicht auf ein neues äußeres Signal, bevor du sauber handelst.",
    },
    check: {
      prompt: "Du willst erst nach einer guten Szene wieder sicher handeln. Was tust du?",
      correct: "Ich bemerke den Wunsch und wähle meine nächste Handlung nach der Aufgabe.",
      wrong: ["Ich warte auf einen neuen Erfolg.", "Ich spiele Sicherheit für andere besonders laut vor."],
      feedback: "Genau. Du musst das Gefühl nicht erzwingen und brauchst keinen neuen Beweis für die nächste saubere Handlung.",
    },
    recall: {
      prompt: "Welcher Cue führt, bevor du zur nächsten Aktion zurückkommst?",
      application: "Erkenne den inneren Impuls, entscheide und geh dann direkt in die passende Handlung.",
    },
    journal: {
      title: "Worauf wollte ich vor meiner Handlung warten?",
      intro: "Geh eine Szene vom Wunsch nach Bestätigung bis zu deiner Entscheidung durch.",
      questions: [
        { prompt: "Auf welche neue Bestätigung wolltest du warten?", placeholder: "Erfolg, Lob, gutes Gefühl oder etwas anderes." },
        { prompt: "Was brauchte die Aufgabe auch ohne dieses Signal?", placeholder: "Nenne die passende Qualität oder Handlung." },
        { prompt: "Wie hast du ruhig und ohne neuen Beweis gehandelt?", placeholder: "Beschreibe die konkrete Aktion." },
      ],
    },
  },
  {
    day: 55,
    toolId: "W2",
    stage: "Integration",
    title: "Zeig deinen Standard durch Handlungen",
    purpose: "Du beschreibst, wie du häufiger handeln willst, statt dir ein großes Etikett zu geben.",
    science: [
      "Ein persönlicher Standard wird durch wiederholbares Verhalten klarer.",
      "Nicht ‚Ich bin immer mutig‘, sondern: Ich komme nach Fehlern zurück, prüfe Unsicherheit und handle sauber nach der Aufgabe.",
      "Solche Sätze sind konkret und geben dir eine Richtung. Sie bewerten weder deinen Wert noch versprechen sie perfekte Veränderung.",
    ],
    mission: {
      title: "Standard als Verhalten formulieren",
      trigger: "Denk an mehrere Situationen, in denen du bewusst mit einem Werkzeug gehandelt hast.",
      steps: [
        "Wähle zwei konkrete wiederholbare Handlungen.",
        "Benenne die gemeinsame Qualität dahinter.",
        "Formuliere deinen Standard als Handlung für die Zukunft.",
      ],
      why: "Du gibst deiner Entwicklung eine klare Richtung, ohne dich mit einer großen Aussage festzulegen.",
    },
    check: {
      prompt: "Welcher Satz beschreibt klar, wie du künftig handeln willst?",
      correct: "Nach einem Fehler hole ich eine Information und gehe in die nächste Handlung.",
      wrong: ["Ich bin jetzt mental unzerstörbar.", "Ich mache nie wieder einen Fehler."],
      feedback: "Richtig. Ein guter Standard beschreibt wiederholbares Verhalten statt eine perfekte Identität.",
    },
    recall: {
      prompt: "Welche Frage richtet deinen persönlichen Standard weiter auf die Aufgabe?",
      application: "Zeig den Standard heute in einer konkreten, beobachtbaren Handlung.",
    },
    journal: {
      title: "Wie sieht mein Standard in Handlung aus?",
      intro: "Nutze konkrete Handlungen aus dem Programm.",
      questions: [
        { prompt: "Welche zwei Handlungen willst du häufiger wiederholen?", placeholder: "Beschreibe beobachtbares Verhalten." },
        { prompt: "Welche gemeinsame Qualität steckt darin?", placeholder: "Zum Beispiel Klarheit, Mut, Geduld oder Verantwortung." },
        { prompt: "Wie lautet dein Standard als zukünftige Handlung?", placeholder: "‚Wenn …, dann tue ich …‘" },
      ],
    },
  },
  {
    day: 56,
    toolId: "SYSTEM",
    stage: "Abschluss",
    title: "Erkenne, wähle und nutze dein passendes Werkzeug",
    purpose: "Du ordnest die sieben bekannten Werkzeuge und planst, wie du sie nach dem Programm weiter nutzt.",
    science: [
      "Ein Werkzeugkasten hilft, wenn du nicht alles gleichzeitig benutzt.",
      "Du erkennst zuerst, was gerade passiert: Aufmerksamkeit weg, Aufgabenqualität unklar, Fehler, Widerstand, innerer Impuls, Unsicherheit oder enger Blick. Danach wählst du ein passendes Werkzeug und handelst.",
      "Dieser Ablauf ist keine neue achte Fähigkeit. Er ordnet nur das, was du bereits gelernt hast.",
    ],
    mission: {
      title: "Erkennen, ein Werkzeug wählen, handeln",
      trigger: "Denk an eine reale Situation, in der du zuletzt mental festgehangen hast.",
      steps: [
        "Erkenne die Art des Problems.",
        "Wähle genau ein passendes Werkzeug.",
        "Formuliere die daraus folgende Handlung.",
      ],
      why: "Der Abschluss prüft keinen perfekten Menschen. Er macht deinen Zugriff auf das System sichtbar.",
    },
    check: {
      prompt: "Was ist das Ziel des Gesamtsystems?",
      correct: "Eine Situation erkennen, ein passendes Werkzeug wählen und damit handeln.",
      wrong: ["Alle sieben Cues gleichzeitig anwenden.", "In jeder Situation gleich reagieren."],
      feedback: "Genau. Das System hilft dir bei einer passenden Auswahl, nicht bei einer Einheitsreaktion.",
    },
    recall: {
      prompt: "Welche drei Schritte ordnen deinen Werkzeugkasten?",
      application: "Erkennen. Ein Werkzeug wählen. Die passende Handlung ausführen.",
    },
    journal: {
      title: "Was will ich nach Tag 56 weiter nutzen?",
      intro: "Fasse deinen persönlichen Zugriff zusammen, ohne dich oder die Wirkung des Programms zu bewerten.",
      questions: [
        { prompt: "Welche zwei Werkzeuge fallen dir heute ohne Hilfe zuerst ein?", placeholder: "Nenne Cue und typische Situation." },
        { prompt: "Welches Werkzeug willst du nach dem Programm besonders weiter nutzen?", placeholder: "Warum passt es zu deinen häufigen Situationen?" },
        { prompt: "Wie willst du es in den nächsten Wochen konkret erinnern?", placeholder: "Nenne einen einfachen persönlichen Plan." },
      ],
    },
    integrationTools: [
      { id: "W1", cue: "Nächste Aktion.", use: "Aufmerksamkeit zur aktuellen Aufgabe zurückbringen." },
      { id: "W2", cue: "Was braucht die Aufgabe?", use: "Die nötige Qualität der Handlung klären." },
      { id: "W3", cue: "Passiert. Lernen. Weiter.", use: "Eine Fehlerinformation nutzen und weiterhandeln." },
      { id: "W4", cue: "Was kann ich jetzt beeinflussen?", use: "Unveränderbares trennen und eigenen Spielraum nutzen." },
      { id: "W5", cue: "Gedanken und Gefühle sind keine Befehle.", use: "Inneren Impuls bemerken und bewusst entscheiden." },
      { id: "W6", cue: "Prüfen. Dann ausprobieren.", use: "Unsichere Handlung sachlich prüfen und passend versuchen." },
      { id: "W7", cue: "Was ist außerdem da?", use: "Einen engen Blick mit weiteren realen Informationen öffnen." },
    ],
    measurementBoundary: {
      title: "Dein Abschluss ist ein Messpunkt, kein Urteil.",
      body: "Die Abschlussmessung kann Veränderungen und offene Fragen über den Verlauf sichtbar machen. Sie bewertet weder deinen Wert noch beweist sie allein, dass das Programm eine Veränderung verursacht hat.",
      privacy: "Private Journaltexte und freie Reflexionen bleiben außerhalb von Coach-, Team- und Wirkungszusammenfassungen.",
    },
  },
];

const completeGoldenContextCopy = (draft: GoldenDayDraft): GoldenDayDraft => {
  if (draft.day === 2) {
    return {
      ...draft,
      preTraining: {
        label: "Pre-Training",
        recallPrompt: "Welche Frage bringt dich von deiner Außenwirkung zurück zur Aufgabe?",
        reveal: draft.cue,
        application: "Wähle danach eine Qualität, die deine nächste Handlung wirklich braucht.",
      },
    };
  }
  if (draft.day === 15) {
    return {
      ...draft,
      preTraining: {
        label: "Pre-Training",
        recallPrompt: "Welche Frage öffnet deinen Blick, ohne das Problem kleinzureden?",
        reveal: draft.cue,
        application: "Nimm Problem, Funktionierendes und Möglichkeiten gemeinsam wahr.",
      },
    };
  }
  return draft;
};

export const PROGRAM_DAY_DRAFTS: GoldenDayDraft[] = [
  ...GOLDEN_DAY_DRAFTS.map(completeGoldenContextCopy),
  ...ADDITIONAL_DAY_INPUTS.map(buildProgramDay),
].sort((left, right) => left.day - right.day);

export type ProgramMissedDaySummary = {
  day: number;
  tool: string;
  cue: string;
  purpose: string;
  mechanism: string;
  formerMission: string;
  systemConnection: string;
};

const MISSED_DAY_CONNECTION: Record<ToolId, string> = {
  W1: "Der Tag stärkt deinen Rückweg zur aktuellen Aufgabe.",
  W2: "Der Tag richtet deine Handlung wieder auf die Aufgabe aus.",
  W3: "Der Tag hält Fehlerlernen und nächste Handlung zusammen.",
  W4: "Der Tag bringt deine Energie zurück zu deinem Einfluss.",
  W5: "Der Tag schafft Abstand zwischen innerem Impuls und Handlung.",
  W6: "Der Tag verbindet ehrliche Prüfung mit einem passenden Versuch.",
  W7: "Der Tag macht dein Bild vollständiger und deine Auswahl klarer.",
  SYSTEM: "Der Tag ordnet die sieben Werkzeuge für die weitere Nutzung.",
};

export const PROGRAM_DAY_MISSED_SUMMARIES: ProgramMissedDaySummary[] = PROGRAM_DAY_DRAFTS.map((draft) => ({
  day: draft.day,
  tool: draft.tool,
  cue: draft.cue,
  purpose: draft.purpose,
  mechanism: draft.scienceBite.title,
  formerMission: draft.mission.title,
  systemConnection: MISSED_DAY_CONNECTION[draft.toolId],
}));
