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

  const payload = {
    title: "Programmstart morgen",
    body: "Euer 56-Tage-Programm startet morgen. Heute reicht: App installiert lassen und Push aktiv halten.",
    url: "/dashboard",
    notificationType: "program_start",
    teamId,
    startDate,
  };

  let sent = 0;
  let skipped = 0;
  const removed: string[] = [];

  for (const sub of (subs ?? []) as Subscription[]) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload),
      );
      sent += 1;
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
    skipped,
    removed: removed.length,
  });
});
