import { useEffect, useState } from "react";
import { Bell, BellOff, Calendar, Check, Info, Loader2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { getCachedProgramModeInfo, getProgramModeInfo } from "@/lib/programMode";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const DAYS = [
  { idx: 1, label: "Mo" },
  { idx: 2, label: "Di" },
  { idx: 3, label: "Mi" },
  { idx: 4, label: "Do" },
  { idx: 5, label: "Fr" },
  { idx: 6, label: "Sa" },
  { idx: 0, label: "So" },
];

type SaveState = "idle" | "saving" | "saved" | "error";
type LocalTime = { h: number; m: number };
type ScheduleMap = Record<number, LocalTime | null>;

const TRAINING_TIMES = (() => {
  const out: LocalTime[] = [];
  for (let h = 6; h <= 22; h++) {
    out.push({ h, m: 0 });
    out.push({ h, m: 30 });
  }
  return out;
})();

// Local hour helpers (for stored UTC -> local display)
const utcToLocal = (h: number, m: number) => {
  const d = new Date();
  d.setUTCHours(h, m, 0, 0);
  return { h: d.getHours(), m: d.getMinutes() };
};
const localToUtc = (h: number, m: number) => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return { h: d.getUTCHours(), m: d.getUTCMinutes() };
};

const formatHM = (h: number, m: number) =>
  `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

const parseTimeValue = (value: string): LocalTime => {
  const [h, m] = value.split(":").map(Number);
  return { h, m };
};

const emptySchedule = (): ScheduleMap => {
  const map: ScheduleMap = {};
  DAYS.forEach((day) => {
    map[day.idx] = null;
  });
  return map;
};

const errorMessage = (err: unknown, fallback = "Fehler") =>
  err instanceof Error ? err.message : fallback;

const morningOptions = (() => {
  const out: { h: number; m: number }[] = [];
  for (let h = 6; h <= 10; h++) for (const m of [0, 30]) out.push({ h, m });
  return out;
})();
const eveningOptions = (() => {
  const out: { h: number; m: number }[] = [];
  for (let h = 18; h <= 23; h++) for (const m of [0, 30]) out.push({ h, m });
  return out;
})();

export const TrainingAndNotifications = () => {
  const { user } = useAuth();
  const push = usePushSubscription();
  const navigate = useNavigate();
  const initialProgramMode = getCachedProgramModeInfo(user?.id);

  // Training schedule state
  const [scheduleLoading, setScheduleLoading] = useState(() => initialProgramMode?.mode !== "team");
  const [scheduleSaveState, setScheduleSaveState] = useState<SaveState>("idle");
  // Stored in local display time. Persisted rows also keep UTC fallback fields.
  const [schedule, setSchedule] = useState<ScheduleMap>(() => emptySchedule());
  const [isTeamMode, setIsTeamMode] = useState(() => initialProgramMode?.mode === "team");

  // Notification time UI state (local for display)
  const [morningLocal, setMorningLocal] = useState({ h: 7, m: 30 });
  const [eveningLocal, setEveningLocal] = useState({ h: 21, m: 0 });
  const [preTrainingMinutes, setPreTrainingMinutes] = useState(60);
  const [timesSaveState, setTimesSaveState] = useState<SaveState>("idle");

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const cachedModeInfo = getCachedProgramModeInfo(user.id);
      if (cachedModeInfo?.mode === "team") {
        setIsTeamMode(true);
        setScheduleLoading(false);
      }
      try {
        const modeInfo = await getProgramModeInfo(user.id);
        setIsTeamMode(modeInfo.mode === "team");
        if (modeInfo.mode === "team") {
          setScheduleLoading(false);
          return;
        }

        const { data } = await supabase
          .from("training_schedule")
          .select("day_of_week,training_hour,training_local_hour,training_local_minute")
          .eq("user_id", user.id);
        const map = emptySchedule();
        (data ?? []).forEach((r) => {
          const local = typeof r.training_local_hour === "number"
            ? { h: r.training_local_hour, m: r.training_local_minute ?? 0 }
            : { h: r.training_hour, m: 0 };
          map[r.day_of_week] = local;
        });
        setSchedule(map);
      } catch (error) {
        console.error("training settings load error", error);
      } finally {
        setScheduleLoading(false);
      }
    };
    void load();
  }, [user]);

  useEffect(() => {
    if (!push.loading && push.enabled) {
      const m = push.mode === "native"
        ? { h: push.morningHour, m: push.morningMinute }
        : utcToLocal(push.morningHour, push.morningMinute);
      const e = push.mode === "native"
        ? { h: push.eveningHour, m: push.eveningMinute }
        : utcToLocal(push.eveningHour, push.eveningMinute);
      setMorningLocal(m);
      setEveningLocal(e);
      setPreTrainingMinutes(push.preTrainingMinutes);
    }
  }, [push.loading, push.enabled, push.mode, push.morningHour, push.morningMinute, push.eveningHour, push.eveningMinute, push.preTrainingMinutes]);

  const setDayTimeLocal = (dayIdx: number, localTime: LocalTime | null) => {
    const next = { ...schedule };
    next[dayIdx] = localTime;
    setSchedule(next);
    setScheduleSaveState("idle");
  };

  const saveSchedule = async () => {
    if (!user) return;
    setScheduleSaveState("saving");
    try {
      // Delete all existing rows for this user, then insert fresh set.
      const { error: delErr } = await supabase
        .from("training_schedule")
        .delete()
        .eq("user_id", user.id);
      if (delErr) throw delErr;
      const rows = Object.entries(schedule)
        .filter(([, value]) => value !== null)
        .map(([day, value]) => {
          const local = value as LocalTime;
          return {
            user_id: user.id,
            day_of_week: Number(day),
            // Keep the canonical local value and legacy fallback aligned.
            training_hour: local.h,
            training_local_hour: local.h,
            training_local_minute: local.m,
            training_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          };
        });
      if (rows.length) {
        const { error: insErr } = await supabase.from("training_schedule").insert(rows);
        if (insErr) throw insErr;
      }
      try {
        await push.resync();
      } catch (error) {
        console.warn("[native] reminder resync after schedule save failed", error);
        toast.warning("Trainingszeiten sind gespeichert. Die iOS-Erinnerungen werden beim nächsten App-Start aktualisiert.");
      }
      setScheduleSaveState("saved");
      toast.success("Trainingszeiten gespeichert.");
    } catch (e: unknown) {
      setScheduleSaveState("error");
      toast.error("Speichern fehlgeschlagen: " + errorMessage(e));
    }
  };

  const scrollToInstallGuide = () => {
    const guide = document.getElementById("app-install-guide");
    if (!guide) return;
    guide.scrollIntoView({ behavior: "smooth", block: "start" });
    guide.classList.add("ring-2", "ring-primary/50", "rounded-xl");
    window.setTimeout(() => {
      guide.classList.remove("ring-2", "ring-primary/50", "rounded-xl");
    }, 2400);
  };

  const handleEnablePush = async () => {
    try {
      const m = push.mode === "native"
        ? morningLocal
        : localToUtc(morningLocal.h, morningLocal.m);
      const e = push.mode === "native"
        ? eveningLocal
        : localToUtc(eveningLocal.h, eveningLocal.m);
      await push.subscribe({
        morningHour: m.h,
        morningMinute: m.m,
        eveningHour: e.h,
        eveningMinute: e.m,
        preTrainingMinutes,
      });
      toast.success("Benachrichtigungen aktiviert.");
    } catch (e: unknown) {
      toast.error(errorMessage(e, "Fehler beim Aktivieren"));
    }
  };
  const handleDisablePush = async () => {
    await push.unsubscribe();
    toast.success("Benachrichtigungen deaktiviert.");
  };

  const saveTimes = async () => {
    setTimesSaveState("saving");
    try {
      const m = push.mode === "native"
        ? morningLocal
        : localToUtc(morningLocal.h, morningLocal.m);
      const e = push.mode === "native"
        ? eveningLocal
        : localToUtc(eveningLocal.h, eveningLocal.m);
      await push.saveTimes(m.h, m.m, e.h, e.m, preTrainingMinutes);
      setTimesSaveState("saved");
      toast.success("Zeiten gespeichert.");
    } catch (err: unknown) {
      setTimesSaveState("error");
      toast.error(errorMessage(err));
    }
  };

  useEffect(() => {
    if (scheduleSaveState !== "saved") return;
    const handle = window.setTimeout(() => setScheduleSaveState("idle"), 2500);
    return () => window.clearTimeout(handle);
  }, [scheduleSaveState]);

  useEffect(() => {
    if (timesSaveState !== "saved") return;
    const handle = window.setTimeout(() => setTimesSaveState("idle"), 2500);
    return () => window.clearTimeout(handle);
  }, [timesSaveState]);

  return (
    <>
      {/* Training schedule */}
      <section>
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-semibold text-lg">Trainingszeiten</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {isTeamMode
              ? "Im Teammodus kommt der Trainings- und Wettkampfplan vom Coach."
              : "Wann trainierst du in der Regel? Diese Zeiten steuern deinen Pre-Training-Reminder."}
          </p>
          {isTeamMode && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground">Teamkalender aktiv</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Dein Coach steuert Training, Wettkämpfe und Ruhetage. Du findest den Teamkalender auf deinem Dashboard;
                    eigene Kalenderänderungen sind im Teammodus nicht nötig.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate("/dashboard#dashboard-plan")}
                    className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 px-4 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    Zum Teamkalender
                  </button>
                </div>
              </div>
            </div>
          )}
          {isTeamMode ? null : scheduleLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-2">
              {DAYS.map((d) => {
                const local = schedule[d.idx] ?? null;
                const has = local !== null;
                return (
                  <div key={d.idx} className="flex items-center gap-3">
                    <div className="w-10 text-sm font-medium">{d.label}</div>
                    <Switch
                      checked={has}
                      onCheckedChange={(v) => setDayTimeLocal(d.idx, v ? { h: 17, m: 0 } : null)}
                    />
                    {has ? (
                      <Select
                        value={`${local.h}:${local.m}`}
                        onValueChange={(v) => setDayTimeLocal(d.idx, parseTimeValue(v))}
                      >
                        <SelectTrigger className="w-32 bg-secondary/50">
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
                    ) : (
                      <span className="text-sm text-muted-foreground">kein Training</span>
                    )}
                  </div>
                );
              })}
              <Button onClick={saveSchedule} disabled={scheduleSaveState === "saving"} className="w-full mt-2">
                {scheduleSaveState === "saving" && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {scheduleSaveState === "saved" && <Check className="w-4 h-4 mr-2" />}
                {scheduleSaveState === "saving"
                  ? "Speichert..."
                  : scheduleSaveState === "saved"
                    ? "Gespeichert"
                    : scheduleSaveState === "error"
                      ? "Erneut speichern"
                      : "Trainingszeiten speichern"}
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Notifications */}
      <section>
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-semibold text-lg">Benachrichtigungen</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Erinnerungen für deinen Check-in, die mentale Vorbereitung und dein Journal.
          </p>

          {!push.supported ? (
            <div className="rounded-lg border border-border bg-secondary/30 p-3 text-sm text-muted-foreground space-y-3">
              <p>
                {push.supportReason === "preview_host"
                    ? "Push ist in Lovable-Preview-Umgebungen deaktiviert. Teste Benachrichtigungen später auf rewireperform.com oder lokal."
                    : push.supportReason === "insecure"
                      ? "Push benötigt eine sichere HTTPS-Verbindung."
                      : "Dieser Browser unterstützt keine Push-Benachrichtigungen. Auf iPhone/iPad: Füge RewirePerform zuerst zum Home-Bildschirm hinzu, öffne die App von dort und aktiviere dann Push."}
              </p>
              <button
                type="button"
                onClick={scrollToInstallGuide}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-primary/15"
              >
                <Smartphone className="h-3.5 w-3.5" />
                iPhone-Anleitung anzeigen
              </button>
            </div>
          ) : push.loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : !push.enabled ? (
            <Button onClick={handleEnablePush} className="w-full">
              <Bell className="w-4 h-4 mr-2" />
              Benachrichtigungen aktivieren
            </Button>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Morgen-Reminder</label>
                <Select
                  value={`${morningLocal.h}:${morningLocal.m}`}
                  onValueChange={(v) => {
                    const [h, m] = v.split(":").map(Number);
                    setMorningLocal({ h, m });
                    setTimesSaveState("idle");
                  }}
                >
                  <SelectTrigger className="bg-secondary/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {morningOptions.map((o) => (
                      <SelectItem key={`${o.h}:${o.m}`} value={`${o.h}:${o.m}`}>
                        {formatHM(o.h, o.m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Abend-Reminder</label>
                <Select
                  value={`${eveningLocal.h}:${eveningLocal.m}`}
                  onValueChange={(v) => {
                    const [h, m] = v.split(":").map(Number);
                    setEveningLocal({ h, m });
                    setTimesSaveState("idle");
                  }}
                >
                  <SelectTrigger className="bg-secondary/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {eveningOptions.map((o) => (
                      <SelectItem key={`${o.h}:${o.m}`} value={`${o.h}:${o.m}`}>
                        {formatHM(o.h, o.m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Pre-Training-Reminder</label>
                <Select
                  value={String(preTrainingMinutes)}
                  onValueChange={(v) => {
                    setPreTrainingMinutes(Number(v));
                    setTimesSaveState("idle");
                  }}
                >
                  <SelectTrigger className="bg-secondary/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="60">60 Minuten vor Training</SelectItem>
                    <SelectItem value="30">30 Minuten vor Training</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={saveTimes} disabled={timesSaveState === "saving"} className="w-full">
                {timesSaveState === "saving" && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {timesSaveState === "saved" && <Check className="w-4 h-4 mr-2" />}
                {timesSaveState === "saving"
                  ? "Speichert..."
                  : timesSaveState === "saved"
                    ? "Gespeichert"
                    : timesSaveState === "error"
                      ? "Erneut speichern"
                      : "Zeiten speichern"}
              </Button>
              <Button variant="outline" onClick={handleDisablePush} className="w-full">
                <BellOff className="w-4 h-4 mr-2" />
                Benachrichtigungen deaktivieren
              </Button>
              <p className="text-xs text-muted-foreground">
                Reminder werden zur vollen oder halben Stunde gesendet. Pre-Training öffnet direkt deine kurze Vorbereitung.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
};
