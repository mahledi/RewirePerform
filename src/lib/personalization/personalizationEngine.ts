import {
  buildAddressLine,
  buildMicroCue,
  buildProfileLine,
  buildRelevanceLine,
  buildStateLine,
  sportContextLine,
} from "./copyBank";
import { buildRoleContextLine, resolveSportContext } from "./sportTaxonomy";
import type { PersonalizationInput, PersonalizationOutput } from "./types";

const compact = (lines: Array<string | null>): string[] => lines.filter((line): line is string => Boolean(line && line.trim()));

export function buildPersonalization(input: PersonalizationInput): PersonalizationOutput {
  const sport = resolveSportContext(input.profile?.sport);
  const athleteAddressLine = buildAddressLine(input.day, input.contextType);
  const sportLine = sportContextLine[sport.category][input.contextType];
  const roleLine = buildRoleContextLine(sport.category, input.profile?.position);
  const stateLine = buildStateLine(input.checkin);
  const profileLine = buildProfileLine(input.questionnaireSignals);
  const relevanceLine = buildRelevanceLine(input.day, input.contextType);
  const sourceTags = compact([
    `day:${input.day.dayNumber}`,
    `phase:${input.day.phase}`,
    `context:${input.contextType}`,
    `sport:${sport.category}`,
    roleLine ? "role" : null,
    stateLine ? "checkin" : null,
    profileLine ? "questionnaire" : null,
  ]);
  const microCue = buildMicroCue({
    contextType: input.contextType,
    phase: input.day.phase,
    stateLine,
    profileLine,
  });
  const primaryAdaptationLine = stateLine ?? profileLine ?? relevanceLine ?? sportLine;
  const secondaryAdaptationLine =
    primaryAdaptationLine === stateLine
      ? profileLine ?? relevanceLine
      : primaryAdaptationLine === profileLine
        ? stateLine ?? relevanceLine
        : stateLine ?? profileLine;

  return {
    athleteAddressLine,
    sportContextLine: sportLine,
    roleContextLine: roleLine,
    stateLine,
    profileLine,
    journalPatternLine: null,
    relevanceLine,
    microCue,
    sourceTags,
    primaryAdaptationLine,
    secondaryAdaptationLine,
    sportExample: sportLine,
    positionExample: roleLine,
    stateEmphasis: stateLine,
    profileEmphasis: profileLine ?? relevanceLine,
    journalPatternEmphasis: null,
  };
}
