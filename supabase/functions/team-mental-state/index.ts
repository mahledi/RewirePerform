/**
 * team-mental-state — privacy-hardened V1
 *
 * Hard rules (do NOT relax):
 *  - Strict n >= 5 anonymity threshold for any psychological signal
 *    (mood/energy/focus/resilience/team chemistry/vibe).
 *  - Raw reflection / journal / questionnaire free-text NEVER leaves the DB.
 *  - The AI vibe summary, if generated, may only consume aggregated numeric
 *    metrics (rounded means + counts). No per-player text is ever included
 *    in the prompt.
 *  - When n < 5, return empty psychological signals + insufficient_data flag.
 *    The UI shows "Zu wenig Daten für anonymisierte Auswertung."
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MIN_N = 5;

function emptyPayload(teamSize: number, reason: string) {
  return {
    insufficient_data: true,
    insufficient_reason: reason,
    min_n: MIN_N,
    teamSize,
    energy: { current: null, trend: [] },
    mood: { current: null, trend: [] },
    focus: { current: null, trend: [] },
    resilience: { current: null, trend: [] },
    participation: { rate: 0, total: 0 },
    stressWarning: false,
    teamChemistry: null,
    vibe: null,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify caller
    const anonClient = createClient(supabaseUrl, anonKey);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (roleData?.role !== "coach") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { team_id } = await req.json();
    if (!team_id) {
      return new Response(JSON.stringify({ error: "team_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify ownership
    const { data: team } = await supabase
      .from("teams")
      .select("id")
      .eq("id", team_id)
      .eq("created_by", user.id)
      .maybeSingle();
    if (!team) {
      return new Response(JSON.stringify({ error: "Team not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Athletes in this team
    const { data: members } = await supabase
      .from("team_members")
      .select("user_id")
      .eq("team_id", team_id);
    const memberIds = (members ?? []).map((m) => m.user_id);

    if (memberIds.length === 0) {
      return new Response(JSON.stringify(emptyPayload(0, "no_members")), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", memberIds);
    const athleteIds = (roles ?? [])
      .filter((r) => r.role === "athlete")
      .map((r) => r.user_id);
    const teamSize = athleteIds.length;

    if (teamSize < MIN_N) {
      return new Response(
        JSON.stringify(emptyPayload(teamSize, "below_min_n")),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Last 28 days of check-ins — numeric fields ONLY. Raw `reflection` is
    // intentionally NOT selected. It must never leave the DB via this function.
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const cutoff = fourWeeksAgo.toISOString().split("T")[0];

    const { data: checkins } = await supabase
      .from("daily_checkins")
      .select("user_id, date, energy_level, mood_before, focus_rating, tasks_completed")
      .in("user_id", athleteIds)
      .gte("date", cutoff)
      .order("date", { ascending: true });

    const allCheckins = checkins ?? [];

    // Build 4 weekly buckets
    const weeks: { start: string; end: string; label: string }[] = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i * 7);
      const start = d.toISOString().split("T")[0];
      const end = new Date(d);
      end.setDate(end.getDate() + 7);
      const label =
        i === 0 ? "Diese Woche" : i === 1 ? "Letzte Woche" : `Vor ${i} Wochen`;
      weeks.push({ start, end: end.toISOString().split("T")[0], label });
    }

    // Per-week aggregation. Anonymity threshold: hide values when distinct
    // contributing athletes < MIN_N.
    const trendData = weeks.map((wb) => {
      const wc = allCheckins.filter((c) => c.date >= wb.start && c.date < wb.end);
      const distinctUsers = new Set(wc.map((c) => c.user_id)).size;
      const safe = distinctUsers >= MIN_N;
      const avg = (vals: (number | null | undefined)[]) => {
        const nums = vals.filter((v): v is number => typeof v === "number");
        if (nums.length === 0) return null;
        return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
      };
      return {
        week: wb.label,
        n_users: distinctUsers,
        sufficient_data: safe,
        energy: safe ? avg(wc.map((c) => c.energy_level)) : null,
        mood: safe ? avg(wc.map((c) => c.mood_before)) : null,
        focus: safe ? avg(wc.map((c) => c.focus_rating)) : null,
        // Resilience proxy = % of check-ins with at least 1 task completed
        resilience: safe
          ? (() => {
              if (wc.length === 0) return null;
              const done = wc.filter(
                (c) => Array.isArray(c.tasks_completed) && c.tasks_completed.length > 0
              ).length;
              return Math.round((done / wc.length) * 100);
            })()
          : null,
      };
    });

    const currentWeek = trendData[trendData.length - 1];

    // Participation (last 7 days) — operational, not psychological. Safe.
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const weekCutoff = sevenDaysAgo.toISOString().split("T")[0];
    const activeThisWeek = new Set(
      allCheckins.filter((c) => c.date >= weekCutoff).map((c) => c.user_id)
    ).size;

    // Stress warning — only if current week has sufficient data.
    const stressWarning =
      currentWeek.sufficient_data &&
      ((currentWeek.mood !== null && currentWeek.mood < 4) ||
        (currentWeek.energy !== null && currentWeek.energy < 4));

    // Team chemistry from questionnaire analyses — only safe if >= MIN_N
    // distinct athletes have a non-null analysis.
    const { data: questionnaireData } = await supabase
      .from("questionnaire_responses")
      .select("user_id, analysis")
      .in("user_id", athleteIds)
      .not("analysis", "is", null);

    let teamChemistry: {
      growthMindset: number;
      presence: number;
      egoFreedom: number;
      emotionalControl: number;
    } | null = null;

    const distinctQUsers = new Set((questionnaireData ?? []).map((q) => q.user_id)).size;
    if (distinctQUsers >= MIN_N) {
      let gm = 0, pr = 0, ego = 0, ec = 0, c = 0;
      const presenceMap: Record<string, number> = {
        niedrig: 25, mittel: 50, hoch: 75, "sehr hoch": 100,
      };
      for (const q of questionnaireData ?? []) {
        const ie = (q.analysis as any)?.inner_excellence_profile;
        if (!ie) continue;
        if (typeof ie.growth_mindset_score === "number") { gm += ie.growth_mindset_score; c++; }
        if (typeof ie.ego_freedom_score === "number") ego += ie.ego_freedom_score;
        if (typeof ie.emotional_control_score === "number") ec += ie.emotional_control_score;
        if (typeof ie.presence_level === "string") {
          pr += presenceMap[ie.presence_level.toLowerCase()] ?? 50;
        }
      }
      if (c >= MIN_N) {
        teamChemistry = {
          growthMindset: Math.round(gm / c),
          presence: Math.round(pr / c),
          egoFreedom: Math.round(ego / c),
          emotionalControl: Math.round(ec / c),
        };
      }
    }

    // AI vibe — derived ONLY from aggregated numeric metrics. No raw text in.
    let vibe: string | null = null;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (LOVABLE_API_KEY && currentWeek.sufficient_data) {
      try {
        const numericSummary = {
          team_size: teamSize,
          contributing_athletes_this_week: currentWeek.n_users,
          this_week: {
            mood: currentWeek.mood,
            energy: currentWeek.energy,
            focus: currentWeek.focus,
            resilience_pct: currentWeek.resilience,
          },
          previous_weeks: trendData.slice(0, -1).map((w) => ({
            label: w.week,
            n_users: w.n_users,
            mood: w.mood,
            energy: w.energy,
            focus: w.focus,
          })),
          stress_warning: stressWarning,
        };

        const vibePrompt = `Du fasst den aggregierten Team-Zustand kurz zusammen.
NUR aggregierte numerische Metriken (Skala 0-10 für Stimmung/Energie/Fokus, 0-100% für Resilienz).
Keine Reflexionen, keine Einzelaussagen, keine Tipps.

REGELN:
- 2-4 nüchterne Sätze
- Beschreibe nur das aggregierte Bild ("Das Team ...", "Die Werte ...")
- Erwähne Trend (steigend/fallend/stabil) wenn klar
- Keine Handlungsempfehlung
- Deutsch
- Keine Kausalaussagen ("weil", "wegen")

Aggregierte Daten:
${JSON.stringify(numericSummary, null, 2)}`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content:
                  "Du bist ein neutraler Statistik-Erzähler. Beschreibe nur aggregierte Zahlen. Keine Einzelaussagen, keine Empfehlungen, keine Kausalaussagen.",
              },
              { role: "user", content: vibePrompt },
            ],
          }),
        });
        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          vibe = aiData.choices?.[0]?.message?.content || null;
        }
      } catch (e) {
        console.error("AI vibe (aggregate-only) failed:", e);
      }
    }

    const result = {
      insufficient_data: false,
      min_n: MIN_N,
      teamSize,
      energy: {
        current: currentWeek.sufficient_data ? currentWeek.energy : null,
        trend: trendData.map((t) => ({
          week: t.week,
          value: t.sufficient_data ? t.energy : null,
          n_users: t.n_users,
          sufficient_data: t.sufficient_data,
        })),
      },
      mood: {
        current: currentWeek.sufficient_data ? currentWeek.mood : null,
        trend: trendData.map((t) => ({
          week: t.week,
          value: t.sufficient_data ? t.mood : null,
          n_users: t.n_users,
          sufficient_data: t.sufficient_data,
        })),
      },
      focus: {
        current: currentWeek.sufficient_data ? currentWeek.focus : null,
        trend: trendData.map((t) => ({
          week: t.week,
          value: t.sufficient_data ? t.focus : null,
          n_users: t.n_users,
          sufficient_data: t.sufficient_data,
        })),
      },
      resilience: {
        current: currentWeek.sufficient_data ? currentWeek.resilience : null,
        trend: trendData.map((t) => ({
          week: t.week,
          score: t.sufficient_data ? t.resilience : null,
          n_users: t.n_users,
          sufficient_data: t.sufficient_data,
        })),
      },
      participation: {
        rate: teamSize > 0 ? Math.round((activeThisWeek / teamSize) * 100) : 0,
        total: activeThisWeek,
      },
      stressWarning,
      teamChemistry,
      vibe,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("team-mental-state error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
