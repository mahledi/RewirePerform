import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, FlaskConical, Copy, Plus, Calendar, Archive, ArrowLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import QaEvidenceParityPanel from "@/components/admin/QaEvidenceParityPanel";
import { Button } from "@/components/ui/button";

interface QATeam {
  id: string;
  name: string;
  program_start_date: string | null;
  is_archived: boolean;
  simulated_date: string | null;
  simulated_day_number: number | null;
  member_count: number;
  program_run_id: string | null;
}

interface CreatedCohort {
  password: string;
  team: { id: string; name: string; access_code: string; coach_access_code: string; program_start_date: string };
  accounts: { role: string; email: string; user_id: string }[];
}

const addDaysIso = (date: string | null, days: number) => {
  if (!date) return undefined;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
};

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
    const { data: rows, error: teamsError } = await supabase
      .from("teams")
      .select("id, name, program_start_date, is_archived")
      .eq("is_test_team", true)
      .order("name");
    if (teamsError) {
      toast.error(`QA-Teams konnten nicht geladen werden: ${teamsError.message}`);
      setLoading(false);
      return;
    }
    const teamRows = rows ?? [];
    const ids = teamRows.map((team) => team.id);
    let overrides: Pick<Tables<"qa_time_overrides">, "team_id" | "simulated_date" | "simulated_day_number">[] = [];
    let members: Pick<Tables<"team_members">, "team_id">[] = [];
    let programRuns: Pick<Tables<"program_runs">, "id" | "team_id" | "status" | "created_at">[] = [];
    if (ids.length > 0) {
      const [overrideResult, memberResult, runResult] = await Promise.all([
        supabase.from("qa_time_overrides").select("team_id, simulated_date, simulated_day_number").in("team_id", ids),
        supabase.from("team_members").select("team_id").in("team_id", ids),
        supabase.from("program_runs").select("id, team_id, status, created_at").in("team_id", ids).order("created_at", { ascending: false }),
      ]);
      const relatedError = overrideResult.error ?? memberResult.error ?? runResult.error;
      if (relatedError) {
        toast.error(`QA-Status konnte nicht vollständig geladen werden: ${relatedError.message}`);
        setLoading(false);
        return;
      }
      overrides = overrideResult.data ?? [];
      members = memberResult.data ?? [];
      programRuns = runResult.data ?? [];
    }
    const ovByTeam = new Map(overrides.map((override) => [override.team_id, override]));
    const countByTeam = new Map<string, number>();
    const runByTeam = new Map<string, { id: string; status: string }>();
    members.forEach((member) => countByTeam.set(member.team_id, (countByTeam.get(member.team_id) ?? 0) + 1));
    programRuns.forEach((run) => {
      const current = runByTeam.get(run.team_id);
      if (!current || (current.status !== "active" && run.status === "active")) {
        runByTeam.set(run.team_id, { id: run.id, status: run.status });
      }
    });
    setTeams(
      teamRows.map((team) => ({
        id: team.id,
        name: team.name,
        program_start_date: team.program_start_date,
        is_archived: team.is_archived,
        simulated_date: ovByTeam.get(team.id)?.simulated_date ?? null,
        simulated_day_number: ovByTeam.get(team.id)?.simulated_day_number ?? null,
        member_count: countByTeam.get(team.id) ?? 0,
        program_run_id: runByTeam.get(team.id)?.id ?? null,
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
      toast.success("QA-Kohorte erstellt");
      await loadTeams();
    } catch (error: unknown) {
      toast.error(`Erstellung fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`);
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
      toast.error(`Zeitsprung fehlgeschlagen: ${error.message}`);
      return;
    }
    toast.success(day ? `QA auf Tag ${day} gesetzt` : `QA auf ${date} gesetzt`);
    await loadTeams();
  };

  const advance = async (team: QATeam) => {
    const nextDay = (team.simulated_day_number ?? 1) + 1;
    await jump(team.id, nextDay);
  };

  const archive = async (teamId: string) => {
    if (!confirm("Diese QA-Kohorte archivieren und alle zugehörigen Testdaten löschen?")) return;
    const { error } = await supabase.functions.invoke("qa-set-time", { body: { team_id: teamId, action: "archive" } });
    if (error) {
      toast.error(`Archivierung fehlgeschlagen: ${error.message}`);
      return;
    }
    toast.success("QA-Kohorte archiviert");
    await loadTeams();
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Kopiert");
    } catch {
      toast.error("Kopieren nicht möglich. Bitte markiere den Wert manuell.");
    }
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
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/admin")}
          className="mb-6 h-11 px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Zurück zum Adminbereich
        </Button>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FlaskConical className="w-5 h-5 text-primary" />
              <h1 className="font-heading text-2xl font-bold sm:text-3xl">QA Test Lab</h1>
              <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded bg-yellow-500/15 text-yellow-300 border border-yellow-500/40">
                Testdaten
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Echte App-Flows mit synthetischen Accounts. Produktionsmetriken bleiben strikt getrennt.
            </p>
          </div>
          <Button
            onClick={createCohort}
            disabled={creating}
            className="h-11 shrink-0"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            QA-Kohorte erstellen
          </Button>
        </div>

        {lastCohort && (
          <div className="mb-8 rounded-md border border-primary/40 bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg font-semibold">Zugangsdaten (einmalig sichtbar)</h2>
              <Button variant="ghost" size="sm" onClick={() => setLastCohort(null)} className="h-11 text-muted-foreground">
                Schließen
              </Button>
            </div>
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Passwort für alle Accounts:</span>{" "}
              <code className="px-2 py-1 rounded bg-muted text-foreground">{lastCohort.password}</code>{" "}
              <Button variant="ghost" size="sm" onClick={() => void copy(lastCohort.password)} className="h-11 text-primary">
                <Copy className="w-3 h-3" /> kopieren
              </Button>
            </div>
            <div className="mb-4 text-xs text-muted-foreground">
              Team: <span className="text-foreground">{lastCohort.team.name}</span> · Spieler-Code:{" "}
              <code className="px-1.5 py-0.5 rounded bg-muted text-foreground">{lastCohort.team.access_code}</code> · Coach-Code:{" "}
              <code className="px-1.5 py-0.5 rounded bg-muted text-foreground">{lastCohort.team.coach_access_code}</code>
            </div>
            <div className="overflow-x-auto">
            <table className="min-w-[640px] w-full text-sm">
              <thead className="text-xs text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="text-left py-2">Rolle</th>
                  <th className="text-left py-2">Email</th>
                  <th className="text-left py-2">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {lastCohort.accounts.map((a) => (
                  <tr key={a.user_id} className="border-t border-border/40">
                    <td className="py-2 capitalize">{a.role}</td>
                    <td className="py-2 font-mono text-xs">{a.email}</td>
                    <td className="py-2">
                      <Button variant="ghost" size="sm" onClick={() => void copy(a.email)} className="h-11 px-2 text-xs text-primary">
                        <Copy className="w-3 h-3" /> E-Mail
                      </Button>
                      <Button variant="ghost" size="sm" asChild className="h-11 px-2 text-xs text-primary">
                        <a href="/auth" target="_blank" rel="noreferrer">
                          Login öffnen <ChevronRight className="w-3 h-3" />
                        </a>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}

        <h2 className="font-heading text-xl font-semibold mb-3">Testteams</h2>
        {teams.length === 0 && (
          <p className="text-sm text-muted-foreground">Noch keine QA-Kohorte vorhanden.</p>
        )}
        <div className="space-y-4">
          {teams.map((t) => (
            <div key={t.id} className={`rounded-md border border-border/40 bg-card p-5 ${t.is_archived ? "opacity-60" : ""}`}>
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="font-heading font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Start: {t.program_start_date ?? "—"} · Mitglieder: {t.member_count}
                    {t.is_archived && <span className="ml-2 text-yellow-400">[archiviert]</span>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Simuliert</div>
                  <div className="font-mono text-sm">
                    {t.simulated_date ?? "—"} · Tag {t.simulated_day_number ?? "—"}
                  </div>
                </div>
              </div>

              {!t.is_archived && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" className="h-11" onClick={() => jump(t.id, 1)}>Tag 1 testen</Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => advance(t)}
                    disabled={(t.simulated_day_number ?? 1) >= 56}
                    className="h-11"
                  >
                    +1 Tag
                  </Button>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      max={56}
                      placeholder="Tag"
                      aria-label="Programmtag manuell auswählen"
                      value={customDay[t.id] ?? ""}
                      onChange={(e) => setCustomDay({ ...customDay, [t.id]: e.target.value })}
                      className="h-11 w-20 rounded-md bg-muted px-2 text-sm"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        const d = Number(customDay[t.id]);
                        if (Number.isInteger(d) && d >= 1 && d <= 56) void jump(t.id, d);
                      }}
                      disabled={!Number.isInteger(Number(customDay[t.id])) || Number(customDay[t.id]) < 1 || Number(customDay[t.id]) > 56}
                      className="h-11"
                    >
                      Los
                    </Button>
                  </div>
                  <input
                    type="date"
                    aria-label="Simuliertes Datum auswählen"
                    min={t.program_start_date ?? undefined}
                    max={addDaysIso(t.program_start_date, 55)}
                    onChange={(e) => e.target.value && jump(t.id, undefined, e.target.value)}
                    className="h-11 rounded-md bg-muted px-2 text-sm"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => archive(t.id)}
                    className="h-11 sm:ml-auto"
                  >
                    <Archive className="w-3 h-3" /> Archivieren & löschen
                  </Button>
                </div>
              )}

              {!t.is_archived && t.program_run_id ? (
                <QaEvidenceParityPanel
                  programRunId={t.program_run_id}
                  refreshToken={t.simulated_date ?? "none"}
                  onJumpToDay={async (dayNumber) => {
                    await jump(t.id, dayNumber);
                  }}
                />
              ) : null}
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-md border border-border/30 bg-card p-5">
          <h3 className="font-heading font-semibold mb-2 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> QA-Zeitsteuerung
          </h3>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Ein simulierter Tag gilt gemeinsam für die fünf QA-Athleten und den QA-Coach.</li>
            <li>Reale Nutzer sehen immer das reale Datum; die Zeitsteuerung greift nur bei markierten Testaccounts.</li>
            <li>Check-ins, Completions und Evidence-Antworten nutzen denselben produktiven Speicherweg.</li>
            <li>Archivieren entfernt die QA-Nutzungs- und Evidence-Daten; die Auth-Accounts bleiben erhalten.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminQA;
