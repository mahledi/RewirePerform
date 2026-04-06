import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the caller is a coach
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
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

    // Verify coach owns this team
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

    // Get team members (athletes only)
    const { data: members } = await supabase
      .from("team_members")
      .select("user_id")
      .eq("team_id", team_id);

    const memberIds = (members ?? []).map((m) => m.user_id);

    if (memberIds.length === 0) {
      return new Response(JSON.stringify({
        energy: { current: 0, trend: [] },
        resilience: { current: 0, trend: [] },
        mood: { current: 0, trend: [] },
        focus: { current: 0, trend: [] },
        participation: { rate: 0, total: 0 },
        stressWarning: false,
        teamSize: 0,
        vibe: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter to athletes
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", memberIds);

    const athleteIds = (roles ?? [])
      .filter((r) => r.role === "athlete")
      .map((r) => r.user_id);

    if (athleteIds.length === 0) {
      return new Response(JSON.stringify({
        energy: { current: 0, trend: [] },
        resilience: { current: 0, trend: [] },
        mood: { current: 0, trend: [] },
        focus: { current: 0, trend: [] },
        participation: { rate: 0, total: 0 },
        stressWarning: false,
        teamSize: 0,
        vibe: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get last 28 days of check-ins
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const cutoff = fourWeeksAgo.toISOString().split("T")[0];

    const { data: checkins } = await supabase
      .from("daily_checkins")
      .select("user_id, date, energy_level, mood_before, focus_rating, reflection")
      .in("user_id", athleteIds)
      .gte("date", cutoff)
      .order("date", { ascending: true });

    const allCheckins = checkins ?? [];

    // Get assessments for resilience (aMCC scores from tasks_completed)
    const { data: recentCheckins } = await supabase
      .from("daily_checkins")
      .select("user_id, date, tasks_completed")
      .in("user_id", athleteIds)
      .gte("date", cutoff);

    // Calculate weekly aggregates (4 weeks)
    const weeks: string[] = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i * 7);
      weeks.push(d.toISOString().split("T")[0]);
    }

    const getWeekLabel = (weekIndex: number) => {
      if (weekIndex === 3) return "Diese Woche";
      if (weekIndex === 2) return "Letzte Woche";
      return `Vor ${3 - weekIndex} Wochen`;
    };

    const weekBounds = weeks.map((start, i) => {
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return { start, end: end.toISOString().split("T")[0], label: getWeekLabel(i) };
    });

    const trendData = weekBounds.map((wb) => {
      const weekCheckins = allCheckins.filter(
        (c) => c.date >= wb.start && c.date < wb.end
      );
      const energyVals = weekCheckins.filter((c) => c.energy_level != null).map((c) => c.energy_level!);
      const moodVals = weekCheckins.filter((c) => c.mood_before != null).map((c) => c.mood_before!);
      const focusVals = weekCheckins.filter((c) => c.focus_rating != null).map((c) => c.focus_rating!);

      return {
        week: wb.label,
        energy: energyVals.length > 0 ? Math.round((energyVals.reduce((a, b) => a + b, 0) / energyVals.length) * 10) / 10 : null,
        mood: moodVals.length > 0 ? Math.round((moodVals.reduce((a, b) => a + b, 0) / moodVals.length) * 10) / 10 : null,
        focus: focusVals.length > 0 ? Math.round((focusVals.reduce((a, b) => a + b, 0) / focusVals.length) * 10) / 10 : null,
        checkins: weekCheckins.length,
      };
    });

    // Current week values
    const currentWeek = trendData[trendData.length - 1];

    // Calculate aMCC resilience from tasks_completed (count flame tasks completed)
    let totalFlameCompleted = 0;
    let totalFlameTotal = 0;
    for (const c of (recentCheckins ?? [])) {
      if (c.tasks_completed && Array.isArray(c.tasks_completed)) {
        for (const task of c.tasks_completed as any[]) {
          if (task.icon === "flame") {
            totalFlameTotal++;
            if (task.completed) totalFlameCompleted++;
          }
        }
      }
    }
    const resilienceScore = totalFlameTotal > 0
      ? Math.round((totalFlameCompleted / totalFlameTotal) * 100)
      : 0;

    // Resilience trend per week
    const resilienceTrend = weekBounds.map((wb) => {
      const weekCheckins = (recentCheckins ?? []).filter(
        (c) => c.date >= wb.start && c.date < wb.end
      );
      let flameCompleted = 0;
      let flameTotal = 0;
      for (const c of weekCheckins) {
        if (c.tasks_completed && Array.isArray(c.tasks_completed)) {
          for (const task of c.tasks_completed as any[]) {
            if (task.icon === "flame") {
              flameTotal++;
              if (task.completed) flameCompleted++;
            }
          }
        }
      }
      return {
        week: wb.label,
        score: flameTotal > 0 ? Math.round((flameCompleted / flameTotal) * 100) : null,
      };
    });

    // Participation rate (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const weekCutoff = sevenDaysAgo.toISOString().split("T")[0];
    const activeThisWeek = new Set(
      allCheckins.filter((c) => c.date >= weekCutoff).map((c) => c.user_id)
    ).size;

    // Stress warning: if average mood < 4 or energy < 4 (on 0-10 scale)
    const stressWarning =
      (currentWeek.mood !== null && currentWeek.mood < 4) ||
      (currentWeek.energy !== null && currentWeek.energy < 4);

    // Collect anonymized reflections for AI vibe summary (last 7 days only)
    const recentReflections = allCheckins
      .filter((c) => c.date >= weekCutoff && c.reflection && c.reflection.trim().length > 5)
      .map((c) => c.reflection!);

    let vibe: string | null = null;

    if (recentReflections.length >= 3) {
      // Generate AI vibe summary
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (LOVABLE_API_KEY) {
        try {
          const vibePrompt = `Du analysierst anonymisierte Reflexionen eines Sportteams aus den letzten 7 Tagen.
Gib eine kurze, faktenbasierte Zusammenfassung (3-5 Sätze) des dominanten Team-Gefühls.

REGELN:
- NUR Fakten, KEINE Handlungsempfehlungen
- Beschreibe die Stimmung, nicht was der Trainer tun soll
- Nenne dominante Themen (z.B. Angst vor Fehlern, Euphorie, Frust, Zusammenhalt, Müdigkeit)
- Formuliere in der dritten Person ("Das Team...", "Die Mannschaft...")
- Maximal 5 Sätze
- Deutsch

Hier sind ${recentReflections.length} anonymisierte Reflexionen:
${recentReflections.map((r, i) => `${i + 1}. "${r}"`).join("\n")}`;

          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: "Du bist ein Sportpsychologie-Analyst. Gib nur Fakten, keine Ratschläge." },
                { role: "user", content: vibePrompt },
              ],
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            vibe = aiData.choices?.[0]?.message?.content || null;
          }
        } catch (e) {
          console.error("AI vibe generation failed:", e);
        }
      }
    }

    // Get questionnaire analysis data for team chemistry / deeper insights
    const { data: questionnaireData } = await supabase
      .from("questionnaire_responses")
      .select("analysis, user_id")
      .in("user_id", athleteIds)
      .not("analysis", "is", null);

    // Extract aggregated inner excellence scores
    let ieScores = { growthMindset: 0, presence: 0, egoFreedom: 0, emotionalControl: 0, count: 0 };
    for (const q of (questionnaireData ?? [])) {
      const analysis = q.analysis as any;
      if (analysis?.inner_excellence_profile) {
        const ie = analysis.inner_excellence_profile;
        if (ie.growth_mindset_score != null) {
          ieScores.growthMindset += ie.growth_mindset_score;
          ieScores.count++;
        }
        if (ie.ego_freedom_score != null) ieScores.egoFreedom += ie.ego_freedom_score;
        if (ie.emotional_control_score != null) ieScores.emotionalControl += ie.emotional_control_score;
        // presence_level is text, convert
        const presenceMap: Record<string, number> = { "niedrig": 25, "mittel": 50, "hoch": 75, "sehr hoch": 100 };
        if (ie.presence_level) ieScores.presence += (presenceMap[ie.presence_level.toLowerCase()] ?? 50);
      }
    }

    const teamChemistry = ieScores.count > 0 ? {
      growthMindset: Math.round(ieScores.growthMindset / ieScores.count),
      presence: Math.round(ieScores.presence / ieScores.count),
      egoFreedom: Math.round(ieScores.egoFreedom / ieScores.count),
      emotionalControl: Math.round(ieScores.emotionalControl / ieScores.count),
    } : null;

    const result = {
      energy: {
        current: currentWeek.energy ?? 0,
        trend: trendData.map((t) => ({ week: t.week, value: t.energy })),
      },
      mood: {
        current: currentWeek.mood ?? 0,
        trend: trendData.map((t) => ({ week: t.week, value: t.mood })),
      },
      focus: {
        current: currentWeek.focus ?? 0,
        trend: trendData.map((t) => ({ week: t.week, value: t.focus })),
      },
      resilience: {
        current: resilienceScore,
        trend: resilienceTrend,
      },
      participation: {
        rate: athleteIds.length > 0 ? Math.round((activeThisWeek / athleteIds.length) * 100) : 0,
        total: activeThisWeek,
      },
      stressWarning,
      teamSize: athleteIds.length,
      teamChemistry,
      vibe,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("team-mental-state error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
