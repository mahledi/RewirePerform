import type { EvidenceReportModel } from "./models";

export default function EvidenceReport({ report }: { report: EvidenceReportModel }) {
  return (
    <section className="space-y-5" aria-labelledby="evidence-report-title">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Evidenzbericht</p>
        <h2 id="evidence-report-title" className="mt-2 text-2xl font-semibold text-white">Was der Datensatz trägt</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">Selbstberichtete Veränderung mit Unsicherheit und Missingness. Keine kausale Wirksamkeitsbehauptung.</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[["Berechtigt", report.eligibleN], ["Vollständige Paare", report.completePairsN], ["Fehlend", report.missingN]].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><p className="text-xs text-zinc-500">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></div>
        ))}
      </div>
      <div className="rounded-2xl border border-violet-400/20 bg-violet-400/[0.06] p-4 text-sm text-violet-100">
        Claim-Klasse: {report.claimClass.replaceAll("_", " ")} · Kausalität: {report.causalClaimAllowed ? "freigegeben" : "gesperrt"}
      </div>
    </section>
  );
}
