import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  ArrowLeft, ArrowRight, Check, Dumbbell, Moon, Trophy,
  Brain, Flame, Eye, Heart, Target, Sparkles, Wind, Sunrise, BookOpen, Shield, Loader2,
  Lightbulb, ChevronDown, CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import VoiceInput from "@/components/VoiceInput";
import TaskDetail from "@/components/daily/TaskDetail";
import ComprehensionCheck from "@/components/daily/ComprehensionCheck";
import { getCurrentProgramDay } from "@/lib/getCurrentProgramDay";
import { resolveDay } from "@/lib/getDayContent";
import { ensureAssignment, upsertCompletion, upsertComprehension, drawComprehensionQuestions } from "@/lib/dayAssignment";
import type { CalendarEventType, DailyTask, ResolvedDay, ComprehensionQuestion } from "@/content/matrixDayTypes";

type EventType = CalendarEventType;

interface DailyCheckinProps {
  eventType: EventType;
  date: Date;
  onClose: () => void;
}

const iconMap: Record<string, typeof Brain> = {
  brain: Brain, eye: Eye, flame: Flame, heart: Heart, target: Target,
  wind: Wind, sunrise: Sunrise, book: BookOpen, sparkles: Sparkles, shield: Shield,
};

const typeConfig: Record<EventType, { label: string; icon: typeof Dumbbell; color: string; bg: string }> = {
  training: { label: "Trainingstag", icon: Dumbbell, color: "text-primary", bg: "bg-primary/20" },
  rest: { label: "Ruhetag", icon: Moon, color: "text-blue-400", bg: "bg-blue-400/20" },
  competition: { label: "Wettkampftag", icon: Trophy, color: "text-yellow-400", bg: "bg-yellow-400/20" },
};

const DailyCheckin = ({ eventType, date, onClose }: DailyCheckinProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [moodBefore, setMoodBefore] = useState<number | null>(null);
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [reflection, setReflection] = useState("");
  const [saving, setSaving] = useState(false);
  const [resolved, setResolved] = useState<ResolvedDay | null>(null);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [selectedTask, setSelectedTask] = useState<DailyTask | null>(null);
  const [readBites, setReadBites] = useState<string[]>([]);
  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const [comprehensionQuestions, setComprehensionQuestions] = useState<ComprehensionQuestion[]>([]);
  const [comprehensionDone, setComprehensionDone] = useState(false);

  const config = typeConfig[eventType];
  const tasks: DailyTask[] = resolved?.content.tasks ?? [];

  useEffect(() => {
    if (!user?.id) {
      navigate("/auth");
      return;
    }
    loadDay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadDay = async () => {
    if (!user?.id) return;
    setLoadingTasks(true);

    const { data: profile } = await supabase
      .from("profiles")
      .select("sport, team")
      .eq("id", user.id)
      .maybeSingle();

    const result = await ensureAssignment({
      userId: user.id,
      date,
      contextType: eventType,
      sport: profile?.sport ?? null,
      position: profile?.team ?? null,
    });

    if (result) {
      setResolved(result.resolved);
      setAssignmentId(result.assignment.id);
      setComprehensionQuestions(drawComprehensionQuestions(result.resolved.matrix.dayNumber, 3));
    }
    setLoadingTasks(false);
  };

  const markTaskComplete = (taskId: string) => {
    setCompletedTasks((prev) => (prev.includes(taskId) ? prev : [...prev, taskId]));
    setSelectedTask(null);
  };

  const saveCheckin = async () => {
    if (!user?.id) return;
    setSaving(true);
    const dateStr = format(date, "yyyy-MM-dd");
    const focusRating = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 10) : 0;
    const completedTitles = completedTasks.map((id) => tasks.find((t) => t.id === id)?.title ?? id);

    const payload: any = {
      user_id: user.id,
      date: dateStr,
      event_type: eventType,
      mood_before: moodBefore,
      energy_level: energyLevel,
      focus_rating: focusRating,
      tasks_completed: completedTitles,
      reflection: reflection || null,
    };

    let error: any = null;
    const { data: existingRows } = await supabase
      .from("daily_checkins")
      .select("id")
      .eq("user_id", user.id)
      .eq("date", dateStr)
      .limit(1);

    const existing = existingRows?.[0];
    if (existing) {
      const { error: updateError } = await supabase
        .from("daily_checkins")
        .update(payload)
        .eq("id", existing.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from("daily_checkins").insert(payload);
      error = insertError;
    }

    // Persist day completion (orchestration layer)
    if (assignmentId && resolved) {
      await upsertCompletion({
        assignmentId,
        userId: user.id,
        dayNumber: resolved.matrix.dayNumber,
        completedTaskTitles: completedTitles,
        status: "completed",
        variantUsed: eventType,
      });
    }

    setSaving(false);

    if (error) {
      console.error("Checkin save error:", error);
      const { toast } = await import("sonner");
      toast.error("Check-in konnte nicht gespeichert werden.");
      return;
    }

    setStep(6);
  };

  const handleComprehensionComplete = async (
    results: { questionId: string; selectedOptionId: string; isCorrect: boolean }[]
  ) => {
    setComprehensionDone(true);
    if (assignmentId && resolved && user?.id) {
      await upsertComprehension({
        assignmentId,
        userId: user.id,
        dayNumber: resolved.matrix.dayNumber,
        questions: comprehensionQuestions,
        results,
        status: "completed",
      });
    }
    setStep(5);
  };

  const ScaleSelector = ({ value, onChange, lowLabel, highLabel }: { value: number | null; onChange: (v: number) => void; lowLabel: string; highLabel: string }) => (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted-foreground">{lowLabel}</span>
        <span className="text-xs text-muted-foreground">{highLabel}</span>
      </div>
      <div className="grid grid-cols-10 gap-1.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`aspect-square rounded-lg text-sm font-medium transition-all ${
              value === n
                ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background"
                : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );

  // ─── Knowledge Bite Card (Science Bite + Why per Task) ───
  const KnowledgeBiteCard = ({ task, isRead, onRead }: { task: DailyTask; isRead: boolean; onRead: () => void }) => {
    const [expanded, setExpanded] = useState(false);
    const IconComp = iconMap[task.icon ?? "brain"] ?? Brain;

    const handleToggle = () => {
      if (!expanded) onRead();
      setExpanded(!expanded);
    };

    return (
      <motion.div
        layout
        className={`rounded-2xl transition-all overflow-hidden ${
          expanded ? "bg-accent/10 border border-accent/20" : "bg-gradient-card border-glow"
        }`}
      >
        <button onClick={handleToggle} className="w-full text-left p-4 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
            isRead ? "bg-primary" : "bg-secondary"
          }`}>
            {isRead ? <CheckCircle2 className="w-5 h-5 text-primary-foreground" /> : <IconComp className="w-5 h-5 text-muted-foreground" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${isRead ? "text-primary" : ""}`}>{task.title}</p>
            <p className="text-xs text-muted-foreground truncate">{task.why}</p>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-0">
                <div className="flex items-start gap-2 p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <Lightbulb className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">{task.detailedExplanation}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  // ─── Knowledge Step (Step 2) ─────────────────────────────
  const KnowledgeStep = () => {
    const allRead = tasks.length > 0 && tasks.every((t) => readBites.includes(t.id));

    return (
      <motion.div key="knowledge" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
        <h2 className="font-heading text-2xl font-bold mb-2">Wissen zuerst.</h2>
        <p className="text-muted-foreground mb-6 text-sm">
          Lies, warum die heutigen Aufgaben relevant sind. Erst dann wirst du sie freischalten.
        </p>

        {loadingTasks ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
        ) : (
          <div className="space-y-3 mb-8">
            {tasks.map((task) => (
              <KnowledgeBiteCard
                key={task.id}
                task={task}
                isRead={readBites.includes(task.id)}
                onRead={() => setReadBites((prev) => (prev.includes(task.id) ? prev : [...prev, task.id]))}
              />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
          <span>{readBites.length} / {tasks.length} gelesen</span>
          {!allRead && <span className="text-primary">Alle lesen um fortzufahren</span>}
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-6">
          <motion.div
            className="h-full bg-primary rounded-full"
            animate={{ width: `${tasks.length > 0 ? (readBites.length / tasks.length) * 100 : 0}%` }}
          />
        </div>

        <motion.button
          whileHover={allRead ? { scale: 1.02 } : {}}
          whileTap={allRead ? { scale: 0.98 } : {}}
          onClick={() => allRead && setStep(3)}
          disabled={!allRead}
          className={`w-full flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-heading font-semibold text-lg transition-all ${
            allRead ? "bg-primary text-primary-foreground hover:shadow-glow" : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
        >
          {allRead ? (<>Aufgaben freischalten <Sparkles className="w-5 h-5" /></>) : (<>Alle lesen</>)}
        </motion.button>
      </motion.div>
    );
  };

  // ─── Task Dashboard (Step 3) ─────────────────────────────
  const TaskDashboard = () => {
    const completedCount = completedTasks.length;
    const totalCount = tasks.length;

    return (
      <motion.div key="tasks" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-heading text-2xl font-bold">Deine Aufgaben</h2>
        </div>
        {resolved && (
          <p className="text-muted-foreground mb-6 text-sm">
            Tag {resolved.matrix.dayNumber} · {resolved.matrix.lens}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <span>{completedCount} / {totalCount} erledigt</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-6">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        {loadingTasks ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const isCompleted = completedTasks.includes(task.id);
              const IconComp = iconMap[task.icon ?? "brain"] ?? Brain;
              return (
                <button
                  key={task.id}
                  onClick={() => !isCompleted && setSelectedTask(task)}
                  className={`w-full text-left p-4 rounded-2xl transition-all ${
                    isCompleted
                      ? "bg-primary/10 ring-1 ring-primary/30 opacity-70"
                      : "bg-gradient-card border-glow hover:bg-secondary/50 active:scale-[0.98]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      isCompleted ? "bg-primary" : "bg-secondary"
                    }`}>
                      {isCompleted ? <Check className="w-5 h-5 text-primary-foreground" /> : <IconComp className="w-5 h-5 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${isCompleted ? "text-primary line-through" : ""}`}>{task.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.whenToUse}</p>
                    </div>
                    {!isCompleted && <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => {
              if (selectedTask) { setSelectedTask(null); return; }
              if (step > 0) { setStep(step - 1); return; }
              onClose();
            }}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Zurück</span>
          </button>
          <div className="flex items-center gap-2">
            <config.icon className={`w-4 h-4 ${config.color}`} />
            <span className="text-sm font-heading font-medium">{config.label}</span>
          </div>
          <span className="text-xs text-muted-foreground">{format(date, "d. MMM", { locale: de })}</span>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center px-6 py-8 overflow-y-auto">
        <div className="max-w-lg w-full">
          <AnimatePresence mode="wait">
            {selectedTask ? (
              <TaskDetail
                task={selectedTask}
                isCompleted={completedTasks.includes(selectedTask.id)}
                onComplete={() => markTaskComplete(selectedTask.id)}
              />
            ) : (
              <>
                {step === 0 && (
                  <motion.div key="mood" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
                    <h2 className="font-heading text-2xl font-bold mb-2">Wie fühlst du dich?</h2>
                    <p className="text-muted-foreground mb-8">Dein mentaler Zustand vor dem {config.label}.</p>
                    <ScaleSelector value={moodBefore} onChange={setMoodBefore} lowLabel="Schlecht" highLabel="Großartig" />
                  </motion.div>
                )}
                {step === 1 && (
                  <motion.div key="energy" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
                    <h2 className="font-heading text-2xl font-bold mb-2">Dein Energie-Level</h2>
                    <p className="text-muted-foreground mb-8">Wie viel Energie hast du heute?</p>
                    <ScaleSelector value={energyLevel} onChange={setEnergyLevel} lowLabel="Erschöpft" highLabel="Volle Energie" />
                  </motion.div>
                )}
                {step === 2 && <KnowledgeStep />}
                {step === 3 && <TaskDashboard />}
                {step === 4 && (
                  <motion.div key="comprehension" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
                    <h2 className="font-heading text-2xl font-bold mb-2">Kurzer Verständnis-Check</h2>
                    <p className="text-muted-foreground mb-6 text-sm">
                      {comprehensionQuestions.length > 0
                        ? "Drei Fragen zur heutigen Linse. Kein Test — nur Festigung."
                        : "Heute kein Check verfügbar. Du kannst direkt weitergehen."}
                    </p>
                    {comprehensionQuestions.length > 0 ? (
                      <ComprehensionCheck
                        questions={comprehensionQuestions}
                        onComplete={handleComprehensionComplete}
                      />
                    ) : (
                      <button
                        onClick={() => setStep(5)}
                        className="w-full px-8 py-4 rounded-xl bg-primary text-primary-foreground font-heading font-semibold"
                      >
                        Weiter zur Reflexion
                      </button>
                    )}
                  </motion.div>
                )}
                {step === 5 && (
                  <motion.div key="reflection" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
                    <h2 className="font-heading text-2xl font-bold mb-2">Kurzes Stimmungs-Echo</h2>
                    <p className="text-muted-foreground mb-4 text-sm">
                      Ein bis zwei Sätze. Das vertiefte Tagesjournal kommt danach im Journal-Bereich.
                    </p>
                    <VoiceInput
                      currentValue={reflection}
                      onTranscript={(val) => setReflection(val)}
                      placeholder="Schreibe frei oder sprich ein..."
                    />
                    <textarea
                      value={reflection}
                      onChange={(e) => setReflection(e.target.value)}
                      placeholder="Kurze Beobachtung – ohne Bewertung."
                      className="w-full h-32 mt-3 px-5 py-4 rounded-2xl bg-secondary/40 border border-border/50 text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </motion.div>
                )}
                {step === 6 && (
                  <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }} className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
                      <Check className="w-10 h-10 text-primary" />
                    </motion.div>
                    <h2 className="font-heading text-2xl font-bold mb-2">Check-in abgeschlossen</h2>
                    <p className="text-muted-foreground mb-2">{completedTasks.length} von {tasks.length} Aufgaben erledigt.</p>
                    <p className="text-xs text-muted-foreground mb-8">Schließe den Tag jetzt im Journal.</p>
                    <div className="flex flex-col gap-3 max-w-xs mx-auto">
                      <button
                        onClick={() => { onClose(); navigate("/journal"); }}
                        className="px-8 py-3 rounded-xl bg-primary font-heading font-semibold text-primary-foreground hover:shadow-glow transition-all flex items-center justify-center gap-2"
                      >
                        <BookOpen className="w-4 h-4" />
                        Tagesjournal öffnen
                      </button>
                      <button onClick={onClose} className="px-8 py-3 rounded-xl bg-secondary text-foreground font-heading font-medium hover:bg-secondary/80">
                        Zurück zum Dashboard
                      </button>
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {step < 5 && step !== 2 && !selectedTask && (
        <div className="sticky bottom-0 bg-background/80 backdrop-blur-xl border-t border-border/50 px-6 py-4">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <button onClick={() => (step > 0 ? setStep(step - 1) : onClose())} className="flex items-center gap-2 px-5 py-3 rounded-xl text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Zurück
            </button>
            <div className="flex gap-1.5">
              {[0, 1, 2, 3, 4].map((s) => (
                <div key={s} className={`w-2 h-2 rounded-full transition-colors ${s === step ? "bg-primary" : "bg-muted"}`} />
              ))}
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (step === 4) saveCheckin();
                else if (step === 0 && moodBefore) setStep(1);
                else if (step === 1 && energyLevel) setStep(2);
                else if (step === 3 && completedTasks.length > 0) setStep(4);
              }}
              disabled={(step === 0 && !moodBefore) || (step === 1 && !energyLevel) || (step === 3 && completedTasks.length === 0)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-heading font-semibold transition-all ${
                (step === 0 && !moodBefore) || (step === 1 && !energyLevel) || (step === 3 && completedTasks.length === 0)
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:shadow-glow"
              }`}
            >
              {step === 4 ? (<>{saving ? "Speichert..." : "Abschließen"}<Check className="w-4 h-4" /></>) : step === 3 && completedTasks.length === 0 ? (<>Mind. 1 Aufgabe</>) : (<>Weiter<ArrowRight className="w-4 h-4" /></>)}
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyCheckin;
