import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth, addDays, isBefore, startOfDay, differenceInDays } from "date-fns";
import { de } from "date-fns/locale";
import { Brain, ChevronLeft, ChevronRight, Dumbbell, Moon, Trophy, Plus, X, Check, Sparkles, Loader2, Calendar, ArrowRight, Info, RefreshCw, Settings, Flag, ClipboardCheck, LogOut, AlertTriangle, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import DailyCheckin from "@/components/dashboard/DailyCheckin";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type EventType = "training" | "rest" | "competition";

interface CalendarEvent {
  id: string;
  session_id: string;
  date: string;
  event_type: EventType;
  title: string | null;
  notes: string | null;
}

interface Analysis {
  training_day_tasks: string[];
  rest_day_tasks: string[];
  strengths: { title: string }[];
  development_areas: { title: string; priority: string }[];
  patterns: { title: string }[];
  recommendations: { title: string; description: string; duration: string; frequency: string }[];
  mental_score: number;
  dominant_category: string;
}

const SESSION_KEY = "mindgame_session_id";
const SETUP_DONE_KEY = "mindgame_setup_done";

function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

const eventConfig: Record<EventType, { label: string; icon: typeof Dumbbell; color: string; bg: string }> = {
  training: { label: "Training", icon: Dumbbell, color: "text-primary", bg: "bg-primary/20" },
  rest: { label: "Ruhetag", icon: Moon, color: "text-blue-400", bg: "bg-blue-400/20" },
  competition: { label: "Wettkampf", icon: Trophy, color: "text-yellow-400", bg: "bg-yellow-400/20" },
};

// ─── Calendar Setup ─────────────────────────────────────
interface CalendarSetupProps {
  sessionId: string;
  analysis: Analysis | null;
  onComplete: (events: CalendarEvent[]) => void;
}

const CalendarSetup = ({ sessionId, analysis, onComplete }: CalendarSetupProps) => {
  const today = startOfDay(new Date());
  const endDate = addDays(today, 27);
  const [currentMonth, setCurrentMonth] = useState(today);
  const [selectedTool, setSelectedTool] = useState<EventType>("training");
  const [localEvents, setLocalEvents] = useState<Map<string, EventType>>(new Map());
  const [saving, setSaving] = useState(false);
  const [competitionDate, setCompetitionDate] = useState("");
  const [competitionName, setCompetitionName] = useState("");

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

  const isInRange = (day: Date) => startOfDay(day) >= today && startOfDay(day) <= endDate;

  const toggleDay = (day: Date) => {
    if (!isInRange(day)) return;
    const key = format(day, "yyyy-MM-dd");
    const newEvents = new Map(localEvents);
    if (newEvents.has(key) && newEvents.get(key) === selectedTool) {
      newEvents.delete(key);
    } else {
      newEvents.set(key, selectedTool);
    }
    setLocalEvents(newEvents);
  };

  const filledDays = localEvents.size;

  const handleSave = async () => {
    if (filledDays < 7) return;
    setSaving(true);

    // Save calendar events
    const inserts = Array.from(localEvents.entries()).map(([date, type]) => ({
      session_id: sessionId,
      date,
      event_type: type,
      title: eventConfig[type].label,
    }));

    const { data: eventData, error: eventError } = await supabase
      .from("calendar_events")
      .insert(inserts)
      .select();

    if (eventError) {
      toast.error("Fehler beim Speichern des Kalenders.");
      setSaving(false);
      return;
    }

    // Save program settings
    await supabase.from("program_settings").upsert({
      session_id: sessionId,
      competition_date: competitionDate || null,
      competition_name: competitionName || null,
      program_start: format(today, "yyyy-MM-dd"),
    }, { onConflict: "session_id" });

    // Generate personalized tasks via AI
    if (analysis && eventData) {
      toast.info("KI generiert personalisierte Aufgaben...");
      try {
        const { data: taskData, error: taskError } = await supabase.functions.invoke("adapt-program", {
          body: {
            calendarEvents: eventData,
            analysis,
            competitionDate: competitionDate || null,
            competitionName: competitionName || null,
          },
        });

        if (!taskError && taskData?.daily_plans) {
          // Save personalized tasks to DB
          const taskInserts = taskData.daily_plans.map((plan: any) => ({
            session_id: sessionId,
            date: plan.date,
            event_type: plan.event_type,
            tasks: plan.tasks,
          }));

          await supabase.from("personalized_tasks").upsert(taskInserts, { onConflict: "session_id,date" });
          toast.success("Personalisierte Aufgaben erstellt!");
        }
      } catch (err) {
        console.error("Task generation error:", err);
        toast.warning("Aufgaben konnten nicht personalisiert werden. Standardaufgaben werden verwendet.");
      }
    }

    localStorage.setItem(SETUP_DONE_KEY, "true");
    onComplete(eventData as CalendarEvent[]);
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <span className="font-heading font-bold">MindGame</span>
          </div>
          <span className="text-xs text-muted-foreground font-heading">Kalender-Setup</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-heading text-2xl md:text-3xl font-bold mb-3">
            Plane deine nächsten <span className="text-gradient">4 Wochen.</span>
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Trage ein, wann du trainierst, wann du dich erholst und wann Wettkämpfe stattfinden.
            Die KI erstellt dann personalisierte mentale Aufgaben für jeden Tag.
          </p>
        </motion.div>

        {/* Competition Goal */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="p-5 rounded-2xl bg-gradient-card border-glow mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Flag className="w-4 h-4 text-yellow-400" />
            <h3 className="font-heading font-semibold text-sm">Hauptwettkampf (optional)</h3>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Name des Wettkampfs"
              value={competitionName}
              onChange={(e) => setCompetitionName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-secondary/50 border border-border/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              type="date"
              value={competitionDate}
              onChange={(e) => setCompetitionDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-secondary/50 border border-border/50 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-3">Wenn gesetzt, wird das gesamte Programm auf diesen Wettkampf hin periodisiert.</p>
        </motion.div>

        {/* Info */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10 mb-6">
          <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Wähle unten ein Tool und tippe auf die Tage. Du kannst den Kalender später jederzeit anpassen – die KI passt die Aufgaben automatisch an.
          </p>
        </motion.div>

        {/* Tool Selector */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="grid grid-cols-3 gap-2 mb-6">
          {(Object.entries(eventConfig) as [EventType, typeof eventConfig.training][]).map(([type, config]) => (
            <button
              key={type}
              onClick={() => setSelectedTool(type)}
              className={`p-3 rounded-xl text-center transition-all ${
                selectedTool === type ? `${config.bg} ring-2 ring-current ${config.color}` : "bg-secondary/50 hover:bg-secondary"
              }`}
            >
              <config.icon className={`w-5 h-5 mx-auto mb-1 ${selectedTool === type ? config.color : "text-muted-foreground"}`} />
              <span className="text-xs font-medium">{config.label}</span>
            </button>
          ))}
        </motion.div>

        {/* Calendar */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-2xl bg-gradient-card border-glow p-5 mb-6">
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <h2 className="font-heading font-semibold">{format(currentMonth, "MMMM yyyy", { locale: de })}</h2>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((d) => (
              <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const eventType = localEvents.get(key);
              const inRange = isInRange(day);
              const inMonth = isSameMonth(day, currentMonth);
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => toggleDay(day)}
                  disabled={!inRange}
                  className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm transition-all ${
                    !inMonth ? "opacity-20" : ""
                  } ${!inRange && inMonth ? "opacity-30 cursor-not-allowed" : ""} ${
                    isToday(day) ? "ring-1 ring-primary" : ""
                  } ${
                    eventType === "training" ? "bg-primary/20 text-primary ring-1 ring-primary/30" :
                    eventType === "rest" ? "bg-blue-400/20 text-blue-400 ring-1 ring-blue-400/30" :
                    eventType === "competition" ? "bg-yellow-400/20 text-yellow-400 ring-1 ring-yellow-400/30" :
                    inRange ? "hover:bg-secondary" : ""
                  }`}
                >
                  <span className={`font-medium text-xs ${isToday(day) && !eventType ? "text-primary" : ""}`}>{format(day, "d")}</span>
                  {eventType && (
                    <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                      eventType === "training" ? "bg-primary" : eventType === "rest" ? "bg-blue-400" : "bg-yellow-400"
                    }`} />
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Progress */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-6">
          <span>{filledDays} / 28 Tage</span>
          <div className="flex gap-3">
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-primary" />{Array.from(localEvents.values()).filter(v => v === "training").length}</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-400" />{Array.from(localEvents.values()).filter(v => v === "rest").length}</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-400" />{Array.from(localEvents.values()).filter(v => v === "competition").length}</span>
          </div>
        </div>

        {/* CTA */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={filledDays < 7 || saving}
          className={`w-full flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-heading font-semibold text-lg transition-all ${
            filledDays >= 7 ? "bg-primary text-primary-foreground hover:shadow-glow" : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
        >
          {saving ? (<><Loader2 className="w-5 h-5 animate-spin" />KI erstellt dein Programm...</>) : (<>Programm starten<ArrowRight className="w-5 h-5" /></>)}
        </motion.button>
        {filledDays < 7 && (
          <p className="text-xs text-muted-foreground text-center mt-3">Mindestens 7 Tage eintragen.</p>
        )}
      </div>
    </div>
  );
};

// ─── Main Dashboard ─────────────────────────────────────

const Dashboard = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEventType, setNewEventType] = useState<EventType>("training");
  const [newEventTitle, setNewEventTitle] = useState("");
  const [showCheckin, setShowCheckin] = useState(false);
  const [setupMode, setSetupMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [competitionDate, setCompetitionDate] = useState("");
  const [competitionName, setCompetitionName] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [preTestsDone, setPreTestsDone] = useState(false);
  const [postTestsDone, setPostTestsDone] = useState(false);
  const [postTestDue, setPostTestDue] = useState(false);
  const [programStartDate, setProgramStartDate] = useState<string | null>(null);
  const sessionId = useMemo(() => getSessionId(), []);

  useEffect(() => {
    const savedAnalysis = localStorage.getItem("mindgame_analysis");
    if (savedAnalysis) {
      try { setAnalysis(JSON.parse(savedAnalysis)); } catch {}
    }
    checkSetup();
  }, []);

  const checkSetup = async () => {
    const [{ data: eventData }, { data: settingsData }] = await Promise.all([
      supabase.from("calendar_events").select("*").eq("session_id", sessionId),
      supabase.from("program_settings").select("*").eq("session_id", sessionId).maybeSingle(),
    ]);

    if (eventData && eventData.length > 0) {
      setEvents(eventData as CalendarEvent[]);
      if (settingsData) {
        setCompetitionDate(settingsData.competition_date || "");
        setCompetitionName(settingsData.competition_name || "");
      }
      setSetupMode(false);
    } else {
      setSetupMode(true);
    }
    setLoading(false);
  };

  const handleSetupComplete = (newEvents: CalendarEvent[]) => {
    setEvents(newEvents);
    setSetupMode(false);
    navigate("/assessment?mode=pre");
  };


  const checkAssessments = async () => {
    const { data: settings } = await supabase
      .from("program_settings")
      .select("program_start")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (settings?.program_start) {
      setProgramStartDate(settings.program_start);
      const daysSince = differenceInDays(new Date(), new Date(settings.program_start));

      const { data: preTests } = await supabase
        .from("assessments")
        .select("assessment_type")
        .eq("session_id", sessionId)
        .eq("timing", "pre");
      const preTypes = new Set((preTests || []).map(t => t.assessment_type));
      setPreTestsDone(preTypes.has("csai2r") && preTypes.has("smtq") && preTypes.has("fks"));

      const { data: postTests } = await supabase
        .from("assessments")
        .select("assessment_type")
        .eq("session_id", sessionId)
        .eq("timing", "post");
      const postTypes = new Set((postTests || []).map(t => t.assessment_type));
      setPostTestsDone(postTypes.has("csai2r") && postTypes.has("smtq") && postTypes.has("fks"));

      if (daysSince >= 28 && !postTypes.has("csai2r")) {
        setPostTestDue(true);
      }
    }
  };

  useEffect(() => {
    if (!setupMode && !loading) checkAssessments();
  }, [setupMode, loading, sessionId]);

  // Re-check assessments when navigating back to dashboard
  useEffect(() => {
    const handleFocus = () => {
      if (!setupMode && !loading) checkAssessments();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [setupMode, loading, sessionId]);

  const syncTasks = async () => {
    if (!analysis) {
      toast.error("Keine Analyse vorhanden. Bitte fülle zuerst den Fragebogen aus.");
      return;
    }
    setSyncing(true);
    toast.info("KI passt Aufgaben an deinen Kalender an...");

    try {
      // Update program settings
      await supabase.from("program_settings").upsert({
        session_id: sessionId,
        competition_date: competitionDate || null,
        competition_name: competitionName || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "session_id" });

      const { data, error } = await supabase.functions.invoke("adapt-program", {
        body: {
          calendarEvents: events,
          analysis,
          competitionDate: competitionDate || null,
          competitionName: competitionName || null,
        },
      });

      if (error) throw error;

      if (data?.daily_plans) {
        const taskUpserts = data.daily_plans.map((plan: any) => ({
          session_id: sessionId,
          date: plan.date,
          event_type: plan.event_type,
          tasks: plan.tasks,
        }));
        await supabase.from("personalized_tasks").upsert(taskUpserts, { onConflict: "session_id,date" });
        toast.success("Aufgaben wurden angepasst!");
      }
    } catch (err) {
      console.error("Sync error:", err);
      toast.error("Fehler beim Synchronisieren der Aufgaben.");
    }
    setSyncing(false);
    setShowSettings(false);
  };

  const addEvent = async () => {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const { data, error } = await supabase
      .from("calendar_events")
      .insert({ session_id: sessionId, date: dateStr, event_type: newEventType, title: newEventTitle || null })
      .select().single();
    if (!error && data) {
      setEvents((prev) => [...prev, data as CalendarEvent]);
      setShowAddEvent(false);
      setNewEventTitle("");
    }
  };

  const removeEvent = async (eventId: string) => {
    await supabase.from("calendar_events").delete().eq("id", eventId);
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return events.filter((e) => e.date === dateStr);
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

  const todayEvents = getEventsForDate(new Date());
  const todayEventType = todayEvents.length > 0 ? todayEvents[0].event_type : null;

  const trainingCount = events.filter((e) => e.event_type === "training").length;
  const restCount = events.filter((e) => e.event_type === "rest").length;
  const competitionCount = events.filter((e) => e.event_type === "competition").length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (setupMode) {
    return <CalendarSetup sessionId={sessionId} analysis={analysis} onComplete={handleSetupComplete} />;
  }

  if (showCheckin && todayEventType) {
    return (
      <DailyCheckin eventType={todayEventType as EventType} sessionId={sessionId} date={new Date()} onClose={() => setShowCheckin(false)} />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <Brain className="w-5 h-5 text-primary" />
            <span className="font-heading font-bold">MindGame</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/assessment")} className="p-2 rounded-lg hover:bg-secondary transition-colors" title="Wissenschaftliche Tests">
              <ClipboardCheck className="w-4 h-4 text-muted-foreground" />
            </button>
            <button onClick={() => setShowSettings(!showSettings)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <Settings className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={syncTasks}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Sync..." : "KI-Sync"}
            </button>
            <button
              onClick={async () => { await signOut(); navigate("/"); }}
              className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"
              title="Abmelden"
            >
              <LogOut className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
              <div className="p-5 rounded-2xl bg-gradient-card border-glow">
                <div className="flex items-center gap-2 mb-4">
                  <Flag className="w-4 h-4 text-yellow-400" />
                  <h3 className="font-heading font-semibold text-sm">Programmziel anpassen</h3>
                </div>
                <div className="space-y-3 mb-4">
                  <input
                    type="text"
                    placeholder="Name des Wettkampfs"
                    value={competitionName}
                    onChange={(e) => setCompetitionName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-secondary/50 border border-border/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <input
                    type="date"
                    value={competitionDate}
                    onChange={(e) => setCompetitionDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-secondary/50 border border-border/50 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <p className="text-xs text-muted-foreground mb-4">Änderungen werden beim nächsten KI-Sync wirksam.</p>
                <button
                  onClick={syncTasks}
                  disabled={syncing}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-heading font-semibold text-sm hover:shadow-glow transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                  {syncing ? "KI passt an..." : "Programm anpassen"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Post-Test Banner */}
        {postTestDue && !postTestsDone && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-5 rounded-2xl bg-yellow-400/10 border border-yellow-400/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-heading font-semibold text-sm mb-1">Post-Tests fällig!</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Dein 4-Wochen-Programm ist abgeschlossen. Fülle jetzt die Post-Tests aus, um deine Entwicklung wissenschaftlich zu dokumentieren.
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate("/assessment?mode=post")}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-yellow-400 text-background font-heading font-semibold text-sm hover:bg-yellow-300 transition-colors"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  Post-Tests starten
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Pre-Test Reminder */}
        {!preTestsDone && !setupMode && programStartDate && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-5 rounded-2xl bg-primary/10 border border-primary/30">
            <div className="flex items-start gap-3">
              <ClipboardCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-heading font-semibold text-sm mb-1">Pre-Tests ausstehend</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Bitte fülle die wissenschaftlichen Pre-Tests aus, um deinen Ausgangszustand zu dokumentieren.
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate("/assessment?mode=pre")}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-heading font-semibold text-sm hover:shadow-glow transition-all"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  Pre-Tests starten
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {analysis && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-5 rounded-2xl bg-gradient-card border-glow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-heading mb-1">Mental Score</p>
                <p className="text-3xl font-heading font-bold text-primary">{analysis.mental_score}<span className="text-base text-muted-foreground">/100</span></p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-1">{competitionName || "4-Wochen-Programm"}</p>
                <p className="text-sm font-heading font-medium text-foreground">{events.length} Einheiten</p>
                {competitionDate && <p className="text-xs text-yellow-400 mt-1">Ziel: {format(new Date(competitionDate), "d. MMM yyyy", { locale: de })}</p>}
              </div>
            </div>
          </motion.div>
        )}

        {/* Today's Check-in CTA */}
        {todayEventType ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <button onClick={() => setShowCheckin(true)} className="w-full p-6 rounded-2xl bg-gradient-card border-glow hover:shadow-glow transition-all group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${eventConfig[todayEventType as EventType].bg} flex items-center justify-center`}>
                    {(() => { const Icon = eventConfig[todayEventType as EventType].icon; return <Icon className={`w-6 h-6 ${eventConfig[todayEventType as EventType].color}`} />; })()}
                  </div>
                  <div className="text-left">
                    <p className="font-heading font-semibold">Heute: {eventConfig[todayEventType as EventType].label}</p>
                    <p className="text-sm text-muted-foreground">Tägliches Check-in starten →</p>
                  </div>
                </div>
                <Sparkles className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
              </div>
            </button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 p-6 rounded-2xl bg-secondary/30 border border-border/50 text-center">
            <p className="text-muted-foreground text-sm">Heute ist kein Eintrag geplant. Genieße deinen freien Tag.</p>
          </motion.div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: "Training", count: trainingCount, icon: Dumbbell, color: "text-primary", bg: "bg-primary/10" },
            { label: "Ruhetage", count: restCount, icon: Moon, color: "text-blue-400", bg: "bg-blue-400/10" },
            { label: "Wettkämpfe", count: competitionCount, icon: Trophy, color: "text-yellow-400", bg: "bg-yellow-400/10" },
          ].map((stat) => (
            <div key={stat.label} className="p-4 rounded-2xl bg-gradient-card border-glow text-center">
              <stat.icon className={`w-5 h-5 ${stat.color} mx-auto mb-2`} />
              <p className="text-2xl font-heading font-bold">{stat.count}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Calendar */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl bg-gradient-card border-glow p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <h2 className="font-heading font-semibold text-lg">{format(currentMonth, "MMMM yyyy", { locale: de })}</h2>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((d) => (<div key={d} className="text-center text-xs text-muted-foreground font-medium py-2">{d}</div>))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const dayEvents = getEventsForDate(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const inMonth = isSameMonth(day, currentMonth);
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => { setSelectedDate(day); setShowAddEvent(false); }}
                  className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm transition-all ${!inMonth ? "opacity-30" : ""} ${isToday(day) ? "ring-1 ring-primary" : ""} ${isSelected ? "bg-primary/20 ring-1 ring-primary" : "hover:bg-secondary"}`}
                >
                  <span className={`font-medium ${isToday(day) ? "text-primary" : ""}`}>{format(day, "d")}</span>
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {dayEvents.map((e) => (<div key={e.id} className={`w-1.5 h-1.5 rounded-full ${e.event_type === "training" ? "bg-primary" : e.event_type === "rest" ? "bg-blue-400" : "bg-yellow-400"}`} />))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Selected Date Panel */}
        <AnimatePresence>
          {selectedDate && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="rounded-2xl bg-gradient-card border-glow p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-semibold">{format(selectedDate, "EEEE, d. MMMM", { locale: de })}</h3>
                <button onClick={() => { setShowAddEvent(true); setNewEventType("training"); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">
                  <Plus className="w-4 h-4" />Hinzufügen
                </button>
              </div>

              {getEventsForDate(selectedDate).length > 0 ? (
                <div className="space-y-2 mb-4">
                  {getEventsForDate(selectedDate).map((event) => {
                    const config = eventConfig[event.event_type as EventType];
                    return (
                      <div key={event.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center`}>
                            <config.icon className={`w-4 h-4 ${config.color}`} />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{event.title || config.label}</p>
                            <p className="text-xs text-muted-foreground">{config.label}</p>
                          </div>
                        </div>
                        <button onClick={() => removeEvent(event.id)} className="p-1.5 rounded-lg hover:bg-destructive/20 transition-colors">
                          <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mb-4">Kein Eintrag für diesen Tag.</p>
              )}

              <AnimatePresence>
                {showAddEvent && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="p-4 rounded-xl bg-secondary/30 space-y-4">
                      <div className="grid grid-cols-3 gap-2">
                        {(Object.entries(eventConfig) as [EventType, typeof eventConfig.training][]).map(([type, config]) => (
                          <button key={type} onClick={() => setNewEventType(type)} className={`p-3 rounded-xl text-center transition-all ${newEventType === type ? `${config.bg} ring-1 ring-current ${config.color}` : "bg-secondary/50 hover:bg-secondary"}`}>
                            <config.icon className={`w-5 h-5 mx-auto mb-1 ${newEventType === type ? config.color : "text-muted-foreground"}`} />
                            <span className="text-xs font-medium">{config.label}</span>
                          </button>
                        ))}
                      </div>
                      <input type="text" placeholder="Titel (optional)" value={newEventTitle} onChange={(e) => setNewEventTitle(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-secondary/50 border border-border/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                      <div className="flex gap-2">
                        <button onClick={addEvent} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-heading font-semibold text-sm hover:shadow-glow transition-all">
                          <Check className="w-4 h-4" />Speichern
                        </button>
                        <button onClick={() => setShowAddEvent(false)} className="px-4 py-2.5 rounded-xl bg-secondary/50 text-muted-foreground text-sm hover:bg-secondary transition-colors">Abbrechen</button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3 text-center">
                      Nach Änderungen → <button onClick={syncTasks} className="text-primary underline">KI-Sync</button> drücken
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-primary" />Training</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-400" />Ruhetag</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />Wettkampf</div>
        </div>

        {/* Privacy notice for athletes in teams */}
        <div className="mt-6 bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-start gap-3">
          <Shield className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Deine Daten sind privat.</span>{" "}
            Dein Coach sieht nur, ob du aktiv am Programm teilnimmst – niemals deine persönlichen Antworten, Reflexionen oder Stimmungswerte.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
