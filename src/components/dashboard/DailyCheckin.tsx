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
import TodayForYou from "@/components/daily/TodayForYou";
import { getCurrentProgramDay } from "@/lib/getCurrentProgramDay";
import { resolveDay } from "@/lib/getDayContent";
import { ensureAssignment, upsertCompletion, upsertComprehension, drawComprehensionQuestions } from "@/lib/dayAssignment";
import {
  buildMicroAdjustmentContext,
  extractJournalSignals,
  type MicroAdjustmentOutput,
} from "@/lib/microAdjustment";
import type { CalendarEventType, DailyTask, ResolvedDay, ComprehensionQuestion } from "@/content/matrixDayTypes";

type EventType = CalendarEventType;

interface DailyCheckinProps {
  eventType: EventType;
  date: Date;
  onClose: () => void;
  /** Preview/Admin mode: no DB writes, force a specific day, no navigation on completion. */
  previewMode?: boolean;
  /** Force a specific day number instead of computing from program start (preview only). */
  previewDayNumber?: number;
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

const DailyCheckin = ({ eventType, date, onClose, previewMode = false, previewDayNumber }: DailyCheckinProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
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
  const [microAdjustment, setMicroAdjustment] = useState<MicroAdjustmentOutput | null>(null);
  const [moodBefore, setMoodBefore] = useState<number | null>(null);
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  // Team Pulse — erweiterte Wohlbefindens-Metriken (1-10)
  const [focusClarity, setFocusClarity] = useState<number | null>(null);
  const [stress, setStress] = useState<number | null>(null);
  const [recovery, setRecovery] = useState<number | null>(null);
  const [sleepQuality, setSleepQuality] = useState<number | null>(null);
  const [physicalReadiness, setPhysicalReadiness] = useState<number | null>(null);
  const [motivation, setMotivation] = useState<number | null>(null);
  const [pressure, setPressure] = useState<number | null>(null);
  const [teamConnection, setTeamConnection] = useState<number | null>(null);

  const config = typeConfig[eventType];
  const tasks: DailyTask[] = resolved?.content.tasks ?? [];

  useEffect(() => {
    if (previewMode) {
      loadPreviewDay();
      return;
    }
    if (!user?.id) {
      navigate("/auth");
      return;
    }
    loadDay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, previewMode, previewDayNumber, eventType]);

  const loadPreviewDay = () => {
    if (typeof previewDayNumber !== "number") return;
    setLoadingTasks(true);
    const r = resolveDay(previewDayNumber, date, eventType);
    if (r) {
      setResolved(r);
      setAssignmentId(null);
      setComprehensionQuestions(drawComprehensionQuestions(r.matrix.dayNumber, 3));
      setMicroAdjustment(null);
    }
    setLoadingTasks(false);
  };

  const loadDay = async () => {
    if (!user?.id) return;
    setLoadingTasks(true);

    const { data: profile } = await supabase
      .from("profiles")
      .select("sport, position, team")
      .eq("id", user.id)
      .maybeSingle();

    const result = await ensureAssignment({
      userId: user.id,
      date,
      contextType: eventType,
      sport: profile?.sport ?? null,
      // Bevorzuge das neue, semantisch korrekte Feld; Fallback auf Legacy-Feld für ältere Profile.
      position: profile?.position ?? profile?.team ?? null,
    });

    if (result) {
      setResolved(result.resolved);
      setAssignmentId(result.assignment.id);
      setComprehensionQuestions(drawComprehensionQuestions(result.resolved.matrix.dayNumber, 3));

      // ─── Micro-Adjustment Layer ─────────────────────────
      // Lädt nur bestehende Daten, kein KI-Call, undefined-safe.
      const dateStr = format(date, "yyyy-MM-dd");
      const [{ data: todayCheckin }, { data: recentJournals }, { data: questionnaire }] = await Promise.all([
        supabase
          .from("daily_checkins")
          .select("mood_before, energy_level, focus_rating")
          .eq("user_id", user.id)
          .eq("date", dateStr)
          .maybeSingle(),
        supabase
          .from("daily_journals")
          .select("free_reflection, gratitude, answers")
          .eq("user_id", user.id)
          .order("date", { ascending: false })
          .limit(5),
        supabase
          .from("questionnaire_responses")
          .select("analysis")
          .eq("user_id", user.id)
          .not("analysis", "is", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const journalTexts: string[] = [];
      for (const j of recentJournals ?? []) {
        if (j.free_reflection) journalTexts.push(j.free_reflection);
        if (j.gratitude) journalTexts.push(j.gratitude);
        if (j.answers && typeof j.answers === "object") {
          for (const v of Object.values(j.answers as Record<string, unknown>)) {
            if (typeof v === "string") journalTexts.push(v);
          }
        }
      }

      // Sehr leichte, optionale Signal-Extraktion aus der bestehenden Analyse.
      // Erwartet KEINE bestimmte Schema-Form — alles optional.
      const analysis = (questionnaire?.analysis ?? null) as Record<string, unknown> | null;
      const num = (v: unknown): number | undefined => (typeof v === "number" ? v : undefined);
      const score10 = (v: unknown): number | undefined => {
        const n = num(v);
        return typeof n === "number" ? Math.max(0, Math.min(1, n / 10)) : undefined;
      };
      const questionnaireSignals = analysis
        ? {
            resultFocus: score10((analysis as any).result_focus ?? (analysis as any).resultFocus),
            selfCriticism: score10((analysis as any).self_criticism ?? (analysis as any).selfCriticism),
            judgementFear: score10((analysis as any).judgement_fear ?? (analysis as any).judgementFear),
            egoVisibility: score10((analysis as any).ego_visibility ?? (analysis as any).egoVisibility),
            confidence: score10((analysis as any).confidence),
          }
        : undefined;

      const micro = buildMicroAdjustmentContext({
        day: {
          dayNumber: result.resolved.matrix.dayNumber,
          lens: result.resolved.matrix.lens,
          primaryMechanism: result.resolved.matrix.primaryMechanism,
          recurrenceType: result.resolved.matrix.recurrenceType,
          phase: result.resolved.matrix.phase,
        },
        contextType: eventType,
        profile: {
          sport: profile?.sport ?? null,
          position: profile?.position ?? profile?.team ?? null,
        },
        questionnaireSignals,
        checkin: todayCheckin
          ? {
              mood: todayCheckin.mood_before ?? null,
              energy: todayCheckin.energy_level ?? null,
              focus: todayCheckin.focus_rating ?? null,
              stress: null,
            }
          : undefined,
        recentJournalSignals: extractJournalSignals(journalTexts),
      });
      setMicroAdjustment(micro);
    }
    setLoadingTasks(false);
  };

  const markTaskComplete = (taskId: string) => {
    setCompletedTasks((prev) => (prev.includes(taskId) ? prev : [...prev, taskId]));
    setSelectedTask(null);
  };

  const saveCheckin = async () => {
    if (previewMode) {
      setStep(6);
      return;
    }
    if (!user?.id) return;
    if (saving) return; // Race-Schutz: Doppelklick / parallele Auslösungen ignorieren
    setSaving(true);
    const dateStr = format(date, "yyyy-MM-dd");
    const focusRating = focusClarity ?? (tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 10) : 0);
    const completedTitles = completedTasks.map((id) => tasks.find((t) => t.id === id)?.title ?? id);

    const { getOrCreateActiveInstance } = await import("@/lib/programInstance");
    const instance = await getOrCreateActiveInstance(user.id);

    const wellbeing_metrics = {
      mood: moodBefore,
      energy: energyLevel,
      focus: focusClarity,
      stress,
      recovery,
      sleep_quality: sleepQuality,
      physical_readiness: physicalReadiness,
      motivation,
      pressure,
      team_connection: teamConnection,
    };

    const payload: any = {
      session_id: user.id,
      user_id: user.id,
      date: dateStr,
      event_type: eventType,
      mood_before: moodBefore,
      energy_level: energyLevel,
      focus_rating: focusRating,
      tasks_completed: completedTitles,
      reflection: reflection || null,
      wellbeing_metrics,
      program_instance_id: instance?.id ?? null,
    };

    let error: any = null;
    const { data: existingRows, error: lookupError } = await supabase
      .from("daily_checkins")
      .select("id")
      .eq("user_id", user.id)
      .eq("date", dateStr)
      .limit(1);
    if (lookupError) error = lookupError;

    const existing = existingRows?.[0];
    if (!error && existing) {
      const { error: updateError } = await supabase
        .from("daily_checkins")
        .update(payload)
        .eq("id", existing.id);
      error = updateError;
    } else if (!error) {
      const { error: insertError } = await supabase.from("daily_checkins").insert(payload);
      error = insertError;
    }

    if (error) {
      setSaving(false);
      console.error("Checkin save error:", error);
      const { toast } = await import("sonner");
      toast.error("Check-in konnte nicht gespeichert werden.");
      return;
    }

    // Persist day completion (orchestration layer)
    if (assignmentId && resolved) {
      const { error: completionError } = await upsertCompletion({
        assignmentId,
        userId: user.id,
        dayNumber: resolved.matrix.dayNumber,
        completedTaskTitles: completedTitles,
        status: "completed",
        variantUsed: eventType,
        programInstanceId: instance?.id ?? null,
      });
      if (completionError) {
        setSaving(false);
        console.error("Completion save error:", completionError);
        const { toast } = await import("sonner");
        toast.error("Fortschritt konnte nicht gespeichert werden.");
        return;
      }
    }

    setSaving(false);

    setStep(6);
  };

  const handleComprehensionComplete = async (
    results: { questionId: string; selectedOptionId: string; isCorrect: boolean }[]
  ) => {
    setComprehensionDone(true);
    if (previewMode) {
      await saveCheckin();
      return;
    }
    if (assignmentId && resolved && user?.id) {
      const { getOrCreateActiveInstance } = await import("@/lib/programInstance");
      const instance = await getOrCreateActiveInstance(user.id);
      await upsertComprehension({
        assignmentId,
        userId: user.id,
        dayNumber: resolved.matrix.dayNumber,
        questions: comprehensionQuestions,
        results,
        status: "completed",
        programInstanceId: instance?.id ?? null,
      });
    }
    await saveCheckin();
  };

  const ScienceBiteIntro = () => {
    const bite = resolved?.content.scienceBite.fact ?? "";
    const [headline, ...body] = bite.split("\n\n").filter(Boolean);

    return (
      <motion.div
        key="science-intro"
        initial={{ opacity: 0, scale: 0.96, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: -16 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="min-h-[calc(100vh-11rem)] flex flex-col justify-center"
      >
        {loadingTasks ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl bg-gradient-card border-glow overflow-hidden">
              <div className="p-5 border-b border-border/50 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold mb-2">Science Bite</p>
                  <h2 className="font-heading text-2xl font-bold leading-tight">{headline}</h2>
                </div>
                <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                  <Brain className="w-5 h-5 text-primary" />
                </div>
              </div>

              <div className="p-5 space-y-4">
                {body.map((paragraph, index) => (
                  <p key={index} className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>

            {microAdjustment && <TodayForYou data={microAdjustment} />}

            <motion.button
              data-testid="daily-science-ack"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setStep(1)}
              className="w-full flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-heading font-semibold text-lg hover:shadow-glow transition-all"
            >
              Verstanden <ArrowRight className="w-5 h-5" />
            </motion.button>
          </div>
        )}
      </motion.div>
    );
  };

  // ─── Knowledge Bite Card (Science Bite + Why per Task) ───
  const KnowledgeBiteCard = ({ task, isRead, onRead }: { task: DailyTask; isRead: boolean; onRead: () => void }) => {
    const [expanded, setExpanded] = useState(false);
    const IconComp = iconMap[task.icon ?? "brain"] ?? Brain;

    return (
      <motion.div
        layout
        className={`rounded-2xl transition-all overflow-hidden ${
          expanded ? "bg-accent/10 border border-accent/20" : "bg-gradient-card border-glow"
        }`}
      >
        <button
          data-testid={`knowledge-card-${task.id}`}
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left p-4 flex items-center gap-3"
        >
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
              <div className="px-4 pb-4 pt-0 space-y-3">
                <div className="flex items-start gap-2 p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <Lightbulb className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">{task.detailedExplanation}</p>
                </div>
                <button
                  data-testid={`knowledge-read-${task.id}`}
                  onClick={onRead}
                  disabled={isRead}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-heading font-semibold text-sm transition-all ${
                    isRead
                      ? "bg-primary/15 text-primary cursor-default"
                      : "bg-primary text-primary-foreground hover:shadow-glow active:scale-[0.98]"
                  }`}
                >
                  {isRead ? (<><CheckCircle2 className="w-4 h-4" /> Verstanden</>) : (<>Verstanden</>)}
                </button>
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
          data-testid="knowledge-unlock"
          whileHover={allRead ? { scale: 1.02 } : {}}
          whileTap={allRead ? { scale: 0.98 } : {}}
          onClick={() => allRead && setStep(4)}
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
    return (
      <motion.div key="tasks" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-heading text-2xl font-bold">Heute im Fokus</h2>
        </div>
        {resolved && (
          <p className="text-muted-foreground mb-4 text-sm">
            Tag {resolved.matrix.dayNumber} · {resolved.matrix.lens}
          </p>
        )}

        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
          Das sind deine Aufgaben für heute — meistens im Training oder über den Tag verteilt.
          Nichts musst du jetzt abhaken. Heute Abend reflektierst du sie im Journal.
        </p>

        {loadingTasks ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const IconComp = iconMap[task.icon ?? "brain"] ?? Brain;
              return (
                <button
                  key={task.id}
                  data-testid={`task-card-${task.id}`}
                  onClick={() => setSelectedTask(task)}
                  className="w-full text-left p-4 rounded-2xl transition-all bg-gradient-card border-glow hover:bg-secondary/50 active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-secondary">
                      <IconComp className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{task.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.whenToUse}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
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
                {step === 0 && <ScienceBiteIntro />}
                {step === 1 && (
                  <motion.div
                    key="mood-energy"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                  >
                    <h2 className="font-heading text-2xl font-bold mb-1">Wohlbefinden & Bereitschaft</h2>
                    <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold mb-2">Team Pulse</p>
                    <p className="text-muted-foreground mb-6 text-sm">
                      Wie fühlst du dich heute? Kurze Skala von 1 bis 10. Deine Antworten bleiben privat —
                      Coaches sehen nur anonymisierte Team-Tendenzen (mind. 5 Spieler).
                    </p>

                    <div className="space-y-7">
                      {[
                        { id: "mood", label: "Stimmung", question: "Wie ist deine allgemeine Stimmung gerade?", value: moodBefore, set: setMoodBefore, low: "sehr niedrig", high: "sehr gut" },
                        { id: "energy", label: "Energie", question: "Wie viel Energie hast du gerade?", value: energyLevel, set: setEnergyLevel, low: "sehr erschöpft", high: "sehr energiegeladen" },
                        { id: "focus", label: "Mentale Klarheit / Fokus", question: "Wie klar und fokussiert fühlst du dich gerade?", value: focusClarity, set: setFocusClarity, low: "sehr zerstreut", high: "sehr klar" },
                        { id: "stress", label: "Stress / innere Spannung", question: "Wie viel innere Spannung oder Stress spürst du gerade?", value: stress, set: setStress, low: "sehr niedrig", high: "sehr hoch" },
                        { id: "recovery", label: "Erholung", question: "Wie erholt fühlst du dich heute?", value: recovery, set: setRecovery, low: "gar nicht erholt", high: "sehr erholt" },
                        { id: "sleep", label: "Schlafqualität", question: "Wie war deine Schlafqualität?", value: sleepQuality, set: setSleepQuality, low: "sehr schlecht", high: "sehr gut" },
                        { id: "physical", label: "Körperliche Bereitschaft", question: "Wie bereit fühlt sich dein Körper für Belastung an?", value: physicalReadiness, set: setPhysicalReadiness, low: "gar nicht bereit", high: "sehr bereit" },
                        { id: "motivation", label: "Motivation / Einsatzbereitschaft", question: "Wie bereit bist du, heute wirklich in die Arbeit zu gehen?", value: motivation, set: setMotivation, low: "kaum bereit", high: "sehr bereit" },
                        { id: "pressure", label: "Druck / Bewertungsgefühl", question: "Wie stark fühlt sich heute Druck oder Bewertungsgefühl an?", value: pressure, set: setPressure, low: "kaum", high: "sehr stark" },
                        { id: "team", label: "Teamverbundenheit", question: "Wie verbunden fühlst du dich gerade mit dem Team?", value: teamConnection, set: setTeamConnection, low: "gar nicht verbunden", high: "sehr verbunden" },
                      ].map((q) => (
                        <div key={q.label}>
                          <label className="text-sm font-semibold block mb-1">{q.label}</label>
                          <p className="text-xs text-muted-foreground mb-2">{q.question}</p>
                          <div className="grid grid-cols-10 gap-1.5">
                            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                              <button
                                key={n}
                                data-testid={`pulse-${q.id}-${n}`}
                                onClick={() => q.set(n)}
                                className={`aspect-square rounded-lg text-sm font-semibold transition-all ${
                                  q.value === n
                                    ? "bg-primary text-primary-foreground shadow-glow"
                                    : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                                }`}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                          <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
                            <span>{q.low}</span>
                            <span>{q.high}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
                {step === 2 && (
                  <motion.div key="reflection" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
                    <h2 className="font-heading text-2xl font-bold mb-2">Optional: Was beeinflusst deinen Zustand heute?</h2>
                    <p className="text-muted-foreground mb-2 text-sm">
                      Gibt es etwas, das deinen heutigen Zustand stark beeinflusst? Diese Antwort bleibt vollständig privat —
                      sie verlässt nie deinen Account und wird Coaches niemals gezeigt.
                    </p>
                    <div className="mb-4 p-3 rounded-xl bg-primary/5 border border-primary/15 flex items-start gap-2">
                      <Moon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        <span className="text-foreground font-medium">Heute Abend</span> findest du auf dem Dashboard dein Tagesjournal,
                        um Training und Aufgaben in Ruhe zu reflektieren.
                      </p>
                    </div>
                    <VoiceInput
                      currentValue={reflection}
                      onTranscript={(val) => setReflection(val)}
                      placeholder="Schreibe frei oder sprich ein..."
                    />
                    <textarea
                      data-testid="daily-state-reflection"
                      value={reflection}
                      onChange={(e) => setReflection(e.target.value)}
                      placeholder="Optional. Nur für dich sichtbar."
                      className="w-full h-32 mt-3 px-5 py-4 rounded-2xl bg-secondary/40 border border-border/50 text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </motion.div>
                )}
                {step === 3 && <KnowledgeStep />}
                {step === 4 && <TaskDashboard />}
                {step === 5 && (
                  <motion.div key="comprehension" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
                    <h2 className="font-heading text-2xl font-bold mb-2">Kurzer Verständnis-Check</h2>
                    <p className="text-muted-foreground mb-6 text-sm">
                      {comprehensionQuestions.length > 0
                        ? "Drei Fragen zur heutigen Linse. Kein Test — nur Festigung."
                        : "Heute kein Check verfügbar. Du kannst direkt abschließen."}
                    </p>
                    {comprehensionQuestions.length > 0 ? (
                      <ComprehensionCheck
                        questions={comprehensionQuestions}
                        onComplete={handleComprehensionComplete}
                      />
                    ) : (
                      <button
                        data-testid="comprehension-empty-finish"
                        onClick={() => saveCheckin()}
                        disabled={saving}
                        className="w-full px-8 py-4 rounded-xl bg-primary text-primary-foreground font-heading font-semibold disabled:opacity-60"
                      >
                        {saving ? "Speichert..." : "Check-in abschließen"}
                      </button>
                    )}
                  </motion.div>
                )}
                {step === 6 && (
                  <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }} className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
                      <Check className="w-10 h-10 text-primary" />
                    </motion.div>
                    <h2 className="font-heading text-2xl font-bold mb-2">Check-in abgeschlossen</h2>
                    {resolved && (
                      <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-3">
                        Tag {resolved.matrix.dayNumber}/56 · {resolved.matrix.lens}
                      </p>
                    )}
                    <p className="text-muted-foreground mb-3 text-sm">
                      Deine heutige Wiederholung ist im System.
                    </p>
                    <div className="mb-8 max-w-sm mx-auto rounded-2xl bg-primary/5 border border-primary/15 p-4 text-left">
                      <div className="flex items-start gap-3">
                        <Flame className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Die Flamme lebt von Rückkehr. Heute Abend schließt du den Tag mit dem Journal sauber ab.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 max-w-xs mx-auto">
                      <button
                        onClick={onClose}
                        className="px-8 py-3 rounded-xl bg-primary font-heading font-semibold text-primary-foreground hover:shadow-glow transition-all"
                      >
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

      {(step === 1 || step === 2 || step === 4) && !selectedTask && (
        <div className="sticky bottom-0 bg-background/80 backdrop-blur-xl border-t border-border/50 px-6 py-4">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <button onClick={() => (step > 0 ? setStep(step - 1) : onClose())} className="flex items-center gap-2 px-5 py-3 rounded-xl text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Zurück
            </button>
            <div className="flex gap-1.5">
              {[0, 1, 2, 3, 4, 5].map((s) => (
                <div key={s} className={`w-2 h-2 rounded-full transition-colors ${s === step ? "bg-primary" : "bg-muted"}`} />
              ))}
            </div>
            {(() => {
              const pulseComplete = [moodBefore, energyLevel, focusClarity, stress, recovery, sleepQuality, physicalReadiness, motivation, pressure, teamConnection].every((v) => v !== null);
              const blocked = saving || (step === 1 && !pulseComplete);
              return (
                <motion.button
                  data-testid={`daily-next-step-${step}`}
                  whileHover={!blocked ? { scale: 1.02 } : undefined}
                  whileTap={!blocked ? { scale: 0.98 } : undefined}
                  onClick={() => {
                    if (blocked) return;
                    if (step === 1) setStep(2);
                    else if (step === 2) setStep(3);
                    else if (step === 4) setStep(5);
                  }}
                  disabled={blocked}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-heading font-semibold transition-all ${
                    blocked
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : "bg-primary text-primary-foreground hover:shadow-glow"
                  }`}
                >
                  Weiter<ArrowRight className="w-4 h-4" />
                </motion.button>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyCheckin;
