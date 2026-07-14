import { supabase } from "@/integrations/supabase/client";
import { getProgramModeInfo } from "@/lib/programMode";
import {
  DEFAULT_NATIVE_REMINDER_PREFERENCES,
  getNativeReminderPreferences,
  scheduleNativeReminders,
  type NativeReminderPreferences,
  type NativeTrainingMoment,
} from "@/lib/nativeNotifications";

const PLANNING_HORIZON_DAYS = 56;

interface WeeklyTrainingSlot {
  dayOfWeek: number;
  hour: number;
  minute: number;
}

interface CalendarOverride {
  date: string;
  eventType: string;
  hour?: number | null;
  minute?: number | null;
}

interface BuildTrainingMomentsInput {
  dates: string[];
  weeklySchedule: WeeklyTrainingSlot[];
  calendarOverrides: CalendarOverride[];
}

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseLocalDate = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

const buildDateRange = (now: Date) =>
  Array.from({ length: PLANNING_HORIZON_DAYS }, (_, offset) => {
    const date = new Date(now);
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    return formatLocalDate(date);
  });

const isValidTime = (hour: unknown, minute: unknown) =>
  Number.isInteger(hour) &&
  Number(hour) >= 0 &&
  Number(hour) <= 23 &&
  Number.isInteger(minute) &&
  Number(minute) >= 0 &&
  Number(minute) <= 59;

export const buildNativeTrainingMoments = ({
  dates,
  weeklySchedule,
  calendarOverrides,
}: BuildTrainingMomentsInput): NativeTrainingMoment[] => {
  const weeklyByDay = new Map<number, WeeklyTrainingSlot>();
  weeklySchedule.forEach((slot) => {
    if (
      Number.isInteger(slot.dayOfWeek) &&
      slot.dayOfWeek >= 0 &&
      slot.dayOfWeek <= 6 &&
      isValidTime(slot.hour, slot.minute)
    ) {
      weeklyByDay.set(slot.dayOfWeek, slot);
    }
  });

  const overridesByDate = new Map<string, CalendarOverride[]>();
  calendarOverrides.forEach((event) => {
    const rows = overridesByDate.get(event.date) ?? [];
    rows.push(event);
    overridesByDate.set(event.date, rows);
  });

  return dates.flatMap((date) => {
    const events = overridesByDate.get(date) ?? [];
    if (events.some((event) => event.eventType === "rest")) return [];

    const timedEvent = events.find(
      (event) =>
        (event.eventType === "training" || event.eventType === "competition") &&
        isValidTime(event.hour, event.minute ?? 0),
    );
    if (timedEvent) {
      return [{
        date,
        hour: Number(timedEvent.hour),
        minute: Number(timedEvent.minute ?? 0),
        contextType: timedEvent.eventType as "training" | "competition",
      }];
    }

    const weekly = weeklyByDay.get(parseLocalDate(date).getDay());
    if (!weekly) return [];
    const contextType = events.some((event) => event.eventType === "competition")
      ? "competition"
      : "training";
    return [{ date, hour: weekly.hour, minute: weekly.minute, contextType }];
  });
};

const requireData = <T>(data: T | null, error: { message: string } | null): T => {
  if (error) throw new Error(error.message);
  return data as T;
};

export const loadNativeReminderPlan = async (
  userId: string,
  now = new Date(),
): Promise<{ programActive: boolean; trainingMoments: NativeTrainingMoment[] }> => {
  const dates = buildDateRange(now);
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];
  const modeInfo = await getProgramModeInfo(userId);

  const instanceResult = await supabase
    .from("program_instances")
    .select("started_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const instance = requireData(instanceResult.data, instanceResult.error);
  const programActive = Boolean(
    instance?.started_at && new Date(instance.started_at).getTime() <= now.getTime(),
  );
  if (!programActive) return { programActive: false, trainingMoments: [] };

  if (modeInfo.mode === "team") {
    if (!modeInfo.teamId) throw new Error("Teamplan konnte nicht aufgelöst werden");
    const [scheduleResult, eventsResult] = await Promise.all([
      supabase
        .from("team_training_schedule")
        .select("day_of_week,training_local_hour,training_local_minute")
        .eq("team_id", modeInfo.teamId),
      supabase
        .from("team_calendar_events")
        .select("date,event_type,training_local_hour,training_local_minute")
        .eq("team_id", modeInfo.teamId)
        .gte("date", startDate)
        .lte("date", endDate),
    ]);
    const schedule = requireData(scheduleResult.data, scheduleResult.error) ?? [];
    const events = requireData(eventsResult.data, eventsResult.error) ?? [];
    return {
      programActive: true,
      trainingMoments: buildNativeTrainingMoments({
        dates,
        weeklySchedule: schedule.map((row) => ({
          dayOfWeek: row.day_of_week,
          hour: row.training_local_hour,
          minute: row.training_local_minute,
        })),
        calendarOverrides: events.map((event) => ({
          date: event.date,
          eventType: event.event_type,
          hour: event.training_local_hour,
          minute: event.training_local_minute,
        })),
      }),
    };
  }

  const [scheduleResult, eventsResult] = await Promise.all([
    supabase
      .from("training_schedule")
      .select("day_of_week,training_hour,training_local_hour,training_local_minute")
      .eq("user_id", userId),
    supabase
      .from("calendar_events")
      .select("date,event_type")
      .eq("user_id", userId)
      .gte("date", startDate)
      .lte("date", endDate),
  ]);
  const schedule = requireData(scheduleResult.data, scheduleResult.error) ?? [];
  const events = requireData(eventsResult.data, eventsResult.error) ?? [];
  return {
    programActive: true,
    trainingMoments: buildNativeTrainingMoments({
      dates,
      weeklySchedule: schedule.map((row) => ({
        dayOfWeek: row.day_of_week,
        hour: row.training_local_hour ?? row.training_hour,
        minute: row.training_local_minute ?? 0,
      })),
      calendarOverrides: events.map((event) => ({
        date: event.date,
        eventType: event.event_type,
      })),
    }),
  };
};

export const syncNativeRemindersForUser = async (
  userId: string,
  overrides?: Omit<NativeReminderPreferences, "enabled">,
  now = new Date(),
) => {
  const stored =
    getNativeReminderPreferences(userId) ?? DEFAULT_NATIVE_REMINDER_PREFERENCES;
  const preferences = { ...stored, ...overrides, enabled: true };
  const plan = await loadNativeReminderPlan(userId, now);
  return scheduleNativeReminders({
    ...preferences,
    userId,
    includeDaily: plan.programActive,
    trainingMoments: plan.trainingMoments,
    now,
  });
};

export const refreshEnabledNativeReminders = async (
  userId: string,
  now = new Date(),
) => {
  const preferences = getNativeReminderPreferences(userId);
  if (!preferences?.enabled) return 0;
  return syncNativeRemindersForUser(userId, undefined, now);
};
