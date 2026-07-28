import type { FlameStats } from "@/lib/flameStats";
import type { AthleteMeasurementStatus } from "@/lib/athleteProgressPresentation";

const CACHE_TTL_MS = 5 * 60 * 1000;

export interface AthleteProgressData {
  stats: FlameStats;
  activeApplications: number;
  referenceDateIso: string;
  measurementStatus: AthleteMeasurementStatus | null;
}

interface AthleteProgressCache extends AthleteProgressData {
  userId: string;
  cachedAt: number;
}

let memoryCache: AthleteProgressCache | null = null;

export const getAthleteProgressCache = (
  userId: string | null | undefined,
): AthleteProgressData | null => {
  if (!userId || !memoryCache || memoryCache.userId !== userId) return null;
  if (Date.now() - memoryCache.cachedAt > CACHE_TTL_MS) return null;
  return {
    stats: memoryCache.stats,
    activeApplications: memoryCache.activeApplications,
    referenceDateIso: memoryCache.referenceDateIso,
    measurementStatus: memoryCache.measurementStatus,
  };
};

export const setAthleteProgressCache = (
  userId: string,
  stats: FlameStats,
  metadata?: {
    activeApplications?: number;
    referenceDateIso?: string;
    measurementStatus?: AthleteMeasurementStatus | null;
  },
) => {
  const existing = memoryCache?.userId === userId ? memoryCache : null;
  memoryCache = {
    userId,
    stats,
    activeApplications: metadata?.activeApplications ?? existing?.activeApplications ?? 0,
    referenceDateIso: metadata?.referenceDateIso ?? existing?.referenceDateIso ?? new Date().toISOString(),
    measurementStatus: metadata?.measurementStatus ?? existing?.measurementStatus ?? null,
    cachedAt: Date.now(),
  };
};

export const clearAthleteProgressCache = (userId?: string) => {
  if (!userId || memoryCache?.userId === userId) memoryCache = null;
};
