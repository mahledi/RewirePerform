import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { GoldenDayDraft } from "@/prototypes/golden-days/goldenDayDrafts";
import {
  getRestDayVisualization,
  type RestVisualizationPhase,
} from "@/prototypes/golden-days/restDayVisualizations";
import { getFirstName } from "@/lib/athleteGreeting";
import {
  playVisualizationChime,
  primeVisualizationAudio,
  type VisualizationChimeStyle,
  VISUALIZATION_CHIME_STYLES,
} from "@/lib/visualizationChime";
import {
  releaseScreenWakeLock,
  requestScreenWakeLock,
  type ScreenWakeLockHandle,
} from "@/lib/screenWakeLock";

type RestDayVisualizationFlowProps = {
  draft: GoldenDayDraft;
  athleteName?: unknown;
  onCompletionChange?: (complete: boolean) => void;
  showSoundLab?: boolean;
};

type SessionStep = "intro" | "active" | "complete";

const PHASE_LABELS: Record<RestVisualizationPhase["id"], string> = {
  breathing: "Ruhig atmen",
  situation: "Die Situation",
  sentence: "Dein Satz",
  action: "Deine Handlung",
};

const SOUND_LABELS: Record<VisualizationChimeStyle, string> = {
  deep: "A · Tief und matt",
  warm: "B · Warm und kurz",
  clear: "C · Dunkel und klar",
};

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
};

const notifyPhaseFinished = (
  soundEnabled: boolean,
  soundStyle: VisualizationChimeStyle,
) => {
  if (soundEnabled) void playVisualizationChime(soundStyle);
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
  running,
}: {
  remaining: number;
  total: number;
  reduceMotion: boolean;
  running: boolean;
}) => {
  const radius = 76;
  const circumference = 2 * Math.PI * radius;
  const elapsed = Math.max(0, total - remaining);
  const progress = total === 0 ? 1 : Math.min(1, elapsed / total);

  return (
    <div
      className="relative mx-auto flex h-48 w-48 items-center justify-center"
      aria-label={remaining === 0 ? "Abschnitt beendet" : `Noch ${formatTime(remaining)}`}
    >
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
          initial={{ strokeDashoffset: circumference * (1 - progress) }}
          animate={{ strokeDashoffset: circumference * (1 - progress) }}
          transition={{ duration: reduceMotion ? 0 : 0.35, ease: "easeOut" }}
          style={{ filter: "drop-shadow(0 0 10px hsl(var(--primary) / 0.28))" }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-3xl font-semibold tabular-nums tracking-[-0.04em]">{formatTime(remaining)}</p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
          {remaining === 0 ? "beendet" : running ? "Augen zu" : "bereit"}
        </p>
      </div>
    </div>
  );
};

const RestDayVisualizationFlow = ({
  draft,
  athleteName,
  onCompletionChange,
  showSoundLab = false,
}: RestDayVisualizationFlowProps) => {
  const visualization = useMemo(() => getRestDayVisualization(draft), [draft]);
  const firstName = getFirstName(athleteName);
  const reduceMotion = useReducedMotion() ?? false;
  const [step, setStep] = useState<SessionStep>("intro");
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [remaining, setRemaining] = useState(visualization.phases[0].durationSec);
  const [running, setRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundStyle, setSoundStyle] = useState<VisualizationChimeStyle>("deep");
  const [soundError, setSoundError] = useState<string | null>(null);
  const didNotifyRef = useRef(false);
  const timerDeadlineRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wakeLockRef = useRef<ScreenWakeLockHandle | null>(null);
  const wakeLockWantedRef = useRef(false);
  const wakeLockRequestRef = useRef(0);
  const onCompletionChangeRef = useRef(onCompletionChange);

  const phases = visualization.phases;
  const phase = phases[phaseIndex];
  const phaseFinished = remaining === 0;

  useEffect(() => {
    onCompletionChangeRef.current = onCompletionChange;
  }, [onCompletionChange]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (typeof container?.scrollIntoView !== "function") return;
    container.scrollIntoView({ block: "start", behavior: "auto" });
  }, [phaseIndex, step]);

  const acquireWakeLock = useCallback(async () => {
    wakeLockWantedRef.current = true;
    const requestId = ++wakeLockRequestRef.current;
    const nextLock = await requestScreenWakeLock();
    if (!nextLock) return;

    if (!wakeLockWantedRef.current || requestId !== wakeLockRequestRef.current) {
      await releaseScreenWakeLock(nextLock);
      return;
    }

    const previousLock = wakeLockRef.current;
    wakeLockRef.current = nextLock;
    if (previousLock && previousLock !== nextLock) await releaseScreenWakeLock(previousLock);
  }, []);

  const releaseWakeLock = useCallback(() => {
    wakeLockWantedRef.current = false;
    wakeLockRequestRef.current += 1;
    const activeLock = wakeLockRef.current;
    wakeLockRef.current = null;
    void releaseScreenWakeLock(activeLock);
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && wakeLockWantedRef.current) {
        void acquireWakeLock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      releaseWakeLock();
    };
  }, [acquireWakeLock, releaseWakeLock]);

  useEffect(() => {
    setStep("intro");
    setPhaseIndex(0);
    setRemaining(visualization.phases[0].durationSec);
    setRunning(false);
    setSoundError(null);
    didNotifyRef.current = false;
    timerDeadlineRef.current = null;
    releaseWakeLock();
    onCompletionChangeRef.current?.(false);
  }, [draft.day, releaseWakeLock, visualization.phases]);

  useEffect(() => {
    if (!running || step !== "active" || remaining <= 0) return;
    const updateRemaining = () => {
      const deadline = timerDeadlineRef.current;
      if (deadline === null) return;
      setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    };
    updateRemaining();
    const timer = window.setInterval(updateRemaining, 250);
    return () => window.clearInterval(timer);
  }, [running, step]);

  useEffect(() => {
    if (step !== "active" || remaining > 0 || didNotifyRef.current) return;
    didNotifyRef.current = true;
    timerDeadlineRef.current = null;
    setRunning(false);
    releaseWakeLock();
    notifyPhaseFinished(soundEnabled, soundStyle);
  }, [releaseWakeLock, remaining, soundEnabled, soundStyle, step]);

  const testSound = async () => {
    setSoundError(null);
    const played = await playVisualizationChime(soundStyle);
    if (!played) setSoundError("Der Ton konnte auf diesem Gerät nicht abgespielt werden. Die visuelle Anzeige bleibt verfügbar.");
  };

  const startSession = async () => {
    if (soundEnabled) await primeVisualizationAudio();
    setPhaseIndex(0);
    setRemaining(phases[0].durationSec);
    setRunning(false);
    didNotifyRef.current = false;
    timerDeadlineRef.current = null;
    setStep("active");
  };

  const startTimer = async () => {
    if (soundEnabled) await primeVisualizationAudio();
    timerDeadlineRef.current = Date.now() + remaining * 1000;
    void acquireWakeLock();
    setRunning(true);
  };

  const pauseTimer = () => {
    const deadline = timerDeadlineRef.current;
    if (deadline !== null) {
      setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    }
    timerDeadlineRef.current = null;
    releaseWakeLock();
    setRunning(false);
  };

  const moveToNextPhase = () => {
    if (!phaseFinished) return;
    if (phaseIndex === phases.length - 1) {
      setRunning(false);
      timerDeadlineRef.current = null;
      releaseWakeLock();
      setStep("complete");
      onCompletionChangeRef.current?.(true);
      return;
    }

    const nextIndex = phaseIndex + 1;
    setPhaseIndex(nextIndex);
    setRemaining(phases[nextIndex].durationSec);
    didNotifyRef.current = false;
    timerDeadlineRef.current = null;
    setRunning(false);
  };

  if (step === "intro") {
    return (
      <div ref={containerRef} data-testid="rest-visualization-flow" data-step="intro" className="relative overflow-hidden rounded-[30px] bg-[#101216] px-5 py-6 sm:px-8 sm:py-8">
        <div className="pointer-events-none absolute -top-28 left-1/2 h-60 w-80 -translate-x-1/2 rounded-full bg-primary/[0.11] blur-3xl" />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Ruhetag · Visualisierung</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
            {firstName ? `${firstName}, deine Visualisierung ist bereit.` : "Deine Visualisierung ist bereit."}
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-6 text-white/52">
            Du startest mit zwei Minuten ruhiger Atmung. Danach bleibst du für drei einfache Schritte in derselben Sportsituation.
          </p>

          <div className="mt-6 divide-y divide-white/[0.055] border-y border-white/[0.055]">
            {[
              "Mach die Situation so echt wie möglich: Was siehst du, hörst du und spürst du in deinem Körper?",
              "Je mehr passende Details du wahrnimmst, desto besser kannst du die Handlung im Kopf durchgehen.",
              "Kein klares Bild? Kein Problem. Geh die Situation einfach Schritt für Schritt im Kopf durch.",
            ].map((line, index) => (
              <div key={line} className="flex items-start gap-3 py-3.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">{index + 1}</span>
                <p className="pt-0.5 text-sm leading-6 text-white/68">{line}</p>
              </div>
            ))}
          </div>

          <p className="mt-5 text-sm leading-6 text-white/48">
            Lies jeden Schritt. Starte den Timer und schließe dann die Augen. Der leise Ton sagt dir, wann du wieder auf den Bildschirm schaust.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSoundEnabled(true);
                void testSound();
              }}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.025] px-4 text-sm font-semibold text-white/68 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Volume2 className="h-4 w-4 text-primary" /> Ton testen
            </button>
            <button
              type="button"
              aria-pressed={!soundEnabled}
              onClick={() => setSoundEnabled((current) => !current)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-xs font-semibold text-white/42 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              {soundEnabled ? "Ton an" : "Ton aus"}
            </button>
          </div>
          <p className="mt-2 text-xs leading-5 text-white/36">Stell die Medienlautstärke so ein, dass du den Ton mit geschlossenen Augen gut hörst.</p>

          {showSoundLab && (
            <div className="mt-5" data-testid="visualization-sound-lab">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/34">Interne Klangvorschau</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {VISUALIZATION_CHIME_STYLES.map((style) => (
                  <button
                    key={style}
                    type="button"
                    aria-pressed={soundStyle === style}
                    onClick={() => setSoundStyle(style)}
                    className={cn(
                      "min-h-11 rounded-xl border px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      soundStyle === style
                        ? "border-primary/35 bg-primary/[0.08] text-primary"
                        : "border-white/[0.07] text-white/46",
                    )}
                  >
                    {SOUND_LABELS[style]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {soundError && (
            <p className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] px-3 py-2.5 text-xs leading-5 text-amber-100/75" role="status">
              {soundError}
            </p>
          )}

          <p className="mt-5 text-xs leading-5 text-white/38">
            Atme nur so tief, wie es angenehm ist. Wenn dir schwindelig wird, atme normal weiter oder beende die Einheit.
          </p>
          <button
            type="button"
            onClick={() => void startSession()}
            className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-[#07110e] shadow-[0_0_30px_hsl(var(--primary)/0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#101216]"
          >
            <Play className="h-4 w-4 fill-current" /> Visualisierung starten
          </button>
        </div>
      </div>
    );
  }

  if (step === "complete") {
    return (
      <div ref={containerRef} data-testid="rest-visualization-flow" data-step="complete" className="relative overflow-hidden rounded-[30px] bg-[#101514] px-6 py-8 text-center sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-56 w-80 -translate-x-1/2 rounded-full bg-primary/[0.11] blur-3xl" />
        <div className="relative">
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            <Check className="h-4 w-4" /> Visualisierung abgeschlossen
          </p>
          <p className="mt-6 text-2xl font-semibold tracking-[-0.03em]">{draft.cue}</p>
          <p className="mt-3 text-sm leading-6 text-white/48">Nimm nur diesen Satz mit zurück in deinen Tag.</p>
          <button
            type="button"
            onClick={() => {
              setStep("intro");
              onCompletionChangeRef.current?.(false);
            }}
            className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/[0.075] px-5 text-sm font-semibold text-white/58 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <RotateCcw className="h-4 w-4" /> Visualisierung erneut starten
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} data-testid="rest-visualization-flow" data-step="active" data-phase={phase.id} className="relative overflow-hidden rounded-[30px] bg-[#101216] px-5 py-6 sm:px-8 sm:py-8">
      <div className="pointer-events-none absolute -top-28 left-1/2 h-64 w-80 -translate-x-1/2 rounded-full bg-primary/[0.1] blur-3xl" />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">{PHASE_LABELS[phase.id]}</p>
            <p className="mt-1 text-xs text-white/35">
              {phase.id === "breathing" ? "2 Minuten ankommen" : `Visualisierung ${phaseIndex} von 3`}
            </p>
          </div>
          <div
            className="flex gap-1.5"
            aria-label={phase.id === "breathing" ? "Atmung" : `Visualisierung ${phaseIndex} von 3`}
          >
            {phases.slice(1).map((item, index) => (
              <span
                key={item.id}
                className={cn(
                  "h-1.5 rounded-full",
                  phaseIndex > index ? "w-5 bg-primary" : "w-1.5 bg-white/10",
                )}
              />
            ))}
          </div>
        </div>

        <TimerRing
          remaining={remaining}
          total={phase.durationSec}
          reduceMotion={reduceMotion}
          running={running}
        />

        <div className="min-h-32 text-center">
          <p className="text-xl font-semibold leading-8 tracking-[-0.02em] sm:text-2xl">{phase.prompt}</p>
        </div>

        <p className="mt-3 text-center text-xs leading-5 text-white/38" aria-live="polite">
          {phaseFinished
            ? "Der Abschnitt ist beendet. Öffne jetzt deine Augen."
            : running
              ? "Lass die Augen geschlossen. Der Ton sagt dir, wann der Abschnitt endet."
              : "Lies den Schritt. Starte den Timer und schließe dann deine Augen."}
        </p>

        <div className="mt-5 flex gap-2">
          {!phaseFinished && (
            <button
              type="button"
              onClick={() => running ? pauseTimer() : void startTimer()}
              aria-label={running ? "Timer pausieren" : phase.id === "breathing" ? "Atmung starten" : "Timer starten"}
              className={cn(
                "flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                running
                  ? "border border-white/[0.075] bg-white/[0.025] text-white/60"
                  : "bg-primary text-[#07110e] shadow-[0_0_26px_hsl(var(--primary)/0.12)]",
              )}
            >
              {running ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
              {running ? "Pausieren" : phase.id === "breathing" ? "Atmung starten" : "Augen schließen & starten"}
            </button>
          )}
          {phaseFinished && (
            <button
              type="button"
              onClick={moveToNextPhase}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-[#07110e] shadow-[0_0_26px_hsl(var(--primary)/0.12)] disabled:bg-white/[0.06] disabled:text-white/28 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {phaseIndex === phases.length - 1 ? "Visualisierung abschließen" : "Nächster Schritt"}
              {phaseIndex < phases.length - 1 && <ChevronRight className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RestDayVisualizationFlow;
