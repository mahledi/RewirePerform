import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Activity, ArrowLeft, Bot, Database, Loader2, RefreshCcw, Send, ShieldCheck, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminComprehensionInsights from "@/components/admin/AdminComprehensionInsights";
import AdminFeedbackStructuredInsights from "@/components/admin/AdminFeedbackStructuredInsights";
import { BrandSymbol } from "@/components/brand/BrandLogo";
import { buildJarvisAnswer, type JarvisAnswer, type JarvisReadModel } from "@/lib/adminJarvis";

type SourceState = { label: string; state: "CURRENT" | "FAILED" };

const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

const metric = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : "–";

const AdminJarvis = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, role, roleLoading, roleVerified } = useAuth();
  const [data, setData] = useState<JarvisReadModel>({ overview: null, teams: null, system: null, operations: null });
  const [sources, setSources] = useState<SourceState[]>([]);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<JarvisAnswer | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    // Existing fixed read-only Admin RPCs. No table read and no mutation.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = supabase as any;
    const results = await Promise.all([
      client.rpc("get_admin_overview_stats", { include_test: false }),
      client.rpc("get_admin_teams_summary", { include_test: false }),
      client.rpc("get_admin_system_health"),
      client.rpc("get_admin_ops_status", { include_test: false }),
    ]);
    const labels = ["Admin-Übersicht", "Teams & Aktivität", "Systemgesundheit", "Launch-Ops"];
    setSources(results.map((result, index) => ({ label: labels[index], state: result.error ? "FAILED" : "CURRENT" })));
    setData({
      overview: results[0].error ? null : record(results[0].data),
      teams: results[1].error || !Array.isArray(results[1].data) ? null : results[1].data,
      system: results[2].error ? null : record(results[2].data),
      operations: results[3].error ? null : record(results[3].data),
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading && roleVerified && role === "admin") void load();
  }, [authLoading, role, roleVerified, load]);

  const ask = () => {
    if (!question.trim()) return;
    setAnswer(buildJarvisAnswer(question, data));
  };

  const overviewMetrics = useMemo(() => [
    ["Athleten", metric(data.overview?.total_athletes), Users],
    ["Aktive Teams", metric(data.overview?.active_teams), ShieldCheck],
    ["Check-ins", metric(data.overview?.total_checkins), Activity],
    ["Programmtage", metric(data.overview?.total_completed_days), Database],
  ] as const, [data.overview]);

  if (authLoading || roleLoading || (user && !roleVerified)) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!user) return <Navigate to="/auth?mode=login" replace />;
  if (role !== "admin") return <Navigate to={role === "coach" ? "/coach" : "/dashboard"} replace />;

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <BrandSymbol size={40} />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Founder Intelligence</p>
              <h1 className="mt-1 font-heading text-3xl font-bold">Jarvis</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Deine Admin-Daten bereits strukturiert, verbunden und erklärbar – ohne Freitext und ohne bezahlten KI-Aufruf.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/admin")}><ArrowLeft className="mr-2 h-4 w-4" />Admin</Button>
            <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCcw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Aktualisieren</Button>
          </div>
        </header>

        <section className="overflow-hidden rounded-3xl border border-[#4b4338] bg-[radial-gradient(circle_at_top_right,rgba(213,190,156,0.18),transparent_38%),linear-gradient(145deg,#111210,#1b1915)] p-6 shadow-2xl shadow-black/20 sm:p-8">
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-[#d8c4a8] text-[#16130f] hover:bg-[#d8c4a8]">Read-only</Badge>
            <Badge variant="outline" className="border-[#6f6456] text-[#d8d0c4]">0 externe KI-Aufrufe</Badge>
            <Badge variant="outline" className="border-[#6f6456] text-[#d8d0c4]">Kein Freitext</Badge>
          </div>
          <h2 className="mt-5 max-w-3xl font-heading text-2xl font-semibold text-[#f4efe6] sm:text-4xl">Frag nicht nach Tabellen. Frag, was du entscheiden musst.</h2>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Input value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") ask(); }} placeholder="Zum Beispiel: Wie ist die Aktivität?" className="min-h-12 border-[#4b4338] bg-[#0d0e0c] text-[#f4efe6] placeholder:text-[#8e867b]" />
            <Button onClick={ask} className="min-h-12 bg-[#d8c4a8] text-[#16130f] hover:bg-[#cdb696]"><Send className="mr-2 h-4 w-4" />Frag Jarvis</Button>
          </div>
          {answer ? (
            <div className="mt-5 rounded-2xl border border-[#4b4338] bg-black/20 p-4" aria-live="polite">
              <div className="flex gap-3"><Bot className="mt-0.5 h-5 w-5 shrink-0 text-[#66d4b1]" /><div><p className="leading-relaxed text-[#f4efe6]">{answer.answer}</p><p className="mt-3 text-xs text-[#a9a095]">Quellen: {answer.sourceLabels.join(" · ")} · {answer.boundary}</p></div></div>
            </div>
          ) : null}
        </section>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {overviewMetrics.map(([label, value, Icon]) => <Card key={label}><CardContent className="flex items-center gap-3 p-4"><span className="rounded-xl bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></span><div><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-semibold">{value}</p></div></CardContent></Card>)}
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="h-auto w-full flex-wrap justify-start">
            <TabsTrigger value="overview">Überblick</TabsTrigger>
            <TabsTrigger value="feedback">Feedback Intelligence</TabsTrigger>
            <TabsTrigger value="comprehension">Verständnis</TabsTrigger>
            <TabsTrigger value="system">System & Quellen</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <Card><CardHeader><CardTitle>Was Jarvis gerade sieht</CardTitle><CardDescription>Nur bereits freigegebene, strukturierte Admin-RPCs.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2">{sources.map((source) => <div key={source.label} className="flex items-center justify-between rounded-xl border p-3"><span className="text-sm">{source.label}</span><Badge variant={source.state === "CURRENT" ? "default" : "destructive"}>{source.state === "CURRENT" ? "Aktuell" : "Nicht verfügbar"}</Badge></div>)}</CardContent></Card>
          </TabsContent>
          <TabsContent value="feedback"><AdminFeedbackStructuredInsights dataScope="production" /></TabsContent>
          <TabsContent value="comprehension"><AdminComprehensionInsights /></TabsContent>
          <TabsContent value="system">
            <Card><CardHeader><CardTitle>Wahrheit und Grenzen</CardTitle><CardDescription>Jarvis trennt aktiven Messstand, fehlende Quellen und menschliche Entscheidungen.</CardDescription></CardHeader><CardContent className="space-y-3 text-sm text-muted-foreground"><p>Keine Tabellenabfragen, keine Writes und keine automatischen Produktentscheidungen.</p><p>Feedback-Freitext, Journale, Namen, E-Mails und direkte Personenkennungen werden hier nicht geladen.</p><p>Gruppenmetriken bleiben ab n ≥ 5; Solo und Team werden als getrennte Teilnahmeformen behandelt.</p><p>Ursachen, Wirksamkeit und Produktentscheidungen bleiben bei Mahle.</p></CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
};

export default AdminJarvis;
