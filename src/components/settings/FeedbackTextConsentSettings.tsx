import { useCallback, useEffect, useState } from "react";
import { FileText, Loader2, RotateCcw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  isFeedbackIntelligenceClientEnabled,
  isFeedbackTextClientEnabled,
  listMyFeedbackTextConsents,
  withdrawMyFeedbackText,
  type FeedbackTextConsentReceiptSummary,
} from "@/lib/feedbackIntelligenceApi";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const formatDate = (value: string) => new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
}).format(new Date(value));

export const FeedbackTextConsentSettings = () => {
  const enabled = isFeedbackIntelligenceClientEnabled() && isFeedbackTextClientEnabled();
  const [receipts, setReceipts] = useState<FeedbackTextConsentReceiptSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [withdrawTarget, setWithdrawTarget] = useState<FeedbackTextConsentReceiptSummary | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);

  const loadReceipts = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setLoadFailed(false);
    try {
      setReceipts(await listMyFeedbackTextConsents());
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    void loadReceipts();
  }, [enabled, loadReceipts]);

  if (!enabled) return null;

  const confirmWithdrawal = async () => {
    if (!withdrawTarget) return;
    setWithdrawing(true);
    try {
      await withdrawMyFeedbackText(withdrawTarget.consentReference);
      setReceipts((current) => current.map((receipt) => receipt.consentReference === withdrawTarget.consentReference
        ? { ...receipt, state: "withdrawn", withdrawnAt: new Date().toISOString() }
        : receipt));
      setWithdrawTarget(null);
      toast.success("Freitext-Einwilligung widerrufen.");
    } catch {
      toast.error("Der Widerruf konnte gerade nicht sicher gespeichert werden.");
    } finally {
      setWithdrawing(false);
    }
  };

  const activeReceipts = receipts.filter((receipt) => receipt.state === "granted");
  const withdrawnReceipts = receipts.filter((receipt) => receipt.state === "withdrawn");

  return (
    <section className="space-y-4 rounded-xl border border-primary/20 bg-card p-5" aria-labelledby="feedback-text-consents-title">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h2 id="feedback-text-consents-title" className="font-heading text-lg font-semibold">
          Freiwillige Feedback-Kommentare
        </h2>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Deine Auswahlantworten bleiben unabhängig davon erhalten. Hier kannst du nur die separate Erlaubnis
        für intern geprüfte Kommentare widerrufen. Private Journale und Reflexionen sind davon nie betroffen.
      </p>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Einwilligungen werden geladen …
        </div>
      ) : loadFailed ? (
        <div className="space-y-3 rounded-lg border border-border bg-secondary/30 p-4">
          <p className="text-sm text-muted-foreground">
            Die Einwilligungen konnten gerade nicht sicher geladen werden.
          </p>
          <Button variant="outline" size="sm" onClick={() => void loadReceipts()}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Erneut versuchen
          </Button>
        </div>
      ) : receipts.length === 0 ? (
        <div className="rounded-lg border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
          Du hast bisher keine Feedback-Kommentare zur internen Produktprüfung freigegeben.
        </div>
      ) : (
        <div className="space-y-3">
          {activeReceipts.map((receipt) => (
            <div key={receipt.consentReference} className="rounded-lg border border-border bg-secondary/20 p-4">
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">Feedback an Tag {receipt.checkpointDay}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Zugestimmt am {formatDate(receipt.grantedAt)} · nur Produktverbesserung
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full text-destructive hover:text-destructive"
                onClick={() => setWithdrawTarget(receipt)}
              >
                Freitext-Einwilligung widerrufen
              </Button>
            </div>
          ))}

          {withdrawnReceipts.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {withdrawnReceipts.length} frühere {withdrawnReceipts.length === 1 ? "Einwilligung wurde" : "Einwilligungen wurden"} widerrufen.
            </p>
          )}
        </div>
      )}

      <p className="text-xs leading-relaxed text-muted-foreground">
        Beim Widerruf werden der Kommentar und personenbeziehbare Prüfergebnisse gelöscht. Deine strukturierten
        Antworten bleiben für datenschutzsichere Gruppenauswertungen erhalten.
      </p>

      <AlertDialog open={withdrawTarget !== null} onOpenChange={(open) => !open && !withdrawing && setWithdrawTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Freitext-Einwilligung widerrufen?</AlertDialogTitle>
            <AlertDialogDescription>
              Der freiwillige Kommentar zu Tag {withdrawTarget?.checkpointDay} und personenbeziehbare Prüfergebnisse
              werden gelöscht. Deine Auswahlantworten und dein Programm bleiben unverändert.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={withdrawing}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              disabled={withdrawing}
              onClick={(event) => {
                event.preventDefault();
                void confirmWithdrawal();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {withdrawing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Jetzt widerrufen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};
