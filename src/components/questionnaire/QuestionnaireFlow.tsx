import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Cloud, CloudOff, Loader2, Pause } from "lucide-react";
import { questions, categories, getQuestionsByCategory } from "@/data/questionnaireData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import QuestionnaireProgress from "./QuestionnaireProgress";
import QuestionCard from "./QuestionCard";
import CategoryIntro from "./CategoryIntro";
import {
  ONBOARDING_V2_INSTRUMENT_ID,
  ONBOARDING_V2_VERSION,
} from "@/content/questionnaireV2";
import { writeLocalDraft } from "@/lib/localDrafts";
import { isOptionalOnboardingQuestion, isRequiredOnboardingQuestion } from "@/lib/questionnaireCompletion";
import type { Json } from "@/integrations/supabase/types";

interface QuestionnaireFlowProps {
  onComplete: (answers: Record<string, string | string[] | number>) => void;
  onBack: () => void;
  initialAnswers?: Record<string, string | string[] | number>;
  initialCategoryIndex?: number;
  initialGlobalIndex?: number;
  draftId?: string | null;
  draftStorageKey?: string;
  onPauseExit: (draft: QuestionnairePauseDraft) => void | Promise<void>;
}

export interface QuestionnairePauseDraft {
  answers: Record<string, string | string[] | number>;
  lastCategoryIndex: number;
  lastGlobalIndex?: number;
}

type FlowState =
  | { type: "category-intro"; categoryIndex: number }
  | { type: "question"; globalIndex: number };

type SaveState = "idle" | "saving" | "saved" | "error";
const LEGACY_QUESTIONNAIRE_DRAFT_KEY = `questionnaire:${ONBOARDING_V2_INSTRUMENT_ID}`;

const QuestionnaireFlow = ({
  onComplete,
  onBack,
  initialAnswers = {},
  initialCategoryIndex = 0,
  initialGlobalIndex,
  draftId = null,
  draftStorageKey = LEGACY_QUESTIONNAIRE_DRAFT_KEY,
  onPauseExit,
}: QuestionnaireFlowProps) => {
  const [answers, setAnswers] = useState<Record<string, string | string[] | number>>(initialAnswers);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pausing, setPausing] = useState(false);
  const draftIdRef = useRef<string | null>(draftId);
  const isSavingRef = useRef<boolean>(false);
  const pendingSaveRef = useRef<{ answers: Record<string, string | string[] | number>; categoryIndex: number; silent: boolean } | null>(null);

  const orderedQuestions = useMemo(() => {
    return categories.flatMap((cat) => getQuestionsByCategory(cat.id));
  }, []);

  const [flowState, setFlowState] = useState<FlowState>(() => {
    if (
      typeof initialGlobalIndex === "number" &&
      initialGlobalIndex >= 0 &&
      initialGlobalIndex < orderedQuestions.length
    ) {
      return { type: "question", globalIndex: initialGlobalIndex };
    }
    return {
      type: "category-intro",
      categoryIndex: Math.min(initialCategoryIndex, categories.length - 1),
    };
  });

  const totalQuestions = orderedQuestions.length;

  const handleAnswer = useCallback(
    (questionId: string, value: string | string[] | number) => {
      setSubmitError(null);
      setValidationError(null);
      setAnswers((prev) => ({ ...prev, [questionId]: value }));
    },
    []
  );

  const getCurrentCategoryForQuestion = (globalIndex: number) => {
    const q = orderedQuestions[globalIndex];
    return categories.find((c) => c.id === q.category)!;
  };

  const getGlobalIndexForCategoryStart = (categoryIndex: number) => {
    const catId = categories[categoryIndex].id;
    return orderedQuestions.findIndex((q) => q.category === catId);
  };

  const isLastQuestionInCategory = (globalIndex: number) => {
    const currentCat = orderedQuestions[globalIndex].category;
    const nextQ = orderedQuestions[globalIndex + 1];
    return !nextQ || nextQ.category !== currentCat;
  };

  const currentQuestion =
    flowState.type === "question" ? orderedQuestions[flowState.globalIndex] : null;

  const isOptionalTextQuestion = (question: typeof currentQuestion) => {
    if (!question) return false;
    return isOptionalOnboardingQuestion(question);
  };

  const isRequiredQuestion = (question: typeof currentQuestion) => {
    if (!question) return false;
    return isRequiredOnboardingQuestion(question);
  };

  const validateQuestion = (question: typeof currentQuestion) => {
    if (!question) return "Diese Frage konnte nicht geladen werden.";
    const answer = answers[question.id];

    if (question.type === "text") {
      if (isOptionalTextQuestion(question) && (!answer || String(answer).trim() === "")) {
        return null;
      }
      const text = typeof answer === "string" ? answer.trim() : "";
      const normalized = text.toLowerCase();
      const throwawayAnswers = new Set(["-", ".", "..", "...", "ka", "k.a.", "idk", "egal", "nichts", "keine ahnung"]);
      if (!text) {
        return "Diese Antwort ist wichtig für dein Startprofil. Ein kurzer ehrlicher Satz reicht.";
      }
      if (throwawayAnswers.has(normalized) || text.length < 4) {
        return "Schreib bitte etwas Konkreteres. Es muss nicht perfekt sein, nur ehrlich genug.";
      }
      return null;
    }

    if (answer === undefined || answer === "") {
      return "Bitte wähle eine Antwort aus.";
    }
    if (Array.isArray(answer) && answer.length === 0) {
      return "Bitte wähle mindestens eine passende Antwort aus.";
    }
    return null;
  };

  // Persist draft to Supabase
  const saveDraft = useCallback(
    async (
      currentAnswers: Record<string, string | string[] | number>,
      categoryIndex: number,
      opts: { silent?: boolean } = {}
    ) => {
      // Mutex: wenn ein Save läuft, jüngsten Stand puffern und am Ende einmal nachreichen.
      if (isSavingRef.current) {
        pendingSaveRef.current = { answers: currentAnswers, categoryIndex, silent: !!opts.silent };
        return;
      }
      isSavingRef.current = true;
      if (!opts.silent) setSaveState("saving");
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setSaveState("error");
          return;
        }
        const { getOrCreateActiveInstance } = await import("@/lib/programInstance");
        const instance = await getOrCreateActiveInstance(user.id);
        if (!instance?.id) throw new Error("active_program_instance_required");

        // Falls noch keine draftId bekannt: prüfen ob es schon einen offenen Draft gibt
        // (z.B. parallele Sessions / weiterer Tab) und den verwenden statt neuen einzufügen.
        if (!draftIdRef.current) {
          const { data: existing } = await supabase
            .from("questionnaire_responses")
            .select("id")
            .eq("user_id", user.id)
            .eq("program_instance_id", instance.id)
            .eq("is_complete", false)
            .order("progress_updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (existing?.id) {
            draftIdRef.current = existing.id;
          }
        }

        if (draftIdRef.current) {
          const { error } = await supabase
            .from("questionnaire_responses")
            .update({
              answers: currentAnswers as Json,
              last_category_index: categoryIndex,
              progress_updated_at: new Date().toISOString(),
              instrument_id: ONBOARDING_V2_INSTRUMENT_ID,
              questionnaire_version: ONBOARDING_V2_VERSION,
              timing: "pre",
              program_instance_id: instance.id,
            })
            .eq("id", draftIdRef.current);
          if (error) throw error;
        } else {
          const { data, error } = await supabase
            .from("questionnaire_responses")
            .insert({
              user_id: user.id,
              session_id: user.id,
              answers: currentAnswers as Json,
              last_category_index: categoryIndex,
              is_complete: false,
              instrument_id: ONBOARDING_V2_INSTRUMENT_ID,
              questionnaire_version: ONBOARDING_V2_VERSION,
              timing: "pre",
              program_instance_id: instance.id,
              scores: {},
            })
            .select("id")
            .single();
          if (error) {
            // Race-Fallback: wenn parallel ein Draft entstanden ist (Unique-Index hat zugeschlagen),
            // jetzt nachladen und in den Update-Pfad wechseln.
            const { data: rescued } = await supabase
              .from("questionnaire_responses")
              .select("id")
              .eq("user_id", user.id)
              .eq("program_instance_id", instance.id)
              .eq("is_complete", false)
              .order("progress_updated_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            if (rescued?.id) {
              draftIdRef.current = rescued.id;
              await supabase
                .from("questionnaire_responses")
                .update({
                  answers: currentAnswers as Json,
                  last_category_index: categoryIndex,
                  progress_updated_at: new Date().toISOString(),
                  instrument_id: ONBOARDING_V2_INSTRUMENT_ID,
                  questionnaire_version: ONBOARDING_V2_VERSION,
                  timing: "pre",
                  program_instance_id: instance.id,
                })
                .eq("id", rescued.id);
            } else {
              throw error;
            }
          } else {
            draftIdRef.current = data.id;
          }
        }
        setSaveState("saved");
        if (!opts.silent) {
          setTimeout(() => setSaveState("idle"), 2000);
        }
      } catch (err) {
        console.error("Save draft error:", err);
        setSaveState("error");
      } finally {
        isSavingRef.current = false;
        // Pending Save nachreichen, falls in der Zwischenzeit eine neuere Version aufgelaufen ist.
        const pending = pendingSaveRef.current;
        pendingSaveRef.current = null;
        if (pending) {
          saveDraft(pending.answers, pending.categoryIndex, { silent: pending.silent });
        }
      }
    },
    []
  );

  const canProceed = () => {
    if (flowState.type === "category-intro") return true;
    if (!currentQuestion) return false;
    const answer = answers[currentQuestion.id];
    if (currentQuestion.type === "text") {
      if (!isRequiredQuestion(currentQuestion)) return true;
      return typeof answer === "string" && answer.trim().length > 0;
    }
    if (answer === undefined || answer === "") return false;
    if (Array.isArray(answer) && answer.length === 0) return false;
    return true;
  };

  const goNext = async () => {
    if (submitting) return;
    if (flowState.type === "category-intro") {
      const startIndex = getGlobalIndexForCategoryStart(flowState.categoryIndex);
      setValidationError(null);
      setFlowState({ type: "question", globalIndex: startIndex });
      return;
    }

    const error = validateQuestion(currentQuestion);
    if (error) {
      setValidationError(error);
      return;
    }

    const idx = flowState.globalIndex;
    if (idx >= totalQuestions - 1) {
      setSubmitting(true);
      setSubmitError(null);
      setSaveState("saving");
      writeLocalDraft(draftStorageKey, {
        answers,
        lastCategoryIndex: categories.length,
        lastGlobalIndex: totalQuestions - 1,
        savedAt: new Date().toISOString(),
      });
      setSaveState("saved");
      setSubmitting(false);
      onComplete(answers);
      return;
    }

    if (isLastQuestionInCategory(idx)) {
      const nextCatIndex = categories.findIndex(
        (c) => c.id === orderedQuestions[idx + 1].category
      );
      // Auto-save at category checkpoint
      await saveDraft(answers, nextCatIndex);
      setFlowState({ type: "category-intro", categoryIndex: nextCatIndex });
    } else {
      setValidationError(null);
      setFlowState({ type: "question", globalIndex: idx + 1 });
    }
  };

  const goBack = () => {
    setValidationError(null);
    if (flowState.type === "category-intro") {
      if (flowState.categoryIndex === 0) {
        onBack();
        return;
      }
      const prevCatId = categories[flowState.categoryIndex - 1].id;
      const prevCatQuestions = orderedQuestions.filter((q) => q.category === prevCatId);
      const lastOfPrev = orderedQuestions.indexOf(prevCatQuestions[prevCatQuestions.length - 1]);
      setFlowState({ type: "question", globalIndex: lastOfPrev });
      return;
    }

    const idx = flowState.globalIndex;
    const currentCat = orderedQuestions[idx].category;
    const catStart = orderedQuestions.findIndex((q) => q.category === currentCat);

    if (idx === catStart) {
      const catIndex = categories.findIndex((c) => c.id === currentCat);
      setFlowState({ type: "category-intro", categoryIndex: catIndex });
    } else {
      setFlowState({ type: "question", globalIndex: idx - 1 });
    }
  };

  // Pause: save current state and exit
  const handlePause = async () => {
    if (pausing) return;
    const currentCatIndex =
      flowState.type === "category-intro"
        ? flowState.categoryIndex
        : categories.findIndex(
            (c) => c.id === orderedQuestions[flowState.globalIndex].category
          );
    const pauseDraft: QuestionnairePauseDraft = {
      answers,
      lastCategoryIndex: currentCatIndex,
      lastGlobalIndex: flowState.type === "question" ? flowState.globalIndex : undefined,
    };
    setPausing(true);
    writeLocalDraft(draftStorageKey, {
      ...pauseDraft,
      savedAt: new Date().toISOString(),
    });
    try {
      await saveDraft(answers, currentCatIndex);
      toast.success("Fortschritt gespeichert", {
        description: "Du bleibst angemeldet und kannst jederzeit weitermachen.",
      });
      await onPauseExit(pauseDraft);
    } finally {
      setPausing(false);
    }
  };

  // Auto-save on answer change (debounced, silent)
  useEffect(() => {
    if (Object.keys(answers).length === 0) return;
    const currentCatIndex =
      flowState.type === "category-intro"
        ? flowState.categoryIndex
        : categories.findIndex(
            (c) => c.id === orderedQuestions[flowState.globalIndex].category
          );
    writeLocalDraft(draftStorageKey, {
      answers,
      lastCategoryIndex: currentCatIndex,
      lastGlobalIndex: flowState.type === "question" ? flowState.globalIndex : undefined,
      savedAt: new Date().toISOString(),
    });
    const handle = setTimeout(() => {
      saveDraft(answers, currentCatIndex, { silent: true });
    }, 1500);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, flowState]);

  const isLastQuestion =
    flowState.type === "question" && flowState.globalIndex === totalQuestions - 1;

  const SaveIndicator = () => {
    if (saveState === "saving") {
      return (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          Speichern…
        </span>
      );
    }
    if (saveState === "saved") {
      return (
        <span className="flex items-center gap-1.5 text-xs text-primary">
          <Cloud className="w-3 h-3" />
          Gespeichert
        </span>
      );
    }
    if (saveState === "error") {
      return (
        <span className="flex items-center gap-1.5 text-xs text-destructive">
          <CloudOff className="w-3 h-3" />
          Speichern fehlgeschlagen
        </span>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 px-5 md:px-6 py-2.5 md:py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between gap-3 mb-2 md:mb-3">
            <div className="min-h-[1rem]">
              <SaveIndicator />
            </div>
            <button
              onClick={handlePause}
              disabled={submitting || pausing}
              className="flex min-h-11 items-center gap-2 rounded-xl border border-border bg-secondary/70 px-3 py-2 text-xs font-medium text-secondary-foreground hover:bg-muted transition-colors disabled:opacity-60"
            >
              {pausing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pause className="h-3.5 w-3.5" />}
              {pausing ? "Wird gespeichert…" : "Speichern & Pause"}
            </button>
          </div>
          <p className="mb-2 text-[11px] leading-snug text-muted-foreground md:text-xs">
            Deine Antworten werden zwischengespeichert. Du kannst jederzeit pausieren und später weiterarbeiten.
          </p>
          {flowState.type === "question" && currentQuestion && (
            <QuestionnaireProgress
              current={flowState.globalIndex}
              total={totalQuestions}
              categoryTitle={getCurrentCategoryForQuestion(flowState.globalIndex).title}
            />
          )}
          {flowState.type === "category-intro" && (
            <div className="text-sm text-muted-foreground font-heading">
              Bereich {flowState.categoryIndex + 1} von {categories.length}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start md:items-center justify-center px-5 md:px-6 py-5 pb-28 md:py-12">
        <div className="max-w-2xl w-full">
          <AnimatePresence mode="wait">
            {flowState.type === "category-intro" && (
              <CategoryIntro
                key={`cat-${flowState.categoryIndex}`}
                categoryId={categories[flowState.categoryIndex].id}
                onContinue={goNext}
                showInlineButton={false}
              />
            )}
            {flowState.type === "question" && currentQuestion && (
              <QuestionCard
                key={currentQuestion.id}
                question={currentQuestion}
                answer={answers[currentQuestion.id]}
                onAnswer={(val) => handleAnswer(currentQuestion.id, val)}
                isRequired={isRequiredQuestion(currentQuestion)}
                validationError={validationError}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom navigation */}
      {(flowState.type === "question" || flowState.type === "category-intro") && (
        <div className="sticky bottom-0 bg-background/90 backdrop-blur-xl border-t border-border/50 px-5 md:px-6 pt-2.5 md:pt-4 pb-[calc(env(safe-area-inset-bottom)+0.625rem)] md:pb-4">
          {submitError && (
            <div className="max-w-2xl mx-auto mb-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs text-muted-foreground">
              {submitError}
            </div>
          )}
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <button
              onClick={goBack}
              className="flex items-center gap-2 px-5 py-2.5 md:py-3 rounded-xl text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Zurück</span>
            </button>

            <motion.button
              whileHover={canProceed() && !submitting ? { scale: 1.02 } : {}}
              whileTap={canProceed() && !submitting ? { scale: 0.98 } : {}}
              onClick={goNext}
              disabled={!canProceed() || submitting}
              className={`flex min-w-[8.5rem] items-center justify-center gap-2 px-6 py-3 md:py-3.5 rounded-xl font-heading font-semibold transition-all ${
                canProceed() && !submitting
                  ? "bg-primary text-primary-foreground hover:shadow-glow"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Speichert...
                </>
              ) : isLastQuestion ? (
                <>
                  Abschließen
                  <Check className="w-4 h-4" />
                </>
              ) : (
                <>
                  Weiter
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionnaireFlow;
