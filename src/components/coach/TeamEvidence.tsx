import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Lock, AlertTriangle, TrendingUp, BarChart3, Activity, Loader2, Info } from "lucide-react";

interface OutcomeData {
  team_id: string;
  min_n: number;
  total_athletes: number;
  sufficient_data: boolean;
  reason?: string;
  assessment_completion: { pre_n: number; mid_n: number; post_n: number };
  adherence: {
    players_with_progress: number;
    avg_completion_rate: number | null;
    avg_days_completed: number | null;
    avg_days_available: number | null;
    avg_streak: number | null;
    avg_comprehension: number | null;
  } | null;
  changes: {
    pre_post: Array<{
      assessment_type: string;
      n_pairs: number;
      avg_pre: number;
      avg_post: number;
      abs_change: number;
      pct_change: number | null;
      cohens_d: number | null;
      sufficient_data: boolean;
    }>;
    pre_mid: Array<{
      assessment_type: string;
      n_pairs: number;
      avg_pre: number;
      avg_mid: number;
      abs_change: number;
      pct_change: number | null;
      sufficient_data: boolean;
    }>;
  };
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

const ASSESSMENT_LABELS: Record<string, string> = {
  csai2r: "Wettkampfangst (CSAI-2R)",
  smtq: "Mentale Stärke (SMTQ)",
  flow_short: "Flow-Kurzskala",
};

const TeamEvidence = ({ teamId }: { teamId: string }) => {
  const [data, setData] = useState<OutcomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    supabase
      .rpc("compute_team_outcomes", { team_id_param: teamId, min_n: 5 })
      .then(({ data: rpcData, error: rpcError }) => {
        if (cancelled) return;
        if (rpcError) {
          setError(rpcError.message);
        } else {
          setData(rpcData as unknown as OutcomeData);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        {error ?? "Keine Daten verfügbar."}
      </div>
    );
  }

  const enoughTeam = data.total_athletes >= data.min_n;

  return (
    <div className="space-y-5">
      {/* Privacy banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-start gap-3">
        <Lock className="w-5 h-5 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground mb-1">Aggregierte Teamdaten</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Du siehst nur Aggregate (mind. {data.min_n} Spieler). Keine Einzelwerte, keine Reflexionen, keine Journale.
          </p>
        </div>
      </div>

      {/* Assessment-Status */}
      <section>
        <h3 className="font-heading text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" /> Assessment-Status
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Pre", n: data.assessment_completion.pre_n },
            { label: "Mid", n: data.assessment_completion.mid_n },
            { label: "Post", n: data.assessment_completion.post_n },
          ].map((item) => (
            <div key={item.label} className="bg-card border border-border/50 rounded-2xl p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
              <p className="text-2xl font-bold text-foreground">
                {item.n}
                <span className="text-xs text-muted-foreground"> / {data.total_athletes}</span>
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
              Zu wenig Daten für anonymisierte Auswertung (mind. {data.min_n} Spieler).
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
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

      {/* Pre/Post + Pre/Mid Veränderungen */}
      <section>
        <h3 className="font-heading text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" /> Beobachtete Veränderung (Pre/Mid/Post)
        </h3>
        {data.changes.pre_post.length === 0 && data.changes.pre_mid.length === 0 ? (
          <p className="text-xs text-muted-foreground bg-muted/40 rounded-xl p-4">
            Noch keine Pre/Mid- oder Pre/Post-Paare verfügbar.
          </p>
        ) : (
          <div className="space-y-3">
            {data.changes.pre_post.map((row) => (
              <div key={`pp-${row.assessment_type}`} className="bg-card border border-border/50 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-foreground">
                    {ASSESSMENT_LABELS[row.assessment_type] ?? row.assessment_type}
                  </p>
                  <span className="text-[10px] uppercase tracking-wide text-primary">Pre → Post</span>
                </div>
                {row.sufficient_data ? (
                  <div className="flex items-baseline gap-3 text-sm">
                    <span className="text-muted-foreground">{row.avg_pre} → {row.avg_post}</span>
                    <span className={`font-semibold ${row.abs_change >= 0 ? "text-primary" : "text-yellow-400"}`}>
                      {row.abs_change >= 0 ? "+" : ""}
                      {row.abs_change}{" "}
                      {row.pct_change != null && (
                        <span className="text-xs">({row.pct_change >= 0 ? "+" : ""}{row.pct_change}%)</span>
                      )}
                    </span>
                    {row.cohens_d != null && (
                      <span className="text-xs text-muted-foreground ml-auto">d = {row.cohens_d}</span>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Zu wenig Paare ({row.n_pairs}/{data.min_n}) für anonymisierte Auswertung.
                  </p>
                )}
              </div>
            ))}
            {data.changes.pre_mid.map((row) => (
              <div key={`pm-${row.assessment_type}`} className="bg-card border border-border/50 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-foreground">
                    {ASSESSMENT_LABELS[row.assessment_type] ?? row.assessment_type}
                  </p>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Pre → Mid</span>
                </div>
                {row.sufficient_data ? (
                  <div className="flex items-baseline gap-3 text-sm">
                    <span className="text-muted-foreground">{row.avg_pre} → {row.avg_mid}</span>
                    <span className={`font-semibold ${row.abs_change >= 0 ? "text-primary" : "text-yellow-400"}`}>
                      {row.abs_change >= 0 ? "+" : ""}
                      {row.abs_change}{" "}
                      {row.pct_change != null && (
                        <span className="text-xs">({row.pct_change >= 0 ? "+" : ""}{row.pct_change}%)</span>
                      )}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Zu wenig Paare ({row.n_pairs}/{data.min_n}).
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Weekly trend */}
      <section>
        <h3 className="font-heading text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" /> Wochentrend (Stimmung / Energie / Fokus)
        </h3>
        {data.weekly_trend.length === 0 ? (
          <p className="text-xs text-muted-foreground bg-muted/40 rounded-xl p-4">
            Noch keine Check-in-Daten.
          </p>
        ) : (
          <div className="space-y-2">
            {data.weekly_trend.map((w) => (
              <div key={w.week_start} className="bg-card border border-border/50 rounded-xl p-3 flex items-center gap-3 text-xs">
                <span className="text-muted-foreground w-24 shrink-0">{w.week_start}</span>
                {w.sufficient_data ? (
                  <div className="flex gap-3 flex-1">
                    <span>😊 {w.avg_mood ?? "—"}</span>
                    <span>⚡ {w.avg_energy ?? "—"}</span>
                    <span>🎯 {w.avg_focus ?? "—"}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground italic">Zu wenig Daten</span>
                )}
                <span className="text-muted-foreground ml-auto">n={w.n_users}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Missing-data warnings */}
      {(data.assessment_completion.pre_n < data.total_athletes ||
        data.assessment_completion.post_n < data.assessment_completion.pre_n) && (
        <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            <p className="text-foreground font-medium mb-1">Fehlende Daten</p>
            {data.assessment_completion.pre_n < data.total_athletes && (
              <p>{data.total_athletes - data.assessment_completion.pre_n} Spieler ohne Pre-Test.</p>
            )}
            {data.assessment_completion.post_n < data.assessment_completion.pre_n && (
              <p>{data.assessment_completion.pre_n - data.assessment_completion.post_n} Pre-Tester ohne Post-Test.</p>
            )}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-muted/40 border border-border/40 rounded-2xl p-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground leading-relaxed">{data.disclaimer}</p>
      </div>
    </div>
  );
};

export default TeamEvidence;
