import { describe, expect, it } from "vitest";
import {
  SPORT_TAXONOMY_VERSION,
  buildStructuredSportProfile,
  normalizeSportLevel,
  resolveSportContext,
  resolveSportParticipationFormat,
} from "@/lib/personalization/sportTaxonomy";

describe("structured sport taxonomy", () => {
  it.each([
    ["Fußball", "invasion_team_sport", "team"],
    ["Volleyball", "net_or_target_sport", "team"],
    ["Boxen", "combat_sport", "individual"],
    ["100 m Freistil", "endurance_sport", "individual"],
    ["Bogenschießen", "precision_sport", "individual"],
    ["Unbekannte neue Sportart", "unknown_or_other", "mixed_or_unknown"],
  ])("classifies %s consistently", (sport, category, format) => {
    expect(resolveSportContext(sport).category).toBe(category);
    expect(resolveSportParticipationFormat(sport)).toBe(format);
  });

  it("builds versioned profile fields from existing onboarding answers", () => {
    expect(buildStructuredSportProfile("Boxen", "competitive_amateur")).toEqual({
      sport_category: "combat_sport",
      sport_format: "individual",
      sport_level: "competitive_amateur",
      sport_taxonomy_version: SPORT_TAXONOMY_VERSION,
    });
  });

  it("fails closed for unknown level values", () => {
    expect(normalizeSportLevel("world_class")).toBeNull();
    expect(normalizeSportLevel(null)).toBeNull();
  });
});
