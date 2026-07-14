import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import {
  LocalNotifications,
  type ActionPerformed,
  type LocalNotificationSchema,
} from "@capacitor/local-notifications";

const MORNING_NOTIFICATION_ID = 56_000;
const EVENING_NOTIFICATION_ID = 56_001;
const PRE_TRAINING_NOTIFICATION_ID_START = 56_002;
const MAX_PRE_TRAINING_NOTIFICATIONS = 56;
const LAST_OWNED_NOTIFICATION_ID =
  PRE_TRAINING_NOTIFICATION_ID_START + MAX_PRE_TRAINING_NOTIFICATIONS - 1;

const STORAGE_PREFIX = "rewire_native_reminders:";
const OWNER_STORAGE_KEY = "rewire_native_reminders_owner";

export type NativeReminderKind = "morning" | "evening" | "pre_training";

export interface NativeTrainingMoment {
  date: string;
  hour: number;
  minute: number;
  contextType?: "training" | "competition";
}

export interface NativeReminderPreferences {
  enabled: boolean;
  morningHour: number;
  morningMinute: number;
  eveningHour: number;
  eveningMinute: number;
  preTrainingMinutes: number;
}

export interface BuildNativeReminderInput extends NativeReminderPreferences {
  userId: string;
  includeDaily: boolean;
  trainingMoments: NativeTrainingMoment[];
  now?: Date;
}

export const DEFAULT_NATIVE_REMINDER_PREFERENCES: NativeReminderPreferences = {
  enabled: false,
  morningHour: 7,
  morningMinute: 30,
  eveningHour: 21,
  eveningMinute: 0,
  preTrainingMinutes: 60,
};

const isIntegerInRange = (value: unknown, min: number, max: number): value is number =>
  Number.isInteger(value) && Number(value) >= min && Number(value) <= max;

const validatePreferences = (
  value: Partial<NativeReminderPreferences>,
): NativeReminderPreferences | null => {
  if (
    typeof value.enabled !== "boolean" ||
    !isIntegerInRange(value.morningHour, 0, 23) ||
    !isIntegerInRange(value.morningMinute, 0, 59) ||
    !isIntegerInRange(value.eveningHour, 0, 23) ||
    !isIntegerInRange(value.eveningMinute, 0, 59) ||
    !isIntegerInRange(value.preTrainingMinutes, 0, 24 * 60)
  ) {
    return null;
  }

  return value as NativeReminderPreferences;
};

const storageKey = (userId: string) => `${STORAGE_PREFIX}${userId}`;

const readStorage = (key: string) => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorage = (key: string, value: string | null) => {
  if (typeof window === "undefined") return;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Native reminders still work when WebView storage is temporarily unavailable.
  }
};

export const getNativeReminderPreferences = (
  userId: string,
): NativeReminderPreferences | null => {
  const raw = readStorage(storageKey(userId));
  if (!raw) return null;

  try {
    return validatePreferences(JSON.parse(raw) as Partial<NativeReminderPreferences>);
  } catch {
    return null;
  }
};

const saveNativeReminderPreferences = (
  userId: string,
  preferences: NativeReminderPreferences,
) => {
  writeStorage(storageKey(userId), JSON.stringify(preferences));
};

const dateAtLocalTime = (date: string, hour: number, minute: number) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match || !isIntegerInRange(hour, 0, 23) || !isIntegerInRange(minute, 0, 59)) {
    return null;
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const result = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (
    result.getFullYear() !== year ||
    result.getMonth() !== month - 1 ||
    result.getDate() !== day
  ) {
    return null;
  }
  return result;
};

const reminderExtra = (
  userId: string,
  route: "/dashboard" | "/journal" | "/pre-training",
  kind: NativeReminderKind,
  scheduledDate?: string,
) => ({
  source: "native_local",
  userId,
  route,
  kind,
  ...(scheduledDate ? { scheduledDate } : {}),
});

export const buildNativeReminderNotifications = (
  input: BuildNativeReminderInput,
): LocalNotificationSchema[] => {
  const preferences = validatePreferences(input);
  if (!preferences || !input.userId.trim()) {
    throw new Error("Ungültige Einstellungen für iOS-Erinnerungen");
  }

  const notifications: LocalNotificationSchema[] = [];
  if (input.includeDaily) {
    notifications.push(
      {
        id: MORNING_NOTIFICATION_ID,
        title: "Dein Check-in ist bereit",
        body: "Nimm dir kurz Zeit für deinen heutigen Status.",
        schedule: {
          on: {
            hour: preferences.morningHour,
            minute: preferences.morningMinute,
          },
        },
        threadIdentifier: "rewireperform-reminders",
        interruptionLevel: "active",
        extra: reminderExtra(input.userId, "/dashboard", "morning"),
      },
      {
        id: EVENING_NOTIFICATION_ID,
        title: "Zeit für deinen Tagesabschluss",
        body: "Halte fest, was heute wichtig war.",
        schedule: {
          on: {
            hour: preferences.eveningHour,
            minute: preferences.eveningMinute,
          },
        },
        threadIdentifier: "rewireperform-reminders",
        interruptionLevel: "active",
        extra: reminderExtra(input.userId, "/journal", "evening"),
      },
    );
  }

  const now = input.now ?? new Date();
  const seenDates = new Set<string>();
  const scheduledTraining = input.trainingMoments
    .slice()
    .sort((a, b) => {
      const dateComparison = a.date.localeCompare(b.date);
      if (dateComparison !== 0) return dateComparison;
      if (a.hour !== b.hour) return a.hour - b.hour;
      return a.minute - b.minute;
    })
    .flatMap((moment) => {
      if (seenDates.has(moment.date)) return [];
      seenDates.add(moment.date);
      const trainingAt = dateAtLocalTime(moment.date, moment.hour, moment.minute);
      if (!trainingAt) return [];
      const reminderAt = new Date(
        trainingAt.getTime() - preferences.preTrainingMinutes * 60_000,
      );
      return reminderAt.getTime() > now.getTime() + 30_000
        ? [{ moment, reminderAt }]
        : [];
    })
    .slice(0, MAX_PRE_TRAINING_NOTIFICATIONS);

  scheduledTraining.forEach(({ moment, reminderAt }, index) => {
    const isCompetition = moment.contextType === "competition";
    notifications.push({
      id: PRE_TRAINING_NOTIFICATION_ID_START + index,
      title: isCompetition ? "Deine Wettkampfvorbereitung" : "Mentale Vorbereitung",
      body: "Dein kurzer Pre-Training-Flow ist bereit.",
      schedule: { at: reminderAt },
      threadIdentifier: "rewireperform-reminders",
      interruptionLevel: "active",
      extra: reminderExtra(
        input.userId,
        "/pre-training",
        "pre_training",
        moment.date,
      ),
    });
  });

  return notifications;
};

export const isNativeNotificationsAvailable = () => Capacitor.isNativePlatform();

export const hasNativeNotificationPermission = async () => {
  if (!isNativeNotificationsAvailable()) return false;
  const status = await LocalNotifications.checkPermissions();
  return status.display === "granted";
};

export const requestNativeNotificationPermission = async () => {
  if (!isNativeNotificationsAvailable()) return false;
  const current = await LocalNotifications.checkPermissions();
  if (current.display === "granted") return true;
  const requested = await LocalNotifications.requestPermissions();
  return requested.display === "granted";
};

const isOwnedNotificationId = (id: number) =>
  id >= MORNING_NOTIFICATION_ID && id <= LAST_OWNED_NOTIFICATION_ID;

const getOwnedPendingNotifications = async () => {
  const pending = await LocalNotifications.getPending();
  return pending.notifications.filter((notification) =>
    isOwnedNotificationId(notification.id),
  );
};

const cancelPendingNotifications = async (ids: number[]) => {
  if (ids.length === 0) return;
  await LocalNotifications.cancel({
    notifications: ids.map((id) => ({ id })),
  });
};

export const scheduleNativeReminders = async (input: BuildNativeReminderInput) => {
  if (!isNativeNotificationsAvailable()) {
    throw new Error("iOS-Erinnerungen sind nur in der App verfügbar");
  }
  if (!(await hasNativeNotificationPermission())) {
    throw new Error("Benachrichtigungen sind in den iOS-Einstellungen nicht erlaubt");
  }

  const notifications = buildNativeReminderNotifications(input);
  const pendingBefore = await getOwnedPendingNotifications();
  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications });
  }

  const nextIds = new Set(notifications.map((notification) => notification.id));
  await cancelPendingNotifications(
    pendingBefore
      .map((notification) => notification.id)
      .filter((id) => !nextIds.has(id)),
  );

  saveNativeReminderPreferences(input.userId, {
    enabled: true,
    morningHour: input.morningHour,
    morningMinute: input.morningMinute,
    eveningHour: input.eveningHour,
    eveningMinute: input.eveningMinute,
    preTrainingMinutes: input.preTrainingMinutes,
  });
  writeStorage(OWNER_STORAGE_KEY, input.userId);
  return notifications.length;
};

export const disableNativeReminders = async (userId: string) => {
  if (isNativeNotificationsAvailable()) {
    const pending = await getOwnedPendingNotifications();
    await cancelPendingNotifications(pending.map((notification) => notification.id));
  }

  const current =
    getNativeReminderPreferences(userId) ?? DEFAULT_NATIVE_REMINDER_PREFERENCES;
  saveNativeReminderPreferences(userId, { ...current, enabled: false });
  if (readStorage(OWNER_STORAGE_KEY) === userId) writeStorage(OWNER_STORAGE_KEY, null);
};

export const detachNativeRemindersFromInactiveUser = async (
  activeUserId: string | null,
) => {
  if (!isNativeNotificationsAvailable()) return;
  const owner = readStorage(OWNER_STORAGE_KEY);
  if (!owner || owner === activeUserId) return;

  const pending = await getOwnedPendingNotifications();
  await cancelPendingNotifications(pending.map((notification) => notification.id));
  writeStorage(OWNER_STORAGE_KEY, null);
};

export const listenForNativeReminderActions = async (
  callback: (action: ActionPerformed) => void,
): Promise<PluginListenerHandle | null> => {
  if (!isNativeNotificationsAvailable()) return null;
  return LocalNotifications.addListener(
    "localNotificationActionPerformed",
    callback,
  );
};
