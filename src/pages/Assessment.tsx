import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, ArrowRight, ArrowLeft, Check, ClipboardCheck, BarChart3, Loader2 } from "lucide-react";
import { allAssessments, AssessmentInstrument, calculateScores } from "@/data/validatedAssessments";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Phase = "select" | "instructions" | "items" | "results";

const Assessment = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>("select");
  const [selectedTest, setSelectedTest] = useState<AssessmentInstrument | null>(null);
  const [timing, setTiming] = useState<"pre" | "post">("pre");
  const [currentItem, setCurrentItem] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [savedScores, setSavedScores] = useState<{ subscaleScores: Record<string, number>; totalScore: number } | null>(null);

  const startTest = (test: AssessmentInstrument, t: "pre" | "post") => {
    setSelectedTest(test);
    setTiming(t);
    setAnswers({});
    setCurrentItem(0);
    setPhase("instructions");
  };

  const answerItem = (itemId: string, value: number) => {
    const newAnswers = { ...answers, [itemId]: value };
    setAnswers(newAnswers);

    // Auto-advance after short delay
    if (selectedTest && currentItem < selectedTest.items.length - 1) {
      setTimeout(() => setCurrentItem((prev) => prev + 1), 300);
    }
  };

  const finishTest = async () => {
    if (!selectedTest) return;
    setSaving(true);

    const scores = calculateScores(selectedTest, answers);
    setSavedScores(scores);

    const sessionId = localStorage.getItem("mindgame_session_id") || crypto.randomUUID();

    await supabase.from("assessments").insert({
      user_id: user?.id || null,
      session_id: sessionId,
      assessment_type: selectedTest.id,
      timing,
      answers: answers as any,
      scores: scores.subscaleScores as any,
      total_score: scores.totalScore,
    });

    setSaving(false);
    setPhase("results");
    toast.success(`${selectedTest.titleShort} ${timing === "pre" ? "Pre" : "Post"}-Test gespeichert!`);
  };

  const allAnswered = selectedTest ? selectedTest.items.every((item) => answers[item.id] != null) : false;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/dashboard")}>
            <Brain className="w-5 h-5 text-primary" />
            <span className="font-heading font-bold">MindGame</span>
          </div>
          <span className="text-xs text-muted-foreground font-heading">
            {phase === "select" ? "Wissenschaftliche Tests" : selectedTest?.titleShort}
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {/* ─── Test Selection ─── */}
          {phase === "select" && (
            <motion.div key="select" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="mb-8">
                <h1 className="font-heading text-2xl md:text-3xl font-bold mb-3">
                  Validierte <span className="text-gradient">Assessments</span>
                </h1>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Diese wissenschaftlich validierten Fragebögen messen deinen mentalen Zustand objektiv.
                  Fülle sie zu Beginn (Pre) und am Ende (Post) deines Programms aus, um deine Entwicklung zu dokumentieren.
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
                        <span key={sub.id} className="px-2 py-1 rounded-md bg-secondary text-xs text-muted-foreground">
                          {sub.name}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mb-4 italic">{test.citation}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startTest(test, "pre")}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
                      >
                        Pre-Test starten
                      </button>
                      <button
                        onClick={() => startTest(test, "post")}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-secondary text-muted-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
                      >
                        Post-Test starten
                      </button>
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
              <p className="text-xs text-primary font-medium mb-4">{timing === "pre" ? "PRE-TEST" : "POST-TEST"} · {selectedTest.items.length} Items</p>
              <p className="text-muted-foreground text-sm max-w-md mx-auto mb-8 leading-relaxed">
                {selectedTest.instructions}
              </p>
              <div className="flex items-center justify-center gap-3 mb-8">
                {selectedTest.scaleLabels.map((label, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <span className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center text-xs font-medium">{i + selectedTest.scaleRange[0]}</span>
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setPhase("select")} className="px-6 py-3 rounded-xl text-muted-foreground hover:text-foreground transition-colors">
                  Zurück
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setPhase("items")}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl bg-primary font-heading font-semibold text-primary-foreground hover:shadow-glow transition-all"
                >
                  Test starten <ArrowRight className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ─── Items ─── */}
          {phase === "items" && selectedTest && (
            <motion.div key="items" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Progress bar */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">{currentItem + 1} / {selectedTest.items.length}</span>
                  <span className="text-xs text-primary font-medium">{selectedTest.titleShort} · {timing === "pre" ? "Pre" : "Post"}</span>
                </div>
                <div className="h-1 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    animate={{ width: `${((currentItem + 1) / selectedTest.items.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Current Item */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentItem}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  className="mb-8"
                >
                  <p className="font-heading text-lg font-semibold mb-6 leading-relaxed">
                    {selectedTest.items[currentItem].text}
                  </p>

                  <div className="space-y-2">
                    {selectedTest.scaleLabels.map((label, i) => {
                      const value = i + selectedTest.scaleRange[0];
                      const isSelected = answers[selectedTest.items[currentItem].id] === value;
                      return (
                        <button
                          key={value}
                          onClick={() => answerItem(selectedTest.items[currentItem].id, value)}
                          className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all text-left ${
                            isSelected
                              ? "bg-primary/10 ring-1 ring-primary/30 text-primary"
                              : "bg-gradient-card border-glow hover:bg-secondary/50"
                          }`}
                        >
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium shrink-0 ${
                            isSelected ? "bg-primary text-primary-foreground" : "bg-secondary"
                          }`}>
                            {value}
                          </span>
                          <span className="text-sm">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => currentItem > 0 ? setCurrentItem(currentItem - 1) : setPhase("instructions")}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Zurück
                </button>

                {currentItem === selectedTest.items.length - 1 && allAnswered && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={finishTest}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary font-heading font-semibold text-primary-foreground hover:shadow-glow transition-all"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Test abschließen
                  </motion.button>
                )}

                {currentItem < selectedTest.items.length - 1 && (
                  <button
                    onClick={() => setCurrentItem(currentItem + 1)}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl text-muted-foreground hover:text-foreground transition-colors"
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
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4"
                >
                  <BarChart3 className="w-8 h-8 text-primary" />
                </motion.div>
                <h2 className="font-heading text-2xl font-bold mb-2">
                  {selectedTest.titleShort} – {timing === "pre" ? "Pre" : "Post"}-Ergebnis
                </h2>
                <p className="text-muted-foreground text-sm">Deine Werte auf den wissenschaftlichen Subskalen.</p>
              </div>

              {/* Subscale Scores */}
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
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ delay: 0.3, duration: 0.8 }}
                          className="h-full bg-primary rounded-full"
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-[10px] text-muted-foreground">{selectedTest.scaleRange[0]}</span>
                        <span className="text-[10px] text-muted-foreground">{max}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-muted-foreground text-center mb-6 italic">
                {selectedTest.citation}
              </p>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => { setPhase("select"); setSelectedTest(null); setSavedScores(null); }}
                  className="px-6 py-3 rounded-xl bg-secondary text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
                >
                  Weitere Tests
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate("/dashboard")}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary font-heading font-semibold text-primary-foreground hover:shadow-glow transition-all text-sm"
                >
                  Zum Dashboard <ArrowRight className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Assessment;
