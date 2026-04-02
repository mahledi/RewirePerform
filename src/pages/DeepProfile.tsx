import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Microscope, Loader2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { questions, deepProfileQuestionIds } from "@/data/questionnaireData";
import QuestionCard from "@/components/questionnaire/QuestionCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const SESSION_KEY = "mindgame_session_id";

const DeepProfile = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const timing = searchParams.get("timing") === "retest" ? "retest" : "baseline";
  const { user } = useAuth();

  const deepQuestions = useMemo(
    () => questions.filter((q) => deepProfileQuestionIds.includes(q.id)),
    []
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[] | number>>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const currentQuestion = deepQuestions[currentIndex];
  const answer = currentQuestion ? answers[currentQuestion.id] : undefined;

  const canProceed = () => {
    if (!answer) return false;
    if (answer === "") return false;
    if (Array.isArray(answer) && answer.length === 0) return false;
    return true;
  };

  const sessionId = useMemo(() => {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("deep_profile_assessments").insert({
      user_id: user?.id ?? null,
      session_id: sessionId,
      timing,
      answers: answers as any,
    });

    if (error) {
      console.error("Save error:", error);
      toast.error("Speichern fehlgeschlagen. Bitte versuche es erneut.");
      setSaving(false);
      return;
    }

    toast.success(timing === "baseline" ? "Baseline-Profil gespeichert!" : "Re-Test abgeschlossen!");
    setSaving(false);
    setDone(true);
  };

  const goNext = () => {
    if (currentIndex >= deepQuestions.length - 1) {
      handleSave();
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  const goBack = () => {
    if (currentIndex === 0) {
      navigate(-1);
    } else {
      setCurrentIndex((i) => i - 1);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }} className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-primary" />
          </motion.div>
          <h2 className="font-heading text-2xl font-bold mb-2">
            {timing === "baseline" ? "Baseline gespeichert" : "Re-Test abgeschlossen!"}
          </h2>
          <p className="text-muted-foreground mb-8">
            {timing === "baseline"
              ? "Dein Deep-Dive-Profil wurde erfasst. Es dient als Ausgangspunkt für deine Transformation."
              : "Deine Antworten wurden gespeichert. Schau dir jetzt deinen Fortschritt an!"}
          </p>
          <button
            onClick={() => navigate(timing === "retest" ? "/progress" : "/dashboard")}
            className="px-8 py-3 rounded-xl bg-primary font-heading font-semibold text-primary-foreground hover:shadow-glow transition-all"
          >
            {timing === "retest" ? "Fortschritt ansehen" : "Zum Dashboard"}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Microscope className="w-5 h-5 text-primary" />
            <span className="font-heading font-bold text-sm">Deep Profiling</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground px-2 py-1 rounded-md bg-secondary">
              {timing === "baseline" ? "Baseline" : "Re-Test"}
            </span>
            <span className="text-xs text-muted-foreground">
              {currentIndex + 1} / {deepQuestions.length}
            </span>
          </div>
        </div>
        <div className="max-w-2xl mx-auto mt-3">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              animate={{ width: `${((currentIndex + 1) / deepQuestions.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-2xl w-full">
          <AnimatePresence mode="wait">
            {currentQuestion && (
              <QuestionCard
                key={currentQuestion.id}
                question={currentQuestion}
                answer={answers[currentQuestion.id]}
                onAnswer={(val) => setAnswers((prev) => ({ ...prev, [currentQuestion.id]: val }))}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="sticky bottom-0 bg-background/80 backdrop-blur-xl border-t border-border/50 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button onClick={goBack} className="flex items-center gap-2 px-5 py-3 rounded-xl text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Zurück
          </button>
          <div className="flex gap-1.5">
            {deepQuestions.map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === currentIndex ? "bg-primary" : i < currentIndex ? "bg-primary/40" : "bg-muted"}`} />
            ))}
          </div>
          <motion.button
            whileHover={canProceed() ? { scale: 1.02 } : {}}
            whileTap={canProceed() ? { scale: 0.98 } : {}}
            onClick={goNext}
            disabled={!canProceed() || saving}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-heading font-semibold transition-all ${
              canProceed() ? "bg-primary text-primary-foreground hover:shadow-glow" : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : currentIndex >= deepQuestions.length - 1 ? (
              <>Abschließen <Check className="w-4 h-4" /></>
            ) : (
              <>Weiter <ArrowRight className="w-4 h-4" /></>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default DeepProfile;
