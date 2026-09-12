import { EVIDENCE_V14_CONSTRUCTS } from "@/lib/evidenceV14/measurementContract";
import type { AthleteTimelinePoint } from "./models";

export default function AthleteEvidenceTimeline({ points }: { points: AthleteTimelinePoint[] }) {
  return (
    <section className="space-y-5" aria-labelledby="athlete-evidence-title">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Nur für dich</p>
        <h2 id="athlete-evidence-title" className="mt-2 text-2xl font-semibold text-white">Deine Entwicklung im Verlauf</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">Selbsteinschätzungen zeigen Veränderungen, keine Diagnose und keine Bewertung deiner Person.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {Object.values(EVIDENCE_V14_CONSTRUCTS).map((construct) => {
          const constructPoints = points.filter((point) => point.constructId === construct.id);
          if (constructPoints.length === 0) return null;
          return (
            <article key={construct.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <p className="text-sm font-medium text-zinc-200">{construct.label}</p>
              <div className="mt-4 flex items-end gap-3">
                {constructPoints.map((point) => (
                  <div key={`${construct.id}-${point.timing}`} className="flex min-w-16 flex-1 flex-col gap-2">
                    <div className="flex h-24 items-end rounded-xl bg-black/20 p-1.5">
                      <div className="w-full rounded-lg bg-emerald-400/80" style={{ height: `${Math.max(8, point.score)}%` }} />
                    </div>
                    <p className="text-center text-xs uppercase tracking-wider text-zinc-500">{point.timing}</p>
                    <p className="text-center text-sm font-semibold text-white">{point.score}</p>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
