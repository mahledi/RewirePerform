export const EVIDENCE_PROTOCOL_VERSION = "56d-transfer-v2-2026-07" as const;

export type EvidenceDomainId =
  | "attention_return"
  | "error_recovery"
  | "pressure_regulation"
  | "process_execution"
  | "action_under_uncertainty";

export type SportEventType = "training" | "competition" | "rest";
export type TransferPulseScore = 1 | 2 | 3 | 4;
export type TransferPulseResponse = TransferPulseScore | "not_observed";
export type CoachObservationContext = "training" | "competition" | "mixed";

export interface EvidenceDomainDefinition {
  id: EvidenceDomainId;
  label: string;
  athletePrompt: Record<Exclude<SportEventType, "rest">, string>;
  coachPrompt: string;
  mappedProgramAxes: readonly string[];
}

export interface TransferPulseDefinition {
  dayNumber: number;
  domainId: EvidenceDomainId;
  replacesOptionalReflection: true;
  targetSeconds: number;
}

export interface ScheduledTransferPulse extends TransferPulseDefinition {
  protocolVersion: typeof EVIDENCE_PROTOCOL_VERSION;
  prompt: string;
  eventType: Exclude<SportEventType, "rest">;
}

export type PerformanceLabMilestoneKind = "practice" | "measurement";

export interface PerformanceLabMilestone {
  dayNumber: 0 | 1 | 14 | 28 | 42 | 56;
  kind: PerformanceLabMilestoneKind;
  label: string;
  countsAsOutcome: boolean;
}

export interface EvidenceObservation {
  domainId: EvidenceDomainId;
  source: "athlete" | "coach_team" | "coach_athlete";
  response: TransferPulseResponse;
}

export interface EvidenceCoverage {
  scoredObservations: number;
  notObserved: number;
  coveredDomains: number;
  domains: Record<EvidenceDomainId, number>;
}

export interface AthleteTransferBurden {
  programDays: 56;
  pulseDays: number;
  totalAdditionalSeconds: number;
  averageAdditionalSecondsPerProgramDay: number;
  maximumSecondsOnPulseDay: number;
}

export interface TransferPulseScaleOption {
  value: TransferPulseResponse;
  label: string;
  description: string;
}

export const TRANSFER_PULSE_TARGET_SECONDS = 20;
export const MAX_DAILY_EVIDENCE_SECONDS = 25;
export const MAX_COACH_WEEKLY_REVIEW_SECONDS = 90;
export const MAX_EVIDENCE_INTERACTION_DURATION_MS = 15 * 60 * 1000;

export const TRANSFER_PULSE_SCALE: readonly TransferPulseScaleOption[] = [
  { value: 1, label: "Noch nicht", description: "Es ist mir heute noch nicht gelungen." },
  { value: 2, label: "Teilweise", description: "Es ist mir in einzelnen Momenten gelungen." },
  { value: 3, label: "Meistens", description: "Es ist mir in den meisten passenden Momenten gelungen." },
  { value: 4, label: "Klar gelungen", description: "Es war heute klar und stabil zu erkennen." },
  {
    value: "not_observed",
    label: "Nicht passiert",
    description: "Diesen Moment gab es heute nicht oder ich konnte ihn nicht beobachten.",
  },
];

export const COACH_OBSERVATION_LABELS: Record<TransferPulseResponse, string> = {
  1: "Selten sichtbar",
  2: "Teilweise sichtbar",
  3: "Meistens sichtbar",
  4: "Klar und stabil",
  not_observed: "Nicht beobachtet",
};

export const EVIDENCE_DOMAINS: Record<EvidenceDomainId, EvidenceDomainDefinition> = {
  attention_return: {
    id: "attention_return",
    label: "Aufmerksamkeit zurückholen",
    athletePrompt: {
      training: "Wenn du heute abgelenkt warst: Wie klar bist du zur nächsten Aktion zurückgekehrt?",
      competition: "Wenn du heute abgelenkt warst: Wie klar bist du zur nächsten Wettkampfaktion zurückgekehrt?",
    },
    coachPrompt: "Nach Ablenkung kehrt der Athlet sichtbar zur nächsten relevanten Aktion zurück.",
    mappedProgramAxes: ["Presence vs Outcome", "Process vs Result"],
  },
  error_recovery: {
    id: "error_recovery",
    label: "Nach Fehlern weiterhandeln",
    athletePrompt: {
      training: "Nach einem Fehler heute: Wie klar hast du die nächste sinnvolle Aktion begonnen?",
      competition: "Nach einem Fehler heute: Wie klar hast du die nächste Wettkampfaktion begonnen?",
    },
    coachPrompt: "Nach einem Fehler folgt sichtbar wieder eine klare und aktive Handlung.",
    mappedProgramAxes: ["Learning vs Judgement", "Confidence vs Self-Doubt"],
  },
  pressure_regulation: {
    id: "pressure_regulation",
    label: "Unter Druck handlungsfähig bleiben",
    athletePrompt: {
      training: "In einem druckvollen Moment heute: Wie gut konntest du bei deiner Aufgabe bleiben?",
      competition: "In einem druckvollen Moment heute: Wie gut konntest du bei deiner Wettkampfaufgabe bleiben?",
    },
    coachPrompt: "Unter sichtbarem Druck bleibt der Athlet bei einer ausführbaren Aufgabe.",
    mappedProgramAxes: ["Fear vs Love", "Control vs Non-Control"],
  },
  process_execution: {
    id: "process_execution",
    label: "Beim Prozess bleiben",
    athletePrompt: {
      training: "Wie gut bist du heute bei dem geblieben, was du in der nächsten Aktion steuern konntest?",
      competition: "Wie gut bist du heute bei dem geblieben, was du in der nächsten Wettkampfaktion steuern konntest?",
    },
    coachPrompt: "Der Athlet richtet sein Verhalten sichtbar auf die nächste steuerbare Aufgabe aus.",
    mappedProgramAxes: ["Process vs Result", "Growth vs Winning"],
  },
  action_under_uncertainty: {
    id: "action_under_uncertainty",
    label: "Trotz Unsicherheit handeln",
    athletePrompt: {
      training: "Wenn du heute unsicher warst: Wie klar hast du trotzdem die nächste sinnvolle Aktion ausgeführt?",
      competition: "Wenn du heute unsicher warst: Wie klar hast du trotzdem die nächste Wettkampfaktion ausgeführt?",
    },
    coachPrompt: "Auch bei sichtbarer Unsicherheit setzt der Athlet eine klare nächste Handlung um.",
    mappedProgramAxes: ["Confidence vs Self-Doubt", "Growth vs Winning"],
  },
};

const TRANSFER_PULSE_DOMAIN_ROTATION: readonly EvidenceDomainId[] = [
  "attention_return",
  "error_recovery",
  "pressure_regulation",
  "process_execution",
  "action_under_uncertainty",
  "attention_return",
  "error_recovery",
  "pressure_regulation",
  "process_execution",
  "action_under_uncertainty",
  "attention_return",
  "error_recovery",
  "pressure_regulation",
  "process_execution",
  "action_under_uncertainty",
  "attention_return",
];

export const TRANSFER_PULSE_DAYS = [
  4, 7, 11, 14, 18, 21, 25, 28, 32, 35, 39, 42, 46, 49, 53, 56,
] as const;

export const TRANSFER_PULSE_SCHEDULE: readonly TransferPulseDefinition[] = TRANSFER_PULSE_DAYS.map(
  (dayNumber, index) => ({
    dayNumber,
    domainId: TRANSFER_PULSE_DOMAIN_ROTATION[index],
    replacesOptionalReflection: true,
    targetSeconds: TRANSFER_PULSE_TARGET_SECONDS,
  }),
);

export const PERFORMANCE_LAB_MILESTONES: readonly PerformanceLabMilestone[] = [
  { dayNumber: 0, kind: "practice", label: "Technische Familiarisierung", countsAsOutcome: false },
  { dayNumber: 1, kind: "measurement", label: "Erster Messanker", countsAsOutcome: true },
  { dayNumber: 14, kind: "measurement", label: "Früher Verlauf", countsAsOutcome: true },
  { dayNumber: 28, kind: "measurement", label: "Programmmittelpunkt", countsAsOutcome: true },
  { dayNumber: 42, kind: "measurement", label: "Stabilitaet", countsAsOutcome: true },
  { dayNumber: 56, kind: "measurement", label: "Abschluss", countsAsOutcome: true },
];

export const isProgramDay = (dayNumber: number): boolean =>
  Number.isInteger(dayNumber) && dayNumber >= 1 && dayNumber <= 56;

export const getTransferPulseForDay = (
  dayNumber: number,
  eventType: SportEventType,
): ScheduledTransferPulse | null => {
  if (!isProgramDay(dayNumber) || eventType === "rest") return null;

  const definition = TRANSFER_PULSE_SCHEDULE.find((item) => item.dayNumber === dayNumber);
  if (!definition) return null;

  return {
    ...definition,
    protocolVersion: EVIDENCE_PROTOCOL_VERSION,
    prompt: EVIDENCE_DOMAINS[definition.domainId].athletePrompt[eventType],
    eventType,
  };
};

export const getPerformanceLabMilestone = (dayNumber: number): PerformanceLabMilestone | null =>
  PERFORMANCE_LAB_MILESTONES.find((milestone) => milestone.dayNumber === dayNumber) ?? null;

export const isTransferPulseResponse = (value: unknown): value is TransferPulseResponse =>
  value === "not_observed"
  || value === 1
  || value === 2
  || value === 3
  || value === 4;

export const shouldPreserveReflectionDraft = ({
  eligible,
  existingResponse,
  reflection,
}: {
  eligible: boolean;
  existingResponse: TransferPulseResponse | null;
  reflection: string | null | undefined;
}): boolean => eligible
  && existingResponse === null
  && typeof reflection === "string"
  && reflection.trim().length > 0;

export const normalizeEvidenceDurationMs = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return Math.min(MAX_EVIDENCE_INTERACTION_DURATION_MS, Math.round(value));
};

export const getAdditionalMandatoryEvidenceSeconds = (
  dayNumber: number,
  eventType: SportEventType,
): number => {
  const pulse = getTransferPulseForDay(dayNumber, eventType);
  if (!pulse) return 0;
  return Math.min(MAX_DAILY_EVIDENCE_SECONDS, pulse.targetSeconds);
};

export const getMaximumAthleteTransferBurden = (): AthleteTransferBurden => {
  const totalAdditionalSeconds = TRANSFER_PULSE_SCHEDULE.reduce(
    (total, pulse) => total + Math.min(MAX_DAILY_EVIDENCE_SECONDS, pulse.targetSeconds),
    0,
  );

  return {
    programDays: 56,
    pulseDays: TRANSFER_PULSE_SCHEDULE.length,
    totalAdditionalSeconds,
    averageAdditionalSecondsPerProgramDay: totalAdditionalSeconds / 56,
    maximumSecondsOnPulseDay: Math.max(...TRANSFER_PULSE_SCHEDULE.map((pulse) => pulse.targetSeconds)),
  };
};

const emptyDomainCounts = (): Record<EvidenceDomainId, number> => ({
  attention_return: 0,
  error_recovery: 0,
  pressure_regulation: 0,
  process_execution: 0,
  action_under_uncertainty: 0,
});

export const calculateEvidenceCoverage = (
  observations: readonly EvidenceObservation[],
): EvidenceCoverage => {
  const domains = emptyDomainCounts();
  let scoredObservations = 0;
  let notObserved = 0;

  observations.forEach((observation) => {
    if (!isTransferPulseResponse(observation.response)) return;
    if (observation.response === "not_observed") {
      notObserved += 1;
      return;
    }

    scoredObservations += 1;
    domains[observation.domainId] += 1;
  });

  return {
    scoredObservations,
    notObserved,
    coveredDomains: Object.values(domains).filter((count) => count > 0).length,
    domains,
  };
};
