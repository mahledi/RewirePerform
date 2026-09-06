import { useState } from "react";
import { BarChart3, Check, Dumbbell, FlaskConical, ShieldCheck, Users } from "lucide-react";
import AthleteTransferPulse from "@/components/evidence/AthleteTransferPulse";
import CoachWeeklyReview from "@/components/evidence/CoachWeeklyReview";
import AdminComprehensionInsights, {
  type ComprehensionInsights,
} from "@/components/admin/AdminComprehensionInsights";
import QaEvidenceParityPanel from "@/components/admin/QaEvidenceParityPanel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  EVIDENCE_PROTOCOL_VERSION,
  TRANSFER_PULSE_SCHEDULE,
  getTransferPulseForDay,
  type TransferPulseResponse,
} from "@/lib/performanceEvidence";
import type { QaEvidenceParityReport } from "@/lib/qaEvidenceParity";
import { BrandSymbol } from "@/components/brand/BrandLogo";

const previewPulse = getTransferPulseForDay(18, "training");

const comprehensionPreview: ComprehensionInsights = {
  schema_version: "admin-comprehension-insights-v1",
  generated_at: "2026-07-27T12:30:00.000Z",
  include_test: false,
  summary: {
    participants: 12,
    completed_checks: 84,
    question_responses: 168,
    correct_responses: 127,
    incorrect_responses: 41,
    accuracy: 0.756,
    sufficient_data: true,
  },
  weeks: [
    { week_number: 1, participants: 12, completed_checks: 21, question_responses: 42, correct_responses: 34, incorrect_responses: 8, accuracy: 0.81, sufficient_data: true },
    { week_number: 2, participants: 11, completed_checks: 22, question_responses: 44, correct_responses: 31, incorrect_responses: 13, accuracy: 0.705, sufficient_data: true },
    { week_number: 3, participants: 10, completed_checks: 19, question_responses: 38, correct_responses: 27, incorrect_responses: 11, accuracy: 0.711, sufficient_data: true },
    { week_number: 4, participants: 10, completed_checks: 22, question_responses: 44, correct_responses: 35, incorrect_responses: 9, accuracy: 0.795, sufficient_data: true },
  ],
  days: [],
  questions: [
    {
      day_number: 8,
      week_number: 2,
      question_id: "d8-q1",
      question_version_key: "preview-d8",
      target: "Nächste Aktion",
      stem: "Was hilft dir nach einem Fehler am schnellsten zurück in die nächste Aktion?",
      participants: 11,
      times_shown: 11,
      correct_responses: 7,
      incorrect_responses: 4,
      accuracy: 0.636,
      needs_content_review: true,
      sufficient_data: true,
    },
    {
      day_number: 17,
      week_number: 3,
      question_id: "d17-q2",
      question_version_key: "preview-d17",
      target: "Fokus",
      stem: "Woran erkennst du, dass du deinen Fokus wieder auf das Spiel gerichtet hast?",
      participants: 10,
      times_shown: 10,
      correct_responses: 6,
      incorrect_responses: 4,
      accuracy: 0.6,
      needs_content_review: true,
      sufficient_data: true,
    },
  ],
  privacy: {
    minimum_participants_for_scores: 5,
    journal_or_reflection_text_included: false,
    selected_options_included: false,
    user_identifiers_included: false,
    names_or_emails_included: false,
    test_data_included: false,
  },
};

const buildQaPreview = (simulatedDayNumber: number): QaEvidenceParityReport => {
  const reachedDays = TRANSFER_PULSE_SCHEDULE.filter((pulse) => pulse.dayNumber <= simulatedDayNumber);
  const reachedCoachWeeks = Math.floor(simulatedDayNumber / 7);
  return {
    schemaVersion: "qa_evidence_parity_v1",
    generatedAt: "2026-07-17T09:00:00.000Z",
    protocolVersion: EVIDENCE_PROTOCOL_VERSION,
    state: reachedDays.length > 0 ? "PASS" : "READY",
    stateLabel: reachedDays.length > 0
      ? "Bisherige QA-Messpunkte vollständig bestanden"
      : "Bereit für den ersten QA-Messpunkt",
    scope: {
      teamId: "qa-preview-team",
      teamName: "QA Test Team",
      programRunId: "qa-preview-run",
      programRunName: "QA Test Team · Run 1",
      simulatedDate: "2026-09-10",
      simulatedDayNumber,
      testOnly: true,
    },
    setup: {
      athletes: 5,
      activeInstances: 5,
      expectedQaAthletes: 5,
      allParticipantsTestFlagged: true,
    },
    coverage: {
      scheduledDays: 16,
      reachedDays: reachedDays.length,
      passedDays: reachedDays.length,
      expectedObservations: reachedDays.length * 5,
      collectedObservations: reachedDays.length * 5,
      missingObservations: 0,
      notObservedResponses: Math.min(reachedDays.length, 2),
      completedCoachWeeks: reachedCoachWeeks,
      reachedCoachWeeks,
    },
    days: TRANSFER_PULSE_SCHEDULE.map((pulse) => {
      const reached = pulse.dayNumber <= simulatedDayNumber;
      return {
        dayNumber: pulse.dayNumber,
        domainId: pulse.domainId,
        reached,
        athleteCount: 5,
        assignedAthletes: reached ? 5 : 0,
        expectedObservations: reached ? 5 : 0,
        restSkips: 0,
        completedAthletes: reached ? 5 : 0,
        collectedObservations: reached ? 5 : 0,
        notObserved: reached && pulse.dayNumber % 2 === 0 ? 1 : 0,
        missingObservations: 0,
        completionWithoutEvidence: 0,
        evidenceWithoutCompletion: 0,
        status: reached ? "passed" : "not_reached",
      };
    }),
    coachWeeks: Array.from({ length: 8 }, (_, index) => ({
      weekNumber: index + 1,
      reached: index + 1 <= reachedCoachWeeks,
      completed: index + 1 <= reachedCoachWeeks,
    })),
    checks: {
      participantsWithoutBothTestFlags: 0,
      observationsWithoutTestFlag: 0,
      coachReviewsWithoutTestFlag: 0,
      scheduleMismatches: 0,
      observationsVisibleInProduction: 0,
      participantsVisibleInProduction: 0,
      completionWithoutEvidence: 0,
      evidenceWithoutCompletion: 0,
    },
    privacy: {
      responseValuesExposed: false,
      athleteIdentifiersExposed: false,
      privateTextExposed: false,
      productionExportIncludesQa: false,
    },
  };
};

const EvidencePreview = () => {
  const [athleteValue, setAthleteValue] = useState<TransferPulseResponse | null>(null);
  const [athleteSaved, setAthleteSaved] = useState(false);
  const [coachSaved, setCoachSaved] = useState(false);
  const [qaDay, setQaDay] = useState(28);

  if (!previewPulse) return null;

  return (
    <main className="min-h-dvh bg-background pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      <header className="border-b border-border/60 bg-background/88 px-4 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary">
            <BrandSymbol size={28} />
          </span>
          <div>
            <p className="text-xs font-medium text-muted-foreground">RewirePerform · Interne Vorschau</p>
            <h1 className="text-base font-semibold text-foreground">Performance Evidence</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <Tabs defaultValue="athlete">
          <TabsList className="grid h-[52px] w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="athlete" className="h-11 gap-2">
              <Dumbbell className="h-4 w-4" aria-hidden="true" /> Athlet
            </TabsTrigger>
            <TabsTrigger value="coach" className="h-11 gap-2">
              <Users className="h-4 w-4" aria-hidden="true" /> Coach
            </TabsTrigger>
            <TabsTrigger value="qa" className="h-11 gap-2">
              <FlaskConical className="h-4 w-4" aria-hidden="true" /> QA Gate
            </TabsTrigger>
            <TabsTrigger value="admin" className="h-11 gap-2">
              <BarChart3 className="h-4 w-4" aria-hidden="true" /> Admin
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

          <TabsContent value="qa" className="mt-8">
            <div className="rounded-md border border-border/65 bg-card/45 px-4 pb-6 shadow-card sm:px-7 sm:pb-8">
              <QaEvidenceParityPanel
                programRunId="qa-preview-run"
                reportOverride={buildQaPreview(qaDay)}
                onJumpToDay={async (dayNumber) => setQaDay(dayNumber)}
              />
            </div>
          </TabsContent>

          <TabsContent value="admin" className="mt-8">
            <AdminComprehensionInsights payloadOverride={comprehensionPreview} />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
};

export default EvidencePreview;
