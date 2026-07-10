import { useEffect, useState } from "react";
import { Loader2, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import QuestionnaireIntro from "@/components/questionnaire/QuestionnaireIntro";
import QuestionnaireFlow from "@/components/questionnaire/QuestionnaireFlow";
import QuestionnaireResults from "@/components/questionnaire/QuestionnaireResults";
import { supabase } from "@/integrations/supabase/client";
import { ONBOARDING_V2_INSTRUMENT_ID } from "@/content/questionnaireV2";
import { clearLocalDraft, readLocalDraft } from "@/lib/localDrafts";
import { hasCompleteOnboardingAnswerSet, hasValidCompletedOnboarding } from "@/lib/questionnaireCompletion";
import { toast } from "sonner";

type Phase = "loading" | "intro" | "resume" | "flow" | "results";

interface DraftState {
  id: string;
  answers: Record<string, string | string[] | number>;
  lastCategoryIndex: number;
  lastGlobalIndex?: number;
  source?: "server" | "local";
}

interface LocalQuestionnaireDraft {
  answers?: Record<string, string | string[] | number>;
  lastCategoryIndex?: number;
  lastGlobalIndex?: number;
}

const LEGACY_DRAFT_STORAGE_KEY = `questionnaire:${ONBOARDING_V2_INSTRUMENT_ID}`;

const Questionnaire = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("loading");
  const [answers, setAnswers] = useState<Record<string, string | string[] | number>>({});
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [exiting, setExiting] = useState(false);
  const [programInstanceId, setProgramInstanceId] = useState<string | null>(null);
  const draftStorageKey = programInstanceId
    ? `questionnaire:${programInstanceId}:${ONBOARDING_V2_INSTRUMENT_ID}`
    : LEGACY_DRAFT_STORAGE_KEY;

  // Load any in-progress draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      let localDraft = readLocalDraft<LocalQuestionnaireDraft>(LEGACY_DRAFT_STORAGE_KEY);
      const applyLocalDraft = () => {
        if (localDraft?.answers && Object.keys(localDraft.answers).length > 0) {
          setDraft({
            id: "",
            answers: localDraft.answers,
            lastCategoryIndex: localDraft.lastCategoryIndex ?? 0,
            lastGlobalIndex: localDraft.lastGlobalIndex,
            source: "local",
          });
          setPhase("resume");
        } else {
          setPhase("intro");
        }
      };

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (!user || userError) {
        applyLocalDraft();
        return;
      }

      const { getOrCreateActiveInstance } = await import("@/lib/programInstance");
      const instance = await getOrCreateActiveInstance(user.id);
      if (!instance?.id) {
        toast.error("Dein Programmlauf ist noch nicht vollständig eingerichtet.");
        setPhase("intro");
        return;
      }
      setProgramInstanceId(instance.id);
      localDraft = readLocalDraft<LocalQuestionnaireDraft>(
        `questionnaire:${instance.id}:${ONBOARDING_V2_INSTRUMENT_ID}`,
      ) ?? localDraft;

      const { data: completedResponses, error: completedError } = await supabase
        .from("questionnaire_responses")
        .select("id, answers, analysis, is_complete, instrument_id")
        .eq("user_id", user.id)
        .eq("program_instance_id", instance.id)
        .eq("is_complete", true)
        .order("created_at", { ascending: false })
        .limit(5);

      if (completedError) {
        console.error("Error loading completed questionnaire:", completedError);
      }

      if ((completedResponses ?? []).some(hasValidCompletedOnboarding)) {
        clearLocalDraft(`questionnaire:${instance.id}:${ONBOARDING_V2_INSTRUMENT_ID}`);
        clearLocalDraft(LEGACY_DRAFT_STORAGE_KEY);
        navigate("/dashboard", { replace: true });
        return;
      }

      const recoverableComplete = (completedResponses ?? []).find((response) =>
        response.instrument_id === ONBOARDING_V2_INSTRUMENT_ID &&
        hasCompleteOnboardingAnswerSet(response.answers)
      );
      if (recoverableComplete?.answers) {
        setAnswers(recoverableComplete.answers as Record<string, string | string[] | number>);
        setPhase("results");
        return;
      }

      // Alle offenen Drafts laden, nicht nur den jüngsten — verwaiste Duplikate aufräumen.
      const { data: openDrafts, error } = await supabase
        .from("questionnaire_responses")
        .select("id, answers, last_category_index, progress_updated_at")
        .eq("user_id", user.id)
        .eq("program_instance_id", instance.id)
        .eq("is_complete", false)
        .eq("instrument_id", ONBOARDING_V2_INSTRUMENT_ID)
        .order("progress_updated_at", { ascending: false });

      if (error) {
        console.error("Error loading draft:", error);
        applyLocalDraft();
        return;
      }

      const drafts = openDrafts ?? [];

      // Falls aus älteren Race-Conditions Duplikate existieren: alle bis auf den jüngsten löschen.
      if (drafts.length > 1) {
        const stale = drafts.slice(1).map((d) => d.id);
        await supabase.from("questionnaire_responses").delete().in("id", stale);
      }

      const latest = drafts[0];
      if (latest && latest.answers && Object.keys(latest.answers as object).length > 0) {
        setDraft({
          id: latest.id,
          answers: latest.answers as Record<string, string | string[] | number>,
          lastCategoryIndex: latest.last_category_index ?? 0,
          lastGlobalIndex: localDraft?.lastGlobalIndex,
          source: "server",
        });
        setPhase("resume");
      } else if (localDraft?.answers && Object.keys(localDraft.answers).length > 0) {
        applyLocalDraft();
      } else {
        setPhase("intro");
      }
    };
    loadDraft();
  }, [navigate]);

  const handleComplete = (finalAnswers: Record<string, string | string[] | number>) => {
    setAnswers(finalAnswers);
    setPhase("results");
    window.scrollTo(0, 0);
  };

  const startFresh = async () => {
    // Discard existing draft if user chose to restart
    if (draft?.id) {
      await supabase.from("questionnaire_responses").delete().eq("id", draft.id);
      setDraft(null);
    }
    clearLocalDraft(draftStorageKey);
    clearLocalDraft(LEGACY_DRAFT_STORAGE_KEY);
    setPhase("flow");
  };

  const clearCachedAuthState = () => {
    try {
      const cachedUserId = window.localStorage.getItem("cached_user_id");
      window.localStorage.removeItem("cached_user_role");
      window.localStorage.removeItem("cached_user_id");
      if (cachedUserId) {
        window.localStorage.removeItem(`cached_user_role:${cachedUserId}`);
      }
    } catch {
      // localStorage can be unavailable in strict browser modes.
    }
  };

  const handleSignOutToStart = async () => {
    if (exiting) return;
    setExiting(true);
    try {
      await supabase.auth.signOut();
      clearCachedAuthState();
      navigate("/", { replace: true });
    } finally {
      setExiting(false);
    }
  };

  const ExitButton = () => (
    <button
      type="button"
      onClick={handleSignOutToStart}
      disabled={exiting}
      className="fixed right-4 top-[calc(env(safe-area-inset-top)+1rem)] z-[70] inline-flex items-center gap-2 rounded-xl border border-border bg-background/90 px-3 py-2 text-xs font-medium text-muted-foreground shadow-lg backdrop-blur-xl transition-colors hover:text-foreground disabled:opacity-60 sm:right-6 sm:px-4 sm:text-sm"
      aria-label="Abmelden und zur Startseite"
    >
      {exiting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
      <span>Abmelden</span>
      <span className="hidden sm:inline">&amp; Startseite</span>
    </button>
  );

  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (phase === "resume" && draft) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <ExitButton />
        <div className="max-w-md w-full text-center">
          <h1 className="font-heading text-3xl font-bold mb-4">
            Willkommen zurück.
          </h1>
          <p className="text-muted-foreground mb-8">
            Du hast deinen Fragebogen pausiert. Möchtest du dort weitermachen, wo du aufgehört hast?
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                setAnswers(draft.answers);
                setPhase("flow");
              }}
              className="w-full px-6 py-4 rounded-xl bg-primary text-primary-foreground font-heading font-semibold hover:shadow-glow transition-all"
            >
              Fortsetzen
            </button>
            <button
              onClick={startFresh}
              className="w-full px-6 py-4 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all text-sm"
            >
              Neu beginnen
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {phase !== "flow" && <ExitButton />}
      {phase === "intro" && (
        <QuestionnaireIntro onStart={() => setPhase("flow")} />
      )}
      {phase === "flow" && (
        <QuestionnaireFlow
          initialAnswers={answers}
          initialCategoryIndex={draft?.lastCategoryIndex ?? 0}
          initialGlobalIndex={draft?.lastGlobalIndex}
          draftId={draft?.id ?? null}
          draftStorageKey={draftStorageKey}
          onComplete={handleComplete}
          onBack={() => setPhase("intro")}
          onPauseExit={handleSignOutToStart}
        />
      )}
      {phase === "results" && <QuestionnaireResults answers={answers} draftStorageKey={draftStorageKey} />}
    </>
  );
};

export default Questionnaire;
