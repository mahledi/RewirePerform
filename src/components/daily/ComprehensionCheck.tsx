import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, ArrowRight } from "lucide-react";
import type { ComprehensionQuestion } from "@/content/matrixDayTypes";

interface Props {
  questions: ComprehensionQuestion[];
  onComplete: (results: { questionId: string; selectedOptionId: string; isCorrect: boolean }[]) => void;
}

export default function ComprehensionCheck({ questions, onComplete }: Props) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [results, setResults] = useState<
    { questionId: string; selectedOptionId: string; isCorrect: boolean }[]
  >([]);

  const q = questions[index];
  const total = questions.length;
  const isLast = index === total - 1;
  const correct = useMemo(() => (selected ? selected === q.correctOptionId : false), [selected, q]);

  if (!q) {
    return (
      <div className="text-center text-muted-foreground text-sm py-8">
        Heute kein Verständnis-Check verfügbar.
      </div>
    );
  }

  const handleSelect = (optionId: string) => {
    if (showFeedback) return;
    setSelected(optionId);
    setShowFeedback(true);
  };

  const handleNext = () => {
    if (!selected) return;
    const newResult = { questionId: q.id, selectedOptionId: selected, isCorrect: correct };
    const next = [...results, newResult];
    setResults(next);
    if (isLast) {
      onComplete(next);
      return;
    }
    setIndex(index + 1);
    setSelected(null);
    setShowFeedback(false);
  };

  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>Frage {index + 1} / {total}</span>
          <span>{results.filter((r) => r.isCorrect).length} richtig</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            animate={{ width: `${((index + (showFeedback ? 1 : 0)) / total) * 100}%` }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={q.id}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
        >
          <h3 className="font-heading text-xl font-semibold mb-5 leading-snug">{q.stem}</h3>

          <div className="space-y-2 mb-5">
            {q.options.map((opt) => {
              const isSelected = selected === opt.id;
              const isCorrectOpt = opt.id === q.correctOptionId;
              const showState = showFeedback && (isSelected || isCorrectOpt);
              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelect(opt.id)}
                  disabled={showFeedback}
                  className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3 ${
                    showState && isCorrectOpt
                      ? "bg-primary/10 border-primary text-foreground"
                      : showState && isSelected && !isCorrectOpt
                      ? "bg-destructive/10 border-destructive/50 text-foreground"
                      : isSelected
                      ? "bg-secondary border-primary/50"
                      : "bg-secondary/40 border-border/50 hover:bg-secondary/70"
                  } ${showFeedback ? "cursor-default" : "active:scale-[0.99]"}`}
                >
                  <span className="text-sm flex-1">{opt.text}</span>
                  {showState && isCorrectOpt && <Check className="w-5 h-5 text-primary shrink-0" />}
                  {showState && isSelected && !isCorrectOpt && <X className="w-5 h-5 text-destructive shrink-0" />}
                </button>
              );
            })}
          </div>

          <AnimatePresence>
            {showFeedback && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-accent/10 border border-accent/20 mb-5"
              >
                <p className="text-xs text-muted-foreground leading-relaxed">{q.explanation}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={handleNext}
            disabled={!showFeedback}
            className={`w-full flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-heading font-semibold transition-all ${
              showFeedback
                ? "bg-primary text-primary-foreground hover:shadow-glow"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            {isLast ? "Check abschließen" : "Weiter"} <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
