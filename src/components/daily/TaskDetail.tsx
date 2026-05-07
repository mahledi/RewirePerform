import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Eye, Flame, Heart, Target, Sparkles, Wind, Sunrise, BookOpen, Shield,
  Check, Lightbulb, ChevronDown, ArrowRight, MessageCircle, Quote,
} from "lucide-react";
import type { DailyTask } from "@/content/matrixDayTypes";

const iconMap: Record<string, typeof Brain> = {
  brain: Brain, eye: Eye, flame: Flame, heart: Heart, target: Target,
  wind: Wind, sunrise: Sunrise, book: BookOpen, sparkles: Sparkles, shield: Shield,
};

interface TaskDetailProps {
  task: DailyTask;
  isCompleted: boolean;
  onComplete: () => void;
  onBack?: () => void;
}

/**
 * Task Detail mit interaktiver Reframing-Schicht.
 * Step-through (Trigger → Reframe → Anchor → Self-Talk → Aktion).
 * Bewusst leicht, nicht gamified.
 */
const TaskDetail = ({ task, isCompleted, onComplete }: TaskDetailProps) => {
  const Icon = iconMap[task.icon ?? "brain"] ?? Brain;
  const [reframeStep, setReframeStep] = useState(0); // 0: trigger, 1: reframe, 2: anchor, 3: ready
  const [showWhy, setShowWhy] = useState(false);
  const hasReframe = !!task.reframeStep;

  const reframeSteps = task.reframeStep
    ? [
        { label: "Trigger", icon: Flame, text: task.reframeStep.trigger },
        { label: "Reframe", icon: Eye, text: task.reframeStep.reframe },
        { label: "Heute", icon: Target, text: task.reframeStep.anchor },
      ]
    : [];

  return (
    <motion.div
      key="task-detail"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-heading text-2xl font-bold leading-tight">{task.title}</h2>
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
            {task.systemFunction} · {task.whenToUse}
          </p>
        </div>
      </div>

      {/* Why */}
      <button
        onClick={() => setShowWhy(!showWhy)}
        className={`w-full text-left rounded-2xl p-4 transition-all ${
          showWhy ? "bg-accent/10 border border-accent/20" : "bg-secondary/30 hover:bg-secondary/50"
        }`}
      >
        <div className="flex items-center gap-2 text-xs font-medium text-primary mb-1">
          <Lightbulb className="w-3.5 h-3.5" />
          <span>Warum heute</span>
          <ChevronDown className={`w-3 h-3 ml-auto transition-transform ${showWhy ? "rotate-180" : ""}`} />
        </div>
        <p className="text-sm text-foreground leading-relaxed">{task.why}</p>
        {showWhy && (
          <p className="text-xs text-muted-foreground leading-relaxed mt-3 pt-3 border-t border-border/30">
            {task.detailedExplanation}
          </p>
        )}
      </button>

      {/* Trigger — Wann der Task aktiv wird */}
      {task.trigger && (
        <div className="p-4 rounded-2xl bg-accent/5 border border-accent/10">
          <p className="text-[11px] uppercase tracking-widest text-primary mb-1 flex items-center gap-1.5">
            <Flame className="w-3 h-3" /> Wann aktiv
          </p>
          <p className="text-sm text-foreground/90 leading-relaxed">{task.trigger}</p>
        </div>
      )}

      {/* Concrete Action */}
      <div className="p-5 rounded-2xl bg-gradient-card border-glow">
        <p className="text-xs font-medium text-primary uppercase tracking-wider mb-2">Konkrete Handlung</p>
        <p className="text-sm text-foreground leading-relaxed">{task.concreteAction}</p>
      </div>

      {/* Reframing Step-through */}
      {hasReframe && (
        <div className="p-5 rounded-2xl bg-secondary/40 border border-border/40">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-medium text-primary uppercase tracking-wider">Reframing</p>
            <div className="flex gap-1">
              {reframeSteps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all ${
                    i <= reframeStep ? "bg-primary w-6" : "bg-border w-3"
                  }`}
                />
              ))}
            </div>
          </div>
          <AnimatePresence mode="wait">
            {reframeStep < reframeSteps.length && (
              <motion.div
                key={reframeStep}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  {reframeSteps[reframeStep].label}
                </p>
                <p className="text-base text-foreground leading-relaxed">
                  {reframeSteps[reframeStep].text}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          {reframeStep < reframeSteps.length && (
            <button
              onClick={() => setReframeStep((s) => Math.min(s + 1, reframeSteps.length))}
              className="mt-4 inline-flex items-center gap-2 text-sm text-primary font-medium"
            >
              {reframeStep === reframeSteps.length - 1 ? "Verstanden" : "Weiter"}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Self-Talk Anchor */}
      {task.selfTalk && (
        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex gap-3">
          <Quote className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] uppercase tracking-widest text-primary mb-1">Self-Talk Anker</p>
            <p className="text-sm text-foreground italic leading-relaxed">„{task.selfTalk}"</p>
          </div>
        </div>
      )}

      {/* Micro Reframe (kompakt) */}
      {task.microReframe && (
        <div className="p-4 rounded-2xl bg-secondary/30 flex gap-3">
          <MessageCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">{task.microReframe}</p>
        </div>
      )}

      {/* Sport-spezifische Beispiele */}
      {task.sportSpecificExamples && task.sportSpecificExamples.length > 0 && (
        <div className="p-4 rounded-2xl bg-secondary/20 space-y-2">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">In deinem Sport</p>
          {task.sportSpecificExamples.map((ex, i) => (
            <p key={i} className="text-xs text-foreground/80 leading-relaxed">
              {ex.example}
            </p>
          ))}
        </div>
      )}

      {/* Visualization Cue (nur wenn vorgesehen) */}
      {task.visualizationCue && (
        <div className="p-4 rounded-2xl bg-accent/5 border border-accent/10">
          <p className="text-[11px] uppercase tracking-widest text-primary mb-1">Visualisierung</p>
          <p className="text-sm text-foreground leading-relaxed">{task.visualizationCue.scene}</p>
          <p className="text-xs text-muted-foreground mt-1">{task.visualizationCue.durationSec}s</p>
        </div>
      )}

      {/* Complete */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onComplete}
        disabled={isCompleted}
        className={`w-full flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-heading font-semibold text-lg transition-all ${
          isCompleted
            ? "bg-primary/20 text-primary cursor-default"
            : "bg-primary text-primary-foreground hover:shadow-glow"
        }`}
      >
        {isCompleted ? (
          <><Check className="w-5 h-5" /> Verstanden</>
        ) : (
          <><Check className="w-5 h-5" /> Verstanden</>
        )}
      </motion.button>
    </motion.div>
  );
};

export default TaskDetail;
