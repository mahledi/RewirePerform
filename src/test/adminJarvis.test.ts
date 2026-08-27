import { describe, expect, it } from "vitest";
import { buildJarvisAnswer, type JarvisReadModel } from "@/lib/adminJarvis";

const data: JarvisReadModel = {
  overview: { total_athletes: 12, total_teams: 2, active_teams: 1, total_checkins: 84, total_completed_days: 60 },
  teams: [{}, {}],
  system: { users_missing_role: 0 },
  operations: { failed_events_24h: 2, critical_failed_events_24h: 0 },
  presentation: null,
  study: {
    summary: { athletes_total: 12 },
    activation: { active_7d: 8, active_28d: 11 },
    activity: { checkins_total: 84, completed_days_total: 60, avg_comprehension: 0.78 },
    data_quality: { athletes_without_program_instance: 1, athletes_without_day_1: 2, athletes_without_any_activity: 3 },
    measurement_readiness: { validated_assessments_pre_n: 10, validated_assessments_mid_n: 7, validated_assessments_post_n: 5 },
    team_summaries: [
      { team: "U17", athlete_count: 8, avg_completion_rate: 0.72, avg_comprehension: 0.81 },
      { team: "Solo", athlete_count: 3, avg_completion_rate: 0.9, avg_comprehension: 0.88 },
    ],
  },
  solo: { sample: { eligible_participants: 6, total_observations: 24 }, coverage: { transfer_completion_rate: 0.75 } },
  trends: {
    segments: [
      { participation_mode: "all", sample_size: 12, sufficient_data: true, previous_active_athletes: 6, current_active_athletes: 8, active_athlete_delta: 2, direction: "up", previous_checkins: 20, current_checkins: 28, previous_completed_days: 18, current_completed_days: 24 },
      { participation_mode: "team", sample_size: 8, sufficient_data: true, previous_active_athletes: 5, current_active_athletes: 4, active_athlete_delta: -1, direction: "down", previous_checkins: 14, current_checkins: 12, previous_completed_days: 11, current_completed_days: 10 },
      { participation_mode: "solo", sample_size: 4, sufficient_data: false, previous_active_athletes: null, current_active_athletes: null, active_athlete_delta: null, direction: "insufficient_data", previous_checkins: null, current_checkins: null, previous_completed_days: null, current_completed_days: null },
    ],
  },
};

describe("Admin Jarvis deterministic answers", () => {
  it("answers activity from read-only facts without an AI call", () => {
    const result = buildJarvisAnswer("Wie ist die Aktivität?", data);
    expect(result.answer).toContain("84 Check-ins");
    expect(result.answer).toContain("60 abgeschlossene Programmtage");
    expect(result.externalAiCalls).toBe(0);
    expect(result.boundary).toContain("ohne Freitext");
  });

  it("keeps feedback at n >= 5 and excludes free text", () => {
    const result = buildJarvisAnswer("Was sagt das Feedback?", data);
    expect(result.answer).toContain("n ≥ 5");
    expect(result.answer).toContain("Freitext bleibt vollständig ausgeschlossen");
  });

  it("reports operational facts without claiming a cause", () => {
    const result = buildJarvisAnswer("Welche Systemfehler gibt es?", data);
    expect(result.answer).toContain("2 fehlgeschlagene Flow-Events");
    expect(result.answer).toContain("noch keine Ursache");
  });

  it("explains equal-window all/team/solo trends without a causal claim", () => {
    const result = buildJarvisAnswer("Was geht hoch oder runter?", data);
    expect(result.answer).toContain("nicht überlappende 7-Tage-Fenster");
    expect(result.answer).toContain("Gesamt: 6 → 8 aktive Athleten (+2; mehr)");
    expect(result.answer).toContain("Team: 5 → 4 aktive Athleten (-1; weniger)");
    expect(result.answer).toContain("Solo: noch keine Freigabe ab n ≥ 5");
    expect(result.answer).toContain("Testkonten sind serverseitig ausgeschlossen");
    expect(result.boundary).toContain("ohne Freitext");
  });

  it("summarizes data quality without exposing identifiers", () => {
    const result = buildJarvisAnswer("Welche Datenlücken gibt es?", data);
    expect(result.answer).toContain("Athleten ohne Programmlauf: 1");
    expect(result.answer).toContain("ohne gemessene Aktivität: 3");
    expect(result.answer).not.toMatch(/user|email|name/i);
  });

  it("counts only team groups that meet n >= 5", () => {
    const result = buildJarvisAnswer("Wie stehen die Teams?", data);
    expect(result.answer).toContain("Auswertbare Teamgruppen: 1");
    expect(result.answer).toContain("n ≥ 5");
  });

  it("summarizes the privacy-safe solo aggregate", () => {
    const result = buildJarvisAnswer("Wie stehen die Solo-Athleten?", data);
    expect(result.answer).toContain("6 Teilnehmende");
    expect(result.answer).toContain("24");
    expect(result.answer).toContain("75 %");
  });
});
