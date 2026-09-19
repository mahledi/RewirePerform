import { describe, expect, it } from "vitest";
import {
  DATA_CONTRIBUTION_CONSENT_VERSION,
  resolveDataContributionConsent,
} from "@/lib/dataContributionConsent";

describe("data contribution consent versioning", () => {
  it("keeps a current explicit decision", () => {
    expect(resolveDataContributionConsent(true, DATA_CONTRIBUTION_CONSENT_VERSION)).toEqual({
      consent: true,
      needsRenewal: false,
    });
    expect(resolveDataContributionConsent(false, DATA_CONTRIBUTION_CONSENT_VERSION)).toEqual({
      consent: false,
      needsRenewal: false,
    });
  });

  it("requires renewed consent when an older approval would unlock the expanded evidence scope", () => {
    expect(resolveDataContributionConsent(true, "data_contribution_v1_2026_07")).toEqual({
      consent: null,
      needsRenewal: true,
    });
    expect(resolveDataContributionConsent(true, null)).toEqual({
      consent: null,
      needsRenewal: true,
    });
  });

  it("does not turn an older refusal into a required approval", () => {
    expect(resolveDataContributionConsent(false, "data_contribution_v1_2026_07")).toEqual({
      consent: false,
      needsRenewal: false,
    });
    expect(resolveDataContributionConsent(null, null)).toEqual({
      consent: null,
      needsRenewal: false,
    });
  });
});
