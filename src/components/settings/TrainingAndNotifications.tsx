import { useEffect, useState } from "react";
import { Bell, BellOff, Calendar, Loader2 } from "lucide-react";
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
  const [savingSchedule, setSavingSchedule] = useState(false);
  // Stored as UTC hour. Display converts.
  const [schedule, setSchedule] = useState<Record<number, number | null>>({});

  // Notification time UI state (local for display)
  const [morningLocal, setMorningLocal] = useState({ h: 7, m: 30 });
  const [eveningLocal, setEveningLocal] = useState({ h: 21, m: 0 });
  const [savingTimes, setSavingTimes] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("training_schedule")
        .select("day_of_week,training_hour")
        .eq("user_id", user.id);
      const map: Record<number, number | null> = {};
      DAYS.forEach((d) => (map[d.idx] = null));
      (data ?? []).forEach((r) => (map[r.day_of_week] = r.training_hour));
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
    }
  }, [push.loading, push.enabled, push.morningHour, push.morningMinute, push.eveningHour, push.eveningMinute]);

  const setDayHourLocal = (dayIdx: number, localHour: number | null) => {
    const next = { ...schedule };
    if (localHour === null) {
      next[dayIdx] = null;
    } else {
      // Convert local hour to UTC hour for storage
      const { h: utcHour } = localToUtc(localHour, 0);
      next[dayIdx] = utcHour;
    }
    setSchedule(next);
  };

  const displayHour = (utcHour: number | null) => {
    if (utcHour === null) return null;
    return utcToLocal(utcHour, 0).h;
  };

  const saveSchedule = async () => {
    if (!user) return;
    setSavingSchedule(true);
    try {
      // Delete all existing rows for this user, then insert fresh set.
      const { error: delErr } = await supabase
        .from("training_schedule")
        .delete()
        .eq("user_id", user.id);
      if (delErr) throw delErr;
      const rows = Object.entries(schedule)
        .filter(([, h]) => h !== null)
        .map(([day, h]) => ({
          user_id: user.id,
          day_of_week: Number(day),
          training_hour: h as number,
        }));
      if (rows.length) {
        const { error: insErr } = await supabase.from("training_schedule").insert(rows);
        if (insErr) throw insErr;
      }
      toast.success("Trainingszeiten gespeichert.");
    } catch (e: any) {
      toast.error("Speichern fehlgeschlagen: " + (e?.message ?? "Fehler"));
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleEnablePush = async () => {
    try {
      await push.subscribe();
      toast.success("Benachrichtigungen aktiviert.");
    } catch (e: any) {
      toast.error(e?.message ?? "Fehler beim Aktivieren");
    }
  };
  const handleDisablePush = async () => {
    await push.unsubscribe();
    toast.success("Benachrichtigungen deaktiviert.");
  };

  const saveTimes = async () => {
    setSavingTimes(true);
    try {
      const m = localToUtc(morningLocal.h, morningLocal.m);
      const e = localToUtc(eveningLocal.h, eveningLocal.m);
      await push.saveTimes(m.h, m.m, e.h, e.m);
      toast.success("Zeiten gespeichert.");
    } catch (err: any) {
      toast.error(err?.message ?? "Fehler");
    } finally {
      setSavingTimes(false);
    }
  };

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
            Wann trainierst du in der Regel? Wir erinnern dich ~1 Stunde vorher an deinen Tag.
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
                        onValueChange={(v) => setDayHourLocal(d.idx, Number(v))}
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
              <Button onClick={saveSchedule} disabled={savingSchedule} className="w-full mt-2">
                {savingSchedule && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Trainingszeiten speichern
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
            <p className="text-sm text-muted-foreground">
              Dein Browser unterstützt keine Push-Benachrichtigungen. Installiere die App auf deinem Homescreen.
            </p>
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
              <Button onClick={saveTimes} disabled={savingTimes} className="w-full">
                {savingTimes && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Zeiten speichern
              </Button>
              <Button variant="outline" onClick={handleDisablePush} className="w-full">
                <BellOff className="w-4 h-4 mr-2" />
                Push deaktivieren
              </Button>
              <p className="text-xs text-muted-foreground">
                Reminder werden zur vollen oder halben Stunde gesendet. Pre-Training-Reminder kommen ~1 Stunde vor deiner eingetragenen Trainingszeit.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
};
