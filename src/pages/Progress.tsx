import { useCallback, useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Loader2, Sparkles, BarChart3, FileText, Activity, Gauge, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { REWIRE_DEVELOPMENT_INDEX } from "@/content/questionnaireV2";
import { buildDeterministicProgressSummary } from "@/lib/deterministicProgressSummary";
import { scoreDevelopmentIndex, type DevelopmentIndexScore } from "@/lib/developmentIndexScoring";
import {
  AthleteAppHeader,
  AthleteBottomNavigation,
  athleteAppBackground,
  athleteAppViewport,
} from "@/components/app/AthleteAppChrome";

interface ProfileData {
  timing: string;
  answers: Record<string, string | string[] | number>;
  created_at: string;
}

const scoreLabels: Array<{ key: keyof DevelopmentIndexScore["subscores"]; short: string; full: string }> = [
  { key: "fehler_und_rueckkehr", short: "Fehler", full: "Fehler & Rückkehr" },
  { key: "druck_und_bewertung", short: "Druck", full: "Druck & Bewertung" },
  { key: "prozess_und_praesenz", short: "Fokus", full: "Prozess & Präsenz" },
  { key: "growth_und_recovery", short: "Growth", full: "Growth & Recovery" },
  { key: "team_und_purpose", short: "Team", full: "Team & Purpose" },
];

const DevelopmentProfileChart = ({
  baseline,
  retest,
}: {
  baseline: DevelopmentIndexScore;
  retest: DevelopmentIndexScore | null;
}) => {
  const width = 520;
  const height = 190;
  const chartTop = 14;
  const chartBottom = 138;
  const xStep = width / (scoreLabels.length - 1);
  const yFor = (value: number) => chartBottom - (value / 100) * (chartBottom - chartTop);
  const pointsFor = (score: DevelopmentIndexScore) =>
    scoreLabels
      .map((label, index) => {
        const value = score.subscores[label.key];
        return typeof value === "number" ? { x: index * xStep, y: yFor(value), value } : null;
      })
      .filter((point): point is { x: number; y: number; value: number } => point !== null);
  const pathFor = (score: DevelopmentIndexScore) => {
    const points = pointsFor(score);
    return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
  };
  const active = retest ?? baseline;
  const activePoints = pointsFor(active);
  const activePath = pathFor(active);
  const baselinePath = pathFor(baseline);
  const areaPath = activePoints.length > 1
    ? `${activePath} L${activePoints[activePoints.length - 1].x},${chartBottom} L${activePoints[0].x},${chartBottom} Z`
    : "";

  return (
    <div className="mt-7">
      <div className="mb-4 flex flex-wrap items-center gap-4 text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
        <span className="flex items-center gap-2"><span className="h-0.5 w-5 bg-white/35" />Baseline</span>
        {retest && <span className="flex items-center gap-2 text-primary"><span className="h-0.5 w-5 bg-primary" />Re-Test</span>}
      </div>
      <svg
        className="h-auto w-full overflow-visible"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={retest ? "Baseline und Re-Test in fünf Entwicklungsbereichen" : "Baseline in fünf Entwicklungsbereichen"}
      >
        <defs>
          <linearGradient id="developmentProfileArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2EAD89" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#2EAD89" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map((value) => (
          <line
            key={value}
            x1="0"
            x2={width}
            y1={yFor(value)}
            y2={yFor(value)}
            stroke="rgba(255,255,255,.055)"
            strokeWidth="1"
          />
        ))}
        {areaPath && <path d={areaPath} fill="url(#developmentProfileArea)" />}
        {retest && (
          <path d={baselinePath} fill="none" stroke="rgba(255,255,255,.34)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        )}
        <motion.path
          d={activePath}
          fill="none"
          stroke="#2EAD89"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
        {activePoints.map((point) => (
          <g key={`${point.x}-${point.value}`}>
            <circle cx={point.x} cy={point.y} r="8" fill="#0D0E12" stroke="#2EAD89" strokeWidth="3" />
            <title>{point.value} von 100</title>
          </g>
        ))}
        {scoreLabels.map((label, index) => (
          <text
            key={label.key}
            x={index * xStep}
            y="176"
            textAnchor={index === 0 ? "start" : index === scoreLabels.length - 1 ? "end" : "middle"}
            fill="rgba(255,255,255,.48)"
            fontSize="11"
          >
            {label.short}
          </text>
        ))}
      </svg>
    </div>
  );
};

const Progress = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [baseline, setBaseline] = useState<ProfileData | null>(null);
  const [retest, setRetest] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<string | null>(null);
  const [hasSummary, setHasSummary] = useState(false);

  const deepQuestions = useMemo(
    () =>
      REWIRE_DEVELOPMENT_INDEX.items
        .filter((item) => item.includeInScore)
        .map((item) => ({ id: item.id, question: item.text, type: item.type })),
    []
  );
  const baselineScore = useMemo(
    () => baseline ? scoreDevelopmentIndex(baseline.answers as Record<string, string | string[] | number>, "pre") : null,
    [baseline],
  );
  const retestScore = useMemo(
    () => retest ? scoreDevelopmentIndex(retest.answers as Record<string, string | string[] | number>, "post") : null,
    [retest],
  );

  const loadProfiles = useCallback(async () => {
    if (!user?.id) return;
    const { getOrCreateActiveInstance } = await import("@/lib/programInstance");
    const instance = await getOrCreateActiveInstance(user.id);
    let query = supabase
      .from("deep_profile_assessments")
      .select("timing, answers, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    if (instance?.id) query = query.eq("program_instance_id", instance.id);
    const { data } = await query;

    if (data) {
      const b = data.find((d) => d.timing === "pre" || d.timing === "baseline");
      const r = data.find((d) => d.timing === "post" || d.timing === "retest");
      if (b) setBaseline({ ...b, answers: b.answers as unknown as ProfileData["answers"] });
      if (r) setRetest({ ...r, answers: r.answers as unknown as ProfileData["answers"] });
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void loadProfiles();
  }, [loadProfiles]);

  useEffect(() => {
    if (baselineScore && retestScore) {
      const result = buildDeterministicProgressSummary(
        baselineScore.itemScores,
        retestScore.itemScores,
        deepQuestions
      );
      setSummary(result.summary);
      setHasSummary(result.hasEnoughData);
    }
  }, [baselineScore, retestScore, deepQuestions]);

  const formatAnswer = (answer: string | string[] | number | undefined) => {
    if (answer === undefined) return "—";
    if (Array.isArray(answer)) return answer.join(", ");
    return String(answer);
  };

  const getScaleDiff = (baseVal: unknown, retestVal: unknown) => {
    const b = typeof baseVal === "number" ? baseVal : 0;
    const r = typeof retestVal === "number" ? retestVal : 0;
    const diff = r - b;
    if (diff > 0) return { text: `+${diff}`, color: "text-primary" };
    if (diff < 0) return { text: `${diff}`, color: "text-primary" };
    return { text: "±0", color: "text-muted-foreground" };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!baseline) {
    return (
      <div className={athleteAppBackground}>
        <AthleteAppHeader />
        <main className={`${athleteAppViewport} flex min-h-[calc(100dvh-9rem)] items-center justify-center`}>
          <div className="max-w-md text-center">
            <BarChart3 className="mx-auto mb-6 h-12 w-12 text-white/35" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Entwicklung</p>
            <h2 className="mt-3 text-[30px] font-semibold leading-tight tracking-[-0.04em]">Noch kein Baseline-Profil</h2>
            <p className="mt-4 text-sm leading-6 text-white/55">Erstelle zuerst dein Deep-Dive Baseline-Profil, um später deinen Fortschritt zu sehen.</p>
            <button onClick={() => navigate("/deep-profile?timing=baseline")} className="mt-8 min-h-12 rounded-2xl bg-primary px-8 py-3 font-semibold text-primary-foreground hover:shadow-glow">
              Baseline erstellen
            </button>
          </div>
        </main>
        <AthleteBottomNavigation active="progress" />
      </div>
    );
  }

  return (
    <div className={athleteAppBackground}>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_-8%,rgba(46,173,137,0.09),transparent_34%)]" />
      <AthleteAppHeader />

      <main className={athleteAppViewport}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Deine Entwicklung</p>
          <h1 className="mt-3 text-[32px] font-semibold leading-none tracking-[-0.045em]">Deine Entwicklung.</h1>
          <p className="mt-4 max-w-[430px] text-sm leading-6 text-white/58">
            {retest
              ? "Deine Baseline und dein Re-Test als sichtbarer Vergleich."
              : "Dein Ausgangspunkt. Der Re-Test ergänzt den Vergleich nach Abschluss des Programms."}
          </p>
        </motion.div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)]">
          {baselineScore && (
            <motion.section
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-[28px] border border-white/[0.075] bg-white/[0.028] p-5 sm:p-6"
              aria-labelledby="development-index-title"
            >
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p id="development-index-title" className="text-[10px] font-semibold uppercase tracking-[0.17em] text-primary">
                    Interner Entwicklungsindex
                  </p>
                  <p className="mt-3 text-[44px] font-semibold leading-none tracking-[-0.055em]">
                    {retestScore?.overall0to100 ?? baselineScore.overall0to100 ?? "—"}
                    <span className="text-2xl text-white/42">/100</span>
                  </p>
                  <p className="mt-2 text-xs text-white/48">
                    {retest ? "Aktueller Re-Test" : "Gespeicherte Baseline"} · {retestScore?.validItemCount ?? baselineScore.validItemCount} Antworten
                  </p>
                </div>
                <Activity className="h-7 w-7 shrink-0 text-primary" strokeWidth={1.5} />
              </div>
              <DevelopmentProfileChart baseline={baselineScore} retest={retestScore} />
              <p className="mt-3 text-[10px] leading-4 text-white/38">
                Fünf Bereiche des bestehenden Rewire Development Index. Höher bedeutet innerhalb dieses Index eine günstigere Ausprägung.
              </p>
            </motion.section>
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="rounded-[22px] border border-white/[0.065] bg-white/[0.025] p-4"
            >
              <Gauge className="h-4 w-4 text-primary" />
              <p className="mt-5 text-[24px] font-semibold leading-none tracking-[-0.04em]">
                {baseline.created_at ? new Date(baseline.created_at).toLocaleDateString("de-DE") : "—"}
              </p>
              <p className="mt-2 text-[11px] text-white/50">Baseline gespeichert</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 }}
              className="rounded-[22px] border border-white/[0.065] bg-white/[0.025] p-4"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="mt-5 text-[24px] font-semibold leading-none tracking-[-0.04em]">
                {retest?.created_at ? new Date(retest.created_at).toLocaleDateString("de-DE") : "Offen"}
              </p>
              <p className="mt-2 text-[11px] text-white/50">{retest ? "Re-Test gespeichert" : "Nächster Vergleich"}</p>
            </motion.div>
          </div>
        </div>

        {retest && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 rounded-[22px] border border-white/[0.065] bg-white/[0.025] p-5"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Verlaufszusammenfassung</h2>
            </div>
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-white/58">
              {summary ?? "Noch nicht genug Daten für eine Verlaufszusammenfassung."}
            </p>
            <p className="mt-3 text-[10px] text-white/35">
              {hasSummary ? "Deterministische Auswertung aus deinen Antworten." : "Für diese Zusammenfassung fehlen noch Vergleichswerte."} Keine Diagnose.
            </p>
          </motion.section>
        )}

        {baselineScore && (
          <section className="mt-9" aria-labelledby="development-areas-title">
            <h2 id="development-areas-title" className="text-[12px] font-semibold uppercase tracking-[0.15em] text-white/52">
              Deine fünf Bereiche
            </h2>
            <div className="mt-3 overflow-hidden rounded-[22px] border border-white/[0.065] bg-white/[0.025]">
              {scoreLabels.map((label, index) => {
                const baselineValue = baselineScore.subscores[label.key];
                const retestValue = retestScore?.subscores[label.key] ?? null;
                return (
                  <div key={label.key} className={`flex min-h-[70px] items-center gap-4 px-4 py-3.5 ${index < scoreLabels.length - 1 ? "border-b border-white/[0.055]" : ""}`}>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/[0.07] text-[10px] font-semibold text-primary">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{label.full}</span>
                      <span className="mt-1 block text-[11px] text-white/45">
                        Baseline {baselineValue ?? "—"}{retest ? ` · Re-Test ${retestValue ?? "—"}` : ""}
                      </span>
                    </span>
                    {retest && typeof baselineValue === "number" && typeof retestValue === "number" && (
                      <span className="text-xs font-semibold text-primary">
                        {retestValue - baselineValue > 0 ? "+" : ""}{retestValue - baselineValue}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="mt-9" aria-labelledby="answer-details-title">
          <h2 id="answer-details-title" className="text-[12px] font-semibold uppercase tracking-[0.15em] text-white/52">
            Antworten im Detail
          </h2>
          <div className="mt-3 space-y-3">
            {deepQuestions.map((question, index) => {
              const baseAnswer = baseline.answers[question.id];
              const retestAnswer = retest?.answers[question.id];
              const diff = question.type === "scale" && retest ? getScaleDiff(baseAnswer, retestAnswer) : null;
              return (
                <motion.details
                  key={question.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.025, 0.25) }}
                  className="group rounded-[20px] border border-white/[0.06] bg-white/[0.022] open:bg-white/[0.03]"
                >
                  <summary className="flex min-h-[68px] cursor-pointer list-none items-center gap-3 px-4 py-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
                    <span className="min-w-0 flex-1 text-sm font-medium leading-5">{question.question}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-white/28 transition-transform group-open:rotate-90" />
                  </summary>
                  <div className={`grid gap-4 border-t border-white/[0.055] px-4 pb-4 pt-4 ${retest ? "sm:grid-cols-2" : ""}`}>
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/45">Baseline</span>
                      <div className="mt-2 rounded-xl bg-white/[0.035] p-3">
                        {question.type === "scale" ? (
                          <div className="flex items-center gap-3">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.055]">
                              <div className="h-full rounded-full bg-white/35" style={{ width: `${((baseAnswer as number) || 0) * 10}%` }} />
                            </div>
                            <span className="text-sm font-semibold">{baseAnswer ?? "—"}</span>
                          </div>
                        ) : <p className="text-xs leading-5 text-white/55">{formatAnswer(baseAnswer)}</p>}
                      </div>
                    </div>
                    {retest && (
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-primary">Re-Test</span>
                          {diff && <span className={`text-xs font-semibold ${diff.color}`}>{diff.text}</span>}
                        </div>
                        <div className="mt-2 rounded-xl bg-primary/[0.045] p-3">
                          {question.type === "scale" ? (
                            <div className="flex items-center gap-3">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.055]">
                                <div className="h-full rounded-full bg-primary" style={{ width: `${((retestAnswer as number) || 0) * 10}%` }} />
                              </div>
                              <span className="text-sm font-semibold">{retestAnswer ?? "—"}</span>
                            </div>
                          ) : <p className="text-xs leading-5 text-white/55">{formatAnswer(retestAnswer)}</p>}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.details>
              );
            })}
          </div>
        </section>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 rounded-xl border border-white/[0.055] bg-white/[0.02] p-4">
          <div className="flex items-start gap-3">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-white/38" />
            <p className="text-xs leading-5 text-white/45">
              Der Rewire Development Index beschreibt beobachtete Veränderungen in deinen Antworten. Er ist keine Diagnose und kein medizinischer Messwert.
            </p>
          </div>
        </motion.div>

        {!retest && (
          <div className="mt-8 text-center">
            <p className="text-xs text-white/42">Der Re-Test wird nach Ablauf deines 56-Tage-Programms freigeschaltet.</p>
          </div>
        )}
      </main>
      <AthleteBottomNavigation active="progress" />
    </div>
  );
};

export default Progress;
