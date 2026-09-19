export type SportCategory =
  | "invasion_team_sport"
  | "net_or_target_sport"
  | "combat_sport"
  | "aesthetic_or_technical_sport"
  | "endurance_sport"
  | "strength_power_sport"
  | "precision_sport"
  | "unknown_or_other";

export type SportParticipationFormat = "individual" | "team" | "mixed_or_unknown";

export type SportLevel =
  | "youth"
  | "amateur"
  | "competitive_amateur"
  | "semi_pro"
  | "pro"
  | "college";

export type PersonalizationContextType = "training" | "rest" | "competition";

export interface PersonalizationDay {
  dayNumber: number;
  lens: string;
  primaryMechanism: string;
  recurrenceType: string;
  phase: 1 | 2 | 3 | 4;
}

export interface PersonalizationInput {
  day: PersonalizationDay;
  contextType: PersonalizationContextType;
  profile?: {
    sport?: string | null;
    position?: string | null;
    fullName?: string | null;
  };
  questionnaireSignals?: {
    resultFocus?: number;
    selfCriticism?: number;
    judgementFear?: number;
    egoVisibility?: number;
    confidence?: number;
  };
  checkin?: {
    mood?: number | null;
    energy?: number | null;
    focus?: number | null;
    stress?: number | null;
  };
}

export interface SportContext {
  category: SportCategory;
  label: string;
  isTeamOrGroupContext: boolean;
}

export interface PersonalizationOutput {
  athleteAddressLine: string;
  sportContextLine: string;
  roleContextLine: string | null;
  stateLine: string | null;
  profileLine: string | null;
  journalPatternLine: string | null;
  relevanceLine: string | null;
  microCue: string;
  sourceTags: string[];
  primaryAdaptationLine: string;
  secondaryAdaptationLine: string | null;

  // Backward-compatible names used by TodayForYou.
  sportExample: string;
  positionExample: string | null;
  stateEmphasis: string | null;
  profileEmphasis: string | null;
  journalPatternEmphasis: string | null;
}
