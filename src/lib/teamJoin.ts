import { supabase } from "@/integrations/supabase/client";
import { normalizeTeamInviteCode } from "@/lib/teamInvite";
import { captureAppError, trackAppEvent } from "@/lib/monitoring";

export const joinTeamByCode = async (rawCode: string) => {
  const code = normalizeTeamInviteCode(rawCode);
  if (!code) {
    return { success: false as const, message: "Bitte gib einen gültigen 6-stelligen Teamcode ein." };
  }

  await trackAppEvent({
    eventName: "team_join_attempt",
    status: "attempted",
    route: "/questionnaire",
    metadata: { stage: "team_join_rpc" },
  });

  let joinResult: unknown;
  let joinError: unknown;
  try {
    const response = await supabase.rpc("join_team_by_code", { _code: code });
    joinResult = response.data;
    joinError = response.error;
  } catch (error) {
    joinError = error;
  }
  const result = joinResult as { success?: boolean; role?: "athlete"; error?: string } | null;

  if (joinError) {
    await captureAppError({
      error: joinError,
      eventName: "team_join_attempt",
      route: "/questionnaire",
      metadata: { stage: "team_join_rpc" },
    });
    return {
      success: false as const,
      message: "Der Teambeitritt konnte gerade nicht abgeschlossen werden. Bitte versuche es erneut.",
    };
  }

  if (!result || result.success !== true) {
    if (result?.error === "minor_product_authorization_required") {
      await trackAppEvent({
        eventName: "team_join_attempt",
        status: "failed",
        route: "/questionnaire",
        errorCode: "minor_product_authorization_required",
        metadata: { stage: "team_join_rpc" },
      });
      return {
        success: false as const,
        message: "Deine Produktfreigabe konnte nicht sicher bestätigt werden. Bitte prüfe sie erneut.",
      };
    }
    return {
      success: false as const,
      message: "Teamcode nicht gefunden. Bitte prüfe den Code und versuche es erneut.",
    };
  }

  await trackAppEvent({
    eventName: "team_join_success",
    status: "success",
    route: "/questionnaire",
    metadata: { stage: "team_join_rpc" },
  });

  return { success: true as const };
};
