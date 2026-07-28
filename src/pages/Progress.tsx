import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Flame, RefreshCw, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  buildFlameStats,
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
} from "@/lib/athleteProgressCache";
import FlameProgressGrid from "@/components/dashboard/FlameProgressGrid";
import {
  AthleteAppHeader,
  AthleteBottomNavigation,
  athleteAppBackground,
  athleteAppViewport,
} from "@/components/app/AthleteAppChrome";

const PROGRAM_DAYS = 56;
const CHART_WIDTH = 520;
const CHART_HEIGHT = 150;
const CHART_TOP = 16;
const CHART_BOTTOM = 116;

const phases = [
  { label: "Fundament", range: "Tag 1–14", start: 1, end: 14 },
  { label: "Skills", range: "Tag 15–28", start: 15, end: 28 },
  { label: "Transfer", range: "Tag 29–42", start: 29, end: 42 },
  { label: "Integration", range: "Tag 43–56", start: 43, end: 56 },
] as const;

interface ActivityPoint {
  day: number;
  total: number;
  x: number;
  y: number;
}

export const buildCumulativeActivityPoints = (
  completedDayNumbers: number[],
  daysAvailable: number,
): ActivityPoint[] => {
  const visibleDays = Math.max(1, Math.min(PROGRAM_DAYS, daysAvailable || 1));
  const completed = new Set(
    completedDayNumbers.filter((day) => day >= 1 && day <= visibleDays),
  );
  const finalTotal = Math.max(1, completed.size);
  let total = 0;

  return Array.from({ length: visibleDays }, (_, index) => {
    const day = index + 1;
    if (completed.has(day)) total += 1;
    return {
      day,
      total,
      x: visibleDays === 1 ? 0 : (index / (visibleDays - 1)) * CHART_WIDTH,
      y: CHART_BOTTOM - (total / finalTotal) * (CHART_BOTTOM - CHART_TOP),
    };
  });
};

const ActivityChart = ({
  completedDayNumbers,
  daysAvailable,
}: {
  completedDayNumbers: number[];
  daysAvailable: number;
}) => {
  const points = useMemo(
    () => buildCumulativeActivityPoints(completedDayNumbers, daysAvailable),
    [completedDayNumbers, daysAvailable],
  );
  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
    .join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},${CHART_BOTTOM} L0,${CHART_BOTTOM} Z`;

  return (
    <div className="mt-7">
      <svg
        className="h-auto w-full overflow-visible"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        role="img"
        aria-label={`${completedDayNumbers.length} aktive Tage in ${Math.max(daysAvailable, 0)} verfügbaren Programmtagen`}
      >
        <defs>
          <linearGradient id="activityArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2EAD89" stopOpacity="0.26" />
            <stop offset="100%" stopColor="#2EAD89" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[CHART_TOP, (CHART_TOP + CHART_BOTTOM) / 2, CHART_BOTTOM].map((y) => (
          <line
            key={y}
            x1="0"
            x2={CHART_WIDTH}
            y1={y}
            y2={y}
            stroke="rgba(255,255,255,.055)"
            strokeWidth="1"
          />
        ))}
        <path d={areaPath} fill="url(#activityArea)" />
        <motion.path
          d={linePath}
          fill="none"
          stroke="#2EAD89"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r="6"
          fill="#0D0E12"
          stroke="#2EAD89"
          strokeWidth="3"
        />
        <text x="0" y="143" fill="rgba(255,255,255,.38)" fontSize="11">
          Tag 1
        </text>
        <text
          x={CHART_WIDTH}
          y="143"
          textAnchor="end"
          fill="rgba(255,255,255,.38)"
          fontSize="11"
        >
          Heute
        </text>
      </svg>
    </div>
  );
};

const Progress = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<FlameStats | null>(() =>
    getAthleteProgressCache(user?.id),
  );
  const [loading, setLoading] = useState(() => !getAthleteProgressCache(user?.id));
  const [error, setError] = useState(false);

  const loadActivity = useCallback(async (signal?: AbortSignal) => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const cachedStats = getAthleteProgressCache(user.id);
    if (cachedStats) {
      setStats(cachedStats);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError(false);

    try {
      const [today, instance, effectiveStart] = await Promise.all([
        getEffectiveTodayDate(user.id, signal),
        getOrCreateActiveInstance(user.id, signal),
        getEffectiveProgramStart(user.id, signal),
      ]);
      const instanceId = instance?.id ?? null;

      let completionsQuery = supabase
        .from("user_day_completion")
        .select("day_number, completed_at, completion_status")
        .eq("user_id", user.id)
        .retry(false);
      completionsQuery = instanceId
        ? completionsQuery.eq("program_instance_id", instanceId)
        : completionsQuery.is("program_instance_id", null);

      let snapshotQuery = supabase
        .from("program_progress_snapshots")
        .select("current_streak, longest_streak, days_available, days_completed, program_day")
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

      const snapshot = (snapshots?.[0] ?? null) as FlameSnapshot | null;
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
      setAthleteProgressCache(user.id, nextStats);
      setStats(nextStats);
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

  if (error && !stats) {
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

  if (loading || !stats) {
    return (
      <div className={athleteAppBackground}>
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_-8%,rgba(46,173,137,0.09),transparent_34%)]" />
        <AthleteAppHeader />
        <main className={athleteAppViewport} aria-busy="true">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              Deine Entwicklung
            </p>
            <h1 className="mt-3 text-[32px] font-semibold leading-none tracking-[-0.045em]">
              Was du investierst, wird sichtbar.
            </h1>
            <p className="mt-4 max-w-[470px] text-sm leading-6 text-white/58">
              Keine Bewertung deiner Leistung. Hier zählt, dass du wiederkommst und das Gelernte wiederholst.
            </p>
          </div>
          <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(250px,0.65fr)]">
            <div className="h-[270px] animate-pulse rounded-[28px] border border-white/[0.06] bg-white/[0.025] motion-reduce:animate-none" />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
              <div className="min-h-[125px] animate-pulse rounded-[22px] border border-white/[0.055] bg-white/[0.02] motion-reduce:animate-none" />
              <div className="min-h-[125px] animate-pulse rounded-[22px] border border-white/[0.055] bg-white/[0.02] motion-reduce:animate-none" />
            </div>
          </div>
          <div className="mt-6 h-[300px] animate-pulse rounded-[26px] border border-white/[0.055] bg-white/[0.02] motion-reduce:animate-none" />
        </main>
        <AthleteBottomNavigation active="progress" />
      </div>
    );
  }

  const hasProgramStarted = stats.daysAvailable > 0 || stats.programDay !== null;

  return (
    <div className={athleteAppBackground}>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_-8%,rgba(46,173,137,0.09),transparent_34%)]" />
      <AthleteAppHeader />

      <main className={athleteAppViewport}>
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            Deine Entwicklung
          </p>
          <h1 className="mt-3 text-[32px] font-semibold leading-none tracking-[-0.045em]">
            Was du investierst, wird sichtbar.
          </h1>
          <p className="mt-4 max-w-[470px] text-sm leading-6 text-white/58">
            Keine Bewertung deiner Leistung. Hier zählt, dass du wiederkommst und das Gelernte wiederholst.
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
              Sobald dein erster Programmtag verfügbar ist, siehst du hier deine aktiven Tage und deinen 56‑Tage‑Weg.
            </p>
          </motion.section>
        ) : (
          <>
            <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(250px,0.65fr)]">
              <motion.section
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                className="overflow-hidden rounded-[28px] border border-white/[0.075] bg-white/[0.028] p-5 sm:p-6"
                aria-labelledby="active-days-title"
              >
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <p
                      id="active-days-title"
                      className="text-[10px] font-semibold uppercase tracking-[0.17em] text-primary"
                    >
                      Aktive Tage
                    </p>
                    <p className="mt-3 text-[48px] font-semibold leading-none tracking-[-0.06em]">
                      {stats.totalCompletedDays}
                    </p>
                    <p className="mt-2 text-xs text-white/48">
                      von {stats.daysAvailable} verfügbaren Programmtagen
                    </p>
                  </div>
                  <Flame className="h-7 w-7 shrink-0 text-primary" strokeWidth={1.5} />
                </div>
                <ActivityChart
                  completedDayNumbers={stats.completedDayNumbers}
                  daysAvailable={stats.daysAvailable}
                />
              </motion.section>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
                <motion.section
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 }}
                  className="rounded-[22px] border border-white/[0.065] bg-white/[0.025] p-4"
                >
                  <Flame className="h-4 w-4 text-primary" />
                  <p className="mt-5 text-[28px] font-semibold leading-none tracking-[-0.045em]">
                    {stats.currentStreak}
                  </p>
                  <p className="mt-2 text-[11px] leading-4 text-white/50">Tage in Folge</p>
                </motion.section>
                <motion.section
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.14 }}
                  className="rounded-[22px] border border-white/[0.065] bg-white/[0.025] p-4"
                >
                  <Target className="h-4 w-4 text-primary" />
                  <p className="mt-5 text-[28px] font-semibold leading-none tracking-[-0.045em]">
                    {stats.longestStreak}
                  </p>
                  <p className="mt-2 text-[11px] leading-4 text-white/50">Längste Serie</p>
                </motion.section>
              </div>
            </div>

            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-6 rounded-[26px] border border-white/[0.07] bg-white/[0.026] p-5 sm:p-6"
              aria-labelledby="program-path-title"
            >
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-primary">
                    Programm
                  </p>
                  <h2 id="program-path-title" className="mt-2 text-xl font-semibold tracking-[-0.03em]">
                    Dein 56‑Tage‑Weg
                  </h2>
                </div>
                <p className="text-xs font-medium text-white/45">Tag {stats.programDay ?? 1}</p>
              </div>

              <div className="mt-6 overflow-hidden rounded-[20px] border border-white/[0.06]">
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
                              ? "border-primary/50 bg-primary/[0.09] text-primary"
                              : "border-white/[0.08] bg-white/[0.025] text-white/30"
                        }`}
                      >
                        {isComplete ? (
                          <Check className="h-4 w-4" strokeWidth={2.5} />
                        ) : (
                          <span className="text-[10px] font-semibold">{String(index + 1).padStart(2, "0")}</span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-sm font-semibold ${isCurrent ? "text-white" : isComplete ? "text-white/72" : "text-white/38"}`}>
                          {phase.label}
                        </span>
                        <span className="mt-1 block text-[11px] text-white/38">{phase.range}</span>
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

            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 }}
              className="mt-6 rounded-[26px] border border-white/[0.07] bg-white/[0.026] p-5 sm:p-6"
              aria-labelledby="consistency-title"
            >
              <div className="mb-5">
                <h2 id="consistency-title" className="text-base font-semibold tracking-[-0.02em]">
                  Deine Wiederholungen
                </h2>
                <p className="mt-2 text-xs leading-5 text-white/48">
                  Jeder markierte Tag steht für einen abgeschlossenen Daily Flow.
                </p>
              </div>
              <FlameProgressGrid
                completedDayNumbers={stats.completedDayNumbers}
                programDay={stats.programDay}
                daysAvailable={stats.daysAvailable}
              />
              <p className="mt-5 text-xs leading-5 text-white/42">
                Eine Lücke ist kein Urteil. Entscheidend ist die nächste Wiederholung.
              </p>
            </motion.section>
          </>
        )}
      </main>
      <AthleteBottomNavigation active="progress" />
    </div>
  );
};

export default Progress;
