import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth } from "date-fns";
import { de } from "date-fns/locale";
import { Brain, ChevronLeft, ChevronRight, Dumbbell, Moon, Trophy, Plus, X, Check, Flame, Zap, Target, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import DailyCheckin from "@/components/dashboard/DailyCheckin";

type EventType = "training" | "rest" | "competition";

interface CalendarEvent {
  id: string;
  session_id: string;
  date: string;
  event_type: EventType;
  title: string | null;
  notes: string | null;
}

const SESSION_KEY = "mindgame_session_id";

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

const Dashboard = () => {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEventType, setNewEventType] = useState<EventType>("training");
  const [newEventTitle, setNewEventTitle] = useState("");
  const [showCheckin, setShowCheckin] = useState(false);
  const sessionId = useMemo(() => getSessionId(), []);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    const { data } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("session_id", sessionId);
    if (data) setEvents(data as CalendarEvent[]);
  };

  const addEvent = async () => {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    const { data, error } = await supabase
      .from("calendar_events")
      .insert({
        session_id: sessionId,
        date: dateStr,
        event_type: newEventType,
        title: newEventTitle || null,
      })
      .select()
      .single();

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

  // Stats
  const trainingCount = events.filter((e) => e.event_type === "training").length;
  const restCount = events.filter((e) => e.event_type === "rest").length;
  const competitionCount = events.filter((e) => e.event_type === "competition").length;

  if (showCheckin && todayEventType) {
    return (
      <DailyCheckin
        eventType={todayEventType as EventType}
        sessionId={sessionId}
        date={new Date()}
        onClose={() => setShowCheckin(false)}
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
            <span className="font-heading font-bold">MindGame</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-heading">Dashboard</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Today's Check-in CTA */}
        {todayEventType && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <button
              onClick={() => setShowCheckin(true)}
              className="w-full p-6 rounded-2xl bg-gradient-card border-glow hover:shadow-glow transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${eventConfig[todayEventType as EventType].bg} flex items-center justify-center`}>
                    {(() => {
                      const Icon = eventConfig[todayEventType as EventType].icon;
                      return <Icon className={`w-6 h-6 ${eventConfig[todayEventType as EventType].color}`} />;
                    })()}
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-gradient-card border-glow p-6 mb-8"
        >
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <h2 className="font-heading font-semibold text-lg">
              {format(currentMonth, "MMMM yyyy", { locale: de })}
            </h2>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Week day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((d) => (
              <div key={d} className="text-center text-xs text-muted-foreground font-medium py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const dayEvents = getEventsForDate(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const inMonth = isSameMonth(day, currentMonth);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => {
                    setSelectedDate(day);
                    setShowAddEvent(false);
                  }}
                  className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm transition-all ${
                    !inMonth ? "opacity-30" : ""
                  } ${isToday(day) ? "ring-1 ring-primary" : ""} ${
                    isSelected ? "bg-primary/20 ring-1 ring-primary" : "hover:bg-secondary"
                  }`}
                >
                  <span className={`font-medium ${isToday(day) ? "text-primary" : ""}`}>
                    {format(day, "d")}
                  </span>
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {dayEvents.map((e) => (
                        <div
                          key={e.id}
                          className={`w-1.5 h-1.5 rounded-full ${
                            e.event_type === "training" ? "bg-primary" :
                            e.event_type === "rest" ? "bg-blue-400" :
                            "bg-yellow-400"
                          }`}
                        />
                      ))}
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
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="rounded-2xl bg-gradient-card border-glow p-6 mb-8"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-semibold">
                  {format(selectedDate, "EEEE, d. MMMM", { locale: de })}
                </h3>
                <button
                  onClick={() => {
                    setShowAddEvent(true);
                    setNewEventType("training");
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Hinzufügen
                </button>
              </div>

              {/* Existing events for this date */}
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
                        <button
                          onClick={() => removeEvent(event.id)}
                          className="p-1.5 rounded-lg hover:bg-destructive/20 transition-colors"
                        >
                          <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mb-4">Kein Eintrag für diesen Tag.</p>
              )}

              {/* Add event form */}
              <AnimatePresence>
                {showAddEvent && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 rounded-xl bg-secondary/30 space-y-4">
                      <div className="grid grid-cols-3 gap-2">
                        {(Object.entries(eventConfig) as [EventType, typeof eventConfig.training][]).map(([type, config]) => (
                          <button
                            key={type}
                            onClick={() => setNewEventType(type)}
                            className={`p-3 rounded-xl text-center transition-all ${
                              newEventType === type
                                ? `${config.bg} ring-1 ring-current ${config.color}`
                                : "bg-secondary/50 hover:bg-secondary"
                            }`}
                          >
                            <config.icon className={`w-5 h-5 mx-auto mb-1 ${newEventType === type ? config.color : "text-muted-foreground"}`} />
                            <span className="text-xs font-medium">{config.label}</span>
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        placeholder="Titel (optional)"
                        value={newEventTitle}
                        onChange={(e) => setNewEventTitle(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-secondary/50 border border-border/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={addEvent}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-heading font-semibold text-sm hover:shadow-glow transition-all"
                        >
                          <Check className="w-4 h-4" />
                          Speichern
                        </button>
                        <button
                          onClick={() => setShowAddEvent(false)}
                          className="px-4 py-2.5 rounded-xl bg-secondary/50 text-muted-foreground text-sm hover:bg-secondary transition-colors"
                        >
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
            Training
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
            Ruhetag
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            Wettkampf
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
