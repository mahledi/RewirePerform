import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  ArrowLeft, ArrowRight, Check, Dumbbell, Moon, Trophy,
  Brain, Flame, Eye, Heart, Target, Sparkles, Wind, Sunrise, BookOpen, Shield, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  icon: string;
}

const iconMap: Record<string, typeof Brain> = {
  brain: Brain, eye: Eye, flame: Flame, heart: Heart, target: Target,
  wind: Wind, sunrise: Sunrise, book: BookOpen, sparkles: Sparkles, shield: Shield,
};

// Fallback tasks if no personalized tasks are available
const fallbackTasks: Record<EventType, CheckinTask[]> = {
  training: [
    { id: "t-process-goal", title: "Prozess-Ziel setzen", description: "Definiere ein konkretes Prozess-Ziel für heute.", icon: "target" },
    { id: "t-visualization", title: "Wettkampf-Visualisierung", description: "Visualisiere 3 Minuten lang eine spezifische Wettkampfsituation.", icon: "eye" },
    { id: "t-situation-scan", title: "Situations-Training", description: "Beobachte bewusst wie du auf Fehler reagierst.", icon: "brain" },
    { id: "t-energy-check", title: "Energie-Scan", description: "Spüre in deinen Körper: Wo ist Spannung? Wo Leichtigkeit?", icon: "flame" },
    { id: "t-progress-focus", title: "Fortschritts-Fokus", description: "Heute geht es darum zu LERNEN, nicht zu gewinnen.", icon: "sparkles" },
  ],
  rest: [
    { id: "r-mindset", title: "Mindset-Reflexion", description: "Schreibe 5 Minuten lang alles auf was dir durch den Kopf geht.", icon: "book" },
    { id: "r-visualization", title: "Mentales Training", description: "Visualisiere deinen idealen Wettkampf. 5-10 Minuten.", icon: "eye" },
    { id: "r-breathwork", title: "Atemübung", description: "4-7-8 Atmung: 4 Sek. ein, 7 halten, 8 aus. 5 Durchgänge.", icon: "wind" },
    { id: "r-gratitude", title: "Dankbarkeits-Praxis", description: "Nenne 3 Dinge in deinem Sport die du schätzt.", icon: "heart" },
    { id: "r-identity", title: "Identitäts-Übung", description: "Verbringe Zeit mit einer Aktivität die nichts mit Sport zu tun hat.", icon: "sunrise" },
  ],
  competition: [
    { id: "c-activation", title: "Aktivierungs-Level", description: "Finde dein optimales Erregungsniveau.", icon: "flame" },
    { id: "c-routine", title: "Pre-Competition Routine", description: "Gehe deine Routine durch. Vertrautheit schafft Vertrauen.", icon: "target" },
    { id: "c-focus-words", title: "Fokus-Wörter", description: "Wähle 2-3 Wörter die dich heute leiten.", icon: "brain" },
    { id: "c-external-focus", title: "Externer Fokus", description: "Richte deine Aufmerksamkeit nach außen.", icon: "eye" },
    { id: "c-acceptance", title: "Akzeptanz-Übung", description: "Löse dich vom Ergebnis. Du bist vorbereitet.", icon: "heart" },
  ],
};

const typeConfig: Record<EventType, { label: string; icon: typeof Dumbbell; color: string; bg: string }> = {
  training: { label: "Trainingstag", icon: Dumbbell, color: "text-primary", bg: "bg-primary/20" },
  rest: { label: "Ruhetag", icon: Moon, color: "text-blue-400", bg: "bg-blue-400/20" },
  competition: { label: "Wettkampftag", icon: Trophy, color: "text-yellow-400", bg: "bg-yellow-400/20" },
};

const DailyCheckin = ({ eventType, sessionId, date, onClose }: DailyCheckinProps) => {
  const [step, setStep] = useState(0);
  const [moodBefore, setMoodBefore] = useState<number | null>(null);
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [reflection, setReflection] = useState("");
  const [saving, setSaving] = useState(false);
  const [tasks, setTasks] = useState<CheckinTask[]>(fallbackTasks[eventType]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  const config = typeConfig[eventType];

  useEffect(() => {
    loadPersonalizedTasks();
  }, []);

  const loadPersonalizedTasks = async () => {
    const dateStr = format(date, "yyyy-MM-dd");
    const { data } = await supabase
      .from("personalized_tasks")
      .select("tasks")
      .eq("session_id", sessionId)
      .eq("date", dateStr)
      .maybeSingle();

    if (data?.tasks && Array.isArray(data.tasks) && data.tasks.length > 0) {
      setTasks(data.tasks as unknown as CheckinTask[]);
    }
    setLoadingTasks(false);
  };

  const toggleTask = (taskId: string) => {
    setCompletedTasks((prev) =>
      prev.includes(taskId) ? prev.filter((t) => t !== taskId) : [...prev, taskId]
    );
  };

  const saveCheckin = async () => {
    setSaving(true);
    const dateStr = format(date, "yyyy-MM-dd");
    await supabase.from("daily_checkins").upsert(
      {
        session_id: sessionId,
        date: dateStr,
        event_type: eventType,
        mood_before: moodBefore,
        energy_level: energyLevel,
        focus_rating: Math.round((completedTasks.length / tasks.length) * 10),
        tasks_completed: completedTasks as any,
        reflection: reflection || null,
      },
      { onConflict: "session_id,date" }
    );
    setSaving(false);
    setStep(4);
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button onClick={onClose} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
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

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-lg w-full">
          <AnimatePresence mode="wait">
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
            {step === 2 && (
              <motion.div key="tasks" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
                <h2 className="font-heading text-2xl font-bold mb-2">Deine Aufgaben</h2>
                <p className="text-muted-foreground mb-1 text-sm">
                  {loadingTasks ? "Aufgaben werden geladen..." : "Personalisiert basierend auf deinem Profil."}
                </p>
                <p className="text-xs text-primary/60 mb-6">Arbeite diese Aufgaben durch.</p>
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
                          onClick={() => toggleTask(task.id)}
                          className={`w-full text-left p-4 rounded-2xl transition-all ${
                            isCompleted
                              ? "bg-primary/10 ring-1 ring-primary/30"
                              : "bg-gradient-card border-glow hover:bg-secondary/50"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                              isCompleted ? "bg-primary" : "bg-secondary"
                            }`}>
                              {isCompleted ? (
                                <Check className="w-3.5 h-3.5 text-primary-foreground" />
                              ) : (
                                <IconComp className="w-3.5 h-3.5 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <p className={`text-sm font-medium mb-1 ${isCompleted ? "text-primary" : ""}`}>{task.title}</p>
                              <p className="text-xs text-muted-foreground leading-relaxed">{task.description}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
            {step === 3 && (
              <motion.div key="reflection" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
                <h2 className="font-heading text-2xl font-bold mb-2">Reflexion</h2>
                <p className="text-muted-foreground mb-6">Was nimmst du aus heute mit?</p>
                <textarea
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  placeholder="Schreibe frei. Keine Bewertung, nur Beobachtung..."
                  className="w-full h-40 px-5 py-4 rounded-2xl bg-secondary/40 border border-border/50 text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </motion.div>
            )}
            {step === 4 && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }} className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
                  <Check className="w-10 h-10 text-primary" />
                </motion.div>
                <h2 className="font-heading text-2xl font-bold mb-2">Check-in abgeschlossen</h2>
                <p className="text-muted-foreground mb-2">{completedTasks.length} von {tasks.length} Aufgaben erledigt.</p>
                <p className="text-xs text-muted-foreground mb-8">Konsistenz ist der Schlüssel.</p>
                <button onClick={onClose} className="px-8 py-3 rounded-xl bg-primary font-heading font-semibold text-primary-foreground hover:shadow-glow transition-all">
                  Zurück zum Dashboard
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {step < 4 && (
        <div className="sticky bottom-0 bg-background/80 backdrop-blur-xl border-t border-border/50 px-6 py-4">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <button onClick={() => (step > 0 ? setStep(step - 1) : onClose())} className="flex items-center gap-2 px-5 py-3 rounded-xl text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Zurück
            </button>
            <div className="flex gap-1.5">
              {[0, 1, 2, 3].map((s) => (
                <div key={s} className={`w-2 h-2 rounded-full transition-colors ${s === step ? "bg-primary" : "bg-muted"}`} />
              ))}
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (step === 3) saveCheckin();
                else if (step === 0 && moodBefore) setStep(1);
                else if (step === 1 && energyLevel) setStep(2);
                else if (step === 2) setStep(3);
              }}
              disabled={(step === 0 && !moodBefore) || (step === 1 && !energyLevel)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-heading font-semibold transition-all ${
                (step === 0 && !moodBefore) || (step === 1 && !energyLevel)
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:shadow-glow"
              }`}
            >
              {step === 3 ? (<>{saving ? "Speichert..." : "Abschließen"}<Check className="w-4 h-4" /></>) : (<>Weiter<ArrowRight className="w-4 h-4" /></>)}
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyCheckin;
