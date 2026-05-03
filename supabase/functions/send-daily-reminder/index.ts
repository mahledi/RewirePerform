// Hourly cron-driven Web Push sender.
// Sends three notification types: morning, pre_training, evening.
// Idempotent via notification_log unique (user_id, notification_type, sent_date).
import { corsHeaders } from "@supabase/supabase-js/cors";
import { createClient } from "@supabase/supabase-js";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:hello@rewireperform.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

type NotifType = "morning" | "pre_training" | "evening";

const PAYLOADS: Record<NotifType, { title: string; body: string; url: string }> = {
  morning: {
    title: "MindGame – Guten Morgen",
    body: "Dein Check-in für heute wartet. Starte deinen Tag bewusst. 🧠",
    url: "/",
  },
  pre_training: {
    title: "Training in Kürze",
    body: "Kurze Wiederholung: Was nimmst du heute aufs Feld?",
    url: "/pre-training",
  },
  evening: {
    title: "MindGame – Tagesabschluss",
    body: "Dein Journal wartet. Nimm dir 3 Minuten für heute Abend. 📓",
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
  evening_hour: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supa = createClient(SUPABASE_URL, SERVICE_ROLE);
  const now = new Date();
  const hourUtc = now.getUTCHours();
  const today = now.toISOString().slice(0, 10);
  const dayOfWeek = now.getUTCDay(); // 0=Sun..6=Sat

  // Load all subscriptions
  const { data: subs, error: subsErr } = await supa
    .from("push_subscriptions")
    .select("id,user_id,endpoint,p256dh,auth,morning_hour,evening_hour");
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

  // Today's training schedule per user
  const { data: schedule } = await supa
    .from("training_schedule")
    .select("user_id,training_hour")
    .eq("day_of_week", dayOfWeek)
    .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
  const trainingHourByUser = new Map<string, number>();
  (schedule ?? []).forEach((r) => trainingHourByUser.set(r.user_id, r.training_hour));

  let sent = 0;
  let skipped = 0;
  const removed: string[] = [];

  for (const sub of (subs ?? []) as Subscription[]) {
    if (!activeUsers.has(sub.user_id)) continue;

    const types: NotifType[] = [];
    if (sub.morning_hour === hourUtc) types.push("morning");
    if (sub.evening_hour === hourUtc) types.push("evening");
    const trainHour = trainingHourByUser.get(sub.user_id);
    if (trainHour !== undefined && trainHour - 1 === hourUtc) types.push("pre_training");

    for (const t of types) {
      // Idempotency check
      const { data: log } = await supa
        .from("notification_log")
        .select("id")
        .eq("user_id", sub.user_id)
        .eq("notification_type", t)
        .eq("sent_date", today)
        .maybeSingle();
      if (log) {
        skipped++;
        continue;
      }

      const payload = PAYLOADS[t];
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload),
        );
        await supa.from("notification_log").insert({
          user_id: sub.user_id,
          notification_type: t,
          sent_date: today,
        });
        sent++;
      } catch (e: any) {
        const code = e?.statusCode;
        if (code === 404 || code === 410) {
          await supa.from("push_subscriptions").delete().eq("id", sub.id);
          removed.push(sub.endpoint);
        } else {
          console.error("push error", code, e?.body ?? e?.message);
        }
      }
    }
  }

  return new Response(
    JSON.stringify({ hourUtc, sent, skipped, removed: removed.length }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
