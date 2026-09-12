import { createClient } from "npm:@supabase/supabase-js@2";
import {
  remotePushConfiguration,
  sendApnsPush,
  sendFcmPush,
  sendWebPush,
  type RemotePushResult,
} from "../_shared/remotePush.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

type ClaimRow = {
  campaign_id: string;
  notification_log_id: string;
  user_id: string;
  program_instance_id: string;
  program_local_date: string;
};

type NativeDevice = {
  id: string;
  user_id: string;
  platform: "ios" | "android";
  device_token: string;
};

type WebSubscription = {
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

const safeError = (error: unknown) =>
  error instanceof Error ? error.message : String(error ?? "unknown");

const updateLog = async (
  supabase: ReturnType<typeof createClient>,
  logId: string,
  values: Record<string, unknown>,
) => {
  const { error } = await supabase.from("notification_log").update(values).eq("id", logId);
  if (error) console.error("coach reminder log update failed", error.message);
};

const attempt = async (
  callback: () => Promise<RemotePushResult>,
): Promise<RemotePushResult> => {
  try {
    return await callback();
  } catch (error) {
    return {
      accepted: false,
      expired: false,
      statusCode: null,
      reason: safeError(error),
    };
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return jsonResponse({ error: "missing_authorization" }, 401);

  const service = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await service.auth.getUser(token);
  if (authError || !authData.user) return jsonResponse({ error: "unauthorized" }, 401);

  const body = await req.json().catch(() => null) as { teamId?: string; preview?: boolean } | null;
  if (!body?.teamId) return jsonResponse({ error: "team_id_required" }, 400);

  if (body.preview === true) {
    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: statusData, error: statusError } = await callerClient.rpc(
      "get_coach_team_checkin_status_v1_4",
      { _team_id: body.teamId },
    );
    if (statusError) {
      if (statusError.message.includes("access_denied")) return jsonResponse({ error: "forbidden" }, 403);
      return jsonResponse({ error: "preview_failed" }, 500);
    }
    const configuration = remotePushConfiguration();
    const rows = (statusData ?? []) as Array<{
      today_checkin_completed: boolean;
      already_reminded_today: boolean;
      supported_push_channels: string[] | null;
    }>;
    const openRows = rows.filter((row) => !row.today_checkin_completed);
    const alreadyReminded = openRows.filter((row) => row.already_reminded_today).length;
    const candidates = openRows.filter((row) => !row.already_reminded_today);
    const isReachable = (row: typeof candidates[number]) => (row.supported_push_channels ?? []).some(
      (channel) => (channel === "apns" && configuration.apns)
        || (channel === "fcm" && configuration.fcm)
        || (channel === "web" && configuration.web),
    );
    const reachable = candidates.filter(isReachable).length;
    return jsonResponse({
      openToday: openRows.length,
      reachable,
      withoutChannel: candidates.length - reachable,
      alreadyReminded,
    });
  }

  const { data: claimedData, error: claimError } = await service.rpc(
    "claim_coach_checkin_reminder_v1_4",
    { _team_id: body.teamId, _requested_by: authData.user.id },
  );

  if (claimError) {
    const message = claimError.message ?? "claim_failed";
    if (message.includes("reminder_already_requested")) {
      return jsonResponse({ error: "already_reminded_today" }, 409);
    }
    if (message.includes("outside_reminder_window")) {
      return jsonResponse({ error: "outside_reminder_window" }, 409);
    }
    if (message.includes("program_not_started")) {
      return jsonResponse({ error: "program_not_started" }, 409);
    }
    if (message.includes("no_open_checkins")) {
      return jsonResponse({
        acceptedUsers: 0,
        failedUsers: 0,
        skippedCompleted: 0,
        skippedNoChannel: 0,
        endpointAttempts: 0,
        message: "no_open_checkins",
      });
    }
    if (message.includes("access_denied")) {
      return jsonResponse({ error: "forbidden" }, 403);
    }
    console.error("coach reminder claim failed", message);
    return jsonResponse({ error: "claim_failed" }, 500);
  }

  const claims = (claimedData ?? []) as ClaimRow[];
  if (claims.length === 0) {
    return jsonResponse({
      acceptedUsers: 0,
      failedUsers: 0,
      skippedCompleted: 0,
      skippedNoChannel: 0,
      endpointAttempts: 0,
      message: "no_open_checkins",
    });
  }

  const campaignId = claims[0].campaign_id;
  const userIds = [...new Set(claims.map((row) => row.user_id))];
  const [{ data: nativeData, error: nativeError }, { data: webData, error: webError }] = await Promise.all([
    service
      .from("native_push_devices")
      .select("id,user_id,platform,device_token")
      .in("user_id", userIds),
    service
      .from("push_subscriptions")
      .select("id,user_id,endpoint,p256dh,auth")
      .in("user_id", userIds),
  ]);

  if (nativeError || webError) {
    console.error("coach reminder endpoint load failed", nativeError?.message ?? webError?.message);
    await Promise.all(claims.map((claim) => updateLog(service, claim.notification_log_id, {
      status: "failed",
      failed_at: new Date().toISOString(),
      metadata: {
        source: "coach_bulk",
        campaign_id: campaignId,
        copy_version: "coach-checkin-reminder-v1",
        error: "endpoint_load_failed",
      },
    })));
    await service.rpc("finalize_coach_checkin_reminder_v1_4", {
      _campaign_id: campaignId,
      _accepted_users: 0,
      _failed_users: claims.length,
      _skipped_completed: 0,
      _skipped_no_channel: 0,
      _endpoint_attempts: 0,
    });
    return jsonResponse({ error: "endpoint_load_failed" }, 500);
  }

  const nativeByUser = new Map<string, NativeDevice[]>();
  for (const device of (nativeData ?? []) as NativeDevice[]) {
    const rows = nativeByUser.get(device.user_id) ?? [];
    rows.push(device);
    nativeByUser.set(device.user_id, rows);
  }
  const webByUser = new Map<string, WebSubscription[]>();
  for (const subscription of (webData ?? []) as WebSubscription[]) {
    const rows = webByUser.get(subscription.user_id) ?? [];
    rows.push(subscription);
    webByUser.set(subscription.user_id, rows);
  }

  const configuration = remotePushConfiguration();
  let acceptedUsers = 0;
  let failedUsers = 0;
  let skippedCompleted = 0;
  let skippedNoChannel = 0;
  let endpointAttempts = 0;

  for (const claim of claims) {
    const { data: completedNow, error: completedError } = await service
      .from("daily_checkins")
      .select("id")
      .eq("program_instance_id", claim.program_instance_id)
      .eq("date", claim.program_local_date)
      .limit(1)
      .maybeSingle();

    if (completedError) {
      failedUsers++;
      await updateLog(service, claim.notification_log_id, {
        status: "failed",
        failed_at: new Date().toISOString(),
        metadata: {
          source: "coach_bulk",
          campaign_id: campaignId,
          copy_version: "coach-checkin-reminder-v1",
          error: "checkin_recheck_failed",
        },
      });
      continue;
    }
    if (completedNow) {
      skippedCompleted++;
      await updateLog(service, claim.notification_log_id, {
        status: "skipped_completed",
        metadata: {
          source: "coach_bulk",
          campaign_id: campaignId,
          copy_version: "coach-checkin-reminder-v1",
          reason: "completed_before_delivery",
        },
      });
      continue;
    }

    const payload = {
      title: "Kurze Erinnerung von deinem Coach",
      body: "Dein heutiger Check-in ist noch offen. Nimm dir bitte sobald wie möglich kurz Zeit dafür.",
      route: `/dashboard?focus=checkin&notification_id=${encodeURIComponent(claim.notification_log_id)}&notification_type=coach_checkin_reminder&notification_user_id=${encodeURIComponent(claim.user_id)}`,
      userId: claim.user_id,
      notificationType: "coach_checkin_reminder",
      notificationId: claim.notification_log_id,
    };
    const devices = nativeByUser.get(claim.user_id) ?? [];
    const subscriptions = webByUser.get(claim.user_id) ?? [];
    const outcomes: Array<{ channel: "apns" | "fcm" | "web"; result: RemotePushResult }> = [];

    for (const device of devices) {
      if (device.platform === "ios" && configuration.apns) {
        endpointAttempts++;
        const result = await attempt(() => sendApnsPush(device.device_token, payload));
        outcomes.push({ channel: "apns", result });
        if (result.expired) await service.from("native_push_devices").delete().eq("id", device.id);
      }
      if (device.platform === "android" && configuration.fcm) {
        endpointAttempts++;
        const result = await attempt(() => sendFcmPush(device.device_token, payload));
        outcomes.push({ channel: "fcm", result });
        if (result.expired) await service.from("native_push_devices").delete().eq("id", device.id);
      }
    }

    const nativeAccepted = outcomes.some(
      (outcome) => outcome.channel !== "web" && outcome.result.accepted,
    );
    if (!nativeAccepted && configuration.web) {
      for (const subscription of subscriptions) {
        endpointAttempts++;
        const result = await attempt(() => sendWebPush(subscription, payload));
        outcomes.push({ channel: "web", result });
        if (result.expired) await service.from("push_subscriptions").delete().eq("id", subscription.id);
      }
    }

    const acceptedChannels = [...new Set(
      outcomes.filter((outcome) => outcome.result.accepted).map((outcome) => outcome.channel),
    )];
    if (acceptedChannels.length > 0) {
      acceptedUsers++;
      await updateLog(service, claim.notification_log_id, {
        status: "sent",
        sent_at: new Date().toISOString(),
        metadata: {
          source: "coach_bulk",
          campaign_id: campaignId,
          copy_version: "coach-checkin-reminder-v1",
          accepted_channels: acceptedChannels,
          endpoint_attempts: outcomes.length,
        },
      });
      continue;
    }

    if (outcomes.length === 0) {
      skippedNoChannel++;
      await updateLog(service, claim.notification_log_id, {
        status: "skipped_no_channel",
        metadata: {
          source: "coach_bulk",
          campaign_id: campaignId,
          copy_version: "coach-checkin-reminder-v1",
          reason: "no_configured_supported_channel",
        },
      });
      continue;
    }

    failedUsers++;
    await updateLog(service, claim.notification_log_id, {
      status: "failed",
      failed_at: new Date().toISOString(),
      metadata: {
        source: "coach_bulk",
        campaign_id: campaignId,
        copy_version: "coach-checkin-reminder-v1",
        endpoint_attempts: outcomes.length,
        failure_channels: [...new Set(outcomes.map((outcome) => outcome.channel))],
      },
    });
  }

  const { error: finalizeError } = await service.rpc("finalize_coach_checkin_reminder_v1_4", {
    _campaign_id: campaignId,
    _accepted_users: acceptedUsers,
    _failed_users: failedUsers,
    _skipped_completed: skippedCompleted,
    _skipped_no_channel: skippedNoChannel,
    _endpoint_attempts: endpointAttempts,
  });
  if (finalizeError) console.error("coach reminder finalize failed", finalizeError.message);

  return jsonResponse({
    campaignId,
    acceptedUsers,
    failedUsers,
    skippedCompleted,
    skippedNoChannel,
    endpointAttempts,
    providerAccepted: acceptedUsers > 0,
  });
});
