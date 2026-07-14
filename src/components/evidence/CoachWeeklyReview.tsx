import { useMemo, useRef, useState } from "react";
import { Check, ClipboardCheck } from "lucide-react";
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
  COACH_OBSERVATION_LABELS,
  EVIDENCE_DOMAINS,
  normalizeEvidenceDurationMs,
  type CoachObservationContext,
  type EvidenceDomainId,
  type TransferPulseResponse,
} from "@/lib/performanceEvidence";

export type CoachWeeklyReviewValues = Record<EvidenceDomainId, TransferPulseResponse>;

export interface CoachWeeklyReviewSubmission {
  weekNumber: number;
  context: CoachObservationContext;
  values: CoachWeeklyReviewValues;
  durationMs: number;
}

interface CoachWeeklyReviewProps {
  weekNumber: number;
  initialValues?: Partial<CoachWeeklyReviewValues>;
  initialContext?: CoachObservationContext;
  title?: string;
  description?: string;
  onSubmit: (submission: CoachWeeklyReviewSubmission) => void | Promise<void>;
  disabled?: boolean;
}

const domainIds = Object.keys(EVIDENCE_DOMAINS) as EvidenceDomainId[];

const createInitialValues = (
  initialValues?: Partial<CoachWeeklyReviewValues>,
): CoachWeeklyReviewValues => Object.fromEntries(
  domainIds.map((domainId) => [domainId, initialValues?.[domainId] ?? "not_observed"]),
) as CoachWeeklyReviewValues;

const parseObservationResponse = (value: string): TransferPulseResponse =>
  value === "not_observed" ? value : Number(value) as TransferPulseResponse;

const CoachWeeklyReview = ({
  weekNumber,
  initialValues,
  initialContext = "training",
  title = "Teambeobachtung",
  description = "Bewerte nur Verhalten, das du in dieser Woche tatsächlich beobachten konntest.",
  onSubmit,
  disabled = false,
}: CoachWeeklyReviewProps) => {
  const [context, setContext] = useState<CoachObservationContext>(initialContext);
  const [values, setValues] = useState<CoachWeeklyReviewValues>(() => createInitialValues(initialValues));
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const reviewStartedAtRef = useRef(performance.now());

  const observedCount = useMemo(
    () => Object.values(values).filter((value) => value !== "not_observed").length,
    [values],
  );

  const submit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit({
        weekNumber,
        context,
        values,
        durationMs: normalizeEvidenceDurationMs(performance.now() - reviewStartedAtRef.current) ?? 0,
      });
    } catch {
      setSubmitError("Die Beobachtung wurde nicht gespeichert. Bitte versuche es erneut.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section aria-labelledby="coach-review-title" className="mx-auto w-full max-w-2xl">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary">
          <ClipboardCheck className="h-4.5 w-4.5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-primary">Woche {weekNumber}</p>
          <h2 id="coach-review-title" className="mt-1 text-xl font-semibold text-foreground sm:text-2xl">
            {title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Beobachtet bei</p>
        <ToggleGroup
          type="single"
          value={context}
          onValueChange={(next) => next && setContext(next as CoachObservationContext)}
          className="grid w-full grid-cols-3 gap-1 rounded-md border border-border/60 bg-muted/45 p-1"
          aria-label="Beobachtungskontext"
        >
          <ToggleGroupItem value="training" className="h-11 min-w-0 px-2 text-xs data-[state=on]:bg-card sm:text-sm">
            Training
          </ToggleGroupItem>
          <ToggleGroupItem value="competition" className="h-11 min-w-0 px-2 text-xs data-[state=on]:bg-card sm:text-sm">
            Wettkampf
          </ToggleGroupItem>
          <ToggleGroupItem value="mixed" className="h-11 min-w-0 px-2 text-xs data-[state=on]:bg-card sm:text-sm">
            Beides
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="mt-7 divide-y divide-border/55 border-y border-border/55">
        {domainIds.map((domainId) => {
          const domain = EVIDENCE_DOMAINS[domainId];
          return (
            <div key={domainId} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_12.5rem] sm:items-center">
              <div className="min-w-0 pr-2">
                <p className="text-sm font-semibold text-foreground">{domain.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{domain.coachPrompt}</p>
              </div>
              <Select
                value={String(values[domainId])}
                onValueChange={(next) => setValues((current) => ({
                  ...current,
                  [domainId]: parseObservationResponse(next),
                }))}
                disabled={disabled || submitting}
              >
                <SelectTrigger aria-label={`${domain.label} bewerten`} className="h-11 bg-card/70">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(COACH_OBSERVATION_LABELS) as [string, string][]).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-muted-foreground">
            {observedCount === 0 ? "Keine passende Beobachtung" : `${observedCount} von 5 Bereichen beobachtet`}
          </p>
          {submitError && (
            <p className="mt-1 text-xs text-destructive" role="alert">{submitError}</p>
          )}
        </div>
        <Button
          type="button"
          onClick={() => void submit()}
          disabled={disabled || submitting}
          className="h-11 w-full sm:w-auto"
        >
          <Check className="h-4 w-4" aria-hidden="true" />
          {submitting ? "Speichert..." : "Beobachtung speichern"}
        </Button>
      </div>
    </section>
  );
};

export default CoachWeeklyReview;
