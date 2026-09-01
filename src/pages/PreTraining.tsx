import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
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
import { loadPreTrainingCompletion, markPreTrainingCompleted } from "@/lib/preTrainingCompletion";
import { isPreTrainingExpired, type PreTrainingEventTiming } from "@/lib/preTrainingState";
import {
  AthleteFlowButton,
  AthleteFlowAmbient,
  AthleteFlowScene,
  athleteFlowInput,
  athleteFlowPanel,
  athleteFlowPrimaryButton,
  athleteFlowSecondaryButton,
} from "@/components/app/AthleteFlowScene";

type EventType = "training" | "rest" | "competition";

const PreTraining = () => {
  const { user, role, isTestUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [resolved, setResolved] = useState<ResolvedDay | null>(null);
  const [eventType, setEventType] = useState<EventType | null>(null);
  const [recall, setRecall] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [expired, setExpired] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [completionContext, setCompletionContext] = useState<{
    date: Date;
    eventType: "training" | "competition";
    sport?: string | null;
    position?: string | null;
  } | null>(null);
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
            .select("date,event_type,training_local_hour,training_local_minute,training_timezone")
            .eq("team_id", modeInfo.teamId)
            .eq("date", dateStr)
            .limit(1)
        : await supabase
            .from("calendar_events")
            .select("date,event_type")
            .eq("user_id", user.id)
            .eq("date", dateStr)
            .limit(1);
      const primaryEvent = events?.[0] as (PreTrainingEventTiming & { event_type: EventType }) | undefined;
      const resolvedEventType = (primaryEvent?.event_type ?? "training") as EventType;
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
      const alreadyCompleted = await loadPreTrainingCompletion(user.id, dateStr);
      setCompleted(alreadyCompleted);
      setExpired(isPreTrainingExpired(primaryEvent, today));
      setCompletionContext({
        date: today,
        eventType: resolvedEventType as "training" | "competition",
        sport: profile?.sport,
        position: profile?.position,
      });
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

  const finishPreTraining = async () => {
    if (!user || !completionContext || saving) return;
    setSaving(true);
    setSaveError(false);
    try {
      await markPreTrainingCompleted({ userId: user.id, ...completionContext });
      setCompleted(true);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error("pre-training completion error", error);
      setSaveError(true);
      setSaving(false);
    }
  };

  return (
    <div className="relative min-h-screen min-h-[100dvh] overflow-x-hidden bg-[#0D0E12] text-[#EEF0F2]">
      <AthleteFlowAmbient />
      <AthleteScreenHeader
        title={eventType === "competition" ? "Pre-Wettkampf" : "Pre-Training"}
        eyebrow="Vor deiner Einheit"
        onBack={() => navigate("/dashboard")}
        backLabel="Zurück zum Dashboard"
      />

      <div className="relative mx-auto max-w-2xl px-5 py-7 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : completed || expired ? (
          <div className="py-20 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
            <h1 className="mt-5 font-heading text-2xl font-semibold">
              {completed ? "Pre-Training bereits erledigt" : "Diese Vorbereitung ist abgeschlossen"}
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
              {completed
                ? "Deine Vorbereitung für die heutige Einheit wurde gespeichert."
                : "Die Einheit hat bereits begonnen. Dein nächster Pre-Training-Flow erscheint automatisch vor dem nächsten Termin."}
            </p>
            <Button onClick={() => navigate("/dashboard")} className="mt-6">Zurück zu „Dein Tag“</Button>
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
          <div className="space-y-7">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary mb-3">
                {eventType === "competition" ? "Pre-Wettkampf" : "Pre-Training"}
              </p>
              <h1 className="mb-3 font-heading text-3xl font-semibold leading-tight tracking-[-0.04em]">
                {eventType === "competition" ? "Bereit für den Wettkampf" : "Bereit für die nächste Einheit"}
              </h1>
              <p className="text-[15px] leading-7 text-white/55">
                {eventType === "competition"
                  ? "Kurz sortieren, klare Linse setzen, dann in deinen Wettkampfmodus."
                  : "Kurz sortieren, klare Linse setzen, dann raus in die Arbeit."}
              </p>
            </div>

            <div className="space-y-3 border-l border-primary/35 pl-4">
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
              <AnimatePresence mode="wait" initial={false}>
                {!revealed ? (
                  <AthleteFlowScene key="recall" className={`${athleteFlowPanel} p-5 sm:p-6`}>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Erst erinnern</p>
                    <h2 className="mt-3 text-2xl font-semibold leading-8 tracking-[-0.025em]">{resolved.content.preTraining.recallPrompt}</h2>
                    <textarea
                      value={recall}
                      onChange={(event) => setRecall(event.target.value)}
                      placeholder="Deine kurze Erinnerung …"
                      aria-label="Deine kurze Erinnerung"
                      className={`${athleteFlowInput} mt-6 min-h-28 resize-none`}
                    />
                    <AthleteFlowButton onClick={() => setRevealed(true)} className={`${athleteFlowPrimaryButton} mt-4 w-full`}>
                      <Eye className="h-4 w-4" /> Erinnerung prüfen
                    </AthleteFlowButton>
                  </AthleteFlowScene>
                ) : (
                  <AthleteFlowScene key="reveal" className="rounded-[26px] border border-primary/20 bg-primary/[0.075] p-6 text-center shadow-[0_22px_70px_-45px_rgba(46,173,137,0.75)]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Dein Satz für heute</p>
                    <p className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.04em]">{resolved.content.preTraining.reveal}</p>
                    <p className="mt-4 text-[15px] leading-7 text-white/58">{resolved.content.preTraining.application}</p>
                    <AthleteFlowButton onClick={() => setRevealed(false)} className={`${athleteFlowSecondaryButton} mt-6 w-full`}>
                      Noch einmal erinnern
                    </AthleteFlowButton>
                  </AthleteFlowScene>
                )}
              </AnimatePresence>
            ) : (
              <div className="rounded-[22px] border border-white/[0.065] bg-white/[0.025] p-5 text-sm leading-6 text-muted-foreground">
                Dein heutiger Satz steht bereits im Daily Flow. Nimm ihn mit in die nächste passende Handlung.
              </div>
            )}

            <AthleteFlowButton
              onClick={() => void finishPreTraining()}
              className={`${athleteFlowPrimaryButton} w-full`}
              disabled={saving || (Boolean(resolved.content.preTraining) && !revealed)}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Target className="w-4 h-4 mr-2" />}
              {saving ? "Wird gespeichert …" : eventType === "competition" ? "Bereit für den Wettkampf" : "Bereit fürs Training"}
            </AthleteFlowButton>
            {saveError && (
              <p role="alert" className="text-center text-sm text-destructive">
                Das Speichern hat nicht funktioniert. Bitte versuche es erneut.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PreTraining;
