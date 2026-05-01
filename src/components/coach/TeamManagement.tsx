import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, Copy, Loader2, Share2, MessageCircle, Rocket, CalendarCheck, ClipboardCheck, AlertTriangle } from "lucide-react";
import { addDays, format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Team {
  id: string;
  name: string;
  sport: string | null;
  access_code: string;
  coach_access_code: string;
  program_start_date?: string | null;
  program_activated_at?: string | null;
}

interface TeamManagementProps {
  teams: Team[];
  onTeamCreated: () => void;
}

const TeamManagement = ({ teams, onTeamCreated }: TeamManagementProps) => {
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamSport, setTeamSport] = useState("");
  const [showForm, setShowForm] = useState(false);

  const handleCreate = async () => {
    if (!teamName.trim() || !user) return;
    setCreating(true);

    const { error } = await supabase.from("teams").insert({
      name: teamName.trim(),
      sport: teamSport.trim() || null,
      created_by: user.id,
    });

    if (error) {
      toast.error("Fehler beim Erstellen: " + error.message);
    } else {
      const { data: newTeam } = await supabase
        .from("teams")
        .select("id")
        .eq("created_by", user.id)
        .eq("name", teamName.trim())
        .maybeSingle();

      if (newTeam) {
        await supabase.from("team_members").insert({
          team_id: newTeam.id,
          user_id: user.id,
        });
      }

      toast.success("Team erstellt!");
      setTeamName("");
      setTeamSport("");
      setShowForm(false);
      onTeamCreated();
    }
    setCreating(false);
  };

  const getPlayerMessage = (team: Team) =>
    `Hey! Ich lade dich als Sportler in unser Mentaltraining ein 🧠💪\n\nTeam: ${team.name}\nDein Spieler-Code: ${team.access_code}\n\nRegistriere dich auf RewirePerform und gib diesen Code bei der Anmeldung ein.`;

  const getCoachMessage = (team: Team) =>
    `Hi! Ich lade dich als Co-Coach zu unserem Team ein 🎯\n\nTeam: ${team.name}\nDein Coach-Code: ${team.coach_access_code}\n\nRegistriere dich auf RewirePerform und gib diesen Code bei der Anmeldung ein – du bekommst direkt Coach-Zugang.`;

  const shareWhatsApp = (message: string) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  const shareNative = async (title: string, message: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: message });
      } catch {
        // user cancelled
      }
    } else {
      navigator.clipboard.writeText(message);
      toast.success("Einladungstext kopiert!");
    }
  };

  const copyCode = (code: string, label: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`${label} kopiert!`);
  };

  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<Record<string, {
    athleteCount: number;
    completedCount: number;
    pendingNames: string[];
  }>>({});
  const [readinessLoading, setReadinessLoading] = useState(true);

  const loadReadiness = async () => {
    setReadinessLoading(true);
    const result: Record<string, { athleteCount: number; completedCount: number; pendingNames: string[] }> = {};
    for (const team of teams) {
      const { data, error } = await supabase.rpc("get_team_questionnaire_status", {
        _team_id: team.id,
      });
      if (error || !data) {
        result[team.id] = { athleteCount: 0, completedCount: 0, pendingNames: [] };
        continue;
      }
      // RPC returns rows for ALL team_members; coach himself is also a member -> filter via existing roles fetch
      const rows = data as Array<{
        user_id: string;
        full_name: string | null;
        is_complete: boolean;
      }>;
      const memberIds = rows.map((r) => r.user_id);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", memberIds);
      const athleteIdSet = new Set(
        (roles ?? []).filter((r) => r.role === "athlete").map((r) => r.user_id)
      );
      const athleteRows = rows.filter((r) => athleteIdSet.has(r.user_id));
      const completed = athleteRows.filter((r) => r.is_complete);
      const pending = athleteRows.filter((r) => !r.is_complete);

      result[team.id] = {
        athleteCount: athleteRows.length,
        completedCount: completed.length,
        pendingNames: pending.map((r) => r.full_name || "Unbekannt"),
      };
    }
    setReadiness(result);
    setReadinessLoading(false);
  };


  useEffect(() => {
    if (teams.length > 0) loadReadiness();
    else setReadinessLoading(false);
  }, [teams]);

  const activateProgram = async (team: Team) => {
    if (!user) return;
    const r = readiness[team.id];
    if (!r || r.athleteCount === 0) {
      toast.error("Es sind noch keine Spieler im Team registriert.");
      return;
    }
    if (r.completedCount < r.athleteCount) {
      toast.error("Es haben noch nicht alle Spieler den Fragebogen abgeschlossen.");
      return;
    }
    setActivatingId(team.id);
    const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
    const { error } = await supabase
      .from("teams")
      .update({
        program_start_date: tomorrow,
        program_activated_by: user.id,
        program_activated_at: new Date().toISOString(),
      })
      .eq("id", team.id);
    setActivatingId(null);
    if (error) {
      toast.error("Programm konnte nicht gestartet werden: " + error.message);
    } else {
      toast.success(`Programm startet am ${format(addDays(new Date(), 1), "d. MMMM yyyy", { locale: de })}`);
      onTeamCreated();
    }
  };

  return (
    <div className="space-y-4">
      {teams.map((team) => (
        <div key={team.id} className="bg-card border border-border/50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-heading font-semibold text-foreground">{team.name}</h3>
              {team.sport && <p className="text-xs text-muted-foreground">{team.sport}</p>}
            </div>
          </div>

          {/* Player Invitation */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Spieler einladen</span>
              <span className="text-[10px] text-muted-foreground">Sportler-Zugang</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 bg-secondary/50 rounded-xl px-4 py-3 font-mono text-lg tracking-[0.3em] text-center text-primary font-bold">
                {team.access_code}
              </div>
              <button
                onClick={() => copyCode(team.access_code, "Spieler-Code")}
                className="p-3 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                aria-label="Spieler-Code kopieren"
              >
                <Copy className="w-5 h-5" />
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => shareWhatsApp(getPlayerMessage(team))}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-colors text-xs font-medium"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
              </button>
              <button
                onClick={() => shareNative(`Team ${team.name} – Spieler einladen`, getPlayerMessage(team))}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-medium"
              >
                <Share2 className="w-3.5 h-3.5" />
                Teilen
              </button>
            </div>
          </div>

          {/* Coach Invitation */}
          <div className="mb-2 pt-3 border-t border-border/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Co-Coach einladen</span>
              <span className="text-[10px] text-amber-500/80">Coach-Zugang</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3 font-mono text-lg tracking-[0.3em] text-center text-amber-500 font-bold">
                {team.coach_access_code}
              </div>
              <button
                onClick={() => copyCode(team.coach_access_code, "Coach-Code")}
                className="p-3 rounded-xl bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors"
                aria-label="Coach-Code kopieren"
              >
                <Copy className="w-5 h-5" />
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => shareWhatsApp(getCoachMessage(team))}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-colors text-xs font-medium"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
              </button>
              <button
                onClick={() => shareNative(`Team ${team.name} – Co-Coach einladen`, getCoachMessage(team))}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors text-xs font-medium"
              >
                <Share2 className="w-3.5 h-3.5" />
                Teilen
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 text-center">
              Co-Coaches haben vollen Coach-Zugriff. Teile diesen Code nur mit Personen, denen du vertraust.
            </p>
          </div>

          {/* Program Start Activation */}
          <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
            {team.program_start_date ? (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-primary/10 text-primary text-sm">
                <CalendarCheck className="w-4 h-4 shrink-0" />
                <span className="font-medium">
                  Programm startet am {format(parseISO(team.program_start_date), "d. MMMM yyyy", { locale: de })}
                </span>
              </div>
            ) : (() => {
              const r = readiness[team.id];
              const ready = !!r && r.athleteCount > 0 && r.completedCount >= r.athleteCount;
              const noAthletes = !!r && r.athleteCount === 0;
              const pending = r ? r.athleteCount - r.completedCount : 0;

              return (
                <>
                  {/* Status-Karte: Fragebogen-Fortschritt im Team */}
                  <div className={`flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs ${
                    ready ? "bg-primary/10 text-primary" : "bg-secondary/50 text-muted-foreground"
                  }`}>
                    <ClipboardCheck className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      {readinessLoading || !r ? (
                        <span>Lade Fragebogen-Status…</span>
                      ) : noAthletes ? (
                        <span>Noch keine Spieler im Team registriert.</span>
                      ) : (
                        <>
                          <span className="font-medium">
                            Fragebogen: {r.completedCount} / {r.athleteCount} Spieler abgeschlossen
                          </span>
                          {!ready && (
                            <p className="mt-1 text-[11px] opacity-80">
                              {pending} {pending === 1 ? "Spieler hat" : "Spieler haben"} den Fragebogen noch nicht ausgefüllt.
                            </p>
                          )}
                          {!ready && r.pendingNames.length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {r.pendingNames.map((name) => (
                                <li key={name} className="text-[11px] opacity-70 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
                                  {name}
                                </li>
                              ))}
                            </ul>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {ready ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          disabled={activatingId === team.id}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:shadow-glow transition-all disabled:opacity-50"
                        >
                          {activatingId === team.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Rocket className="w-4 h-4" />
                              Programm starten
                            </>
                          )}
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Programm starten?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Alle {r.athleteCount} Spieler haben den Fragebogen abgeschlossen.
                            Das Programm startet morgen für dein Team. Bist du sicher?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                          <AlertDialogAction onClick={() => activateProgram(team)}>
                            Ja, Programm starten
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <button
                      disabled
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-muted text-muted-foreground font-semibold text-sm cursor-not-allowed"
                      title="Erst freigeben, wenn alle Spieler den Fragebogen ausgefüllt haben."
                    >
                      <AlertTriangle className="w-4 h-4" />
                      {noAthletes ? "Noch keine Spieler" : "Warte auf Fragebögen"}
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      ))}

      {showForm ? (
        <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-3">
          <input
            type="text"
            placeholder="Teamname"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm"
          />
          <input
            type="text"
            placeholder="Sportart (optional)"
            value={teamSport}
            onChange={(e) => setTeamSport(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 py-3 rounded-xl border border-border/50 text-muted-foreground text-sm hover:bg-secondary/50 transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !teamName.trim()}
              className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Erstellen"}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed border-border/50 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <Plus className="w-5 h-5" />
          Neues Team erstellen
        </button>
      )}
    </div>
  );
};

export default TeamManagement;
