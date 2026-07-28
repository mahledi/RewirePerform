import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { de } from "date-fns/locale";
import { motion } from "framer-motion";
import { Check, Flame, Gauge, RefreshCw, RotateCcw, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  buildFlameStats,
  countActiveApplications,
  type FlameCompletionRow,
  type FlameSnapshot,
  type FlameStats,
} from "@/lib/flameStats";
import { getCurrentProgramDay, getEffectiveProgramStart } from "@/lib/getCurrentProgramDay";
import { getOrCreateActiveInstance } from "@/lib/programInstance";
import { getEffectiveTodayDate } from "@/lib/qaTime";
import {
  getAthleteProgressCache,
  setAthleteProgressCache,
  type AthleteProgressData,
} from "@/lib/athleteProgressCache";
import {
  getAthleteMeasurementDisplay,
  resolveProgressReferenceDateIso,
} from "@/lib/athleteProgressPresentation";
import { getRetestStatus } from "@/lib/programProgress";
import {
  AthleteAppHeader,
  AthleteBottomNavigation,
  athleteAppBackground,
  athleteAppViewport,
} from "@/components/app/AthleteAppChrome";

const PROGRAM_DAYS = 56;
const CHART_WIDTH = 320;
const CHART_TOP = 8;
const CHART_BOTTOM = 80;

const phases = [
  { label: "Fundament", range: "Tag 1–14", start: 1, end: 14 },
  { label: "Skills", range: "Tag 15–28", start: 15, end: 28 },
  { label: "Transfer", range: "Tag 29–42", start: 29, end: 42 },
  { label: "Integration", range: "Tag 43–56", start: 43, end: 56 },
] as const;

interface AdherencePoint {
  day: number;
  rate: number;
  x: number;
  y: number;
}

interface ActivitySnapshot extends FlameSnapshot {
  tasks_completed_count: number;
}

export const buildAdherenceDayLabels = (
  points: AdherencePoint[],
  daysAvailable: number,
  referenceDateIso: string,
): string[] => {
  const referenceDate = new Date(referenceDateIso);
  return points.map((point) =>
    format(addDays(referenceDate, point.day - Math.max(1, daysAvailable)), "EE", { locale: de }),
  );
};

export const buildSevenDayAdherencePoints = (
  completedDayNumbers: number[],
  daysAvailable: number,
): AdherencePoint[] => {
  const endDay = Math.max(1, Math.min(PROGRAM_DAYS, daysAvailable || 1));
  const startDay = Math.max(1, endDay - 6);
  const completed = new Set(
    completedDayNumbers.filter((day) => day >= 1 && day <= endDay),
  );
  const days = Array.from(
    { length: endDay - startDay + 1 },
    (_, index) => startDay + index,
  );

  return days.map((day, index) => {
    const completedThroughDay = Array.from(completed)
      .filter((completedDay) => completedDay <= day)
      .length;
    const rate = day > 0 ? completedThroughDay / day : 0;
    return {
      day,
      rate,
      x: days.length === 1 ? 0 : (index / (days.length - 1)) * CHART_WIDTH,
      y: CHART_BOTTOM - rate * (CHART_BOTTOM - CHART_TOP),
    };
  });
};

const AdherenceChart = ({
  completedDayNumbers,
  daysAvailable,
  referenceDateIso,
}: {
  completedDayNumbers: number[];
  daysAvailable: number;
  referenceDateIso: string;
}) => {
  const points = useMemo(
    () => buildSevenDayAdherencePoints(completedDayNumbers, daysAvailable),
    [completedDayNumbers, daysAvailable],
  );
  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
    .join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},${CHART_BOTTOM} L0,${CHART_BOTTOM} Z`;
  const dayLabels = buildAdherenceDayLabels(points, daysAvailable, referenceDateIso);

  return (
    <div className="relative mt-8">
      <svg
        className="h-auto w-full overflow-visible"
        viewBox="0 0 320 92"
        preserveAspectRatio="none"
        role="img"
        aria-label="Programmtreue der letzten sieben Programmtage"
      >
        <defs>
          <linearGradient id="adherenceArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2EAD89" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#2EAD89" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#adherenceArea)" />
        <motion.path
          d={linePath}
          fill="none"
          stroke="#2EAD89"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </svg>
      <div
        className="mt-1 grid text-[8px] font-medium uppercase tracking-[0.12em] text-white/28"
        style={{ gridTemplateColumns: `repeat(${dayLabels.length}, minmax(0, 1fr))` }}
        aria-hidden="true"
      >
        {dayLabels.map((label, index) => (
          <span
            key={`${points[index].day}-${label}`}
            className={index === 0 ? "text-left" : index === dayLabels.length - 1 ? "text-right" : "text-center"}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
};

const Progress = () => {
  const { user } = useAuth();
  const [progressData, setProgressData] = useState<AthleteProgressData | null>(() =>
    getAthleteProgressCache(user?.id),
  );
  const [loading, setLoading] = useState(() => !getAthleteProgressCache(user?.id));
  const [error, setError] = useState(false);

  const loadActivity = useCallback(async (signal?: AbortSignal) => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const cachedData = getAthleteProgressCache(user.id);
    if (cachedData) {
      setProgressData(cachedData);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError(false);

    try {
      const [today, instance, effectiveStart, measurementStatus] = await Promise.all([
        getEffectiveTodayDate(user.id, signal),
        getOrCreateActiveInstance(user.id, signal),
        getEffectiveProgramStart(user.id, signal),
        getRetestStatus(user.id),
      ]);
      const instanceId = instance?.id ?? null;

      let completionsQuery = supabase
        .from("user_day_completion")
        .select("day_number, completed_at, completion_status, task_completion")
        .eq("user_id", user.id)
        .retry(false);
      completionsQuery = instanceId
        ? completionsQuery.eq("program_instance_id", instanceId)
        : completionsQuery.is("program_instance_id", null);

      let snapshotQuery = supabase
        .from("program_progress_snapshots")
        .select("current_streak, longest_streak, days_available, days_completed, program_day, tasks_completed_count")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(1)
        .retry(false);
      snapshotQuery = instanceId
        ? snapshotQuery.eq("program_instance_id", instanceId)
        : snapshotQuery.is("program_instance_id", null);

      if (signal) {
        completionsQuery = completionsQuery.abortSignal(signal);
        snapshotQuery = snapshotQuery.abortSignal(signal);
      }

      const [{ data: completions, error: completionsError }, { data: snapshots, error: snapshotError }] =
        await Promise.all([completionsQuery, snapshotQuery]);

      if (completionsError) throw completionsError;
      if (snapshotError) throw snapshotError;

      const snapshot = (snapshots?.[0] ?? null) as ActivitySnapshot | null;
      const startDate = instance?.started_at ?? effectiveStart.startDate;
      const dayInfo = getCurrentProgramDay(startDate, today);
      const daysAvailable = dayInfo?.dayNumber ?? snapshot?.days_available ?? 0;
      const activityStats = buildFlameStats({
        completions: (completions ?? []) as FlameCompletionRow[],
        snapshot,
        today,
      });
      const nextStats: FlameStats = {
        ...activityStats,
        daysAvailable,
        programDay: dayInfo?.dayNumber ?? activityStats.programDay,
        completionRate:
          daysAvailable > 0
            ? Math.min(1, activityStats.totalCompletedDays / daysAvailable)
            : activityStats.completionRate,
      };
      const nextData: AthleteProgressData = {
        stats: nextStats,
        activeApplications: Math.max(
          countActiveApplications((completions ?? []) as FlameCompletionRow[]),
          snapshot?.tasks_completed_count ?? 0,
        ),
        referenceDateIso: resolveProgressReferenceDateIso(startDate, today),
        measurementStatus,
      };

      setAthleteProgressCache(user.id, nextStats, {
        activeApplications: nextData.activeApplications,
        referenceDateIso: nextData.referenceDateIso,
        measurementStatus: nextData.measurementStatus,
      });
      setProgressData(nextData);
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === "AbortError") return;
      console.error("development activity load error", loadError);
      if (!getAthleteProgressCache(user.id)) setError(true);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    const controller = new AbortController();
    void loadActivity(controller.signal);
    return () => controller.abort();
  }, [loadActivity]);

  if (error && !progressData) {
    return (
      <div className={athleteAppBackground}>
        <AthleteAppHeader />
        <main className={`${athleteAppViewport} flex min-h-[calc(100dvh-9rem)] items-center justify-center`}>
          <div className="max-w-sm text-center">
            <Target className="mx-auto h-10 w-10 text-white/35" />
            <h1 className="mt-5 text-2xl font-semibold tracking-[-0.035em]">
              Entwicklung gerade nicht verfügbar
            </h1>
            <p className="mt-3 text-sm leading-6 text-white/52">
              Deine Daten bleiben erhalten. Versuch es gleich noch einmal.
            </p>
            <button
              type="button"
              onClick={() => void loadActivity()}
              className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <RefreshCw className="h-4 w-4" />
              Erneut laden
            </button>
          </div>
        </main>
        <AthleteBottomNavigation active="progress" />
      </div>
    );
  }

  if (loading || !progressData) {
    return (
      <div className={athleteAppBackground}>
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_-8%,rgba(46,173,137,0.09),transparent_34%)]" />
        <AthleteAppHeader />
        <main className={athleteAppViewport} aria-busy="true">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            Deine Entwicklung
          </p>
          <h1 className="mt-3 text-[32px] font-semibold leading-none tracking-[-0.045em]">
            Deine Entwicklung.
          </h1>
          <p className="mt-4 text-sm leading-6 text-white/58">
            Nicht als Urteil. Als sichtbare Spur deiner Wiederholungen.
          </p>
          <div className="mt-8 h-[270px] animate-pulse rounded-[28px] border border-white/[0.06] bg-white/[0.025] motion-reduce:animate-none" />
          <div className="mt-8 h-[300px] animate-pulse rounded-[24px] border border-white/[0.055] bg-white/[0.02] motion-reduce:animate-none" />
        </main>
        <AthleteBottomNavigation active="progress" />
      </div>
    );
  }

  const { stats, activeApplications, referenceDateIso, measurementStatus } = progressData;
  const hasProgramStarted = stats.daysAvailable > 0 || stats.programDay !== null;
  const adherencePercent = Math.round(stats.completionRate * 100);
  const measurementDisplay = getAthleteMeasurementDisplay(measurementStatus);

  return (
    <div className={athleteAppBackground}>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_-8%,rgba(46,173,137,0.09),transparent_34%)]" />
      <AthleteAppHeader />

      <main className={athleteAppViewport}>
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            {stats.programDay ? `Tag ${stats.programDay} von 56` : "Deine Entwicklung"}
          </p>
          <h1 className="mt-3 text-[32px] font-semibold leading-none tracking-[-0.045em]">
            Deine Entwicklung.
          </h1>
          <p className="mt-4 max-w-[470px] text-sm leading-6 text-white/58">
            Nicht als Urteil. Als sichtbare Spur deiner Wiederholungen.
          </p>
        </motion.div>

        {!hasProgramStarted ? (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 rounded-[28px] border border-white/[0.07] bg-white/[0.026] p-6"
          >
            <Target className="h-6 w-6 text-primary" />
            <h2 className="mt-5 text-xl font-semibold tracking-[-0.025em]">
              Dein Weg startet mit dem Programm.
            </h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-white/52">
              Sobald dein erster Programmtag verfügbar ist, siehst du hier deine Programmtreue und deinen 56‑Tage‑Weg.
            </p>
          </motion.section>
        ) : (
          <>
            <motion.section
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 overflow-hidden rounded-[28px] border border-white/[0.075] bg-white/[0.028] p-5 sm:p-6"
              aria-labelledby="program-adherence-title"
            >
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p
                    id="program-adherence-title"
                    className="text-[10px] font-semibold uppercase tracking-[0.17em] text-primary"
                  >
                    Programmtreue
                  </p>
                  <p className="mt-3 text-[48px] font-semibold leading-none tracking-[-0.06em]">
                    {adherencePercent}
                    <span className="text-2xl text-white/35">%</span>
                  </p>
                  <p className="mt-2 text-xs text-white/42">
                    {stats.totalCompletedDays} von {stats.daysAvailable} verfügbaren Tagen
                  </p>
                </div>
                <Flame className="h-7 w-7 shrink-0 text-primary" strokeWidth={1.5} />
              </div>
              <AdherenceChart
                completedDayNumbers={stats.completedDayNumbers}
                daysAvailable={stats.daysAvailable}
                referenceDateIso={referenceDateIso}
              />
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="mt-8"
              aria-labelledby="program-path-title"
            >
              <h2
                id="program-path-title"
                className="text-[12px] font-semibold uppercase tracking-[0.15em] text-white/52"
              >
                Dein 56‑Tage‑Weg
              </h2>
              <div className="mt-4 overflow-hidden rounded-[22px] border border-white/[0.065] bg-white/[0.025]">
                {phases.map((phase, index) => {
                  const programDay = stats.programDay ?? 1;
                  const isComplete = programDay > phase.end;
                  const isCurrent = programDay >= phase.start && programDay <= phase.end;
                  return (
                    <div
                      key={phase.label}
                      className={`flex min-h-[66px] items-center gap-4 px-4 py-3 ${
                        index < phases.length - 1 ? "border-b border-white/[0.055]" : ""
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${
                          isComplete
                            ? "border-primary/45 bg-primary text-[#0D0E12]"
                            : isCurrent
                              ? "border-primary/40 bg-primary/[0.08] text-primary"
                              : "border-white/[0.08] text-white/28"
                        }`}
                      >
                        {isComplete ? (
                          <Check className="h-4 w-4" strokeWidth={2.5} />
                        ) : (
                          <span className="text-[10px] font-semibold">{String(index + 1).padStart(2, "0")}</span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-sm font-semibold ${!isComplete && !isCurrent ? "text-white/42" : ""}`}>
                          {phase.label}
                        </span>
                        <span className="mt-1 block text-[10px] text-white/32">{phase.range}</span>
                      </span>
                      {isCurrent && (
                        <span className="rounded-full border border-primary/25 bg-primary/[0.07] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-primary">
                          Jetzt
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.section>

            <section className="mt-8 grid grid-cols-2 gap-3" aria-label="Aktivitätswerte">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
                className="rounded-[22px] border border-white/[0.065] bg-white/[0.025] p-4"
              >
                <RotateCcw className="h-4 w-4 text-primary" />
                <p className="mt-5 text-[28px] font-semibold leading-none tracking-[-0.045em]">
                  {stats.currentStreak}
                </p>
                <p className="mt-2 text-[11px] leading-4 text-white/50">Tage in Folge</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16 }}
                className="rounded-[22px] border border-white/[0.065] bg-white/[0.025] p-4"
              >
                <Target className="h-4 w-4 text-primary" />
                <p className="mt-5 text-[28px] font-semibold leading-none tracking-[-0.045em]">
                  {activeApplications}
                </p>
                <p className="mt-2 text-[11px] leading-4 text-white/50">aktive Anwendungen</p>
              </motion.div>
            </section>

            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-8 border-t border-white/[0.06] pt-5"
            >
              <div className="flex items-start gap-3">
                <Gauge className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <h2 className="text-sm font-semibold">{measurementDisplay.title}</h2>
                  <p className="mt-1 text-xs leading-5 text-white/42">{measurementDisplay.copy}</p>
                </div>
              </div>
            </motion.section>
          </>
        )}
      </main>
      <AthleteBottomNavigation active="progress" />
    </div>
  );
};

export default Progress;
