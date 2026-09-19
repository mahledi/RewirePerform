import { FEEDBACK_CHECKPOINTS, type FeedbackCheckpointDay } from "@/content/feedbackIntelligenceV1";
import type { Json } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import type { AdminFeedbackDataScope } from "@/lib/adminFeedbackComments";

export interface AdminFeedbackOptionInsight {
  optionId: string;
  optionLabel: string;
  participants: number;
  selections: number;
  participantRate: number;
}

export interface AdminFeedbackQuestionInsight {
  programDay: FeedbackCheckpointDay;
  questionId: string;
  questionPrompt: string;
  participants: number;
  selections: number | null;
  sufficientData: boolean;
  optionDistribution: AdminFeedbackOptionInsight[];
}

export interface AdminFeedbackInsights {
  generatedAt: string;
  dataScope: AdminFeedbackDataScope;
  participants: number;
  submissions: number | null;
  checkpointsWithData: number | null;
  sufficientData: boolean;
  minimumDistinctParticipants: number;
  questions: AdminFeedbackQuestionInsight[];
}

export interface AdminFeedbackCheckpointHighlight {
  questionId: string;
  questionPrompt: string;
  optionLabel: string;
  participants: number;
  participantRate: number;
  tied: boolean;
}

export interface AdminFeedbackCheckpointSummary {
  programDay: FeedbackCheckpointDay;
  reportDay: 11 | 25 | 40 | 56;
  questionsEvaluated: number;
  participantsMin: number;
  participantsMax: number;
  highlights: AdminFeedbackCheckpointHighlight[];
}

export class AdminFeedbackInsightsError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "AdminFeedbackInsightsError";
  }
}

type RpcError = { code?: string; message: string };
type AdminFeedbackRpc = (
  functionName: string,
  args: Record<string, Json | undefined>,
) => Promise<{ data: Json | null; error: RpcError | null }>;

const client = supabase as unknown as { rpc: AdminFeedbackRpc };
const asObject = (value: Json | null | undefined): Record<string, Json | undefined> | null =>
  value && !Array.isArray(value) && typeof value === "object" ? value : null;
const integer = (value: Json | undefined) =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
const nullableInteger = (value: Json | undefined) => value === null ? null : integer(value);
const rate = (value: Json | undefined) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1 ? value : null;

const REPORT_DAY_BY_CHECKPOINT: Record<FeedbackCheckpointDay, AdminFeedbackCheckpointSummary["reportDay"]> = {
  10: 11,
  24: 25,
  39: 40,
  55: 56,
};

export const buildAdminFeedbackCheckpointSummaries = (
  insights: AdminFeedbackInsights,
): AdminFeedbackCheckpointSummary[] => {
  const byCheckpoint = new Map<FeedbackCheckpointDay, AdminFeedbackQuestionInsight[]>();
  for (const question of insights.questions) {
    if (!question.sufficientData || question.participants < insights.minimumDistinctParticipants) continue;
    const existing = byCheckpoint.get(question.programDay) ?? [];
    existing.push(question);
    byCheckpoint.set(question.programDay, existing);
  }

  return ([10, 24, 39, 55] as FeedbackCheckpointDay[]).flatMap((programDay) => {
    const questions = byCheckpoint.get(programDay) ?? [];
    if (questions.length === 0) return [];
    const highlights = questions.flatMap((question) => {
      const highestRate = question.optionDistribution.reduce(
        (current, option) => Math.max(current, option.participantRate),
        -1,
      );
      const leading = question.optionDistribution.filter(({ participantRate }) => participantRate === highestRate);
      return leading.length > 0 ? [{
        questionId: question.questionId,
        questionPrompt: question.questionPrompt,
        optionLabel: leading.map(({ optionLabel }) => optionLabel).join(" / "),
        participants: leading[0].participants,
        participantRate: leading[0].participantRate,
        tied: leading.length > 1,
      }] : [];
    }).sort((left, right) => right.participantRate - left.participantRate).slice(0, 3);
    const participantCounts = questions.map(({ participants }) => participants);
    return [{
      programDay,
      reportDay: REPORT_DAY_BY_CHECKPOINT[programDay],
      questionsEvaluated: questions.length,
      participantsMin: Math.min(...participantCounts),
      participantsMax: Math.max(...participantCounts),
      highlights,
    }];
  });
};

const parseInsights = (value: Json | null): AdminFeedbackInsights => {
  const payload = asObject(value);
  const summary = asObject(payload?.summary);
  const privacy = asObject(payload?.privacy);
  const participants = integer(summary?.participants);
  const submissions = nullableInteger(summary?.submissions);
  const checkpointsWithData = nullableInteger(summary?.checkpoints_with_data);
  const minimumDistinctParticipants = integer(privacy?.minimum_distinct_participants);
  const generatedAt = payload?.generated_at;
  const dataScope = payload?.data_scope;
  if (
    payload?.schema_version !== "admin-feedback-intelligence-insights-v1"
    || typeof generatedAt !== "string" || Number.isNaN(Date.parse(generatedAt))
    || (dataScope !== "production" && dataScope !== "synthetic")
    || participants === null || submissions === undefined || checkpointsWithData === undefined
    || typeof summary?.sufficient_data !== "boolean"
    || minimumDistinctParticipants === null
    || privacy?.individual_rows_included !== false
    || privacy?.raw_text_included !== false
    || privacy?.journal_or_reflection_text_included !== false
    || privacy?.names_emails_or_user_ids_included !== false
    || !Array.isArray(payload?.questions)
  ) throw new AdminFeedbackInsightsError("admin_feedback_insights_contract_drift");

  const questions = payload.questions.map((raw): AdminFeedbackQuestionInsight => {
    const item = asObject(raw);
    const day = integer(item?.program_day);
    const questionId = item?.question_id;
    if (!day || ![10, 24, 39, 55].includes(day) || typeof questionId !== "string") {
      throw new AdminFeedbackInsightsError("admin_feedback_insights_question_invalid");
    }
    const checkpoint = FEEDBACK_CHECKPOINTS[day as FeedbackCheckpointDay];
    const question = checkpoint.questions.find(({ id }) => id === questionId);
    const questionParticipants = integer(item?.participants);
    const selections = nullableInteger(item?.selections);
    if (!question || questionParticipants === null || selections === undefined
      || typeof item?.sufficient_data !== "boolean" || !Array.isArray(item.option_distribution)) {
      throw new AdminFeedbackInsightsError("admin_feedback_insights_question_drift");
    }
    const labels = new Map(question.options.map((option) => [option.id, option.label]));
    const optionDistribution = item.option_distribution.map((rawOption): AdminFeedbackOptionInsight => {
      const option = asObject(rawOption);
      const optionId = option?.option_id;
      const optionParticipants = integer(option?.participants);
      const optionSelections = integer(option?.selections);
      const participantRate = rate(option?.participant_rate);
      const optionLabel = typeof optionId === "string" ? labels.get(optionId) : undefined;
      if (typeof optionId !== "string" || !optionLabel || optionParticipants === null || optionSelections === null || participantRate === null) {
        throw new AdminFeedbackInsightsError("admin_feedback_insights_option_drift");
      }
      return { optionId, optionLabel, participants: optionParticipants, selections: optionSelections, participantRate };
    });
    return {
      programDay: day as FeedbackCheckpointDay,
      questionId,
      questionPrompt: question.prompt,
      participants: questionParticipants,
      selections,
      sufficientData: item.sufficient_data,
      optionDistribution,
    };
  });

  return {
    generatedAt,
    dataScope,
    participants,
    submissions,
    checkpointsWithData,
    sufficientData: summary.sufficient_data,
    minimumDistinctParticipants,
    questions,
  };
};

export const getAdminFeedbackInsights = async (
  dataScope: AdminFeedbackDataScope = "production",
): Promise<AdminFeedbackInsights> => {
  const { data, error } = await client.rpc("get_admin_feedback_intelligence_insights", {
    _data_scope: dataScope,
  });
  if (error) throw new AdminFeedbackInsightsError(error.code ?? "admin_feedback_insights_rpc_failed");
  return parseInsights(data);
};
