import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, Bot, BrainCircuit, Loader2, RefreshCcw, Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminComprehensionInsights from "@/components/admin/AdminComprehensionInsights";
import AdminFeedbackStructuredInsights from "@/components/admin/AdminFeedbackStructuredInsights";
import AdminJarvisDashboard from "@/components/admin/AdminJarvisDashboard";
import { BrandSymbol } from "@/components/brand/BrandLogo";
import { buildJarvisAnswer, type JarvisAnswer, type JarvisReadModel } from "@/lib/adminJarvis";
import {
  readDeepAnalysis,
  requestDeepAnalysis,
  type DeepAnalysisJob,
  type JarvisSourceState,
} from "@/lib/adminJarvisDeepAnalysis";
import { EVIDENCE_PROTOCOL_VERSION } from "@/lib/performanceEvidence";

type SourceState = { label: string; state: JarvisSourceState };

const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

const textList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const terminalDeepAnalysisStates = new Set(["FERTIG", "BLOCKIERT", "FEHLGESCHLAGEN"]);

const AdminJarvis = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, role, roleLoading, roleVerified } = useAuth();
  const [data, setData] = useState<JarvisReadModel>({ overview: null, teams: null, system: null, operations: null, presentation: null, study: null, solo: null, trends: null });
  const [sources, setSources] = useState<SourceState[]>([]);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<JarvisAnswer | null>(null);
  const [deepAnalysis, setDeepAnalysis] = useState<DeepAnalysisJob | null>(null);
  const [deepAnalysisLoading, setDeepAnalysisLoading] = useState(false);
  const [deepAnalysisError, setDeepAnalysisError] = useState<string | null>(null);
  const [feedbackSourceState, setFeedbackSourceState] = useState<SourceState["state"] | null>(null);
  const [comprehensionSourceState, setComprehensionSourceState] = useState<SourceState["state"] | null>(null);

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
      client.rpc("get_admin_presentation_metrics", { include_test: false }),
      client.rpc("get_admin_study_overview", { include_test: false }),
      client.rpc("get_performance_evidence_summary", { _program_run_id: null, _include_test: false, _protocol_version: EVIDENCE_PROTOCOL_VERSION }),
      client.rpc("get_admin_activity_trends"),
    ]);
    const labels = ["Admin-Übersicht", "Teams & Aktivität", "Systemgesundheit", "Launch-Ops", "Pilot-Metriken", "Pilot-Auswertung", "Solo-Evidence", "Aktivitätstrends"];
    setSources(results.map((result, index) => ({ label: labels[index], state: result.error ? "FAILED" : "CURRENT" })));
    setData({
      overview: results[0].error ? null : record(results[0].data),
      teams: results[1].error || !Array.isArray(results[1].data) ? null : results[1].data,
      system: results[2].error ? null : record(results[2].data),
      operations: results[3].error ? null : record(results[3].data),
      presentation: results[4].error ? null : record(results[4].data),
      study: results[5].error ? null : record(results[5].data),
      solo: results[6].error ? null : record(results[6].data),
      trends: results[7].error ? null : record(results[7].data),
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading && roleVerified && role === "admin") void load();
  }, [authLoading, role, roleVerified, load]);

  useEffect(() => {
    if (!deepAnalysis || terminalDeepAnalysisStates.has(deepAnalysis.status)) return undefined;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const current = await readDeepAnalysis(supabase as any, deepAnalysis.request_id);
        if (!cancelled) setDeepAnalysis(current);
      } catch {
        if (!cancelled) setDeepAnalysisError("Der Status kann gerade nicht aktualisiert werden. Der sichere Auftrag bleibt bestehen.");
      }
    }, 5_000);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [deepAnalysis]);

  const ask = () => {
    if (!question.trim()) return;
    setAnswer(buildJarvisAnswer(question, data));
    setDeepAnalysis(null);
    setDeepAnalysisError(null);
  };

  const requestDepth = async () => {
    if (!answer || !question.trim()) return;
    setDeepAnalysisLoading(true);
    setDeepAnalysisError(null);
    try {
      // Only the question, aggregate snapshot hash and source states leave the
      // browser. The aggregate data is fetched again by the local worker.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const job = await requestDeepAnalysis(supabase as any, question, data, visibleSources);
      setDeepAnalysis(job);
    } catch {
      setDeepAnalysisError("Der Auftrag konnte nicht sicher angelegt werden. Es wurde keine Tiefenanalyse gestartet.");
    } finally {
      setDeepAnalysisLoading(false);
    }
  };

  const visibleSources = [
    ...sources,
    ...(feedbackSourceState ? [{ label: "Strukturiertes Feedback", state: feedbackSourceState }] : []),
    ...(comprehensionSourceState ? [{ label: "Programmverständnis", state: comprehensionSourceState }] : []),
  ];

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
          <div className="mt-3 flex flex-wrap gap-2">
            {["Wie ist die Aktivität?", "Was geht hoch oder runter?", "Wie stehen die Solo-Athleten?", "Welche Datenlücken gibt es?", "Wie stehen die Messfenster?"].map((prompt) => (
              <button key={prompt} type="button" onClick={() => { setQuestion(prompt); setAnswer(buildJarvisAnswer(prompt, data)); setDeepAnalysis(null); setDeepAnalysisError(null); }} className="rounded-full border border-[#4b4338] px-3 py-1.5 text-xs text-[#b9b0a4] transition-colors hover:border-[#d8c4a8] hover:text-[#f4efe6]">{prompt}</button>
            ))}
          </div>
          {answer ? (
            <div className="mt-5 rounded-2xl border border-[#4b4338] bg-black/20 p-4" aria-live="polite">
              <div className="flex gap-3"><Bot className="mt-0.5 h-5 w-5 shrink-0 text-[#66d4b1]" /><div><p className="leading-relaxed text-[#f4efe6]">{answer.answer}</p><p className="mt-3 text-xs text-[#a9a095]">Quellen: {answer.sourceLabels.join(" · ")} · {answer.boundary}</p></div></div>
              <div className="mt-5 border-t border-[#4b4338] pt-4">
                <p className="text-xs leading-relaxed text-[#a9a095]">Optional: Sol analysiert einmalig nur die strukturierten, aggregierten Daten dieses Stands. Freitext, Journale, Namen, E-Mails und direkte IDs bleiben ausgeschlossen. Fehlende oder alte Quellen werden sichtbar; Ursachen werden nicht als Fakten behauptet. Der Auftrag nutzt dein bestehendes Codex-Kontingent und wartet, wenn dein Mac nicht läuft.</p>
                <Button type="button" variant="outline" onClick={() => void requestDepth()} disabled={deepAnalysisLoading} className="mt-3 border-[#6f6456] bg-transparent text-[#f4efe6] hover:bg-[#29251f] hover:text-white">
                  {deepAnalysisLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
                  Mit Codex tief analysieren
                </Button>
                {deepAnalysis ? (
                  <div className="mt-3 space-y-3" aria-live="polite">
                    <p className="text-sm text-[#d8c4a8]">Status: {deepAnalysis.status}{deepAnalysis.reused ? " · vorhandenes Ergebnis wiederverwendet" : ""}</p>
                    {deepAnalysis.status === "WARTET_AUF_MAC" ? <p className="text-xs text-[#a9a095]">Dein Mac ist vermutlich nicht erreichbar. Der Auftrag wird erst lokal verarbeitet, wenn der Worker aktiv ist.</p> : null}
                    {deepAnalysis.status === "BLOCKIERT" || deepAnalysis.status === "FEHLGESCHLAGEN" ? <p className="text-sm text-[#f0b9a9]">Jarvis hat sicher gestoppt. Grund: {deepAnalysis.failure_code ?? "nicht eindeutig bestimmbar"}. Es wurde kein Ergebnis erfunden.</p> : null}
                    {deepAnalysis.status === "FERTIG" && deepAnalysis.result ? (
                      <div className="rounded-xl border border-[#6f6456] bg-[#11110f] p-4 text-sm text-[#e9e2d8]">
                        <p className="font-semibold text-[#f4efe6]">{String(deepAnalysis.result.summary ?? "Analyse abgeschlossen.")}</p>
                        {([
                          ["Wichtigste Entwicklungen", "developments"],
                          ["Solo, Team und Gesamt", "comparisons"],
                          ["Datenqualität", "data_quality"],
                          ["Zeitliche Zusammenhänge", "temporal_links"],
                          ["Sinnvolle Prüfbereiche – keine bewiesenen Ursachen", "review_areas"],
                          ["Nächste Founder-Fragen", "founder_questions"],
                          ["Quellen", "sources"],
                          ["Grenzen", "limitations"],
                        ] as const).map(([label, key]) => {
                          const items = textList(deepAnalysis.result?.[key]);
                          return items.length ? <div key={key} className="mt-4"><p className="font-medium text-[#d8c4a8]">{label}</p><ul className="mt-1 list-disc space-y-1 pl-5">{items.map((item) => <li key={item}>{item}</li>)}</ul></div> : null;
                        })}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {deepAnalysisError ? <p className="mt-3 text-sm text-destructive" role="alert">{deepAnalysisError}</p> : null}
              </div>
            </div>
          ) : null}
        </section>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="h-auto w-full flex-wrap justify-start">
            <TabsTrigger value="overview">Überblick</TabsTrigger>
            <TabsTrigger value="feedback">Feedback Intelligence</TabsTrigger>
            <TabsTrigger value="comprehension">Verständnis</TabsTrigger>
            <TabsTrigger value="system">System & Quellen</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            {loading ? <Card><CardContent className="flex min-h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></CardContent></Card> : <AdminJarvisDashboard data={data} />}
          </TabsContent>
          <TabsContent value="feedback"><AdminFeedbackStructuredInsights dataScope="production" onSourceStateChange={setFeedbackSourceState} /></TabsContent>
          <TabsContent value="comprehension"><AdminComprehensionInsights onSourceStateChange={setComprehensionSourceState} /></TabsContent>
          <TabsContent value="system">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card><CardHeader><CardTitle>Verbundene Admin-Quellen</CardTitle><CardDescription>{visibleSources.filter((source) => source.state === "CURRENT").length} von {visibleSources.length} in dieser Browser-Sitzung geprüften Quellen aktuell erreichbar.</CardDescription></CardHeader><CardContent className="grid gap-2">{visibleSources.map((source) => <div key={source.label} className="flex items-center justify-between rounded-xl border p-3"><span className="text-sm">{source.label}</span><Badge variant={source.state === "CURRENT" ? "default" : "destructive"}>{source.state === "CURRENT" ? "Aktuell" : "Nicht verfügbar"}</Badge></div>)}</CardContent></Card>
              <Card><CardHeader><CardTitle>Wahrheit und Grenzen</CardTitle><CardDescription>Jarvis trennt Messstand, fehlende Quellen und menschliche Entscheidungen.</CardDescription></CardHeader><CardContent className="space-y-3 text-sm text-muted-foreground"><p>Keine Tabellenabfragen, keine Writes und keine automatischen Produktentscheidungen.</p><p>Feedback-Freitext, Journale, Namen, E-Mails und direkte Personenkennungen werden hier nicht geladen.</p><p>Gruppenmetriken bleiben ab n ≥ 5; Solo und Team werden als getrennte Teilnahmeformen behandelt.</p><p>Ursachen, Wirksamkeit und Produktentscheidungen bleiben bei Mahle.</p></CardContent></Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
};

export default AdminJarvis;
