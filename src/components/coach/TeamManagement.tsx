import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, Copy, Loader2, Share2, MessageCircle, Rocket, CalendarCheck, ClipboardCheck, AlertTriangle } from "lucide-react";
import { addDays, format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import TeamTrainingSchedule from "@/components/coach/TeamTrainingSchedule";
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

  const INVITE_BASE_URL = "https://rewireperform.com";

  const getPlayerMessage = (team: Team) =>
    `Hey, ich lade dich als Athlet:innen zu unserem gemeinsamen neurokognitiven Performance-System RewirePerform ein.\n\nTeam: ${team.name}\nDein Code: ${team.access_code}\n\nKlick auf den Link, wenn du dir Zeit für die Registrierung und den folgenden Fragebogen nehmen kannst:\n${INVITE_BASE_URL}/auth?intent=join&code=${team.access_code}`;

  const getCoachMessage = (team: Team) =>
    `Hey, ich lade dich als Coach zu unserem gemeinsamen neurokognitiven Performance-System RewirePerform ein.\n\nTeam: ${team.name}\nDein Coach-Code: ${team.coach_access_code}\n\nKlick auf den Link, wenn du dir Zeit für die Registrierung nehmen kannst:\n${INVITE_BASE_URL}/auth?intent=join&code=${team.coach_access_code}`;

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
  const [editingStartId, setEditingStartId] = useState<string | null>(null);
  const [startDateDraft, setStartDateDraft] = useState<string>("");
  const [savingStart, setSavingStart] = useState(false);
  const [readiness, setReadiness] = useState<Record<string, {
    athleteCount: number;
    completedCount: number;
    pendingNames: string[];
  }>>({});
  const [readinessLoading, setReadinessLoading] = useState(true);

  const updateTeamStartDate = async (teamId: string, date: string) => {
    if (!date) {
      toast.error("Bitte ein Datum auswählen.");
      return;
    }
    setSavingStart(true);
    const { error } = await supabase
      .from("teams")
      .update({
        program_start_date: date,
        program_activated_by: user!.id,
        program_activated_at: new Date().toISOString(),
      })
      .eq("id", teamId);
    setSavingStart(false);
    if (error) {
      toast.error("Konnte Programmstart nicht speichern: " + error.message);
      return;
    }
    toast.success(`Programmstart auf ${format(parseISO(date), "d. MMMM yyyy", { locale: de })} gesetzt.`);
    setEditingStartId(null);
    onTeamCreated();
  };

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
      toast.error("Es sind noch keine Athlet:innen im Team registriert.");
      return;
    }
    if (r.completedCount < r.athleteCount) {
      toast.error("Es haben noch nicht alle Athlet:innen den Fragebogen abgeschlossen.");
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
    <div className="w-full min-w-0 space-y-4">
      {teams.map((team) => (
        <div key={team.id} className="min-w-0 rounded-2xl border border-border/50 bg-card p-4 sm:p-5">
          <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-heading font-semibold text-foreground">{team.name}</h3>
              {team.sport && <p className="text-xs text-muted-foreground">{team.sport}</p>}
            </div>
          </div>

          {/* Player Invitation */}
          <div className="mb-4">
            <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Athlet:innen einladen</span>
              <span className="text-[10px] text-muted-foreground">Sportler-Zugang</span>
            </div>
            <div className="mb-2 flex min-w-0 items-center gap-2">
              <div className="min-w-0 flex-1 break-all rounded-xl bg-secondary/50 px-3 py-3 text-center font-mono text-base font-bold tracking-[0.18em] text-primary sm:px-4 sm:text-lg sm:tracking-[0.3em]">
                {team.access_code}
              </div>
              <button
                onClick={() => copyCode(team.access_code, "Team-Code")}
                className="shrink-0 rounded-xl bg-primary/10 p-3 text-primary transition-colors hover:bg-primary/20"
                aria-label="Team-Code kopieren"
              >
                <Copy className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                onClick={() => shareWhatsApp(getPlayerMessage(team))}
                className="flex min-w-0 items-center justify-center gap-2 rounded-xl bg-[#25D366]/10 py-2 text-xs font-medium text-[#25D366] transition-colors hover:bg-[#25D366]/20"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
              </button>
              <button
                onClick={() => shareNative(`Team ${team.name} – Athlet:innen einladen`, getPlayerMessage(team))}
                className="flex min-w-0 items-center justify-center gap-2 rounded-xl bg-primary/10 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
              >
                <Share2 className="w-3.5 h-3.5" />
                Teilen
              </button>
            </div>
          </div>

          {/* Coach Invitation */}
          <div className="mb-2 pt-3 border-t border-border/40">
            <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Co-Coach einladen</span>
              <span className="text-[10px] text-amber-500/80">Coach-Zugang</span>
            </div>
            <div className="mb-2 flex min-w-0 items-center gap-2">
              <div className="min-w-0 flex-1 break-all rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-3 text-center font-mono text-base font-bold tracking-[0.18em] text-amber-500 sm:px-4 sm:text-lg sm:tracking-[0.3em]">
                {team.coach_access_code}
              </div>
              <button
                onClick={() => copyCode(team.coach_access_code, "Coach-Code")}
                className="shrink-0 rounded-xl bg-amber-500/10 p-3 text-amber-500 transition-colors hover:bg-amber-500/20"
                aria-label="Coach-Code kopieren"
              >
                <Copy className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                onClick={() => shareWhatsApp(getCoachMessage(team))}
                className="flex min-w-0 items-center justify-center gap-2 rounded-xl bg-[#25D366]/10 py-2 text-xs font-medium text-[#25D366] transition-colors hover:bg-[#25D366]/20"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
              </button>
              <button
                onClick={() => shareNative(`Team ${team.name} – Co-Coach einladen`, getCoachMessage(team))}
                className="flex min-w-0 items-center justify-center gap-2 rounded-xl bg-amber-500/10 py-2 text-xs font-medium text-amber-500 transition-colors hover:bg-amber-500/20"
              >
                <Share2 className="w-3.5 h-3.5" />
                Teilen
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 text-center">
              Co-Coaches haben vollen Coach-Zugriff. Teile diesen Code nur mit Personen, denen du vertraust.
            </p>
          </div>

          <TeamTrainingSchedule teamId={team.id} />

          {/* Program Start Activation */}
          <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
            {team.program_start_date ? (
              <div className="space-y-2">
                <div className="flex min-w-0 flex-col gap-2 rounded-xl bg-primary/10 px-3 py-2.5 text-sm text-primary sm:flex-row sm:items-center">
                  <CalendarCheck className="w-4 h-4 shrink-0" />
                  <span className="min-w-0 flex-1 font-medium">
                    Programm startet am {format(parseISO(team.program_start_date), "d. MMMM yyyy", { locale: de })}
                  </span>
                  <button
                    onClick={() => {
                      setEditingStartId(team.id);
                      setStartDateDraft(team.program_start_date!);
                    }}
                    className="text-xs underline opacity-80 hover:opacity-100"
                  >
                    Ändern
                  </button>
                </div>
                {editingStartId === team.id && (
                  <div className="flex flex-col gap-2 rounded-xl bg-secondary/40 px-3 py-2.5 sm:flex-row sm:items-center">
                    <input
                      type="date"
                      value={startDateDraft}
                      onChange={(e) => setStartDateDraft(e.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      onClick={() => updateTeamStartDate(team.id, startDateDraft)}
                      disabled={savingStart}
                      className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:shadow-glow disabled:opacity-50"
                    >
                      {savingStart ? <Loader2 className="w-3 h-3 animate-spin" /> : "Speichern"}
                    </button>
                    <button
                      onClick={() => setEditingStartId(null)}
                      className="px-3 py-2 rounded-lg bg-secondary text-muted-foreground text-xs"
                    >
                      Abbrechen
                    </button>
                  </div>
                )}
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
                        <span>Noch keine Athlet:innen im Team registriert.</span>
                      ) : (
                        <>
                          <span className="font-medium">
                            Fragebogen: {r.completedCount} / {r.athleteCount} Athlet:innen abgeschlossen
                          </span>
                          {!ready && (
                            <p className="mt-1 text-[11px] opacity-80">
                              {pending} {pending === 1 ? "Athlet:in hat" : "Athlet:innen haben"} den Fragebogen noch nicht ausgefüllt.
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
                            Alle {r.athleteCount} Athlet:innen haben den Fragebogen abgeschlossen.
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
                      title="Erst freigeben, wenn alle Athlet:innen den Fragebogen ausgefüllt haben."
                    >
                      <AlertTriangle className="w-4 h-4" />
                      {noAthletes ? "Noch keine Athlet:innen" : "Warte auf Fragebögen"}
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      ))}

      {showForm ? (
        <div className="min-w-0 space-y-3 rounded-2xl border border-border/50 bg-card p-4 sm:p-5">
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
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              onClick={() => setShowForm(false)}
              className="rounded-xl border border-border/50 py-3 text-sm text-muted-foreground transition-colors hover:bg-secondary/50"
            >
              Abbrechen
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !teamName.trim()}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
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
