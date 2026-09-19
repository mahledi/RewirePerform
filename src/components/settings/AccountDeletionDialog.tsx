import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Loader2, ShieldCheck, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  clearDeletedAccountFromDevice,
  deleteCurrentAccount,
  loadAccountDeletionPreview,
  type AccountDeletionPreview,
  type AccountDeletionTransfers,
} from "@/lib/accountManagement";

interface AccountDeletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  email: string;
}

type DeletionStep = "overview" | "confirmation";

export const AccountDeletionDialog = ({
  open,
  onOpenChange,
  userId,
  email,
}: AccountDeletionDialogProps) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<DeletionStep>("overview");
  const [preview, setPreview] = useState<AccountDeletionPreview | null>(null);
  const [transfers, setTransfers] = useState<AccountDeletionTransfers>({});
  const [password, setPassword] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStep("overview");
    setPreview(null);
    setTransfers({});
    setPassword("");
    setError(null);
    setLoadingPreview(false);
  };

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoadingPreview(true);
    setError(null);
    loadAccountDeletionPreview()
      .then((nextPreview) => {
        if (!active) return;
        setPreview(nextPreview);
        const defaults: AccountDeletionTransfers = {};
        nextPreview.ownedTeams.forEach((team) => {
          if (team.candidates.length === 1) defaults[team.id] = team.candidates[0].userId;
        });
        setTransfers(defaults);
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : "Die Kontodaten konnten nicht geprüft werden.");
      })
      .finally(() => {
        if (active) setLoadingPreview(false);
      });
    return () => {
      active = false;
    };
  }, [open]);

  const blockedTeams = useMemo(
    () => preview?.ownedTeams.filter((team) => team.candidates.length === 0) ?? [],
    [preview],
  );
  const transfersComplete = useMemo(
    () => preview?.ownedTeams.every((team) => team.candidates.some((candidate) => candidate.userId === transfers[team.id])) ?? false,
    [preview, transfers],
  );

  const handleOpenChange = (nextOpen: boolean) => {
    if (deleting) return;
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  const handleDelete = async () => {
    if (!preview || !transfersComplete || !password) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteCurrentAccount(email, password, transfers);
      navigate("/account-deleted", {
        replace: true,
        state: { accountDeleted: true },
      });
      await clearDeletedAccountFromDevice(userId, preview.programInstanceIds);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Der Account konnte nicht gelöscht werden.");
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{step === "overview" ? "Account dauerhaft löschen" : "Löschung bestätigen"}</DialogTitle>
          <DialogDescription>
            Dieser Vorgang kann nicht rückgängig gemacht werden.
          </DialogDescription>
        </DialogHeader>

        {step === "overview" ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                <div className="space-y-2 text-sm leading-relaxed">
                  <p className="font-semibold text-foreground">Folgende Daten werden dauerhaft gelöscht:</p>
                  <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                    <li>Account, Profil und Anmeldedaten</li>
                    <li>Check-ins, Journale, Assessments und persönliche Antworten</li>
                    <li>Programmfortschritt, Kalender und Reminder-Einstellungen</li>
                    <li>Teammitgliedschaften und persönliche Trackingzeilen</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-secondary/30 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div className="space-y-1 text-sm leading-relaxed text-muted-foreground">
                  <p className="font-semibold text-foreground">Was erhalten bleiben kann</p>
                  <p>
                    Bereits erstellte Gruppenstatistiken dürfen nur bestehen bleiben, wenn sie vollständig aggregiert sind,
                    mindestens fünf Personen umfassen und keinen Rückschluss auf dich zulassen. Private Texte und persönliche
                    Einzelwerte bleiben niemals erhalten.
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>Abbrechen</Button>
              <Button
                variant="destructive"
                onClick={() => setStep("confirmation")}
                disabled={loadingPreview || !preview}
              >
                {loadingPreview && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Weiter
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-5">
            {preview && preview.ownedTeams.length > 0 && (
              <section className="space-y-3" aria-labelledby="team-transfer-heading">
                <div className="flex items-start gap-3">
                  <Users className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <h3 id="team-transfer-heading" className="font-semibold text-foreground">Teamverwaltung übertragen</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      Daten anderer Teammitglieder bleiben bestehen. Wähle für jedes von dir verwaltete Team einen Co-Coach.
                    </p>
                  </div>
                </div>

                {preview.ownedTeams.map((team) => (
                  <div key={team.id} className="space-y-1.5">
                    <label htmlFor={`team-transfer-${team.id}`} className="text-sm font-medium text-foreground">
                      {team.name}{team.archived ? " (archiviert)" : ""}
                    </label>
                    {team.candidates.length > 0 ? (
                      <Select
                        value={transfers[team.id] ?? ""}
                        onValueChange={(successorId) => setTransfers((current) => ({ ...current, [team.id]: successorId }))}
                      >
                        <SelectTrigger id={`team-transfer-${team.id}`}>
                          <SelectValue placeholder="Co-Coach auswählen" />
                        </SelectTrigger>
                        <SelectContent>
                          {team.candidates.map((candidate) => (
                            <SelectItem key={candidate.userId} value={candidate.userId}>{candidate.fullName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-foreground">
                        Für dieses Team ist noch kein weiterer Coach hinterlegt.
                      </p>
                    )}
                  </div>
                ))}

                {blockedTeams.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      handleOpenChange(false);
                      navigate("/coach");
                    }}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Teamverwaltung öffnen
                  </Button>
                )}
              </section>
            )}

            <div className="space-y-1.5">
              <label htmlFor="delete-account-password" className="text-sm font-medium text-foreground">
                Aktuelles Passwort
              </label>
              <Input
                id="delete-account-password"
                name="delete-account-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Passwort zur Bestätigung"
                disabled={deleting || blockedTeams.length > 0}
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Dein Passwort wird ausschließlich von der Anmeldung geprüft und nicht an den Löschdienst übermittelt.
              </p>
            </div>

            {error && (
              <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setStep("overview")} disabled={deleting}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Zurück
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting || !password || !transfersComplete || blockedTeams.length > 0}
              >
                {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Account endgültig löschen
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
