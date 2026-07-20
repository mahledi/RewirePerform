import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Archive,
  CalendarCheck,
  CheckCircle2,
  Database,
  Download,
  FlaskConical,
  Loader2,
  Play,
  Plus,
  RefreshCcw,
  Save,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import QaEvidenceParityPanel from "@/components/admin/QaEvidenceParityPanel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ProgramRun = Tables<"program_runs">;
type DataMode = "production" | "qa";

interface TeamOption {
  id: string;
  name: string;
  sport: string | null;
  is_test_team: boolean;
}

interface MissingPlayer {
  user_id: string;
  full_name: string | null;
}

export interface PilotReadiness {
  generated_at: string;
  status: "GREEN" | "YELLOW" | "RED";
  status_label: string;
  team: { id: string; name: string; sport: string | null; is_test_team: boolean; coach: string | null };
  program_run: ProgramRun | null;
  setup: { team_members: number; athletes: number; coaches: number };
  consent: { true: number; false: number; null: number; rate: number | null };
  activation: {
    accounts: number;
    with_program_instance: number;
    with_program_run_id: number;
    without_program_instance: number;
    active_instances: number;
    multiple_active_instances: number;
  };
  pre_measurement: {
    validated_complete: number;
    validated_missing: number;
    validated_rate: number | null;
    development_index_complete: number;
    development_index_missing: number;
    development_index_rate: number | null;
  };
  daily_tracking: {
    day_1_completed: number;
    checkins_today: number;
    active_7d: number;
    inactive_7d: number;
    avg_completion_rate: number;
    avg_days_completed: number;
  };
  data_quality: Record<string, number | boolean>;
  missing_players: {
    program_instance: MissingPlayer[];
    validated_pre: MissingPlayer[];
    development_pre: MissingPlayer[];
  };
  blockers: string[];
  warnings: string[];
  privacy_level: string;
}

export interface EvidenceDossier {
  meta: Record<string, Json | undefined>;
  sample: Record<string, Json | undefined>;
  usage: Record<string, Json | undefined>;
  team_pulse: { daily: Record<string, Json>[]; weekly: Record<string, Json>[] };
  measurement: Record<string, Json | undefined>;
  outcomes: {
    validated_pre_post: Record<string, Json>[];
    validated_pre_mid: Record<string, Json>[];
    development_overall: Record<string, Json>;
    comprehension: Record<string, Json>;
  };
  data_quality: Record<string, Json | undefined>;
  readiness: Record<string, Json | undefined>;
  privacy_exclusions: string[];
}

interface PerformanceEvidenceSummary {
  schema_version: string;
  protocol_version: string;
  scope: string;
  sample: Record<string, Json | undefined>;
  coverage: Record<string, Json | undefined>;
  domain_aggregates: Record<string, Json>[];
  weekly_aggregates: Record<string, Json>[];
  coach_team_observations: Record<string, Json>[];
  data_quality: Record<string, Json | undefined>;
  claim_boundary: Record<string, Json | undefined>;
  privacy: Record<string, Json | undefined>;
}

interface LockedRunEvidence {
  schema_version: string;
  sample: Record<string, Json>;
  usage: Record<string, Json>;
  team_pulse: { daily: Record<string, Json>[]; weekly: Record<string, Json>[] };
  outcomes: {
    validated_pre_post: Record<string, Json>[];
    validated_pre_mid: Record<string, Json>[];
  };
  transfer_evidence: PerformanceEvidenceSummary;
  data_quality: Record<string, Json>;
}

interface EvidenceDataLockResult {
  lock_id: string;
  content_checksum: string;
  analysis_manifest: Record<string, Json>;
  evidence: LockedRunEvidence;
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String((error as { message?: unknown } | null)?.message ?? error);

const formatPercent = (value: number | null | undefined) =>
  typeof value === "number" ? `${Math.round(value * 100)} %` : "-";

const jsonNumber = (value: Json | undefined): number | null =>
  typeof value === "number" ? value : null;

const jsonRecord = <T,>(value: Json | null): T => value as unknown as T;

const downloadBlob = (filename: string, content: string, type: string) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const csvCell = (value: unknown) => {
  const text = value === null || value === undefined
    ? ""
    : typeof value === "object" ? JSON.stringify(value) : String(value);
  return `"${text.replaceAll('"', '""')}"`;
};

const downloadCsv = (filename: string, rows: Record<string, unknown>[]) => {
  if (rows.length === 0) return;
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const content = [
    headers.map(csvCell).join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")),
  ].join("\n");
  downloadBlob(filename, content, "text/csv;charset=utf-8");
};

const statusStyle: Record<PilotReadiness["status"], string> = {
  GREEN: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  YELLOW: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  RED: "border-destructive/30 bg-destructive/10 text-destructive",
};

const Metric = ({ label, value, detail }: { label: string; value: string | number; detail?: string }) => (
  <div className="min-w-0 border-l-2 border-border pl-3">
    <p className="text-[10px] font-medium uppercase text-muted-foreground">{label}</p>
    <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
    {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
  </div>
);

const MissingList = ({ title, players }: { title: string; players: MissingPlayer[] }) => (
  <div>
    <p className="text-xs font-semibold text-foreground">{title}</p>
    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
      {players.length === 0
        ? "Vollständig"
        : players.map((player) => player.full_name || player.user_id.slice(0, 8)).join(", ")}
    </p>
  </div>
);

const NlzPilotReadiness = () => {
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [runs, setRuns] = useState<ProgramRun[]>([]);
  const [dataMode, setDataMode] = useState<DataMode>("production");
  const [teamId, setTeamId] = useState("");
  const [runId, setRunId] = useState("");
  const [readiness, setReadiness] = useState<PilotReadiness | null>(null);
  const [dossier, setDossier] = useState<EvidenceDossier | null>(null);
  const [performanceEvidence, setPerformanceEvidence] = useState<PerformanceEvidenceSummary | null>(null);
  const [evidenceLock, setEvidenceLock] = useState<EvidenceDataLockResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<string | null>(null);
  const [newRunName, setNewRunName] = useState("");
  const [newRunStart, setNewRunStart] = useState(new Date().toISOString().slice(0, 10));

  const selectedRun = useMemo(() => runs.find((run) => run.id === runId) ?? null, [runId, runs]);
  const visibleTeams = useMemo(
    () => teams.filter((team) => team.is_test_team === (dataMode === "qa")),
    [dataMode, teams],
  );

  const loadRunData = useCallback(async (
    selectedTeamId: string,
    preferredRunId?: string,
    mode: DataMode = "production",
  ) => {
    setLoading(true);
    setEvidenceLock(null);
    const { data: runRows, error: runsError } = await supabase
      .from("program_runs")
      .select("*")
      .eq("team_id", selectedTeamId)
      .order("created_at", { ascending: false });
    if (runsError) {
      toast.error(`Program Runs konnten nicht geladen werden: ${runsError.message}`);
      setLoading(false);
      return;
    }

    const nextRuns = runRows ?? [];
    setRuns(nextRuns);
    const chosenRun = nextRuns.find((run) => run.id === preferredRunId)
      ?? nextRuns.find((run) => run.status === "active")
      ?? nextRuns[0]
      ?? null;
    setRunId(chosenRun?.id ?? "");

    if (mode === "qa") {
      setReadiness(null);
      setDossier(null);
      setPerformanceEvidence(null);
      setLoading(false);
      return;
    }

    const { data: readinessData, error: readinessError } = await supabase.rpc("get_nlz_pilot_readiness", {
      _team_id: selectedTeamId,
      _program_run_id: chosenRun?.id,
    });
    if (readinessError) {
      toast.error(`Readiness konnte nicht geladen werden: ${readinessError.message}`);
      setReadiness(null);
    } else {
      setReadiness(jsonRecord<PilotReadiness>(readinessData));
    }

    if (chosenRun?.id) {
      const [dossierResult, performanceResult] = await Promise.all([
        supabase.rpc("get_nlz_evidence_dossier", { _program_run_id: chosenRun.id }),
        supabase.rpc("get_performance_evidence_summary", {
          _program_run_id: chosenRun.id,
          _include_test: false,
        }),
      ]);
      const { data: dossierData, error: dossierError } = dossierResult;
      setDossier(dossierError ? null : jsonRecord<EvidenceDossier>(dossierData));
      setPerformanceEvidence(
        performanceResult.error
          ? null
          : jsonRecord<PerformanceEvidenceSummary>(performanceResult.data),
      );
    } else {
      setDossier(null);
      setPerformanceEvidence(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const loadTeams = async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, sport, is_test_team")
        .eq("is_archived", false)
        .order("name");
      if (error) {
        toast.error(`Teams konnten nicht geladen werden: ${error.message}`);
        setLoading(false);
        return;
      }
      const options = data ?? [];
      setTeams(options);
      const initialTeam = options.find((team) => !team.is_test_team);
      if (initialTeam) {
        setTeamId(initialTeam.id);
        await loadRunData(initialTeam.id, undefined, "production");
      } else {
        setLoading(false);
      }
    };
    void loadTeams();
  }, [loadRunData]);

  const changeTeam = async (nextTeamId: string) => {
    setTeamId(nextTeamId);
    await loadRunData(nextTeamId, undefined, dataMode);
  };

  const changeRun = async (nextRunId: string) => {
    setRunId(nextRunId);
    await loadRunData(teamId, nextRunId, dataMode);
  };

  const changeDataMode = async (nextMode: DataMode) => {
    if (nextMode === dataMode) return;
    setDataMode(nextMode);
    const nextTeam = teams.find((team) => team.is_test_team === (nextMode === "qa"));
    if (!nextTeam) {
      setTeamId("");
      setRunId("");
      setRuns([]);
      setReadiness(null);
      setDossier(null);
      setPerformanceEvidence(null);
      setLoading(false);
      return;
    }
    setTeamId(nextTeam.id);
    await loadRunData(nextTeam.id, undefined, nextMode);
  };

  const createRun = async () => {
    if (!teamId || newRunName.trim().length < 2) {
      toast.error("Bitte einen Namen für den Program Run eingeben.");
      return;
    }
    setAction("create");
    const { data, error } = await supabase.rpc("create_team_program_run", {
      _team_id: teamId,
      _name: newRunName.trim(),
      _started_at: newRunStart,
    });
    setAction(null);
    if (error) {
      toast.error(`Program Run konnte nicht erstellt werden: ${error.message}`);
      return;
    }
    const created = jsonRecord<ProgramRun>(data);
    setNewRunName("");
    toast.success("Program Run geplant.");
    await loadRunData(teamId, created.id, dataMode);
  };

  const activateAndAssign = async () => {
    if (!runId) return;
    setAction("activate");
    try {
      const activation = await supabase.rpc("activate_team_program_run", { _program_run_id: runId });
      if (activation.error) throw activation.error;
      const assignment = await supabase.rpc("assign_team_members_to_program_run", { _program_run_id: runId });
      if (assignment.error) throw assignment.error;
      toast.success("Program Run aktiv. Athleten wurden eindeutig zugeordnet.");
      await loadRunData(teamId, runId, dataMode);
    } catch (error) {
      toast.error(`Aktivierung nicht vollständig: ${errorMessage(error)}`);
    } finally {
      setAction(null);
    }
  };

  const reassign = async () => {
    if (!runId) return;
    setAction("assign");
    const { error } = await supabase.rpc("assign_team_members_to_program_run", { _program_run_id: runId });
    setAction(null);
    if (error) {
      toast.error(`Zuordnung fehlgeschlagen: ${error.message}`);
      return;
    }
    toast.success("Athleten-Zuordnung aktualisiert.");
    await loadRunData(teamId, runId, dataMode);
  };

  const createEvidenceLock = async () => {
    if (!runId) return;
    if (!window.confirm("Aktuellen Evidence-Stand unveränderlich sperren? Spätere Änderungen erzeugen einen neuen Data Lock.")) return;
    setAction("evidence-lock");
    const { data, error } = await supabase.rpc("create_evidence_data_lock", {
      _program_run_id: runId,
      _sport_category: undefined,
      _sport_level: undefined,
      _include_test: false,
      _protocol_version: "56d-transfer-v2-2026-07",
    });
    setAction(null);
    if (error) {
      toast.error(`Data Lock konnte nicht erstellt werden: ${error.message}`);
      return;
    }
    const created = jsonRecord<EvidenceDataLockResult>(data);
    setEvidenceLock(created);
    toast.success("Evidence Data Lock erstellt und prüfsummenbelegt.");
  };

  const setRunStatus = async (status: "completed" | "archived") => {
    if (!runId) return;
    const prompt = status === "completed"
      ? "Program Run abschließen? Aktive Spielerinstanzen dieses Runs werden ebenfalls abgeschlossen."
      : "Program Run archivieren?";
    if (!window.confirm(prompt)) return;
    setAction(status);
    const { error } = await supabase.rpc("set_team_program_run_status", {
      _program_run_id: runId,
      _status: status,
    });
    setAction(null);
    if (error) {
      toast.error(`Statusänderung fehlgeschlagen: ${error.message}`);
      return;
    }
    toast.success(status === "completed" ? "Program Run abgeschlossen." : "Program Run archiviert.");
    await loadRunData(teamId, runId, dataMode);
  };

  const exportLockedDossier = () => {
    if (!evidenceLock || !selectedRun) return;
    const prefix = `nlz_${selectedRun.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
    downloadBlob(
      `${prefix}_locked_evidence.json`,
      JSON.stringify(evidenceLock, null, 2),
      "application/json",
    );
  };

  const exportLockedCsvPackage = () => {
    if (!evidenceLock || !selectedRun) return;
    const prefix = `nlz_${selectedRun.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
    const evidence = evidenceLock.evidence;
    downloadCsv(`${prefix}_summary.csv`, [{ ...evidence.sample, ...evidence.usage }]);
    downloadCsv(`${prefix}_data_quality.csv`, [evidence.data_quality]);
    downloadCsv(`${prefix}_weekly_trends.csv`, evidence.team_pulse.weekly);
    downloadCsv(`${prefix}_assessment_aggregates.csv`, [
      ...evidence.outcomes.validated_pre_post,
      ...evidence.outcomes.validated_pre_mid,
    ]);
    downloadCsv(`${prefix}_transfer_coverage.csv`, [{
      ...evidence.transfer_evidence.sample,
      ...evidence.transfer_evidence.coverage,
    } as Record<string, unknown>]);
    downloadCsv(`${prefix}_transfer_domains.csv`, evidence.transfer_evidence.domain_aggregates as Record<string, unknown>[]);
    downloadCsv(`${prefix}_coach_team.csv`, evidence.transfer_evidence.coach_team_observations as Record<string, unknown>[]);
  };

  if (loading && teams.length === 0) {
    return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-xl">NLZ Pilotzentrale</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">
                Operativer Startstatus pro Mannschaftslauf. Keine privaten Texte oder psychologischen Einzelwerte.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex border border-border p-1" role="group" aria-label="Datenmodus">
                <Button
                  variant={dataMode === "production" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => void changeDataMode("production")}
                  aria-pressed={dataMode === "production"}
                >
                  <Database className="mr-2 h-4 w-4" />Production
                </Button>
                <Button
                  variant={dataMode === "qa" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => void changeDataMode("qa")}
                  aria-pressed={dataMode === "qa"}
                >
                  <FlaskConical className="mr-2 h-4 w-4" />QA
                </Button>
              </div>
              <Button variant="outline" size="icon" onClick={() => teamId && loadRunData(teamId, runId, dataMode)} disabled={loading || !teamId} title="Neu laden">
                <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 md:grid-cols-2">
            <Select value={teamId} onValueChange={changeTeam} disabled={visibleTeams.length === 0}>
              <SelectTrigger><SelectValue placeholder="Team wählen" /></SelectTrigger>
              <SelectContent>
                {visibleTeams.map((team) => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={runId} onValueChange={changeRun} disabled={runs.length === 0}>
              <SelectTrigger><SelectValue placeholder="Noch kein Program Run" /></SelectTrigger>
              <SelectContent>
                {runs.map((run) => <SelectItem key={run.id} value={run.id}>{run.name} · {run.status}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {dataMode === "production" ? (
            <div className="grid gap-3 border-t border-border pt-5 md:grid-cols-[1fr_170px_auto]">
              <Input value={newRunName} onChange={(event) => setNewRunName(event.target.value)} placeholder="z. B. U17 Pilot Herbst 2026" />
              <Input type="date" value={newRunStart} onChange={(event) => setNewRunStart(event.target.value)} />
              <Button onClick={createRun} disabled={action !== null || !teamId}>
                {action === "create" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Run planen
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">QA-Modus ist schreibgeschützt</p>
                <p className="mt-1 text-xs text-muted-foreground">Keine Production-Snapshots oder Standardexporte. Zeitsteuerung erfolgt im QA Test Lab.</p>
              </div>
              <Button variant="outline" asChild>
                <a href="/admin/qa"><FlaskConical className="mr-2 h-4 w-4" />QA Test Lab</a>
              </Button>
            </div>
          )}

          {selectedRun && dataMode === "production" ? (
            <div className="flex flex-wrap gap-2 border-t border-border pt-5">
              <Badge variant="outline">{selectedRun.status}</Badge>
              <Badge variant="outline">Start {selectedRun.started_at ?? "offen"}</Badge>
              {selectedRun.status === "planned" ? (
                <Button onClick={activateAndAssign} disabled={action !== null}>
                  {action === "activate" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                  Aktivieren & zuordnen
                </Button>
              ) : null}
              {selectedRun.status === "active" ? (
                <>
                  <Button variant="outline" onClick={reassign} disabled={action !== null}>
                    <Users className="mr-2 h-4 w-4" />Zuordnung aktualisieren
                  </Button>
                  <Button variant="outline" onClick={() => setRunStatus("completed")} disabled={action !== null}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />Run abschließen
                  </Button>
                </>
              ) : null}
              {selectedRun.status === "planned" || selectedRun.status === "completed" ? (
                <Button variant="ghost" onClick={() => setRunStatus("archived")} disabled={action !== null}>
                  <Archive className="mr-2 h-4 w-4" />Archivieren
                </Button>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {dataMode === "qa" ? (
        selectedRun ? (
          <Card>
            <CardContent className="p-5 md:p-6">
              <QaEvidenceParityPanel programRunId={selectedRun.id} refreshToken={selectedRun.updated_at} />
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-lg border border-border p-6 text-sm text-muted-foreground">
            Noch keine aktive QA-Kohorte vorhanden. Erstelle sie im QA Test Lab.
          </div>
        )
      ) : readiness ? (
        <>
          <div className={`rounded-lg border p-5 ${statusStyle[readiness.status]}`}>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  {readiness.status === "GREEN" ? <ShieldCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
                  <p className="text-xs font-semibold uppercase">{readiness.status}</p>
                </div>
                <h3 className="mt-2 text-xl font-semibold">{readiness.status_label}</h3>
                <p className="mt-2 text-xs opacity-80">Stand {new Date(readiness.generated_at).toLocaleString("de-DE")}</p>
              </div>
              <Badge variant="outline">{readiness.privacy_level}</Badge>
            </div>
            {readiness.blockers.length > 0 ? (
              <div className="mt-4 space-y-1 text-sm">{readiness.blockers.map((message) => <p key={message}>• {message}</p>)}</div>
            ) : null}
            {readiness.warnings.length > 0 ? (
              <div className="mt-4 border-t border-current/20 pt-3 space-y-1 text-xs opacity-90">{readiness.warnings.map((message) => <p key={message}>• {message}</p>)}</div>
            ) : null}
          </div>

          <Card>
            <CardContent className="p-5 md:p-6">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <Metric label="Athleten" value={readiness.setup.athletes} detail={`${readiness.setup.coaches} Coach(es)`} />
                <Metric label="Run-Zuordnung" value={`${readiness.activation.with_program_run_id}/${readiness.setup.athletes}`} />
                <Metric label="Consent" value={formatPercent(readiness.consent.rate)} detail={`${readiness.consent.null} offen`} />
                <Metric label="Aggregate" value={readiness.data_quality.aggregate_visible ? "sichtbar" : "gesperrt"} detail={readiness.data_quality.low_confidence ? "Low Confidence" : "n-Grenze geprüft"} />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CalendarCheck className="h-4 w-4 text-primary" />Pre-Messung</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-5">
                <Metric label="Validiert" value={`${readiness.pre_measurement.validated_complete}/${readiness.setup.athletes}`} />
                <Metric label="Development" value={`${readiness.pre_measurement.development_index_complete}/${readiness.setup.athletes}`} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4 text-primary" />Nutzung</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-5">
                <Metric label="Check-ins heute" value={readiness.daily_tracking.checkins_today} />
                <Metric label="7 Tage aktiv" value={readiness.daily_tracking.active_7d} />
                <Metric label="Day 1" value={readiness.daily_tracking.day_1_completed} />
                <Metric label="Ø Completion" value={formatPercent(readiness.daily_tracking.avg_completion_rate)} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Database className="h-4 w-4 text-primary" />Datenintegrität</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {Object.entries(readiness.data_quality)
                  .filter(([, value]) => typeof value === "number")
                  .slice(0, 8)
                  .map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between gap-3 border-b border-border/50 pb-2">
                      <span className="text-xs text-muted-foreground">{key.replaceAll("_", " ")}</span>
                      <span className="font-medium">{String(value)}</span>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>

          {performanceEvidence ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">56-Tage Transfer-Coverage</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
                <Metric
                  label="Erwartet"
                  value={jsonNumber(performanceEvidence.coverage.expected_transfer_observations) ?? "-"}
                />
                <Metric
                  label="Erhoben"
                  value={jsonNumber(performanceEvidence.coverage.collected_transfer_observations) ?? "-"}
                />
                <Metric
                  label="Fehlend"
                  value={jsonNumber(performanceEvidence.coverage.missing_transfer_observations) ?? "-"}
                />
                <Metric
                  label="Coverage"
                  value={formatPercent(jsonNumber(performanceEvidence.coverage.transfer_completion_rate))}
                />
                <Metric
                  label="Ruhetag-Skips"
                  value={jsonNumber(performanceEvidence.coverage.rest_day_pulses_skipped) ?? "-"}
                  detail="bewusst nicht erhoben"
                />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader><CardTitle className="text-base">Fehlende Zuordnungen und Messungen</CardTitle></CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-3">
              <MissingList title="Programminstanz" players={readiness.missing_players.program_instance} />
              <MissingList title="Validierte Pre-Messung" players={readiness.missing_players.validated_pre} />
              <MissingList title="Development Index Pre" players={readiness.missing_players.development_pre} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Run-spezifisches Evidence-Paket</CardTitle>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Exporte werden erst aus einem unveränderlichen, prüfsummenbelegten Data Lock freigegeben.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button onClick={createEvidenceLock} disabled={!dossier || !performanceEvidence || action !== null}>
                  {action === "evidence-lock" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Data Lock erstellen
                </Button>
                <Button variant="outline" onClick={exportLockedDossier} disabled={!evidenceLock}>
                  <Download className="mr-2 h-4 w-4" />Gesperrtes JSON
                </Button>
                <Button variant="outline" onClick={exportLockedCsvPackage} disabled={!evidenceLock}>
                  <Download className="mr-2 h-4 w-4" />Gesperrtes CSV-Paket
                </Button>
                {dossier ? <Badge variant="outline"><CheckCircle2 className="mr-1 h-3 w-3" />Privacy-Filter aktiv</Badge> : null}
              </div>
              {evidenceLock ? (
                <div className="min-w-0 border-l-2 border-primary pl-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">Data Lock {evidenceLock.lock_id.slice(0, 8)}</p>
                  <p className="mt-1 break-all">SHA-256 {evidenceLock.content_checksum}</p>
                  <p className="mt-1">Schema {evidenceLock.evidence.schema_version}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="rounded-lg border border-border p-6 text-sm text-muted-foreground">
          Für dieses Team liegt noch kein auswertbarer Pilotstatus vor.
        </div>
      )}
    </div>
  );
};

export default NlzPilotReadiness;
