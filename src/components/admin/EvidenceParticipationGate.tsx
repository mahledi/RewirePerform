import { useCallback, useEffect, useState } from "react";
import { Download, Loader2, RefreshCcw, ShieldCheck, ShieldX } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { EVIDENCE_PROTOCOL_VERSION } from "@/lib/performanceEvidence";

interface EligibilityParticipant {
  program_instance_id: string;
  user_id: string;
  full_name: string;
  sport: string | null;
  program_started_at: string;
  program_status: string;
  team_id: string | null;
  team_name: string | null;
  program_run_id: string | null;
  program_run_name: string | null;
  is_test: boolean;
  verification_status: "adult_verified" | "minor_guardian_assent_verified" | "minor_self_assent_verified" | "revoked" | null;
  consent: boolean | null;
  consent_version: string | null;
  eligibility_reason: string;
}

interface EligibilityPayload {
  generated_at: string;
  protocol_version: string;
  stores_age_or_birthdate: false;
  participants: EligibilityParticipant[];
}

const reasonLabel: Record<string, string> = {
  eligible: "Freigegeben",
  eligible_minor: "Altersgerecht freigegeben",
  eligible_test: "Synthetischer Test",
  consent_required: "Zustimmung fehlt",
  consent_version_outdated: "Neue Zustimmung nötig",
  participation_authorization_required: "Teilnahmefreigabe fehlt",
  minor_participation_not_enabled: "Minderjährigen-Pfad gesperrt",
  minor_authorization_version_outdated: "Minderjährigen-Freigabe veraltet",
  protocol_disabled: "Protokoll deaktiviert",
};

const errorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "Unbekannter Fehler";
};

const downloadJson = (filename: string, value: unknown) => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const EvidenceParticipationGate = () => {
  const [payload, setPayload] = useState<EligibilityPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [pendingChange, setPendingChange] = useState<{
    participant: EligibilityParticipant;
    verified: boolean;
  } | null>(null);
  const [adultVerificationConfirmed, setAdultVerificationConfirmed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_admin_evidence_eligibility", { _include_test: false });
      if (error) throw error;
      setPayload(data as unknown as EligibilityPayload);
    } catch (error) {
      toast.error(`Evidence-Freigaben konnten nicht geladen werden: ${errorMessage(error)}`);
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateAdultEligibility = async (participant: EligibilityParticipant, verified: boolean) => {
    setUpdatingId(participant.program_instance_id);
    try {
      const { error } = await supabase.rpc("set_evidence_adult_eligibility", {
        _program_instance_id: participant.program_instance_id,
        _verified: verified,
      });
      if (error) throw error;
      toast.success(verified ? "Volljährigkeitsfreigabe protokolliert." : "Evidence-Freigabe widerrufen.");
      await load();
    } catch (error) {
      toast.error(`Freigabe konnte nicht geändert werden: ${errorMessage(error)}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const exportSoloAggregate = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.rpc("get_performance_evidence_summary", {
        _program_run_id: null,
        _include_test: false,
        _protocol_version: EVIDENCE_PROTOCOL_VERSION,
      });
      if (error) throw error;
      downloadJson("rewireperform_solo_evidence_aggregate.json", data);
    } catch (error) {
      toast.error(`Solo-Aggregat konnte nicht erstellt werden: ${errorMessage(error)}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-lg">Evidence-Teilnahmefreigaben</CardTitle>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Das Programm bleibt für alle nutzbar. Zusätzliche Transferdaten werden nur mit aktueller Zustimmung und
              altersgerechter Freigabe erhoben. Alter und Geburtsdatum werden hier nicht gespeichert.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => void load()} disabled={loading} title="Neu laden">
              <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            </Button>
            <Button variant="outline" onClick={() => void exportSoloAggregate()} disabled={exporting || !payload}>
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Solo-Aggregat
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-5 rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          Minderjährige werden nach der aktuellen altersgerechten Pilot-Freigabe automatisch geprüft. Unter 16 sind
          Sorgeberechtigten- und Athletenentscheidung erforderlich; mit 16 oder 17 entscheidet der Athlet selbst.
        </div>

        {loading ? (
          <div className="flex min-h-28 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" aria-label="Freigaben werden geladen" />
          </div>
        ) : payload?.participants.length ? (
          <div className="divide-y divide-border/60 border-y border-border/60">
            {payload.participants.map((participant) => {
              const adultVerified = participant.verification_status === "adult_verified";
              const isUpdating = updatingId === participant.program_instance_id;
              return (
                <div key={participant.program_instance_id} className="grid gap-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">{participant.full_name}</p>
                      <Badge variant={participant.eligibility_reason === "eligible" ? "default" : "outline"}>
                        {reasonLabel[participant.eligibility_reason] ?? participant.eligibility_reason}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {participant.program_run_name ?? participant.team_name ?? "Solo-Programm"}
                      {participant.sport ? ` · ${participant.sport}` : ""}
                      {` · Start ${participant.program_started_at}`}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Consent: {participant.consent === true ? "ja" : participant.consent === false ? "nein" : "offen"}
                    </p>
                  </div>
                  <Button
                    variant={adultVerified ? "outline" : "default"}
                    onClick={() => {
                      setAdultVerificationConfirmed(false);
                      setPendingChange({ participant, verified: !adultVerified });
                    }}
                    disabled={isUpdating || participant.verification_status === "minor_guardian_assent_verified" || participant.verification_status === "minor_self_assent_verified"}
                    className="h-11 w-full lg:w-auto"
                  >
                    {isUpdating
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : adultVerified
                        ? <ShieldX className="h-4 w-4" />
                        : <ShieldCheck className="h-4 w-4" />}
                    {adultVerified ? "Freigabe widerrufen" : "Volljährigkeit bestätigen"}
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">Keine aktiven Produktionsinstanzen gefunden.</p>
        )}
      </CardContent>
      <AlertDialog
        open={pendingChange !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingChange(null);
            setAdultVerificationConfirmed(false);
          }
        }}
      >
        <AlertDialogContent className="mx-4 w-[calc(100%-2rem)] max-w-lg rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingChange?.verified ? "Volljährigkeit verbindlich bestätigen?" : "Evidence-Freigabe widerrufen?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed">
              {pendingChange?.verified
                ? `${pendingChange.participant.full_name} wird für die zusätzliche Evidence-Erhebung freigegeben.`
                : `${pendingChange?.participant.full_name ?? "Diese Person"} nimmt danach nicht mehr an neuen Evidence-Auswertungen teil.`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {pendingChange?.verified && (
            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-amber-400/25 bg-amber-400/5 p-4">
              <Checkbox
                checked={adultVerificationConfirmed}
                onCheckedChange={(checked) => setAdultVerificationConfirmed(checked === true)}
                className="mt-0.5 h-5 w-5"
              />
              <span className="text-sm leading-relaxed text-foreground">
                Ich bestätige, dass die Person außerhalb der App belastbar als mindestens 18 Jahre verifiziert wurde.
                Für Minderjährige darf diese Freigabe nicht verwendet werden.
              </span>
            </label>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              disabled={pendingChange?.verified === true && !adultVerificationConfirmed}
              onClick={() => {
                if (!pendingChange) return;
                void updateAdultEligibility(pendingChange.participant, pendingChange.verified);
              }}
              className={pendingChange?.verified ? "" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}
            >
              {pendingChange?.verified ? "Volljährigkeit bestätigen" : "Freigabe widerrufen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default EvidenceParticipationGate;
