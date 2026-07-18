import { useCallback, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Check, ClipboardCheck, BarChart3, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { allAssessments, AssessmentInstrument, calculateScores } from "@/data/validatedAssessments";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getOrCreateActiveInstance } from "@/lib/programInstance";
import { getRetestStatus } from "@/lib/programProgress";
import { toast } from "sonner";
import { captureAppError } from "@/lib/monitoring";
import { BrandLockup } from "@/components/brand/BrandLogo";
import type { Json } from "@/integrations/supabase/types";

type Phase = "select" | "instructions" | "items" | "results" | "sequence-done" | "comparison";

interface SavedResult {
  assessment_type: string;
  scores: Record<string, number>;
  total_score: number;
  timing: string;
}

const Assessment = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, role, isTestUser } = useAuth();
  const mode = searchParams.get("mode") as "pre" | "mid" | "post" | null;

  const [phase, setPhase] = useState<Phase>(mode ? "instructions" : "select");
  const [selectedTest, setSelectedTest] = useState<AssessmentInstrument | null>(mode ? allAssessments[0] : null);
  const [timing, setTiming] = useState<"pre" | "mid" | "post">(mode || "pre");
  const [currentItem, setCurrentItem] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [savedScores, setSavedScores] = useState<{ subscaleScores: Record<string, number>; totalScore: number } | null>(null);

  const [sequenceIndex, setSequenceIndex] = useState(0);
  const [sequenceResults, setSequenceResults] = useState<SavedResult[]>([]);

  const [preResults, setPreResults] = useState<SavedResult[]>([]);
  const [postResults, setPostResults] = useState<SavedResult[]>([]);

  const isSequentialMode = mode !== null;

  const timingLabel = (t: "pre" | "mid" | "post") =>
    t === "pre" ? "Pre" : t === "mid" ? "Mid" : "Post";
  const timingTitle = (t: "pre" | "mid" | "post") =>
    t === "pre" ? "Startmessung" : t === "mid" ? "Zwischenmessung" : "Abschlussmessung";

  useEffect(() => {
    if (!user?.id || !mode || mode === "pre") return;

    const guardRetestAccess = async () => {
      const instance = await getOrCreateActiveInstance(user.id);
      if (!instance?.id) {
        toast.error("Dein Programmlauf ist noch nicht vollständig eingerichtet.");
        navigate("/dashboard", { replace: true });
        return;
      }
      let preQ = supabase
        .from("assessments")
        .select("assessment_type")
        .eq("timing", "pre")
        .eq("user_id", user.id);
      if (instance?.id) preQ = preQ.eq("program_instance_id", instance.id);
      const [{ data: preRows }, retest] = await Promise.all([preQ, getRetestStatus(user.id)]);
      const preTypes = new Set((preRows ?? []).map((row) => row.assessment_type));
      const preDone = allAssessments.every((test) => preTypes.has(test.id));
      const allowed = mode === "mid" ? retest.midDue : retest.postDue;

      if (!preDone || !allowed) {
        toast.error(
          !preDone
            ? "Zuerst muss die Startmessung abgeschlossen sein."
            : `${timingTitle(mode)} ist noch nicht freigegeben.`,
          { duration: 2600 },
        );
        navigate("/dashboard", { replace: true });
      }
    };

    guardRetestAccess();
  }, [mode, navigate, user?.id]);

  const loadPreResults = useCallback(async () => {
    if (!user?.id) return;
    const instance = await getOrCreateActiveInstance(user.id);
    if (!instance?.id) return;
    let q = supabase
      .from("assessments")
      .select("assessment_type, scores, total_score, timing")
      .eq("timing", "pre")
      .eq("user_id", user.id);
    if (instance?.id) q = q.eq("program_instance_id", instance.id);
    const { data } = await q;
    if (data) setPreResults(data as SavedResult[]);
  }, [user?.id]);

  useEffect(() => {
    if (mode === "post") {
      void loadPreResults();
    }
  }, [loadPreResults, mode]);

  const startTest = (test: AssessmentInstrument, t: "pre" | "mid" | "post") => {
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
    setSavedScores(scores);

    const instance = await getOrCreateActiveInstance(user.id);
    if (!instance?.id) {
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
      program_instance_id: instance.id,
    });

    if (insertError) {
      // Duplicate (unique on user_id+instance+type+timing) → bereits absolviert in dieser Cohorte
      if (insertError.code === "23505") {
        toast.info(`${selectedTest.titleShort} (${timingLabel(timing)}) wurde bereits in diesem Programm-Zyklus gespeichert.`);
      } else {
        void captureAppError({
          eventName: "assessment_saved",
          error: insertError,
          role,
          route: "/assessment",
          isTest: isTestUser,
          metadata: {
            assessment_type: selectedTest.id,
            timing,
            has_program_instance: Boolean(instance?.id),
          },
        });
        toast.error("Speichern fehlgeschlagen.");
        setSaving(false);
        return;
      }
    }

    const result: SavedResult = {
      assessment_type: selectedTest.id,
      scores: scores.subscaleScores,
      total_score: scores.totalScore,
      timing,
    };
    setSequenceResults((prev) => [...prev, result]);

    setSaving(false);

    if (isSequentialMode) {
      if (sequenceIndex < allAssessments.length - 1) {
        setPhase("results");
      } else {
        if (mode === "post") {
          let preQ = supabase
            .from("assessments")
            .select("assessment_type, scores, total_score, timing")
            .eq("timing", "pre")
            .eq("user_id", user.id);
          let postQ = supabase
            .from("assessments")
            .select("assessment_type, scores, total_score, timing")
            .eq("timing", "post")
            .eq("user_id", user.id);
          if (instance?.id) {
            preQ = preQ.eq("program_instance_id", instance.id);
            postQ = postQ.eq("program_instance_id", instance.id);
          }
          const { data: allPre } = await preQ;
          const { data: allPost } = await postQ;
          setPreResults((allPre || []) as SavedResult[]);
          setPostResults((allPost || []) as SavedResult[]);
          setPhase("comparison");
        } else {
          setPhase("sequence-done");
        }
      }
    } else {
      setPhase("results");
    }

    toast.success(`${selectedTest.titleShort} ${timingTitle(timing)} gespeichert.`);
  };

  const nextInSequence = () => {
    const nextIdx = sequenceIndex + 1;
    setSequenceIndex(nextIdx);
    setSelectedTest(allAssessments[nextIdx]);
    setAnswers({});
    setCurrentItem(0);
    setSavedScores(null);
    setPhase("instructions");
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
                {allAssessments.map((test) => (
                  <div key={test.id} className="p-6 rounded-2xl bg-gradient-card border-glow">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-heading font-semibold mb-1">{test.titleShort}</h3>
                        <p className="text-xs text-muted-foreground">{test.title}</p>
                      </div>
                      <ClipboardCheck className="w-5 h-5 text-primary shrink-0" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">{test.description}</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {test.subscales.map((sub) => (
                        <span key={sub.id} className="px-2 py-1 rounded-md bg-secondary text-xs text-muted-foreground">{sub.name}</span>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mb-4 italic">{test.citation}</p>
                    <div className="space-y-2">
                      <button onClick={() => startTest(test, "pre")} className="flex w-full items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">Startmessung beginnen</button>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        Zwischen- und Abschlussmessung werden später automatisch im Dashboard freigegeben.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ─── Instructions ─── */}
          {phase === "instructions" && selectedTest && (
            <motion.div key="instructions" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-6">
                <ClipboardCheck className="w-8 h-8 text-primary" />
              </div>
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

          {/* ─── Results ─── */}
          {phase === "results" && selectedTest && savedScores && (
            <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-8">
              <div className="text-center mb-10">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }} className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-8 h-8 text-primary" />
                </motion.div>
                <h2 className="font-heading text-2xl font-bold mb-2">{selectedTest.titleShort} – {timingTitle(timing)}</h2>
                <p className="text-muted-foreground text-sm">Deine Werte auf den wissenschaftlichen Subskalen.</p>
              </div>
              <div className="space-y-4 mb-10">
                {selectedTest.subscales.map((sub) => {
                  const score = savedScores.subscaleScores[sub.id] || 0;
                  const [, max] = selectedTest.scaleRange;
                  const percentage = (score / max) * 100;
                  return (
                    <div key={sub.id} className="p-5 rounded-2xl bg-gradient-card border-glow">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-heading font-semibold text-sm">{sub.name}</h4>
                        <span className="text-primary font-heading font-bold">{score.toFixed(1)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{sub.description}</p>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ delay: 0.3, duration: 0.8 }} className="h-full bg-primary rounded-full" />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3 justify-center">
                {isSequentialMode && sequenceIndex < allAssessments.length - 1 ? (
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={nextInSequence} className="flex items-center gap-2 px-8 py-3 rounded-xl bg-primary font-heading font-semibold text-primary-foreground hover:shadow-glow transition-all">
                    Nächste Messung ({sequenceIndex + 2}/{allAssessments.length}) <ArrowRight className="w-4 h-4" />
                  </motion.button>
                ) : !isSequentialMode ? (
                  <>
                    <button onClick={() => { setPhase("select"); setSelectedTest(null); setSavedScores(null); }} className="px-6 py-3 rounded-xl bg-secondary text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">Weitere Messungen</button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => navigate("/dashboard")} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary font-heading font-semibold text-primary-foreground hover:shadow-glow transition-all text-sm">
                      Zum Dashboard <ArrowRight className="w-4 h-4" />
                    </motion.button>
                  </>
                ) : null}
              </div>
            </motion.div>
          )}

          {/* ─── Sequence Done ─── */}
          {phase === "sequence-done" && (
            <motion.div key="sequence-done" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-16 text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }} className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-primary" />
              </motion.div>
              <h2 className="font-heading text-2xl font-bold mb-3">Startmessung abgeschlossen.</h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto mb-8 leading-relaxed">
                Dein Ausgangspunkt wurde dokumentiert. Nach 4 Wochen wirst du die gleichen Fragebögen erneut ausfüllen, um deine Entwicklung sichtbar zu machen.
              </p>
              <div className="flex flex-wrap gap-2 justify-center mb-8">
                {sequenceResults.map((r) => {
                  const test = allAssessments.find(t => t.id === r.assessment_type);
                  return (
                    <span key={r.assessment_type} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium">
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

          {/* ─── Start/End Comparison ─── */}
          {phase === "comparison" && (
            <motion.div key="comparison" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-8">
              <div className="text-center mb-10">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }} className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-8 h-8 text-primary" />
                </motion.div>
                <h2 className="font-heading text-2xl font-bold mb-2">Deine <span className="text-gradient">Entwicklung</span></h2>
                <p className="text-muted-foreground text-sm">Vergleich zwischen Start- und Abschlussmessung.</p>
              </div>

              {allAssessments.map((test) => {
                const pre = preResults.find(r => r.assessment_type === test.id);
                const post = postResults.find(r => r.assessment_type === test.id);
                if (!pre || !post) return null;
                const preScores = (pre.scores || {}) as Record<string, number>;
                const postScores = (post.scores || {}) as Record<string, number>;

                return (
                  <div key={test.id} className="mb-8 p-6 rounded-2xl bg-gradient-card border-glow">
                    <h3 className="font-heading font-semibold mb-1">{test.titleShort}</h3>
                    <p className="text-xs text-muted-foreground mb-5">{test.title}</p>

                    <div className="space-y-4">
                      {test.subscales.map((sub) => {
                        const preVal = preScores[sub.id] || 0;
                        const postVal = postScores[sub.id] || 0;
                        const diff = postVal - preVal;
                        const [, max] = test.scaleRange;
                        const isAnxietyScale = sub.id.includes("anxiety") || sub.id.includes("somatic");
                        const isImproved = isAnxietyScale ? diff < 0 : diff > 0;
                        const isDeclined = isAnxietyScale ? diff > 0 : diff < 0;

                        return (
                          <div key={sub.id}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">{sub.name}</span>
                              <div className="flex items-center gap-2">
                                {diff !== 0 && (
                                  <span className={`flex items-center gap-1 text-xs font-medium ${isImproved ? "text-primary" : isDeclined ? "text-destructive" : "text-muted-foreground"}`}>
                                    {isImproved ? <TrendingUp className="w-3 h-3" /> : isDeclined ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                                    {diff > 0 ? "+" : ""}{diff.toFixed(1)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground w-8">Start</span>
                                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                                  <motion.div initial={{ width: 0 }} animate={{ width: `${(preVal / max) * 100}%` }} transition={{ delay: 0.3 }} className="h-full bg-muted-foreground/40 rounded-full" />
                                </div>
                                <span className="text-xs text-muted-foreground w-8 text-right">{preVal.toFixed(1)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-primary w-8">Ende</span>
                                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                                  <motion.div initial={{ width: 0 }} animate={{ width: `${(postVal / max) * 100}%` }} transition={{ delay: 0.5 }} className={`h-full rounded-full ${isImproved ? "bg-primary" : isDeclined ? "bg-destructive" : "bg-muted-foreground"}`} />
                                </div>
                                <span className="text-xs font-medium w-8 text-right">{postVal.toFixed(1)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

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
