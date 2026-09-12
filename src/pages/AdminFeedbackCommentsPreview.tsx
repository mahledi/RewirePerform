import AdminFeedbackIntelligenceComments from "@/components/admin/AdminFeedbackIntelligenceComments";
import { FEEDBACK_CHECKPOINTS, type FeedbackCheckpointDay } from "@/content/feedbackIntelligenceV1";
import type {
  AdminFeedbackCommentItem,
  AdminFeedbackCommentPage,
  getAdminFeedbackCommentPage,
} from "@/lib/adminFeedbackComments";
import type { AdminFeedbackInsights, getAdminFeedbackInsights } from "@/lib/adminFeedbackInsights";

const PREVIEW_COMMENTS: Record<FeedbackCheckpointDay, string> = {
  10: "Die Fragen waren direkt verständlich. Nach einem späten Training wäre etwas weniger Text für mich noch leichter.",
  24: "Den Satz in der Sportszene zu benutzen klappt inzwischen gut. Beim ersten Mal hätte ich nur gern schneller gewusst, wann die eigene Szene beginnt.",
  39: "Nach Fehlern merke ich häufiger, dass ich erst die Information suche. Unter richtig viel Druck brauche ich dafür manchmal noch länger.",
  55: "Die kurzen Werkzeuge kann ich im Training wirklich abrufen. Ich würde mir nach dem Programm zwei feste Wiederholungen pro Woche wünschen.",
};

const SUBJECTS: Record<FeedbackCheckpointDay, string> = {
  10: "21000000-0000-4000-8000-000000000010",
  24: "24000000-0000-4000-8000-000000000024",
  39: "39000000-0000-4000-8000-000000000039",
  55: "55000000-0000-4000-8000-000000000055",
};

const COMMENT_IDS: Record<FeedbackCheckpointDay, string> = {
  10: "11000000-0000-4000-8000-000000000010",
  24: "11000000-0000-4000-8000-000000000024",
  39: "11000000-0000-4000-8000-000000000039",
  55: "11000000-0000-4000-8000-000000000055",
};

const ACTIVITY: Record<FeedbackCheckpointDay, AdminFeedbackCommentItem["activitySnapshot"]> = {
  10: {
    programDaysAvailable: 10, programDaysCompleted: 9, checkinsCompleted: 8,
    journalEntriesCreatedCount: 4, tasksCompleted: 7, transferPulseCount: 2,
    resumeDelayBucket: "DAYS_1_3", continuationStatusBucket: "ACTIVE_OR_COMPLETED",
  },
  24: {
    programDaysAvailable: 24, programDaysCompleted: 22, checkinsCompleted: 19,
    journalEntriesCreatedCount: 11, tasksCompleted: 18, transferPulseCount: 6,
    resumeDelayBucket: "SAME_DAY", continuationStatusBucket: "ACTIVE_OR_COMPLETED",
  },
  39: {
    programDaysAvailable: 39, programDaysCompleted: 34, checkinsCompleted: 29,
    journalEntriesCreatedCount: 18, tasksCompleted: 27, transferPulseCount: 9,
    resumeDelayBucket: "DAYS_1_3", continuationStatusBucket: "ACTIVE_OR_COMPLETED",
  },
  55: {
    programDaysAvailable: 55, programDaysCompleted: 52, checkinsCompleted: 45,
    journalEntriesCreatedCount: 25, tasksCompleted: 43, transferPulseCount: 14,
    resumeDelayBucket: "SAME_DAY", continuationStatusBucket: "ACTIVE_OR_COMPLETED",
  },
};

const previewItems = ([10, 24, 39, 55] as const).map((day, index): AdminFeedbackCommentItem => {
  const checkpoint = FEEDBACK_CHECKPOINTS[day];
  const question = checkpoint.questions[index === 3 ? 1 : 0];
  const selectedOption = question.options.find(({ notScored }) => !notScored) ?? question.options[0];
  return {
    commentId: COMMENT_IDS[day],
    subjectReference: SUBJECTS[day],
    submittedAt: `2026-08-${14 - index}T${10 + index}:2${index}:00.000Z`,
    programDay: day,
    campaignReference: checkpoint.campaignReference,
    questionnaireVersion: checkpoint.questionnaireVersion,
    contentVersion: "feedback-intelligence-content-v1.1.2",
    questionId: question.id,
    questionPrompt: question.prompt,
    selectedOptionIds: [selectedOption.id],
    selectedOptionLabels: [selectedOption.label],
    comment: PREVIEW_COMMENTS[day],
    guardianRequired: day === 10 || day === 39,
    activitySnapshot: ACTIVITY[day],
  };
});

const previewPageLoader: typeof getAdminFeedbackCommentPage = (input = {}) => {
  const checkpointDay = input.checkpointDay ?? null;
  const items = checkpointDay === null
    ? previewItems
    : previewItems.filter((item) => item.programDay === checkpointDay);
  const page: AdminFeedbackCommentPage = {
    accessRequestReference: "31000000-0000-4000-8000-000000000001",
    generatedAt: "2026-08-14T14:30:00.000Z",
    dataScope: input.dataScope ?? "production",
    checkpointDay,
    returnedCount: items.length,
    hasMore: false,
    nextCursor: null,
    items,
  };
  return Promise.resolve(page);
};

const previewStructuredInsightLoader: typeof getAdminFeedbackInsights = (dataScope = "production") => {
  const questions: AdminFeedbackInsights["questions"] = ([10, 24, 39, 55] as const).flatMap((programDay) =>
    FEEDBACK_CHECKPOINTS[programDay].questions.slice(0, 2).map((question, questionIndex) => {
      const options = question.options.slice(0, 3);
      const participantCounts = questionIndex === 0 ? [6, 2, 1] : [5, 3, 2];
      return {
        programDay,
        questionId: question.id,
        questionPrompt: question.prompt,
        participants: 8,
        selections: participantCounts.reduce((sum, count) => sum + count, 0),
        sufficientData: true,
        optionDistribution: options.map((option, optionIndex) => ({
          optionId: option.id,
          optionLabel: option.label,
          participants: participantCounts[optionIndex] ?? 1,
          selections: participantCounts[optionIndex] ?? 1,
          participantRate: (participantCounts[optionIndex] ?? 1) / 8,
        })),
      };
    }),
  );
  return Promise.resolve({
    generatedAt: "2026-08-14T14:30:00.000Z",
    dataScope,
    participants: 8,
    submissions: 32,
    checkpointsWithData: 4,
    sufficientData: true,
    minimumDistinctParticipants: 5,
    questions,
  });
};

const AdminFeedbackCommentsPreview = () => (
  <div className="min-h-screen bg-background px-3 py-5 text-foreground sm:px-6 sm:py-8">
    <div className="mx-auto mb-5 max-w-6xl">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
        Interne synthetische Admin-Vorschau · keine Speicherung
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Darstellungstest ohne Supabase, echte Athleten oder Analytics.
      </p>
    </div>
    <main className="mx-auto max-w-6xl">
      <AdminFeedbackIntelligenceComments pageLoader={previewPageLoader} structuredInsightLoader={previewStructuredInsightLoader} />
    </main>
  </div>
);

export default AdminFeedbackCommentsPreview;
