import { useCallback, useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, TrendingUp, Sparkles, BarChart3, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { REWIRE_DEVELOPMENT_INDEX } from "@/content/questionnaireV2";
import { buildDeterministicProgressSummary } from "@/lib/deterministicProgressSummary";

interface ProfileData {
  timing: string;
  answers: Record<string, string | string[] | number>;
  created_at: string;
}

const Progress = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [baseline, setBaseline] = useState<ProfileData | null>(null);
  const [retest, setRetest] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<string | null>(null);
  const [hasSummary, setHasSummary] = useState(false);

  const deepQuestions = useMemo(
    () =>
      REWIRE_DEVELOPMENT_INDEX.items
        .filter((item) => item.includeInScore)
        .map((item) => ({ id: item.id, question: item.text, type: item.type })),
    []
  );

  const loadProfiles = useCallback(async () => {
    if (!user?.id) return;
    const { getOrCreateActiveInstance } = await import("@/lib/programInstance");
    const instance = await getOrCreateActiveInstance(user.id);
    let query = supabase
      .from("deep_profile_assessments")
      .select("timing, answers, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    if (instance?.id) query = query.eq("program_instance_id", instance.id);
    const { data } = await query;

    if (data) {
      const b = data.find((d) => d.timing === "pre" || d.timing === "baseline");
      const r = data.find((d) => d.timing === "post" || d.timing === "retest");
      if (b) setBaseline({ ...b, answers: b.answers as unknown as ProfileData["answers"] });
      if (r) setRetest({ ...r, answers: r.answers as unknown as ProfileData["answers"] });
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void loadProfiles();
  }, [loadProfiles]);

  useEffect(() => {
    if (baseline && retest) {
      const result = buildDeterministicProgressSummary(
        baseline.answers,
        retest.answers,
        deepQuestions
      );
      setSummary(result.summary);
      setHasSummary(result.hasEnoughData);
    }
  }, [baseline, retest, deepQuestions]);

  const formatAnswer = (answer: string | string[] | number | undefined) => {
    if (answer === undefined) return "—";
    if (Array.isArray(answer)) return answer.join(", ");
    return String(answer);
  };

  const getScaleDiff = (baseVal: unknown, retestVal: unknown) => {
    const b = typeof baseVal === "number" ? baseVal : 0;
    const r = typeof retestVal === "number" ? retestVal : 0;
    const diff = r - b;
    if (diff > 0) return { text: `+${diff}`, color: "text-green-400" };
    if (diff < 0) return { text: `${diff}`, color: "text-red-400" };
    return { text: "±0", color: "text-muted-foreground" };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!baseline) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-6" />
          <h2 className="font-heading text-2xl font-bold mb-3">Noch kein Baseline-Profil</h2>
          <p className="text-muted-foreground mb-8">Erstelle zuerst dein Deep-Dive Baseline-Profil, um später deinen Fortschritt zu sehen.</p>
          <button onClick={() => navigate("/deep-profile?timing=baseline")} className="px-8 py-3 rounded-xl bg-primary font-heading font-semibold text-primary-foreground hover:shadow-glow transition-all">
            Baseline erstellen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Dashboard</span>
          </button>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-sm font-heading font-medium">Dein Fortschritt</span>
          </div>
          <div />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-heading text-2xl md:text-3xl font-bold mb-2">
            Dein Fortschritt <span className="text-gradient">(Deep Dive)</span>
          </h1>
          <p className="text-muted-foreground text-sm mb-8">
            {retest ? "Baseline vs. Re-Test – deine Entwicklung im Vergleich." : "Dein Baseline-Profil. Der Re-Test wird nach Abschluss des Programms freigeschaltet."}
          </p>
        </motion.div>

        {retest && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-2xl bg-gradient-card border-glow mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="font-heading font-semibold">Verlaufszusammenfassung</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {summary ?? "Noch nicht genug Daten für eine Verlaufszusammenfassung."}
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-3">
              Deterministische Auswertung aus deinen Antworten. Keine Diagnose.
            </p>
          </motion.div>
        )}

        <div className="space-y-6">
          {deepQuestions.map((q, i) => {
            const baseAnswer = baseline?.answers[q.id];
            const retestAnswer = retest?.answers[q.id];
            const isScale = q.type === "scale";
            const diff = isScale && retest ? getScaleDiff(baseAnswer, retestAnswer) : null;

            return (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-5 rounded-2xl bg-gradient-card border-glow"
              >
                <p className="text-sm font-medium mb-4">{q.question}</p>

                <div className={`grid ${retest ? "grid-cols-2 gap-4" : "grid-cols-1"}`}>
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-primary">Baseline</span>
                    <div className="p-3 rounded-xl bg-secondary/50">
                      {isScale ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary/60 rounded-full" style={{ width: `${((baseAnswer as number) || 0) * 10}%` }} />
                          </div>
                          <span className="text-sm font-mono font-bold">{baseAnswer ?? "—"}</span>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">{formatAnswer(baseAnswer)}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{baseline?.created_at ? new Date(baseline.created_at).toLocaleDateString("de-DE") : ""}</span>
                  </div>

                  {retest && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-primary">Re-Test</span>
                        {diff && <span className={`text-xs font-mono font-bold ${diff.color}`}>{diff.text}</span>}
                      </div>
                      <div className="p-3 rounded-xl bg-secondary/50">
                        {isScale ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${((retestAnswer as number) || 0) * 10}%` }} />
                            </div>
                            <span className="text-sm font-mono font-bold">{retestAnswer ?? "—"}</span>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">{formatAnswer(retestAnswer)}</p>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground">{retest?.created_at ? new Date(retest.created_at).toLocaleDateString("de-DE") : ""}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-8 p-4 rounded-xl bg-secondary/30 border border-border/50">
          <div className="flex items-start gap-3">
            <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Alle Antworten werden mit Zeitstempel gespeichert und können über die Datenbank exportiert werden – ideal für Sentiment-Analyse und Forschungszwecke.
            </p>
          </div>
        </motion.div>

        {!retest && (
          <div className="text-center mt-8">
            <p className="text-xs text-muted-foreground mb-4">Der Re-Test wird nach Ablauf deines 56-Tage-Programms freigeschaltet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Progress;
