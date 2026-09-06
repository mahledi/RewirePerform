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

const PROGRAM_MODE_CACHE_TTL_MS = 5 * 60 * 1000;
const programModeCache = new Map<string, { cachedAt: number; value: ProgramModeInfo }>();

export const getCachedProgramModeInfo = (userId?: string | null): ProgramModeInfo | null => {
  if (!userId) return null;
  const cached = programModeCache.get(userId);
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > PROGRAM_MODE_CACHE_TTL_MS) {
    programModeCache.delete(userId);
    return null;
  }
  return cached.value;
};

const rememberProgramModeInfo = (userId: string, value: ProgramModeInfo): ProgramModeInfo => {
  programModeCache.set(userId, { cachedAt: Date.now(), value });
  return value;
};

export const clearCachedProgramModeInfo = (userId?: string | null) => {
  if (userId) programModeCache.delete(userId);
  else programModeCache.clear();
};

export const getProgramModeInfo = async (
  userId: string,
  signal?: AbortSignal,
): Promise<ProgramModeInfo> => {
  const requestSignal = signal ?? new AbortController().signal;
  const { data: memberships, error: membershipsError } = await supabase
    .from("team_members")
    .select("team_id,joined_at")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false })
    .retry(false)
    .abortSignal(requestSignal);

  if (membershipsError) throw membershipsError;

  const teamIds = (memberships ?? []).map((membership) => membership.team_id);

  // Team-Mode: Coach besitzt den Kalender. Aktiver Lauf und Legacy-Teamstart
  // werden parallel geladen, damit der App-Start keine serielle Query-Kette bildet.
  if (teamIds.length > 0) {
    const [{ data: activeRuns, error: activeRunsError }, { data: teams, error: teamsError }] = await Promise.all([
      supabase
        .from("program_runs")
        .select("team_id,started_at")
        .in("team_id", teamIds)
        .eq("status", "active")
        .not("started_at", "is", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .retry(false)
        .abortSignal(requestSignal),
      supabase
        .from("teams")
        .select("id,program_start_date")
        .in("id", teamIds)
        .retry(false)
        .abortSignal(requestSignal),
    ]);

    if (activeRunsError) throw activeRunsError;
    if (teamsError) throw teamsError;

    const activeRun = activeRuns?.[0] ?? null;
    const legacyTeam = (teams ?? [])
      .filter((team) => Boolean(team.program_start_date))
      .sort((a, b) => String(a.program_start_date).localeCompare(String(b.program_start_date)))[0] ?? null;
    const teamId = activeRun?.team_id ?? legacyTeam?.id ?? memberships?.[0]?.team_id;
    const teamStartDate = activeRun?.started_at ?? legacyTeam?.program_start_date ?? null;

    return rememberProgramModeInfo(userId, {
      mode: "team",
      teamId,
      teamStartDate,
      soloStartDate: null,
      effectiveStartDate: teamStartDate,
      setupRequired: !teamStartDate,
      setupReason: teamStartDate ? null : "coach_missing_team_start",
    });
  }

  // Solo-Mode
  const { data: settings, error: settingsError } = await supabase
    .from("program_settings")
    .select("program_start")
    .eq("user_id", userId)
    .retry(false)
    .abortSignal(requestSignal)
    .maybeSingle();

  if (settingsError) throw settingsError;
  const soloStartDate = settings?.program_start ?? null;
  return rememberProgramModeInfo(userId, {
    mode: "solo",
    teamStartDate: null,
    soloStartDate,
    effectiveStartDate: soloStartDate,
    setupRequired: !soloStartDate,
    setupReason: soloStartDate ? null : "solo_missing_setup",
  });
};
