import { describe, expect, it } from "vitest";
import { buildJarvisAnswer, type JarvisReadModel } from "@/lib/adminJarvis";

const data: JarvisReadModel = {
  overview: { total_athletes: 12, total_teams: 2, active_teams: 1, total_checkins: 84, total_completed_days: 60 },
  teams: [{}, {}],
  system: { users_missing_role: 0 },
  operations: { failed_events_24h: 2, critical_failed_events_24h: 0 },
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
});
