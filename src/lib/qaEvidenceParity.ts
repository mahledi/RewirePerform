import { EVIDENCE_PROTOCOL_VERSION, TRANSFER_PULSE_DAYS } from "@/lib/performanceEvidence";

export type QaParityState = "READY" | "IN_PROGRESS" | "PASS" | "FAIL";
export type QaEvidenceDayState = "not_reached" | "not_started" | "in_progress" | "passed" | "failed";

export interface QaEvidenceDayResult {
  dayNumber: number;
  domainId: string;
  reached: boolean;
  athleteCount: number;
  assignedAthletes: number;
  expectedObservations: number;
  restSkips: number;
  completedAthletes: number;
  collectedObservations: number;
  notObserved: number;
  missingObservations: number;
  completionWithoutEvidence: number;
  evidenceWithoutCompletion: number;
  status: QaEvidenceDayState;
}

export interface QaCoachWeekResult {
  weekNumber: number;
  reached: boolean;
  completed: boolean;
}

export interface QaEvidenceParityReport {
  schemaVersion: "qa_evidence_parity_v1";
  generatedAt: string;
  protocolVersion: string;
  state: QaParityState;
  stateLabel: string;
  scope: {
    teamId: string;
    teamName: string;
    programRunId: string;
    programRunName: string;
    simulatedDate: string;
    simulatedDayNumber: number;
    testOnly: true;
  };
  setup: {
    athletes: number;
    activeInstances: number;
    expectedQaAthletes: number;
    allParticipantsTestFlagged: boolean;
  };
  coverage: {
    scheduledDays: number;
    reachedDays: number;
    passedDays: number;
    expectedObservations: number;
    collectedObservations: number;
    missingObservations: number;
    notObservedResponses: number;
    completedCoachWeeks: number;
    reachedCoachWeeks: number;
  };
  days: QaEvidenceDayResult[];
  coachWeeks: QaCoachWeekResult[];
  checks: {
    participantsWithoutBothTestFlags: number;
    observationsWithoutTestFlag: number;
    coachReviewsWithoutTestFlag: number;
    scheduleMismatches: number;
    observationsVisibleInProduction: number;
    participantsVisibleInProduction: number;
    completionWithoutEvidence: number;
    evidenceWithoutCompletion: number;
  };
  privacy: {
    responseValuesExposed: false;
    athleteIdentifiersExposed: false;
    privateTextExposed: false;
    productionExportIncludesQa: false;
  };
}

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const requiredString = (value: unknown, field: string): string => {
  if (typeof value !== "string") throw new Error(`Ungültiger QA-Bericht: ${field}`);
  return value;
};

const requiredNumber = (value: unknown, field: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Ungültiger QA-Bericht: ${field}`);
  }
  return value;
};

const requiredBoolean = (value: unknown, field: string): boolean => {
  if (typeof value !== "boolean") throw new Error(`Ungültiger QA-Bericht: ${field}`);
  return value;
};

const requiredBooleanValue = <T extends boolean>(value: unknown, expected: T, field: string): T => {
  if (value !== expected) throw new Error(`Ungültiger QA-Bericht: ${field}`);
  return expected;
};

const parseDayState = (value: unknown): QaEvidenceDayState => {
  if (
    value === "not_reached"
    || value === "not_started"
    || value === "in_progress"
    || value === "passed"
    || value === "failed"
  ) return value;
  throw new Error("Ungültiger QA-Bericht: days.status");
};

const parseParityState = (value: unknown): QaParityState => {
  if (value === "READY" || value === "IN_PROGRESS" || value === "PASS" || value === "FAIL") return value;
  throw new Error("Ungültiger QA-Bericht: state");
};

const parseDay = (value: unknown): QaEvidenceDayResult => {
  if (!isRecord(value)) throw new Error("Ungültiger QA-Bericht: days");
  return {
    dayNumber: requiredNumber(value.day_number, "days.day_number"),
    domainId: requiredString(value.domain_id, "days.domain_id"),
    reached: requiredBoolean(value.reached, "days.reached"),
    athleteCount: requiredNumber(value.athlete_count, "days.athlete_count"),
    assignedAthletes: requiredNumber(value.assigned_athletes, "days.assigned_athletes"),
    expectedObservations: requiredNumber(value.expected_observations, "days.expected_observations"),
    restSkips: requiredNumber(value.rest_skips, "days.rest_skips"),
    completedAthletes: requiredNumber(value.completed_athletes, "days.completed_athletes"),
    collectedObservations: requiredNumber(value.collected_observations, "days.collected_observations"),
    notObserved: requiredNumber(value.not_observed, "days.not_observed"),
    missingObservations: requiredNumber(value.missing_observations, "days.missing_observations"),
    completionWithoutEvidence: requiredNumber(value.completion_without_evidence, "days.completion_without_evidence"),
    evidenceWithoutCompletion: requiredNumber(value.evidence_without_completion, "days.evidence_without_completion"),
    status: parseDayState(value.status),
  };
};

const parseCoachWeek = (value: unknown): QaCoachWeekResult => {
  if (!isRecord(value)) throw new Error("Ungültiger QA-Bericht: coach_weeks");
  return {
    weekNumber: requiredNumber(value.week_number, "coach_weeks.week_number"),
    reached: requiredBoolean(value.reached, "coach_weeks.reached"),
    completed: requiredBoolean(value.completed, "coach_weeks.completed"),
  };
};

export const parseQaEvidenceParity = (value: unknown): QaEvidenceParityReport => {
  if (!isRecord(value)) throw new Error("QA-Paritätsbericht fehlt.");
  const scope = value.scope;
  const setup = value.setup;
  const coverage = value.coverage;
  const checks = value.checks;
  const privacy = value.privacy;
  if (!isRecord(scope) || !isRecord(setup) || !isRecord(coverage) || !isRecord(checks) || !isRecord(privacy)) {
    throw new Error("QA-Paritätsbericht ist unvollständig.");
  }

  const days = Array.isArray(value.days) ? value.days.map(parseDay) : [];
  const coachWeeks = Array.isArray(value.coach_weeks) ? value.coach_weeks.map(parseCoachWeek) : [];
  const scheduleMatches = days.length === TRANSFER_PULSE_DAYS.length
    && days.every((day, index) => day.dayNumber === TRANSFER_PULSE_DAYS[index]);
  if (!scheduleMatches) throw new Error("QA-Paritätsbericht enthält nicht alle 16 Messzeitpunkte.");

  const schemaVersion = requiredString(value.schema_version, "schema_version");
  if (schemaVersion !== "qa_evidence_parity_v1") throw new Error("Unbekannte QA-Berichtsversion.");

  return {
    schemaVersion,
    generatedAt: requiredString(value.generated_at, "generated_at"),
    protocolVersion: requiredString(value.protocol_version, "protocol_version"),
    state: parseParityState(value.state),
    stateLabel: requiredString(value.state_label, "state_label"),
    scope: {
      teamId: requiredString(scope.team_id, "scope.team_id"),
      teamName: requiredString(scope.team_name, "scope.team_name"),
      programRunId: requiredString(scope.program_run_id, "scope.program_run_id"),
      programRunName: requiredString(scope.program_run_name, "scope.program_run_name"),
      simulatedDate: requiredString(scope.simulated_date, "scope.simulated_date"),
      simulatedDayNumber: requiredNumber(scope.simulated_day_number, "scope.simulated_day_number"),
      testOnly: requiredBooleanValue(scope.test_only, true, "scope.test_only"),
    },
    setup: {
      athletes: requiredNumber(setup.athletes, "setup.athletes"),
      activeInstances: requiredNumber(setup.active_instances, "setup.active_instances"),
      expectedQaAthletes: requiredNumber(setup.expected_qa_athletes, "setup.expected_qa_athletes"),
      allParticipantsTestFlagged: requiredBoolean(setup.all_participants_test_flagged, "setup.all_participants_test_flagged"),
    },
    coverage: {
      scheduledDays: requiredNumber(coverage.scheduled_days, "coverage.scheduled_days"),
      reachedDays: requiredNumber(coverage.reached_days, "coverage.reached_days"),
      passedDays: requiredNumber(coverage.passed_days, "coverage.passed_days"),
      expectedObservations: requiredNumber(coverage.expected_observations, "coverage.expected_observations"),
      collectedObservations: requiredNumber(coverage.collected_observations, "coverage.collected_observations"),
      missingObservations: requiredNumber(coverage.missing_observations, "coverage.missing_observations"),
      notObservedResponses: requiredNumber(coverage.not_observed_responses, "coverage.not_observed_responses"),
      completedCoachWeeks: requiredNumber(coverage.completed_coach_weeks, "coverage.completed_coach_weeks"),
      reachedCoachWeeks: requiredNumber(coverage.reached_coach_weeks, "coverage.reached_coach_weeks"),
    },
    days,
    coachWeeks,
    checks: {
      participantsWithoutBothTestFlags: requiredNumber(checks.participants_without_both_test_flags, "checks.participants_without_both_test_flags"),
      observationsWithoutTestFlag: requiredNumber(checks.observations_without_test_flag, "checks.observations_without_test_flag"),
      coachReviewsWithoutTestFlag: requiredNumber(checks.coach_reviews_without_test_flag, "checks.coach_reviews_without_test_flag"),
      scheduleMismatches: requiredNumber(checks.schedule_mismatches, "checks.schedule_mismatches"),
      observationsVisibleInProduction: requiredNumber(checks.observations_visible_in_production, "checks.observations_visible_in_production"),
      participantsVisibleInProduction: requiredNumber(checks.participants_visible_in_production, "checks.participants_visible_in_production"),
      completionWithoutEvidence: requiredNumber(checks.completion_without_evidence, "checks.completion_without_evidence"),
      evidenceWithoutCompletion: requiredNumber(checks.evidence_without_completion, "checks.evidence_without_completion"),
    },
    privacy: {
      responseValuesExposed: requiredBooleanValue(privacy.response_values_exposed, false, "privacy.response_values_exposed"),
      athleteIdentifiersExposed: requiredBooleanValue(
        privacy.athlete_identifiers_exposed,
        false,
        "privacy.athlete_identifiers_exposed",
      ),
      privateTextExposed: requiredBooleanValue(privacy.private_text_exposed, false, "privacy.private_text_exposed"),
      productionExportIncludesQa: requiredBooleanValue(privacy.production_export_includes_qa, false, "privacy.production_export_includes_qa"),
    },
  };
};

export const loadQaEvidenceParity = async (programRunId: string): Promise<QaEvidenceParityReport> => {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase.rpc("get_qa_evidence_parity", {
    _program_run_id: programRunId,
    _protocol_version: EVIDENCE_PROTOCOL_VERSION,
  });
  if (error) throw error;
  return parseQaEvidenceParity(data);
};
