import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function rand(n = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  const arr = new Uint8Array(n);
  crypto.getRandomValues(arr);
  for (let i = 0; i < n; i++) s += chars[arr[i] % chars.length];
  return s;
}

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
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const adminId = claimsData.claims.sub as string;

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", adminId).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const suffix = rand(4).toLowerCase();
    const password = `RewireQA-${rand(12)}`;
    const accounts = [
      { role: "coach", email: `qa-coach-${suffix}@rewireperform.test`, full_name: `QA Coach ${suffix}` },
      ...Array.from({ length: 5 }, (_, i) => ({ role: "athlete", email: `qa-athlete${i + 1}-${suffix}@rewireperform.test`, full_name: `QA Athlete ${i + 1} ${suffix}` })),
    ];

    const created: Array<{ role: string; email: string; user_id: string }> = [];
    for (const a of accounts) {
      const { data: u, error: uErr } = await admin.auth.admin.createUser({
        email: a.email,
        password,
        email_confirm: true,
        user_metadata: { full_name: a.full_name, role: a.role },
      });
      if (uErr || !u.user) throw new Error(`createUser ${a.email}: ${uErr?.message}`);
      const uid = u.user.id;
      // profiles + role may be set by triggers; upsert to ensure
      await admin.from("profiles").upsert({ id: uid, full_name: a.full_name, sport: "Football", is_test_user: true }, { onConflict: "id" });
      await admin.from("user_roles").upsert({ user_id: uid, role: a.role as any }, { onConflict: "user_id,role" });
      created.push({ role: a.role, email: a.email, user_id: uid });
    }

    const coach = created.find((c) => c.role === "coach")!;
    const athletes = created.filter((c) => c.role === "athlete");

    const today = new Date().toISOString().slice(0, 10);
    const { data: team, error: teamErr } = await admin
      .from("teams")
      .insert({
        name: `QA Test Team ${suffix.toUpperCase()}`,
        sport: "Football",
        created_by: coach.user_id,
        is_test_team: true,
        program_start_date: today,
      })
      .select()
      .single();
    if (teamErr || !team) throw new Error(`team: ${teamErr?.message}`);

    const memberRows = [coach, ...athletes].map((c) => ({ team_id: team.id, user_id: c.user_id }));
    await admin.from("team_members").insert(memberRows);

    // Program instances for athletes
    const instanceRows = athletes.map((a) => ({
      user_id: a.user_id,
      team_id: team.id,
      cycle_number: 1,
      status: "active",
      started_at: today,
      is_test_instance: true,
    }));
    await admin.from("program_instances").insert(instanceRows);

    // Default QA time override = real today (day 1)
    await admin.from("qa_time_overrides").insert({
      scope: "team",
      team_id: team.id,
      simulated_date: today,
      simulated_day_number: 1,
      created_by: adminId,
    });

    return new Response(
      JSON.stringify({
        success: true,
        team: { id: team.id, name: team.name, access_code: team.access_code, coach_access_code: team.coach_access_code, program_start_date: today },
        password,
        accounts: created,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("qa-create-cohort error", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
