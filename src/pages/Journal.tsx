import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { ArrowLeft, BookOpen, Check, Heart, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getCurrentProgramDay, getEffectiveProgramStart } from "@/lib/getCurrentProgramDay";
import { resolveDay } from "@/lib/getDayContent";
import { getEffectiveTodayDate } from "@/lib/qaTime";
import type { CalendarEventType, ResolvedDay } from "@/content/matrixDayTypes";

const Journal = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resolved, setResolved] = useState<ResolvedDay | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [gratitude, setGratitude] = useState("");
  const [freeReflection, setFreeReflection] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      navigate("/auth");
      return;
    }
    loadDay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadDay = async () => {
    if (!user?.id) return;
    const today = new Date();
    const dateStr = format(today, "yyyy-MM-dd");

    const [effective, { data: events }, { data: existing }] = await Promise.all([
      getEffectiveProgramStart(user.id),
      supabase.from("calendar_events").select("date,event_type").eq("user_id", user.id).eq("date", dateStr).limit(1),
      supabase.from("daily_journals").select("*").eq("user_id", user.id).eq("date", dateStr).maybeSingle(),
    ]);

    const info = getCurrentProgramDay(effective.startDate, today);
    if (!info) {
      setLoading(false);
      return;
    }
    const eventType = (events?.[0]?.event_type ?? "training") as CalendarEventType;
    const r = resolveDay(info.dayNumber, today, eventType);
    setResolved(r);

    if (existing) {
      setAnswers((existing.answers as Record<string, string>) ?? {});
      setGratitude(existing.gratitude ?? "");
      setFreeReflection(existing.free_reflection ?? "");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user?.id || !resolved) return;
    setSaving(true);
    const { getOrCreateActiveInstance } = await import("@/lib/programInstance");
    const instance = await getOrCreateActiveInstance(user.id);
    const payload = {
      user_id: user.id,
      date: resolved.date,
      day_number: resolved.matrix.dayNumber,
      journal_title: resolved.content.journal.journalTitle,
      answers,
      gratitude: gratitude || null,
      free_reflection: freeReflection || null,
      program_instance_id: instance?.id ?? null,
    };
    const { error } = await supabase
      .from("daily_journals")
      .upsert(payload, { onConflict: "user_id,date" });
    setSaving(false);
    if (error) {
      console.error(error);
      toast.error("Journal konnte nicht gespeichert werden.");
      return;
    }
    setDone(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (!resolved) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <BookOpen className="w-10 h-10 text-muted-foreground mb-4" />
        <h2 className="font-heading text-xl font-bold mb-2">Programm noch nicht gestartet</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Sobald dein 56-Tage-Programm läuft, erscheint hier dein Tagesjournal.
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium"
        >
          Zum Dashboard
        </button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-6">
          <Check className="w-8 h-8 text-primary" />
        </motion.div>
        <h2 className="font-heading text-2xl font-bold mb-2">Tag abgeschlossen.</h2>
        <p className="text-sm text-muted-foreground mb-8 max-w-sm">
          Was du heute aufgeschrieben hast, bleibt in dir – auch wenn du es morgen nicht mehr ansiehst.
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium"
        >
          Zurück
        </button>
      </div>
    );
  }

  const { content, matrix } = resolved;
  const j = content.journal;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="p-2 -ml-2 rounded-lg hover:bg-secondary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Tag {matrix.dayNumber} · {format(new Date(resolved.date), "d. MMM", { locale: de })}
            </p>
            <h1 className="font-heading font-semibold text-sm truncate">{j.journalTitle}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Lens reminder */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-2xl bg-gradient-card border-glow">
          <p className="text-[10px] uppercase tracking-widest text-primary mb-2">Heutige Linse</p>
          <p className="text-base font-heading font-semibold leading-snug">{matrix.lens}</p>
          <p className="text-xs text-muted-foreground mt-2">{matrix.practiceFocus}</p>
        </motion.div>

        {/* Questions */}
        {j.questions.map((q, i) => (
          <motion.div
            key={q.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
            className="space-y-2"
          >
            <label className="text-sm font-medium text-foreground block">{q.question}</label>
            <Textarea
              value={answers[q.id] ?? ""}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
              placeholder={q.placeholder ?? ""}
              className="min-h-[90px] bg-secondary/40 border-border/40 resize-none"
            />
          </motion.div>
        ))}

        {/* Gratitude */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 p-5 rounded-2xl bg-secondary/30 border border-border/30">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-primary" />
            <label className="text-sm font-medium">Dankbarkeit</label>
          </div>
          <p className="text-xs text-muted-foreground">{j.gratitudeInstruction}</p>
          <Textarea
            value={gratitude}
            onChange={(e) => setGratitude(e.target.value)}
            placeholder="Eine konkrete Sache …"
            className="min-h-[70px] bg-background/60 border-border/40 resize-none"
          />
        </motion.div>

        {/* Free reflection (optional) */}
        {j.freeReflectionPrompt && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            <label className="text-xs text-muted-foreground block">{j.freeReflectionPrompt}</label>
            <Textarea
              value={freeReflection}
              onChange={(e) => setFreeReflection(e.target.value)}
              placeholder="Optional …"
              className="min-h-[70px] bg-secondary/30 border-border/40 resize-none"
            />
          </motion.div>
        )}

        {/* Save */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-heading font-semibold bg-primary text-primary-foreground hover:shadow-glow transition-all disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Tag abschließen
        </motion.button>
      </div>
    </div>
  );
};

export default Journal;
