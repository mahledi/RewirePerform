import {
  Capacitor,
  registerPlugin,
  type PluginListenerHandle,
} from "@capacitor/core";

export type SpeechPermissionState = "prompt" | "granted" | "denied";

interface OnDeviceSpeechAvailability {
  available: boolean;
  supportsOnDevice: boolean;
  language: string;
}

interface OnDeviceSpeechStartOptions {
  language: string;
  contextualStrings: string[];
}

interface OnDeviceSpeechStopResult {
  transcript: string;
}

interface OnDeviceSpeechTranscriptEvent {
  transcript: string;
  isFinal: boolean;
}

interface OnDeviceSpeechStateEvent {
  state: "listening" | "stopped";
}

interface OnDeviceSpeechErrorEvent {
  code: string;
  message: string;
}

interface OnDeviceSpeechPermissionResult {
  speechRecognition: SpeechPermissionState;
}

interface OnDeviceSpeechPlugin {
  getAvailability(
    options: Pick<OnDeviceSpeechStartOptions, "language">,
  ): Promise<OnDeviceSpeechAvailability>;
  start(options: OnDeviceSpeechStartOptions): Promise<{ listening: boolean }>;
  stop(): Promise<OnDeviceSpeechStopResult>;
  cancel(): Promise<void>;
  checkPermissions(): Promise<OnDeviceSpeechPermissionResult>;
  requestPermissions(): Promise<OnDeviceSpeechPermissionResult>;
  addListener(
    eventName: "transcript",
    listener: (event: OnDeviceSpeechTranscriptEvent) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: "stateChange",
    listener: (event: OnDeviceSpeechStateEvent) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: "speechError",
    listener: (event: OnDeviceSpeechErrorEvent) => void,
  ): Promise<PluginListenerHandle>;
}

export const OnDeviceSpeech = registerPlugin<OnDeviceSpeechPlugin>(
  "OnDeviceSpeech",
);

export const isNativeOnDeviceSpeechPlatform = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";

export const REWIREPERFORM_SPEECH_CONTEXT = [
  "RewirePerform",
  "Athlet",
  "Athletin",
  "Coach",
  "Training",
  "Ruhetag",
  "Wettkampf",
  "Fokus",
  "Anspannung",
  "Erholung",
  "Selbstgespräch",
  "Selbstwirksamkeit",
  "Visualisierung",
  "Handlungsfokus",
  "Fehlerreaktion",
  "Drucksituation",
  "Konzentration",
  "Pre-Performance-Routine",
  "Self-Talk",
  "Growth Mindset",
];
