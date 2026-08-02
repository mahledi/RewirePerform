import { supabase } from "@/integrations/supabase/client";
import { normalizeTeamInviteCode } from "@/lib/teamInvite";

export const joinTeamByCode = async (rawCode: string) => {
  const code = normalizeTeamInviteCode(rawCode);
  if (!code) {
    return { success: false as const, message: "Bitte gib einen gültigen 6-stelligen Teamcode ein." };
  }

  const { data: joinResult, error: joinError } = await supabase.rpc("join_team_by_code", {
    _code: code,
  });
  const result = joinResult as { success?: boolean; role?: "athlete"; error?: string } | null;

  if (joinError) {
    console.error("Team join error:", joinError);
    return {
      success: false as const,
      message: "Der Teambeitritt konnte gerade nicht abgeschlossen werden. Bitte versuche es erneut.",
    };
  }

  if (!result || result.success !== true) {
    if (result?.error === "minor_product_authorization_required") {
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

  return { success: true as const };
};
