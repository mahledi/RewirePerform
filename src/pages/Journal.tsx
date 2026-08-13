import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { ArrowLeft, ArrowRight, BookOpen, Check, Dumbbell, Loader2, Mic, Moon, Trophy } from "lucide-react";
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
import type { CalendarEventType, ResolvedDay } from "@/content/matrixDayTypes";

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
        <button
          onClick={() => navigate("/dashboard")}
          className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium"
        >
          Zum Dashboard
        </button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-6">
          <Check className="w-8 h-8 text-primary" />
        </motion.div>
        <h2 className="font-heading text-2xl font-bold mb-2">Tagesbogen geschlossen.</h2>
        <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-3">
          Tag {resolved.matrix.dayNumber}/56 gespeichert
        </p>
        <p className="text-sm text-muted-foreground mb-8 max-w-sm">
          Deine Reflexion bleibt privat. Morgen wartet die nächste Linse auf dem Dashboard.
        </p>
        <button
          onClick={() => navigate("/journal/history")}
          className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium"
        >
          Einträge ansehen
        </button>
        <button
          onClick={() => navigate("/dashboard")}
          className="mt-3 px-6 py-3 rounded-xl text-muted-foreground hover:text-foreground font-medium"
        >
          Zurück zum Dashboard
        </button>
      </div>
    );
  }

  const { content, matrix } = resolved;
  const j = content.journal;
  const contextConfig = journalContextConfig[resolved.calendarEventType];
  const ContextIcon = contextConfig.icon;
  const displayTitle = content.title ?? matrix.lens;
  const displayLens = content.lens ?? matrix.practiceFocus;
  const questionCount = j.questions.length;
  const gratitudeStep = questionCount;
  const totalJournalSteps = questionCount + 1;
  const safeJournalStep = Math.min(journalStep, gratitudeStep);
  const activeQuestion = j.questions[safeJournalStep];
  const isGratitudeStep = safeJournalStep === gratitudeStep;
  const gratitudeMinWords = j.gratitudeMinWords ?? 8;
  const gratitudeWords = countWords(gratitude);
  const currentAnswerReady = activeQuestion
    ? (answers[activeQuestion.id] ?? "").trim().length > 0
    : false;
  const allQuestionsReady = j.questions.every(
    (question) => (answers[question.id] ?? "").trim().length > 0,
  );

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#0D0E12] text-[#EEF0F2]">
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

      <div className="mx-auto max-w-2xl space-y-6 px-5 py-7 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
        {/* Lens reminder */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-2xl bg-gradient-card border-glow">
          <p className="text-[10px] uppercase tracking-widest text-primary mb-2">Heute im Fokus</p>
          <p className="text-base font-heading font-semibold leading-snug">{displayTitle}</p>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{displayLens}</p>
          <div className="mt-4 pt-4 border-t border-border/50 flex items-start gap-3">
            <ContextIcon className={`w-4 h-4 mt-0.5 shrink-0 ${contextConfig.color}`} />
            <p className="text-xs text-muted-foreground leading-relaxed">{resolved.context.focus}</p>
          </div>
        </motion.div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          {resolved.context.journal.intro}
        </p>

        <button
          type="button"
          onClick={() => navigate("/journal/history")}
          className="w-full rounded-2xl border border-border/50 bg-secondary/25 px-5 py-4 text-left transition-colors hover:bg-secondary/40 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <BookOpen className="w-5 h-5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-heading font-semibold">Frühere Einträge ansehen</p>
              <p className="text-xs text-muted-foreground">Privater Rückblick, nach Tagen geordnet.</p>
            </div>
          </div>
          <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180 shrink-0" />
        </button>

        {/* Speak-don't-type hint */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20"
        >
          <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground leading-snug">
              Sprich deine Antworten ein.
            </p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Nutze Sprache, wenn du Gedanken damit direkter festhalten kannst. Du kannst den übernommenen Text anschließend bearbeiten oder vollständig tippen.
            </p>
          </div>
        </motion.div>

        {saveError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-muted-foreground">
            {saveError}
          </div>
        )}

        <div className="flex items-center gap-2" aria-label={`Schritt ${safeJournalStep + 1} von ${totalJournalSteps}`}>
          {Array.from({ length: totalJournalSteps }, (_, index) => (
            <span
              key={index}
              className={`h-1.5 flex-1 rounded-full ${index <= safeJournalStep ? "bg-primary" : "bg-white/[0.07]"}`}
            />
          ))}
          <span className="ml-1 text-[10px] tabular-nums text-white/38">{safeJournalStep + 1}/{totalJournalSteps}</span>
        </div>

        {activeQuestion && (
          <motion.div
            key={activeQuestion.id}
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4 rounded-[24px] border border-white/[0.065] bg-white/[0.025] p-5"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
              Frage {safeJournalStep + 1} von {questionCount}
            </p>
            <label className="block text-xl font-semibold leading-7 text-foreground">{activeQuestion.question}</label>
            <Textarea
              value={answers[activeQuestion.id] ?? ""}
              onChange={(event) => setAnswers((previous) => ({
                ...previous,
                [activeQuestion.id]: event.target.value,
              }))}
              placeholder={activeQuestion.placeholder ?? ""}
              className="min-h-32 resize-none border-primary/10 bg-black/15 focus-visible:ring-primary"
            />
            <VoiceInput
              currentValue={answers[activeQuestion.id] ?? ""}
              onTranscript={(text) => setAnswers((previous) => ({ ...previous, [activeQuestion.id]: text }))}
              showHint={false}
            />
          </motion.div>
        )}

        {isGratitudeStep && (
          <motion.div
            key="gratitude"
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4 rounded-[24px] border border-primary/15 bg-primary/[0.045] p-5"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Blick öffnen</p>
            <label className="block text-xl font-semibold leading-7">Was war heute gut, hilfreich oder tragend?</label>
            <p className="text-sm leading-6 text-white/48">{j.gratitudeInstruction}</p>
            <Textarea
              value={gratitude}
              onChange={(event) => setGratitude(event.target.value)}
              placeholder="Schreib einen konkreten Satz …"
              className="min-h-32 resize-none border-primary/15 bg-black/15 focus-visible:ring-primary"
            />
            <div className="flex items-center justify-between gap-3">
              <VoiceInput currentValue={gratitude} onTranscript={setGratitude} showHint={false} />
              <span className={`text-xs ${gratitudeWords >= gratitudeMinWords ? "text-primary" : "text-white/35"}`}>
                {gratitudeWords}/{gratitudeMinWords} Wörter
              </span>
            </div>

            {j.freeReflectionPrompt && (
              <div className="space-y-2 border-t border-white/[0.06] pt-4">
                <label className="block text-xs text-muted-foreground">{j.freeReflectionPrompt}</label>
                <Textarea
                  value={freeReflection}
                  onChange={(event) => setFreeReflection(event.target.value)}
                  placeholder="Optional …"
                  className="min-h-20 resize-none bg-black/10"
                />
                <VoiceInput
                  currentValue={freeReflection}
                  onTranscript={setFreeReflection}
                  showHint={false}
                />
              </div>
            )}
          </motion.div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setJournalStep((current) => Math.max(0, current - 1))}
            disabled={safeJournalStep === 0}
            className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/[0.075] px-4 text-sm font-semibold text-white/55 disabled:opacity-25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ArrowLeft className="h-4 w-4" /> Zurück
          </button>
          {isGratitudeStep ? (
            <motion.button
              whileTap={{ scale: 0.99 }}
              onClick={handleSave}
              disabled={saving || !allQuestionsReady || gratitudeWords < gratitudeMinWords}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-5 font-heading text-sm font-semibold text-primary-foreground transition-all disabled:bg-white/[0.06] disabled:text-white/30"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving ? "Speichert …" : saveError ? "Erneut speichern" : "Tag abschließen"}
            </motion.button>
          ) : (
            <button
              type="button"
              onClick={() => setJournalStep((current) => Math.min(gratitudeStep, current + 1))}
              disabled={!currentAnswerReady}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:bg-white/[0.06] disabled:text-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Weiter <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Journal;
