/**
 * team-mental-state - aggregate-only coach endpoint
 *
 * The database performs authorization, consent/age eligibility and every
 * n >= 5 calculation. This function never receives athlete identifiers,
 * individual check-ins, journals, reflections or questionnaire answers.
 */
import {
  assertAllowedOrigin,
  authenticatedClient,
  authenticatedUser,
  corsHeaders,
  MinorFlowError,
  parseJson,
  publicError,
} from "../_shared/minorGuardian.ts";

const TEAM_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  try {
    assertAllowedOrigin(req);
    await authenticatedUser(req);

    const body = await parseJson(req);
    const teamId = body.team_id;
    if (typeof teamId !== "string" || !TEAM_ID_PATTERN.test(teamId)) {
      throw new MinorFlowError("invalid_team_id", 400);
    }

    const client = authenticatedClient(req);
    const { data, error } = await client.rpc("get_team_mental_state_aggregate", {
      _team_id: teamId,
      _protocol_version: "56d-transfer-v2-2026-07",
    });

    if (error) {
      if (error.message.includes("team_not_found")) {
        throw new MinorFlowError("team_not_found", 404);
      }
      if (
        error.message.includes("team_access_forbidden")
        || error.message.includes("coach_or_admin_role_required")
      ) {
        throw new MinorFlowError("forbidden", 403);
      }
      throw new MinorFlowError("team_aggregate_unavailable", 503);
    }

    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders(req),
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("team-mental-state failed");
    return publicError(req, error);
  }
});
