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
const rawSubject = Deno.env.get("VAPID_SUBJECT") ?? "hello@rewireperform.com";
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

const PAYLOADS: Record<NotifType, { title: string; body: string; url: string }> = {
  morning: {
    title: "RewirePerform - Guten Morgen",
    body: "Dein Check-in wartet. Starte bewusst in deinen Tag.",
    url: "/dashboard",
  },
  pre_training: {
    title: "RewirePerform - Pre-Training",
    body: "Eine kurze Vorbereitung: Fokus, Aufgabe, nächste Aktion.",
    url: "/pre-training",
  },
  evening: {
    title: "RewirePerform - Tagesabschluss",
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
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const rawHour = Number(get("hour"));
  return {
    dayOfWeek: dayMap[get("weekday")] ?? date.getUTCDay(),
    hour: rawHour === 24 ? 0 : rawHour,
    minute: Number(get("minute")),
  };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supa = createClient(SUPABASE_URL, SERVICE_ROLE);
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  // Load all subscriptions
  const { data: subs, error: subsErr } = await supa
    .from("push_subscriptions")
    .select("id,user_id,endpoint,p256dh,auth,morning_hour,morning_minute,evening_hour,evening_minute,pre_training_minutes");
  if (subsErr) {
    return new Response(JSON.stringify({ error: subsErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Filter to users with active program instance
  const userIds = [...new Set((subs ?? []).map((s) => s.user_id))];
  const { data: instances } = await supa
    .from("program_instances")
    .select("user_id")
    .eq("status", "active")
    .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
  const activeUsers = new Set((instances ?? []).map((i) => i.user_id));

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

  let sent = 0;
  let skipped = 0;
  const removed: string[] = [];

  for (const sub of (subs ?? []) as Subscription[]) {
    if (!activeUsers.has(sub.user_id)) continue;

    const types: Array<{ type: NotifType; scheduledFor: Date; sentDate: string }> = [];
    const morningTarget = toMinuteOfDay(sub.morning_hour, sub.morning_minute);
    if (minutesMatch(morningTarget, now)) {
      types.push({ type: "morning", scheduledFor: now, sentDate: today });
    }
    const eveningTarget = toMinuteOfDay(sub.evening_hour, sub.evening_minute);
    if (minutesMatch(eveningTarget, now)) {
      types.push({ type: "evening", scheduledFor: now, sentDate: today });
    }
    for (const row of scheduleByUser.get(sub.user_id) ?? []) {
      if (typeof row.training_local_hour === "number") {
        const timeZone = sub.timezone || row.training_timezone || "UTC";
        const trainingMoment = new Date(now.getTime() + sub.pre_training_minutes * 60_000);
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
            sentDate: trainingMoment.toISOString().slice(0, 10),
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
        })
        .select("id")
        .single();
      if (logErr || !pending?.id) {
        console.error("notification log error", logErr?.message);
        skipped++;
        continue;
      }

      const url = `${payload.url}${payload.url.includes("?") ? "&" : "?"}notification_id=${pending.id}&notification_type=${t}`;
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({ ...payload, url, notificationId: pending.id, notificationType: t }),
        );
        await supa.from("notification_log").update({
          status: "sent",
          sent_at: new Date().toISOString(),
        }).eq("id", pending.id);
        sent++;
      } catch (e: unknown) {
        const pushError = e as PushError;
        const code = pushError.statusCode;
        if (code === 404 || code === 410) {
          await supa.from("push_subscriptions").delete().eq("id", sub.id);
          await supa.from("notification_log").update({
            status: "expired_subscription",
            failed_at: new Date().toISOString(),
            error_code: code,
          }).eq("id", pending.id);
          removed.push(sub.endpoint);
        } else {
          await supa.from("notification_log").update({
            status: "failed",
            failed_at: new Date().toISOString(),
            error_code: typeof code === "number" ? code : null,
            metadata: { error: pushError.body ?? pushError.message ?? "unknown" },
          }).eq("id", pending.id);
          console.error("push error", code, pushError.body ?? pushError.message);
        }
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
