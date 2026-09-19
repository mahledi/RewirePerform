import webpush from "npm:web-push@3.6.7";

export type RemotePushPayload = {
  title: string;
  body: string;
  route: string;
  userId: string;
  notificationType: string;
  notificationId?: string;
};

export type RemotePushResult = {
  accepted: boolean;
  expired: boolean;
  statusCode: number | null;
  reason: string;
};

export type WebPushTarget = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

type FcmServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
  token_uri?: string;
};

const APNS_TEAM_ID = Deno.env.get("APNS_TEAM_ID");
const APNS_KEY_ID = Deno.env.get("APNS_KEY_ID");
const APNS_AUTH_KEY = Deno.env.get("APNS_AUTH_KEY");
const APNS_BUNDLE_ID = Deno.env.get("APNS_BUNDLE_ID") ?? "com.rewireperform.app";

const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY");
const rawVapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "support@rewireperform.com";
const VAPID_SUBJECT =
  rawVapidSubject.startsWith("mailto:") || rawVapidSubject.startsWith("http")
    ? rawVapidSubject
    : `mailto:${rawVapidSubject}`;

const base64Url = (value: Uint8Array | string) => {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const pemBytes = (pem: string) => {
  const encoded = pem
    .replace(/-----BEGIN (?:EC |RSA )?PRIVATE KEY-----/g, "")
    .replace(/-----END (?:EC |RSA )?PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
  const binary = atob(encoded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

let cachedApnsJwt: { value: string; expiresAt: number } | null = null;

const getApnsJwt = async () => {
  if (!APNS_TEAM_ID || !APNS_KEY_ID || !APNS_AUTH_KEY) {
    throw new Error("apns_not_configured");
  }
  if (cachedApnsJwt && cachedApnsJwt.expiresAt > Date.now()) return cachedApnsJwt.value;

  const signingKey = await crypto.subtle.importKey(
    "pkcs8",
    pemBytes(APNS_AUTH_KEY.replace(/\\n/g, "\n")),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const encodedHeader = base64Url(JSON.stringify({ alg: "ES256", kid: APNS_KEY_ID }));
  const encodedClaims = base64Url(JSON.stringify({
    iss: APNS_TEAM_ID,
    iat: Math.floor(Date.now() / 1000),
  }));
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

const parseFcmServiceAccount = (): FcmServiceAccount | null => {
  const raw = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<FcmServiceAccount>;
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) return null;
    return parsed as FcmServiceAccount;
  } catch {
    return null;
  }
};

let cachedFcmAccessToken: { value: string; expiresAt: number } | null = null;

const getFcmAccessToken = async (account: FcmServiceAccount) => {
  if (cachedFcmAccessToken && cachedFcmAccessToken.expiresAt > Date.now()) {
    return cachedFcmAccessToken.value;
  }

  const now = Math.floor(Date.now() / 1000);
  const tokenUri = account.token_uri ?? "https://oauth2.googleapis.com/token";
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(JSON.stringify({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: tokenUri,
    iat: now,
    exp: now + 3600,
  }));
  const signingInput = `${header}.${claims}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemBytes(account.private_key.replace(/\\n/g, "\n")),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  );
  const assertion = `${signingInput}.${base64Url(new Uint8Array(signature))}`;
  const response = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const body = await response.json().catch(() => null) as {
    access_token?: string;
    expires_in?: number;
    error_description?: string;
  } | null;
  if (!response.ok || !body?.access_token) {
    throw new Error(body?.error_description ?? `fcm_oauth_${response.status}`);
  }
  cachedFcmAccessToken = {
    value: body.access_token,
    expiresAt: Date.now() + Math.max(60, (body.expires_in ?? 3600) - 120) * 1000,
  };
  return body.access_token;
};

const responseReason = async (response: Response) => {
  const text = await response.clone().text().catch(() => "");
  if (!text) return `http_${response.status}`;
  try {
    const parsed = JSON.parse(text) as {
      reason?: string;
      error?: {
        status?: string;
        message?: string;
        details?: Array<{ errorCode?: string }>;
      };
    };
    return parsed.reason
      ?? parsed.error?.details?.find((detail) => detail.errorCode)?.errorCode
      ?? parsed.error?.status
      ?? parsed.error?.message
      ?? `http_${response.status}`;
  } catch {
    return text.slice(0, 160);
  }
};

export const remotePushConfiguration = () => ({
  apns: Boolean(APNS_TEAM_ID && APNS_KEY_ID && APNS_AUTH_KEY),
  fcm: Boolean(parseFcmServiceAccount()),
  web: Boolean(VAPID_PUBLIC && VAPID_PRIVATE),
});

export const sendApnsPush = async (
  deviceToken: string,
  payload: RemotePushPayload,
): Promise<RemotePushResult> => {
  if (!remotePushConfiguration().apns) {
    return { accepted: false, expired: false, statusCode: null, reason: "apns_not_configured" };
  }
  const authorization = `bearer ${await getApnsJwt()}`;
  const request = (host: string) => fetch(`${host}/3/device/${deviceToken}`, {
    method: "POST",
    headers: {
      authorization,
      "apns-topic": APNS_BUNDLE_ID,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      aps: {
        alert: { title: payload.title, body: payload.body },
        sound: "default",
      },
      rewireperform: {
        route: payload.route,
        userId: payload.userId,
        notificationType: payload.notificationType,
        notificationId: payload.notificationId,
      },
    }),
  });

  let response = await request("https://api.push.apple.com");
  let reason = response.ok ? "accepted" : await responseReason(response);
  if (response.status === 400 && reason === "BadDeviceToken") {
    response = await request("https://api.sandbox.push.apple.com");
    reason = response.ok ? "accepted" : await responseReason(response);
  }
  return {
    accepted: response.ok,
    expired: response.status === 410 || (response.status === 400 && reason === "BadDeviceToken"),
    statusCode: response.status,
    reason,
  };
};

export const sendFcmPush = async (
  deviceToken: string,
  payload: RemotePushPayload,
): Promise<RemotePushResult> => {
  const account = parseFcmServiceAccount();
  if (!account) {
    return { accepted: false, expired: false, statusCode: null, reason: "fcm_not_configured" };
  }
  const accessToken = await getFcmAccessToken(account);
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(account.project_id)}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token: deviceToken,
          notification: { title: payload.title, body: payload.body },
          android: {
            priority: "high",
            notification: {
              sound: "default",
              channel_id: "rewireperform-reminders-v1",
            },
          },
          data: {
            route: payload.route,
            userId: payload.userId,
            notificationType: payload.notificationType,
            notificationId: payload.notificationId ?? "",
          },
        },
      }),
    },
  );
  const reason = response.ok ? "accepted" : await responseReason(response);
  return {
    accepted: response.ok,
    expired: reason === "UNREGISTERED" || reason === "registration-token-not-registered",
    statusCode: response.status,
    reason,
  };
};

export const sendWebPush = async (
  target: WebPushTarget,
  payload: RemotePushPayload,
): Promise<RemotePushResult> => {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return { accepted: false, expired: false, statusCode: null, reason: "web_push_not_configured" };
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  try {
    await webpush.sendNotification(
      {
        endpoint: target.endpoint,
        keys: { p256dh: target.p256dh, auth: target.auth },
      },
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.route,
        notificationId: payload.notificationId,
        notificationType: payload.notificationType,
      }),
    );
    return { accepted: true, expired: false, statusCode: 201, reason: "accepted" };
  } catch (error) {
    const pushError = error as { statusCode?: number; body?: string; message?: string };
    const statusCode = pushError.statusCode ?? null;
    return {
      accepted: false,
      expired: statusCode === 404 || statusCode === 410,
      statusCode,
      reason: pushError.body ?? pushError.message ?? "web_push_failed",
    };
  }
};
