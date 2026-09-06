import {
  adminClient,
  assertAllowedOrigin,
  athleteFirstName,
  authenticatedUser,
  corsHeaders,
  decryptEmail,
  encryptEmail,
  guardianEmailHash,
  guardianInvitationEmail,
  invokeMinorService,
  jsonResponse,
  maskEmail,
  MinorFlowError,
  normalizeGuardianEmail,
  parseJson,
  publicError,
  randomToken,
  sendTransactionalEmail,
  sha256,
} from "../_shared/minorGuardian.ts";

const status = (admin: ReturnType<typeof adminClient>, userId: string) =>
  invokeMinorService(admin, "status", userId);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  try {
    assertAllowedOrigin(req);
    const user = await authenticatedUser(req);
    const body = await parseJson(req);
    const action = body.action;
    if (typeof action !== "string") throw new MinorFlowError("invalid_action", 400);
    const admin = adminClient();

    if (action === "status") return jsonResponse(req, await status(admin, user.id));

    if (action === "set-age") {
      const ageBand = body.ageBand;
      if (!['under_16', 'age_16_17', 'adult'].includes(String(ageBand))) {
        throw new MinorFlowError("invalid_age_band", 400);
      }
      const result = await invokeMinorService(admin, "set_age", user.id, { age_band: ageBand });
      return jsonResponse(req, result);
    }

    if (action === "start" || action === "resend") {
      let email: string;
      let encrypted: { ciphertext: string; iv: string };
      let emailHash: string;
      let emailMask: string;

      if (action === "start") {
        email = normalizeGuardianEmail(body.guardianEmail);
        encrypted = { ciphertext: "", iv: "" };
        emailHash = "";
        emailMask = "";
      } else {
        const prepared = await invokeMinorService(admin, "prepare_resend", user.id);
        const ciphertext = String(prepared.guardian_email_ciphertext ?? "");
        const iv = String(prepared.guardian_email_iv ?? "");
        email = await decryptEmail(ciphertext, iv);
        encrypted = { ciphertext, iv };
        emailHash = String(prepared.guardian_email_hash ?? "");
        emailMask = String(prepared.guardian_email_mask ?? "");
      }

      const athleteEmail = typeof user.email === "string"
        ? normalizeGuardianEmail(user.email)
        : null;
      if (athleteEmail && email === athleteEmail) {
        throw new MinorFlowError("guardian_email_matches_athlete", 400);
      }

      if (action === "start") {
        encrypted = await encryptEmail(email);
        emailHash = await guardianEmailHash(email);
        emailMask = maskEmail(email);
      }

      const token = randomToken();
      const challenge = await invokeMinorService(admin, "start_challenge", user.id, {
        token_hash: await sha256(token),
        guardian_email_ciphertext: encrypted.ciphertext,
        guardian_email_iv: encrypted.iv,
        guardian_email_hash: emailHash,
        guardian_email_mask: emailMask,
      });
      const challengeId = String(challenge.challenge_id ?? "");

      try {
        const firstName = await athleteFirstName(admin, user.id);
        const providerMessageId = await sendTransactionalEmail(
          email,
          guardianInvitationEmail(token, firstName),
          `guardian-invitation-${challengeId}`,
        );
        await invokeMinorService(admin, "delivery_sent", user.id, {
          challenge_id: challengeId,
          provider_message_id: providerMessageId ?? "",
        });
      } catch (error) {
        await invokeMinorService(admin, "delivery_failed", user.id, { challenge_id: challengeId }).catch(() => undefined);
        throw error;
      }

      return jsonResponse(req, await status(admin, user.id));
    }

    if (action === "assent") {
      if (typeof body.productAuthorized !== "boolean" || typeof body.dataContributionAuthorized !== "boolean") {
        throw new MinorFlowError("invalid_decision", 400);
      }
      const result = await invokeMinorService(admin, "assent", user.id, {
        product_authorized: body.productAuthorized,
        data_contribution_authorized: body.dataContributionAuthorized,
      });
      return jsonResponse(req, result);
    }

    if (action === "set-data-contribution") {
      if (typeof body.authorized !== "boolean") throw new MinorFlowError("invalid_decision", 400);
      const result = await invokeMinorService(admin, "set_data_contribution", user.id, {
        data_contribution_authorized: body.authorized,
      });
      return jsonResponse(req, result);
    }

    if (action === "revoke" || action === "restart") {
      return jsonResponse(req, await invokeMinorService(admin, action, user.id));
    }

    throw new MinorFlowError("invalid_action", 400);
  } catch (error) {
    return publicError(req, error);
  }
});
