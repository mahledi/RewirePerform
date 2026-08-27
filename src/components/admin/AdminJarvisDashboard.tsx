import { AlertTriangle, CheckCircle2, LockKeyhole, Minus, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getJarvisTeamMetrics, type JarvisReadModel, type JarvisRecord } from "@/lib/adminJarvis";

const record = (value: unknown): JarvisRecord | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as JarvisRecord : null;
const value = (row: JarvisRecord | null, key: string) =>
  typeof row?.[key] === "number" && Number.isFinite(row[key]) ? row[key] as number : null;
const format = (number: number | null) => number === null ? "–" : new Intl.NumberFormat("de-DE").format(number);
const rate = (number: number | null) => number === null ? "–" : `${Math.round(number * 100)} %`;

export default function AdminJarvisDashboard({ data }: { data: JarvisReadModel }) {
  const summary = record(data.study?.summary) ?? record(data.presentation?.summary);
  const activation = record(data.study?.activation);
  const activity = record(data.study?.activity) ?? record(data.presentation?.activity);
  const quality = record(data.study?.data_quality) ?? data.system;
  const measurement = record(data.study?.measurement_readiness);
  const soloSample = record(data.solo?.sample);
  const soloCoverage = record(data.solo?.coverage);
  const athleteCount = value(summary, "athletes_total") ?? value(data.overview, "total_athletes");
  const aggregatesAllowed = (athleteCount ?? 0) >= 5;
  const active7d = value(activation, "active_7d") ?? value(activity, "active_users_7d");
  const active28d = value(activation, "active_28d");
  const teamMetrics = getJarvisTeamMetrics(data);
  const soloEligible = value(soloSample, "eligible_participants");
  const funnel = [
    { label: "Athleten", count: athleteCount ?? 0 },
    { label: "Aktiviert", count: value(activation, "activated_athletes") ?? 0 },
    { label: "Tag 1", count: value(activation, "day_1_completed") ?? 0 },
    { label: "7 Tage aktiv", count: active7d ?? 0 },
    { label: "Tag 56", count: value(activation, "day_56_completed") ?? 0 },
  ];
  const currentRates = [
    { label: "Aktivierung", rate: value(activation, "activation_rate") },
    { label: "Tag 1", rate: value(activation, "day_1_rate") },
    { label: "7d aktiv", rate: value(activation, "active_7d_rate") },
    { label: "Completion", rate: value(activity, "avg_completion_rate") },
    { label: "Verständnis", rate: value(activity, "avg_comprehension") },
  ].filter((item): item is { label: string; rate: number } => item.rate !== null)
    .map((item) => ({ ...item, percent: Math.round(item.rate * 100) }));
  const qualityItems = [
    ["Ohne Programmlauf", value(quality, "athletes_without_program_instance")],
    ["Ohne Tag 1", value(quality, "athletes_without_day_1")],
    ["Ohne Aktivität", value(quality, "athletes_without_any_activity")],
    ["Teams unter n = 5", value(data.system, "teams_below_min_n")],
    ["Fehlgeschlagene Flows · 24h", value(data.operations, "failed_events_24h")],
  ] as const;
  const issues = qualityItems.filter(([, count]) => (count ?? 0) > 0);

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Aktueller Jarvis-Messstand">
        {[
          ["Athleten im Messstand", format(athleteCount)],
          ["7 Tage aktiv", format(active7d)],
          ["Ø Completion", rate(value(activity, "avg_completion_rate"))],
          ["Ø Verständnis", rate(value(activity, "avg_comprehension"))],
        ].map(([label, display]) => (
          <Card key={label} className="border-[#4b4338]/60 bg-[#151511] text-[#f4efe6]">
            <CardContent className="p-4"><p className="text-xs text-[#a9a095]">{label}</p><p className="mt-2 text-2xl font-semibold">{display}</p></CardContent>
          </Card>
        ))}
      </section>

      {!aggregatesAllowed ? (
        <Card><CardContent className="flex min-h-40 flex-col items-center justify-center p-6 text-center"><LockKeyhole className="h-5 w-5 text-primary" /><p className="mt-3 font-semibold">Noch keine geschützte Gruppenanalyse.</p><p className="mt-1 max-w-xl text-sm text-muted-foreground">Jarvis zeigt Verhaltens- und Verständnisraten erst ab mindestens fünf freigegebenen Athleten.</p></CardContent></Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Vom Zugang zur Nutzung</CardTitle><CardDescription>Aktueller Funnel. Jeder Balken ist ein belegter Zählwert, keine Wirkungsannahme.</CardDescription></CardHeader>
            <CardContent>
              <figure aria-label="Aktivierungs- und Nutzungsfunnel">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={funnel} layout="vertical" margin={{ left: 12, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis dataKey="label" type="category" width={88} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <Tooltip cursor={{ fill: "hsl(var(--muted) / .35)" }} formatter={(item) => [item, "Athleten"]} />
                    <Bar dataKey="count" name="Athleten" fill="#d8c4a8" radius={[0, 5, 5, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </figure>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Aktueller Nutzungsstand</CardTitle><CardDescription>Gleich skalierte Quoten. Sie sind beschreibend und werden nicht zu einem Gesamtscore vermischt.</CardDescription></CardHeader>
            <CardContent>
              {currentRates.length > 0 ? (
                <figure aria-label="Aktuelle aggregierte Nutzungsquoten">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={currentRates} layout="vertical" margin={{ left: 12, right: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                      <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <YAxis dataKey="label" type="category" width={82} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                      <Tooltip formatter={(item) => [`${item} %`, "Quote"]} />
                      <Bar dataKey="percent" name="Quote" fill="#66d4b1" radius={[0, 5, 5, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </figure>
              ) : <p className="py-16 text-center text-sm text-muted-foreground">Noch keine vergleichbaren Quoten verfügbar.</p>}
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-[#6d5637] bg-[#1d1914]">
        <CardContent className="flex items-start gap-3 p-4 text-[#e4c48f]">
          <Minus className="mt-0.5 h-5 w-5 shrink-0" />
          <div><p className="font-semibold">Auf und Ab: noch bewusst offen</p><p className="mt-1 text-sm leading-relaxed text-[#c9aa79]">7 Tage aktiv: {format(active7d)} · 28 Tage aktiv: {format(active28d)}. Diese Fenster überlappen. Jarvis zeigt sie deshalb nicht fälschlich als Trend. Für ein ehrliches Hoch/Runter fehlt noch ein read-only Vergleich gleich großer Zeitfenster.</p></div>
        </CardContent>
      </Card>

      {teamMetrics.length > 0 ? (
        <Card>
          <CardHeader><CardTitle className="text-base">Teams im Vergleich</CardTitle><CardDescription>Nur Teams ab n ≥ 5. Completion und Verständnis bleiben getrennte Messgrößen.</CardDescription></CardHeader>
          <CardContent>
            <figure aria-label="Teamvergleich von Completion und Verständnis">
              <ResponsiveContainer width="100%" height={Math.max(260, teamMetrics.length * 54)}>
                <BarChart data={teamMetrics.map((team) => ({ ...team, completionPct: team.completion === null ? null : Math.round(team.completion * 100), comprehensionPct: team.comprehension === null ? null : Math.round(team.comprehension * 100) }))} layout="vertical" margin={{ left: 12, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis dataKey="label" type="category" width={100} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip formatter={(item) => [`${item} %`]} />
                  <Legend />
                  <Bar dataKey="completionPct" name="Completion" fill="#d8c4a8" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="comprehensionPct" name="Verständnis" fill="#66d4b1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </figure>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader><CardTitle className="text-base">Solo-Athleten</CardTitle><CardDescription>Separates, consentiertes Solo-Aggregat. Keine Team-IDs und keine Einzelprofile.</CardDescription></CardHeader>
        <CardContent>
          {soloEligible !== null && soloEligible >= 5 ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Freigegebene Solo-Athleten", format(soloEligible)],
                ["Strukturierte Beobachtungen", format(value(soloSample, "total_observations"))],
                ["Transfer-Abdeckung", rate(value(soloCoverage, "transfer_completion_rate"))],
              ].map(([label, display]) => <div key={label} className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{display}</p></div>)}
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-xl border p-4"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><p className="text-sm text-muted-foreground">Noch keine Solo-Ausgabe: Die geschützte Gruppe liegt unter n ≥ 5 oder die Quelle ist nicht verfügbar.</p></div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Was Aufmerksamkeit braucht</CardTitle><CardDescription>Datenlücken und technische Signale, keine vermuteten Ursachen.</CardDescription></CardHeader>
          <CardContent className="space-y-2">
            {issues.length === 0 ? <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-primary" />Keine belegte Lücke in diesen Quellen.</div> : issues.map(([label, count]) => <div key={label} className="flex items-center justify-between gap-3 rounded-xl border p-3 text-sm"><span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" />{label}</span><Badge variant="outline">{format(count)}</Badge></div>)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Messfenster</CardTitle><CardDescription>Wie viele vollständige Messungen für spätere deskriptive Vergleiche vorliegen.</CardDescription></CardHeader>
          <CardContent className="grid grid-cols-3 gap-2">
            {[["Pre", "validated_assessments_pre_n"], ["Mid", "validated_assessments_mid_n"], ["Post", "validated_assessments_post_n"]].map(([label, key]) => <div key={label} className="rounded-xl border p-3 text-center"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{format(value(measurement, key))}</p></div>)}
            <p className="col-span-3 mt-2 text-xs leading-relaxed text-muted-foreground"><TrendingUp className="mr-1 inline h-3.5 w-3.5" />Verfügbarkeit bedeutet noch keine Verbesserung und keine Ursache.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
