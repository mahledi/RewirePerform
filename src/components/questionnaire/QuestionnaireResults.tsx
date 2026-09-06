import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { getSportAnswerText } from "@/data/questionnaireData";
import { supabase } from "@/integrations/supabase/client";
import { buildDeterministicQuestionnaireAnalysis } from "@/lib/deterministicQuestionnaireAnalysis";
import {
  ONBOARDING_V2_INSTRUMENT_ID,
  ONBOARDING_V2_QUESTIONS,
  ONBOARDING_V2_VERSION,
} from "@/content/questionnaireV2";
import { countCanonicalQuestionnaireAnswers } from "@/lib/questionnaireCustomAnswers";
import { captureAppError } from "@/lib/monitoring";
import { clearLocalDraft } from "@/lib/localDrafts";
import type { Json } from "@/integrations/supabase/types";
import { buildStructuredSportProfile } from "@/lib/personalization/sportTaxonomy";
import QuestionnaireNotificationOnboarding from "@/components/questionnaire/QuestionnaireNotificationOnboarding";

interface QuestionnaireResultsProps {
  answers: Record<string, string | string[] | number>;
  draftStorageKey?: string;
}

interface Analysis {
  summary: string;
  strengths: { title: string; description: string; science: string }[];
  development_areas: {
    title: string;
    description: string;
    priority: string;
    science: string;
  }[];
  patterns: { title: string; description: string }[];
  recommendations: {
    title: string;
    description: string;
    duration: string;
    frequency: string;
  }[];
  training_day_tasks: string[];
  rest_day_tasks: string[];
  score_visibility?: "internal_only";
  measurement_boundary?: string;
  scores?: Record<string, unknown>;
}

const LOADING_STEPS = [
  "Antworten werden gesichert...",
  "Dein Startprofil wird intern erstellt...",
  "Programmstatus wird aktualisiert...",
];

const QuestionnaireResults = ({
  answers,
  draftStorageKey = `questionnaire:${ONBOARDING_V2_INSTRUMENT_ID}`,
}: QuestionnaireResultsProps) => {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [retryTick, setRetryTick] = useState(0);
  const [saveCompleted, setSaveCompleted] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
    }, 800);

    const saveQuestionnaire = async () => {
      setError(null);
      setIsSaving(true);
      setSaveCompleted(false);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id || null;

        if (!userId) {
          setError("Bitte melde dich an.");
          setIsSaving(false);
          return;
        }

        const { getOrCreateActiveInstance } = await import("@/lib/programInstance");
        const instance = await getOrCreateActiveInstance(userId);
        if (!instance?.id) throw new Error("active_program_instance_required");

        const sportAnswer = getSportAnswerText(answers["sport-01"]);
        const positionAnswer = answers["sport-02"] as string || null;
        const levelAnswer = answers["sport-03"] as string || null;
        if (sportAnswer) {
          const { error: profileError } = await supabase
            .from("profiles")
            .update({
              sport: sportAnswer,
              position: positionAnswer,
              ...buildStructuredSportProfile(sportAnswer, levelAnswer),
            })
            .eq("id", userId);
          if (profileError) throw profileError;
        }

        const analysisResult = buildDeterministicQuestionnaireAnalysis(answers, {
          sport: sportAnswer,
          position: positionAnswer,
          level: levelAnswer,
        }) as unknown as Analysis;
        const analysisJson = analysisResult as unknown as Json;
        const answersJson = answers as unknown as Json;
        const scoresJson = (analysisResult.scores ?? {}) as Json;

        const { data: existingComplete } = await supabase
          .from("questionnaire_responses")
          .select("id")
          .eq("user_id", user.id)
          .eq("program_instance_id", instance.id)
          .eq("is_complete", true)
          .eq("instrument_id", ONBOARDING_V2_INSTRUMENT_ID)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingComplete?.id) {
          const { error: updErr } = await supabase
            .from("questionnaire_responses")
            .update({
              answers: answersJson,
              analysis: analysisJson,
              scores: scoresJson,
              instrument_id: ONBOARDING_V2_INSTRUMENT_ID,
              questionnaire_version: ONBOARDING_V2_VERSION,
              timing: "pre",
              program_instance_id: instance.id,
              is_complete: true,
            })
            .eq("id", existingComplete.id);
          if (updErr) throw updErr;
        } else {
          const { error: insertError } = await supabase
            .from("questionnaire_responses")
            .insert({
              session_id: user.id,
              user_id: user.id,
              answers: answersJson,
              analysis: analysisJson,
              scores: scoresJson,
              instrument_id: ONBOARDING_V2_INSTRUMENT_ID,
              questionnaire_version: ONBOARDING_V2_VERSION,
              timing: "pre",
              program_instance_id: instance.id,
              is_complete: true,
              last_category_index: 9999,
            });
          if (insertError) throw insertError;
        }

        clearLocalDraft(draftStorageKey);
        clearLocalDraft(`questionnaire:${ONBOARDING_V2_INSTRUMENT_ID}`);
        await new Promise((r) => setTimeout(r, 300));
        setSaveCompleted(true);
      } catch (err) {
        console.error("Questionnaire save error:", err);
        void captureAppError({
          eventName: "onboarding_completed",
          error: err,
          role: "athlete",
          route: "/questionnaire",
          metadata: {
            instrument_id: ONBOARDING_V2_INSTRUMENT_ID,
            questionnaire_version: ONBOARDING_V2_VERSION,
            answer_count: countCanonicalQuestionnaireAnswers(
              answers,
              new Set(ONBOARDING_V2_QUESTIONS.map((question) => question.id)),
            ),
          },
        });
        setError(
          err instanceof Error
            ? err.message
            : "Der Fragebogen konnte gerade nicht gespeichert werden."
        );
      } finally {
        setIsSaving(false);
      }
    };

    saveQuestionnaire();
    return () => clearInterval(interval);
  }, [answers, draftStorageKey, navigate, retryTick]);

  const answeredCount = countCanonicalQuestionnaireAnswers(
    answers,
    new Set(ONBOARDING_V2_QUESTIONS.map((question) => question.id)),
  );

  if (saveCompleted) {
    return (
      <QuestionnaireNotificationOnboarding
        onContinue={() => navigate("/dashboard", { replace: true })}
      />
    );
  }

  if (isSaving) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center max-w-md"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="mx-auto mb-8"
          >
            <Loader2 className="w-12 h-12 text-primary" />
          </motion.div>
          <h2 className="font-heading text-2xl font-bold mb-3">
            Fragebogen wird gespeichert...
          </h2>
          <motion.p
            key={loadingStep}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-muted-foreground"
          >
            {LOADING_STEPS[loadingStep]}
          </motion.p>
          <p className="text-xs text-muted-foreground mt-4">
            {answeredCount} Antworten werden sicher gespeichert
          </p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center max-w-md"
        >
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-6" />
          <h2 className="font-heading text-2xl font-bold mb-3">
            Speichern fehlgeschlagen
          </h2>
          <p className="text-muted-foreground mb-6">
            {error} Deine Antworten bleiben in diesem Schritt erhalten. Bitte versuche es noch einmal.
          </p>
          <button
            onClick={() => setRetryTick((value) => value + 1)}
            className="px-6 py-3 rounded-xl bg-primary font-heading font-semibold text-primary-foreground hover:shadow-glow transition-all"
          >
            Erneut versuchen
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-6" />
        <h2 className="font-heading text-2xl font-bold mb-3">
          Fragebogen gespeichert.
        </h2>
        <p className="text-sm text-muted-foreground">
          Du wirst direkt weitergeleitet.
        </p>
      </motion.div>
    </div>
  );
};

export default QuestionnaireResults;
