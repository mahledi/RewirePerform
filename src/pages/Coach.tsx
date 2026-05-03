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
      navigate("/dashboard");
    }
  }, [role, loading]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-6 h-6 text-primary" />
          <span className="font-heading text-lg font-bold">Coach</span>
        </div>
        <button onClick={handleSignOut} className="text-muted-foreground hover:text-foreground transition-colors">
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="px-6 mb-6">
        <div className="flex gap-1 bg-secondary/50 rounded-xl p-1 overflow-x-auto">
          <button
            onClick={() => setTab("overview")}
            className={`flex-1 min-w-fit flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-medium transition-all ${
              tab === "overview" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Übersicht
          </button>
          <button
            onClick={() => setTab("mental")}
            className={`flex-1 min-w-fit flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-medium transition-all ${
              tab === "mental" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Mental
          </button>
          <button
            onClick={() => setTab("evidence")}
            className={`flex-1 min-w-fit flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-medium transition-all ${
              tab === "evidence" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Wirksamkeit
          </button>
          <button
            onClick={() => setTab("toolkit")}
            className={`flex-1 min-w-fit flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-medium transition-all ${
              tab === "toolkit" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Toolkit
          </button>
          <button
            onClick={() => setTab("manage")}
            className={`flex-1 min-w-fit flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-medium transition-all ${
              tab === "manage" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            Teams
          </button>
        </div>
      </div>

      {/* Team selector if multiple teams */}
      {teams.length > 1 && (tab === "overview" || tab === "mental" || tab === "evidence" || tab === "toolkit") && (
        <div className="px-6 mb-4">
          <select
            value={selectedTeam ?? ""}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Content */}
      <div className="px-6 pb-12">
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
