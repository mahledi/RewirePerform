import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { BookOpen, ChevronDown, Loader2, LockKeyhole } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AthleteScreenHeader } from "@/components/app/AthleteAppChrome";
import { getHistoricalJournalQuestion } from "@/lib/journalPresentation";

interface JournalEntry {
  id: string;
  date: string;
  day_number: number | null;
  journal_title: string | null;
  answers: Record<string, string> | null;
  gratitude: string | null;
  free_reflection: string | null;
  created_at: string;
}

const asAnswers = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, answer]) => typeof answer === "string" && answer.trim().length > 0)
      .map(([key, answer]) => [key, answer as string])
  );
};

const JournalHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      navigate("/auth");
      return;
    }
    void loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadEntries = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("daily_journals")
      .select("id,date,day_number,journal_title,answers,gratitude,free_reflection,created_at")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(120);

    if (!error) {
      const journalEntries = (data ?? []) as JournalEntry[];
      setEntries(journalEntries);
      setOpenId(data?.[0]?.id ?? null);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#0D0E12] text-[#EEF0F2]">
      <AthleteScreenHeader
        title="Deine Journale"
        eyebrow="Privater Rückblick"
        onBack={() => navigate(-1)}
        backLabel="Zurück"
      />

      <main className="mx-auto max-w-2xl px-5 py-7 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
        <div className="mb-6 rounded-2xl border border-primary/15 bg-primary/5 p-4 flex gap-3">
          <LockKeyhole className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Diese Einträge sind nur für dich. Coaches sehen keine Inhalte, keine Ausschnitte und keine Stichwörter.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-2xl bg-gradient-card border-glow p-8 text-center">
            <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-heading text-xl font-bold mb-2">Noch keine Journal-Einträge</h2>
            <p className="text-sm text-muted-foreground">
              Sobald du einen Tagesabschluss speicherst, findest du ihn hier wieder.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => {
              const isOpen = openId === entry.id;
              const answers = asAnswers(entry.answers);
              return (
                <div key={entry.id} className="rounded-2xl bg-gradient-card border border-border/50 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenId((current) => (current === entry.id ? null : entry.id))}
                    className="w-full p-4 text-left flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-heading font-semibold text-sm truncate">
                        {entry.journal_title || `Journal Tag ${entry.day_number ?? ""}`.trim()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(`${entry.date}T00:00:00`), "EEEE, d. MMMM yyyy", { locale: de })}
                        {entry.day_number ? ` · Tag ${entry.day_number}/56` : ""}
                      </p>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-4">
                          {Object.entries(answers).map(([questionId, answer]) => (
                            <div key={questionId} className="rounded-xl bg-secondary/35 border border-border/35 p-4">
                              <p className="text-xs font-medium leading-5 text-primary/85 mb-2">
                                {getHistoricalJournalQuestion({
                                  dayNumber: entry.day_number,
                                  date: entry.date,
                                  questionId,
                                })}
                              </p>
                              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{answer}</p>
                            </div>
                          ))}

                          {entry.gratitude && (
                            <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
                              <p className="text-[10px] uppercase tracking-widest text-primary mb-2">Dankbarkeit</p>
                              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{entry.gratitude}</p>
                            </div>
                          )}

                          {entry.free_reflection && (
                            <div className="rounded-xl bg-secondary/25 border border-border/30 p-4">
                              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Freie Reflexion</p>
                              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{entry.free_reflection}</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default JournalHistory;
