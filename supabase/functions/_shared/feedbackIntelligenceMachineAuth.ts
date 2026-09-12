import {
  authenticateFeedbackIntelligenceAuthorization,
  type FeedbackIntelligenceMachineAuthError,
} from "./feedbackIntelligenceMachineAuthCore.ts";

export const authenticateFeedbackIntelligenceMachine = async (
  request: Request,
): Promise<FeedbackIntelligenceMachineAuthError | null> =>
  authenticateFeedbackIntelligenceAuthorization({
    authorization: request.headers.get("Authorization") ?? "",
    currentKey: Deno.env.get("MAHLEOS_FEEDBACK_INTELLIGENCE_MACHINE_KEY")?.trim() ?? "",
    previousKey:
      Deno.env.get("MAHLEOS_FEEDBACK_INTELLIGENCE_MACHINE_KEY_PREVIOUS")?.trim() ?? "",
  });
