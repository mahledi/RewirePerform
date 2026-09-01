import { useEffect, useRef } from "react";
import { format } from "date-fns";
import {
  DEFAULT_PROGRAM_TIME_ZONE,
  formatProgramCalendarDateISO,
  getEffectiveTodayDate,
} from "@/lib/qaTime";

const DEFAULT_SAME_DAY_REFRESH_MS = 60_000;
const MAX_PROGRAM_DAY_LENGTH_MS = 30 * 60 * 60 * 1000;

/**
 * Finds the next calendar-day boundary by searching actual instants instead of
 * assuming that every local day has 24 hours. This remains correct across the
 * 23/25-hour Europe/Berlin DST transition days.
 */
export const millisecondsUntilNextProgramMidnight = (
  now: Date = new Date(),
  timeZone = DEFAULT_PROGRAM_TIME_ZONE,
): number => {
  const nowMs = now.getTime();
  const currentDay = formatProgramCalendarDateISO(now, timeZone);
  let lower = nowMs + 1;
  let upper = nowMs + MAX_PROGRAM_DAY_LENGTH_MS;

  if (formatProgramCalendarDateISO(new Date(upper), timeZone) === currentDay) {
    // Defensive fallback for an unsupported timezone/WebView. The formatting
    // helper already falls back to the device calendar; never schedule a tight
    // retry loop if that environment still cannot expose a boundary.
    return 24 * 60 * 60 * 1000;
  }

  while (lower < upper) {
    const middle = lower + Math.floor((upper - lower) / 2);
    if (formatProgramCalendarDateISO(new Date(middle), timeZone) === currentDay) {
      lower = middle + 1;
    } else {
      upper = middle;
    }
  }

  return Math.max(1, lower - nowMs);
};

interface EffectiveDayRolloverOptions {
  userId: string | null | undefined;
  currentDate: Date;
  enabled: boolean;
  suspended?: boolean;
  sameDayRefreshMs?: number;
  onRefresh: (resolvedDate: Date, dayChanged: boolean) => Promise<void> | void;
}

type LatestOptions = EffectiveDayRolloverOptions;

/**
 * Re-resolves the server-owned program date at local program midnight and
 * whenever an installed app/browser becomes active again. It never reloads
 * the route, deduplicates simultaneous triggers and defers rollover while an
 * athlete is editing the daily flow so a draft cannot switch dates underneath.
 */
export const useEffectiveDayRollover = ({
  userId,
  currentDate,
  enabled,
  suspended = false,
  sameDayRefreshMs = DEFAULT_SAME_DAY_REFRESH_MS,
  onRefresh,
}: EffectiveDayRolloverOptions) => {
  const latest = useRef<LatestOptions>({
    userId,
    currentDate,
    enabled,
    suspended,
    sameDayRefreshMs,
    onRefresh,
  });
  const inFlight = useRef(false);
  const pendingWhileSuspended = useRef(false);
  const lastRefreshAt = useRef(0);
  const lastAppliedDateIso = useRef(format(currentDate, "yyyy-MM-dd"));

  latest.current = {
    userId,
    currentDate,
    enabled,
    suspended,
    sameDayRefreshMs,
    onRefresh,
  };

  useEffect(() => {
    lastAppliedDateIso.current = format(currentDate, "yyyy-MM-dd");
  }, [currentDate]);

  const resolveAndRefreshRef = useRef<() => Promise<void>>(async () => {});
  resolveAndRefreshRef.current = async () => {
    const options = latest.current;
    if (!options.enabled || !options.userId) return;
    if (options.suspended) {
      pendingWhileSuspended.current = true;
      return;
    }
    if (inFlight.current) return;

    inFlight.current = true;
    try {
      const resolvedDate = await getEffectiveTodayDate(options.userId);
      if (latest.current.suspended) {
        pendingWhileSuspended.current = true;
        return;
      }
      const resolvedDateIso = format(resolvedDate, "yyyy-MM-dd");
      const dayChanged = resolvedDateIso !== lastAppliedDateIso.current;
      const refreshDue = Date.now() - lastRefreshAt.current >= options.sameDayRefreshMs;
      if (!dayChanged && !refreshDue && !pendingWhileSuspended.current) return;

      await latest.current.onRefresh(resolvedDate, dayChanged);
      lastAppliedDateIso.current = resolvedDateIso;
      lastRefreshAt.current = Date.now();
      pendingWhileSuspended.current = false;
    } catch (error) {
      // The visible dashboard remains intact. A later focus/visibility event
      // retries instead of turning a transient transport issue into a reload.
      console.error("effective day refresh failed", error);
    } finally {
      inFlight.current = false;
    }
  };

  useEffect(() => {
    if (!enabled || !userId) return;

    const handleFocus = () => {
      void resolveAndRefreshRef.current();
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void resolveAndRefreshRef.current();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    let cancelled = false;
    let midnightTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleMidnightRefresh = () => {
      if (cancelled) return;
      midnightTimer = setTimeout(async () => {
        await resolveAndRefreshRef.current();
        scheduleMidnightRefresh();
      }, millisecondsUntilNextProgramMidnight());
    };
    scheduleMidnightRefresh();

    return () => {
      cancelled = true;
      if (midnightTimer !== null) clearTimeout(midnightTimer);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [enabled, userId]);

  useEffect(() => {
    if (!enabled || suspended || !pendingWhileSuspended.current) return;
    void resolveAndRefreshRef.current();
  }, [enabled, suspended]);
};
