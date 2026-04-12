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
import { useNavigate } from "react-router-dom";
import VoiceInput from "@/components/VoiceInput";

type EventType = "training" | "rest" | "competition";

interface DailyCheckinProps {
  eventType: EventType;
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
    { id: "t-activation", title: "Aktivierungs-Check", description: "Prüfe deinen Zustand und passe ihn an.", steps: ["Schließe die Augen und spüre in deinen Körper.", "Zu nervös? 3 tiefe Atemzüge, Schultern fallen lassen.", "Zu ruhig? 10 Sekunden auf der Stelle bewegen, Körperspannung aufbauen."], duration: "30 Sekunden", when_to_use: "Vor dem Training", science_bite: "Dein anteriorer cingulärer Kortex (aMCC) reguliert dein Erregungsniveau. Die Inverted-U-Theorie (Yerkes-Dodson) zeigt: Zu viel oder zu wenig Aktivierung senkt die Leistung. Dieser Check hilft dir, den optimalen Punkt zu finden.", icon: "flame" },
    { id: "t-visualization", title: "Situations-Visualisierung", description: "Stelle dir eine konkrete Trainingssituation vor.", steps: ["Augen schließen.", "Stelle dir 60 Sekunden lang eine spezifische Szene vor.", "Sieh die Farben, hör die Geräusche, spüre die Bewegung."], duration: "2 Minuten", when_to_use: "Vor dem Training", science_bite: "Visualisierung aktiviert die gleichen Hirnareale wie die tatsächliche Bewegung (prämotorischer Kortex). Meta-Analysen zeigen: Mentales Training plus physisches Training ist wirksamer als physisches Training allein.", icon: "eye" },
    { id: "t-reflection", title: "3-Sätze-Reflexion", description: "Schreibe 3 kurze Sätze über dein Training.", steps: ["Was lief heute gut?", "Was war schwierig?", "Was mache ich morgen anders?"], duration: "2 Minuten", when_to_use: "Nach dem Training", science_bite: "Schriftliche Reflexion stärkt die Konsolidierung im Hippocampus. Du überführst implizites Erleben in explizites Wissen – das beschleunigt den Lernprozess nachweislich (Gibbons, 2002).", icon: "book" },
  ],
  rest: [
    { id: "r-breathwork", title: "4-7-8 Atemübung", description: "Beruhige dein Nervensystem mit kontrollierter Atmung.", steps: ["4 Sekunden einatmen.", "7 Sekunden Atem halten.", "8 Sekunden langsam ausatmen.", "5 Durchgänge wiederholen."], duration: "3 Minuten", when_to_use: "Morgens oder abends", science_bite: "Langsames Ausatmen aktiviert den Parasympathikus über den Vagusnerv. Das senkt Cortisol und Herzfrequenz – messbar schon nach 3 Minuten. Regelmäßiges Atemtraining verbessert die HRV (Herzratenvariabilität).", icon: "wind" },
    { id: "r-journaling", title: "Freies Journaling", description: "Schreibe 5 Minuten alles auf, was dir durch den Kopf geht.", steps: ["Timer auf 5 Minuten stellen.", "Schreibe ohne Pause – egal was.", "Nicht bewerten, nur beobachten."], duration: "5 Minuten", when_to_use: "Abends", science_bite: "Expressives Schreiben reduziert die Aktivität der Amygdala (Angst-Zentrum). Pennebaker-Studien zeigen: Schon 4 Tage à 15 Minuten senken Stresshormone und verbessern die Immunfunktion.", icon: "book" },
    { id: "r-gratitude", title: "3 Dinge Dankbarkeit", description: "Nenne 3 konkrete Dinge aus deinem Sport, für die du dankbar bist.", steps: ["Denke an einen Moment der letzten Woche.", "Was hat dich stolz gemacht?", "Schreib oder sprich 3 Dinge laut aus."], duration: "2 Minuten", when_to_use: "Abends vor dem Schlafen", science_bite: "Dankbarkeitsübungen erhöhen die Dopamin- und Serotoninausschüttung im präfrontalen Kortex. Nach 8 Wochen zeigen Studien messbar mehr Wohlbefinden und Resilienz (Emmons & McCullough, 2003).", icon: "heart" },
  ],
  competition: [
    { id: "c-activation", title: "Wettkampf-Aktivierung", description: "Bringe dich in den optimalen Zustand.", steps: ["3 tiefe Power-Atemzüge.", "Spanne alle Muskeln 5 Sekunden an, dann loslassen.", "Sage dir: 'Ich bin bereit.'"], duration: "30 Sekunden", when_to_use: "10 Minuten vor dem Start", science_bite: "Progressive Muskelanspannung nach Jacobson aktiviert den Sympathikus gezielt. Das Selbstgespräch ('Ich bin bereit') nutzt den Carpenter-Effekt: Worte lösen motorische Bereitschaft aus.", icon: "flame" },
    { id: "c-focus", title: "Fokus-Wörter", description: "Wähle 2 Wörter, die dich heute leiten.", steps: ["Wähle 2 Wörter (z.B. 'mutig', 'schnell').", "Wiederhole sie 3x leise.", "Wenn du abgelenkt bist: zurück zu deinen Wörtern."], duration: "30 Sekunden", when_to_use: "Beim Aufwärmen", science_bite: "Cue Words (Schlüsselwörter) lenken die Aufmerksamkeit im dorsolateralen präfrontalen Kortex. Sie helfen, den Fokus bei Ablenkung schneller zurückzugewinnen – ein zentrales Element der Aufmerksamkeitskontrolle.", icon: "target" },
    { id: "c-reset", title: "Fehler-Reset", description: "Nach einem Fehler sofort zurück in den Fokus.", steps: ["Einmal tief ausatmen.", "Hände kurz schütteln – Fehler abschütteln.", "Blick nach vorne. Nächste Aktion."], duration: "10 Sekunden", when_to_use: "Direkt nach einem Fehler", science_bite: "Nach einem Fehler aktiviert die Amygdala eine Stressreaktion. Der physische 'Reset' (Schütteln) unterbricht diesen Loop. Die bewusste Blickrichtung nach vorne aktiviert den präfrontalen Kortex und stellt die exekutive Kontrolle wieder her.", icon: "brain" },
  ],
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
  const [tasks, setTasks] = useState<CheckinTask[]>(fallbackTasks[eventType]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [selectedTask, setSelectedTask] = useState<CheckinTask | null>(null);
  const [readBites, setReadBites] = useState<string[]>([]);
  const [usingFallback, setUsingFallback] = useState(false);

  const config = typeConfig[eventType];

  // Redirect if not logged in
  useEffect(() => {
    if (!user?.id) {
      navigate("/auth");
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user?.id) loadPersonalizedTasks();
  }, []);

  const loadPersonalizedTasks = async () => {
    if (!user?.id) return;
    const dateStr = format(date, "yyyy-MM-dd");
  const { data } = await supabase
      .from("personalized_tasks")
      .select("tasks")
      .eq("date", dateStr)
      .eq("user_id", user.id)
      .limit(1);

    if (data?.[0]?.tasks && Array.isArray(data[0].tasks) && data[0].tasks.length > 0) {
      const loaded = (data.tasks as unknown as CheckinTask[]).slice(0, 3);
      setTasks(loaded);
      setUsingFallback(false);
    } else {
      setUsingFallback(true);
      await triggerRegeneration();
    }
    setLoadingTasks(false);
  };

  const triggerRegeneration = async () => {
    if (!user?.id || regenerating) return;
    setRegenerating(true);

    try {
      const { data: qr } = await supabase
        .from("questionnaire_responses")
        .select("analysis")
        .eq("user_id", user.id)
        .not("analysis", "is", null)
        .order("created_at", { ascending: false })
        .limit(1);

      const { data: calEvents } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("user_id", user.id);

      if (!calEvents || calEvents.length === 0) {
        setRegenerating(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("sport, team")
        .eq("id", user.id)
        .maybeSingle();

      const { data: taskData, error: taskError } = await supabase.functions.invoke("adapt-program", {
        body: {
          calendarEvents: calEvents,
          analysis: qr?.[0]?.analysis || null,
          sport: profile?.sport || null,
          position: profile?.team || null,
        },
      });

      if (!taskError && taskData?.daily_plans) {
        const taskInserts = taskData.daily_plans.map((plan: any) => ({
          session_id: user.id,
          user_id: user.id,
          date: plan.date,
          event_type: plan.event_type,
          tasks: plan.tasks,
        }));
        await supabase.from("personalized_tasks").delete().eq("user_id", user.id);
        await supabase.from("personalized_tasks").insert(taskInserts);

        const dateStr = format(date, "yyyy-MM-dd");
        const todayPlan = taskData.daily_plans.find((p: any) => p.date === dateStr);
        if (todayPlan?.tasks) {
          setTasks((todayPlan.tasks as unknown as CheckinTask[]).slice(0, 3));
          setUsingFallback(false);
        }
      }
    } catch (err) {
      console.error("Auto-regeneration failed:", err);
    }
    setRegenerating(false);
  };

  const markTaskComplete = (taskId: string) => {
    setCompletedTasks((prev) =>
      prev.includes(taskId) ? prev : [...prev, taskId]
    );
    setSelectedTask(null);
  };

  const saveCheckin = async () => {
    if (!user?.id) return;
    setSaving(true);
    const dateStr = format(date, "yyyy-MM-dd");
    const focusRating = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 10) : 0;

    const payload: any = {
      session_id: user.id,
      user_id: user.id,
      date: dateStr,
      event_type: eventType,
      mood_before: moodBefore,
      energy_level: energyLevel,
      focus_rating: focusRating,
      tasks_completed: completedTasks.map((id) => tasks.find((t) => t.id === id)?.title ?? id),
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
      const { error: insertError } = await supabase
        .from("daily_checkins")
        .insert(payload);
      error = insertError;
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
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <IconComp className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="font-heading text-2xl font-bold">{task.title}</h2>
            <p className="text-muted-foreground text-sm mt-1">{task.description}</p>
          </div>
        </div>

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

  // ─── Knowledge Bite Card ───────────────────────────────
  const KnowledgeBiteCard = ({ task, isRead, onRead }: { task: CheckinTask; isRead: boolean; onRead: () => void }) => {
    const [expanded, setExpanded] = useState(false);
    const IconComp = iconMap[task.icon] || Brain;

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
            <p className="text-xs text-muted-foreground truncate">{task.description}</p>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>

        <AnimatePresence>
          {expanded && task.science_bite && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-0">
                <div className="flex items-start gap-2 p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <Lightbulb className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">{task.science_bite}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  // ─── Knowledge Step (Step 2) ───────────────────────────
  const KnowledgeStep = () => {
    const allRead = tasks.every((t) => readBites.includes(t.id));

    return (
      <motion.div key="knowledge" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
        <h2 className="font-heading text-2xl font-bold mb-2">Wissen zuerst.</h2>
        <p className="text-muted-foreground mb-6 text-sm">
          Lies die wissenschaftlichen Hintergründe deiner heutigen Aufgaben. Erst wenn du alle gelesen hast, werden die Aufgaben freigeschaltet.
        </p>

        {loadingTasks ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
          <div className="space-y-3 mb-8">
            {tasks.map((task) => (
              <KnowledgeBiteCard
                key={task.id}
                task={task}
                isRead={readBites.includes(task.id)}
                onRead={() => setReadBites((prev) => prev.includes(task.id) ? prev : [...prev, task.id])}
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
          {allRead ? (<>Aufgaben freischalten <Sparkles className="w-5 h-5" /></>) : (<>Alle Knowledge Bites lesen</>)}
        </motion.button>
      </motion.div>
    );
  };

  // ─── Task Dashboard (Step 3) ──────────────────────────
  const TaskDashboard = () => {
    const completedCount = completedTasks.length;
    const totalCount = tasks.length;

    return (
      <motion.div key="tasks" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-heading text-2xl font-bold">Deine Aufgaben</h2>
          {usingFallback && (
            <span className="text-xs text-muted-foreground px-2 py-1 rounded-md bg-secondary">Standard</span>
          )}
        </div>
        <p className="text-muted-foreground mb-6 text-sm">Tippe auf eine Aufgabe für die Anleitung.</p>

        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <span>{completedCount} / {totalCount} erledigt</span>
          {regenerating && (
            <span className="flex items-center gap-1 text-primary">
              <Loader2 className="w-3 h-3 animate-spin" /> Generiert...
            </span>
          )}
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
              <TaskDetailView task={selectedTask} />
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
                  <motion.div key="reflection" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
                    <h2 className="font-heading text-2xl font-bold mb-2">Reflexion</h2>
                    <p className="text-muted-foreground mb-4">Was nimmst du aus heute mit?</p>
                    <VoiceInput
                      currentValue={reflection}
                      onTranscript={(val) => setReflection(val)}
                      placeholder="Schreibe frei oder sprich ein..."
                    />
                    <textarea
                      value={reflection}
                      onChange={(e) => setReflection(e.target.value)}
                      placeholder="Schreibe frei. Keine Bewertung, nur Beobachtung..."
                      className="w-full h-40 mt-3 px-5 py-4 rounded-2xl bg-secondary/40 border border-border/50 text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </motion.div>
                )}
                {step === 5 && (
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
              {step === 4 ? (<>{saving ? "Speichert..." : "Abschließen"}<Check className="w-4 h-4" /></>) : step === 3 && completedTasks.length === 0 ? (<>Schließe mindestens 1 Aufgabe ab</>) : (<>Weiter<ArrowRight className="w-4 h-4" /></>)}
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyCheckin;
