import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, RefreshCcw, AlertTriangle, ShieldCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Textarea } from "@/components/ui/textarea";
import AdminDayBrowser from "@/components/admin/AdminDayBrowser";

type Overview = {
  total_users: number; total_athletes: number; total_coaches: number; total_admins: number;
  total_teams: number; active_teams: number; total_completed_days: number;
  total_checkins: number; total_assessments: number; total_comprehension: number;
  avg_adherence: number | null; avg_comprehension_score: number | null;
};

type TeamRow = {
  id: string; name: string; sport: string | null; coach_name: string | null;
  created_by: string | null; program_start_date: string | null;
  member_count: number; athlete_count: number;
  pre_n: number; mid_n: number; post_n: number;
  avg_completion: number | null; avg_days_completed: number | null;
  evidence_status: "not_enough_data" | "pre_partial" | "pre_only" | "mid_available" | "full_pre_post";
};

type Health = {
  users_missing_profile: number; users_missing_role: number;
  athletes_without_program_instance: number; teams_below_min_n: number;
  assessments_missing_instance: number; completions_missing_instance: number;
  checkins_missing_instance: number; teams_without_evidence: number;
};

type PresentationMetrics = {
  generated_at: string;
  include_test: boolean;
  privacy_level: string;
  claim_boundary: string;
  summary: Record<string, number | null>;
  activity: Record<string, number | null>;
  evidence_readiness: Record<string, number | null>;
  presentation_kpis: Array<{ label: string; value: number | null; type: "count" | "rate" }>;
  team_summaries: Array<Record<string, unknown>>;
  export_catalog: string[];
  privacy_exclusions: string[];
};

type StudyOverview = {
  generated_at: string;
  include_test: boolean;
  privacy_level: string;
  claim_boundary: string;
  summary: Record<string, number | boolean | null>;
  activation: Record<string, number | null>;
  activity: Record<string, number | null>;
  measurement_readiness: Record<string, number | boolean | null>;
  data_quality: Record<string, number | boolean | null>;
  cohort_summaries: Array<Record<string, unknown>>;
  team_summaries: Array<Record<string, unknown>>;
  measurement_windows: Array<Record<string, unknown>>;
  export_catalog: string[];
  privacy_exclusions: string[];
};

type FeedbackRow = {
  id: string; created_at: string; type: string; message: string;
  user_id: string; status: string; admin_note: string | null; reviewed_at: string | null;
};

const evidenceLabel: Record<TeamRow["evidence_status"], string> = {
  not_enough_data: "Zu wenig Daten",
  pre_partial: "Pre (unvollständig)",
  pre_only: "Pre verfügbar",
  mid_available: "Mid verfügbar",
  full_pre_post: "Pre/Post bereit",
};

const evidenceVariant: Record<TeamRow["evidence_status"], "secondary" | "default" | "outline"> = {
  not_enough_data: "outline",
  pre_partial: "outline",
  pre_only: "secondary",
  mid_available: "secondary",
  full_pre_post: "default",
};

function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) {
    toast({ title: "Keine Daten zum Export." });
    return;
  }
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
        <div className="text-2xl font-semibold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value ?? "–"}</span>
    </div>
  );
}

const formatPercent = (value: number | null) => {
  if (value == null || !Number.isFinite(value)) return "–";
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
};

const Admin = () => {
  const { role, loading: authLoading, user } = useAuth();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [presentation, setPresentation] = useState<PresentationMetrics | null>(null);
  const [study, setStudy] = useState<StudyOverview | null>(null);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});

  const isAdmin = role === "admin";

  const loadAll = async () => {
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const [ov, ts, hl, pm, st, fb] = await Promise.all([
      sb.rpc("get_admin_overview_stats", { include_test: false }),
      sb.rpc("get_admin_teams_summary", { include_test: false }),
      sb.rpc("get_admin_system_health"),
      sb.rpc("get_admin_presentation_metrics", { include_test: false }),
      sb.rpc("get_admin_study_overview", { include_test: false }),
      sb.from("feedback").select("*").order("created_at", { ascending: false }),
    ]);
    if (ov.data) setOverview(ov.data as Overview);
    if (ts.data) setTeams(ts.data as TeamRow[]);
    if (hl.data) setHealth(hl.data as Health);
    if (pm.data) setPresentation(pm.data as PresentationMetrics);
    if (st.data) setStudy(st.data as StudyOverview);
    if (!fb.error && fb.data) setFeedback(fb.data as FeedbackRow[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && isAdmin) loadAll();
    else if (!authLoading) setLoading(false);
  }, [authLoading, isAdmin]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Kein Zugriff</CardTitle>
            <CardDescription>
              Diese Seite ist nur für Admin-Konten verfügbar.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const updateFeedback = async (id: string, status: string) => {
    const note = noteDraft[id];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc("update_feedback_status", {
      feedback_id: id, new_status: status, new_note: note ?? null,
    });
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Aktualisiert" });
    loadAll();
  };

  const createStudySnapshot = async () => {
    setSnapshotLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc("create_study_aggregate_snapshot", {
      _cohort_id: null,
      include_test: false,
    });
    setSnapshotLoading(false);
    if (error) {
      toast({ title: "Snapshot konnte nicht erstellt werden", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Study-Snapshot erstellt", description: "Manifest und aggregierter Snapshot wurden gespeichert." });
    loadAll();
  };

  const studyExportManifest = study ? {
    generated_at: new Date().toISOString(),
    source_generated_at: study.generated_at,
    export_type: "launch_study_v1",
    privacy_level: study.privacy_level,
    claim_boundary: study.claim_boundary,
    included_exports: study.export_catalog,
    privacy_exclusions: study.privacy_exclusions,
  } : null;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Admin Control Center</h1>
            <p className="text-sm text-muted-foreground">
              Aggregierte Programm- und Systemdaten. Keine Kausalaussage ohne Kontrollgruppe.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a href="/admin/content">
              <Button variant="outline" size="sm">
                📚 Content offline
              </Button>
            </a>
            <a href="/admin/qa">
              <Button variant="outline" size="sm">
                🧪 QA Test Lab
              </Button>
            </a>
            <Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>
              <RefreshCcw className="w-4 h-4 mr-2" />Neu laden
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="grid grid-cols-3 md:grid-cols-9 w-full">
            <TabsTrigger value="overview">Übersicht</TabsTrigger>
            <TabsTrigger value="days">Tage</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="evidence">Wirksamkeit</TabsTrigger>
            <TabsTrigger value="presentation">Präsentation</TabsTrigger>
            <TabsTrigger value="study">Study</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
            <TabsTrigger value="exports">Exporte</TabsTrigger>
            <TabsTrigger value="health">Systemstatus</TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            {loading || !overview ? (
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Nutzer gesamt" value={overview.total_users} />
                <StatCard label="Athleten" value={overview.total_athletes} />
                <StatCard label="Coaches" value={overview.total_coaches} />
                <StatCard label="Teams" value={overview.total_teams} />
                <StatCard label="Aktive Teams" value={overview.active_teams} />
                <StatCard label="Abgeschlossene Tage" value={overview.total_completed_days} />
                <StatCard label="Check-ins" value={overview.total_checkins} />
                <StatCard label="Assessments" value={overview.total_assessments} />
                <StatCard label="Comprehension Checks" value={overview.total_comprehension} />
                <StatCard
                  label="Ø Adherence"
                  value={formatPercent(overview.avg_adherence)}
                />
                <StatCard
                  label="Ø Comprehension"
                  value={formatPercent(overview.avg_comprehension_score)}
                />
                <StatCard label="Admins" value={overview.total_admins} />
              </div>
            )}
          </TabsContent>

          {/* DAYS — Spieler-Vorschau jedes Programmtags */}
          <TabsContent value="days" className="mt-4">
            <AdminDayBrowser />
          </TabsContent>

          {/* TEAMS */}
          <TabsContent value="teams" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Teams</CardTitle>
                <CardDescription>Aggregierte Teamdaten – keine individuellen Spielerdaten.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Team</TableHead>
                          <TableHead>Sport</TableHead>
                          <TableHead>Coach</TableHead>
                          <TableHead className="text-right">Mitglieder</TableHead>
                          <TableHead className="text-right">Athleten</TableHead>
                          <TableHead className="text-right">Pre/Mid/Post</TableHead>
                          <TableHead className="text-right">Ø Adherence</TableHead>
                          <TableHead>Wirksamkeit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teams.map((t) => (
                          <TableRow key={t.id}>
                            <TableCell className="font-medium">{t.name}</TableCell>
                            <TableCell>{t.sport ?? "–"}</TableCell>
                            <TableCell>{t.coach_name ?? "–"}</TableCell>
                            <TableCell className="text-right">{t.member_count}</TableCell>
                            <TableCell className="text-right">{t.athlete_count}</TableCell>
                            <TableCell className="text-right">{t.pre_n}/{t.mid_n}/{t.post_n}</TableCell>
                            <TableCell className="text-right">
                              {t.avg_completion != null ? `${Math.round(t.avg_completion * 100)}%` : "–"}
                            </TableCell>
                            <TableCell>
                              <Badge variant={evidenceVariant[t.evidence_status]}>
                                {evidenceLabel[t.evidence_status]}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        {!teams.length && (
                          <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Keine Teams.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* EVIDENCE */}
          <TabsContent value="evidence" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Wirksamkeit (aggregiert)</CardTitle>
                <CardDescription>
                  Beobachtete Veränderung während des Programms. Keine Kausalaussage ohne Kontrollgruppe.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard label="Teams mit Daten" value={teams.filter(t => t.evidence_status === "full_pre_post" || t.evidence_status === "mid_available").length} />
                  <StatCard label="Teams ohne genug Daten" value={teams.filter(t => t.evidence_status === "not_enough_data" || t.evidence_status === "pre_partial").length} />
                  <StatCard label="Athleten mit Pre" value={teams.reduce((s, t) => s + t.pre_n, 0)} />
                  <StatCard label="Athleten mit Post" value={teams.reduce((s, t) => s + t.post_n, 0)} />
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Adherence pro Team</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer>
                      <BarChart data={teams.map(t => ({ name: t.name, adherence: t.avg_completion ? Math.round(t.avg_completion * 100) : 0 }))}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} unit="%" />
                        <Tooltip />
                        <Bar dataKey="adherence" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Pre / Mid / Post pro Team</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer>
                      <BarChart data={teams.map(t => ({ name: t.name, pre: t.pre_n, mid: t.mid_n, post: t.post_n }))}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="pre" fill="hsl(var(--muted-foreground))" />
                        <Bar dataKey="mid" fill="hsl(var(--secondary))" />
                        <Bar dataKey="post" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Hinweis: Aggregierte Teamdaten. Veränderungen sind beobachtet, nicht kausal.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PRESENTATION DATA */}
          <TabsContent value="presentation" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Präsentationsdaten</CardTitle>
                <CardDescription>
                  Aggregierte Nutzungs- und Fortschrittsdaten für interne Evaluation, Vereinspräsentationen und Launch-Review.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {loading || !presentation ? (
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                ) : (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                      {presentation.presentation_kpis.map((kpi) => (
                        <StatCard
                          key={kpi.label}
                          label={kpi.label}
                          value={kpi.type === "rate" && typeof kpi.value === "number" ? formatPercent(kpi.value) : kpi.value ?? "–"}
                        />
                      ))}
                    </div>

                    <div className="grid md:grid-cols-3 gap-3">
                      <div className="rounded-lg border border-border/60 p-4">
                        <h3 className="text-sm font-medium mb-3">Activity</h3>
                        <div className="space-y-2 text-sm">
                          <Row label="Aktive Nutzer 7 Tage" value={presentation.activity.active_users_7d} />
                          <Row label="Journals (nur Anzahl)" value={presentation.activity.journal_entries_total} />
                          <Row label="Ø Streak" value={presentation.activity.avg_current_streak} />
                          <Row label="Ø Verständnis" value={formatPercent(presentation.activity.avg_comprehension)} />
                        </div>
                      </div>
                      <div className="rounded-lg border border-border/60 p-4">
                        <h3 className="text-sm font-medium mb-3">Evidence Readiness</h3>
                        <div className="space-y-2 text-sm">
                          <Row label="Teams n ≥ 5" value={presentation.evidence_readiness.teams_with_min_5_athletes} />
                          <Row label="Pre n ≥ 5" value={presentation.evidence_readiness.teams_with_pre_n_5} />
                          <Row label="Mid n ≥ 5" value={presentation.evidence_readiness.teams_with_mid_n_5} />
                          <Row label="Pre/Post n ≥ 5" value={presentation.evidence_readiness.teams_with_pre_post_n_5} />
                        </div>
                      </div>
                      <div className="rounded-lg border border-border/60 p-4">
                        <h3 className="text-sm font-medium mb-3">Privacy Boundary</h3>
                        <div className="space-y-2">
                          <Badge variant="outline">{presentation.privacy_level}</Badge>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {presentation.claim_boundary}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() => downloadJson("presentation_metrics.json", presentation)}
                      >
                        <Download className="w-4 h-4 mr-2" />Präsentationspaket JSON
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => downloadCsv("presentation_team_summaries.csv", presentation.team_summaries)}
                      >
                        <Download className="w-4 h-4 mr-2" />Team Summaries CSV
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => downloadCsv("presentation_kpis.csv", presentation.presentation_kpis.map((kpi) => ({ ...kpi })))}
                      >
                        <Download className="w-4 h-4 mr-2" />KPI CSV
                      </Button>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Ausgeschlossen: {presentation.privacy_exclusions.join(", ")}.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* STUDY / EVIDENCE */}
          <TabsContent value="study" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <CardTitle>Study / Evidence</CardTitle>
                    <CardDescription>
                      Interne Programmevaluation mit Kohorten-, Nutzungs- und Entwicklungsaggregaten. Keine Diagnose, keine Kausalaussage ohne Kontrollgruppe.
                    </CardDescription>
                  </div>
                  <Button variant="outline" onClick={createStudySnapshot} disabled={snapshotLoading || loading || !study}>
                    {snapshotLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                    Snapshot speichern
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {loading || !study ? (
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                ) : (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
                      <StatCard label="Athleten" value={study.summary.athletes_total as number ?? 0} />
                      <StatCard label="Aktivierung" value={formatPercent(study.activation.activation_rate)} />
                      <StatCard label="Day 1" value={formatPercent(study.activation.day_1_rate)} />
                      <StatCard label="7d aktiv" value={formatPercent(study.activation.active_7d_rate)} />
                      <StatCard label="28d aktiv" value={formatPercent(study.activation.active_28d_rate)} />
                      <StatCard label="56 Tage" value={formatPercent(study.activation.day_56_completion_rate)} />
                    </div>

                    <div className="grid md:grid-cols-3 gap-3">
                      <div className="rounded-lg border border-border/60 p-4">
                        <h3 className="text-sm font-medium mb-3">Programmaktivität</h3>
                        <div className="space-y-2 text-sm">
                          <Row label="Abgeschlossene Tage" value={study.activity.completed_days_total} />
                          <Row label="Check-ins" value={study.activity.checkins_total} />
                          <Row label="Verständnis-Checks" value={study.activity.comprehension_checks_total} />
                          <Row label="Journals (nur Anzahl)" value={study.activity.journal_entries_count_only} />
                          <Row label="Ø Completion" value={formatPercent(study.activity.avg_completion_rate)} />
                        </div>
                      </div>
                      <div className="rounded-lg border border-border/60 p-4">
                        <h3 className="text-sm font-medium mb-3">Messfenster-Readiness</h3>
                        <div className="space-y-2 text-sm">
                          <Row label="Validated Pre n" value={study.measurement_readiness.validated_assessments_pre_n as number} />
                          <Row label="Validated Mid n" value={study.measurement_readiness.validated_assessments_mid_n as number} />
                          <Row label="Validated Post n" value={study.measurement_readiness.validated_assessments_post_n as number} />
                          <Row label="Development Index Pre n" value={study.measurement_readiness.development_index_pre_n as number} />
                          <Row label="Development Index Post n" value={study.measurement_readiness.development_index_post_n as number} />
                        </div>
                      </div>
                      <div className="rounded-lg border border-border/60 p-4">
                        <h3 className="text-sm font-medium mb-3">Datenqualität & Privacy</h3>
                        <div className="space-y-2 text-sm">
                          <Row label="Ohne Programmlauf" value={study.data_quality.athletes_without_program_instance as number} />
                          <Row label="Ohne Day 1" value={study.data_quality.athletes_without_day_1 as number} />
                          <Row label="Ohne Pre" value={study.data_quality.athletes_without_pre_assessment as number} />
                          <Row label="Low confidence" value={study.data_quality.low_confidence ? "ja" : "nein"} />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border/60 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <h3 className="text-sm font-medium">Kohorten</h3>
                          <p className="text-xs text-muted-foreground">QA, Demo, Pilot und Production bleiben getrennt. Sensible Aggregate erst ab n ≥ 5.</p>
                        </div>
                        <Badge variant="outline">{study.privacy_level}</Badge>
                      </div>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Kohorte</TableHead>
                              <TableHead>Typ</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">n</TableHead>
                              <TableHead>Aggregate</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {study.cohort_summaries.map((cohort, index) => (
                              <TableRow key={String(cohort.id ?? index)}>
                                <TableCell className="font-medium">{String(cohort.name ?? "–")}</TableCell>
                                <TableCell>{String(cohort.cohort_type ?? "–")}</TableCell>
                                <TableCell>{String(cohort.status ?? "–")}</TableCell>
                                <TableCell className="text-right">{String(cohort.participant_count ?? 0)}</TableCell>
                                <TableCell>
                                  <Badge variant={cohort.aggregate_visible ? "default" : "outline"}>
                                    {cohort.aggregate_visible ? "sichtbar" : "n < 5"}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                            {!study.cohort_summaries.length && (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                                  Noch keine expliziten Study-Kohorten angelegt. Die Live-Produktionsmetriken oben bleiben trotzdem auswertbar.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={() => downloadJson("study_summary.json", study)}>
                        <Download className="w-4 h-4 mr-2" />study_summary.json
                      </Button>
                      <Button variant="outline" onClick={() => downloadCsv("cohort_metrics.csv", study.team_summaries)}>
                        <Download className="w-4 h-4 mr-2" />cohort_metrics.csv
                      </Button>
                      <Button variant="outline" onClick={() => downloadCsv("measurement_windows.csv", study.measurement_windows)}>
                        <Download className="w-4 h-4 mr-2" />measurement_windows.csv
                      </Button>
                      <Button variant="outline" onClick={() => downloadCsv("data_quality.csv", [study.data_quality])}>
                        <Download className="w-4 h-4 mr-2" />data_quality.csv
                      </Button>
                      <Button variant="outline" disabled={!studyExportManifest} onClick={() => studyExportManifest && downloadJson("export_manifest.json", studyExportManifest)}>
                        <Download className="w-4 h-4 mr-2" />export_manifest.json
                      </Button>
                    </div>

                    <div className="rounded-lg border border-border/60 p-4">
                      <h3 className="text-sm font-medium mb-2">Claim Boundary</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{study.claim_boundary}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Ausgeschlossen: {study.privacy_exclusions.join(", ")}.
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* FEEDBACK */}
          <TabsContent value="feedback" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Feedback / Support</CardTitle>
                <CardDescription>Eingereichte Nachrichten von Nutzern.</CardDescription>
              </CardHeader>
              <CardContent>
                {feedback.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">Kein Feedback vorhanden.</p>
                ) : (
                  <div className="space-y-3">
                    {feedback.map((f) => (
                      <div key={f.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{f.type}</Badge>
                            <Badge variant={f.status === "resolved" ? "default" : f.status === "reviewed" ? "secondary" : "outline"}>
                              {f.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(f.created_at).toLocaleString("de-DE")}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{f.message}</p>
                        <Textarea
                          placeholder="Interne Admin-Notiz…"
                          defaultValue={f.admin_note ?? ""}
                          onChange={(e) => setNoteDraft((d) => ({ ...d, [f.id]: e.target.value }))}
                          className="text-xs"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => updateFeedback(f.id, "reviewed")}>
                            Als gesichtet
                          </Button>
                          <Button size="sm" onClick={() => updateFeedback(f.id, "resolved")}>
                            Erledigt
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* EXPORTS */}
          <TabsContent value="exports" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Exporte (anonymisiert)</CardTitle>
                <CardDescription>
                  CSV-Exporte enthalten ausschließlich aggregierte/anonymisierte Daten. Keine Journale, keine freien Reflexionen.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2 md:grid-cols-2">
                  <Button variant="outline" onClick={() => downloadCsv("teams_summary.csv",
                    teams.map(t => ({
                      team: t.name, sport: t.sport, coach: t.coach_name,
                      members: t.member_count, athletes: t.athlete_count,
                      pre_n: t.pre_n, mid_n: t.mid_n, post_n: t.post_n,
                      avg_adherence: t.avg_completion, avg_days_completed: t.avg_days_completed,
                      evidence_status: t.evidence_status,
                    }))
                  )}>
                    <Download className="w-4 h-4 mr-2" />Teams-Übersicht
                  </Button>
                  <Button variant="outline" onClick={() => downloadCsv("evidence_aggregate.csv",
                    teams.map(t => ({
                      team: t.name, athletes: t.athlete_count,
                      pre_n: t.pre_n, mid_n: t.mid_n, post_n: t.post_n,
                      evidence_status: t.evidence_status,
                    }))
                  )}>
                    <Download className="w-4 h-4 mr-2" />Wirksamkeit aggregiert
                  </Button>
                  <Button variant="outline" onClick={() => downloadCsv("adherence.csv",
                    teams.map(t => ({
                      team: t.name, athletes: t.athlete_count,
                      avg_completion_rate: t.avg_completion,
                      avg_days_completed: t.avg_days_completed,
                    }))
                  )}>
                    <Download className="w-4 h-4 mr-2" />Adherence
                  </Button>
                  <Button variant="outline" onClick={() => downloadCsv("assessments_aggregate.csv",
                    teams.map(t => ({
                      team: t.name, pre_n: t.pre_n, mid_n: t.mid_n, post_n: t.post_n,
                    }))
                  )}>
                    <Download className="w-4 h-4 mr-2" />Assessments aggregiert
                  </Button>
                  <Button variant="outline" disabled={!presentation} onClick={() => presentation && downloadCsv("program_progress.csv",
                    presentation.team_summaries.map(t => ({
                      team: t.team,
                      sport: t.sport,
                      athlete_count: t.athlete_count,
                      avg_completion_rate: t.avg_completion_rate,
                      avg_days_completed: t.avg_days_completed,
                      avg_days_available: t.avg_days_available,
                      avg_current_streak: t.avg_current_streak,
                    }))
                  )}>
                    <Download className="w-4 h-4 mr-2" />Program Progress
                  </Button>
                  <Button variant="outline" disabled={!presentation} onClick={() => presentation && downloadCsv("checkin_activity.csv",
                    presentation.team_summaries.map(t => ({
                      team: t.team,
                      athlete_count: t.athlete_count,
                      checkins: t.checkins,
                      completed_days: t.completed_days,
                      journal_entries_count_only: t.journal_entries_count_only,
                    }))
                  )}>
                    <Download className="w-4 h-4 mr-2" />Check-in Aktivität
                  </Button>
                  <Button variant="outline" disabled={!presentation} onClick={() => presentation && downloadCsv("comprehension_summary.csv",
                    presentation.team_summaries.map(t => ({
                      team: t.team,
                      athlete_count: t.athlete_count,
                      comprehension_checks: t.comprehension_checks,
                      avg_comprehension: t.avg_comprehension,
                    }))
                  )}>
                    <Download className="w-4 h-4 mr-2" />Verständnis
                  </Button>
                  <Button variant="outline" disabled={!health} onClick={() => health && downloadCsv("system_health.csv", [health as unknown as Record<string, unknown>])}>
                    <Download className="w-4 h-4 mr-2" />System Health
                  </Button>
                  <Button variant="outline" disabled={!presentation} onClick={() => presentation && downloadJson("presentation_metrics.json", presentation)}>
                    <Download className="w-4 h-4 mr-2" />Presentation JSON
                  </Button>
                  <Button variant="outline" disabled={!study} onClick={() => study && downloadJson("study_summary.json", study)}>
                    <Download className="w-4 h-4 mr-2" />Study Summary
                  </Button>
                  <Button variant="outline" disabled={!study} onClick={() => study && downloadCsv("cohort_metrics.csv", study.team_summaries)}>
                    <Download className="w-4 h-4 mr-2" />Study Cohort Metrics
                  </Button>
                  <Button variant="outline" disabled={!study} onClick={() => study && downloadCsv("data_quality.csv", [study.data_quality])}>
                    <Download className="w-4 h-4 mr-2" />Study Data Quality
                  </Button>
                  <Button variant="outline" onClick={() => downloadCsv("feedback.csv",
                    feedback.map(f => ({
                      created_at: f.created_at, type: f.type, status: f.status,
                      message: f.message, admin_note: f.admin_note,
                    }))
                  )}>
                    <Download className="w-4 h-4 mr-2" />Feedback
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground pt-2">
                  Exporte enthalten keine individuellen Mood/Energy-Verläufe, keine Assessment-Antworten und keine Reflexionen.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* HEALTH */}
          <TabsContent value="health" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Systemstatus</CardTitle>
                <CardDescription>Datenqualität und operationelle Hinweise.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading || !health ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard label="Nutzer ohne Profil" value={health.users_missing_profile} />
                    <StatCard label="Nutzer ohne Rolle" value={health.users_missing_role} />
                    <StatCard label="Athleten ohne aktiven Programmlauf" value={health.athletes_without_program_instance} />
                    <StatCard label="Teams < 5 Athleten" value={health.teams_below_min_n} />
                    <StatCard label="Assessments ohne Programmbezug" value={health.assessments_missing_instance} />
                    <StatCard label="Tagesabschlüsse ohne Programmbezug" value={health.completions_missing_instance} />
                    <StatCard label="Check-ins ohne Programmbezug" value={health.checkins_missing_instance} />
                    <StatCard label="Teams ohne Wirksamkeitsdaten" value={health.teams_without_evidence} />
                  </div>
                )}
                <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                  <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>Werte &gt; 0 deuten auf Inkonsistenzen hin, die vor einer Vereinspräsentation behoben werden sollten.</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
