import {
  adminClient,
  assertAllowedOrigin,
  athleteFirstName,
  corsHeaders,
  decryptEmail,
  guardianReceiptEmail,
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
      const { data: rawFirstName, error: displayNameError } = await admin.rpc(
        "minor_guardian_challenge_display_name",
        { _token_hash: tokenHash },
      );
      return jsonResponse(req, {
        ...result,
        athlete_first_name: displayNameError ? null : safeAthleteFirstName(rawFirstName),
      });
    }

    if (action === "decide") {
      if (
        typeof body.productAuthorized !== "boolean"
        || typeof body.dataContributionAuthorized !== "boolean"
        || body.guardianDeclaration !== true
      ) {
        throw new MinorFlowError("invalid_decision", 400);
      }

      const managementToken = randomToken();
      const result = await invokeMinorService(admin, "guardian_decide", null, {
        token_hash: tokenHash,
        product_authorized: body.productAuthorized,
        data_contribution_authorized: body.dataContributionAuthorized,
        guardian_declaration: true,
        management_token_hash: await sha256(managementToken),
      });

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
        receiptDelivery,
        manageUrl,
      });
    }

    if (action === "inspect-management") {
      const result = await invokeMinorService(admin, "management_lookup", null, { token_hash: tokenHash });
      if (result.state !== "active") return jsonResponse(req, result);
      const { data: rawFirstName, error: displayNameError } = await admin.rpc(
        "minor_guardian_management_display_name",
        { _token_hash: tokenHash },
      );
      return jsonResponse(req, {
        ...result,
        athlete_first_name: displayNameError ? null : safeAthleteFirstName(rawFirstName),
      });
    }

    if (action === "withdraw-data-contribution") {
      const result = await invokeMinorService(admin, "guardian_withdraw_data_contribution", null, { token_hash: tokenHash });
      return jsonResponse(req, result);
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
