import type { FlameStats } from "@/lib/flameStats";

const CACHE_TTL_MS = 5 * 60 * 1000;

interface AthleteProgressCache {
  userId: string;
  stats: FlameStats;
  cachedAt: number;
}

let memoryCache: AthleteProgressCache | null = null;

export const getAthleteProgressCache = (
  userId: string | null | undefined,
): FlameStats | null => {
  if (!userId || !memoryCache || memoryCache.userId !== userId) return null;
  if (Date.now() - memoryCache.cachedAt > CACHE_TTL_MS) return null;
  return memoryCache.stats;
};

export const setAthleteProgressCache = (userId: string, stats: FlameStats) => {
  memoryCache = {
    userId,
    stats,
    cachedAt: Date.now(),
  };
};

export const clearAthleteProgressCache = (userId?: string) => {
  if (!userId || memoryCache?.userId === userId) memoryCache = null;
};
