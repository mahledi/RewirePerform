import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, RefreshCcw, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Textarea } from "@/components/ui/textarea";

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

const Admin = () => {
  const { role, loading: authLoading, user } = useAuth();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});

  const isAdmin = role === "admin";

  const loadAll = async () => {
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const [ov, ts, hl, fb] = await Promise.all([
      sb.rpc("get_admin_overview_stats"),
      sb.rpc("get_admin_teams_summary"),
      sb.rpc("get_admin_system_health"),
      sb.from("feedback").select("*").order("created_at", { ascending: false }),
    ]);
    if (ov.data) setOverview(ov.data as Overview);
    if (ts.data) setTeams(ts.data as TeamRow[]);
    if (hl.data) setHealth(hl.data as Health);
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
    const { error } = await supabase.rpc("update_feedback_status" as never, {
      feedback_id: id, new_status: status, new_note: note ?? null,
    } as never);
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Aktualisiert" });
    loadAll();
  };

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
          <Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>
            <RefreshCcw className="w-4 h-4 mr-2" />Neu laden
          </Button>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full">
            <TabsTrigger value="overview">Übersicht</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="evidence">Wirksamkeit</TabsTrigger>
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
                  value={overview.avg_adherence != null ? `${Math.round(overview.avg_adherence * 100)}%` : "–"}
                />
                <StatCard
                  label="Ø Comprehension"
                  value={overview.avg_comprehension_score != null ? `${Math.round(overview.avg_comprehension_score * 100)}%` : "–"}
                />
                <StatCard label="Admins" value={overview.total_admins} />
              </div>
            )}
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
