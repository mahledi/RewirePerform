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
  let admin: ReturnType<typeof createClient> | null = null;
  let createdTeamId: string | null = null;
  const createdUserIds: string[] = [];
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const adminId = claimsData.claims.sub as string;

    admin = createClient(SUPABASE_URL, SERVICE);
    const { data: roleRow, error: roleError } = await admin.from("user_roles")
      .select("role").eq("user_id", adminId).eq("role", "admin").maybeSingle();
    if (roleError) throw new Error(`admin role lookup: ${roleError.message}`);
    if (!roleRow) {
      return jsonResponse({ error: "Forbidden: admin role required" }, 403);
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
      createdUserIds.push(uid);
      // Auth creates the canonical profile. Only mark this synthetic account here;
      // rewriting product fields would correctly trip the minor authorization guard.
      const { error: profileError } = await admin.from("profiles")
        .update({ is_test_user: true })
        .eq("id", uid);
      if (profileError) throw new Error(`profile ${a.email}: ${profileError.message}`);
      const { error: roleError } = await admin.from("user_roles")
        .upsert({ user_id: uid, role: a.role }, { onConflict: "user_id,role" });
      if (roleError) throw new Error(`role ${a.email}: ${roleError.message}`);
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
    createdTeamId = team.id;

    const memberRows = [coach, ...athletes].map((c) => ({ team_id: team.id, user_id: c.user_id }));
    const { error: memberError } = await admin.from("team_members").insert(memberRows);
    if (memberError) throw new Error(`team members: ${memberError.message}`);

    const { data: programRun, error: runError } = await admin
      .from("program_runs")
      .insert({
        team_id: team.id,
        name: `${team.name} · Run 1`,
        status: "active",
        started_at: today,
        created_by: adminId,
        metadata: { source: "qa-create-cohort" },
      })
      .select("id")
      .single();
    if (runError || !programRun) throw new Error(`program run: ${runError?.message}`);

    // Program instances for athletes
    const instanceRows = athletes.map((a) => ({
      user_id: a.user_id,
      team_id: team.id,
      program_run_id: programRun.id,
      cycle_number: 1,
      status: "active",
      started_at: today,
      is_test_instance: true,
    }));
    const { error: instanceError } = await admin.from("program_instances").insert(instanceRows);
    if (instanceError) throw new Error(`program instances: ${instanceError.message}`);

    // Default QA time override = real today (day 1)
    const { error: overrideError } = await admin.from("qa_time_overrides").insert({
      scope: "team",
      team_id: team.id,
      simulated_date: today,
      simulated_day_number: 1,
      created_by: adminId,
    });
    if (overrideError) throw new Error(`QA time override: ${overrideError.message}`);

    return jsonResponse({
        success: true,
        team: { id: team.id, name: team.name, access_code: team.access_code, coach_access_code: team.coach_access_code, program_start_date: today },
        password,
        accounts: created,
      });
  } catch (e: unknown) {
    console.error("qa-create-cohort error", e);
    if (admin) {
      try {
        if (createdTeamId) {
          await admin.from("qa_time_overrides").delete().eq("team_id", createdTeamId);
          await admin.from("program_instances").delete().eq("team_id", createdTeamId);
          await admin.from("program_runs").delete().eq("team_id", createdTeamId);
          await admin.from("team_members").delete().eq("team_id", createdTeamId);
          await admin.from("teams").delete().eq("id", createdTeamId);
        }
        for (const userId of [...createdUserIds].reverse()) {
          await admin.auth.admin.deleteUser(userId);
        }
      } catch (cleanupError) {
        console.error("qa-create-cohort cleanup error", cleanupError);
      }
    }
    const message = e instanceof Error ? e.message : "Internal error";
    return jsonResponse({ error: message }, 500);
  }
});
