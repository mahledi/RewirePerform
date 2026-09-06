import { createClient } from "npm:@supabase/supabase-js@2.99.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const isIsoDate = (value: unknown): value is string => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return jsonResponse({ error: "Unauthorized" }, 401);
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData } = await userClient.auth.getClaims(token);
    if (!claimsData?.claims) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const adminId = claimsData.claims.sub as string;
    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: roleRow, error: roleError } = await admin.from("user_roles")
      .select("role").eq("user_id", adminId).eq("role", "admin").maybeSingle();
    if (roleError) throw new Error(`admin_role_lookup_failed:${roleError.message}`);
    if (!roleRow) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const body = await req.json();
    const { action, team_id, simulated_date, simulated_day_number } = body ?? {};
    if (typeof team_id !== "string" || team_id.length === 0) return jsonResponse({ error: "team_id required" }, 400);

    if (action === "archive") {
      const { data, error } = await admin.rpc("archive_qa_cohort", { _team_id: team_id });
      if (error) throw new Error(error.message);
      return jsonResponse(data);
    }

    // verify it's a test team
    const { data: team, error: teamError } = await admin.from("teams")
      .select("id, is_test_team, program_start_date").eq("id", team_id).maybeSingle();
    if (teamError) throw new Error(`qa_team_lookup_failed:${teamError.message}`);
    if (!team || !team.is_test_team) {
      return jsonResponse({ error: "Not a test team" }, 400);
    }

    if (simulated_day_number !== undefined && (
      typeof simulated_day_number !== "number"
      || !Number.isInteger(simulated_day_number)
      || simulated_day_number < 1
      || simulated_day_number > 56
    )) return jsonResponse({ error: "simulated_day_number must be an integer from 1 to 56" }, 400);

    if (simulated_date !== undefined && !isIsoDate(simulated_date)) {
      return jsonResponse({ error: "simulated_date must use YYYY-MM-DD" }, 400);
    }

    let simDate = simulated_date as string | undefined;
    let simDay = simulated_day_number as number | undefined;
    const startValue = team.program_start_date ?? new Date().toISOString().slice(0, 10);
    const start = new Date(`${startValue}T00:00:00.000Z`);
    if (simDay !== undefined && !simDate) {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + (simDay - 1));
      simDate = d.toISOString().slice(0, 10);
    }
    if (!simDate) return jsonResponse({ error: "simulated_date or simulated_day_number required" }, 400);
    const ms = new Date(`${simDate}T00:00:00.000Z`).getTime() - start.getTime();
    const derivedDay = Math.floor(ms / 86400000) + 1;
    if (simDay === undefined) {
      simDay = derivedDay;
    } else if (simDay !== derivedDay) {
      return jsonResponse({ error: "simulated_date and simulated_day_number do not match" }, 400);
    }
    if (!Number.isInteger(simDay) || simDay < 1 || simDay > 56) {
      return jsonResponse({ error: "simulated date must resolve to program day 1 through 56" }, 400);
    }

    // Upsert team-scoped override (unique on team_id where scope='team')
    const { data: existing, error: existingError } = await admin.from("qa_time_overrides")
      .select("id")
      .eq("scope", "team")
      .eq("team_id", team_id)
      .maybeSingle();
    if (existingError) throw new Error(`qa_time_override_lookup_failed:${existingError.message}`);
    if (existing) {
      const { error } = await admin.from("qa_time_overrides")
        .update({ simulated_date: simDate, simulated_day_number: simDay, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) throw new Error(`qa_time_override_update_failed:${error.message}`);
    } else {
      const { error } = await admin.from("qa_time_overrides")
        .insert({ scope: "team", team_id, simulated_date: simDate, simulated_day_number: simDay, created_by: adminId });
      if (error) throw new Error(`qa_time_override_insert_failed:${error.message}`);
    }

    return jsonResponse({ success: true, simulated_date: simDate, simulated_day_number: simDay });
  } catch (e: unknown) {
    console.error("qa-set-time error", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Internal error" }, 500);
  }
});
