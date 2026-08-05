import { useCallback, useEffect, useRef, useState } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useLocation } from "react-router-dom";

import {
  FeedbackQuestionnairePreview,
  type FeedbackExperienceSnapshot,
} from "@/components/feedback-intelligence/FeedbackQuestionnairePreview";
import { useAuth } from "@/contexts/AuthContext";
import {
  claimMyFeedbackCheckpoint,
  dismissMyFeedbackCheckpoint,
  isFeedbackIntelligenceClientEnabled,
  type FeedbackCheckpointClaim,
} from "@/lib/feedbackIntelligenceApi";
import {
  beginFeedbackPersistence,
  type FeedbackPersistenceState,
} from "@/lib/feedbackIntelligencePersistence";

const claimRequests = new Map<string, Promise<FeedbackCheckpointClaim>>();

const claimCheckpointOnce = (userId: string) => {
  const existing = claimRequests.get(userId);
  if (existing) return existing;
  const request = claimMyFeedbackCheckpoint().catch((error) => {
    claimRequests.delete(userId);
    throw error;
  });
  claimRequests.set(userId, request);
  return request;
};

const getProductVersion = async () => {
  if (!Capacitor.isNativePlatform()) return "unknown";
  try {
    const info = await CapacitorApp.getInfo();
    const version = /^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(info.version)
      ? info.version
      : null;
    const build = /^\d{1,10}$/.test(info.build) ? info.build : null;
    return version ? `${version}${build ? `+${build}` : ""}` : "unknown";
  } catch {
    return "unknown";
  }
};

const FeedbackCheckpointGate = () => {
  const location = useLocation();
  const { user, role, roleVerified } = useAuth();
  const [claim, setClaim] = useState<FeedbackCheckpointClaim | null>(null);
  const [persistence, setPersistence] = useState<FeedbackPersistenceState | null>(null);
  const [latestSnapshot, setLatestSnapshot] = useState<FeedbackExperienceSnapshot | null>(null);
  const [closed, setClosed] = useState(false);
  const initialization = useRef<Promise<FeedbackPersistenceState> | null>(null);

  const canCheck = isFeedbackIntelligenceClientEnabled()
    && location.pathname === "/dashboard"
    && roleVerified
    && role === "athlete"
    && Boolean(user?.id);

  useEffect(() => {
    if (!canCheck || !user?.id || closed) return;
    let active = true;
    void claimCheckpointOnce(user.id)
      .then((result) => {
        if (active) setClaim(result);
      })
      .catch(() => {
        if (active) setClosed(true);
      });
    return () => {
      active = false;
    };
  }, [canCheck, closed, user?.id]);

  const initializePersistence = useCallback(async () => {
    if (persistence) return persistence;
    if (!claim) throw new Error("feedback_claim_missing");
    if (initialization.current) return initialization.current;
    const request = getProductVersion()
      .then((productVersion) => beginFeedbackPersistence(claim, productVersion))
      .then((state) => {
        setPersistence(state);
        setLatestSnapshot({
          answers: state.draft.answers,
          comments: state.draft.comments,
          textConsentState: state.draft.textConsentState === "granted"
            ? "granted"
            : state.draft.textConsentState === "declined" || state.draft.textConsentState === "withdrawn"
              ? "declined"
              : "not_asked",
          resumeScreen: state.draft.resumeScreen,
          resumeQuestionId: state.draft.resumeQuestionId,
          passedQuestionIds: state.draft.passedQuestionIds,
        });
        return state;
      })
      .finally(() => {
        initialization.current = null;
      });
    initialization.current = request;
    return request;
  }, [claim, persistence]);

  useEffect(() => {
    if (claim?.eligible && claim.mode === "resume" && !persistence && !closed) {
      void initializePersistence().catch(() => setClosed(true));
    }
  }, [claim, closed, initializePersistence, persistence]);

  const save = useCallback(async (snapshot: FeedbackExperienceSnapshot) => {
    const state = persistence ?? await initializePersistence();
    await state.session.save(snapshot);
    setLatestSnapshot(snapshot);
  }, [initializePersistence, persistence]);

  const submit = useCallback(async (snapshot: FeedbackExperienceSnapshot) => {
    const state = persistence ?? await initializePersistence();
    await state.session.submit(snapshot);
    setLatestSnapshot(snapshot);
  }, [initializePersistence, persistence]);

  const dismiss = useCallback(async () => {
    if (!claim?.campaignReference) throw new Error("feedback_campaign_missing");
    await dismissMyFeedbackCheckpoint(claim.campaignReference);
    setClosed(true);
  }, [claim?.campaignReference]);

  if (
    !canCheck
    || closed
    || !claim?.eligible
    || !claim.checkpointDay
    || (claim.mode === "resume" && !persistence)
  ) return null;

  const draft = persistence?.draft;
  const initialScreen = latestSnapshot?.resumeScreen
    ?? (claim.mode === "resume" ? draft?.resumeScreen ?? "intro" : "invitation");
  const initialConsentState = latestSnapshot?.textConsentState
    ?? (draft?.textConsentState === "granted"
      ? "granted"
      : draft?.textConsentState === "declined" || draft?.textConsentState === "withdrawn"
        ? "declined"
        : "not_asked");

  return (
    <div
      className="fixed inset-0 z-[90] overflow-y-auto bg-[#07080B]/95 px-3 py-[max(12px,env(safe-area-inset-top))] backdrop-blur-xl sm:px-6 sm:py-8"
      data-testid="feedback-checkpoint-gate"
    >
      <FeedbackQuestionnairePreview
        key={claim.campaignReference}
        day={claim.checkpointDay}
        mode="live"
        initialScreen={initialScreen}
        initialQuestionId={latestSnapshot?.resumeQuestionId ?? draft?.resumeQuestionId}
        initialAnswers={latestSnapshot?.answers ?? draft?.answers}
        initialComments={latestSnapshot?.comments ?? draft?.comments}
        initialConsentState={initialConsentState}
        initialPassedQuestionIds={latestSnapshot?.passedQuestionIds ?? draft?.passedQuestionIds}
        textEnabled={claim.textEnabled === true}
        onStart={async () => {
          await initializePersistence();
        }}
        onDismiss={dismiss}
        onSave={save}
        onSubmit={submit}
        onComplete={() => setClosed(true)}
      />
    </div>
  );
};

export default FeedbackCheckpointGate;
