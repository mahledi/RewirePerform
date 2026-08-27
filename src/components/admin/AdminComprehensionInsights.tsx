import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, BookOpenCheck, Loader2, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ComprehensionRollup {
  participants: number;
  completed_checks: number;
  question_responses: number;
  correct_responses: number | null;
  incorrect_responses: number | null;
  accuracy: number | null;
  sufficient_data: boolean;
}

interface ComprehensionWeek extends ComprehensionRollup {
  week_number: number;
}

interface ComprehensionDay extends ComprehensionRollup {
  day_number: number;
  week_number: number;
}

interface ComprehensionQuestion {
  day_number: number;
  week_number: number;
  question_id: string;
  question_version_key: string;
  target: string;
  stem: string;
  participants: number;
  times_shown: number;
  correct_responses: number | null;
  incorrect_responses: number | null;
  accuracy: number | null;
  needs_content_review: boolean;
  sufficient_data: boolean;
}

export interface ComprehensionInsights {
  schema_version: string;
  generated_at: string;
  include_test: boolean;
  summary: ComprehensionRollup;
  weeks: ComprehensionWeek[];
  days: ComprehensionDay[];
  questions: ComprehensionQuestion[];
  privacy: {
    minimum_participants_for_scores: number;
    journal_or_reflection_text_included: boolean;
    selected_options_included: boolean;
    user_identifiers_included: boolean;
    names_or_emails_included: boolean;
    test_data_included: boolean;
  };
}

const formatPercent = (value: number | null) =>
  value === null ? "n < 5" : `${Math.round(value * 100)} %`;

const Metric = ({ label, value }: { label: string; value: string | number }) => (
  <div className="border-l-2 border-primary pl-3">
    <p className="text-[10px] font-medium uppercase text-muted-foreground">{label}</p>
    <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
  </div>
);

interface AdminComprehensionInsightsProps {
  payloadOverride?: ComprehensionInsights;
  onSourceStateChange?: (state: "CURRENT" | "FAILED") => void;
}

const AdminComprehensionInsights = ({ payloadOverride, onSourceStateChange }: AdminComprehensionInsightsProps) => {
  const [payload, setPayload] = useState<ComprehensionInsights | null>(payloadOverride ?? null);
  const [loading, setLoading] = useState(!payloadOverride);

  const load = useCallback(async () => {
    if (payloadOverride) {
      setPayload(payloadOverride);
      setLoading(false);
      onSourceStateChange?.("CURRENT");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc("get_admin_comprehension_insights", {
      _include_test: false,
    });
    if (error) {
      toast.error(`Verständnisdaten konnten nicht geladen werden: ${error.message}`);
      setPayload(null);
      onSourceStateChange?.("FAILED");
    } else {
      setPayload(data as unknown as ComprehensionInsights);
      onSourceStateChange?.("CURRENT");
    }
    setLoading(false);
  }, [onSourceStateChange, payloadOverride]);

  useEffect(() => {
    void load();
  }, [load]);

  const contentReviewSignals = useMemo(
    () => payload?.questions.filter((question) => question.needs_content_review) ?? [],
    [payload],
  );

  if (loading) {
    return (
      <div className="flex min-h-40 items-center justify-center" aria-label="Verständnisdaten werden geladen">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!payload) {
    return (
      <Card>
        <CardContent className="flex min-h-40 flex-col items-center justify-center gap-3 p-6 text-center">
          <AlertTriangle className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Verständnisdaten sind derzeit nicht verfügbar.</p>
          <Button variant="outline" onClick={() => void load()}>
            <RefreshCcw className="mr-2 h-4 w-4" />Erneut laden
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpenCheck className="h-5 w-5 text-primary" />
                Verständnis der Tagesinhalte
              </CardTitle>
              <CardDescription className="mt-2 max-w-3xl">
                Zeigt, ob Athleten das Tagesthema und die konkrete Anwendung verstanden haben. Die kurzen
                Verständnisfragen sind dafür nur der Messpunkt, nicht der bewertete Inhalt.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() => void load()}
              title="Neu laden"
              aria-label="Verständnisdaten neu laden"
            >
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Athleten" value={payload.summary.participants} />
            <Metric label="Checks" value={payload.summary.completed_checks} />
            <Metric label="Antworten" value={payload.summary.question_responses} />
            <Metric label="Verständnisquote" value={formatPercent(payload.summary.accuracy)} />
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
            <Badge variant="outline">Production ohne QA</Badge>
            <Badge variant="outline">Scores ab n ≥ 5</Badge>
            <span>{contentReviewSignals.length} Tagesinhalte mit Klärungsbedarf</span>
            <span>Stand {new Date(payload.generated_at).toLocaleString("de-DE")}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inhaltsverständnis nach Woche</CardTitle>
          <CardDescription>Interne Produktdiagnose über die kurzen Verständnischecks.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Woche</TableHead>
                  <TableHead className="text-right">Athleten</TableHead>
                  <TableHead className="text-right">Checks</TableHead>
                  <TableHead className="text-right">Antworten</TableHead>
                  <TableHead className="text-right">Verständnis</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payload.weeks.map((week) => (
                  <TableRow key={week.week_number}>
                    <TableCell className="font-medium">Woche {week.week_number}</TableCell>
                    <TableCell className="text-right">{week.participants}</TableCell>
                    <TableCell className="text-right">{week.completed_checks}</TableCell>
                    <TableCell className="text-right">{week.question_responses}</TableCell>
                    <TableCell className="text-right">{formatPercent(week.accuracy)}</TableCell>
                  </TableRow>
                ))}
                {payload.weeks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                      Noch keine abgeschlossenen Verständnischecks.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
          <div className="space-y-2 md:hidden">
            {payload.weeks.map((week) => (
              <div key={week.week_number} className="border-b border-border py-3 last:border-b-0">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-foreground">Woche {week.week_number}</p>
                  <p className="font-semibold text-foreground">{formatPercent(week.accuracy)}</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {week.participants} Athleten · {week.completed_checks} Checks · {week.question_responses} Antworten
                </p>
              </div>
            ))}
            {payload.weeks.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Noch keine abgeschlossenen Verständnischecks.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tagesinhalte mit Klärungsbedarf</CardTitle>
          <CardDescription>
            Liegt die Quote unter 70 Prozent, prüfen wir zuerst Erklärung, Aufgabe und Anwendung des Tages. Die
            Kennzahl bewertet nicht die Qualität der Kontrollfrage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tag</TableHead>
                  <TableHead>Bereich</TableHead>
                  <TableHead className="min-w-[320px]">Geprüftes Verständnis</TableHead>
                  <TableHead className="text-right">n</TableHead>
                  <TableHead className="text-right">Verständnis</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contentReviewSignals.map((question) => (
                  <TableRow key={`${question.question_id}-${question.question_version_key}`}>
                    <TableCell className="font-medium">{question.day_number}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{question.target}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-normal leading-relaxed">{question.stem}</TableCell>
                    <TableCell className="text-right">{question.participants}</TableCell>
                    <TableCell className="text-right font-medium">{formatPercent(question.accuracy)}</TableCell>
                  </TableRow>
                ))}
                {contentReviewSignals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                      Kein ausreichend belegter Tagesinhalt liegt unter der Klärungsgrenze.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
          <div className="space-y-3 md:hidden">
            {contentReviewSignals.map((question) => (
              <div
                key={`${question.question_id}-${question.question_version_key}`}
                className="border-b border-border py-3 last:border-b-0"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Tag {question.day_number}</span>
                    <Badge variant="outline">{question.target}</Badge>
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {formatPercent(question.accuracy)}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-foreground">{question.stem}</p>
                <p className="mt-2 text-xs text-muted-foreground">n = {question.participants}</p>
              </div>
            ))}
            {contentReviewSignals.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Kein ausreichend belegter Tagesinhalt liegt unter der Klärungsgrenze.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <p className="border-l-2 border-primary pl-3 text-xs leading-relaxed text-muted-foreground">
        Nur intern: Diese Kennzahlen helfen uns zu erkennen, an welchen Tagen Erklärung oder Anwendung noch klarer
        werden müssen. Eine niedrige Quote kann auch durch Aufmerksamkeit oder Zufall entstehen und wird deshalb nie
        allein als Inhaltsproblem gewertet. Private Journale, Reflexionstexte und Einzelantworten bleiben ausgeschlossen.
      </p>
    </div>
  );
};

export default AdminComprehensionInsights;
