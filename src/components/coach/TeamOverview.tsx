import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Users, TrendingUp, Activity, Brain } from "lucide-react";

interface AthleteData {
  user_id: string;
  full_name: string | null;
  sport: string | null;
  last_checkin_date: string | null;
  avg_mood: number | null;
  avg_energy: number | null;
  checkin_count: number;
  assessment_count: number;
}

const TeamOverview = ({ teamId }: { teamId: string }) => {
  const [athletes, setAthletes] = useState<AthleteData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAthletes = async () => {
      // Get team members
      const { data: members } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("team_id", teamId);

      if (!members?.length) {
        setLoading(false);
        return;
      }

      const userIds = members.map((m) => m.user_id);

      // Get profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, sport")
        .in("id", userIds);

      // Get checkins
      const { data: checkins } = await supabase
        .from("daily_checkins")
        .select("user_id, mood_before, energy_level, date")
        .in("user_id", userIds);

      // Get assessments count
      const { data: assessments } = await supabase
        .from("assessments")
        .select("user_id")
        .in("user_id", userIds);

      // Filter out coaches (only show athletes)
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      const athleteIds = new Set(
        (roles ?? []).filter((r) => r.role === "athlete").map((r) => r.user_id)
      );

      const athleteData: AthleteData[] = (profiles ?? [])
        .filter((p) => athleteIds.has(p.id))
        .map((p) => {
          const userCheckins = (checkins ?? []).filter((c) => c.user_id === p.id);
          const moods = userCheckins.filter((c) => c.mood_before != null).map((c) => c.mood_before!);
          const energies = userCheckins.filter((c) => c.energy_level != null).map((c) => c.energy_level!);
          const lastDate = userCheckins.length
            ? userCheckins.sort((a, b) => b.date.localeCompare(a.date))[0].date
            : null;

          return {
            user_id: p.id,
            full_name: p.full_name,
            sport: p.sport,
            last_checkin_date: lastDate,
            avg_mood: moods.length ? Math.round((moods.reduce((a, b) => a + b, 0) / moods.length) * 10) / 10 : null,
            avg_energy: energies.length ? Math.round((energies.reduce((a, b) => a + b, 0) / energies.length) * 10) / 10 : null,
            checkin_count: userCheckins.length,
            assessment_count: (assessments ?? []).filter((a) => a.user_id === p.id).length,
          };
        });

      setAthletes(athleteData);
      setLoading(false);
    };

    fetchAthletes();
  }, [teamId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!athletes.length) {
    return (
      <div className="text-center py-12">
        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Noch keine Sportler im Team.</p>
        <p className="text-muted-foreground text-sm mt-1">Teile den Zugangscode, damit Sportler beitreten können.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {athletes.map((athlete) => (
        <div
          key={athlete.user_id}
          className="bg-card border border-border/50 rounded-2xl p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading font-semibold text-foreground">
                {athlete.full_name || "Unbenannt"}
              </h3>
              {athlete.sport && (
                <p className="text-xs text-muted-foreground">{athlete.sport}</p>
              )}
            </div>
            {athlete.last_checkin_date && (
              <span className="text-xs text-muted-foreground">
                Letztes Check-in: {new Date(athlete.last_checkin_date).toLocaleDateString("de-DE")}
              </span>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div className="bg-secondary/50 rounded-xl p-3 text-center">
              <Activity className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{athlete.avg_mood ?? "–"}</p>
              <p className="text-[10px] text-muted-foreground">Ø Mood</p>
            </div>
            <div className="bg-secondary/50 rounded-xl p-3 text-center">
              <TrendingUp className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{athlete.avg_energy ?? "–"}</p>
              <p className="text-[10px] text-muted-foreground">Ø Energie</p>
            </div>
            <div className="bg-secondary/50 rounded-xl p-3 text-center">
              <Brain className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{athlete.checkin_count}</p>
              <p className="text-[10px] text-muted-foreground">Check-ins</p>
            </div>
            <div className="bg-secondary/50 rounded-xl p-3 text-center">
              <Brain className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{athlete.assessment_count}</p>
              <p className="text-[10px] text-muted-foreground">Tests</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TeamOverview;
