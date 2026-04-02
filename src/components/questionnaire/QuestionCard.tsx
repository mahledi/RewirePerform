import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Question } from "@/data/questionnaireData";
import VoiceInput from "@/components/VoiceInput";

interface QuestionCardProps {
  question: Question;
  answer: string | string[] | number | undefined;
  onAnswer: (value: string | string[] | number) => void;
}

const QuestionCard = ({ question, answer, onAnswer }: QuestionCardProps) => {
  const [textValue, setTextValue] = useState(
    typeof answer === "string" ? answer : ""
  );

  const handleTextChange = (val: string) => {
    setTextValue(val);
    onAnswer(val);
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={question.id}
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -40 }}
        transition={{ duration: 0.4 }}
        className="w-full"
      >
        {/* Depth indicator */}
        <div className="flex items-center gap-2 mb-4">
          {question.depth === "core" && (
            <span className="px-2.5 py-1 rounded-md bg-primary/10 text-xs font-medium text-primary">
              Kernfrage
            </span>
          )}
          {question.depth === "deep" && (
            <span className="px-2.5 py-1 rounded-md bg-secondary text-xs font-medium text-secondary-foreground">
              Tiefgehend
            </span>
          )}
        </div>

        <h2 className="font-heading text-2xl md:text-3xl font-bold mb-3 leading-tight">
          {question.question}
        </h2>

        {question.subtext && (
          <p className="text-muted-foreground mb-8 leading-relaxed">
            {question.subtext}
          </p>
        )}

        {/* Scale input */}
        {question.type === "scale" && (
          <div className="mt-8">
            <div className="flex justify-between text-sm text-muted-foreground mb-3">
              <span>{question.scaleLabels?.[0]}</span>
              <span>{question.scaleLabels?.[1]}</span>
            </div>
            <div className="grid grid-cols-10 gap-2">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((val) => (
                <button
                  key={val}
                  onClick={() => onAnswer(val)}
                  className={`h-12 rounded-lg font-heading font-semibold text-sm transition-all ${
                    answer === val
                      ? "bg-primary text-primary-foreground shadow-glow"
                      : "bg-secondary text-secondary-foreground hover:bg-accent"
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Text input */}
        {question.type === "text" && (
          <textarea
            value={textValue}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder={question.placeholder}
            rows={5}
            className="w-full mt-6 p-5 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 resize-none font-body leading-relaxed transition-all"
          />
        )}

        {/* Single choice */}
        {question.type === "choice" && (
          <div className="mt-6 space-y-3">
            {question.options?.map((opt) => (
              <button
                key={opt}
                onClick={() => onAnswer(opt)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  answer === opt
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-secondary text-secondary-foreground hover:border-primary/30"
                }`}
              >
                <span className="text-sm">{opt}</span>
              </button>
            ))}
          </div>
        )}

        {/* Multi choice */}
        {question.type === "multi" && (
          <div className="mt-6 space-y-3">
            {question.options?.map((opt) => {
              const selected = Array.isArray(answer) && answer.includes(opt);
              return (
                <button
                  key={opt}
                  onClick={() => {
                    const current = Array.isArray(answer) ? answer : [];
                    const updated = selected
                      ? current.filter((a) => a !== opt)
                      : [...current, opt];
                    onAnswer(updated);
                  }}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selected
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-secondary text-secondary-foreground hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                        selected ? "border-primary bg-primary" : "border-muted-foreground/30"
                      }`}
                    >
                      {selected && (
                        <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm">{opt}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default QuestionCard;
