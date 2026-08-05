import {
  FEEDBACK_INTELLIGENCE_CONTENT_VERSION,
  getFeedbackCheckpoint,
  type FeedbackCheckpointDefinition,
} from "@/content/feedbackIntelligenceV1";
import {
  FeedbackIntelligenceApiError,
  getMyFeedbackDraft,
  saveMyFeedbackDraft,
  startMyFeedbackSubmission,
  submitMyFeedback,
  type FeedbackCheckpointClaim,
  type FeedbackDraftSnapshot,
  type FeedbackMutationResult,
  type FeedbackResumeScreen,
  type FeedbackSavePayload,
  type FeedbackTextConsentState,
} from "@/lib/feedbackIntelligenceApi";

export interface FeedbackEditableSnapshot {
  answers: Record<string, string[]>;
  comments: Record<string, string>;
  textConsentState: FeedbackTextConsentState;
  guardianAuthorizationReference?: string | null;
  resumeScreen: FeedbackResumeScreen;
  resumeQuestionId?: string | null;
  passedQuestionIds: string[];
}

export interface FeedbackPersistenceState {
  checkpoint: FeedbackCheckpointDefinition;
  clientSubmissionId: string;
  draft: FeedbackDraftSnapshot;
  textEnabled: boolean;
  session: FeedbackPersistenceSession;
}

export interface FeedbackPersistenceDependencies {
  createId: () => string;
  start: typeof startMyFeedbackSubmission;
  getDraft: typeof getMyFeedbackDraft;
  save: typeof saveMyFeedbackDraft;
  submit: typeof submitMyFeedback;
}

const defaultDependencies: FeedbackPersistenceDependencies = {
  createId: () => globalThis.crypto.randomUUID(),
  start: startMyFeedbackSubmission,
  getDraft: getMyFeedbackDraft,
  save: saveMyFeedbackDraft,
  submit: submitMyFeedback,
};

const copySnapshot = (snapshot: FeedbackEditableSnapshot): FeedbackEditableSnapshot => ({
  answers: Object.fromEntries(
    Object.entries(snapshot.answers).map(([questionId, optionIds]) => [questionId, [...optionIds]]),
  ),
  comments: { ...snapshot.comments },
  textConsentState: snapshot.textConsentState,
  guardianAuthorizationReference: snapshot.guardianAuthorizationReference ?? null,
  resumeScreen: snapshot.resumeScreen,
  resumeQuestionId: snapshot.resumeQuestionId ?? null,
  passedQuestionIds: [...snapshot.passedQuestionIds],
});

const snapshotFingerprint = (snapshot: FeedbackEditableSnapshot) => JSON.stringify({
  answers: Object.entries(snapshot.answers)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([questionId, optionIds]) => [questionId, [...optionIds].sort()]),
  comments: Object.entries(snapshot.comments).sort(([left], [right]) => left.localeCompare(right)),
  textConsentState: snapshot.textConsentState,
  guardianAuthorizationReference: snapshot.guardianAuthorizationReference ?? null,
  resumeScreen: snapshot.resumeScreen,
  resumeQuestionId: snapshot.resumeQuestionId ?? null,
  passedQuestionIds: [...snapshot.passedQuestionIds].sort(),
});

const editableFromDraft = (draft: FeedbackDraftSnapshot): FeedbackEditableSnapshot => ({
  answers: draft.answers,
  comments: draft.comments,
  textConsentState: draft.textConsentState === "withdrawn" ? "declined" : draft.textConsentState,
  resumeScreen: draft.resumeScreen,
  resumeQuestionId: draft.resumeQuestionId,
  passedQuestionIds: draft.passedQuestionIds,
});

export const assertFeedbackCheckpointContract = (
  claim: FeedbackCheckpointClaim,
): FeedbackCheckpointDefinition => {
  if (!claim.eligible || !claim.checkpointDay) {
    throw new FeedbackIntelligenceApiError("feedback_checkpoint_not_eligible");
  }

  const checkpoint = getFeedbackCheckpoint(claim.checkpointDay);
  if (
    claim.campaignReference !== checkpoint.campaignReference
    || claim.questionnaireVersion !== checkpoint.questionnaireVersion
    || claim.contentVersion !== FEEDBACK_INTELLIGENCE_CONTENT_VERSION
    || claim.questionnaireManifestHash !== checkpoint.questionnaireManifestHash
    || claim.programDay !== checkpoint.checkpointDay
  ) {
    throw new FeedbackIntelligenceApiError("feedback_checkpoint_contract_mismatch");
  }

  if (claim.mode !== "invitation" && claim.mode !== "resume") {
    throw new FeedbackIntelligenceApiError("feedback_checkpoint_mode_invalid");
  }
  return checkpoint;
};

type PendingMutation = {
  payload: FeedbackSavePayload;
  fingerprint: string;
  finalize: boolean;
};

export class FeedbackPersistenceSession {
  private revision: number;
  private pendingMutation: PendingMutation | null = null;
  private lastAcknowledgedFingerprint: string;
  private lastResult: FeedbackMutationResult | null = null;
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly clientSubmissionId: string,
    initialDraft: FeedbackDraftSnapshot,
    private readonly textEnabled: boolean,
    private readonly dependencies: FeedbackPersistenceDependencies = defaultDependencies,
  ) {
    this.revision = initialDraft.clientRevision;
    this.lastAcknowledgedFingerprint = snapshotFingerprint(editableFromDraft(initialDraft));
  }

  save(snapshot: FeedbackEditableSnapshot): Promise<FeedbackMutationResult> {
    return this.enqueue(() => this.persist(snapshot, false));
  }

  submit(snapshot: FeedbackEditableSnapshot): Promise<FeedbackMutationResult> {
    return this.enqueue(() => this.persist(snapshot, true));
  }

  private enqueue(operation: () => Promise<FeedbackMutationResult>): Promise<FeedbackMutationResult> {
    const result = this.queue.then(operation, operation);
    this.queue = result.then(() => undefined, () => undefined);
    return result;
  }

  private validateTextBoundary(snapshot: FeedbackEditableSnapshot) {
    const hasComments = Object.values(snapshot.comments).some((comment) => comment.trim().length > 0);
    if (snapshot.textConsentState === "granted" && !this.textEnabled) {
      throw new FeedbackIntelligenceApiError("feedback_text_not_enabled");
    }
    if (snapshot.textConsentState !== "granted" && hasComments) {
      throw new FeedbackIntelligenceApiError("feedback_text_consent_required");
    }
  }

  private async persist(
    incomingSnapshot: FeedbackEditableSnapshot,
    finalize: boolean,
  ): Promise<FeedbackMutationResult> {
    const snapshot = copySnapshot(incomingSnapshot);
    this.validateTextBoundary(snapshot);
    const fingerprint = snapshotFingerprint(snapshot);

    if (this.pendingMutation) {
      const pending = this.pendingMutation;
      const pendingResult = await this.send(pending);
      this.acknowledge(pending, pendingResult);
      if (pending.finalize || pendingResult.status === "submitted") return pendingResult;
    }

    if (!finalize && fingerprint === this.lastAcknowledgedFingerprint && this.lastResult) {
      return this.lastResult;
    }

    const mutation: PendingMutation = {
      payload: {
        clientSubmissionId: this.clientSubmissionId,
        clientRevision: this.revision + 1,
        clientMutationId: this.dependencies.createId(),
        ...snapshot,
      },
      fingerprint,
      finalize,
    };
    this.pendingMutation = mutation;
    const result = await this.send(mutation);
    this.acknowledge(mutation, result);
    return result;
  }

  private send(mutation: PendingMutation) {
    return mutation.finalize
      ? this.dependencies.submit(mutation.payload)
      : this.dependencies.save(mutation.payload);
  }

  private acknowledge(mutation: PendingMutation, result: FeedbackMutationResult) {
    if (result.staleIgnored) {
      throw new FeedbackIntelligenceApiError("feedback_remote_revision_advanced");
    }
    if (result.clientRevision !== mutation.payload.clientRevision) {
      throw new FeedbackIntelligenceApiError("feedback_revision_ack_mismatch");
    }
    this.revision = result.clientRevision;
    this.lastAcknowledgedFingerprint = mutation.fingerprint;
    this.lastResult = result;
    this.pendingMutation = null;
  }
}

export const beginFeedbackPersistence = async (
  claim: FeedbackCheckpointClaim,
  productVersion: string,
  dependencies: FeedbackPersistenceDependencies = defaultDependencies,
): Promise<FeedbackPersistenceState> => {
  const checkpoint = assertFeedbackCheckpointContract(claim);
  const textEnabled = claim.textEnabled === true;
  let clientSubmissionId: string;
  let draft: FeedbackDraftSnapshot;

  if (claim.mode === "resume") {
    if (!claim.clientSubmissionId) {
      throw new FeedbackIntelligenceApiError("feedback_resume_submission_missing");
    }
    clientSubmissionId = claim.clientSubmissionId;
    draft = await dependencies.getDraft(clientSubmissionId);
  } else {
    clientSubmissionId = dependencies.createId();
    const started = await dependencies.start({
      campaignReference: checkpoint.campaignReference,
      clientSubmissionId,
      productVersion,
      contentVersion: FEEDBACK_INTELLIGENCE_CONTENT_VERSION,
      questionnaireManifestHash: checkpoint.questionnaireManifestHash,
    });
    if (started.status !== "draft" || started.clientRevision !== 0) {
      throw new FeedbackIntelligenceApiError("feedback_start_invalid_state");
    }
    draft = {
      status: "draft",
      clientRevision: 0,
      answers: {},
      comments: {},
      textConsentState: "not_asked",
      resumeScreen: "intro",
      resumeQuestionId: null,
      passedQuestionIds: [],
    };
  }

  return {
    checkpoint,
    clientSubmissionId,
    draft,
    textEnabled,
    session: new FeedbackPersistenceSession(clientSubmissionId, draft, textEnabled, dependencies),
  };
};
