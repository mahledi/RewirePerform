import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  ArrowLeft, ArrowRight, Check, Dumbbell, Moon, Trophy,
  Brain, Flame, Eye, Heart, Target, Sparkles, Wind, Sunrise, BookOpen, Shield, Loader2,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import VoiceInput from "@/components/VoiceInput";
import TaskDetail from "@/components/daily/TaskDetail";
import ComprehensionCheck from "@/components/daily/ComprehensionCheck";
import TodayForYou from "@/components/daily/TodayForYou";
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
import {
  buildMicroAdjustmentContext,
  type MicroAdjustmentOutput,
} from "@/lib/microAdjustment";
import { pulseQuestionsByContext } from "@/lib/dayContext";
import { captureAppError, trackAppEvent } from "@/lib/monitoring";
import { clearLocalDraft, readLocalDraft, writeLocalDraft } from "@/lib/localDrafts";
import type { CalendarEventType, DailyTask, ResolvedDay, ComprehensionQuestion } from "@/content/matrixDayTypes";
import AthleteTransferPulse from "@/components/evidence/AthleteTransferPulse";
import { getMyEvidenceStatus, type MyEvidenceStatus } from "@/lib/evidenceTracking";
import {
  getTransferPulseForDay,
  isTransferPulseResponse,
  normalizeEvidenceDurationMs,
  shouldPreserveReflectionDraft,
  type TransferPulseResponse,
} from "@/lib/performanceEvidence";
import { AthleteScreenHeader } from "@/components/app/AthleteAppChrome";

type EventType = CalendarEventType;

interface DailyCheckinProps {
  eventType: EventType;
  date: Date;
  onClose: () => void;
  /** Preview/Admin mode: no DB writes, force a specific day, no navigation on completion. */
  previewMode?: boolean;
  /** Force a specific day number instead of computing from program start (preview only). */
  previewDayNumber?: number;
}

interface CheckinDraft {
  step: number;
  completedTasks: string[];
  reflection: string;
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
  transferPulseResponse?: TransferPulseResponse | null;
  transferPulseResponseDurationMs?: number | null;
  savedAt: string;
}

const iconMap: Record<string, typeof Brain> = {
  brain: Brain, eye: Eye, flame: Flame, heart: Heart, target: Target,
  wind: Wind, sunrise: Sunrise, book: BookOpen, sparkles: Sparkles, shield: Shield,
};

const typeConfig: Record<EventType, { label: string; icon: typeof Dumbbell; color: string; bg: string }> = {
  training: { label: "Trainingstag", icon: Dumbbell, color: "text-primary", bg: "bg-primary/20" },
  rest: { label: "Ruhetag", icon: Moon, color: "text-blue-400", bg: "bg-blue-400/20" },
  competition: { label: "Wettkampftag", icon: Trophy, color: "text-yellow-400", bg: "bg-yellow-400/20" },
};

const numberOrUndefined = (value: unknown): number | undefined => (
  typeof value === "number" && Number.isFinite(value) ? value : undefined
);

const asRecord = (value: unknown): Record<string, unknown> | null => (
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null
);

const score100ToSignal = (score: unknown): number | undefined => {
  const n = numberOrUndefined(score);
  if (typeof n !== "number") return undefined;
  return Math.max(0, Math.min(1, (100 - n) / 100));
};

const score100ToStrength = (score: unknown): number | undefined => {
  const n = numberOrUndefined(score);
  if (typeof n !== "number") return undefined;
  return Math.max(0, Math.min(1, n / 100));
};

const maxSignal = (...values: Array<number | undefined>) => {
  const valid = values.filter((value): value is number => typeof value === "number");
  return valid.length ? Math.max(...valid) : undefined;
};

const buildQuestionnaireSignals = (analysis: Record<string, unknown> | null) => {
  if (!analysis) return undefined;
  const scores = asRecord(analysis.scores);
  const categoryScores = asRecord(analysis.category_scores) ?? asRecord(scores?.category_scores);
  const itemScores = asRecord(scores?.item_scores);
  const inner = asRecord(analysis.inner_excellence_profile);

  return {
    resultFocus: maxSignal(
      score100ToSignal(categoryScores?.focus_presence),
      score100ToSignal(categoryScores?.motivation_purpose),
      score100ToSignal(itemScores?.["mot-05"])
    ),
    selfCriticism: maxSignal(
      score100ToSignal(categoryScores?.identity_selfworth),
      score100ToSignal(categoryScores?.mistakes_evaluation),
      score100ToSignal(itemScores?.["id-01"]),
      score100ToSignal(itemScores?.["id-02"])
    ),
    judgementFear: maxSignal(
      score100ToSignal(itemScores?.["err-04"]),
      score100ToSignal(itemScores?.["id-04"]),
      score100ToSignal(categoryScores?.environment_team)
    ),
    egoVisibility: maxSignal(
      score100ToSignal(itemScores?.["id-04"]),
      score100ToSignal(itemScores?.["id-05"]),
      score100ToSignal(inner?.ego_freedom_score)
    ),
    confidence: maxSignal(
      score100ToStrength(analysis.start_profile_score),
      score100ToStrength(scores?.start_profile_score),
      score100ToStrength(inner?.presence_level)
    ),
  };
};

const normalizeDraftStep = (draftStep: number | null | undefined) => {
  const safeStep = typeof draftStep === "number" && Number.isFinite(draftStep) ? draftStep : 0;

  // Der alte Flow hatte einen eigenen Pflichtschritt "Wissen zuerst".
  // Bestehende lokale Drafts werden in den neuen, kürzeren Ablauf geschoben.
  if (safeStep === 4) return 3;
  if (safeStep === 5) return 4;
  if (safeStep > 5) return 5;

  return Math.max(0, safeStep);
};

const DailyCheckin = ({ eventType, date, onClose, previewMode = false, previewDayNumber }: DailyCheckinProps) => {
  const { user, role, isTestUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [reflection, setReflection] = useState("");
  const [saving, setSaving] = useState(false);
  const [resolved, setResolved] = useState<ResolvedDay | null>(null);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [selectedTask, setSelectedTask] = useState<DailyTask | null>(null);
  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const [comprehensionQuestions, setComprehensionQuestions] = useState<ComprehensionQuestion[]>([]);
  const [comprehensionDone, setComprehensionDone] = useState(false);
  const [microAdjustment, setMicroAdjustment] = useState<MicroAdjustmentOutput | null>(null);
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
  const [transferPulseResponse, setTransferPulseResponse] = useState<TransferPulseResponse | null>(null);
  const [transferPulseResponseDurationMs, setTransferPulseResponseDurationMs] = useState<number | null>(null);
  const [evidenceStatus, setEvidenceStatus] = useState<MyEvidenceStatus | null>(null);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeInstanceId, setActiveInstanceId] = useState<string | null>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const transferPulseStartedAtRef = useRef<number | null>(null);

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
  const scheduledTransferPulse = resolved
    ? getTransferPulseForDay(resolved.matrix.dayNumber, eventType)
    : null;
  const activeTransferPulse = scheduledTransferPulse
    && evidenceStatus?.eligible
    && evidenceStatus.domainId === scheduledTransferPulse.domainId
      ? scheduledTransferPulse
      : null;

  useEffect(() => {
    if (
      step === 2
      && activeTransferPulse
      && !evidenceStatus?.locked
      && transferPulseResponse === null
      && transferPulseStartedAtRef.current === null
    ) {
      transferPulseStartedAtRef.current = performance.now();
    }
  }, [activeTransferPulse, evidenceStatus?.locked, step, transferPulseResponse]);

  const selectTransferPulseResponse = (response: TransferPulseResponse) => {
    if (transferPulseResponseDurationMs === null && transferPulseStartedAtRef.current !== null) {
      setTransferPulseResponseDurationMs(
        normalizeEvidenceDurationMs(performance.now() - transferPulseStartedAtRef.current),
      );
    }
    setTransferPulseResponse(response);
  };

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
      setStep(step - 1);
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
      setMicroAdjustment(null);
    }
    setLoadingTasks(false);
  };

  const loadDay = async () => {
    if (!user?.id) return;
    setLoadingTasks(true);
    setEvidenceStatus(null);
    setTransferPulseResponse(null);
    setTransferPulseResponseDurationMs(null);
    transferPulseStartedAtRef.current = null;
    const dateStr = format(date, "yyyy-MM-dd");

    const { data: profile } = await supabase
      .from("profiles")
      .select("sport, position, team")
      .eq("id", user.id)
      .maybeSingle();

    const result = await ensureAssignment({
      userId: user.id,
      date,
      contextType: eventType,
      sport: profile?.sport ?? null,
      // Bevorzuge das neue, semantisch korrekte Feld; Fallback auf Legacy-Feld für ältere Profile.
      position: profile?.position ?? profile?.team ?? null,
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
        setReflection(local.reflection ?? "");
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
        setTransferPulseResponseDurationMs(
          normalizeEvidenceDurationMs(local.transferPulseResponseDurationMs),
        );
      } else if (persistedTaskIds.length > 0) {
        setCompletedTasks(persistedTaskIds);
      }

      const scheduledPulse = getTransferPulseForDay(result.resolved.matrix.dayNumber, eventType);
      if (instance?.id && scheduledPulse) {
        try {
          const status = await getMyEvidenceStatus({
            programInstanceId: instance.id,
            dayNumber: result.resolved.matrix.dayNumber,
            eventType,
          });
          const preserveExistingReflectionDraft = shouldPreserveReflectionDraft({
            eligible: status.eligible,
            existingResponse: status.existingResponse,
            reflection: local?.reflection,
          });
          setEvidenceStatus(preserveExistingReflectionDraft
            ? { ...status, eligible: false, reason: "reflection_draft_preserved" }
            : status);
          if (status.existingResponse !== null) {
            setTransferPulseResponse(status.existingResponse);
          } else if (!preserveExistingReflectionDraft && isTransferPulseResponse(local?.transferPulseResponse)) {
            setTransferPulseResponse(local.transferPulseResponse);
          }
        } catch (error) {
          setEvidenceStatus({
            eligible: false,
            reason: "unavailable",
            protocolVersion: scheduledPulse.protocolVersion,
            domainId: scheduledPulse.domainId,
            existingResponse: null,
            locked: false,
          });
          void captureAppError({
            eventName: "evidence_status_load_failed",
            error,
            role,
            route: "/dashboard",
            isTest: isTestUser,
            metadata: {
              day_number: result.resolved.matrix.dayNumber,
              event_type: eventType,
            },
          });
        }
      }

      // ─── Micro-Adjustment Layer ─────────────────────────
      // Lädt nur bestehende Daten, kein KI-Call, undefined-safe.
      let todayCheckinQuery = supabase
        .from("daily_checkins")
        .select("mood_before, energy_level, focus_rating, wellbeing_metrics")
        .eq("user_id", user.id)
        .eq("date", dateStr)
        .limit(1);
      todayCheckinQuery = instance?.id
        ? todayCheckinQuery.eq("program_instance_id", instance.id)
        : todayCheckinQuery.is("program_instance_id", null);

      let questionnaireQuery = supabase
        .from("questionnaire_responses")
        .select("analysis")
        .eq("user_id", user.id)
        .not("analysis", "is", null)
        .order("created_at", { ascending: false })
        .limit(1);
      if (instance?.id) questionnaireQuery = questionnaireQuery.eq("program_instance_id", instance.id);

      const [{ data: todayCheckins }, { data: questionnaireRows }] = await Promise.all([
        todayCheckinQuery,
        questionnaireQuery,
      ]);
      const todayCheckin = todayCheckins?.[0] ?? null;
      const questionnaire = questionnaireRows?.[0] ?? null;
      const wellbeingMetrics = asRecord(todayCheckin?.wellbeing_metrics);

      // Robuste, optionale Signal-Extraktion aus der bestehenden Analyse.
      // Keine Diagnosen, keine privaten Rohantworten im UI — nur grobe Musterlinien.
      const analysis = (questionnaire?.analysis ?? null) as Record<string, unknown> | null;
      const questionnaireSignals = buildQuestionnaireSignals(analysis);
      const localCheckin = local
        ? {
            mood: local.moodBefore,
            energy: local.energyLevel,
            focus: local.focusClarity,
            stress: local.stress ?? local.pressure,
          }
        : undefined;

      const micro = buildMicroAdjustmentContext({
        day: {
          dayNumber: result.resolved.matrix.dayNumber,
          lens: result.resolved.content.title ?? result.resolved.content.lens ?? result.resolved.matrix.lens,
          primaryMechanism: result.resolved.matrix.primaryMechanism,
          recurrenceType: result.resolved.matrix.recurrenceType,
          phase: result.resolved.matrix.phase,
        },
        contextType: eventType,
        profile: {
          sport: profile?.sport ?? null,
          position: profile?.position ?? profile?.team ?? null,
        },
        questionnaireSignals,
        checkin: todayCheckin
          ? {
              mood: todayCheckin.mood_before ?? null,
              energy: todayCheckin.energy_level ?? null,
              focus: todayCheckin.focus_rating ?? null,
              stress: numberOrUndefined(wellbeingMetrics?.stress) ?? numberOrUndefined(wellbeingMetrics?.pressure) ?? null,
            }
          : localCheckin,
      });
      setMicroAdjustment(micro);
    }
    setLoadingTasks(false);
  };

  useEffect(() => {
    if (!draftKey || previewMode || step === 5) return;
    const hasDraft =
      completedTasks.length > 0 ||
      reflection.trim().length > 0 ||
      transferPulseResponse !== null ||
      [moodBefore, energyLevel, focusClarity, stress, recovery, sleepQuality, physicalReadiness, motivation, pressure, teamConnection]
        .some((value) => value !== null);
    if (!hasDraft) return;
    writeLocalDraft<CheckinDraft>(draftKey, {
      step,
      completedTasks,
      reflection,
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
      transferPulseResponse,
      transferPulseResponseDurationMs,
      savedAt: new Date().toISOString(),
    });
  }, [
    draftKey,
    previewMode,
    step,
    completedTasks,
    reflection,
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
    transferPulseResponse,
    transferPulseResponseDurationMs,
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
  ): Promise<boolean> => {
    if (previewMode) {
      setStep(5);
      return true;
    }
    if (!user?.id || !assignmentId || !resolved) return false;
    if (saving) return false; // Race-Schutz: Doppelklick / parallele Auslösungen ignorieren
    setSaveError(null);
    setSaving(true);
    const dateStr = format(date, "yyyy-MM-dd");
    const focusRating = focusClarity
      ?? (tasks.length > 0 ? Math.max(1, Math.round((completedTasks.length / tasks.length) * 10)) : null);
    const completedTitles = completedTasks.map((id) => tasks.find((t) => t.id === id)?.title ?? id);

    const { getOrCreateActiveInstance } = await import("@/lib/programInstance");
    const instance = await getOrCreateActiveInstance(user.id);

    if (!instance?.id) {
      setSaving(false);
      setSaveError("Dein Programmlauf ist noch nicht vollständig eingerichtet. Bitte wende dich an den Coach oder Support.");
      return false;
    }

    try {
      await saveDailyTracking({
        assignmentId,
        userId: user.id,
        date: dateStr,
        eventType,
        dayNumber: resolved.matrix.dayNumber,
        variantUsed: eventType,
        programInstanceId: instance.id,
        completedTaskTitles: completedTitles,
        reflection: activeTransferPulse ? null : reflection.trim() || null,
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
        evidence: activeTransferPulse && transferPulseResponse !== null
          ? {
              protocolVersion: activeTransferPulse.protocolVersion,
              domainId: activeTransferPulse.domainId,
              response: transferPulseResponse,
              responseDurationMs: transferPulseResponseDurationMs,
            }
          : undefined,
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
      const { toast } = await import("sonner");
      setSaveError("Dein Check-in ist lokal gesichert. Bitte erneut speichern, sobald die Verbindung stabil ist.");
      toast.error("Check-in lokal gesichert. Speichern bitte erneut versuchen.");
      return false;
    }

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
    if (saved) setComprehensionDone(true);
  };

  const ScienceBiteIntro = () => {
    const bite = resolved?.content.scienceBite.fact ?? "";
    const [headline, ...body] = bite.split("\n\n").filter(Boolean);

    return (
      <motion.div
        key="science-intro"
        initial={{ opacity: 0, scale: 0.96, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: -16 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="min-h-[calc(100dvh-11rem)] flex flex-col justify-center"
      >
        {loadingTasks ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl bg-gradient-card border-glow overflow-hidden">
              <div className="p-5 border-b border-border/50 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold mb-2">Science Bite</p>
                  <h2 className="font-heading text-2xl font-bold leading-tight">{headline}</h2>
                </div>
                <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                  <Brain className="w-5 h-5 text-primary" />
                </div>
              </div>

              <div className="p-5 space-y-4">
                {body.map((paragraph, index) => (
                  <p key={index} className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>

            {resolved && (
              <div className={`rounded-2xl border border-border/50 p-4 ${config.bg}`}>
                <div className="flex items-start gap-3">
                  <config.icon className={`w-5 h-5 mt-0.5 shrink-0 ${config.color}`} />
                  <div>
                    <p className={`text-xs uppercase tracking-[0.16em] font-semibold ${config.color}`}>
                      Heute als {resolved.context.label}
                    </p>
                    <p className="text-sm text-foreground mt-1 leading-relaxed">
                      {resolved.context.focus}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {microAdjustment && <TodayForYou data={microAdjustment} />}

            <motion.button
              data-testid="daily-science-ack"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setStep(1)}
              className="w-full flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-heading font-semibold text-lg hover:shadow-glow transition-all"
            >
              Verstanden <ArrowRight className="w-5 h-5" />
            </motion.button>
          </div>
        )}
      </motion.div>
    );
  };

  // ─── Task Dashboard ─────────────────────────────
  const TaskDashboard = () => {
    return (
      <motion.div key="tasks" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-heading text-2xl font-bold">Heute im Fokus</h2>
        </div>
        {resolved && (
          <p className="text-muted-foreground mb-4 text-sm">
            Tag {resolved.matrix.dayNumber} · {displayTitle}
          </p>
        )}

        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
          {resolved?.context.checkin.taskIntro}
        </p>

        {loadingTasks ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const IconComp = iconMap[task.icon ?? "brain"] ?? Brain;
              const taskDone = completedTasks.includes(task.id);
              return (
                <button
                  key={task.id}
                  data-testid={`task-card-${task.id}`}
                  onClick={() => setSelectedTask(task)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all active:scale-[0.98] ${
                    taskDone
                      ? "bg-primary/10 border-primary/30"
                      : "bg-gradient-card border-border/50 hover:bg-secondary/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      taskDone ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                    }`}>
                      {taskDone ? <CheckCircle2 className="w-5 h-5" /> : <IconComp className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${taskDone ? "text-primary" : ""}`}>{task.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{task.whenToUse}</p>
                    </div>
                    {taskDone ? (
                      <span className="text-xs font-semibold text-primary shrink-0">Verstanden</span>
                    ) : (
                      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </motion.div>
    );
  };

  const flowStepTitles = [
    "Science Bite",
    "Dein Tages-Puls",
    activeTransferPulse ? "Transfer-Pulse" : "Reflexion",
    "Deine Aufgaben",
    "Verständnis-Check",
    "Abgeschlossen",
  ] as const;

  return (
    <div className="flex min-h-screen min-h-[100dvh] flex-col bg-[#0D0E12] text-[#EEF0F2]">
      <AthleteScreenHeader
        title={flowStepTitles[step] ?? "Daily Flow"}
        eyebrow={`Daily Flow · ${config.label}`}
        onBack={handleBack}
        backLabel="Im Daily Flow zurück"
        trailing={(
          <div className="flex items-center gap-2 rounded-full border border-white/[0.065] bg-white/[0.035] px-3 py-2 text-[11px] text-white/52">
            <config.icon className={`h-3.5 w-3.5 ${config.color}`} />
            {format(date, "d. MMM", { locale: de })}
          </div>
        )}
      />
      <div className="border-b border-white/[0.045] bg-[#0D0E12]/88 px-5 py-2">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          {Array.from({ length: 5 }, (_, index) => (
            <div
              key={index}
              className={`h-1 flex-1 rounded-full ${
                step > index || step === 5 ? "bg-primary" : step === index ? "bg-primary/55" : "bg-white/[0.065]"
              }`}
            />
          ))}
          <span className="ml-1 text-[10px] tabular-nums text-white/42">
            {step === 5 ? "5/5" : `${Math.min(step + 1, 5)}/5`}
          </span>
        </div>
      </div>

      <div ref={contentScrollRef} className="flex-1 overflow-y-auto px-5 py-7">
        <div className="mx-auto w-full max-w-lg">
          {saveError && (
            <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-muted-foreground">
              {saveError}
            </div>
          )}
          <AnimatePresence mode="wait">
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
                  <motion.div
                    key="mood-energy"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                  >
                    <h2 className="font-heading text-2xl font-bold mb-1">
                      {resolved?.context.checkin.pulseTitle ?? "Wohlbefinden & Bereitschaft"}
                    </h2>
                    <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold mb-2">Dein Tages-Puls</p>
                    <p className="text-muted-foreground mb-6 text-sm">
                      {resolved?.context.checkin.pulseDescription} Deine Antworten bleiben privat. Coaches sehen nur
                      geschützte Team-Tendenzen ab mindestens 5 Teilnehmenden.
                    </p>

                    <div className="space-y-7">
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
                        <div key={q.label}>
                          <label className="text-sm font-semibold block mb-1">{q.label}</label>
                          <p className="text-xs text-muted-foreground mb-2">{q.question}</p>
                          <div className="grid grid-cols-5 gap-2">
                            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                              <button
                                key={n}
                                data-testid={`pulse-${q.id}-${n}`}
                                onClick={() => q.set(n)}
                                className={`min-h-11 rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                  q.value === n
                                    ? "bg-primary text-primary-foreground shadow-glow"
                                    : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                                }`}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                          <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
                            <span>{q.low}</span>
                            <span>{q.high}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
                {step === 2 && (
                  activeTransferPulse ? (
                    <motion.div
                      key="transfer-pulse"
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                    >
                      <AthleteTransferPulse
                        pulse={activeTransferPulse}
                        value={transferPulseResponse}
                        onValueChange={selectTransferPulseResponse}
                        disabled={evidenceStatus?.locked}
                      />
                      <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
                        Deine Antwort bleibt für Coaches unsichtbar. Sie kann nur freiwillig und geschützt in
                        zusammengefasste Auswertungen einfließen.
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div key="reflection" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
                      <h2 className="font-heading text-2xl font-bold mb-2">
                        Optional: {resolved?.context.checkin.reflectionTitle ?? "Was beeinflusst deinen Zustand heute?"}
                      </h2>
                      <p className="text-muted-foreground mb-2 text-sm">
                        {resolved?.context.checkin.reflectionDescription}
                      </p>
                      <div className="mb-4 p-3 rounded-xl bg-primary/5 border border-primary/15 flex items-start gap-2">
                        <Moon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          <span className="text-foreground font-medium">Heute Abend:</span>{" "}
                          {resolved?.context.checkin.journalReminder}
                        </p>
                      </div>
                      <VoiceInput
                        currentValue={reflection}
                        onTranscript={(val) => setReflection(val)}
                        placeholder="Schreibe frei oder sprich ein..."
                      />
                      <textarea
                        data-testid="daily-state-reflection"
                        value={reflection}
                        onChange={(e) => setReflection(e.target.value)}
                        placeholder="Optional. Nur für dich sichtbar."
                        className="w-full h-32 mt-3 px-5 py-4 rounded-2xl bg-secondary/40 border border-border/50 text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </motion.div>
                  )
                )}
                {step === 3 && <TaskDashboard />}
                {step === 4 && (
                  <motion.div key="comprehension" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
                    <h2 className="font-heading text-2xl font-bold mb-2">Kurzer Verständnis-Check</h2>
                    <p className="text-muted-foreground mb-6 text-sm">
                      {comprehensionQuestions.length > 0
                        ? "Drei Fragen zur heutigen Linse. Kein Test — nur Festigung."
                        : "Heute kein Check verfügbar. Du kannst direkt abschließen."}
                    </p>
                    {comprehensionQuestions.length > 0 ? (
                      <ComprehensionCheck
                        questions={comprehensionQuestions}
                        onComplete={handleComprehensionComplete}
                      />
                    ) : (
                      <motion.button
                        data-testid="comprehension-empty-finish"
                        onClick={() => saveCheckin()}
                        disabled={saving}
                        whileTap={!saving ? { scale: 0.98 } : undefined}
                        className="w-full flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-heading font-semibold transition-all active:scale-[0.98] disabled:opacity-60"
                      >
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                        {saving ? "Speichert..." : "Check-in abschließen"}
                      </motion.button>
                    )}
                  </motion.div>
                )}
                {step === 5 && (
                  <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }} className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
                      <Check className="w-10 h-10 text-primary" />
                    </motion.div>
                    <h2 className="font-heading text-2xl font-bold mb-2">Check-in abgeschlossen</h2>
                    {resolved && (
                      <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-3">
                        Tag {resolved.matrix.dayNumber}/56 · {displayTitle}
                      </p>
                    )}
                    <p className="text-muted-foreground mb-3 text-sm">
                      {resolved?.context.checkin.completionMessage}
                    </p>
                    <div className="mb-8 max-w-sm mx-auto rounded-2xl bg-primary/5 border border-primary/15 p-4 text-left">
                      <div className="flex items-start gap-3">
                        <Flame className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Die Flamme lebt von Rückkehr. Heute Abend schließt du den Tag mit dem Journal sauber ab.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 max-w-xs mx-auto">
                      <button
                        onClick={onClose}
                        className="px-8 py-3 rounded-xl bg-primary font-heading font-semibold text-primary-foreground hover:shadow-glow transition-all"
                      >
                        Zurück zum Dashboard
                      </button>
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {(step === 1 || step === 2 || step === 3) && !selectedTask && (
        <div className="sticky bottom-0 border-t border-white/[0.07] bg-[#0B0C10]/92 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur-2xl">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <button onClick={handleBack} className="flex min-h-12 items-center gap-2 rounded-xl px-4 py-3 text-white/52 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <ArrowLeft className="w-4 h-4" />
              Zurück
            </button>
            {(() => {
              const pulseComplete = [moodBefore, energyLevel, focusClarity, stress, recovery, sleepQuality, physicalReadiness, motivation, pressure, teamConnection].every((v) => v !== null);
              const tasksComplete = tasks.length === 0 || tasks.every((task) => completedTasks.includes(task.id));
              const remainingTasks = tasks.filter((task) => !completedTasks.includes(task.id)).length;
              const transferPulseIncomplete = step === 2
                && Boolean(activeTransferPulse)
                && transferPulseResponse === null;
              const blocked = saving
                || (step === 1 && !pulseComplete)
                || transferPulseIncomplete
                || (step === 3 && !tasksComplete);
              return (
                <motion.button
                  data-testid={`daily-next-step-${step}`}
                  whileHover={!blocked ? { scale: 1.02 } : undefined}
                  whileTap={!blocked ? { scale: 0.98 } : undefined}
                  onClick={() => {
                    if (blocked) return;
                    if (step === 1) setStep(2);
                    else if (step === 2) setStep(3);
                    else if (step === 3 && tasksComplete) setStep(4);
                  }}
                  disabled={blocked}
                  className={`flex min-h-12 items-center gap-2 whitespace-nowrap rounded-2xl px-5 py-3 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    blocked
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : "bg-primary text-primary-foreground hover:shadow-glow"
                  }`}
                >
                  {step === 3 && !tasksComplete
                    ? `${remainingTasks} ${remainingTasks === 1 ? "Aufgabe" : "Aufgaben"} offen`
                    : "Weiter"}
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
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
