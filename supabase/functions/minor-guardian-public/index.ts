import {
  adminClient,
  assertAllowedOrigin,
  athleteFirstName,
  corsHeaders,
  decryptEmail,
  guardianReceiptEmail,
  invokeGuardianFeedbackService,
  invokeMinorService,
  jsonResponse,
  MinorFlowError,
  parseJson,
  publicError,
  randomToken,
  safeAthleteFirstName,
  sendTransactionalEmail,
  sha256,
} from "../_shared/minorGuardian.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  try {
    assertAllowedOrigin(req);
    const body = await parseJson(req);
    const action = body.action;
    const token = typeof body.token === "string" ? body.token : "";
    if (!token || token.length < 32 || token.length > 256) throw new MinorFlowError("link_invalid", 410);
    const tokenHash = await sha256(token);
    const admin = adminClient();

    if (action === "inspect") {
      const result = await invokeMinorService(admin, "challenge_lookup", null, { token_hash: tokenHash });
      if (result.state !== "pending") return jsonResponse(req, result);
      const feedbackText = await invokeGuardianFeedbackService(
        admin,
        "guardian_feedback_text_decision_status",
        { _token_hash: tokenHash },
      ).catch(() => ({ available: false, state: "unavailable" }));
      const { data: rawFirstName, error: displayNameError } = await admin.rpc(
        "minor_guardian_challenge_display_name",
        { _token_hash: tokenHash },
      );
      return jsonResponse(req, {
        ...result,
        feedback_text_authorization_available: feedbackText.available === true,
        feedback_text_authorization_state: String(feedbackText.state ?? "unavailable"),
        feedback_text_retention_days: typeof feedbackText.raw_text_retention_days === "number"
          ? feedbackText.raw_text_retention_days
          : null,
        feedback_text_processor_mode: typeof feedbackText.processor_mode === "string"
          ? feedbackText.processor_mode
          : null,
        athlete_first_name: displayNameError ? null : safeAthleteFirstName(rawFirstName),
      });
    }

    if (action === "decide") {
      if (
        typeof body.productAuthorized !== "boolean"
        || typeof body.dataContributionAuthorized !== "boolean"
        || typeof body.guardianFeedbackTextAuthorized !== "boolean"
        || body.guardianDeclaration !== true
      ) {
        throw new MinorFlowError("invalid_decision", 400);
      }

      const managementToken = randomToken();
      const result = await invokeGuardianFeedbackService(
        admin,
        "guardian_feedback_text_decide",
        {
          _payload: {
            token_hash: tokenHash,
            product_authorized: body.productAuthorized,
            data_contribution_authorized: body.dataContributionAuthorized,
            feedback_text_authorized: body.guardianFeedbackTextAuthorized,
            guardian_declaration: true,
            management_token_hash: await sha256(managementToken),
          },
        },
      );

      let receiptDelivery: "not_required" | "sent" | "failed" = "not_required";
      let manageUrl: string | null = null;
      if (body.productAuthorized) {
        const userId = typeof result.user_id === "string" ? result.user_id : "";
        const firstName = userId ? await athleteFirstName(admin, userId) : null;
        const receipt = guardianReceiptEmail(managementToken, firstName);
        manageUrl = receipt.manageUrl;
        try {
          const email = await decryptEmail(
            String(result.guardian_email_ciphertext ?? ""),
            String(result.guardian_email_iv ?? ""),
          );
          await sendTransactionalEmail(email, receipt, `guardian-receipt-${tokenHash}`);
          receiptDelivery = "sent";
        } catch {
          receiptDelivery = "failed";
        }
      }

      return jsonResponse(req, {
        state: result.state,
        feedbackTextAuthorizationState: result.feedback_text_authorization_state ?? "unavailable",
        receiptDelivery,
        manageUrl,
      });
    }

    if (action === "inspect-management") {
      const result = await invokeMinorService(admin, "management_lookup", null, { token_hash: tokenHash });
      if (result.state !== "active") return jsonResponse(req, result);
      const feedbackText = await invokeGuardianFeedbackService(
        admin,
        "guardian_feedback_text_management_status",
        { _token_hash: tokenHash },
      ).catch(() => ({ available: false, state: "unavailable" }));
      const { data: rawFirstName, error: displayNameError } = await admin.rpc(
        "minor_guardian_management_display_name",
        { _token_hash: tokenHash },
      );
      return jsonResponse(req, {
        ...result,
        feedback_text_authorization_available: feedbackText.available === true,
        feedback_text_authorization_state: String(feedbackText.state ?? "unavailable"),
        feedback_text_retention_days: typeof feedbackText.raw_text_retention_days === "number"
          ? feedbackText.raw_text_retention_days
          : null,
        feedback_text_processor_mode: typeof feedbackText.processor_mode === "string"
          ? feedbackText.processor_mode
          : null,
        athlete_first_name: displayNameError ? null : safeAthleteFirstName(rawFirstName),
      });
    }

    if (action === "withdraw-data-contribution") {
      const result = await invokeMinorService(admin, "guardian_withdraw_data_contribution", null, { token_hash: tokenHash });
      return jsonResponse(req, result);
    }

    if (action === "set-feedback-text-authorization") {
      if (typeof body.authorized !== "boolean") throw new MinorFlowError("invalid_decision", 400);
      const result = await invokeGuardianFeedbackService(
        admin,
        "guardian_feedback_text_management_decide",
        { _token_hash: tokenHash, _authorized: body.authorized },
      );
      return jsonResponse(req, {
        state: "active",
        feedback_text_authorization_available: result.available === true,
        feedback_text_authorization_state: String(result.state ?? "unavailable"),
        feedback_text_retention_days: typeof result.raw_text_retention_days === "number"
          ? result.raw_text_retention_days
          : null,
        feedback_text_processor_mode: typeof result.processor_mode === "string"
          ? result.processor_mode
          : null,
      });
    }

    if (action === "revoke") {
      const result = await invokeMinorService(admin, "guardian_revoke", null, { token_hash: tokenHash });
      return jsonResponse(req, result);
    }

    throw new MinorFlowError("invalid_action", 400);
  } catch (error) {
    return publicError(req, error);
  }
});
