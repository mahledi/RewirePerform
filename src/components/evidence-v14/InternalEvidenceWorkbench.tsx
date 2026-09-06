import type { InternalEvidenceRow } from "./models";

export default function InternalEvidenceWorkbench({ rows }: { rows: InternalEvidenceRow[] }) {
  return (
    <section className="space-y-5" aria-labelledby="internal-evidence-title">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">Interne Evidenzarbeit</p>
        <h2 id="internal-evidence-title" className="mt-2 text-2xl font-semibold text-white">Pseudonymisierte Messprüfung</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">Keine Namen, E-Mails, Freitexte oder Coach-Profile. Quellen bleiben getrennt.</p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-white/10">
        <div className="grid grid-cols-[1.2fr_1.4fr_1.1fr_.7fr] gap-3 bg-white/[0.06] px-4 py-3 text-xs uppercase tracking-wider text-zinc-500">
          <span>Subject Ref</span><span>Konstrukt · Quelle</span><span>Vergleich</span><span>Delta</span>
        </div>
        {rows.map((row) => (
          <div key={`${row.subjectRef}-${row.constructId}-${row.sourceFamily}`} className="grid grid-cols-[1.2fr_1.4fr_1.1fr_.7fr] gap-3 border-t border-white/10 px-4 py-3 text-sm">
            <span className="truncate font-mono text-zinc-400">{row.subjectRef}</span>
            <span className="text-zinc-200">{row.constructId}<small className="block text-zinc-500">{row.sourceFamily}</small></span>
            <span className="text-zinc-400">{row.comparison.replace("_", " → ")}</span>
            <span className={row.change > 0 ? "text-emerald-400" : row.change < 0 ? "text-rose-400" : "text-zinc-400"}>{row.change > 0 ? "+" : ""}{row.change}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
