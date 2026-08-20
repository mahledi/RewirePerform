import { FEEDBACK_CHECKPOINTS, type FeedbackCheckpointDay } from "@/content/feedbackIntelligenceV1";
import type { Json } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";

export type AdminFeedbackDataScope = "production" | "synthetic";

export interface AdminFeedbackCommentCursor {
  submittedAt: string;
  commentId: string;
}

export interface AdminFeedbackActivitySnapshot {
  programDaysAvailable: number;
  programDaysCompleted: number;
  checkinsCompleted: number;
  journalEntriesCreatedCount: number;
  tasksCompleted: number;
  transferPulseCount: number | null;
  resumeDelayBucket: string;
  continuationStatusBucket: string;
}

export interface AdminFeedbackCommentItem {
  commentId: string;
  subjectReference: string;
  submittedAt: string;
  programDay: FeedbackCheckpointDay;
  campaignReference: string;
  questionnaireVersion: string;
  contentVersion: string;
  questionId: string;
  questionPrompt: string;
  selectedOptionIds: string[];
  selectedOptionLabels: string[];
  comment: string;
  guardianRequired: boolean;
  activitySnapshot: AdminFeedbackActivitySnapshot | null;
}

export interface AdminFeedbackCommentPage {
  accessRequestReference: string;
  generatedAt: string;
  dataScope: AdminFeedbackDataScope;
  checkpointDay: FeedbackCheckpointDay | null;
  returnedCount: number;
  hasMore: boolean;
  nextCursor: AdminFeedbackCommentCursor | null;
  items: AdminFeedbackCommentItem[];
}

export class AdminFeedbackCommentsError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "AdminFeedbackCommentsError";
  }
}

type RpcError = { code?: string; message: string };
type AdminFeedbackRpc = (
  functionName: string,
  args: Record<string, Json | undefined>,
) => Promise<{ data: Json | null; error: RpcError | null }>;

const adminFeedbackSupabase = supabase as unknown as { rpc: AdminFeedbackRpc };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CHECKPOINT_DAYS = new Set<number>([10, 24, 39, 55]);

const asObject = (value: Json | null | undefined): Record<string, Json | undefined> | null =>
  value && !Array.isArray(value) && typeof value === "object" ? value : null;

const asInteger = (value: Json | undefined, minimum = 0) =>
  typeof value === "number" && Number.isInteger(value) && value >= minimum ? value : null;

const asString = (value: Json | undefined) => typeof value === "string" ? value : null;

const parseActivity = (value: Json | undefined): AdminFeedbackActivitySnapshot | null => {
  if (value === null || value === undefined) return null;
  const activity = asObject(value);
  if (!activity) throw new AdminFeedbackCommentsError("admin_feedback_invalid_activity");
  const programDaysAvailable = asInteger(activity.program_days_available);
  const programDaysCompleted = asInteger(activity.program_days_completed);
  const checkinsCompleted = asInteger(activity.checkins_completed);
  const journalEntriesCreatedCount = asInteger(activity.journal_entries_created_count);
  const tasksCompleted = asInteger(activity.tasks_completed);
  const transferPulseCount = activity.transfer_pulse_count === null
    ? null
    : asInteger(activity.transfer_pulse_count);
  const resumeDelayBucket = asString(activity.resume_delay_bucket);
  const continuationStatusBucket = asString(activity.continuation_status_bucket);
  if (
    programDaysAvailable === null
    || programDaysCompleted === null
    || checkinsCompleted === null
    || journalEntriesCreatedCount === null
    || tasksCompleted === null
    || (activity.transfer_pulse_count !== null && transferPulseCount === null)
    || !resumeDelayBucket
    || !continuationStatusBucket
  ) throw new AdminFeedbackCommentsError("admin_feedback_invalid_activity");
  return {
    programDaysAvailable,
    programDaysCompleted,
    checkinsCompleted,
    journalEntriesCreatedCount,
    tasksCompleted,
    transferPulseCount,
    resumeDelayBucket,
    continuationStatusBucket,
  };
};

const parseItem = (value: Json): AdminFeedbackCommentItem => {
  const item = asObject(value);
  if (!item) throw new AdminFeedbackCommentsError("admin_feedback_invalid_item");
  const day = asInteger(item.program_day);
  if (day === null || !CHECKPOINT_DAYS.has(day)) {
    throw new AdminFeedbackCommentsError("admin_feedback_invalid_checkpoint");
  }
  const programDay = day as FeedbackCheckpointDay;
  const checkpoint = FEEDBACK_CHECKPOINTS[programDay];
  const questionId = asString(item.question_id);
  const question = questionId === "__closing_comment__"
    ? null
    : checkpoint.questions.find(({ id }) => id === questionId);
  const selectedOptionIds = Array.isArray(item.selected_option_ids)
    && item.selected_option_ids.every((optionId) => typeof optionId === "string")
    ? item.selected_option_ids as string[]
    : null;
  const authorization = asObject(item.authorization);
  const comment = asString(item.comment);
  const commentId = asString(item.comment_id);
  const subjectReference = asString(item.subject_reference);
  const submittedAt = asString(item.submitted_at);

  if (
    !commentId || !UUID_PATTERN.test(commentId)
    || !subjectReference || !UUID_PATTERN.test(subjectReference)
    || !submittedAt || Number.isNaN(Date.parse(submittedAt))
    || !questionId
    || (!question && questionId !== "__closing_comment__")
    || !selectedOptionIds
    || !comment || comment.trim().length < 1 || comment.length > 1200
    || item.campaign_reference !== checkpoint.campaignReference
    || item.questionnaire_version !== checkpoint.questionnaireVersion
    || item.questionnaire_manifest_hash !== checkpoint.questionnaireManifestHash
    || item.content_version !== "feedback-intelligence-content-v1.1.2"
    || !authorization
    || authorization.consent_valid_at_read !== true
    || typeof authorization.guardian_required !== "boolean"
  ) throw new AdminFeedbackCommentsError("admin_feedback_contract_drift");

  const allowedOptions = new Map(question?.options.map((option) => [option.id, option.label]) ?? []);
  if (
    questionId === "__closing_comment__"
      ? selectedOptionIds.length !== 0
      : selectedOptionIds.length < 1 || selectedOptionIds.some((optionId) => !allowedOptions.has(optionId))
  ) throw new AdminFeedbackCommentsError("admin_feedback_option_drift");

  return {
    commentId,
    subjectReference,
    submittedAt,
    programDay,
    campaignReference: checkpoint.campaignReference,
    questionnaireVersion: checkpoint.questionnaireVersion,
    contentVersion: "feedback-intelligence-content-v1.1.2",
    questionId,
    questionPrompt: question?.prompt ?? checkpoint.closingTextPrompt,
    selectedOptionIds,
    selectedOptionLabels: selectedOptionIds.map((optionId) => allowedOptions.get(optionId) as string),
    comment: comment.trim(),
    guardianRequired: authorization.guardian_required,
    activitySnapshot: parseActivity(item.activity_snapshot),
  };
};

const parseCursor = (value: Json | undefined): AdminFeedbackCommentCursor | null => {
  if (value === null || value === undefined) return null;
  const cursor = asObject(value);
  const submittedAt = asString(cursor?.submitted_at);
  const commentId = asString(cursor?.comment_id);
  if (!submittedAt || Number.isNaN(Date.parse(submittedAt)) || !commentId || !UUID_PATTERN.test(commentId)) {
    throw new AdminFeedbackCommentsError("admin_feedback_invalid_cursor");
  }
  return { submittedAt, commentId };
};

const parsePage = (value: Json | null): AdminFeedbackCommentPage => {
  const page = asObject(value);
  if (!page || page.schema_version !== "admin-feedback-comment-page-v1.1") {
    throw new AdminFeedbackCommentsError("admin_feedback_invalid_response");
  }
  const returnedCount = asInteger(page.returned_count);
  const checkpointDay = page.checkpoint_day === null
    ? null
    : asInteger(page.checkpoint_day);
  const dataScope = page.data_scope;
  const items = Array.isArray(page.items) ? page.items.map(parseItem) : null;
  const accessRequestReference = asString(page.access_request_reference);
  const generatedAt = asString(page.generated_at);
  if (
    !accessRequestReference || !UUID_PATTERN.test(accessRequestReference)
    || !generatedAt || Number.isNaN(Date.parse(generatedAt))
    || (dataScope !== "production" && dataScope !== "synthetic")
    || returnedCount === null || returnedCount > 50
    || !items || items.length !== returnedCount
    || typeof page.has_more !== "boolean"
    || (checkpointDay !== null && !CHECKPOINT_DAYS.has(checkpointDay))
  ) throw new AdminFeedbackCommentsError("admin_feedback_invalid_response");

  const nextCursor = parseCursor(page.next_cursor);
  if (page.has_more && !nextCursor) {
    throw new AdminFeedbackCommentsError("admin_feedback_invalid_cursor");
  }
  return {
    accessRequestReference,
    generatedAt,
    dataScope,
    checkpointDay: checkpointDay as FeedbackCheckpointDay | null,
    returnedCount,
    hasMore: page.has_more,
    nextCursor,
    items,
  };
};

export const getAdminFeedbackCommentPage = async (input: {
  dataScope?: AdminFeedbackDataScope;
  checkpointDay?: FeedbackCheckpointDay | null;
  cursor?: AdminFeedbackCommentCursor | null;
  pageSize?: number;
} = {}): Promise<AdminFeedbackCommentPage> => {
  const pageSize = input.pageSize ?? 20;
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) {
    throw new AdminFeedbackCommentsError("admin_feedback_invalid_page_size");
  }
  const { data, error } = await adminFeedbackSupabase.rpc("get_admin_feedback_comment_page", {
    _purpose: "pilot_product_feedback_review",
    _data_scope: input.dataScope ?? "production",
    _checkpoint_day: input.checkpointDay ?? null,
    _before_submitted_at: input.cursor?.submittedAt ?? null,
    _before_comment_id: input.cursor?.commentId ?? null,
    _page_size: pageSize,
  });
  if (error) throw new AdminFeedbackCommentsError(error.code ?? "admin_feedback_rpc_failed");
  return parsePage(data);
};
