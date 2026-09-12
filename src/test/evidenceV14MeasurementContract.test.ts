import { describe, expect, it } from "vitest";
import { ONBOARDING_V2_QUESTIONS } from "@/content/questionnaireV2";
import {
  COMPLETION_USAGE_BOUNDARY,
  EVIDENCE_V14_CONSENT_VERSION,
  EVIDENCE_V14_CONSTRUCTS,
  EVIDENCE_V14_MEASUREMENT_ITEMS,
  EVIDENCE_V14_PRIVATE_ONLY_QUESTION_IDS,
} from "@/lib/evidenceV14/measurementContract";
import { EVIDENCE_V14_CLAIMS_LEDGER, isClaimClassActive } from "@/lib/evidenceV14/claimsLedger";

describe("V1.4 measurement and claims contracts", () => {
  it("maps exactly the 36 scored retest items once", () => {
    const expected = ONBOARDING_V2_QUESTIONS
      .filter((question) => question.retestEligible && question.includeInScore)
      .map((question) => question.id)
      .sort();
    const actual = EVIDENCE_V14_MEASUREMENT_ITEMS.map((item) => item.questionId).sort();
    expect(actual).toEqual(expected);
    expect(actual).toHaveLength(36);
    expect(new Set(actual).size).toBe(36);
  });

  it("keeps protected items out of internal and coach evidence", () => {
    expect(EVIDENCE_V14_PRIVATE_ONLY_QUESTION_IDS.length).toBeGreaterThan(0);
    EVIDENCE_V14_MEASUREMENT_ITEMS
      .filter((item) => EVIDENCE_V14_PRIVATE_ONLY_QUESTION_IDS.includes(item.questionId))
      .forEach((item) => {
        expect(item.internalPseudonymousAllowed).toBe(false);
        expect(item.coachAggregateAllowed).toBe(false);
        expect(item.allowedClaimClasses).toEqual([]);
      });
  });

  it("requires a future approved consent and retention contract", () => {
    expect(EVIDENCE_V14_CONSENT_VERSION).toContain("pending-block-9");
    expect(EVIDENCE_V14_MEASUREMENT_ITEMS.every((item) => item.requiredConsentVersion === EVIDENCE_V14_CONSENT_VERSION)).toBe(true);
  });

  it("uses five primary and two exploratory constructs without a hidden total score", () => {
    expect(Object.values(EVIDENCE_V14_CONSTRUCTS).filter((item) => item.analysisRole === "primary")).toHaveLength(5);
    expect(Object.values(EVIDENCE_V14_CONSTRUCTS).filter((item) => item.analysisRole === "exploratory")).toHaveLength(2);
    expect(COMPLETION_USAGE_BOUNDARY).toContain("weder ein mentaler Qualitätswert");
  });

  it("locks every claims level beyond descriptive use until activation", () => {
    expect(EVIDENCE_V14_CLAIMS_LEDGER.map((entry) => entry.claimClass)).toEqual([
      "use", "self_reported_change", "triangulated_change", "association", "causality",
    ]);
    expect(isClaimClassActive("use")).toBe(true);
    expect(isClaimClassActive("causality")).toBe(false);
    expect(EVIDENCE_V14_CLAIMS_LEDGER.find((entry) => entry.claimClass === "causality")?.requiredEvidence)
      .toContain("Vergleichsdesign");
  });
});
