import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Brain, Eye, Flame, Heart, Target, Sparkles, Wind, Sunrise, BookOpen, Shield,
  Check, ChevronDown,
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
}

const TaskDetail = ({ task, isCompleted, onComplete }: TaskDetailProps) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const Icon = iconMap[task.icon ?? "brain"] ?? Brain;
  const useMoment = task.trigger || task.whenToUse;
  const actionSteps = task.concreteAction
    .split("\n")
    .map((step) => step.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);
  const explanationParagraphs = task.detailedExplanation
    ?.split(/\n\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean) ?? [];

  return (
    <motion.div
      key="task-detail"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      className="space-y-5"
    >
      <section
        data-testid="daily-mission"
        className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-[linear-gradient(145deg,rgba(46,173,137,0.10),rgba(17,20,24,0.96)_38%,rgba(13,14,18,0.98))] px-5 py-6 shadow-[0_28px_90px_rgba(0,0,0,0.32)] sm:px-6 sm:py-7"
      >
        <div className="pointer-events-none absolute inset-x-[12%] top-0 h-28 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
              <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Deine Mission</p>
          </div>

          <h2 className="font-heading text-[1.75rem] font-bold leading-[1.08] text-foreground sm:text-3xl">
            {task.title}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-foreground/78">{task.why}</p>

          <div className="mt-6 rounded-2xl bg-black/20 px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">Wenn es passiert</p>
            <p className="mt-2 text-sm leading-relaxed text-foreground/88">{useMoment}</p>
          </div>

          <div className="mt-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">Was du machst</p>
            <ol className="mt-3 space-y-3">
              {actionSteps.map((step, index) => (
                <li key={`${task.id}-step-${index}`} className="flex gap-3 text-[15px] leading-relaxed text-foreground/92">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/14 text-xs font-semibold tabular-nums text-primary">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {task.selfTalk && (
            <div className="mt-7 rounded-2xl border border-primary/20 bg-primary/[0.09] px-5 py-5 text-center shadow-[0_16px_48px_rgba(46,173,137,0.08)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/80">Dein Satz für den Moment</p>
              <p className="mt-2 font-heading text-xl font-semibold leading-snug text-primary sm:text-2xl">
                {task.selfTalk}
              </p>
            </div>
          )}
        </div>
      </section>

      {explanationParagraphs.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025]">
          <button
            type="button"
            aria-expanded={detailsOpen}
            aria-controls={`task-explanation-${task.id}`}
            onClick={() => setDetailsOpen((open) => !open)}
            className="flex min-h-12 w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-foreground transition-colors hover:bg-white/[0.035] active:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span>Genauer verstehen</span>
            <ChevronDown
              className={`h-5 w-5 shrink-0 text-primary transition-transform duration-200 ${detailsOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>
          <AnimatePresence initial={false}>
            {detailsOpen && (
              <motion.div
                id={`task-explanation-${task.id}`}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <div className="space-y-3 border-t border-white/[0.06] px-5 py-5">
                  {explanationParagraphs.map((paragraph, index) => (
                    <p key={`${task.id}-explanation-${index}`} className="text-[15px] leading-7 text-foreground/78">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <motion.button
        data-testid={`task-complete-${task.id}`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onComplete}
        disabled={isCompleted}
        className={`flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl px-8 py-4 font-heading text-lg font-semibold transition-all ${
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
