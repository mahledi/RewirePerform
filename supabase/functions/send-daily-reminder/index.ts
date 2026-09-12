// Half-hour cron-driven Web Push sender.
// v2: minute-aware reminders, pre-training URLs, and notification status tracking.
// Sends three notification types: morning, pre_training, evening.
// Idempotent via notification_log unique (user_id, notification_type, sent_date).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const rawSubject = Deno.env.get("VAPID_SUBJECT") ?? "support@rewireperform.com";
const VAPID_SUBJECT =
  rawSubject.startsWith("mailto:") || rawSubject.startsWith("http")
    ? rawSubject
    : `mailto:${rawSubject}`;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

type PushError = {
  statusCode?: number;
  body?: string;
  message?: string;
};

type NotifType = "morning" | "pre_training" | "evening";
type NotifSource = "time" | "team_calendar" | "team_weekly_schedule" | "solo_schedule";

const PAYLOADS: Record<NotifType, { title: string; body: string; url: string }> = {
  morning: {
    title: "Guten Morgen",
    body: "Dein Check-in wartet. Starte bewusst in deinen Tag.",
    url: "/dashboard",
  },
  pre_training: {
    title: "Pre-Training",
    body: "Eine kurze Vorbereitung: Fokus, Aufgabe, nächste Aktion.",
    url: "/pre-training",
  },
  evening: {
    title: "Tagesabschluss",
    body: "Dein Journal wartet. Drei ruhige Minuten für deinen Abschluss.",
    url: "/journal",
  },
};

interface Subscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  morning_hour: number;
  morning_minute: number;
  evening_hour: number;
  evening_minute: number;
  pre_training_minutes: number;
  timezone: string;
}

interface TrainingScheduleRow {
  user_id: string;
  day_of_week: number;
  training_hour: number;
  training_local_hour: number | null;
  training_local_minute: number | null;
  training_timezone: string | null;
}

interface TeamScheduleRow {
  team_id: string;
  day_of_week: number;
  training_local_hour: number;
  training_local_minute: number;
  training_timezone: string;
}

interface TeamCalendarEventRow {
  team_id: string;
  date: string;
  event_type: "training" | "rest" | "competition";
  training_local_hour: number | null;
  training_local_minute: number | null;
  training_timezone: string | null;
}

interface ProgramInstanceRow {
  user_id: string;
  started_at: string | null;
}

const toMinuteOfDay = (hour: number, minute: number) => hour * 60 + minute;

const minutesMatch = (target: number, now: Date) => {
  const current = toMinuteOfDay(now.getUTCHours(), now.getUTCMinutes());
  return current === ((target % 1440) + 1440) % 1440;
};

const dateForOffset = (now: Date, offsetMinutes: number) => {
  const d = new Date(now.getTime() + offsetMinutes * 60_000);
  return d.toISOString().slice(0, 10);
};

const localParts = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const rawHour = Number(get("hour"));
  const year = get("year");
  const month = get("month");
  const day = get("day");
  return {
    date: year && month && day ? `${year}-${month}-${day}` : date.toISOString().slice(0, 10),
    dayOfWeek: dayMap[get("weekday")] ?? date.getUTCDay(),
    hour: rawHour === 24 ? 0 : rawHour,
    minute: Number(get("minute")),
  };
};

const localDateFor = (date: Date, timeZone: string) => localParts(date, timeZone).date;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supa = createClient(SUPABASE_URL, SERVICE_ROLE);
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  // Load all subscriptions
  const { data: subs, error: subsErr } = await supa
    .from("push_subscriptions")
    .select("id,user_id,endpoint,p256dh,auth,morning_hour,morning_minute,evening_hour,evening_minute,pre_training_minutes,timezone");
  if (subsErr) {
    return new Response(JSON.stringify({ error: subsErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Filter to users with an effectively started active program instance.
  // Future-started team/solo programs must not receive morning, evening or pre-training pushes.
  const userIds = [...new Set((subs ?? []).map((s) => s.user_id))];
  const { data: instances } = await supa
    .from("program_instances")
    .select("user_id,started_at")
    .eq("status", "active")
    .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
  const activeUsers = new Set(
    ((instances ?? []) as ProgramInstanceRow[])
      .filter((instance) => {
        if (!instance.started_at) return false;
        return instance.started_at.slice(0, 10) <= today;
      })
      .map((instance) => instance.user_id),
  );

  const { data: schedule } = await supa
    .from("training_schedule")
    .select("user_id,day_of_week,training_hour,training_local_hour,training_local_minute,training_timezone")
    .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
  const scheduleByUser = new Map<string, TrainingScheduleRow[]>();
  (schedule ?? []).forEach((r) => {
    const rows = scheduleByUser.get(r.user_id) ?? [];
    rows.push(r);
    scheduleByUser.set(r.user_id, rows);
  });

  const { data: memberships } = await supa
    .from("team_members")
    .select("team_id,user_id")
    .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
  const teamIds = [...new Set((memberships ?? []).map((m) => m.team_id))];
  const teamIdsByUser = new Map<string, string[]>();
  (memberships ?? []).forEach((membership) => {
    const rows = teamIdsByUser.get(membership.user_id) ?? [];
    rows.push(membership.team_id);
    teamIdsByUser.set(membership.user_id, rows);
  });

  const { data: teamSchedule } = await supa
    .from("team_training_schedule")
    .select("team_id,day_of_week,training_local_hour,training_local_minute,training_timezone")
    .in("team_id", teamIds.length ? teamIds : ["00000000-0000-0000-0000-000000000000"]);
  const scheduleByTeam = new Map<string, TeamScheduleRow[]>();
  ((teamSchedule ?? []) as TeamScheduleRow[]).forEach((row) => {
    const rows = scheduleByTeam.get(row.team_id) ?? [];
    rows.push(row);
    scheduleByTeam.set(row.team_id, rows);
  });

  const { data: teamCalendarEvents } = await supa
    .from("team_calendar_events")
    .select("team_id,date,event_type,training_local_hour,training_local_minute,training_timezone")
    .in("team_id", teamIds.length ? teamIds : ["00000000-0000-0000-0000-000000000000"]);
  const calendarEventsByTeam = new Map<string, TeamCalendarEventRow[]>();
  ((teamCalendarEvents ?? []) as TeamCalendarEventRow[]).forEach((row) => {
    const rows = calendarEventsByTeam.get(row.team_id) ?? [];
    rows.push(row);
    calendarEventsByTeam.set(row.team_id, rows);
  });

  let sent = 0;
  let skipped = 0;
  const removed: string[] = [];

  for (const sub of (subs ?? []) as Subscription[]) {
    if (!activeUsers.has(sub.user_id)) continue;

    const types: Array<{ type: NotifType; scheduledFor: Date; sentDate: string; source: NotifSource }> = [];
    const localToday = localDateFor(now, sub.timezone || "UTC");
    const morningTarget = toMinuteOfDay(sub.morning_hour, sub.morning_minute);
    if (minutesMatch(morningTarget, now)) {
      types.push({ type: "morning", scheduledFor: now, sentDate: localToday, source: "time" });
    }
    const eveningTarget = toMinuteOfDay(sub.evening_hour, sub.evening_minute);
    if (minutesMatch(eveningTarget, now)) {
      types.push({ type: "evening", scheduledFor: now, sentDate: localToday, source: "time" });
    }
    const userRows = scheduleByUser.get(sub.user_id) ?? [];
    const teamIdsForUser = teamIdsByUser.get(sub.user_id) ?? [];
    const teamRows = teamIdsForUser.flatMap((teamId) => scheduleByTeam.get(teamId) ?? []);
    const trainingMoment = new Date(now.getTime() + sub.pre_training_minutes * 60_000);
    const teamCalendarMatches = teamIdsForUser.flatMap((teamId) =>
      (calendarEventsByTeam.get(teamId) ?? []).filter((event) => {
        const timeZone = event.training_timezone || sub.timezone || "UTC";
        return localParts(trainingMoment, timeZone).date === event.date;
      }),
    );
    const restDayFromTeamCalendar = teamCalendarMatches.some((event) => event.event_type === "rest");
    const timedTeamEvents = teamCalendarMatches.filter(
      (event) =>
        (event.event_type === "training" || event.event_type === "competition") &&
        typeof event.training_local_hour === "number",
    );

    for (const event of timedTeamEvents) {
      const timeZone = event.training_timezone || sub.timezone || "UTC";
      const local = localParts(trainingMoment, timeZone);
      const localMinute = event.training_local_minute ?? 0;
      if (event.training_local_hour === local.hour && localMinute === local.minute) {
        types.push({
          type: "pre_training",
          scheduledFor: now,
          sentDate: event.date,
          source: "team_calendar",
        });
      }
    }

    const shouldUseWeeklyFallback = timedTeamEvents.length === 0 && !restDayFromTeamCalendar;
    const effectiveTrainingRows = shouldUseWeeklyFallback
      ? teamIdsForUser.length > 0
        ? teamRows.map((row) => ({
            user_id: sub.user_id,
            day_of_week: row.day_of_week,
            training_hour: row.training_local_hour,
            training_local_hour: row.training_local_hour,
            training_local_minute: row.training_local_minute,
            training_timezone: row.training_timezone,
          }))
        : userRows
      : [];

    for (const row of effectiveTrainingRows) {
      if (typeof row.training_local_hour === "number") {
        const timeZone = sub.timezone || row.training_timezone || "UTC";
        const local = localParts(trainingMoment, timeZone);
        const localMinute = row.training_local_minute ?? 0;
        if (
          row.day_of_week === local.dayOfWeek &&
          row.training_local_hour === local.hour &&
          localMinute === local.minute
        ) {
          types.push({
            type: "pre_training",
            scheduledFor: now,
            sentDate: local.date,
            source: teamIdsForUser.length > 0 ? "team_weekly_schedule" : "solo_schedule",
          });
        }
        continue;
      }

      const trainingTarget = toMinuteOfDay(row.training_hour, 0);
      const reminderTarget = trainingTarget - sub.pre_training_minutes;
      if (minutesMatch(reminderTarget, now)) {
        types.push({
          type: "pre_training",
          scheduledFor: now,
          sentDate: dateForOffset(now, reminderTarget < 0 ? 24 * 60 : 0),
          source: "solo_schedule",
        });
      }
    }

    for (const item of types) {
      const t = item.type;
      // Idempotency check
      const { data: log } = await supa
        .from("notification_log")
        .select("id")
        .eq("user_id", sub.user_id)
        .eq("notification_type", t)
        .eq("sent_date", item.sentDate)
        .maybeSingle();
      if (log) {
        skipped++;
        continue;
      }

      const payload = PAYLOADS[t];
      const { data: pending, error: logErr } = await supa
        .from("notification_log")
        .insert({
          user_id: sub.user_id,
          notification_type: t,
          sent_date: item.sentDate,
          status: "pending",
          scheduled_for: item.scheduledFor.toISOString(),
          target_url: payload.url,
          metadata: { source: item.source },
        })
        .select("id")
        .single();
      if (logErr || !pending?.id) {
        console.error("notification log error", logErr?.message);
        skipped++;
        continue;
      }

      const url = `${payload.url}${payload.url.includes("?") ? "&" : "?"}notification_id=${pending.id}&notification_type=${t}&notification_user_id=${sub.user_id}`;
      const matchingSubscriptions = ((subs ?? []) as Subscription[]).filter((candidate) => {
        if (candidate.user_id !== sub.user_id) return false;
        if (t === "morning") {
          return candidate.morning_hour === sub.morning_hour &&
            candidate.morning_minute === sub.morning_minute;
        }
        if (t === "evening") {
          return candidate.evening_hour === sub.evening_hour &&
            candidate.evening_minute === sub.evening_minute;
        }
        return candidate.pre_training_minutes === sub.pre_training_minutes;
      });
      let deliveredEndpoints = 0;
      let failedEndpoints = 0;
      let expiredEndpoints = 0;
      let lastErrorCode: number | null = null;
      let lastError = "unknown";

      for (const target of matchingSubscriptions) {
        try {
          await webpush.sendNotification(
            {
              endpoint: target.endpoint,
              keys: { p256dh: target.p256dh, auth: target.auth },
            },
            JSON.stringify({ ...payload, url, notificationId: pending.id, notificationType: t }),
          );
          deliveredEndpoints++;
        } catch (e: unknown) {
          failedEndpoints++;
          const pushError = e as PushError;
          const code = pushError.statusCode;
          lastErrorCode = typeof code === "number" ? code : null;
          lastError = pushError.body ?? pushError.message ?? "unknown";
          if (code === 404 || code === 410) {
            await supa.from("push_subscriptions").delete().eq("id", target.id);
            expiredEndpoints++;
            removed.push(target.endpoint);
          } else {
            console.error("push error", code, lastError);
          }
        }
      }

      if (deliveredEndpoints > 0) {
        await supa.from("notification_log").update({
          status: "sent",
          sent_at: new Date().toISOString(),
          metadata: {
            source: item.source,
            delivered_endpoints: deliveredEndpoints,
            failed_endpoints: failedEndpoints,
          },
        }).eq("id", pending.id);
        sent++;
      } else {
        await supa.from("notification_log").update({
          status: expiredEndpoints > 0 && failedEndpoints === expiredEndpoints
            ? "expired_subscription"
            : "failed",
          failed_at: new Date().toISOString(),
          error_code: lastErrorCode,
          metadata: {
            source: item.source,
            error: lastError,
            delivered_endpoints: 0,
            failed_endpoints: failedEndpoints,
          },
        }).eq("id", pending.id);
      }
    }
  }

  return new Response(
    JSON.stringify({
      checkedAt: now.toISOString(),
      minuteUtc: now.getUTCMinutes(),
      hourUtc: now.getUTCHours(),
      sent,
      skipped,
      removed: removed.length,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
