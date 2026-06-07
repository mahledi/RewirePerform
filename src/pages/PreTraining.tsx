import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Loader2, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getEffectiveProgramStart, getCurrentProgramDay } from "@/lib/getCurrentProgramDay";
import { resolveDay } from "@/lib/getDayContent";
import type { ResolvedDay } from "@/content/matrixDayTypes";
import { captureAppError } from "@/lib/monitoring";
import { getEffectiveTodayDate } from "@/lib/qaTime";
import { getProgramModeInfo } from "@/lib/programMode";
import { format } from "date-fns";

type EventType = "training" | "rest" | "competition";

const PreTraining = () => {
  const { user, role, isTestUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [resolved, setResolved] = useState<ResolvedDay | null>(null);
  const [eventType, setEventType] = useState<EventType | null>(null);
  const trackedRef = useRef(false);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const today = await getEffectiveTodayDate(user.id);
      const dateStr = format(today, "yyyy-MM-dd");
      const [eff, modeInfo] = await Promise.all([
        getEffectiveProgramStart(user.id),
        getProgramModeInfo(user.id),
      ]);
      const info = getCurrentProgramDay(eff.startDate, today);
      if (!info) {
        setLoading(false);
        return;
      }
      const { data: events } = modeInfo.mode === "team" && modeInfo.teamId
        ? await supabase
            .from("team_calendar_events")
            .select("date,event_type")
            .eq("team_id", modeInfo.teamId)
            .eq("date", dateStr)
            .limit(1)
        : await supabase
            .from("calendar_events")
            .select("date,event_type")
            .eq("user_id", user.id)
            .eq("date", dateStr)
            .limit(1);
      const resolvedEventType = (events?.[0]?.event_type ?? "training") as EventType;
      setEventType(resolvedEventType);
      if (resolvedEventType === "rest") {
        setResolved(null);
        setLoading(false);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("sport,position")
        .eq("id", user.id)
        .maybeSingle();
      const day = resolveDay(info.dayNumber, today, resolvedEventType, {
        sport: profile?.sport,
        position: profile?.position,
      });
      setResolved(day);
      setLoading(false);
    };
    load().catch((error) => {
      setLoading(false);
      if (!trackedRef.current) {
        trackedRef.current = true;
        void captureAppError({
          eventName: "pre_training_opened",
          error,
          role,
          route: "/pre-training",
          isTest: isTestUser,
        });
      }
    });
  }, [user, role, isTestUser]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 -ml-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-heading font-bold text-lg">Pre-Training</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !resolved ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">
              {eventType === "rest"
                ? "Heute ist ein Ruhetag. Dafür gibt es keine Pre-Training-Vorbereitung."
                : "Programm noch nicht gestartet"}
            </p>
            <Button onClick={() => navigate("/dashboard")} className="mt-6">Zurück</Button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary mb-3">
                {eventType === "competition" ? "Pre-Wettkampf" : "Pre-Training"}
              </p>
              <h1 className="font-heading font-bold text-3xl mb-2">
                {eventType === "competition" ? "Bereit für den Wettkampf" : "Bereit für die nächste Einheit"}
              </h1>
              <p className="text-muted-foreground">
                {eventType === "competition"
                  ? "Kurz sortieren, klare Linse setzen, dann in deinen Wettkampfmodus."
                  : "Kurz sortieren, klare Linse setzen, dann raus in die Arbeit."}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Heutige Linse
                  </p>
                  <h2 className="font-heading font-semibold mt-1">{resolved.matrix.lens}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {resolved.matrix.practiceFocus}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {resolved.content.tasks.map((task, i) => (
                <div
                  key={task.id}
                  className="rounded-xl border border-border bg-card p-4 flex gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0 font-semibold">
                    {i + 1}
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-heading font-semibold leading-tight">{task.title}</h2>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {task.concreteAction || task.why}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Button onClick={() => navigate("/dashboard")} size="lg" className="w-full">
              <Target className="w-4 h-4 mr-2" />
              {eventType === "competition" ? "Bereit für den Wettkampf" : "Bereit fürs Training"}
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default PreTraining;
