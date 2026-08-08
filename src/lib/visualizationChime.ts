export type VisualizationChimeStyle = "deep" | "warm" | "clear";

type ChimePartial = {
  frequency: number;
  gain: number;
  detune?: number;
};

type ChimeDefinition = {
  duration: number;
  partials: ChimePartial[];
};

const CHIMES: Record<VisualizationChimeStyle, ChimeDefinition> = {
  deep: {
    duration: 0.72,
    partials: [
      { frequency: 261.63, gain: 0.42 },
      { frequency: 392, gain: 0.16, detune: -4 },
      { frequency: 523.25, gain: 0.07, detune: 3 },
    ],
  },
  warm: {
    duration: 0.58,
    partials: [
      { frequency: 293.66, gain: 0.38 },
      { frequency: 440, gain: 0.14, detune: 2 },
      { frequency: 587.33, gain: 0.055 },
    ],
  },
  clear: {
    duration: 0.48,
    partials: [
      { frequency: 329.63, gain: 0.34 },
      { frequency: 493.88, gain: 0.13, detune: -2 },
      { frequency: 659.25, gain: 0.05 },
    ],
  },
};

let sharedAudioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  const AudioContextConstructor = window.AudioContext
    ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) return null;
  sharedAudioContext ??= new AudioContextConstructor();
  return sharedAudioContext;
};

export const primeVisualizationAudio = async (): Promise<boolean> => {
  const context = getAudioContext();
  if (!context) return false;
  if (context.state === "suspended") await context.resume();
  return context.state === "running";
};

export const playVisualizationChime = async (
  style: VisualizationChimeStyle = "deep",
): Promise<boolean> => {
  const context = getAudioContext();
  if (!context) return false;
  if (context.state === "suspended") await context.resume();
  if (context.state !== "running") return false;

  const definition = CHIMES[style];
  const now = context.currentTime;
  const master = context.createGain();
  const filter = context.createBiquadFilter();

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(style === "clear" ? 1700 : 1250, now);
  filter.Q.setValueAtTime(0.5, now);
  master.gain.setValueAtTime(0.0001, now);
  master.gain.linearRampToValueAtTime(0.28, now + 0.018);
  master.gain.exponentialRampToValueAtTime(0.0001, now + definition.duration);
  filter.connect(master);
  master.connect(context.destination);

  for (const partial of definition.partials) {
    const oscillator = context.createOscillator();
    const partialGain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(partial.frequency, now);
    oscillator.detune.setValueAtTime(partial.detune ?? 0, now);
    partialGain.gain.setValueAtTime(partial.gain, now);
    oscillator.connect(partialGain);
    partialGain.connect(filter);
    oscillator.start(now);
    oscillator.stop(now + definition.duration + 0.02);
  }

  return true;
};

export const VISUALIZATION_CHIME_STYLES: readonly VisualizationChimeStyle[] = [
  "deep",
  "warm",
  "clear",
];
