import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Loader2,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EVIDENCE_DOMAINS } from "@/lib/performanceEvidence";
import {
  loadQaEvidenceParity,
  type QaEvidenceDayResult,
  type QaEvidenceParityReport,
  type QaParityState,
} from "@/lib/qaEvidenceParity";
import { cn } from "@/lib/utils";

interface QaEvidenceParityPanelProps {
  programRunId: string;
  refreshToken?: string | number;
  onJumpToDay?: (dayNumber: number) => Promise<void>;
  reportOverride?: QaEvidenceParityReport;
}

const stateStyle: Record<QaParityState, string> = {
  READY: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  IN_PROGRESS: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  PASS: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  FAIL: "border-destructive/40 bg-destructive/10 text-destructive",
};

const dayStyle: Record<QaEvidenceDayResult["status"], string> = {
  not_reached: "border-border bg-background text-muted-foreground",
  not_started: "border-border bg-muted/40 text-foreground",
  in_progress: "border-amber-500/35 bg-amber-500/10 text-amber-100",
  passed: "border-emerald-500/35 bg-emerald-500/10 text-emerald-100",
  failed: "border-destructive/40 bg-destructive/10 text-destructive",
};

const dayStatusLabel: Record<QaEvidenceDayResult["status"], string> = {
  not_reached: "Noch nicht erreicht",
  not_started: "Noch nicht getestet",
  in_progress: "Unvollständig",
  passed: "Bestanden",
  failed: "Fehler",
};

const DayStatusIcon = ({ status }: { status: QaEvidenceDayResult["status"] }) => {
  if (status === "passed") return <CheckCircle2 className="h-4 w-4" aria-hidden="true" />;
  if (status === "failed") return <AlertTriangle className="h-4 w-4" aria-hidden="true" />;
  if (status === "in_progress") return <Clock3 className="h-4 w-4" aria-hidden="true" />;
  return <CircleDashed className="h-4 w-4" aria-hidden="true" />;
};

const Metric = ({ label, value, detail }: { label: string; value: string | number; detail?: string }) => (
  <div className="min-w-0 border-l-2 border-border pl-3">
    <p className="text-[10px] font-medium uppercase text-muted-foreground">{label}</p>
    <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
  </div>
);

const QaEvidenceParityPanel = ({
  programRunId,
  refreshToken,
  onJumpToDay,
  reportOverride,
}: QaEvidenceParityPanelProps) => {
  const [report, setReport] = useState<QaEvidenceParityReport | null>(reportOverride ?? null);
  const [loading, setLoading] = useState(!reportOverride);
  const [error, setError] = useState<string | null>(null);
  const [jumpingDay, setJumpingDay] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (reportOverride) {
      setReport(reportOverride);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setReport(await loadQaEvidenceParity(programRunId));
    } catch (loadError) {
      setReport(null);
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }, [programRunId, reportOverride]);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  const integrityChecks = useMemo(() => {
    if (!report) return [];
    return [
      ["QA aus Production ausgeschlossen", report.checks.observationsVisibleInProduction === 0 && report.checks.participantsVisibleInProduction === 0],
      ["Alle Datensätze als Test markiert", report.checks.observationsWithoutTestFlag === 0 && report.checks.coachReviewsWithoutTestFlag === 0],
      ["Completion und Evidence atomar", report.checks.completionWithoutEvidence === 0 && report.checks.evidenceWithoutCompletion === 0],
      ["Messplan korrekt zugeordnet", report.checks.scheduleMismatches === 0],
      ["Keine privaten Inhalte im Bericht", !report.privacy.privateTextExposed && !report.privacy.responseValuesExposed],
    ] as const;
  }, [report]);

  const jump = async (dayNumber: number) => {
    if (!onJumpToDay) return;
    setJumpingDay(dayNumber);
    try {
      await onJumpToDay(dayNumber);
      if (!reportOverride) await load();
    } finally {
      setJumpingDay(null);
    }
  };

  if (loading && !report) {
    return (
      <div className="flex min-h-28 items-center justify-center border-t border-border pt-5">
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-label="QA-Bericht wird geladen" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-destructive">QA-Paritätsbericht nicht verfügbar</p>
          <p className="mt-1 text-xs text-muted-foreground">{error ?? "Unbekannter Fehler"}</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCcw className="mr-2 h-4 w-4" />Erneut laden
        </Button>
      </div>
    );
  }

  return (
    <section className="mt-5 space-y-5 border-t border-border pt-5" aria-label="QA Evidence Paritätsprüfung">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading text-base font-semibold">Evidence-Paritätsgate</h3>
            <Badge className={cn("border", stateStyle[report.state])}>{report.state}</Badge>
            <Badge variant="outline">Nur Testdaten</Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{report.stateLabel}</p>
        </div>
        <Button variant="outline" size="icon" className="h-11 w-11" onClick={load} disabled={loading} title="QA-Bericht aktualisieren">
          <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
          <span className="sr-only">QA-Bericht aktualisieren</span>
        </Button>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="QA-Athleten" value={`${report.setup.activeInstances}/${report.setup.expectedQaAthletes}`} detail="aktive Testinstanzen" />
        <Metric label="Messpunkte" value={`${report.coverage.passedDays}/${report.coverage.reachedDays}`} detail={`${report.coverage.scheduledDays} insgesamt`} />
        <Metric label="Antworten" value={`${report.coverage.collectedObservations}/${report.coverage.expectedObservations}`} detail={`${report.coverage.missingObservations} offen`} />
        <Metric label="Coach-Wochen" value={`${report.coverage.completedCoachWeeks}/${report.coverage.reachedCoachWeeks}`} detail="Teambeobachtungen" />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground">16 reale Messzeitpunkte</p>
          <p className="text-xs text-muted-foreground">Aktuell Tag {report.scope.simulatedDayNumber}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {report.days.map((day) => {
            const domain = EVIDENCE_DOMAINS[day.domainId as keyof typeof EVIDENCE_DOMAINS];
            return (
              <button
                key={day.dayNumber}
                type="button"
                onClick={() => void jump(day.dayNumber)}
                disabled={!onJumpToDay || jumpingDay !== null}
                aria-label={`Zu Tag ${day.dayNumber} springen: ${dayStatusLabel[day.status]}`}
                title={domain?.label ?? day.domainId}
                className={cn(
                  "min-h-20 border p-2 text-left transition-colors disabled:cursor-default disabled:opacity-100",
                  dayStyle[day.status],
                  onJumpToDay && "hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold">Tag {day.dayNumber}</span>
                  {jumpingDay === day.dayNumber ? <Loader2 className="h-4 w-4 animate-spin" /> : <DayStatusIcon status={day.status} />}
                </div>
                <p className="mt-2 text-[10px] leading-tight opacity-80">
                  {day.collectedObservations}/{day.expectedObservations} gespeichert
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="grid gap-2 sm:grid-cols-2">
          {integrityChecks.map(([label, passed]) => (
            <div key={label} className="flex items-center gap-2 text-xs text-muted-foreground">
              {passed
                ? <Check className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                : <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />}
              <span>{label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
          Keine Athletennamen, Scores oder Freitexte
        </div>
      </div>
    </section>
  );
};

export default QaEvidenceParityPanel;
