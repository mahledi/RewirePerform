export type LocalReminderTime = { h: number; m: number };

export const MORNING_REMINDER_OPTIONS: LocalReminderTime[] = Array.from(
  { length: 10 },
  (_, index) => ({
    h: 6 + Math.floor(index / 2),
    m: index % 2 === 0 ? 0 : 30,
  }),
);

export const EVENING_REMINDER_OPTIONS: LocalReminderTime[] = Array.from(
  { length: 12 },
  (_, index) => ({
    h: 18 + Math.floor(index / 2),
    m: index % 2 === 0 ? 0 : 30,
  }),
);

export const PRE_TRAINING_REMINDER_OPTIONS = [30, 60, 90] as const;

export const formatReminderTime = (h: number, m: number) =>
  `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

export const parseReminderTime = (value: string): LocalReminderTime => {
  const [h, m] = value.split(":").map(Number);
  return { h, m };
};

export const utcToLocalReminderTime = (h: number, m: number): LocalReminderTime => {
  const date = new Date();
  date.setUTCHours(h, m, 0, 0);
  return { h: date.getHours(), m: date.getMinutes() };
};

export const localToUtcReminderTime = (h: number, m: number): LocalReminderTime => {
  const date = new Date();
  date.setHours(h, m, 0, 0);
  return { h: date.getUTCHours(), m: date.getUTCMinutes() };
};
