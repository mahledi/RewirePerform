/**
 * Program Mode Resolver
 *
 * Liefert die maßgeblichen Programmsetup-Daten für den aktuellen Athleten:
 *  - "team":  Coach besitzt den Kalender. teams.program_start_date hat Vorrang.
 *  - "solo":  Athlet besitzt den Kalender und nutzt program_settings + calendar_events.
 *
 * Single source of truth — soll von Dashboard / DailyFlow / Day-Resolution
 * genutzt werden, statt verteilt eigene Checks anzustellen.
 */
import { getEffectiveProgramStart } from "@/lib/getCurrentProgramDay";
import { supabase } from "@/integrations/supabase/client";

export type ProgramMode = "team" | "solo";

export type SetupReason =
  | "solo_missing_setup"
  | "coach_missing_team_start"
  | null;

export interface ProgramModeInfo {
  mode: ProgramMode;
  teamId?: string;
  teamStartDate?: string | null;
  soloStartDate?: string | null;
  effectiveStartDate?: string | null;
  setupRequired: boolean;
  setupReason: SetupReason;
}

export const getProgramModeInfo = async (
  userId: string
): Promise<ProgramModeInfo> => {
  const effective = await getEffectiveProgramStart(userId);

  // Team-Mode: hasTeam → Coach besitzt den Kalender, egal ob Startdatum existiert
  if (effective.hasTeam) {
    // ersten Team-ID auflösen (für Konsumenten, die Team-Kontext brauchen)
    const { data: memberships } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", userId)
      .limit(1);
    const teamId = memberships?.[0]?.team_id as string | undefined;

    const teamStartDate = effective.source === "team" ? effective.startDate : null;
    return {
      mode: "team",
      teamId,
      teamStartDate,
      soloStartDate: null,
      effectiveStartDate: teamStartDate,
      setupRequired: !teamStartDate,
      setupReason: teamStartDate ? null : "coach_missing_team_start",
    };
  }

  // Solo-Mode
  const soloStartDate = effective.startDate;
  return {
    mode: "solo",
    teamStartDate: null,
    soloStartDate,
    effectiveStartDate: soloStartDate,
    setupRequired: !soloStartDate,
    setupReason: soloStartDate ? null : "solo_missing_setup",
  };
};
