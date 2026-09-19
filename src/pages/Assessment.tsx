import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Check, Loader2 } from "lucide-react";
import { allAssessments, AssessmentInstrument, calculateScores } from "@/data/validatedAssessments";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAssessmentCompletionStatus,
  type AssessmentCompletionStatus,
  type AssessmentTiming,
} from "@/lib/programProgress";
import { toast } from "sonner";
import { captureAppError } from "@/lib/monitoring";
import { BrandLockup } from "@/components/brand/BrandLogo";
import type { Json } from "@/integrations/supabase/types";
import AthleteRouteLoadingShell from "@/components/app/AthleteRouteLoadingShell";
import AccessStatusScreen from "@/components/access/AccessStatusScreen";
import { markAssessmentStatusChanged } from "@/lib/assessmentStatusRevision";
import { clearAthleteProgressCache } from "@/lib/athleteProgressCache";

type Phase = "select" | "instructions" | "items" | "sequence-done";

const timingLabel = (timing: AssessmentTiming) =>
  timing === "pre" ? "Pre" : timing === "mid" ? "Mid" : "Post";

const timingTitle = (timing: AssessmentTiming) =>
  timing === "pre" ? "Startmessung" : timing === "mid" ? "Zwischenmessung" : "Abschlussmessung";

const Assessment = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, role, isTestUser } = useAuth();
  const requestedMode = searchParams.get("mode");
  const mode: AssessmentTiming | null = requestedMode === "pre" || requestedMode === "mid" || requestedMode === "post"
    ? requestedMode
    : null;

  const [phase, setPhase] = useState<Phase>("select");
  const [selectedTest, setSelectedTest] = useState<AssessmentInstrument | null>(null);
  const [timing, setTiming] = useState<"pre" | "mid" | "post">(mode || "pre");
  const [currentItem, setCurrentItem] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [sequenceIndex, setSequenceIndex] = useState(0);
  const [completedAssessmentIds, setCompletedAssessmentIds] = useState<string[]>([]);
  const [completionStatus, setCompletionStatus] = useState<AssessmentCompletionStatus | null>(null);
  const [accessLoading, setAccessLoading] = useState(true);
  const [accessError, setAccessError] = useState(false);

  const isSequentialMode = mode !== null;

  const loadAccess = useCallback(async () => {
    if (!user?.id) return;
    setAccessLoading(true);
    setAccessError(false);

    try {
      const status = await getAssessmentCompletionStatus(user.id);
      const requestedTiming: AssessmentTiming | null = mode
        ?? (!status.preDone
          ? "pre"
          : status.midDue
            ? "mid"
            : status.postDue
              ? "post"
              : null);

      if (!requestedTiming) {
        toast.info("Deine aktuell fälligen Messungen sind vollständig gespeichert.");
        navigate("/dashboard", { replace: true });
        return;
      }

      if (!mode) {
        navigate(`/assessment?mode=${requestedTiming}`, { replace: true });
        return;
      }

      const completed = status.completedAssessmentIds[requestedTiming];
      const completedAll = requestedTiming === "pre"
        ? status.preDone
        : requestedTiming === "mid"
          ? status.midDone
          : status.postDone;
      const isDue = requestedTiming === "pre"
        ? !status.preDone
        : requestedTiming === "mid"
          ? status.midDue
          : status.postDue;

      setCompletionStatus(status);
      setCompletedAssessmentIds(completed);

      if (completedAll) {
        toast.info(`${timingTitle(requestedTiming)} wurde bereits vollständig gespeichert.`);
        navigate("/dashboard", { replace: true });
        return;
      }

      if (!isDue) {
        toast.error(
          requestedTiming !== "pre" && !status.preDone
            ? "Zuerst muss die Startmessung abgeschlossen sein."
            : `${timingTitle(requestedTiming)} ist noch nicht freigegeben.`,
          { duration: 2600 },
        );
        navigate("/dashboard", { replace: true });
        return;
      }

      const firstIncompleteIndex = allAssessments.findIndex((test) => !completed.includes(test.id));
      if (firstIncompleteIndex < 0) {
        navigate("/dashboard", { replace: true });
        return;
      }

      setTiming(requestedTiming);
      setSequenceIndex(firstIncompleteIndex);
      setSelectedTest(allAssessments[firstIncompleteIndex]);
      setAnswers({});
      setCurrentItem(0);
      setPhase("instructions");
    } catch (error) {
      void captureAppError({
        eventName: "app_runtime_error",
        error,
        role,
        route: "/assessment",
        isTest: isTestUser,
        metadata: { source: "assessment", stage: "access" },
      });
      setAccessError(true);
    } finally {
      setAccessLoading(false);
    }
  }, [isTestUser, mode, navigate, role, user?.id]);

  useEffect(() => {
    void loadAccess();
  }, [loadAccess]);

  const startTest = (test: AssessmentInstrument, t: "pre" | "mid" | "post") => {
    if (completionStatus?.completedAssessmentIds[t].includes(test.id)) return;
    setSelectedTest(test);
    setTiming(t);
    setAnswers({});
    setCurrentItem(0);
    setPhase("instructions");
  };

  const answerItem = (itemId: string, value: number) => {
    const newAnswers = { ...answers, [itemId]: value };
    setAnswers(newAnswers);
    if (selectedTest && currentItem < selectedTest.items.length - 1) {
      setCurrentItem((prev) => Math.min(prev + 1, selectedTest.items.length - 1));
    }
  };

  const finishTest = async () => {
    if (!selectedTest || !user?.id) return;
    if (!allAnswered) {
      toast.error("Bitte beantworte alle Aussagen, bevor du abschließt.");
      return;
    }
    setSaving(true);

    const scores = calculateScores(selectedTest, answers);

    if (!completionStatus?.instanceId) {
      toast.error("Dein Programmlauf ist noch nicht vollständig eingerichtet.");
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase.from("assessments").insert({
      user_id: user.id,
      session_id: user.id,
      assessment_type: selectedTest.id,
      timing,
      answers: answers as unknown as Json,
      scores: scores.subscaleScores as unknown as Json,
      total_score: scores.totalScore,
      program_instance_id: completionStatus.instanceId,
    });

    const duplicate = insertError?.code === "23505";
    if (insertError) {
      // Duplicate (unique on user_id+instance+type+timing) → bereits absolviert in dieser Cohorte
      if (!duplicate) {
        void captureAppError({
          eventName: "assessment_saved",
          error: insertError,
          role,
          route: "/assessment",
          isTest: isTestUser,
          metadata: {
            assessment_type: selectedTest.id,
            timing,
            has_program_instance: Boolean(completionStatus.instanceId),
          },
        });
        toast.error("Speichern fehlgeschlagen.");
        setSaving(false);
        return;
      }
    }

    const updatedCompletedIds = completedAssessmentIds.includes(selectedTest.id)
      ? completedAssessmentIds
      : [...completedAssessmentIds, selectedTest.id];
    const timingComplete = allAssessments.every((test) => updatedCompletedIds.includes(test.id));
    setCompletedAssessmentIds(updatedCompletedIds);
    setCompletionStatus((previous) => previous ? {
      ...previous,
      completedAssessmentIds: {
        ...previous.completedAssessmentIds,
        [timing]: updatedCompletedIds,
      },
      preDone: timing === "pre" ? timingComplete : previous.preDone,
      midDone: timing === "mid" ? timingComplete : previous.midDone,
      postDone: timing === "post" ? timingComplete : previous.postDone,
      midDue: timing === "mid" && timingComplete ? false : previous.midDue,
      postDue: timing === "post" && timingComplete ? false : previous.postDue,
    } : previous);
    markAssessmentStatusChanged(user.id);
    clearAthleteProgressCache(user.id);

    setSaving(false);

    const nextIncompleteIndex = allAssessments.findIndex(
      (test, index) => index > sequenceIndex && !updatedCompletedIds.includes(test.id),
    );
    if (isSequentialMode && nextIncompleteIndex >= 0) {
      setSequenceIndex(nextIncompleteIndex);
      setSelectedTest(allAssessments[nextIncompleteIndex]);
      setAnswers({});
      setCurrentItem(0);
      setPhase("instructions");
    } else if (!isSequentialMode && !timingComplete) {
      setSelectedTest(null);
      setPhase("select");
    } else {
      setPhase("sequence-done");
    }

    if (duplicate) {
      toast.info(`${selectedTest.titleShort} (${timingLabel(timing)}) war bereits gespeichert.`);
    } else {
      toast.success(`${selectedTest.titleShort} ${timingTitle(timing)} gespeichert.`);
    }
  };

  const allAnswered = selectedTest ? selectedTest.items.every((item) => answers[item.id] != null) : false;
  const selectedItem = selectedTest?.items[currentItem] ?? null;
  const currentAnswered = !!selectedItem && answers[selectedItem.id] != null;
  const itemCount = selectedTest?.items.length ?? 0;
  const currentItemNumber = itemCount > 0 ? Math.min(currentItem + 1, itemCount) : 0;
  const itemProgress = itemCount > 0 ? (currentItemNumber / itemCount) * 100 : 0;

  useEffect(() => {
    if (!selectedTest || phase !== "items") return;
    if (selectedTest.items.length === 0) {
      setPhase("instructions");
      setCurrentItem(0);
      toast.error("Diese Messung konnte gerade nicht geladen werden.");
      return;
    }
    if (currentItem < 0 || currentItem >= selectedTest.items.length) {
      setCurrentItem(Math.max(0, Math.min(currentItem, selectedTest.items.length - 1)));
    }
  }, [currentItem, phase, selectedTest]);

  if (accessLoading) {
    return <AthleteRouteLoadingShell active="today" label="Prüfe deinen Messstatus..." />;
  }

  if (accessError || !completionStatus) {
    return (
      <AccessStatusScreen
        title="Messstatus gerade nicht verfügbar"
        message="Deine bisherigen Antworten bleiben gespeichert. Prüfe den Status erneut, bevor du eine Messung öffnest."
        onRetry={() => void loadAccess()}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            aria-label="Zurück zum Dashboard"
            className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <BrandLockup symbolSize={26} textClassName="text-base" />
          </button>
          <div className="flex items-center gap-2">
            {isSequentialMode && (
              <span className="text-xs text-primary font-heading font-medium px-2 py-1 rounded-md bg-primary/10">
                Messung {sequenceIndex + 1}/{allAssessments.length}
              </span>
            )}
            <span className="text-xs text-muted-foreground font-heading">
              {phase === "select" ? "Wissenschaftliche Messungen" : selectedTest?.titleShort}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {/* ─── Measurement Selection (manual mode only) ─── */}
          {phase === "select" && (
            <motion.div key="select" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="mb-8">
                <h1 className="font-heading text-2xl md:text-3xl font-bold mb-3">
                  Validierte <span className="text-gradient">Messungen</span>
                </h1>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Diese wissenschaftlich validierten Fragebögen dokumentieren deinen Ausgangspunkt und deine Entwicklung.
                  Antworte ehrlich aus deinem aktuellen Zustand heraus.
                </p>
              </div>
              <div className="space-y-4">
                {allAssessments.map((test) => {
                  const alreadyCompleted = completionStatus.completedAssessmentIds.pre.includes(test.id);
                  return (
                  <div key={test.id} className="p-6 rounded-2xl bg-gradient-card border-glow">
                    <div className="mb-3">
                      <h3 className="font-heading font-semibold mb-1">{test.titleShort}</h3>
                      <p className="text-xs text-muted-foreground">{test.title}</p>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">{test.description}</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {test.subscales.map((sub) => (
                        <span key={sub.id} className="px-2 py-1 rounded-md bg-secondary text-xs text-muted-foreground">{sub.name}</span>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mb-4 italic">{test.citation}</p>
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => startTest(test, "pre")}
                        disabled={alreadyCompleted}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary/10 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/20 disabled:cursor-default disabled:bg-white/[0.035] disabled:text-white/42"
                      >
                        {alreadyCompleted ? "Bereits gespeichert" : "Startmessung beginnen"}
                      </button>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        Zwischen- und Abschlussmessung werden später automatisch im Dashboard freigegeben.
                      </p>
                    </div>
                  </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ─── Instructions ─── */}
          {phase === "instructions" && selectedTest && (
            <motion.div key="instructions" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-center py-12">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Messung vorbereiten</p>
              <h2 className="font-heading text-2xl font-bold mb-2">{selectedTest.titleShort}</h2>
              <p className="text-xs text-primary font-medium mb-4">{timingTitle(timing)} · {selectedTest.items.length} Aussagen</p>
              <p className="text-muted-foreground text-sm max-w-md mx-auto mb-8 leading-relaxed">{selectedTest.instructions}</p>
              <div className="flex items-center justify-center gap-3 mb-8">
                {selectedTest.scaleLabels.map((label, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <span className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center text-xs font-medium">{i + selectedTest.scaleRange[0]}</span>
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => {
                    if (isSequentialMode) {
                      navigate("/dashboard");
                    } else {
                      setPhase("select");
                      setSelectedTest(null);
                    }
                  }}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-secondary text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
                >
                  <ArrowLeft className="w-4 h-4" /> Zurück
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setPhase("items")}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl bg-primary font-heading font-semibold text-primary-foreground hover:shadow-glow transition-all"
                >
                  Beginnen <ArrowRight className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ─── Items ─── */}
          {phase === "items" && selectedTest && selectedItem && (
            <motion.div key="items" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">{currentItemNumber} / {itemCount}</span>
                  <span className="text-xs text-primary font-medium">{selectedTest.titleShort} · {timingTitle(timing)}</span>
                </div>
                <div className="h-1 bg-secondary rounded-full overflow-hidden">
                  <motion.div className="h-full bg-primary rounded-full" animate={{ width: `${itemProgress}%` }} />
                </div>
              </div>
              <AnimatePresence mode="wait">
                <motion.div key={currentItem} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="mb-8">
                  <p className="font-heading text-lg font-semibold mb-6 leading-relaxed">{selectedItem.text}</p>
                  <div className="space-y-2">
                    {selectedTest.scaleLabels.map((label, i) => {
                      const value = i + selectedTest.scaleRange[0];
                      const isSelected = answers[selectedItem.id] === value;
                      return (
                        <button key={value} onClick={() => answerItem(selectedItem.id, value)} className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all text-left ${isSelected ? "bg-primary/10 ring-1 ring-primary/30 text-primary" : "bg-gradient-card border-glow hover:bg-secondary/50"}`}>
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium shrink-0 ${isSelected ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{value}</span>
                          <span className="text-sm">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              </AnimatePresence>
              <div className="flex items-center justify-between">
                <button onClick={() => currentItem > 0 ? setCurrentItem(currentItem - 1) : setPhase("instructions")} className="flex items-center gap-2 px-5 py-3 rounded-xl text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Zurück
                </button>
                {currentItem === selectedTest.items.length - 1 && allAnswered && (
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={finishTest} disabled={saving} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary font-heading font-semibold text-primary-foreground hover:shadow-glow transition-all">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Messung abschließen
                  </motion.button>
                )}
                {currentItem < selectedTest.items.length - 1 && (
                  <button
                    onClick={() => currentAnswered ? setCurrentItem(currentItem + 1) : toast.error("Bitte wähle zuerst eine Antwort.")}
                    disabled={!currentAnswered}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl transition-colors ${
                      currentAnswered ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/50 cursor-not-allowed"
                    }`}
                  >
                    Weiter <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* ─── Sequence Done ─── */}
          {phase === "sequence-done" && (
            <motion.div key="sequence-done" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-16 text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }} className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-primary" />
              </motion.div>
              <h2 className="font-heading text-2xl font-bold mb-3">{timingTitle(timing)} abgeschlossen.</h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto mb-8 leading-relaxed">
                Deine Antworten wurden als Messpunkt gespeichert. Sie sind keine Bewertung deiner Person oder deiner sportlichen Eignung.
              </p>
              <div className="flex flex-wrap gap-2 justify-center mb-8">
                {completedAssessmentIds.map((assessmentId) => {
                  const test = allAssessments.find((item) => item.id === assessmentId);
                  return (
                    <span key={assessmentId} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium">
                      ✓ {test?.titleShort}
                    </span>
                  );
                })}
              </div>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => navigate("/dashboard")} className="flex items-center gap-2 px-8 py-3 rounded-xl bg-primary font-heading font-semibold text-primary-foreground hover:shadow-glow transition-all mx-auto">
                Zum Dashboard <ArrowRight className="w-4 h-4" />
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
};

export default Assessment;
