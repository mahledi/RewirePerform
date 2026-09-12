/**
 * Program Instance Helper
 *
 * Each athlete-cohort participation = one row in program_instances.
 * An athlete can re-run the 56-day program → new instance, new cycle_number.
 *
 * Resolution rules:
 *   - getOrCreateActiveInstance(userId): returns the user's currently active
 *     instance. Creates one if none exists, deriving team_id + started_at
 *     from the same logic as getEffectiveProgramStart.
 *
 *   - Active instance is unique per user (DB constraint). To start a new
 *     cycle, mark the current one 'completed' or 'abandoned' first.
 */
import { supabase } from "@/integrations/supabase/client";
import { getEffectiveProgramStart } from "@/lib/getCurrentProgramDay";

export interface ProgramInstance {
  id: string;
  user_id: string;
  team_id: string | null;
  program_run_id: string | null;
  cycle_number: number;
  status: "active" | "completed" | "abandoned";
  started_at: string;
  ended_at: string | null;
}

let memo: Record<string, ProgramInstance | null> = {};

export function clearInstanceCache(userId?: string) {
  if (userId) delete memo[userId];
  else memo = {};
}

export async function getActiveInstance(
  userId: string,
  signal?: AbortSignal,
): Promise<ProgramInstance | null> {
  const requestSignal = signal ?? new AbortController().signal;
  const { data, error } = await supabase
    .from("program_instances")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .retry(false)
    .abortSignal(requestSignal)
    .maybeSingle();

  if (error) throw error;
  return (data as ProgramInstance | null) ?? null;
}

export async function getOrCreateActiveInstance(
  userId: string,
  signal?: AbortSignal,
): Promise<ProgramInstance | null> {
  if (memo[userId]) return memo[userId];
  const requestSignal = signal ?? new AbortController().signal;

  const existing = await getActiveInstance(userId, requestSignal);

  if (existing) {
    memo[userId] = existing;
    return memo[userId];
  }

  // Create one. Derive team_id + start date.
  const effective = await getEffectiveProgramStart(userId, requestSignal);

  const { data: memberships, error: membershipError } = await supabase
    .from("team_members")
    .select("team_id, joined_at")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false })
    .limit(10)
    .retry(false)
    .abortSignal(requestSignal);

  if (membershipError) {
    throw membershipError;
  }

  const teamIds = (memberships ?? []).map((membership) => membership.team_id);
  const { data: activeRuns, error: activeRunError } = teamIds.length
    ? await supabase
        .from("program_runs")
        .select("id, team_id")
        .in("team_id", teamIds)
        .eq("status", "active")
        .limit(2)
        .retry(false)
        .abortSignal(requestSignal)
    : { data: [], error: null };

  if (activeRunError) {
    throw activeRunError;
  }

  // A managed run must be assigned by Coach/Admin. Creating an unscoped
  // instance here would silently pollute the pilot's data boundary.
  if (activeRuns && activeRuns.length > 0) {
    console.error("getOrCreateActiveInstance: active team run requires manager assignment");
    return null;
  }

  const teamId = memberships?.[0]?.team_id ?? null;

  // Find next cycle number
  const { data: prior, error: priorError } = await supabase
    .from("program_instances")
    .select("cycle_number")
    .eq("user_id", userId)
    .order("cycle_number", { ascending: false })
    .limit(1)
    .retry(false)
    .abortSignal(requestSignal);
  if (priorError) throw priorError;
  const nextCycle = (prior?.[0]?.cycle_number ?? 0) + 1;

  const { data: created, error } = await supabase
    .from("program_instances")
    .insert({
      user_id: userId,
      team_id: teamId,
      program_run_id: null,
      cycle_number: nextCycle,
      status: "active",
      started_at: effective.startDate ?? new Date().toISOString().slice(0, 10),
    })
    .abortSignal(requestSignal)
    .select()
    .single();

  if (error || !created) {
    if (error?.code === "23505") {
      const concurrent = await getActiveInstance(userId, requestSignal);
      if (concurrent) {
        memo[userId] = concurrent;
        return concurrent;
      }
    }
    if (error) throw error;
    console.error("getOrCreateActiveInstance returned no created row");
    return null;
  }
  memo[userId] = created as ProgramInstance;
  return memo[userId];
}
