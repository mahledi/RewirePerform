import { format } from "date-fns";
import type { Json } from "@/integrations/supabase/types";

export interface PreTrainingEventTiming {
  date: string;
  training_local_hour?: number | null;
  training_local_minute?: number | null;
  training_timezone?: string | null;
}

interface PreTrainingCompletionPayload {
  completed_at: string;
  event_type: "training" | "competition";
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getMinutesInTimezone = (date: Date, timezone?: string | null) => {
  if (!timezone) return date.getHours() * 60 + date.getMinutes();

  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const hour = Number(parts.find((part) => part.type === "hour")?.value);
    const minute = Number(parts.find((part) => part.type === "minute")?.value);
    if (Number.isFinite(hour) && Number.isFinite(minute)) return hour * 60 + minute;
  } catch {
    // Invalid legacy timezone values fall back to the device clock.
  }

  return date.getHours() * 60 + date.getMinutes();
};

export const isPreTrainingExpired = (
  event: PreTrainingEventTiming | null | undefined,
  referenceDate: Date,
  now = new Date(),
) => {
  if (!event || typeof event.training_local_hour !== "number") return false;
  if (event.date !== format(referenceDate, "yyyy-MM-dd")) return false;

  const eventMinute = event.training_local_hour * 60 + (event.training_local_minute ?? 0);
  return getMinutesInTimezone(now, event.training_timezone) >= eventMinute;
};

export const hasCompletedPreTraining = (payload: Json | null | undefined) => {
  if (!isRecord(payload)) return false;
  const completion = payload.pre_training_completion;
  return isRecord(completion) && typeof completion.completed_at === "string";
};

export const withPreTrainingCompletion = (
  payload: Json | null | undefined,
  eventType: "training" | "competition",
  completedAt: string,
): Json => {
  const base = isRecord(payload) ? payload : {};
  const completion: PreTrainingCompletionPayload = {
    completed_at: completedAt,
    event_type: eventType,
  };
  return {
    ...base,
    pre_training_completion: completion,
  } as unknown as Json;
};
