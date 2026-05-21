import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Brain,
  Loader2,
  ArrowRight,
  CheckCircle2,
  BarChart3,
  Target,
  Sparkles,
  AlertTriangle,
  Flame,
  TrendingUp,
  Lightbulb,
  Zap,
  Moon,
} from "lucide-react";
import { getOptionText } from "@/data/questionnaireData";
import { supabase } from "@/integrations/supabase/client";
import { buildDeterministicQuestionnaireAnalysis } from "@/lib/deterministicQuestionnaireAnalysis";
import {
  ONBOARDING_V2_INSTRUMENT_ID,
  ONBOARDING_V2_VERSION,
} from "@/content/questionnaireV2";
import { captureAppError } from "@/lib/monitoring";

interface QuestionnaireResultsProps {
  answers: Record<string, string | string[] | number>;
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
  mental_score: number;
  dominant_category: string;
  scores?: Record<string, unknown>;
}

const QuestionnaireResults = ({ answers }: QuestionnaireResultsProps) => {
  const navigate = useNavigate();
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);

  const loadingSteps = [
    "Antworten werden verarbeitet...",
    "Muster werden erkannt...",
    "Stärken werden identifiziert...",
    "Entwicklungsfelder werden analysiert...",
    "Dein Startprofil wird erstellt...",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
    }, 800);

    const analyze = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id || null;

        if (!userId) {
          setError("Bitte melde dich an.");
          setIsAnalyzing(false);
          return;
        }

        // Sync sport/position to profiles table
        const sportAnswer = answers["sport-01"] as string || null;
        const positionAnswer = answers["sport-02"] as string || null;
        const levelAnswer = answers["sport-03"] as string || null;
        if (sportAnswer) {
          await supabase
            .from("profiles")
            .update({ sport: getOptionText("sport-01", sportAnswer), team: positionAnswer })
            .eq("id", userId);
        }

        // Deterministic analysis — no AI, no edge function, no credits.
        const analysisResult = buildDeterministicQuestionnaireAnalysis(answers, {
          sport: sportAnswer,
          position: positionAnswer,
          level: levelAnswer,
        }) as unknown as Analysis;

        // Prefer updating the existing completed draft (avoids creating a
        // new is_complete=false row that the resume-flow would treat as a reset).
        const { data: existingComplete } = await supabase
          .from("questionnaire_responses")
          .select("id")
          .eq("user_id", user!.id)
          .eq("is_complete", true)
          .eq("instrument_id", ONBOARDING_V2_INSTRUMENT_ID)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingComplete?.id) {
          const { error: updErr } = await supabase
            .from("questionnaire_responses")
            .update({
              answers: answers as any,
              analysis: analysisResult as any,
              scores: (analysisResult as any).scores ?? {},
              instrument_id: ONBOARDING_V2_INSTRUMENT_ID,
              questionnaire_version: ONBOARDING_V2_VERSION,
              timing: "pre",
              is_complete: true,
            })
            .eq("id", existingComplete.id);
          if (updErr) throw updErr;
        } else {
          const { error: insertError } = await supabase
            .from("questionnaire_responses")
            .insert({
              session_id: user!.id,
              user_id: user!.id,
              answers: answers as any,
              analysis: analysisResult as any,
              scores: (analysisResult as any).scores ?? {},
              instrument_id: ONBOARDING_V2_INSTRUMENT_ID,
              questionnaire_version: ONBOARDING_V2_VERSION,
              timing: "pre",
              is_complete: true,
              last_category_index: 9999,
            });
          if (insertError) throw insertError;
        }

        // Preserve old questionnaire rows. Draft cleanup is intentionally not
        // destructive here; resume code only looks at V2 incomplete drafts.

        // Small artificial delay so the user can read the loader once.
        await new Promise((r) => setTimeout(r, 600));
        setAnalysis(analysisResult);
      } catch (err) {
        console.error("Analysis error:", err);
        void captureAppError({
          eventName: "onboarding_completed",
          error: err,
          role: "athlete",
          route: "/questionnaire",
          metadata: {
            instrument_id: ONBOARDING_V2_INSTRUMENT_ID,
            questionnaire_version: ONBOARDING_V2_VERSION,
            answer_count: Object.keys(answers).length,
          },
        });
        setError(
          err instanceof Error
            ? err.message
            : "Analyse konnte nicht durchgeführt werden."
        );
      } finally {
        setIsAnalyzing(false);
      }
    };

    analyze();
    return () => clearInterval(interval);
  }, [answers]);

  const answeredCount = Object.keys(answers).length;

  if (isAnalyzing) {
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
            Auswertung läuft...
          </h2>
          <motion.p
            key={loadingStep}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-muted-foreground"
          >
            {loadingSteps[loadingStep]}
          </motion.p>
          <p className="text-xs text-muted-foreground mt-4">
            {answeredCount} Antworten werden ausgewertet
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
            Analyse fehlgeschlagen
          </h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-xl bg-primary font-heading font-semibold text-primary-foreground hover:shadow-glow transition-all"
          >
            Erneut versuchen
          </button>
        </motion.div>
      </div>
    );
  }

  if (!analysis) return null;

  const priorityColor = (p: string) =>
    p === "high"
      ? "text-destructive"
      : p === "medium"
      ? "text-yellow-500"
      : "text-primary";

  const priorityLabel = (p: string) =>
    p === "high" ? "Hoch" : p === "medium" ? "Mittel" : "Niedrig";

  return (
    <div className="min-h-screen bg-background px-6 py-20">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="px-4 py-2 rounded-full bg-primary/10 border-glow flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">
                  Auswertung abgeschlossen
                </span>
              </div>
            </div>
            <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4">
              Dein
              <br />
              <span className="text-gradient">Startprofil.</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              {analysis.summary}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-3 max-w-md mx-auto">
              Deterministische Auswertung aus deinen Antworten. Kein Diagnosewert, sondern Orientierung für dein 56-Tage-System.
            </p>
          </div>

          <div className="flex justify-center mb-16">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="relative w-40 h-40 flex items-center justify-center"
            >
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="8"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(analysis.mental_score / 100) * 440} 440`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="text-center">
                <span className="text-4xl font-heading font-bold">
                  {analysis.mental_score}
                </span>
                <span className="block text-xs text-muted-foreground">
                  Mental Score
                </span>
              </div>
            </motion.div>
          </div>

          <div className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Flame className="w-5 h-5 text-primary" />
              <h3 className="font-heading text-xl font-semibold">
                Deine Stärken
              </h3>
            </div>
            <div className="space-y-4">
              {analysis.strengths.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * i }}
                  className="p-6 rounded-2xl bg-gradient-card border-glow"
                >
                  <h4 className="font-heading font-semibold mb-2">{s.title}</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    {s.description}
                  </p>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5">
                    <Lightbulb className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">{s.science}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h3 className="font-heading text-xl font-semibold">
                Entwicklungsfelder
              </h3>
            </div>
            <div className="space-y-4">
              {analysis.development_areas.map((d, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * i }}
                  className="p-6 rounded-2xl bg-gradient-card border-glow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-heading font-semibold">{d.title}</h4>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-md bg-secondary ${priorityColor(d.priority)}`}
                    >
                      Priorität: {priorityLabel(d.priority)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {d.description}
                  </p>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5">
                    <Lightbulb className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">{d.science}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Brain className="w-5 h-5 text-primary" />
              <h3 className="font-heading text-xl font-semibold">
                Erkannte Muster
              </h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {analysis.patterns.map((p, i) => (
                <div
                  key={i}
                  className="p-5 rounded-2xl bg-gradient-card border-glow"
                >
                  <h4 className="font-heading font-semibold mb-2 text-sm">
                    {p.title}
                  </h4>
                  <p className="text-xs text-muted-foreground">{p.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Target className="w-5 h-5 text-primary" />
              <h3 className="font-heading text-xl font-semibold">
                Dein 4-Wochen-Plan
              </h3>
            </div>
            <div className="space-y-4">
              {analysis.recommendations.map((r, i) => (
                <div
                  key={i}
                  className="p-6 rounded-2xl bg-gradient-card border-glow"
                >
                  <h4 className="font-heading font-semibold mb-2">{r.title}</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    {r.description}
                  </p>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>⏱ {r.duration}</span>
                    <span>🔄 {r.frequency}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-16">
            <div className="p-6 rounded-2xl bg-gradient-card border-glow">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-primary" />
                <h4 className="font-heading font-semibold">Trainingstag</h4>
              </div>
              <ul className="space-y-3">
                {analysis.training_day_tasks.map((t, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span className="text-sm text-muted-foreground">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-6 rounded-2xl bg-gradient-card border-glow">
              <div className="flex items-center gap-2 mb-4">
                <Moon className="w-5 h-5 text-primary" />
                <h4 className="font-heading font-semibold">Ruhetag</h4>
              </div>
              <ul className="space-y-3">
                {analysis.rest_day_tasks.map((t, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span className="text-sm text-muted-foreground">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="text-center">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                navigate("/dashboard");
              }}
              className="group inline-flex items-center gap-2 px-10 py-5 rounded-xl bg-primary font-heading font-semibold text-lg text-primary-foreground hover:shadow-glow transition-all"
            >
              Programm starten
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </motion.button>
            <p className="text-xs text-muted-foreground mt-4">
              Dein 56-Tage-System startet sofort.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default QuestionnaireResults;
