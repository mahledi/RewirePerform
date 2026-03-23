import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Clock, Brain, Shield, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface QuestionnaireIntroProps {
  onStart: () => void;
}

const QuestionnaireIntro = ({ onStart }: QuestionnaireIntroProps) => {
  const navigate = useNavigate();
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
                  Du machst das genau einmal. Danach übernimmt die KI und personalisiert 
                  dein Programm auf Basis deiner Antworten – fortlaufend.
                </p>
              </div>
            </div>
          </div>

          {/* Category preview */}
          <div className="mb-12">
            <h3 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-widest mb-4">
              9 Bereiche · 42 Fragen
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
        </motion.div>
      </div>
    </div>
  );
};

export default QuestionnaireIntro;
