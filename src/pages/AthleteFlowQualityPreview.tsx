import { useState } from "react";
import { Dumbbell, Moon, Trophy } from "lucide-react";
import DailyCheckin from "@/components/dashboard/DailyCheckin";
import type { CalendarEventType } from "@/content/matrixDayTypes";
import { cn } from "@/lib/utils";

const contexts: Array<{ id: CalendarEventType; label: string; icon: typeof Dumbbell }> = [
  { id: "training", label: "Training", icon: Dumbbell },
  { id: "competition", label: "Wettkampf", icon: Trophy },
  { id: "rest", label: "Ruhetag", icon: Moon },
];

const AthleteFlowQualityPreview = () => {
  const [day, setDay] = useState(10);
  const [context, setContext] = useState<CalendarEventType>("training");
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <DailyCheckin
        key={`${day}-${context}`}
        eventType={context}
        date={new Date("2026-08-24T12:00:00")}
        onClose={() => setOpen(false)}
        previewMode
        previewDayNumber={day}
      />
    );
  }

  return (
    <main className="flex min-h-[100dvh] items-center bg-[#0D0E12] px-5 py-10 text-[#EEF0F2]">
      <section className="mx-auto w-full max-w-md rounded-[30px] border border-white/[0.08] bg-white/[0.028] p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">V1.2 · intern</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">Athlete Flow prüfen</h1>
        <p className="mt-4 text-sm leading-6 text-white/52">Die echte Daily-Komponente mit deterministischen Vorschauwerten.</p>

        <label className="mt-7 block text-xs font-semibold text-white/55" htmlFor="athlete-flow-preview-day">Programmtag</label>
        <input
          id="athlete-flow-preview-day"
          type="number"
          min={1}
          max={56}
          value={day}
          onChange={(event) => setDay(Math.min(56, Math.max(1, Number(event.target.value) || 1)))}
          className="mt-2 min-h-12 w-full rounded-2xl border border-white/[0.08] bg-black/20 px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />

        <div className="mt-5 grid grid-cols-3 gap-2" aria-label="Tageskontext">
          {contexts.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={context === id}
              onClick={() => setContext(id)}
              className={cn(
                "flex min-h-12 items-center justify-center gap-2 rounded-2xl border text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                context === id
                  ? "border-primary/50 bg-primary/[0.1] text-white"
                  : "border-white/[0.07] bg-white/[0.025] text-white/48",
              )}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-7 min-h-12 w-full rounded-2xl bg-primary px-5 text-sm font-semibold text-[#07110e]"
        >
          Daily Flow öffnen
        </button>
      </section>
    </main>
  );
};

export default AthleteFlowQualityPreview;
