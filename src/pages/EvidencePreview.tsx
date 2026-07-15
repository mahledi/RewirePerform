import { useState } from "react";
import { Activity, Check, Dumbbell, ShieldCheck, Users } from "lucide-react";
import AthleteTransferPulse from "@/components/evidence/AthleteTransferPulse";
import CoachWeeklyReview from "@/components/evidence/CoachWeeklyReview";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getTransferPulseForDay, type TransferPulseResponse } from "@/lib/performanceEvidence";

const previewPulse = getTransferPulseForDay(18, "training");

const EvidencePreview = () => {
  const [athleteValue, setAthleteValue] = useState<TransferPulseResponse | null>(null);
  const [athleteSaved, setAthleteSaved] = useState(false);
  const [coachSaved, setCoachSaved] = useState(false);

  if (!previewPulse) return null;

  return (
    <main className="min-h-dvh bg-background pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      <header className="border-b border-border/60 bg-background/88 px-4 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary">
            <Activity className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Interne Vorschau</p>
            <h1 className="text-base font-semibold text-foreground">Performance Evidence</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <Tabs defaultValue="athlete">
          <TabsList className="grid h-[52px] w-full max-w-sm grid-cols-2">
            <TabsTrigger value="athlete" className="h-11 gap-2">
              <Dumbbell className="h-4 w-4" aria-hidden="true" /> Athlet
            </TabsTrigger>
            <TabsTrigger value="coach" className="h-11 gap-2">
              <Users className="h-4 w-4" aria-hidden="true" /> Coach
            </TabsTrigger>
          </TabsList>

          <TabsContent value="athlete" className="mt-8">
            <div className="mx-auto max-w-xl rounded-md border border-border/65 bg-card/45 px-4 py-6 shadow-card sm:px-7 sm:py-8">
              <AthleteTransferPulse
                pulse={previewPulse}
                value={athleteValue}
                onValueChange={(next) => {
                  setAthleteValue(next);
                  setAthleteSaved(false);
                }}
              />
              <div className="mx-auto mt-6 max-w-xl border-t border-border/55 pt-5">
                <Button
                  type="button"
                  onClick={() => setAthleteSaved(true)}
                  disabled={athleteValue === null}
                  className="h-11 w-full"
                >
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Antwort bestätigen
                </Button>
                {athleteSaved && (
                  <div role="status" className="mt-4 flex items-center gap-2 text-sm text-primary">
                    <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                    Auswahl geprüft. Es wurden keine Daten gespeichert.
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="coach" className="mt-8">
            <div className="rounded-md border border-border/65 bg-card/45 px-4 py-6 shadow-card sm:px-7 sm:py-8">
              <CoachWeeklyReview
                weekNumber={3}
                onSubmit={() => setCoachSaved(true)}
              />
              {coachSaved && (
                <div role="status" className="mx-auto mt-5 flex max-w-2xl items-center gap-2 text-sm text-primary">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Lokal geprüft. Es wurden keine Daten gespeichert.
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
};

export default EvidencePreview;
