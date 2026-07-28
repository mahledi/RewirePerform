import { useCallback, useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Loader2, Sparkles, BarChart3, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { REWIRE_DEVELOPMENT_INDEX } from "@/content/questionnaireV2";
import { buildDeterministicProgressSummary } from "@/lib/deterministicProgressSummary";
import {
  AthleteAppHeader,
  AthleteBottomNavigation,
  athleteAppBackground,
  athleteAppViewport,
} from "@/components/app/AthleteAppChrome";

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
      <div className={athleteAppBackground}>
        <AthleteAppHeader />
        <main className={`${athleteAppViewport} flex min-h-[calc(100dvh-9rem)] items-center justify-center`}>
          <div className="max-w-md text-center">
            <BarChart3 className="mx-auto mb-6 h-12 w-12 text-white/35" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Entwicklung</p>
            <h2 className="mt-3 text-[30px] font-semibold leading-tight tracking-[-0.04em]">Noch kein Baseline-Profil</h2>
            <p className="mt-4 text-sm leading-6 text-white/55">Erstelle zuerst dein Deep-Dive Baseline-Profil, um später deinen Fortschritt zu sehen.</p>
            <button onClick={() => navigate("/deep-profile?timing=baseline")} className="mt-8 min-h-12 rounded-2xl bg-primary px-8 py-3 font-semibold text-primary-foreground hover:shadow-glow">
              Baseline erstellen
            </button>
          </div>
        </main>
        <AthleteBottomNavigation active="progress" />
      </div>
    );
  }

  return (
    <div className={athleteAppBackground}>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_-8%,rgba(46,173,137,0.09),transparent_34%)]" />
      <AthleteAppHeader />

      <main className={athleteAppViewport}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Deine Entwicklung</p>
          <h1 className="mt-3 text-[32px] font-semibold leading-none tracking-[-0.045em]">
            Fortschritt.
          </h1>
          <p className="mt-4 text-sm leading-6 text-white/58">
            {retest ? "Baseline und Re-Test — deine Antworten im Vergleich." : "Dein Baseline-Profil. Der Re-Test wird nach Abschluss des Programms freigeschaltet."}
          </p>
        </motion.div>

        {retest && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 rounded-[22px] border border-white/[0.065] bg-white/[0.025] p-5">
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

        <div className="mt-8 space-y-4">
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
                className="rounded-[22px] border border-white/[0.065] bg-white/[0.025] p-5"
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
      </main>
      <AthleteBottomNavigation active="progress" />
    </div>
  );
};

export default Progress;
