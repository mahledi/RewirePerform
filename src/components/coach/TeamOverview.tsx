import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  Loader2,
  Lock,
  RefreshCw,
  Rocket,
  Users,
  UsersRound,
} from "lucide-react";
import { captureAppError } from "@/lib/monitoring";
import { getCurrentProgramDay } from "@/lib/getCurrentProgramDay";

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

interface TeamOverviewProps {
  teamId: string;
  teamName?: string;
  programStartDate?: string | null;
  onPrepareProgramStart?: () => void;
  onOpenCalendar?: () => void;
}

const TeamOverview = ({
  teamId,
  teamName = "Dein Team",
  programStartDate = null,
  onPrepareProgramStart,
  onOpenCalendar,
}: TeamOverviewProps) => {
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

  const programDay = getCurrentProgramDay(programStartDate);
  const progress = programDay ? Math.round((programDay.dayNumber / 56) * 100) : 0;
  const week = programDay ? Math.ceil(programDay.dayNumber / 7) : null;

  return (
    <div className="w-full min-w-0 space-y-5">
      {partialWarnings.length > 0 && (
        <div className="rounded-[20px] border border-amber-400/20 bg-amber-400/[0.055] p-4 text-sm text-white/52">
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

      {programDay ? (
        <section className="relative overflow-hidden rounded-[28px] border border-white/[0.075] bg-[linear-gradient(145deg,rgba(28,31,36,0.97),rgba(15,17,21,0.99))] p-5 shadow-[0_28px_80px_-45px_rgba(0,0,0,0.95)] sm:p-6">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary/[0.11] blur-3xl" />
          <div className="relative flex min-w-0 items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">Woche {week}</p>
              <h2 className="mt-2 truncate text-[clamp(1.35rem,4vw,1.85rem)] font-semibold tracking-[-0.04em] text-[#EEF0F2]">
                {teamName}
              </h2>
              <p className="mt-2 text-xs leading-5 text-white/42">Tag {programDay.dayNumber} im 56-Tage-Programm</p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[17px] border border-primary/20 bg-primary/[0.10] text-primary">
              <UsersRound className="h-5 w-5" strokeWidth={1.8} />
            </span>
          </div>
          <div className="relative mt-5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-700"
              style={{ width: `${progress}%` }}
              aria-label={`Programmfortschritt ${programDay.dayNumber} von 56 Tagen`}
            />
          </div>
        </section>
      ) : (
        <section className="relative overflow-hidden rounded-[28px] border border-primary/20 bg-[linear-gradient(145deg,rgba(22,39,36,0.98),rgba(13,18,19,0.99))] p-5 shadow-[0_28px_80px_-45px_rgba(46,173,137,0.72)] sm:p-6">
          <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-primary/[0.17] blur-3xl" />
          <div className="relative flex min-w-0 items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[17px] border border-primary/25 bg-primary/[0.12] text-primary">
              <Rocket className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/75">Programmstatus</p>
              <h2 className="mt-2 text-[clamp(1.35rem,4vw,1.85rem)] font-semibold tracking-[-0.04em] text-[#EEF0F2]">
                Programm noch nicht gestartet.
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/50">
                Prüfe, ob alle Athlet:innen bereit sind, und bereite den gemeinsamen Start vor.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onPrepareProgramStart}
            className="relative mt-6 flex min-h-12 w-full items-center justify-between gap-3 rounded-[17px] bg-primary px-4 text-left text-sm font-semibold text-primary-foreground shadow-[0_18px_45px_-24px_rgba(46,173,137,0.9)] transition-transform active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#101516]"
          >
            <span>
              Programmstart vorbereiten
              <span className="mt-0.5 block text-[11px] font-medium opacity-70">Der erste Programmtag beginnt nach dem Start am Folgetag.</span>
            </span>
            <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
          </button>
        </section>
      )}

      <button
        type="button"
        onClick={onOpenCalendar}
        className="group flex min-h-20 w-full min-w-0 items-center gap-4 rounded-[22px] border border-white/[0.07] bg-white/[0.025] p-4 text-left transition-colors hover:bg-white/[0.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-primary/[0.09] text-primary">
          <CalendarDays className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-[#EEF0F2]">Teamkalender</span>
          <span className="mt-1 block text-xs leading-5 text-white/38">Training, Ruhetage und Wettkämpfe planen.</span>
        </span>
        <ArrowRight className="h-5 w-5 shrink-0 text-white/32 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
      </button>

      {stats.member_count === 0 ? (
        <section className="rounded-[22px] border border-white/[0.065] bg-white/[0.02] px-5 py-8 text-center">
          <Users className="mx-auto h-10 w-10 text-white/24" aria-hidden="true" />
          <p className="mt-4 text-sm font-medium text-[#EEF0F2]">Noch keine Sportler im Team.</p>
          <p className="mt-1 text-xs leading-5 text-white/38">Teile den Zugangscode, damit Sportler beitreten können.</p>
        </section>
      ) : (
        <>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[20px] border border-white/[0.065] bg-white/[0.025] p-4 sm:p-5">
          <Users className="h-4 w-4 text-primary" strokeWidth={1.8} />
          <p className="mt-4 text-3xl font-semibold leading-none tracking-[-0.045em] text-[#EEF0F2]">{stats.member_count}</p>
          <p className="mt-2 text-xs text-white/38">Sportler im Team</p>
        </div>
        <div className="rounded-[20px] border border-white/[0.065] bg-white/[0.025] p-4 sm:p-5">
          <Activity className="h-4 w-4 text-primary" strokeWidth={1.8} />
          <p className="mt-4 text-3xl font-semibold leading-none tracking-[-0.045em] text-[#EEF0F2]">
            {detailsLoading && stats.checkins_last_week === 0 ? "..." : stats.checkins_last_week}
          </p>
          <p className="mt-2 text-xs text-white/38">in 7 Tagen aktiv</p>
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-3 rounded-[20px] border border-white/[0.065] bg-white/[0.025] p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-primary/[0.085] text-primary">
          <ClipboardCheck className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#EEF0F2]">Messungen im Programm</p>
          <p className="mt-1 text-xs text-white/38">Start-, Zwischen- und Abschlussmessungen</p>
        </div>
        <p className="shrink-0 text-2xl font-semibold tracking-[-0.04em] text-[#EEF0F2]">
            {detailsLoading && stats.assessments_completed === 0 ? "..." : stats.assessments_completed}
        </p>
      </div>

      {(detailsLoading || activityRows.length > 0) && (
        <section className="overflow-hidden rounded-[24px] border border-white/[0.065] bg-white/[0.02]">
          <div className="border-b border-white/[0.055] px-4 py-4 sm:px-5">
            <p className="text-sm font-semibold text-[#EEF0F2]">Teilnahme pro Sportler</p>
            <p className="mt-1 text-xs leading-5 text-white/38">
              Nur Aktivitätsstatus. Keine Antworten, keine Stimmungswerte, keine Journale.
            </p>
          </div>
          <div className="min-w-0 divide-y divide-white/[0.05]">
            {detailsLoading && activityRows.length === 0 ? (
              <div className="space-y-3 px-4 py-4">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="h-11 animate-pulse rounded-xl bg-secondary/50" />
                ))}
              </div>
            ) : activityRows.map((row) => (
              <div key={row.user_id} className="flex min-w-0 items-center gap-3 px-4 py-3.5 sm:px-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.075] bg-white/[0.035] text-[10px] font-semibold text-white/62">
                  {(row.full_name ?? "Sportler").split(" ").slice(0, 2).map((part) => part[0]).join("")}
                </span>
                <div className="min-w-0 flex-1">
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
                <div className="shrink-0 text-right">
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
        </section>
      )}

      <div className="flex min-w-0 items-start gap-3 rounded-[20px] border border-primary/15 bg-primary/[0.045] p-4">
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
        </>
      )}
    </div>
  );
};

export default TeamOverview;
