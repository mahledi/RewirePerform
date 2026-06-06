import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const DAYS = [
  { idx: 1, label: "Mo" },
  { idx: 2, label: "Di" },
  { idx: 3, label: "Mi" },
  { idx: 4, label: "Do" },
  { idx: 5, label: "Fr" },
  { idx: 6, label: "Sa" },
  { idx: 0, label: "So" },
];

const TRAINING_TIMES = (() => {
  const out: Array<{ h: number; m: number }> = [];
  for (let h = 6; h <= 22; h++) {
    out.push({ h, m: 0 });
    out.push({ h, m: 30 });
  }
  return out;
})();

type SaveState = "idle" | "saving" | "saved" | "error";
type LocalTime = { h: number; m: number };
type ScheduleMap = Record<number, LocalTime | null>;

const emptySchedule = (): ScheduleMap => {
  const map: ScheduleMap = {};
  DAYS.forEach((day) => {
    map[day.idx] = null;
  });
  return map;
};

const formatHM = (h: number, m: number) =>
  `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

const parseTimeValue = (value: string): LocalTime => {
  const [h, m] = value.split(":").map(Number);
  return { h, m };
};

const errorMessage = (err: unknown, fallback = "Speichern fehlgeschlagen") =>
  err instanceof Error ? err.message : fallback;

interface TeamTrainingScheduleProps {
  teamId: string;
}

const TeamTrainingSchedule = ({ teamId }: TeamTrainingScheduleProps) => {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<ScheduleMap>(() => emptySchedule());
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    [],
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const next = emptySchedule();
      const { data, error } = await supabase
        .from("team_training_schedule")
        .select("day_of_week,training_local_hour,training_local_minute")
        .eq("team_id", teamId)
        .order("day_of_week", { ascending: true });

      if (!cancelled) {
        if (error) {
          toast.error("Team-Trainingszeiten konnten nicht geladen werden.");
        } else {
          (data ?? []).forEach((row) => {
            next[row.day_of_week] = {
              h: row.training_local_hour,
              m: row.training_local_minute ?? 0,
            };
          });
          setSchedule(next);
        }
        setLoading(false);
      }
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

  const setDayTime = (dayIdx: number, time: LocalTime | null) => {
    setSchedule((current) => ({ ...current, [dayIdx]: time }));
    setSaveState("idle");
  };

  const save = async () => {
    if (!user) return;
    setSaveState("saving");
    try {
      const { error: delErr } = await supabase
        .from("team_training_schedule")
        .delete()
        .eq("team_id", teamId);
      if (delErr) throw delErr;

      const rows = Object.entries(schedule)
        .filter(([, value]) => value !== null)
        .map(([day, value]) => ({
          team_id: teamId,
          day_of_week: Number(day),
          training_local_hour: value!.h,
          training_local_minute: value!.m,
          training_timezone: timezone,
          created_by: user.id,
        }));

      if (rows.length > 0) {
        const { error: insertErr } = await supabase.from("team_training_schedule").insert(rows);
        if (insertErr) throw insertErr;
      }

      setSaveState("saved");
      toast.success("Team-Trainingsplan gespeichert.");
    } catch (err) {
      setSaveState("error");
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="mt-4 rounded-2xl border border-border/50 bg-secondary/20 p-4">
      <div className="mb-3 flex items-start gap-3">
        <CalendarDays className="mt-0.5 h-5 w-5 text-primary" />
        <div className="min-w-0">
          <h4 className="font-heading text-sm font-semibold text-foreground">Team-Trainingsplan</h4>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Diese Zeiten dienen Spielern als Standard für Pre-Training-Erinnerungen. Spieler können sie in ihren Einstellungen übernehmen oder individuell anpassen.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-2">
          {DAYS.map((day) => {
            const value = schedule[day.idx];
            return (
              <div key={day.idx} className="flex min-w-0 items-center gap-3">
                <div className="w-10 shrink-0 text-sm font-medium">{day.label}</div>
                <Switch
                  checked={value !== null}
                  onCheckedChange={(checked) => setDayTime(day.idx, checked ? { h: 17, m: 0 } : null)}
                />
                {value ? (
                  <Select
                    value={`${value.h}:${value.m}`}
                    onValueChange={(next) => setDayTime(day.idx, parseTimeValue(next))}
                  >
                    <SelectTrigger className="w-32 bg-background/70">
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

          <button
            onClick={save}
            disabled={saveState === "saving"}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:shadow-glow disabled:opacity-50"
          >
            {saveState === "saving" && <Loader2 className="h-4 w-4 animate-spin" />}
            {saveState === "saved" && <Check className="h-4 w-4" />}
            {saveState === "saving"
              ? "Speichert..."
              : saveState === "saved"
                ? "Gespeichert"
                : saveState === "error"
                  ? "Erneut speichern"
                  : "Team-Trainingsplan speichern"}
          </button>
        </div>
      )}
    </div>
  );
};

export default TeamTrainingSchedule;
