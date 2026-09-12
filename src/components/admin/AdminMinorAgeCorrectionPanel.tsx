import { FormEvent, useState } from "react";
import { AlertTriangle, Loader2, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AgeBand = "under_16" | "age_16_17" | "adult";

type Candidate = {
  user_id: string;
  email: string;
  full_name: string;
  role: "athlete";
  team_names: string[];
  age_band: AgeBand | null;
  age_assurance_method: "age_band_self_declaration" | "support_verified_correction" | null;
  product_status: string | null;
  guardian_status: string | null;
};

type CorrectionResult = {
  success: boolean;
  changed: boolean;
  age_band: "under_16";
  age_assurance_method: "support_verified_correction" | "age_band_self_declaration";
  product_status: string;
  guardian_status: string;
};

const AGE_LABEL: Record<AgeBand, string> = {
  under_16: "Unter 16",
  age_16_17: "16–17",
  adult: "18+",
};

const AdminMinorAgeCorrectionPanel = () => {
  const [email, setEmail] = useState("");
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [correcting, setCorrecting] = useState(false);

  const findCandidate = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || searching) return;

    setSearching(true);
    setCandidate(null);
    setSearched(false);
    // Generated database types are updated only after the migration is applied.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("find_admin_minor_age_candidate", {
      _email: normalizedEmail,
    });
    setSearching(false);
    setSearched(true);

    if (error) {
      toast.error("Der Athleten-Account konnte nicht sicher geprüft werden.");
      return;
    }
    setCandidate((data as Candidate | null) ?? null);
  };

  const correctAge = async () => {
    if (!candidate || correcting || candidate.age_band === "under_16") return;

    setCorrecting(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("admin_correct_athlete_to_under_16", {
      _user_id: candidate.user_id,
      _confirmation: "ALTERSGRUPPE_UNTER_16_BESTAETIGT",
    });
    setCorrecting(false);

    if (error) {
      toast.error("Die Altersgruppe wurde nicht geändert. Bitte Status erneut prüfen.");
      return;
    }

    const result = data as CorrectionResult;
    setCandidate({
      ...candidate,
      age_band: result.age_band,
      age_assurance_method: result.age_assurance_method,
      product_status: result.product_status,
      guardian_status: result.guardian_status,
    });
    toast.success("Altersgruppe korrigiert. Der Guardian-Flow ist jetzt verpflichtend.");
  };

  const canCorrect = candidate?.age_band === "adult" || candidate?.age_band === "age_16_17";

  return (
    <Card className="border-amber-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Alterskorrektur Minderjährige
        </CardTitle>
        <CardDescription>
          Nur verwenden, wenn die Person sicher unter 16 ist. Der Account und alle bisherigen
          Programmdaten bleiben erhalten; der Zugang wird bis zur Elternfreigabe gesperrt.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={findCandidate}>
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="minor-age-correction-email">Exakte Account-E-Mail</Label>
            <Input
              id="minor-age-correction-email"
              type="email"
              className="h-11"
              autoComplete="off"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setCandidate(null);
                setSearched(false);
              }}
              placeholder="spieler@beispiel.de"
            />
          </div>
          <Button type="submit" variant="outline" className="min-h-11" disabled={!email.trim() || searching}>
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Sicher prüfen
          </Button>
        </form>

        {searched && !candidate && (
          <p className="rounded-lg border border-border/70 bg-secondary/30 p-3 text-sm text-muted-foreground">
            Kein Athleten-Account mit dieser exakten E-Mail gefunden.
          </p>
        )}

        {candidate && (
          <div className="space-y-4 rounded-xl border border-border/70 bg-secondary/20 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{candidate.full_name}</p>
                <p className="break-all text-sm text-muted-foreground">{candidate.email}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {candidate.team_names.length ? candidate.team_names.join(", ") : "Noch keinem Team zugeordnet"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {candidate.age_band ? AGE_LABEL[candidate.age_band] : "Altersgruppe fehlt"}
                </Badge>
                <Badge variant={candidate.product_status === "authorized" ? "secondary" : "outline"}>
                  {candidate.product_status === "authorized" ? "Zugang aktiv" : "Freigabe offen"}
                </Badge>
              </div>
            </div>

            {canCorrect ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="min-h-11 w-full sm:w-auto" variant="destructive">
                    Auf „Unter 16“ korrigieren
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="mx-4 w-[calc(100%-2rem)] max-w-lg rounded-lg">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Guardian-Flow verbindlich aktivieren?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3 leading-relaxed">
                      <span className="block">
                        Du bestätigst, dass {candidate.full_name} unter 16 ist. Beim nächsten Öffnen
                        wird der geschützte Programmbereich sofort gesperrt.
                      </span>
                      <span className="block font-medium text-foreground">
                        Fragebogen, Team, Fortschritt und alle bisherigen Einträge bleiben unverändert.
                        Erst Elternfreigabe und Zustimmung des Athleten öffnen exakt diesen Stand wieder.
                      </span>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="min-h-11" disabled={correcting}>Abbrechen</AlertDialogCancel>
                    <AlertDialogAction
                      className="min-h-11"
                      disabled={correcting}
                      onClick={() => void correctAge()}
                    >
                      {correcting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Verbindlich korrigieren
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : candidate.age_band === "under_16" ? (
              <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  Bereits „Unter 16“. Status: {candidate.guardian_status === "authorized" ? "Elternfreigabe erteilt" : "Elternfreigabe offen"}.
                </span>
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-muted-foreground">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <span>Für diesen Account ist noch keine Altersgruppe gespeichert. Die Person muss zuerst den regulären Alters-Flow öffnen.</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminMinorAgeCorrectionPanel;
