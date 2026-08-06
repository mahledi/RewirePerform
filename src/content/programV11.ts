import type {
  CalendarEventType,
  ComprehensionQuestion,
  DailyContent,
  DailyJournal,
  DailyTask,
  MatrixDay,
  ResolvedDayContext,
} from "@/content/matrixDayTypes";
import type {
  GoldenDayContext,
  GoldenDayDraft,
} from "@/prototypes/golden-days/goldenDayDrafts";
import { getContextDayJournal } from "@/prototypes/golden-days/contextDayJournals";
import { PROGRAM_DAY_DRAFTS } from "@/prototypes/golden-days/programDayDrafts";
import { getRestDayVisualization } from "@/prototypes/golden-days/restDayVisualizations";

const PROGRAM_DAY_BY_NUMBER = new Map(
  PROGRAM_DAY_DRAFTS.map((draft) => [draft.day, draft] as const),
);

const contextToGolden = (context: CalendarEventType): GoldenDayContext => context;

const getRestTransfer = (draft: GoldenDayDraft): string =>
  getRestDayVisualization(draft).phases.find((phase) => phase.id === "transfer")?.prompt
    ?? draft.mission.why;

const buildTask = (draft: GoldenDayDraft, matrix: MatrixDay): DailyTask => ({
  id: `v11-day-${draft.day}-mission`,
  title: draft.mission.title,
  why: draft.mission.why,
  detailedExplanation: draft.purpose,
  concreteAction: draft.mission.steps
    .map((step, index) => `${index + 1}. ${step}`)
    .join("\n"),
  systemFunction: matrix.systemFunction,
  whenToUse: draft.mission.trigger,
  microReframe: draft.preTraining?.application ?? draft.mission.why,
  selfTalk: draft.cue,
  reframeStep: {
    trigger: draft.mission.trigger,
    reframe: draft.mission.steps.join(" "),
    anchor: draft.cue,
  },
  icon: "target",
  trigger: draft.mission.trigger,
});

const buildJournal = (
  draft: GoldenDayDraft,
  context: CalendarEventType,
): DailyJournal => {
  const authored = getContextDayJournal(draft, contextToGolden(context));
  return {
    journalTitle: authored.title,
    questions: authored.questions.map((question) => ({
      id: question.id,
      question: question.prompt,
      placeholder: question.placeholder,
    })),
    gratitudeInstruction: authored.gratitudePrompt,
    gratitudeMinWords: authored.gratitudeMinWords,
    freeReflectionPrompt: "Möchtest du noch etwas für dich festhalten? (optional)",
  };
};

const buildComprehension = (draft: GoldenDayDraft): ComprehensionQuestion => ({
  id: `v11-day-${draft.day}-check`,
  target: "behavior",
  stem: draft.comprehension.prompt,
  options: draft.comprehension.options.map((option) => ({
    id: option.id,
    text: option.label,
  })),
  correctOptionId: draft.comprehension.correctOptionId,
  explanation: draft.comprehension.feedback,
});

const buildContext = (
  draft: GoldenDayDraft,
  context: CalendarEventType,
): ResolvedDayContext => {
  if (context === "rest") {
    const visualization = getRestDayVisualization(draft);
    return {
      label: "Ruhetag",
      focus: getRestTransfer(draft),
      checkin: {
        pulseTitle: "Wie geht es dir an diesem Ruhetag?",
        pulseDescription:
          "Dein Tages-Puls bleibt derselbe. Danach planst du deine kurze mentale Einheit.",
        reflectionTitle: "Was wirkt heute auf deinen Zustand?",
        reflectionDescription:
          "Halte nur fest, was deinen heutigen Zustand deutlich beeinflusst. Deine Antwort bleibt privat.",
        journalReminder:
          "Im Journal gehst du die heutige Vorstellung noch einmal kurz durch.",
        taskIntro:
          "Die App führt dich durch eine eigene Sportszene. Du musst nicht wissen, wie Visualisierung funktioniert.",
        completionMessage:
          "Deine mentale Einheit ist abgeschlossen. Nimm nur deinen Satz mit in den restlichen Tag.",
      },
      journal: {
        intro: visualization.journal.intro,
      },
    };
  }

  if (context === "competition") {
    return {
      label: "Wettkampftag",
      focus: draft.preTraining?.application ?? draft.mission.why,
      checkin: {
        pulseTitle: "Wie gehst du in diesen Wettkampftag?",
        pulseDescription:
          "Dein Tages-Puls zeigt deine Ausgangslage. Du musst dich nicht erst anders fühlen.",
        reflectionTitle: "Was wirkt heute auf deinen Wettkampfzustand?",
        reflectionDescription:
          "Halte nur fest, was Druck, Fokus oder Bereitschaft heute deutlich beeinflusst. Deine Antwort bleibt privat.",
        journalReminder:
          "Nach dem Wettkampf gehst du einen echten Moment mit dem heutigen Werkzeug durch.",
        taskIntro:
          "Nimm eine Mission und einen Satz mit. Im Wettkampf zählt die nächste passende Handlung.",
        completionMessage:
          "Deine Linie für den Wettkampf steht. Du musst sie nicht ständig im Kopf wiederholen.",
      },
      journal: {
        intro: getContextDayJournal(draft, "competition").intro,
      },
    };
  }

  return {
    label: "Trainingstag",
    focus: draft.preTraining?.application ?? draft.mission.why,
    checkin: {
      pulseTitle: "Wie gehst du in diesen Trainingstag?",
      pulseDescription:
        "Dein Tages-Puls zeigt deine Ausgangslage. Es geht nicht darum, einen perfekten Zustand herzustellen.",
      reflectionTitle: "Was wirkt heute auf dein Training?",
      reflectionDescription:
        "Halte nur fest, was deinen Zustand oder dein Lernen heute deutlich beeinflusst. Deine Antwort bleibt privat.",
      journalReminder:
        "Im Journal gehst du später einen echten Moment mit dem heutigen Werkzeug durch.",
      taskIntro:
        "Heute gibt es eine Mission. Die einzelnen Schritte gehören zusammen und führen zu derselben Handlung.",
      completionMessage:
        "Deine Mission steht. Vor der Einheit erinnerst du sie noch einmal aktiv.",
    },
    journal: {
      intro: getContextDayJournal(draft, "training").intro,
    },
  };
};

export const getProgramDayDraft = (dayNumber: number): GoldenDayDraft | null =>
  PROGRAM_DAY_BY_NUMBER.get(dayNumber) ?? null;

export const getProgramV11Content = (
  dayNumber: number,
  matrix: MatrixDay,
  context: CalendarEventType = "training",
): DailyContent | null => {
  const draft = getProgramDayDraft(dayNumber);
  if (!draft) return null;
  const restVisualization = getRestDayVisualization(draft);

  return {
    dayNumber,
    title: draft.title,
    lens: draft.purpose,
    scienceBite: {
      fact: [draft.scienceBite.title, ...draft.scienceBite.paragraphs].join("\n\n"),
    },
    todayTrigger: draft.mission.trigger,
    coreShift: draft.mission.steps.join(" → "),
    tasks: [buildTask(draft, matrix)],
    journal: buildJournal(draft, context),
    gratitudePrompt: draft.journal.gratitudePrompt,
    selfTalkAnchors: [{ text: draft.cue, when: draft.mission.trigger }],
    comprehensionPool: [buildComprehension(draft)],
    variants: {
      training: draft.preTraining?.application ?? draft.mission.why,
      rest: restVisualization.phases.find((phase) => phase.id === "transfer")?.prompt
        ?? draft.mission.why,
      match: draft.preTraining?.application ?? draft.mission.why,
    },
    preTraining: draft.preTraining
      ? {
          label: draft.preTraining.label,
          recallPrompt: draft.preTraining.recallPrompt,
          reveal: draft.preTraining.reveal,
          application: draft.preTraining.application,
        }
      : undefined,
  };
};

export const getProgramV11ResolvedContent = (
  dayNumber: number,
  matrix: MatrixDay,
  context: CalendarEventType,
): { content: DailyContent; context: ResolvedDayContext } | null => {
  const draft = getProgramDayDraft(dayNumber);
  const content = getProgramV11Content(dayNumber, matrix, context);
  if (!draft || !content) return null;
  return { content, context: buildContext(draft, context) };
};

export const drawProgramV11ComprehensionQuestions = (
  dayNumber: number,
): ComprehensionQuestion[] => {
  const draft = getProgramDayDraft(dayNumber);
  return draft ? [buildComprehension(draft)] : [];
};

export const PROGRAM_V11_DAY_COUNT = PROGRAM_DAY_DRAFTS.length;
export const PROGRAM_V11_DRAFTS = PROGRAM_DAY_DRAFTS;
