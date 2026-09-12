import type { CoachAggregateRow } from "./models";

export default function CoachTeamDevelopment({ rows, minimumGroupSize = 5 }: { rows: CoachAggregateRow[]; minimumGroupSize?: number }) {
  return (
    <section className="space-y-5" aria-labelledby="coach-evidence-title">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">Teamaggregate</p>
        <h2 id="coach-evidence-title" className="mt-2 text-2xl font-semibold text-white">Entwicklung des Teams</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">Nur Gruppen ab n ≥ {minimumGroupSize}. Keine Einzelwerte, privaten Antworten oder psychologischen Profile.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((row) => (
          <article key={row.constructId} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-start justify-between gap-4">
              <div><p className="font-medium text-zinc-100">{row.label}</p><p className="mt-1 text-xs text-zinc-500">{row.pairedN} vollständige Paare · {row.confidence}</p></div>
              <p className="text-xl font-semibold text-emerald-400">{row.meanChange === null ? "—" : `${row.meanChange > 0 ? "+" : ""}${row.meanChange}`}</p>
            </div>
            {row.meanChange === null && <p className="mt-4 rounded-xl bg-black/20 px-3 py-2 text-xs text-zinc-500">Aus Datenschutzgründen unterdrückt.</p>}
          </article>
        ))}
      </div>
    </section>
  );
}
