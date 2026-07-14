import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, FlaskConical, Copy, Plus, Calendar, Archive, ArrowLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

interface QATeam {
  id: string;
  name: string;
  program_start_date: string | null;
  is_archived: boolean;
  simulated_date: string | null;
  simulated_day_number: number | null;
  member_count: number;
}

interface CreatedCohort {
  password: string;
  team: { id: string; name: string; access_code: string; coach_access_code: string; program_start_date: string };
  accounts: { role: string; email: string; user_id: string }[];
}

const AdminQA = () => {
  const navigate = useNavigate();
  const { user, role, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [teams, setTeams] = useState<QATeam[]>([]);
  const [lastCohort, setLastCohort] = useState<CreatedCohort | null>(null);
  const [customDay, setCustomDay] = useState<Record<string, string>>({});

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    // Wait until the role has been resolved before deciding.
    if (role === null) return;
    if (role !== "admin") {
      navigate("/");
      return;
    }
    loadTeams();
  }, [authLoading, navigate, role, user]);

  const loadTeams = async () => {
    setLoading(true);
    const { data: rows } = await supabase
      .from("teams")
      .select("id, name, program_start_date, is_archived")
      .eq("is_test_team", true)
      .order("name");
    const teamRows = rows ?? [];
    const ids = teamRows.map((team) => team.id);
    let overrides: Pick<Tables<"qa_time_overrides">, "team_id" | "simulated_date" | "simulated_day_number">[] = [];
    let members: Pick<Tables<"team_members">, "team_id">[] = [];
    if (ids.length > 0) {
      const [overrideResult, memberResult] = await Promise.all([
        supabase.from("qa_time_overrides").select("team_id, simulated_date, simulated_day_number").in("team_id", ids),
        supabase.from("team_members").select("team_id").in("team_id", ids),
      ]);
      overrides = overrideResult.data ?? [];
      members = memberResult.data ?? [];
    }
    const ovByTeam = new Map(overrides.map((override) => [override.team_id, override]));
    const countByTeam = new Map<string, number>();
    members.forEach((member) => countByTeam.set(member.team_id, (countByTeam.get(member.team_id) ?? 0) + 1));
    setTeams(
      teamRows.map((team) => ({
        id: team.id,
        name: team.name,
        program_start_date: team.program_start_date,
        is_archived: team.is_archived,
        simulated_date: ovByTeam.get(team.id)?.simulated_date ?? null,
        simulated_day_number: ovByTeam.get(team.id)?.simulated_day_number ?? null,
        member_count: countByTeam.get(team.id) ?? 0,
      })),
    );
    setLoading(false);
  };

  const createCohort = async () => {
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("qa-create-cohort", { body: {} });
      if (error) throw error;
      setLastCohort(data as CreatedCohort);
      toast.success("QA cohort created");
      await loadTeams();
    } catch (error: unknown) {
      toast.error(`Create failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setCreating(false);
    }
  };

  const jump = async (teamId: string, day?: number, date?: string) => {
    const body: Record<string, string | number> = { team_id: teamId };
    if (day) body.simulated_day_number = day;
    if (date) body.simulated_date = date;
    const { error } = await supabase.functions.invoke("qa-set-time", { body });
    if (error) {
      toast.error(`Jump failed: ${error.message}`);
      return;
    }
    toast.success(day ? `Jumped to day ${day}` : `Jumped to ${date}`);
    await loadTeams();
  };

  const advance = async (team: QATeam) => {
    const nextDay = (team.simulated_day_number ?? 1) + 1;
    await jump(team.id, nextDay);
  };

  const archive = async (teamId: string) => {
    if (!confirm("Archive this QA cohort? This wipes all test data and renames the team.")) return;
    const { error } = await supabase.functions.invoke("qa-set-time", { body: { team_id: teamId, action: "archive" } });
    if (error) {
      toast.error(`Archive failed: ${error.message}`);
      return;
    }
    toast.success("Cohort archived");
    await loadTeams();
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied");
  };

  if (authLoading || role === null || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <button onClick={() => navigate("/admin")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Admin
        </button>

        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FlaskConical className="w-5 h-5 text-primary" />
              <h1 className="font-heading text-3xl font-bold">QA Test Lab</h1>
              <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded bg-yellow-500/15 text-yellow-300 border border-yellow-500/40">
                Test Cohort
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Create test cohorts and simulate program time. Test data is excluded from real metrics by default.
            </p>
          </div>
          <button
            onClick={createCohort}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:shadow-glow disabled:opacity-50"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create QA Cohort
          </button>
        </div>

        {lastCohort && (
          <div className="mb-8 p-5 rounded-2xl bg-card border border-primary/40">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg font-semibold">Credentials (shown once)</h2>
              <button onClick={() => setLastCohort(null)} className="text-xs text-muted-foreground hover:text-foreground">
                Dismiss
              </button>
            </div>
            <div className="mb-4 text-sm">
              <span className="text-muted-foreground">Password (all accounts):</span>{" "}
              <code className="px-2 py-1 rounded bg-muted text-foreground">{lastCohort.password}</code>{" "}
              <button onClick={() => copy(lastCohort.password)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                <Copy className="w-3 h-3" /> copy
              </button>
            </div>
            <div className="mb-4 text-xs text-muted-foreground">
              Team: <span className="text-foreground">{lastCohort.team.name}</span> · Player code:{" "}
              <code className="px-1.5 py-0.5 rounded bg-muted text-foreground">{lastCohort.team.access_code}</code> · Coach code:{" "}
              <code className="px-1.5 py-0.5 rounded bg-muted text-foreground">{lastCohort.team.coach_access_code}</code>
            </div>
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="text-left py-2">Role</th>
                  <th className="text-left py-2">Email</th>
                  <th className="text-left py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {lastCohort.accounts.map((a) => (
                  <tr key={a.user_id} className="border-t border-border/40">
                    <td className="py-2 capitalize">{a.role}</td>
                    <td className="py-2 font-mono text-xs">{a.email}</td>
                    <td className="py-2">
                      <button onClick={() => copy(a.email)} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                        <Copy className="w-3 h-3" /> email
                      </button>
                      <span className="mx-2 text-muted-foreground">·</span>
                      <a href="/auth" target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                        Open /auth <ChevronRight className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h2 className="font-heading text-xl font-semibold mb-3">Test Teams</h2>
        {teams.length === 0 && (
          <p className="text-sm text-muted-foreground">No QA cohorts yet. Click “Create QA Cohort” to start.</p>
        )}
        <div className="space-y-4">
          {teams.map((t) => (
            <div key={t.id} className={`p-5 rounded-2xl bg-card border border-border/40 ${t.is_archived ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-heading font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Start: {t.program_start_date ?? "—"} · Members: {t.member_count}
                    {t.is_archived && <span className="ml-2 text-yellow-400">[archived]</span>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Simulated</div>
                  <div className="font-mono text-sm">
                    {t.simulated_date ?? "—"} · Day {t.simulated_day_number ?? "—"}
                  </div>
                </div>
              </div>

              {!t.is_archived && (
                <div className="flex flex-wrap gap-2">
                  {[1, 7, 28, 56].map((d) => (
                    <button
                      key={d}
                      onClick={() => jump(t.id, d)}
                      className="px-3 py-1.5 rounded-lg bg-secondary text-xs font-semibold hover:bg-secondary/80"
                    >
                      Jump to Day {d}
                    </button>
                  ))}
                  <button
                    onClick={() => advance(t)}
                    className="px-3 py-1.5 rounded-lg bg-primary/20 text-primary text-xs font-semibold hover:bg-primary/30"
                  >
                    +1 Day
                  </button>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      max={56}
                      placeholder="Day"
                      value={customDay[t.id] ?? ""}
                      onChange={(e) => setCustomDay({ ...customDay, [t.id]: e.target.value })}
                      className="w-20 px-2 py-1 rounded-lg bg-muted text-xs"
                    />
                    <button
                      onClick={() => {
                        const d = Number(customDay[t.id]);
                        if (d >= 1 && d <= 56) jump(t.id, d);
                      }}
                      className="px-2 py-1.5 rounded-lg bg-secondary text-xs font-semibold hover:bg-secondary/80"
                    >
                      Go
                    </button>
                  </div>
                  <input
                    type="date"
                    onChange={(e) => e.target.value && jump(t.id, undefined, e.target.value)}
                    className="px-2 py-1.5 rounded-lg bg-muted text-xs"
                  />
                  <button
                    onClick={() => archive(t.id)}
                    className="ml-auto px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 flex items-center gap-1"
                  >
                    <Archive className="w-3 h-3" /> Archive & Wipe
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-10 p-5 rounded-2xl bg-card border border-border/30">
          <h3 className="font-heading font-semibold mb-2 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> How time simulation works
          </h3>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Setting a simulated day updates the team-wide override. All QA athletes in that team resolve "today" as that date.</li>
            <li>Real users always see the real date — overrides apply only to profiles flagged <code>is_test_user</code>.</li>
            <li>Daily writes (check-ins, journals) stamp the simulated date so you can complete multiple program days per real day.</li>
            <li>Archive & Wipe deletes all QA data for the cohort and marks the team archived. Auth users are kept.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminQA;
