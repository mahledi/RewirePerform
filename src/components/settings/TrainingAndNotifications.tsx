import { useEffect, useState } from "react";
import { Bell, BellOff, Calendar, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { toast } from "sonner";

const DAYS = [
  { idx: 1, label: "Mo" },
  { idx: 2, label: "Di" },
  { idx: 3, label: "Mi" },
  { idx: 4, label: "Do" },
  { idx: 5, label: "Fr" },
  { idx: 6, label: "Sa" },
  { idx: 0, label: "So" },
];

const TRAIN_HOURS = Array.from({ length: 17 }, (_, i) => 6 + i); // 6..22
type SaveState = "idle" | "saving" | "saved" | "error";

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

  // Training schedule state
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [scheduleSaveState, setScheduleSaveState] = useState<SaveState>("idle");
  // Stored in local display time. Persisted rows also keep UTC fallback fields.
  const [schedule, setSchedule] = useState<Record<number, number | null>>({});

  // Notification time UI state (local for display)
  const [morningLocal, setMorningLocal] = useState({ h: 7, m: 30 });
  const [eveningLocal, setEveningLocal] = useState({ h: 21, m: 0 });
  const [preTrainingMinutes, setPreTrainingMinutes] = useState(60);
  const [timesSaveState, setTimesSaveState] = useState<SaveState>("idle");

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("training_schedule")
        .select("day_of_week,training_hour,training_local_hour,training_local_minute")
        .eq("user_id", user.id);
      const map: Record<number, number | null> = {};
      DAYS.forEach((d) => (map[d.idx] = null));
      (data ?? []).forEach((r) => {
        const local = typeof r.training_local_hour === "number"
          ? { h: r.training_local_hour, m: r.training_local_minute ?? 0 }
          : { h: r.training_hour, m: 0 };
        map[r.day_of_week] = local.h;
      });
      setSchedule(map);
      setScheduleLoading(false);
    };
    load();
  }, [user]);

  useEffect(() => {
    if (!push.loading && push.enabled) {
      const m = utcToLocal(push.morningHour, push.morningMinute);
      const e = utcToLocal(push.eveningHour, push.eveningMinute);
      setMorningLocal(m);
      setEveningLocal(e);
      setPreTrainingMinutes(push.preTrainingMinutes);
    }
  }, [push.loading, push.enabled, push.morningHour, push.morningMinute, push.eveningHour, push.eveningMinute, push.preTrainingMinutes]);

  const setDayHourLocal = (dayIdx: number, localHour: number | null) => {
    const next = { ...schedule };
    next[dayIdx] = localHour;
    setSchedule(next);
    setScheduleSaveState("idle");
  };

  const displayHour = (localHour: number | null) => {
    return localHour;
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
        .filter(([, h]) => h !== null)
        .map(([day, h]) => {
          const localHour = h as number;
          return {
            user_id: user.id,
            day_of_week: Number(day),
            // Keep the canonical local value and legacy fallback aligned.
            training_hour: localHour,
            training_local_hour: localHour,
            training_local_minute: 0,
            training_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          };
        });
      if (rows.length) {
        const { error: insErr } = await supabase.from("training_schedule").insert(rows);
        if (insErr) throw insErr;
      }
      setScheduleSaveState("saved");
      toast.success("Trainingszeiten gespeichert.");
    } catch (e: unknown) {
      setScheduleSaveState("error");
      toast.error("Speichern fehlgeschlagen: " + errorMessage(e));
    }
  };

  const handleEnablePush = async () => {
    try {
      const m = localToUtc(morningLocal.h, morningLocal.m);
      const e = localToUtc(eveningLocal.h, eveningLocal.m);
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
      const m = localToUtc(morningLocal.h, morningLocal.m);
      const e = localToUtc(eveningLocal.h, eveningLocal.m);
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
            Wann trainierst du in der Regel? Wir erinnern dich passend zu deinem gewählten Vorlauf an deinen Tag.
          </p>
          {scheduleLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-2">
              {DAYS.map((d) => {
                const localH = displayHour(schedule[d.idx] ?? null);
                const has = localH !== null;
                return (
                  <div key={d.idx} className="flex items-center gap-3">
                    <div className="w-10 text-sm font-medium">{d.label}</div>
                    <Switch
                      checked={has}
                      onCheckedChange={(v) => setDayHourLocal(d.idx, v ? 17 : null)}
                    />
                    {has ? (
                      <Select
                        value={String(localH)}
                        onValueChange={(v) => setDayHourLocal(d.idx, Number.parseInt(v, 10))}
                      >
                        <SelectTrigger className="w-28 bg-secondary/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TRAIN_HOURS.map((h) => (
                            <SelectItem key={h} value={String(h)}>
                              {formatHM(h, 0)}
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
            Drei tägliche Push-Reminder: morgens für deinen Check-in, vor dem Training, abends fürs Journal.
          </p>

          {!push.supported ? (
            <div className="rounded-lg border border-border bg-secondary/30 p-3 text-sm text-muted-foreground">
              {push.supportReason === "native_shell"
                ? "Push für die iOS-App wird für die native App-Store-Version vorbereitet. Web-Push läuft unabhängig davon in der Web-App/PWA."
                : push.supportReason === "preview_host"
                  ? "Push ist in Lovable-Preview-Umgebungen deaktiviert. Teste Benachrichtigungen später auf rewireperform.com oder lokal."
                  : push.supportReason === "insecure"
                    ? "Push benötigt eine sichere HTTPS-Verbindung."
                    : "Dieser Browser unterstützt keine Push-Benachrichtigungen. Auf iPhone/iPad funktioniert Web-Push als installierte Home-Screen-App."}
            </div>
          ) : push.loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : !push.enabled ? (
            <Button onClick={handleEnablePush} className="w-full">
              <Bell className="w-4 h-4 mr-2" />
              Push aktivieren
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
                Push deaktivieren
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
