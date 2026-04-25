import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Cloud, CloudOff, Loader2, Pause } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { questions, categories, getQuestionsByCategory } from "@/data/questionnaireData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import QuestionnaireProgress from "./QuestionnaireProgress";
import QuestionCard from "./QuestionCard";
import CategoryIntro from "./CategoryIntro";

interface QuestionnaireFlowProps {
  onComplete: (answers: Record<string, string | string[] | number>) => void;
  onBack: () => void;
  initialAnswers?: Record<string, string | string[] | number>;
  initialCategoryIndex?: number;
  draftId?: string | null;
}

type FlowState =
  | { type: "category-intro"; categoryIndex: number }
  | { type: "question"; globalIndex: number };

type SaveState = "idle" | "saving" | "saved" | "error";

const QuestionnaireFlow = ({
  onComplete,
  onBack,
  initialAnswers = {},
  initialCategoryIndex = 0,
  draftId = null,
}: QuestionnaireFlowProps) => {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Record<string, string | string[] | number>>(initialAnswers);
  const [flowState, setFlowState] = useState<FlowState>({
    type: "category-intro",
    categoryIndex: Math.min(initialCategoryIndex, categories.length - 1),
  });
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const draftIdRef = useRef<string | null>(draftId);
  const isSavingRef = useRef<boolean>(false);
  const pendingSaveRef = useRef<{ answers: Record<string, string | string[] | number>; categoryIndex: number; silent: boolean } | null>(null);

  const orderedQuestions = useMemo(() => {
    return categories.flatMap((cat) => getQuestionsByCategory(cat.id));
  }, []);

  const totalQuestions = orderedQuestions.length;

  const handleAnswer = useCallback(
    (questionId: string, value: string | string[] | number) => {
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

        // Falls noch keine draftId bekannt: prüfen ob es schon einen offenen Draft gibt
        // (z.B. parallele Sessions / weiterer Tab) und den verwenden statt neuen einzufügen.
        if (!draftIdRef.current) {
          const { data: existing } = await supabase
            .from("questionnaire_responses")
            .select("id")
            .eq("user_id", user.id)
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
              answers: currentAnswers as any,
              last_category_index: categoryIndex,
              progress_updated_at: new Date().toISOString(),
            })
            .eq("id", draftIdRef.current);
          if (error) throw error;
        } else {
          const { data, error } = await supabase
            .from("questionnaire_responses")
            .insert({
              user_id: user.id,
              session_id: user.id,
              answers: currentAnswers as any,
              last_category_index: categoryIndex,
              is_complete: false,
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
              .eq("is_complete", false)
              .order("progress_updated_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            if (rescued?.id) {
              draftIdRef.current = rescued.id;
              await supabase
                .from("questionnaire_responses")
                .update({
                  answers: currentAnswers as any,
                  last_category_index: categoryIndex,
                  progress_updated_at: new Date().toISOString(),
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
          // eslint-disable-next-line @typescript-eslint/no-use-before-define
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
    if (answer === undefined || answer === "") return false;
    if (Array.isArray(answer) && answer.length === 0) return false;
    return true;
  };

  const goNext = async () => {
    if (flowState.type === "category-intro") {
      const startIndex = getGlobalIndexForCategoryStart(flowState.categoryIndex);
      setFlowState({ type: "question", globalIndex: startIndex });
      return;
    }

    const idx = flowState.globalIndex;
    if (idx >= totalQuestions - 1) {
      // Final submit — mark complete
      if (draftIdRef.current) {
        await supabase
          .from("questionnaire_responses")
          .update({
            answers: answers as any,
            is_complete: true,
            last_category_index: categories.length,
          })
          .eq("id", draftIdRef.current);
      }
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
      setFlowState({ type: "question", globalIndex: idx + 1 });
    }
  };

  const goBack = () => {
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
    const currentCatIndex =
      flowState.type === "category-intro"
        ? flowState.categoryIndex
        : categories.findIndex(
            (c) => c.id === orderedQuestions[flowState.globalIndex].category
          );
    await saveDraft(answers, currentCatIndex);
    toast({
      title: "Fortschritt gespeichert",
      description: "Du kannst jederzeit zurückkommen und weitermachen.",
    });
    navigate("/dashboard");
  };

  // Auto-save on answer change (debounced, silent)
  useEffect(() => {
    if (Object.keys(answers).length === 0) return;
    const handle = setTimeout(() => {
      const currentCatIndex =
        flowState.type === "category-intro"
          ? flowState.categoryIndex
          : categories.findIndex(
              (c) => c.id === orderedQuestions[flowState.globalIndex].category
            );
      saveDraft(answers, currentCatIndex, { silent: true });
    }, 1500);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers]);

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
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="min-h-[1rem]">
              <SaveIndicator />
            </div>
            <button
              onClick={handlePause}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Pause className="w-3 h-3" />
              Pause &amp; später fortsetzen
            </button>
          </div>
          {flowState.type === "question" && currentQuestion && (
            <QuestionnaireProgress
              current={flowState.globalIndex}
              total={totalQuestions}
              categoryTitle={getCurrentCategoryForQuestion(flowState.globalIndex).title}
              categoryIcon={getCurrentCategoryForQuestion(flowState.globalIndex).icon}
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
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-2xl w-full">
          <AnimatePresence mode="wait">
            {flowState.type === "category-intro" && (
              <CategoryIntro
                key={`cat-${flowState.categoryIndex}`}
                categoryId={categories[flowState.categoryIndex].id}
                onContinue={goNext}
              />
            )}
            {flowState.type === "question" && currentQuestion && (
              <QuestionCard
                key={currentQuestion.id}
                question={currentQuestion}
                answer={answers[currentQuestion.id]}
                onAnswer={(val) => handleAnswer(currentQuestion.id, val)}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom navigation */}
      {flowState.type === "question" && (
        <div className="sticky bottom-0 bg-background/80 backdrop-blur-xl border-t border-border/50 px-6 py-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <button
              onClick={goBack}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Zurück</span>
            </button>

            <motion.button
              whileHover={canProceed() ? { scale: 1.02 } : {}}
              whileTap={canProceed() ? { scale: 0.98 } : {}}
              onClick={goNext}
              disabled={!canProceed()}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-heading font-semibold transition-all ${
                canProceed()
                  ? "bg-primary text-primary-foreground hover:shadow-glow"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
            >
              {isLastQuestion ? (
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
