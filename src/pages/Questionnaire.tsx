import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import QuestionnaireIntro from "@/components/questionnaire/QuestionnaireIntro";
import QuestionnaireFlow from "@/components/questionnaire/QuestionnaireFlow";
import QuestionnaireResults from "@/components/questionnaire/QuestionnaireResults";
import { supabase } from "@/integrations/supabase/client";
import { ONBOARDING_V2_INSTRUMENT_ID } from "@/content/questionnaireV2";

type Phase = "loading" | "intro" | "resume" | "flow" | "results";

interface DraftState {
  id: string;
  answers: Record<string, string | string[] | number>;
  lastCategoryIndex: number;
}

const Questionnaire = () => {
  const [phase, setPhase] = useState<Phase>("loading");
  const [answers, setAnswers] = useState<Record<string, string | string[] | number>>({});
  const [draft, setDraft] = useState<DraftState | null>(null);

  // Load any in-progress draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPhase("intro");
        return;
      }

      // Alle offenen Drafts laden, nicht nur den jüngsten — verwaiste Duplikate aufräumen.
      const { data: openDrafts, error } = await supabase
        .from("questionnaire_responses")
        .select("id, answers, last_category_index, progress_updated_at")
        .eq("user_id", user.id)
        .eq("is_complete", false)
        .eq("instrument_id", ONBOARDING_V2_INSTRUMENT_ID)
        .order("progress_updated_at", { ascending: false });

      if (error) {
        console.error("Error loading draft:", error);
        setPhase("intro");
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
        });
        setPhase("resume");
      } else {
        setPhase("intro");
      }
    };
    loadDraft();
  }, []);

  const handleComplete = (finalAnswers: Record<string, string | string[] | number>) => {
    setAnswers(finalAnswers);
    setPhase("results");
    window.scrollTo(0, 0);
  };

  const startFresh = async () => {
    // Discard existing draft if user chose to restart
    if (draft) {
      await supabase.from("questionnaire_responses").delete().eq("id", draft.id);
      setDraft(null);
    }
    setPhase("flow");
  };

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
      {phase === "intro" && (
        <QuestionnaireIntro onStart={() => setPhase("flow")} />
      )}
      {phase === "flow" && (
        <QuestionnaireFlow
          initialAnswers={answers}
          initialCategoryIndex={draft?.lastCategoryIndex ?? 0}
          draftId={draft?.id ?? null}
          onComplete={handleComplete}
          onBack={() => setPhase("intro")}
        />
      )}
      {phase === "results" && <QuestionnaireResults answers={answers} />}
    </>
  );
};

export default Questionnaire;
