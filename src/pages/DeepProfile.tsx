import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import QuestionCard from "@/components/questionnaire/QuestionCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  DEVELOPMENT_INDEX_INSTRUMENT_ID,
  DEVELOPMENT_INDEX_VERSION,
  REWIRE_DEVELOPMENT_INDEX,
} from "@/content/questionnaireV2";
import type { Question } from "@/data/questionnaireData";
import { scoreDevelopmentIndex } from "@/lib/developmentIndexScoring";
import { captureAppError } from "@/lib/monitoring";
import { getOrCreateActiveInstance } from "@/lib/programInstance";
import type { Json } from "@/integrations/supabase/types";

type Timing = "pre" | "mid" | "post";

function resolveTiming(raw: string | null): Timing {
  if (raw === "mid") return "mid";
  if (raw === "post" || raw === "retest") return "post";
  return "pre";
}

function toQuestion(item: (typeof REWIRE_DEVELOPMENT_INDEX.items)[number]): Question {
  return {
    ...item,
    question: item.text,
    subtext: undefined,
    scaleLabels:
      item.lowLabel || item.highLabel
        ? [item.lowLabel ?? "niedrig", item.highLabel ?? "hoch"]
        : undefined,
    depth: item.includeInScore ? "core" : "deep",
    categoryIcon: "",
  };
}

const DeepProfile = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const timing = resolveTiming(searchParams.get("timing"));
  const { user, role, isTestUser } = useAuth();

  const deepQuestions = useMemo(
    () =>
      REWIRE_DEVELOPMENT_INDEX.items
        .filter((item) => !item.timing || item.timing.includes(timing as "mid" | "post"))
        .map(toQuestion),
    [timing]
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[] | number>>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const currentQuestion = deepQuestions[currentIndex];
  const answer = currentQuestion ? answers[currentQuestion.id] : undefined;

  const canProceed = () => {
    if (answer === undefined || answer === "") return false;
    if (Array.isArray(answer) && answer.length === 0) return false;
    return true;
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);

    const scores = scoreDevelopmentIndex(answers, timing);
    const instance = await getOrCreateActiveInstance(user.id);
    if (!instance?.id) {
      toast.error("Dein Programmlauf ist noch nicht vollständig eingerichtet.");
      setSaving(false);
      return;
    }

    const payload = {
      user_id: user.id,
      session_id: user.id,
      timing,
      answers: answers as unknown as Json,
      scores: scores as unknown as Json,
      instrument_id: DEVELOPMENT_INDEX_INSTRUMENT_ID,
      questionnaire_version: DEVELOPMENT_INDEX_VERSION,
      program_instance_id: instance.id,
    };

    const { data: existing, error: lookupError } = await supabase
      .from("deep_profile_assessments")
      .select("id")
      .eq("user_id", user.id)
      .eq("program_instance_id", instance.id)
      .eq("instrument_id", DEVELOPMENT_INDEX_INSTRUMENT_ID)
      .eq("timing", timing)
      .maybeSingle();
    const { error } = lookupError
      ? { error: lookupError }
      : existing
        ? await supabase.from("deep_profile_assessments").update(payload).eq("id", existing.id)
        : await supabase.from("deep_profile_assessments").insert(payload);

    if (error) {
      console.error("Save error:", error);
      void captureAppError({
        eventName: "deep_profile_saved",
        error,
        role,
        route: "/deep-profile",
        isTest: isTestUser,
        metadata: {
          timing,
          item_count: Object.keys(answers).length,
          has_program_instance: true,
        },
      });
      toast.error("Speichern fehlgeschlagen. Bitte versuche es erneut.");
      setSaving(false);
      return;
    }

    toast.success(timing === "pre" ? "Startmessung gespeichert." : "Abschlussmessung gespeichert.");
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
            {timing === "pre" ? "Startmessung gespeichert" : "Abschlussmessung gespeichert"}
          </h2>
          <p className="text-muted-foreground mb-8">
            Deine Antworten wurden gespeichert. Freitext bleibt privat; Coaches sehen nur geschützte Team-Aggregate ab ausreichender Gruppengröße.
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-8 py-3 rounded-xl bg-primary font-heading font-semibold text-primary-foreground hover:shadow-glow transition-all"
          >
            Zum Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <span className="font-heading font-bold text-sm">RewirePerform Deep-Dive</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground px-2 py-1 rounded-md bg-secondary">
              {timing === "pre" ? "Start" : timing === "mid" ? "Zwischen" : "Abschluss"}
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
          <p className="text-[11px] text-muted-foreground mt-8">
            {REWIRE_DEVELOPMENT_INDEX.disclaimer}
          </p>
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
