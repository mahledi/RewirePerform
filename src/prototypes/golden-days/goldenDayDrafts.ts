export type GoldenDayContext = "training" | "rest" | "competition";
export type GoldenDayStage = "Aufbau" | "Rückkehr" | "Vertiefung" | "Integration" | "Abschluss";

export type GoldenDayQuestion = {
  id: string;
  prompt: string;
  placeholder: string;
};

export type GoldenDayDraft = {
  day: number;
  toolId: "W1" | "W2" | "W3" | "W4" | "W5" | "W6" | "W7" | "SYSTEM";
  tool: string;
  stage: GoldenDayStage;
  context: GoldenDayContext;
  title: string;
  cue: string;
  purpose: string;
  scienceBite: {
    title: string;
    paragraphs: [string, string];
  };
  mission: {
    title: string;
    trigger: string;
    steps: [string, ...string[]];
    why: string;
  };
  comprehension: {
    prompt: string;
    options: { id: string; label: string }[];
    correctOptionId: string;
    feedback: string;
  };
  preTraining: null | {
    label: "Pre-Training" | "Pre-Wettkampf";
    recallPrompt: string;
    reveal: string;
    application: string;
  };
  journal: {
    title: string;
    intro: string;
    questions: [GoldenDayQuestion, GoldenDayQuestion, GoldenDayQuestion?];
    gratitudePrompt: string;
    gratitudeMinWords: number;
  };
  optionalDepth?: {
    title: string;
    prompt: string;
  };
  contextChange?: {
    before: GoldenDayContext;
    after: GoldenDayContext;
    message: string;
  };
  missedReviews?: {
    day: number;
    tool: string;
    cue: string;
    summary: string;
    formerMission: string;
  }[];
  measurementBoundary?: {
    title: string;
    body: string;
    privacy: string;
  };
  integrationTools?: { id: string; cue: string; use: string }[];
};

const gratitudePrompt =
  "Welche mehreren Dinge waren heute gut, hilfreich oder tragend? Schreib mindestens einen konkreten Satz.";

export const GOLDEN_DAY_DRAFTS: GoldenDayDraft[] = [
  {
    day: 1,
    toolId: "W1",
    tool: "Zurück zur Aufgabe",
    stage: "Aufbau",
    context: "training",
    title: "Zurück zur nächsten Aktion",
    cue: "Nächste Aktion.",
    purpose: "Du bemerkst, wenn dein Kopf nicht mehr bei der aktuellen Aufgabe ist, und bringst deine Aufmerksamkeit zurück.",
    scienceBite: {
      title: "Deine Aufmerksamkeit kann nicht überall gleichzeitig sein.",
      paragraphs: [
        "Wenn dein Kopf noch beim letzten Fehler, beim Ergebnis oder bei der Meinung anderer hängt, fehlt dir Aufmerksamkeit für die nächste Entscheidung.",
        "Du musst das Abschweifen nicht verhindern. Entscheidend ist, dass du es bemerkst und wieder bei der Aufgabe ankommst.",
      ],
    },
    mission: {
      title: "Drift merken und zurückkommen",
      trigger: "Sobald du merkst, dass dein Kopf nicht mehr bei der aktuellen Aktion ist.",
      steps: [
        "Merk kurz: Mein Kopf ist weg.",
        "Frag dich: Was ist jetzt meine nächste Aktion?",
        "Richte Blick und Handlung genau auf diese Aktion.",
      ],
      why: "Du trainierst keinen perfekten Fokus. Du trainierst den Rückweg, den du immer wieder nutzen kannst.",
    },
    comprehension: {
      prompt: "Du denkst nach einem Fehler noch darüber nach, wie er aussah. Was ist heute der nächste Schritt?",
      options: [
        { id: "a", label: "Den Fehler sofort vollständig analysieren." },
        { id: "b", label: "Das Abschweifen merken und die nächste Aktion finden." },
        { id: "c", label: "Warten, bis ich mich wieder konzentriert fühle." },
      ],
      correctOptionId: "b",
      feedback: "Genau. Erst merken, dann zur nächsten konkreten Aktion zurückkehren.",
    },
    preTraining: {
      label: "Pre-Training",
      recallPrompt: "Wenn dein Kopf heute weggeht: Was tust du zuerst?",
      reveal: "Ich merke es und finde meine nächste Aktion.",
      application: "Nimm den Cue mit in die Einheit: Nächste Aktion.",
    },
    journal: {
      title: "Wo kam ich heute zurück?",
      intro: "Geh eine echte Szene aus deinem Training noch einmal durch.",
      questions: [
        { id: "d1-j1", prompt: "Wann war dein Kopf heute nicht mehr bei der Aufgabe?", placeholder: "Beschreibe eine konkrete Szene." },
        { id: "d1-j2", prompt: "Woran hast du das Abschweifen zuerst gemerkt?", placeholder: "Zum Beispiel an einem Gedanken, deinem Blick oder deinem Verhalten." },
        { id: "d1-j3", prompt: "Was war danach deine nächste Aktion?", placeholder: "Schreib auf, was du tatsächlich getan hast oder beim nächsten Mal tun willst." },
      ],
      gratitudePrompt,
      gratitudeMinWords: 8,
    },
  },
  {
    day: 2,
    toolId: "W2",
    tool: "Die Aufgabe zählt",
    stage: "Aufbau",
    context: "rest",
    title: "Was braucht die Aufgabe?",
    cue: "Was braucht die Aufgabe?",
    purpose: "Du trennst die Qualität deiner Handlung von der Frage, wie du dabei wirkst.",
    scienceBite: {
      title: "Selbstbeobachtung nimmt Platz von der Aufgabe.",
      paragraphs: [
        "Wenn du stark, sicher oder fehlerfrei wirken willst, beobachtest du ständig dich selbst. Dann bleibt weniger Aufmerksamkeit für das, was die Aufgabe gerade wirklich braucht.",
        "Die Aufgabe gibt dir eine klarere Richtung: Welche Qualität ist jetzt wichtig?",
      ],
    },
    mission: {
      title: "Eine frühere Szene neu ansehen",
      trigger: "Denk an eine Sportszene, in der dir dein Eindruck wichtiger wurde als die Aufgabe.",
      steps: [
        "Hol die Szene kurz zurück.",
        "Frag: Was hätte die Aufgabe in diesem Moment gebraucht?",
        "Formuliere eine klare Handlung für eine ähnliche nächste Szene.",
      ],
      why: "Heute ist Ruhetag. Du erfindest keine Anwendung, sondern bereitest einen besseren Zugriff auf die nächste echte Situation vor.",
    },
    comprehension: {
      prompt: "Was unterscheidet dieses Werkzeug von ‚Nächste Aktion‘?",
      options: [
        { id: "a", label: "Es fragt nach der Qualität, die die Aufgabe braucht." },
        { id: "b", label: "Es soll jeden Gedanken sofort stoppen." },
        { id: "c", label: "Es bewertet, ob meine letzte Aktion gut genug war." },
      ],
      correctOptionId: "a",
      feedback: "Richtig. ‚Zurück zur Aufgabe‘ bringt deine Aufmerksamkeit zurück. ‚Die Aufgabe zählt‘ klärt, welche Qualität sie braucht.",
    },
    preTraining: null,
    journal: {
      title: "Aufgabe statt Außenwirkung",
      intro: "Bleib bei derselben früheren Szene. Du musst heute keine Sportanwendung behaupten.",
      questions: [
        { id: "d2-j1", prompt: "Womit warst du in der Szene mehr beschäftigt: mit der Aufgabe oder mit deinem Eindruck?", placeholder: "Was ging dir durch den Kopf?" },
        { id: "d2-j2", prompt: "Welche eine Qualität hätte die Aufgabe gebraucht?", placeholder: "Zum Beispiel Klarheit, Geduld, Tempo oder Kommunikation." },
      ],
      gratitudePrompt,
      gratitudeMinWords: 8,
    },
  },
  {
    day: 4,
    toolId: "W3",
    tool: "Fehler nutzen",
    stage: "Aufbau",
    context: "training",
    title: "Aus dem Fehler weiterarbeiten",
    cue: "Passiert. Lernen. Weiter.",
    purpose: "Du holst eine brauchbare Information aus einem Fehler, ohne daraus ein Urteil über dich zu machen.",
    scienceBite: {
      title: "Ein Fehler und ein Urteil sind nicht dasselbe.",
      paragraphs: [
        "Ein Fehler zeigt zuerst nur, dass etwas zu spät, ungenau oder falsch entschieden war. Dein Kopf kann daraus zusätzlich machen: Ich bin schlecht. Jetzt sehen es alle.",
        "Dieses Urteil bindet Aufmerksamkeit. Eine klare Information hilft dir dagegen bei der nächsten Handlung.",
      ],
    },
    mission: {
      title: "Eine Information, eine Korrektur",
      trigger: "Direkt nach einem Fehler oder einem misslungenen Versuch.",
      steps: [
        "Sag kurz: Passiert.",
        "Hol genau eine brauchbare Information aus dem Fehler.",
        "Nutze sie in der nächsten passenden Handlung.",
      ],
      why: "Du machst den Fehler weder klein noch persönlich. Du nutzt, was er dir für die nächste Aktion zeigt.",
    },
    comprehension: {
      prompt: "Nach einem Fehler findest du fünf mögliche Ursachen. Was passt zur heutigen Mission?",
      options: [
        { id: "a", label: "Alle fünf sofort durchdenken." },
        { id: "b", label: "Den Fehler vergessen und nichts ändern." },
        { id: "c", label: "Eine brauchbare Information wählen und weiterhandeln." },
      ],
      correctOptionId: "c",
      feedback: "Genau. Die tiefere Analyse kann später kommen. In der Situation brauchst du eine klare Korrektur.",
    },
    preTraining: {
      label: "Pre-Training",
      recallPrompt: "Wie lautet deine kurze Fehlerkette für heute?",
      reveal: "Passiert. Eine Information. Nächste Handlung.",
      application: "Im Training reicht eine klare Korrektur. Die große Analyse gehört nicht mitten in die nächste Aktion.",
    },
    contextChange: {
      before: "training",
      after: "rest",
      message: "Dein Plan wurde geändert. Das Werkzeug bleibt gleich. Statt einer erfundenen Trainingsanwendung gehst du heute eine echte frühere Fehlerszene durch.",
    },
    journal: {
      title: "Was zeigte mir der Fehler?",
      intro: "Nutze eine heutige Alltagsszene oder eine konkrete frühere Sportszene.",
      questions: [
        { id: "d4-j1", prompt: "Welchen Fehler oder misslungenen Versuch gehst du noch einmal durch?", placeholder: "Beschreibe kurz, was passiert ist." },
        { id: "d4-j2", prompt: "Welche eine Information war darin wirklich brauchbar?", placeholder: "Was konntest oder könntest du konkret ändern?" },
        { id: "d4-j3", prompt: "Wie sieht die nächste passende Handlung aus?", placeholder: "Formuliere sie so konkret wie möglich." },
      ],
      gratitudePrompt,
      gratitudeMinWords: 8,
    },
  },
  {
    day: 6,
    toolId: "W4",
    tool: "Mit dem arbeiten, was ist",
    stage: "Aufbau",
    context: "training",
    title: "Nutze, was du beeinflussen kannst",
    cue: "Was kann ich jetzt beeinflussen?",
    purpose: "Du trennst die Realität von deinem Widerstand dagegen und findest deinen verbleibenden Handlungsspielraum.",
    scienceBite: {
      title: "Innerer Widerstand kostet Aufmerksamkeit.",
      paragraphs: [
        "Etwas Unveränderbares kann real unfair, ärgerlich oder enttäuschend sein. Wenn dein Kopf weiter dagegen kämpft, bleibt weniger Aufmerksamkeit für das, was du noch tun kannst.",
        "Akzeptieren heißt hier nicht gutheißen. Es heißt: klar sehen, was feststeht, und den eigenen Spielraum wieder nutzen.",
      ],
    },
    mission: {
      title: "Fakt, Grenze, Spielraum",
      trigger: "Wenn du an etwas hängen bleibst, das du gerade nicht ändern kannst.",
      steps: [
        "Benenne nüchtern, was passiert ist.",
        "Trenne, was du jetzt nicht beeinflussen kannst.",
        "Wähle eine Sache, die du noch beeinflussen kannst.",
      ],
      why: "Du redest nichts schön. Du holst deine Energie zurück zu dem Teil, bei dem dein Handeln noch zählt.",
    },
    comprehension: {
      prompt: "Was bedeutet Akzeptieren in diesem Werkzeug?",
      options: [
        { id: "a", label: "Alles gut finden und keinen Ärger spüren." },
        { id: "b", label: "Die Realität sehen und den eigenen Spielraum nutzen." },
        { id: "c", label: "So tun, als wäre nichts passiert." },
      ],
      correctOptionId: "b",
      feedback: "Richtig. Das Ereignis bleibt real. Du entscheidest nur, wohin deine nächste Handlung geht.",
    },
    preTraining: {
      label: "Pre-Training",
      recallPrompt: "Welche Frage holt dich heute aus dem Kampf gegen Unveränderbares?",
      reveal: "Was kann ich jetzt beeinflussen?",
      application: "Nutze die Frage, sobald Bedingungen, Entscheidungen oder Verhalten anderer deinen Fokus binden.",
    },
    missedReviews: [
      {
        day: 3,
        tool: "Zurück zur Aufgabe",
        cue: "Nächste Aktion.",
        summary: "Du solltest den Rückweg selbst erinnern, sobald du bemerkst, dass dein Kopf nicht mehr bei der aktuellen Aufgabe ist.",
        formerMission: "Drift merken, nächste Aktion finden, Aufmerksamkeit zurückbringen.",
      },
      {
        day: 5,
        tool: "Die Aufgabe zählt",
        cue: "Was braucht die Aufgabe?",
        summary: "Du solltest die Qualität der Aufgabe bestimmen, statt dich an deinem Eindruck festzuhalten.",
        formerMission: "Eine klare Qualität wählen und in einer passenden Handlung zeigen.",
      },
    ],
    journal: {
      title: "Wo war heute noch Spielraum?",
      intro: "Geh eine Szene durch, in der du gegen etwas Unveränderbares angekämpft hast.",
      questions: [
        { id: "d6-j1", prompt: "Was war in dieser Szene der nüchterne Fakt?", placeholder: "Nur das, was tatsächlich passiert ist." },
        { id: "d6-j2", prompt: "Was konntest du nicht mehr beeinflussen?", placeholder: "Zieh eine klare Grenze." },
        { id: "d6-j3", prompt: "Welche Handlung lag trotzdem noch bei dir?", placeholder: "Was hast du getan oder würdest du beim nächsten Mal tun?" },
      ],
      gratitudePrompt,
      gratitudeMinWords: 8,
    },
  },
  {
    day: 8,
    toolId: "W5",
    tool: "Nicht automatisch folgen",
    stage: "Aufbau",
    context: "training",
    title: "Gedanken sind keine Befehle",
    cue: "Gedanken sind keine Befehle.",
    purpose: "Du bemerkst einen Gedanken oder ein Gefühl und entscheidest bewusst, wie du handelst.",
    scienceBite: {
      title: "Ein Gedanke kann laut sein, ohne recht zu haben.",
      paragraphs: [
        "Gedanken und Gefühle können Verhalten sehr schnell anschieben: zurückziehen, vermeiden, hektisch werden oder aufgeben. Dabei fühlt sich der erste Impuls oft wie die einzige Möglichkeit an.",
        "Du musst ihn nicht wegdrücken. Schon das Bemerken schafft einen kurzen Moment, in dem du wieder entscheiden kannst.",
      ],
    },
    mission: {
      title: "Bemerken, dann entscheiden",
      trigger: "Wenn ein Gedanke oder Gefühl dich sofort in eine Richtung drängt.",
      steps: [
        "Benenne kurz, was gerade da ist.",
        "Erinnere dich: Das ist kein Befehl.",
        "Wähle die Handlung, die jetzt besser zur Aufgabe passt.",
      ],
      why: "Du kämpfst nicht gegen deinen Kopf. Du lässt ihn mitreden, aber nicht automatisch entscheiden.",
    },
    comprehension: {
      prompt: "Der Gedanke ‚Lass es lieber‘ taucht auf. Was trainierst du heute?",
      options: [
        { id: "a", label: "Den Gedanken sofort durch einen positiven Satz ersetzen." },
        { id: "b", label: "Den Gedanken bemerken und die Handlung bewusst wählen." },
        { id: "c", label: "Immer das Gegenteil des Gedankens tun." },
      ],
      correctOptionId: "b",
      feedback: "Genau. Nicht jeder Gedanke ist falsch. Aber keiner muss automatisch deine Handlung bestimmen.",
    },
    preTraining: {
      label: "Pre-Training",
      recallPrompt: "Was tust du, wenn sich ein Gedanke heute wie ein Befehl anfühlt?",
      reveal: "Ich bemerke ihn. Dann entscheide ich meine Handlung.",
      application: "Dein Cue: Gedanken sind keine Befehle.",
    },
    journal: {
      title: "Wo lag heute meine Entscheidung?",
      intro: "Geh eine Szene durch, in der ein Gedanke oder Gefühl dich schnell in eine Richtung gedrängt hat.",
      questions: [
        { id: "d8-j1", prompt: "Welcher Gedanke oder welches Gefühl war zuerst da?", placeholder: "Schreib es so auf, wie du es in der Szene erlebt hast." },
        { id: "d8-j2", prompt: "Zu welcher automatischen Handlung hat es dich gedrängt?", placeholder: "Was wolltest du sofort tun oder vermeiden?" },
        { id: "d8-j3", prompt: "Wo hast du bewusst entschieden oder könntest es beim nächsten Mal tun?", placeholder: "Beschreibe die andere Handlung." },
      ],
      gratitudePrompt,
      gratitudeMinWords: 8,
    },
  },
  {
    day: 10,
    toolId: "W6",
    tool: "Unsicherheit prüfen",
    stage: "Aufbau",
    context: "competition",
    title: "Prüfen, dann ausprobieren",
    cue: "Prüfen. Dann ausprobieren.",
    purpose: "Du prüfst Unsicherheit, statt sie automatisch als Stoppsignal oder als Mutprobe zu behandeln.",
    scienceBite: {
      title: "Unsicherheit sagt noch nicht, was richtig ist.",
      paragraphs: [
        "Etwas Neues oder Sichtbares kann sich unangenehm anfühlen, obwohl es sportlich sinnvoll ist. Gleichzeitig ist nicht jedes Risiko eine gute Lernchance.",
        "Darum prüfst du kurz: Ist die Handlung sicher, erlaubt und passend zur Aufgabe? Wenn ja, kannst du sie trotz Unsicherheit versuchen.",
      ],
    },
    mission: {
      title: "Eine passende Herausforderung wählen",
      trigger: "Wenn du vor einer unsicheren, aber möglichen Handlung stehst.",
      steps: [
        "Prüfe kurz: sicher, erlaubt und passend zur Aufgabe?",
        "Wenn ja, wähle einen kontrollierten nächsten Versuch.",
      ],
      why: "Du musst weder aus Angst stoppen noch dir etwas beweisen. Du triffst eine klare sportliche Entscheidung.",
    },
    comprehension: {
      prompt: "Welche Handlung passt heute?",
      options: [
        { id: "a", label: "Jedes Risiko eingehen, damit ich mutig wirke." },
        { id: "b", label: "Bei Unsicherheit grundsätzlich nichts Neues versuchen." },
        { id: "c", label: "Sicherheit und Aufgabenwert prüfen, dann passend handeln." },
      ],
      correctOptionId: "c",
      feedback: "Richtig. Unsicherheit allein entscheidet weder für noch gegen eine Handlung.",
    },
    preTraining: {
      label: "Pre-Wettkampf",
      recallPrompt: "Welche zwei Schritte brauchst du heute bei einer unsicheren Aktion?",
      reveal: "Prüfen. Dann ausprobieren.",
      application: "Im Wettkampf bleibt es kurz: sicher und passend? Dann entscheide und geh in die Aktion.",
    },
    journal: {
      title: "Wie habe ich Unsicherheit geprüft?",
      intro: "Nutze eine konkrete Szene aus dem Wettkampf oder eine frühere Wettkampfszene.",
      questions: [
        { id: "d10-j1", prompt: "Welche unsichere Handlung stand in der Szene zur Wahl?", placeholder: "Beschreibe die Situation ohne Bewertung." },
        { id: "d10-j2", prompt: "War sie sicher, erlaubt und passend zur Aufgabe?", placeholder: "Woran konntest du das erkennen?" },
        { id: "d10-j3", prompt: "Welche Entscheidung hast du getroffen und was hast du daraus gelernt?", placeholder: "Es geht nicht darum, ob das Ergebnis perfekt war." },
      ],
      gratitudePrompt,
      gratitudeMinWords: 8,
    },
  },
  {
    day: 15,
    toolId: "W7",
    tool: "Blick öffnen",
    stage: "Aufbau",
    context: "rest",
    title: "Mehr sehen als das Problem",
    cue: "Was ist außerdem da?",
    purpose: "Du erkennst Tunnelblick und nimmst wieder mehr von der gesamten Situation wahr.",
    scienceBite: {
      title: "Dein Blick kann enger werden als die Realität.",
      paragraphs: [
        "Wenn etwas schiefläuft, richtet sich Aufmerksamkeit schnell nur noch auf Fehler, Mangel oder Gefahr. Das Problem ist dann real, aber nicht mehr das ganze Bild.",
        "Den Blick zu öffnen heißt nicht, positiv zu denken. Es heißt, zusätzlich zu sehen, was funktioniert, hilft oder noch möglich ist.",
      ],
    },
    mission: {
      title: "Das ganze Bild wiederfinden",
      trigger: "Wähle eine heutige Alltagsszene oder eine frühere Sportszene, in der dein Blick sehr eng wurde.",
      steps: [
        "Benenne das Problem, ohne es kleinzureden.",
        "Frag: Was ist außerdem da?",
        "Finde mindestens zwei konkrete Dinge, die dein erster Blick ausgelassen hat.",
      ],
      why: "Mehr Überblick gibt dir mehr Möglichkeiten für deine nächste Entscheidung.",
    },
    comprehension: {
      prompt: "Was bedeutet ‚Blick öffnen‘ heute?",
      options: [
        { id: "a", label: "Das Problem positiv umdeuten." },
        { id: "b", label: "Das Problem und weitere reale Teile der Situation sehen." },
        { id: "c", label: "Nur noch an gute Dinge denken." },
      ],
      correctOptionId: "b",
      feedback: "Genau. Das Problem bleibt Teil des Bildes, aber nicht mehr das gesamte Bild.",
    },
    preTraining: null,
    journal: {
      title: "Was war außerdem da?",
      intro: "Geh dieselbe Szene noch einmal durch und erweitere deinen ersten Blick.",
      questions: [
        { id: "d15-j1", prompt: "Worauf war dein Blick zuerst fast vollständig gerichtet?", placeholder: "Was war das Problem oder der Mangel?" },
        { id: "d15-j2", prompt: "Welche realen Dinge hast du dadurch zunächst nicht gesehen?", placeholder: "Zum Beispiel etwas Funktionierendes, Unterstützung oder eine Möglichkeit." },
      ],
      gratitudePrompt: "Welche mehreren konkreten Dinge waren heute gut, hilfreich oder tragend? Schreib mindestens einen vollständigen Satz. Du musst nichts schönreden.",
      gratitudeMinWords: 8,
    },
  },
  {
    day: 28,
    toolId: "W7",
    tool: "Blick öffnen und Werkzeuge ordnen",
    stage: "Integration",
    context: "training",
    title: "Sieben Werkzeuge. Ein klares System.",
    cue: "Was ist außerdem da?",
    purpose: "Du vervollständigst dein Werkzeugbild und erkennst, welches Werkzeug welche Aufgabe hat.",
    scienceBite: {
      title: "Erinnern wird leichter, wenn jedes Werkzeug einen klaren Platz hat.",
      paragraphs: [
        "Du hast nicht sieben Varianten derselben Idee gelernt. Manche Werkzeuge holen Aufmerksamkeit zurück. Andere helfen bei Fehlern, Unsicherheit, Gedanken oder einem engen Blick.",
        "Heute kommt nichts Neues dazu. Du ordnest, was du bereits kennst, und arbeitest danach mit einem klaren Hauptanker weiter.",
      ],
    },
    mission: {
      title: "Dein Werkzeugbild vervollständigen",
      trigger: "Denk an eine konkrete Szene, in der du zuletzt nicht klar wusstest, was dir helfen könnte.",
      steps: [
        "Frag zuerst: Was ist außerdem da?",
        "Erkenne danach, welche Art von Problem vorlag.",
        "Ordne genau ein bekanntes Werkzeug als passenden nächsten Schritt zu.",
      ],
      why: "Der Blick wird erst vollständig. Danach wird die Auswahl klarer, ohne dass mehrere Aufgaben gleichzeitig entstehen.",
    },
    comprehension: {
      prompt: "Du weißt, wo deine Aufmerksamkeit sein soll, aber nicht, welche Qualität die Aufgabe braucht. Welches Werkzeug passt?",
      options: [
        { id: "a", label: "Zurück zur Aufgabe" },
        { id: "b", label: "Die Aufgabe zählt" },
        { id: "c", label: "Blick öffnen" },
      ],
      correctOptionId: "b",
      feedback: "Richtig. ‚Zurück zur Aufgabe‘ klärt, wo deine Aufmerksamkeit sein soll. ‚Die Aufgabe zählt‘ klärt die benötigte Qualität.",
    },
    preTraining: {
      label: "Pre-Training",
      recallPrompt: "Welcher Hauptanker öffnet heute zuerst dein Werkzeugbild?",
      reveal: "Was ist außerdem da?",
      application: "Wenn du heute festhängst: Blick öffnen, Problemart erkennen, ein Werkzeug wählen.",
    },
    journal: {
      title: "Welches Werkzeug passte wirklich?",
      intro: "Du musst nicht alle sieben erklären. Geh eine reale Szene und deine Auswahl durch.",
      questions: [
        { id: "d28-j1", prompt: "Welche Szene hat deinen Blick heute eng gemacht?", placeholder: "Beschreibe nur den konkreten Moment." },
        { id: "d28-j2", prompt: "Was war außerdem Teil der Situation?", placeholder: "Was hattest du zuerst nicht gesehen?" },
        { id: "d28-j3", prompt: "Welches eine Werkzeug hätte oder hat danach am besten gepasst? Warum?", placeholder: "Nenne Werkzeug und kurze Begründung." },
      ],
      gratitudePrompt,
      gratitudeMinWords: 8,
    },
    integrationTools: [
      { id: "W1", cue: "Nächste Aktion.", use: "Wenn deine Aufmerksamkeit weg ist." },
      { id: "W2", cue: "Was braucht die Aufgabe?", use: "Wenn die benötigte Qualität unklar ist." },
      { id: "W3", cue: "Passiert. Lernen. Weiter.", use: "Wenn du einen Fehler nutzen willst." },
      { id: "W4", cue: "Was kann ich jetzt beeinflussen?", use: "Wenn du an Unveränderbarem festhängst." },
      { id: "W5", cue: "Gedanken sind keine Befehle.", use: "Wenn ein Gedanke oder Gefühl deine Handlung übernehmen will." },
      { id: "W6", cue: "Prüfen. Dann ausprobieren.", use: "Wenn eine passende Handlung unsicher wirkt." },
      { id: "W7", cue: "Was ist außerdem da?", use: "Wenn dein Blick enger ist als die Situation." },
    ],
    measurementBoundary: {
      title: "Dein Zwischenstand ist ein Messpunkt, kein Urteil.",
      body: "Die Zwischenmessung macht beobachtbare Veränderungen und offene Fragen über den Verlauf sichtbar. Sie bewertet weder deinen Wert noch beweist sie allein, wodurch eine Veränderung entstanden ist.",
      privacy: "Private Journaltexte und freie Reflexionen bleiben außerhalb dieser Zusammenfassung.",
    },
  },
  {
    day: 33,
    toolId: "W5",
    tool: "Nicht automatisch folgen",
    stage: "Vertiefung",
    context: "training",
    title: "Finde den Moment, in dem du entscheidest",
    cue: "Gedanken sind keine Befehle.",
    purpose: "Du erkennst genauer, wie aus einer Situation ein Impuls wird und wo du bewusst eingreifen kannst.",
    scienceBite: {
      title: "Automatische Reaktionen entstehen in einer Kette.",
      paragraphs: [
        "Etwas passiert. Ein Gedanke oder Gefühl taucht auf. Daraus entsteht ein Impuls, und kurz danach handelst du. Diese Schritte laufen oft so schnell, dass sie wie eine einzige Reaktion wirken.",
        "Wenn du die Schritte auseinanderhältst, findest du den Moment, in dem du nicht automatisch folgen musst.",
      ],
    },
    mission: {
      title: "Den Entscheidungsmoment finden",
      trigger: "Wenn du merkst, dass du gerade sofort reagieren, vermeiden oder aufgeben willst.",
      steps: [
        "Benenne den ersten Gedanken oder das erste Gefühl.",
        "Erkenne, zu welcher Handlung es dich drängt.",
        "Wähle bewusst, was jetzt besser zur Aufgabe passt.",
      ],
      why: "Du verlangsamst nicht die ganze Situation. Du erkennst nur den kurzen Punkt, an dem deine Entscheidung beginnt.",
    },
    comprehension: {
      prompt: "Wo liegt heute dein wichtigster Entscheidungspunkt?",
      options: [
        { id: "a", label: "Bevor die Situation überhaupt passiert." },
        { id: "b", label: "Zwischen dem inneren Impuls und meiner Handlung." },
        { id: "c", label: "Erst bei der langen Analyse am Abend." },
      ],
      correctOptionId: "b",
      feedback: "Genau. Du kannst den ersten Gedanken nicht immer wählen, aber du kannst üben, wie du danach handelst.",
    },
    preTraining: {
      label: "Pre-Training",
      recallPrompt: "Welche drei Dinge willst du heute auseinanderhalten?",
      reveal: "Gedanke oder Gefühl. Impuls. Bewusste Handlung.",
      application: "Der Cue bleibt derselbe: Gedanken sind keine Befehle.",
    },
    journal: {
      title: "Wo begann heute deine Entscheidung?",
      intro: "Geh eine Szene langsam noch einmal durch, ohne sie größer zu machen.",
      questions: [
        { id: "d33-j1", prompt: "Was ist in der Szene passiert und was tauchte zuerst in dir auf?", placeholder: "Situation plus erster Gedanke oder erstes Gefühl." },
        { id: "d33-j2", prompt: "Zu welcher automatischen Handlung hat es dich gedrängt?", placeholder: "Was wolltest du sofort tun?" },
        { id: "d33-j3", prompt: "Wo lag eine bewusste andere Entscheidung?", placeholder: "Was hast du getan oder willst du früher tun?" },
      ],
      gratitudePrompt,
      gratitudeMinWords: 8,
    },
    optionalDepth: {
      title: "Wenn du heute noch genauer hinschauen willst",
      prompt: "Woran hättest du den automatischen Impuls eine Sekunde früher erkennen können?",
    },
  },
  {
    day: 51,
    toolId: "W3",
    tool: "Fehler nutzen",
    stage: "Integration",
    context: "competition",
    title: "Fehler sehen, Gedanken lösen, weiterarbeiten",
    cue: "Passiert. Lernen. Weiter.",
    purpose: "Du verbindest Fehlerlernen mit dem bekannten Umgang mit deinem ersten inneren Satz.",
    scienceBite: {
      title: "Nach einem Fehler laufen zwei Dinge gleichzeitig.",
      paragraphs: [
        "Der Fehler enthält eine sportliche Information. Gleichzeitig kommentiert dein Kopf sofort, was der Fehler über dich, den Ausgang oder die Meinung anderer bedeuten könnte.",
        "Wenn du den Kommentar als Gedanken erkennst, bleibt mehr Platz für die Information und deine nächste Handlung.",
      ],
    },
    mission: {
      title: "Eine klare Fehlerkette",
      trigger: "Direkt nach einem Fehler, wenn zugleich ein harter innerer Satz auftaucht.",
      steps: [
        "Erkenne den inneren Satz, ohne ihm automatisch zu folgen.",
        "Hol genau eine brauchbare Information aus dem Fehler.",
        "Nutze sie in deiner nächsten passenden Handlung.",
      ],
      why: "Das bekannte Gedanken-Werkzeug hilft kurz im Hintergrund. Dein sichtbarer Hauptanker bleibt: Passiert. Lernen. Weiter.",
    },
    comprehension: {
      prompt: "Was führt heute, wenn nach einem Fehler sofort Selbstkritik auftaucht?",
      options: [
        { id: "a", label: "Fehler nutzen führt: Information holen und weiterhandeln." },
        { id: "b", label: "Der Gedanke wird vollständig durch positives Denken ersetzt." },
        { id: "c", label: "Beide Werkzeuge werden zu zwei getrennten Aufgaben." },
      ],
      correctOptionId: "a",
      feedback: "Richtig. Der Gedanke wird kurz erkannt. Die heutige Bewegung bleibt: aus dem Fehler lernen und weiterarbeiten.",
    },
    preTraining: {
      label: "Pre-Wettkampf",
      recallPrompt: "Was bleibt nach einem Fehler dein einziger sichtbarer Hauptanker?",
      reveal: "Passiert. Lernen. Weiter.",
      application: "Ein Gedanke im Hintergrund. Eine Information. Eine nächste Handlung.",
    },
    journal: {
      title: "Wie lief deine Fehlerkette?",
      intro: "Geh eine konkrete Fehlerszene aus dem Wettkampf oder einer früheren Einheit noch einmal durch.",
      questions: [
        { id: "d51-j1", prompt: "Welcher innere Satz tauchte direkt nach dem Fehler auf?", placeholder: "Schreib ihn möglichst so auf, wie er kam." },
        { id: "d51-j2", prompt: "Welche eine Information war im Fehler wirklich brauchbar?", placeholder: "Trenne Information und Urteil." },
        { id: "d51-j3", prompt: "Wie sah deine nächste Handlung aus?", placeholder: "Was hast du umgesetzt oder willst du beim nächsten Mal umsetzen?" },
      ],
      gratitudePrompt,
      gratitudeMinWords: 8,
    },
  },
];

export const getGoldenDayDraft = (day: number): GoldenDayDraft | undefined =>
  GOLDEN_DAY_DRAFTS.find((draft) => draft.day === day);
