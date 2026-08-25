import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  ArrowLeft, ArrowRight, Check, Dumbbell, Moon, Trophy,
  Brain, Flame, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import TaskDetail from "@/components/daily/TaskDetail";
import ComprehensionCheck from "@/components/daily/ComprehensionCheck";
import RestDayMission, { type RestDayPlanMode } from "@/components/daily/RestDayMission";
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
import { getCurrentProgramDay } from "@/lib/getCurrentProgramDay";
import { resolveDay } from "@/lib/getDayContent";
import { ensureAssignment, upsertCompletion, drawComprehensionQuestions } from "@/lib/dayAssignment";
import { saveDailyTracking, type DailyTrackingComprehensionResult } from "@/lib/dailyTracking";
import { pulseQuestionsByContext } from "@/lib/dayContext";
import { captureAppError, trackAppEvent } from "@/lib/monitoring";
import { clearLocalDraft, readLocalDraft, writeLocalDraft } from "@/lib/localDrafts";
import type { CalendarEventType, DailyTask, ResolvedDay, ComprehensionQuestion } from "@/content/matrixDayTypes";
import {
  AthleteFlowButton,
  AthleteFlowAmbient,
  AthleteFlowProgress,
  AthleteFlowScene,
  athleteFlowChoice,
  athleteFlowPanel,
  athleteFlowPrimaryButton,
  athleteFlowSecondaryButton,
} from "@/components/app/AthleteFlowScene";
import { AthleteScreenHeader } from "@/components/app/AthleteAppChrome";
import { getProgramDayDraft } from "@/content/programV11";

type EventType = CalendarEventType;

interface DailyCheckinProps {
  eventType: EventType;
  date: Date;
  onClose: () => void;
  initialFocus?: "rest-visualization";
  /** Preview/Admin mode: no DB writes, force a specific day, no navigation on completion. */
  previewMode?: boolean;
  /** Force a specific day number instead of computing from program start (preview only). */
  previewDayNumber?: number;
}

interface CheckinDraft {
  step: number;
  completedTasks: string[];
  moodBefore: number | null;
  energyLevel: number | null;
  focusClarity: number | null;
  stress: number | null;
  recovery: number | null;
  sleepQuality: number | null;
  physicalReadiness: number | null;
  motivation: number | null;
  pressure: number | null;
  teamConnection: number | null;
  restPlanMode?: RestDayPlanMode;
  restReminderTime?: string;
  restReminderScheduled?: boolean;
  savedAt: string;
}

const typeConfig: Record<EventType, { label: string; icon: typeof Dumbbell; color: string; bg: string }> = {
  training: { label: "Trainingstag", icon: Dumbbell, color: "text-primary", bg: "bg-primary/20" },
  rest: { label: "Ruhetag", icon: Moon, color: "text-blue-400", bg: "bg-blue-400/20" },
  competition: { label: "Wettkampftag", icon: Trophy, color: "text-yellow-400", bg: "bg-yellow-400/20" },
};

const normalizeDraftStep = (draftStep: number | null | undefined) => {
  const safeStep = typeof draftStep === "number" && Number.isFinite(draftStep) ? draftStep : 0;

  // Der alte Flow hatte einen eigenen Pflichtschritt "Wissen zuerst".
  // Bestehende lokale Drafts werden in den neuen, kürzeren Ablauf geschoben.
  if (safeStep === 2) return 3;
  if (safeStep === 4) return 3;
  if (safeStep === 5) return 4;
  if (safeStep > 5) return 5;

  return Math.max(0, safeStep);
};

const DailyCheckin = ({
  eventType,
  date,
  onClose,
  initialFocus,
  previewMode = false,
  previewDayNumber,
}: DailyCheckinProps) => {
  const { user, role, isTestUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(initialFocus === "rest-visualization" ? 3 : 0);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [resolved, setResolved] = useState<ResolvedDay | null>(null);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [selectedTask, setSelectedTask] = useState<DailyTask | null>(null);
  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const [comprehensionQuestions, setComprehensionQuestions] = useState<ComprehensionQuestion[]>([]);
  const [comprehensionDone, setComprehensionDone] = useState(false);
  const [moodBefore, setMoodBefore] = useState<number | null>(null);
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  // Team Pulse — erweiterte Wohlbefindens-Metriken (1-10)
  const [focusClarity, setFocusClarity] = useState<number | null>(null);
  const [stress, setStress] = useState<number | null>(null);
  const [recovery, setRecovery] = useState<number | null>(null);
  const [sleepQuality, setSleepQuality] = useState<number | null>(null);
  const [physicalReadiness, setPhysicalReadiness] = useState<number | null>(null);
  const [motivation, setMotivation] = useState<number | null>(null);
  const [pressure, setPressure] = useState<number | null>(null);
  const [teamConnection, setTeamConnection] = useState<number | null>(null);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeInstanceId, setActiveInstanceId] = useState<string | null>(null);
  const [restPlanMode, setRestPlanMode] = useState<RestDayPlanMode>(
    initialFocus === "rest-visualization" ? "now" : null,
  );
  const [restReminderTime, setRestReminderTime] = useState("15:00");
  const [restReminderScheduled, setRestReminderScheduled] = useState(false);
  const contentScrollRef = useRef<HTMLDivElement>(null);

  const config = typeConfig[eventType];
  const tasks: DailyTask[] = resolved?.content.tasks ?? [];
  const displayLens = resolved?.content.lens ?? resolved?.matrix.lens;
  const displayTitle = resolved?.content.title ?? displayLens;
  const dateKey = format(date, "yyyy-MM-dd");
  const legacyDraftKey = user?.id ? `checkin:${user.id}:${dateKey}:${eventType}` : null;
  const draftKey = user?.id && activeInstanceId
    ? `checkin:${user.id}:${activeInstanceId}:${dateKey}:${eventType}`
    : legacyDraftKey;
  const getCompletedTaskTitles = (taskIds: string[] = completedTasks) =>
    taskIds.map((id) => tasks.find((t) => t.id === id)?.title ?? id);
  // Alte lokale Drafts konnten noch auf rückblickende Morgen-Schritte zeigen.
  // Diese werden ohne Datenverlust direkt zur heutigen Mission weitergeführt.
  useEffect(() => {
    if (!loadingTasks && step === 2) {
      setStep(3);
    }
  }, [loadingTasks, step]);

  useLayoutEffect(() => {
    contentScrollRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [step, selectedTask?.id]);

  const handleBack = () => {
    if (selectedTask) {
      setSelectedTask(null);
      return;
    }
    if (step > 0) {
      setStep(step === 3 ? 1 : step - 1);
      return;
    }
    setShowExitDialog(true);
  };

  useEffect(() => {
    if (previewMode) {
      loadPreviewDay();
      return;
    }
    if (!user?.id) {
      navigate("/auth");
      return;
    }
    loadDay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, previewMode, previewDayNumber, eventType]);

  const loadPreviewDay = () => {
    if (typeof previewDayNumber !== "number") return;
    setLoadingTasks(true);
    const r = resolveDay(previewDayNumber, date, eventType);
    if (r) {
      setResolved(r);
      setAssignmentId(null);
      setComprehensionQuestions(drawComprehensionQuestions(r.matrix.dayNumber, 3));
    }
    setLoadingTasks(false);
  };

  const loadDay = async () => {
    if (!user?.id) return;
    setLoadingTasks(true);
    const dateStr = format(date, "yyyy-MM-dd");

    const result = await ensureAssignment({
      userId: user.id,
      date,
      contextType: eventType,
      sport: null,
      position: null,
    });

    if (result) {
      setResolved(result.resolved);
      setAssignmentId(result.assignment.id);
      setComprehensionQuestions(drawComprehensionQuestions(result.resolved.matrix.dayNumber, 3));

      const { data: existingCompletion } = await supabase
        .from("user_day_completion")
        .select("task_completion")
        .eq("assignment_id", result.assignment.id)
        .maybeSingle();
      const persistedTaskTitles = Array.isArray(existingCompletion?.task_completion)
        ? existingCompletion.task_completion
        : [];
      const persistedTaskIds = result.resolved.content.tasks
        .filter((task) => persistedTaskTitles.includes(task.title) || persistedTaskTitles.includes(task.id))
        .map((task) => task.id);

      const { getOrCreateActiveInstance } = await import("@/lib/programInstance");
      const instance = await getOrCreateActiveInstance(user.id);
      setActiveInstanceId(instance?.id ?? null);

      const scopedDraftKey = instance?.id
        ? `checkin:${user.id}:${instance.id}:${dateStr}:${eventType}`
        : `checkin:${user.id}:${dateStr}:${eventType}`;
      const local = readLocalDraft<CheckinDraft>(scopedDraftKey)
        ?? readLocalDraft<CheckinDraft>(`checkin:${user.id}:${dateStr}:${eventType}`);
      if (local) {
        setStep(normalizeDraftStep(local.step));
        setCompletedTasks(Array.from(new Set([...persistedTaskIds, ...(local.completedTasks ?? [])])));
        setMoodBefore(local.moodBefore ?? null);
        setEnergyLevel(local.energyLevel ?? null);
        setFocusClarity(local.focusClarity ?? null);
        setStress(local.stress ?? null);
        setRecovery(local.recovery ?? null);
        setSleepQuality(local.sleepQuality ?? null);
        setPhysicalReadiness(local.physicalReadiness ?? null);
        setMotivation(local.motivation ?? null);
        setPressure(local.pressure ?? null);
        setTeamConnection(local.teamConnection ?? null);
        setRestPlanMode(local.restPlanMode ?? null);
        setRestReminderTime(local.restReminderTime ?? "15:00");
        setRestReminderScheduled(local.restReminderScheduled ?? false);
      } else if (persistedTaskIds.length > 0) {
        setCompletedTasks(persistedTaskIds);
      }

      if (initialFocus === "rest-visualization") {
        setStep(3);
        setRestPlanMode("now");
        setRestReminderScheduled(false);
      }

    }
    setLoadingTasks(false);
  };

  useEffect(() => {
    if (!draftKey || previewMode || step === 5) return;
    const hasDraft =
      completedTasks.length > 0 ||
      restPlanMode !== null ||
      restReminderScheduled ||
      [moodBefore, energyLevel, focusClarity, stress, recovery, sleepQuality, physicalReadiness, motivation, pressure, teamConnection]
        .some((value) => value !== null);
    if (!hasDraft) return;
    writeLocalDraft<CheckinDraft>(draftKey, {
      step,
      completedTasks,
      moodBefore,
      energyLevel,
      focusClarity,
      stress,
      recovery,
      sleepQuality,
      physicalReadiness,
      motivation,
      pressure,
      teamConnection,
      restPlanMode,
      restReminderTime,
      restReminderScheduled,
      savedAt: new Date().toISOString(),
    });
  }, [
    draftKey,
    previewMode,
    step,
    completedTasks,
    moodBefore,
    energyLevel,
    focusClarity,
    stress,
    recovery,
    sleepQuality,
    physicalReadiness,
    motivation,
    pressure,
    teamConnection,
    restPlanMode,
    restReminderTime,
    restReminderScheduled,
  ]);

  const persistTaskProgress = async (taskIds: string[]) => {
    if (previewMode || !user?.id || !assignmentId || !resolved) return;
    try {
      const { getOrCreateActiveInstance } = await import("@/lib/programInstance");
      const instance = await getOrCreateActiveInstance(user.id);
      const { error } = await upsertCompletion({
        assignmentId,
        userId: user.id,
        dayNumber: resolved.matrix.dayNumber,
        completedTaskTitles: getCompletedTaskTitles(taskIds),
        status: "in_progress",
        variantUsed: eventType,
        programInstanceId: instance?.id ?? null,
      });
      if (error) throw error;
      setSaveError(null);
    } catch (error) {
      console.error("Task progress save error:", error);
      void captureAppError({
        eventName: "daily_checkin_saved",
        error,
        role,
        route: "/dashboard",
        isTest: isTestUser,
        metadata: {
          day_number: resolved?.matrix.dayNumber ?? null,
          event_type: eventType,
          stage: "task_progress",
        },
      });
      setSaveError("Deine Aufgabe ist lokal als verstanden markiert. Der Fortschritt wird beim nächsten Speichern erneut bestätigt.");
    }
  };

  const markTaskComplete = (taskId: string) => {
    const next = completedTasks.includes(taskId) ? completedTasks : [...completedTasks, taskId];
    setCompletedTasks(next);
    setSelectedTask(null);
    void persistTaskProgress(next);
  };

  const saveCheckin = async (
    comprehensionResults?: DailyTrackingComprehensionResult[],
    completedTaskIds: string[] = completedTasks,
  ): Promise<boolean> => {
    if (previewMode) {
      setStep(5);
      return true;
    }
    if (!user?.id || !assignmentId || !resolved) return false;
    if (savingRef.current) return false; // Race-Schutz: Doppelklick / parallele Auslösungen ignorieren
    savingRef.current = true;
    setSaveError(null);
    setSaving(true);
    const dateStr = format(date, "yyyy-MM-dd");
    const focusRating = focusClarity
      ?? (tasks.length > 0 ? Math.max(1, Math.round((completedTaskIds.length / tasks.length) * 10)) : null);
    const completedTitles = completedTaskIds.map((id) => tasks.find((t) => t.id === id)?.title ?? id);

    try {
      const { getOrCreateActiveInstance } = await import("@/lib/programInstance");
      const instance = await getOrCreateActiveInstance(user.id);

      if (!instance?.id) {
        savingRef.current = false;
        setSaving(false);
        setSaveError("Dein Programmlauf ist noch nicht vollständig eingerichtet. Bitte wende dich an den Coach oder Support.");
        return false;
      }

      await saveDailyTracking({
        assignmentId,
        userId: user.id,
        date: dateStr,
        eventType,
        dayNumber: resolved.matrix.dayNumber,
        variantUsed: eventType,
        programInstanceId: instance.id,
        completedTaskTitles: completedTitles,
        moodBefore,
        energyLevel,
        focusRating,
        stress,
        recovery,
        sleepQuality,
        physicalReadiness,
        motivation,
        pressure,
        teamConnection,
        comprehensionQuestions: comprehensionResults
          ? comprehensionQuestions as unknown as import("@/integrations/supabase/types").Json
          : undefined,
        comprehensionResults,
      });
      await trackAppEvent({
        eventName: "daily_checkin_saved",
        status: "success",
        role,
        route: "/dashboard",
        isTest: isTestUser,
        metadata: {
          day_number: resolved.matrix.dayNumber,
          event_type: eventType,
          stage: "atomic_tracking",
        },
      });
    } catch (error) {
      savingRef.current = false;
      setSaving(false);
      console.error("Atomic daily tracking save error:", error);
      void captureAppError({
        eventName: "daily_checkin_saved",
        error,
        role,
        route: "/dashboard",
        isTest: isTestUser,
        metadata: {
          day_number: resolved?.matrix.dayNumber ?? null,
          event_type: eventType,
          stage: "atomic_tracking",
        },
      });
      setSaveError("Dein Check-in ist lokal gesichert. Bitte erneut speichern, sobald die Verbindung stabil ist.");
      try {
        const { toast } = await import("sonner");
        toast.error("Check-in lokal gesichert. Speichern bitte erneut versuchen.");
      } catch {
        // The inline retry state remains available if the optional toast cannot load.
      }
      return false;
    }

    savingRef.current = false;
    setSaving(false);

    if (draftKey) clearLocalDraft(draftKey);
    if (legacyDraftKey && legacyDraftKey !== draftKey) clearLocalDraft(legacyDraftKey);
    setStep(5);
    return true;
  };

  const handleComprehensionComplete = async (
    results: { questionId: string; selectedOptionId: string; isCorrect: boolean }[]
  ) => {
    if (previewMode) {
      setComprehensionDone(true);
      await saveCheckin(results);
      return;
    }
    const saved = await saveCheckin(results);
    if (saved) {
      setComprehensionDone(true);
    }
  };

  const handleEmptyComprehensionComplete = async () => {
    const saved = await saveCheckin();
    if (saved) setComprehensionDone(true);
  };

  const finishRestDay = async (completedTaskIds: string[] = completedTasks) => {
    const saved = await saveCheckin(undefined, completedTaskIds);
    if (saved) onClose();
  };

  const handleRestVisualizationComplete = (taskId: string) => {
    const nextCompletedTasks = completedTasks.includes(taskId)
      ? completedTasks
      : [...completedTasks, taskId];
    setCompletedTasks(nextCompletedTasks);
    setSelectedTask(null);
    void finishRestDay(nextCompletedTasks);
  };

  const ScienceBiteIntro = () => {
    const bite = resolved?.content.scienceBite.fact ?? "";
    const [headline, ...body] = bite.split("\n\n").filter(Boolean);

    return (
      <section className="flex min-h-[calc(100dvh-11rem)] flex-col justify-center">
        {loadingTasks ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
        ) : (
          <div className="space-y-7">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/[0.09] text-primary shadow-[0_0_34px_-18px_rgba(46,173,137,0.75)]">
                <Brain className="h-5 w-5" />
              </div>
              <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Science Bite</p>
              <h2 className="mt-3 font-heading text-3xl font-semibold leading-[1.08] tracking-[-0.04em]">{headline}</h2>
              <div className="mt-5 max-w-[38rem] space-y-4">
                {body.map((paragraph, index) => (
                  <p key={index} className="whitespace-pre-line text-[15px] leading-7 text-white/62">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>

            {resolved && (
              <div className="border-l border-primary/35 pl-4">
                <div className="flex items-start gap-3">
                  <config.icon className={`w-5 h-5 mt-0.5 shrink-0 ${config.color}`} />
                  <div>
                    <p className={`text-xs uppercase tracking-[0.16em] font-semibold ${config.color}`}>
                      Heute als {resolved.context.label}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-white/58">
                      {resolved.context.focus}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <AthleteFlowButton
              data-testid="daily-science-ack"
              onClick={() => setStep(1)}
              className={`${athleteFlowPrimaryButton} w-full min-h-14 text-base`}
            >
              Verstanden <ArrowRight className="w-5 h-5" />
            </AthleteFlowButton>
          </div>
        )}
      </section>
    );
  };

  // ─── Task Dashboard ─────────────────────────────
  const TaskDashboard = () => {
    if (eventType === "rest" && resolved) {
      const draft = getProgramDayDraft(resolved.matrix.dayNumber);
      const missionTask = tasks[0];
      if (!draft || !missionTask) {
        return (
          <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-5 text-sm text-muted-foreground">
            Die Visualisierung für diesen Tag konnte nicht geladen werden.
          </div>
        );
      }

      return (
        <div>
          <RestDayMission
            draft={draft}
            userId={user?.id ?? null}
            athleteName={user?.user_metadata?.full_name}
            date={dateKey}
            planMode={restPlanMode}
            reminderTime={restReminderTime}
            reminderScheduled={restReminderScheduled}
            completed={completedTasks.includes(missionTask.id)}
            saving={saving}
            saveError={saveError}
            onPlanModeChange={(mode) => {
              setRestPlanMode(mode);
              if (mode === "now") setRestReminderScheduled(false);
            }}
            onReminderTimeChange={setRestReminderTime}
            onReminderScheduledChange={setRestReminderScheduled}
            onComplete={() => handleRestVisualizationComplete(missionTask.id)}
            onRetrySave={() => void finishRestDay()}
            onCloseForLater={onClose}
          />
        </div>
      );
    }

    return (
      <div>
        {loadingTasks ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
        ) : tasks[0] ? (
          <TaskDetail
            task={tasks[0]}
            isCompleted={completedTasks.includes(tasks[0].id)}
            onComplete={() => markTaskComplete(tasks[0].id)}
          />
        ) : null}
      </div>
    );
  };

  const flowStages = eventType === "rest"
    ? [
        { step: 0, title: "Science Bite" },
        { step: 1, title: "Dein Tages-Puls" },
        { step: 3, title: "Visualisierung" },
      ]
    : [
        { step: 0, title: "Science Bite" },
        { step: 1, title: "Dein Tages-Puls" },
        { step: 3, title: "Deine Mission" },
        { step: 4, title: "Verständnis-Check" },
      ];
  const activeStageIndex = flowStages.findIndex((stage) => stage.step === step);
  const flowStageCount = flowStages.length;
  return (
    <div className="relative flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[#0D0E12] text-[#EEF0F2]">
      <AthleteFlowAmbient />
      <AthleteScreenHeader
        title={config.label}
        onBack={handleBack}
        backLabel="Im Daily Flow zurück"
        trailing={(
          <div className="flex items-center gap-2 rounded-full border border-white/[0.065] bg-white/[0.035] px-3 py-2 text-[11px] text-white/52">
            <config.icon className={`h-3.5 w-3.5 ${config.color}`} />
            {format(date, "d. MMM", { locale: de })}
          </div>
        )}
      />
      <div className="relative bg-[#0D0E12]/88 px-5 py-3">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <AthleteFlowProgress
            value={step === 5 ? 100 : ((Math.max(0, activeStageIndex) + 1) / flowStageCount) * 100}
            className="flex-1"
          />
          <span className="ml-1 text-[10px] tabular-nums text-white/42">
            {step === 5
              ? `${flowStageCount}/${flowStageCount}`
              : `${Math.max(1, activeStageIndex + 1)}/${flowStageCount}`}
          </span>
        </div>
      </div>

      <div ref={contentScrollRef} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-7">
        <div className="mx-auto w-full max-w-lg">
          {saveError && !(eventType === "rest" && step === 3) && (
            <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-muted-foreground">
              {saveError}
            </div>
          )}
          <AnimatePresence mode="wait" initial={false}>
            <AthleteFlowScene
              key={selectedTask ? `selected-${selectedTask.id}` : `daily-step-${step}`}
              testId="daily-active-scene"
            >
            {selectedTask ? (
              <TaskDetail
                task={selectedTask}
                isCompleted={completedTasks.includes(selectedTask.id)}
                onComplete={() => markTaskComplete(selectedTask.id)}
              />
            ) : (
              <>
                {step === 0 && <ScienceBiteIntro />}
                {step === 1 && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Dein Tages-Puls</p>
                    <h2 className="mt-3 font-heading text-3xl font-semibold leading-tight tracking-[-0.04em]">
                      {resolved?.context.checkin.pulseTitle ?? "Wohlbefinden & Bereitschaft"}
                    </h2>
                    <p className="mb-7 mt-4 text-sm leading-6 text-white/55">
                      {resolved?.context.checkin.pulseDescription} Deine Antworten bleiben privat. Coaches sehen nur
                      geschützte Team-Tendenzen ab mindestens 5 Teilnehmenden.
                    </p>

                    <div className="space-y-3">
                      {[
                        { id: "mood", label: "Stimmung", question: pulseQuestionsByContext[eventType].mood, value: moodBefore, set: setMoodBefore, low: "sehr niedrig", high: "sehr gut" },
                        { id: "energy", label: "Energie", question: pulseQuestionsByContext[eventType].energy, value: energyLevel, set: setEnergyLevel, low: "sehr erschöpft", high: "sehr energiegeladen" },
                        { id: "focus", label: "Mentale Klarheit / Fokus", question: pulseQuestionsByContext[eventType].focus, value: focusClarity, set: setFocusClarity, low: "sehr zerstreut", high: "sehr klar" },
                        { id: "stress", label: "Stress / innere Spannung", question: pulseQuestionsByContext[eventType].stress, value: stress, set: setStress, low: "sehr niedrig", high: "sehr hoch" },
                        { id: "recovery", label: "Erholung", question: pulseQuestionsByContext[eventType].recovery, value: recovery, set: setRecovery, low: "gar nicht erholt", high: "sehr erholt" },
                        { id: "sleep", label: "Schlafqualität", question: pulseQuestionsByContext[eventType].sleep, value: sleepQuality, set: setSleepQuality, low: "sehr schlecht", high: "sehr gut" },
                        { id: "physical", label: "Körperliche Bereitschaft", question: pulseQuestionsByContext[eventType].physical, value: physicalReadiness, set: setPhysicalReadiness, low: "gar nicht bereit", high: "sehr bereit" },
                        { id: "motivation", label: "Bereitschaft", question: pulseQuestionsByContext[eventType].motivation, value: motivation, set: setMotivation, low: "kaum bereit", high: "sehr bereit" },
                        { id: "pressure", label: "Leistungsdruck", question: pulseQuestionsByContext[eventType].pressure, value: pressure, set: setPressure, low: "kaum", high: "sehr stark" },
                        { id: "team", label: "Verbindung zum sportlichen Umfeld", question: pulseQuestionsByContext[eventType].connection, value: teamConnection, set: setTeamConnection, low: "gar nicht verbunden", high: "sehr verbunden" },
                      ].map((q) => (
                        <div key={q.label} className={`${athleteFlowPanel} p-4`}>
                          <label className="mb-1 block text-sm font-semibold text-white/88">{q.label}</label>
                          <p className="mb-3 text-xs leading-5 text-white/45">{q.question}</p>
                          <div className="grid grid-cols-5 gap-2">
                            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                              <AthleteFlowButton
                                key={n}
                                data-testid={`pulse-${q.id}-${n}`}
                                onClick={() => q.set(n)}
                                aria-pressed={q.value === n}
                                pressScale={0.985}
                                className={`${athleteFlowChoice(q.value === n)} min-h-11 justify-center rounded-xl px-0 py-0 font-semibold`}
                              >
                                {n}
                              </AthleteFlowButton>
                            ))}
                          </div>
                          <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
                            <span>{q.low}</span>
                            <span>{q.high}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {step === 3 && <TaskDashboard />}
                {step === 4 && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Zum Abschluss</p>
                    <h2 className="mt-3 font-heading text-3xl font-semibold tracking-[-0.04em]">Kurzer Verständnis-Check</h2>
                    <p className="mb-7 mt-4 text-sm leading-6 text-white/52">
                      {comprehensionQuestions.length > 0
                        ? "Eine kurze Frage zur heutigen Linie. Kein Test — nur Festigung."
                        : "Heute kein Check verfügbar. Du kannst direkt abschließen."}
                    </p>
                    {comprehensionQuestions.length > 0 ? (
                      <ComprehensionCheck
                        questions={comprehensionQuestions}
                        onComplete={handleComprehensionComplete}
                      />
                    ) : (
                      <AthleteFlowButton
                        data-testid="comprehension-empty-finish"
                        onClick={handleEmptyComprehensionComplete}
                        disabled={saving}
                        className={`${athleteFlowPrimaryButton} w-full`}
                      >
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                        {saving ? "Speichert..." : "Check-in abschließen"}
                      </AthleteFlowButton>
                    )}
                  </div>
                )}
                {step === 5 && (
                  <div className="flex min-h-[60dvh] flex-col justify-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/[0.1] text-primary shadow-[0_0_36px_-17px_rgba(46,173,137,0.72)]">
                      <Check className="h-7 w-7" />
                    </div>
                    <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Dein Check-in ist gespeichert</p>
                    <h2 className="mt-3 font-heading text-3xl font-semibold leading-tight tracking-[-0.04em]">Heute ist klar.</h2>
                    {resolved && (
                      <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-white/42">
                        Tag {resolved.matrix.dayNumber}/56 · {displayTitle}
                      </p>
                    )}
                    <p className="mt-5 max-w-sm text-[15px] leading-7 text-white/60">
                      {resolved?.context.checkin.completionMessage}
                    </p>
                    <div className="mt-7 max-w-sm border-l border-primary/30 pl-4 text-left">
                      <div className="flex items-start gap-3">
                        <Flame className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <p className="text-xs leading-5 text-white/48">
                          Die Flamme lebt von Rückkehr. Heute Abend schließt du den Tag mit dem Journal sauber ab.
                        </p>
                      </div>
                    </div>
                    <div className="mt-9 flex max-w-sm flex-col gap-3">
                      <button
                        onClick={onClose}
                        className={`${athleteFlowPrimaryButton} w-full`}
                      >
                        Zurück zum Dashboard
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
            </AthleteFlowScene>
          </AnimatePresence>
        </div>
      </div>

      {(step === 1 || (step === 3 && eventType !== "rest")) && !selectedTask && (
        <div className="relative shrink-0 border-t border-white/[0.07] bg-[#0B0C10]/92 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur-2xl">
          <div className="mx-auto grid max-w-lg grid-cols-[auto_1fr] gap-3">
            <button onClick={handleBack} className={`${athleteFlowSecondaryButton} w-12 px-0`} aria-label="Zurück">
              <ArrowLeft className="w-4 h-4" />
            </button>
            {(() => {
              const pulseComplete = [moodBefore, energyLevel, focusClarity, stress, recovery, sleepQuality, physicalReadiness, motivation, pressure, teamConnection].every((v) => v !== null);
              const tasksComplete = tasks.length === 0 || tasks.every((task) => completedTasks.includes(task.id));
              const blocked = saving
                || (step === 1 && !pulseComplete)
                || (step === 3 && !tasksComplete);
              return (
                <AthleteFlowButton
                  data-testid={`daily-next-step-${step}`}
                  onClick={() => {
                    if (blocked) return;
                    if (step === 1) setStep(3);
                    else if (step === 3 && tasksComplete) setStep(4);
                  }}
                  disabled={blocked}
                  className={`${athleteFlowPrimaryButton} w-full whitespace-nowrap`}
                >
                  {step === 3 && !tasksComplete
                    ? eventType === "rest"
                      ? "Visualisierung offen"
                      : "Mission offen"
                    : "Weiter"}
                  <ArrowRight className="w-4 h-4" />
                </AthleteFlowButton>
              );
            })()}
          </div>
        </div>
      )}

      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent className="mx-4 rounded-2xl border-border/60">
          <AlertDialogHeader>
            <AlertDialogTitle>Check-in verlassen?</AlertDialogTitle>
            <AlertDialogDescription>
              Du bist gerade am Anfang des Check-ins. Wenn du ihn verlässt, wird noch nichts gespeichert.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Weiter im Check-in</AlertDialogCancel>
            <AlertDialogAction onClick={onClose}>Verlassen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DailyCheckin;
