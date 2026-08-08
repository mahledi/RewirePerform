import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type AudioParamStub = {
  setValueAtTime: ReturnType<typeof vi.fn>;
  linearRampToValueAtTime: ReturnType<typeof vi.fn>;
  exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
};

const createAudioParam = (): AudioParamStub => ({
  setValueAtTime: vi.fn(),
  linearRampToValueAtTime: vi.fn(),
  exponentialRampToValueAtTime: vi.fn(),
});

class AudioContextStub {
  static instances: AudioContextStub[] = [];

  state: AudioContextState = "suspended";
  currentTime = 4;
  destination = {} as AudioDestinationNode;
  resume = vi.fn(async () => {
    this.state = "running";
  });
  oscillators: Array<{
    type: OscillatorType;
    frequency: AudioParamStub;
    detune: AudioParamStub;
    connect: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
  }> = [];

  constructor() {
    AudioContextStub.instances.push(this);
  }

  createGain() {
    return {
      gain: createAudioParam(),
      connect: vi.fn(),
    } as unknown as GainNode;
  }

  createBiquadFilter() {
    return {
      type: "lowpass",
      frequency: createAudioParam(),
      Q: createAudioParam(),
      connect: vi.fn(),
    } as unknown as BiquadFilterNode;
  }

  createOscillator() {
    const oscillator = {
      type: "sine" as OscillatorType,
      frequency: createAudioParam(),
      detune: createAudioParam(),
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    this.oscillators.push(oscillator);
    return oscillator as unknown as OscillatorNode;
  }
}

describe("visualization chime", () => {
  beforeEach(() => {
    vi.resetModules();
    AudioContextStub.instances = [];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fails quietly when Web Audio is unavailable", async () => {
    vi.stubGlobal("AudioContext", undefined);
    const { playVisualizationChime, primeVisualizationAudio } = await import("@/lib/visualizationChime");

    await expect(primeVisualizationAudio()).resolves.toBe(false);
    await expect(playVisualizationChime()).resolves.toBe(false);
  });

  it("unlocks audio after a user action and builds a short local three-part chime", async () => {
    vi.stubGlobal("AudioContext", AudioContextStub);
    const {
      playVisualizationChime,
      primeVisualizationAudio,
      VISUALIZATION_CHIME_STYLES,
    } = await import("@/lib/visualizationChime");

    await expect(primeVisualizationAudio()).resolves.toBe(true);
    expect(VISUALIZATION_CHIME_STYLES).toEqual(["deep", "warm", "clear"]);

    await expect(playVisualizationChime("deep")).resolves.toBe(true);
    const context = AudioContextStub.instances[0];
    expect(context.resume).toHaveBeenCalledOnce();
    expect(context.oscillators).toHaveLength(3);
    for (const oscillator of context.oscillators) {
      expect(oscillator.type).toBe("sine");
      expect(oscillator.start).toHaveBeenCalledWith(4);
      expect(oscillator.stop).toHaveBeenCalledOnce();
    }
  });
});
