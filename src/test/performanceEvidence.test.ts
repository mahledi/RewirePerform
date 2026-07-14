import { describe, expect, it } from "vitest";
import {
  EVIDENCE_DOMAINS,
  EVIDENCE_PROTOCOL_VERSION,
  MAX_DAILY_EVIDENCE_SECONDS,
  MAX_EVIDENCE_INTERACTION_DURATION_MS,
  PERFORMANCE_LAB_MILESTONES,
  TRANSFER_PULSE_DAYS,
  TRANSFER_PULSE_SCHEDULE,
  calculateEvidenceCoverage,
  getAdditionalMandatoryEvidenceSeconds,
  getMaximumAthleteTransferBurden,
  getPerformanceLabMilestone,
  getTransferPulseForDay,
  isProgramDay,
  isTransferPulseResponse,
  normalizeEvidenceDurationMs,
  shouldPreserveReflectionDraft,
} from "@/lib/performanceEvidence";

describe("56-day performance evidence protocol", () => {
  it("keeps every scheduled transfer pulse inside the 56-day program", () => {
    expect(TRANSFER_PULSE_SCHEDULE).toHaveLength(16);
    expect(TRANSFER_PULSE_SCHEDULE.map((item) => item.dayNumber)).toEqual(TRANSFER_PULSE_DAYS);
    expect(TRANSFER_PULSE_SCHEDULE.every((item) => isProgramDay(item.dayNumber))).toBe(true);
    expect(new Set(TRANSFER_PULSE_DAYS).size).toBe(TRANSFER_PULSE_DAYS.length);
  });

  it("adds no time on normal days and caps the honest pulse-day burden", () => {
    for (let dayNumber = 1; dayNumber <= 56; dayNumber += 1) {
      const expectedSeconds = TRANSFER_PULSE_DAYS.includes(dayNumber as typeof TRANSFER_PULSE_DAYS[number])
        ? 20
        : 0;
      expect(getAdditionalMandatoryEvidenceSeconds(dayNumber, "training")).toBe(expectedSeconds);
      expect(getAdditionalMandatoryEvidenceSeconds(dayNumber, "competition")).toBe(expectedSeconds);
      expect(getAdditionalMandatoryEvidenceSeconds(dayNumber, "rest")).toBe(0);
    }
    expect(MAX_DAILY_EVIDENCE_SECONDS).toBe(25);
    expect(getMaximumAthleteTransferBurden()).toEqual({
      programDays: 56,
      pulseDays: 16,
      totalAdditionalSeconds: 320,
      averageAdditionalSecondsPerProgramDay: 320 / 56,
      maximumSecondsOnPulseDay: 20,
    });
  });

  it("replaces reflection only on scheduled sport days", () => {
    const trainingPulse = getTransferPulseForDay(4, "training");
    const competitionPulse = getTransferPulseForDay(4, "competition");

    expect(trainingPulse).toMatchObject({
      dayNumber: 4,
      eventType: "training",
      replacesOptionalReflection: true,
      protocolVersion: EVIDENCE_PROTOCOL_VERSION,
    });
    expect(competitionPulse?.prompt).toContain("Wettkampf");
    expect(getTransferPulseForDay(4, "rest")).toBeNull();
    expect(getTransferPulseForDay(5, "training")).toBeNull();
    expect(getTransferPulseForDay(0, "training")).toBeNull();
    expect(getTransferPulseForDay(57, "training")).toBeNull();
  });

  it("covers all five program domains without creating a mega-score", () => {
    const scheduledDomains = new Set(TRANSFER_PULSE_SCHEDULE.map((item) => item.domainId));
    expect(scheduledDomains).toEqual(new Set(Object.keys(EVIDENCE_DOMAINS)));

    const coverage = calculateEvidenceCoverage([
      { domainId: "attention_return", source: "athlete", response: 3 },
      { domainId: "attention_return", source: "coach_team", response: 4 },
      { domainId: "error_recovery", source: "athlete", response: "not_observed" },
      { domainId: "process_execution", source: "coach_athlete", response: 2 },
    ]);

    expect(coverage).toEqual({
      scoredObservations: 3,
      notObserved: 1,
      coveredDomains: 2,
      domains: {
        attention_return: 2,
        error_recovery: 0,
        pressure_regulation: 0,
        process_execution: 1,
        action_under_uncertainty: 0,
      },
    });
  });

  it("treats not observed as a valid response without scoring it", () => {
    expect(isTransferPulseResponse("not_observed")).toBe(true);
    expect(isTransferPulseResponse(1)).toBe(true);
    expect(isTransferPulseResponse(4)).toBe(true);
    expect(isTransferPulseResponse(0)).toBe(false);
    expect(isTransferPulseResponse(5)).toBe(false);
    expect(isTransferPulseResponse("3")).toBe(false);
  });

  it("never replaces an unsaved private reflection draft", () => {
    expect(shouldPreserveReflectionDraft({
      eligible: true,
      existingResponse: null,
      reflection: "Das möchte ich nicht verlieren.",
    })).toBe(true);
    expect(shouldPreserveReflectionDraft({
      eligible: true,
      existingResponse: 3,
      reflection: "Alt",
    })).toBe(false);
    expect(shouldPreserveReflectionDraft({
      eligible: false,
      existingResponse: null,
      reflection: "Alt",
    })).toBe(false);
  });

  it("records bounded interaction duration without user-visible tracking", () => {
    expect(normalizeEvidenceDurationMs(1234.6)).toBe(1235);
    expect(normalizeEvidenceDurationMs(-1)).toBeNull();
    expect(normalizeEvidenceDurationMs("1200")).toBeNull();
    expect(normalizeEvidenceDurationMs(MAX_EVIDENCE_INTERACTION_DURATION_MS + 5_000))
      .toBe(MAX_EVIDENCE_INTERACTION_DURATION_MS);
  });

  it("keeps familiarization outside outcome scoring and all measurements within day 56", () => {
    expect(getPerformanceLabMilestone(0)).toMatchObject({ kind: "practice", countsAsOutcome: false });
    expect(getPerformanceLabMilestone(28)).toMatchObject({ kind: "measurement", countsAsOutcome: true });
    expect(getPerformanceLabMilestone(13)).toBeNull();
    expect(PERFORMANCE_LAB_MILESTONES.at(-1)?.dayNumber).toBe(56);
  });
});
