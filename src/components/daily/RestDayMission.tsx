import { useEffect, useMemo, useState } from "react";
import { Bell, Check, ChevronDown, Clock3, Loader2, Play } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import RestDayVisualizationFlow from "@/prototypes/golden-days/RestDayVisualizationFlow";
import type { GoldenDayDraft } from "@/prototypes/golden-days/goldenDayDrafts";
import {
  cancelRestVisualizationReminder,
  isNativeNotificationsAvailable,
  scheduleRestVisualizationReminder,
} from "@/lib/nativeNotifications";
import {
  AthleteFlowButton,
  athleteFlowInput,
  athleteFlowPanel,
  athleteFlowPrimaryButton,
  athleteFlowSecondaryButton,
} from "@/components/app/AthleteFlowScene";

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
  saving: boolean;
  saveError: string | null;
  onPlanModeChange: (mode: Exclude<RestDayPlanMode, null>) => void;
  onReminderTimeChange: (time: string) => void;
  onReminderScheduledChange: (scheduled: boolean) => void;
  onComplete: () => void;
  onRetrySave: () => void;
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
  saving,
  saveError,
  onPlanModeChange,
  onReminderTimeChange,
  onReminderScheduledChange,
  onComplete,
  onRetrySave,
  onCloseForLater,
}: Props) => {
  const [scheduling, setScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
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
      <div className={`${athleteFlowPanel} bg-primary/[0.055] p-7 text-center`}>
        <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          <Check className="h-4 w-4" /> Visualisierung abgeschlossen
        </p>
        <h2 className="mt-5 text-xl font-semibold">Dein Satz für heute</h2>
        <p className="mt-2 text-sm leading-6 text-white/48">{draft.cue}</p>
        {saveError ? (
          <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-left">
            <p className="text-xs leading-5 text-amber-100/75">{saveError}</p>
            <AthleteFlowButton
              onClick={onRetrySave}
              disabled={saving}
              className={`${athleteFlowPrimaryButton} mt-4 w-full`}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Wird gespeichert …" : "Erneut speichern"}
            </AthleteFlowButton>
          </div>
        ) : saving ? (
          <div className="mt-6 flex min-h-12 items-center justify-center gap-2 text-sm font-semibold text-white/52" role="status">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Abschluss wird gespeichert …
          </div>
        ) : (
          <AthleteFlowButton
            onClick={onRetrySave}
            className={`${athleteFlowPrimaryButton} mt-6 w-full`}
          >
            Zurück zum Dashboard
          </AthleteFlowButton>
        )}
      </div>
    );
  }

  if (planMode === "now") {
    return (
      <RestDayVisualizationFlow
        draft={draft}
        athleteName={athleteName}
        onDefer={() => onPlanModeChange("later")}
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
      <div className="relative overflow-hidden rounded-[30px] bg-[#101216] p-5 sm:p-7">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-52 w-72 -translate-x-1/2 rounded-full bg-primary/[0.11] blur-3xl" />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Später erinnern</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">Wann passt deine Visualisierung?</h2>
          <p className="mt-3 text-sm leading-6 text-white/48">Plane ungefähr vier ruhige Minuten ein.</p>

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
            className={`${athleteFlowInput} mt-2 min-h-12 text-base`}
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
              <AthleteFlowButton
                onClick={onCloseForLater}
                className={`${athleteFlowSecondaryButton} mt-4 w-full`}
              >
                Für jetzt schließen
              </AthleteFlowButton>
            </div>
          ) : (
            <AthleteFlowButton
              onClick={scheduleReminder}
              disabled={scheduling || !nativeAvailable}
              className={`${athleteFlowPrimaryButton} mt-5 w-full`}
            >
              <Bell className="h-4 w-4" />
              {scheduling ? "Erinnerung wird gesetzt …" : nativeAvailable ? "Erinnerung setzen" : "Nur in der App verfügbar"}
            </AthleteFlowButton>
          )}

          <AthleteFlowButton
            onClick={() => onPlanModeChange("now")}
            className={`${athleteFlowSecondaryButton} mt-3 w-full`}
          >
            <Play className="h-4 w-4" /> Jetzt doch starten
          </AthleteFlowButton>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[30px] bg-[#101216] p-5 sm:p-7">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-52 w-72 -translate-x-1/2 rounded-full bg-primary/[0.11] blur-3xl" />
      <div className="relative">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Ruhetag · Dein Fokus</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">{draft.title}</h2>
        <p className="mt-3 text-sm leading-6 text-white/58">{draft.purpose}</p>

        <div className="mt-6 border-y border-white/[0.065] py-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Dein Satz für heute</p>
          <p className="mt-2 text-xl font-semibold leading-8 tracking-[-0.02em] text-white/90">{draft.cue}</p>
          <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/38">Das visualisierst du</p>
          <p className="mt-2 text-sm leading-6 text-white/58">
            Du gehst eine passende Sportsituation durch. Du nutzt diesen Satz und stellst dir vor, wie du danach handeln möchtest.
          </p>
        </div>

        {draft.detailedExplanation && (
          <div className="overflow-hidden border-b border-white/[0.065]">
            <button
              type="button"
              aria-expanded={showExplanation}
              onClick={() => setShowExplanation((current) => !current)}
              className="flex min-h-14 w-full items-center justify-between gap-3 py-3 text-left text-sm font-semibold text-white/72 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Genauer verstehen
              <ChevronDown className={`h-4 w-4 shrink-0 text-primary transition-transform ${showExplanation ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence initial={false}>
              {showExplanation && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <p className="pb-5 text-sm leading-6 text-white/67">
                    {draft.detailedExplanation}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <p className="mt-5 text-xs leading-5 text-white/38">
          Du startest mit zwei Minuten ruhiger Atmung. Die komplette Einheit dauert ungefähr vier Minuten.
        </p>
        <AthleteFlowButton
          onClick={() => onPlanModeChange("now")}
          className={`${athleteFlowPrimaryButton} mt-7 min-h-14 w-full`}
        >
          <Play className="h-4 w-4 fill-current" /> Jetzt starten
        </AthleteFlowButton>
        <AthleteFlowButton
          onClick={() => onPlanModeChange("later")}
          className={`${athleteFlowSecondaryButton} mt-3 w-full`}
        >
          <Clock3 className="h-4 w-4" /> Später erinnern
        </AthleteFlowButton>
      </div>
    </div>
  );
};

export default RestDayMission;
