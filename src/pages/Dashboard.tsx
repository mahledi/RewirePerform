import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth, addDays, isBefore, startOfDay, differenceInDays } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Dumbbell, Moon, Trophy, Plus, X, Check, Sparkles, Loader2, Calendar, ArrowRight, Info, Settings, Flag, ClipboardCheck, LogOut, AlertTriangle, Shield, Microscope, TrendingUp, BookOpen, Hourglass, Brain, Headphones } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLocation, useNavigate } from "react-router-dom";
import DailyCheckin from "@/components/dashboard/DailyCheckin";
import ScienceBite from "@/components/dashboard/ScienceBite";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { getCurrentProgramDay, getEffectiveProgramStart } from "@/lib/getCurrentProgramDay";
import { getProgramModeInfo, type ProgramMode } from "@/lib/programMode";
import { normalizeDateString } from "@/lib/utils";
import { getAssessmentCompletionStatus, upsertTodaySnapshot } from "@/lib/programProgress";
import { getOrCreateActiveInstance } from "@/lib/programInstance";
import {
  buildFlameStats,
  countActiveApplications,
  type FlameCompletionRow,
  type FlameStats,
} from "@/lib/flameStats";
import { setAthleteProgressCache } from "@/lib/athleteProgressCache";
import { resolveProgressReferenceDateIso } from "@/lib/athleteProgressPresentation";
import { BrandLockup } from "@/components/brand/BrandLogo";
import { getEffectiveTodayDate } from "@/lib/qaTime";
import { resolveDay } from "@/lib/getDayContent";
import AthleteRouteLoadingShell from "@/components/app/AthleteRouteLoadingShell";
import AccessStatusScreen from "@/components/access/AccessStatusScreen";
import { hasValidCompletedOnboarding } from "@/lib/questionnaireCompletion";
import {
  loadDashboardInitialStatus,
  resolveDashboardProgramStart,
} from "@/lib/dashboardInitialStatus";
import {
  DashboardBootstrapError,
  loadDashboardBootstrapStages,
  runDashboardBootstrap,
} from "@/lib/dashboardBootstrap";
import {
  AthleteAppHeader,
  AthleteBottomNavigation,
  athleteAppBackground,
  athleteAppViewport,
} from "@/components/app/AthleteAppChrome";
import { getAthleteGreeting } from "@/lib/athleteGreeting";
import { getRecentMissedDayReviewWindow } from "@/lib/missedDayReviewWindow";
import { getAssessmentStatusRevision } from "@/lib/assessmentStatusRevision";
import { loadPreTrainingCompletion } from "@/lib/preTrainingCompletion";
import { isPreTrainingExpired } from "@/lib/preTrainingState";
import {
  canOpenRestVisualization,
  readRestVisualizationIntent,
  type NativeRestVisualizationIntent,
} from "@/lib/nativeRestVisualizationIntent";

type EventType = "training" | "rest" | "competition";
type SetupState = "ready" | "setup" | "waiting";

interface DashboardSetupResult {
  state: SetupState;
  events: CalendarEvent[];
  mode: ProgramMode;
  teamProgramStart: string | null;
  programStartDate: string | null;
  competitionDate: string;
  competitionName: string;
}

interface CalendarEvent {
  id: string;
  date: string;
  event_type: EventType;
  title: string | null;
  notes: string | null;
  training_local_hour?: number | null;
  training_local_minute?: number | null;
  training_timezone?: string | null;
}

interface Analysis {
  training_day_tasks: string[];
  rest_day_tasks: string[];
  strengths: { title: string }[];
  development_areas: { title: string; priority: string }[];
  patterns: { title: string }[];
  recommendations: { title: string; description: string; duration: string; frequency: string }[];
}

interface MissedDayReview {
  key: string;
  dayNumber: number;
  date: string;
  eventType: EventType;
  lens: string;
  scienceFact: string;
  coreShift: string;
  tasks: string[];
}


const DEEP_PROFILE_BASELINE_AVAILABLE_FROM_DAY = 7;
const DASHBOARD_MEMORY_CACHE_TTL_MS = 5 * 60 * 1000;

const eventConfig: Record<EventType, { label: string; icon: typeof Dumbbell; color: string; bg: string }> = {
  training: { label: "Training", icon: Dumbbell, color: "text-primary", bg: "bg-primary/20" },
  rest: { label: "Ruhetag", icon: Moon, color: "text-blue-400", bg: "bg-blue-400/20" },
  competition: { label: "Wettkampf", icon: Trophy, color: "text-yellow-400", bg: "bg-yellow-400/20" },
};

const phaseShortNames = ["", "Fundament", "Skills", "Transfer", "Meisterschaft"] as const;

const ProgramDayRing = ({ day }: { day: number }) => {
  const circumference = 2 * Math.PI * 28;
  const offset = circumference - (day / 56) * circumference;

  return (
    <div
      className="relative flex h-[76px] w-[76px] shrink-0 items-center justify-center"
      aria-label={`Programmtag ${day} von 56`}
    >
      <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 76 76" aria-hidden="true">
        <circle cx="38" cy="38" r="28" fill="none" stroke="rgba(255,255,255,.065)" strokeWidth="3.5" />
        <motion.circle
          cx="38"
          cy="38"
          r="28"
          fill="none"
          stroke="#2EAD89"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </svg>
      <div className="text-center">
        <span className="block text-lg font-semibold leading-none">{day}</span>
        <span className="mt-1 block text-[9px] uppercase tracking-[0.12em] text-white/48">von 56</span>
      </div>
    </div>
  );
};

const DailyCompletionRing = ({ completed }: { completed: number }) => (
  <div
    className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/[0.09]"
    aria-label={`${completed} von 2 Tagesaktionen erledigt`}
  >
    <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="21" fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="2" />
      <motion.circle
        cx="24"
        cy="24"
        r="21"
        fill="none"
        stroke="#2EAD89"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={132}
        animate={{ strokeDashoffset: 132 - (132 * completed) / 2 }}
        transition={{ duration: 0.6 }}
      />
    </svg>
    <span className="text-[11px] font-semibold">{completed}/2</span>
  </div>
);

const DashboardActionRow = ({
  icon: Icon,
  eyebrow,
  title,
  detail,
  onClick,
  done = false,
  disabled = false,
  last = false,
}: {
  icon: typeof Dumbbell;
  eyebrow: string;
  title: string;
  detail: string;
  onClick?: () => void;
  done?: boolean;
  disabled?: boolean;
  last?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`flex min-h-[76px] w-full items-center gap-3.5 px-4 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${
      last ? "" : "border-b border-white/[0.055]"
    } ${disabled ? "cursor-default opacity-65" : "hover:bg-white/[0.025] active:bg-white/[0.045]"}`}
  >
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-white/[0.045]">
      <Icon className={`h-[18px] w-[18px] ${done ? "text-primary" : "text-white/62"}`} strokeWidth={1.7} />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-white/48">{eyebrow}</span>
      <span className="mt-1 block text-sm font-semibold leading-5">{title}</span>
      <span className="mt-1 block text-[11px] leading-4 text-white/52">{detail}</span>
    </span>
    {done ? (
      <Check className="h-4 w-4 shrink-0 text-primary" />
    ) : !disabled ? (
      <ChevronRight className="h-4 w-4 shrink-0 text-white/25" />
    ) : null}
  </button>
);

const PlanTimelineRow = ({
  time,
  icon: Icon,
  title,
  detail,
  active = false,
  done = false,
  onClick,
  onRemove,
  last = false,
}: {
  time: string;
  icon: typeof Dumbbell;
  title: string;
  detail: string;
  active?: boolean;
  done?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  last?: boolean;
}) => (
  <div className={`relative flex w-full gap-3 pb-6 text-left sm:gap-4 ${last ? "pb-0" : ""}`}>
    <span
      className={`absolute -left-[25px] top-1.5 h-2 w-2 rounded-full ring-4 ring-[#0D0E12] ${
        active || done ? "bg-primary" : "bg-white/22"
      }`}
      aria-hidden="true"
    />
    <span className="w-12 shrink-0 pt-0.5 text-[10px] font-medium text-white/48">{time}</span>
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        onClick ? "hover:bg-white/[0.025]" : "cursor-default"
      }`}
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ${active || done ? "bg-primary/[0.09]" : "bg-white/[0.04]"}`}>
        {done ? <Check className="h-[18px] w-[18px] text-primary" /> : <Icon className={`h-[18px] w-[18px] ${active ? "text-primary" : "text-white/52"}`} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-1 block text-[11px] leading-4 text-white/52">{detail}</span>
      </span>
      {onClick && <ChevronRight className="mr-2 h-4 w-4 shrink-0 text-white/24" />}
    </button>
    {onRemove && (
      <button
        type="button"
        onClick={onRemove}
        aria-label={`${title} entfernen`}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/35 hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
      >
        <X className="h-4 w-4" />
      </button>
    )}
  </div>
);

interface DashboardMemoryCache {
  userId: string;
  cachedAt: number;
  assessmentRevision: number;
  currentMonthIso: string;
  events: CalendarEvent[];
  setupMode: boolean;
  waitingForCoach: boolean;
  teamProgramStart: string | null;
  programMode: ProgramMode;
  competitionDate: string;
  competitionName: string;
  analysis: Analysis | null;
  preTestsDone: boolean;
  postTestsDone: boolean;
  postTestDue: boolean;
  midTestDue: boolean;
  midTestsDone: boolean;
  todayCheckinDone: boolean;
  todayJournalDone: boolean;
  checkinStatusLoading: boolean;
  programStartDate: string | null;
  baselineDone: boolean;
  retestDone: boolean;
  flameStats: FlameStats | null;
  missedDayReviews: MissedDayReview[];
  effectiveTodayIso: string;
}

let dashboardMemoryCache: DashboardMemoryCache | null = null;

const getDashboardMemoryCache = (userId?: string | null) => {
  if (!userId || !dashboardMemoryCache || dashboardMemoryCache.userId !== userId) return null;
  if (Date.now() - dashboardMemoryCache.cachedAt > DASHBOARD_MEMORY_CACHE_TTL_MS) return null;
  if (getAssessmentStatusRevision(userId) !== dashboardMemoryCache.assessmentRevision) return null;
  return dashboardMemoryCache;
};

const removeMissedReviewByKey = (reviews: MissedDayReview[], reviewKey: string) =>
  reviews.filter((review) => review.key !== reviewKey);

const removeMissedReviewFromDashboardCache = (userId: string, reviewKey: string) => {
  if (!dashboardMemoryCache || dashboardMemoryCache.userId !== userId) return;
  dashboardMemoryCache = {
    ...dashboardMemoryCache,
    cachedAt: Date.now(),
    missedDayReviews: removeMissedReviewByKey(dashboardMemoryCache.missedDayReviews, reviewKey),
  };
};

const getMissedReviewStorageKey = (userId: string, instanceId: string | null) =>
  `missed-day-review:${userId}:${instanceId ?? "legacy"}`;

const readAcknowledgedMissedReviews = (userId: string, instanceId: string | null) => {
  try {
    const raw = window.localStorage.getItem(getMissedReviewStorageKey(userId, instanceId));
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : []);
  } catch {
    return new Set<string>();
  }
};

const writeAcknowledgedMissedReviews = (userId: string, instanceId: string | null, keys: Set<string>) => {
  try {
    window.localStorage.setItem(getMissedReviewStorageKey(userId, instanceId), JSON.stringify(Array.from(keys)));
  } catch {
    // localStorage can be unavailable in strict browser modes.
  }
};

const buildInitialMissedDayReviews = ({
  userId,
  instanceId,
  startDate,
  referenceDate,
  completionRows,
  events,
}: {
  userId: string;
  instanceId: string;
  startDate: string | null;
  referenceDate: Date;
  completionRows: FlameCompletionRow[];
  events: CalendarEvent[];
}): MissedDayReview[] => {
  const dayInfo = getCurrentProgramDay(startDate, referenceDate);
  if (!startDate || !dayInfo || dayInfo.dayNumber <= 1) return [];

  const completedDays = new Set(
    completionRows
      .filter((row) => row.completion_status === "completed")
      .map((row) => row.day_number),
  );
  const acknowledged = readAcknowledgedMissedReviews(userId, instanceId);
  const start = new Date(`${startDate}T00:00:00`);
  const reviews: MissedDayReview[] = [];

  for (const dayNumber of getRecentMissedDayReviewWindow(dayInfo.dayNumber)) {
    if (completedDays.has(dayNumber)) continue;
    const dayDate = addDays(start, dayNumber - 1);
    const date = format(dayDate, "yyyy-MM-dd");
    const key = `${date}:${dayNumber}`;
    if (acknowledged.has(key)) continue;

    const eventType = events.find((event) => event.date === date)?.event_type ?? "training";
    const resolved = resolveDay(dayNumber, dayDate, eventType);
    if (!resolved) continue;

    reviews.push({
      key,
      dayNumber,
      date,
      eventType,
      lens: resolved.content.title ?? resolved.content.lens ?? resolved.matrix.lens,
      scienceFact: resolved.content.scienceBite.fact,
      coreShift: resolved.content.coreShift,
      tasks: resolved.content.tasks.map((task) => task.title),
    });
  }

  return reviews;
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
    setSaving(true);

    const inserts = Array.from(localEvents.entries()).map(([date, type]) => ({
      session_id: user!.id,
      user_id: user!.id,
      date,
      event_type: type,
      title: eventConfig[type].label,
    }));

    await supabase.from("calendar_events").delete().eq("user_id", user!.id);

    const { data: eventData, error: eventError } = inserts.length > 0
      ? await supabase
          .from("calendar_events")
          .insert(inserts)
          .select()
      : { data: [], error: null };

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
          <BrandLockup symbolSize={26} textClassName="text-base" />
          <span className="text-xs text-muted-foreground font-heading">Kalender-Setup</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-heading text-2xl md:text-3xl font-bold mb-3">
            Plane deine nächsten <span className="text-gradient">8 Wochen.</span>
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Optional: Trage ein, wann du trainierst, wann du dich erholst und wann Wettkämpfe stattfinden.
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
            Du kannst deinen Kalender jetzt vorbereiten oder direkt starten und ihn später jederzeit in den Einstellungen anpassen.
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
          disabled={saving}
          className={`w-full flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-heading font-semibold text-lg transition-all ${
            saving ? "bg-muted text-muted-foreground cursor-wait" : "bg-primary text-primary-foreground hover:shadow-glow"
          }`}
        >
          {saving ? (<><Loader2 className="w-5 h-5 animate-spin" />Programm wird angelegt...</>) : (<>Programm starten<ArrowRight className="w-5 h-5" /></>)}
        </motion.button>
        {filledDays < 56 && (
          <p className="text-xs text-muted-foreground text-center mt-3">Kalender optional. Nicht geplante Tage laufen als normaler Trainingstag.</p>
        )}
      </div>
    </div>
  );
};

// ─── Main Dashboard ─────────────────────────────────────

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, user, role } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEventType, setNewEventType] = useState<EventType>("training");
  const [newEventTitle, setNewEventTitle] = useState("");
  const [showCheckin, setShowCheckin] = useState(false);
  const [pendingRestVisualization, setPendingRestVisualization] = useState<NativeRestVisualizationIntent | null>(null);
  const [checkinInitialFocus, setCheckinInitialFocus] = useState<"rest-visualization" | undefined>();
  const [setupMode, setSetupMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);
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
  const [todayJournalDone, setTodayJournalDone] = useState(false);
  const [todayPreTrainingDone, setTodayPreTrainingDone] = useState(false);
  const [preTrainingStatusLoading, setPreTrainingStatusLoading] = useState(true);
  const [preTrainingClock, setPreTrainingClock] = useState(() => new Date());
  const [checkinStatusLoading, setCheckinStatusLoading] = useState(true);
  const [programStartDate, setProgramStartDate] = useState<string | null>(null);
  const [baselineDone, setBaselineDone] = useState(false);
  const [retestDone, setRetestDone] = useState(false);
  const [waitingForCoach, setWaitingForCoach] = useState(false);
  const [teamProgramStart, setTeamProgramStart] = useState<string | null>(null);
  const [programMode, setProgramMode] = useState<ProgramMode>("solo");
  const [flameStats, setFlameStats] = useState<FlameStats | null>(null);
  const [missedDayReviews, setMissedDayReviews] = useState<MissedDayReview[]>([]);
  const [effectiveToday, setEffectiveToday] = useState<Date>(new Date());
  const [showMonthCalendar, setShowMonthCalendar] = useState(false);
  const [dashboardSection, setDashboardSection] = useState<"today" | "plan">(
    location.hash === "#dashboard-plan" ? "plan" : "today",
  );
  const lastStatusRefreshAt = useRef(0);
  

  const applyDashboardCache = (cache: DashboardMemoryCache) => {
    setCurrentMonth(new Date(cache.currentMonthIso));
    setEvents(cache.events);
    setSetupMode(cache.setupMode);
    setWaitingForCoach(cache.waitingForCoach);
    setTeamProgramStart(cache.teamProgramStart);
    setProgramMode(cache.programMode);
    setCompetitionDate(cache.competitionDate);
    setCompetitionName(cache.competitionName);
    setAnalysis(cache.analysis);
    setPreTestsDone(cache.preTestsDone);
    setPostTestsDone(cache.postTestsDone);
    setPostTestDue(cache.postTestDue);
    setMidTestDue(cache.midTestDue);
    setMidTestsDone(cache.midTestsDone);
    setTodayCheckinDone(cache.todayCheckinDone);
    setTodayJournalDone(cache.todayJournalDone);
    setCheckinStatusLoading(cache.checkinStatusLoading);
    setProgramStartDate(cache.programStartDate);
    setBaselineDone(cache.baselineDone);
    setRetestDone(cache.retestDone);
    setFlameStats(cache.flameStats);
    setMissedDayReviews(cache.missedDayReviews);
    setEffectiveToday(new Date(cache.effectiveTodayIso));
    setLoading(false);
  };

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
    const intent = readRestVisualizationIntent(location.state);
    if (!intent) return;
    setPendingRestVisualization(intent);
    navigate("/dashboard", { replace: true, state: null });
  }, [location.state, navigate]);

  useEffect(() => {
    if (loading) return;
    if (location.hash === "#dashboard-plan") {
      setDashboardSection("plan");
      window.requestAnimationFrame(() => {
        document.getElementById("dashboard-plan")?.scrollIntoView({ block: "start" });
      });
      return;
    }
    setDashboardSection("today");
    window.scrollTo({ top: 0, left: 0 });
  }, [loading, location.hash]);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;
    const cachedDashboard = getDashboardMemoryCache(user.id);

    if (cachedDashboard) {
      applyDashboardCache(cachedDashboard);
      lastStatusRefreshAt.current = cachedDashboard.cachedAt;
    } else {
      setLoading(true);
    }

    setBootstrapError(null);

    const loadCompletedQuestionnaire = async (signal: AbortSignal): Promise<Analysis | null> => {
      const { data, error } = await supabase
        .from("questionnaire_responses")
        .select("id, analysis, answers, is_complete, instrument_id")
        .eq("user_id", user!.id)
        .eq("is_complete", true)
        .not("analysis", "is", null)
        .order("created_at", { ascending: false })
        .limit(5)
        .retry(false)
        .abortSignal(signal);

      if (error) throw error;

      const completedOnboarding = (data ?? []).find(hasValidCompletedOnboarding);
      return completedOnboarding?.analysis
        ? completedOnboarding.analysis as unknown as Analysis
        : null;
    };

    const initializeDashboard = async () => {
      try {
        const [completedAnalysis, resolvedToday, setup, status] = await runDashboardBootstrap(
          (signal) => loadDashboardBootstrapStages({
            loadAnalysis: loadCompletedQuestionnaire,
            loadReferenceDate: (requestSignal) =>
              getEffectiveTodayDate(user.id, requestSignal),
            loadSetup: loadDashboardSetup,
            loadStatus: (today, requestSignal) =>
              loadDashboardInitialStatus(user.id, today, null, requestSignal),
          }, signal),
        );

        if (cancelled) return;
        if (!completedAnalysis) {
          toast.info("Bitte schließe zuerst dein Startprofil ab.");
          navigate("/questionnaire", { replace: true });
          return;
        }

        const effectiveStart = resolveDashboardProgramStart(
          setup.teamProgramStart,
          setup.programStartDate,
        );
        const initialMissedReviews = buildInitialMissedDayReviews({
          userId: user.id,
          instanceId: status.instanceId,
          startDate: effectiveStart,
          referenceDate: resolvedToday,
          completionRows: status.completionRows,
          events: setup.events,
        });

        // All first-frame dashboard values are committed together. React 18
        // batches this synchronous block into one visible render.
        setAnalysis(completedAnalysis);
        setEffectiveToday(resolvedToday);
        setEvents(setup.events);
        setProgramMode(setup.mode);
        setTeamProgramStart(setup.teamProgramStart);
        setProgramStartDate(effectiveStart);
        setCompetitionDate(setup.competitionDate);
        setCompetitionName(setup.competitionName);
        setSetupMode(setup.state === "setup");
        setWaitingForCoach(setup.state === "waiting");
        setPreTestsDone(status.preTestsDone);
        setMidTestsDone(status.midTestsDone);
        setPostTestsDone(status.postTestsDone);
        setMidTestDue(status.midTestDue);
        setPostTestDue(status.postTestDue);
        setTodayCheckinDone(status.todayCheckinDone);
        setTodayJournalDone(status.todayJournalDone);
        setCheckinStatusLoading(false);
        setBaselineDone(status.baselineDone);
        setRetestDone(status.retestDone);
        setFlameStats(status.flameStats);
        setAthleteProgressCache(user.id, status.flameStats, {
          activeApplications: status.tasksCompletedCount,
          referenceDateIso: resolveProgressReferenceDateIso(effectiveStart, resolvedToday),
          measurementStatus: {
            preDone: status.preTestsDone,
            midDue: status.midTestDue,
            midDone: status.midTestsDone,
            postDue: status.postTestDue,
            postDone: status.postTestsDone,
            programDay: status.flameStats.programDay,
          },
        });
        setMissedDayReviews(initialMissedReviews);
        lastStatusRefreshAt.current = Date.now();
        setBootstrapError(null);
        setLoading(false);

        // Evidence refresh is idempotent and must never delay the first frame.
        void upsertTodaySnapshot(user.id).catch((error) => {
          console.error("snapshot error", error);
        });
      } catch (error) {
        if (cancelled) return;
        console.error("Dashboard bootstrap failed:", error);
        if (!cachedDashboard) {
          setLoading(false);
          setBootstrapError(
            error instanceof DashboardBootstrapError ? error.code : "unknown",
          );
        }
      }
    };

    void initializeDashboard();
    return () => {
      cancelled = true;
    };
  }, [bootstrapAttempt, user?.id]);

  useEffect(() => {
    if (!user?.id || loading) return;

    dashboardMemoryCache = {
      userId: user.id,
      cachedAt: Date.now(),
      assessmentRevision: getAssessmentStatusRevision(user.id),
      currentMonthIso: currentMonth.toISOString(),
      events,
      setupMode,
      waitingForCoach,
      teamProgramStart,
      programMode,
      competitionDate,
      competitionName,
      analysis,
      preTestsDone,
      postTestsDone,
      postTestDue,
      midTestDue,
      midTestsDone,
      todayCheckinDone,
      todayJournalDone,
      checkinStatusLoading,
      programStartDate,
      baselineDone,
      retestDone,
      flameStats,
      missedDayReviews,
      effectiveTodayIso: effectiveToday.toISOString(),
    };
  }, [
    user?.id,
    loading,
    currentMonth,
    events,
    setupMode,
    waitingForCoach,
    teamProgramStart,
    programMode,
    competitionDate,
    competitionName,
    analysis,
    preTestsDone,
    postTestsDone,
    postTestDue,
    midTestDue,
    midTestsDone,
    todayCheckinDone,
    todayJournalDone,
    checkinStatusLoading,
    programStartDate,
    baselineDone,
    retestDone,
    flameStats,
    missedDayReviews,
    effectiveToday,
  ]);

  useEffect(() => {
    if (!user?.id || !flameStats) return;
    setAthleteProgressCache(user.id, flameStats, {
      referenceDateIso: resolveProgressReferenceDateIso(programStartDate, effectiveToday),
      measurementStatus: {
        preDone: preTestsDone,
        midDue: midTestDue,
        midDone: midTestsDone,
        postDue: postTestDue,
        postDone: postTestsDone,
        programDay: flameStats.programDay,
      },
    });
  }, [
    user?.id,
    flameStats,
    effectiveToday,
    programStartDate,
    preTestsDone,
    midTestDue,
    midTestsDone,
    postTestDue,
    postTestsDone,
  ]);

  const loadDashboardSetup = async (
    referenceDate: Date,
    signal: AbortSignal,
  ): Promise<DashboardSetupResult> => {
    const modeInfo = await getProgramModeInfo(user!.id, signal);
    const { data: settingsArr, error: settingsError } = await supabase
      .from("program_settings")
      .select("*")
      .eq("user_id", user!.id)
      .retry(false)
      .abortSignal(signal);
    if (settingsError) throw settingsError;
    const settingsData = settingsArr && settingsArr.length > 0 ? settingsArr[0] : null;

    // Team-Athleten: Coach besitzt den Kalender. Kein Solo-Setup, keine eigenen Events nötig.
    if (modeInfo.mode === "team") {
      if (!modeInfo.teamStartDate) {
        return {
          state: "waiting",
          events: [],
          mode: "team",
          teamProgramStart: null,
          programStartDate: null,
          competitionDate: settingsData?.competition_date || "",
          competitionName: settingsData?.competition_name || "",
        };
      }

      const today = format(referenceDate, "yyyy-MM-dd");
      if (modeInfo.teamStartDate > today) {
        return {
          state: "waiting",
          events: [],
          mode: "team",
          teamProgramStart: modeInfo.teamStartDate,
          programStartDate: modeInfo.teamStartDate,
          competitionDate: settingsData?.competition_date || "",
          competitionName: settingsData?.competition_name || "",
        };
      }

      let teamEvents: CalendarEvent[] = [];
      if (modeInfo.teamId) {
        const { data, error: teamEventsError } = await supabase
          .from("team_calendar_events")
          .select("id,date,event_type,title,training_local_hour,training_local_minute,training_timezone")
          .eq("team_id", modeInfo.teamId)
          .order("date", { ascending: true })
          .retry(false)
          .abortSignal(signal);
        if (teamEventsError) throw teamEventsError;
        teamEvents = (data ?? []).map((event) => ({
            id: event.id,
            date: event.date,
            event_type: event.event_type as EventType,
            title: event.title,
            notes: null,
            training_local_hour: event.training_local_hour,
            training_local_minute: event.training_local_minute,
            training_timezone: event.training_timezone,
          }));
      }

      return {
        state: "ready",
        events: teamEvents,
        mode: "team",
        teamProgramStart: modeInfo.teamStartDate,
        programStartDate: modeInfo.teamStartDate,
        competitionDate: settingsData?.competition_date || "",
        competitionName: settingsData?.competition_name || "",
      };
    }

    // Solo-Mode
    const { data: eventData, error: eventsError } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("user_id", user!.id)
      .retry(false)
      .abortSignal(signal);
    if (eventsError) throw eventsError;

    if (eventData && eventData.length > 0) {
      return {
        state: "ready",
        events: eventData as CalendarEvent[],
        mode: "solo",
        teamProgramStart: null,
        programStartDate: settingsData?.program_start || null,
        competitionDate: settingsData?.competition_date || "",
        competitionName: settingsData?.competition_name || "",
      };
    }

    return {
      state: "setup",
      events: [],
      mode: "solo",
      teamProgramStart: null,
      programStartDate: settingsData?.program_start || null,
      competitionDate: settingsData?.competition_date || "",
      competitionName: settingsData?.competition_name || "",
    };
  };

  const handleSetupComplete = (newEvents: CalendarEvent[]) => {
    setEvents(newEvents);
    setSetupMode(false);
    navigate("/assessment?mode=pre");
  };


  const loadFlameStats = async (referenceDate = effectiveToday) => {
    if (!user?.id) return;
    try {
      const instance = await getOrCreateActiveInstance(user.id);
      const instanceId = instance?.id ?? null;

      let completionsQ = supabase
        .from("user_day_completion")
        .select("day_number, completed_at, completion_status, task_completion, program_instance_id")
        .eq("user_id", user.id);
      if (instanceId) completionsQ = completionsQ.eq("program_instance_id", instanceId);

      let snapshotQ = supabase
        .from("program_progress_snapshots")
        .select("current_streak, longest_streak, days_available, days_completed, program_day, tasks_completed_count, program_instance_id, date")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(1);
      if (instanceId) snapshotQ = snapshotQ.eq("program_instance_id", instanceId);

      const [{ data: completions }, { data: snapshots }] = await Promise.all([
        completionsQ,
        snapshotQ,
      ]);

      const snapshot = snapshots && snapshots.length > 0 ? snapshots[0] : null;
      const effectiveStart = await getEffectiveProgramStart(user.id);
      const dayInfo = getCurrentProgramDay(effectiveStart.startDate, referenceDate);
      const daysAvailable = dayInfo?.dayNumber ?? snapshot?.days_available ?? 0;
      const stats = buildFlameStats({
        completions: (completions ?? []) as FlameCompletionRow[],
        snapshot: snapshot
          ? {
              current_streak: snapshot.current_streak,
              longest_streak: snapshot.longest_streak,
              days_available: snapshot.days_available,
              days_completed: snapshot.days_completed,
              program_day: snapshot.program_day,
            }
          : null,
        today: referenceDate,
      });
      const nextStats: FlameStats = {
        ...stats,
        daysAvailable,
        programDay: dayInfo?.dayNumber ?? stats.programDay,
        completionRate: daysAvailable > 0 ? Math.min(1, stats.totalCompletedDays / daysAvailable) : stats.completionRate,
        missedDaysCount: Math.max(0, daysAvailable - stats.totalCompletedDays),
      };
      setFlameStats(nextStats);
      setAthleteProgressCache(user.id, nextStats, {
        activeApplications: Math.max(
          countActiveApplications((completions ?? []) as FlameCompletionRow[]),
          snapshot?.tasks_completed_count ?? 0,
        ),
        referenceDateIso: resolveProgressReferenceDateIso(effectiveStart.startDate, referenceDate),
      });
    } catch (e) {
      console.error("loadFlameStats error", e);
    }
  };

  const checkAssessments = async (referenceDate = effectiveToday) => {
    const [{ data: settingsArr }, effectiveStart, assessmentStatus] = await Promise.all([
      supabase
        .from("program_settings")
        .select("program_start")
        .eq("user_id", user!.id),
      getEffectiveProgramStart(user!.id),
      getAssessmentCompletionStatus(user!.id, referenceDate),
    ]);
    const settings = settingsArr && settingsArr.length > 0 ? settingsArr[0] : null;
    const startDate = effectiveStart.startDate ?? settings?.program_start ?? null;

    if (startDate) {
      setProgramStartDate(startDate);
      setPreTestsDone(assessmentStatus.preDone);
      setMidTestDue(assessmentStatus.midDue);
      setMidTestsDone(assessmentStatus.midDone);
      setPostTestDue(assessmentStatus.postDue);
      setPostTestsDone(assessmentStatus.postDone);

      // Idempotenter Adherence-Snapshot für heute
      await upsertTodaySnapshot(user!.id).catch((e) => console.error("snapshot error", e));
      await loadFlameStats(referenceDate);
    } else {
      setProgramStartDate(null);
      setPostTestDue(false);
      setMidTestDue(false);
    }
  };

  const checkTodayCheckin = async (referenceDate = effectiveToday) => {
    setCheckinStatusLoading(true);
    const today = format(referenceDate, "yyyy-MM-dd");
    const instance = await getOrCreateActiveInstance(user!.id);
    const instanceId = instance?.id ?? null;

    let checkinQuery = supabase
      .from("daily_checkins")
      .select("id")
      .eq("date", today)
      .eq("user_id", user!.id)
      .limit(1);
    checkinQuery = instanceId
      ? checkinQuery.eq("program_instance_id", instanceId)
      : checkinQuery.is("program_instance_id", null);

    let journalQuery = supabase
      .from("daily_journals")
      .select("id")
      .eq("date", today)
      .eq("user_id", user!.id)
      .limit(1);
    journalQuery = instanceId
      ? journalQuery.eq("program_instance_id", instanceId)
      : journalQuery.is("program_instance_id", null);

    const [{ data: checkins, error: checkinError }, { data: journals, error: journalError }] = await Promise.all([
      checkinQuery,
      journalQuery,
    ]);
    if (checkinError || journalError) {
      console.error("Daily status error:", checkinError ?? journalError);
      setTodayCheckinDone(false);
      setTodayJournalDone(false);
    } else {
      setTodayCheckinDone((checkins?.length || 0) > 0);
      setTodayJournalDone((journals?.length || 0) > 0);
    }
    setCheckinStatusLoading(false);
  };

  const checkDeepProfile = async () => {
    if (!user?.id) return;
    const { getOrCreateActiveInstance } = await import("@/lib/programInstance");
    const instance = await getOrCreateActiveInstance(user.id);
    let q = supabase.from("deep_profile_assessments").select("timing").eq("user_id", user.id);
    if (instance?.id) q = q.eq("program_instance_id", instance.id);
    const { data } = await q;
    const timings = new Set((data || []).map((assessment) => assessment.timing));
    setBaselineDone(timings.has("pre") || timings.has("baseline"));
    setRetestDone(timings.has("post") || timings.has("retest"));
  };

  const resolveEventTypeForProgramDate = (dateStr: string): EventType => {
    const explicitEvent = events.find((event) => event.date === dateStr);
    return explicitEvent?.event_type ?? "training";
  };

  const loadMissedDayReviews = async (referenceDate = effectiveToday) => {
    if (!user?.id) return;

    try {
      const [effectiveStart, instance] = await Promise.all([
        getEffectiveProgramStart(user.id),
        getOrCreateActiveInstance(user.id),
      ]);
      const startDate = effectiveStart.startDate;
      const dayInfo = getCurrentProgramDay(startDate, referenceDate);

      if (!startDate || !dayInfo || dayInfo.dayNumber <= 1) {
        setMissedDayReviews([]);
        return;
      }

      const instanceId = instance?.id ?? null;
      let completedQuery = supabase
        .from("user_day_completion")
        .select("day_number")
        .eq("user_id", user.id)
        .eq("completion_status", "completed");
      completedQuery = instanceId
        ? completedQuery.eq("program_instance_id", instanceId)
        : completedQuery.is("program_instance_id", null);

      const { data: completedRows, error } = await completedQuery;
      if (error) {
        console.error("missed day review load error", error);
        setMissedDayReviews([]);
        return;
      }

      const completedDays = new Set((completedRows ?? [])
        .map((row) => row.day_number)
        .filter((value): value is number => typeof value === "number"));
      const acknowledged = readAcknowledgedMissedReviews(user.id, instanceId);
      const start = new Date(`${startDate}T00:00:00`);

      const reviews: MissedDayReview[] = [];
      for (const dayNumber of getRecentMissedDayReviewWindow(dayInfo.dayNumber)) {
        if (completedDays.has(dayNumber)) continue;

        const dayDate = addDays(start, dayNumber - 1);
        const dateStr = format(dayDate, "yyyy-MM-dd");
        const key = `${dateStr}:${dayNumber}`;
        if (acknowledged.has(key)) continue;

        const eventType = resolveEventTypeForProgramDate(dateStr);
        const resolved = resolveDay(dayNumber, dayDate, eventType);
        if (!resolved) continue;

        reviews.push({
          key,
          dayNumber,
          date: dateStr,
          eventType,
          lens: resolved.content.title ?? resolved.content.lens ?? resolved.matrix.lens,
          scienceFact: resolved.content.scienceBite.fact,
          coreShift: resolved.content.coreShift,
          tasks: resolved.content.tasks.map((task) => task.title),
        });
      }

      setMissedDayReviews(reviews);
    } catch (e) {
      console.error("loadMissedDayReviews error", e);
      setMissedDayReviews([]);
    }
  };

  const acknowledgeMissedDay = async (review: MissedDayReview) => {
    if (!user?.id) return;
    const instance = await getOrCreateActiveInstance(user.id);
    const instanceId = instance?.id ?? null;
    const acknowledged = readAcknowledgedMissedReviews(user.id, instanceId);
    acknowledged.add(review.key);
    writeAcknowledgedMissedReviews(user.id, instanceId, acknowledged);
    // Keep the in-memory route cache in sync before React unmounts the
    // dashboard. Otherwise a quick trip to settings can restore the stale
    // review card even though its durable acknowledgement is already stored.
    removeMissedReviewFromDashboardCache(user.id, review.key);
    setMissedDayReviews((prev) => removeMissedReviewByKey(prev, review.key));
  };

  const refreshDashboardStatus = async (referenceDate = effectiveToday) => {
    lastStatusRefreshAt.current = Date.now();
    await Promise.all([checkAssessments(referenceDate), checkTodayCheckin(referenceDate), checkDeepProfile()]);
    await loadMissedDayReviews(referenceDate);
  };

  // Re-check assessments when navigating back to dashboard
  useEffect(() => {
    const handleFocus = () => {
      if (Date.now() - lastStatusRefreshAt.current < 60_000) return;
      if (!setupMode && !loading) refreshDashboardStatus();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [setupMode, loading, user?.id, effectiveToday]);

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
          program_start: format(effectiveToday, "yyyy-MM-dd"),
        });
      }
      toast.success("Wettkampfziel gespeichert.");
    } catch (err: unknown) {
      console.error("Update error:", err);
      toast.error(`Fehler: ${err instanceof Error ? err.message : "Unbekannter Fehler"}`);
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

  const parseCalendarDate = (date: string) => new Date(`${date}T00:00:00`);

  const formatEventTime = (event: CalendarEvent) => {
    if (event.event_type === "rest" || typeof event.training_local_hour !== "number") return null;
    const minute = event.training_local_minute ?? 0;
    return `${String(event.training_local_hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  };

  const formatEventLabel = (event: CalendarEvent) => {
    const time = formatEventTime(event);
    return time ? `${eventConfig[event.event_type].label} · ${time}` : eventConfig[event.event_type].label;
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

  const todayEvents = getEventsForDate(effectiveToday);
  // Team-Athleten ohne eigenes Kalender-Event laufen im Standard-Trainingstag.
  // Es werden keine Fake-calendar_events in die DB geschrieben.
  const isTeamActive =
    programMode === "team" &&
    !!teamProgramStart &&
    teamProgramStart <= format(effectiveToday, "yyyy-MM-dd");
  const todayEventType: EventType | null =
    todayEvents.length > 0
      ? (todayEvents[0].event_type as EventType)
      : isTeamActive
        ? "training"
        : null;
  const primaryTodayEvent = todayEvents[0] ?? null;
  const todayPreTrainingExpired = isPreTrainingExpired(primaryTodayEvent, effectiveToday, preTrainingClock);

  useEffect(() => {
    if (typeof primaryTodayEvent?.training_local_hour !== "number") return;
    const interval = window.setInterval(() => setPreTrainingClock(new Date()), 30_000);
    return () => window.clearInterval(interval);
  }, [primaryTodayEvent?.date, primaryTodayEvent?.training_local_hour, primaryTodayEvent?.training_local_minute]);

  useEffect(() => {
    if (!user?.id || !todayEventType || todayEventType === "rest") {
      setTodayPreTrainingDone(false);
      setPreTrainingStatusLoading(false);
      return;
    }

    let cancelled = false;
    setPreTrainingStatusLoading(true);
    void loadPreTrainingCompletion(user.id, format(effectiveToday, "yyyy-MM-dd"))
      .then((done) => {
        if (!cancelled) setTodayPreTrainingDone(done);
      })
      .catch((error) => {
        console.error("pre-training status error", error);
        if (!cancelled) setTodayPreTrainingDone(false);
      })
      .finally(() => {
        if (!cancelled) setPreTrainingStatusLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [effectiveToday, todayEventType, user?.id]);
  const isTeamDefaultDay = isTeamActive && todayEvents.length === 0;
  const showPreTestReminder =
    !preTestsDone &&
    !setupMode &&
    !!programStartDate &&
    differenceInDays(effectiveToday, new Date(programStartDate)) < 56;
  const availableMeasurementMode = !preTestsDone
    ? "pre"
    : midTestDue && !midTestsDone
      ? "mid"
      : postTestDue && !postTestsDone
        ? "post"
        : null;
  const effectiveProgramStartDate = teamProgramStart ?? programStartDate;
  const programDayInfo = getCurrentProgramDay(effectiveProgramStartDate, effectiveToday);
  const currentProgramDay = programDayInfo?.dayNumber ?? null;
  const todayResolved =
    currentProgramDay && todayEventType
      ? resolveDay(currentProgramDay, effectiveToday, todayEventType)
      : null;
  const currentPhase = currentProgramDay
    ? currentProgramDay <= 14
      ? 1
      : currentProgramDay <= 28
        ? 2
        : currentProgramDay <= 42
          ? 3
          : 4
    : null;
  const programProgress = currentProgramDay ? (currentProgramDay / 56) * 100 : 0;
  const showDeepProfileBaselineBanner =
    !baselineDone &&
    !setupMode &&
    currentProgramDay !== null &&
    currentProgramDay >= DEEP_PROFILE_BASELINE_AVAILABLE_FROM_DAY;

  const nextTeamEvent = programMode === "team"
    ? [...events]
        .filter((event) => !isBefore(parseCalendarDate(event.date), startOfDay(effectiveToday)))
        .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null
    : null;
  const nextTeamEventSummary = nextTeamEvent
    ? `Nächster Termin: ${eventConfig[nextTeamEvent.event_type].label} · ${format(parseCalendarDate(nextTeamEvent.date), "EEE, d. MMMM", { locale: de })}${formatEventTime(nextTeamEvent) ? ` · ${formatEventTime(nextTeamEvent)}` : ""}`
    : "Noch kein Coach-Termin geplant. Nicht geplante Tage laufen als Standard-Training.";
  const planSelectedDate = selectedDate ?? effectiveToday;
  const planWeekStart = startOfWeek(planSelectedDate, { weekStartsOn: 1 });
  const planWeekDays = eachDayOfInterval({
    start: planWeekStart,
    end: endOfWeek(planSelectedDate, { weekStartsOn: 1 }),
  });
  const selectedPlanEvents = getEventsForDate(planSelectedDate);
  const selectedPlanDateIso = format(planSelectedDate, "yyyy-MM-dd");
  const selectedProgramDay = effectiveProgramStartDate
    ? differenceInDays(startOfDay(planSelectedDate), startOfDay(new Date(`${effectiveProgramStartDate}T00:00:00`))) + 1
    : null;
  const selectedDateHasProgram = selectedProgramDay !== null && selectedProgramDay >= 1 && selectedProgramDay <= 56;
  const selectedIsToday = isSameDay(planSelectedDate, effectiveToday);
  const selectedPrimaryEventType: EventType | null = selectedPlanEvents[0]?.event_type
    ?? (programMode === "team" && selectedDateHasProgram ? "training" : null);
  const upcomingPlanEvents = [...events]
    .filter((event) => event.date > selectedPlanDateIso)
    .sort((a, b) => {
      const dateComparison = a.date.localeCompare(b.date);
      if (dateComparison !== 0) return dateComparison;
      return (formatEventTime(a) ?? "").localeCompare(formatEventTime(b) ?? "");
    })
    .slice(0, 3);
  const dailyCompletionCount = Number(todayCheckinDone) + Number(todayJournalDone);

  useEffect(() => {
    if (!pendingRestVisualization || loading || checkinStatusLoading) return;
    const currentDate = format(effectiveToday, "yyyy-MM-dd");
    if (canOpenRestVisualization({
      intent: pendingRestVisualization,
      currentDate,
      eventType: todayEventType,
      checkinCompleted: todayCheckinDone,
    })) {
      setDashboardSection("today");
      setCheckinInitialFocus("rest-visualization");
      setShowCheckin(true);
    } else if (todayCheckinDone && pendingRestVisualization.scheduledDate === currentDate) {
      toast.success("Deine Visualisierung ist für heute bereits abgeschlossen.");
    } else {
      toast.error("Diese Visualisierung gehört nicht zu deinem heutigen Ruhetag.");
    }
    setPendingRestVisualization(null);
  }, [
    checkinStatusLoading,
    effectiveToday,
    loading,
    pendingRestVisualization,
    todayCheckinDone,
    todayEventType,
  ]);

  const openPlan = () => {
    setDashboardSection("plan");
    setSelectedDate((current) => current ?? effectiveToday);
    setCurrentMonth((current) => isSameMonth(current, effectiveToday) ? current : effectiveToday);
    navigate("/dashboard#dashboard-plan", { replace: true });
    window.requestAnimationFrame(() => {
      document.getElementById("dashboard-plan")?.scrollIntoView({ block: "start" });
    });
  };

  if (loading) {
    return <AthleteRouteLoadingShell active="today" label="Lade deinen heutigen Flow..." />;
  }

  if (bootstrapError) {
    return (
      <AccessStatusScreen
        title="Dashboard konnte nicht geladen werden"
        message="Die Verbindung steht, aber deine Programmdaten konnten nicht vollständig geladen werden."
        onRetry={() => setBootstrapAttempt((attempt) => attempt + 1)}
      />
    );
  }

  if (waitingForCoach) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 px-6 py-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <BrandLockup symbolSize={26} textClassName="text-base" />
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
            Dein Fragebogen ist gespeichert.
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed mb-8">
            {teamProgramStart
              ? "Dein Coach hat das Teamprogramm gestartet. Morgen früh geht es los – dann erscheint hier dein täglicher Flow."
              : "Dein Coach hat das Teamprogramm noch nicht freigegeben. Sobald es startet, erscheint hier dein täglicher Flow."}
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
              onClick={() => navigate("/settings")}
              className="w-full p-4 rounded-2xl bg-gradient-card border-glow hover:shadow-glow transition-all flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-heading font-semibold">Einstellungen öffnen</p>
                  <p className="text-xs text-muted-foreground">Trainingszeiten, Erinnerungen und App-Infos</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={async () => { await signOut(); navigate("/"); }}
              className="w-full p-4 rounded-2xl border border-border/70 hover:bg-secondary/70 transition-all flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <LogOut className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-heading font-semibold">Abmelden</p>
                  <p className="text-xs text-muted-foreground">Zur Startseite zurückkehren</p>
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
        date={effectiveToday}
        initialFocus={checkinInitialFocus}
        onClose={async () => {
          setShowCheckin(false);
          setCheckinInitialFocus(undefined);
          await checkTodayCheckin();
          await upsertTodaySnapshot(user!.id).catch(() => {});
          await loadFlameStats();
        }}
      />
    );
  }

  return (
    <div className={athleteAppBackground}>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_-8%,rgba(46,173,137,0.10),transparent_34%),linear-gradient(180deg,#0B0C10_0%,#08090C_62%,#060709_100%)]" />
      <AthleteAppHeader
        actions={(
          <>
            {availableMeasurementMode && (
              <button
                type="button"
                onClick={() => navigate(`/assessment?mode=${availableMeasurementMode}`)}
                aria-label={availableMeasurementMode === "pre"
                  ? "Startmessung öffnen"
                  : availableMeasurementMode === "mid"
                    ? "Zwischenmessung öffnen"
                    : "Abschlussmessung öffnen"}
                className="flex h-11 w-11 items-center justify-center rounded-full text-white/48 hover:bg-white/[0.055] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <ClipboardCheck className="h-[18px] w-[18px]" />
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate("/settings")}
              aria-label="Einstellungen und Hilfe"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.075] bg-white/[0.035] text-white/58 hover:bg-white/[0.065] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Settings className="h-[18px] w-[18px]" />
            </button>
          </>
        )}
      />

      <div className={athleteAppViewport}>
        {dashboardSection === "today" && (
          <>
        <section className="mb-7">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/48">
            {format(effectiveToday, "EEEE, d. MMMM", { locale: de })}
          </p>
          <div className="mt-2 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-[30px] font-semibold leading-none tracking-[-0.045em]">
                {getAthleteGreeting(user?.user_metadata?.full_name)}
              </h1>
              <p className="mt-3 text-sm text-white/58">
                {programMode === "team" ? "Coach-Plan und deine Praxis sind verbunden." : "Dein System ist bereit."}
              </p>
            </div>
            <DailyCompletionRing completed={dailyCompletionCount} />
          </div>
        </section>

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

        {/* Mid measurement banner (day 28) */}
        {midTestDue && !midTestsDone && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-5 rounded-2xl bg-primary/10 border border-primary/30">
            <div className="flex items-start gap-3">
              <ClipboardCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-heading font-semibold text-sm mb-1">Zeit für deine Zwischenmessung.</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Du hast Halbzeit erreicht. Wiederhole die Fragebögen, um beobachtete Veränderungen zu dokumentieren.
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate("/assessment?mode=mid")}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-heading font-semibold text-sm hover:shadow-glow transition-all"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  Zwischenmessung starten
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Post measurement banner */}
        {postTestDue && !postTestsDone && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-5 rounded-2xl bg-yellow-400/10 border border-yellow-400/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-heading font-semibold text-sm mb-1">Zeit für deine Abschlussmessung.</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Dein 8-Wochen-Programm ist abgeschlossen. Wiederhole jetzt die Fragebögen, um die beobachtete Veränderung zu dokumentieren.
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate("/assessment?mode=post")}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-yellow-400 text-background font-heading font-semibold text-sm hover:bg-yellow-300 transition-colors"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  Abschlussmessung starten
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Pre measurement reminder */}
        {showPreTestReminder && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-5 sm:mb-6 p-4 sm:p-5 rounded-2xl bg-primary/10 border border-primary/30">
            <div className="flex items-start gap-3 min-w-0">
              <ClipboardCheck className="w-5 h-5 text-primary shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-heading font-semibold text-sm mb-1">Startmessung ausstehend</h3>
                <p className="text-xs text-muted-foreground mb-4 sm:mb-3 leading-relaxed">
                  Bitte fülle die wissenschaftlichen Fragebögen aus, um deinen Ausgangspunkt zu dokumentieren.
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate("/assessment?mode=pre")}
                  className="flex w-full sm:w-auto items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-heading font-semibold text-sm hover:shadow-glow transition-all"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  Startmessung beginnen
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Daily Focus & Program Progress */}
        {currentProgramDay && currentPhase && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative mb-7 overflow-hidden rounded-[28px] border border-white/[0.075] bg-[linear-gradient(145deg,rgba(29,32,37,0.95),rgba(15,17,21,0.97))] p-5 shadow-[0_28px_70px_-42px_rgba(0,0,0,1),inset_0_1px_0_rgba(255,255,255,0.055)]"
          >
            <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-primary/[0.085] blur-3xl" />
            <div className="relative flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                    Tag {currentProgramDay}
                  </span>
                  <span className="h-1 w-1 rounded-full bg-white/25" />
                  <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/48">
                    {phaseShortNames[currentPhase]}
                  </span>
                  {todayEventType && (
                    <>
                      <span className="h-1 w-1 rounded-full bg-white/25" />
                      <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/48">
                        {eventConfig[todayEventType].label}
                      </span>
                    </>
                  )}
                </div>
                <h2 className="mt-4 break-words text-[clamp(1.45rem,6vw,1.9rem)] font-semibold leading-[1.08] tracking-[-0.04em] [overflow-wrap:anywhere]">
                  {todayResolved?.content.title
                    ?? todayResolved?.content.lens
                    ?? todayResolved?.matrix.lens
                    ?? `Woche ${Math.ceil(currentProgramDay / 7)} von 8`}
                </h2>
              </div>
              <ProgramDayRing day={currentProgramDay} />
            </div>

            {todayResolved && (
              <p className="relative mt-5 line-clamp-3 max-w-[390px] text-[13px] leading-5 text-white/58">
                {todayResolved.context.focus}
              </p>
            )}

            {todayEventType && checkinStatusLoading ? (
              <div className="relative mt-6 flex min-h-16 items-center justify-center rounded-2xl border border-white/[0.065] bg-white/[0.035]">
                <Loader2 className="h-5 w-5 animate-spin text-primary" aria-label="Check-in-Status wird geladen" />
              </div>
            ) : todayEventType && !todayCheckinDone ? (
              <motion.button
                data-testid="daily-checkin-start"
                type="button"
                whileTap={{ scale: 0.985 }}
                onClick={() => setShowCheckin(true)}
                className="relative mt-6 flex min-h-[64px] w-full items-center justify-between rounded-2xl bg-primary px-4 py-3.5 text-left text-[#08110E] shadow-[0_14px_35px_-18px_rgba(46,173,137,0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/10">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">Daily Flow starten</span>
                    <span className="mt-0.5 block text-xs text-black/65">
                      {todayResolved
                        ? todayEventType === "rest"
                          ? "10 Tages-Puls-Fragen · Visualisierung"
                          : "10 Tages-Puls-Fragen · eine Mission"
                        : "Tages-Puls, Mission und Verständnis-Check"}
                    </span>
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-black/60" />
              </motion.button>
            ) : todayEventType ? (
              <div className="relative mt-6 flex min-h-[64px] items-center gap-3 rounded-2xl border border-primary/25 bg-primary/[0.09] px-4 py-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15">
                  <Check className="h-4 w-4 text-primary" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-primary">Daily Flow abgeschlossen</span>
                  <span className="mt-0.5 block text-xs text-white/52">Dein Check-in ist gespeichert.</span>
                </span>
              </div>
            ) : (
              <div className="relative mt-6 rounded-2xl border border-white/[0.065] bg-white/[0.035] px-4 py-4 text-sm text-white/58">
                Heute ist kein Eintrag geplant.
              </div>
            )}

            <div className="relative mt-5 h-1 overflow-hidden rounded-full bg-white/[0.055]">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${programProgress}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </motion.section>
        )}

        {/* Deep Profile Baseline Banner */}
        {showDeepProfileBaselineBanner && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-5 rounded-2xl bg-primary/10 border border-primary/30">
            <div className="flex items-start gap-3">
              <Microscope className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-heading font-semibold text-sm mb-1">Deep-Dive Baseline erstellen</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Dokumentiere deinen Ausgangspunkt. Nach 8 Wochen kannst du dieselben Fragen erneut beantworten.
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

        {/* Deep profile retest banner */}
        {baselineDone && !retestDone && postTestDue && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-5 rounded-2xl bg-yellow-400/10 border border-yellow-400/30">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-heading font-semibold text-sm mb-1">Deep-Dive erneut verfügbar.</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Dein 8-Wochen-Programm ist abgeschlossen. Beantworte dieselben Fragen erneut; die Antworten werden als zweiter Messpunkt gespeichert.
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate("/deep-profile?timing=retest")}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-yellow-400 text-background font-heading font-semibold text-sm hover:bg-yellow-300 transition-colors"
                >
                  <TrendingUp className="w-4 h-4" />
                  Deep-Dive starten
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {missedDayReviews.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 rounded-2xl bg-gradient-card border-glow p-5 sm:p-6"
          >
            <div className="flex items-start gap-4 mb-5">
              <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-heading font-semibold">
                  {missedDayReviews.length === 1 ? "Verpasster Programmtag" : `${missedDayReviews.length} verpasste Programmtage`}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Heute bleibt im Fokus. Diese Kurzreview gibt dir nur den wichtigsten Kontext, damit du wieder sauber anschließt.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {missedDayReviews.map((review) => (
                <div key={review.key} className="rounded-xl border border-border/60 bg-background/45 p-4">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="text-xs font-heading font-semibold text-primary">Tag {review.dayNumber}</span>
                    <span className="text-xs text-muted-foreground">{format(new Date(`${review.date}T00:00:00`), "EEE, d. MMM", { locale: de })}</span>
                    <span className="text-xs text-muted-foreground">· {eventConfig[review.eventType].label}</span>
                  </div>
                  <h3 className="font-heading font-semibold text-sm mb-2">{review.lens}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">{review.scienceFact}</p>
                  <div className="rounded-lg bg-secondary/40 p-3 mb-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Worum es ging</p>
                    <p className="text-sm leading-relaxed">{review.coreShift}</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-muted-foreground">
                      Kurzaufgabe: {review.tasks.slice(0, 2).join(" · ")}
                    </p>
                    <button
                      onClick={() => acknowledgeMissedDay(review)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary/10 px-4 py-2 text-sm font-heading font-semibold text-primary transition-colors hover:bg-primary/20"
                    >
                      Verstanden <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Today's Check-in CTA */}
        {!currentProgramDay && (todayEventType && checkinStatusLoading ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 p-6 rounded-2xl bg-secondary/30 border border-border/50 text-center">
            <p className="text-muted-foreground text-sm">Check-in Status wird geladen...</p>
          </motion.div>
        ) : todayEventType && !todayCheckinDone ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <button
              data-testid="daily-checkin-start"
              onClick={() => setShowCheckin(true)}
              className="w-full p-6 rounded-2xl bg-gradient-card border-glow hover:shadow-glow transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${eventConfig[todayEventType as EventType].bg} flex items-center justify-center`}>
                    {(() => { const Icon = eventConfig[todayEventType as EventType].icon; return <Icon className={`w-6 h-6 ${eventConfig[todayEventType as EventType].color}`} />; })()}
                  </div>
                  <div className="text-left">
                    <p className="font-heading font-semibold">Heute: {eventConfig[todayEventType as EventType].label}</p>
                    <p className="text-sm text-muted-foreground">
                      {isTeamDefaultDay ? "Teammodus · Standardtag · " : ""}Tägliches Check-in starten →
                    </p>
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
        ))}

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
          aria-labelledby="dashboard-day-title"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 id="dashboard-day-title" className="text-[12px] font-semibold uppercase tracking-[0.15em] text-white/52">
              Dein Tag
            </h2>
            <button
              type="button"
              onClick={openPlan}
              className="-mr-2 flex min-h-11 items-center gap-1 px-2 text-[11px] font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Plan öffnen
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="overflow-hidden rounded-[22px] border border-white/[0.065] bg-white/[0.025]">
            {(todayEventType === "rest" || (!preTrainingStatusLoading && !todayPreTrainingDone && !todayPreTrainingExpired)) && (
              <DashboardActionRow
                icon={todayEventType ? eventConfig[todayEventType].icon : Dumbbell}
                eyebrow={todayEventType === "competition" ? "Vor dem Wettkampf" : todayEventType === "rest" ? "Ruhetag" : "Vor dem Training"}
                title={todayEventType === "rest" ? "Visualisierung" : "Pre-Training"}
                detail={
                  todayEventType === "rest"
                    ? todayCheckinDone
                      ? "Deine Visualisierung für heute ist abgeschlossen."
                      : "Geführte Visualisierung · passend zum heutigen Werkzeug"
                    : todayEventType
                      ? todayResolved
                        ? `${eventConfig[todayEventType].label} · aktives Erinnern und dein Satz`
                        : `${eventConfig[todayEventType].label} · heutige Vorbereitung`
                      : "Sobald dein heutiger Termin feststeht."
                }
                disabled={!todayEventType || (todayEventType === "rest" && todayCheckinDone)}
                done={todayEventType === "rest" && todayCheckinDone}
                onClick={() => {
                  if (todayEventType === "rest") setShowCheckin(true);
                  else navigate("/pre-training");
                }}
              />
            )}
            <DashboardActionRow
              icon={BookOpen}
              eyebrow="Nach dem Tag"
              title={todayJournalDone ? "Tagesjournal erledigt" : "Tagesjournal"}
              detail={
                todayJournalDone
                  ? "Deine private Reflexion ist gespeichert."
                  : `${todayResolved?.content.journal.questions.length ?? 3} Tagesfragen · privat`
              }
              done={todayJournalDone}
              onClick={() => navigate("/journal")}
            />
            <DashboardActionRow
              icon={Calendar}
              eyebrow={programMode === "team" ? "Coach-Plan" : "Deine Planung"}
              title={programMode === "team" ? "Teamkalender" : "Wochenplan"}
              detail={programMode === "team" ? nextTeamEventSummary : "Training, Regeneration und Wettkämpfe"}
              onClick={openPlan}
              last
            />
          </div>
          <button
            type="button"
            onClick={() => navigate("/journal/history")}
            className="mt-3 flex min-h-11 w-full items-center justify-center rounded-xl text-sm font-medium text-white/48 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Frühere Journal-Einträge ansehen
          </button>
        </motion.section>

        {/* Science Bite */}
        <ScienceBite />
          </>
        )}

        {dashboardSection === "plan" && (
        <section id="dashboard-plan" className="scroll-mt-24 pt-2" aria-labelledby="dashboard-plan-title">
          <div className="mb-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              {currentProgramDay ? `Woche ${Math.ceil(currentProgramDay / 7)} von 8` : "Planübersicht"}
            </p>
            <h2 id="dashboard-plan-title" className="mt-3 text-[30px] font-semibold leading-none tracking-[-0.045em]">
              Dein Plan.
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/58">
              {programMode === "team"
                ? "Coach-Termine und deine mentale Praxis in einer gemeinsamen Linie."
                : "Training, Wettkampf und mentale Praxis in einer Linie."}
            </p>
          </div>

          {programMode === "team" && (
            <div className="mb-7 flex items-start gap-3 rounded-[18px] border border-primary/15 bg-primary/[0.045] p-3.5">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-xs leading-5 text-white/55">
                Dein Coach plant Termine. Deine privaten Antworten und Journaltexte bleiben außerhalb der Teamansicht.
              </p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const previousWeek = addDays(planSelectedDate, -7);
                setSelectedDate(previousWeek);
                setCurrentMonth(previousWeek);
              }}
              aria-label="Vorherige Woche"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/42 hover:bg-white/[0.045] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="grid min-w-0 flex-1 grid-cols-7 gap-1 sm:gap-2" aria-label="Wochenauswahl">
              {planWeekDays.map((day) => {
                const dayEvents = getEventsForDate(day);
                const primaryEvent = dayEvents[0] ?? null;
                const isSelected = isSameDay(day, planSelectedDate);
                const isCurrentDay = isSameDay(day, effectiveToday);
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => {
                      setSelectedDate(day);
                      setCurrentMonth(day);
                      setShowAddEvent(false);
                    }}
                    aria-label={format(day, "EEEE, d. MMMM", { locale: de })}
                    aria-pressed={isSelected}
                    className="flex min-h-[62px] min-w-0 flex-col items-center justify-center gap-1.5 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <span className="text-[9px] font-medium uppercase tracking-[0.1em] text-white/45 sm:text-[10px]">
                      {format(day, "EE", { locale: de })}
                    </span>
                    <span
                      className={`relative flex h-9 w-9 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors sm:h-10 sm:w-10 ${
                        isSelected
                          ? "border-primary bg-primary text-[#08110E]"
                          : isCurrentDay
                            ? "border-primary/35 bg-primary/[0.08] text-primary"
                            : primaryEvent?.event_type === "competition"
                              ? "border-yellow-300/25 bg-yellow-300/[0.06] text-yellow-200"
                              : primaryEvent?.event_type === "rest"
                                ? "border-blue-300/20 bg-blue-300/[0.05] text-blue-200/75"
                                : primaryEvent
                                  ? "border-primary/20 bg-primary/[0.055] text-white/72"
                                  : "border-white/[0.075] text-white/52"
                      }`}
                    >
                      {format(day, "d")}
                      {primaryEvent && !isSelected && (
                        <span className={`absolute -bottom-0.5 h-1.5 w-1.5 rounded-full ${
                          primaryEvent.event_type === "training" ? "bg-primary" : primaryEvent.event_type === "rest" ? "bg-blue-300" : "bg-yellow-300"
                        }`} />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => {
                const nextWeek = addDays(planSelectedDate, 7);
                setSelectedDate(nextWeek);
                setCurrentMonth(nextWeek);
              }}
              aria-label="Nächste Woche"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/42 hover:bg-white/[0.045] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-9 grid gap-8 md:grid-cols-[minmax(0,1.08fr)_minmax(270px,0.92fr)] md:gap-10">
            <section aria-labelledby="selected-plan-day">
              <div className="flex min-h-11 items-center justify-between gap-3">
                <h3 id="selected-plan-day" className="text-[12px] font-semibold uppercase tracking-[0.15em] text-white/52">
                  {format(planSelectedDate, "EEEE, d. MMMM", { locale: de })}
                </h3>
                {programMode === "solo" && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddEvent((current) => !current);
                      setNewEventType("training");
                    }}
                    className="flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-[11px] font-semibold text-primary hover:bg-primary/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Plus className="h-4 w-4" />
                    Termin
                  </button>
                )}
              </div>

              <div className="mt-4 border-l border-white/10 pl-5">
                {selectedIsToday && selectedDateHasProgram && selectedPrimaryEventType && (
                  <PlanTimelineRow
                    time="Heute"
                    icon={Brain}
                    title="Daily Flow"
                    detail={todayCheckinDone ? "Tages-Puls und Mission gespeichert" : "10 Tages-Puls-Fragen, eine Mission und Verständnis-Check"}
                    active={!todayCheckinDone}
                    done={todayCheckinDone}
                    onClick={() => setShowCheckin(true)}
                  />
                )}

                {selectedPlanEvents.map((event) => {
                  const config = eventConfig[event.event_type];
                  const isPrimaryTodayEvent = selectedIsToday && event.id === selectedPlanEvents[0]?.id;
                  const canOpenPreTraining = isPrimaryTodayEvent
                    && event.event_type !== "rest"
                    && !preTrainingStatusLoading
                    && !todayPreTrainingDone
                    && !todayPreTrainingExpired;
                  return (
                    <PlanTimelineRow
                      key={event.id}
                      time={formatEventTime(event) ?? (event.event_type === "rest" ? "Tag" : "Geplant")}
                      icon={canOpenPreTraining ? Headphones : config.icon}
                      title={canOpenPreTraining ? "Pre-Training" : event.title || config.label}
                      detail={canOpenPreTraining ? `${event.title || config.label} · deine heutige Vorbereitung` : formatEventLabel(event)}
                      active={canOpenPreTraining}
                      onClick={canOpenPreTraining ? () => navigate("/pre-training") : undefined}
                      onRemove={programMode === "solo" ? () => void removeEvent(event.id) : undefined}
                    />
                  );
                })}

                {selectedPlanEvents.length === 0 && selectedPrimaryEventType && (
                  <PlanTimelineRow
                    time={selectedIsToday ? "Vorher" : "Geplant"}
                    icon={selectedPrimaryEventType === "rest" ? Moon : Headphones}
                    title={selectedPrimaryEventType === "rest" ? "Ruhetag" : selectedIsToday ? "Pre-Training" : "Standard-Trainingstag"}
                    detail={
                      selectedIsToday
                        ? selectedPrimaryEventType === "rest"
                          ? "Für heute ist keine Vorbereitung vorgesehen."
                          : "Teammodus · heutige Vorbereitung"
                        : "Kein separater Coach-Termin eingetragen."
                    }
                    active={selectedIsToday && selectedPrimaryEventType !== "rest" && !preTrainingStatusLoading && !todayPreTrainingDone}
                    onClick={selectedIsToday && selectedPrimaryEventType !== "rest" && !preTrainingStatusLoading && !todayPreTrainingDone ? () => navigate("/pre-training") : undefined}
                  />
                )}

                {selectedIsToday && selectedDateHasProgram && (
                  <PlanTimelineRow
                    time="Später"
                    icon={BookOpen}
                    title="Tagesjournal"
                    detail={todayJournalDone ? "Private Reflexion gespeichert" : `${todayResolved?.content.journal.questions.length ?? 3} Tagesfragen · privat`}
                    done={todayJournalDone}
                    onClick={() => navigate("/journal")}
                    last
                  />
                )}

                {!selectedIsToday && selectedPlanEvents.length === 0 && !selectedPrimaryEventType && (
                  <div className="relative py-3">
                    <span className="absolute -left-[25px] top-5 h-2 w-2 rounded-full bg-white/20 ring-4 ring-[#0D0E12]" />
                    <p className="text-sm font-semibold text-white/62">Kein Termin geplant.</p>
                    <p className="mt-1 text-[11px] leading-4 text-white/45">
                      Für diesen Tag liegen keine realen Kalendereinträge vor.
                    </p>
                  </div>
                )}
              </div>

              <AnimatePresence>
                {programMode === "solo" && showAddEvent && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-6 space-y-4 rounded-[22px] border border-white/[0.065] bg-white/[0.025] p-4">
                      <div className="grid grid-cols-3 gap-2">
                        {(Object.entries(eventConfig) as [EventType, typeof eventConfig.training][]).map(([type, config]) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setNewEventType(type)}
                            className={`min-h-14 rounded-xl p-2 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                              newEventType === type ? `${config.bg} ${config.color}` : "bg-white/[0.035] text-white/55"
                            }`}
                          >
                            <config.icon className="mx-auto h-4 w-4" />
                            <span className="mt-1 block text-[10px] font-medium">{config.label}</span>
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        placeholder="Titel (optional)"
                        value={newEventTitle}
                        onChange={(event) => setNewEventTitle(event.target.value)}
                        className="min-h-12 w-full rounded-xl border border-white/[0.07] bg-white/[0.035] px-4 text-sm placeholder:text-white/32 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <div className="flex gap-2">
                        <button type="button" onClick={addEvent} className="min-h-12 flex-1 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">
                          Speichern
                        </button>
                        <button type="button" onClick={() => setShowAddEvent(false)} className="min-h-12 rounded-xl bg-white/[0.045] px-4 text-sm text-white/58">
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            <section aria-labelledby="upcoming-plan-events">
              <h3 id="upcoming-plan-events" className="flex min-h-11 items-center text-[12px] font-semibold uppercase tracking-[0.15em] text-white/52">
                Als Nächstes
              </h3>
              <div className="mt-4 overflow-hidden rounded-[22px] border border-white/[0.065] bg-white/[0.025]">
                {upcomingPlanEvents.length > 0 ? upcomingPlanEvents.map((event, index) => {
                  const config = eventConfig[event.event_type];
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => {
                        const date = parseCalendarDate(event.date);
                        setSelectedDate(date);
                        setCurrentMonth(date);
                      }}
                      className={`flex min-h-[78px] w-full items-center gap-3.5 px-4 py-4 text-left hover:bg-white/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${
                        index < upcomingPlanEvents.length - 1 ? "border-b border-white/[0.055]" : ""
                      }`}
                    >
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] ${config.bg}`}>
                        <config.icon className={`h-[18px] w-[18px] ${config.color}`} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-white/45">
                          {format(parseCalendarDate(event.date), "EEEE, d. MMMM", { locale: de })}
                        </span>
                        <span className="mt-1 block truncate text-sm font-semibold">{event.title || config.label}</span>
                        <span className="mt-1 block text-[11px] text-white/52">{formatEventLabel(event)}</span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-white/24" />
                    </button>
                  );
                }) : (
                  <div className="px-4 py-6">
                    <p className="text-sm font-semibold text-white/62">Noch nichts geplant.</p>
                    <p className="mt-1 text-[11px] leading-4 text-white/45">
                      {programMode === "team" ? "Sobald dein Coach einen Termin einträgt, erscheint er hier." : "Füge im Plan einen echten Termin hinzu."}
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>

          <section className="mt-9 border-t border-white/[0.06] pt-5" aria-labelledby="month-plan-title">
            <button
              type="button"
              onClick={() => setShowMonthCalendar((current) => !current)}
              aria-expanded={showMonthCalendar}
              className="flex min-h-12 w-full items-center justify-between rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span>
                <span id="month-plan-title" className="block text-sm font-semibold">Monatsübersicht</span>
                <span className="mt-1 block text-[11px] text-white/48">Alle realen Termine ansehen und Tage auswählen</span>
              </span>
              <ChevronRight className={`h-4 w-4 text-white/32 transition-transform ${showMonthCalendar ? "rotate-90" : ""}`} />
            </button>

            <AnimatePresence>
              {showMonthCalendar && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 rounded-[22px] border border-white/[0.065] bg-white/[0.025] p-4 sm:p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <button type="button" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} aria-label="Vorheriger Monat" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/[0.045]">
                        <ChevronLeft className="h-4 w-4 text-white/48" />
                      </button>
                      <p className="text-sm font-semibold">{format(currentMonth, "MMMM yyyy", { locale: de })}</p>
                      <button type="button" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} aria-label="Nächster Monat" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/[0.045]">
                        <ChevronRight className="h-4 w-4 text-white/48" />
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {weekDays.map((day) => (
                        <div key={day} className="py-2 text-center text-[10px] font-medium uppercase tracking-[0.1em] text-white/38">{day}</div>
                      ))}
                      {calendarDays.map((day) => {
                        const dayEvents = getEventsForDate(day);
                        const primaryEvent = dayEvents[0] ?? null;
                        const isSelected = isSameDay(day, planSelectedDate);
                        const inMonth = isSameMonth(day, currentMonth);
                        return (
                          <button
                            key={day.toISOString()}
                            type="button"
                            onClick={() => {
                              setSelectedDate(day);
                              setShowAddEvent(false);
                            }}
                            className={`relative flex min-h-11 items-center justify-center rounded-xl text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                              !inMonth ? "opacity-25" : ""
                            } ${isSelected ? "bg-primary text-[#08110E]" : isSameDay(day, effectiveToday) ? "bg-primary/[0.08] text-primary" : "hover:bg-white/[0.045]"}`}
                          >
                            {format(day, "d")}
                            {primaryEvent && !isSelected && (
                              <span className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${
                                primaryEvent.event_type === "training" ? "bg-primary" : primaryEvent.event_type === "rest" ? "bg-blue-300" : "bg-yellow-300"
                              }`} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </section>
        )}

        {/* Privacy notice for athletes in teams */}
        <div className="mt-6 bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-start gap-3">
          <Shield className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Deine Daten sind privat.</span>{" "}
            Dein Coach sieht nur, ob du aktiv am Programm teilnimmst – niemals deine persönlichen Antworten, Reflexionen oder Stimmungswerte.
          </p>
        </div>
      </div>
      <AthleteBottomNavigation
        active={dashboardSection}
        onPlan={openPlan}
      />
    </div>
  );
};

export default Dashboard;
