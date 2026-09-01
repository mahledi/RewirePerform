// Sends a one-off team program start push when a coach activates the program.
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

type Subscription = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

type NativePushDevice = {
  id: string;
  user_id: string;
  device_token: string;
};

const APNS_TEAM_ID = Deno.env.get("APNS_TEAM_ID");
const APNS_KEY_ID = Deno.env.get("APNS_KEY_ID");
const APNS_AUTH_KEY = Deno.env.get("APNS_AUTH_KEY");
const APNS_BUNDLE_ID = Deno.env.get("APNS_BUNDLE_ID") ?? "com.rewireperform.app";
const canSendNativePush = Boolean(APNS_TEAM_ID && APNS_KEY_ID && APNS_AUTH_KEY);

const base64Url = (value: Uint8Array | string) => {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const pemToPkcs8 = (pem: string) => {
  const encoded = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const binary = atob(encoded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

let cachedApnsJwt: { value: string; expiresAt: number } | null = null;

const getApnsJwt = async () => {
  if (!APNS_TEAM_ID || !APNS_KEY_ID || !APNS_AUTH_KEY) {
    throw new Error("APNs credentials are not configured");
  }
  if (cachedApnsJwt && cachedApnsJwt.expiresAt > Date.now()) return cachedApnsJwt.value;

  const signingKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(APNS_AUTH_KEY.replace(/\\n/g, "\n")),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const encodedHeader = base64Url(JSON.stringify({ alg: "ES256", kid: APNS_KEY_ID }));
  const encodedClaims = base64Url(JSON.stringify({ iss: APNS_TEAM_ID, iat: Math.floor(Date.now() / 1000) }));
  const signingInput = `${encodedHeader}.${encodedClaims}`;
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    signingKey,
    new TextEncoder().encode(signingInput),
  );
  const value = `${signingInput}.${base64Url(new Uint8Array(signature))}`;
  cachedApnsJwt = { value, expiresAt: Date.now() + 50 * 60_000 };
  return value;
};

const sendNativeProgramStartPush = async (
  device: NativePushDevice,
  userId: string,
  payload: { title: string; body: string },
) => {
  const authorization = `bearer ${await getApnsJwt()}`;
  const request = async (host: string) => fetch(`${host}/3/device/${device.device_token}`, {
    method: "POST",
    headers: {
      authorization,
      "apns-topic": APNS_BUNDLE_ID,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      aps: { alert: { title: payload.title, body: payload.body }, sound: "default" },
      rewireperform: { route: "/dashboard", userId, notificationType: "program_start" },
    }),
  });

  let response = await request("https://api.push.apple.com");
  // Xcode debug devices use Apple's sandbox gateway; TestFlight uses production.
  if (response.status === 400 && (await response.clone().json().catch(() => null))?.reason === "BadDeviceToken") {
    response = await request("https://api.sandbox.push.apple.com");
  }
  return response;
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return jsonResponse({ error: "Missing authorization" }, 401);

  const supa = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: authData, error: authError } = await supa.auth.getUser(token);
  const caller = authData?.user;
  if (authError || !caller) return jsonResponse({ error: "Unauthorized" }, 401);

  const body = await req.json().catch(() => null) as { teamId?: string; startDate?: string } | null;
  const teamId = body?.teamId;
  const startDate = body?.startDate;
  if (!teamId || !startDate) return jsonResponse({ error: "teamId and startDate required" }, 400);

  const { data: team, error: teamError } = await supa
    .from("teams")
    .select("id,name,created_by,program_start_date")
    .eq("id", teamId)
    .maybeSingle();

  if (teamError) return jsonResponse({ error: teamError.message }, 500);
  if (!team) return jsonResponse({ error: "Team not found" }, 404);

  const { data: callerMembership } = await supa
    .from("team_members")
    .select("user_id")
    .eq("team_id", teamId)
    .eq("user_id", caller.id)
    .maybeSingle();
  const { data: callerRoles } = await supa
    .from("user_roles")
    .select("role")
    .eq("user_id", caller.id);
  const callerRoleSet = new Set((callerRoles ?? []).map((row) => row.role));
  const canManage =
    team.created_by === caller.id ||
    (Boolean(callerMembership) && (callerRoleSet.has("coach") || callerRoleSet.has("admin")));

  if (!canManage) return jsonResponse({ error: "Forbidden" }, 403);

  const { data: members, error: membersError } = await supa
    .from("team_members")
    .select("user_id")
    .eq("team_id", teamId);
  if (membersError) return jsonResponse({ error: membersError.message }, 500);

  const memberIds = [...new Set((members ?? []).map((member) => member.user_id))];
  if (memberIds.length === 0) return jsonResponse({ sent: 0, skipped: 0, removed: 0 });

  const { data: roles, error: rolesError } = await supa
    .from("user_roles")
    .select("user_id,role")
    .in("user_id", memberIds);
  if (rolesError) return jsonResponse({ error: rolesError.message }, 500);

  const athleteIds = [...new Set((roles ?? [])
    .filter((role) => role.role === "athlete")
    .map((role) => role.user_id))];
  if (athleteIds.length === 0) return jsonResponse({ sent: 0, skipped: 0, removed: 0 });

  const { data: subs, error: subsError } = await supa
    .from("push_subscriptions")
    .select("id,user_id,endpoint,p256dh,auth")
    .in("user_id", athleteIds);
  if (subsError) return jsonResponse({ error: subsError.message }, 500);

  const { data: nativeDevices, error: nativeDevicesError } = canSendNativePush
    ? await supa
      .from("native_push_devices")
      .select("id,user_id,device_token")
      .eq("platform", "ios")
      .in("user_id", athleteIds)
    : { data: [] as NativePushDevice[], error: null };
  if (nativeDevicesError) return jsonResponse({ error: nativeDevicesError.message }, 500);

  const payload = {
    title: "Dein Programm startet morgen",
    body: "Dein Coach hat das Programm gestartet. Dein erster Tag beginnt morgen.",
    url: "/dashboard",
    notificationType: "program_start",
    teamId,
    startDate,
  };

  let sent = 0;
  let nativeSent = 0;
  let webSent = 0;
  let skipped = 0;
  const removed: string[] = [];

  const nativeDeliveredUserIds = new Set<string>();
  for (const device of (nativeDevices ?? []) as NativePushDevice[]) {
    try {
      const response = await sendNativeProgramStartPush(device, device.user_id, payload);
      if (response.ok) {
        sent += 1;
        nativeSent += 1;
        nativeDeliveredUserIds.add(device.user_id);
        continue;
      }
      const reason = (await response.clone().json().catch(() => null))?.reason;
      if (response.status === 410 || (response.status === 400 && reason === "BadDeviceToken")) {
        await supa.from("native_push_devices").delete().eq("id", device.id);
        removed.push(device.id);
      } else {
        skipped += 1;
        console.error("native program start push error", response.status, reason ?? "unknown");
      }
    } catch (error) {
      skipped += 1;
      console.error("native program start push error", error instanceof Error ? error.message : "unknown");
    }
  }

  for (const sub of (subs ?? []) as Subscription[]) {
    // A successfully registered native app receives the native delivery once;
    // the web channel remains the fallback when APNs cannot confirm delivery.
    if (nativeDeliveredUserIds.has(sub.user_id)) continue;
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload),
      );
      sent += 1;
      webSent += 1;
    } catch (e: unknown) {
      const pushError = e as PushError;
      const code = pushError.statusCode;
      if (code === 404 || code === 410) {
        await supa.from("push_subscriptions").delete().eq("id", sub.id);
        removed.push(sub.endpoint);
      } else {
        skipped += 1;
        console.error("program start push error", code, pushError.body ?? pushError.message);
      }
    }
  }

  return jsonResponse({
    teamId,
    startDate,
    sent,
    nativeSent,
    webSent,
    skipped,
    removed: removed.length,
  });
});
