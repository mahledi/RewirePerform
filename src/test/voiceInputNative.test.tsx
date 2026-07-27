import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const nativeSpeechMock = vi.hoisted(() => {
  const listeners = new Map<string, (event: unknown) => void>();
  const control: { registrationGate: Promise<void> | null } = {
    registrationGate: null,
  };
  const plugin = {
    getAvailability: vi.fn(),
    checkPermissions: vi.fn(),
    requestPermissions: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    cancel: vi.fn(),
    addListener: vi.fn(
      async (eventName: string, listener: (event: unknown) => void) => {
        if (control.registrationGate) {
          await control.registrationGate;
        }
        listeners.set(eventName, listener);
        return {
          remove: vi.fn(async () => {
            listeners.delete(eventName);
          }),
        };
      },
    ),
  };

  return { control, listeners, plugin };
});

vi.mock("@/lib/onDeviceSpeech", () => ({
  OnDeviceSpeech: nativeSpeechMock.plugin,
  REWIREPERFORM_SPEECH_CONTEXT: [
    "RewirePerform",
    "Wettkampf",
    "Handlungsfokus",
  ],
  isNativeOnDeviceSpeechPlatform: () => true,
}));

import VoiceInput from "@/components/VoiceInput";

describe("VoiceInput native on-device mode", () => {
  beforeEach(() => {
    Object.defineProperty(window, "scrollTo", {
      configurable: true,
      value: vi.fn(),
    });
    nativeSpeechMock.control.registrationGate = null;
    nativeSpeechMock.listeners.clear();
    nativeSpeechMock.plugin.getAvailability.mockResolvedValue({
      available: true,
      supportsOnDevice: true,
      language: "de-DE",
    });
    nativeSpeechMock.plugin.checkPermissions.mockResolvedValue({
      speechRecognition: "granted",
    });
    nativeSpeechMock.plugin.requestPermissions.mockResolvedValue({
      speechRecognition: "granted",
    });
    nativeSpeechMock.plugin.start.mockResolvedValue({ listening: true });
    nativeSpeechMock.plugin.stop.mockResolvedValue({
      transcript: "Nach dem Fehler richte ich meinen Fokus neu aus.",
    });
    nativeSpeechMock.plugin.cancel.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("waits for every native listener before offering speech input", async () => {
    let releaseRegistration = () => undefined;
    nativeSpeechMock.control.registrationGate = new Promise<void>((resolve) => {
      releaseRegistration = resolve;
    });

    render(
      <VoiceInput currentValue="" onTranscript={vi.fn()} showHint={false} />,
    );

    await waitFor(() => {
      expect(nativeSpeechMock.plugin.getAvailability).toHaveBeenCalledOnce();
    });
    expect(
      screen.queryByRole("button", { name: "Einsprechen" }),
    ).not.toBeInTheDocument();

    releaseRegistration();

    expect(
      await screen.findByRole("button", { name: "Einsprechen" }),
    ).toBeInTheDocument();
  });

  it("uses only the native recognizer and commits the returned transcript", async () => {
    const onTranscript = vi.fn();
    render(
      <VoiceInput
        currentValue=""
        onTranscript={onTranscript}
        showHint={false}
      />,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Einsprechen" }),
    );

    await waitFor(() => {
      expect(nativeSpeechMock.plugin.start).toHaveBeenCalledWith({
        language: "de-DE",
        contextualStrings: [
          "RewirePerform",
          "Wettkampf",
          "Handlungsfokus",
        ],
      });
    });

    act(() => {
      nativeSpeechMock.listeners.get("transcript")?.({
        transcript: "Nach dem Fehler richte ich meinen Fokus neu aus",
        isFinal: false,
      });
    });
    expect(screen.getByText(/Nach dem Fehler richte ich/)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Einsprechen stoppen" }),
    );

    await waitFor(() => {
      expect(onTranscript).toHaveBeenCalledWith(
        "Nach dem Fehler richte ich meinen Fokus neu aus.",
      );
    });
  });

  it("does not append the same native final result twice during a stop race", async () => {
    const onTranscript = vi.fn();
    render(
      <VoiceInput
        currentValue=""
        onTranscript={onTranscript}
        showHint={false}
      />,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Einsprechen" }),
    );
    await waitFor(() => {
      expect(nativeSpeechMock.plugin.start).toHaveBeenCalledOnce();
    });

    act(() => {
      nativeSpeechMock.listeners.get("transcript")?.({
        transcript: "Nach dem Fehler richte ich meinen Fokus neu aus.",
        isFinal: true,
      });
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Einsprechen stoppen" }),
    );

    await waitFor(() => {
      expect(nativeSpeechMock.plugin.stop).toHaveBeenCalledOnce();
    });
    expect(onTranscript).toHaveBeenCalledOnce();
    expect(onTranscript).toHaveBeenCalledWith(
      "Nach dem Fehler richte ich meinen Fokus neu aus.",
    );
  });

  it("keeps typing available when permission is denied", async () => {
    nativeSpeechMock.plugin.checkPermissions.mockResolvedValue({
      speechRecognition: "prompt",
    });
    nativeSpeechMock.plugin.requestPermissions.mockResolvedValue({
      speechRecognition: "denied",
    });

    render(
      <VoiceInput currentValue="" onTranscript={vi.fn()} showHint={false} />,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Einsprechen" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Spracherkennung ist nicht erlaubt",
    );
    expect(nativeSpeechMock.plugin.start).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Einsprechen" }),
    ).toBeInTheDocument();
  });
});
