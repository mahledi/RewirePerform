import { motion } from "framer-motion";
import {
  Brain, Eye, Flame, Heart, Target, Sparkles, Wind, Sunrise, BookOpen, Shield,
  Check, Quote,
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
  const Icon = iconMap[task.icon ?? "brain"] ?? Brain;
  const useMoment = task.trigger || task.whenToUse;
  const momentLines = [
    task.microReframe || task.reframeStep?.reframe,
    task.selfTalk || task.reframeStep?.anchor,
  ].filter(Boolean);

  return (
    <motion.div
      key="task-detail"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      className="space-y-6"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-heading text-2xl font-bold leading-tight">{task.title}</h2>
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
            Deine Mission
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-card border border-border/50 overflow-hidden">
        <div className="p-5 border-b border-border/40">
          <p className="text-xs font-medium text-primary uppercase tracking-wider mb-2">Worum es heute geht</p>
          <p className="text-sm text-foreground leading-relaxed">{task.why}</p>
        </div>

        <div className="p-5 border-b border-border/40">
          <p className="text-xs font-medium text-primary uppercase tracking-wider mb-2">Wann du es nutzt</p>
          <p className="text-sm text-foreground leading-relaxed">{useMoment}</p>
        </div>

        <div className="p-5">
          <p className="text-xs font-medium text-primary uppercase tracking-wider mb-2">Was du konkret machst</p>
          <p className="whitespace-pre-line text-sm text-foreground leading-relaxed">{task.concreteAction}</p>
        </div>
      </div>

      {momentLines.length > 0 && (
        <div className="p-5 rounded-2xl bg-secondary/30 border border-border/40 flex gap-3">
          <Quote className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-primary uppercase tracking-wider mb-2">Satz für den Moment</p>
            <div className="space-y-2">
              {momentLines.map((line, index) => (
                <p key={index} className="text-sm text-foreground/90 leading-relaxed">
                  {index === momentLines.length - 1 ? `„${line}"` : line}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {task.sportSpecificExamples && task.sportSpecificExamples.length > 0 && (
        <div className="p-4 rounded-2xl bg-secondary/20 space-y-2">
          <p className="text-xs font-medium text-primary uppercase tracking-wider">Beispiel im Sport</p>
          {task.sportSpecificExamples.slice(0, 2).map((ex, i) => (
            <p key={i} className="text-xs text-foreground/80 leading-relaxed">
              {ex.example}
            </p>
          ))}
        </div>
      )}

      {task.visualizationCue && (
        <div className="p-4 rounded-2xl bg-accent/5 border border-accent/10">
          <p className="text-xs font-medium text-primary uppercase tracking-wider mb-1">Kurze Vorstellung</p>
          <p className="text-sm text-foreground leading-relaxed">{task.visualizationCue.scene}</p>
          <p className="text-xs text-muted-foreground mt-1">{task.visualizationCue.durationSec}s</p>
        </div>
      )}

      <motion.button
        data-testid={`task-complete-${task.id}`}
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
