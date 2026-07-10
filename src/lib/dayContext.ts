import type {
  CalendarEventType,
  DailyContent,
  DailyJournal,
  DailyTask,
  MatrixDay,
  ResolvedDayContext,
} from "@/content/matrixDayTypes";

const CONTEXT_LABELS: Record<CalendarEventType, string> = {
  training: "Trainingstag",
  rest: "Ruhetag",
  competition: "Wettkampftag",
};

export type CheckinPulseMetric =
  | "mood"
  | "energy"
  | "focus"
  | "stress"
  | "recovery"
  | "sleep"
  | "physical"
  | "motivation"
  | "pressure"
  | "connection";

export const pulseQuestionsByContext: Record<
  CalendarEventType,
  Record<CheckinPulseMetric, string>
> = {
  training: {
    mood: "Wie ist deine Stimmung an diesem Trainingstag?",
    energy: "Wie viel Energie steht dir für das heutige Training zur Verfügung?",
    focus: "Wie klar und fokussiert fühlst du dich für die heutige Einheit?",
    stress: "Wie viel innere Spannung oder Stress bringst du heute ins Training mit?",
    recovery: "Wie gut fühlst du dich von der letzten Belastung erholt?",
    sleep: "Wie erholsam war dein letzter Schlaf?",
    physical: "Wie bereit und belastbar fühlt sich dein Körper für das Training an?",
    motivation: "Wie bereit bist du, dich heute auf die Einheit einzulassen?",
    pressure: "Wie viel Leistungsdruck spürst du für das heutige Training?",
    connection: "Wie verbunden fühlst du dich heute mit deinem sportlichen Umfeld?",
  },
  rest: {
    mood: "Wie ist deine Stimmung an diesem Ruhetag?",
    energy: "Wie viel Energie steht dir heute zur Verfügung?",
    focus: "Wie klar fühlt sich dein Kopf heute an?",
    stress: "Wie viel innere Spannung trägst du in diesen Ruhetag?",
    recovery: "Wie erholt fühlst du dich gerade?",
    sleep: "Wie erholsam war dein letzter Schlaf?",
    physical: "Wie erholt und belastbar fühlt sich dein Körper heute an?",
    motivation: "Wie bereit bist du für die kurze mentale Übung dieses Ruhetags?",
    pressure: "Wie viel Leistungs- oder Pflichtdruck spürst du trotz Ruhetag?",
    connection: "Wie verbunden fühlst du dich heute mit deinem sportlichen Umfeld?",
  },
  competition: {
    mood: "Wie ist deine Stimmung an diesem Wettkampftag?",
    energy: "Wie viel Energie steht dir für den Wettkampf zur Verfügung?",
    focus: "Wie klar und fokussiert fühlst du dich für den Wettkampf?",
    stress: "Wie viel innere Spannung spürst du an diesem Wettkampftag?",
    recovery: "Wie gut fühlst du dich von der letzten Belastung erholt?",
    sleep: "Wie erholsam war dein letzter Schlaf?",
    physical: "Wie bereit und belastbar fühlt sich dein Körper für den Wettkampf an?",
    motivation: "Wie bereit bist du, dich auf den Wettkampf einzulassen?",
    pressure: "Wie viel Leistungsdruck spürst du für den heutigen Wettkampf?",
    connection: "Wie verbunden fühlst du dich heute mit deinem sportlichen Umfeld?",
  },
};

const cloneTask = (task: DailyTask): DailyTask => ({
  ...task,
  reframeStep: task.reframeStep ? { ...task.reframeStep } : undefined,
  visualizationCue: task.visualizationCue ? { ...task.visualizationCue } : undefined,
  sportSpecificExamples: task.sportSpecificExamples?.map((example) => ({ ...example })),
});

const competitionText = (text: string): string =>
  text
    .replace(/im Training oder in wichtigen Situationen/gi, "im Wettkampf oder in wichtigen Situationen")
    .replace(/Trainings- oder Wettkampfszene/gi, "Wettkampfszene")
    .replace(/Training oder Wettkampf/gi, "Wettkampf")
    .replace(/Trainings- oder Wettkampfsituation/gi, "Wettkampfsituation");

const restText = (text: string): string =>
  text
    .replace(/im Training oder in wichtigen Situationen/gi, "in deinem Sport oder in wichtigen Alltagssituationen")
    .replace(/am heutigen Tag/gi, "in deinem gewählten Moment")
    .replace(/der heutige Tag/gi, "dein gewählter Moment")
    .replace(/den heutigen Tag/gi, "deinen gewählten Moment")
    .replace(/heute/gi, "dort");

const restQuestionText = (text: string): string => {
  const adapted = restText(text);
  if (/\bdort\b|gewählten Moment|\bWoche\b|dies(?:er|em) Tag/i.test(adapted)) return adapted;
  return `In deinem gewählten Moment: ${adapted}`;
};

const appendFallback = (placeholder: string | undefined, fallback: string): string =>
  [placeholder?.trim(), fallback].filter(Boolean).join(" ");

const adaptTask = (task: DailyTask, contextType: CalendarEventType): DailyTask => {
  const copy = cloneTask(task);

  if (contextType === "training") return copy;

  if (contextType === "competition") {
    return {
      ...copy,
      whenToUse:
        "Rund um den Wettkampf, sobald der beschriebene Moment auftaucht. Halte die Anwendung kurz und kehre direkt zur nächsten Aufgabe zurück.",
      concreteAction: `Nutze die kürzeste klare Version: ${competitionText(task.concreteAction)}`,
    };
  }

  const trigger = task.trigger ?? task.whenToUse;
  return {
    ...copy,
    trigger:
      `Nutze einen ähnlichen Alltagstrigger oder eine konkrete frühere Sportszene: ${trigger}`,
    whenToUse:
      "Im Alltag, während der Regeneration oder in einer kurzen mentalen Probe mit einer konkreten früheren Sportszene.",
    concreteAction: `Mentale Probe: ${task.concreteAction}`,
  };
};

const adaptTrainingJournal = (journal: DailyJournal): DailyJournal => ({
  ...journal,
  questions: journal.questions.map((question) => ({
    ...question,
    placeholder: appendFallback(
      question.placeholder,
      "Falls der Moment heute nicht vorkam, nimm eine konkrete frühere Trainingsszene.",
    ),
  })),
});

const adaptCompetitionJournal = (journal: DailyJournal): DailyJournal => ({
  journalTitle: competitionText(journal.journalTitle),
  questions: journal.questions.map((question) => ({
    ...question,
    question: competitionText(question.question),
    placeholder: appendFallback(
      question.placeholder ? competitionText(question.placeholder) : undefined,
      "Beziehe dich auf den heutigen Wettkampf. Falls der Moment nicht vorkam, nimm eine konkrete frühere Wettkampfszene.",
    ),
  })),
  gratitudeInstruction:
    "Schreibe 5 konkrete Dinge auf, für die du heute dankbar bist. Nenne mindestens 1 Sache aus der Vorbereitung, 1 aus einer schwierigen Wettkampfszene und 1 aus deinem Verhalten - unabhängig vom Ergebnis.",
  freeReflectionPrompt: journal.freeReflectionPrompt
    ? competitionText(journal.freeReflectionPrompt)
    : "Was willst du aus diesem Wettkampftag in die nächste wichtige Situation mitnehmen?",
});

const adaptRestJournal = (journal: DailyJournal): DailyJournal => ({
  journalTitle: journal.journalTitle,
  questions: journal.questions.map((question) => ({
    ...question,
    question: restQuestionText(question.question),
    placeholder: appendFallback(
      question.placeholder ? restText(question.placeholder) : undefined,
      "Nutze deinen gewählten Alltagsmoment oder die frühere Sportszene.",
    ),
  })),
  gratitudeInstruction:
    "Schreibe 5 konkrete Dinge aus diesem Ruhetag auf, für die du dankbar bist. Nenne mindestens 1 Sache aus deiner Erholung, 1 Unterstützung oder Ressource und 1 schwierigen oder erkenntnisreichen Moment.",
  freeReflectionPrompt: journal.freeReflectionPrompt
    ? restText(journal.freeReflectionPrompt)
    : "Was willst du beim nächsten Training oder Wettkampf früher erkennen und konkret tun?",
});

const buildContext = (
  content: DailyContent,
  contextType: CalendarEventType,
): ResolvedDayContext => {
  const focus = contextType === "competition"
    ? content.variants?.match
    : content.variants?.[contextType];

  if (contextType === "rest") {
    return {
      label: CONTEXT_LABELS.rest,
      focus: focus ?? "Nutze Alltagstrigger oder eine konkrete frühere Sportszene. Du musst heute keine sportliche Aktion erzeugen.",
      checkin: {
        pulseTitle: "Wie steht es heute um deine Erholung?",
        pulseDescription:
          "Schätze deinen aktuellen Zustand am Ruhetag ein. Die Skalen bleiben dieselben, damit du Veränderungen über die Zeit vergleichen kannst.",
        reflectionTitle: "Was beeinflusst deine Regeneration heute?",
        reflectionDescription:
          "Gibt es etwas, das Erholung, innere Ruhe oder Abschalten heute erleichtert oder erschwert? Deine Antwort bleibt vollständig privat.",
        journalReminder:
          "Du blickst auf Alltag, Regeneration oder eine konkrete frühere Sportszene zurück. Du musst keine Trainingsaktion erfinden.",
        taskIntro:
          "Heute musst du keine sportliche Situation herstellen. Nutze einen echten Alltagstrigger oder spiele eine konkrete frühere Szene mental durch. Markiere jede Aufgabe, sobald du ihren Ablauf verstanden hast.",
        completionMessage:
          "Die mentale Wiederholung ist gesetzt. Der Ruhetag bleibt ein Ruhetag; heute zählt klare Verknüpfung ohne zusätzlichen Leistungsdruck.",
      },
      journal: {
        intro:
          "Am Ruhetag reflektierst du keine erfundene Leistung. Wähle für alle Fragen einen echten Moment aus deinem heutigen Alltag oder eine konkrete frühere Sportszene. Die Fragen beziehen sich dann auf diesen gewählten Moment.",
      },
    };
  }

  if (contextType === "competition") {
    return {
      label: CONTEXT_LABELS.competition,
      focus: focus ?? "Halte die Anwendung kurz: Auslöser erkennen, einen klaren Cue nutzen, zurück zur nächsten Handlung.",
      checkin: {
        pulseTitle: "Wie erlebst du dich an diesem Wettkampftag?",
        pulseDescription:
          "Schätze deinen aktuellen Zustand ein. Es geht nicht darum, dich in einen perfekten Zustand zu bringen, sondern deine Ausgangslage klar zu kennen.",
        reflectionTitle: "Was wirkt heute auf deinen Wettkampfzustand?",
        reflectionDescription:
          "Gibt es etwas, das Druck, Fokus oder Bereitschaft an diesem Wettkampftag deutlich beeinflusst? Deine Antwort bleibt vollständig privat.",
        journalReminder:
          "Du reflektierst den Wettkampftag: konkreter Auslöser, automatische Reaktion, genutzter Cue und nächste Lernschleife.",
        taskIntro:
          "Lies die Aufgaben als kurze Wettkampf-Cues. Du musst im Wettkampf nicht alles gleichzeitig denken. Markiere jede Aufgabe, sobald du ihren Ablauf verstanden hast.",
        completionMessage:
          "Die Cues sind gesetzt. Im Wettkampf zählt keine perfekte innere Lage, sondern die nächste klare Handlung.",
      },
      journal: {
        intro:
          "Beziehe die Fragen auf den heutigen Wettkampf. Wenn der genaue Auslöser nicht vorkam, nutze eine konkrete frühere Wettkampfszene für den Transfer.",
      },
    };
  }

  return {
    label: CONTEXT_LABELS.training,
    focus: focus ?? "Nutze die heutige Linie in einer konkreten Wiederholung und kehre danach direkt zur Aufgabe zurück.",
    checkin: {
      pulseTitle: "Wie gehst du in den heutigen Trainingstag?",
      pulseDescription:
        "Schätze deinen aktuellen Zustand vor der Anwendung ein. Die Werte helfen dir, die heutige Aufgabe passend klein oder anspruchsvoll zu setzen.",
      reflectionTitle: "Was beeinflusst dein Training heute?",
      reflectionDescription:
        "Gibt es etwas, das deinen Zustand oder deine Lernfähigkeit im Training heute deutlich beeinflusst? Deine Antwort bleibt vollständig privat.",
      journalReminder:
        "Du reflektierst eine konkrete Trainingsszene: Auslöser, erste Reaktion, neue Handlung und das, was du wiederholen willst.",
      taskIntro:
        "Nutze die Aufgaben als drei kurze Lernschritte für reale Trainingsmomente. Markiere jede Aufgabe, sobald du ihren Ablauf verstanden hast; die Anwendung folgt in der Situation.",
      completionMessage:
        "Die Lernschritte sind gesetzt. Im Training zählt jetzt, den Auslöser früh zu erkennen und die neue Reaktion wirklich auszuführen.",
    },
    journal: {
      intro:
        "Beziehe die Fragen auf eine konkrete Trainingsszene. Wenn der genaue Auslöser heute nicht vorkam, nutze eine frühere Szene und plane die nächste Ausführung.",
    },
  };
};

export const adaptDayToContext = (
  content: DailyContent,
  _matrix: MatrixDay,
  contextType: CalendarEventType,
): { content: DailyContent; context: ResolvedDayContext } => {
  const tasks = content.tasks.map((task) => adaptTask(task, contextType)) as DailyContent["tasks"];
  const journal = contextType === "rest"
    ? adaptRestJournal(content.journal)
    : contextType === "competition"
      ? adaptCompetitionJournal(content.journal)
      : adaptTrainingJournal(content.journal);

  return {
    content: {
      ...content,
      tasks,
      journal,
      gratitudePrompt: contextType === "rest"
        ? "Welche konkrete Sache hat deiner Erholung oder deinem Blick heute gutgetan?"
        : contextType === "competition"
          ? "Was war heute unabhängig vom Ergebnis wertvoll oder hilfreich?"
          : content.gratitudePrompt,
      selfTalkAnchors: content.selfTalkAnchors.map((anchor) => ({ ...anchor })),
    },
    context: buildContext(content, contextType),
  };
};
