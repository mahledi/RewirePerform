import { Check, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  EVIDENCE_DOMAINS,
  TRANSFER_PULSE_SCALE,
  type ScheduledTransferPulse,
  type TransferPulseResponse,
} from "@/lib/performanceEvidence";

interface AthleteTransferPulseProps {
  pulse: ScheduledTransferPulse;
  value: TransferPulseResponse | null;
  onValueChange: (value: TransferPulseResponse) => void;
  disabled?: boolean;
}

const AthleteTransferPulse = ({
  pulse,
  value,
  onValueChange,
  disabled = false,
}: AthleteTransferPulseProps) => {
  const domain = EVIDENCE_DOMAINS[pulse.domainId];
  const scoredOptions = TRANSFER_PULSE_SCALE.filter((option) => option.value !== "not_observed");
  const notObservedOption = TRANSFER_PULSE_SCALE.find((option) => option.value === "not_observed");

  return (
    <section aria-labelledby="transfer-pulse-title" className="mx-auto w-full max-w-xl">
      <div className="mb-7">
        <p className="mb-2 text-xs font-semibold uppercase text-primary">Kurzer Rückblick</p>
        <h2 id="transfer-pulse-title" className="text-xl font-semibold leading-tight text-foreground sm:text-2xl">
          {domain.label}
        </h2>
        <p className="mt-3 text-base leading-relaxed text-foreground/90">{pulse.prompt}</p>
      </div>

      <fieldset className="grid gap-2.5">
        <legend className="sr-only">Wie gut ist dir das heute gelungen?</legend>
        {scoredOptions.map((option) => {
          const selected = value === option.value;
          return (
            <label
              key={option.value}
              className={cn(
                "relative flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-left",
                "focus-within:ring-2 focus-within:ring-ring",
                disabled && "cursor-not-allowed opacity-50",
                selected
                  ? "border-primary/80 bg-primary/10 text-foreground shadow-[inset_0_1px_0_hsl(var(--primary)/0.16)]"
                  : "border-border/70 bg-card/60 text-foreground hover:border-border hover:bg-secondary/55",
              )}
            >
              <input
                type="radio"
                name={`transfer-pulse-${pulse.dayNumber}-${pulse.domainId}`}
                value={String(option.value)}
                checked={selected}
                onChange={() => onValueChange(option.value)}
                disabled={disabled}
                aria-label={option.label}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                  selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background/70",
                )}
              >
                {selected && <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{option.label}</span>
                <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{option.description}</span>
              </span>
            </label>
          );
        })}

        {notObservedOption && (
          <label
            className={cn(
              "relative mt-1 flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-left",
              "focus-within:ring-2 focus-within:ring-ring",
              disabled && "cursor-not-allowed opacity-50",
              value === "not_observed"
                ? "border-primary/60 bg-primary/10 text-foreground"
                : "border-border/60 bg-transparent text-muted-foreground hover:bg-secondary/45 hover:text-foreground",
            )}
          >
            <input
              type="radio"
              name={`transfer-pulse-${pulse.dayNumber}-${pulse.domainId}`}
              value="not_observed"
              checked={value === "not_observed"}
              onChange={() => onValueChange("not_observed")}
              disabled={disabled}
              aria-label={notObservedOption.label}
              className="sr-only"
            />
            <EyeOff className="h-4 w-4" aria-hidden="true" />
            <span className="text-sm font-medium">{notObservedOption.label}</span>
          </label>
        )}
      </fieldset>
    </section>
  );
};

export default AthleteTransferPulse;
