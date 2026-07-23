import { FormEvent, useState } from "react";
import { CheckCircle2, Loader2, Search, ShieldCheck, UserRoundCheck } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Candidate = {
  user_id: string;
  email: string;
  full_name: string;
  email_confirmed: boolean;
  role: "athlete" | "coach" | "admin" | null;
};

type TeamOption = {
  id: string;
  name: string;
};

type ApprovalResult = {
  success: boolean;
  team_name: string;
  action: "coach_approved_and_assigned" | "coach_assigned_to_team";
};

const CoachAccessApprovalPanel = ({
  teams,
  onApproved,
}: {
  teams: TeamOption[];
  onApproved: () => void;
}) => {
  const [email, setEmail] = useState("");
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [approving, setApproving] = useState(false);
  const [teamMode, setTeamMode] = useState<"new" | "existing">("new");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamSport, setNewTeamSport] = useState("");

  const resetCandidate = () => {
    setCandidate(null);
    setSearched(false);
  };

  const findCandidate = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || searching) return;

    setSearching(true);
    setCandidate(null);
    const { data, error } = await supabase.rpc("find_coach_access_candidate", {
      _email: normalizedEmail,
    });
    setSearching(false);
    setSearched(true);

    if (error) {
      toast.error("Der Account konnte nicht geprüft werden.");
      return;
    }

    setCandidate((data as Candidate | null) ?? null);
  };

  const canApprove = Boolean(
    candidate
    && candidate.email_confirmed
    && candidate.role !== "admin"
    && (
      (teamMode === "new" && newTeamName.trim().length >= 2)
      || (teamMode === "existing" && selectedTeamId)
    ),
  );

  const approve = async () => {
    if (!candidate || !canApprove || approving) return;

    setApproving(true);
    const { data, error } = await supabase.rpc("approve_coach_access", {
      _user_id: candidate.user_id,
      _team_id: teamMode === "existing" ? selectedTeamId : null,
      _new_team_name: teamMode === "new" ? newTeamName.trim() : null,
      _new_team_sport: teamMode === "new" ? newTeamSport.trim() || null : null,
    });
    setApproving(false);

    if (error) {
      const message = error.message.includes("team_already_has_different_coach")
        ? "Dieses Team ist bereits einem anderen Coach zugeordnet."
        : "Die Coach-Freigabe konnte nicht abgeschlossen werden.";
      toast.error(message);
      return;
    }

    const result = data as ApprovalResult;
    toast.success(`Coach-Zugang freigegeben und ${result.team_name} zugeordnet.`);
    setEmail("");
    setCandidate(null);
    setSearched(false);
    setSelectedTeamId("");
    setNewTeamName("");
    setNewTeamSport("");
    onApproved();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <UserRoundCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <CardTitle>Coach-Zugang freigeben</CardTitle>
            <CardDescription className="mt-1">
              Nur nach Support-Anfrage und persönlicher Prüfung. Die Suche benötigt die exakte E-Mail-Adresse.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={findCandidate} className="flex flex-col gap-3 sm:flex-row">
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="coach-candidate-email">E-Mail des bestehenden Kontos</Label>
            <Input
              id="coach-candidate-email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                resetCandidate();
              }}
              placeholder="name@beispiel.de"
              required
            />
          </div>
          <Button type="submit" variant="outline" disabled={searching || !email.trim()} className="h-10 self-end">
            {searching ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Search className="h-4 w-4" aria-hidden="true" />}
            Prüfen
          </Button>
        </form>

        {searched && !candidate && (
          <p role="status" className="rounded-md border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
            Kein bestätigbares Konto mit dieser exakten E-Mail-Adresse gefunden.
          </p>
        )}

        {candidate && (
          <div className="space-y-5 rounded-md border border-border bg-secondary/20 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="font-heading font-semibold">{candidate.full_name}</p>
                <p className="mt-1 break-all text-sm text-muted-foreground">{candidate.email}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={candidate.email_confirmed ? "secondary" : "destructive"}>
                  E-Mail {candidate.email_confirmed ? "bestätigt" : "offen"}
                </Badge>
                <Badge variant="outline">{candidate.role ?? "Keine Rolle"}</Badge>
              </div>
            </div>

            {candidate.role === "admin" ? (
              <p className="text-sm text-destructive">Adminrollen können über diesen Weg nicht verändert werden.</p>
            ) : !candidate.email_confirmed ? (
              <p className="text-sm text-destructive">Die E-Mail muss vor der Coach-Freigabe bestätigt sein.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2" role="group" aria-label="Teamzuordnung">
                  <Button
                    type="button"
                    variant={teamMode === "new" ? "default" : "outline"}
                    onClick={() => setTeamMode("new")}
                  >
                    Neues Team
                  </Button>
                  <Button
                    type="button"
                    variant={teamMode === "existing" ? "default" : "outline"}
                    onClick={() => setTeamMode("existing")}
                    disabled={teams.length === 0}
                  >
                    Bestehendes Team
                  </Button>
                </div>

                {teamMode === "new" ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="coach-new-team-name">Teamname</Label>
                      <Input
                        id="coach-new-team-name"
                        value={newTeamName}
                        onChange={(event) => setNewTeamName(event.target.value)}
                        maxLength={100}
                        placeholder="Teamname"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="coach-new-team-sport">Sportart, optional</Label>
                      <Input
                        id="coach-new-team-sport"
                        value={newTeamSport}
                        onChange={(event) => setNewTeamSport(event.target.value)}
                        maxLength={100}
                        placeholder="Sportart"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="coach-existing-team">Team auswählen</Label>
                    <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                      <SelectTrigger id="coach-existing-team">
                        <SelectValue placeholder="Aktives Team auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  Rolle und Teamzuordnung werden gemeinsam gespeichert und ohne freie Notizen protokolliert.
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" disabled={!canApprove || approving} className="w-full">
                      {approving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                      Coach-Zugang freigeben
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Coach-Zugang verbindlich freigeben?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {candidate.full_name} erhält Coach-Rechte und wird dem gewählten Team als verantwortlicher Coach zugeordnet. Ein bestehendes Team kann nicht von einem anderen Coach übernommen werden. Dieser Schritt wird im Audit-Protokoll festgehalten.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                      <AlertDialogAction onClick={() => void approve()}>
                        Freigeben
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CoachAccessApprovalPanel;
