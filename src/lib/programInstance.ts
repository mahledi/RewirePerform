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

export async function getOrCreateActiveInstance(
  userId: string
): Promise<ProgramInstance | null> {
  if (memo[userId]) return memo[userId];

  const { data: existing } = await supabase
    .from("program_instances")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (existing) {
    memo[userId] = existing as ProgramInstance;
    return memo[userId];
  }

  // Create one. Derive team_id + start date.
  const effective = await getEffectiveProgramStart(userId);

  const { data: tm } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", userId)
    .limit(1);
  const teamId = tm?.[0]?.team_id ?? null;

  // Find next cycle number
  const { data: prior } = await supabase
    .from("program_instances")
    .select("cycle_number")
    .eq("user_id", userId)
    .order("cycle_number", { ascending: false })
    .limit(1);
  const nextCycle = (prior?.[0]?.cycle_number ?? 0) + 1;

  const { data: created, error } = await supabase
    .from("program_instances")
    .insert({
      user_id: userId,
      team_id: teamId,
      cycle_number: nextCycle,
      status: "active",
      started_at: effective.startDate ?? new Date().toISOString().slice(0, 10),
    })
    .select()
    .single();

  if (error || !created) {
    console.error("getOrCreateActiveInstance error:", error);
    return null;
  }
  memo[userId] = created as ProgramInstance;
  return memo[userId];
}
