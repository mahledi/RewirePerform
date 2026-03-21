import { useState } from "react";
import { motion } from "framer-motion";
import { Brain, Loader2, ArrowRight, CheckCircle2, BarChart3, Target, Sparkles } from "lucide-react";
import { categories, questions } from "@/data/questionnaireData";

interface QuestionnaireResultsProps {
  answers: Record<string, string | string[] | number>;
}

const QuestionnaireResults = ({ answers }: QuestionnaireResultsProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(true);

  // Simulate analysis (will be replaced by real AI)
  useState(() => {
    const timer = setTimeout(() => setIsAnalyzing(false), 3500);
    return () => clearTimeout(timer);
  });

  const answeredCount = Object.keys(answers).length;
  const totalCount = questions.length;
  const completionRate = Math.round((answeredCount / totalCount) * 100);

  // Calculate category completion
  const categoryStats = categories.map((cat) => {
    const catQuestions = questions.filter((q) => q.category === cat.id);
    const catAnswered = catQuestions.filter((q) => answers[q.id] !== undefined).length;
    return {
      ...cat,
      answered: catAnswered,
      total: catQuestions.length,
      rate: Math.round((catAnswered / catQuestions.length) * 100),
    };
  });

  // Simple depth analysis based on text length and scale answers
  const textAnswers = Object.entries(answers).filter(
    ([id, val]) => typeof val === "string" && val.length > 0
  );
  const avgTextLength =
    textAnswers.length > 0
      ? Math.round(
          textAnswers.reduce((sum, [, val]) => sum + (val as string).length, 0) /
            textAnswers.length
        )
      : 0;

  const depthLabel =
    avgTextLength > 200
      ? "Sehr tiefgehend"
      : avgTextLength > 100
      ? "Reflektiert"
      : avgTextLength > 50
      ? "Solide"
      : "Oberflächlich – geh tiefer!";

  if (isAnalyzing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="mx-auto mb-8"
          >
            <Loader2 className="w-12 h-12 text-primary" />
          </motion.div>
          <h2 className="font-heading text-2xl font-bold mb-3">
            Analysiere deine Antworten...
          </h2>
          <p className="text-muted-foreground">
            Die KI wertet {answeredCount} Antworten aus und erstellt dein Profil.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-6 py-20">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Header */}
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="px-4 py-2 rounded-full bg-primary/10 border-glow flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">Analyse abgeschlossen</span>
              </div>
            </div>
            <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4">
              Dein mentales
              <br />
              <span className="text-gradient">Profil.</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Basierend auf {answeredCount} Antworten in {categories.length} Bereichen.
            </p>
          </div>

          {/* Stats overview */}
          <div className="grid grid-cols-3 gap-4 mb-12">
            <div className="p-6 rounded-2xl bg-gradient-card border-glow text-center">
              <BarChart3 className="w-5 h-5 text-primary mx-auto mb-2" />
              <span className="block text-2xl font-heading font-bold">{completionRate}%</span>
              <span className="text-xs text-muted-foreground">Vollständigkeit</span>
            </div>
            <div className="p-6 rounded-2xl bg-gradient-card border-glow text-center">
              <Target className="w-5 h-5 text-primary mx-auto mb-2" />
              <span className="block text-2xl font-heading font-bold">{avgTextLength}</span>
              <span className="text-xs text-muted-foreground">Ø Zeichenlänge</span>
            </div>
            <div className="p-6 rounded-2xl bg-gradient-card border-glow text-center">
              <Sparkles className="w-5 h-5 text-primary mx-auto mb-2" />
              <span className="block text-2xl font-heading font-bold text-sm leading-8">{depthLabel}</span>
              <span className="text-xs text-muted-foreground">Reflexionstiefe</span>
            </div>
          </div>

          {/* Category breakdown */}
          <div className="mb-12">
            <h3 className="font-heading font-semibold text-lg mb-6">Bereichs-Übersicht</h3>
            <div className="space-y-3">
              {categoryStats.map((cat) => (
                <div key={cat.id} className="p-4 rounded-xl bg-gradient-card border-glow">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span className="text-sm font-medium">{cat.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {cat.answered}/{cat.total}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${cat.rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI placeholder */}
          <div className="p-8 rounded-2xl bg-gradient-card border-glow shadow-card mb-12">
            <div className="flex items-center gap-3 mb-4">
              <Brain className="w-6 h-6 text-primary" />
              <h3 className="font-heading text-xl font-semibold">KI-Auswertung</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Dein vollständiges mentales Profil wird von unserer KI erstellt. 
              Sie analysiert Muster in deinen Antworten, identifiziert Stärken und Entwicklungsfelder, 
              und erstellt ein personalisiertes Programm für die kommenden Wochen.
            </p>
            <div className="space-y-3">
              {[
                "Mentales Stärkeprofil mit detaillierter Analyse",
                "Identifizierte Entwicklungsfelder und Prioritäten",
                "Personalisierter Trainingsplan für mentale Performance",
                "Tägliche Aufgaben basierend auf deinem Profil",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="group inline-flex items-center gap-2 px-10 py-5 rounded-xl bg-primary font-heading font-semibold text-lg text-primary-foreground hover:shadow-glow transition-all"
            >
              Programm starten
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </motion.button>
            <p className="text-xs text-muted-foreground mt-4">
              Dein personalisiertes Programm beginnt sofort.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default QuestionnaireResults;
