/**
 * QA time override resolver.
 *
 * For real users this always returns the real "today". For QA test users
 * (profiles.is_test_user = true) belonging to a test team with an active
 * qa_time_overrides row, this returns the simulated date so the daily flow
 * can be fast-forwarded without touching production logic.
 *
 * Resolution is delegated to the `get_effective_today(uuid)` SECURITY DEFINER
 * RPC so the overrides table itself stays admin-only at the RLS level.
 */
import { supabase } from "@/integrations/supabase/client";

let cache: { userId: string; iso: string; fetchedAt: number } | null = null;
const TTL_MS = 60_000;

export const getEffectiveTodayISO = async (
  userId: string | null | undefined,
  signal?: AbortSignal,
): Promise<string> => {
  const realToday = new Date().toISOString().slice(0, 10);
  if (!userId) return realToday;
  const now = Date.now();
  if (cache && cache.userId === userId && now - cache.fetchedAt < TTL_MS) {
    return cache.iso;
  }
  try {
    const query = supabase
      .rpc("get_effective_today", { _user_id: userId })
      .retry(false);
    if (signal) query.abortSignal(signal);
    const { data, error } = await query;
    if (error || !data) {
      cache = { userId, iso: realToday, fetchedAt: now };
      return realToday;
    }
    const iso = String(data);
    cache = { userId, iso, fetchedAt: now };
    return iso;
  } catch {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    return realToday;
  }
};

export const getEffectiveTodayDate = async (
  userId: string | null | undefined,
  signal?: AbortSignal,
): Promise<Date> => {
  const iso = await getEffectiveTodayISO(userId, signal);
  // Parse as local date (midnight) consistent with date-fns format(d, "yyyy-MM-dd")
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
};

export const clearQaTimeCache = () => {
  cache = null;
};
