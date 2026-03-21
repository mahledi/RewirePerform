import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { questions, categories, getQuestionsByCategory } from "@/data/questionnaireData";
import QuestionnaireProgress from "./QuestionnaireProgress";
import QuestionCard from "./QuestionCard";
import CategoryIntro from "./CategoryIntro";

interface QuestionnaireFlowProps {
  onComplete: (answers: Record<string, string | string[] | number>) => void;
  onBack: () => void;
}

type FlowState =
  | { type: "category-intro"; categoryIndex: number }
  | { type: "question"; globalIndex: number };

const QuestionnaireFlow = ({ onComplete, onBack }: QuestionnaireFlowProps) => {
  const [answers, setAnswers] = useState<Record<string, string | string[] | number>>({});
  const [flowState, setFlowState] = useState<FlowState>({
    type: "category-intro",
    categoryIndex: 0,
  });

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

  const canProceed = () => {
    if (flowState.type === "category-intro") return true;
    if (!currentQuestion) return false;
    const answer = answers[currentQuestion.id];
    if (answer === undefined || answer === "") return false;
    if (Array.isArray(answer) && answer.length === 0) return false;
    return true;
  };

  const goNext = () => {
    if (flowState.type === "category-intro") {
      const startIndex = getGlobalIndexForCategoryStart(flowState.categoryIndex);
      setFlowState({ type: "question", globalIndex: startIndex });
      return;
    }

    const idx = flowState.globalIndex;
    if (idx >= totalQuestions - 1) {
      onComplete(answers);
      return;
    }

    if (isLastQuestionInCategory(idx)) {
      const nextCatIndex = categories.findIndex(
        (c) => c.id === orderedQuestions[idx + 1].category
      );
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

  const isLastQuestion =
    flowState.type === "question" && flowState.globalIndex === totalQuestions - 1;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 px-6 py-4">
        <div className="max-w-2xl mx-auto">
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
