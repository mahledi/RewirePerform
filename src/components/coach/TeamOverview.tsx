import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity, AlertTriangle, ArrowRight, BellRing, CalendarDays, Check,
  ClipboardCheck, Loader2, Lock, RefreshCw, Rocket, Users, UsersRound,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { captureAppError } from "@/lib/monitoring";
import { getCurrentProgramDay } from "@/lib/getCurrentProgramDay";
import { toast } from "sonner";

interface TeamStats {
  member_count: number;
  assessments_completed: number;
  aggregate_ready: boolean;
  min_n: number;
}

interface CheckinStatusRow {
  user_id: string;
  full_name: string | null;
  program_instance_id: string | null;
  program_local_date: string;
  today_checkin_completed: boolean;
  today_checkin_at: string | null;
  rolling_7_completed: number;
  rolling_7_available: number;
  rolling_7_rate: number;
  already_reminded_today: boolean;
  supported_push_channels: string[];
  questionnaire_complete?: boolean;
}

interface ReminderPreview {
  openToday: number;
  reachable: number;
  withoutChannel: number;
  alreadyReminded: number;
}

interface ReminderResult {
  acceptedUsers: number;
  failedUsers: number;
  skippedCompleted: number;
  skippedNoChannel: number;
}

const MIN_AGGREGATE_SAMPLE = 5;
const BACKGROUND_REFRESH_MS = 60_000;
const BACKGROUND_REQUEST_TIMEOUT_MS = 12_000;

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
  const [activityRows, setActivityRows] = useState<CheckinStatusRow[]>([]);
  const activityRowsRef = useRef<CheckinStatusRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);
  const [lastStatusRefreshAt, setLastStatusRefreshAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [partialWarnings, setPartialWarnings] = useState<string[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [reminderPreviewLoading, setReminderPreviewLoading] = useState(false);
  const [reminderPreview, setReminderPreview] = useState<ReminderPreview | null>(null);
  const [reminderSending, setReminderSending] = useState(false);
  const [reminderResult, setReminderResult] = useState<ReminderResult | null>(null);
  const backgroundRefreshInFlight = useRef(false);

  const storeRows = useCallback((rows: CheckinStatusRow[]) => {
    activityRowsRef.current = rows;
    setActivityRows(rows);
  }, []);

  const refreshCheckinStatus = useCallback(async () => {
    if (backgroundRefreshInFlight.current) return;
    backgroundRefreshInFlight.current = true;
    setBackgroundRefreshing(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), BACKGROUND_REQUEST_TIMEOUT_MS);
    try {
      const { data, error: statusError } = await supabase.rpc(
        "get_coach_team_checkin_status_v1_4",
        { _team_id: teamId },
      ).abortSignal(controller.signal);
      if (statusError) throw statusError;
      const questionnaireByUser = new Map(
        activityRowsRef.current.map((row) => [row.user_id, row.questionnaire_complete]),
      );
      storeRows(((data ?? []) as CheckinStatusRow[]).map((row) => ({
        ...row,
        supported_push_channels: row.supported_push_channels ?? [],
        questionnaire_complete: questionnaireByUser.get(row.user_id),
      })));
      setLastStatusRefreshAt(new Date());
      setPartialWarnings((warnings) => warnings.filter(
        (warning) => warning !== "Der aktuelle Check-in-Status konnte gerade nicht aktualisiert werden.",
      ));
    } catch (refreshError) {
      setPartialWarnings((warnings) => warnings.includes(
        "Der aktuelle Check-in-Status konnte gerade nicht aktualisiert werden.",
      ) ? warnings : [...warnings, "Der aktuelle Check-in-Status konnte gerade nicht aktualisiert werden."]);
      void captureAppError({
        eventName: "coach_dashboard_loaded",
        error: refreshError,
        role: "coach",
        route: "/coach",
        metadata: { stage: "team_overview_background_checkin_status" },
      });
    } finally {
      window.clearTimeout(timeout);
      backgroundRefreshInFlight.current = false;
      setBackgroundRefreshing(false);
    }
  }, [storeRows, teamId]);

  useEffect(() => {
    let cancelled = false;
    const loadStats = async () => {
      setLoading(true);
      setDetailsLoading(false);
      setError(null);
      setPartialWarnings([]);
      try {
        const { data: members, error: membersError } = await supabase
          .from("team_members").select("user_id").eq("team_id", teamId);
        if (membersError) throw membersError;
        const memberIds = (members ?? []).map((member) => member.user_id);
        if (memberIds.length === 0) {
          if (!cancelled) {
            setStats({ member_count: 0, assessments_completed: 0, aggregate_ready: false, min_n: MIN_AGGREGATE_SAMPLE });
            storeRows([]);
          }
          return;
        }

        const { data: roles, error: rolesError } = await supabase
          .from("user_roles").select("user_id, role").in("user_id", memberIds);
        if (rolesError) throw rolesError;
        const athleteIds = (roles ?? []).filter((role) => role.role === "athlete").map((role) => role.user_id);
        if (athleteIds.length === 0) {
          if (!cancelled) {
            setStats({ member_count: 0, assessments_completed: 0, aggregate_ready: false, min_n: MIN_AGGREGATE_SAMPLE });
            storeRows([]);
          }
          return;
        }

        if (!cancelled) {
          setStats({
            member_count: athleteIds.length,
            assessments_completed: 0,
            aggregate_ready: athleteIds.length >= MIN_AGGREGATE_SAMPLE,
            min_n: MIN_AGGREGATE_SAMPLE,
          });
          setLoading(false);
          setDetailsLoading(true);
        }

        const [outcomesResult, activityStatus, questionnaireStatus] = await Promise.all([
          supabase.rpc("compute_team_outcomes", { team_id_param: teamId, min_n: MIN_AGGREGATE_SAMPLE }),
          supabase.rpc("get_coach_team_checkin_status_v1_4", { _team_id: teamId }),
          supabase.rpc("get_team_questionnaire_status", { _team_id: teamId }),
        ]);
        const warnings: string[] = [];
        const assessmentCompletion = !outcomesResult.error && outcomesResult.data
          ? ((outcomesResult.data as unknown as {
              assessment_completion?: { pre_n?: number; mid_n?: number; post_n?: number };
            }).assessment_completion ?? {})
          : {};
        if (outcomesResult.error) warnings.push("Assessment-Zähler konnten gerade nicht geladen werden.");
        if (activityStatus.error) warnings.push("Teilnahme pro Sportler konnte gerade nicht geladen werden.");
        if (questionnaireStatus.error) warnings.push("Fragebogenstatus konnte gerade nicht geladen werden.");

        for (const [stage, result] of [
          ["team_overview_assessment_aggregate", outcomesResult],
          ["team_overview_checkin_status", activityStatus],
          ["team_overview_questionnaire_status", questionnaireStatus],
        ] as const) {
          if (result.error) void captureAppError({
            eventName: "coach_dashboard_loaded", error: result.error, role: "coach", route: "/coach", metadata: { stage },
          });
        }

        const questionnaireByUser = new Map(
          ((questionnaireStatus.data ?? []) as Array<{ user_id?: string; is_complete?: boolean }>)
            .filter((row) => typeof row.user_id === "string")
            .map((row) => [row.user_id as string, row.is_complete === true]),
        );
        const nextRows = activityStatus.error ? [] : ((activityStatus.data ?? []) as CheckinStatusRow[]).map((row) => ({
          ...row,
          supported_push_channels: row.supported_push_channels ?? [],
          questionnaire_complete: questionnaireByUser.get(row.user_id),
        }));
        if (cancelled) return;
        setStats({
          member_count: athleteIds.length,
          assessments_completed: Number(assessmentCompletion.pre_n ?? 0)
            + Number(assessmentCompletion.mid_n ?? 0)
            + Number(assessmentCompletion.post_n ?? 0),
          aggregate_ready: athleteIds.length >= MIN_AGGREGATE_SAMPLE,
          min_n: MIN_AGGREGATE_SAMPLE,
        });
        storeRows(nextRows);
        if (!activityStatus.error) setLastStatusRefreshAt(new Date());
        setPartialWarnings(warnings);
      } catch (loadError) {
        if (!cancelled) {
          void captureAppError({
            eventName: "coach_dashboard_loaded", error: loadError, role: "coach", route: "/coach", metadata: { stage: "team_overview_base_load" },
          });
          setError(loadError instanceof Error ? loadError.message : "Teamdaten konnten nicht geladen werden.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setDetailsLoading(false);
        }
      }
    };
    void loadStats();
    return () => { cancelled = true; };
  }, [reloadKey, storeRows, teamId]);

  useEffect(() => {
    if (!programStartDate) return;
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refreshCheckinStatus();
    };
    const interval = window.setInterval(refreshWhenVisible, BACKGROUND_REFRESH_MS);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshWhenVisible);
    };
  }, [programStartDate, refreshCheckinStatus]);

  const programDay = getCurrentProgramDay(programStartDate);
  const progress = programDay ? Math.round((programDay.dayNumber / 56) * 100) : 0;
  const week = programDay ? Math.ceil(programDay.dayNumber / 7) : null;
  const todayCompleted = activityRows.filter((row) => row.today_checkin_completed).length;
  const todayOpen = Math.max(0, activityRows.length - todayCompleted);
  const rollingCompleted = activityRows.reduce((sum, row) => sum + row.rolling_7_completed, 0);
  const rollingAvailable = activityRows.reduce((sum, row) => sum + row.rolling_7_available, 0);
  const rollingRate = rollingAvailable > 0 ? Math.round((rollingCompleted / rollingAvailable) * 100) : 0;

  const localPreview = useMemo<ReminderPreview>(() => {
    const openRows = activityRows.filter((row) => !row.today_checkin_completed);
    const alreadyReminded = openRows.filter((row) => row.already_reminded_today).length;
    const candidates = openRows.filter((row) => !row.already_reminded_today);
    const reachable = candidates.filter((row) => row.supported_push_channels.length > 0).length;
    return { openToday: openRows.length, reachable, withoutChannel: candidates.length - reachable, alreadyReminded };
  }, [activityRows]);

  const openReminderPreview = async () => {
    setReminderPreviewLoading(true);
    try {
      const { data, error: previewError } = await supabase.functions.invoke("send-coach-checkin-reminder", {
        body: { teamId, preview: true },
      });
      if (previewError || data?.error) throw previewError ?? new Error(data.error);
      setReminderPreview({
        openToday: Number(data.openToday ?? localPreview.openToday),
        reachable: Number(data.reachable ?? localPreview.reachable),
        withoutChannel: Number(data.withoutChannel ?? localPreview.withoutChannel),
        alreadyReminded: Number(data.alreadyReminded ?? localPreview.alreadyReminded),
      });
    } catch {
      setReminderPreview(localPreview);
    } finally {
      setReminderPreviewLoading(false);
      setReminderDialogOpen(true);
    }
  };

  const sendReminder = async () => {
    setReminderSending(true);
    try {
      const { data, error: sendError } = await supabase.functions.invoke("send-coach-checkin-reminder", { body: { teamId } });
      if (sendError || data?.error) {
        if (data?.error === "already_reminded_today") throw new Error("Das Team wurde heute bereits erinnert.");
        if (data?.error === "outside_reminder_window") throw new Error("Erinnerungen sind täglich zwischen 08:00 und 21:30 Uhr möglich.");
        throw sendError ?? new Error("Erinnerung konnte nicht ausgelöst werden.");
      }
      const result: ReminderResult = {
        acceptedUsers: Number(data.acceptedUsers ?? 0),
        failedUsers: Number(data.failedUsers ?? 0),
        skippedCompleted: Number(data.skippedCompleted ?? 0),
        skippedNoChannel: Number(data.skippedNoChannel ?? 0),
      };
      setReminderResult(result);
      setReminderDialogOpen(false);
      if (result.acceptedUsers > 0) {
        toast.success(result.acceptedUsers === 1
          ? "1 Erinnerung wurde an den Push-Dienst übergeben."
          : `${result.acceptedUsers} Erinnerungen wurden an die Push-Dienste übergeben.`);
      } else if (result.skippedCompleted > 0) {
        toast.success("Die offenen Check-ins wurden inzwischen erledigt.");
      } else if (result.skippedNoChannel > 0) {
        toast.warning("Für die offenen Check-ins ist aktuell kein aktiver Push-Kanal erreichbar.");
      } else {
        toast.info("Aktuell ist keine offene Erinnerung zu versenden.");
      }
      await refreshCheckinStatus();
    } catch (sendFailure) {
      toast.error(sendFailure instanceof Error ? sendFailure.message : "Erinnerung konnte nicht ausgelöst werden.");
    } finally {
      setReminderSending(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (error || !stats) return (
    <div className="space-y-4 rounded-2xl border border-border/50 bg-card p-5 text-center text-sm text-muted-foreground">
      <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
      <p>{error ?? "Keine Daten verfügbar."}</p>
      <button type="button" onClick={() => setReloadKey((key) => key + 1)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-2 text-xs font-medium text-secondary-foreground">
        <RefreshCw className="h-3.5 w-3.5" />Teamdaten erneut laden
      </button>
    </div>
  );

  return (
    <div className="w-full min-w-0 space-y-5">
      {partialWarnings.length > 0 && (
        <div className="rounded-[20px] border border-amber-400/20 bg-amber-400/[0.055] p-4 text-sm text-white/52">
          <div className="mb-2 flex items-center gap-2 font-medium text-foreground"><AlertTriangle className="h-4 w-4 text-amber-500" />Einzelne Teamdaten sind gerade nicht vollständig verfügbar.</div>
          <div className="space-y-1 text-xs leading-relaxed">{partialWarnings.map((warning) => <p key={warning}>{warning}</p>)}</div>
          <button type="button" onClick={() => void refreshCheckinStatus()} disabled={backgroundRefreshing} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground disabled:opacity-60">
            <RefreshCw className={`h-3.5 w-3.5 ${backgroundRefreshing ? "animate-spin" : ""}`} />Im Hintergrund aktualisieren
          </button>
        </div>
      )}

      {programDay ? (
        <section className="relative overflow-hidden rounded-[28px] border border-white/[0.075] bg-[linear-gradient(145deg,rgba(28,31,36,0.97),rgba(15,17,21,0.99))] p-5 shadow-[0_28px_80px_-45px_rgba(0,0,0,0.95)] sm:p-6">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary/[0.11] blur-3xl" />
          <div className="relative flex min-w-0 items-start justify-between gap-4">
            <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">Woche {week}</p><h2 className="mt-2 truncate text-[clamp(1.35rem,4vw,1.85rem)] font-semibold tracking-[-0.04em] text-[#EEF0F2]">{teamName}</h2><p className="mt-2 text-xs leading-5 text-white/42">Tag {programDay.dayNumber} im 56-Tage-Programm</p></div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[17px] border border-primary/20 bg-primary/[0.10] text-primary"><UsersRound className="h-5 w-5" strokeWidth={1.8} /></span>
          </div>
          <div className="relative mt-5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${progress}%` }} aria-label={`Programmfortschritt ${programDay.dayNumber} von 56 Tagen`} /></div>
        </section>
      ) : (
        <section className="relative overflow-hidden rounded-[28px] border border-primary/20 bg-[linear-gradient(145deg,rgba(22,39,36,0.98),rgba(13,18,19,0.99))] p-5 shadow-[0_28px_80px_-45px_rgba(46,173,137,0.72)] sm:p-6">
          <div className="relative flex min-w-0 items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[17px] border border-primary/25 bg-primary/[0.12] text-primary"><Rocket className="h-5 w-5" /></span><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/75">Programmstatus</p><h2 className="mt-2 text-[clamp(1.35rem,4vw,1.85rem)] font-semibold tracking-[-0.04em] text-[#EEF0F2]">Programm noch nicht gestartet.</h2><p className="mt-2 text-sm leading-6 text-white/50">Prüfe, ob alle Athlet:innen bereit sind, und bereite den gemeinsamen Start vor.</p></div></div>
          <button type="button" onClick={onPrepareProgramStart} className="relative mt-6 flex min-h-12 w-full items-center justify-between gap-3 rounded-[17px] bg-primary px-4 text-left text-sm font-semibold text-primary-foreground"><span>Programmstart vorbereiten<span className="mt-0.5 block text-[11px] font-medium opacity-70">Der erste Programmtag beginnt nach dem Start am Folgetag.</span></span><ArrowRight className="h-5 w-5" /></button>
        </section>
      )}

      <button type="button" onClick={onOpenCalendar} className="group flex min-h-20 w-full min-w-0 items-center gap-4 rounded-[22px] border border-white/[0.07] bg-white/[0.025] p-4 text-left">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-primary/[0.09] text-primary"><CalendarDays className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-[#EEF0F2]">Teamkalender</span><span className="mt-1 block text-xs leading-5 text-white/38">Training, Ruhetage und Wettkämpfe planen.</span></span><ArrowRight className="h-5 w-5 shrink-0 text-white/32" />
      </button>

      {stats.member_count === 0 ? (
        <section className="rounded-[22px] border border-white/[0.065] bg-white/[0.02] px-5 py-8 text-center"><Users className="mx-auto h-10 w-10 text-white/24" /><p className="mt-4 text-sm font-medium text-[#EEF0F2]">Noch keine Sportler im Team.</p><p className="mt-1 text-xs leading-5 text-white/38">Teile den Zugangscode, damit Sportler beitreten können.</p></section>
      ) : <>
        {programDay ? <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[20px] border border-white/[0.065] bg-white/[0.025] p-4 sm:p-5"><Check className="h-4 w-4 text-primary" /><p className="mt-4 text-3xl font-semibold leading-none tracking-[-0.045em] text-[#EEF0F2]">{todayCompleted}/{activityRows.length}</p><p className="mt-2 text-xs text-white/38">Check-ins heute</p></div>
          <div className="rounded-[20px] border border-white/[0.065] bg-white/[0.025] p-4 sm:p-5"><Activity className="h-4 w-4 text-primary" /><p className="mt-4 text-3xl font-semibold leading-none tracking-[-0.045em] text-[#EEF0F2]">{rollingRate}%</p><p className="mt-2 text-xs text-white/38">7-Tage-Rhythmus</p></div>
        </div> : <div className="rounded-[20px] border border-white/[0.065] bg-white/[0.025] p-4 sm:p-5"><Users className="h-4 w-4 text-primary" /><p className="mt-4 text-3xl font-semibold text-[#EEF0F2]">{stats.member_count}</p><p className="mt-2 text-xs text-white/38">Sportler im Team</p></div>}

        {programDay && <section className="rounded-[24px] border border-primary/18 bg-primary/[0.045] p-4 sm:p-5">
          <div className="flex min-w-0 items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-primary/[0.11] text-primary"><BellRing className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-[#EEF0F2]">Heutige Check-ins</p><p className="mt-1 text-xs leading-5 text-white/45">{todayOpen === 0 ? "Alle heutigen Check-ins sind erledigt." : `${todayOpen} von ${activityRows.length} Check-ins sind heute noch offen.`}</p><p className="mt-2 text-[11px] leading-5 text-white/34">Feste, freundliche Erinnerung. Keine Antworten oder privaten Inhalte werden geteilt.</p></div></div>
          <button type="button" onClick={() => void openReminderPreview()} disabled={todayOpen === 0 || reminderPreviewLoading || localPreview.alreadyReminded >= todayOpen} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-45">{reminderPreviewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}{localPreview.alreadyReminded >= todayOpen && todayOpen > 0 ? "Heute bereits erinnert" : "Offene Check-ins erinnern"}</button>
          {reminderResult && <p className="mt-3 text-xs leading-5 text-primary/80" role="status">{reminderResult.acceptedUsers} an Push-Dienste übergeben{reminderResult.skippedCompleted > 0 ? ` · ${reminderResult.skippedCompleted} inzwischen erledigt` : ""}{reminderResult.skippedNoChannel > 0 ? ` · ${reminderResult.skippedNoChannel} ohne aktiven Kanal` : ""}{reminderResult.failedUsers > 0 ? ` · ${reminderResult.failedUsers} technisch fehlgeschlagen` : ""}</p>}
        </section>}

        <div className="flex min-w-0 items-center gap-3 rounded-[20px] border border-white/[0.065] bg-white/[0.025] p-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-primary/[0.085] text-primary"><ClipboardCheck className="h-[18px] w-[18px]" /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-[#EEF0F2]">Messungen im Programm</p><p className="mt-1 text-xs text-white/38">Start-, Zwischen- und Abschlussmessungen</p></div><p className="shrink-0 text-2xl font-semibold text-[#EEF0F2]">{detailsLoading && stats.assessments_completed === 0 ? "..." : stats.assessments_completed}</p></div>

        {(detailsLoading || activityRows.length > 0) && <section className="overflow-hidden rounded-[24px] border border-white/[0.065] bg-white/[0.02]">
          <div className="flex items-start justify-between gap-3 border-b border-white/[0.055] px-4 py-4 sm:px-5"><div><p className="text-sm font-semibold text-[#EEF0F2]">Teilnahme pro Sportler</p><p className="mt-1 text-xs leading-5 text-white/38">Heute und letzte 7 Programmtage. Keine Antworten, keine Stimmungswerte, keine Journale.</p></div><div className="flex shrink-0 items-center gap-2"><span className="text-[10px] text-white/30">{lastStatusRefreshAt ? `Stand ${lastStatusRefreshAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}` : "Stand wird geladen"}</span><button type="button" onClick={() => void refreshCheckinStatus()} disabled={backgroundRefreshing} aria-label="Teilnahmestatus im Hintergrund aktualisieren" className="flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/[0.05] hover:text-primary disabled:opacity-60"><RefreshCw className={`h-3.5 w-3.5 ${backgroundRefreshing ? "animate-spin text-primary/70" : ""}`} /></button></div></div>
          <div className="min-w-0 divide-y divide-white/[0.05]">{detailsLoading && activityRows.length === 0 ? <div className="space-y-3 px-4 py-4">{[0, 1, 2].map((item) => <div key={item} className="h-11 animate-pulse rounded-xl bg-secondary/50" />)}</div> : activityRows.map((row) => <div key={row.user_id} className="flex min-w-0 items-center gap-3 px-4 py-3.5 sm:px-5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.075] bg-white/[0.035] text-[10px] font-semibold text-white/62">{(row.full_name ?? "Sportler").split(" ").slice(0, 2).map((part) => part[0]).join("")}</span>
            <div className="min-w-0 flex-1"><div className="flex min-w-0 flex-wrap items-center gap-2"><p className="truncate text-sm font-medium text-foreground">{row.full_name ?? "Sportler"}</p>{programDay ? <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${row.today_checkin_completed ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-500"}`}>{row.today_checkin_completed && <Check className="h-3 w-3" />}{row.today_checkin_completed ? "Heute erledigt" : "Heute offen"}</span> : <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ${row.questionnaire_complete ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-600"}`}>{row.questionnaire_complete ? "Bereit" : "Fragebogen fehlt"}</span>}</div><p className="break-words text-xs text-muted-foreground">{programDay ? `Letzte 7 Programmtage: ${row.rolling_7_completed}/${row.rolling_7_available} Check-ins` : "Programmstart steht noch aus"}</p></div>
            <div className="shrink-0 text-right"><p className="text-sm font-semibold text-foreground">{programDay ? `${Math.round(row.rolling_7_rate * 100)}%` : "–"}</p>{programDay && row.already_reminded_today && !row.today_checkin_completed && <p className="text-[10px] text-white/32">erinnert</p>}</div>
          </div>)}</div>
        </section>}

        <div className="flex min-w-0 items-start gap-3 rounded-[20px] border border-primary/15 bg-primary/[0.045] p-4"><Lock className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><p className="mb-1 text-sm font-medium text-foreground">Privatsphäre geschützt</p><p className="text-xs leading-relaxed text-muted-foreground">Du siehst hier nur operative Teilnahme-Zahlen für Athleten. Persönliche Antworten, Reflexionen, Stimmungswerte und Journale bleiben privat. Sensible Team-Aggregate werden erst ab mindestens{` ${stats.min_n} `}Athleten freigegeben.</p>{!stats.aggregate_ready && <p className="mt-2 text-[11px] text-primary">Aktuell noch unter Mindestgruppe: sensible Teamwerte bleiben verborgen.</p>}</div></div>
      </>}

      <AlertDialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
        <AlertDialogContent className="border-white/[0.08] bg-[#111418]"><AlertDialogHeader><AlertDialogTitle>Offene Check-ins erinnern?</AlertDialogTitle><AlertDialogDescription className="space-y-3 text-left leading-6"><span className="block">Heute sind {reminderPreview?.openToday ?? localPreview.openToday} Check-ins offen. {reminderPreview?.reachable ?? localPreview.reachable} Athleten sind aktuell über einen konfigurierten Push-Kanal erreichbar.</span><span className="block rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 text-foreground/75">„Dein heutiger Check-in ist noch offen. Nimm dir bitte sobald wie möglich kurz Zeit dafür.“</span>{(reminderPreview?.withoutChannel ?? localPreview.withoutChannel) > 0 && <span className="block text-xs text-white/42">{reminderPreview?.withoutChannel ?? localPreview.withoutChannel} Athleten haben keinen aktiven unterstützten Push-Kanal.</span>}{(reminderPreview?.alreadyReminded ?? localPreview.alreadyReminded) > 0 && <span className="block text-xs text-white/42">{reminderPreview?.alreadyReminded ?? localPreview.alreadyReminded} Athleten wurden heute bereits erinnert und werden nicht erneut angeschrieben.</span>}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={reminderSending}>Abbrechen</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); void sendReminder(); }} disabled={reminderSending || (reminderPreview?.reachable ?? localPreview.reachable) === 0}>{reminderSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Freundlich erinnern</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TeamOverview;
