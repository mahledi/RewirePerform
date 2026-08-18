import { brandedEmailButton, brandedEmailShell, safeEmailHtml, SUPPORT_EMAIL } from "../_shared/rewireEmail.ts";
import { serviceClient } from "../_shared/supabaseService.ts";

const APP_URL = "https://rewireperform.com";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const TOKEN_PATTERN = /^[a-f0-9]{64}$/u;

const response = (status: number, body: Record<string, unknown>, origin: string | null) => new Response(
  JSON.stringify(body),
  {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...(origin ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}),
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  },
);

const allowedOrigins = new Set([
  "https://rewireperform.com",
  "https://www.rewireperform.com",
  "capacitor://localhost",
]);

const digest = async (value: string) => {
  const encoded = new TextEncoder().encode(value);
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", encoded));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

const transactionalFrom = () => {
  const value = Deno.env.get("ORGANIZATION_INVITATION_EMAIL_FROM")?.trim();
  if (!value) throw new Error("service_not_configured");
  return value;
};

Deno.serve(async (request) => {
  const origin = request.headers.get("Origin");
  const allowedOrigin = origin && allowedOrigins.has(origin) ? origin : null;
  if (request.method === "OPTIONS") return allowedOrigin ? response(200, { ok: true }, allowedOrigin) : response(403, { error: "origin_not_allowed" }, null);
  if (request.method !== "POST") return response(405, { error: "method_not_allowed" }, allowedOrigin);
  if (!allowedOrigin) return response(403, { error: "origin_not_allowed" }, null);

  try {
    const authorization = request.headers.get("Authorization") ?? "";
    const token = authorization.replace(/^Bearer\s+/iu, "");
    if (!token) return response(401, { error: "authentication_required" }, allowedOrigin);

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const recipientEmail = typeof body?.recipient_email === "string" ? body.recipient_email.trim().toLowerCase() : "";
    const invitationToken = typeof body?.invitation_token === "string" ? body.invitation_token.trim() : "";
    if (!EMAIL_PATTERN.test(recipientEmail) || !TOKEN_PATTERN.test(invitationToken)) {
      return response(400, { error: "invalid_request" }, allowedOrigin);
    }

    const admin = serviceClient();
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    const actorId = authData.user?.id;
    if (authError || !actorId) return response(401, { error: "authentication_required" }, allowedOrigin);

    const { data: roles, error: rolesError } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", actorId)
      .eq("role", "admin")
      .limit(1);
    if (rolesError || !roles?.length) return response(403, { error: "admin_required" }, allowedOrigin);

    const { data: invitation, error: invitationError } = await admin
      .from("organization_invitations")
      .select("id, email, status, expires_at")
      .eq("token_digest", await digest(invitationToken))
      .maybeSingle();
    if (invitationError || !invitation || invitation.status !== "pending" || invitation.expires_at <= new Date().toISOString()) {
      return response(400, { error: "invitation_unavailable" }, allowedOrigin);
    }
    if (String(invitation.email).toLowerCase() !== recipientEmail) return response(403, { error: "invitation_email_mismatch" }, allowedOrigin);

    const resendApiKey = Deno.env.get("RESEND_API_KEY")?.trim();
    if (!resendApiKey) return response(503, { error: "service_not_configured" }, allowedOrigin);

    const inviteUrl = `${APP_URL}/organization/invite?token=${encodeURIComponent(invitationToken)}`;
    const message = {
      subject: "Dein Coach-Zugang zu RewirePerform",
      text: `Dein persönlicher Coach-Zugang ist bereit. Registriere dich oder melde dich mit dieser E-Mail-Adresse an und bestätige anschließend deine Einladung: ${inviteUrl}\n\nDer Link ist einmalig und sieben Tage gültig. Hilfe: ${SUPPORT_EMAIL}`,
      html: brandedEmailShell({
        appUrl: APP_URL,
        preheader: "Dein persönlicher Coach-Zugang ist bereit.",
        eyebrow: "Persönlicher Coach-Zugang",
        title: "Dein Team startet hier.",
        body: `<p style="margin:0;">Dein Zugang zu RewirePerform ist bereit. Registriere dich oder melde dich mit dieser E-Mail-Adresse an und bestätige anschließend deine Einladung.</p><p style="margin:16px 0 0;">Der Link ist einmalig und sieben Tage gültig.</p>`,
        action: brandedEmailButton("Coach-Zugang öffnen", inviteUrl),
        note: `<strong>Wichtig:</strong> Diese Einladung ist nur für <span>${safeEmailHtml(recipientEmail)}</span> gültig.`,
      }),
    };

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `organization-invitation-${invitation.id}`,
      },
      body: JSON.stringify({
        from: transactionalFrom(),
        to: [recipientEmail],
        reply_to: SUPPORT_EMAIL,
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });
    if (!emailResponse.ok) return response(503, { error: "email_delivery_failed" }, allowedOrigin);
    return response(200, { ok: true }, allowedOrigin);
  } catch (error) {
    const known = error instanceof Error && error.message === "service_not_configured";
    return response(known ? 503 : 500, { error: known ? "service_not_configured" : "unexpected_error" }, allowedOrigin);
  }
});
