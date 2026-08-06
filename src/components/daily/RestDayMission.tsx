import { useEffect, useMemo, useState } from "react";
import { Bell, Check, Clock3, Play } from "lucide-react";
import RestDayVisualizationFlow from "@/prototypes/golden-days/RestDayVisualizationFlow";
import type { GoldenDayDraft } from "@/prototypes/golden-days/goldenDayDrafts";
import {
  cancelRestVisualizationReminder,
  isNativeNotificationsAvailable,
  scheduleRestVisualizationReminder,
} from "@/lib/nativeNotifications";

export type RestDayPlanMode = "now" | "later" | null;

type Props = {
  draft: GoldenDayDraft;
  userId: string | null;
  athleteName?: unknown;
  date: string;
  planMode: RestDayPlanMode;
  reminderTime: string;
  reminderScheduled: boolean;
  completed: boolean;
  onPlanModeChange: (mode: Exclude<RestDayPlanMode, null>) => void;
  onReminderTimeChange: (time: string) => void;
  onReminderScheduledChange: (scheduled: boolean) => void;
  onComplete: () => void;
  onCloseForLater: () => void;
};

const parseTime = (time: string) => {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
};

const RestDayMission = ({
  draft,
  userId,
  athleteName,
  date,
  planMode,
  reminderTime,
  reminderScheduled,
  completed,
  onPlanModeChange,
  onReminderTimeChange,
  onReminderScheduledChange,
  onComplete,
  onCloseForLater,
}: Props) => {
  const [scheduling, setScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const nativeAvailable = useMemo(() => isNativeNotificationsAvailable(), []);

  useEffect(() => {
    if (planMode !== "now") return;
    onReminderScheduledChange(false);
    void cancelRestVisualizationReminder(draft.day);
  }, [draft.day, onReminderScheduledChange, planMode]);

  const scheduleReminder = async () => {
    const parsed = parseTime(reminderTime);
    if (!parsed || !userId) {
      setScheduleError("Wähle eine gültige Uhrzeit.");
      return;
    }
    setScheduling(true);
    setScheduleError(null);
    try {
      await scheduleRestVisualizationReminder({
        userId,
        date,
        dayNumber: draft.day,
        hour: parsed.hour,
        minute: parsed.minute,
      });
      onReminderScheduledChange(true);
    } catch (error) {
      setScheduleError(error instanceof Error ? error.message : "Die Erinnerung konnte nicht gesetzt werden.");
      onReminderScheduledChange(false);
    } finally {
      setScheduling(false);
    }
  };

  if (completed) {
    return (
      <div className="rounded-[26px] border border-primary/20 bg-primary/[0.055] p-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/12 text-primary">
          <Check className="h-5 w-5" />
        </span>
        <h2 className="mt-4 text-xl font-semibold">Mentale Einheit abgeschlossen</h2>
        <p className="mt-2 text-sm leading-6 text-white/48">{draft.cue}</p>
      </div>
    );
  }

  if (planMode === "now") {
    return (
      <RestDayVisualizationFlow
        draft={draft}
        athleteName={athleteName}
        onCompletionChange={(complete) => {
          if (complete) {
            onComplete();
          }
        }}
      />
    );
  }

  if (planMode === "later") {
    return (
      <div className="relative overflow-hidden rounded-[28px] border border-white/[0.07] bg-[#101216] p-5 sm:p-7">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-52 w-72 -translate-x-1/2 rounded-full bg-primary/[0.11] blur-3xl" />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Später erinnern</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">Wann passt deine mentale Einheit?</h2>
          <p className="mt-3 text-sm leading-6 text-white/48">Plane etwa 4 bis 8 ruhige Minuten ein.</p>

          <label className="mt-6 block text-xs font-semibold uppercase tracking-[0.14em] text-white/45" htmlFor="rest-visualization-time">
            Uhrzeit
          </label>
          <input
            id="rest-visualization-time"
            type="time"
            value={reminderTime}
            onChange={(event) => {
              if (reminderScheduled) void cancelRestVisualizationReminder(draft.day);
              onReminderTimeChange(event.target.value);
              onReminderScheduledChange(false);
              setScheduleError(null);
            }}
            className="mt-2 min-h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 text-base text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />

          {scheduleError && (
            <p className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] px-3 py-2.5 text-xs leading-5 text-amber-100/75">
              {scheduleError}
            </p>
          )}

          {reminderScheduled ? (
            <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/[0.06] p-4">
              <div className="flex items-start gap-3">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold">Erinnerung für {reminderTime} gesetzt</p>
                  <p className="mt-1 text-xs leading-5 text-white/42">Beim Öffnen landest du wieder bei deinem Daily Flow.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onCloseForLater}
                className="mt-4 min-h-12 w-full rounded-2xl border border-white/[0.075] text-sm font-semibold text-white/62 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Für jetzt schließen
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={scheduleReminder}
              disabled={scheduling || !nativeAvailable}
              className="mt-5 flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-[#07110e] disabled:bg-white/[0.06] disabled:text-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Bell className="h-4 w-4" />
              {scheduling ? "Erinnerung wird gesetzt …" : nativeAvailable ? "Erinnerung setzen" : "Nur in der App verfügbar"}
            </button>
          )}

          <button
            type="button"
            onClick={() => onPlanModeChange("now")}
            className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/[0.075] text-sm font-semibold text-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Play className="h-4 w-4" /> Jetzt doch starten
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/[0.07] bg-[#101216] p-5 sm:p-7">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-52 w-72 -translate-x-1/2 rounded-full bg-primary/[0.11] blur-3xl" />
      <div className="relative">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Mentale Einheit</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">Heute trainierst du im Kopf.</h2>
        <p className="mt-3 text-sm leading-6 text-white/48">
          Die App führt dich durch eine Szene aus deinem Sport. Du musst vorher nicht wissen, wie Visualisierung funktioniert.
        </p>
        <button
          type="button"
          onClick={() => onPlanModeChange("now")}
          className="mt-7 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-[#07110e] shadow-[0_0_30px_hsl(var(--primary)/0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Play className="h-4 w-4 fill-current" /> Jetzt starten
        </button>
        <button
          type="button"
          onClick={() => onPlanModeChange("later")}
          className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/[0.075] bg-white/[0.025] px-4 text-sm font-semibold text-white/62 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Clock3 className="h-4 w-4" /> Später erinnern
        </button>
      </div>
    </div>
  );
};

export default RestDayMission;
