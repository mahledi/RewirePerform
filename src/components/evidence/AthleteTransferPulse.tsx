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
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Transfer-Pulse</p>
        <h2 id="transfer-pulse-title" className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.04em] text-foreground">
          {domain.label}
        </h2>
        <p className="mt-4 text-[15px] leading-7 text-white/62">{pulse.prompt}</p>
      </div>

      <fieldset className="grid gap-2.5">
        <legend className="sr-only">Wie gut ist dir das heute gelungen?</legend>
        {scoredOptions.map((option) => {
          const selected = value === option.value;
          return (
            <label
              key={option.value}
              className={cn(
                "relative flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-[background-color,border-color,box-shadow]",
                "focus-within:ring-2 focus-within:ring-ring",
                disabled && "cursor-not-allowed opacity-50",
                selected
                  ? "border-primary/55 bg-primary/[0.1] text-foreground shadow-[inset_0_1px_0_rgba(98,198,168,0.12),0_0_28px_-20px_rgba(46,173,137,0.9)]"
                  : "border-white/[0.07] bg-white/[0.028] text-foreground hover:border-white/[0.12] hover:bg-white/[0.045]",
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
              "relative mt-1 flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
              "focus-within:ring-2 focus-within:ring-ring",
              disabled && "cursor-not-allowed opacity-50",
              value === "not_observed"
                ? "border-primary/60 bg-primary/10 text-foreground"
                : "border-white/[0.065] bg-transparent text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
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
