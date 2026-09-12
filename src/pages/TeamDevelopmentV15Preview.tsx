import { useState } from "react";
import {
  AthletePulseHistory,
  AthleteTeamMomentumCard,
} from "@/components/progress/AthletePulseHistory";
import { CoachPulseHistory, type WellbeingDay } from "@/components/coach/TeamMentalState";
import type { PulseDay } from "@/lib/pulseHistory";

const ownDays: PulseDay[] = [
  { date: "2026-09-05", sufficient_data: true, values: { mood: 8, energy: 7, focus: 8, stress: 4, recovery: 7, sleep_quality: 7, physical_readiness: 8, motivation: 9, pressure: 4, team_connection: 8 } },
  { date: "2026-09-04", sufficient_data: true, values: { mood: 7, energy: 6, focus: 7, stress: 5, recovery: 6, sleep_quality: 6, physical_readiness: 7, motivation: 8, pressure: 5, team_connection: 7 } },
  { date: "2026-09-03", sufficient_data: true, values: { mood: 7, energy: 7, focus: 6, stress: 5, recovery: 7, sleep_quality: 8, physical_readiness: 7, motivation: 7, pressure: 5, team_connection: 7 } },
  { date: "2026-08-30", sufficient_data: true, values: { mood: 6, energy: 6, focus: 6, stress: 6, recovery: 6, sleep_quality: 6, physical_readiness: 6, motivation: 7, pressure: 6, team_connection: 6 } },
];

const teamWeek = (
  week: string,
  start: string,
  n: number,
  values: Partial<Record<"mood" | "energy" | "focus" | "stress" | "recovery" | "sleep_quality" | "physical_readiness" | "motivation" | "pressure" | "team_connection", number>>,
): WellbeingDay & { week: string } => ({
  week,
  start,
  n_users: n,
  sufficient_data: n >= 5,
  low_confidence: n >= 5 && n < 10,
  mood: values.mood ?? null,
  energy: values.energy ?? null,
  focus: values.focus ?? null,
  stress: values.stress ?? null,
  recovery: values.recovery ?? null,
  sleep_quality: values.sleep_quality ?? null,
  physical_readiness: values.physical_readiness ?? null,
  motivation: values.motivation ?? null,
  pressure: values.pressure ?? null,
  team_connection: values.team_connection ?? null,
});

const teamWeeks = [
  teamWeek("Woche ab 17.08.", "2026-08-17", 16, { mood: 6.1, energy: 6.0, focus: 6.2, stress: 5.8, recovery: 5.9, sleep_quality: 6.0, physical_readiness: 6.2, motivation: 6.5, pressure: 5.7, team_connection: 6.3 }),
  teamWeek("Letzte Woche", "2026-08-24", 18, { mood: 6.5, energy: 6.3, focus: 6.6, stress: 5.4, recovery: 6.2, sleep_quality: 6.3, physical_readiness: 6.5, motivation: 6.9, pressure: 5.2, team_connection: 6.8 }),
  teamWeek("Diese Woche", "2026-08-31", 11, { mood: 6.8, energy: 6.7, focus: 7.0, stress: 5.1, recovery: 6.5, sleep_quality: 6.4, physical_readiness: 6.8, motivation: 7.2, pressure: 4.9, team_connection: 7.3 }),
];

const teamDays: WellbeingDay[] = [
  teamWeek("", "2026-08-31", 11, { mood: 6.8, energy: 6.7, focus: 7.0, stress: 5.1, recovery: 6.5, sleep_quality: 6.4, physical_readiness: 6.8, motivation: 7.2, pressure: 4.9, team_connection: 7.3 }),
].map((day) => ({ ...day, date: "2026-09-05" }));

export default function TeamDevelopmentV15Preview() {
  const [view, setView] = useState<"athlete" | "coach">("athlete");
  return (
    <main className="min-h-screen bg-[#0D0E12] px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/[0.06] p-4">
          <p className="text-sm text-white/68">Lokale V1.5-Vorschau · ausschließlich synthetische Beispieldaten</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setView("athlete")} className={`rounded-full px-4 py-2 text-xs font-semibold ${view === "athlete" ? "bg-primary text-primary-foreground" : "border border-white/10 text-white/60"}`}>Spieler</button>
            <button type="button" onClick={() => setView("coach")} className={`rounded-full px-4 py-2 text-xs font-semibold ${view === "coach" ? "bg-primary text-primary-foreground" : "border border-white/10 text-white/60"}`}>Coach</button>
          </div>
        </div>

        {view === "athlete" ? (
          <div className="mx-auto max-w-[480px]">
            <AthleteTeamMomentumCard momentum={{ available: true, team_size: 28, checked_in_today: 11, active_7d: 25, today: "2026-09-05" }} checkedInToday={false} />
            <AthletePulseHistory days={ownDays} />
          </div>
        ) : (
          <CoachPulseHistory days={teamDays} weeks={teamWeeks} minN={5} />
        )}
      </div>
    </main>
  );
}
