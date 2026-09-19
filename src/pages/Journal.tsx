import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { ArrowLeft, ArrowRight, BookOpen, Check, Dumbbell, Loader2, Moon, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Textarea } from "@/components/ui/textarea";
import VoiceInput from "@/components/VoiceInput";
import { toast } from "sonner";
import { getCurrentProgramDay, getEffectiveProgramStart } from "@/lib/getCurrentProgramDay";
import { resolveDay } from "@/lib/getDayContent";
import { getEffectiveTodayDate } from "@/lib/qaTime";
import { getProgramModeInfo } from "@/lib/programMode";
import { AthleteScreenHeader } from "@/components/app/AthleteAppChrome";
import { captureAppError } from "@/lib/monitoring";
import { upsertTodaySnapshot } from "@/lib/programProgress";
import { clearLocalDraft, readLocalDraft, writeLocalDraft } from "@/lib/localDrafts";
import { getJournalCompletionLabel } from "@/lib/journalPresentation";
import type { CalendarEventType, ResolvedDay } from "@/content/matrixDayTypes";
import {
  AthleteFlowButton,
  AthleteFlowAmbient,
  AthleteFlowProgress,
  AthleteFlowScene,
  athleteFlowInput,
  athleteFlowPrimaryButton,
  athleteFlowSecondaryButton,
} from "@/components/app/AthleteFlowScene";

const journalContextConfig: Record<CalendarEventType, { icon: typeof Dumbbell; color: string; bg: string }> = {
  training: { icon: Dumbbell, color: "text-primary", bg: "bg-primary/10" },
  rest: { icon: Moon, color: "text-blue-400", bg: "bg-blue-400/10" },
  competition: { icon: Trophy, color: "text-yellow-400", bg: "bg-yellow-400/10" },
};

const parseGratitude = (raw: unknown): string => {
  if (Array.isArray(raw)) {
    return raw.filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean)
      .join("\n");
  }
  return typeof raw === "string" ? raw : "";
};

const countWords = (value: string): number =>
  value.trim() ? value.trim().split(/\s+/u).length : 0;

interface JournalDraft {
  answers: Record<string, string>;
  gratitude: string[] | string;
  freeReflection: string;
  journalStep?: number;
  savedAt: string;
}

const Journal = () => {
  const navigate = useNavigate();
  const { user, role, isTestUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resolved, setResolved] = useState<ResolvedDay | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [gratitude, setGratitude] = useState("");
  const [freeReflection, setFreeReflection] = useState("");
  const [journalStep, setJournalStep] = useState(0);
  const [done, setDone] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeInstanceId, setActiveInstanceId] = useState<string | null>(null);

  const legacyDraftKey = user?.id && resolved?.date ? `journal:${user.id}:${resolved.date}` : null;
  const draftKey = user?.id && resolved?.date && activeInstanceId
    ? `journal:${user.id}:${activeInstanceId}:${resolved.date}`
    : legacyDraftKey;

  useEffect(() => {
    if (!user?.id) {
      navigate("/auth");
      return;
    }
    loadDay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadDay = async () => {
    if (!user?.id) return;
    const today = await getEffectiveTodayDate(user.id);
    const dateStr = format(today, "yyyy-MM-dd");

    const { getOrCreateActiveInstance } = await import("@/lib/programInstance");
    const instance = await getOrCreateActiveInstance(user.id);
    setActiveInstanceId(instance?.id ?? null);
    let existingJournalQuery = supabase
      .from("daily_journals")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", dateStr)
      .limit(1);
    existingJournalQuery = instance?.id
      ? existingJournalQuery.eq("program_instance_id", instance.id)
      : existingJournalQuery.is("program_instance_id", null);

    const [effective, modeInfo, { data: existingRows }] = await Promise.all([
      getEffectiveProgramStart(user.id),
      getProgramModeInfo(user.id),
      existingJournalQuery,
    ]);
    const existing = existingRows?.[0] ?? null;

    const info = getCurrentProgramDay(effective.startDate, today);
    if (!info) {
      setLoading(false);
      return;
    }
    const { data: events } = modeInfo.mode === "team" && modeInfo.teamId
      ? await supabase
          .from("team_calendar_events")
          .select("date,event_type")
          .eq("team_id", modeInfo.teamId)
          .eq("date", dateStr)
          .limit(1)
      : await supabase
          .from("calendar_events")
          .select("date,event_type")
          .eq("user_id", user.id)
          .eq("date", dateStr)
          .limit(1);
    const eventType = (events?.[0]?.event_type ?? "training") as CalendarEventType;
    const r = resolveDay(info.dayNumber, today, eventType);
    setResolved(r);

    if (existing) {
      setAnswers((existing.answers as Record<string, string>) ?? {});
      setGratitude(parseGratitude(existing.gratitude));
      setFreeReflection(existing.free_reflection ?? "");
      setDone(true);
    } else {
      const scopedDraftKey = instance?.id
        ? `journal:${user.id}:${instance.id}:${r.date}`
        : `journal:${user.id}:${r.date}`;
      const local = readLocalDraft<JournalDraft>(scopedDraftKey)
        ?? readLocalDraft<JournalDraft>(`journal:${user.id}:${r.date}`);
      if (local) {
        setAnswers(local.answers ?? {});
        setGratitude(parseGratitude(local.gratitude));
        setFreeReflection(local.freeReflection ?? "");
        setJournalStep(local.journalStep ?? 0);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!draftKey || done) return;
    const hasDraft =
      Object.values(answers).some((value) => value.trim().length > 0) ||
      gratitude.trim().length > 0 ||
      freeReflection.trim().length > 0;
    if (!hasDraft) return;
    writeLocalDraft<JournalDraft>(draftKey, {
      answers,
      gratitude,
      freeReflection,
      journalStep,
      savedAt: new Date().toISOString(),
    });
  }, [answers, gratitude, freeReflection, journalStep, draftKey, done]);

  const handleSave = async () => {
    if (!user?.id || !resolved || saving) return;
    const allQuestionsReady = resolved.content.journal.questions.every(
      (question) => (answers[question.id] ?? "").trim().length > 0,
    );
    if (!allQuestionsReady) {
      toast.error("Beantworte zuerst die offenen Fragen deines Tages.");
      setJournalStep(0);
      return;
    }
    const gratitudeMinWords = resolved.content.journal.gratitudeMinWords ?? 8;
    if (countWords(gratitude) < gratitudeMinWords) {
      toast.error(
        `Schreib bitte mindestens ${gratitudeMinWords} Wörter zu dem, was heute gut, hilfreich oder tragend war.`,
      );
      return;
    }
    setSaveError(null);
    setSaving(true);
    let hasProgramInstance = false;
    try {
      const { getOrCreateActiveInstance } = await import("@/lib/programInstance");
      const instance = await getOrCreateActiveInstance(user.id);
      if (!instance?.id) {
        throw new Error("active_program_instance_required");
      }
      hasProgramInstance = true;
      const payload = {
        user_id: user.id,
        date: resolved.date,
        day_number: resolved.matrix.dayNumber,
        journal_title: resolved.content.journal.journalTitle,
        answers,
        gratitude: gratitude.trim() || null,
        free_reflection: freeReflection || null,
        program_instance_id: instance.id,
      };
      let existingQuery = supabase
        .from("daily_journals")
        .select("id")
        .eq("user_id", user.id)
        .eq("date", resolved.date)
        .limit(1);
      existingQuery = instance?.id
        ? existingQuery.eq("program_instance_id", instance.id)
        : existingQuery.is("program_instance_id", null);

      const { data: existingRows, error: lookupError } = await existingQuery;
      const existing = existingRows?.[0] ?? null;
      const { error } = lookupError
        ? { error: lookupError }
        : existing
          ? await supabase.from("daily_journals").update(payload).eq("id", existing.id)
          : await supabase.from("daily_journals").insert(payload);
      if (error) {
        throw error;
      }
      await upsertTodaySnapshot(user.id);
      if (draftKey) clearLocalDraft(draftKey);
      if (legacyDraftKey && legacyDraftKey !== draftKey) clearLocalDraft(legacyDraftKey);
      setDone(true);
    } catch (error) {
      setSaving(false);
      console.error(error);
      void captureAppError({
        eventName: "journal_saved",
        error,
        role,
        route: "/journal",
        isTest: isTestUser,
        metadata: {
          day_number: resolved.matrix.dayNumber,
          has_program_instance: hasProgramInstance,
        },
      });
      setSaveError("Dein Journal ist lokal gesichert. Bitte erneut speichern, sobald die Verbindung stabil ist.");
      toast.error("Journal lokal gesichert. Speichern bitte erneut versuchen.");
      return;
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (!resolved) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <BookOpen className="w-10 h-10 text-muted-foreground mb-4" />
        <h2 className="font-heading text-xl font-bold mb-2">Programm noch nicht gestartet</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Sobald dein 56-Tage-Programm läuft, erscheint hier dein Tagesjournal.
        </p>
        <AthleteFlowButton
          onClick={() => navigate("/dashboard")}
          className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium"
        >
          Zum Dashboard
        </AthleteFlowButton>
      </div>
    );
  }

  if (done) {
    return (
      <div className="relative flex min-h-screen min-h-[100dvh] items-center overflow-hidden bg-[#0D0E12] px-6 text-[#EEF0F2]">
        <AthleteFlowAmbient />
        <AthleteFlowScene duration={0.34} className="mx-auto w-full max-w-md">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/[0.1] text-primary shadow-[0_0_36px_-17px_rgba(46,173,137,0.72)]">
            <Check className="h-7 w-7" />
          </div>
          <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Privat gespeichert</p>
          <h2 className="mt-3 font-heading text-3xl font-semibold tracking-[-0.04em]">Tagesbogen geschlossen.</h2>
          <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-white/42">
            Tag {resolved.matrix.dayNumber}/56
          </p>
          <p className="mt-5 max-w-sm text-[15px] leading-7 text-white/60">
            Deine Reflexion bleibt privat. Morgen wartet die nächste Linie auf dem Dashboard.
          </p>
          <div className="mt-9 grid gap-3">
            <button onClick={() => navigate("/journal/history")} className={athleteFlowPrimaryButton}>Einträge ansehen</button>
            <button onClick={() => navigate("/dashboard")} className={athleteFlowSecondaryButton}>Zurück zum Dashboard</button>
          </div>
        </AthleteFlowScene>
      </div>
    );
  }

  const { content, matrix } = resolved;
  const j = content.journal;
  const contextConfig = journalContextConfig[resolved.calendarEventType];
  const ContextIcon = contextConfig.icon;
  const questionCount = j.questions.length;
  const gratitudeStep = questionCount;
  const hasFreeReflection = Boolean(j.freeReflectionPrompt);
  const freeReflectionStep = hasFreeReflection ? questionCount + 1 : null;
  const lastJournalStep = freeReflectionStep ?? gratitudeStep;
  const totalJournalSteps = lastJournalStep + 1;
  const safeJournalStep = Math.min(journalStep, lastJournalStep);
  const activeQuestion = j.questions[safeJournalStep];
  const isGratitudeStep = safeJournalStep === gratitudeStep;
  const isFreeReflectionStep = freeReflectionStep !== null && safeJournalStep === freeReflectionStep;
  const gratitudeMinWords = j.gratitudeMinWords ?? 8;
  const gratitudeWords = countWords(gratitude);
  const currentAnswerReady = activeQuestion
    ? (answers[activeQuestion.id] ?? "").trim().length > 0
    : false;
  const allQuestionsReady = j.questions.every(
    (question) => (answers[question.id] ?? "").trim().length > 0,
  );
  const completionLabel = getJournalCompletionLabel({
    saving,
    hasSaveError: Boolean(saveError),
    allQuestionsReady,
    gratitudeWords,
    gratitudeMinWords,
  });

  return (
    <div className="relative min-h-screen min-h-[100dvh] overflow-x-hidden bg-[#0D0E12] text-[#EEF0F2]">
      <AthleteFlowAmbient />
      <AthleteScreenHeader
        title={j.journalTitle}
        eyebrow={`Tag ${matrix.dayNumber} · ${resolved.context.label} · ${format(new Date(resolved.date), "d. MMM", { locale: de })}`}
        onBack={() => navigate("/dashboard")}
        backLabel="Zurück zum Dashboard"
        trailing={(
          <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${contextConfig.bg}`}>
            <ContextIcon className={`h-4 w-4 ${contextConfig.color}`} />
          </div>
        )}
      />

      <div className="relative mx-auto flex min-h-[calc(100dvh-5.5rem)] max-w-2xl flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+7rem)] pt-6">
        {saveError && (
          <div className="mb-5 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-muted-foreground">
            {saveError}
          </div>
        )}

        <div className="flex items-center gap-2" aria-label={`Schritt ${safeJournalStep + 1} von ${totalJournalSteps}`}>
          <AthleteFlowProgress value={((safeJournalStep + 1) / totalJournalSteps) * 100} className="flex-1" />
          <span className="ml-1 text-[10px] tabular-nums text-white/38">{safeJournalStep + 1}/{totalJournalSteps}</span>
        </div>
        <p className="sr-only">Eine Frage pro Schritt</p>

        <div className="flex flex-1 items-center py-8 sm:py-10">
          <AnimatePresence mode="wait" initial={false}>
        {activeQuestion && (
          <AthleteFlowScene
            key={activeQuestion.id}
            className="w-full"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
              Frage {safeJournalStep + 1} von {questionCount}
            </p>
            <label className="mt-4 block max-w-xl text-[clamp(1.75rem,6vw,2.65rem)] font-semibold leading-[1.08] tracking-[-0.04em] text-foreground">{activeQuestion.question}</label>
            <Textarea
              value={answers[activeQuestion.id] ?? ""}
              onChange={(event) => setAnswers((previous) => ({
                ...previous,
                [activeQuestion.id]: event.target.value,
              }))}
              placeholder={activeQuestion.placeholder ?? ""}
              className={`${athleteFlowInput} mt-7 min-h-[180px] resize-none rounded-[24px] p-5 text-base leading-7`}
            />
            <div className="mt-3"><VoiceInput currentValue={answers[activeQuestion.id] ?? ""} onTranscript={(text) => setAnswers((previous) => ({ ...previous, [activeQuestion.id]: text }))} showHint={false} /></div>
          </AthleteFlowScene>
        )}

        {isGratitudeStep && (
          <AthleteFlowScene
            key="gratitude"
            className="w-full"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Blick öffnen</p>
            <label className="mt-4 block max-w-xl text-[clamp(1.75rem,6vw,2.65rem)] font-semibold leading-[1.08] tracking-[-0.04em]">Was war heute gut, hilfreich oder tragend?</label>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/42">{j.gratitudeInstruction}</p>
            <Textarea
              value={gratitude}
              onChange={(event) => setGratitude(event.target.value)}
              placeholder="Schreib einen konkreten Satz …"
              className={`${athleteFlowInput} mt-7 min-h-[180px] resize-none rounded-[24px] p-5 text-base leading-7`}
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <VoiceInput currentValue={gratitude} onTranscript={setGratitude} showHint={false} />
              <span className={`text-xs ${gratitudeWords >= gratitudeMinWords ? "text-primary" : "text-white/35"}`}>
                {gratitudeWords}/{gratitudeMinWords} Wörter
              </span>
            </div>
          </AthleteFlowScene>
        )}

        {isFreeReflectionStep && j.freeReflectionPrompt && (
          <AthleteFlowScene key="free-reflection" className="w-full">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Freier Abschluss · optional</p>
            <label className="mt-4 block max-w-xl text-[clamp(1.75rem,6vw,2.65rem)] font-semibold leading-[1.08] tracking-[-0.04em]">{j.freeReflectionPrompt}</label>
            <Textarea
              value={freeReflection}
              onChange={(event) => setFreeReflection(event.target.value)}
              placeholder="Optional …"
              className={`${athleteFlowInput} mt-7 min-h-[180px] resize-none rounded-[24px] p-5 text-base leading-7`}
            />
            <div className="mt-3"><VoiceInput currentValue={freeReflection} onTranscript={setFreeReflection} showHint={false} /></div>
          </AthleteFlowScene>
        )}
        </AnimatePresence>
        </div>

        <div className="sticky bottom-3 z-20 grid grid-cols-[auto_1fr] gap-3 rounded-[22px] border border-white/[0.07] bg-[#0B0C10]/92 p-2 shadow-[0_18px_60px_-30px_rgba(0,0,0,0.95)] backdrop-blur-2xl">
          <AthleteFlowButton
            onClick={() => setJournalStep((current) => Math.max(0, current - 1))}
            disabled={safeJournalStep === 0}
            className={`${athleteFlowSecondaryButton} w-12 px-0 disabled:opacity-25`}
            aria-label="Zurück"
          >
            <ArrowLeft className="h-4 w-4" />
          </AthleteFlowButton>
          {safeJournalStep === lastJournalStep ? (
            <AthleteFlowButton
              onClick={handleSave}
              disabled={saving || !allQuestionsReady || gratitudeWords < gratitudeMinWords}
              className={`${athleteFlowPrimaryButton} w-full`}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : gratitudeWords >= gratitudeMinWords && allQuestionsReady ? (
                <Check className="h-4 w-4" />
              ) : null}
              <span
                aria-live="polite"
                className={gratitudeWords < gratitudeMinWords ? "text-white/70" : undefined}
              >
                {completionLabel}
              </span>
            </AthleteFlowButton>
          ) : (
            <AthleteFlowButton
              onClick={() => setJournalStep((current) => Math.min(lastJournalStep, current + 1))}
              disabled={activeQuestion ? !currentAnswerReady : isGratitudeStep && gratitudeWords < gratitudeMinWords}
              className={`${athleteFlowPrimaryButton} w-full`}
            >
              Weiter <ArrowRight className="h-4 w-4" />
            </AthleteFlowButton>
          )}
        </div>
      </div>
    </div>
  );
};

export default Journal;
