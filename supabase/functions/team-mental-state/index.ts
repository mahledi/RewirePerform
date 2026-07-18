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
import {
  adminClient,
  assertAllowedOrigin,
  authenticatedUser,
  corsHeaders,
  MinorFlowError,
  parseJson,
  publicError,
} from "../_shared/minorGuardian.ts";

const MIN_N = 5;
const DATA_CONTRIBUTION_VERSION = "data_contribution_v2_2026_07";
type WBKey = "mood" | "energy" | "focus" | "stress" | "recovery" | "sleep_quality" | "physical_readiness" | "motivation" | "pressure" | "team_connection";
type WellbeingAggregate = Record<WBKey, number | null> & {
  n_users: number;
  sufficient_data: boolean;
};
type Participation = { rate: number; total: number };

const WB_KEYS: WBKey[] = ["mood", "energy", "focus", "stress", "recovery", "sleep_quality", "physical_readiness", "motivation", "pressure", "team_connection"];

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

function emptyPayload(
  teamSize: number,
  reason: string,
  participation: Participation = { rate: 0, total: 0 },
) {
  return {
    insufficient_data: true,
    insufficient_reason: reason,
    min_n: MIN_N,
    teamSize,
    energy: { current: null, trend: [] },
    mood: { current: null, trend: [] },
    focus: { current: null, trend: [] },
    resilience: { current: null, trend: [] },
    participation,
    stressWarning: false,
    teamChemistry: null,
    vibe: null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  try {
    assertAllowedOrigin(req);
    const user = await authenticatedUser(req);
    const supabase = adminClient();

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "coach")
      .maybeSingle();
    if (roleData?.role !== "coach") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const body = await parseJson(req);
    const team_id = body.team_id;
    if (typeof team_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(team_id)) {
      throw new MinorFlowError("invalid_team_id", 400);
    }

    // Verify team access. Primary coaches own the team; co-coaches are members
    // with a coach role and should see the same aggregated, privacy-safe view.
    const { data: team } = await supabase
      .from("teams")
      .select("id, created_by")
      .eq("id", team_id)
      .maybeSingle();
    if (!team) {
      return new Response(JSON.stringify({ error: "Team not found" }), {
        status: 404,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    if (team.created_by !== user.id) {
      const { data: membership } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("team_id", team_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!membership) {
        return new Response(JSON.stringify({ error: "Team not found" }), {
          status: 404,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }
    }

    const { data: activeRun, error: runError } = await supabase
      .from("program_runs")
      .select("id")
      .eq("team_id", team_id)
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (runError) throw runError;
    if (!activeRun) {
      return new Response(JSON.stringify(emptyPayload(0, "no_active_program_run")), {
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
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
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", memberIds);
    const athleteIds = (roles ?? [])
      .filter((r) => r.role === "athlete")
      .map((r) => r.user_id);
    const rosterSize = athleteIds.length;

    if (rosterSize < MIN_N) {
      return new Response(
        JSON.stringify(emptyPayload(rosterSize, "below_min_n")),
        { headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const { data: runInstances, error: instanceError } = await supabase
      .from("program_instances")
      .select("id, user_id")
      .eq("program_run_id", activeRun.id)
      .eq("status", "active")
      .in("user_id", athleteIds);
    if (instanceError) throw instanceError;
    const initiallyAssignedIds = Array.from(new Set((runInstances ?? []).map((instance) => instance.user_id)));
    const allRunInstanceIds = (runInstances ?? []).map((instance) => instance.id);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const operationalCutoff = sevenDaysAgo.toISOString().split("T")[0];
    let operationalParticipation: Participation = { rate: 0, total: 0 };

    if (initiallyAssignedIds.length > 0 && allRunInstanceIds.length > 0) {
      const { data: operationalCheckins, error: operationalError } = await supabase
        .from("daily_checkins")
        .select("user_id, date")
        .in("program_instance_id", allRunInstanceIds)
        .in("user_id", initiallyAssignedIds)
        .gte("date", operationalCutoff)
        .limit(5000);
      if (operationalError) throw operationalError;

      const activeAthletes = new Set((operationalCheckins ?? []).map((checkin) => checkin.user_id)).size;
      operationalParticipation = {
        rate: Math.round((activeAthletes / initiallyAssignedIds.length) * 100),
        total: activeAthletes,
      };
    }

    if (initiallyAssignedIds.length < MIN_N) {
      return new Response(JSON.stringify(emptyPayload(initiallyAssignedIds.length, "run_below_min_n", operationalParticipation)), {
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Optional aggregate signals are limited to athletes with the current,
    // explicit data-contribution choice and a current age-appropriate approval.
    const { data: consentProfiles, error: consentError } = await supabase
      .from("profiles")
      .select("id")
      .in("id", initiallyAssignedIds)
      .eq("data_contribution_consent", true)
      .eq("data_contribution_consent_version", DATA_CONTRIBUTION_VERSION);
    if (consentError) throw consentError;

    const consentCandidateIds = (consentProfiles ?? []).map((profile) => profile.id);
    if (consentCandidateIds.length < MIN_N) {
      return new Response(JSON.stringify(emptyPayload(initiallyAssignedIds.length, "insufficient_authorized_data", operationalParticipation)), {
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const { data: authorizationFilter, error: authorizationError } = await supabase.rpc(
      "minor_service_action",
      {
        _action: "filter_data_contribution",
        _user_id: null,
        _payload: { user_ids: consentCandidateIds },
      },
    );
    if (authorizationError) throw authorizationError;
    const authorizedIds = new Set(
      Array.isArray((authorizationFilter as { user_ids?: unknown } | null)?.user_ids)
        ? ((authorizationFilter as { user_ids: unknown[] }).user_ids.filter((value): value is string => typeof value === "string"))
        : [],
    );
    const eligibleInstances = (runInstances ?? []).filter((instance) => authorizedIds.has(instance.user_id));
    const assignedAthleteIds = Array.from(new Set(eligibleInstances.map((instance) => instance.user_id)));
    const instanceIds = eligibleInstances.map((instance) => instance.id);

    if (assignedAthleteIds.length < MIN_N || instanceIds.length < MIN_N) {
      return new Response(JSON.stringify(emptyPayload(initiallyAssignedIds.length, "insufficient_authorized_data", operationalParticipation)), {
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Last 28 days of check-ins — numeric fields ONLY. Raw `reflection` is
    // intentionally NOT selected. It must never leave the DB via this function.
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const cutoff = fourWeeksAgo.toISOString().split("T")[0];

    const { data: checkins, error: checkinsError } = await supabase
      .from("daily_checkins")
      .select("user_id, date, energy_level, mood_before, focus_rating, tasks_completed, wellbeing_metrics")
      .in("program_instance_id", instanceIds)
      .in("user_id", assignedAthleteIds)
      .order("date", { ascending: true })
      .limit(5000);

    if (checkinsError) throw checkinsError;

    const allCheckins = (checkins ?? []).filter((c) => {
      if (!c.date) return false;
      return String(c.date) >= cutoff;
    });

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
      .in("program_instance_id", instanceIds)
      .in("user_id", assignedAthleteIds)
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
        const ie = asRecord(asRecord(q.analysis)?.inner_excellence_profile);
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

    // Deterministic team summary — no AI, no Lovable AI Gateway, no LOVABLE_API_KEY.
    // Built only from aggregated numeric metrics. Privacy-safe (n >= MIN_N enforced upstream).
    let vibe: string | null = null;
    if (currentWeek.sufficient_data) {
      const parts: string[] = [];
      const energy = currentWeek.energy;
      const mood = currentWeek.mood;
      const focus = currentWeek.focus;

      // Overall energy/mood/focus picture
      if (typeof energy === "number" && typeof mood === "number") {
        const avg = (energy + mood) / 2;
        if (avg >= 7) parts.push("Die Teamdaten zeigen aktuell stabile Energie und gute Stimmung.");
        else if (avg >= 5) parts.push("Die Teamdaten zeigen aktuell mittlere Energie und durchschnittliche Stimmung.");
        else parts.push("Die Teamdaten zeigen aktuell niedrigere Energie und gedrücktere Stimmung.");
      }
      if (typeof focus === "number") {
        if (focus >= 7) parts.push("Fokus wirkt hoch.");
        else if (focus <= 4) parts.push("Fokus wirkt aktuell niedrig.");
        else parts.push("Fokus wirkt mittel.");
      }
      if (stressWarning) {
        parts.push("Stresslevel wirkt erhöht im Vergleich zu Energie/Stimmung.");
      }
      if (typeof currentWeek.resilience === "number") {
        if (currentWeek.resilience >= 70) parts.push("Umsetzungsrate wirkt stabil.");
        else if (currentWeek.resilience <= 40) parts.push("Umsetzungsrate wirkt reduziert.");
      }
      parts.push("Hinweis: aggregierte Teamdaten, keine Einzelbewertung.");
      vibe = parts.join(" ");
    }

    // ─── Wellbeing / Team Pulse aggregates ───────────────────
    // Pull the wellbeing_metrics jsonb (numeric only). Never fetch reflection.
    const aggregateWB = (rows: typeof allCheckins): WellbeingAggregate => {
      const distinctUsers = new Set(rows.map((r) => r.user_id)).size;
      const sufficient = distinctUsers >= MIN_N;
      const out: Record<string, number | null> = {};
      for (const k of WB_KEYS) {
        if (!sufficient) { out[k] = null; continue; }
        const vals: number[] = [];
        for (const r of rows) {
          const wm = asRecord(r.wellbeing_metrics);
          const v = wm && typeof wm[k] === "number" ? (wm[k] as number) : null;
          // Fallbacks for backward compatibility
          const fallback =
            v === null && k === "mood" ? r.mood_before :
            v === null && k === "energy" ? r.energy_level :
            v === null && k === "focus" ? r.focus_rating :
            null;
          const final = v !== null ? v : (typeof fallback === "number" ? fallback : null);
          if (typeof final === "number") vals.push(final);
        }
        out[k] = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
      }
      return { n_users: distinctUsers, sufficient_data: sufficient, ...out } as WellbeingAggregate;
    };

    const computeReadiness = (agg: WellbeingAggregate): number | null => {
      const positives: number[] = [];
      for (const k of ["energy", "focus", "recovery", "sleep_quality", "physical_readiness", "motivation", "team_connection"] as const) {
        const v = agg[k]; if (typeof v === "number") positives.push(v);
      }
      if (positives.length < 3) return null;
      const posAvg = positives.reduce((a, b) => a + b, 0) / positives.length; // 1..10
      const stress = typeof agg.stress === "number" ? agg.stress : 5;
      const pressure = typeof agg.pressure === "number" ? agg.pressure : 5;
      const penalty = ((stress + pressure) / 2 - 5) * 0.5; // 0..2.5
      const raw = posAvg - penalty; // ~1..10
      return Math.max(0, Math.min(100, Math.round(((raw - 1) / 9) * 100)));
    };

    const buildHints = (agg: WellbeingAggregate): string[] => {
      if (!agg.sufficient_data) return ["Noch nicht genug anonymisierte Daten für Team-Tendenzen."];
      const hints: string[] = [];
      if (typeof agg.stress === "number" && typeof agg.recovery === "number" && agg.stress >= 7 && agg.recovery <= 4) {
        hints.push("Hohe Spannung bei niedriger Erholung ist sichtbar. Falls es zum Trainingsplan passt, könnte eine klarere Struktur mit weniger Zusatzdruck gut anschließen.");
      }
      if (typeof agg.energy === "number" && agg.energy <= 4) {
        hints.push("Team-Energie wirkt niedrig. Eine reduzierte, präzise Ansprache und saubere Belastungssteuerung könnten heute besser passen als zusätzliche Komplexität.");
      }
      if (typeof agg.focus === "number" && agg.focus <= 4) {
        hints.push("Fokus wirkt niedrig. Ein einzelner Tages-Cue und weniger parallele Informationen könnten die heutige Linse leichter greifbar machen.");
      }
      if (typeof agg.pressure === "number" && agg.pressure >= 7) {
        hints.push("Bewertungsdruck wirkt hoch. Prozesssprache statt Ergebnisdruck könnte heute mehr Anschlussfähigkeit erzeugen.");
      }
      if (typeof agg.team_connection === "number" && agg.team_connection <= 4) {
        hints.push("Teamverbundenheit wirkt niedrig. Ein kurzer gemeinsamer Standard oder eine kleine Paar-/Gruppenform könnte passen, ohne daraus ein großes Thema zu machen.");
      }
      if (hints.length === 0) hints.push("Aggregierte Werte wirken stabil. Die heutige Linse kann ruhig mitlaufen, ohne besondere Anpassung zu verlangen.");
      return hints;
    };

    const todayStr = new Date().toISOString().split("T")[0];
    const todayRows = allCheckins.filter((c) => c.date === todayStr);
    const todayAgg = aggregateWB(todayRows);
    const todayReadiness = computeReadiness(todayAgg);
    const coachHints = buildHints(todayAgg);

    // Daily trend (last 14 days)
    const dailyTrend: Array<WellbeingAggregate & { date: string; readiness_index: number | null }> = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().split("T")[0];
      const rows = allCheckins.filter((c) => c.date === ds);
      const agg = aggregateWB(rows);
      dailyTrend.push({ date: ds, ...agg, readiness_index: computeReadiness(agg) });
    }
    // Weekly trend (4 weeks)
    const weeklyWB = weeks.map((wb) => {
      const rows = allCheckins.filter((c) => c.date >= wb.start && c.date < wb.end);
      const agg = aggregateWB(rows);
      return { week: wb.label, start: wb.start, ...agg, readiness_index: computeReadiness(agg) };
    });

    const result = {
      insufficient_data: false,
      min_n: MIN_N,
      teamSize: initiallyAssignedIds.length,
      program_run_id: activeRun.id,
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
      participation: operationalParticipation,
      stressWarning,
      teamChemistry,
      vibe,
      // ─── Team Pulse / Wellbeing ───────────────────────────
      wellbeing: {
        today: { date: todayStr, ...todayAgg, readiness_index: todayReadiness },
        daily_trends: dailyTrend,
        weekly_trends: weeklyWB,
      },
      readiness_index: todayReadiness,
      coach_hints: coachHints,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("team-mental-state failed");
    return publicError(req, e);
  }
});
