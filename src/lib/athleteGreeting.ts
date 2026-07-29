const MORNING_END_HOUR = 11;
const EVENING_START_HOUR = 18;

/**
 * Uses the athlete's local device hour:
 * 00:00–10:59 morning, 11:00–17:59 daytime, 18:00–23:59 evening.
 */
export const getAthleteGreetingByHour = (hour: number) => {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return "Hallo";
  if (hour < MORNING_END_HOUR) return "Guten Morgen";
  if (hour < EVENING_START_HOUR) return "Hallo";
  return "Guten Abend";
};

export const getFirstName = (fullName: unknown) => {
  if (typeof fullName !== "string") return null;
  const normalized = fullName.trim().replace(/\s+/g, " ");
  return normalized ? normalized.split(" ")[0] : null;
};

export const getDailyCheckinGreeting = (
  fullName: unknown,
  localDate = new Date(),
) => {
  const firstName = getFirstName(fullName);
  if (!firstName) return "Willkommen zu deinem Daily Flow.";
  return `${getAthleteGreetingByHour(localDate.getHours())}, ${firstName}`;
};
