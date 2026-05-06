import { useMemo, useState } from "react";
import { resolveDay } from "@/lib/getDayContent";
import type { CalendarEventType, DailyTask } from "@/content/matrixDayTypes";
import TaskDetail from "@/components/daily/TaskDetail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Brain, Eye, Flame, Heart, Target, Sparkles, Wind, Sunrise, BookOpen, Shield,
  ArrowLeft, Lightbulb, Sprout, Zap, Trophy, Dumbbell, Moon, Quote, ScrollText, CheckCircle2,
} from "lucide-react";

const iconMap: Record<string, typeof Brain> = {
  brain: Brain, eye: Eye, flame: Flame, heart: Heart, target: Target,
  wind: Wind, sunrise: Sunrise, book: BookOpen, sparkles: Sparkles, shield: Shield,
};

const eventTypes: { id: CalendarEventType; label: string; icon: typeof Dumbbell }[] = [
  { id: "training", label: "Training", icon: Dumbbell },
  { id: "rest", label: "Ruhetag", icon: Moon },
  { id: "competition", label: "Wettkampf", icon: Trophy },
];

const phaseLabel: Record<number, string> = {
  1: "Phase 1 — Awareness",
  2: "Phase 2 — Reframing",
  3: "Phase 3 — Anchoring",
  4: "Phase 4 — Integration",
};

interface Props {
  dayNumber: number;
}

/**
 * Read-only Admin-Vorschau eines Programmtags — exakt wie der Spieler ihn sieht,
 * inklusive Tasks, Journal-Fragen und Comprehension-Pool.
 * Keine Speicherungen, keine User-Daten.
 */
const AdminDayPreview = ({ dayNumber }: Props) => {
  const [eventType, setEventType] = useState<CalendarEventType>("training");
  const [selectedTask, setSelectedTask] = useState<DailyTask | null>(null);

  const resolved = useMemo(
    () => resolveDay(dayNumber, new Date(), eventType),
    [dayNumber, eventType]
  );

  if (!resolved) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Kein Inhalt für Tag {dayNumber} hinterlegt.
      </div>
    );
  }

  const { matrix, content } = resolved;

  if (selectedTask) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedTask(null)}
          className="-ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück zur Tagesübersicht
        </Button>
        <TaskDetail
          task={selectedTask}
          isCompleted={false}
          onComplete={() => { /* no-op in admin preview */ }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="default" className="text-xs">Tag {matrix.dayNumber}</Badge>
          <Badge variant="secondary" className="text-xs">{phaseLabel[matrix.phase] ?? `Phase ${matrix.phase}`}</Badge>
          <Badge variant="outline" className="text-xs">Woche {matrix.week}</Badge>
          <Badge variant="outline" className="text-xs">{matrix.knowledgeLevel}</Badge>
          <Badge variant="outline" className="text-xs">{matrix.recurrenceType}</Badge>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-primary mb-1">Lens</p>
          <h2 className="text-2xl font-bold leading-tight">{matrix.lens}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Primärer Mechanismus</p>
            <p className="text-sm">{matrix.primaryMechanism}</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Practice Focus</p>
            <p className="text-sm">{matrix.practiceFocus}</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Day Role</p>
            <p className="text-sm">{matrix.dayRole}</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">System Function</p>
            <p className="text-sm">{matrix.systemFunction}</p>
          </div>
        </div>
      </div>

      {/* Kontext-Toggle (training/rest/competition) */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Kontextvariante (Spieler-Sicht):</p>
        <div className="flex gap-2 flex-wrap">
          {eventTypes.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              size="sm"
              variant={eventType === id ? "default" : "outline"}
              onClick={() => setEventType(id)}
            >
              <Icon className="w-3.5 h-3.5 mr-1.5" />
              {label}
            </Button>
          ))}
        </div>
        {content.variants && (
          <p className="text-xs text-muted-foreground mt-3 italic leading-relaxed">
            „{content.variants[eventType === "competition" ? "match" : eventType]}"
          </p>
        )}
      </div>

      {/* Today Trigger / Core Shift */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
          <p className="text-[10px] uppercase tracking-widest text-primary mb-1 flex items-center gap-1.5">
            <Zap className="w-3 h-3" /> Today Trigger
          </p>
          <p className="text-sm leading-relaxed">{content.todayTrigger}</p>
        </div>
        <div className="rounded-xl bg-accent/5 border border-accent/10 p-4">
          <p className="text-[10px] uppercase tracking-widest text-primary mb-1 flex items-center gap-1.5">
            <Sprout className="w-3 h-3" /> Core Shift
          </p>
          <p className="text-sm leading-relaxed">{content.coreShift}</p>
        </div>
      </div>

      {/* Science Bite */}
      <div className="rounded-xl bg-secondary/40 border border-border/40 p-4">
        <p className="text-[10px] uppercase tracking-widest text-primary mb-1 flex items-center gap-1.5">
          <Lightbulb className="w-3 h-3" /> Science Bite
        </p>
        <p className="text-sm leading-relaxed">{content.scienceBite.fact}</p>
        {(content.scienceBite.source || content.scienceBite.year) && (
          <p className="text-xs text-muted-foreground mt-2">
            {content.scienceBite.source}{content.scienceBite.year ? ` (${content.scienceBite.year})` : ""}
          </p>
        )}
      </div>

      {/* Tasks */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          Tagesaufgaben ({content.tasks.length})
        </h3>
        <div className="space-y-2">
          {content.tasks.map((task, idx) => {
            const Icon = iconMap[task.icon ?? "brain"] ?? Brain;
            return (
              <button
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className="w-full text-left rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Task {idx + 1}</span>
                    </div>
                    <p className="font-medium text-sm leading-snug">{task.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.why}</p>
                    <p className="text-[11px] text-primary mt-2">Details ansehen →</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Self-Talk Anchors */}
      {content.selfTalkAnchors.length > 0 && (
        <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
          <p className="text-[10px] uppercase tracking-widest text-primary mb-2 flex items-center gap-1.5">
            <Quote className="w-3 h-3" /> Self-Talk Anker
          </p>
          <ul className="space-y-2">
            {content.selfTalkAnchors.map((a, i) => (
              <li key={i} className="text-sm">
                <span className="italic">„{a.text}"</span>
                {a.when && <span className="text-xs text-muted-foreground ml-2">— {a.when}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Journal */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-primary" />
          {content.journal.journalTitle}
        </h3>
        <ol className="space-y-3 list-decimal list-inside">
          {content.journal.questions.map((q) => (
            <li key={q.id} className="text-sm">
              <span className="font-medium">{q.question}</span>
              {q.placeholder && (
                <p className="text-xs text-muted-foreground italic ml-5 mt-0.5">{q.placeholder}</p>
              )}
            </li>
          ))}
        </ol>
        <div className="mt-4 pt-3 border-t border-border/40 space-y-2">
          <p className="text-xs">
            <span className="font-semibold text-primary">Dankbarkeit: </span>
            {content.journal.gratitudeInstruction}
          </p>
          {content.journal.freeReflectionPrompt && (
            <p className="text-xs">
              <span className="font-semibold text-primary">Freie Reflexion: </span>
              {content.journal.freeReflectionPrompt}
            </p>
          )}
        </div>
      </div>

      {/* Comprehension Pool */}
      {content.comprehensionPool && content.comprehensionPool.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            Comprehension Pool ({content.comprehensionPool.length} Fragen — Spieler bekommt 3 zufällig)
          </h3>
          <div className="space-y-4">
            {content.comprehensionPool.map((q, idx) => (
              <div key={q.id} className="border-l-2 border-primary/40 pl-3">
                <p className="text-xs text-muted-foreground mb-1">
                  Frage {idx + 1} · target: {q.target}
                </p>
                <p className="text-sm font-medium mb-2">{q.stem}</p>
                <ul className="space-y-1">
                  {q.options.map((o) => {
                    const isCorrect = o.id === q.correctOptionId;
                    return (
                      <li
                        key={o.id}
                        className={`text-xs flex items-start gap-2 ${
                          isCorrect ? "text-primary font-medium" : "text-muted-foreground"
                        }`}
                      >
                        <span className="uppercase">{o.id}.</span>
                        <span>{o.text}</span>
                        {isCorrect && <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" />}
                      </li>
                    );
                  })}
                </ul>
                <p className="text-[11px] italic text-muted-foreground mt-2">
                  Erklärung: {q.explanation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visualization */}
      {content.visualizationCue && (
        <div className="rounded-xl bg-accent/5 border border-accent/10 p-4">
          <p className="text-[10px] uppercase tracking-widest text-primary mb-1 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" /> Visualisierung
          </p>
          <p className="text-sm leading-relaxed">{content.visualizationCue.scene}</p>
          <p className="text-xs text-muted-foreground mt-1">{content.visualizationCue.durationSec}s</p>
        </div>
      )}
    </div>
  );
};

export default AdminDayPreview;
