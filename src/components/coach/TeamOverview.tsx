import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Activity, CheckCircle, Lock } from "lucide-react";

interface TeamStats {
  totalAthletes: number;
  activeThisWeek: number;
  totalCheckins: number;
  totalAssessments: number;
}

const TeamOverview = ({ teamId }: { teamId: string }) => {
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      // Get team members
      const { data: members } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("team_id", teamId);

      if (!members?.length) {
        setStats({ totalAthletes: 0, activeThisWeek: 0, totalCheckins: 0, totalAssessments: 0 });
        setLoading(false);
        return;
      }

      const userIds = members.map((m) => m.user_id);

      // Filter to athletes only
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      const athleteIds = (roles ?? []).filter((r) => r.role === "athlete").map((r) => r.user_id);

      if (!athleteIds.length) {
        setStats({ totalAthletes: 0, activeThisWeek: 0, totalCheckins: 0, totalAssessments: 0 });
        setLoading(false);
        return;
      }

      // Get checkins (only counts, no personal data)
      const { data: checkins } = await supabase
        .from("daily_checkins")
        .select("user_id, date")
        .in("user_id", athleteIds);

      // Get assessments count
      const { data: assessments } = await supabase
        .from("assessments")
        .select("user_id")
        .in("user_id", athleteIds);

      // Calculate "active this week"
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const weekStr = oneWeekAgo.toISOString().split("T")[0];
      const activeUsers = new Set(
        (checkins ?? []).filter((c) => c.date >= weekStr).map((c) => c.user_id)
      );

      setStats({
        totalAthletes: athleteIds.length,
        activeThisWeek: activeUsers.size,
        totalCheckins: (checkins ?? []).length,
        totalAssessments: (assessments ?? []).length,
      });
      setLoading(false);
    };

    fetchStats();
  }, [teamId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats || stats.totalAthletes === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Noch keine Sportler im Team.</p>
        <p className="text-muted-foreground text-sm mt-1">Teile den Zugangscode, damit Sportler beitreten können.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Aggregated Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border/50 rounded-2xl p-5 text-center">
          <Users className="w-5 h-5 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground">{stats.totalAthletes}</p>
          <p className="text-xs text-muted-foreground">Sportler gesamt</p>
        </div>
        <div className="bg-card border border-border/50 rounded-2xl p-5 text-center">
          <Activity className="w-5 h-5 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground">{stats.activeThisWeek}</p>
          <p className="text-xs text-muted-foreground">Aktiv diese Woche</p>
        </div>
        <div className="bg-card border border-border/50 rounded-2xl p-5 text-center">
          <CheckCircle className="w-5 h-5 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground">{stats.totalCheckins}</p>
          <p className="text-xs text-muted-foreground">Check-ins gesamt</p>
        </div>
        <div className="bg-card border border-border/50 rounded-2xl p-5 text-center">
          <CheckCircle className="w-5 h-5 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground">{stats.totalAssessments}</p>
          <p className="text-xs text-muted-foreground">Tests abgeschlossen</p>
        </div>
      </div>

      {/* Privacy notice */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-start gap-3">
        <Lock className="w-5 h-5 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground mb-1">Privatsphäre geschützt</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Du siehst nur anonyme Teilnahme-Statistiken. Persönliche Antworten, Reflexionen, 
            Stimmungswerte und Journale deiner Sportler sind nicht einsehbar und bleiben vollständig privat.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TeamOverview;
