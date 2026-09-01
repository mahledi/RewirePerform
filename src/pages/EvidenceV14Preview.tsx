import { useState } from "react";
import AthleteEvidenceTimeline from "@/components/evidence-v14/AthleteEvidenceTimeline";
import CoachTeamDevelopment from "@/components/evidence-v14/CoachTeamDevelopment";
import EvidenceReport from "@/components/evidence-v14/EvidenceReport";
import InternalEvidenceWorkbench from "@/components/evidence-v14/InternalEvidenceWorkbench";
import type { AthleteTimelinePoint, CoachAggregateRow, EvidenceReportModel, InternalEvidenceRow } from "@/components/evidence-v14/models";

const athletePoints: AthleteTimelinePoint[] = [
  { constructId: "error_recovery", label: "Fehler und Rückkehr", timing: "pre", score: 48, measuredAt: "2026-09-01" },
  { constructId: "error_recovery", label: "Fehler und Rückkehr", timing: "mid", score: 57, measuredAt: "2026-09-28" },
  { constructId: "error_recovery", label: "Fehler und Rückkehr", timing: "post", score: 64, measuredAt: "2026-10-26" },
  { constructId: "focus_presence", label: "Prozessfokus und Präsenz", timing: "pre", score: 51, measuredAt: "2026-09-01" },
  { constructId: "focus_presence", label: "Prozessfokus und Präsenz", timing: "mid", score: 55, measuredAt: "2026-09-28" },
  { constructId: "focus_presence", label: "Prozessfokus und Präsenz", timing: "post", score: 61, measuredAt: "2026-10-26" },
];
const internalRows: InternalEvidenceRow[] = [
  { subjectRef: "91b7…a120", constructId: "error_recovery", sourceFamily: "onboarding_self_report", comparison: "pre_post", change: 16, quality: "complete" },
  { subjectRef: "91b7…a120", constructId: "error_recovery", sourceFamily: "coach_observation", comparison: "pre_post", change: 10, quality: "complete" },
  { subjectRef: "35f2…89c4", constructId: "focus_presence", sourceFamily: "development_index", comparison: "pre_mid", change: 5, quality: "partial" },
];
const coachRows: CoachAggregateRow[] = [
  { constructId: "error_recovery", label: "Fehler und Rückkehr", pairedN: 18, confidence: "standard", meanChange: 9.4 },
  { constructId: "pressure_regulation", label: "Druck und Regulation", pairedN: 8, confidence: "low", meanChange: 5.1 },
  { constructId: "team_connection", label: "Teamverbundenheit", pairedN: 4, confidence: "suppressed", meanChange: null },
];
const report: EvidenceReportModel = { eligibleN: 27, completePairsN: 18, missingN: 9, primaryResults: coachRows, claimClass: "self_reported_change", causalClaimAllowed: false };
const tabs = ["Athlet", "Intern", "Coach", "Bericht"] as const;

export default function EvidenceV14Preview() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Athlet");
  return (
    <main className="min-h-screen bg-[#090b0d] px-5 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-4 text-sm text-amber-100">
          Lokale synthetische Vorschau · V1.4 ist nicht aktiviert und liest keine echten Spielerdaten.
        </div>
        <nav className="mb-8 flex flex-wrap gap-2" aria-label="Evidenzoberflächen">
          {tabs.map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`min-h-11 rounded-full px-5 text-sm ${tab === item ? "bg-emerald-400 text-black" : "border border-white/10 bg-white/[0.04] text-zinc-300"}`}>{item}</button>)}
        </nav>
        {tab === "Athlet" && <AthleteEvidenceTimeline points={athletePoints} />}
        {tab === "Intern" && <InternalEvidenceWorkbench rows={internalRows} />}
        {tab === "Coach" && <CoachTeamDevelopment rows={coachRows} />}
        {tab === "Bericht" && <EvidenceReport report={report} />}
      </div>
    </main>
  );
}
