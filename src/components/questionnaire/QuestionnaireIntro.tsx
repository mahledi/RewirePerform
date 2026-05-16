import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Clock, Brain, Shield, Sparkles, FastForward, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { buildQASyntheticAnswers } from "@/lib/qaSyntheticAnswers";
import { buildDeterministicQuestionnaireAnalysis } from "@/lib/deterministicQuestionnaireAnalysis";
import { toast } from "sonner";

interface QuestionnaireIntroProps {
  onStart: () => void;
}

const QuestionnaireIntro = ({ onStart }: QuestionnaireIntroProps) => {
  const navigate = useNavigate();
  const [isTestUser, setIsTestUser] = useState(false);
  const [skipping, setSkipping] = useState(false);

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
        .update({ sport: answers["sport-01"] as string, team: answers["sport-02"] as string })
        .eq("id", user.id);

      await supabase
        .from("questionnaire_responses")
        .delete()
        .eq("user_id", user.id);

      const { error: insErr } = await supabase
        .from("questionnaire_responses")
        .insert({
          user_id: user.id,
          session_id: user.id,
          answers: answers as any,
          analysis: analysis as any,
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
              <span className="text-sm font-medium text-primary">Deep Analysis</span>
            </div>
          </div>

          <h1 className="font-heading text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Bevor wir beginnen,
            <br />
            <span className="text-gradient">ein paar Worte.</span>
          </h1>

          <p className="text-lg text-muted-foreground leading-relaxed mb-10">
            Was jetzt kommt, ist kein gewöhnlicher Fragebogen. Es sind Fragen, die dir 
            vermutlich noch niemand gestellt hat. Sie gehen tief – absichtlich. Denn nur 
            wenn wir verstehen, wie du wirklich denkst, fühlst und handelst, können wir 
            ein Programm entwickeln, das wirklich zu dir passt.
          </p>

          {/* Preparation cards */}
          <div className="space-y-4 mb-12">
            <div className="p-5 rounded-xl bg-gradient-card border-glow flex items-start gap-4">
              <Clock className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h3 className="font-heading font-semibold mb-1">Nimm dir 30-45 Minuten Zeit</h3>
                <p className="text-sm text-muted-foreground">
                  Kein Multitasking. Kein Zeitdruck. Diese Antworten formen dein gesamtes Programm.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-gradient-card border-glow flex items-start gap-4">
              <Shield className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h3 className="font-heading font-semibold mb-1">Absolute Ehrlichkeit</h3>
                <p className="text-sm text-muted-foreground">
                  Es gibt keine richtigen Antworten. Nur ehrliche. Je tiefer du gehst, 
                  desto besser wird dein Programm.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-gradient-card border-glow flex items-start gap-4">
              <Sparkles className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h3 className="font-heading font-semibold mb-1">Einmalig & entscheidend</h3>
                <p className="text-sm text-muted-foreground">
                  Du machst das genau einmal. Danach läuft dein 56-Tage-System
                  mit persönlicher Einordnung aus deinen Antworten.
                </p>
              </div>
            </div>
          </div>

          {/* Category preview */}
          <div className="mb-12">
            <h3 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-widest mb-4">
              12 Bereiche · 78 Fragen
            </h3>
            <div className="flex flex-wrap gap-2">
              {[
                "🪞 Identität",
                "🔥 Resilienz",
                "🎯 Fokus",
                "🌊 Emotionen",
                "⚡ Antrieb",
                "🏆 Wettkampf",
                "🌙 Erholung",
                "🤝 Umfeld",
                "🧭 Philosophie",
                "🧠 Neurokognition",
                "✨ Inner Excellence",
                "🔬 Deep Profile",
              ].map((cat) => (
                <span
                  key={cat}
                  className="px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-sm"
                >
                  {cat}
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
