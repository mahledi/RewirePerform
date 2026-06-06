import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Clock, Brain, Shield, Sparkles, FastForward, Loader2, Save, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { buildQASyntheticAnswers } from "@/lib/qaSyntheticAnswers";
import { buildDeterministicQuestionnaireAnalysis } from "@/lib/deterministicQuestionnaireAnalysis";
import { toast } from "sonner";
import { getOptionText } from "@/data/questionnaireData";
import {
  ONBOARDING_V2_CATEGORIES,
  ONBOARDING_V2_INSTRUMENT_ID,
  ONBOARDING_V2_QUESTIONS,
  ONBOARDING_V2_VERSION,
} from "@/content/questionnaireV2";
import type { Json } from "@/integrations/supabase/types";

interface QuestionnaireIntroProps {
  onStart: () => void;
}

const QuestionnaireIntro = ({ onStart }: QuestionnaireIntroProps) => {
  const navigate = useNavigate();
  const [isTestUser, setIsTestUser] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [showDataDetails, setShowDataDetails] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("is_test_user")
        .eq("id", user.id)
        .maybeSingle();
      setIsTestUser(!!data?.is_test_user);
    })();
  }, []);

  const handleQASkip = async () => {
    setSkipping(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const answers = buildQASyntheticAnswers();
      const analysis = buildDeterministicQuestionnaireAnalysis(answers, {
        sport: answers["sport-01"] as string,
        position: answers["sport-02"] as string,
        level: answers["sport-03"] as string,
      });

      await supabase
        .from("profiles")
        .update({
          sport: getOptionText("sport-01", answers["sport-01"] as string),
          team: answers["sport-02"] as string,
        })
        .eq("id", user.id);

      const { error: insErr } = await supabase
        .from("questionnaire_responses")
        .insert({
          user_id: user.id,
          session_id: user.id,
          answers: answers as Json,
          analysis: analysis as unknown as Json,
          scores: analysis.scores as unknown as Json,
          instrument_id: ONBOARDING_V2_INSTRUMENT_ID,
          questionnaire_version: ONBOARDING_V2_VERSION,
          timing: "pre",
          is_complete: true,
          last_category_index: 9999,
        });
      if (insErr) throw insErr;

      toast.success("QA: Fragebogen übersprungen.");
      navigate("/dashboard");
    } catch (err) {
      console.error("QA skip error:", err);
      toast.error("Skip fehlgeschlagen. Siehe Konsole.");
      setSkipping(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Back button */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Zurück</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-2xl w-full"
        >
          {/* Badge */}
          <div className="flex items-center gap-2 mb-8">
            <div className="px-4 py-2 rounded-full bg-primary/10 border-glow flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Startprofil</span>
            </div>
          </div>

          <h1 className="font-heading text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Dein Startprofil.
            <br />
            <span className="text-gradient">Klar, ehrlich, nützlich.</span>
          </h1>

          <p className="text-lg text-muted-foreground leading-relaxed mb-10">
            Wir erfassen, wie du aktuell mit Druck, Fehlern, Fokus, Motivation und Erholung arbeitest.
            Das ist kein Test und keine Diagnose, sondern dein Ausgangspunkt für das 56-Tage-System.
          </p>

          {/* Preparation cards */}
          <div className="space-y-4 mb-12">
            <div className="p-5 rounded-xl bg-gradient-card border-glow flex items-start gap-4">
              <Save className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h3 className="font-heading font-semibold mb-1">Jederzeit speichern und pausieren</h3>
                <p className="text-sm text-muted-foreground">
                  Deine Antworten werden zwischengespeichert. Wenn etwas dazwischenkommt, kannst du später weitermachen.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-gradient-card border-glow flex items-start gap-4">
              <Clock className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h3 className="font-heading font-semibold mb-1">Nimm dir 20-30 Minuten Zeit</h3>
                <p className="text-sm text-muted-foreground">
                  Kein Multitasking. Kein Druck. Gute Antworten sind ehrlich, nicht perfekt.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-gradient-card border-glow flex items-start gap-4">
              <Shield className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h3 className="font-heading font-semibold mb-1">Warum wir dich fragen</h3>
                <p className="text-sm text-muted-foreground">
                  Deine Angaben helfen dem System, dein Startprofil, deine Fortschrittslogik und passende Tagesimpulse besser einzuordnen.
                </p>
                <button
                  type="button"
                  onClick={() => setShowDataDetails((open) => !open)}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary"
                >
                  Mehr erfahren
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showDataDetails ? "rotate-180" : ""}`} />
                </button>
                {showDataDetails && (
                  <div className="mt-3 space-y-2 rounded-xl border border-border/50 bg-background/40 p-3 text-xs leading-relaxed text-muted-foreground">
                    <p>
                      Relevant sind vor allem Fragebogenantworten, Check-ins, Journaleinträge, Trainingszeiten und Programmfortschritt.
                      Daraus entstehen Hinweise für Aufgaben, Rückblick, Erinnerungen und Fortschrittsauswertung.
                    </p>
                    <p>
                      Sensible freie Texte werden mit besonderer Zurückhaltung behandelt: Sie sind für deine Reflexion gedacht und werden Coaches nicht als Rohinhalt angezeigt.
                    </p>
                    <p>
                      Es geht nicht darum, dich zu bewerten. Die Daten sollen nachvollziehbar machen, wo du startest, wie du arbeitest und welche nächsten Schritte sinnvoll sind.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 rounded-xl bg-gradient-card border-glow flex items-start gap-4">
              <Sparkles className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h3 className="font-heading font-semibold mb-1">Messbarer Startpunkt</h3>
                <p className="text-sm text-muted-foreground">
                  Später vergleichen wir Entwicklung über sichere, aggregierbare Werte und separate Retests.
                </p>
              </div>
            </div>
          </div>

          {/* Category preview */}
          <div className="mb-12">
            <h3 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-widest mb-4">
              {ONBOARDING_V2_CATEGORIES.length} Bereiche · {ONBOARDING_V2_QUESTIONS.length} Fragen
            </h3>
            <div className="flex flex-wrap gap-2">
              {ONBOARDING_V2_CATEGORIES.map((cat) => (
                <span
                  key={cat.id}
                  className="px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-sm"
                >
                  {cat.icon} {cat.title}
                </span>
              ))}
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onStart}
            className="group w-full flex items-center justify-center gap-3 px-8 py-5 rounded-xl bg-primary font-heading font-semibold text-lg text-primary-foreground transition-all hover:shadow-glow"
          >
            Ich bin bereit
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </motion.button>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Deine Antworten sind vertraulich und werden ausschließlich für dein Programm verwendet.
          </p>

          {isTestUser && (
            <div className="mt-8 p-4 rounded-xl border border-dashed border-primary/40 bg-primary/5">
              <p className="text-xs text-muted-foreground mb-3 text-center">
                QA-Modus erkannt. Du kannst den Fragebogen mit neutralen Default-Antworten überspringen.
              </p>
              <button
                onClick={handleQASkip}
                disabled={skipping}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-all disabled:opacity-50"
              >
                {skipping ? <Loader2 className="w-4 h-4 animate-spin" /> : <FastForward className="w-4 h-4" />}
                {skipping ? "Wird vorbereitet..." : "Fragebogen überspringen (QA)"}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default QuestionnaireIntro;
