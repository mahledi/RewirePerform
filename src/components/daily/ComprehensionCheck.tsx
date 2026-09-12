import { useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Check, X, ArrowRight, Loader2 } from "lucide-react";
import type { ComprehensionQuestion } from "@/content/matrixDayTypes";
import {
  AthleteFlowButton,
  AthleteFlowProgress,
  athleteFlowChoice,
  athleteFlowPanel,
  athleteFlowPrimaryButton,
} from "@/components/app/AthleteFlowScene";

interface Props {
  questions: ComprehensionQuestion[];
  onComplete: (results: { questionId: string; selectedOptionId: string; isCorrect: boolean }[]) => void | Promise<void>;
}

export const shuffleComprehensionOptions = (questions: ComprehensionQuestion[]) =>
  questions.map((question) => {
    const options = [...question.options];
    for (let i = options.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    return { ...question, options };
  });

export default function ComprehensionCheck({ questions, onComplete }: Props) {
  const reduceMotion = useReducedMotion();
  const shuffledQuestions = useMemo(() => shuffleComprehensionOptions(questions), [questions]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [results, setResults] = useState<
    { questionId: string; selectedOptionId: string; isCorrect: boolean }[]
  >([]);
  const [completing, setCompleting] = useState(false);

  const q = shuffledQuestions[index];
  const total = shuffledQuestions.length;
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
      setCompleting(true);
      Promise.resolve(onComplete(next)).catch(() => setCompleting(false));
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
        <AthleteFlowProgress value={((index + (showFeedback ? 1 : 0)) / total) * 100} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={q.id}
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 14, scale: 0.992 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -10, scale: 0.995 }}
          transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
        >
          <h3 className="font-heading text-xl font-semibold mb-5 leading-snug">{q.stem}</h3>

          <div className="space-y-2 mb-5">
            {q.options.map((opt) => {
              const isSelected = selected === opt.id;
              const isCorrectOpt = opt.id === q.correctOptionId;
              const showState = showFeedback && (isSelected || isCorrectOpt);
              return (
                <AthleteFlowButton
                  key={opt.id}
                  data-testid={`comprehension-option-${opt.id}`}
                  onClick={() => handleSelect(opt.id)}
                  disabled={showFeedback}
                  aria-pressed={isSelected}
                  pressScale={0.985}
                  className={`${athleteFlowChoice(isSelected)} min-h-14 items-start p-4 ${
                    showState && isCorrectOpt
                      ? "border-primary/60 bg-primary/[0.1] text-foreground shadow-[inset_0_1px_0_rgba(98,198,168,0.12)]"
                      : showState && isSelected && !isCorrectOpt
                      ? "bg-destructive/10 border-destructive/50 text-foreground"
                      : ""
                  } ${showFeedback ? "cursor-default" : ""}`}
                >
                  <span className="text-sm flex-1">{opt.text}</span>
                  {showState && isCorrectOpt && <Check className="w-5 h-5 text-primary shrink-0" />}
                  {showState && isSelected && !isCorrectOpt && <X className="w-5 h-5 text-destructive shrink-0" />}
                </AthleteFlowButton>
              );
            })}
          </div>

          <AnimatePresence>
            {showFeedback && (
              <motion.div
                initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
                className={`mb-5 ${athleteFlowPanel} p-4`}
              >
                <p className="text-xs text-muted-foreground leading-relaxed">{q.explanation}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <AthleteFlowButton
            data-testid={isLast ? "comprehension-finish" : "comprehension-next"}
            onClick={handleNext}
            disabled={!showFeedback || completing}
            className={`${athleteFlowPrimaryButton} w-full`}
          >
            {completing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Speichert...
              </>
            ) : (
              <>
                {isLast ? "Check abschließen" : "Weiter"} <ArrowRight className="w-4 h-4" />
              </>
            )}
          </AthleteFlowButton>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
