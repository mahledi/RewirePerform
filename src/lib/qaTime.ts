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

export const DEFAULT_PROGRAM_TIME_ZONE = "Europe/Berlin";

/**
 * Formats a calendar date without converting the instant to a UTC date first.
 * The explicit program timezone keeps the web/native fallback aligned with the
 * server even when the device itself is configured for another timezone.
 */
export const formatProgramCalendarDateISO = (
  date: Date = new Date(),
  timeZone = DEFAULT_PROGRAM_TIME_ZONE,
): string => {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const values = new Map(parts.map((part) => [part.type, part.value]));
    const year = values.get("year");
    const month = values.get("month");
    const day = values.get("day");
    if (year && month && day) return `${year}-${month}-${day}`;
  } catch {
    // Older WebViews can reject a timezone identifier. The device calendar is
    // still safer than turning the instant into a UTC date via toISOString().
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

let cache: {
  userId: string;
  iso: string;
  fetchedAt: number;
  programCalendarDay: string;
} | null = null;
const TTL_MS = 60_000;

export const getEffectiveTodayISO = async (
  userId: string | null | undefined,
  signal?: AbortSignal,
): Promise<string> => {
  const nowDate = new Date();
  const realToday = formatProgramCalendarDateISO(nowDate);
  if (!userId) return realToday;
  const now = nowDate.getTime();
  if (
    cache
    && cache.userId === userId
    && cache.programCalendarDay === realToday
    && now - cache.fetchedAt < TTL_MS
  ) {
    return cache.iso;
  }
  try {
    const query = supabase
      .rpc("get_effective_today", { _user_id: userId })
      .retry(false);
    if (signal) query.abortSignal(signal);
    const { data, error } = await query;
    if (error || !data) {
      cache = { userId, iso: realToday, fetchedAt: now, programCalendarDay: realToday };
      return realToday;
    }
    const iso = String(data);
    cache = { userId, iso, fetchedAt: now, programCalendarDay: realToday };
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
