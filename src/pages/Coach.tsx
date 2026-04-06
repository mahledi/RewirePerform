import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Brain, LogOut, Users, Settings, Activity } from "lucide-react";
import TeamOverview from "@/components/coach/TeamOverview";
import TeamManagement from "@/components/coach/TeamManagement";
import TeamMentalState from "@/components/coach/TeamMentalState";

type Tab = "overview" | "mental" | "manage";

interface Team {
  id: string;
  name: string;
  sport: string | null;
  access_code: string;
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
    const { data } = await supabase
      .from("teams")
      .select("id, name, sport, access_code")
      .eq("created_by", user.id);
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
        <div className="flex gap-1 bg-secondary/50 rounded-xl p-1">
          <button
            onClick={() => setTab("overview")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
              tab === "overview" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Übersicht
          </button>
          <button
            onClick={() => setTab("mental")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
              tab === "mental" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Mental
          </button>
          <button
            onClick={() => setTab("manage")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
              tab === "manage" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            Teams
          </button>
        </div>
      </div>

      {/* Team selector if multiple teams */}
      {teams.length > 1 && (tab === "overview" || tab === "mental") && (
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
        ) : (
          <TeamManagement teams={teams} onTeamCreated={fetchTeams} />
        )}
      </div>
    </div>
  );
};

export default Coach;
