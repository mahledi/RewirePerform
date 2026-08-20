import { useEffect, useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { de } from "date-fns/locale";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Loader2,
  Moon,
  Trash2,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type EventType = "training" | "rest" | "competition";
type SaveState = "idle" | "saving" | "saved" | "error";
type LocalTime = { h: number; m: number };

type LocalEvent = {
  id?: string;
  date: string;
  event_type: EventType;
  title: string;
  training_local_hour: number | null;
  training_local_minute: number | null;
  training_timezone: string | null;
};

interface TeamTrainingScheduleProps {
  teamId: string;
  variant?: "embedded" | "full";
}

const eventConfig: Record<EventType, { label: string; icon: typeof Dumbbell; dot: string; bg: string; text: string }> = {
  training: { label: "Training", icon: Dumbbell, dot: "bg-primary", bg: "bg-primary/15", text: "text-primary" },
  rest: { label: "Ruhetag", icon: Moon, dot: "bg-blue-400", bg: "bg-blue-400/15", text: "text-blue-400" },
  competition: { label: "Wettkampf", icon: Trophy, dot: "bg-yellow-400", bg: "bg-yellow-400/15", text: "text-yellow-400" },
};

const TRAINING_TIMES = (() => {
  const out: LocalTime[] = [];
  for (let h = 6; h <= 22; h++) {
    out.push({ h, m: 0 });
    out.push({ h, m: 30 });
  }
  return out;
})();

const weekDays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

const formatHM = (h: number, m: number) =>
  `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

const parseTimeValue = (value: string): LocalTime => {
  const [h, m] = value.split(":").map(Number);
  return { h, m };
};

const defaultTitle = (eventType: EventType) => eventConfig[eventType].label;

const errorMessage = (err: unknown, fallback = "Speichern fehlgeschlagen") =>
  err instanceof Error
    ? err.message
    : typeof err === "object" && err !== null && "message" in err && typeof err.message === "string"
      ? err.message
      : fallback;

const TeamTrainingSchedule = ({ teamId, variant = "embedded" }: TeamTrainingScheduleProps) => {
  const { user } = useAuth();
  const isFull = variant === "full";
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedTool, setSelectedTool] = useState<EventType>("training");
  const [eventsByDate, setEventsByDate] = useState<Map<string, LocalEvent>>(() => new Map());
  const [persistedDates, setPersistedDates] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    [],
  );
  const selectedKey = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
  const selectedEvent = selectedKey ? eventsByDate.get(selectedKey) ?? null : null;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("team_calendar_events")
        .select("id,date,event_type,title,training_local_hour,training_local_minute,training_timezone")
        .eq("team_id", teamId)
        .order("date", { ascending: true });

      if (cancelled) return;
      if (error) {
        toast.error("Teamkalender konnte nicht geladen werden.");
      } else {
        const next = new Map<string, LocalEvent>();
        (data ?? []).forEach((row) => {
          const eventType = row.event_type as EventType;
          next.set(row.date, {
            id: row.id,
            date: row.date,
            event_type: eventType,
            title: row.title || defaultTitle(eventType),
            training_local_hour: row.training_local_hour,
            training_local_minute: row.training_local_minute,
            training_timezone: row.training_timezone,
          });
        });
        setEventsByDate(next);
        setPersistedDates(new Set(next.keys()));
      }
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  useEffect(() => {
    if (saveState !== "saved") return;
    const handle = window.setTimeout(() => setSaveState("idle"), 2500);
    return () => window.clearTimeout(handle);
  }, [saveState]);

  const upsertDay = (day: Date, eventType = selectedTool) => {
    const key = format(day, "yyyy-MM-dd");
    setSelectedDate(day);
    setEventsByDate((current) => {
      const next = new Map(current);
      const existing = next.get(key);
      const isSameType = existing?.event_type === eventType;

      if (isSameType) {
        return next;
      } else {
        next.set(key, {
          id: existing?.id,
          date: key,
          event_type: eventType,
          title: existing?.title && existing.event_type === eventType ? existing.title : defaultTitle(eventType),
          training_local_hour: eventType === "rest" ? null : existing?.training_local_hour ?? 17,
          training_local_minute: eventType === "rest" ? null : existing?.training_local_minute ?? 0,
          training_timezone: eventType === "rest" ? null : existing?.training_timezone ?? timezone,
        });
      }
      return next;
    });
    setSaveState("idle");
  };

  const updateSelectedEvent = (patch: Partial<LocalEvent>) => {
    if (!selectedKey) return;
    setEventsByDate((current) => {
      const existing = current.get(selectedKey);
      if (!existing) return current;
      const next = new Map(current);
      next.set(selectedKey, { ...existing, ...patch });
      return next;
    });
    setSaveState("idle");
  };

  const removeSelectedEvent = () => {
    if (!selectedKey) return;
    setEventsByDate((current) => {
      const next = new Map(current);
      next.delete(selectedKey);
      return next;
    });
    setSaveState("idle");
  };

  const save = async () => {
    if (!user) return;
    setSaveState("saving");
    try {
      const rows = Array.from(eventsByDate.values())
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((event) => ({
          team_id: teamId,
          date: event.date,
          event_type: event.event_type,
          title: event.title?.trim() || defaultTitle(event.event_type),
          training_local_hour: event.event_type === "rest" ? null : event.training_local_hour,
          training_local_minute: event.event_type === "rest" ? null : event.training_local_minute ?? 0,
          training_timezone: event.event_type === "rest" ? null : event.training_timezone || timezone,
          created_by: user.id,
        }));

      if (rows.length > 0) {
        const { error: upsertError } = await supabase
          .from("team_calendar_events")
          .upsert(rows, { onConflict: "team_id,date" });
        if (upsertError) throw upsertError;
      }

      const currentDates = new Set(eventsByDate.keys());
      const removedDates = Array.from(persistedDates).filter((date) => !currentDates.has(date));
      if (removedDates.length > 0) {
        const { error: deleteError } = await supabase
          .from("team_calendar_events")
          .delete()
          .eq("team_id", teamId)
          .in("date", removedDates);
        if (deleteError) throw deleteError;
      }

      setPersistedDates(currentDates);
      setSaveState("saved");
      toast.success("Teamkalender gespeichert. Du kannst jederzeit weitere Events nachtragen.");
    } catch (err) {
      setSaveState("error");
      console.error("team calendar save error", err);
      const message = errorMessage(err);
      toast.error(
        message === "Speichern fehlgeschlagen"
          ? "Teamkalender konnte nicht gespeichert werden. Bitte prüfe, ob die neue Datenbank-Migration live ist."
          : message,
      );
    }
  };

  return (
    <div className={cn(
      "border border-border/50 bg-secondary/20",
      isFull
        ? "relative overflow-hidden rounded-[28px] p-4 shadow-[0_28px_80px_-48px_rgba(0,0,0,0.95)] sm:p-6"
        : "mt-4 rounded-2xl p-4",
    )}>
      {isFull && <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary/[0.09] blur-3xl" />}
      <div className="relative mb-5 flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] border border-primary/20 bg-primary/[0.09] text-primary">
          <CalendarDays className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h4 className={cn("font-heading font-semibold text-foreground", isFull ? "text-lg tracking-[-0.02em]" : "text-sm")}>
            Teamkalender
          </h4>
          <p className={cn("mt-1 leading-relaxed text-muted-foreground", isFull ? "max-w-xl text-sm" : "text-xs")}>
            Plane Training, Ruhetage und Wettkämpfe für bekannte Zeiträume. Du kannst jederzeit weitere Tage ergänzen.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : (
        <div className="relative space-y-5">
          <div className="grid grid-cols-3 gap-2">
            {(Object.entries(eventConfig) as [EventType, typeof eventConfig.training][]).map(([type, config]) => {
              const Icon = config.icon;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedTool(type)}
                  className={`min-h-12 rounded-xl p-2.5 text-center text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    selectedTool === type
                      ? `${config.bg} ${config.text} ring-1 ring-current`
                      : "bg-background/70 text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  <Icon className={`mx-auto mb-1 h-4 w-4 ${selectedTool === type ? config.text : "text-muted-foreground"}`} />
                  {config.label}
                </button>
              );
            })}
          </div>

          <div className={cn("grid gap-4", isFull && "lg:grid-cols-[minmax(0,1.08fr)_minmax(18rem,0.92fr)] lg:items-start")}>
          <div className={cn(
            "border border-border/50 bg-background/60",
            isFull ? "-mx-4 rounded-none border-x-0 p-2 sm:mx-0 sm:rounded-[20px] sm:border-x sm:p-4" : "rounded-xl p-3",
          )}>
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="flex h-11 w-11 items-center justify-center rounded-xl transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Vorheriger Monat"
              >
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              <h5 className="font-heading text-sm font-semibold">
                {format(currentMonth, "MMMM yyyy", { locale: de })}
              </h5>
              <button
                type="button"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="flex h-11 w-11 items-center justify-center rounded-xl transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Nächster Monat"
              >
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="mb-1 grid grid-cols-7 gap-1">
              {weekDays.map((day) => (
                <div key={day} className="py-1 text-center text-[11px] font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const event = eventsByDate.get(key);
                const inMonth = isSameMonth(day, currentMonth);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => upsertDay(day)}
                    className={`relative aspect-square min-h-11 rounded-lg text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      !inMonth ? "opacity-30" : ""
                    } ${isToday(day) ? "ring-1 ring-primary" : ""} ${
                      isSelected ? "ring-2 ring-primary" : "hover:bg-secondary"
                    } ${event ? eventConfig[event.event_type].bg : ""}`}
                  >
                    <span className={isToday(day) ? "font-semibold text-primary" : "font-medium"}>
                      {format(day, "d")}
                    </span>
                    {event && (
                      <span className={`absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${eventConfig[event.event_type].dot}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedDate ? (
            <div className={cn("border border-border/50 bg-background/60 p-4", isFull ? "rounded-[20px]" : "rounded-xl")}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">
                    {format(selectedDate, "EEEE, d. MMMM", { locale: de })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedEvent ? eventConfig[selectedEvent.event_type].label : "Noch kein Team-Event"}
                  </p>
                </div>
                {selectedEvent && (
                  <button
                    type="button"
                    onClick={removeSelectedEvent}
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label="Event entfernen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {selectedEvent ? (
                <div className="space-y-3">
                  <div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${eventConfig[selectedEvent.event_type].bg}`}>
                    {(() => {
                      const Icon = eventConfig[selectedEvent.event_type].icon;
                      return <Icon className={`h-4 w-4 ${eventConfig[selectedEvent.event_type].text}`} />;
                    })()}
                    <span className={`text-sm font-semibold ${eventConfig[selectedEvent.event_type].text}`}>
                      {eventConfig[selectedEvent.event_type].label}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={selectedEvent.title}
                    onChange={(e) => updateSelectedEvent({ title: e.target.value })}
                    placeholder="Titel"
                    className="min-h-11 w-full rounded-xl border border-border/50 bg-secondary/50 px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {selectedEvent.event_type !== "rest" && (
                    <Select
                      value={`${selectedEvent.training_local_hour ?? 17}:${selectedEvent.training_local_minute ?? 0}`}
                      onValueChange={(next) => {
                        const parsed = parseTimeValue(next);
                        updateSelectedEvent({
                          training_local_hour: parsed.h,
                          training_local_minute: parsed.m,
                          training_timezone: timezone,
                        });
                      }}
                    >
                      <SelectTrigger className="min-h-11 bg-secondary/50 focus:ring-2 focus:ring-primary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRAINING_TIMES.map((time) => (
                          <SelectItem key={`${time.h}:${time.m}`} value={`${time.h}:${time.m}`}>
                            {formatHM(time.h, time.m)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => upsertDay(selectedDate)}
                  className="min-h-12 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {eventConfig[selectedTool].label} für diesen Tag setzen
                </button>
              )}
            </div>
          ) : (
            <div className="hidden rounded-[20px] border border-border/50 bg-background/60 p-4 lg:block">
              <p className="text-sm font-semibold text-foreground">Tag auswählen</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Wähle im Kalender einen Tag und ordne Training, Ruhetag oder Wettkampf zu.</p>
            </div>
          )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>{eventsByDate.size} Team-Events geplant</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" />Training</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-400" />Ruhetag</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-yellow-400" />Wettkampf</span>
            </div>
          </div>

          <button
            type="button"
            onClick={save}
            disabled={saveState === "saving"}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
          >
            {saveState === "saving" && <Loader2 className="h-4 w-4 animate-spin" />}
            {saveState === "saved" && <Check className="h-4 w-4" />}
            {saveState === "saving"
              ? "Speichert..."
              : saveState === "saved"
                ? "Gespeichert"
                : saveState === "error"
                  ? "Erneut speichern"
                  : "Teamkalender speichern"}
          </button>
        </div>
      )}
    </div>
  );
};

export default TeamTrainingSchedule;
