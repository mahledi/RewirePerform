import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth, addDays, isBefore, startOfDay, differenceInDays } from "date-fns";
import { de } from "date-fns/locale";
import { Brain, ChevronLeft, ChevronRight, Dumbbell, Moon, Trophy, Plus, X, Check, Sparkles, Loader2, Calendar, ArrowRight, Info, RefreshCw, Settings, Flag, ClipboardCheck, LogOut, AlertTriangle, Shield, Microscope, TrendingUp, BookOpen, Hourglass } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import DailyCheckin from "@/components/dashboard/DailyCheckin";
import ScienceBite from "@/components/dashboard/ScienceBite";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { getEffectiveProgramStart } from "@/lib/getCurrentProgramDay";
import { getProgramModeInfo, type ProgramMode } from "@/lib/programMode";
import { normalizeDateString } from "@/lib/utils";
import { upsertTodaySnapshot, getRetestStatus } from "@/lib/programProgress";
import { getOrCreateActiveInstance } from "@/lib/programInstance";
import { buildFlameStats, type FlameStats } from "@/lib/flameStats";
import FlameCard from "@/components/dashboard/FlameCard";

type EventType = "training" | "rest" | "competition";

interface CalendarEvent {
  id: string;
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


const REQUIRED_ASSESSMENTS = ["csai2r", "smtq", "flow_short"] as const;

const eventConfig: Record<EventType, { label: string; icon: typeof Dumbbell; color: string; bg: string }> = {
  training: { label: "Training", icon: Dumbbell, color: "text-primary", bg: "bg-primary/20" },
  rest: { label: "Ruhetag", icon: Moon, color: "text-blue-400", bg: "bg-blue-400/20" },
  competition: { label: "Wettkampf", icon: Trophy, color: "text-yellow-400", bg: "bg-yellow-400/20" },
};

// ─── Calendar Setup ─────────────────────────────────────
interface CalendarSetupProps {
  analysis: Analysis | null;
  onComplete: (events: CalendarEvent[]) => void;
}

const CalendarSetup = ({ analysis, onComplete }: CalendarSetupProps) => {
  const today = startOfDay(new Date());
  const endDate = addDays(today, 55);
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

  const { user } = useAuth();

  const handleSave = async () => {
    if (filledDays < 7) return;
    setSaving(true);

    const inserts = Array.from(localEvents.entries()).map(([date, type]) => ({
      session_id: user!.id,
      user_id: user!.id,
      date,
      event_type: type,
      title: eventConfig[type].label,
    }));

    await supabase.from("calendar_events").delete().eq("user_id", user!.id);

    const { data: eventData, error: eventError } = await supabase
      .from("calendar_events")
      .insert(inserts)
      .select();

    if (eventError) {
      toast.error("Fehler beim Speichern des Kalenders.");
      setSaving(false);
      return;
    }

    const { data: existing } = await supabase
      .from("program_settings")
      .select("id")
      .eq("user_id", user!.id)
      .maybeSingle();

    const normalizedCompetitionDate = normalizeDateString(competitionDate);
    if (competitionDate && !normalizedCompetitionDate) {
      toast.error("Wettkampfdatum hat ein ungültiges Format und wurde ignoriert.");
    }

    if (existing) {
      await supabase.from("program_settings").update({
        competition_date: normalizedCompetitionDate,
        competition_name: competitionName || null,
        program_start: format(today, "yyyy-MM-dd"),
        updated_at: new Date().toISOString(),
      }).eq("id", existing.id);
    } else {
      await supabase.from("program_settings").insert({
        session_id: user!.id,
        user_id: user!.id,
        competition_date: normalizedCompetitionDate,
        competition_name: competitionName || null,
        program_start: format(today, "yyyy-MM-dd"),
      });
    }

    // Tagesinhalte kommen jetzt aus der Matrix-Architektur (src/content/matrixDays.ts).
    // Keine KI-Generierung mehr beim Setup — Inhalte sind deterministisch.
    toast.success("Programm gestartet!");

    onComplete(eventData as CalendarEvent[]);
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <span className="font-heading font-bold">RewirePerform</span>
          </div>
          <span className="text-xs text-muted-foreground font-heading">Kalender-Setup</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-heading text-2xl md:text-3xl font-bold mb-3">
            Plane deine nächsten <span className="text-gradient">8 Wochen.</span>
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
          Trage ein, wann du trainierst, wann du dich erholst und wann Wettkämpfe stattfinden.
            Dein 56-Tage-Programm folgt einer festen, neurokognitiven Struktur in 4 Phasen.
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
          <p className="text-xs text-muted-foreground mt-3">Wenn gesetzt, dient dieser Wettkampf als zeitlicher Anker im Programm.</p>
        </motion.div>

        {/* Info */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10 mb-6">
          <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Wähle unten ein Tool und tippe auf die Tage. Du kannst den Kalender später jederzeit anpassen.
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
          <span>{filledDays} / 56 Tage</span>
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
          {saving ? (<><Loader2 className="w-5 h-5 animate-spin" />Programm wird angelegt...</>) : (<>Programm starten<ArrowRight className="w-5 h-5" /></>)}
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
  const { signOut, user, role } = useAuth();
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
  const [midTestDue, setMidTestDue] = useState(false);
  const [midTestsDone, setMidTestsDone] = useState(false);
  const [todayCheckinDone, setTodayCheckinDone] = useState(false);
  const [checkinStatusLoading, setCheckinStatusLoading] = useState(true);
  const [programStartDate, setProgramStartDate] = useState<string | null>(null);
  const [baselineDone, setBaselineDone] = useState(false);
  const [retestDone, setRetestDone] = useState(false);
  const [waitingForCoach, setWaitingForCoach] = useState(false);
  const [teamProgramStart, setTeamProgramStart] = useState<string | null>(null);
  const [flameStats, setFlameStats] = useState<FlameStats | null>(null);
  

  const hasCompletedAllAssessments = (types: Set<string>) =>
    REQUIRED_ASSESSMENTS.every((id) => types.has(id));

  useEffect(() => {
    if (role === "admin") {
      navigate("/admin");
      return;
    }

    if (role === "coach") {
      navigate("/coach");
    }
  }, [role, navigate]);

  useEffect(() => {
    const loadAnalysis = async () => {
      const { data } = await supabase
        .from("questionnaire_responses")
        .select("id, analysis")
        .eq("user_id", user!.id)
        .not("analysis", "is", null)
        .order("created_at", { ascending: false })
        .limit(1);

      if (data && data.length > 0 && data[0].analysis) {
        setAnalysis(data[0].analysis as unknown as Analysis);
      } else {
        toast.error("Keine Analyse gefunden. Bitte fülle den Fragebogen aus.");
        navigate("/questionnaire");
        return;
      }
    };

    loadAnalysis();
    checkSetup();
  }, []);

  const checkSetup = async () => {
    const eventsQuery = supabase.from("calendar_events").select("*").eq("user_id", user!.id);
    const settingsQuery = supabase.from("program_settings").select("*").eq("user_id", user!.id);

    const [{ data: eventData }, { data: settingsArr }, effective] = await Promise.all([
      eventsQuery,
      settingsQuery,
      getEffectiveProgramStart(user!.id),
    ]);
    const settingsData = settingsArr && settingsArr.length > 0 ? settingsArr[0] : null;

    // Athleten in einem Team warten auf Coach-Aktivierung
    if (effective.hasTeam) {
      setTeamProgramStart(effective.source === "team" ? effective.startDate : null);
      const today = format(new Date(), "yyyy-MM-dd");
      const notStartedYet =
        !effective.startDate || effective.startDate > today;
      if (notStartedYet) {
        setWaitingForCoach(true);
        setLoading(false);
        return;
      }
      setWaitingForCoach(false);
    }

    if (eventData && eventData.length > 0) {
      setEvents(eventData as CalendarEvent[]);
      if (settingsData) {
        setCompetitionDate(settingsData.competition_date || "");
        setCompetitionName(settingsData.competition_name || "");
      }
      setSetupMode(false);
    } else {
      // Team-Mitglieder bekommen keinen eigenen Setup-Flow — Coach steuert
      if (effective.hasTeam) {
        setSetupMode(false);
      } else {
        setSetupMode(true);
      }
    }
    setLoading(false);
  };

  const handleSetupComplete = (newEvents: CalendarEvent[]) => {
    setEvents(newEvents);
    setSetupMode(false);
    navigate("/assessment?mode=pre");
  };


  const loadFlameStats = async () => {
    if (!user?.id) return;
    try {
      const instance = await getOrCreateActiveInstance(user.id);
      const instanceId = instance?.id ?? null;

      let completionsQ = supabase
        .from("user_day_completion")
        .select("day_number, completed_at, completion_status, program_instance_id")
        .eq("user_id", user.id);
      if (instanceId) completionsQ = completionsQ.eq("program_instance_id", instanceId);

      let snapshotQ = supabase
        .from("program_progress_snapshots")
        .select("current_streak, longest_streak, days_available, days_completed, program_day, program_instance_id, date")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(1);
      if (instanceId) snapshotQ = snapshotQ.eq("program_instance_id", instanceId);

      const [{ data: completions }, { data: snapshots }] = await Promise.all([
        completionsQ,
        snapshotQ,
      ]);

      const snapshot = snapshots && snapshots.length > 0 ? snapshots[0] : null;
      const stats = buildFlameStats({
        completions: (completions ?? []) as any,
        snapshot: snapshot
          ? {
              current_streak: snapshot.current_streak,
              longest_streak: snapshot.longest_streak,
              days_available: snapshot.days_available,
              days_completed: snapshot.days_completed,
              program_day: snapshot.program_day,
            }
          : null,
        today: new Date(),
      });
      setFlameStats(stats);
    } catch (e) {
      console.error("loadFlameStats error", e);
    }
  };

  const checkAssessments = async () => {
    const { data: settingsArr } = await supabase
      .from("program_settings")
      .select("program_start")
      .eq("user_id", user!.id);
    const settings = settingsArr && settingsArr.length > 0 ? settingsArr[0] : null;

    if (settings?.program_start) {
      setProgramStartDate(settings.program_start);
      const daysSince = differenceInDays(new Date(), new Date(settings.program_start));

      const { data: preTests } = await supabase
        .from("assessments")
        .select("assessment_type")
        .eq("timing", "pre")
        .eq("user_id", user!.id);

      const preTypes = new Set((preTests || []).map(t => t.assessment_type));
      setPreTestsDone(hasCompletedAllAssessments(preTypes));

      const { data: postTests } = await supabase
        .from("assessments")
        .select("assessment_type")
        .eq("timing", "post")
        .eq("user_id", user!.id);

      
      const postTypes = new Set((postTests || []).map(t => t.assessment_type));
      const postDone = hasCompletedAllAssessments(postTypes);
      setPostTestsDone(postDone);

      // Mid/Post via centralized helper (uses effective program start incl. team)
      const retest = await getRetestStatus(user!.id);
      setMidTestDue(retest.midDue);
      setMidTestsDone(retest.midDone);
      setPostTestDue(retest.postDue || (daysSince >= 56 && !postDone));

      // Idempotenter Adherence-Snapshot für heute
      upsertTodaySnapshot(user!.id)
        .then(() => loadFlameStats())
        .catch((e) => console.error("snapshot error", e));
    } else {
      setProgramStartDate(null);
      setPostTestDue(false);
      setMidTestDue(false);
    }
  };

  const checkTodayCheckin = async () => {
    setCheckinStatusLoading(true);
    const today = format(new Date(), "yyyy-MM-dd");

    const checkinQuery = supabase
      .from("daily_checkins")
      .select("id")
      .eq("date", today)
      .eq("user_id", user!.id)
      .limit(1);

    const { data, error } = await checkinQuery;
    if (error) {
      console.error("Checkin status error:", error);
      setTodayCheckinDone(false);
    } else {
      setTodayCheckinDone((data?.length || 0) > 0);
    }
    setCheckinStatusLoading(false);
  };

  const checkDeepProfile = async () => {
    const q = supabase.from("deep_profile_assessments").select("timing").eq("user_id", user!.id);
    const { data } = await q;
    const timings = new Set((data || []).map((d: any) => d.timing));
    setBaselineDone(timings.has("baseline"));
    setRetestDone(timings.has("retest"));
  };

  const refreshDashboardStatus = async () => {
    await Promise.all([checkAssessments(), checkTodayCheckin(), checkDeepProfile()]);
  };

  useEffect(() => {
    if (!setupMode && !loading) refreshDashboardStatus();
  }, [setupMode, loading, user?.id]);

  // Re-check assessments when navigating back to dashboard
  useEffect(() => {
    const handleFocus = () => {
      if (!setupMode && !loading) refreshDashboardStatus();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [setupMode, loading, user?.id]);

  // Speichert das Wettkampfziel. Früher wurde hier ein KI-Sync getriggert; seit der Matrix-Architektur
  // sind die Tagesinhalte deterministisch — diese Funktion speichert ausschließlich den zeitlichen Anker.
  const saveCompetitionGoal = async () => {
    if (!user?.id) {
      toast.error("Bitte melde dich an.");
      return;
    }
    setSyncing(true);
    try {
      const normalizedCompetitionDate = normalizeDateString(competitionDate);
      if (competitionDate && !normalizedCompetitionDate) {
        toast.error("Wettkampfdatum hat ein ungültiges Format. Bitte korrigieren.");
        setSyncing(false);
        return;
      }

      const { data: existing } = await supabase
        .from("program_settings")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (existing) {
        await supabase.from("program_settings").update({
          competition_date: normalizedCompetitionDate,
          competition_name: competitionName || null,
          updated_at: new Date().toISOString(),
        }).eq("id", existing.id);
      } else {
        await supabase.from("program_settings").insert({
          session_id: user!.id,
          user_id: user!.id,
          competition_date: normalizedCompetitionDate,
          competition_name: competitionName || null,
          program_start: format(new Date(), "yyyy-MM-dd"),
        });
      }
      toast.success("Wettkampfziel gespeichert.");
    } catch (err: any) {
      console.error("Update error:", err);
      toast.error(`Fehler: ${err?.message || "Unbekannter Fehler"}`);
    }
    setSyncing(false);
    setShowSettings(false);
  };

  const addEvent = async () => {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const { data, error } = await supabase
      .from("calendar_events")
      .insert({ session_id: user!.id, user_id: user!.id, date: dateStr, event_type: newEventType, title: newEventTitle || null })
      .select().single();
    if (error) {
      toast.error("Fehler beim Hinzufügen des Events.");
      return;
    }
    if (data) {
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
  const showPreTestReminder =
    !preTestsDone &&
    !setupMode &&
    !!programStartDate &&
    differenceInDays(new Date(), new Date(programStartDate)) < 56;

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

  if (waitingForCoach) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 px-6 py-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              <span className="font-heading font-bold">RewirePerform</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => navigate("/settings")} className="p-2 rounded-lg hover:bg-secondary transition-colors" title="Einstellungen">
                <Settings className="w-4 h-4 text-muted-foreground" />
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

        <div className="max-w-xl mx-auto px-6 py-16 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-20 h-20 rounded-full bg-primary/10 mx-auto mb-6 flex items-center justify-center"
          >
            <Hourglass className="w-10 h-10 text-primary" />
          </motion.div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold mb-3">
            Dein Coach hat das Programm noch nicht gestartet.
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed mb-8">
            Sobald alle Spieler registriert sind, gibt dein Coach das Programm frei.
          </p>

          {teamProgramStart && (
            <div className="mb-8 p-4 rounded-2xl bg-primary/10 border border-primary/30 inline-flex items-center gap-2 text-primary">
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-semibold">
                Start: {format(new Date(teamProgramStart), "d. MMMM yyyy", { locale: de })}
              </span>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => navigate("/questionnaire")}
              className="w-full p-4 rounded-2xl bg-gradient-card border-glow hover:shadow-glow transition-all flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <ClipboardCheck className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-heading font-semibold">Onboarding-Fragebogen</p>
                  <p className="text-xs text-muted-foreground">Falls noch nicht ausgefüllt</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => navigate("/settings")}
              className="w-full p-4 rounded-2xl bg-gradient-card border-glow hover:shadow-glow transition-all flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-heading font-semibold">Einstellungen & FAQ</p>
                  <p className="text-xs text-muted-foreground">App erkunden</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (setupMode) {
    return <CalendarSetup analysis={analysis} onComplete={handleSetupComplete} />;
  }

  if (showCheckin && todayEventType) {
    return (
      <DailyCheckin
        eventType={todayEventType as EventType}
        date={new Date()}
        onClose={async () => {
          setShowCheckin(false);
          await checkTodayCheckin();
          await upsertTodaySnapshot(user!.id).catch(() => {});
          await loadFlameStats();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <Brain className="w-5 h-5 text-primary" />
            <span className="font-heading font-bold">RewirePerform</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/assessment")} className="p-2 rounded-lg hover:bg-secondary transition-colors" title="Wissenschaftliche Tests">
              <ClipboardCheck className="w-4 h-4 text-muted-foreground" />
            </button>
            <button onClick={() => navigate("/settings")} className="p-2 rounded-lg hover:bg-secondary transition-colors" title="Info & Hilfe">
              <Settings className="w-4 h-4 text-muted-foreground" />
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
                <p className="text-xs text-muted-foreground mb-4">Wettkampfziel wird gespeichert. Es dient als zeitlicher Anker im Programm.</p>
                <button
                  onClick={saveCompetitionGoal}
                  disabled={syncing}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-heading font-semibold text-sm hover:shadow-glow transition-all disabled:opacity-50"
                >
                  {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {syncing ? "Speichert..." : "Speichern"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mid-Test Banner (Tag 28) */}
        {midTestDue && !midTestsDone && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-5 rounded-2xl bg-primary/10 border border-primary/30">
            <div className="flex items-start gap-3">
              <ClipboardCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-heading font-semibold text-sm mb-1">Zeit für deinen Mid-Program Re-Test.</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Du hast Halbzeit erreicht. Wiederhole die Tests, um beobachtete Veränderungen zu dokumentieren.
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate("/assessment?mode=mid")}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-heading font-semibold text-sm hover:shadow-glow transition-all"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  Mid-Tests starten
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Post-Test Banner */}
        {postTestDue && !postTestsDone && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-5 rounded-2xl bg-yellow-400/10 border border-yellow-400/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-heading font-semibold text-sm mb-1">Zeit für deinen Abschluss-Re-Test.</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Dein 8-Wochen-Programm ist abgeschlossen. Wiederhole jetzt die Tests, um die beobachtete Veränderung zu dokumentieren.
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
        {showPreTestReminder && (
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

        {/* Deep Profile Baseline Banner */}
        {!baselineDone && !setupMode && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-5 rounded-2xl bg-primary/10 border border-primary/30">
            <div className="flex items-start gap-3">
              <Microscope className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-heading font-semibold text-sm mb-1">Deep-Dive Baseline erstellen</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Erstelle dein detailliertes Athleten-Profil als Ausgangspunkt – nach 8 Wochen misst du deinen Fortschritt.
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate("/deep-profile?timing=baseline")}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-heading font-semibold text-sm hover:shadow-glow transition-all"
                >
                  <Microscope className="w-4 h-4" />
                  Baseline starten
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Deep Profile Re-Test Banner */}
        {baselineDone && !retestDone && postTestDue && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-5 rounded-2xl bg-yellow-400/10 border border-yellow-400/30">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-heading font-semibold text-sm mb-1">Deep-Dive Re-Test verfügbar!</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Dein 8-Wochen-Programm ist abgeschlossen. Mache den Re-Test und sieh, wie sich dein Mindset verändert hat.
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate("/deep-profile?timing=retest")}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-yellow-400 text-background font-heading font-semibold text-sm hover:bg-yellow-300 transition-colors"
                >
                  <TrendingUp className="w-4 h-4" />
                  Re-Test starten
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Progress Link */}
        {baselineDone && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <button
              onClick={() => navigate("/progress")}
              className="w-full p-4 rounded-2xl bg-gradient-card border-glow hover:shadow-glow transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-heading font-semibold">Dein Fortschritt (Deep Dive)</p>
                  <p className="text-xs text-muted-foreground">{retestDone ? "Baseline vs. Re-Test ansehen" : "Baseline-Profil ansehen"}</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </motion.div>
        )}

        {/* Phase & Progress Indicator */}
        {programStartDate && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-5 rounded-2xl bg-gradient-card border-glow">
            {(() => {
              const daysSince = differenceInDays(new Date(), new Date(programStartDate)) + 1;
              const clampedDay = Math.min(Math.max(daysSince, 1), 56);
              const phase = clampedDay <= 14 ? 1 : clampedDay <= 28 ? 2 : clampedDay <= 42 ? 3 : 4;
              const phaseNames = ["", "Fundament & Selbstanalyse", "Skill-Erwerb", "Intensivierung & Transfer", "Meisterschaft & Re-Test"];
              const phaseIcons = ["", "🧠", "🎯", "⚡", "🏆"];
              const progress = (clampedDay / 56) * 100;
              return (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{phaseIcons[phase]}</span>
                      <div>
                        <p className="text-xs text-muted-foreground font-heading">Phase {phase} von 4</p>
                        <p className="text-sm font-heading font-semibold">{phaseNames[phase]}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Tag {clampedDay} / 56</p>
                      <p className="text-xs text-muted-foreground">Woche {Math.ceil(clampedDay / 7)} / 8</p>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span className={phase === 1 ? "text-primary font-semibold" : ""}>Fundament</span>
                    <span className={phase === 2 ? "text-primary font-semibold" : ""}>Skills</span>
                    <span className={phase === 3 ? "text-primary font-semibold" : ""}>Transfer</span>
                    <span className={phase === 4 ? "text-primary font-semibold" : ""}>Meisterschaft</span>
                  </div>
                </>
              );
            })()}
          </motion.div>
        )}

        {/* Flame / Consistency Card */}
        {flameStats && <FlameCard stats={flameStats} />}

        {/* Today's Check-in CTA */}
        {todayEventType && checkinStatusLoading ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 p-6 rounded-2xl bg-secondary/30 border border-border/50 text-center">
            <p className="text-muted-foreground text-sm">Check-in Status wird geladen...</p>
          </motion.div>
        ) : todayEventType && !todayCheckinDone ? (
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
        ) : todayEventType ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 p-6 rounded-2xl bg-primary/10 border border-primary/30 text-center">
            <p className="font-heading font-semibold text-primary mb-1">Check-in für heute erledigt ✅</p>
            <p className="text-muted-foreground text-sm">Der nächste Check-in erscheint automatisch morgen.</p>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 p-6 rounded-2xl bg-secondary/30 border border-border/50 text-center">
            <p className="text-muted-foreground text-sm">Heute ist kein Eintrag geplant. Genieße deinen freien Tag.</p>
          </motion.div>
        )}

        {/* Tagesjournal — gleiche visuelle Bedeutung wie der Check-in */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <button
            onClick={() => navigate("/journal")}
            className="w-full p-6 rounded-2xl bg-gradient-card border-glow hover:shadow-glow transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-heading font-semibold">Tagesjournal</p>
                  <p className="text-sm text-muted-foreground">Heute Abend reflektieren →</p>
                </div>
              </div>
              <Sparkles className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
            </div>
          </button>
        </motion.div>

        {/* Science Bite */}
        <ScienceBite />

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
                      Änderungen am Kalender werden automatisch übernommen.
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
