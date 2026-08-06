import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronRight,
  Eye,
  Pause,
  Play,
  Plus,
  RotateCcw,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { GoldenDayDraft } from "@/prototypes/golden-days/goldenDayDrafts";
import {
  getRestDayVisualization,
  type RestVisualizationPhase,
} from "@/prototypes/golden-days/restDayVisualizations";
import { getFirstName } from "@/lib/athleteGreeting";

type RestDayVisualizationFlowProps = {
  draft: GoldenDayDraft;
  athleteName?: unknown;
  onCompletionChange?: (complete: boolean) => void;
};

type SessionStep = "intro" | "choose" | "active" | "complete";
type SessionPath = "guided" | "own";

const PHASE_LABELS: Record<RestVisualizationPhase["id"], string> = {
  arrive: "Ankommen",
  scene: "Szene aufbauen",
  moment: "Moment erkennen",
  anchor: "Dein Satz",
  action: "Handlung sehen",
  replay: "Noch einmal",
  transfer: "Mitnehmen",
};

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
};

const notifyPhaseFinished = () => {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(18);
  } catch {
    // Haptisches Feedback ist nur eine optionale Geräteverbesserung.
  }
};

const TimerRing = ({
  remaining,
  total,
  reduceMotion,
}: {
  remaining: number;
  total: number;
  reduceMotion: boolean;
}) => {
  const radius = 76;
  const circumference = 2 * Math.PI * radius;
  const elapsed = Math.max(0, total - remaining);
  const progress = total === 0 ? 1 : Math.min(1, elapsed / total);

  return (
    <div className="relative mx-auto flex h-48 w-48 items-center justify-center" aria-label={`Noch ${formatTime(remaining)}`}>
      <div className="absolute inset-5 rounded-full bg-primary/[0.07] blur-2xl" />
      <svg className="relative h-48 w-48 -rotate-90" viewBox="0 0 176 176" aria-hidden="true">
        <circle cx="88" cy="88" r={radius} fill="none" stroke="rgba(255,255,255,0.055)" strokeWidth="7" />
        <motion.circle
          cx="88"
          cy="88"
          r={radius}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeLinecap="round"
          strokeWidth="7"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: circumference * (1 - progress) }}
          transition={{ duration: reduceMotion ? 0 : 0.35, ease: "easeOut" }}
          style={{ filter: "drop-shadow(0 0 10px hsl(var(--primary) / 0.28))" }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-3xl font-semibold tabular-nums tracking-[-0.04em]">{formatTime(remaining)}</p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">verbleibend</p>
      </div>
    </div>
  );
};

const RestDayVisualizationFlow = ({ draft, athleteName, onCompletionChange }: RestDayVisualizationFlowProps) => {
  const visualization = useMemo(() => getRestDayVisualization(draft), [draft]);
  const firstName = getFirstName(athleteName);
  const reduceMotion = useReducedMotion() ?? false;
  const [step, setStep] = useState<SessionStep>("intro");
  const [path, setPath] = useState<SessionPath>("guided");
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [remaining, setRemaining] = useState(visualization.phases[0].durationSec);
  const [phaseTotal, setPhaseTotal] = useState(visualization.phases[0].durationSec);
  const [running, setRunning] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const didNotifyRef = useRef(false);
  const onCompletionChangeRef = useRef(onCompletionChange);

  const phases = path === "own" ? visualization.ownScenePhases : visualization.phases;
  const phase = phases[phaseIndex];

  useEffect(() => {
    onCompletionChangeRef.current = onCompletionChange;
  }, [onCompletionChange]);

  useEffect(() => {
    setStep("intro");
    setPath("guided");
    setPhaseIndex(0);
    setRemaining(visualization.phases[0].durationSec);
    setPhaseTotal(visualization.phases[0].durationSec);
    setRunning(false);
    setRevealed(false);
    didNotifyRef.current = false;
    onCompletionChangeRef.current?.(false);
  }, [draft.day]);

  useEffect(() => {
    if (!running || step !== "active" || remaining <= 0) return;
    const timer = window.setTimeout(() => setRemaining((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [remaining, running, step]);

  useEffect(() => {
    if (step !== "active" || remaining > 0 || didNotifyRef.current) return;
    didNotifyRef.current = true;
    setRunning(false);
    notifyPhaseFinished();
  }, [remaining, step]);

  const startSession = (nextPath: SessionPath) => {
    const nextPhases = nextPath === "own" ? visualization.ownScenePhases : visualization.phases;
    setPath(nextPath);
    setPhaseIndex(0);
    setRemaining(nextPhases[0].durationSec);
    setPhaseTotal(nextPhases[0].durationSec);
    setRevealed(false);
    didNotifyRef.current = false;
    setStep("active");
    setRunning(true);
  };

  const moveToNextPhase = () => {
    if (phaseIndex === phases.length - 1) {
      setRunning(false);
      setStep("complete");
      onCompletionChangeRef.current?.(true);
      return;
    }

    const nextIndex = phaseIndex + 1;
    const nextDuration = phases[nextIndex].durationSec;
    setPhaseIndex(nextIndex);
    setRemaining(nextDuration);
    setPhaseTotal(nextDuration);
    setRevealed(false);
    didNotifyRef.current = false;
    setRunning(true);
  };

  const addTime = () => {
    setRemaining((current) => current + 30);
    setPhaseTotal((current) => current + 30);
    didNotifyRef.current = false;
    setRunning(true);
  };

  if (step === "intro") {
    return (
      <div data-testid="rest-visualization-flow" data-step="intro" className="relative overflow-hidden rounded-[28px] border border-white/[0.07] bg-[#101216] p-5 sm:p-7">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-52 w-72 -translate-x-1/2 rounded-full bg-primary/[0.12] blur-3xl" />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Deine mentale Einheit</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
            {firstName ? `${firstName}, deine Einheit ist bereit.` : "Deine Einheit ist bereit."}
          </h2>
          <p className="mt-3 text-sm leading-6 text-white/48">Du musst kein perfektes Bild sehen.</p>
          <div className="mt-6 space-y-3">
            {[
              "Es reicht, wenn du dir vorstellst, was passiert.",
              "Die App führt dich Schritt für Schritt.",
              "Bleib einfach bei deiner eigenen Sportszene.",
            ].map((line, index) => (
              <div key={line} className="flex items-start gap-3 rounded-2xl border border-white/[0.055] bg-white/[0.025] px-4 py-3.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">{index + 1}</span>
                <p className="pt-0.5 text-sm leading-6 text-white/68">{line}</p>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setStep("choose")}
            className="mt-6 flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-[#07110e] shadow-[0_0_28px_hsl(var(--primary)/0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#101216]"
          >
            Verstanden <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (step === "choose") {
    return (
      <div data-testid="rest-visualization-flow" data-step="choose" className="relative overflow-hidden rounded-[28px] border border-white/[0.07] bg-[#101216] p-5 sm:p-7">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-52 w-72 -translate-x-1/2 rounded-full bg-primary/[0.12] blur-3xl" />
        <div className="relative text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Mentale Einheit</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">{visualization.title}</h2>
          <p className="mt-3 text-sm leading-6 text-white/48">Etwa {visualization.estimatedMinutes} Minuten · du bestimmst das Tempo.</p>
          <button
            type="button"
            onClick={() => startSession("guided")}
            className="mt-7 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-[#07110e] shadow-[0_0_30px_hsl(var(--primary)/0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#101216]"
          >
            <Play className="h-4 w-4 fill-current" /> Geführt starten
          </button>
          <button
            type="button"
            onClick={() => startSession("own")}
            className="mt-3 min-h-12 w-full rounded-2xl border border-white/[0.075] bg-white/[0.025] px-4 text-sm font-semibold text-white/62 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Ich habe schon eine passende Szene im Kopf
          </button>
        </div>
      </div>
    );
  }

  if (step === "complete") {
    return (
      <div data-testid="rest-visualization-flow" data-step="complete" className="relative overflow-hidden rounded-[28px] border border-primary/20 bg-[#101514] p-6 text-center sm:p-8">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-56 w-80 -translate-x-1/2 rounded-full bg-primary/[0.13] blur-3xl" />
        <div className="relative">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-primary/35 bg-primary/[0.08] text-primary shadow-[0_0_36px_hsl(var(--primary)/0.12)]">
            <Check className="h-8 w-8" />
          </div>
          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Mentale Einheit abgeschlossen</p>
          <p className="mt-5 text-2xl font-semibold tracking-[-0.03em]">{draft.cue}</p>
          <p className="mt-3 text-sm leading-6 text-white/48">Nimm nur diesen Satz mit zurück in deinen Tag.</p>
          <button
            type="button"
            onClick={() => {
              setStep("choose");
              onCompletionChangeRef.current?.(false);
            }}
            className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/[0.075] px-5 text-sm font-semibold text-white/58 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <RotateCcw className="h-4 w-4" /> Einheit erneut ansehen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="rest-visualization-flow" data-step="active" data-phase={phase.id} className="relative overflow-hidden rounded-[28px] border border-white/[0.07] bg-[#101216] p-5 sm:p-7">
      <div className="pointer-events-none absolute -top-28 left-1/2 h-64 w-80 -translate-x-1/2 rounded-full bg-primary/[0.11] blur-3xl" />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">{PHASE_LABELS[phase.id]}</p>
            <p className="mt-1 text-xs text-white/35">Schritt {phaseIndex + 1} von {phases.length}</p>
          </div>
          <div className="flex gap-1.5" aria-label={`Schritt ${phaseIndex + 1} von ${phases.length}`}>
            {phases.map((item, index) => (
              <span key={item.id} className={cn("h-1.5 rounded-full", index <= phaseIndex ? "w-5 bg-primary" : "w-1.5 bg-white/10")} />
            ))}
          </div>
        </div>

        <TimerRing remaining={remaining} total={phaseTotal} reduceMotion={reduceMotion} />

        <div className="min-h-28 text-center">
          <p className="text-xl font-semibold leading-8 tracking-[-0.02em] sm:text-2xl">{phase.prompt}</p>
          {phase.reveal && !revealed && (
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/[0.075] px-4 text-sm font-semibold text-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Eye className="h-4 w-4" /> Satz zeigen
            </button>
          )}
          {phase.reveal && revealed && (
            <p className="mt-4 rounded-2xl border border-primary/20 bg-primary/[0.06] px-4 py-3 text-base font-semibold text-primary">{phase.reveal}</p>
          )}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setRunning((current) => !current)}
            aria-label={running ? "Pause" : "Fortsetzen"}
            className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/[0.075] bg-white/[0.025] text-sm font-semibold text-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {running ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
            <span className="hidden sm:inline">{running ? "Pause" : "Weiter"}</span>
          </button>
          <button
            type="button"
            onClick={addTime}
            className="flex min-h-12 items-center justify-center gap-1 rounded-2xl border border-white/[0.075] bg-white/[0.025] text-sm font-semibold text-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Plus className="h-4 w-4" /> 30 Sek.
          </button>
          <button
            type="button"
            onClick={moveToNextPhase}
            className="flex min-h-12 items-center justify-center gap-1 rounded-2xl bg-primary px-3 text-sm font-semibold text-[#07110e] shadow-[0_0_24px_hsl(var(--primary)/0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {phaseIndex === phases.length - 1 ? "Abschließen" : "Weiter"}
            {phaseIndex < phases.length - 1 && <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RestDayVisualizationFlow;
