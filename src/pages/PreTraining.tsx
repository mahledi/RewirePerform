import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Eye, Loader2, Target } from "lucide-react";
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
import { AthleteScreenHeader } from "@/components/app/AthleteAppChrome";

type EventType = "training" | "rest" | "competition";

const PreTraining = () => {
  const { user, role, isTestUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [resolved, setResolved] = useState<ResolvedDay | null>(null);
  const [eventType, setEventType] = useState<EventType | null>(null);
  const [recall, setRecall] = useState("");
  const [revealed, setRevealed] = useState(false);
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
    <div className="min-h-screen min-h-[100dvh] bg-[#0D0E12] text-[#EEF0F2]">
      <AthleteScreenHeader
        title={eventType === "competition" ? "Pre-Wettkampf" : "Pre-Training"}
        eyebrow="Vor deiner Einheit"
        onBack={() => navigate("/dashboard")}
        backLabel="Zurück zum Dashboard"
      />

      <div className="mx-auto max-w-2xl px-5 py-7 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
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

            <div className="space-y-3 rounded-[24px] border border-white/[0.065] bg-white/[0.025] p-5">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Heute im Fokus</p>
                  <h2 className="font-heading font-semibold mt-1">
                    {resolved.content.title ?? resolved.content.lens ?? resolved.matrix.lens}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {resolved.content.lens ?? resolved.matrix.practiceFocus}
                  </p>
                  <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                    {resolved.context.focus}
                  </p>
                </div>
              </div>
            </div>

            {resolved.content.preTraining ? (
              <div className="relative overflow-hidden rounded-[26px] border border-primary/15 bg-[#101514] p-5">
                <div className="pointer-events-none absolute -top-20 left-1/2 h-44 w-64 -translate-x-1/2 rounded-full bg-primary/[0.11] blur-3xl" />
                <div className="relative">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Erst erinnern</p>
                  <h2 className="mt-3 text-xl font-semibold leading-7">{resolved.content.preTraining.recallPrompt}</h2>
                  <textarea
                    value={recall}
                    onChange={(event) => setRecall(event.target.value)}
                    placeholder="Deine kurze Erinnerung …"
                    aria-label="Deine kurze Erinnerung"
                    className="mt-5 min-h-24 w-full resize-none rounded-2xl border border-white/[0.075] bg-white/[0.025] px-4 py-3 text-sm text-white placeholder:text-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setRevealed(true)}
                    className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-primary/45 bg-primary/[0.055] text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Eye className="h-4 w-4" /> Erinnerung prüfen
                  </button>

                  {revealed && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-5 rounded-[22px] border border-primary/25 bg-primary/[0.09] p-5 text-center shadow-[0_0_34px_hsl(var(--primary)/0.10)]"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Dein Satz für heute</p>
                      <p className="mt-3 text-2xl font-semibold tracking-[-0.03em]">{resolved.content.preTraining.reveal}</p>
                      <p className="mt-3 text-sm leading-6 text-white/52">{resolved.content.preTraining.application}</p>
                    </motion.div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-[22px] border border-white/[0.065] bg-white/[0.025] p-5 text-sm leading-6 text-muted-foreground">
                Dein heutiger Satz steht bereits im Daily Flow. Nimm ihn mit in die nächste passende Handlung.
              </div>
            )}

            <Button
              onClick={() => navigate("/dashboard")}
              size="lg"
              className="w-full"
              disabled={Boolean(resolved.content.preTraining) && !revealed}
            >
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
