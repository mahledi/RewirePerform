import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import VoiceInput from "@/components/VoiceInput";

class MockSpeechRecognition {
  static latest: MockSpeechRecognition | null = null;

  lang = "";
  interimResults = false;
  continuous = false;
  maxAlternatives = 1;
  onresult = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend = null;
  start = vi.fn();
  abort = vi.fn();

  constructor() {
    MockSpeechRecognition.latest = this;
  }
}

describe("VoiceInput", () => {
  beforeEach(() => {
    Object.defineProperty(window, "webkitSpeechRecognition", {
      configurable: true,
      value: MockSpeechRecognition,
    });
  });

  afterEach(() => {
    cleanup();
    delete (window as Window & { webkitSpeechRecognition?: unknown })
      .webkitSpeechRecognition;
    MockSpeechRecognition.latest = null;
  });

  it("stops cleanly and explains an iOS permission denial", () => {
    render(<VoiceInput currentValue="" onTranscript={vi.fn()} showHint={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Einsprechen" }));
    expect(screen.getByRole("button", { name: "Einsprechen stoppen" })).toBeInTheDocument();

    const recognition = MockSpeechRecognition.latest;
    expect(recognition).not.toBeNull();
    act(() => recognition?.onerror?.({ error: "not-allowed" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Spracherkennung ist nicht erlaubt",
    );
    expect(screen.getByRole("button", { name: "Einsprechen" })).toBeInTheDocument();
    expect(recognition?.abort).toHaveBeenCalledOnce();
  });
});
