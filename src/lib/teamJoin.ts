import { supabase } from "@/integrations/supabase/client";
import { normalizeTeamInviteCode } from "@/lib/teamInvite";
import { captureAppError, trackAppEvent } from "@/lib/monitoring";

export type TeamJoinTransition =
  | "team_joined"
  | "team_scope_attached"
  | "questionnaire_progress_preserved"
  | "completed_questionnaire_preserved"
  | "new_team_cycle_started";

export const joinTeamByCode = async (
  rawCode: string,
  options: { confirmSoloTransition?: boolean } = {},
) => {
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
    const response = await supabase.rpc("join_team_by_code_v1_3", {
      _code: code,
      _confirm_solo_transition: options.confirmSoloTransition ?? false,
    });
    joinResult = response.data;
    joinError = response.error;
  } catch (error) {
    joinError = error;
  }
  const result = joinResult as {
    success?: boolean;
    role?: "athlete";
    error?: string;
    transition?: TeamJoinTransition;
  } | null;

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
    if (result?.error === "solo_program_transition_confirmation_required") {
      return {
        success: false as const,
        requiresSoloTransitionConfirmation: true as const,
        message: "In deinem Solo-Programm gibt es bereits Aktivitäten. Sie bleiben geschützt. Für das Team beginnt ein eigener neuer Programmlauf.",
      };
    }
    if (result?.error === "active_other_team_program") {
      return {
        success: false as const,
        message: "Dein aktiver Programmlauf gehört bereits zu einem anderen Team. Bitte kläre den Wechsel zuerst mit deinem Coach oder dem Support.",
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

  return {
    success: true as const,
    transition: result.transition ?? "team_joined",
  };
};
