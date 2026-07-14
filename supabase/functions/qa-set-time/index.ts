import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData } = await userClient.auth.getClaims(token);
    if (!claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const adminId = claimsData.claims.sub as string;
    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", adminId).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { action, team_id, simulated_date, simulated_day_number } = body ?? {};
    if (!team_id) {
      return new Response(JSON.stringify({ error: "team_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "archive") {
      const { data, error } = await admin.rpc("archive_qa_cohort", { _team_id: team_id });
      if (error) throw new Error(error.message);
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // verify it's a test team
    const { data: team } = await admin.from("teams").select("id, is_test_team, program_start_date").eq("id", team_id).maybeSingle();
    if (!team || !team.is_test_team) {
      return new Response(JSON.stringify({ error: "Not a test team" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Compute simulated_date from day number if provided
    let simDate = simulated_date as string | undefined;
    let simDay = simulated_day_number as number | undefined;
    const start = team.program_start_date ? new Date(team.program_start_date) : new Date();
    if (simDay && !simDate) {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + (simDay - 1));
      simDate = d.toISOString().slice(0, 10);
    }
    if (!simDate) {
      return new Response(JSON.stringify({ error: "simulated_date or simulated_day_number required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!simDay && team.program_start_date) {
      const ms = new Date(simDate).getTime() - start.getTime();
      simDay = Math.floor(ms / 86400000) + 1;
    }

    // Upsert team-scoped override (unique on team_id where scope='team')
    const { data: existing } = await admin.from("qa_time_overrides").select("id").eq("scope", "team").eq("team_id", team_id).maybeSingle();
    if (existing) {
      await admin.from("qa_time_overrides").update({ simulated_date: simDate, simulated_day_number: simDay, updated_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      await admin.from("qa_time_overrides").insert({ scope: "team", team_id, simulated_date: simDate, simulated_day_number: simDay, created_by: adminId });
    }

    return new Response(JSON.stringify({ success: true, simulated_date: simDate, simulated_day_number: simDay }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: unknown) {
    console.error("qa-set-time error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
