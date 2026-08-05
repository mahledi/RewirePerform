import type { Json } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";

export type FeedbackTextConsentState = "not_asked" | "declined" | "granted";
export type FeedbackResumeScreen = "intro" | "questions" | "closing";

export interface FeedbackCheckpointClaim {
  eligible: boolean;
  reason?: string;
  mode?: "invitation" | "resume";
  campaignReference?: string;
  checkpointDay?: 10 | 24 | 39 | 55;
  questionnaireVersion?: string;
  contentVersion?: string;
  questionnaireManifestHash?: string;
  textEnabled?: boolean;
  clientSubmissionId?: string | null;
  clientRevision?: number;
  programDay?: number;
}

export interface FeedbackDraftSnapshot {
  status: "draft" | "submitted";
  clientRevision: number;
  answers: Record<string, string[]>;
  comments: Record<string, string>;
  textConsentState: FeedbackTextConsentState | "withdrawn";
  resumeScreen: FeedbackResumeScreen;
  resumeQuestionId: string | null;
  passedQuestionIds: string[];
}

export interface FeedbackSavePayload {
  clientSubmissionId: string;
  clientRevision: number;
  clientMutationId: string;
  answers: Record<string, string[]>;
  comments: Record<string, string>;
  textConsentState: FeedbackTextConsentState;
  guardianAuthorizationReference?: string | null;
  resumeScreen: FeedbackResumeScreen;
  resumeQuestionId?: string | null;
  passedQuestionIds: string[];
}

export interface FeedbackMutationResult {
  status: "draft" | "submitted";
  feedbackReference: string;
  clientRevision: number;
  idempotent?: boolean;
  staleIgnored?: boolean;
}

export interface FeedbackTextConsentReceiptSummary {
  consentReference: string;
  campaignReference: string;
  checkpointDay: 10 | 24 | 39 | 55;
  state: "granted" | "withdrawn";
  scope: string;
  consentVersion: string;
  grantedAt: string;
  withdrawnAt: string | null;
}

type RpcError = { code?: string; message: string };
type FeedbackRpc = (
  functionName: string,
  args?: Record<string, Json | undefined>,
) => Promise<{ data: Json | null; error: RpcError | null }>;

const feedbackSupabase = supabase as unknown as { rpc: FeedbackRpc };

export class FeedbackIntelligenceApiError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "FeedbackIntelligenceApiError";
  }
}

const asObject = (value: Json | null, errorCode: string): Record<string, Json | undefined> => {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw new FeedbackIntelligenceApiError(errorCode);
  }
  return value;
};

const optionalString = (value: Json | undefined) => typeof value === "string" ? value : undefined;
const optionalNumber = (value: Json | undefined) => typeof value === "number" ? value : undefined;
const optionalBoolean = (value: Json | undefined) => typeof value === "boolean" ? value : undefined;

const callFeedbackRpc = async (
  functionName: string,
  args?: Record<string, Json | undefined>,
) => {
  const { data, error } = await feedbackSupabase.rpc(functionName, args);
  if (error) throw new FeedbackIntelligenceApiError(error.code ?? "feedback_rpc_failed");
  return data;
};

export const isFeedbackIntelligenceClientEnabled = () =>
  import.meta.env.VITE_FEEDBACK_INTELLIGENCE_V1_ENABLED === "true";

export const claimMyFeedbackCheckpoint = async (): Promise<FeedbackCheckpointClaim> => {
  if (!isFeedbackIntelligenceClientEnabled()) {
    return { eligible: false, reason: "client_disabled" };
  }
  const result = asObject(
    await callFeedbackRpc("claim_my_feedback_checkpoint"),
    "feedback_claim_invalid_response",
  );
  if (typeof result.eligible !== "boolean") {
    throw new FeedbackIntelligenceApiError("feedback_claim_invalid_response");
  }
  const checkpointDay = optionalNumber(result.checkpoint_day);
  return {
    eligible: result.eligible,
    reason: optionalString(result.reason),
    mode: result.mode === "invitation" || result.mode === "resume" ? result.mode : undefined,
    campaignReference: optionalString(result.campaign_reference),
    checkpointDay: checkpointDay === 10 || checkpointDay === 24 || checkpointDay === 39 || checkpointDay === 55
      ? checkpointDay
      : undefined,
    questionnaireVersion: optionalString(result.questionnaire_version),
    contentVersion: optionalString(result.content_version),
    questionnaireManifestHash: optionalString(result.questionnaire_manifest_hash),
    textEnabled: optionalBoolean(result.text_enabled),
    clientSubmissionId: result.client_submission_id === null
      ? null
      : optionalString(result.client_submission_id),
    clientRevision: optionalNumber(result.client_revision),
    programDay: optionalNumber(result.program_day),
  };
};

export const dismissMyFeedbackCheckpoint = async (campaignReference: string) => {
  await callFeedbackRpc("dismiss_my_feedback_checkpoint", {
    _campaign_reference: campaignReference,
  });
};

export const startMyFeedbackSubmission = async (input: {
  campaignReference: string;
  clientSubmissionId: string;
  productVersion: string;
  contentVersion: string;
  questionnaireManifestHash: string;
}): Promise<FeedbackMutationResult> => parseMutationResult(await callFeedbackRpc(
  "start_my_feedback_submission",
  {
    _campaign_reference: input.campaignReference,
    _client_submission_id: input.clientSubmissionId,
    _product_version: input.productVersion,
    _content_version: input.contentVersion,
    _questionnaire_manifest_hash: input.questionnaireManifestHash,
  },
));

const stringArray = (value: Json | undefined) => Array.isArray(value)
  && value.every((item) => typeof item === "string")
  ? value as string[]
  : null;

const answerMap = (value: Json | undefined): Record<string, string[]> | null => {
  if (!value || Array.isArray(value) || typeof value !== "object") return null;
  const entries = Object.entries(value);
  if (entries.some(([, selected]) => !stringArray(selected))) return null;
  return Object.fromEntries(entries) as Record<string, string[]>;
};

const commentMap = (value: Json | undefined): Record<string, string> | null => {
  if (!value || Array.isArray(value) || typeof value !== "object") return null;
  const entries = Object.entries(value);
  if (entries.some(([, comment]) => typeof comment !== "string")) return null;
  return Object.fromEntries(entries) as Record<string, string>;
};

export const getMyFeedbackDraft = async (clientSubmissionId: string): Promise<FeedbackDraftSnapshot> => {
  const result = asObject(await callFeedbackRpc("get_my_feedback_draft", {
    _client_submission_id: clientSubmissionId,
  }), "feedback_draft_invalid_response");
  const answers = answerMap(result.answers);
  const comments = commentMap(result.comments);
  const passedQuestionIds = stringArray(result.passed_question_ids);
  if (
    (result.status !== "draft" && result.status !== "submitted")
    || typeof result.client_revision !== "number"
    || !answers || !comments || !passedQuestionIds
    || !["not_asked", "declined", "granted", "withdrawn"].includes(String(result.text_consent_state))
    || !["intro", "questions", "closing"].includes(String(result.resume_screen))
  ) {
    throw new FeedbackIntelligenceApiError("feedback_draft_invalid_response");
  }
  return {
    status: result.status,
    clientRevision: result.client_revision,
    answers,
    comments,
    textConsentState: result.text_consent_state as FeedbackDraftSnapshot["textConsentState"],
    resumeScreen: result.resume_screen as FeedbackResumeScreen,
    resumeQuestionId: result.resume_question_id === null ? null : optionalString(result.resume_question_id) ?? null,
    passedQuestionIds,
  };
};

const parseMutationResult = (value: Json | null): FeedbackMutationResult => {
  const result = asObject(value, "feedback_mutation_invalid_response");
  if (
    (result.status !== "draft" && result.status !== "submitted")
    || typeof result.feedback_reference !== "string"
    || typeof result.client_revision !== "number"
  ) throw new FeedbackIntelligenceApiError("feedback_mutation_invalid_response");
  return {
    status: result.status,
    feedbackReference: result.feedback_reference,
    clientRevision: result.client_revision,
    idempotent: optionalBoolean(result.idempotent),
    staleIgnored: optionalBoolean(result.stale_ignored),
  };
};

const saveArgs = (payload: FeedbackSavePayload): Record<string, Json | undefined> => ({
  _client_submission_id: payload.clientSubmissionId,
  _client_revision: payload.clientRevision,
  _client_mutation_id: payload.clientMutationId,
  _answers: payload.answers,
  _comments: payload.comments,
  _text_consent_state: payload.textConsentState,
  _guardian_authorization_reference: payload.guardianAuthorizationReference ?? null,
  _resume_screen: payload.resumeScreen,
  _resume_question_id: payload.resumeQuestionId ?? null,
  _passed_question_ids: payload.passedQuestionIds,
});

export const saveMyFeedbackDraft = async (payload: FeedbackSavePayload) =>
  parseMutationResult(await callFeedbackRpc("save_my_feedback_draft", saveArgs(payload)));

export const submitMyFeedback = async (payload: FeedbackSavePayload) =>
  parseMutationResult(await callFeedbackRpc("submit_my_feedback", saveArgs(payload)));

const parseFeedbackTextConsentReceipt = (value: Json): FeedbackTextConsentReceiptSummary => {
  const receipt = asObject(value, "feedback_consent_list_invalid_response");
  const checkpointDay = optionalNumber(receipt.checkpoint_day);
  if (
    typeof receipt.consent_reference !== "string"
    || typeof receipt.campaign_reference !== "string"
    || (checkpointDay !== 10 && checkpointDay !== 24 && checkpointDay !== 39 && checkpointDay !== 55)
    || (receipt.state !== "granted" && receipt.state !== "withdrawn")
    || typeof receipt.scope !== "string"
    || typeof receipt.consent_version !== "string"
    || typeof receipt.granted_at !== "string"
    || (receipt.withdrawn_at !== null && typeof receipt.withdrawn_at !== "string")
  ) {
    throw new FeedbackIntelligenceApiError("feedback_consent_list_invalid_response");
  }
  return {
    consentReference: receipt.consent_reference,
    campaignReference: receipt.campaign_reference,
    checkpointDay,
    state: receipt.state,
    scope: receipt.scope,
    consentVersion: receipt.consent_version,
    grantedAt: receipt.granted_at,
    withdrawnAt: receipt.withdrawn_at as string | null,
  };
};

export const listMyFeedbackTextConsents = async (): Promise<FeedbackTextConsentReceiptSummary[]> => {
  const result = await callFeedbackRpc("list_my_feedback_text_consents");
  if (!Array.isArray(result)) {
    throw new FeedbackIntelligenceApiError("feedback_consent_list_invalid_response");
  }
  return result.map(parseFeedbackTextConsentReceipt);
};

export const withdrawMyFeedbackText = async (consentReference: string): Promise<void> => {
  const result = asObject(await callFeedbackRpc("withdraw_my_feedback_text", {
    _consent_reference: consentReference,
  }), "feedback_consent_withdraw_invalid_response");
  if (result.ok !== true || result.state !== "withdrawn") {
    throw new FeedbackIntelligenceApiError("feedback_consent_withdraw_invalid_response");
  }
};
