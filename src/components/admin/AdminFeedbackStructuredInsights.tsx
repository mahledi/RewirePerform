import { useEffect, useState } from "react";
import { BarChart3, Bot, LockKeyhole, RefreshCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminFeedbackDataScope } from "@/lib/adminFeedbackComments";
import { getAdminFeedbackInsights, type AdminFeedbackInsights } from "@/lib/adminFeedbackInsights";

interface Props {
  dataScope: AdminFeedbackDataScope;
  insightLoader?: typeof getAdminFeedbackInsights;
}

export default function AdminFeedbackStructuredInsights({
  dataScope,
  insightLoader = getAdminFeedbackInsights,
}: Props) {
  const [insights, setInsights] = useState<AdminFeedbackInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    void insightLoader(dataScope).then((result) => {
      if (active) setInsights(result);
    }).catch(() => {
      if (active) {
        setInsights(null);
        setError(true);
      }
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [dataScope, insightLoader, reloadKey]);

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge className="border-primary/25 bg-primary/10 text-primary hover:bg-primary/10">Strukturierte Antworten</Badge>
              <Badge variant="outline">Kein Freitext</Badge>
            </div>
            <CardTitle className="text-lg sm:text-xl">Feedback-Auswertung</CardTitle>
            <CardDescription className="mt-1.5 max-w-2xl leading-relaxed">
              Verteilungen aus den angekreuzten Antworten. Erst ab fünf unterschiedlichen Teilnehmenden werden Metriken angezeigt.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-secondary/25 px-3 py-2 text-xs text-muted-foreground">
            <Bot className="h-4 w-4 text-primary" />Jarvis darf nur diesen strukturierten Datenweg nutzen.
          </div>
        </div>
      </CardHeader>
      <CardContent className="border-t border-border/60 pt-4">
        {loading ? (
          <div className="h-32 animate-pulse rounded-xl bg-secondary/40" aria-label="Strukturierte Auswertung wird geladen" />
        ) : error ? (
          <div className="flex flex-col items-start gap-3 rounded-xl border border-destructive/30 p-4">
            <div>
              <p className="font-semibold">Strukturierte Antworten konnten nicht sicher geladen werden.</p>
              <p className="mt-1 text-sm text-muted-foreground">Es werden keine Ersatz- oder Cache-Daten angezeigt.</p>
            </div>
            <Button variant="outline" onClick={() => setReloadKey((value) => value + 1)}>
              <RefreshCcw className="mr-2 h-4 w-4" />Erneut prüfen
            </Button>
          </div>
        ) : insights && !insights.sufficientData ? (
          <div className="flex min-h-32 flex-col items-center justify-center rounded-xl border border-border/60 px-4 py-6 text-center">
            <LockKeyhole className="h-5 w-5 text-primary" />
            <p className="mt-2 font-semibold">Noch nicht genügend Rückmeldungen für eine Auswertung.</p>
            <p className="mt-1 text-sm text-muted-foreground">Aktuell {insights.participants} von mindestens {insights.minimumDistinctParticipants} unterschiedlichen Teilnehmenden.</p>
          </div>
        ) : insights ? (
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                ["Teilnehmende", insights.participants],
                ["Feedback-Abgaben", insights.submissions ?? "–"],
                ["Checkpoints mit Daten", insights.checkpointsWithData ?? "–"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-border/60 bg-secondary/20 p-3">
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                  <p className="mt-1 text-xl font-semibold">{value}</p>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              {insights.questions.filter(({ sufficientData }) => sufficientData).map((question) => (
                <article key={`${question.programDay}-${question.questionId}`} className="rounded-xl border border-border/60 p-4">
                  <div className="flex items-start gap-3">
                    <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Tag {question.programDay}</p>
                      <h3 className="mt-1 text-sm font-semibold leading-relaxed">{question.questionPrompt}</h3>
                      <div className="mt-3 space-y-2">
                        {question.optionDistribution.map((option) => (
                          <div key={option.optionId} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-xs">
                            <div>
                              <div className="mb-1 flex justify-between gap-2"><span>{option.optionLabel}</span><span className="text-muted-foreground">{Math.round(option.participantRate * 100)} %</span></div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${option.participantRate * 100}%` }} /></div>
                            </div>
                            <span className="text-muted-foreground">n={option.participants}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <p className="text-[10px] leading-relaxed text-muted-foreground">Deskriptive Pilotdaten, keine Kausalitäts- oder Wirksamkeitsaussage. Namen, E-Mails, Nutzerkennungen, Journale und Freitexte sind ausgeschlossen.</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
