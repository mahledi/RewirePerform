import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, CheckCircle, ClipboardCheck, Activity, Lock, Loader2 } from "lucide-react";

interface TeamStats {
  member_count: number;
  checkins_last_week: number;
  assessments_completed: number;
}

const TeamOverview = ({ teamId }: { teamId: string }) => {
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    supabase
      .rpc("get_team_stats", { team_id_param: teamId })
      .then(({ data, error: rpcError }) => {
        if (cancelled) return;
        if (rpcError) setError(rpcError.message);
        else setStats(data as unknown as TeamStats);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        {error ?? "Keine Daten verfügbar."}
      </div>
    );
  }

  if (stats.member_count === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Noch keine Sportler im Team.</p>
        <p className="text-muted-foreground text-sm mt-1">
          Teile den Zugangscode, damit Sportler beitreten können.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border/50 rounded-2xl p-5 text-center">
          <Users className="w-5 h-5 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground">{stats.member_count}</p>
          <p className="text-xs text-muted-foreground">Sportler im Team</p>
        </div>
        <div className="bg-card border border-border/50 rounded-2xl p-5 text-center">
          <Activity className="w-5 h-5 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground">{stats.checkins_last_week}</p>
          <p className="text-xs text-muted-foreground">Check-ins (7 Tage)</p>
        </div>
        <div className="bg-card border border-border/50 rounded-2xl p-5 text-center col-span-2">
          <ClipboardCheck className="w-5 h-5 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground">{stats.assessments_completed}</p>
          <p className="text-xs text-muted-foreground">Assessments abgeschlossen (gesamt)</p>
        </div>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-start gap-3">
        <Lock className="w-5 h-5 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground mb-1">Privatsphäre geschützt</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Du siehst nur operative Teilnahme-Zahlen. Persönliche Antworten,
            Reflexionen, Stimmungswerte und Journale deiner Sportler sind nicht
            einsehbar und bleiben vollständig privat.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TeamOverview;
