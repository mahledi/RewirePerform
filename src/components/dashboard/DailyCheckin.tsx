import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  ArrowLeft, ArrowRight, Check, Dumbbell, Moon, Trophy,
  Brain, Flame, Eye, Heart, Target, Sparkles, Wind, Sunrise, BookOpen, Shield, Loader2,
  Lightbulb, ChevronDown, Clock, MapPin, CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import VoiceInput from "@/components/VoiceInput";

type EventType = "training" | "rest" | "competition";

interface DailyCheckinProps {
  eventType: EventType;
  sessionId: string;
  date: Date;
  onClose: () => void;
}

interface CheckinTask {
  id: string;
  title: string;
  description: string;
  steps?: string[];
  duration?: string;
  when_to_use?: string;
  science_bite?: string;
  icon: string;
}

const iconMap: Record<string, typeof Brain> = {
  brain: Brain, eye: Eye, flame: Flame, heart: Heart, target: Target,
  wind: Wind, sunrise: Sunrise, book: BookOpen, sparkles: Sparkles, shield: Shield,
};

const fallbackTasks: Record<EventType, CheckinTask[]> = {
  training: [
    { id: "t-activation", title: "Aktivierungs-Check", description: "Prüfe deinen Zustand und passe ihn an.", steps: ["Schließe die Augen und spüre in deinen Körper.", "Zu nervös? 3 tiefe Atemzüge, Schultern fallen lassen.", "Zu ruhig? 10 Sekunden auf der Stelle bewegen, Körperspannung aufbauen."], duration: "30 Sekunden", when_to_use: "Vor dem Training", icon: "flame" },
    { id: "t-visualization", title: "Situations-Visualisierung", description: "Stelle dir eine konkrete Trainingssituation vor.", steps: ["Augen schließen.", "Stelle dir 60 Sekunden lang eine spezifische Szene vor.", "Sieh die Farben, hör die Geräusche, spüre die Bewegung."], duration: "2 Minuten", when_to_use: "Vor dem Training", icon: "eye" },
    { id: "t-reflection", title: "3-Sätze-Reflexion", description: "Schreibe 3 kurze Sätze über dein Training.", steps: ["Was lief heute gut?", "Was war schwierig?", "Was mache ich morgen anders?"], duration: "2 Minuten", when_to_use: "Nach dem Training", icon: "book" },
  ],
  rest: [
    { id: "r-breathwork", title: "4-7-8 Atemübung", description: "Beruhige dein Nervensystem mit kontrollierter Atmung.", steps: ["4 Sekunden einatmen.", "7 Sekunden Atem halten.", "8 Sekunden langsam ausatmen.", "5 Durchgänge wiederholen."], duration: "3 Minuten", when_to_use: "Morgens oder abends", icon: "wind" },
    { id: "r-journaling", title: "Freies Journaling", description: "Schreibe 5 Minuten alles auf, was dir durch den Kopf geht.", steps: ["Timer auf 5 Minuten stellen.", "Schreibe ohne Pause – egal was.", "Nicht bewerten, nur beobachten."], duration: "5 Minuten", when_to_use: "Abends", icon: "book" },
    { id: "r-gratitude", title: "3 Dinge Dankbarkeit", description: "Nenne 3 konkrete Dinge aus deinem Sport, für die du dankbar bist.", steps: ["Denke an einen Moment der letzten Woche.", "Was hat dich stolz gemacht?", "Schreib oder sprich 3 Dinge laut aus."], duration: "2 Minuten", when_to_use: "Abends vor dem Schlafen", icon: "heart" },
  ],
  competition: [
    { id: "c-activation", title: "Wettkampf-Aktivierung", description: "Bringe dich in den optimalen Zustand.", steps: ["3 tiefe Power-Atemzüge.", "Spanne alle Muskeln 5 Sekunden an, dann loslassen.", "Sage dir: 'Ich bin bereit.'"], duration: "30 Sekunden", when_to_use: "10 Minuten vor dem Start", icon: "flame" },
    { id: "c-focus", title: "Fokus-Wörter", description: "Wähle 2 Wörter, die dich heute leiten.", steps: ["Wähle 2 Wörter (z.B. 'mutig', 'schnell').", "Wiederhole sie 3x leise.", "Wenn du abgelenkt bist: zurück zu deinen Wörtern."], duration: "30 Sekunden", when_to_use: "Beim Aufwärmen", icon: "target" },
    { id: "c-reset", title: "Fehler-Reset", description: "Nach einem Fehler sofort zurück in den Fokus.", steps: ["Einmal tief ausatmen.", "Hände kurz schütteln – Fehler abschütteln.", "Blick nach vorne. Nächste Aktion."], duration: "10 Sekunden", when_to_use: "Direkt nach einem Fehler", icon: "brain" },
  ],
};

const typeConfig: Record<EventType, { label: string; icon: typeof Dumbbell; color: string; bg: string }> = {
  training: { label: "Trainingstag", icon: Dumbbell, color: "text-primary", bg: "bg-primary/20" },
  rest: { label: "Ruhetag", icon: Moon, color: "text-blue-400", bg: "bg-blue-400/20" },
  competition: { label: "Wettkampftag", icon: Trophy, color: "text-yellow-400", bg: "bg-yellow-400/20" },
};

const DailyCheckin = ({ eventType, sessionId, date, onClose }: DailyCheckinProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [moodBefore, setMoodBefore] = useState<number | null>(null);
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [reflection, setReflection] = useState("");
  const [saving, setSaving] = useState(false);
  const [tasks, setTasks] = useState<CheckinTask[]>(fallbackTasks[eventType]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [selectedTask, setSelectedTask] = useState<CheckinTask | null>(null);
  const [readBites, setReadBites] = useState<string[]>([]);

  const config = typeConfig[eventType];

  useEffect(() => {
    loadPersonalizedTasks();
  }, []);

  const loadPersonalizedTasks = async () => {
    const dateStr = format(date, "yyyy-MM-dd");
    let q = supabase
      .from("personalized_tasks")
      .select("tasks")
      .eq("date", dateStr);

    if (user?.id) {
      q = q.or(`user_id.eq.${user.id},session_id.eq.${sessionId}`);
    } else {
      q = q.eq("session_id", sessionId);
    }

    const { data } = await q.maybeSingle();

    if (data?.tasks && Array.isArray(data.tasks) && data.tasks.length > 0) {
      // Limit to max 3 tasks
      const loaded = (data.tasks as unknown as CheckinTask[]).slice(0, 3);
      setTasks(loaded);
    }
    setLoadingTasks(false);
  };

  const markTaskComplete = (taskId: string) => {
    setCompletedTasks((prev) =>
      prev.includes(taskId) ? prev : [...prev, taskId]
    );
    setSelectedTask(null);
  };

  const saveCheckin = async () => {
    setSaving(true);
    const dateStr = format(date, "yyyy-MM-dd");
    const focusRating = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 10) : 0;

    const payload: any = {
      session_id: sessionId,
      user_id: user?.id ?? null,
      date: dateStr,
      event_type: eventType,
      mood_before: moodBefore,
      energy_level: energyLevel,
      focus_rating: focusRating,
      tasks_completed: completedTasks as any,
      reflection: reflection || null,
    };

    let error: any = null;

    if (user?.id) {
      const { data: existing } = await supabase
        .from("daily_checkins")
        .select("id")
        .eq("user_id", user.id)
        .eq("date", dateStr)
        .maybeSingle();

      if (existing) {
        const { error: updateError } = await supabase
          .from("daily_checkins")
          .update(payload)
          .eq("id", existing.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from("daily_checkins")
          .insert(payload);
        error = insertError;
      }
    } else {
      const { error: upsertError } = await supabase.from("daily_checkins").upsert(
        payload,
        { onConflict: "session_id,date" }
      );
      error = upsertError;
    }

    setSaving(false);

    if (error) {
      console.error("Checkin save error:", error);
      const { toast } = await import("sonner");
      toast.error("Check-in konnte nicht gespeichert werden.");
      return;
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

  // ─── Task Detail View ─────────────────────────────────
  const TaskDetailView = ({ task }: { task: CheckinTask }) => {
    const IconComp = iconMap[task.icon] || Brain;
    const isCompleted = completedTasks.includes(task.id);
    const [showScience, setShowScience] = useState(false);

    return (
      <motion.div
        key="task-detail"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <IconComp className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="font-heading text-2xl font-bold">{task.title}</h2>
            <p className="text-muted-foreground text-sm mt-1">{task.description}</p>
          </div>
        </div>

        {/* Meta: Duration & When */}
        <div className="grid grid-cols-2 gap-3">
          {task.duration && (
            <div className="p-4 rounded-2xl bg-secondary/30 border border-border/30">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Dauer</span>
              </div>
              <p className="text-sm font-medium">{task.duration}</p>
            </div>
          )}
          {task.when_to_use && (
            <div className="p-4 rounded-2xl bg-secondary/30 border border-border/30">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>Wann</span>
              </div>
              <p className="text-sm font-medium">{task.when_to_use}</p>
            </div>
          )}
        </div>

        {/* Steps */}
        {task.steps && task.steps.length > 0 && (
          <div className="p-5 rounded-2xl bg-gradient-card border-glow">
            <h3 className="text-sm font-heading font-semibold mb-4">So geht's:</h3>
            <div className="space-y-3">
              {task.steps.map((s, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">{i + 1}</span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{s}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Science Bite (collapsible) */}
        {task.science_bite && (
          <button
            onClick={() => setShowScience(!showScience)}
            className={`w-full text-left rounded-2xl transition-all ${
              showScience
                ? "bg-accent/20 border border-accent/30 p-5"
                : "p-4 bg-secondary/20 hover:bg-secondary/30"
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <Lightbulb className="w-3.5 h-3.5" />
              <span>Warum das wirkt</span>
              <ChevronDown className={`w-3 h-3 ml-auto transition-transform ${showScience ? "rotate-180" : ""}`} />
            </div>
            {showScience && (
              <p className="text-xs text-muted-foreground leading-relaxed mt-3">{task.science_bite}</p>
            )}
          </button>
        )}

        {/* Mark Complete Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => markTaskComplete(task.id)}
          disabled={isCompleted}
          className={`w-full flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-heading font-semibold text-lg transition-all ${
            isCompleted
              ? "bg-primary/20 text-primary cursor-default"
              : "bg-primary text-primary-foreground hover:shadow-glow"
          }`}
        >
          {isCompleted ? (
            <><Check className="w-5 h-5" /> Erledigt</>
          ) : (
            <><Check className="w-5 h-5" /> Als erledigt markieren</>
          )}
        </motion.button>
      </motion.div>
    );
  };

  // ─── Knowledge Step (step 2) ───────────────────────────
  const KnowledgeStep = () => {
    const allRead = tasks.every((t) => readBites.includes(t.id));

    return (
      <motion.div key="knowledge" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
        <div className="flex items-center gap-3 mb-2">
          <Lightbulb className="w-6 h-6 text-primary" />
          <h2 className="font-heading text-2xl font-bold">Verstehe, was du trainierst</h2>
        </div>
        <p className="text-muted-foreground text-sm mb-6">
          Bevor du loslegst – hier ist die Wissenschaft hinter deinen heutigen Übungen.
        </p>

        <div className="space-y-3">
          {tasks.map((task) => {
            const isRead = readBites.includes(task.id);
            const IconComp = iconMap[task.icon] || Brain;
            const [expanded, setExpanded] = useState(false);

            const handleToggle = () => {
              setExpanded(!expanded);
              if (!isRead) {
                setReadBites((prev) => [...prev, task.id]);
              }
            };

            return (
              <button
                key={task.id}
                onClick={handleToggle}
                className={`w-full text-left rounded-2xl transition-all ${
                  expanded
                    ? "bg-accent/20 border border-accent/30 p-5"
                    : "bg-gradient-card border-glow p-4 hover:bg-secondary/50 active:scale-[0.98]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isRead ? "bg-primary/20" : "bg-secondary"
                  }`}>
                    <IconComp className={`w-5 h-5 ${isRead ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{task.title}</p>
                    <span className="text-xs text-muted-foreground">Warum das wirkt</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isRead && <CheckCircle2 className="w-4 h-4 text-primary" />}
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
                  </div>
                </div>
                {expanded && task.science_bite && (
                  <div className="mt-4 pl-[52px]">
                    <p className="text-sm text-foreground leading-relaxed">{task.science_bite}</p>
                  </div>
                )}
                {expanded && !task.science_bite && (
                  <div className="mt-4 pl-[52px]">
                    <p className="text-sm text-muted-foreground italic">Diese Übung stärkt deine mentale Fitness.</p>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <motion.button
          whileHover={allRead ? { scale: 1.02 } : {}}
          whileTap={allRead ? { scale: 0.98 } : {}}
          onClick={() => allRead && setStep(3)}
          disabled={!allRead}
          className={`w-full mt-6 flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-heading font-semibold text-lg transition-all ${
            allRead
              ? "bg-primary text-primary-foreground hover:shadow-glow"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
        >
          {allRead ? (
            <><Sparkles className="w-5 h-5" /> Bereit für die Übungen</>
          ) : (
            <>{readBites.length}/{tasks.length} gelesen</>
          )}
        </motion.button>
      </motion.div>
    );
  };

  // ─── Task Dashboard (step 3) ──────────────────────────
  const TaskDashboard = () => {
    const completedCount = completedTasks.length;
    const totalCount = tasks.length;

    return (
      <motion.div key="tasks" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-heading text-2xl font-bold">Deine Aufgaben</h2>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10">
            <span className="text-sm font-bold text-primary">{completedCount}/{totalCount}</span>
          </div>
        </div>
        <p className="text-muted-foreground text-sm mb-1">
          {loadingTasks ? "Aufgaben werden geladen..." : "Tippe auf eine Aufgabe für Details."}
        </p>

        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full bg-secondary/50 mb-6 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        {loadingTasks ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const isCompleted = completedTasks.includes(task.id);
              const IconComp = iconMap[task.icon] || Brain;
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
                      {isCompleted ? (
                        <Check className="w-5 h-5 text-primary-foreground" />
                      ) : (
                        <IconComp className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${isCompleted ? "text-primary line-through" : ""}`}>{task.title}</p>
                      <div className="flex items-center gap-3 mt-1">
                        {task.duration && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />{task.duration}
                          </span>
                        )}
                        {task.when_to_use && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />{task.when_to_use}
                          </span>
                        )}
                      </div>
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

export default DailyCheckin;
