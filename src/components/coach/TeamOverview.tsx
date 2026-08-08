import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, ClipboardCheck, Activity, Lock, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { captureAppError } from "@/lib/monitoring";

interface TeamStats {
  member_count: number;
  checkins_last_week: number;
  assessments_completed: number;
  aggregate_ready: boolean;
  min_n: number;
}

interface ActivityRow {
  user_id: string;
  full_name: string | null;
  last_activity_at: string | null;
  days_completed: number | null;
  days_available: number | null;
  completion_rate: number | null;
  current_streak: number | null;
  checkins_last_7d: number;
  last_checkin_date: string | null;
  journal_entries_count: number;
  inactive_risk: boolean;
}

const MIN_AGGREGATE_SAMPLE = 5;

const TeamOverview = ({ teamId }: { teamId: string }) => {
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [activityRows, setActivityRows] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partialWarnings, setPartialWarnings] = useState<string[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const loadStats = async () => {
      setLoading(true);
      setDetailsLoading(false);
      setError(null);
      setPartialWarnings([]);
      setActivityRows([]);
      try {
        const { data: members, error: membersError } = await supabase
          .from("team_members")
          .select("user_id")
          .eq("team_id", teamId);

        if (membersError) throw membersError;

        const memberIds = (members ?? []).map((m) => m.user_id);
        if (memberIds.length === 0) {
          if (!cancelled) {
            setStats({
              member_count: 0,
              checkins_last_week: 0,
              assessments_completed: 0,
              aggregate_ready: false,
              min_n: MIN_AGGREGATE_SAMPLE,
            });
            setActivityRows([]);
            setLoading(false);
          }
          return;
        }

        const { data: roles, error: rolesError } = await supabase
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", memberIds);
        if (rolesError) throw rolesError;

        const athleteIds = (roles ?? [])
          .filter((r) => r.role === "athlete")
          .map((r) => r.user_id);

        if (athleteIds.length === 0) {
          if (!cancelled) {
            setStats({
              member_count: 0,
              checkins_last_week: 0,
              assessments_completed: 0,
              aggregate_ready: false,
              min_n: MIN_AGGREGATE_SAMPLE,
            });
            setActivityRows([]);
            setPartialWarnings([]);
            setLoading(false);
          }
          return;
        }

        if (!cancelled) {
          setStats({
            member_count: athleteIds.length,
            checkins_last_week: 0,
            assessments_completed: 0,
            aggregate_ready: athleteIds.length >= MIN_AGGREGATE_SAMPLE,
            min_n: MIN_AGGREGATE_SAMPLE,
          });
          setLoading(false);
          setDetailsLoading(true);
        }

        const [outcomesResult, mentalState, activityStatus] = await Promise.all([
          supabase.rpc("compute_team_outcomes", {
            team_id_param: teamId,
            min_n: MIN_AGGREGATE_SAMPLE,
          }),
          supabase.functions.invoke("team-mental-state", {
            body: { team_id: teamId },
          }),
          supabase.rpc("get_coach_team_activity_status", {
            _team_id: teamId,
          }),
        ]);

        const warnings: string[] = [];
        const assessmentCompletion = !outcomesResult.error && outcomesResult.data
          ? ((outcomesResult.data as unknown as {
              assessment_completion?: { pre_n?: number; mid_n?: number; post_n?: number };
            }).assessment_completion ?? {})
          : {};

        if (outcomesResult.error) {
          warnings.push("Assessment-Zähler konnten gerade nicht geladen werden.");
          void captureAppError({
            eventName: "coach_dashboard_loaded",
            error: outcomesResult.error,
            role: "coach",
            route: "/coach",
            metadata: { stage: "team_overview_assessment_aggregate" },
          });
        }

        if (mentalState.error) {
          warnings.push("7-Tage-Aktivität konnte gerade nicht geladen werden.");
          void captureAppError({
            eventName: "coach_dashboard_loaded",
            error: mentalState.error,
            role: "coach",
            route: "/coach",
            metadata: { stage: "team_overview_mental_state" },
          });
        }

        if (activityStatus.error) {
          warnings.push("Teilnahme pro Sportler konnte gerade nicht geladen werden.");
          void captureAppError({
            eventName: "coach_dashboard_loaded",
            error: activityStatus.error,
            role: "coach",
            route: "/coach",
            metadata: { stage: "team_overview_activity_status" },
          });
        }

        const nextStats: TeamStats = {
          // The aggregate may exclude athletes who have not completed enough
          // tracking yet. Team size must still reflect every athlete member.
          member_count: athleteIds.length,
          checkins_last_week: mentalState.data?.participation?.total ?? 0,
          assessments_completed:
            Number(assessmentCompletion.pre_n ?? 0)
            + Number(assessmentCompletion.mid_n ?? 0)
            + Number(assessmentCompletion.post_n ?? 0),
          aggregate_ready: athleteIds.length >= MIN_AGGREGATE_SAMPLE,
          min_n: mentalState.data?.min_n ?? MIN_AGGREGATE_SAMPLE,
        };

        if (cancelled) return;
        setStats(nextStats);
        setActivityRows(activityStatus.error ? [] : ((activityStatus.data ?? []) as ActivityRow[]));
        setPartialWarnings(warnings);
        setDetailsLoading(false);
      } catch (err) {
        if (!cancelled) {
          setDetailsLoading(false);
          void captureAppError({
            eventName: "coach_dashboard_loaded",
            error: err,
            role: "coach",
            route: "/coach",
            metadata: { stage: "team_overview_base_load" },
          });
          setError(err instanceof Error ? err.message : "Teamdaten konnten nicht geladen werden.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setDetailsLoading(false);
        }
      }
    };
    loadStats();
    return () => {
      cancelled = true;
    };
  }, [teamId, reloadKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="space-y-4 rounded-2xl border border-border/50 bg-card p-5 text-center text-sm text-muted-foreground">
        <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
        <p>{error ?? "Keine Daten verfügbar."}</p>
        <button
          type="button"
          onClick={() => setReloadKey((key) => key + 1)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-2 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Teamdaten erneut laden
        </button>
      </div>
    );
  }

  if (stats.member_count === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Noch keine Sportler im Team.</p>
        <p className="text-muted-foreground text-sm mt-1">
          Teile den Zugangscode, damit Sportler beitreten können.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-4">
      {partialWarnings.length > 0 && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-muted-foreground">
          <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Einzelne Teamdaten sind gerade nicht vollständig verfügbar.
          </div>
          <div className="space-y-1 text-xs leading-relaxed">
            {partialWarnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Erneut laden
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="bg-card border border-border/50 rounded-2xl p-5 text-center">
          <Users className="w-5 h-5 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground">{stats.member_count}</p>
          <p className="text-xs text-muted-foreground">Sportler im Team</p>
        </div>
        <div className="bg-card border border-border/50 rounded-2xl p-5 text-center">
          <Activity className="w-5 h-5 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground">
            {detailsLoading && stats.checkins_last_week === 0 ? "..." : stats.checkins_last_week}
          </p>
          <p className="text-xs text-muted-foreground">Aktive Sportler (7 Tage)</p>
        </div>
        <div className="bg-card border border-border/50 rounded-2xl p-5 text-center sm:col-span-2">
          <ClipboardCheck className="w-5 h-5 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground">
            {detailsLoading && stats.assessments_completed === 0 ? "..." : stats.assessments_completed}
          </p>
          <p className="text-xs text-muted-foreground">Assessments abgeschlossen (gesamt)</p>
        </div>
      </div>

      {(detailsLoading || activityRows.length > 0) && (
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border/50">
            <p className="text-sm font-medium text-foreground">Teilnahme pro Sportler</p>
            <p className="text-xs text-muted-foreground">
              Nur Aktivitätsstatus. Keine Antworten, keine Stimmungswerte, keine Journale.
            </p>
          </div>
          <div className="min-w-0 divide-y divide-border/50">
            {detailsLoading && activityRows.length === 0 ? (
              <div className="space-y-3 px-4 py-4">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="h-11 animate-pulse rounded-xl bg-secondary/50" />
                ))}
              </div>
            ) : activityRows.map((row) => (
              <div key={row.user_id} className="flex min-w-0 flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">
                      {row.full_name ?? "Sportler"}
                    </p>
                    {row.inactive_risk && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-600">
                        <AlertTriangle className="w-3 h-3" />
                        inaktiv
                      </span>
                    )}
                  </div>
                  <p className="break-words text-xs text-muted-foreground">
                    {row.days_completed ?? 0}/{row.days_available ?? 0} Tage · {row.checkins_last_7d} Check-ins in 7 Tagen
                  </p>
                </div>
                <div className="shrink-0 text-left sm:text-right">
                  <p className="text-sm font-semibold text-foreground">
                    {row.completion_rate != null ? `${Math.round(row.completion_rate * 100)}%` : "–"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Streak {row.current_streak ?? 0}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <Lock className="w-5 h-5 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground mb-1">Privatsphäre geschützt</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Du siehst hier nur operative Teilnahme-Zahlen für Athleten.
            Persönliche Antworten, Reflexionen, Stimmungswerte und Journale
            bleiben privat. Sensible Team-Aggregate werden erst ab mindestens
            {` ${stats.min_n} `}Athleten freigegeben.
          </p>
          {!stats.aggregate_ready && (
            <p className="text-[11px] text-primary mt-2">
              Aktuell noch unter Mindestgruppe: sensible Teamwerte bleiben verborgen.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamOverview;
