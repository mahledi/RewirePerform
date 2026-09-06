import { describe, expect, it } from "vitest";
import { buildMicroAdjustmentContext } from "@/lib/microAdjustment";
import type { MicroAdjustmentInput } from "@/lib/microAdjustment";

const baseInput = (overrides: Partial<MicroAdjustmentInput> = {}): MicroAdjustmentInput => ({
  day: {
    dayNumber: 14,
    lens: "Ergebnisdenken raubt Gegenwart",
    primaryMechanism: "Outcome Detachment",
    recurrenceType: "Grundöffnung",
    phase: 1,
  },
  contextType: "training",
  ...overrides,
});

describe("personalization engine", () => {
  it("falls back cleanly for missing profile and unknown sport", () => {
    const out = buildMicroAdjustmentContext(baseInput());
    expect(out.athleteAddressLine).toContain("Trainingstag");
    expect(out.sportContextLine).toContain("deinen Sport");
    expect(out.roleContextLine).toBeNull();
    expect(out.microCue).toBeTruthy();
  });

  it("supports football without making it the only sport", () => {
    const out = buildMicroAdjustmentContext(baseInput({ profile: { sport: "Fußball", position: "Innenverteidiger" } }));
    expect(out.sportContextLine).toContain("Teamsport");
    expect(out.roleContextLine).toContain("Ordnung");
    expect(out.sourceTags).toContain("sport:invasion_team_sport");
  });

  it("supports basketball as an invasion team sport", () => {
    const out = buildMicroAdjustmentContext(baseInput({ profile: { sport: "Basketball", position: "Point Guard" } }));
    expect(out.sportContextLine).toContain("Teamsport");
    expect(out.roleContextLine).toContain("Übersicht");
    expect(out.roleContextLine).toContain("nächste Entscheidung");
  });

  it("supports boxing and combat sport language", () => {
    const out = buildMicroAdjustmentContext(baseInput({ profile: { sport: "Boxen", position: "Southpaw" } }));
    expect(out.sportContextLine).toContain("Kampfsport");
    expect(out.roleContextLine).toContain("Distanz");
    expect(out.roleContextLine).toContain("Timing");
  });

  it("supports gymnastics and technical sport language", () => {
    const out = buildMicroAdjustmentContext(baseInput({ profile: { sport: "Turnen", position: "Boden" } }));
    expect(out.sportContextLine).toContain("technische Sportarten");
    expect(out.roleContextLine).toContain("Körperspannung");
    expect(out.roleContextLine).toContain("Versuch");
    expect(out.roleContextLine).toContain("Rhythmus");
  });

  it("supports endurance sport language", () => {
    const out = buildMicroAdjustmentContext(baseInput({ profile: { sport: "Schwimmen", position: "Freistil" } }));
    expect(out.sportContextLine).toContain("Ausdauer");
    expect(out.roleContextLine).toContain("Pace");
    expect(out.roleContextLine).toContain("Atmung");
  });

  it("frames competition days with next-action language", () => {
    const out = buildMicroAdjustmentContext(baseInput({ contextType: "competition", profile: { sport: "Tennis" } }));
    expect(out.athleteAddressLine).toContain("Wettkampftag");
    expect(out.sportContextLine).toContain("nächste");
    expect(out.microCue).toBe("Nur die nächste.");
  });

  it("frames rest days without extra pressure", () => {
    const out = buildMicroAdjustmentContext(baseInput({ contextType: "rest", profile: { sport: "Triathlon" } }));
    expect(out.athleteAddressLine).toContain("Ruhetag");
    expect(out.sportContextLine).toContain("Regeneration");
    expect(out.sportContextLine).not.toMatch(/Explosivität|Abschluss|Tempo steuern/);
  });

  it("makes same-day sport differences visible beyond the role word", () => {
    const football = buildMicroAdjustmentContext(baseInput({ profile: { sport: "Fußball", position: "Innenverteidiger" } }));
    const gymnastics = buildMicroAdjustmentContext(baseInput({ profile: { sport: "Turnen", position: "Boden" } }));
    const boxing = buildMicroAdjustmentContext(baseInput({ profile: { sport: "Boxen", position: "Southpaw" } }));

    expect(football.sportContextLine).not.toBe(gymnastics.sportContextLine);
    expect(gymnastics.sportContextLine).not.toBe(boxing.sportContextLine);
    expect(football.roleContextLine).toContain("Raum sichern");
    expect(gymnastics.roleContextLine).toContain("Körperspannung");
    expect(boxing.roleContextLine).toContain("Distanz");
  });

  it("uses role-specific language inside the same sport family", () => {
    const defender = buildMicroAdjustmentContext(baseInput({ profile: { sport: "Fußball", position: "Innenverteidiger" } }));
    const striker = buildMicroAdjustmentContext(baseInput({ profile: { sport: "Fußball", position: "Stürmer" } }));

    expect(defender.sportContextLine).toBe(striker.sportContextLine);
    expect(defender.roleContextLine).not.toBe(striker.roleContextLine);
    expect(defender.roleContextLine).toContain("Ordnung");
    expect(striker.roleContextLine).toContain("Timing");
    expect(striker.roleContextLine).toContain("Abschluss");
  });

  it("prioritizes low energy and high stress check-in signals", () => {
    const lowEnergy = buildMicroAdjustmentContext(baseInput({ checkin: { energy: 2, focus: 7, mood: 6, stress: 3 } }));
    expect(lowEnergy.stateLine).toContain("niedriger Energie");
    expect(lowEnergy.primaryAdaptationLine).toBe(lowEnergy.stateLine);
    expect(lowEnergy.microCue).toBe("Klein und sauber.");

    const highStress = buildMicroAdjustmentContext(baseInput({ checkin: { energy: 6, focus: 6, mood: 6, stress: 8 } }));
    expect(highStress.stateLine).toContain("hoher Anspannung");
    expect(highStress.primaryAdaptationLine).toBe(highStress.stateLine);
    expect(highStress.microCue).toBe("Ein Anker reicht.");
  });

  it("uses strong questionnaire signals without diagnostic language", () => {
    const resultFocus = buildMicroAdjustmentContext(baseInput({ questionnaireSignals: { resultFocus: 0.9 } }));
    expect(resultFocus.profileLine).toContain("Ergebnis");
    expect(resultFocus.profileLine).not.toMatch(/Diagnose|Problem|Angststörung|instabil/i);

    const selfCriticism = buildMicroAdjustmentContext(baseInput({ questionnaireSignals: { selfCriticism: 0.85 } }));
    expect(selfCriticism.profileLine).toContain("Selbstkritik");
    expect(selfCriticism.primaryAdaptationLine).toBe(selfCriticism.profileLine);
    expect(selfCriticism.microCue).toBe("Aktion, nicht Urteil.");
  });

  it("does not use journal patterns for personalization", () => {
    const out = buildMicroAdjustmentContext(baseInput());
    expect(out.journalPatternLine).toBeNull();
    expect(out.journalPatternEmphasis).toBeNull();
    expect(out.sourceTags).not.toContain("journal_pattern");
  });
});
