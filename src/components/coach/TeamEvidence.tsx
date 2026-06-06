import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Lock, AlertTriangle, TrendingUp, BarChart3, Activity, Info, ArrowDown, ArrowUp, Minus, RefreshCw } from "lucide-react";
import { captureAppError } from "@/lib/monitoring";

// Direction per subscale: which direction = improvement
type Dir = "higher_is_better" | "lower_is_better";
const SUBSCALE_DIRECTION: Record<string, Dir> = {
  // CSAI-2R
  cognitive_anxiety: "lower_is_better",
  somatic_anxiety: "lower_is_better",
  self_confidence: "higher_is_better",
  // SMTQ
  confidence: "higher_is_better",
  constancy: "higher_is_better",
  control: "higher_is_better", // reversed at item-level → composite is higher=better
  // Flow
  absorption: "higher_is_better",
  fluency: "higher_is_better",
  // FKS-Besorgnis-Items sind item-level reverse-scored (siehe data/validatedAssessments.ts).
  // Der gespeicherte Subscale-Score ist dadurch so kodiert, dass HÖHER = bessere
  // Regulation unter Besorgnis bedeutet. Direction muss daher higher_is_better sein.
  anxiety: "higher_is_better",
};

const SUBSCALE_LABEL: Record<string, string> = {
  cognitive_anxiety: "Kognitive Angst",
  somatic_anxiety: "Somatische Angst",
  self_confidence: "Selbstvertrauen",
  confidence: "Selbstvertrauen",
  constancy: "Beständigkeit",
  control: "Kontrolle",
  absorption: "Absorption",
  fluency: "Flüssiges Erleben",
  anxiety: "Besorgnis-Regulation",
};

const ASSESSMENT_LABELS: Record<string, string> = {
  csai2r: "Wettkampfangst (CSAI-2R)",
  smtq: "Mentale Stärke (SMTQ)",
  flow_short: "Flow-Kurzskala",
};

interface ChangeRow {
  assessment_type: string;
  subscale: string;
  n_pairs: number;
  avg_pre: number;
  avg_post?: number;
  avg_mid?: number;
  abs_change: number;
  pct_change: number | null;
  cohens_d_z?: number | null;
  sufficient_data: boolean;
  low_confidence?: boolean;
}

interface OutcomeData {
  team_id: string;
  min_n: number;
  total_athletes: number;
  sufficient_data: boolean;
  reason?: string;
  cohort_breakdown: {
    never_started: number;
    only_pre: number;
    pre_and_mid_no_post: number;
    completed_pre_post: number;
  };
  assessment_completion: { pre_n: number; mid_n: number; post_n: number };
  adherence: {
    players_with_progress: number;
    avg_completion_rate: number | null;
    avg_days_completed: number | null;
    avg_days_available: number | null;
    avg_streak: number | null;
    avg_comprehension: number | null;
  } | null;
  changes: { pre_post: ChangeRow[]; pre_mid: ChangeRow[] };
  comprehension: { avg_correct_rate: number | null; total_completed: number; distinct_users: number };
  weekly_trend: Array<{
    week_start: string;
    n_users: number;
    avg_mood: number | null;
    avg_energy: number | null;
    avg_focus: number | null;
    sufficient_data: boolean;
  }>;
  disclaimer: string;
}

function isImprovement(subscale: string, change: number): boolean | null {
  const dir = SUBSCALE_DIRECTION[subscale];
  if (!dir || change === 0) return null;
  return dir === "higher_is_better" ? change > 0 : change < 0;
}

const TeamEvidence = ({ teamId }: { teamId: string }) => {
  const [data, setData] = useState<OutcomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    supabase
      .rpc("compute_team_outcomes", { team_id_param: teamId, min_n: 5 })
      .then(({ data: rpcData, error: rpcError }) => {
        if (cancelled) return;
        if (rpcError) {
          setError("Wirksamkeitsdaten konnten gerade nicht geladen werden.");
          void captureAppError({
            eventName: "coach_evidence_load_failed",
            error: rpcError,
            role: "coach",
            route: "/coach",
            metadata: { source: "compute_team_outcomes" },
          });
        } else {
          setData(rpcData as unknown as OutcomeData);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teamId, reloadKey]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <div className="mb-4 h-5 w-44 rounded-full bg-secondary/70" />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="h-24 animate-pulse rounded-xl bg-secondary/50" />
            <div className="h-24 animate-pulse rounded-xl bg-secondary/50" />
            <div className="h-24 animate-pulse rounded-xl bg-secondary/50" />
          </div>
        </div>
        <div className="h-48 animate-pulse rounded-2xl border border-border/50 bg-card" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-5 text-sm text-muted-foreground">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />
          <div className="min-w-0">
            <p className="font-heading font-semibold text-foreground mb-1">Wirksamkeitsdaten gerade nicht verfügbar</p>
            <p className="leading-relaxed">{error} Die restliche Coach-Übersicht bleibt nutzbar.</p>
            <button
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border/60 px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Erneut laden
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalAthletes = Number(data?.total_athletes ?? 0);
  const minN = Number(data?.min_n ?? 5);

  if (!data || totalAthletes === 0) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card p-6 text-center">
        <BarChart3 className="mx-auto mb-4 h-10 w-10 text-primary" />
        <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
          Noch keine Wirksamkeitsdaten verfügbar
        </h3>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
          Wirksamkeit wird erst sichtbar, wenn Spieler registriert sind und genügend Pre-, Mid- oder Post-Daten vorliegen.
        </p>
      </div>
    );
  }

  const enoughTeam = totalAthletes >= minN;
  const cb = data.cohort_breakdown ?? {
    never_started: 0,
    only_pre: 0,
    pre_and_mid_no_post: 0,
    completed_pre_post: 0,
  };
  const assessmentCompletion = data.assessment_completion ?? { pre_n: 0, mid_n: 0, post_n: 0 };
  const changes = data.changes ?? { pre_post: [], pre_mid: [] };
  const weeklyTrend = data.weekly_trend ?? [];

  const renderChangeRow = (row: ChangeRow, label: "Pre → Post" | "Pre → Mid") => {
    const second = row.avg_post ?? row.avg_mid ?? 0;
    const improved = isImprovement(row.subscale, row.abs_change);
    const Icon = improved === true ? ArrowUp : improved === false ? ArrowDown : Minus;
    const cls = improved === true ? "text-primary" : improved === false ? "text-yellow-400" : "text-muted-foreground";
    return (
      <div key={`${label}-${row.assessment_type}-${row.subscale}`} className="min-w-0 rounded-2xl border border-border/50 bg-card p-4">
        <div className="mb-2 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              {ASSESSMENT_LABELS[row.assessment_type] ?? row.assessment_type}
            </p>
            <p className="text-xs text-muted-foreground">{SUBSCALE_LABEL[row.subscale] ?? row.subscale}</p>
          </div>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
        </div>
        {row.sufficient_data ? (
          <div className="flex items-center gap-3 text-sm flex-wrap">
            <span className="text-muted-foreground">{row.avg_pre} → {second}</span>
            <span className={`font-semibold flex items-center gap-1 ${cls}`}>
              <Icon className="w-3 h-3" />
              {row.abs_change >= 0 ? "+" : ""}{row.abs_change}
              {row.pct_change != null && (
                <span className="text-xs ml-1">({row.pct_change >= 0 ? "+" : ""}{row.pct_change}%)</span>
              )}
            </span>
            {row.cohens_d_z != null && (
              <span className="text-xs text-muted-foreground sm:ml-auto">
                d_z = {row.cohens_d_z}
                {row.low_confidence && " · niedrige Konfidenz"}
              </span>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Zu wenig Paare ({row.n_pairs}/{minN}) für anonymisierte Auswertung.
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="w-full min-w-0 space-y-5">
      {/* Privacy banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-start gap-3">
        <Lock className="w-5 h-5 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground mb-1">Aggregierte Teamdaten</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Du siehst nur Aggregate (mind. {minN} Spieler). Keine Einzelwerte, keine Reflexionen, keine Journale.
          </p>
        </div>
      </div>

      {/* Cohort breakdown */}
      <section>
        <h3 className="font-heading text-sm font-semibold text-foreground mb-3">Teilnahme-Status</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="bg-card border border-border/50 rounded-2xl p-3">
            <p className="text-xs text-muted-foreground">Pre + Post abgeschlossen</p>
            <p className="text-xl font-bold text-foreground">{cb.completed_pre_post}</p>
          </div>
          <div className="bg-card border border-border/50 rounded-2xl p-3">
            <p className="text-xs text-muted-foreground">Pre + Mid, kein Post</p>
            <p className="text-xl font-bold text-foreground">{cb.pre_and_mid_no_post}</p>
          </div>
          <div className="bg-card border border-border/50 rounded-2xl p-3">
            <p className="text-xs text-muted-foreground">Nur Pre</p>
            <p className="text-xl font-bold text-foreground">{cb.only_pre}</p>
          </div>
          <div className="bg-card border border-border/50 rounded-2xl p-3">
            <p className="text-xs text-muted-foreground">Pre-Test offen</p>
            <p className="text-xl font-bold text-foreground">{cb.never_started}</p>
          </div>
        </div>
      </section>

      {/* Assessment counts */}
      <section>
        <h3 className="font-heading text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" /> Assessment-Status
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: "Pre", n: assessmentCompletion.pre_n },
            { label: "Mid", n: assessmentCompletion.mid_n },
            { label: "Post", n: assessmentCompletion.post_n },
          ].map((item) => (
            <div key={item.label} className="bg-card border border-border/50 rounded-2xl p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
              <p className="text-2xl font-bold text-foreground">
                {item.n}<span className="text-xs text-muted-foreground"> / {totalAthletes}</span>
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Adherence */}
      {data.adherence && (
        <section>
          <h3 className="font-heading text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" /> Adherence (Team-Schnitt)
          </h3>
          {!enoughTeam ? (
            <p className="text-xs text-muted-foreground bg-muted/40 rounded-xl p-4">
              Zu wenig Daten für anonymisierte Auswertung (mind. {minN} Spieler).
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="bg-card border border-border/50 rounded-2xl p-4">
                <p className="text-xs text-muted-foreground mb-1">Ø Completion-Rate</p>
                <p className="text-xl font-bold text-foreground">
                  {data.adherence.avg_completion_rate != null
                    ? `${Math.round(data.adherence.avg_completion_rate * 100)}%`
                    : "—"}
                </p>
              </div>
              <div className="bg-card border border-border/50 rounded-2xl p-4">
                <p className="text-xs text-muted-foreground mb-1">Ø Tage absolviert</p>
                <p className="text-xl font-bold text-foreground">
                  {data.adherence.avg_days_completed != null
                    ? `${Number(data.adherence.avg_days_completed).toFixed(1)} / ${
                        data.adherence.avg_days_available != null
                          ? Number(data.adherence.avg_days_available).toFixed(0)
                          : "?"
                      }`
                    : "—"}
                </p>
              </div>
              <div className="bg-card border border-border/50 rounded-2xl p-4">
                <p className="text-xs text-muted-foreground mb-1">Ø Streak</p>
                <p className="text-xl font-bold text-foreground">
                  {data.adherence.avg_streak != null ? Number(data.adherence.avg_streak).toFixed(1) : "—"}
                </p>
              </div>
              <div className="bg-card border border-border/50 rounded-2xl p-4">
                <p className="text-xs text-muted-foreground mb-1">Ø Verständnis</p>
                <p className="text-xl font-bold text-foreground">
                  {data.adherence.avg_comprehension != null
                    ? `${Math.round(data.adherence.avg_comprehension * 100)}%`
                    : "—"}
                </p>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Subscale changes */}
      <section>
        <h3 className="font-heading text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" /> Beobachtete Veränderung pro Subskala
        </h3>
        {changes.pre_post.length === 0 && changes.pre_mid.length === 0 ? (
          <p className="text-xs text-muted-foreground bg-muted/40 rounded-xl p-4">
            Noch keine ausreichenden Pre/Mid- oder Pre/Post-Paare verfügbar.
          </p>
        ) : (
          <div className="space-y-3">
            {changes.pre_post.map((row) => renderChangeRow(row, "Pre → Post"))}
            {changes.pre_mid.map((row) => renderChangeRow(row, "Pre → Mid"))}
          </div>
        )}
      </section>

      {/* Weekly trend */}
      <section>
        <h3 className="font-heading text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" /> Wochentrend (Stimmung / Energie / Fokus)
        </h3>
        {weeklyTrend.length === 0 ? (
          <p className="text-xs text-muted-foreground bg-muted/40 rounded-xl p-4">
            Noch keine Check-in-Daten.
          </p>
        ) : (
          <div className="space-y-2">
            {weeklyTrend.map((w) => (
              <div key={w.week_start} className="flex min-w-0 flex-col gap-2 rounded-xl border border-border/50 bg-card p-3 text-xs sm:flex-row sm:items-center sm:gap-3">
                <span className="text-muted-foreground sm:w-24 sm:shrink-0">{w.week_start}</span>
                {w.sufficient_data ? (
                  <div className="flex min-w-0 flex-1 flex-wrap gap-3">
                    <span>😊 {w.avg_mood ?? "—"}</span>
                    <span>⚡ {w.avg_energy ?? "—"}</span>
                    <span>🎯 {w.avg_focus ?? "—"}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground italic">Zu wenig Daten</span>
                )}
                <span className="text-muted-foreground sm:ml-auto">n={w.n_users}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Missing-data warning */}
      {(cb.never_started > 0 || cb.only_pre > 0 || cb.pre_and_mid_no_post > 0) && (
        <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            <p className="text-foreground font-medium mb-1">Fehlende Daten</p>
            {cb.never_started > 0 && <p>{cb.never_started} Spieler ohne Pre-Test.</p>}
            {cb.only_pre > 0 && <p>{cb.only_pre} Spieler nur mit Pre-Test.</p>}
            {cb.pre_and_mid_no_post > 0 && <p>{cb.pre_and_mid_no_post} Spieler ohne Post-Test.</p>}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-muted/40 border border-border/40 rounded-2xl p-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          {data.disclaimer ?? "Wirksamkeitsdaten werden nur aggregiert angezeigt und erst ab ausreichender Gruppengröße belastbar."}
        </p>
      </div>
    </div>
  );
};

export default TeamEvidence;
