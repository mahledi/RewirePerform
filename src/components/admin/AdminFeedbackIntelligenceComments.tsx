import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  BotOff,
  CheckCircle2,
  ChevronDown,
  FlaskConical,
  LockKeyhole,
  MessageSquareText,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AdminFeedbackStructuredInsights from "@/components/admin/AdminFeedbackStructuredInsights";
import {
  getAdminFeedbackCommentPage,
  type AdminFeedbackCommentCursor,
  type AdminFeedbackCommentItem,
  type AdminFeedbackDataScope,
} from "@/lib/adminFeedbackComments";
import type { FeedbackCheckpointDay } from "@/content/feedbackIntelligenceV1";

const CHECKPOINTS: Array<{ value: FeedbackCheckpointDay | null; label: string }> = [
  { value: null, label: "Alle" },
  { value: 10, label: "Tag 10" },
  { value: 24, label: "Tag 24" },
  { value: 39, label: "Tag 39" },
  { value: 55, label: "Tag 55" },
];

const athleteLabel = (subjectReference: string) =>
  `Athlet ${subjectReference.replaceAll("-", "").slice(0, 7).toUpperCase()}`;

const formatSubmittedAt = (value: string) => new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
}).format(new Date(value));

const activityLabel = (value: string) => value
  .toLowerCase()
  .replaceAll("_", " ")
  .replace(/^./, (letter) => letter.toUpperCase());

function FeedbackCommentCard({ item }: { item: AdminFeedbackCommentItem }) {
  const activity = item.activitySnapshot;
  return (
    <article className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_18px_60px_-48px_hsl(var(--primary)/0.85)]">
      <div className="border-b border-border/60 bg-secondary/25 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-primary/25 bg-primary/10 text-primary hover:bg-primary/10">
              Tag {item.programDay}
            </Badge>
            <span className="font-mono text-[11px] tracking-wide text-muted-foreground">
              {athleteLabel(item.subjectReference)}
            </span>
          </div>
          <time className="text-xs text-muted-foreground" dateTime={item.submittedAt}>
            {formatSubmittedAt(item.submittedAt)}
          </time>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
            {item.questionId === "__closing_comment__" ? "Abschlusskommentar" : "Frage"}
          </p>
          <h3 className="mt-1.5 text-sm font-semibold leading-relaxed text-foreground sm:text-base">
            {item.questionPrompt}
          </h3>
        </div>

        {item.selectedOptionLabels.length > 0 && (
          <div className="flex flex-wrap gap-2" aria-label="Strukturierte Antwort">
            {item.selectedOptionLabels.map((label) => (
              <span
                key={label}
                className="rounded-full border border-border/70 bg-secondary/45 px-3 py-1 text-xs font-medium text-foreground"
              >
                {label}
              </span>
            ))}
          </div>
        )}

        <blockquote className="relative rounded-xl border border-primary/20 bg-[linear-gradient(135deg,hsl(var(--primary)/0.10),hsl(var(--card))_55%)] px-4 py-4 text-sm leading-7 text-foreground sm:px-5 sm:text-[15px]">
          <MessageSquareText className="mb-2 h-4 w-4 text-primary" aria-hidden="true" />
          <p className="whitespace-pre-wrap break-words">{item.comment}</p>
        </blockquote>

        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-primary">
            <CheckCircle2 className="h-3.5 w-3.5" />Einwilligung gültig
          </span>
          {item.guardianRequired && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 px-2.5 py-1 text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />Guardian bestätigt
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 px-2.5 py-1 text-muted-foreground">
            <BotOff className="h-3.5 w-3.5" />Nicht an Jarvis übergeben
          </span>
        </div>

        <details className="group rounded-xl border border-border/60 bg-secondary/20">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3.5 text-xs font-medium text-muted-foreground marker:content-none">
            <span className="inline-flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />Aktivitätskontext
            </span>
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-border/60 px-3.5 py-3">
            {activity ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {[
                  ["Programmtage", `${activity.programDaysCompleted}/${activity.programDaysAvailable}`],
                  ["Check-ins", activity.checkinsCompleted],
                  ["Journal", `${activity.journalEntriesCreatedCount} Einträge`],
                  ["Aufgaben", activity.tasksCompleted],
                  ["Transfer-Pulse", activity.transferPulseCount ?? "–"],
                  ["Fortsetzung", activityLabel(activity.continuationStatusBucket)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-border/50 bg-background/50 p-2.5">
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Für diese Rückmeldung liegt kein vollständiger Aktivitätssnapshot vor.</p>
            )}
            <p className="mt-2.5 text-[10px] leading-relaxed text-muted-foreground">
              Beim Journal wird ausschließlich die Anzahl angezeigt. Journaltexte und private Reflexionen sind technisch ausgeschlossen.
            </p>
          </div>
        </details>
      </div>
    </article>
  );
}

interface AdminFeedbackIntelligenceCommentsProps {
  pageLoader?: typeof getAdminFeedbackCommentPage;
}

export default function AdminFeedbackIntelligenceComments({
  pageLoader = getAdminFeedbackCommentPage,
}: AdminFeedbackIntelligenceCommentsProps) {
  const [dataScope, setDataScope] = useState<AdminFeedbackDataScope>("production");
  const [checkpointDay, setCheckpointDay] = useState<FeedbackCheckpointDay | null>(null);
  const [items, setItems] = useState<AdminFeedbackCommentItem[]>([]);
  const [cursor, setCursor] = useState<AdminFeedbackCommentCursor | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const requestSequence = useRef(0);

  const loadPage = useCallback(async (append: boolean, nextCursor: AdminFeedbackCommentCursor | null) => {
    const sequence = ++requestSequence.current;
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(false);
    try {
      const page = await pageLoader({
        dataScope,
        checkpointDay,
        cursor: nextCursor,
        pageSize: 20,
      });
      if (requestSequence.current !== sequence) return;
      setItems((current) => append
        ? [...current, ...page.items.filter((item) => !current.some(({ commentId }) => commentId === item.commentId))]
        : page.items);
      setCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch {
      if (requestSequence.current !== sequence) return;
      if (!append) setItems([]);
      setError(true);
    } finally {
      if (requestSequence.current === sequence) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [checkpointDay, dataScope, pageLoader]);

  useEffect(() => {
    setItems([]);
    setCursor(null);
    setHasMore(false);
    void loadPage(false, null);
    return () => { requestSequence.current += 1; };
  }, [loadPage]);

  const availableActivityCount = useMemo(
    () => items.filter(({ activitySnapshot }) => activitySnapshot !== null).length,
    [items],
  );

  return (
    <section className="space-y-4" aria-labelledby="feedback-intelligence-admin-title">
      <Card className="relative overflow-hidden border-primary/20 bg-card">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.18),transparent_72%)]" />
        <CardHeader className="relative pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 flex flex-wrap gap-2">
                <Badge className="border-primary/25 bg-primary/10 text-primary hover:bg-primary/10">Admin · read-only</Badge>
                <Badge variant="outline">Freiwilliges Produktfeedback</Badge>
              </div>
              <CardTitle id="feedback-intelligence-admin-title" className="text-xl sm:text-2xl">
                Feedback Intelligence
              </CardTitle>
              <CardDescription className="mt-2 max-w-2xl text-sm leading-relaxed">
                Ehrliche Kommentare aus den Fragebögen an Tag 10, 24, 39 und 55 – direkt neben der strukturierten Antwort und dem freigegebenen Aktivitätskontext.
              </CardDescription>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:min-w-[330px]">
              <div className="rounded-xl border border-border/60 bg-background/55 p-3">
                <p className="text-[10px] text-muted-foreground">Geladen</p>
                <p className="mt-1 text-xl font-semibold">{items.length}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/55 p-3">
                <p className="text-[10px] text-muted-foreground">Mit Aktivität</p>
                <p className="mt-1 text-xl font-semibold">{availableActivityCount}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/55 p-3">
                <p className="text-[10px] text-muted-foreground">KI-Export</p>
                <p className="mt-1 text-sm font-semibold text-primary">Aus</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative space-y-4 border-t border-border/60 pt-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2" aria-label="Checkpoint filtern">
              {CHECKPOINTS.map((checkpoint) => (
                <button
                  key={checkpoint.label}
                  type="button"
                  onClick={() => setCheckpointDay(checkpoint.value)}
                  aria-pressed={checkpointDay === checkpoint.value}
                  className={`min-h-9 rounded-full border px-3 text-xs font-medium transition-colors ${
                    checkpointDay === checkpoint.value
                      ? "border-primary/30 bg-primary/12 text-primary"
                      : "border-border/70 bg-background/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {checkpoint.label}
                </button>
              ))}
            </div>
            <div className="inline-flex w-fit rounded-xl border border-border/70 bg-secondary/30 p-1">
              <button
                type="button"
                onClick={() => setDataScope("production")}
                aria-pressed={dataScope === "production"}
                className={`min-h-8 rounded-lg px-3 text-xs font-medium transition-colors ${dataScope === "production" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                Pilotdaten
              </button>
              <button
                type="button"
                onClick={() => setDataScope("synthetic")}
                aria-pressed={dataScope === "synthetic"}
                className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors ${dataScope === "synthetic" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                <FlaskConical className="h-3.5 w-3.5" />Testdaten
              </button>
            </div>
          </div>

          <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
            <div className="flex items-start gap-2 rounded-xl border border-border/55 bg-secondary/20 p-3">
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Nur gültig freigegebene Feedback-Kommentare.
            </div>
            <div className="flex items-start gap-2 rounded-xl border border-border/55 bg-secondary/20 p-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Unter 16 wird Guardian zusätzlich neu geprüft.
            </div>
            <div className="flex items-start gap-2 rounded-xl border border-border/55 bg-secondary/20 p-3">
              <BotOff className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Diese Ansicht übergibt keine Texte an Jarvis.
            </div>
          </div>
        </CardContent>
      </Card>

      <AdminFeedbackStructuredInsights dataScope={dataScope} />

      {loading ? (
        <div className="space-y-3" aria-label="Feedback wird geladen">
          {[0, 1].map((item) => (
            <div key={item} className="h-56 animate-pulse rounded-2xl border border-border/60 bg-card/70" />
          ))}
        </div>
      ) : error ? (
        <Card className="border-destructive/30">
          <CardContent className="flex flex-col items-start gap-3 p-5">
            <div>
              <p className="font-semibold">Kommentare konnten nicht sicher geladen werden.</p>
              <p className="mt-1 text-sm text-muted-foreground">Der Zugriff bleibt geschlossen. Es wurden keine Ersatz- oder Cache-Daten angezeigt.</p>
            </div>
            <Button variant="outline" onClick={() => void loadPage(false, null)}>
              <RefreshCcw className="mr-2 h-4 w-4" />Erneut prüfen
            </Button>
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-44 flex-col items-center justify-center px-5 py-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MessageSquareText className="h-5 w-5" />
            </div>
            <p className="mt-3 font-semibold">Noch keine freiwilligen Kommentare in dieser Ansicht.</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">Strukturierte Antworten bleiben unabhängig davon auswertbar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => <FeedbackCommentCard key={item.commentId} item={item} />)}
          {hasMore && cursor && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" disabled={loadingMore} onClick={() => void loadPage(true, cursor)}>
                {loadingMore ? <RefreshCcw className="mr-2 h-4 w-4 animate-spin" /> : null}
                Weitere Kommentare
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
