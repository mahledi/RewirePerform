import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardCheck, Loader2, LockKeyhole, RefreshCw, ShieldAlert, UserRound, Users } from "lucide-react";
import { toast } from "sonner";
import CoachWeeklyReview, {
  type CoachWeeklyReviewSubmission,
} from "@/components/evidence/CoachWeeklyReview";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  getCoachEvidenceReviewContext,
  saveCoachEvidenceReview,
  type CoachEvidenceReviewContext,
  type CoachEvidenceReviewValues,
} from "@/lib/evidenceTracking";
import { captureAppError } from "@/lib/monitoring";

type ReviewMode = "team" | "athlete";

const CoachEvidenceReviewPanel = ({ teamId }: { teamId: string }) => {
  const [context, setContext] = useState<CoachEvidenceReviewContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ReviewMode>("team");
  const [selectedAthleteId, setSelectedAthleteId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await getCoachEvidenceReviewContext(teamId);
      setContext(next);
      const observableAthletes = next.athletes.filter((athlete) => athlete.observationAvailable);
      setSelectedAthleteId((current) => (
        observableAthletes.some((athlete) => athlete.programInstanceId === current)
          ? current
          : observableAthletes[0]?.programInstanceId ?? ""
      ));
      setMode((current) => {
        if (current === "team" && !next.teamEligible && observableAthletes.length > 0) return "athlete";
        if (current === "athlete" && observableAthletes.length === 0) return "team";
        return current;
      });
    } catch (loadError) {
      void captureAppError({
        error: loadError,
        eventName: "coach_evidence_load_failed",
        role: "coach",
        teamId,
        metadata: { action: "load_weekly_review" },
      });
      setContext(null);
      setError("Die Wochenbeobachtung konnte gerade nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    void load();
  }, [load]);

  const observableAthletes = useMemo(
    () => context?.athletes.filter((athlete) => athlete.observationAvailable) ?? [],
    [context],
  );
  const selectedAthlete = observableAthletes.find(
    (athlete) => athlete.programInstanceId === selectedAthleteId,
  ) ?? null;
  const activeReview = mode === "team" ? context?.teamReview ?? null : selectedAthlete?.review ?? null;

  const submit = async (submission: CoachWeeklyReviewSubmission) => {
    if (!context?.weekNumber) return;
    if (mode === "athlete" && !selectedAthlete) return;

    try {
      await saveCoachEvidenceReview({
        scope: mode,
        teamId,
        programInstanceId: mode === "athlete" ? selectedAthlete?.programInstanceId ?? null : null,
        weekNumber: context.weekNumber,
        context: submission.context,
        values: submission.values as CoachEvidenceReviewValues,
        completionDurationMs: submission.durationMs,
      });
      toast.success(mode === "team" ? "Teambeobachtung gespeichert." : "Einzelbeobachtung geschützt gespeichert.");
      await load();
    } catch (saveError) {
      void captureAppError({
        error: saveError,
        eventName: "coach_evidence_save_failed",
        role: "coach",
        teamId,
        metadata: { action: "save_weekly_review", scope: mode },
      });
      toast.error("Die Beobachtung konnte nicht gespeichert werden.");
      throw saveError;
    }
  };

  if (loading) {
    return (
      <section className="flex min-h-36 items-center justify-center border-y border-border/60 py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-label="Beobachtungen werden geladen" />
      </section>
    );
  }

  if (error) {
    return (
      <section className="flex flex-col gap-4 border-y border-amber-400/25 bg-amber-400/5 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-foreground">Wöchentliche Beobachtung nicht verfügbar</p>
            <p className="mt-1 text-xs text-muted-foreground">{error} Die übrige Coach-Ansicht bleibt nutzbar.</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => void load()} className="h-11 shrink-0">
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Erneut laden
        </Button>
      </section>
    );
  }

  if (!context?.enabled || !context.run || !context.weekNumber) {
    return (
      <section className="flex items-start gap-3 border-y border-border/60 px-1 py-5">
        <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-foreground">Wöchentliche Beobachtung noch nicht aktiv</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Sie wird verfügbar, sobald für dieses Team ein aktiver Mannschaftslauf besteht.
          </p>
        </div>
      </section>
    );
  }

  const reviewAvailable = mode === "team" ? context.teamEligible : selectedAthlete !== null;

  return (
    <section className="border-y border-border/60 py-6" aria-labelledby="weekly-evidence-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-primary">{context.run.name} · Woche {context.weekNumber}</p>
          <h2 id="weekly-evidence-heading" className="mt-1 text-lg font-semibold text-foreground">
            Strukturierte Wochenbeobachtung
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Fünf direkt beobachtbare Bereiche, ohne Pflichttext. Zielzeit: unter 90 Sekunden.
          </p>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <p className="text-xs font-medium text-foreground">
            {context.athleteCount} {context.athleteCount === 1 ? "Athlet" : "Athleten"} im aktiven Lauf
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Einzelbeobachtung ohne private Athleteninhalte</p>
        </div>
      </div>

      {!context.teamEligible && (
        <div className="mt-5 flex items-start gap-3 rounded-md border border-amber-400/25 bg-amber-400/5 px-4 py-3">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Die individuelle Coach-Beobachtung bleibt für alle aktiven Athleten verfügbar. Die gemeinsame
            Team-Evidence bleibt getrennt und wird erst mit vollständiger Teilnahmefreigabe aktiviert
            ({context.eligibleAthleteCount} von {context.athleteCount}).
          </p>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] sm:items-end">
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Ebene</p>
          <ToggleGroup
            type="single"
            value={mode}
            onValueChange={(value) => value && setMode(value as ReviewMode)}
            className="grid grid-cols-2 gap-1 rounded-md border border-border/60 bg-muted/45 p-1"
            aria-label="Beobachtungsebene"
          >
            <ToggleGroupItem value="team" disabled={!context.teamEligible} className="h-11 gap-2 data-[state=on]:bg-card">
              <Users className="h-4 w-4" aria-hidden="true" /> Team
            </ToggleGroupItem>
            <ToggleGroupItem value="athlete" disabled={observableAthletes.length === 0} className="h-11 gap-2 data-[state=on]:bg-card">
              <UserRound className="h-4 w-4" aria-hidden="true" /> Einzel
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {mode === "athlete" && (
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Athletin oder Athlet</p>
            <Select value={selectedAthleteId} onValueChange={setSelectedAthleteId}>
              <SelectTrigger className="h-11 bg-card/70" aria-label="Athlet auswählen">
                <SelectValue placeholder="Athlet auswählen" />
              </SelectTrigger>
              <SelectContent>
                {observableAthletes.map((athlete) => (
                  <SelectItem key={athlete.programInstanceId} value={athlete.programInstanceId}>
                    {athlete.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {mode === "athlete" && selectedAthlete && (
        <div className="mt-4 flex items-start gap-3 rounded-md border border-border/60 bg-muted/25 px-4 py-3">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Diese Einzelbeobachtung kann nur von dir erneut geöffnet werden. Sie wird nicht dem Athleten angezeigt und
            nicht in Website-, KI- oder externe Evidence-Exporte aufgenommen.
          </p>
        </div>
      )}

      {reviewAvailable ? (
        <div className="mt-7">
          <CoachWeeklyReview
            key={`${mode}-${selectedAthleteId || "team"}-${context.weekNumber}-${activeReview?.context ?? "new"}`}
            weekNumber={context.weekNumber}
            initialValues={activeReview?.values}
            initialContext={activeReview?.context}
            title={mode === "team" ? "Teamverhalten dieser Woche" : `${selectedAthlete?.fullName ?? "Athlet"} · Beobachtung`}
            description={mode === "team"
              ? "Bewerte nur Verhalten, das du im Team in dieser Woche tatsächlich erkennen konntest."
              : "Bewerte ausschließlich konkrete Situationen, die du selbst beobachtet hast."}
            onSubmit={submit}
          />
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">Für diese Ebene ist aktuell keine Beobachtung verfügbar.</p>
      )}
    </section>
  );
};

export default CoachEvidenceReviewPanel;
