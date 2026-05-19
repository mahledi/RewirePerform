import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Brain, LogOut, Users, Settings, Activity, BarChart3, Sparkles } from "lucide-react";
import TeamOverview from "@/components/coach/TeamOverview";
import TeamManagement from "@/components/coach/TeamManagement";
import TeamMentalState from "@/components/coach/TeamMentalState";
import TeamEvidence from "@/components/coach/TeamEvidence";
import CoachToolkit from "@/components/coach/CoachToolkit";

type Tab = "overview" | "mental" | "evidence" | "toolkit" | "manage";

interface Team {
  id: string;
  name: string;
  sport: string | null;
  access_code: string;
  coach_access_code: string;
  program_start_date: string | null;
  program_activated_at: string | null;
}

const Coach = () => {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTeams = async () => {
    if (!user) return;
    // Coaches see teams they CREATED + teams where they are a member (co-coach)
    const { data: memberships } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", user.id);
    const memberTeamIds = (memberships ?? []).map((m) => m.team_id);

    let query = supabase
      .from("teams")
      .select("id, name, sport, access_code, coach_access_code, program_start_date, program_activated_at");

    if (memberTeamIds.length > 0) {
      query = query.or(`created_by.eq.${user.id},id.in.(${memberTeamIds.join(",")})`);
    } else {
      query = query.eq("created_by", user.id);
    }

    const { data } = await query;
    const teamList = (data ?? []) as Team[];
    setTeams(teamList);
    if (teamList.length > 0 && !selectedTeam) {
      setSelectedTeam(teamList[0].id);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTeams();
  }, [user]);

  useEffect(() => {
    if (!loading && role && role !== "coach") {
      navigate(role === "admin" ? "/admin" : "/dashboard");
    }
  }, [role, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-border/60 bg-background/86 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-card premium-hairline">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="font-heading text-base font-semibold leading-none">Coach</span>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Team Performance Console</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
            title="Abmelden"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mx-auto max-w-5xl px-5 pt-5 md:px-6">
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-border/70 bg-muted/50 p-1 shadow-card">
          <button
            onClick={() => setTab("overview")}
            className={`premium-press flex-1 min-w-fit flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-medium transition-all ${
              tab === "overview" ? "bg-card text-foreground shadow-[inset_0_1px_0_hsl(0_0%_100%/0.05)]" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Übersicht
          </button>
          <button
            onClick={() => setTab("mental")}
            className={`premium-press flex-1 min-w-fit flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-medium transition-all ${
              tab === "mental" ? "bg-card text-foreground shadow-[inset_0_1px_0_hsl(0_0%_100%/0.05)]" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Mental
          </button>
          <button
            onClick={() => setTab("evidence")}
            className={`premium-press flex-1 min-w-fit flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-medium transition-all ${
              tab === "evidence" ? "bg-card text-foreground shadow-[inset_0_1px_0_hsl(0_0%_100%/0.05)]" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Wirksamkeit
          </button>
          <button
            onClick={() => setTab("toolkit")}
            className={`premium-press flex-1 min-w-fit flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-medium transition-all ${
              tab === "toolkit" ? "bg-card text-foreground shadow-[inset_0_1px_0_hsl(0_0%_100%/0.05)]" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Toolkit
          </button>
          <button
            onClick={() => setTab("manage")}
            className={`premium-press flex-1 min-w-fit flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-medium transition-all ${
              tab === "manage" ? "bg-card text-foreground shadow-[inset_0_1px_0_hsl(0_0%_100%/0.05)]" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            Teams
          </button>
        </div>
      </div>

      {/* Team selector if multiple teams */}
      {teams.length > 1 && (tab === "overview" || tab === "mental" || tab === "evidence" || tab === "toolkit") && (
        <div className="mx-auto max-w-5xl px-5 pt-4 md:px-6">
          <select
            value={selectedTeam ?? ""}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-card border border-border/70 text-foreground text-sm shadow-card focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Content */}
      <div className="mx-auto max-w-5xl px-5 py-6 md:px-6 md:pb-12">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tab === "overview" ? (
          selectedTeam ? (
            <TeamOverview teamId={selectedTeam} />
          ) : (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Erstelle zuerst ein Team unter "Teams".</p>
            </div>
          )
        ) : tab === "mental" ? (
          selectedTeam ? (
            <TeamMentalState teamId={selectedTeam} />
          ) : (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Erstelle zuerst ein Team unter "Teams".</p>
            </div>
          )
        ) : tab === "evidence" ? (
          selectedTeam ? (
            <TeamEvidence teamId={selectedTeam} />
          ) : (
            <div className="text-center py-12">
              <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Erstelle zuerst ein Team unter "Teams".</p>
            </div>
          )
        ) : tab === "toolkit" ? (
          selectedTeam ? (
            <CoachToolkit teamId={selectedTeam} />
          ) : (
            <div className="text-center py-12">
              <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Erstelle zuerst ein Team unter "Teams".</p>
            </div>
          )
        ) : (
          <TeamManagement teams={teams} onTeamCreated={fetchTeams} />
        )}
      </div>
    </div>
  );
};

export default Coach;
