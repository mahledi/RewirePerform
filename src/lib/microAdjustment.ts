/**
 * Stable public adapter for the deterministic RewirePerform Personalization Engine.
 *
 * No AI call, no LLM, no external service, no DB write. The fixed 56-day program
 * remains untouched; this only frames the day in a more personal, sport-aware way.
 */
import { buildPersonalization } from "@/lib/personalization/personalizationEngine";
import type {
  PersonalizationInput as MicroAdjustmentInput,
  PersonalizationOutput as MicroAdjustmentOutput,
  PersonalizationDay as MicroAdjustmentDay,
} from "@/lib/personalization/types";

export type {
  MicroAdjustmentDay,
  MicroAdjustmentInput,
  MicroAdjustmentOutput,
};

export const buildMicroAdjustmentContext = (input: MicroAdjustmentInput): MicroAdjustmentOutput =>
  buildPersonalization(input);
