import { describe, expect, it } from "vitest";
import { TRANSFER_PULSE_SCHEDULE } from "@/lib/performanceEvidence";
import { parseQaEvidenceParity } from "@/lib/qaEvidenceParity";

const rawReport = () => ({
  schema_version: "qa_evidence_parity_v1",
  generated_at: "2026-07-17T09:00:00.000Z",
  protocol_version: "56d-transfer-v2-2026-07",
  state: "READY",
  state_label: "Bereit für den ersten QA-Messpunkt",
  scope: {
    team_id: "team-1",
    team_name: "QA Team",
    program_run_id: "run-1",
    program_run_name: "QA Run",
    simulated_date: "2026-07-17",
    simulated_day_number: 1,
    test_only: true,
  },
  setup: {
    athletes: 5,
    active_instances: 5,
    expected_qa_athletes: 5,
    all_participants_test_flagged: true,
  },
  coverage: {
    scheduled_days: 16,
    reached_days: 0,
    passed_days: 0,
    expected_observations: 0,
    collected_observations: 0,
    missing_observations: 0,
    not_observed_responses: 0,
    completed_coach_weeks: 0,
    reached_coach_weeks: 0,
  },
  days: TRANSFER_PULSE_SCHEDULE.map((pulse) => ({
    day_number: pulse.dayNumber,
    domain_id: pulse.domainId,
    reached: false,
    athlete_count: 5,
    assigned_athletes: 0,
    expected_observations: 0,
    rest_skips: 0,
    completed_athletes: 0,
    collected_observations: 0,
    not_observed: 0,
    missing_observations: 0,
    completion_without_evidence: 0,
    evidence_without_completion: 0,
    status: "not_reached",
  })),
  coach_weeks: Array.from({ length: 8 }, (_, index) => ({
    week_number: index + 1,
    reached: false,
    completed: false,
  })),
  checks: {
    participants_without_both_test_flags: 0,
    observations_without_test_flag: 0,
    coach_reviews_without_test_flag: 0,
    schedule_mismatches: 0,
    observations_visible_in_production: 0,
    participants_visible_in_production: 0,
    completion_without_evidence: 0,
    evidence_without_completion: 0,
  },
  privacy: {
    response_values_exposed: false,
    athlete_identifiers_exposed: false,
    private_text_exposed: false,
    production_export_includes_qa: false,
  },
});

describe("QA evidence parity report", () => {
  it("accepts the complete 16-day, privacy-safe contract", () => {
    const parsed = parseQaEvidenceParity(rawReport());

    expect(parsed.days).toHaveLength(16);
    expect(parsed.days.map((day) => day.dayNumber)).toEqual(
      TRANSFER_PULSE_SCHEDULE.map((pulse) => pulse.dayNumber),
    );
    expect(parsed.setup).toMatchObject({ athletes: 5, activeInstances: 5 });
    expect(parsed.privacy.productionExportIncludesQa).toBe(false);
  });

  it("fails closed when one scheduled day is missing", () => {
    const raw = rawReport();
    raw.days.pop();
    expect(() => parseQaEvidenceParity(raw)).toThrow("nicht alle 16 Messzeitpunkte");
  });

  it("fails closed when the backend claims private response values are exposed", () => {
    const raw = rawReport();
    raw.privacy.response_values_exposed = true;
    expect(() => parseQaEvidenceParity(raw)).toThrow("privacy.response_values_exposed");
  });

  it("fails closed when QA is marked as part of production exports", () => {
    const raw = rawReport();
    raw.privacy.production_export_includes_qa = true;
    expect(() => parseQaEvidenceParity(raw)).toThrow("privacy.production_export_includes_qa");
  });
});
