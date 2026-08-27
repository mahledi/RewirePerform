import {
  addDays,
  eachDayOfInterval,
  endOfWeek,
  format,
  getDay,
  isAfter,
  startOfDay,
  startOfWeek,
} from "date-fns";

export type TeamCalendarEventType = "training" | "rest" | "competition";

export type TeamCalendarSeriesEvent = {
  id?: string;
  date: string;
  event_type: TeamCalendarEventType;
  title: string;
  training_local_hour: number | null;
  training_local_minute: number | null;
  training_timezone: string | null;
};

type BuildTeamCalendarSeriesInput = {
  events: Iterable<TeamCalendarSeriesEvent>;
  patternDate: Date;
  today: Date;
  weeks?: number;
};

export type TeamCalendarSeriesPlan = {
  additions: TeamCalendarSeriesEvent[];
  patternWeekStart: Date;
  patternWeekEnd: Date;
  rangeStart: Date;
  rangeEnd: Date;
  trainingDaysInPattern: number;
  trainingDaysAdded: number;
  restDaysAdded: number;
  existingDaysPreserved: number;
  competitionsPreserved: number;
};

const dateKey = (date: Date) => format(date, "yyyy-MM-dd");

export const buildTeamCalendarSeriesPlan = ({
  events,
  patternDate,
  today,
  weeks = 8,
}: BuildTeamCalendarSeriesInput): TeamCalendarSeriesPlan => {
  const eventList = Array.from(events);
  const eventsByDate = new Map(eventList.map((event) => [event.date, event]));
  const patternWeekStart = startOfWeek(patternDate, { weekStartsOn: 1 });
  const patternWeekEnd = endOfWeek(patternDate, { weekStartsOn: 1 });
  const todayStart = startOfDay(today);
  const rangeStart = isAfter(patternWeekStart, todayStart) ? patternWeekStart : todayStart;
  const rangeEnd = addDays(rangeStart, weeks * 7 - 1);

  const trainingByWeekday = new Map<number, TeamCalendarSeriesEvent>();
  eachDayOfInterval({ start: patternWeekStart, end: patternWeekEnd }).forEach((day) => {
    const event = eventsByDate.get(dateKey(day));
    if (event?.event_type === "training") {
      trainingByWeekday.set(getDay(day), event);
    }
  });

  const additions: TeamCalendarSeriesEvent[] = [];
  let existingDaysPreserved = 0;
  let competitionsPreserved = 0;
  let trainingDaysAdded = 0;
  let restDaysAdded = 0;

  eachDayOfInterval({ start: rangeStart, end: rangeEnd }).forEach((day) => {
    const key = dateKey(day);
    const existing = eventsByDate.get(key);
    if (existing) {
      existingDaysPreserved += 1;
      if (existing.event_type === "competition") competitionsPreserved += 1;
      return;
    }

    const trainingTemplate = trainingByWeekday.get(getDay(day));
    if (trainingTemplate) {
      additions.push({
        date: key,
        event_type: "training",
        title: trainingTemplate.title || "Training",
        training_local_hour: trainingTemplate.training_local_hour,
        training_local_minute: trainingTemplate.training_local_minute,
        training_timezone: trainingTemplate.training_timezone,
      });
      trainingDaysAdded += 1;
      return;
    }

    additions.push({
      date: key,
      event_type: "rest",
      title: "Ruhetag",
      training_local_hour: null,
      training_local_minute: null,
      training_timezone: null,
    });
    restDaysAdded += 1;
  });

  return {
    additions,
    patternWeekStart,
    patternWeekEnd,
    rangeStart,
    rangeEnd,
    trainingDaysInPattern: trainingByWeekday.size,
    trainingDaysAdded,
    restDaysAdded,
    existingDaysPreserved,
    competitionsPreserved,
  };
};
