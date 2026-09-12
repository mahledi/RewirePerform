export type NativeRestVisualizationIntent = {
  kind: "rest_visualization";
  scheduledDate: string;
};

type NativeRestVisualizationNavigationState = {
  nativeReminder?: NativeRestVisualizationIntent;
};

const isIsoCalendarDate = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year
    && parsed.getMonth() === month - 1
    && parsed.getDate() === day;
};

export const createRestVisualizationNavigationState = (
  extra: Record<string, unknown> | undefined,
): NativeRestVisualizationNavigationState | null => {
  if (
    extra?.kind !== "rest_visualization"
    || extra.route !== "/dashboard"
    || !isIsoCalendarDate(extra.scheduledDate)
  ) {
    return null;
  }

  return {
    nativeReminder: {
      kind: "rest_visualization",
      scheduledDate: extra.scheduledDate,
    },
  };
};

export const readRestVisualizationIntent = (
  state: unknown,
): NativeRestVisualizationIntent | null => {
  if (!state || typeof state !== "object") return null;
  const reminder = (state as NativeRestVisualizationNavigationState).nativeReminder;
  if (
    reminder?.kind !== "rest_visualization"
    || !isIsoCalendarDate(reminder.scheduledDate)
  ) {
    return null;
  }
  return reminder;
};

export const canOpenRestVisualization = ({
  intent,
  currentDate,
  eventType,
  checkinCompleted,
}: {
  intent: NativeRestVisualizationIntent;
  currentDate: string;
  eventType: "training" | "rest" | "competition" | null;
  checkinCompleted: boolean;
}) => (
  intent.scheduledDate === currentDate
  && eventType === "rest"
  && !checkinCompleted
);
